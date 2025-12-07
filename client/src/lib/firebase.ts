import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validate Firebase config
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

if (missingKeys.length > 0) {
  throw new Error(
    `Firebase configuration is incomplete. Missing environment variables: ${missingKeys.join(', ')}.\n\n` +
    `Please create a .env file in the root directory with the following variables:\n` +
    `VITE_FIREBASE_API_KEY=your_api_key_here\n` +
    `VITE_FIREBASE_AUTH_DOMAIN=xcrow-b8385.firebaseapp.com\n` +
    `VITE_FIREBASE_PROJECT_ID=xcrow-b8385\n` +
    `VITE_FIREBASE_STORAGE_BUCKET=xcrow-b8385.firebasestorage.app\n` +
    `VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here\n` +
    `VITE_FIREBASE_APP_ID=your_app_id_here\n\n` +
    `Get these values from Firebase Console > Project Settings > General > Your apps > Web app.`
  );
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
