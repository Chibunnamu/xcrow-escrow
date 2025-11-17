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

async function checkTransaction() {
  try {
    console.log('Checking transaction with uniqueLink: 02ef1e3a051707ef909c439c0dbcb5f2');

    const querySnapshot = await db.collection('transactions').where('uniqueLink', '==', '02ef1e3a051707ef909c439c0dbcb5f2').get();

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      console.log('✅ Transaction found!');
      console.log('ID:', doc.id);
      console.log('Data:', JSON.stringify(doc.data(), null, 2));
    } else {
      console.log('❌ Transaction not found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkTransaction();
