var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/firebase.ts
var firebase_exports = {};
__export(firebase_exports, {
  auth: () => auth,
  db: () => db,
  default: () => firebase_default,
  firestore: () => db,
  storage: () => storage
});
import admin from "firebase-admin";
var firebaseConfig, app, auth, db, storage, firebase_default;
var init_firebase = __esm({
  "server/firebase.ts"() {
    "use strict";
    firebaseConfig = {
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
      }),
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`
    };
    app = admin.initializeApp(firebaseConfig);
    auth = admin.auth(app);
    db = admin.firestore(app);
    storage = admin.storage(app);
    firebase_default = app;
  }
});

// server/logger.ts
var logger_exports = {};
__export(logger_exports, {
  default: () => logger_default,
  logRequest: () => logRequest
});
import winston from "winston";
function logRequest(req, additionalData) {
  const logData = {
    method: req.method,
    path: req.path,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("User-Agent"),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userId: req.user?.id || null,
    sessionId: req.sessionID || null,
    ...additionalData
  };
  logger.info("API Request", logData);
}
var logger, logger_default;
var init_logger = __esm({
  "server/logger.ts"() {
    "use strict";
    logger = winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({ filename: "logs/api.log" })
      ]
    });
    logger_default = logger;
  }
});

// server/index.ts
import "dotenv/config";
import express2 from "express";
import morgan from "morgan";
import crypto from "crypto";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
init_firebase();
import { randomBytes } from "crypto";
var FirebaseStorage = class {
  // User methods
  async getUser(id) {
    try {
      const docRef = db.collection("users").doc(id);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        return { id, ...docSnap.data() };
      }
      return void 0;
    } catch (error) {
      console.error("Error getting user:", error);
      throw error;
    }
  }
  async getUserByEmail(email) {
    try {
      const querySnapshot = await db.collection("users").where("email", "==", email).get();
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      return void 0;
    } catch (error) {
      console.error("Error getting user by email:", error);
      throw error;
    }
  }
  async getUserByOAuthSub(oauthSub) {
    try {
      const querySnapshot = await db.collection("users").where("oauthSub", "==", oauthSub).get();
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      return void 0;
    } catch (error) {
      console.error("Error getting user by OAuth sub:", error);
      throw error;
    }
  }
  async createUser(user) {
    try {
      const docRef = db.collection("users").doc();
      const userData = {
        ...user,
        id: docRef.id,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      await docRef.set(userData);
      return userData;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }
  async upsertUser(user) {
    try {
      const existingUser = await this.getUserByEmail(user.email);
      if (existingUser) {
        const docRef = db.collection("users").doc(existingUser.id);
        const updateData = {
          ...user,
          updatedAt: /* @__PURE__ */ new Date()
        };
        await docRef.update(updateData);
        return { ...existingUser, ...updateData };
      } else {
        const userData = {
          email: user.email,
          password: user.oauthSub || "oauth_user",
          // Use oauthSub as password or default
          firstName: user.firstName || user.email.split("@")[0],
          lastName: user.lastName || "",
          country: "Nigeria"
          // Default country
        };
        return this.createUser(userData);
      }
    } catch (error) {
      console.error("Error upserting user:", error);
      throw error;
    }
  }
  // Transaction methods
  async getTransaction(id) {
    try {
      const docRef = db.collection("transactions").doc(id);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const data = docSnap.data();
        return {
          id,
          sellerId: data.sellerId,
          buyerId: data.buyerId,
          buyerEmail: data.buyerEmail,
          itemName: data.itemName,
          itemDescription: data.itemDescription,
          price: data.price,
          commission: data.commission,
          status: data.status,
          paystackReference: data.paystackReference,
          uniqueLink: data.uniqueLink,
          createdAt: new Date(data?.createdAt?.toDate?.() || data?.createdAt),
          updatedAt: new Date(data?.updatedAt?.toDate?.() || data?.updatedAt)
        };
      }
      return void 0;
    } catch (error) {
      console.error("Error getting transaction:", error);
      throw error;
    }
  }
  async getTransactionByLink(link) {
    try {
      const querySnapshot = await db.collection("transactions").where("uniqueLink", "==", link).get();
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
          id: doc.id,
          sellerId: data.sellerId,
          buyerId: data.buyerId,
          buyerEmail: data.buyerEmail,
          itemName: data.itemName,
          itemDescription: data.itemDescription,
          price: data.price,
          commission: data.commission,
          status: data.status,
          paystackReference: data.paystackReference,
          uniqueLink: data.uniqueLink,
          createdAt: new Date(data.createdAt?.toDate?.() || data.createdAt),
          updatedAt: new Date(data.updatedAt?.toDate?.() || data.updatedAt)
        };
      }
      return void 0;
    } catch (error) {
      console.error("Error getting transaction by link:", error);
      throw error;
    }
  }
  async getTransactionsBySeller(sellerId) {
    try {
      const querySnapshot = await db.collection("transactions").where("sellerId", "==", sellerId).get();
      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          sellerId: data.sellerId,
          buyerId: data.buyerId,
          buyerEmail: data.buyerEmail,
          itemName: data.itemName,
          itemDescription: data.itemDescription,
          price: data.price,
          commission: data.commission,
          status: data.status,
          paystackReference: data.paystackReference,
          uniqueLink: data.uniqueLink,
          createdAt: new Date(data.createdAt?.toDate?.() || data.createdAt),
          updatedAt: new Date(data.updatedAt?.toDate?.() || data.updatedAt)
        };
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error("Error getting transactions by seller:", error);
      throw error;
    }
  }
  async getTransactionsByBuyer(buyerId) {
    try {
      const querySnapshot = await db.collection("transactions").where("buyerId", "==", buyerId).get();
      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          sellerId: data.sellerId,
          buyerId: data.buyerId,
          buyerEmail: data.buyerEmail,
          itemName: data.itemName,
          itemDescription: data.itemDescription,
          price: data.price,
          commission: data.commission,
          status: data.status,
          paystackReference: data.paystackReference,
          uniqueLink: data.uniqueLink,
          createdAt: new Date(data.createdAt?.toDate?.() || data.createdAt),
          updatedAt: new Date(data.updatedAt?.toDate?.() || data.updatedAt)
        };
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error("Error getting transactions by buyer:", error);
      throw error;
    }
  }
  async createTransaction(transaction) {
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
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      await docRef.set(transactionData);
      return transactionData;
    } catch (error) {
      console.error("Error creating transaction:", error);
      throw error;
    }
  }
  async acceptTransaction(id, buyerId) {
    try {
      const transaction = await this.getTransaction(id);
      if (!transaction) {
        return void 0;
      }
      const docRef = db.collection("transactions").doc(id);
      const updateData = {
        buyerId,
        status: "active",
        acceptedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      await docRef.update(updateData);
      return { ...transaction, ...updateData };
    } catch (error) {
      console.error("Error accepting transaction:", error);
      throw error;
    }
  }
  async updateTransactionStatus(id, status, paystackReference) {
    try {
      const transaction = await this.getTransaction(id);
      if (!transaction) {
        return void 0;
      }
      const docRef = db.collection("transactions").doc(id);
      const updateData = {
        status,
        updatedAt: /* @__PURE__ */ new Date()
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
  async getDispute(id) {
    try {
      const docRef = db.collection("disputes").doc(id);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        return { id, ...docSnap.data() };
      }
      return void 0;
    } catch (error) {
      console.error("Error getting dispute:", error);
      throw error;
    }
  }
  async getDisputesBySeller(sellerId) {
    try {
      const querySnapshot = await db.collection("disputes").where("sellerId", "==", sellerId).get();
      return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error("Error getting disputes by seller:", error);
      throw error;
    }
  }
  async getDisputeByTransaction(transactionId) {
    try {
      const querySnapshot = await db.collection("disputes").where("transactionId", "==", transactionId).get();
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      return void 0;
    } catch (error) {
      console.error("Error getting dispute by transaction:", error);
      throw error;
    }
  }
  async createDispute(dispute) {
    try {
      const docRef = db.collection("disputes").doc();
      const disputeData = {
        ...dispute,
        id: docRef.id,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      await docRef.set(disputeData);
      return disputeData;
    } catch (error) {
      console.error("Error creating dispute:", error);
      throw error;
    }
  }
  async updateDisputeStatus(id, status) {
    try {
      const dispute = await this.getDispute(id);
      if (!dispute) {
        return void 0;
      }
      const docRef = db.collection("disputes").doc(id);
      const updateData = {
        status,
        updatedAt: /* @__PURE__ */ new Date()
      };
      await docRef.update(updateData);
      return { ...dispute, ...updateData };
    } catch (error) {
      console.error("Error updating dispute status:", error);
      throw error;
    }
  }
  // Statistics methods
  async getDashboardStats(sellerId) {
    const allTransactions = await this.getTransactionsBySeller(sellerId);
    const totalTransactions = allTransactions.length;
    const completedTransactions = allTransactions.filter((t) => t.status === "completed");
    const successRate = totalTransactions > 0 ? completedTransactions.length / totalTransactions * 100 : 0;
    const escrowVolume = allTransactions.filter((t) => t.status === "paid" || t.status === "asset_transferred" || t.status === "completed").reduce((sum, t) => sum + parseFloat(t.price), 0);
    const now = /* @__PURE__ */ new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const lastMonthTransactions = allTransactions.filter((t) => new Date(t.createdAt) < lastMonth);
    const lastMonthCompleted = lastMonthTransactions.filter((t) => t.status === "completed");
    const lastMonthTotal = lastMonthTransactions.length;
    const lastMonthSuccessRate = lastMonthTotal > 0 ? lastMonthCompleted.length / lastMonthTotal * 100 : 0;
    const lastMonthVolume = lastMonthTransactions.filter((t) => t.status === "paid" || t.status === "asset_transferred" || t.status === "completed").reduce((sum, t) => sum + parseFloat(t.price), 0);
    return {
      totalTransactions,
      successRate: Math.round(successRate),
      escrowVolume: Math.round(escrowVolume),
      totalTransactionsChange: lastMonthTotal > 0 ? Math.round((totalTransactions - lastMonthTotal) / lastMonthTotal * 100) : totalTransactions > 0 ? 100 : 0,
      successRateChange: lastMonthSuccessRate > 0 ? Math.round(successRate - lastMonthSuccessRate) : 0,
      escrowVolumeChange: lastMonthVolume > 0 ? Math.round((escrowVolume - lastMonthVolume) / lastMonthVolume * 100) : escrowVolume > 0 ? 100 : 0
    };
  }
  async getTransactionsOverTime(sellerId) {
    const allTransactions = await this.getTransactionsBySeller(sellerId);
    const monthlyData = {};
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ];
    allTransactions.forEach((transaction) => {
      const date = new Date(transaction.createdAt);
      const monthName = months[date.getMonth()];
      const amount = parseFloat(transaction.price);
      if (!monthlyData[monthName]) {
        monthlyData[monthName] = 0;
      }
      monthlyData[monthName] += amount;
    });
    return months.map((month) => ({
      month,
      amount: monthlyData[month] || 0
    }));
  }
  async getRecentActivities(sellerId, limit = 10) {
    const allTransactions = await this.getTransactionsBySeller(sellerId);
    const activities = allTransactions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, limit).map((transaction) => {
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
      const minutes = Math.floor(timeDiff / 6e4);
      const hours = Math.floor(timeDiff / 36e5);
      const days = Math.floor(timeDiff / 864e5);
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
        time
      };
    });
    return activities;
  }
  // Bank account methods
  async updateUserBankAccount(userId, bankCode, accountNumber, accountName, recipientCode) {
    try {
      const docRef = db.collection("users").doc(userId);
      const updateData = {
        bankCode,
        accountNumber,
        accountName,
        recipientCode,
        updatedAt: /* @__PURE__ */ new Date()
      };
      await docRef.update(updateData);
      const updatedUser = await this.getUser(userId);
      return updatedUser;
    } catch (error) {
      console.error("Error updating user bank account:", error);
      throw error;
    }
  }
  async getUserBankAccount(userId) {
    return this.getUser(userId);
  }
  // Payout methods
  async createPayout(transactionId, sellerId, amount) {
    try {
      const docRef = db.collection("payouts").doc();
      const payoutData = {
        id: docRef.id,
        transactionId,
        sellerId,
        amount,
        status: "pending",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      await docRef.set(payoutData);
      return payoutData;
    } catch (error) {
      console.error("Error creating payout:", error);
      throw error;
    }
  }
  async updatePayoutStatus(payoutId, status, transferCode, paystackReference, failureReason) {
    try {
      const docRef = db.collection("payouts").doc(payoutId);
      const updateData = {
        status,
        updatedAt: /* @__PURE__ */ new Date()
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
        return { id: docSnap.id, ...docSnap.data() };
      }
      return void 0;
    } catch (error) {
      console.error("Error updating payout status:", error);
      throw error;
    }
  }
  async getPayoutsBySeller(sellerId) {
    try {
      const querySnapshot = await db.collection("payouts").where("sellerId", "==", sellerId).get();
      const payouts2 = await Promise.all(
        querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: new Date(data.createdAt?.toDate?.() || data.createdAt),
            updatedAt: new Date(data.updatedAt?.toDate?.() || data.updatedAt)
          };
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(async (payout) => {
          const transaction = await this.getTransaction(payout.transactionId);
          return { ...payout, transaction };
        })
      );
      return payouts2;
    } catch (error) {
      console.error("Error getting payouts by seller:", error);
      throw error;
    }
  }
  async getPayoutByTransaction(transactionId) {
    try {
      const querySnapshot = await db.collection("payouts").where("transactionId", "==", transactionId).get();
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      return void 0;
    } catch (error) {
      console.error("Error getting payout by transaction:", error);
      throw error;
    }
  }
  async getPayoutByTransferCode(transferCode) {
    try {
      const querySnapshot = await db.collection("payouts").where("paystackTransferCode", "==", transferCode).get();
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      return void 0;
    } catch (error) {
      console.error("Error getting payout by transfer code:", error);
      throw error;
    }
  }
  // Notification methods
  async createNotification(notification) {
    try {
      const docRef = db.collection("notifications").doc();
      const notificationData = {
        ...notification,
        id: docRef.id,
        createdAt: /* @__PURE__ */ new Date()
      };
      await docRef.set(notificationData);
      return notificationData;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }
  async getNotificationsByUser(userId) {
    try {
      const querySnapshot = await db.collection("notifications").where("userId", "==", userId).get();
      return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error("Error getting notifications by user:", error);
      throw error;
    }
  }
  async markNotificationAsRead(notificationId) {
    try {
      const docRef = db.collection("notifications").doc(notificationId);
      const updateData = {
        isRead: 1
      };
      await docRef.update(updateData);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return void 0;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }
  async getUnreadNotificationsCount(userId) {
    try {
      const querySnapshot = await db.collection("notifications").where("userId", "==", userId).where("isRead", "==", 0).get();
      return querySnapshot.size;
    } catch (error) {
      console.error("Error getting unread notifications count:", error);
      throw error;
    }
  }
  async markAllAsRead(userId) {
    try {
      const querySnapshot = await db.collection("notifications").where("userId", "==", userId).where("isRead", "==", 0).get();
      const batch = db.batch();
      querySnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { isRead: 1 });
      });
      await batch.commit();
      return true;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }
};
var storage2 = new FirebaseStorage();

// server/auth.ts
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
function setupAuth(app3) {
  app3.use(session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
    // Set to true in production with HTTPS
  }));
  app3.use(passport.initialize());
  app3.use(passport.session());
  passport.use(new LocalStrategy({
    usernameField: "email",
    passwordField: "password"
  }, async (email, password, done) => {
    try {
      const user = await storage2.getUserByEmail(email);
      if (!user) {
        return done(null, false, { message: "User not found" });
      }
      if (user.password !== password) {
        return done(null, false, { message: "Invalid password" });
      }
      return done(null, {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      });
    } catch (error) {
      return done(error);
    }
  }));
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("No email provided by Google"));
        }
        let user = await storage2.getUserByEmail(email);
        if (!user) {
          user = await storage2.upsertUser({
            oauthSub: profile.id,
            email,
            firstName: profile.name?.givenName || "",
            lastName: profile.name?.familyName || "",
            profileImageUrl: profile.photos?.[0]?.value
          });
        }
        return done(null, {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        });
      } catch (error) {
        return done(error);
      }
    }));
  }
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    passport.use(new FacebookStrategy({
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "/auth/facebook/callback",
      profileFields: ["id", "emails", "name"]
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("No email provided by Facebook"));
        }
        let user = await storage2.getUserByEmail(email);
        if (!user) {
          user = await storage2.upsertUser({
            oauthSub: profile.id,
            email,
            firstName: profile.name?.givenName || "",
            lastName: profile.name?.familyName || "",
            profileImageUrl: profile.photos?.[0]?.value
          });
        }
        return done(null, {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        });
      } catch (error) {
        return done(error);
      }
    }));
  }
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage2.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      });
    } catch (error) {
      done(error);
    }
  });
}
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
}
var isAuthenticated = requireAuth;

// server/routes.ts
import passport2 from "passport";

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var users = pgTable("users", {
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
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var transactionStatuses = ["pending", "active", "paid", "asset_transferred", "completed", "cancelled"];
var transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  buyerId: varchar("buyer_id").references(() => users.id),
  buyerEmail: text("buyer_email").notNull(),
  itemName: text("item_name").notNull(),
  itemDescription: text("item_description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  commission: decimal("commission", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending").$type(),
  paystackReference: text("paystack_reference"),
  uniqueLink: text("unique_link").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var disputeStatuses = ["pending", "resolved", "closed"];
var disputes = pgTable("disputes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").notNull().references(() => transactions.id),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  description: text("description").notNull(),
  evidence: text("evidence"),
  status: text("status").notNull().default("pending").$type(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  country: z.string().min(1),
  referralCode: z.string().optional()
});
var upsertUserSchema = z.object({
  oauthSub: z.string(),
  email: z.string().optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  profileImageUrl: z.string().optional().nullable()
});
var insertTransactionSchema = z.object({
  sellerId: z.string(),
  buyerEmail: z.string().email(),
  itemName: z.string().min(1),
  itemDescription: z.string().min(1),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/)
});
var updateTransactionStatusSchema = z.object({
  status: z.enum(transactionStatuses),
  paystackReference: z.string().optional()
});
var insertDisputeSchema = createInsertSchema(disputes).pick({
  transactionId: true,
  sellerId: true,
  reason: true,
  description: true,
  evidence: true
});
var updateDisputeStatusSchema = z.object({
  status: z.enum(disputeStatuses)
});
var payouts = pgTable("payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").notNull().unique().references(() => transactions.id),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending").$type(),
  paystackTransferCode: text("paystack_transfer_code"),
  paystackReference: text("paystack_reference"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var notificationTypes = [
  // User Events
  "user_registered",
  "user_login",
  "user_profile_updated",
  "user_bank_account_updated",
  // Transaction Events
  "transaction_created",
  "transaction_accepted",
  "transaction_paid",
  "transaction_asset_transferred",
  "transaction_completed",
  "transaction_cancelled",
  "transaction_status_changed",
  // Payment Events
  "payment_initiated",
  "payment_successful",
  "payment_failed",
  "payment_refunded",
  // Payout Events
  "payout_initiated",
  "payout_processing",
  "payout_successful",
  "payout_failed",
  // Dispute Events
  "dispute_created",
  "dispute_updated",
  "dispute_resolved",
  "dispute_closed",
  // System Events
  "system_maintenance",
  "security_alert"
];
var notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull().$type(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"),
  isRead: integer("is_read").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var updateBankAccountSchema = z.object({
  bankCode: z.string(),
  accountNumber: z.string(),
  accountName: z.string()
});
var insertNotificationSchema = z.object({
  userId: z.string(),
  type: z.enum(notificationTypes),
  title: z.string(),
  message: z.string(),
  data: z.any().optional()
});

// server/paystack.ts
import axios from "axios";
var PAYSTACK_BASE_URL = "https://api.paystack.co";
var PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
if (!PAYSTACK_SECRET_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY environment variable is required");
}
var paystackClient = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json"
  }
});
async function initializePayment(params) {
  try {
    const response = await paystackClient.post(
      "/transaction/initialize",
      {
        email: params.email,
        amount: params.amount * 100,
        // Convert to kobo
        reference: params.reference,
        metadata: params.metadata,
        callback_url: `${process.env.VITE_API_URL}/payment-callback`
      }
    );
    return response.data;
  } catch (error) {
    console.error("Paystack initialize payment error:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || "Failed to initialize payment"
    );
  }
}
async function verifyPayment(reference) {
  try {
    const response = await paystackClient.get(
      `/transaction/verify/${reference}`
    );
    return response.data;
  } catch (error) {
    console.error("Paystack verify payment error:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || "Failed to verify payment"
    );
  }
}

// server/transfer.ts
import axios2 from "axios";
var PAYSTACK_SECRET_KEY2 = process.env.PAYSTACK_SECRET_KEY;
if (!PAYSTACK_SECRET_KEY2) {
  throw new Error("PAYSTACK_SECRET_KEY is required for transfer functionality");
}
var PAYSTACK_BASE_URL2 = "https://api.paystack.co";
async function listBanks() {
  try {
    const response = await axios2.get(
      `${PAYSTACK_BASE_URL2}/bank?country=nigeria`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY2}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Paystack list banks error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Failed to fetch banks");
  }
}
async function verifyAccountNumber(accountNumber, bankCode) {
  try {
    const response = await axios2.get(
      `${PAYSTACK_BASE_URL2}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY2}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Paystack account verification error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Failed to verify account");
  }
}
async function createTransferRecipient(accountName, accountNumber, bankCode) {
  try {
    const response = await axios2.post(
      `${PAYSTACK_BASE_URL2}/transferrecipient`,
      {
        type: "nuban",
        name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: "NGN"
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY2}`,
          "Content-Type": "application/json"
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Paystack create recipient error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Failed to create transfer recipient");
  }
}
async function initiateTransfer(recipientCode, amount, reference, reason) {
  try {
    const amountInKobo = Math.round(amount * 100);
    const response = await axios2.post(
      `${PAYSTACK_BASE_URL2}/transfer`,
      {
        source: "balance",
        amount: amountInKobo,
        recipient: recipientCode,
        reason,
        reference
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY2}`,
          "Content-Type": "application/json"
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Paystack transfer error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Failed to initiate transfer");
  }
}

// server/routes.ts
async function registerRoutes(app3) {
  app3.get("/api/auth/google", passport2.authenticate("google", { scope: ["profile", "email"] }));
  app3.get(
    "/api/auth/google/callback",
    passport2.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
      res.redirect("/");
    }
  );
  app3.get("/api/auth/facebook", passport2.authenticate("facebook", { scope: ["email"] }));
  app3.get(
    "/api/auth/facebook/callback",
    passport2.authenticate("facebook", { failureRedirect: "/login" }),
    (req, res) => {
      res.redirect("/");
    }
  );
  app3.post("/api/signup", async (req, res, next) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }
      const existingUser = await storage2.getUserByEmail(result.data.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      const user = await storage2.createUser(result.data);
      await storage2.createNotification({
        userId: user.id,
        type: "user_registered",
        title: "Account Registration",
        message: `New user account created for ${user.email} from ${user.country || "Unknown"}.`,
        data: {
          action: "user_registration",
          email: user.email,
          country: user.country,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get("User-Agent")
        }
      });
      req.session.regenerate((err) => {
        if (err) {
          return next(err);
        }
        req.login({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }, (err2) => {
          if (err2) {
            return next(err2);
          }
          const { password, ...userWithoutPassword } = user;
          res.status(201).json({ user: userWithoutPassword });
        });
      });
    } catch (error) {
      next(error);
    }
  });
  app3.post("/api/login", (req, res, next) => {
    passport2.authenticate("local", async (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      try {
        await storage2.createNotification({
          userId: user.id,
          type: "user_login",
          title: "User Login",
          message: `User ${user.email} logged in successfully.`,
          data: {
            action: "user_login",
            email: user.email,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get("User-Agent"),
            sessionId: req.sessionID
          }
        });
      } catch (notificationError) {
        console.error("Error creating login notification:", notificationError);
      }
      req.session.regenerate((err2) => {
        if (err2) {
          return next(err2);
        }
        req.login(user, (err3) => {
          if (err3) {
            return next(err3);
          }
          const { password, ...userWithoutPassword } = user;
          res.json({ user: userWithoutPassword });
        });
      });
    })(req, res, next);
  });
  app3.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy((err2) => {
        if (err2) {
          return res.status(500).json({ message: "Session destruction failed" });
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out successfully" });
      });
    });
  });
  app3.get("/api/user", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { password, ...userWithoutPassword } = req.user;
    res.json({ user: userWithoutPassword });
  });
  app3.get("/api/transactions", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      const sellerTransactions = await storage2.getTransactionsBySeller(user.id);
      const buyerTransactions = await storage2.getTransactionsByBuyer(user.id);
      const allTransactions = [...sellerTransactions, ...buyerTransactions];
      res.json({ transactions: allTransactions });
    } catch (error) {
      next(error);
    }
  });
  app3.post("/api/transactions", isAuthenticated, async (req, res, next) => {
    console.log("Creating transaction for user:", req.user);
    try {
      const user = req.user;
      const transactionData = {
        ...req.body,
        sellerId: user.id
      };
      const result = insertTransactionSchema.safeParse(transactionData);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }
      console.log("Transaction data to insert:", transactionData);
      const transaction = await storage2.createTransaction(result.data);
      console.log("Transaction created:", transaction);
      await storage2.createNotification({
        userId: user.id,
        type: "transaction_created",
        title: "Transaction Created",
        message: `Transaction "${transaction.itemName}" created by seller ${user.email} for \u20A6${transaction.price}.`,
        data: {
          action: "transaction_creation",
          transactionId: transaction.id,
          sellerId: user.id,
          sellerEmail: user.email,
          itemName: transaction.itemName,
          price: transaction.price,
          buyerEmail: transaction.buyerEmail,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get("User-Agent")
        }
      });
      res.status(201).json({ transaction });
    } catch (error) {
      console.error("Error creating transaction:", error);
      next(error);
    }
  });
  app3.get("/api/transactions/id/:id", async (req, res, next) => {
    try {
      const transaction = await storage2.getTransaction(req.params.id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json({ transaction });
    } catch (error) {
      next(error);
    }
  });
  app3.get("/api/transactions/:link", async (req, res, next) => {
    try {
      const transaction = await storage2.getTransactionByLink(req.params.link);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json({ transaction });
    } catch (error) {
      next(error);
    }
  });
  app3.get("/api/transactions/seller", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      const transactions2 = await storage2.getTransactionsBySeller(user.id);
      res.json({ transactions: transactions2 });
    } catch (error) {
      next(error);
    }
  });
  app3.get("/api/transactions/buyer", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      const transactions2 = await storage2.getTransactionsByBuyer(user.id);
      res.json({ transactions: transactions2 });
    } catch (error) {
      next(error);
    }
  });
  app3.patch("/api/transactions/:id/status", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      const result = updateTransactionStatusSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }
      const existingTransaction = await storage2.getTransaction(req.params.id);
      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      const isSeller = existingTransaction.sellerId === user.id;
      const isBuyer = existingTransaction.buyerId === user.id;
      if (result.data.status === "asset_transferred") {
        if (!isSeller) {
          return res.status(403).json({ message: "Forbidden: Only the seller can mark asset as transferred" });
        }
      } else if (result.data.status === "completed") {
        if (!isBuyer) {
          return res.status(403).json({ message: "Forbidden: Only the buyer can confirm completion" });
        }
      } else if (result.data.status === "paid") {
        return res.status(403).json({ message: "Forbidden: Payment status is automatically set by payment gateway" });
      }
      const transaction = await storage2.updateTransactionStatus(
        req.params.id,
        result.data.status,
        result.data.paystackReference
      );
      if (result.data.status === "completed" && transaction) {
        try {
          const existingPayout = await storage2.getPayoutByTransaction(req.params.id);
          if (existingPayout && (existingPayout.status === "success" || existingPayout.status === "processing")) {
            console.log("Payout already exists for transaction:", req.params.id, "with status:", existingPayout.status);
          } else {
            const seller = await storage2.getUser(existingTransaction.sellerId);
            if (!seller) {
              console.error("Seller not found for transaction:", req.params.id);
            } else if (!seller.recipientCode) {
              console.log("Seller has no bank account configured, payout skipped for transaction:", req.params.id);
            } else {
              const payoutAmount = (parseFloat(existingTransaction.price) - parseFloat(existingTransaction.commission)).toFixed(2);
              const payout = existingPayout || await storage2.createPayout(
                req.params.id,
                existingTransaction.sellerId,
                payoutAmount
              );
              try {
                const transferReference = `PAYOUT-${payout.id}`;
                const transferData = await initiateTransfer(
                  seller.recipientCode,
                  parseFloat(payoutAmount),
                  transferReference,
                  `Payout for transaction ${existingTransaction.itemName}`
                );
                await storage2.updatePayoutStatus(
                  payout.id,
                  "success",
                  transferData.data.transfer_code,
                  transferData.data.reference
                );
                await storage2.createNotification({
                  userId: existingTransaction.sellerId,
                  type: "payout_processing",
                  title: "Payout Processing",
                  message: `Payout of \u20A6${payoutAmount} is being processed for transaction "${existingTransaction.itemName}" (Transfer Code: ${transferData.data.transfer_code}).`,
                  data: {
                    action: "payout_processing",
                    payoutId: payout.id,
                    transactionId: existingTransaction.id,
                    sellerId: existingTransaction.sellerId,
                    amount: payoutAmount,
                    transferCode: transferData.data.transfer_code,
                    paystackReference: transferData.data.reference,
                    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                    paymentMethod: "paystack_transfer"
                  }
                });
              } catch (transferError) {
                console.error("Transfer initiation failed:", transferError);
                await storage2.updatePayoutStatus(
                  payout.id,
                  "failed",
                  void 0,
                  void 0,
                  transferError.message || "Transfer initiation failed"
                );
                await storage2.createNotification({
                  userId: existingTransaction.sellerId,
                  type: "payout_failed",
                  title: "Payout Failed",
                  message: `Your payout of \u20A6${payoutAmount} could not be processed. ${transferError.message || "Transfer initiation failed"}`,
                  data: { payoutId: payout.id, amount: payoutAmount, failureReason: transferError.message }
                });
              }
            }
          }
        } catch (payoutError) {
          console.error("Payout processing error:", payoutError);
        }
      }
      res.json({ transaction });
    } catch (error) {
      next(error);
    }
  });
  app3.post("/api/transactions/:id/accept", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      const existingTransaction = await storage2.getTransaction(req.params.id);
      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      if (!["pending", "active"].includes(existingTransaction.status)) {
        return res.status(400).json({ message: "Transaction is no longer available for acceptance" });
      }
      if (existingTransaction.buyerId) {
        return res.status(400).json({ message: "Transaction already accepted by another buyer" });
      }
      if (existingTransaction.sellerId === user.id) {
        return res.status(403).json({ message: "You cannot accept your own transaction" });
      }
      if (!user.email || existingTransaction.buyerEmail.toLowerCase() !== user.email.toLowerCase()) {
        return res.status(403).json({ message: "This transaction is intended for a different buyer" });
      }
      const transaction = await storage2.acceptTransaction(req.params.id, user.id);
      if (transaction) {
        await storage2.createNotification({
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
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get("User-Agent")
          }
        });
        await storage2.createNotification({
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
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get("User-Agent")
          }
        });
      }
      res.json({ transaction });
    } catch (error) {
      next(error);
    }
  });
  app3.post("/api/transactions/:id/cancel", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      const existingTransaction = await storage2.getTransaction(req.params.id);
      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      if (existingTransaction.status !== "pending") {
        return res.status(400).json({ message: "Transaction cannot be cancelled at this stage" });
      }
      if (existingTransaction.buyerId && existingTransaction.buyerId !== user.id) {
        return res.status(403).json({ message: "Only the buyer can cancel this transaction" });
      }
      if (!existingTransaction.buyerId && existingTransaction.sellerId !== user.id) {
        return res.status(403).json({ message: "Only the seller can cancel this transaction" });
      }
      const transaction = await storage2.updateTransactionStatus(req.params.id, "cancelled");
      res.json({ transaction });
    } catch (error) {
      next(error);
    }
  });
  app3.post("/api/transactions/:id/mark-transferred", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      const existingTransaction = await storage2.getTransaction(req.params.id);
      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      if (existingTransaction.status !== "paid") {
        return res.status(400).json({ message: "Transaction must be paid before marking as transferred" });
      }
      if (existingTransaction.sellerId !== user.id) {
        return res.status(403).json({ message: "Only the seller can mark asset as transferred" });
      }
      const transaction = await storage2.updateTransactionStatus(req.params.id, "asset_transferred");
      if (transaction) {
        await storage2.createNotification({
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
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get("User-Agent")
          }
        });
        if (transaction.buyerId) {
          await storage2.createNotification({
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
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get("User-Agent")
            }
          });
        }
      }
      res.json({ transaction });
    } catch (error) {
      next(error);
    }
  });
  app3.get("/api/welcome", async (req, res) => {
    const { logRequest: logRequest2 } = await Promise.resolve().then(() => (init_logger(), logger_exports));
    logRequest2(req, { message: "Welcome endpoint accessed" });
    res.json({ message: "Welcome to the Xcrow API!" });
  });
  app3.get("/api/health", (req, res) => {
    console.log("Health check called for user:", req.user?.id || "unauthenticated");
    res.json({
      status: "healthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptime: process.uptime(),
      user: req.user?.id || null
    });
  });
  app3.get("/payment-callback", (req, res) => {
    const reference = req.query.reference;
    const trxref = req.query.trxref;
    if (reference) {
      res.redirect(`/?payment_reference=${reference}`);
    } else {
      res.redirect("/?payment=failed");
    }
  });
  app3.post("/api/payments/initialize", isAuthenticated, async (req, res, next) => {
    try {
      console.log("Initializing payment for user:", req.user);
      const user = req.user;
      const { transactionId } = req.body;
      console.log("Received transactionId:", transactionId);
      if (!transactionId) {
        console.log("No transactionId provided");
        return res.status(400).json({ message: "Transaction ID is required" });
      }
      let transaction = await storage2.getTransaction(transactionId);
      if (!transaction) {
        transaction = await storage2.getTransactionByLink(transactionId);
      }
      console.log("Found transaction:", transaction);
      if (!transaction) {
        console.log("Transaction not found for ID or link:", transactionId);
        return res.status(404).json({ message: "Transaction not found" });
      }
      if (transaction.status !== "active") {
        console.log("Transaction status is not active:", transaction.status);
        return res.status(400).json({ message: "Transaction is not ready for payment" });
      }
      if (!transaction.buyerId) {
        console.log("Transaction not accepted yet");
        return res.status(403).json({ message: "You must accept the transaction before making payment" });
      }
      if (transaction.buyerId !== user.id) {
        console.log("Buyer ID mismatch:", transaction.buyerId, "vs", user.id);
        return res.status(403).json({ message: "You are not authorized to pay for this transaction" });
      }
      const reference = `TXN-${transaction.id}-${Date.now()}`;
      const totalAmount = parseFloat(transaction.price) + parseFloat(transaction.commission);
      console.log("Calculated total amount:", totalAmount, "for price:", transaction.price, "commission:", transaction.commission);
      console.log("Calling initializePayment with params:", {
        email: transaction.buyerEmail,
        amount: totalAmount,
        reference,
        metadata: {
          transactionId: transaction.id,
          itemName: transaction.itemName
        }
      });
      const paymentData = await initializePayment({
        email: transaction.buyerEmail,
        amount: totalAmount,
        reference,
        metadata: {
          transactionId: transaction.id,
          itemName: transaction.itemName
        }
      });
      console.log("Payment initialized successfully:", paymentData);
      res.json({
        authorization_url: paymentData.data.authorization_url,
        reference: paymentData.data.reference
      });
    } catch (error) {
      console.error("Error initializing payment:", error);
      next(error);
    }
  });
  app3.get("/api/payments/verify/:reference", async (req, res, next) => {
    try {
      const { reference } = req.params;
      const paymentData = await verifyPayment(reference);
      if (paymentData.data.status === "success") {
        const transactionId = paymentData.data.metadata?.transactionId;
        if (transactionId) {
          await storage2.updateTransactionStatus(transactionId, "paid", reference);
        }
        res.json({
          status: "success",
          message: "Payment verified successfully",
          data: paymentData.data
        });
      } else {
        res.status(400).json({
          status: "failed",
          message: "Payment verification failed"
        });
      }
    } catch (error) {
      next(error);
    }
  });
  app3.get("/api/dashboard/stats", isAuthenticated, async (req, res, next) => {
    try {
      console.log("Dashboard stats called for user:", req.user?.id);
      const user = req.user;
      const { db: db2 } = await Promise.resolve().then(() => (init_firebase(), firebase_exports));
      const querySnapshot = await db2.collection("transactions").where("sellerId", "==", user.id).get();
      const allTransactions = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const totalTransactions = allTransactions.length;
      const completedTransactions = allTransactions.filter((t) => t.status === "completed");
      const successRate = totalTransactions > 0 ? completedTransactions.length / totalTransactions * 100 : 0;
      const escrowVolume = allTransactions.filter((t) => t.status === "paid" || t.status === "asset_transferred" || t.status === "completed").reduce((sum, t) => sum + parseFloat(t.price), 0);
      const now = /* @__PURE__ */ new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const lastMonthTransactions = allTransactions.filter((t) => {
        const createdAt = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
        return createdAt < lastMonth;
      });
      const lastMonthCompleted = lastMonthTransactions.filter((t) => t.status === "completed");
      const lastMonthTotal = lastMonthTransactions.length;
      const lastMonthSuccessRate = lastMonthTotal > 0 ? lastMonthCompleted.length / lastMonthTotal * 100 : 0;
      const lastMonthVolume = lastMonthTransactions.filter((t) => t.status === "paid" || t.status === "asset_transferred" || t.status === "completed").reduce((sum, t) => sum + parseFloat(t.price), 0);
      const stats = {
        totalTransactions,
        successRate: Math.round(successRate),
        escrowVolume: Math.round(escrowVolume),
        totalTransactionsChange: lastMonthTotal > 0 ? Math.round((totalTransactions - lastMonthTotal) / lastMonthTotal * 100) : totalTransactions > 0 ? 100 : 0,
        successRateChange: lastMonthSuccessRate > 0 ? Math.round(successRate - lastMonthSuccessRate) : 0,
        escrowVolumeChange: lastMonthVolume > 0 ? Math.round((escrowVolume - lastMonthVolume) / lastMonthVolume * 100) : escrowVolume > 0 ? 100 : 0
      };
      console.log("Dashboard stats result:", stats);
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      next(error);
    }
  });
  app3.get("/api/dashboard/transactions-over-time", isAuthenticated, async (req, res, next) => {
    try {
      console.log("Dashboard transactions-over-time called for user:", req.user?.id);
      const user = req.user;
      const { db: db2 } = await Promise.resolve().then(() => (init_firebase(), firebase_exports));
      const querySnapshot = await db2.collection("transactions").where("sellerId", "==", user.id).get();
      const allTransactions = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const monthlyData = {};
      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
      ];
      allTransactions.forEach((transaction) => {
        const date = transaction.createdAt?.toDate ? transaction.createdAt.toDate() : new Date(transaction.createdAt);
        const monthName = months[date.getMonth()];
        const amount = parseFloat(transaction.price);
        if (!monthlyData[monthName]) {
          monthlyData[monthName] = 0;
        }
        monthlyData[monthName] += amount;
      });
      const data = months.map((month) => ({
        month,
        amount: monthlyData[month] || 0
      }));
      console.log("Dashboard transactions-over-time result:", data);
      res.json({ data });
    } catch (error) {
      console.error("Dashboard transactions-over-time error:", error);
      next(error);
    }
  });
  app3.get("/api/dashboard/buyer/stats", isAuthenticated, async (req, res, next) => {
    try {
      console.log("Buyer dashboard stats called for user:", req.user?.id);
      const user = req.user;
      const { db: db2 } = await Promise.resolve().then(() => (init_firebase(), firebase_exports));
      const querySnapshot = await db2.collection("transactions").where("buyerEmail", "==", user.email).get();
      const allTransactions = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const totalTransactions = allTransactions.length;
      const completedTransactions = allTransactions.filter((t) => t.status === "completed");
      const successRate = totalTransactions > 0 ? completedTransactions.length / totalTransactions * 100 : 0;
      const escrowVolume = allTransactions.filter((t) => t.status === "paid" || t.status === "asset_transferred" || t.status === "completed").reduce((sum, t) => sum + parseFloat(t.price), 0);
      const now = /* @__PURE__ */ new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const lastMonthTransactions = allTransactions.filter((t) => {
        const createdAt = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
        return createdAt < lastMonth;
      });
      const lastMonthCompleted = lastMonthTransactions.filter((t) => t.status === "completed");
      const lastMonthTotal = lastMonthTransactions.length;
      const lastMonthSuccessRate = lastMonthTotal > 0 ? lastMonthCompleted.length / lastMonthTotal * 100 : 0;
      const lastMonthVolume = lastMonthTransactions.filter((t) => t.status === "paid" || t.status === "asset_transferred" || t.status === "completed").reduce((sum, t) => sum + parseFloat(t.price), 0);
      const stats = {
        totalTransactions,
        successRate: Math.round(successRate),
        escrowVolume: Math.round(escrowVolume),
        totalTransactionsChange: lastMonthTotal > 0 ? Math.round((totalTransactions - lastMonthTotal) / lastMonthTotal * 100) : totalTransactions > 0 ? 100 : 0,
        successRateChange: lastMonthSuccessRate > 0 ? Math.round(successRate - lastMonthSuccessRate) : 0,
        escrowVolumeChange: lastMonthVolume > 0 ? Math.round((escrowVolume - lastMonthVolume) / lastMonthVolume * 100) : escrowVolume > 0 ? 100 : 0
      };
      console.log("Buyer dashboard stats result:", stats);
      res.json(stats);
    } catch (error) {
      console.error("Buyer dashboard stats error:", error);
      next(error);
    }
  });
  app3.get("/api/dashboard/buyer/transactions-over-time", isAuthenticated, async (req, res, next) => {
    try {
      console.log("Buyer dashboard transactions-over-time called for user:", req.user?.id);
      const user = req.user;
      const { db: db2 } = await Promise.resolve().then(() => (init_firebase(), firebase_exports));
      const querySnapshot = await db2.collection("transactions").where("buyerEmail", "==", user.email).get();
      const allTransactions = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const monthlyData = {};
      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
      ];
      allTransactions.forEach((transaction) => {
        const date = transaction.createdAt?.toDate ? transaction.createdAt.toDate() : new Date(transaction.createdAt);
        const monthName = months[date.getMonth()];
        const amount = parseFloat(transaction.price);
        if (!monthlyData[monthName]) {
          monthlyData[monthName] = 0;
        }
        monthlyData[monthName] += amount;
      });
      const data = months.map((month) => ({
        month,
        amount: monthlyData[month] || 0
      }));
      console.log("Buyer dashboard transactions-over-time result:", data);
      res.json({ data });
    } catch (error) {
      console.error("Buyer dashboard transactions-over-time error:", error);
      next(error);
    }
  });
  app3.get("/api/dashboard/recent-activities", isAuthenticated, async (req, res, next) => {
    try {
      console.log("Dashboard recent-activities called for user:", req.user?.id);
      const user = req.user;
      const { db: db2 } = await Promise.resolve().then(() => (init_firebase(), firebase_exports));
      const sellerQuerySnapshot = await db2.collection("transactions").where("sellerId", "==", user.id).get();
      const buyerQuerySnapshot = await db2.collection("transactions").where("buyerEmail", "==", user.email).get();
      const transactionMap = /* @__PURE__ */ new Map();
      sellerQuerySnapshot.docs.forEach((doc) => {
        const transaction = { id: doc.id, ...doc.data() };
        transactionMap.set(transaction.id, { ...transaction, userRole: "seller" });
      });
      buyerQuerySnapshot.docs.forEach((doc) => {
        const transaction = { id: doc.id, ...doc.data() };
        transactionMap.set(transaction.id, { ...transaction, userRole: "buyer" });
      });
      const allTransactions = Array.from(transactionMap.values()).sort((a, b) => {
        const aTime = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt);
        const bTime = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt);
        return bTime.getTime() - aTime.getTime();
      }).slice(0, 10);
      const activities = allTransactions.map((transaction) => {
        const isSeller = transaction.userRole === "seller";
        const isBuyer = transaction.userRole === "buyer";
        let activity = "";
        let details = "";
        if (isSeller) {
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
        const minutes = Math.floor(timeDiff / 6e4);
        const hours = Math.floor(timeDiff / 36e5);
        const days = Math.floor(timeDiff / 864e5);
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
          time
        };
      });
      console.log("Dashboard recent-activities result:", activities);
      res.json({ activities });
    } catch (error) {
      console.error("Dashboard recent-activities error:", error);
      next(error);
    }
  });
  app3.get("/api/banks", isAuthenticated, async (req, res, next) => {
    try {
      const banksData = await listBanks();
      res.json({ banks: banksData.data });
    } catch (error) {
      next(error);
    }
  });
  app3.post("/api/bank-account/verify", isAuthenticated, async (req, res, next) => {
    try {
      const { accountNumber, bankCode } = req.body;
      if (!accountNumber || !bankCode) {
        return res.status(400).json({ message: "Account number and bank code are required" });
      }
      const verificationData = await verifyAccountNumber(accountNumber, bankCode);
      res.json({
        accountName: verificationData.data.account_name,
        accountNumber: verificationData.data.account_number
      });
    } catch (error) {
      next(error);
    }
  });
  app3.post("/api/bank-account", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      const result = updateBankAccountSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }
      const { bankCode, accountNumber, accountName } = result.data;
      const verificationData = await verifyAccountNumber(accountNumber, bankCode);
      if (verificationData.data.account_name.toLowerCase() !== accountName.toLowerCase()) {
        return res.status(400).json({ message: "Account name does not match bank records" });
      }
      const recipientData = await createTransferRecipient(accountName, accountNumber, bankCode);
      const updatedUser = await storage2.updateUserBankAccount(
        user.id,
        bankCode,
        accountNumber,
        accountName,
        recipientData.data.recipient_code
      );
      const { password, ...userWithoutPassword } = updatedUser;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      next(error);
    }
  });
  app3.get("/api/payouts", isAuthenticated, async (req, res, next) => {
    try {
      console.log("Payouts called for user:", req.user?.id);
      const user = req.user;
      const payouts2 = await storage2.getPayoutsBySeller(user.id);
      console.log("Payouts result:", payouts2);
      res.json({ payouts: payouts2 });
    } catch (error) {
      console.error("Payouts error:", error);
      next(error);
    }
  });
  app3.get("/api/notifications", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      const notifications2 = await storage2.getNotificationsByUser(user.id);
      res.json({ notifications: notifications2 });
    } catch (error) {
      next(error);
    }
  });
  app3.get("/api/notifications/unread-count", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      const count = await storage2.getUnreadNotificationsCount(user.id);
      res.json({ count });
    } catch (error) {
      next(error);
    }
  });
  app3.patch("/api/notifications/:id/read", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      const notification = await storage2.markNotificationAsRead(req.params.id);
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
  app3.patch("/api/notifications/mark-all-read", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      await storage2.markAllAsRead(user.id);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      next(error);
    }
  });
  app3.post("/api/disputes", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      const disputeData = {
        ...req.body,
        sellerId: user.id
      };
      const result = insertDisputeSchema.safeParse(disputeData);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }
      const transaction = await storage2.getTransaction(result.data.transactionId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      if (transaction.sellerId !== user.id) {
        return res.status(403).json({ message: "Forbidden: You can only dispute your own transactions" });
      }
      const existingDispute = await storage2.getDisputeByTransaction(result.data.transactionId);
      if (existingDispute) {
        return res.status(400).json({ message: "A dispute already exists for this transaction" });
      }
      const dispute = await storage2.createDispute(result.data);
      res.status(201).json({ dispute });
    } catch (error) {
      next(error);
    }
  });
  app3.get("/api/disputes", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      const disputes2 = await storage2.getDisputesBySeller(user.id);
      const { status } = req.query;
      let filtered = disputes2;
      if (status && status !== "all") {
        filtered = filtered.filter((d) => d.status === status);
      }
      res.json({ disputes: filtered });
    } catch (error) {
      next(error);
    }
  });
  app3.get("/api/disputes/:id", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      const dispute = await storage2.getDispute(req.params.id);
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
  app3.patch("/api/disputes/:id/status", isAuthenticated, async (req, res, next) => {
    try {
      const user = req.user;
      const result = updateDisputeStatusSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid input", errors: result.error.errors });
      }
      const dispute = await storage2.getDispute(req.params.id);
      if (!dispute) {
        return res.status(404).json({ message: "Dispute not found" });
      }
      if (dispute.sellerId !== user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const updatedDispute = await storage2.updateDisputeStatus(req.params.id, result.data.status);
      res.json({ dispute: updatedDispute });
    } catch (error) {
      next(error);
    }
  });
  app3.get("/api/office/ongoing-transactions", isAuthenticated, async (req, res, next) => {
    try {
      console.log("Office ongoing transactions called for user:", req.user?.id);
      const user = req.user;
      const { status, search, sortBy = "createdAt", sortOrder = "desc", page = 1, limit = 50 } = req.query;
      const { db: db2 } = await Promise.resolve().then(() => (init_firebase(), firebase_exports));
      const querySnapshot = await db2.collection("transactions").where("sellerId", "==", user.id).get();
      let transactions2 = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      transactions2 = transactions2.filter((t) => ["pending", "paid", "asset_transferred"].includes(t.status));
      if (status && status !== "all") {
        transactions2 = transactions2.filter((t) => t.status === status);
      }
      if (search) {
        const searchLower = search.toString().toLowerCase();
        transactions2 = transactions2.filter(
          (t) => t.itemName && t.itemName.toLowerCase().includes(searchLower) || t.buyerEmail && t.buyerEmail.toLowerCase().includes(searchLower) || t.id && t.id.toLowerCase().includes(searchLower)
        );
      }
      transactions2.sort((a, b) => {
        const aValue = a[sortBy] || a.createdAt;
        const bValue = b[sortBy] || b.createdAt;
        const aTime = aValue?.toDate ? aValue.toDate() : new Date(aValue);
        const bTime = bValue?.toDate ? bValue.toDate() : new Date(bValue);
        return sortOrder === "desc" ? bTime.getTime() - aTime.getTime() : aTime.getTime() - bTime.getTime();
      });
      const startIndex = (parseInt(page.toString()) - 1) * parseInt(limit.toString());
      const endIndex = startIndex + parseInt(limit.toString());
      const paginatedTransactions = transactions2.slice(startIndex, endIndex);
      res.json({
        transactions: paginatedTransactions,
        total: transactions2.length,
        page: parseInt(page.toString()),
        limit: parseInt(limit.toString()),
        totalPages: Math.ceil(transactions2.length / parseInt(limit.toString()))
      });
    } catch (error) {
      console.error("Office ongoing transactions error:", error);
      next(error);
    }
  });
  app3.get("/api/office/transaction-history", isAuthenticated, async (req, res, next) => {
    try {
      console.log("Office transaction history called for user:", req.user?.id);
      const user = req.user;
      const { search, dateFrom, dateTo, minAmount, maxAmount, sortBy = "completedAt", sortOrder = "desc", page = 1, limit = 50 } = req.query;
      const { db: db2 } = await Promise.resolve().then(() => (init_firebase(), firebase_exports));
      const querySnapshot = await db2.collection("transactions").where("sellerId", "==", user.id).get();
      let transactions2 = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      transactions2 = transactions2.filter((t) => t.status === "completed");
      if (search) {
        const searchLower = search.toString().toLowerCase();
        transactions2 = transactions2.filter(
          (t) => t.itemName && t.itemName.toLowerCase().includes(searchLower) || t.buyerEmail && t.buyerEmail.toLowerCase().includes(searchLower) || t.id && t.id.toLowerCase().includes(searchLower)
        );
      }
      if (dateFrom) {
        const fromDate = new Date(dateFrom.toString());
        transactions2 = transactions2.filter((t) => {
          const createdAt = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
          return createdAt >= fromDate;
        });
      }
      if (dateTo) {
        const toDate = new Date(dateTo.toString());
        toDate.setHours(23, 59, 59, 999);
        transactions2 = transactions2.filter((t) => {
          const createdAt = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
          return createdAt <= toDate;
        });
      }
      if (minAmount) {
        const min = parseFloat(minAmount.toString());
        transactions2 = transactions2.filter((t) => parseFloat(t.price) >= min);
      }
      if (maxAmount) {
        const max = parseFloat(maxAmount.toString());
        transactions2 = transactions2.filter((t) => parseFloat(t.price) <= max);
      }
      transactions2.sort((a, b) => {
        const aValue = a[sortBy] || a.createdAt;
        const bValue = b[sortBy] || b.createdAt;
        const aTime = aValue?.toDate ? aValue.toDate() : new Date(aValue);
        const bTime = bValue?.toDate ? bValue.toDate() : new Date(bValue);
        return sortOrder === "desc" ? bTime.getTime() - aTime.getTime() : aTime.getTime() - bTime.getTime();
      });
      const startIndex = (parseInt(page.toString()) - 1) * parseInt(limit.toString());
      const endIndex = startIndex + parseInt(limit.toString());
      const paginatedTransactions = transactions2.slice(startIndex, endIndex);
      res.json({
        transactions: paginatedTransactions,
        total: transactions2.length,
        page: parseInt(page.toString()),
        limit: parseInt(limit.toString()),
        totalPages: Math.ceil(transactions2.length / parseInt(limit.toString()))
      });
    } catch (error) {
      console.error("Office transaction history error:", error);
      next(error);
    }
  });
  app3.get("/api/office/stats", isAuthenticated, async (req, res, next) => {
    try {
      console.log("Office stats called for user:", req.user?.id);
      const user = req.user;
      const { db: db2 } = await Promise.resolve().then(() => (init_firebase(), firebase_exports));
      const querySnapshot = await db2.collection("transactions").where("sellerId", "==", user.id).get();
      const allTransactions = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const totalTransactions = allTransactions.length;
      const completedTransactions = allTransactions.filter((t) => t.status === "completed").length;
      const ongoingTransactions = allTransactions.filter(
        (t) => ["pending", "paid", "asset_transferred"].includes(t.status)
      ).length;
      const totalRevenue = allTransactions.filter((t) => t.status === "completed").reduce((sum, t) => sum + parseFloat(t.commission), 0);
      res.json({
        overview: {
          totalTransactions,
          completedTransactions,
          ongoingTransactions,
          totalRevenue: Math.round(totalRevenue * 100) / 100
          // Round to 2 decimal places
        }
      });
    } catch (error) {
      console.error("Office stats error:", error);
      next(error);
    }
  });
  const httpServer = createServer(app3);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app3, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app3.use(vite.middlewares);
  app3.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    if (url.startsWith("/api/")) {
      return next();
    }
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app3) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app3.use(express.static(distPath));
  app3.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
