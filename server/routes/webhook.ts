import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { verifyWebhook, transferToSeller } from "../services/korapay";
import { notificationService } from "../email/email_service";

export function registerWebhookRoutes(app: Express): void {
  // Korapay webhook endpoint
  app.post("/api/korapay/webhook", async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('=== KORAPAY WEBHOOK RECEIVED ===');
      console.log('Headers:', JSON.stringify(req.headers, null, 2));
      console.log('Body:', JSON.stringify(req.body, null, 2));

      const signature = req.headers["x-korapay-signature"] as string;

      if (!signature) {
        console.log('ERROR: No signature provided');
        return res.status(400).json({ message: "No signature provided" });
      }

      const isValid = verifyWebhook(signature, JSON.stringify(req.body));

      if (!isValid) {
        console.log('ERROR: Invalid signature');
        return res.status(401).json({ message: "Invalid signature" });
      }

      const event = req.body;
      console.log('Processing Korapay webhook event:', event.event);
      console.log('Event data:', JSON.stringify(event.data, null, 2));

      if (event.event === "charge.success") {
        const reference = event.data.reference;
        const transactionId = event.data.metadata?.transactionId;

        console.log('Payment successful for transaction:', transactionId, 'reference:', reference);

        if (transactionId) {
          // First, get the transaction to check current status
          const existingTransaction = await storage.getTransaction(transactionId);
          if (!existingTransaction) {
            console.error(`Transaction ${transactionId} not found for webhook processing`);
            return res.status(400).json({ message: "Transaction not found" });
          }

          // Prevent duplicate processing
          if (existingTransaction.status === "paid") {
            console.log(`Transaction ${transactionId} already processed, skipping duplicate webhook`);
            return res.status(200).json({ message: "Webhook already processed" });
          }

          // Credit seller's pending balance with base amount FIRST
          const baseAmount = parseFloat(existingTransaction.price);
          const { creditPendingBalance } = await import("../wallet");

          try {
            console.log(`[WEBHOOK] Crediting pending balance for seller ${existingTransaction.sellerId}, amount: ₦${baseAmount}`);
            await creditPendingBalance(existingTransaction.sellerId, baseAmount);
            console.log(`[WEBHOOK] Successfully credited pending balance for seller ${existingTransaction.sellerId}`);
          } catch (walletError: any) {
            console.error(`[WEBHOOK] Failed to credit pending balance for seller ${existingTransaction.sellerId}:`, walletError);
            // Do NOT mark transaction as paid if wallet credit fails
            return res.status(500).json({ message: "Failed to process payment - wallet credit failed" });
          }

          // Only update transaction status after wallet credit succeeds
          const transaction = await storage.updateTransactionStatus(transactionId, "paid", reference);
          console.log(`[WEBHOOK] Transaction ${transactionId} status updated to paid`);

          // Immediately trigger payout to seller after payment confirmation
          const payoutSuccess = await initiateImmediatePayout(transactionId, existingTransaction.sellerId, baseAmount);
          if (!payoutSuccess) {
            console.error(`[WEBHOOK] Failed to initiate immediate payout for transaction ${transactionId}`);
            // Don't fail the webhook, but log the error
          }

          if (transaction) {
            // Credit platform fee ledger with service fee (5% of base amount)
            const serviceFee = baseAmount * 0.05;
            await storage.createPlatformFeeEntry(transactionId, serviceFee);

            // Create payment success audit trail notifications
            await storage.createNotification({
              userId: transaction.sellerId,
              type: "payment_successful",
              title: "Payment Received",
              message: `Payment of ₦${transaction.price} received for transaction "${transaction.itemName}" (Ref: ${reference}). Funds will be available for payout after settlement.`,
              data: {
                action: "payment_success",
                transactionId: transaction.id,
                sellerId: transaction.sellerId,
                buyerId: transaction.buyerId,
                itemName: transaction.itemName,
                amount: transaction.price,
                korapayReference: reference,
                timestamp: new Date().toISOString(),
                paymentMethod: "korapay"
              },
            });

            const sellerUser = await storage.getUser(transaction.sellerId);
            if (sellerUser && sellerUser.emailNotifications) {
                await notificationService.sendPaymentMade(
                  sellerUser.email!,
                  sellerUser.firstName!,
                  transaction.buyerEmail,
                  transaction.price,
                  transaction.itemName
                );
            }

            if (transaction.buyerId) {
              await storage.createNotification({
                userId: transaction.buyerId,
                type: "payment_successful",
                title: "Payment Successful",
                message: `Payment of ₦${transaction.price} processed for transaction "${transaction.itemName}" (Ref: ${reference}).`,
                data: {
                  action: "payment_success",
                  transactionId: transaction.id,
                  sellerId: transaction.sellerId,
                  buyerId: transaction.buyerId,
                  itemName: transaction.itemName,
                  amount: transaction.price,
                  korapayReference: reference,
                  timestamp: new Date().toISOString(),
                  paymentMethod: "korapay"
                },
              });
            }
          }
        }
      } else if (event.event === "transfer.success") {
        const transferReference = event.data.reference;
        const payout = await storage.getPayoutByTransferCode(transferReference);

        if (payout) {
          await storage.updatePayoutStatus(payout.id, "completed", transferReference, event.data.reference);

          // Deduct from seller's available balance
          const { deductAvailableBalance } = await import("../wallet");
          await deductAvailableBalance(payout.sellerId, parseFloat(payout.amount));

          // Create payout success notification
          await storage.createNotification({
            userId: payout.sellerId,
            type: "payout_successful",
            title: "Payout Successful",
            message: "Payout processed successfully via webhook",
            data: { payoutId: payout.id, amount: payout.amount }
          });

          const seller = await storage.getUser(payout.sellerId);
          if (seller && seller.emailNotifications) {
             await notificationService.sendPayoutCompleted(
               seller.email!,
               seller.firstName!,
               payout.amount,
               "Item" // Could be enhanced to get actual item name
             );
          }

          console.log('Transfer successful for payout:', payout.id);
        }
      } else if (event.event === "transfer.failed" || event.event === "transfer.reversed") {
        const transferReference = event.data.reference;
        const payout = await storage.getPayoutByTransferCode(transferReference);

        if (payout) {
          await storage.updatePayoutStatus(
            payout.id,
            "failed",
            transferReference,
            event.data.reference,
            event.data.reason || "Transfer failed"
          );

          // Return funds to seller's available balance
          const { creditAvailableBalance } = await import("../wallet");
          await creditAvailableBalance(payout.sellerId, parseFloat(payout.amount));

          // Create payout failed notification
          await storage.createNotification({
            userId: payout.sellerId,
            type: "payout_failed",
            title: "Payout Failed",
            message: `Your payout of ₦${payout.amount} could not be processed. ${event.data.reason || "Transfer failed"}`,
            data: { payoutId: payout.id, amount: payout.amount, failureReason: event.data.reason },
          });

          console.log('Transfer failed for payout:', payout.id, 'reason:', event.data.reason);
        }
      }

      res.status(200).json({ message: "Webhook processed" });
    } catch (error: any) {
      console.error('Webhook error:', error);
      next(error);
    }
  });
}

