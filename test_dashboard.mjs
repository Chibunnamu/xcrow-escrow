import { storage } from './server/storage.ts';

async function testDashboard() {
  try {
    console.log('Testing dashboard stats...');
    const stats = await storage.getDashboardStats('QLZqH2aAZME2AeOwBHgy');
    console.log('Dashboard stats:', stats);

    console.log('\nTesting recent activities...');
    const activities = await storage.getRecentActivities('QLZqH2aAZME2AeOwBHgy', 10);
    console.log('Recent activities:', activities);

    console.log('\nTesting payouts...');
    const payouts = await storage.getPayoutsBySeller('QLZqH2aAZME2AeOwBHgy');
    console.log('Payouts:', payouts);

  } catch (error) {
    console.error('Error:', error);
  }
}

testDashboard();
