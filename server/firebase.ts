import admin from "firebase-admin";

// Firebase configuration using environment variables
const firebaseConfig = {
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`
};

// Initialize Firebase Admin
const app = admin.initializeApp(firebaseConfig);

// Initialize Firebase Admin services
export const auth = admin.auth(app);
export const db = admin.firestore(app);
export const storage = admin.storage(app);

// Export db as firestore for compatibility
export { db as firestore };

export default app;
