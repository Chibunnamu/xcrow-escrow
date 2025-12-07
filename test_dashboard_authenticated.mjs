import fetch from 'node-fetch';
import { spawn } from 'child_process';

const BASE_URL = 'http://localhost:5000';

async function testAuthenticatedDashboard() {
  try {
    console.log('🔐 Testing Dashboard with Authentication...\n');

    // First, start the server using tsx directly
    console.log('1. Starting server...');
    const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
      cwd: process.cwd(),
      stdio: 'inherit',
      detached: true,
      env: { ...process.env, NODE_ENV: 'development' }
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 5000));

    const agent = await import('superagent').then(m => m.default);

    // Create a test user first
    console.log('2. Creating test user...');
    const signupResponse = await agent
      .post(`${BASE_URL}/api/signup`)
      .send({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      });

    console.log('Signup response:', signupResponse.status);

    // Login to get authenticated session
    console.log('3. Logging in...');
    const loginResponse = await agent
      .post(`${BASE_URL}/api/login`)
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    console.log('Login response:', loginResponse.status);

    // Now test dashboard routes with authenticated session
    console.log('\n4. Testing dashboard routes with authentication...');

    // Test dashboard stats
    console.log('Testing /api/dashboard/stats...');
    const statsResponse = await agent
      .get(`${BASE_URL}/api/dashboard/stats`);

    console.log('Stats response:', statsResponse.status);
    if (statsResponse.status === 200) {
      console.log('✅ Stats data:', JSON.stringify(statsResponse.body, null, 2));
    } else {
      console.log('❌ Stats failed:', statsResponse.status, statsResponse.body);
    }

    // Test transactions over time
    console.log('\nTesting /api/dashboard/transactions-over-time...');
    const timeResponse = await agent
      .get(`${BASE_URL}/api/dashboard/transactions-over-time`);

    console.log('Transactions over time response:', timeResponse.status);
    if (timeResponse.status === 200) {
      console.log('✅ Time data:', JSON.stringify(timeResponse.body, null, 2));
    } else {
      console.log('❌ Time data failed:', timeResponse.status, timeResponse.body);
    }

    // Test recent activities
    console.log('\nTesting /api/dashboard/recent-activities...');
    const activitiesResponse = await agent
      .get(`${BASE_URL}/api/dashboard/recent-activities`);

    console.log('Recent activities response:', activitiesResponse.status);
    if (activitiesResponse.status === 200) {
      console.log('✅ Activities data:', JSON.stringify(activitiesResponse.body, null, 2));
    } else {
      console.log('❌ Activities failed:', activitiesResponse.status, activitiesResponse.body);
    }

    // Test payouts
    console.log('\nTesting /api/payouts...');
    const payoutsResponse = await agent
      .get(`${BASE_URL}/api/payouts`);

    console.log('Payouts response:', payoutsResponse.status);
    if (payoutsResponse.status === 200) {
      console.log('✅ Payouts data:', JSON.stringify(payoutsResponse.body, null, 2));
    } else {
      console.log('❌ Payouts failed:', payoutsResponse.status, payoutsResponse.body);
    }

    console.log('\n✅ Authenticated Dashboard Testing Complete!');

    // Clean up - logout
    console.log('\n5. Logging out...');
    const logoutResponse = await agent
      .post(`${BASE_URL}/api/logout`);

    console.log('Logout response:', logoutResponse.status);

    // Stop server
    serverProcess.kill();

  } catch (error) {
    console.error('❌ Error testing authenticated dashboard:', error);
  }
}

testAuthenticatedDashboard();
