import { type User, type InsertUser, type Transaction, type InsertTransaction, users, transactions, type TransactionStatus } from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
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
  
  // Transaction methods
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionByLink(link: string): Promise<Transaction | undefined>;
  getTransactionsBySeller(sellerId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransactionStatus(id: string, status: TransactionStatus, paystackReference?: string): Promise<Transaction | undefined>;
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

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const commission = (parseFloat(insertTransaction.price) * 0.05).toFixed(2);
    const result = await db.insert(transactions).values({
      ...insertTransaction,
      commission,
    }).returning();
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
}

export const storage = new DatabaseStorage();
