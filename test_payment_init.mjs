import fetch from 'node-fetch';

async function testPaymentInit() {
  try {
    console.log('Testing payment initialization...');

    // First login to get session
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'buyer@example.com',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      console.log('Login failed:', loginResponse.status);
      return;
    }

    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Login successful, got cookies');

    // Now test payment initialization
    const paymentResponse = await fetch('http://localhost:5000/api/payments/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        transactionId: '7ccc7201b2f5dfa91b9233e371cf4093'
      })
    });

    console.log('Payment init status:', paymentResponse.status);
    const data = await paymentResponse.json();
    console.log('Payment init response:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.log('Error:', error.message);
  }
}

testPaymentInit();
