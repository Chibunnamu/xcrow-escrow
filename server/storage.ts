import { db } from "./firebase.ts";
import type { User, InsertUser, UpsertUser, Transaction, InsertTransaction, Dispute, InsertDispute, Payout, PayoutStatus, TransactionStatus, DisputeStatus, Notification, InsertNotification } from "@shared/schema";
import { randomBytes } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByOAuthSub(oauthSub: string): Promise<User | undefined>;
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
  getPayoutByTransferCode(transferCode: string): Promise<Payout | undefined>;

  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationAsRead(notificationId: string): Promise<Notification | undefined>;
  markAllAsRead(userId: string): Promise<boolean>;
  getUnreadNotificationsCount(userId: string): Promise<number>;
}

class FirebaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    try {
      const docRef = db.collection("users").doc(id);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        return { id, ...docSnap.data() } as User;
      }
      return undefined;
    } catch (error) {
      console.error("Error getting user:", error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const querySnapshot = await db.collection("users").where("email", "==", email).get();
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as User;
      }
      return undefined;
    } catch (error) {
      console.error("Error getting user by email:", error);
      throw error;
    }
  }

  async getUserByOAuthSub(oauthSub: string): Promise<User | undefined> {
    try {
      const querySnapshot = await db.collection("users").where("oauthSub", "==", oauthSub).get();
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as User;
      }
      return undefined;
    } catch (error) {
      console.error("Error getting user by OAuth sub:", error);
      throw error;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const docRef = db.collection("users").doc();
      const userData = {
        ...user,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await docRef.set(userData);
      return userData as User;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    try {
      const existingUser = await this.getUserByEmail(user.email!);
      if (existingUser) {
        const docRef = db.collection("users").doc(existingUser.id);
        const updateData = {
          ...user,
          updatedAt: new Date(),
        };
        await docRef.update(updateData);
        return { ...existingUser, ...updateData };
      } else {
        // For OAuth users, create with default values for required fields
        const userData: InsertUser = {
          email: user.email!,
          password: user.oauthSub || 'oauth_user', // Use oauthSub as password or default
          firstName: user.firstName || user.email!.split('@')[0],
          lastName: user.lastName || '',
          country: 'Nigeria', // Default country
        };
        return this.createUser(userData);
      }
    } catch (error) {
      console.error("Error upserting user:", error);
      throw error;
    }
  }

  // Transaction methods
  async getTransaction(id: string): Promise<Transaction | undefined> {
    try {
      const docRef = db.collection("transactions").doc(id);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        return { id, ...docSnap.data() } as Transaction;
      }
      return undefined;
    } catch (error) {
      console.error("Error getting transaction:", error);
      throw error;
    }
  }

  async getTransactionByLink(link: string): Promise<Transaction | undefined> {
    try {
      const querySnapshot = await db.collection("transactions").where("uniqueLink", "==", link).get();
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Transaction;
      }
      return undefined;
    } catch (error) {
      console.error("Error getting transaction by link:", error);
      throw error;
    }
  }

  async getTransactionsBySeller(sellerId: string): Promise<Transaction[]> {
    try {
      const querySnapshot = await db.collection("transactions")
        .where("sellerId", "==", sellerId)
        .get();
      // Sort in memory instead of using orderBy (avoids composite index requirement)
      return querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Transaction))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error("Error getting transactions by seller:", error);
      throw error;
    }
  }

  async getTransactionsByBuyer(buyerId: string): Promise<Transaction[]> {
    try {
      const querySnapshot = await db.collection("transactions")
        .where("buyerId", "==", buyerId)
        .get();
      // Sort in memory instead of using orderBy (avoids composite index requirement)
      return querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Transaction))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error("Error getting transactions by buyer:", error);
      throw error;
    }
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    try {
      const docRef = db.collection("transactions").doc();
      const uniqueLink = randomBytes(16).toString("hex");
      const commission = (parseFloat(transaction.price) * 0.05).toFixed(2);
      const transactionData = {
        ...transaction,
        uniqueLink,
        commission,
        status: "pending",
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await docRef.set(transactionData);
      return transactionData as Transaction;
    } catch (error) {
      console.error("Error creating transaction:", error);
      throw error;
    }
  }

  async acceptTransaction(id: string, buyerId: string): Promise<Transaction | undefined> {
    try {
      const transaction = await this.getTransaction(id);
      if (!transaction) {
        return undefined;
      }

      const docRef = db.collection("transactions").doc(id);
      const updateData = {
        buyerId,
        status: "active" as TransactionStatus,
        acceptedAt: new Date(),
        updatedAt: new Date(),
      };
      await docRef.update(updateData);
      return { ...transaction, ...updateData };
    } catch (error) {
      console.error("Error accepting transaction:", error);
      throw error;
    }
  }

  async updateTransactionStatus(id: string, status: TransactionStatus, paystackReference?: string): Promise<Transaction | undefined> {
    try {
      const transaction = await this.getTransaction(id);
      if (!transaction) {
        return undefined;
      }

      const docRef = db.collection("transactions").doc(id);
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };
      if (paystackReference) {
        updateData.paystackReference = paystackReference;
      }
      await docRef.update(updateData);
      return { ...transaction, ...updateData };
    } catch (error) {
      console.error("Error updating transaction status:", error);
      throw error;
    }
  }

  // Dispute methods
  async getDispute(id: string): Promise<Dispute | undefined> {
    try {
      const docRef = db.collection("disputes").doc(id);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        return { id, ...docSnap.data() } as Dispute;
      }
      return undefined;
    } catch (error) {
      console.error("Error getting dispute:", error);
      throw error;
    }
  }

  async getDisputesBySeller(sellerId: string): Promise<Dispute[]> {
    try {
      const querySnapshot = await db.collection("disputes")
        .where("sellerId", "==", sellerId)
        .get();
      // Sort in memory instead of using orderBy (avoids composite index requirement)
      return querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Dispute))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error("Error getting disputes by seller:", error);
      throw error;
    }
  }

  async getDisputeByTransaction(transactionId: string): Promise<Dispute | undefined> {
    try {
      const querySnapshot = await db.collection("disputes").where("transactionId", "==", transactionId).get();
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Dispute;
      }
      return undefined;
    } catch (error) {
      console.error("Error getting dispute by transaction:", error);
      throw error;
    }
  }

  async createDispute(dispute: InsertDispute): Promise<Dispute> {
    try {
      const docRef = db.collection("disputes").doc();
      const disputeData = {
        ...dispute,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await docRef.set(disputeData);
      return disputeData as Dispute;
    } catch (error) {
      console.error("Error creating dispute:", error);
      throw error;
    }
  }

  async updateDisputeStatus(id: string, status: DisputeStatus): Promise<Dispute | undefined> {
    try {
      const dispute = await this.getDispute(id);
      if (!dispute) {
        return undefined;
      }

      const docRef = db.collection("disputes").doc(id);
      const updateData = {
        status,
        updatedAt: new Date(),
      };
      await docRef.update(updateData);
      return { ...dispute, ...updateData };
    } catch (error) {
      console.error("Error updating dispute status:", error);
      throw error;
    }
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
    try {
      const docRef = db.collection("users").doc(userId);
      const updateData = {
        bankCode,
        accountNumber,
        accountName,
        recipientCode,
        updatedAt: new Date(),
      };
      await docRef.update(updateData);
      const updatedUser = await this.getUser(userId);
      return updatedUser;
    } catch (error) {
      console.error("Error updating user bank account:", error);
      throw error;
    }
  }

  async getUserBankAccount(userId: string): Promise<User | undefined> {
    return this.getUser(userId);
  }

  // Payout methods
  async createPayout(transactionId: string, sellerId: string, amount: string): Promise<Payout> {
    try {
      const docRef = db.collection("payouts").doc();
      const payoutData = {
        id: docRef.id,
        transactionId,
        sellerId,
        amount,
        status: "pending" as PayoutStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await docRef.set(payoutData);
      return payoutData as Payout;
    } catch (error) {
      console.error("Error creating payout:", error);
      throw error;
    }
  }

  async updatePayoutStatus(payoutId: string, status: PayoutStatus, transferCode?: string, paystackReference?: string, failureReason?: string): Promise<Payout | undefined> {
    try {
      const docRef = db.collection("payouts").doc(payoutId);
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };
      if (transferCode) {
        updateData.paystackTransferCode = transferCode;
      }
      if (paystackReference) {
        updateData.paystackReference = paystackReference;
      }
      if (failureReason) {
        updateData.failureReason = failureReason;
      }
      await docRef.update(updateData);

      const docSnap = await docRef.get();
      if (docSnap.exists) {
        return { id: docSnap.id, ...docSnap.data() } as Payout;
      }
      return undefined;
    } catch (error) {
      console.error("Error updating payout status:", error);
      throw error;
    }
  }

  async getPayoutsBySeller(sellerId: string): Promise<Array<Payout & { transaction: Transaction }>> {
    try {
      const querySnapshot = await db.collection("payouts")
        .where("sellerId", "==", sellerId)
        .get();
      // Sort in memory instead of using orderBy (avoids composite index requirement)
      const payouts = await Promise.all(
        querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Payout))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map(async (payout) => {
            const transaction = await this.getTransaction(payout.transactionId);
            return { ...payout, transaction: transaction! };
          })
      );
      return payouts;
    } catch (error) {
      console.error("Error getting payouts by seller:", error);
      throw error;
    }
  }

  async getPayoutByTransaction(transactionId: string): Promise<Payout | undefined> {
    try {
      const querySnapshot = await db.collection("payouts").where("transactionId", "==", transactionId).get();
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Payout;
      }
      return undefined;
    } catch (error) {
      console.error("Error getting payout by transaction:", error);
      throw error;
    }
  }

  async getPayoutByTransferCode(transferCode: string): Promise<Payout | undefined> {
    try {
      const querySnapshot = await db.collection("payouts").where("paystackTransferCode", "==", transferCode).get();
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Payout;
      }
      return undefined;
    } catch (error) {
      console.error("Error getting payout by transfer code:", error);
      throw error;
    }
  }

  // Notification methods
  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const docRef = db.collection("notifications").doc();
      const notificationData = {
        ...notification,
        id: docRef.id,
        createdAt: new Date(),
      };
      await docRef.set(notificationData);
      return notificationData as Notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    try {
      const querySnapshot = await db.collection("notifications")
        .where("userId", "==", userId)
        .get();
      // Sort in memory instead of using orderBy (avoids composite index requirement)
      return querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Notification))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error("Error getting notifications by user:", error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<Notification | undefined> {
    try {
      const docRef = db.collection("notifications").doc(notificationId);
      const updateData = {
        isRead: 1,
      };
      await docRef.update(updateData);

      const docSnap = await docRef.get();
      if (docSnap.exists) {
        return { id: docSnap.id, ...docSnap.data() } as Notification;
      }
      return undefined;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  async getUnreadNotificationsCount(userId: string): Promise<number> {
    try {
      const querySnapshot = await db.collection("notifications")
        .where("userId", "==", userId)
        .where("isRead", "==", 0)
        .get();
      return querySnapshot.size;
    } catch (error) {
      console.error("Error getting unread notifications count:", error);
      throw error;
    }
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const querySnapshot = await db.collection("notifications")
        .where("userId", "==", userId)
        .where("isRead", "==", 0)
        .get();

      const batch = db.batch();
      querySnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isRead: 1 });
      });

      await batch.commit();
      return true;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }
}

export const storage = new FirebaseStorage();
