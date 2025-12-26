# Payout Logic Update Tasks

## Current Issues
- Seller payout is calculated as `price - commission` instead of exactly `baseAmount`
- No validation for Paystack wallet balance before transfer
- Missing logging of buyerPaid, sellerPayout, platformCommission, paystackTransactionFee, paystackTransferFee

## Required Changes

### 1. Update Payout Calculation in routes.ts
- Change payoutAmount from `(price - commission)` to exactly `baseAmount` (price)
- Ensure transfer amount sent to Paystack is baseAmount

### 2. Add Paystack Balance Validation
- Check platform's Paystack wallet balance before initiating transfer
- Ensure balance covers baseAmount + paystackTransferFee

### 3. Update Logging and Return Values
- Log and return: buyerPaid, sellerPayout, platformCommission, paystackTransactionFee, paystackTransferFee
- Ensure seller payout record shows sellerPayout = baseAmount

### 4. Verify Payment Calculation
- Confirm calculatePaystackCharge function correctly calculates fees
- Ensure buyer pays: baseAmount + commission + transactionFee + transferFee

## Files to Modify
- server/routes.ts (payout logic in transaction status update)
- server/paystack.ts (add balance check function)
- server/transfer.ts (potentially add balance check)

## Testing
- Run test_payment_calculation.mjs to verify calculations
- Test with sample transactions to ensure correct payouts
