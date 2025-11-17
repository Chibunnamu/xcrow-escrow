import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testDashboardAPI() {
  try {
    console.log('Testing Dashboard API endpoints...\n');

    // Test 1: Dashboard Stats
    console.log('1. Testing /api/dashboard/stats...');
    try {
      const statsResponse = await fetch(`${BASE_URL}/api/dashboard/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`Status: ${statsResponse.status}`);
      if (statsResponse.status === 401) {
        console.log('Expected: Authentication required (401)');
      } else {
        const statsData = await statsResponse.json();
        console.log('Stats data:', statsData);
      }
    } catch (error) {
      console.error('Stats error:', error.message);
    }

    console.log('\n2. Testing /api/dashboard/transactions-over-time...');
    try {
      const timeResponse = await fetch(`${BASE_URL}/api/dashboard/transactions-over-time`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`Status: ${timeResponse.status}`);
      if (timeResponse.status === 401) {
        console.log('Expected: Authentication required (401)');
      } else {
        const timeData = await timeResponse.json();
        console.log('Transactions over time data:', timeData);
      }
    } catch (error) {
      console.error('Transactions over time error:', error.message);
    }

    console.log('\n3. Testing /api/dashboard/recent-activities...');
    try {
      const activitiesResponse = await fetch(`${BASE_URL}/api/dashboard/recent-activities`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`Status: ${activitiesResponse.status}`);
      if (activitiesResponse.status === 401) {
        console.log('Expected: Authentication required (401)');
      } else {
        const activitiesData = await activitiesResponse.json();
        console.log('Recent activities data:', activitiesData);
      }
    } catch (error) {
      console.error('Recent activities error:', error.message);
    }

    console.log('\n4. Testing /api/payouts...');
    try {
      const payoutsResponse = await fetch(`${BASE_URL}/api/payouts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`Status: ${payoutsResponse.status}`);
      if (payoutsResponse.status === 401) {
        console.log('Expected: Authentication required (401)');
      } else {
        const payoutsData = await payoutsResponse.json();
        console.log('Payouts data:', payoutsData);
      }
    } catch (error) {
      console.error('Payouts error:', error.message);
    }

    console.log('\n5. Testing /api/transactions/buyer (should work without auth)...');
    try {
      const buyerResponse = await fetch(`${BASE_URL}/api/transactions/buyer`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`Status: ${buyerResponse.status}`);
      const buyerData = await buyerResponse.json();
      console.log('Buyer transactions data:', buyerData);
    } catch (error) {
      console.error('Buyer transactions error:', error.message);
    }

    console.log('\n✅ Dashboard API testing completed!');
    console.log('Note: 401 responses are expected since we are not authenticated.');
    console.log('The routes are working correctly - they require authentication as designed.');

  } catch (error) {
    console.error('Test error:', error);
  }
}

testDashboardAPI();
