import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import morgan from 'morgan';
import crypto from 'crypto';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { storage } from "./storage";

console.log('Starting server...');

const app = express();

// Paystack webhook route - must come before express.json() to preserve raw body
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  async (req, res, next) => {
    try {
      const signature = req.headers["x-paystack-signature"];

      if (!signature) {
        return res.status(400).json({ message: "No signature" });
      }

      const rawBody = req.body;

      const hash = crypto
        .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
        .update(rawBody)
        .digest("hex");

      if (hash !== signature) {
        return res.status(401).json({ message: "Invalid signature" });
      }

      const event = JSON.parse(rawBody.toString());
      console.log("Webhook event:", event.event);

      // Insert existing webhook business logic: charge.success, transfer.success, transfer.failed, etc.
      if (event.event === "charge.success") {
        const reference = event.data.reference;
        const transactionId = event.data.metadata?.transactionId;

        console.log('Payment successful for transaction:', transactionId, 'reference:', reference);

        if (transactionId) {
          const transaction = await storage.updateTransactionStatus(transactionId, "paid", reference);

          if (transaction) {
            // Create payment success audit trail notifications
            await storage.createNotification({
              userId: transaction.sellerId,
              type: "payment_successful",
              title: "Payment Received",
              message: `Payment of ₦${transaction.price} received for transaction "${transaction.itemName}" (Ref: ${reference}).`,
              data: {
                action: "payment_success",
                transactionId: transaction.id,
                sellerId: transaction.sellerId,
                buyerId: transaction.buyerId,
                itemName: transaction.itemName,
                amount: transaction.price,
                paystackReference: reference,
                timestamp: new Date().toISOString(),
                paymentMethod: "paystack"
              },
            });

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
                  paystackReference: reference,
                  timestamp: new Date().toISOString(),
                  paymentMethod: "paystack"
                },
              });
            }
          }
        }
      } else if (event.event === "transfer.success") {
        const transferCode = event.data.transfer_code;
        const payout = await storage.getPayoutByTransferCode(transferCode);

        if (payout) {
          await storage.updatePayoutStatus(payout.id, "processing", transferCode, event.data.reference);

          // Create payout success notification via webhook
          await storage.createNotification({
            userId: payout.sellerId,
            type: "payout_successful",
            title: "Payout Successful",
            message: `Your payout of ₦${payout.amount} has been processed successfully.`,
            data: { payoutId: payout.id, amount: payout.amount },
          });

          console.log('Transfer successful for payout:', payout.id);
        }
      } else if (event.event === "transfer.failed" || event.event === "transfer.reversed") {
        const transferCode = event.data.transfer_code;
        const payout = await storage.getPayoutByTransferCode(transferCode);

        if (payout) {
          await storage.updatePayoutStatus(
            payout.id,
            "failed",
            transferCode,
            event.data.reference,
            event.data.reason || "Transfer failed"
          );

          // Create payout failed notification via webhook
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
    } catch (err) {
      console.error("Webhook error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

// JSON parsing comes after webhook to avoid interfering with raw body
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

console.log('Setting up auth...');
// Setup authentication before routes
setupAuth(app);
console.log('Auth setup complete.');

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  console.log('Registering routes...');
  const server = await registerRoutes(app);
  console.log('Routes registered.');

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    console.log('Setting up Vite...');
    await setupVite(app, server);
    console.log('Vite setup complete.');
  } else {
    serveStatic(app);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  console.log(`Attempting to listen on port ${port}...`);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
