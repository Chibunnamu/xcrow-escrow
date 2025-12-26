import { calculatePaystackCharge } from './server/paystack.ts';

// Test the new payment calculation system
console.log('Testing Payment Calculation System\n');

// Test with ₦500 example from requirements
const baseAmount = 500;
const breakdown = calculatePaystackCharge(baseAmount);

console.log(`Base Amount (Item Price): ₦${breakdown.baseAmount}`);
console.log(`Seller Payout: ₦${breakdown.sellerPayout}`);
console.log(`Company Commission (10%): ₦${breakdown.companyCommission}`);
console.log(`Paystack Transaction Fee: ₦${breakdown.paystackTransactionFee}`);
console.log(`Paystack Transfer Fee: ₦${breakdown.paystackTransferFee}`);
console.log(`Total Amount Buyer Pays: ₦${breakdown.totalChargeAmount}`);

console.log('\nVerification:');
console.log(`✓ Seller receives exactly base amount: ${breakdown.sellerPayout === baseAmount}`);
console.log(`✓ Company earns 10% of base: ${breakdown.companyCommission === baseAmount * 0.10}`);
console.log(`✓ Buyer pays = base + commission + fees: ${breakdown.totalChargeAmount === breakdown.baseAmount + breakdown.companyCommission + breakdown.paystackTransactionFee + breakdown.paystackTransferFee}`);

// Test with different amounts
console.log('\n--- Testing with ₦1000 ---');
const breakdown2 = calculatePaystackCharge(1000);
console.log(`Base: ₦${breakdown2.baseAmount}, Seller: ₦${breakdown2.sellerPayout}, Company: ₦${breakdown2.companyCommission}, Buyer: ₦${breakdown2.totalChargeAmount}`);

console.log('\n--- Testing with ₦2500 ---');
const breakdown3 = calculatePaystackCharge(2500);
console.log(`Base: ₦${breakdown3.baseAmount}, Seller: ₦${breakdown3.sellerPayout}, Company: ₦${breakdown3.companyCommission}, Buyer: ₦${breakdown3.totalChargeAmount}`);
