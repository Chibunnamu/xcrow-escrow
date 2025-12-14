
import { notificationService } from "../server/email/email_service";

// Mock environment to avoid actually sending emails if we want to just test logic,
// but user requested "simulate sending each email type".
// The service has a check for NODE_ENV === 'test' to log instead of send.
// We can use that or we can try to send real test emails if configured.
// Requirements say: "Postmark test mode if account not approved yet".
// The token is a server token. Postmark allows sending to approved sender signature or permitted domains.
// We'll set NODE_ENV=test to verify the LOGIC and logging first.

async function testEmails() {
  console.log("Starting Email Service Test...");
  const testEmail = "test@example.com";
  const testName = "Test User";

  try {
    console.log("\n1. Testing Welcome Email...");
    await notificationService.sendWelcomeEmail(testEmail, testName);

    console.log("\n2. Testing Login Alert...");
    await notificationService.sendLoginAlert(testEmail, testName, "192.168.1.1");

    console.log("\n3. Testing Transaction Created...");
    await notificationService.sendTransactionCreated(testEmail, "Seller Name", "iPhone 15", "10000.00", "http://link");

    console.log("\n4. Testing Payment Made...");
    await notificationService.sendPaymentMade(testEmail, "Seller Name", "Buyer Name", "10000.00", "iPhone 15");

    console.log("\n5. Testing Payout Completed...");
    await notificationService.sendPayoutCompleted(testEmail, testName, "9500.00", "iPhone 15");

    console.log("\nAll tests completed successfully (check logs).");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testEmails();
