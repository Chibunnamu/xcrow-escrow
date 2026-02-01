import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./auth";
import { setupReplitAuth } from "./replitAuth";
import passport from "passport";
import { insertUserSchema, insertTransactionSchema, updateTransactionStatusSchema, insertDisputeSchema, updateDisputeStatusSchema, insertNotificationSchema, type User } from "@shared/schema";
import { randomBytes } from "crypto";
import { z } from "zod";

import { notificationService } from "./email/email_service";
import { registerPaymentRoutes } from "./routes/payments";
import { registerWebhookRoutes } from "./routes/webhook";
import { registerAdminRoutes } from "./routes/admin";
import { listBanks, resolveAccount } from "./services/korapay";

// Helper functions for Korapay
const isKorapayConfigured = () => {
  return !!process.env.KORAPAY_SECRET_KEY;
};

const verifyAccountNumber = async (accountNumber: string, bankCode: string) => {
  return await resolveAccount(bankCode, accountNumber);
};

const updateBankAccountSchema = z.object({
  bankCode: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Register route modules
  registerPaymentRoutes(app);
  registerWebhookRoutes(app);
  registerAdminRoutes(app);

  // Removed Replit OAuth authentication
  // await setupReplitAuth(app);

  // Google OAuth routes
  app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
      res.redirect("/");
    }
  );

  // Facebook OAuth routes
  app.get("/api/auth/facebook", passport.authenticate("facebook", { scope: ["email"] }));

  app.get(
    "/api/auth/facebook/callback",
    passport.authenticate("facebook", { failureRedirect: "/login" }),
    (req, res) => {
      res.redirect("/");
    }
  );

  // Auth routes
  app.post("/api/signup", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }

      // Check if user already exists in Firestore users collection
      const existingUser = await storage.getUserByEmail(result.data.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Create user in Firestore users collection
      const user = await storage.createUser(result.data);

      // Create registration audit trail notification
      await storage.createNotification({
        userId: user.id,
        type: "user_registered",
        title: "Account Registration",
        message: `New user account created for ${user.email} from ${user.country || 'Unknown'}.`,
        data: {
          action: "user_registration",
          email: user.email,
          country: user.country,
          timestamp: new Date().toISOString(),
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent')
        },
      });

      // Send Welcome Email (Always sent)
      if (user.email && user.firstName) {
        // We don't await here to not block response? Or we do? 
        // Plan says await. 
        await notificationService.sendWelcomeEmail(user.email, user.firstName);
      }

      // Regenerate session to prevent fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          return next(err);
        }

        // Log the user in automatically after signup
        req.login({
          id: user.id,
          email: user.email!,
          firstName: user.firstName!,
          lastName: user.lastName!
        }, (err) => {
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
    passport.authenticate("local", async (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      // Create login audit trail notification
      try {
        await storage.createNotification({
          userId: user.id,
          type: "user_login",
          title: "User Login",
          message: `User ${user.email} logged in successfully.`,
          data: {
            action: "user_login",
            email: user.email,
            timestamp: new Date().toISOString(),
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.sessionID
          },
        });
        
        // Send Login Alert
        if (user.emailNotifications) {
           await notificationService.sendLoginAlert(user.email, user.firstName, req.ip || req.connection.remoteAddress || "Unknown");
        }
      } catch (notificationError) {
        console.error("Error creating login notification:", notificationError);
        // Don't fail login if notification creation fails
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

  app.get("/api/user", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Fetch latest user data from Firestore to ensure bank details are included
    const user = req.user as User;
    const latestUser = await storage.getUser(user.id);
    if (!latestUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const { password, ...userWithoutPassword } = latestUser;
    res.json({ user: userWithoutPassword });
  });

  app.post("/api/user/consent", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const { consent } = req.body;
      
      if (typeof consent !== 'boolean') {
        return res.status(400).json({ message: "Consent must be a boolean" });
      }

      await storage.updateUserConsent(user.id, consent);
      res.json({ message: "Consent updated", consent });
    } catch (error) {
      next(error);
    }
  });

  // Transaction routes
  app.get("/api/transactions", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const sellerTransactions = await storage.getTransactionsBySeller(user.id);
      const buyerTransactions = await storage.getTransactionsByBuyer(user.id);
      const allTransactions = [...sellerTransactions, ...buyerTransactions];
      res.json({ transactions: allTransactions });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/transactions", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    console.log('Creating transaction for user:', req.user);
    try {
      const user = req.user as User;

      const transactionData = {
        ...req.body,
        sellerId: user.id,
      };

      const result = insertTransactionSchema.safeParse(transactionData);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }

      console.log('Transaction data to insert:', transactionData);
      const transaction = await storage.createTransaction(result.data);
      console.log('Transaction created:', transaction);

      // Create transaction creation audit trail notification
      await storage.createNotification({
        userId: user.id,
        type: "transaction_created",
        title: "Transaction Created",
        message: `Transaction "${transaction.itemName}" created by seller ${user.email} for ₦${transaction.price}.`,
        data: {
          action: "transaction_creation",
          transactionId: transaction.id,
          sellerId: user.id,
          sellerEmail: user.email,
          itemName: transaction.itemName,
          price: transaction.price,
          buyerEmail: transaction.buyerEmail,
          timestamp: new Date().toISOString(),
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent')
        },
      });

      // Send Transaction Created Email to Buyer
      const buyerUser = await storage.getUserByEmail(transaction.buyerEmail);
      if (!buyerUser || buyerUser.emailNotifications !== false) {
         await notificationService.sendTransactionCreated(
            transaction.buyerEmail, 
            user.firstName || "Seller", 
            transaction.itemName, 
            transaction.price, 
            `https://xcrowpay.com/transaction/${transaction.uniqueLink}`
          );
      }

      res.status(201).json({ transaction });
    } catch (error) {
      console.error('Error creating transaction:', error);
      next(error);
    }
  });

  app.get("/api/transactions/id/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transaction = await storage.getTransaction(req.params.id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json({ transaction });
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

  app.get("/api/transactions/seller", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const transactions = await storage.getTransactionsBySeller(user.id);
      res.json({ transactions });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/transactions/buyer", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const { db } = await import("./firebase");
      const querySnapshot = await db.collection("transactions")
        .where("buyerId", "==", user.id)
        .get();
      const transactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ transactions });
    } catch (error) {
      console.error('Error fetching buyer transactions:', error);
      res.status(200).json({ transactions: [] });
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
      const isBuyer = existingTransaction.buyerId === user.id;

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

      // If transaction is completed, move funds from pending to available in wallet
      if (result.data.status === "completed" && transaction) {
        try {
          const baseAmount = parseFloat(existingTransaction.price);
          const { moveToAvailable } = await import("./wallet");

          // Move funds from pending to available balance
          await moveToAvailable(existingTransaction.sellerId, baseAmount);

          // Create payout record for tracking (but don't initiate transfer yet)
          const existingPayout = await storage.getPayoutByTransaction(req.params.id);
          if (!existingPayout) {
            await storage.createPayout(
              req.params.id,
              existingTransaction.sellerId,
              baseAmount.toFixed(2)
            );
          }

          // Trigger payout processing (this will check balance and initiate if ready)
          const { processPayoutQueue } = await import("./payout");
          await processPayoutQueue(existingTransaction.sellerId);

          console.log("Transaction completed, funds moved to available balance for seller:", existingTransaction.sellerId);
        } catch (walletError: any) {
          console.error("Wallet processing error:", walletError);
        }
      }
      
      res.json({ transaction });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/transactions/:id/accept", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;

      // Get the transaction
      const existingTransaction = await storage.getTransaction(req.params.id);
      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Check if transaction is still pending or active and not already accepted
      if (!["pending", "active"].includes(existingTransaction.status)) {
        return res.status(400).json({ message: "Transaction is no longer available for acceptance" });
      }

      if (existingTransaction.buyerId) {
        return res.status(400).json({ message: "Transaction already accepted by another buyer" });
      }

      // Check if the seller is trying to accept their own transaction
      if (existingTransaction.sellerId === user.id) {
        return res.status(403).json({ message: "You cannot accept your own transaction" });
      }

      // Verify the authenticated user's email matches the buyer email (case-insensitive)
      if (!user.email || existingTransaction.buyerEmail.toLowerCase() !== user.email.toLowerCase()) {
        return res.status(403).json({ message: "This transaction is intended for a different buyer" });
      }

      // Link the buyer to the transaction
      const transaction = await storage.acceptTransaction(req.params.id, user.id);

      if (transaction) {
        // Create transaction acceptance audit trail notifications
        await storage.createNotification({
          userId: user.id,
          type: "transaction_accepted",
          title: "Transaction Accepted",
          message: `Transaction "${transaction.itemName}" accepted by buyer ${user.email}.`,
          data: {
            action: "transaction_acceptance",
            transactionId: transaction.id,
            buyerId: user.id,
            buyerEmail: user.email,
            sellerId: transaction.sellerId,
            itemName: transaction.itemName,
            price: transaction.price,
            timestamp: new Date().toISOString(),
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
          },
        });

        await storage.createNotification({
          userId: transaction.sellerId,
          type: "transaction_accepted",
          title: "Transaction Accepted",
          message: `Transaction "${transaction.itemName}" accepted by buyer ${user.email}.`,
          data: {
            action: "transaction_acceptance",
            transactionId: transaction.id,
            buyerId: user.id,
            buyerEmail: user.email,
            sellerId: transaction.sellerId,
            itemName: transaction.itemName,
            price: transaction.price,
            timestamp: new Date().toISOString(),
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
          },
        });
      }

      res.json({ transaction });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/transactions/:id/cancel", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;

      // Get the transaction
      const existingTransaction = await storage.getTransaction(req.params.id);
      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Check if transaction is still pending
      if (existingTransaction.status !== "pending") {
        return res.status(400).json({ message: "Transaction cannot be cancelled at this stage" });
      }

      // Only the buyer can cancel if they haven't paid yet
      if (existingTransaction.buyerId && existingTransaction.buyerId !== user.id) {
        return res.status(403).json({ message: "Only the buyer can cancel this transaction" });
      }

      // If no buyer has accepted yet, only the seller can cancel
      if (!existingTransaction.buyerId && existingTransaction.sellerId !== user.id) {
        return res.status(403).json({ message: "Only the seller can cancel this transaction" });
      }

      // Update transaction status to cancelled
      const transaction = await storage.updateTransactionStatus(req.params.id, "cancelled");

      res.json({ transaction });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/transactions/:id/mark-transferred", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;

      // Get the transaction
      const existingTransaction = await storage.getTransaction(req.params.id);
      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Check if transaction is paid
      if (existingTransaction.status !== "paid") {
        return res.status(400).json({ message: "Transaction must be paid before marking as transferred" });
      }

      // Only the seller can mark as transferred
      if (existingTransaction.sellerId !== user.id) {
        return res.status(403).json({ message: "Only the seller can mark asset as transferred" });
      }

      // Update transaction status to asset_transferred
      const transaction = await storage.updateTransactionStatus(req.params.id, "asset_transferred");

      if (transaction) {
        // Create asset transfer audit trail notifications
        await storage.createNotification({
          userId: transaction.sellerId,
          type: "transaction_asset_transferred",
          title: "Asset Transferred",
          message: `Asset transferred for transaction "${transaction.itemName}" by seller.`,
          data: {
            action: "asset_transfer",
            transactionId: transaction.id,
            sellerId: transaction.sellerId,
            buyerId: transaction.buyerId,
            itemName: transaction.itemName,
            price: transaction.price,
            timestamp: new Date().toISOString(),
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
          },
        });

        if (transaction.buyerId) {
          await storage.createNotification({
            userId: transaction.buyerId,
            type: "transaction_asset_transferred",
            title: "Asset Received",
            message: `Asset received for transaction "${transaction.itemName}".`,
            data: {
              action: "asset_transfer",
              transactionId: transaction.id,
              sellerId: transaction.sellerId,
              buyerId: transaction.buyerId,
              itemName: transaction.itemName,
              price: transaction.price,
              timestamp: new Date().toISOString(),
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('User-Agent')
            },
          });
        }
      }

      res.json({ transaction });
    } catch (error) {
      next(error);
    }
  });

  // Welcome endpoint
  app.get("/api/welcome", async (req: Request, res: Response) => {
    const { logRequest } = await import("./logger");
    logRequest(req, { message: "Welcome endpoint accessed" });
    res.json({ message: "Welcome to the Xcrow API!" });
  });

  // Health endpoint
  app.get("/api/health", (req: Request, res: Response) => {
    console.log('Health check called for user:', req.user?.id || 'unauthenticated');
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      user: req.user?.id || null
    });
  });

  // Payment callback route for Paystack redirects
  app.get("/payment-callback", (req: Request, res: Response) => {
    const reference = req.query.reference as string;
    const trxref = req.query.trxref as string;

    if (reference) {
      // Redirect to frontend with payment reference for verification
      res.redirect(`/?payment_reference=${reference}`);
    } else {
      res.redirect("/?payment=failed");
    }
  });



  // Dashboard statistics routes - Direct Firestore queries
  app.get("/api/dashboard/stats", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Dashboard stats called for user:', req.user?.id);
      const user = req.user as User;

      // Direct Firestore query for user's transactions (no composite index needed)
      const { db } = await import("./firebase");
      const querySnapshot = await db.collection("transactions")
        .where("sellerId", "==", user.id)
        .get();

      const allTransactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      const totalTransactions = allTransactions.length;
      const completedTransactions = allTransactions.filter((t: any) => t.status === "completed");
      const successRate = totalTransactions > 0 ? (completedTransactions.length / totalTransactions) * 100 : 0;

      const escrowVolume = allTransactions
        .filter((t: any) => t.status === "paid" || t.status === "asset_transferred" || t.status === "completed")
        .reduce((sum: number, t: any) => sum + parseFloat(t.price), 0);

      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

      const lastMonthTransactions = allTransactions.filter((t: any) => {
        const createdAt = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
        return createdAt < lastMonth;
      });
      const lastMonthCompleted = lastMonthTransactions.filter((t: any) => t.status === "completed");

      const lastMonthTotal = lastMonthTransactions.length;
      const lastMonthSuccessRate = lastMonthTotal > 0 ? (lastMonthCompleted.length / lastMonthTotal) * 100 : 0;

      const lastMonthVolume = lastMonthTransactions
        .filter((t: any) => t.status === "paid" || t.status === "asset_transferred" || t.status === "completed")
        .reduce((sum: number, t: any) => sum + parseFloat(t.price), 0);

      const stats = {
        totalTransactions,
        successRate: Math.round(successRate),
        escrowVolume: Math.round(escrowVolume),
        totalTransactionsChange: lastMonthTotal > 0 ? Math.round(((totalTransactions - lastMonthTotal) / lastMonthTotal) * 100) : totalTransactions > 0 ? 100 : 0,
        successRateChange: lastMonthSuccessRate > 0 ? Math.round(successRate - lastMonthSuccessRate) : 0,
        escrowVolumeChange: lastMonthVolume > 0 ? Math.round(((escrowVolume - lastMonthVolume) / lastMonthVolume) * 100) : escrowVolume > 0 ? 100 : 0,
      };

      console.log('Dashboard stats result:', stats);
      res.json(stats);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      next(error);
    }
  });

  app.get("/api/dashboard/transactions-over-time", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Dashboard transactions-over-time called for user:', req.user?.id);
      const user = req.user as User;

      // Direct Firestore query for user's transactions (no composite index needed)
      const { db } = await import("./firebase");
      const querySnapshot = await db.collection("transactions")
        .where("sellerId", "==", user.id)
        .get();

      const allTransactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      const monthlyData: Record<string, number> = {};
      const months = ["January", "February", "March", "April", "May", "June",
                     "July", "August", "September", "October", "November", "December"];

      allTransactions.forEach((transaction: any) => {
        const date = transaction.createdAt?.toDate ? transaction.createdAt.toDate() : new Date(transaction.createdAt);
        const monthName = months[date.getMonth()];
        const amount = parseFloat(transaction.price);

        if (!monthlyData[monthName]) {
          monthlyData[monthName] = 0;
        }
        monthlyData[monthName] += amount;
      });

      const data = months.map(month => ({
        month,
        amount: monthlyData[month] || 0,
      }));

      console.log('Dashboard transactions-over-time result:', data);
      res.json({ data });
    } catch (error) {
      console.error('Dashboard transactions-over-time error:', error);
      next(error);
    }
  });

  // Buyer dashboard statistics routes
  app.get("/api/dashboard/buyer/stats", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Buyer dashboard stats called for user:', req.user?.id);
      const user = req.user as User;

      // Direct Firestore query for user's buyer transactions (by email)
      const { db } = await import("./firebase");
      const querySnapshot = await db.collection("transactions")
        .where("buyerEmail", "==", user.email)
        .get();

      const allTransactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      const totalTransactions = allTransactions.length;
      const completedTransactions = allTransactions.filter((t: any) => t.status === "completed");
      const successRate = totalTransactions > 0 ? (completedTransactions.length / totalTransactions) * 100 : 0;

      const escrowVolume = allTransactions
        .filter((t: any) => t.status === "paid" || t.status === "asset_transferred" || t.status === "completed")
        .reduce((sum: number, t: any) => sum + parseFloat(t.price), 0);

      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

      const lastMonthTransactions = allTransactions.filter((t: any) => {
        const createdAt = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
        return createdAt < lastMonth;
      });
      const lastMonthCompleted = lastMonthTransactions.filter((t: any) => t.status === "completed");

      const lastMonthTotal = lastMonthTransactions.length;
      const lastMonthSuccessRate = lastMonthTotal > 0 ? (lastMonthCompleted.length / lastMonthTotal) * 100 : 0;

      const lastMonthVolume = lastMonthTransactions
        .filter((t: any) => t.status === "paid" || t.status === "asset_transferred" || t.status === "completed")
        .reduce((sum: number, t: any) => sum + parseFloat(t.price), 0);

      const stats = {
        totalTransactions,
        successRate: Math.round(successRate),
        escrowVolume: Math.round(escrowVolume),
        totalTransactionsChange: lastMonthTotal > 0 ? Math.round(((totalTransactions - lastMonthTotal) / lastMonthTotal) * 100) : totalTransactions > 0 ? 100 : 0,
        successRateChange: lastMonthSuccessRate > 0 ? Math.round(successRate - lastMonthSuccessRate) : 0,
        escrowVolumeChange: lastMonthVolume > 0 ? Math.round(((escrowVolume - lastMonthVolume) / lastMonthVolume) * 100) : escrowVolume > 0 ? 100 : 0,
      };

      console.log('Buyer dashboard stats result:', stats);
      res.json(stats);
    } catch (error) {
      console.error('Buyer dashboard stats error:', error);
      next(error);
    }
  });

  app.get("/api/dashboard/buyer/transactions-over-time", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Buyer dashboard transactions-over-time called for user:', req.user?.id);
      const user = req.user as User;

      // Direct Firestore query for user's buyer transactions (by email)
      const { db } = await import("./firebase");
      const querySnapshot = await db.collection("transactions")
        .where("buyerEmail", "==", user.email)
        .get();

      const allTransactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      const monthlyData: Record<string, number> = {};
      const months = ["January", "February", "March", "April", "May", "June",
                     "July", "August", "September", "October", "November", "December"];

      allTransactions.forEach((transaction: any) => {
        const date = transaction.createdAt?.toDate ? transaction.createdAt.toDate() : new Date(transaction.createdAt);
        const monthName = months[date.getMonth()];
        const amount = parseFloat(transaction.price);

        if (!monthlyData[monthName]) {
          monthlyData[monthName] = 0;
        }
        monthlyData[monthName] += amount;
      });

      const data = months.map(month => ({
        month,
        amount: monthlyData[month] || 0,
      }));

      console.log('Buyer dashboard transactions-over-time result:', data);
      res.json({ data });
    } catch (error) {
      console.error('Buyer dashboard transactions-over-time error:', error);
      next(error);
    }
  });

  // Get recent activities for dashboard
  app.get("/api/dashboard/recent-activities", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Dashboard recent-activities called for user:', req.user?.id);
      const user = req.user as User;

      // Get both seller and buyer transactions
      const { db } = await import("./firebase");

      // Query for transactions where user is seller
      const sellerQuerySnapshot = await db.collection("transactions")
        .where("sellerId", "==", user.id)
        .get();

      // Query for transactions where user is buyer (by email)
      const buyerQuerySnapshot = await db.collection("transactions")
        .where("buyerEmail", "==", user.email)
        .get();

      // Combine and deduplicate transactions
      const transactionMap = new Map();

      // Add seller transactions
      sellerQuerySnapshot.docs.forEach(doc => {
        const transaction = { id: doc.id, ...doc.data() } as any;
        transactionMap.set(transaction.id, { ...transaction, userRole: 'seller' });
      });

      // Add buyer transactions (will overwrite if user is both seller and buyer, but that's unlikely)
      buyerQuerySnapshot.docs.forEach(doc => {
        const transaction = { id: doc.id, ...doc.data() } as any;
        transactionMap.set(transaction.id, { ...transaction, userRole: 'buyer' });
      });

      // Convert to array and sort by updatedAt (most recent first)
      const allTransactions = Array.from(transactionMap.values())
        .sort((a, b) => {
          const aTime = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt);
          const bTime = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt);
          return bTime.getTime() - aTime.getTime(); // Descending order
        })
        .slice(0, 10); // Apply limit after sorting

      const activities = allTransactions.map(transaction => {
        const isSeller = transaction.userRole === 'seller';
        const isBuyer = transaction.userRole === 'buyer';

        let activity = "";
        let details = "";

        if (isSeller) {
          // Seller activities
          switch (transaction.status) {
            case "pending":
              activity = `Transaction #${transaction.id.slice(0, 4)}`;
              details = "Awaiting buyer confirmation";
              break;
            case "paid":
              activity = `Transaction #${transaction.id.slice(0, 4)}`;
              details = "Payment received, transfer asset";
              break;
            case "asset_transferred":
              activity = `Transaction #${transaction.id.slice(0, 4)}`;
              details = "Asset transferred, awaiting buyer confirmation";
              break;
            case "completed":
              activity = `Transaction #${transaction.id.slice(0, 4)}`;
              details = "Transaction completed successfully";
              break;
          }
        } else if (isBuyer) {
          // Buyer activities
          switch (transaction.status) {
            case "pending":
              activity = `Transaction #${transaction.id.slice(0, 4)}`;
              details = "Transaction created, awaiting your confirmation";
              break;
            case "active":
              activity = `Transaction #${transaction.id.slice(0, 4)}`;
              details = "Transaction accepted, ready for payment";
              break;
            case "paid":
              activity = `Transaction #${transaction.id.slice(0, 4)}`;
              details = "Payment completed, awaiting asset transfer";
              break;
            case "asset_transferred":
              activity = `Transaction #${transaction.id.slice(0, 4)}`;
              details = "Asset transferred - confirm receipt to complete";
              break;
            case "completed":
              activity = `Transaction #${transaction.id.slice(0, 4)}`;
              details = "Transaction completed - item received";
              break;
          }
        }

        const timeDiff = Date.now() - new Date(transaction.updatedAt?.toDate ? transaction.updatedAt.toDate() : transaction.updatedAt).getTime();
        const minutes = Math.floor(timeDiff / 60000);
        const hours = Math.floor(timeDiff / 3600000);
        const days = Math.floor(timeDiff / 86400000);

        let time = "";
        if (minutes < 60) {
          time = `${minutes} mins ago`;
        } else if (hours < 24) {
          time = `${hours} hours ago`;
        } else {
          time = `${days} days ago`;
        }

        return {
          id: transaction.id,
          activity,
          details,
          time,
        };
      });

      console.log('Dashboard recent-activities result:', activities);
      res.json({ activities });
    } catch (error) {
      console.error('Dashboard recent-activities error:', error);
      next(error);
    }
  });



  // Bank account routes
  app.get("/api/banks", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const banksData = await listBanks();
      // Transform Korapay bank data to match frontend expectations
      const banks = banksData.data.map((bank: any) => ({
        id: bank.id,
        code: bank.code,
        name: bank.name
      }));
      res.json({ banks });
    } catch (error: any) {
      console.error('Banks API error:', error);
      res.json({ banks: [] });
    }
  });

  app.post("/api/bank-account/verify", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accountNumber, bankCode } = req.body;

      if (!accountNumber || !bankCode) {
        return res.status(400).json({ message: "Account number and bank code are required" });
      }

      if (!isKorapayConfigured()) {
        return res.status(503).json({ message: "Bank account verification is currently unavailable. Please try again later." });
      }

      const verificationData = await verifyAccountNumber(accountNumber, bankCode);
      res.json({
        accountName: verificationData.data.account_name,
        accountNumber: verificationData.data.account_number,
      });
    } catch (error: any) {
      console.error('Account verification error:', error);
      next(error);
    }
  });

  app.post("/api/bank-account", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;

      const result = updateBankAccountSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }

      const { bankCode, accountNumber, accountName } = result.data;

      // For Korapay, we don't need to create transfer recipients like Paystack
      // We just store the bank details directly
      const updatedUser = await storage.updateUserBankAccount(
        user.id,
        bankCode,
        accountNumber,
        accountName,
        null // No recipient code needed for Korapay
      );

      // Update the session user to reflect the changes
      req.user = updatedUser;

      const { password, ...userWithoutPassword } = updatedUser!;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      console.error('Save bank account error:', error);
      next(error);
    }
  });

  // Payout routes
  app.get("/api/payouts", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Payouts called for user:', req.user?.id);
      const user = req.user as User;
      const payouts = await storage.getPayoutsBySeller(user.id);
      console.log('Payouts result:', payouts);
      res.json({ payouts });
    } catch (error) {
      console.error('Payouts error:', error);
      next(error);
    }
  });

  // Manual payout processing (for testing/admin use)
  app.post("/api/payouts/process", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;

      // Only allow processing for the user's own payouts or admin users
      const { sellerId } = req.body;
      if (sellerId && sellerId !== user.id) {
        // Check if user is admin (you might want to add proper admin role checking)
        const userRole = (user as any).role;
        if (!["admin", "support", "superAdmin"].includes(userRole)) {
          return res.status(403).json({ message: "Forbidden: Can only process your own payouts" });
        }
      }

      const { runPayoutScheduler } = await import("./payout_scheduler");
      await runPayoutScheduler();

      res.json({ message: "Payout processing completed" });
    } catch (error) {
      console.error('Payout processing error:', error);
      next(error);
    }
  });

  // Notification routes
  app.get("/api/notifications", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const notifications = await storage.getNotificationsByUser(user.id);
      res.json({ notifications });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const count = await storage.getUnreadNotificationsCount(user.id);
      res.json({ count });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const notification = await storage.markNotificationAsRead(req.params.id);

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      if (notification.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      res.json({ notification });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/notifications/mark-all-read", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      await storage.markAllAsRead(user.id);
      res.json({ message: "All notifications marked as read" });
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

  // Escrow categories route
  app.get("/api/escrow-categories", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { db } = await import("./firebase");
      const querySnapshot = await db.collection("EscrowCategories").get();
      const categories = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ categories });
    } catch (error) {
      console.error('Error fetching escrow categories:', error);
      next(error);
    }
  });

  // Admin routes - Role-based access control
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = req.user as any;
    if (!user.role || !["admin", "support", "superAdmin"].includes(user.role)) {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = req.user as any;
    if (user.role !== "superAdmin") {
      return res.status(403).json({ message: "SuperAdmin access required" });
    }
    next();
  };

  // Admin: Get all transactions
  app.get("/api/admin/transactions", isAuthenticated, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { db } = await import("./firebase");
      const querySnapshot = await db.collection("transactions").get();
      const transactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ transactions });
    } catch (error) {
      next(error);
    }
  });

  // Admin: Get all users
  app.get("/api/admin/users", isAuthenticated, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { db } = await import("./firebase");
      const querySnapshot = await db.collection("users").get();
      const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ users });
    } catch (error) {
      next(error);
    }
  });

  // Admin: Get all disputes
  app.get("/api/admin/disputes", isAuthenticated, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { db } = await import("./firebase");
      const querySnapshot = await db.collection("disputes").get();
      const disputes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ disputes });
    } catch (error) {
      next(error);
    }
  });

  // Admin: Update transaction status
  app.post("/api/admin/transactions/:id/status", isAuthenticated, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, adminNotes } = req.body;
      const user = req.user as any;

      const transaction = await storage.updateTransactionStatus(req.params.id, status);

      // Log admin action
      const { db } = await import("./firebase");
      await db.collection("AdminLogs").add({
        action: "transaction_status_update",
        performedBy: user.id,
        transactionId: req.params.id,
        oldStatus: transaction?.status,
        newStatus: status,
        adminNotes,
        timestamp: new Date()
      });

      res.json({ transaction });
    } catch (error) {
      next(error);
    }
  });

  // Admin: Add admin notes to transaction
  app.post("/api/admin/transactions/:id/notes", isAuthenticated, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { notes } = req.body;
      const user = req.user as any;

      // Update transaction with admin notes
      const { db } = await import("./firebase");
      await db.collection("transactions").doc(req.params.id).update({
        adminNotes: notes,
        updatedAt: new Date()
      });

      // Log admin action
      await db.collection("AdminLogs").add({
        action: "admin_notes_added",
        performedBy: user.id,
        transactionId: req.params.id,
        notes,
        timestamp: new Date()
      });

      res.json({ message: "Notes added successfully" });
    } catch (error) {
      next(error);
    }
  });

  // SuperAdmin: Change user role
  app.post("/api/admin/users/:id/role", isAuthenticated, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role } = req.body;
      const user = req.user as any;

      const { db } = await import("./firebase");
      await db.collection("users").doc(req.params.id).update({
        role,
        updatedAt: new Date()
      });

      // Log admin action
      await db.collection("AdminLogs").add({
        action: "user_role_changed",
        performedBy: user.id,
        targetUserId: req.params.id,
        newRole: role,
        timestamp: new Date()
      });

      res.json({ message: "User role updated successfully" });
    } catch (error) {
      next(error);
    }
  });

  // SuperAdmin: Block/unblock user
  app.post("/api/admin/users/:id/status", isAuthenticated, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;
      const user = req.user as any;

      const { db } = await import("./firebase");
      await db.collection("users").doc(req.params.id).update({
        status,
        updatedAt: new Date()
      });

      // Log admin action
      await db.collection("AdminLogs").add({
        action: "user_status_changed",
        performedBy: user.id,
        targetUserId: req.params.id,
        newStatus: status,
        timestamp: new Date()
      });

      res.json({ message: "User status updated successfully" });
    } catch (error) {
      next(error);
    }
  });

  // SuperAdmin: Create new admin/support
  app.post("/api/admin/users", isAuthenticated, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      const user = req.user as any;

      // Create Firebase Auth user
      const { auth } = await import("./firebase");
      const userCredential = await auth.createUser({
        email,
        password,
        emailVerified: true,
      });

      // Create Firestore user document
      const { db } = await import("./firebase");
      const userDoc = {
        uid: userCredential.uid,
        email,
        firstName,
        lastName,
        role,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection("users").doc(userCredential.uid).set(userDoc);

      // Log admin action
      await db.collection("AdminLogs").add({
        action: "admin_user_created",
        performedBy: user.id,
        newUserId: userCredential.uid,
        newUserEmail: email,
        newUserRole: role,
        timestamp: new Date()
      });

      res.status(201).json({ message: "Admin user created successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Admin: Get audit logs
  app.get("/api/admin/logs", isAuthenticated, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { db } = await import("./firebase");
      const querySnapshot = await db.collection("AdminLogs").orderBy("timestamp", "desc").get();
      const logs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ logs });
    } catch (error) {
      next(error);
    }
  });

  // Office routes for sellers
  app.get("/api/office/ongoing-transactions", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Office ongoing transactions called for user:', req.user?.id);
      const user = req.user as User;
      const { status, search, sortBy = "createdAt", sortOrder = "desc", page = 1, limit = 50 } = req.query as any;

      // Direct Firestore query for all seller transactions (like dashboard)
      const { db } = await import("./firebase");
      const querySnapshot = await db.collection("transactions")
        .where("sellerId", "==", user.id)
        .get();

      let transactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      // Filter for ongoing transactions (not completed)
      transactions = transactions.filter(t => ["pending", "paid", "asset_transferred"].includes(t.status));

      // Apply status filter if specified
      if (status && status !== "all") {
        transactions = transactions.filter(t => t.status === status);
      }

      // Apply search filter if specified
      if (search) {
        const searchLower = search.toString().toLowerCase();
        transactions = transactions.filter(t =>
          (t.itemName && t.itemName.toLowerCase().includes(searchLower)) ||
          (t.buyerEmail && t.buyerEmail.toLowerCase().includes(searchLower)) ||
          (t.id && t.id.toLowerCase().includes(searchLower))
        );
      }

      // Sort transactions
      transactions.sort((a, b) => {
        const aValue = a[sortBy] || a.createdAt;
        const bValue = b[sortBy] || b.createdAt;
        const aTime = aValue?.toDate ? aValue.toDate() : new Date(aValue);
        const bTime = bValue?.toDate ? bValue.toDate() : new Date(bValue);
        return sortOrder === "desc" ? bTime.getTime() - aTime.getTime() : aTime.getTime() - bTime.getTime();
      });

      // Apply pagination
      const startIndex = (parseInt(page.toString()) - 1) * parseInt(limit.toString());
      const endIndex = startIndex + parseInt(limit.toString());
      const paginatedTransactions = transactions.slice(startIndex, endIndex);

      res.json({
        transactions: paginatedTransactions,
        total: transactions.length,
        page: parseInt(page.toString()),
        limit: parseInt(limit.toString()),
        totalPages: Math.ceil(transactions.length / parseInt(limit.toString()))
      });
    } catch (error) {
      console.error('Office ongoing transactions error:', error);
      next(error);
    }
  });

  app.get("/api/office/transaction-history", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Office transaction history called for user:', req.user?.id);
      const user = req.user as User;
      const { search, dateFrom, dateTo, minAmount, maxAmount, sortBy = "completedAt", sortOrder = "desc", page = 1, limit = 50 } = req.query as any;

      // Direct Firestore query for all seller transactions (like dashboard)
      const { db } = await import("./firebase");
      const querySnapshot = await db.collection("transactions")
        .where("sellerId", "==", user.id)
        .get();

      let transactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      // Filter for completed transactions
      transactions = transactions.filter(t => t.status === "completed");

      // Apply search filter if specified
      if (search) {
        const searchLower = search.toString().toLowerCase();
        transactions = transactions.filter(t =>
          (t.itemName && t.itemName.toLowerCase().includes(searchLower)) ||
          (t.buyerEmail && t.buyerEmail.toLowerCase().includes(searchLower)) ||
          (t.id && t.id.toLowerCase().includes(searchLower))
        );
      }

      // Apply date filters
      if (dateFrom) {
        const fromDate = new Date(dateFrom.toString());
        transactions = transactions.filter(t => {
          const createdAt = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
          return createdAt >= fromDate;
        });
      }

      if (dateTo) {
        const toDate = new Date(dateTo.toString());
        toDate.setHours(23, 59, 59, 999); // End of day
        transactions = transactions.filter(t => {
          const createdAt = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
          return createdAt <= toDate;
        });
      }

      // Apply amount filters
      if (minAmount) {
        const min = parseFloat(minAmount.toString());
        transactions = transactions.filter(t => parseFloat(t.price) >= min);
      }

      if (maxAmount) {
        const max = parseFloat(maxAmount.toString());
        transactions = transactions.filter(t => parseFloat(t.price) <= max);
      }

      // Sort transactions
      transactions.sort((a, b) => {
        const aValue = a[sortBy] || a.createdAt;
        const bValue = b[sortBy] || b.createdAt;
        const aTime = aValue?.toDate ? aValue.toDate() : new Date(aValue);
        const bTime = bValue?.toDate ? bValue.toDate() : new Date(bValue);
        return sortOrder === "desc" ? bTime.getTime() - aTime.getTime() : aTime.getTime() - bTime.getTime();
      });

      // Apply pagination
      const startIndex = (parseInt(page.toString()) - 1) * parseInt(limit.toString());
      const endIndex = startIndex + parseInt(limit.toString());
      const paginatedTransactions = transactions.slice(startIndex, endIndex);

      res.json({
        transactions: paginatedTransactions,
        total: transactions.length,
        page: parseInt(page.toString()),
        limit: parseInt(limit.toString()),
        totalPages: Math.ceil(transactions.length / parseInt(limit.toString()))
      });
    } catch (error) {
      console.error('Office transaction history error:', error);
      next(error);
    }
  });

  app.get("/api/office/stats", isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Office stats called for user:', req.user?.id);
      const user = req.user as User;

      // Direct Firestore query for all seller transactions (like dashboard)
      const { db } = await import("./firebase");
      const querySnapshot = await db.collection("transactions")
        .where("sellerId", "==", user.id)
        .get();

      const allTransactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      const totalTransactions = allTransactions.length;
      const completedTransactions = allTransactions.filter((t: any) => t.status === "completed").length;
      const ongoingTransactions = allTransactions.filter((t: any) =>
        ["pending", "paid", "asset_transferred"].includes(t.status)
      ).length;

      const totalRevenue = allTransactions
        .filter((t: any) => t.status === "completed")
        .reduce((sum: number, t: any) => sum + parseFloat(t.commission), 0);

      res.json({
        overview: {
          totalTransactions,
          completedTransactions,
          ongoingTransactions,
          totalRevenue: Math.round(totalRevenue * 100) / 100 // Round to 2 decimal places
        }
      });
    } catch (error) {
      console.error('Office stats error:', error);
      next(error);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
