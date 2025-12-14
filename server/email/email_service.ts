
import * as postmark from "postmark";
import { 
  getWelcomeEmailTemplate, 
  getLoginAlertTemplate, 
  getTransactionCreatedTemplate,
  getPaymentMadeTemplate,
  getPayoutCompletedTemplate
} from "./templates";

// Postmark Server Token from requirements
// Postmark Server Token
const POSTMARK_TOKEN = process.env.POSTMARK_TOKEN || "6fc66f91-a92d-4808-8080-20bc85f96e37"; // Fallback for local dev if needed, or remove fallback for strict env security

const SENDER_EMAIL = "system@xcrowpay.com"; // Ensuring usage of verified domain

class NotificationService {
  private client: postmark.ServerClient;

  constructor() {
    this.client = new postmark.ServerClient(POSTMARK_TOKEN);
  }

  /**
   * Send an email using Postmark
   */
  private async sendEmail(to: string, subject: string, htmlBody: string) {
    try {
      if (process.env.NODE_ENV === 'test') {
        console.log(`[TEST MODE] Sending email to ${to}: ${subject}`);
        return;
      }

      const result = await this.client.sendEmail({
        "From": SENDER_EMAIL,
        "To": to,
        "Subject": subject,
        "HtmlBody": htmlBody,
        "MessageStream": "outbound"
      });

      console.log(`[Email Sent] MessageID: ${result.MessageID}, To: ${to}, Subject: ${subject}`);
      return result;
    } catch (error) {
      console.error(`[Email Error] Failed to send email to ${to}:`, error);
      // Don't throw, just log. We don't want to break the main flow if email fails.
      // In a more robust system, we might want to queue updates.
    }
  }

  async sendWelcomeEmail(to: string, name: string) {
    const html = getWelcomeEmailTemplate(name);
    await this.sendEmail(to, "Welcome to Xcrow!", html);
  }

  async sendLoginAlert(to: string, name: string, ip: string) {
    const time = new Date().toLocaleString();
    const html = getLoginAlertTemplate(name, time, ip);
    await this.sendEmail(to, "New Login Detected - Xcrow", html);
  }

  async sendTransactionCreated(to: string, sellerName: string, itemName: string, price: string, link: string) {
    const html = getTransactionCreatedTemplate(sellerName, itemName, price, link);
    await this.sendEmail(to, "New Transaction - Xcrow", html);
  }

  async sendPaymentMade(sellerEmail: string, sellerName: string, buyerName: string, amount: string, itemName: string) {
    const html = getPaymentMadeTemplate(sellerName, buyerName, amount, itemName);
    await this.sendEmail(sellerEmail, "Payment Received - Xcrow", html);
  }

  async sendPayoutCompleted(to: string, name: string, amount: string, itemName: string) {
    const html = getPayoutCompletedTemplate(name, amount, itemName);
    await this.sendEmail(to, "Payout Processed - Xcrow", html);
  }
}

export const notificationService = new NotificationService();
