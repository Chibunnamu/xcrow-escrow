import { db } from './server/firebase.ts';

async function debugAdmin() {
  try {
    console.log('Checking superadmin account in Firestore...');

    // Check if superadmin exists by email
    const emailQuery = await db.collection('users').where('email', '==', 'breezora@gmail.com').get();
    if (!emailQuery.empty) {
      const doc = emailQuery.docs[0];
      const userData = doc.data();
      console.log('Superadmin found by email:', {
        id: doc.id,
        email: userData.email,
        role: userData.role,
        hasPassword: !!userData.password,
        password: userData.password ? '***' + userData.password.slice(-3) : 'NO PASSWORD'
      });
    } else {
      console.log('Superadmin not found by email');
    }

    // Check if superadmin exists by ID
    const docRef = db.collection('users').doc('superadmin');
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      const userData = docSnap.data();
      console.log('Superadmin found by ID:', {
        id: docSnap.id,
        email: userData.email,
        role: userData.role,
        hasPassword: !!userData.password,
        password: userData.password ? '***' + userData.password.slice(-3) : 'NO PASSWORD'
      });
    } else {
      console.log('Superadmin not found by ID');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

debugAdmin();
