import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./auth";
import passport from "passport";
import { insertUserSchema, insertTransactionSchema, updateTransactionStatusSchema, insertDisputeSchema, updateDisputeStatusSchema, type User } from "@shared/schema";
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
  app.post("/api/payments/initialize", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { uniqueLink } = req.body;
      
      if (!uniqueLink) {
        return res.status(400).json({ message: "Transaction link is required" });
      }

      const transaction = await storage.getTransactionByLink(uniqueLink);
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

  // Dashboard statistics routes
  app.get("/api/dashboard/stats", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const stats = await storage.getDashboardStats(user.id);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/dashboard/transactions-over-time", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const data = await storage.getTransactionsOverTime(user.id);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/dashboard/recent-activities", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await storage.getRecentActivities(user.id, limit);
      res.json({ activities });
    } catch (error) {
      next(error);
    }
  });

  // Office routes - Ongoing transactions and history
  app.get("/api/office/ongoing-transactions", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const allTransactions = await storage.getTransactionsBySeller(user.id);
      
      // Filter for ongoing transactions (not completed)
      const ongoingTransactions = allTransactions.filter(
        t => t.status === "pending" || t.status === "paid" || t.status === "asset_transferred"
      );
      
      // Apply optional filters from query params
      const { status, search } = req.query;
      
      let filtered = ongoingTransactions;
      
      if (status && status !== "all") {
        filtered = filtered.filter(t => t.status === status);
      }
      
      if (search) {
        const searchLower = (search as string).toLowerCase();
        filtered = filtered.filter(
          t => t.buyerEmail.toLowerCase().includes(searchLower) ||
               t.itemName.toLowerCase().includes(searchLower) ||
               t.id.toLowerCase().includes(searchLower)
        );
      }
      
      res.json({ transactions: filtered });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/office/transaction-history", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const allTransactions = await storage.getTransactionsBySeller(user.id);
      
      // Filter for completed transactions only
      const historyTransactions = allTransactions.filter(t => t.status === "completed");
      
      // Apply optional filters from query params
      const { dateFrom, dateTo, search, minAmount, maxAmount } = req.query;
      
      let filtered = historyTransactions;
      
      if (dateFrom) {
        const fromDate = new Date(dateFrom as string);
        filtered = filtered.filter(t => new Date(t.createdAt) >= fromDate);
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo as string);
        filtered = filtered.filter(t => new Date(t.createdAt) <= toDate);
      }
      
      if (search) {
        const searchLower = (search as string).toLowerCase();
        filtered = filtered.filter(
          t => t.buyerEmail.toLowerCase().includes(searchLower) ||
               t.itemName.toLowerCase().includes(searchLower) ||
               t.id.toLowerCase().includes(searchLower)
        );
      }
      
      if (minAmount) {
        const min = parseFloat(minAmount as string);
        filtered = filtered.filter(t => parseFloat(t.price) >= min);
      }
      
      if (maxAmount) {
        const max = parseFloat(maxAmount as string);
        filtered = filtered.filter(t => parseFloat(t.price) <= max);
      }
      
      res.json({ transactions: filtered });
    } catch (error) {
      next(error);
    }
  });

  // Dispute routes
  app.post("/api/disputes", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      
      const disputeData = {
        ...req.body,
        sellerId: user.id,
      };

      const result = insertDisputeSchema.safeParse(disputeData);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }

      // Check if transaction exists and belongs to user
      const transaction = await storage.getTransaction(result.data.transactionId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      if (transaction.sellerId !== user.id) {
        return res.status(403).json({ message: "Forbidden: You can only dispute your own transactions" });
      }

      // Check if dispute already exists for this transaction
      const existingDispute = await storage.getDisputeByTransaction(result.data.transactionId);
      if (existingDispute) {
        return res.status(400).json({ message: "A dispute already exists for this transaction" });
      }

      const dispute = await storage.createDispute(result.data);
      res.status(201).json({ dispute });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/disputes", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const disputes = await storage.getDisputesBySeller(user.id);
      
      // Apply optional status filter
      const { status } = req.query;
      
      let filtered = disputes;
      if (status && status !== "all") {
        filtered = filtered.filter(d => d.status === status);
      }
      
      res.json({ disputes: filtered });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/disputes/:id", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const dispute = await storage.getDispute(req.params.id);
      
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }
      
      if (dispute.sellerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json({ dispute });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/disputes/:id/status", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      
      const result = updateDisputeStatusSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }

      const dispute = await storage.getDispute(req.params.id);
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }
      
      if (dispute.sellerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const updatedDispute = await storage.updateDisputeStatus(req.params.id, result.data.status);
      res.json({ dispute: updatedDispute });
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
