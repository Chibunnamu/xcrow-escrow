import axios from 'axios';

async function testTransaction() {
  try {
    console.log('Testing transaction creation...');

    // First, try to login instead of signup
    console.log('1. Logging in user...');
    const loginResponse = await axios.post('http://localhost:5000/api/login', {
      email: 'test@example.com',
      password: 'password123'
    }, {
      withCredentials: true
    });

    console.log('Login response:', loginResponse.data);

    // Extract session cookie from login response
    const cookies = loginResponse.headers['set-cookie'];
    const sessionCookie = cookies?.find(c => c.startsWith('connect.sid'));

    if (!sessionCookie) {
      console.log('No session cookie found after login');
      return;
    }

    console.log('Session cookie obtained:', sessionCookie.split(';')[0]);

    // Now try to create transaction
    console.log('2. Creating transaction...');
    const transactionResponse = await axios.post('http://localhost:5000/api/transactions', {
      buyerEmail: 'buyer@example.com',
      itemName: 'Test Item',
      itemDescription: 'Test Description',
      price: '100.00'
    }, {
      headers: {
        'Cookie': sessionCookie
      },
      withCredentials: true
    });

    console.log('Transaction creation response:', transactionResponse.data);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    if (error.response?.status === 400) {
      console.log('Validation errors:', error.response.data.errors);
    }
  }
}

testTransaction();
