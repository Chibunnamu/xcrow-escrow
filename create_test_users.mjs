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

async function createTestUsers() {
  try {
    console.log('Creating test users for different roles...');

    const testUsers = [
      {
        email: 'support@xcrow.com',
        password: 'support123',
        firstName: 'Support',
        lastName: 'User',
        role: 'support'
      },
      {
        email: 'user@xcrow.com',
        password: 'user123',
        firstName: 'Regular',
        lastName: 'User',
        role: 'user'
      },
      {
        email: 'norole@xcrow.com',
        password: 'norole123',
        firstName: 'No',
        lastName: 'Role',
        // no role field
      }
    ];

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await db.collection('users').where('email', '==', userData.email).get();
      if (!existingUser.empty) {
        console.log(`User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Create user
      const userRef = await db.collection('users').add({
        ...userData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Created user ${userData.email} with role ${userData.role || 'none'} (ID: ${userRef.id})`);
    }

    console.log('Test users creation complete!');
  } catch (error) {
    console.error('Error creating test users:', error);
  }
}

createTestUsers();
