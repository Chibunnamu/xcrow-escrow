import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  oauthSub: varchar("oauth_sub").unique(),
  email: text("email").unique(),
  password: text("password"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  country: text("country"),
  referralCode: text("referral_code"),
  profileImageUrl: varchar("profile_image_url"),
  bankCode: text("bank_code"),
  accountNumber: text("account_number"),
  accountName: text("account_name"),
  recipientCode: text("recipient_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const transactionStatuses = ["pending", "paid", "asset_transferred", "completed"] as const;
export type TransactionStatus = typeof transactionStatuses[number];

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  buyerId: varchar("buyer_id").references(() => users.id),
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

export const disputeStatuses = ["pending", "resolved", "closed"] as const;
export type DisputeStatus = typeof disputeStatuses[number];

export const disputes = pgTable("disputes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").notNull().references(() => transactions.id),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  description: text("description").notNull(),
  evidence: text("evidence"),
  status: text("status").notNull().default("pending").$type<DisputeStatus>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  country: z.string().min(1),
  referralCode: z.string().optional(),
});

export const upsertUserSchema = z.object({
  oauthSub: z.string(),
  email: z.string().optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  profileImageUrl: z.string().optional().nullable(),
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  sellerId: true,
  buyerEmail: true,
  itemName: true,
  itemDescription: true,
  price: true,
  uniqueLink: true,
});

export const updateTransactionStatusSchema = z.object({
  status: z.enum(transactionStatuses),
  paystackReference: z.string().optional(),
});

export const insertDisputeSchema = createInsertSchema(disputes).pick({
  transactionId: true,
  sellerId: true,
  reason: true,
  description: true,
  evidence: true,
});

export const updateDisputeStatusSchema = z.object({
  status: z.enum(disputeStatuses),
});

export const payoutStatuses = ["pending", "processing", "success", "failed"] as const;
export type PayoutStatus = typeof payoutStatuses[number];

export const payouts = pgTable("payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").notNull().unique().references(() => transactions.id),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending").$type<PayoutStatus>(),
  paystackTransferCode: text("paystack_transfer_code"),
  paystackReference: text("paystack_reference"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const updateBankAccountSchema = z.object({
  bankCode: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type UpdateTransactionStatus = z.infer<typeof updateTransactionStatusSchema>;
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputes.$inferSelect;
export type UpdateDisputeStatus = z.infer<typeof updateDisputeStatusSchema>;
export type Payout = typeof payouts.$inferSelect;
export type UpdateBankAccount = z.infer<typeof updateBankAccountSchema>;
