import { processPendingSettlementPayouts } from "./payout";

/**
 * Payout scheduler for processing pending settlement payouts
 * This should be run as a cron job every 30 minutes
 */

export async function runPayoutScheduler(): Promise<void> {
  try {
    console.log("🔄 Starting payout scheduler...");

    const startTime = Date.now();
    await processPendingSettlementPayouts();
    const duration = Date.now() - startTime;

    console.log(`✅ Payout scheduler completed in ${duration}ms`);
  } catch (error) {
    console.error("❌ Payout scheduler failed:", error);
  }
}

// For testing/development - run once
if (require.main === module) {
  console.log("🧪 Running payout scheduler manually...");
  runPayoutScheduler()
    .then(() => {
      console.log("✅ Manual payout scheduler run completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Manual payout scheduler run failed:", error);
      process.exit(1);
    });
}
