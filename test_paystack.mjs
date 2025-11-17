import 'dotenv/config';
import axios from 'axios';

const paystackClient = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json'
  }
});

async function testPaystack() {
  try {
    console.log('Testing Paystack API with key:', process.env.PAYSTACK_SECRET_KEY ? process.env.PAYSTACK_SECRET_KEY.substring(0, 10) + '...' : 'undefined');

    const response = await paystackClient.get('/bank?country=nigeria');
    console.log('Paystack API working:', response.data.status);
    console.log('Banks count:', response.data.data.length);

    // Test payment initialization
    console.log('\nTesting payment initialization...');
    const paymentResponse = await paystackClient.post('/transaction/initialize', {
      email: 'test@example.com',
      amount: 10000, // 100 NGN in kobo
      reference: 'test-ref-' + Date.now(),
      callback_url: 'http://localhost:5000/payment-callback'
    });

    console.log('Payment init successful!');
    console.log('Authorization URL:', paymentResponse.data.data.authorization_url);
    console.log('Is live URL:', paymentResponse.data.data.authorization_url.includes('checkout.paystack.com'));

  } catch (error) {
    console.error('Paystack API error:', error.response?.data?.message || error.message);
  }
}

testPaystack();
