const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(process.cwd(), 'xcrow-b8385-firebase-adminsdk-fbsvc-1730b7e6b2.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const firebaseConfig = {
  credential: admin.credential.cert(serviceAccount),
  projectId: 'xcrow-b8385',
  storageBucket: 'xcrow-b8385.firebasestorage.app'
};

const app = admin.initializeApp(firebaseConfig);
const db = admin.firestore(app);

async function checkTransaction() {
  try {
    console.log('Checking for transaction with uniqueLink: 02ef1e3a051707ef909c439c0dbcb5f2');

    const querySnapshot = await db.collection('transactions').where('uniqueLink', '==', '02ef1e3a051707ef909c439c0dbcb5f2').get();
    if (!querySnapshot.empty) {
      console.log('Transaction found:');
      querySnapshot.forEach(doc => {
        console.log('ID:', doc.id);
        console.log('Data:', JSON.stringify(doc.data(), null, 2));
      });
    } else {
      console.log('No transaction found with that uniqueLink');

      // Check all transactions
      console.log('\nChecking all transactions in collection:');
      const allTransactions = await db.collection('transactions').get();
      console.log(`Total transactions: ${allTransactions.size}`);

      if (allTransactions.size === 0) {
        console.log('No transactions found in collection');
      } else {
        allTransactions.forEach(doc => {
          const data = doc.data();
          console.log(`ID: ${doc.id}, uniqueLink: ${data.uniqueLink}, itemName: ${data.itemName}`);
        });
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkTransaction();
