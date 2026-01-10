import { calculateFees } from './server/paystack.ts';

// Test the Xcrowpay fee calculation system
console.log('Testing Xcrowpay Fee Calculation System\n');

// Helper to convert kobo to Naira
const koboToNaira = (kobo) => (kobo / 100).toFixed(2);

// Test with ₦10,000 (1,000,000 kobo)
console.log('--- Example: ₦10,000 ---');
const amount1 = 1000000; // ₦10,000 in kobo
const fees1 = calculateFees(amount1);
console.log(`Transaction Amount: ₦${koboToNaira(fees1.transactionAmount)}`);
console.log(`Paystack Collection Fee: ₦${koboToNaira(fees1.paystackCollectionFee)} (1.5% of transaction, capped at ₦1,000)`);
console.log(`Xcrowpay Fee: ₦${koboToNaira(fees1.xcrowpayFee)} (5% of transaction)`);
console.log(`Paystack Payout Fee: ₦${koboToNaira(fees1.paystackPayoutFee)} (deducted from Xcrowpay fee)`);
console.log(`Net Amount to Beneficiary: ₦${koboToNaira(fees1.netAmountToBeneficiary)}`);
console.log(`Net Revenue to Xcrowpay: ₦${koboToNaira(fees1.netRevenueToXcrowpay)}`);
console.log(`Total User Pays: ₦${koboToNaira(fees1.transactionAmount + fees1.paystackCollectionFee)}`);

console.log('\n--- Example: ₦50,000 ---');
const amount2 = 5000000; // ₦50,000 in kobo
const fees2 = calculateFees(amount2);
console.log(`Transaction Amount: ₦${koboToNaira(fees2.transactionAmount)}`);
console.log(`Paystack Collection Fee: ₦${koboToNaira(fees2.paystackCollectionFee)}`);
console.log(`Xcrowpay Fee: ₦${koboToNaira(fees2.xcrowpayFee)}`);
console.log(`Paystack Payout Fee: ₦${koboToNaira(fees2.paystackPayoutFee)}`);
console.log(`Net Amount to Beneficiary: ₦${koboToNaira(fees2.netAmountToBeneficiary)}`);
console.log(`Net Revenue to Xcrowpay: ₦${koboToNaira(fees2.netRevenueToXcrowpay)}`);
console.log(`Total User Pays: ₦${koboToNaira(fees2.transactionAmount + fees2.paystackCollectionFee)}`);

console.log('\n--- Example: ₦100,000 ---');
const amount3 = 10000000; // ₦100,000 in kobo
const fees3 = calculateFees(amount3);
console.log(`Transaction Amount: ₦${koboToNaira(fees3.transactionAmount)}`);
console.log(`Paystack Collection Fee: ₦${koboToNaira(fees3.paystackCollectionFee)}`);
console.log(`Xcrowpay Fee: ₦${koboToNaira(fees3.xcrowpayFee)}`);
console.log(`Paystack Payout Fee: ₦${koboToNaira(fees3.paystackPayoutFee)}`);
console.log(`Net Amount to Beneficiary: ₦${koboToNaira(fees3.netAmountToBeneficiary)}`);
console.log(`Net Revenue to Xcrowpay: ₦${koboToNaira(fees3.netRevenueToXcrowpay)}`);
console.log(`Total User Pays: ₦${koboToNaira(fees3.transactionAmount + fees3.paystackCollectionFee)}`);

console.log('\n--- Explanation of Xcrowpay Profit Preservation ---');
console.log('Xcrowpay\'s profit is preserved by charging a 5% service fee on every transaction.');
console.log('The Paystack payout fee is deducted from Xcrowpay\'s fee, not the user\'s principal.');
console.log('This ensures the beneficiary receives the full transaction amount, while Xcrowpay retains revenue after covering payout costs.');
console.log('For transactions where 1.5% collection fee would exceed ₦1,000, it is capped, benefiting users.');
console.log('All calculations are rounded to the nearest kobo for accuracy.');
