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

async function testConnection() {
  try {
    console.log('Testing Firestore connection...');

    // Test basic connection
    const testDoc = await db.collection('test').doc('connection').get();
    console.log('✅ Firestore connection successful');

    // Test transactions collection
    const transactionsRef = db.collection('transactions');
    const snapshot = await transactionsRef.limit(1).get();
    console.log('✅ Transactions collection accessible, docs count:', snapshot.size);

    // Test specific query
    const querySnapshot = await db.collection('transactions').where('uniqueLink', '==', '02ef1e3a051707ef909c439c0dbcb5f2').get();
    console.log('Query result size:', querySnapshot.size);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      console.log('Found transaction:', doc.id);
      console.log('Data keys:', Object.keys(doc.data()));
      console.log('Full data:', JSON.stringify(doc.data(), null, 2));
    }

  } catch (error) {
    console.error('❌ Firestore error:', error);
  } finally {
    process.exit(0);
  }
}

testConnection();
