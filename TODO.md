# Fee Handling Implementation Tasks

## Implemented Changes
- Updated fee structure to Xcrowpay 5% service fee, Paystack 1.5% collection (capped at ₦1,000), payout fee deducted from Xcrowpay fee
- Seller receives full transaction amount (principal)
- Xcrowpay revenue = 5% - payout fee
- All calculations in kobo, rounded to nearest kobo
- Configurable rates in FEE_CONFIG

## Remaining Tasks

### 1. Update Payout Calculation in routes.ts
- Ensure transfer amount sent to Paystack is transactionAmount
- Use calculateFees for fee breakdown

### 2. Add Paystack Balance Validation
- Check platform's Paystack wallet balance before initiating transfer
- Ensure balance covers transactionAmount + any additional fees if needed

### 3. Update Logging and Return Values
- Log and return: transactionAmount, paystackCollectionFee, xcrowpayFee, paystackPayoutFee, netAmountToBeneficiary, netRevenueToXcrowpay
- Ensure seller payout record shows netAmountToBeneficiary = transactionAmount

### 4. Integrate Fee Calculation in Payment Flow
- Use calculateFees in payment initialization and verification
- Update routes to use new fee structure

## Files to Modify
- server/routes.ts (integrate calculateFees in payment routes)
- server/paystack.ts (add balance check function if needed)
- server/transfer.ts (update transfer logic)

## Testing
- Run test_payment_calculation.mjs to verify calculations
- Test with sample transactions: ₦10,000, ₦50,000, ₦100,000
