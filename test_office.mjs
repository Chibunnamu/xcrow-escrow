import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testOfficeEndpoints() {
  try {
    console.log('🏢 Testing Office Endpoints...\n');

    // Test 1: Check if server is running
    console.log('1. Checking if server is running...');
    try {
      const healthCheck = await fetch(`${BASE_URL}/api/health`);
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server not running, starting it...');
      return;
    }

    // Test 2: Login as existing seller (using the user from test_user_dashboard.mjs)
    console.log('\n2. Logging in as existing seller...');
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'chimjize123@gmail.com',
        password: 'password123' // This is the correct password from the test data
      })
    });
    console.log('Seller login status:', loginResponse.status);

    // If login fails, try creating the user first
    if (loginResponse.status !== 200) {
      console.log('Login failed, trying to create the user first...');
      const signupResponse = await fetch(`${BASE_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'chimjize123@gmail.com',
          password: 'password123',
          firstName: 'Chimbunnamu',
          lastName: 'Nwachinaemere'
        })
      });
      console.log('Signup status:', signupResponse.status);

      if (signupResponse.status === 201) {
        console.log('User created, trying login again...');
        const retryLoginResponse = await fetch(`${BASE_URL}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'chimjize123@gmail.com',
            password: 'password123'
          })
        });
        console.log('Retry login status:', retryLoginResponse.status);
        if (retryLoginResponse.status === 200) {
          console.log('✅ Login successful after signup');
          return; // Exit since we can't continue with the test
        }
      }
    }

    if (loginResponse.status === 200) {
      // Get session cookie
      const cookies = loginResponse.headers.get('set-cookie');
      console.log('Session cookies received:', cookies ? '✅' : '❌');

      // Test 4: Test office stats
      console.log('\n4. Testing office stats...');
      const statsResponse = await fetch(`${BASE_URL}/api/office/stats`, {
        headers: {
          'Cookie': cookies || ''
        }
      });
      console.log('Office stats status:', statsResponse.status);

      if (statsResponse.status === 200) {
        const data = await statsResponse.json();
        console.log('✅ Office stats working:', JSON.stringify(data, null, 2));
      } else {
        const error = await statsResponse.text();
        console.log('❌ Office stats failed:', error);
      }

      // Test 5: Test ongoing transactions
      console.log('\n5. Testing ongoing transactions...');
      const ongoingResponse = await fetch(`${BASE_URL}/api/office/ongoing-transactions`, {
        headers: {
          'Cookie': cookies || ''
        }
      });
      console.log('Ongoing transactions status:', ongoingResponse.status);

      if (ongoingResponse.status === 200) {
        const data = await ongoingResponse.json();
        console.log('✅ Ongoing transactions working:', JSON.stringify(data, null, 2));
      } else {
        const error = await ongoingResponse.text();
        console.log('❌ Ongoing transactions failed:', error);
      }

      // Test 6: Test transaction history
      console.log('\n6. Testing transaction history...');
      const historyResponse = await fetch(`${BASE_URL}/api/office/transaction-history`, {
        headers: {
          'Cookie': cookies || ''
        }
      });
      console.log('Transaction history status:', historyResponse.status);

      if (historyResponse.status === 200) {
        const data = await historyResponse.json();
        console.log('✅ Transaction history working:', JSON.stringify(data, null, 2));
      } else {
        const error = await historyResponse.text();
        console.log('❌ Transaction history failed:', error);
      }

      // Test 7: Test filtering and pagination
      console.log('\n7. Testing filtering and pagination...');
      const filteredResponse = await fetch(`${BASE_URL}/api/office/ongoing-transactions?status=pending&page=1&limit=10&sortBy=createdAt&sortOrder=desc`, {
        headers: {
          'Cookie': cookies || ''
        }
      });
      console.log('Filtered ongoing transactions status:', filteredResponse.status);

      if (filteredResponse.status === 200) {
        const data = await filteredResponse.json();
        console.log('✅ Filtering and pagination working:', JSON.stringify(data, null, 2));
      } else {
        const error = await filteredResponse.text();
        console.log('❌ Filtering and pagination failed:', error);
      }

      // Test 8: Test history with date filters
      console.log('\n8. Testing history with date filters...');
      const dateFilteredResponse = await fetch(`${BASE_URL}/api/office/transaction-history?dateFrom=2024-01-01&dateTo=2024-12-31&minAmount=100&maxAmount=10000`, {
        headers: {
          'Cookie': cookies || ''
        }
      });
      console.log('Date filtered history status:', dateFilteredResponse.status);

      if (dateFilteredResponse.status === 200) {
        const data = await dateFilteredResponse.json();
        console.log('✅ Date filtering working:', JSON.stringify(data, null, 2));
      } else {
        const error = await dateFilteredResponse.text();
        console.log('❌ Date filtering failed:', error);
      }

      // Test 9: Test search functionality in transaction history
      console.log('\n9. Testing search functionality in transaction history...');
      const searchResponse = await fetch(`${BASE_URL}/api/office/transaction-history?search=chimbunnamunwachinaemere@gmail.com`, {
        headers: {
          'Cookie': cookies || ''
        }
      });
      console.log('Search in transaction history status:', searchResponse.status);

      if (searchResponse.status === 200) {
        const data = await searchResponse.json();
        console.log('✅ Search in transaction history working:', JSON.stringify(data, null, 2));
      } else {
        const error = await searchResponse.text();
        console.log('❌ Search in transaction history failed:', error);
      }

      // Test 10: Test search functionality in ongoing transactions
      console.log('\n10. Testing search functionality in ongoing transactions...');
      const ongoingSearchResponse = await fetch(`${BASE_URL}/api/office/ongoing-transactions?search=chimbunnamunwachinaemere@gmail.com`, {
        headers: {
          'Cookie': cookies || ''
        }
      });
      console.log('Search in ongoing transactions status:', ongoingSearchResponse.status);

      if (ongoingSearchResponse.status === 200) {
        const data = await ongoingSearchResponse.json();
        console.log('✅ Search in ongoing transactions working:', JSON.stringify(data, null, 2));
      } else {
        const error = await ongoingSearchResponse.text();
        console.log('❌ Search in ongoing transactions failed:', error);
      }

    } else {
      console.log('❌ Seller login failed, cannot test office endpoints');
    }

    console.log('\n✅ Office Endpoints Testing Complete!');

  } catch (error) {
    console.error('❌ Error testing office endpoints:', error);
  }
}

testOfficeEndpoints();
