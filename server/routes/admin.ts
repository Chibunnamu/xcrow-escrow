import type { Express, Request, Response, NextFunction } from "express";
import { isAuthenticated } from "../auth";
import { storage } from "../storage";
import type { User } from "@shared/schema";

export function registerAdminRoutes(app: Express): void {
  // Middleware to check admin role
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

  // Admin login page (simplified - in production, use proper admin auth)
  app.get("/admin/login", (req: Request, res: Response) => {
    // For now, just redirect to main login - in production, create separate admin login
    res.redirect("/login");
  });

  // Admin dashboard stats
  app.get("/api/admin/dashboard", isAuthenticated, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { db } = await import("../firebase");

      // Get all transactions
      const transactionsQuery = await db.collection("transactions").get();
      const allTransactions = transactionsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate revenue metrics
      const totalRevenue = allTransactions
        .filter((t: any) => t.status === "paid" || t.status === "asset_transferred" || t.status === "completed")
        .reduce((sum: number, t: any) => sum + parseFloat(t.price), 0);

      const totalServiceFees = allTransactions
        .filter((t: any) => t.status === "paid" || t.status === "asset_transferred" || t.status === "completed")
        .reduce((sum: number, t: any) => sum + parseFloat(t.commission), 0);

      // Get all payouts
      const payoutsQuery = await db.collection("payouts").get();
      const allPayouts = payoutsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const totalPayouts = allPayouts
        .filter((p: any) => p.status === "completed")
        .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);

      const pendingPayouts = allPayouts.filter((p: any) => p.status === "pending_settlement" || p.status === "processing").length;
      const failedPayouts = allPayouts.filter((p: any) => p.status === "failed").length;

      // Recent transactions (last 10)
      const recentTransactions = allTransactions
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      // Recent payouts (last 10)
      const recentPayouts = allPayouts
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      res.json({
        stats: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalServiceFees: Math.round(totalServiceFees * 100) / 100,
          totalPayouts: Math.round(totalPayouts * 100) / 100,
          pendingPayouts,
          failedPayouts,
          totalTransactions: allTransactions.length,
        },
        recentTransactions,
        recentPayouts,
      });
    } catch (error) {
      console.error("Admin dashboard error:", error);
      next(error);
    }
  });

  // Manual payout retry
  app.post("/api/admin/payouts/retry", isAuthenticated, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { payoutId } = req.body;

      if (!payoutId) {
        return res.status(400).json({ message: "Payout ID is required" });
      }

      const payout = await storage.getPayoutById ? await (storage as any).getPayoutById(payoutId) : null;
      if (!payout) {
        return res.status(404).json({ message: "Payout not found" });
      }

      // Reset retry count and status
      await storage.updatePayoutRetryInfo(payoutId, 0);
      await storage.updatePayoutStatus(payoutId, "not_ready");

      // Trigger payout processing
      const { processPayoutQueue } = await import("../payout");
      await processPayoutQueue(payout.sellerId);

      res.json({ message: "Payout retry initiated" });
    } catch (error) {
      console.error("Admin payout retry error:", error);
      next(error);
    }
  });

  // Get all transactions for admin table
  app.get("/api/admin/transactions", isAuthenticated, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { db } = await import("../firebase");
      const querySnapshot = await db.collection("transactions").orderBy("createdAt", "desc").get();
      const transactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ transactions });
    } catch (error) {
      next(error);
    }
  });

  // Get all payouts for admin table
  app.get("/api/admin/payouts", isAuthenticated, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { db } = await import("../firebase");
      const querySnapshot = await db.collection("payouts").orderBy("createdAt", "desc").get();
      const payouts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json({ payouts });
    } catch (error) {
      next(error);
    }
  });

  // Update transaction status (admin override)
  app.post("/api/admin/transactions/:id/status", isAuthenticated, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, adminNotes } = req.body;
      const user = req.user as any;

      const transaction = await storage.updateTransactionStatus(req.params.id, status);

      // Log admin action
      const { db } = await import("../firebase");
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
}
