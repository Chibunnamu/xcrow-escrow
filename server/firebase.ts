import admin from "firebase-admin";

// Read the service account key from environment variable
const firebaseServiceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!firebaseServiceAccountJson) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON environment variable is required");
}
const serviceAccount = JSON.parse(firebaseServiceAccountJson);

const firebaseConfig = {
  credential: admin.credential.cert(serviceAccount),
  projectId: "xcrow-b8385",
  storageBucket: "xcrow-b8385.firebasestorage.app"
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