/**
 * Initiate immediate payout to seller after successful payment
 */
async function initiateImmediatePayout(transactionId: string, sellerId: string, baseAmount: number): Promise<boolean> {
  try {
    // Check if payout already exists and is completed
    const existingPayout = await storage.getPayoutByTransaction(transactionId);
    if (existingPayout && (existingPayout.status === "completed" || existingPayout.status === "processing")) {
      console.log(`Payout already ${existingPayout.status} for transaction ${transactionId}`);
      return true;
    }

    // Get seller bank details
    const seller = await storage.getUser(sellerId);
    if (!seller || !seller.recipientCode || !seller.bankCode || !seller.accountNumber) {
      console.error(`Seller ${sellerId} has incomplete bank account details`);
      return false;
    }

    // Create or update payout record
    const payout = existingPayout || await storage.createPayout(
      transactionId,
      sellerId,
      baseAmount.toFixed(2)
    );

    // Update payout status to processing
    await storage.updatePayoutStatus(payout.id, "processing");

    // Get seller's full name for transfer
    const sellerName = seller.firstName && seller.lastName
      ? `${seller.firstName} ${seller.lastName}`
      : seller.firstName || seller.email || "Seller";

    // Initiate transfer using Korapay
    const transferReference = `PAYOUT-${payout.id}-${Date.now()}`;
    const transferData = await transferToSeller({
      amount: baseAmount,
      currency: "NGN",
      reference: transferReference,
      destination: {
        type: "bank_account",
        amount: baseAmount,
        currency: "NGN",
        bank_account: {
          bank: seller.bankCode,
          account: seller.accountNumber,
        },
        customer: {
          email: seller.email!,
          name: sellerName,
        },
      },
      metadata: {
        transactionId,
      },
    });

    // Update payout with transfer details
    await storage.updatePayoutStatus(
      payout.id,
      "completed",
      transferReference,
      transferData.data.reference
    );

    // Move funds from pending to available balance (since payout is immediate)
    const { moveToAvailable } = await import("../wallet");
    await moveToAvailable(sellerId, baseAmount);

    console.log(`Immediate payout initiated successfully for transaction ${transactionId}, transfer reference: ${transferReference}`);
    return true;

  } catch (error: any) {
    console.error("Error initiating immediate payout:", error);

    // Update payout status to failed if it exists
    const existingPayout = await storage.getPayoutByTransaction(transactionId);
    if (existingPayout) {
      await storage.updatePayoutStatus(existingPayout.id, "failed", undefined, undefined, error.message);
    }

    return false;
  }
}
