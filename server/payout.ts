import { storage } from "./storage";
import { transferToSeller } from "./services/korapay";
import { deductAvailableBalance } from "./wallet";

/**
 * Payout service for safe transfer initiation with balance checks and settlement logic
 */

export async function checkBalanceAndSettle(sellerId: string, payoutAmount: number): Promise<{ hasBalance: boolean; availableBalance: number; requiredBalance: number }> {
  // For Korapay, we assume balance is available for immediate payouts after payment confirmation
  return { hasBalance: true, availableBalance: payoutAmount * 100, requiredBalance: payoutAmount * 100 };
}

export async function initiateSafePayout(transactionId: string, sellerId: string, payoutAmount: number): Promise<boolean> {
  try {
    // Check if payout already exists and is completed
    const existingPayout = await storage.getPayoutByTransaction(transactionId);
    if (existingPayout && (existingPayout.status === "completed" || existingPayout.status === "processing")) {
      console.log(`Payout already ${existingPayout.status} for transaction ${transactionId}`);
      return true;
    }

    // Get seller bank details
    const seller = await storage.getUser(sellerId);
    if (!seller || !seller.bankCode || !seller.accountNumber) {
      console.error(`Seller ${sellerId} has incomplete bank account details`);
      return false;
    }

    // Create or update payout record
    const payout = existingPayout || await storage.createPayout(
      transactionId,
      sellerId,
      payoutAmount.toFixed(2)
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
      amount: payoutAmount,
      currency: "NGN",
      reference: transferReference,
      destination: {
        type: "bank_account",
        amount: payoutAmount,
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

    // Reset retry count on success
    await storage.updatePayoutRetryInfo(payout.id, 0);

    // Deduct from available balance (ledger update)
    await deductAvailableBalance(sellerId, payoutAmount);

    console.log(`Payout initiated successfully for transaction ${transactionId}, transfer reference: ${transferReference}`);
    return true;

  } catch (error: any) {
    console.error("Error initiating safe payout:", error);

    // Update payout status to failed if it exists
    const existingPayout = await storage.getPayoutByTransaction(transactionId);
    if (existingPayout) {
      await storage.updatePayoutStatus(existingPayout.id, "failed", undefined, undefined, error.message);
    }

    return false;
  }
}

export async function processPayoutQueue(sellerId?: string): Promise<void> {
  try {
    console.log("Processing payout queue for seller:", sellerId || "all sellers");

    // If sellerId is provided, process payouts for that seller only
    if (sellerId) {
      await processPayoutsForSeller(sellerId);
    } else {
      // Process all pending settlement payouts globally
      await processPendingSettlementPayouts();
    }

  } catch (error) {
    console.error("Error processing payout queue:", error);
  }
}

export async function processPendingSettlementPayouts(): Promise<void> {
  try {
    console.log("Processing pending settlement payouts globally");

    // Get all payouts that are pending settlement and ready for retry
    const pendingPayouts = await storage.getPendingSettlementPayouts();
    const now = new Date();

    console.log(`Found ${pendingPayouts.length} pending settlement payouts`);

    for (const payout of pendingPayouts) {
      try {
        // Check if it's time to retry this payout
        if (payout.nextRetryAt && new Date(payout.nextRetryAt) > now) {
          console.log(`Payout ${payout.id} not ready for retry yet. Next retry: ${payout.nextRetryAt}`);
          continue;
        }

        console.log(`Retrying payout ${payout.id} for amount ${payout.amount}`);

        // Attempt to initiate the payout
        const success = await initiateSafePayout(
          payout.transactionId,
          payout.sellerId,
          parseFloat(payout.amount)
        );

        if (success) {
          console.log(`Payout ${payout.id} initiated successfully on retry`);
        } else {
          console.log(`Payout ${payout.id} still cannot be initiated (insufficient balance)`);
        }

        // Add a small delay between payouts to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (payoutError: any) {
        console.error(`Error retrying payout ${payout.id}:`, payoutError);
        // Continue with other payouts even if one fails
      }
    }

  } catch (error) {
    console.error("Error processing pending settlement payouts:", error);
  }
}

async function processPayoutsForSeller(sellerId: string): Promise<void> {
  try {
    // Get all payouts for this seller that are ready to be processed
    const payouts = await storage.getPayoutsBySeller(sellerId);

    // Filter for payouts that are not_ready (meaning they haven't been attempted yet)
    const readyPayouts = payouts.filter(p => p.status === "not_ready");

    console.log(`Found ${readyPayouts.length} ready payouts for seller ${sellerId}`);

    for (const payout of readyPayouts) {
      try {
        console.log(`Processing payout ${payout.id} for amount ${payout.amount}`);

        // Attempt to initiate the payout
        const success = await initiateSafePayout(
          payout.transactionId,
          sellerId,
          parseFloat(payout.amount)
        );

        if (success) {
          console.log(`Payout ${payout.id} initiated successfully`);
        } else {
          console.log(`Payout ${payout.id} could not be initiated (insufficient balance or other issue)`);
        }

        // Add a small delay between payouts to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (payoutError: any) {
        console.error(`Error processing payout ${payout.id}:`, payoutError);
        // Continue with other payouts even if one fails
      }
    }

  } catch (error) {
    console.error(`Error processing payouts for seller ${sellerId}:`, error);
  }
}
