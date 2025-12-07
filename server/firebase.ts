import admin from "firebase-admin";
import * as path from "path";
import * as fs from "fs";

// Path to the service account key
const serviceAccountPath = path.join(process.cwd(), "..", "xcrow-b8385-firebase-adminsdk-fbsvc-1730b7e6b2.json");

// Read the service account key
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

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
