import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./auth";
import passport from "passport";
import { insertUserSchema, insertTransactionSchema, updateTransactionStatusSchema, type User } from "@shared/schema";
import { randomBytes } from "crypto";
import { initializePayment, verifyPayment, validatePaystackWebhook } from "./paystack";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/signup", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }

      const existingUser = await storage.getUserByEmail(result.data.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const user = await storage.createUser(result.data);
      
      // Regenerate session to prevent fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          return next(err);
        }
        
        // Log the user in automatically after signup
        req.login(user, (err) => {
          if (err) {
            return next(err);
          }
          // Don't send password back
          const { password, ...userWithoutPassword } = user;
          res.status(201).json({ user: userWithoutPassword });
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: User, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      // Regenerate session to prevent fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          return next(err);
        }
        
        req.login(user, (err) => {
          if (err) {
            return next(err);
          }
          const { password, ...userWithoutPassword } = user;
          res.json({ user: userWithoutPassword });
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      // Destroy the session completely
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Session destruction failed" });
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { password, ...userWithoutPassword } = req.user as User;
    res.json({ user: userWithoutPassword });
  });

  // Transaction routes
  app.post("/api/transactions", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const uniqueLink = randomBytes(16).toString("hex");
      
      const transactionData = {
        ...req.body,
        sellerId: user.id,
        uniqueLink,
      };

      const result = insertTransactionSchema.safeParse(transactionData);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }

      const transaction = await storage.createTransaction(result.data);
      res.status(201).json({ transaction });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/transactions/:link", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transaction = await storage.getTransactionByLink(req.params.link);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json({ transaction });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/transactions/seller/:sellerId", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      if (user.id !== req.params.sellerId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const transactions = await storage.getTransactionsBySeller(req.params.sellerId);
      res.json({ transactions });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/transactions/:id/status", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      
      // Validate input
      const result = updateTransactionStatusSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }

      // Get the transaction first to check ownership
      const existingTransaction = await storage.getTransaction(req.params.id);
      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      const isSeller = existingTransaction.sellerId === user.id;
      const isBuyer = existingTransaction.buyerEmail === user.email;

      // Role-based authorization for state transitions
      if (result.data.status === "asset_transferred") {
        // Only seller can mark as asset_transferred
        if (!isSeller) {
          return res.status(403).json({ message: "Forbidden: Only the seller can mark asset as transferred" });
        }
      } else if (result.data.status === "completed") {
        // Only buyer can mark as completed
        if (!isBuyer) {
          return res.status(403).json({ message: "Forbidden: Only the buyer can confirm completion" });
        }
      } else if (result.data.status === "paid") {
        // Paid status should only be set via Paystack webhook/verify
        return res.status(403).json({ message: "Forbidden: Payment status is automatically set by payment gateway" });
      }

      // Update the transaction
      const transaction = await storage.updateTransactionStatus(
        req.params.id, 
        result.data.status, 
        result.data.paystackReference
      );
      
      res.json({ transaction });
    } catch (error) {
      next(error);
    }
  });

  // Payment routes
  app.post("/api/payments/initialize", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { transactionId } = req.body;
      
      if (!transactionId) {
        return res.status(400).json({ message: "Transaction ID is required" });
      }

      const transaction = await storage.getTransaction(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      if (transaction.status !== "pending") {
        return res.status(400).json({ message: "Transaction already paid or completed" });
      }

      const reference = `TXN-${transaction.id}-${Date.now()}`;
      const totalAmount = parseFloat(transaction.price) + parseFloat(transaction.commission);

      const paymentData = await initializePayment({
        email: transaction.buyerEmail,
        amount: totalAmount,
        reference,
        metadata: {
          transactionId: transaction.id,
          itemName: transaction.itemName,
        },
      });

      res.json({
        authorization_url: paymentData.data.authorization_url,
        reference: paymentData.data.reference,
      });
    } catch (error: any) {
      next(error);
    }
  });

  app.get("/api/payments/verify/:reference", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reference } = req.params;
      
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

  app.post("/api/payments/webhook", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers["x-paystack-signature"] as string;
      
      if (!signature) {
        return res.status(400).json({ message: "No signature provided" });
      }

      const isValid = validatePaystackWebhook(signature, JSON.stringify(req.body));
      
      if (!isValid) {
        return res.status(401).json({ message: "Invalid signature" });
      }

      const event = req.body;

      if (event.event === "charge.success") {
        const reference = event.data.reference;
        const transactionId = event.data.metadata?.transactionId;

        if (transactionId) {
          await storage.updateTransactionStatus(transactionId, "paid", reference);
        }
      }

      res.status(200).json({ message: "Webhook processed" });
    } catch (error: any) {
      next(error);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