console.log("Starting server...");
var app2 = express2();
app2.post(
  "/api/payments/webhook",
  express2.raw({ type: "application/json" }),
  async (req, res, next) => {
    try {
      const signature = req.headers["x-paystack-signature"];
      if (!signature) {
        return res.status(400).json({ message: "No signature" });
      }
      const rawBody = req.body;
      const hash = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
      if (hash !== signature) {
        return res.status(401).json({ message: "Invalid signature" });
      }
      const event = JSON.parse(rawBody.toString());
      console.log("Webhook event:", event.event);
      if (event.event === "charge.success") {
        const reference = event.data.reference;
        const transactionId = event.data.metadata?.transactionId;
        console.log("Payment successful for transaction:", transactionId, "reference:", reference);
        if (transactionId) {
          const transaction = await storage2.updateTransactionStatus(transactionId, "paid", reference);
          if (transaction) {
            await storage2.createNotification({
              userId: transaction.sellerId,
              type: "payment_successful",
              title: "Payment Received",
              message: `Payment of \u20A6${transaction.price} received for transaction "${transaction.itemName}" (Ref: ${reference}).`,
              data: {
                action: "payment_success",
                transactionId: transaction.id,
                sellerId: transaction.sellerId,
                buyerId: transaction.buyerId,
                itemName: transaction.itemName,
                amount: transaction.price,
                paystackReference: reference,
                timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                paymentMethod: "paystack"
              }
            });
            if (transaction.buyerId) {
              await storage2.createNotification({
                userId: transaction.buyerId,
                type: "payment_successful",
                title: "Payment Successful",
                message: `Payment of \u20A6${transaction.price} processed for transaction "${transaction.itemName}" (Ref: ${reference}).`,
                data: {
                  action: "payment_success",
                  transactionId: transaction.id,
                  sellerId: transaction.sellerId,
                  buyerId: transaction.buyerId,
                  itemName: transaction.itemName,
                  amount: transaction.price,
                  paystackReference: reference,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                  paymentMethod: "paystack"
                }
              });
            }
          }
        }
      } else if (event.event === "transfer.success") {
        const transferCode = event.data.transfer_code;
        const payout = await storage2.getPayoutByTransferCode(transferCode);
        if (payout) {
          await storage2.updatePayoutStatus(payout.id, "processing", transferCode, event.data.reference);
          await storage2.createNotification({
            userId: payout.sellerId,
            type: "payout_successful",
            title: "Payout Successful",
            message: `Your payout of \u20A6${payout.amount} has been processed successfully.`,
            data: { payoutId: payout.id, amount: payout.amount }
          });
          console.log("Transfer successful for payout:", payout.id);
        }
      } else if (event.event === "transfer.failed" || event.event === "transfer.reversed") {
        const transferCode = event.data.transfer_code;
        const payout = await storage2.getPayoutByTransferCode(transferCode);
        if (payout) {
          await storage2.updatePayoutStatus(
            payout.id,
            "failed",
            transferCode,
            event.data.reference,
            event.data.reason || "Transfer failed"
          );
          await storage2.createNotification({
            userId: payout.sellerId,
            type: "payout_failed",
            title: "Payout Failed",
            message: `Your payout of \u20A6${payout.amount} could not be processed. ${event.data.reason || "Transfer failed"}`,
            data: { payoutId: payout.id, amount: payout.amount, failureReason: event.data.reason }
          });
          console.log("Transfer failed for payout:", payout.id, "reason:", event.data.reason);
        }
      }
      res.status(200).json({ message: "Webhook processed" });
    } catch (err) {
      console.error("Webhook error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);
app2.use(express2.json());
app2.use(express2.urlencoded({ extended: false }));
app2.use(morgan("dev"));
console.log("Setting up auth...");
setupAuth(app2);
console.log("Auth setup complete.");
app2.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  console.log("Registering routes...");
  const server = await registerRoutes(app2);
  console.log("Routes registered.");
  if (app2.get("env") === "development") {
    console.log("Setting up Vite...");
    await setupVite(app2, server);
    console.log("Vite setup complete.");
  } else {
    serveStatic(app2);
  }
  app2.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  const port = parseInt(process.env.PORT || "5000", 10);
  console.log(`Attempting to listen on port ${port}...`);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
