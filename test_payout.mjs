import { checkBalanceAndSettle, initiateSafePayout } from './server/payout.ts';
import { getBalance } from './server/transfer_new.ts';

console.log('Testing Payout System\n');

// Test 1: Check Paystack balance
console.log('--- Test 1: Check Paystack Balance ---');
try {
  const balanceResponse = await getBalance();
  const ngnBalance = balanceResponse.data.find(b => b.currency === "NGN");
  console.log(`Paystack Balance: ₦${(ngnBalance?.balance || 0) / 100}`);
  console.log(`Balance in kobo: ${ngnBalance?.balance || 0}`);
} catch (error) {
  console.error('Error checking balance:', error.message);
}

// Test 2: Test balance check for settlement
console.log('\n--- Test 2: Balance Check for ₦10,000 payout ---');
try {
  const hasBalance = await checkBalanceAndSettle('test-seller-id', 10000);
  console.log(`Can settle ₦10,000 payout: ${hasBalance}`);
} catch (error) {
  console.error('Error checking balance for settlement:', error.message);
}

// Test 3: Test payout initiation (this will fail because we don't have real transaction data)
console.log('\n--- Test 3: Payout Initiation Test ---');
try {
  const success = await initiateSafePayout('test-transaction-id', 'test-seller-id', 10000);
  console.log(`Payout initiation result: ${success}`);
} catch (error) {
  console.error('Error initiating payout:', error.message);
}

console.log('\nPayout system test completed.');
