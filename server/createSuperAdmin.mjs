import { auth as firebaseAuth } from "./firebase.ts";
import { db } from "./firebase.ts";

async function createSuperAdmin() {
  try {
    console.log("Creating superadmin account...");

    // Create Firebase Auth user
    const userCredential = await firebaseAuth.createUser({
      email: "breezora@gmail.com",
      password: "admin@breezora",
      emailVerified: true,
    });

    const uid = userCredential.uid;
    console.log("Firebase Auth user created with UID:", uid);

    // Create Firestore user document
    const userDoc = {
      uid: uid,
      email: "breezora@gmail.com",
      role: "superAdmin",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("users").doc(uid).set(userDoc);
    console.log("Firestore user document created successfully");

    console.log("Superadmin account created successfully!");
    console.log("Email: breezora@gmail.com");
    console.log("Password: admin@breezora");
    console.log("Role: superAdmin");

  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log("Superadmin account already exists");
    } else {
      console.error("Error creating superadmin:", error);
    }
  }
}

createSuperAdmin();
