import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC6v8z6wHF8mGj6m4m4m4m4m4m4m4m4m4m4m4m",
  authDomain: "xcrow-escrow.firebaseapp.com",
  projectId: "xcrow-escrow",
  storageBucket: "xcrow-escrow.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFirestoreDashboard() {
  try {
    console.log('🔍 Testing Firestore Dashboard Data...\n');

    // First, let's see what users exist
    console.log('1. Checking users collection...');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`Found ${usersSnapshot.size} users:`);

    const users = [];
    usersSnapshot.forEach((doc) => {
      const userData = { id: doc.id, ...doc.data() };
      users.push(userData);
      console.log(`- User ID: ${userData.id}, Email: ${userData.email}`);
    });

    if (users.length === 0) {
      console.log('❌ No users found in Firestore!');
      return;
    }

    // Use the first user for testing
    const testUser = users[0];
    console.log(`\n2. Testing dashboard for user: ${testUser.email} (ID: ${testUser.id})\n`);

    // Query transactions for this user
    console.log('3. Querying transactions for this user...');
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('sellerId', '==', testUser.id)
    );

    const transactionsSnapshot = await getDocs(transactionsQuery);
    const transactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`Found ${transactions.length} transactions for this user:`);
    transactions.forEach((txn, index) => {
      console.log(`${index + 1}. ${txn.itemName} - $${txn.price} - Status: ${txn.status}`);
    });

    // Calculate dashboard stats
    console.log('\n4. Calculating dashboard statistics...');

    const totalTransactions = transactions.length;
    const completedTransactions = transactions.filter(t => t.status === "completed");
    const successRate = totalTransactions > 0 ? (completedTransactions.length / totalTransactions) * 100 : 0;

    const escrowVolume = transactions
      .filter(t => t.status === "paid" || t.status === "asset_transferred" || t.status === "completed")
      .reduce((sum, t) => sum + parseFloat(t.price), 0);

    console.log(`Total Transactions: ${totalTransactions}`);
    console.log(`Success Rate: ${Math.round(successRate)}%`);
    console.log(`Escrow Volume: $${Math.round(escrowVolume)}`);

    // Calculate transactions over time
    console.log('\n5. Calculating transactions over time...');
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

    console.log('Monthly transaction amounts:');
    months.forEach(month => {
      const amount = monthlyData[month] || 0;
      if (amount > 0) {
        console.log(`${month}: $${amount}`);
      }
    });

    // Get recent activities
    console.log('\n6. Getting recent activities...');
    const recentQuery = query(
      collection(db, 'transactions'),
      where('sellerId', '==', testUser.id),
      orderBy('updatedAt', 'desc'),
      limit(10)
    );

    const recentSnapshot = await getDocs(recentQuery);
    const activities = recentSnapshot.docs.map(doc => {
      const transaction = { id: doc.id, ...doc.data() };
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
      };
    });

    console.log('Recent activities:');
    activities.forEach((activity, index) => {
      console.log(`${index + 1}. ${activity.activity} - ${activity.details} (${activity.time})`);
    });

    // Check payouts
    console.log('\n7. Checking payouts...');
    const payoutsQuery = query(
      collection(db, 'payouts'),
      where('sellerId', '==', testUser.id),
      orderBy('createdAt', 'desc')
    );

    const payoutsSnapshot = await getDocs(payoutsQuery);
    const payouts = payoutsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`Found ${payouts.length} payouts for this user:`);
    payouts.forEach((payout, index) => {
      console.log(`${index + 1}. $${payout.amount} - Status: ${payout.status}`);
    });

    console.log('\n✅ Firestore Dashboard Test Complete!');
    console.log(`\n📊 Summary for user ${testUser.email}:`);
    console.log(`- ${totalTransactions} total transactions`);
    console.log(`- ${Math.round(successRate)}% success rate`);
    console.log(`- $${Math.round(escrowVolume)} escrow volume`);
    console.log(`- ${activities.length} recent activities`);
    console.log(`- ${payouts.length} payouts`);

  } catch (error) {
    console.error('❌ Error testing Firestore dashboard:', error);
  }
}

testFirestoreDashboard();
