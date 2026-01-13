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

export async function processPayoutQueue(sellerId?: string): Promise<void> {
  try {
    console.log("Processing payout queue for seller:", sellerId || "all sellers");

    // If sellerId is provided, process payouts for that seller only
    if (sellerId) {
      await processPayoutsForSeller(sellerId);
    } else {
      // Process for all sellers (would be called by cron job)
      // This is a placeholder for future implementation
      console.log("Global payout queue processing not implemented yet");
    }

  } catch (error) {
    console.error("Error processing payout queue:", error);
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
