import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function debugTransactions() {
  try {
    console.log('🔍 Debugging transaction data structure...');

    // Get a sample transaction to inspect its structure
    const transactionsRef = collection(db, 'transactions');
    const q = query(transactionsRef, where('sellerId', '==', 'test-user-id')); // Use a known seller ID
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('No transactions found for test user, getting all transactions...');
      const allQuery = query(transactionsRef);
      const allSnapshot = await getDocs(allQuery);

      if (!allSnapshot.empty) {
        const sampleDoc = allSnapshot.docs[0];
        const data = sampleDoc.data();
        console.log('Sample transaction data:');
        console.log('ID:', sampleDoc.id);
        console.log('Full data:', JSON.stringify(data, null, 2));
        console.log('createdAt type:', typeof data.createdAt, 'value:', data.createdAt);
        console.log('updatedAt type:', typeof data.updatedAt, 'value:', data.updatedAt);

        if (data.createdAt?.toDate) {
          console.log('createdAt.toDate():', data.createdAt.toDate());
        }
        if (data.updatedAt?.toDate) {
          console.log('updatedAt.toDate():', data.updatedAt.toDate());
        }
      } else {
        console.log('No transactions found at all');
      }
    } else {
      const sampleDoc = querySnapshot.docs[0];
      const data = sampleDoc.data();
      console.log('Sample transaction data:');
      console.log('ID:', sampleDoc.id);
      console.log('Full data:', JSON.stringify(data, null, 2));
      console.log('createdAt type:', typeof data.createdAt, 'value:', data.createdAt);
      console.log('updatedAt type:', typeof data.updatedAt, 'value:', data.updatedAt);

      if (data.createdAt?.toDate) {
        console.log('createdAt.toDate():', data.createdAt.toDate());
      }
      if (data.updatedAt?.toDate) {
        console.log('updatedAt.toDate():', data.updatedAt.toDate());
      }
    }

  } catch (error) {
    console.error('Error debugging transactions:', error);
  }
}

debugTransactions();
