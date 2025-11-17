import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function testMarkTransferred() {
  console.log('Testing /api/transactions/:id/mark-transferred endpoint...\n');

  try {
    // First, create a test transaction
    console.log('1. Creating a test transaction...');
    const createResponse = await axios.post(`${BASE_URL}/api/transactions`, {
      itemName: 'Test Item for Mark Transferred',
      itemDescription: 'Test description',
      price: '100.00',
      commission: '5.00',
      buyerEmail: 'buyer@example.com',
      uniqueLink: `test-link-${Date.now()}`
    }, {
      headers: {
        'Cookie': 'connect.sid=test-session-id' // Mock session
      }
    });

    const transactionId = createResponse.data.transaction.id;
    console.log(`Created transaction with ID: ${transactionId}`);

    // Update transaction status to "paid" (normally done by payment webhook)
    console.log('2. Updating transaction status to "paid"...');
    await axios.patch(`${BASE_URL}/api/transactions/${transactionId}/status`, {
      status: 'paid'
    }, {
      headers: {
        'Cookie': 'connect.sid=test-session-id'
      }
    });

    console.log('Transaction status updated to "paid"');

    // Now test the mark-transferred endpoint
    console.log('3. Testing mark-transferred endpoint...');
    const markResponse = await axios.post(`${BASE_URL}/api/transactions/${transactionId}/mark-transferred`, {}, {
      headers: {
        'Cookie': 'connect.sid=test-session-id'
      }
    });

    console.log('✅ Mark transferred successful!');
    console.log('Response:', markResponse.data);

    // Verify the transaction status was updated
    console.log('4. Verifying transaction status...');
    const verifyResponse = await axios.get(`${BASE_URL}/api/transactions/id/${transactionId}`);
    console.log('Updated transaction status:', verifyResponse.data.transaction.status);

    if (verifyResponse.data.transaction.status === 'asset_transferred') {
      console.log('✅ Transaction status correctly updated to "asset_transferred"');
    } else {
      console.log('❌ Transaction status not updated correctly');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Test error cases
async function testErrorCases() {
  console.log('\nTesting error cases...\n');

  try {
    // Test with non-existent transaction
    console.log('1. Testing with non-existent transaction ID...');
    await axios.post(`${BASE_URL}/api/transactions/non-existent-id/mark-transferred`, {}, {
      headers: {
        'Cookie': 'connect.sid=test-session-id'
      }
    });
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('✅ Correctly returned 404 for non-existent transaction');
    } else {
      console.log('❌ Unexpected error for non-existent transaction:', error.response?.data);
    }
  }

  try {
    // Test with transaction not in "paid" status
    console.log('2. Testing with transaction not in "paid" status...');
    const createResponse = await axios.post(`${BASE_URL}/api/transactions`, {
      itemName: 'Test Item Not Paid',
      itemDescription: 'Test description',
      price: '50.00',
      commission: '2.50',
      buyerEmail: 'buyer2@example.com',
      uniqueLink: `test-link-pending-${Date.now()}`
    }, {
      headers: {
        'Cookie': 'connect.sid=test-session-id'
      }
    });

    const transactionId = createResponse.data.transaction.id;

    await axios.post(`${BASE_URL}/api/transactions/${transactionId}/mark-transferred`, {}, {
      headers: {
        'Cookie': 'connect.sid=test-session-id'
      }
    });
  } catch (error) {
    if (error.response?.status === 400 && error.response.data.message.includes('paid')) {
      console.log('✅ Correctly rejected transaction not in "paid" status');
    } else {
      console.log('❌ Unexpected error for unpaid transaction:', error.response?.data);
    }
  }
}

async function runTests() {
  await testMarkTransferred();
  await testErrorCases();
  console.log('\n🎉 Testing completed!');
}

runTests().catch(console.error);
