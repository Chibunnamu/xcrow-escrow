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

async function fixUserPassword() {
  try {
    const userId = 'QLZqH2aAZME2AeOwBHgy';
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log('Current user data:', userData);

      // Add password field
      await userRef.update({
        password: 'password123',
        updatedAt: new Date()
      });

      console.log('✅ Password added to user');
    } else {
      console.log('❌ User not found');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
  process.exit(0);
}

fixUserPassword();
