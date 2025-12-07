import fetch from 'node-fetch';

async function testAdminLogin() {
  try {
    console.log('Testing admin login...');

    // First, login with admin credentials
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'breezora@gmail.com',
        password: 'admin@breezora'
      })
    });

    console.log('Login status:', loginResponse.status);

    if (!loginResponse.ok) {
      console.log('Login failed');
      return;
    }

    const loginData = await loginResponse.json();
    console.log('Login successful:', loginData);

    // Extract session cookie
    const cookie = loginResponse.headers.get('set-cookie');
    console.log('Session cookie:', cookie);

    // Test admin dashboard access
    console.log('\nTesting admin dashboard access...');
    const adminResponse = await fetch('http://localhost:5000/api/admin/transactions', {
      method: 'GET',
      headers: {
        'Cookie': cookie
      }
    });

    console.log('Admin dashboard status:', adminResponse.status);

    if (adminResponse.ok) {
      const adminData = await adminResponse.json();
      console.log('Admin dashboard accessible. Transactions count:', adminData.transactions?.length || 0);
    } else {
      const errorData = await adminResponse.json();
      console.log('Admin dashboard access failed:', errorData);
    }

    // Test user info to verify role
    console.log('\nTesting user info...');
    const userResponse = await fetch('http://localhost:5000/api/user', {
      method: 'GET',
      headers: {
        'Cookie': cookie
      }
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('User role:', userData.user?.role || 'user');
    }

  } catch (error) {
    console.log('Error:', error.message);
  }
}

testAdminLogin();
