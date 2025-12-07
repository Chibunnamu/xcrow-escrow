import axios from 'axios';

async function testPaymentInit() {
  try {
    console.log('Testing payment initialization...');

    // Login as buyer
    const loginResponse = await axios.post('http://localhost:5000/api/login', {
      email: 'buyer@example.com',
      password: 'password123'
    }, { withCredentials: true });

    const cookies = loginResponse.headers['set-cookie'];
    const sessionCookie = cookies?.find(c => c.startsWith('connect.sid'));

    if (!sessionCookie) {
      console.log('No session cookie found');
      return;
    }

    console.log('Buyer session cookie obtained');

    // Accept transaction first
    const acceptResponse = await axios.post('http://localhost:5000/api/transactions/0hBDYAPnGtZMt1kI8qQe/accept', {}, {
      headers: { 'Cookie': sessionCookie },
      withCredentials: true
    });

    console.log('Accept response:', acceptResponse.data);

    // Now initialize payment
    const paymentResponse = await axios.post('http://localhost:5000/api/payments/initialize', {
      transactionId: '93591403e534b6e062e93eee96db6692'
    }, {
      headers: { 'Cookie': sessionCookie },
      withCredentials: true
    });

    console.log('Payment init response:', paymentResponse.data);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testPaymentInit();
