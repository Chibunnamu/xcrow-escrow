import { db } from './firebase.js';

const categories = [
  {
    name: "Digital Assets",
    description: "Software, digital downloads, NFTs, and other digital products",
    typicalTimeFrame: "24–72 hrs",
    minTime: 24,
    maxTime: 72
  },
  {
    name: "Physical Products",
    description: "Tangible goods like electronics, clothing, and merchandise",
    typicalTimeFrame: "3–14 days",
    minTime: 72,
    maxTime: 336
  },
  {
    name: "High-Value Collectibles",
    description: "Art, antiques, rare items, and collectibles",
    typicalTimeFrame: "5–21 days",
    minTime: 120,
    maxTime: 504
  },
  {
    name: "Vehicles",
    description: "Cars, motorcycles, boats, and other vehicles",
    typicalTimeFrame: "7–30 days",
    minTime: 168,
    maxTime: 720
  },
  {
    name: "Real Estate",
    description: "Property transactions and real estate deals",
    typicalTimeFrame: "7–45 days",
    minTime: 168,
    maxTime: 1080
  },
  {
    name: "Freelance Services",
    description: "Professional services, consulting, and freelance work",
    typicalTimeFrame: "1–30 days",
    minTime: 24,
    maxTime: 720
  },
  {
    name: "Subscription/SaaS Deals",
    description: "Software subscriptions, SaaS agreements, and recurring services",
    typicalTimeFrame: "7–30 days",
    minTime: 168,
    maxTime: 720
  },
  {
    name: "Bulk Trade & B2B",
    description: "Large-scale business transactions and bulk orders",
    typicalTimeFrame: "7–60 days",
    minTime: 168,
    maxTime: 1440
  },
  {
    name: "Personal Items",
    description: "Personal belongings, used items, and second-hand goods",
    typicalTimeFrame: "3–10 days",
    minTime: 72,
    maxTime: 240
  },
  {
    name: "Event & Booking Payments",
    description: "Event tickets, reservations, and booking payments",
    typicalTimeFrame: "24 hrs – event completion",
    minTime: 24,
    maxTime: 8760 // Assuming up to 1 year for long-term events
  }
];

async function seedCategories() {
  try {
    console.log('Seeding escrow categories...');

    const batch = db.batch();
    const categoriesRef = db.collection('EscrowCategories');

    categories.forEach((category) => {
      const docRef = categoriesRef.doc();
      batch.set(docRef, {
        ...category,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    await batch.commit();
    console.log('Successfully seeded escrow categories!');
  } catch (error) {
    console.error('Error seeding categories:', error);
  }
}

seedCategories();
