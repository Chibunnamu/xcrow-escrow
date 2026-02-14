const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Initialize Firebase Admin
const admin = require('firebase-admin');
admin.initializeApp();

// Initialize Firestore
const db = admin.firestore();

// Create Express app
const app = express();

// CORS configuration - allow all origins since we're on Firebase
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

// Session middleware (simplified for Cloud Functions)
// We'll use Firebase session cookies instead of express-session
app.use(async (req, res, next) => {
  // Get the session cookie from the request
  const sessionCookie = req.headers.authorization?.replace('Bearer ', '') || 
                       req.cookies?.session;

  if (sessionCookie) {
    try {
      // Verify the session cookie
      const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
      req.user = {
        id: decodedClaims.uid,
        email: decodedClaims.email
      };
    } catch (error) {
      // Invalid session, continue without user
      console.log('Session verification failed:', error.message);
    }
  }
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Xcrow API is running' });
});

// Auth routes
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // For demo purposes, create a custom token
    // In production, you would verify against your database
    const customToken = await admin.auth().createCustomToken(email);
    res.json({ token: customToken, email });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// User routes
app.get('/api/user', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    const userDoc = await db.collection('users').doc(req.user.id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ id: userDoc.id, ...userDoc.data() });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: error.message });
  }
});

// Transactions routes
app.get('/api/transactions', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    const transactionsSnapshot = await db.collection('transactions')
      .where('buyerId', '==', req.user.id)
      .orderBy('createdAt', 'desc')
      .get();
    
    const transactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    const transactionData = {
      ...req.body,
      buyerId: req.user.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending'
    };
    
    const docRef = await db.collection('transactions').add(transactionData);
    res.json({ id: docRef.id, ...transactionData });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/transactions/:id', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    const doc = await db.collection('transactions').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ message: error.message });
  }
});

app.patch('/api/transactions/:id', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    await db.collection('transactions').doc(req.params.id).update({
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ message: 'Transaction updated' });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ message: error.message });
  }
});

// Admin routes
app.get('/api/admin/transactions', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    const transactionsSnapshot = await db.collection('transactions')
      .orderBy('createdAt', 'desc')
      .get();
    
    const transactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ transactions });
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/admin/users', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: error.message });
  }
});

// Webhook endpoint (for payment gateways)
app.post('/api/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    console.log('Webhook received:', webhookData);
    
    // Process webhook based on gateway
    // This is a simplified version - you'd need to add actual payment gateway logic
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Export the API as a Cloud Function
exports.api = functions.https.onRequest(app);

// Also export individual functions for specific endpoints
exports.login = functions.https.onCall(async (data, context) => {
  const { email, password } = data;
  
  try {
    // Create custom token
    const customToken = await admin.auth().createCustomToken(email);
    return { token: customToken, email };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

exports.getUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  try {
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!userDoc.exists) {
      // Create user if doesn't exist
      await db.collection('users').doc(context.auth.uid).set({
        email: context.auth.token.email,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return { id: context.auth.uid, email: context.auth.token.email };
    }
    return { id: userDoc.id, ...userDoc.data() };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

exports.getTransactions = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  try {
    const transactionsSnapshot = await db.collection('transactions')
      .where('buyerId', '==', context.auth.uid)
      .orderBy('createdAt', 'desc')
      .get();
    
    return transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

exports.createTransaction = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  try {
    const transactionData = {
      ...data,
      buyerId: context.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending'
    };
    
    const docRef = await db.collection('transactions').add(transactionData);
    return { id: docRef.id, ...transactionData };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
