import { type User, type InsertUser, type UpsertUser, type Transaction, type InsertTransaction, type Dispute, type InsertDispute, type Payout, type PayoutStatus, users, transactions, disputes, payouts, type TransactionStatus, type DisputeStatus } from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc } from "drizzle-orm";
import { Pool } from "pg";
import { hashPassword } from "./auth";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle({ client: pool });

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Transaction methods
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionByLink(link: string): Promise<Transaction | undefined>;
  getTransactionsBySeller(sellerId: string): Promise<Transaction[]>;
  getTransactionsByBuyer(buyerId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  acceptTransaction(id: string, buyerId: string): Promise<Transaction | undefined>;
  updateTransactionStatus(id: string, status: TransactionStatus, paystackReference?: string): Promise<Transaction | undefined>;
  
  // Dispute methods
  getDispute(id: string): Promise<Dispute | undefined>;
  getDisputesBySeller(sellerId: string): Promise<Dispute[]>;
  getDisputeByTransaction(transactionId: string): Promise<Dispute | undefined>;
  createDispute(dispute: InsertDispute): Promise<Dispute>;
  updateDisputeStatus(id: string, status: DisputeStatus): Promise<Dispute | undefined>;
  
  // Statistics methods
  getDashboardStats(sellerId: string): Promise<{
    totalTransactions: number;
    successRate: number;
    escrowVolume: number;
    totalTransactionsChange: number;
    successRateChange: number;
    escrowVolumeChange: number;
  }>;
  getTransactionsOverTime(sellerId: string): Promise<Array<{ month: string; amount: number }>>;
  getRecentActivities(sellerId: string, limit: number): Promise<Array<{
    id: string;
    activity: string;
    details: string;
    time: string;
  }>>;
  
  // Bank account methods
  updateUserBankAccount(userId: string, bankCode: string, accountNumber: string, accountName: string, recipientCode: string): Promise<User | undefined>;
  getUserBankAccount(userId: string): Promise<User | undefined>;
  
  // Payout methods
  createPayout(transactionId: string, sellerId: string, amount: string): Promise<Payout>;
  updatePayoutStatus(payoutId: string, status: PayoutStatus, transferCode?: string, paystackReference?: string, failureReason?: string): Promise<Payout | undefined>;
  getPayoutsBySeller(sellerId: string): Promise<Array<Payout & { transaction: Transaction }>>;
  getPayoutByTransaction(transactionId: string): Promise<Payout | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await hashPassword(insertUser.password);
    const result = await db.insert(users).values({
      ...insertUser,
      password: hashedPassword,
    }).returning();
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Transaction methods
  async getTransaction(id: string): Promise<Transaction | undefined> {
    const result = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
    return result[0];
  }

  async getTransactionByLink(link: string): Promise<Transaction | undefined> {
    const result = await db.select().from(transactions).where(eq(transactions.uniqueLink, link)).limit(1);
    return result[0];
  }

  async getTransactionsBySeller(sellerId: string): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.sellerId, sellerId));
  }

  async getTransactionsByBuyer(buyerId: string): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.buyerId, buyerId));
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const commission = (parseFloat(insertTransaction.price) * 0.05).toFixed(2);
    const result = await db.insert(transactions).values({
      ...insertTransaction,
      commission,
    }).returning();
    return result[0];
  }

  async acceptTransaction(id: string, buyerId: string): Promise<Transaction | undefined> {
    const result = await db.update(transactions)
      .set({ buyerId, updatedAt: new Date() })
      .where(eq(transactions.id, id))
      .returning();
    return result[0];
  }

  private validateStateTransition(
    currentStatus: TransactionStatus,
    newStatus: TransactionStatus,
    paystackReference?: string
  ): { valid: boolean; error?: string } {
    const transitions: Record<TransactionStatus, TransactionStatus[]> = {
      pending: ["paid"],
      paid: ["asset_transferred"],
      asset_transferred: ["completed"],
      completed: [],
    };

    if (!transitions[currentStatus].includes(newStatus)) {
      return {
        valid: false,
        error: `Invalid transition from ${currentStatus} to ${newStatus}`,
      };
    }

    if (newStatus === "paid" && !paystackReference) {
      return {
        valid: false,
        error: "Payment reference required for paid status",
      };
    }

    return { valid: true };
  }

  async updateTransactionStatus(id: string, status: TransactionStatus, paystackReference?: string): Promise<Transaction | undefined> {
    const transaction = await this.getTransaction(id);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    const validation = this.validateStateTransition(
      transaction.status,
      status,
      paystackReference
    );

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const updateData: any = { status, updatedAt: new Date() };
    if (paystackReference) {
      updateData.paystackReference = paystackReference;
    }
    const result = await db.update(transactions)
      .set(updateData)
      .where(eq(transactions.id, id))
      .returning();
    return result[0];
  }

  // Dispute methods
  async getDispute(id: string): Promise<Dispute | undefined> {
    const result = await db.select().from(disputes).where(eq(disputes.id, id)).limit(1);
    return result[0];
  }

  async getDisputesBySeller(sellerId: string): Promise<Dispute[]> {
    return await db.select().from(disputes).where(eq(disputes.sellerId, sellerId));
  }

  async getDisputeByTransaction(transactionId: string): Promise<Dispute | undefined> {
    const result = await db.select().from(disputes).where(eq(disputes.transactionId, transactionId)).limit(1);
    return result[0];
  }

  async createDispute(insertDispute: InsertDispute): Promise<Dispute> {
    const result = await db.insert(disputes).values(insertDispute).returning();
    return result[0];
  }

  async updateDisputeStatus(id: string, status: DisputeStatus): Promise<Dispute | undefined> {
    const result = await db.update(disputes)
      .set({ status, updatedAt: new Date() })
      .where(eq(disputes.id, id))
      .returning();
    return result[0];
  }

  // Statistics methods
  async getDashboardStats(sellerId: string): Promise<{
    totalTransactions: number;
    successRate: number;
    escrowVolume: number;
    totalTransactionsChange: number;
    successRateChange: number;
    escrowVolumeChange: number;
  }> {
    const allTransactions = await this.getTransactionsBySeller(sellerId);
    const totalTransactions = allTransactions.length;
    
    const completedTransactions = allTransactions.filter(t => t.status === "completed");
    const successRate = totalTransactions > 0 
      ? (completedTransactions.length / totalTransactions) * 100 
      : 0;
    
    const escrowVolume = allTransactions
      .filter(t => t.status === "paid" || t.status === "asset_transferred" || t.status === "completed")
      .reduce((sum, t) => sum + parseFloat(t.price), 0);

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    
    const lastMonthTransactions = allTransactions.filter(t => new Date(t.createdAt) < lastMonth);
    const lastMonthCompleted = lastMonthTransactions.filter(t => t.status === "completed");
    
    const lastMonthTotal = lastMonthTransactions.length;
    const lastMonthSuccessRate = lastMonthTotal > 0 
      ? (lastMonthCompleted.length / lastMonthTotal) * 100 
      : 0;
    
    const lastMonthVolume = lastMonthTransactions
      .filter(t => t.status === "paid" || t.status === "asset_transferred" || t.status === "completed")
      .reduce((sum, t) => sum + parseFloat(t.price), 0);

    return {
      totalTransactions,
      successRate: Math.round(successRate),
      escrowVolume: Math.round(escrowVolume),
      totalTransactionsChange: lastMonthTotal > 0 
        ? Math.round(((totalTransactions - lastMonthTotal) / lastMonthTotal) * 100)
        : totalTransactions > 0 ? 100 : 0,
      successRateChange: lastMonthSuccessRate > 0
        ? Math.round(successRate - lastMonthSuccessRate)
        : 0,
      escrowVolumeChange: lastMonthVolume > 0
        ? Math.round(((escrowVolume - lastMonthVolume) / lastMonthVolume) * 100)
        : escrowVolume > 0 ? 100 : 0,
    };
  }

  async getTransactionsOverTime(sellerId: string): Promise<Array<{ month: string; amount: number }>> {
    const allTransactions = await this.getTransactionsBySeller(sellerId);
    
    const monthlyData: Record<string, number> = {};
    const months = ["January", "February", "March", "April", "May", "June", 
                   "July", "August", "September", "October", "November", "December"];
    
    allTransactions.forEach(transaction => {
      const date = new Date(transaction.createdAt);
      const monthName = months[date.getMonth()];
      const amount = parseFloat(transaction.price);
      
      if (!monthlyData[monthName]) {
        monthlyData[monthName] = 0;
      }
      monthlyData[monthName] += amount;
    });

    return months.map(month => ({
      month,
      amount: monthlyData[month] || 0,
    }));
  }

  async getRecentActivities(sellerId: string, limit: number = 10): Promise<Array<{
    id: string;
    activity: string;
    details: string;
    time: string;
  }>> {
    const allTransactions = await this.getTransactionsBySeller(sellerId);
    
    const activities = allTransactions
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit)
      .map(transaction => {
        let activity = "";
        let details = "";
        
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
        
        const timeDiff = Date.now() - new Date(transaction.updatedAt).getTime();
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
    
    return activities;
  }

  // Bank account methods
  async updateUserBankAccount(userId: string, bankCode: string, accountNumber: string, accountName: string, recipientCode: string): Promise<User | undefined> {
    const result = await db.update(users)
      .set({ 
        bankCode, 
        accountNumber, 
        accountName, 
        recipientCode 
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async getUserBankAccount(userId: string): Promise<User | undefined> {
    return await this.getUser(userId);
  }

  // Payout methods
  async createPayout(transactionId: string, sellerId: string, amount: string): Promise<Payout> {
    const result = await db.insert(payouts).values({
      transactionId,
      sellerId,
      amount,
      status: "pending",
    }).returning();
    return result[0];
  }

  async updatePayoutStatus(payoutId: string, status: PayoutStatus, transferCode?: string, paystackReference?: string, failureReason?: string): Promise<Payout | undefined> {
    const updateData: any = { status, updatedAt: new Date() };
    if (transferCode) {
      updateData.paystackTransferCode = transferCode;
    }
    if (paystackReference) {
      updateData.paystackReference = paystackReference;
    }
    if (failureReason) {
      updateData.failureReason = failureReason;
    }
    
    const result = await db.update(payouts)
      .set(updateData)
      .where(eq(payouts.id, payoutId))
      .returning();
    return result[0];
  }

  async getPayoutsBySeller(sellerId: string): Promise<Array<Payout & { transaction: Transaction }>> {
    const result = await db
      .select({
        payout: payouts,
        transaction: transactions,
      })
      .from(payouts)
      .innerJoin(transactions, eq(payouts.transactionId, transactions.id))
      .where(eq(payouts.sellerId, sellerId))
      .orderBy(desc(payouts.createdAt));
    
    return result.map((row) => ({
      ...row.payout,
      transaction: row.transaction,
    }));
  }

  async getPayoutByTransaction(transactionId: string): Promise<Payout | undefined> {
    const result = await db.select().from(payouts).where(eq(payouts.transactionId, transactionId)).limit(1);
    return result[0];
  }
}

export const storage = new DatabaseStorage();
