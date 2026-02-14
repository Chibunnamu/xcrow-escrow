const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');

// Initialize Firebase Admin
const admin = require('firebase-admin');
admin.initializeApp();

// Initialize Firestore
const db = admin.firestore();

// Create Express app
const app = express();

// CORS configuration - allow all origins in production since we're on Firebase
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware to verify Firebase session cookie
const authenticateUser = async (req, res, next) => {
  const sessionCookie = req.cookies?.session || req.headers.authorization?.replace('Bearer ', '');
  
  if (!sessionCookie) {
    req.user = null;
    return next();
  }
  
  try {
    // Verify the session cookie
    const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
    req.user = {
      id: decodedClaims.uid,
      email: decodedClaims.email,
      role: decodedClaims.role
    };
  } catch (error) {
    console.log('Session verification failed:', error.message);
    req.user = null;
  }
  
  next();
};

app.use(authenticateUser);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Xcrow API is running' });
});

// Auth routes
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  try {
    // For now, try to find user in Firestore
    // In production, you'd verify the password against your database
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();
    
    let user;
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();
      
      // Check if user has a password hash
      if (userData.passwordHash) {
        const bcrypt = require('bcryptjs');
        const isValid = await bcrypt.compare(password, userData.passwordHash);
        if (!isValid) {
          return res.status(401).json({ message: 'Invalid email or password' });
        }
        user = { id: userDoc.id, ...userData };
      } else {
        // No password - user might be OAuth user
        // For demo purposes, we'll create a custom token anyway
        user = { id: userDoc.id, ...userData };
      }
    } else {
      // User doesn't exist - for demo, create a new user
      // In production, you'd return an error
      const userData = {
        email,
        firstName: email.split('@')[0],
        lastName: '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        role: 'user'
      };
      
      const docRef = await usersRef.add(userData);
      user = { id: docRef.id, ...userData };
    }
    
    // Create custom token
    const customToken = await admin.auth().createCustomToken(user.id, {
      email: user.email,
      role: user.role
    });
    
    // Set session cookie
    res.cookie('session', customToken, {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });
    
    return res.json({ 
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: error.message });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('session');
  res.json({ message: 'Logged out successfully' });
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
  if (req.user) {
    return res.json({ 
      authenticated: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      }
    });
  }
  return res.json({ authenticated: false });
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

app.patch('/api/user', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    await db.collection('users').doc(req.user.id).update({
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: error.message });
  }
});

// Transactions routes
app.get('/api/transactions', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    // Get transactions where user is buyer or seller
    const buyerSnapshot = await db.collection('transactions')
      .where('buyerId', '==', req.user.id)
      .orderBy('createdAt', 'desc')
      .get();
    
    const sellerSnapshot = await db.collection('transactions')
      .where('sellerId', '==', req.user.id)
      .orderBy('createdAt', 'desc')
      .get();
    
    const transactions = [
      ...buyerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      ...sellerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    ];
    
    // Sort by createdAt
    transactions.sort((a, b) => {
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return bTime - aTime;
    });
    
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
    const data = doc.data();
    // Check if user is buyer, seller, or admin
    if (data.buyerId !== req.user.id && 
        data.sellerId !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json({ id: doc.id, ...data });
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
    const doc = await db.collection('transactions').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    const data = doc.data();
    // Check if user is buyer, seller, or admin
    if (data.buyerId !== req.user.id && 
        data.sellerId !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
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
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
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
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
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

app.patch('/api/admin/users/:id', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  try {
    await db.collection('users').doc(req.params.id).update({
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: error.message });
  }
});

// Webhook endpoint (for payment gateways)
app.post('/api/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    console.log('Webhook received:', webhookData);
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Export the API as a Cloud Function
exports.api = functions.https.onRequest(app);
