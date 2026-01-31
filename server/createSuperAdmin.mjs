import { auth as firebaseAuth } from "./firebase.ts";
import { db } from "./firebase.ts";

const adminUsers = [
  {
    email: "superadmin@xcrow.com",
    password: "superadmin123",
    role: "superAdmin",
    displayName: "Super Admin"
  },
  {
    email: "admin@xcrow.com",
    password: "admin123",
    role: "admin",
    displayName: "Admin User"
  },
  {
    email: "support@xcrow.com",
    password: "support123",
    role: "support",
    displayName: "Support User"
  }
];

async function createAdminUsers() {
  console.log("Creating admin accounts...");

  for (const adminUser of adminUsers) {
    try {
      console.log(`\nCreating ${adminUser.role} account...`);

      // Create Firebase Auth user
      const userCredential = await firebaseAuth.createUser({
        email: adminUser.email,
        password: adminUser.password,
        emailVerified: true,
        displayName: adminUser.displayName
      });

      const uid = userCredential.uid;
      console.log(`Firebase Auth user created with UID: ${uid}`);

      // Create Firestore user document
      const userDoc = {
        uid: uid,
        email: adminUser.email,
        firstName: adminUser.displayName.split(' ')[0],
        lastName: adminUser.displayName.split(' ')[1] || '',
        role: adminUser.role,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection("users").doc(uid).set(userDoc);
      console.log(`Firestore user document created successfully for ${adminUser.role}`);

      console.log(`✅ ${adminUser.role} account created successfully!`);
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Password: ${adminUser.password}`);
      console.log(`   Role: ${adminUser.role}`);

    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log(`⚠️  ${adminUser.role} account already exists (${adminUser.email})`);
      } else {
        console.error(`❌ Error creating ${adminUser.role}:`, error);
      }
    }
  }

  console.log("\n🎉 Admin account creation process completed!");
  console.log("\nLogin credentials:");
  adminUsers.forEach(user => {
    console.log(`${user.role}: ${user.email} / ${user.password}`);
  });
}

createAdminUsers();
