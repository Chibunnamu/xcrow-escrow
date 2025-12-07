import fetch from 'node-fetch';

async function testAcceptTransaction() {
  try {
    console.log('Testing transaction acceptance...');

    // First login as buyer
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

    // Now accept the transaction
    const acceptResponse = await fetch('http://localhost:5000/api/transactions/njN2N0ojAvZv2tB3cxZN/accept', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    });

    console.log('Accept transaction status:', acceptResponse.status);
    const data = await acceptResponse.json();
    console.log('Accept transaction response:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.log('Error:', error.message);
  }
}

testAcceptTransaction();
