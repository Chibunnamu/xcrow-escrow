import { storage } from "./storage";
import { SellerWallet } from "@shared/schema";

/**
 * Wallet service for managing seller internal balances
 * This is a ledger-only system, not real money
 */

export async function creditPendingBalance(sellerId: string, amount: number): Promise<SellerWallet> {
  // Ensure amount is positive
  if (amount <= 0) {
    throw new Error("Credit amount must be positive");
  }

  // Get or create wallet
  let wallet = await storage.getSellerWallet(sellerId);
  if (!wallet) {
    wallet = await storage.createSellerWallet(sellerId);
  }

  // Credit pending balance
  const newPendingBalance = parseFloat(wallet.pendingBalance) + amount;
  return await storage.updateSellerWallet(sellerId, {
    pendingBalance: newPendingBalance.toFixed(2),
    updatedAt: new Date(),
  });
}

export async function moveToAvailable(sellerId: string, amount: number): Promise<SellerWallet> {
  // Ensure amount is positive
  if (amount <= 0) {
    throw new Error("Move amount must be positive");
  }

  const wallet = await storage.getSellerWallet(sellerId);
  if (!wallet) {
    throw new Error("Wallet not found");
  }

  const currentPending = parseFloat(wallet.pendingBalance);
  if (currentPending < amount) {
    throw new Error("Insufficient pending balance");
  }

  const newPendingBalance = currentPending - amount;
  const newAvailableBalance = parseFloat(wallet.availableBalance) + amount;

  return await storage.updateSellerWallet(sellerId, {
    pendingBalance: newPendingBalance.toFixed(2),
    availableBalance: newAvailableBalance.toFixed(2),
    lastSettlementCheck: new Date(),
    updatedAt: new Date(),
  });
}

export async function getWallet(sellerId: string): Promise<SellerWallet | null> {
  const wallet = await storage.getSellerWallet(sellerId);
  return wallet || null;
}

export async function deductAvailableBalance(sellerId: string, amount: number): Promise<SellerWallet> {
  // Ensure amount is positive
  if (amount <= 0) {
    throw new Error("Deduct amount must be positive");
  }

  const wallet = await storage.getSellerWallet(sellerId);
  if (!wallet) {
    throw new Error("Wallet not found");
  }

  const currentAvailable = parseFloat(wallet.availableBalance);
  if (currentAvailable < amount) {
    throw new Error("Insufficient available balance");
  }

  const newAvailableBalance = currentAvailable - amount;

  return await storage.updateSellerWallet(sellerId, {
    availableBalance: newAvailableBalance.toFixed(2),
    updatedAt: new Date(),
  });
}

export async function creditAvailableBalance(sellerId: string, amount: number): Promise<SellerWallet> {
  // Ensure amount is positive
  if (amount <= 0) {
    throw new Error("Credit amount must be positive");
  }

  // Get or create wallet
  let wallet = await storage.getSellerWallet(sellerId);
  if (!wallet) {
    wallet = await storage.createSellerWallet(sellerId);
  }

  // Credit available balance
  const newAvailableBalance = parseFloat(wallet.availableBalance) + amount;
  return await storage.updateSellerWallet(sellerId, {
    availableBalance: newAvailableBalance.toFixed(2),
    updatedAt: new Date(),
  });
}
