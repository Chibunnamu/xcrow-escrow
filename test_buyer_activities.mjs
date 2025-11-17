import fetch from 'node-fetch';
import { spawn } from 'child_process';

const BASE_URL = 'http://localhost:5000';

async function testBuyerActivities() {
  console.log('🛒 Testing Buyer Activities in Dashboard...\n');

  try {
    // First, start the server using tsx directly
    console.log('1. Starting server...');
    const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
      cwd: process.cwd(),
      stdio: 'inherit',
      detached: true,
      env: { ...process.env, NODE_ENV: 'development' }
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 5000));

    const agent = await import('superagent').then(m => m.default);

    // Create a seller user first
    console.log('2. Creating seller user...');
    const sellerSignupResponse = await agent
      .post(`${BASE_URL}/api/signup`)
      .send({
        email: 'seller@example.com',
        password: 'password123',
        firstName: 'Seller',
        lastName: 'User'
      });

    console.log('Seller signup response:', sellerSignupResponse.status);

    // Login as seller
    console.log('3. Logging in as seller...');
    const sellerLoginResponse = await agent
      .post(`${BASE_URL}/api/login`)
      .send({
        email: 'seller@example.com',
        password: 'password123'
      });

    console.log('Seller login response:', sellerLoginResponse.status);

    // Create a transaction as seller
    console.log('4. Creating transaction as seller...');
    const createResponse = await agent
      .post(`${BASE_URL}/api/transactions`)
      .send({
        itemName: 'Test Laptop for Buyer',
        itemDescription: 'A high-quality laptop for testing buyer activities',
        price: '1500.00',
        commission: '75.00',
        buyerEmail: 'buyer@example.com',
        uniqueLink: `test-link-buyer-${Date.now()}`
      });

    const transactionId = createResponse.body.transaction.id;
    console.log(`Created transaction with ID: ${transactionId}`);

    // Logout seller
    await agent.post(`${BASE_URL}/api/logout`);

    // Create buyer user
    console.log('5. Creating buyer user...');
    const buyerSignupResponse = await agent
      .post(`${BASE_URL}/api/signup`)
      .send({
        email: 'buyer@example.com',
        password: 'password123',
        firstName: 'Buyer',
        lastName: 'User'
      });

    console.log('Buyer signup response:', buyerSignupResponse.status);

    // Login as buyer
    console.log('6. Logging in as buyer...');
    const buyerLoginResponse = await agent
      .post(`${BASE_URL}/api/login`)
      .send({
        email: 'buyer@example.com',
        password: 'password123'
      });

    console.log('Buyer login response:', buyerLoginResponse.status);

    // Accept the transaction as buyer
    console.log('7. Accepting transaction as buyer...');
    const acceptResponse = await agent
      .post(`${BASE_URL}/api/transactions/${transactionId}/accept`);

    console.log('Accept response:', acceptResponse.status);

    // Test buyer dashboard activities
    console.log('8. Testing buyer dashboard recent activities...');
    const activitiesResponse = await agent
      .get(`${BASE_URL}/api/dashboard/recent-activities`);

    console.log('Activities response status:', activitiesResponse.status);
    if (activitiesResponse.status === 200) {
      console.log('✅ Buyer activities retrieved successfully!');
      console.log('Activities data:', JSON.stringify(activitiesResponse.body, null, 2));

      // Check if buyer activities are included
      const activities = activitiesResponse.body.activities;
      const buyerActivity = activities.find(a => a.userRole === 'buyer');

      if (buyerActivity) {
        console.log('✅ Buyer activity found!');
        console.log('Buyer activity details:');
        console.log(`  - Item: ${buyerActivity.itemName}`);
        console.log(`  - Description: ${buyerActivity.itemDescription}`);
        console.log(`  - Price: $${buyerActivity.price}`);
        console.log(`  - Status: ${buyerActivity.status}`);
        console.log(`  - Can confirm receipt: ${buyerActivity.canConfirmReceipt}`);
        console.log(`  - Activity: ${buyerActivity.activity}`);
        console.log(`  - Details: ${buyerActivity.details}`);
      } else {
        console.log('❌ No buyer activity found in activities list');
      }
    } else {
      console.log('❌ Failed to get activities:', activitiesResponse.status, activitiesResponse.body);
    }

    // Test with asset transferred status
    console.log('9. Updating transaction to asset_transferred status...');

    // First logout buyer and login as seller
    await agent.post(`${BASE_URL}/api/logout`);

    const sellerLoginAgain = await agent
      .post(`${BASE_URL}/api/login`)
      .send({
        email: 'seller@example.com',
        password: 'password123'
      });

    // Update to paid status first (simulate payment)
    await agent
      .patch(`${BASE_URL}/api/transactions/${transactionId}/status`)
      .send({
        status: 'paid'
      });

    // Mark as transferred
    const transferResponse = await agent
      .post(`${BASE_URL}/api/transactions/${transactionId}/mark-transferred`);

    console.log('Mark transferred response:', transferResponse.status);

    // Logout seller and login as buyer again
    await agent.post(`${BASE_URL}/api/logout`);

    const buyerLoginAgain = await agent
      .post(`${BASE_URL}/api/login`)
      .send({
        email: 'buyer@example.com',
        password: 'password123'
      });

    // Test activities again with asset_transferred status
    console.log('10. Testing buyer activities with asset_transferred status...');
    const updatedActivitiesResponse = await agent
      .get(`${BASE_URL}/api/dashboard/recent-activities`);

    if (updatedActivitiesResponse.status === 200) {
      const activities = updatedActivitiesResponse.body.activities;
      const buyerActivity = activities.find(a => a.userRole === 'buyer');

      if (buyerActivity) {
        console.log('✅ Updated buyer activity:');
        console.log(`  - Status: ${buyerActivity.status}`);
        console.log(`  - Can confirm receipt: ${buyerActivity.canConfirmReceipt}`);
        console.log(`  - Activity: ${buyerActivity.activity}`);
        console.log(`  - Details: ${buyerActivity.details}`);

        if (buyerActivity.canConfirmReceipt) {
          console.log('✅ Buyer can now confirm receipt!');
        } else {
          console.log('❌ Buyer cannot confirm receipt yet');
        }
      }
    }

    // Clean up - logout
    await agent.post(`${BASE_URL}/api/logout`);

    // Stop server
    serverProcess.kill();

    console.log('\n🎉 Buyer Activities Testing Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.body);
    }
  }
}

testBuyerActivities().catch(console.error);
