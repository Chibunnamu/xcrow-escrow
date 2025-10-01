import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  country: text("country").notNull(),
  referralCode: text("referral_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactionStatuses = ["pending", "paid", "asset_transferred", "completed"] as const;
export type TransactionStatus = typeof transactionStatuses[number];

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  buyerEmail: text("buyer_email").notNull(),
  itemName: text("item_name").notNull(),
  itemDescription: text("item_description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  commission: decimal("commission", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending").$type<TransactionStatus>(),
  paystackReference: text("paystack_reference"),
  uniqueLink: text("unique_link").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  country: true,
  referralCode: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  sellerId: true,
  buyerEmail: true,
  itemName: true,
  itemDescription: true,
  price: true,
  uniqueLink: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
