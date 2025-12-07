import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testDashboardSimple() {
  try {
    console.log('🔐 Testing Dashboard Authentication Fix...\n');

    // Test 1: Check if server is running
    console.log('1. Checking if server is running...');
    try {
      const healthCheck = await fetch(`${BASE_URL}/api/health`);
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server not running, starting it...');
      return;
    }

    // Test 2: Try to access dashboard without auth (should fail)
    console.log('\n2. Testing dashboard without authentication...');
    const unauthResponse = await fetch(`${BASE_URL}/api/dashboard/stats`);
    console.log('Status:', unauthResponse.status, unauthResponse.status === 401 ? '✅ Correctly requires auth' : '❌ Should require auth');

    // Test 3: Create a test user
    console.log('\n3. Creating test user...');
    const signupResponse = await fetch(`${BASE_URL}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      })
    });
    console.log('Signup status:', signupResponse.status);

    // Test 4: Login to get session
    console.log('\n4. Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });
    console.log('Login status:', loginResponse.status);

    if (loginResponse.status === 200) {
      // Test 5: Access dashboard with session
      console.log('\n5. Testing dashboard with authentication...');

      // Get session cookie
      const cookies = loginResponse.headers.get('set-cookie');
      console.log('Session cookies received:', cookies ? '✅' : '❌');

      // Test dashboard stats
      const statsResponse = await fetch(`${BASE_URL}/api/dashboard/stats`, {
        headers: {
          'Cookie': cookies || ''
        }
      });
      console.log('Dashboard stats status:', statsResponse.status);

      if (statsResponse.status === 200) {
        const data = await statsResponse.json();
        console.log('✅ Dashboard stats working:', JSON.stringify(data, null, 2));
      } else {
        const error = await statsResponse.text();
        console.log('❌ Dashboard stats failed:', error);
      }

      // Test transactions over time
      const timeResponse = await fetch(`${BASE_URL}/api/dashboard/transactions-over-time`, {
        headers: {
          'Cookie': cookies || ''
        }
      });
      console.log('Transactions over time status:', timeResponse.status);

      if (timeResponse.status === 200) {
        const data = await timeResponse.json();
        console.log('✅ Transactions over time working:', JSON.stringify(data, null, 2));
      }

      // Test recent activities
      const activitiesResponse = await fetch(`${BASE_URL}/api/dashboard/recent-activities`, {
        headers: {
          'Cookie': cookies || ''
        }
      });
      console.log('Recent activities status:', activitiesResponse.status);

      if (activitiesResponse.status === 200) {
        const data = await activitiesResponse.json();
        console.log('✅ Recent activities working:', JSON.stringify(data, null, 2));
      }

    } else {
      console.log('❌ Login failed, cannot test authenticated routes');
    }

    console.log('\n✅ Dashboard Authentication Test Complete!');

  } catch (error) {
    console.error('❌ Error testing dashboard:', error);
  }
}

testDashboardSimple();
