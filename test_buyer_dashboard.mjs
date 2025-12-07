import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testBuyerDashboard() {
  try {
    console.log('🛒 Testing Buyer Dashboard Endpoints...\n');

    // Test 1: Check if server is running
    console.log('1. Checking if server is running...');
    try {
      const healthCheck = await fetch(`${BASE_URL}/api/health`);
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server not running, starting it...');
      return;
    }

    // Test 2: Create a test buyer user
    console.log('\n2. Creating test buyer user...');
    const signupResponse = await fetch(`${BASE_URL}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'buyer@example.com',
        password: 'password123',
        firstName: 'Buyer',
        lastName: 'User'
      })
    });
    console.log('Buyer signup status:', signupResponse.status);

    // Test 3: Login as buyer
    console.log('\n3. Logging in as buyer...');
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'buyer@example.com',
        password: 'password123'
      })
    });
    console.log('Buyer login status:', loginResponse.status);

    if (loginResponse.status === 200) {
      // Get session cookie
      const cookies = loginResponse.headers.get('set-cookie');
      console.log('Session cookies received:', cookies ? '✅' : '❌');

      // Test 4: Test buyer dashboard stats
      console.log('\n4. Testing buyer dashboard stats...');
      const statsResponse = await fetch(`${BASE_URL}/api/dashboard/buyer/stats`, {
        headers: {
          'Cookie': cookies || ''
        }
      });
      console.log('Buyer stats status:', statsResponse.status);

      if (statsResponse.status === 200) {
        const data = await statsResponse.json();
        console.log('✅ Buyer stats working:', JSON.stringify(data, null, 2));
      } else {
        const error = await statsResponse.text();
        console.log('❌ Buyer stats failed:', error);
      }

      // Test 5: Test buyer transactions over time
      console.log('\n5. Testing buyer transactions over time...');
      const timeResponse = await fetch(`${BASE_URL}/api/dashboard/buyer/transactions-over-time`, {
        headers: {
          'Cookie': cookies || ''
        }
      });
      console.log('Buyer transactions over time status:', timeResponse.status);

      if (timeResponse.status === 200) {
        const data = await timeResponse.json();
        console.log('✅ Buyer transactions over time working:', JSON.stringify(data, null, 2));
      } else {
        const error = await timeResponse.text();
        console.log('❌ Buyer transactions over time failed:', error);
      }

      // Test 6: Test recent activities (should include buyer activities)
      console.log('\n6. Testing recent activities with buyer data...');
      const activitiesResponse = await fetch(`${BASE_URL}/api/dashboard/recent-activities`, {
        headers: {
          'Cookie': cookies || ''
        }
      });
      console.log('Recent activities status:', activitiesResponse.status);

      if (activitiesResponse.status === 200) {
        const data = await activitiesResponse.json();
        console.log('✅ Recent activities working:', JSON.stringify(data, null, 2));
      } else {
        const error = await activitiesResponse.text();
        console.log('❌ Recent activities failed:', error);
      }

    } else {
      console.log('❌ Buyer login failed, cannot test buyer dashboard endpoints');
    }

    console.log('\n✅ Buyer Dashboard Testing Complete!');

  } catch (error) {
    console.error('❌ Error testing buyer dashboard:', error);
  }
}

testBuyerDashboard();
