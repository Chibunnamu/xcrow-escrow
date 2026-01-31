import type { Express, Request, Response, NextFunction } from "express";
import { isAuthenticated } from "../auth";
import { storage } from "../storage";
import { initializePayment } from "../services/korapay";
import type { User } from "@shared/schema";

export function registerPaymentRoutes(app: Express): void {
  // Initialize payment with Korapay
  app.post("/api/payments/initialize", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Initializing payment with Korapay for user:', req.user);
      const user = req.user as User;
      const { transactionId } = req.body;
      console.log('Received transactionId:', transactionId);

      // Input validation
      if (!transactionId) {
        console.log('No transactionId provided');
        return res.status(400).json({ message: "Transaction ID is required" });
      }

      // Try to get transaction by ID first, then by uniqueLink if not found
      let transaction = await storage.getTransaction(transactionId);
      if (!transaction) {
        transaction = await storage.getTransactionByLink(transactionId);
      }
      console.log('Found transaction:', transaction);
      if (!transaction) {
        console.log('Transaction not found for ID or link:', transactionId);
        return res.status(404).json({ message: "Transaction not found" });
      }

      if (transaction.status !== "active") {
        console.log('Transaction status is not active:', transaction.status);
        return res.status(400).json({ message: "Transaction is not ready for payment" });
      }

      // Verify the transaction has been accepted and the buyer matches
      if (!transaction.buyerId) {
        console.log('Transaction not accepted yet');
        return res.status(403).json({ message: "You must accept the transaction before making payment" });
      }

      if (transaction.buyerId !== user.id) {
        console.log('Buyer ID mismatch:', transaction.buyerId, 'vs', user.id);
        return res.status(403).json({ message: "You are not authorized to pay for this transaction" });
      }

      // Validate baseAmount
      const baseAmount = parseFloat(transaction.price);
      if (!baseAmount || isNaN(baseAmount) || baseAmount <= 0) {
        console.log('Invalid baseAmount:', baseAmount);
        return res.status(400).json({ message: "Invalid transaction amount" });
      }

      // Validate email
      if (!transaction.buyerEmail || typeof transaction.buyerEmail !== 'string' || transaction.buyerEmail.trim() === '') {
        console.log('Invalid email:', transaction.buyerEmail);
        return res.status(400).json({ message: "Invalid buyer email" });
      }

      // Calculate service fee (5% of base amount)
      const serviceFee = Math.round(baseAmount * 0.05);

      // Total amount buyer pays: base + service fee
      const totalAmount = baseAmount + serviceFee;
      const amountInKobo = Math.round(totalAmount * 100);

      // Add defensive check
      if (amountInKobo <= 0 || !Number.isInteger(amountInKobo)) {
        console.error('Invalid amountInKobo calculated:', amountInKobo);
        return res.status(400).json({ message: "Invalid payment amount calculated" });
      }

      // Log all values before sending to Korapay
      console.log('Payment calculation breakdown:', {
        baseAmount,
        serviceFee,
        totalAmount,
        amountInKobo,
        email: transaction.buyerEmail
      });

      const reference = `TXN-${transaction.id}-${Date.now()}`;

      // Wrap the Korapay initialization API call in try/catch
      try {
        const paymentData = await initializePayment({
          amount: amountInKobo,
          currency: "NGN",
          reference,
          customer: {
            email: transaction.buyerEmail,
            name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : undefined,
          },
          redirect_url: `${process.env.VITE_API_URL}/payment-callback`,
          metadata: {
            transactionId: transaction.id,
            itemName: transaction.itemName,
          },
        });

        console.log('Payment initialized successfully:', paymentData);

        res.json({
          checkout_url: paymentData.data.checkout_url,
          reference: paymentData.data.reference,
        });
      } catch (korapayError: any) {
        // On error, log the full error for debugging
        console.error('Korapay API error:', korapayError.response?.data || korapayError.message);
        // Return a 400 JSON response instead of letting the server crash
        return res.status(400).json({
          message: "Payment initialization failed",
          error: korapayError.response?.data?.message || korapayError.message
        });
      }
    } catch (error: any) {
      console.error('Error initializing payment:', error);
      next(error);
    }
  });

  // Verify payment (for frontend callback verification)
  app.get("/api/payments/verify/:reference", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reference } = req.params;

      // Import verifyPayment from korapay service
      const { verifyPayment } = await import("../services/korapay");
      const paymentData = await verifyPayment(reference);

      if (paymentData.data.status === "success") {
        const transactionId = paymentData.data.metadata?.transactionId;

        if (transactionId) {
          await storage.updateTransactionStatus(transactionId, "paid", reference);
        }

        res.json({
          status: "success",
          message: "Payment verified successfully",
          data: paymentData.data,
        });
      } else {
        res.status(400).json({
          status: "failed",
          message: "Payment verification failed",
        });
      }
    } catch (error: any) {
      next(error);
    }
  });

  // Get list of banks
  app.get("/api/banks", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { listBanks } = await import("../services/korapay");
      const banksData = await listBanks();
      res.json(banksData);
    } catch (error: any) {
      console.error("Error fetching banks:", error);
      res.status(500).json({
        message: "Failed to fetch banks list",
        error: error.message,
      });
    }
  });
}
