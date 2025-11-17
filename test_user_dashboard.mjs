import admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

const serviceAccountPath = path.join(process.cwd(), 'xcrow-b8385-firebase-adminsdk-fbsvc-1730b7e6b2.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const firebaseConfig = {
  credential: admin.credential.cert(serviceAccount),
  projectId: 'xcrow-b8385',
  storageBucket: 'xcrow-b8385.firebasestorage.app'
};

const app = admin.initializeApp(firebaseConfig);
const db = admin.firestore(app);

async function testUserDashboard() {
  try {
    console.log('🔍 Testing User Dashboard Data from Firestore...\n');

    // Use the known user ID from the transaction
    const userId = 'QLZqH2aAZME2AeOwBHgy';
    console.log(`Testing dashboard for user ID: ${userId}\n`);

    // 1. Get user details
    console.log('1. Getting user details...');
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log('❌ User not found!');
      return;
    }
    const userData = { id: userDoc.id, ...userDoc.data() };
    console.log(`User: ${userData.email} (${userData.firstName} ${userData.lastName})`);

    // 2. Query transactions for this user
    console.log('\n2. Querying transactions for this user...');
    const transactionsQuery = db.collection('transactions').where('sellerId', '==', userId);
    const transactionsSnapshot = await transactionsQuery.get();

    const transactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`Found ${transactions.length} transactions:`);
    transactions.forEach((txn, index) => {
      console.log(`${index + 1}. ${txn.itemName} - $${txn.price} - Status: ${txn.status} - Buyer: ${txn.buyerEmail}`);
    });

    // 3. Calculate dashboard stats
    console.log('\n3. Calculating dashboard statistics...');

    const totalTransactions = transactions.length;
    const completedTransactions = transactions.filter(t => t.status === "completed");
    const successRate = totalTransactions > 0 ? (completedTransactions.length / totalTransactions) * 100 : 0;

    const escrowVolume = transactions
      .filter(t => t.status === "paid" || t.status === "asset_transferred" || t.status === "completed")
      .reduce((sum, t) => sum + parseFloat(t.price), 0);

    console.log(`📊 Stats:`);
    console.log(`   Total Transactions: ${totalTransactions}`);
    console.log(`   Success Rate: ${Math.round(successRate)}%`);
    console.log(`   Escrow Volume: $${Math.round(escrowVolume)}`);

    // 4. Calculate transactions over time
    console.log('\n4. Calculating transactions over time...');
    const monthlyData = {};
    const months = ["January", "February", "March", "April", "May", "June",
                   "July", "August", "September", "October", "November", "December"];

    transactions.forEach(transaction => {
      const date = new Date(transaction.createdAt?.toDate ? transaction.createdAt.toDate() : transaction.createdAt);
      const monthName = months[date.getMonth()];
      const amount = parseFloat(transaction.price);

      if (!monthlyData[monthName]) {
        monthlyData[monthName] = 0;
      }
      monthlyData[monthName] += amount;
    });

    console.log('📈 Monthly transaction amounts:');
    months.forEach(month => {
      const amount = monthlyData[month] || 0;
      if (amount > 0) {
        console.log(`   ${month}: $${amount}`);
      }
    });

    // 5. Get recent activities (both seller and buyer transactions)
    console.log('\n5. Getting recent activities...');

    // Query for transactions where user is seller
    const sellerQuery = db.collection('transactions')
      .where('sellerId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(10);

    // Query for transactions where user is buyer
    const buyerQuery = db.collection('transactions')
      .where('buyerId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(10);

    const [sellerSnapshot, buyerSnapshot] = await Promise.all([
      sellerQuery.get(),
      buyerQuery.get()
    ]);

    // Combine and deduplicate transactions
    const transactionMap = new Map();

    // Add seller transactions
    sellerSnapshot.docs.forEach(doc => {
      const transaction = { id: doc.id, ...doc.data() };
      transactionMap.set(transaction.id, { ...transaction, userRole: 'seller' });
    });

    // Add buyer transactions
    buyerSnapshot.docs.forEach(doc => {
      const transaction = { id: doc.id, ...doc.data() };
      transactionMap.set(transaction.id, { ...transaction, userRole: 'buyer' });
    });

    // Convert to array and sort by updatedAt (most recent first)
    const allTransactions = Array.from(transactionMap.values())
      .sort((a, b) => {
        const aTime = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt);
        const bTime = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt);
        return bTime.getTime() - aTime.getTime();
      })
      .slice(0, 10); // Apply limit after sorting

    const activities = allTransactions.map(transaction => {
      const isSeller = transaction.userRole === 'seller';
      const isBuyer = transaction.userRole === 'buyer';

      let activity = "";
      let details = "";
      let canConfirmReceipt = false;

      if (isSeller) {
        // Seller activities
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
        // Buyer activities
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
            canConfirmReceipt = true;
            break;
          case "completed":
            activity = `Transaction #${transaction.id.slice(0, 4)}`;
            details = "Transaction completed - item received";
            break;
        }
      }

      const timeDiff = Date.now() - new Date(transaction.updatedAt?.toDate ? transaction.updatedAt.toDate() : transaction.updatedAt).getTime();
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
        canConfirmReceipt,
        itemName: transaction.itemName,
        itemDescription: transaction.itemDescription,
        price: transaction.price,
        status: transaction.status,
        userRole: transaction.userRole,
      };
    });

    console.log('📋 Recent activities:');
    activities.forEach((activity, index) => {
      console.log(`${index + 1}. ${activity.activity} - ${activity.details} (${activity.time})`);
      if (activity.userRole === 'buyer') {
        console.log(`   👤 Buyer: ${activity.itemName} - $${activity.price} - Can confirm: ${activity.canConfirmReceipt}`);
      } else {
        console.log(`   🏪 Seller: ${activity.itemName} - $${activity.price}`);
      }
    });

    // 6. Check payouts
    console.log('\n6. Checking payouts...');
    const payoutsQuery = db.collection('payouts')
      .where('sellerId', '==', userId)
      .orderBy('createdAt', 'desc');

    const payoutsSnapshot = await payoutsQuery.get();
    const payouts = payoutsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`💰 Found ${payouts.length} payouts:`);
    payouts.forEach((payout, index) => {
      console.log(`${index + 1}. $${payout.amount} - Status: ${payout.status}`);
    });

    console.log('\n✅ Dashboard Data Test Complete!');
    console.log(`\n📊 Final Summary for ${userData.email}:`);
    console.log(`- ${totalTransactions} total transactions`);
    console.log(`- ${Math.round(successRate)}% success rate`);
    console.log(`- $${Math.round(escrowVolume)} escrow volume`);
    console.log(`- ${activities.length} recent activities`);
    console.log(`- ${payouts.length} payouts`);

  } catch (error) {
    console.error('❌ Error testing user dashboard:', error);
  }
}

testUserDashboard();
