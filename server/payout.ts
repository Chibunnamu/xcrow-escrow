import { storage } from "./storage";
import { getBalance, initiateTransfer } from "./transfer_new";
import { calculateTransferFee } from "./paystack";
import { deductAvailableBalance } from "./wallet";

/**
 * Payout service for safe transfer initiation with balance checks and settlement logic
 */

export async function checkBalanceAndSettle(sellerId: string, payoutAmount: number): Promise<boolean> {
  try {
    // Get current Paystack balance
    const balanceResponse = await getBalance();
    const availableBalance = balanceResponse.data.find(b => b.currency === "NGN")?.balance || 0;

    // Convert to kobo for comparison
    const payoutAmountKobo = Math.round(payoutAmount * 100);
    const transferFeeKobo = calculateTransferFee(payoutAmount);

    // Check if balance is sufficient (payout + transfer fee)
    const requiredBalance = payoutAmountKobo + transferFeeKobo;

    if (availableBalance < requiredBalance) {
      console.log(`Insufficient Paystack balance for payout. Required: ${requiredBalance}, Available: ${availableBalance}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error checking balance for settlement:", error);
    return false;
  }
}

export async function initiateSafePayout(transactionId: string, sellerId: string, payoutAmount: number): Promise<boolean> {
  try {
    // Check if payout already exists and is completed
    const existingPayout = await storage.getPayoutByTransaction(transactionId);
    if (existingPayout && (existingPayout.status === "completed" || existingPayout.status === "processing")) {
      console.log(`Payout already ${existingPayout.status} for transaction ${transactionId}`);
      return true;
    }

    // Check Paystack balance
    const hasBalance = await checkBalanceAndSettle(sellerId, payoutAmount);
    if (!hasBalance) {
      // Mark payout as not ready if it exists
      if (existingPayout) {
        await storage.updatePayoutStatus(existingPayout.id, "not_ready");
      }
      return false;
    }

    // Get seller bank details
    const seller = await storage.getUser(sellerId);
    if (!seller || !seller.recipientCode) {
      console.error(`Seller ${sellerId} has no bank account configured`);
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

    // Initiate transfer
    const transferReference = `PAYOUT-${payout.id}`;
    const transferData = await initiateTransfer(
      seller.recipientCode,
      payoutAmount,
      transferReference,
      `Payout for transaction ${transactionId}`
    );

    // Update payout with transfer details
    await storage.updatePayoutStatus(
      payout.id,
      "completed",
      transferData.data.transfer_code,
      transferData.data.reference
    );

    // Deduct from available balance (ledger update)
    await deductAvailableBalance(sellerId, payoutAmount);

    console.log(`Payout initiated successfully for transaction ${transactionId}, transfer code: ${transferData.data.transfer_code}`);
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

export async function processPayoutQueue(): Promise<void> {
  try {
    // Get all payouts that are not_ready or failed
    // Note: This is a simplified implementation. In production, you'd query for pending payouts
    // For now, we'll rely on individual payout requests

    console.log("Processing payout queue - checking for ready payouts");

    // This function would be called by a cron job to retry failed payouts
    // Implementation depends on how you track payout queue

  } catch (error) {
    console.error("Error processing payout queue:", error);
  }
}
