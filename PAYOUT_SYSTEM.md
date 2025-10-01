# Automatic Payout System

## Overview
The Xcrow platform now features a complete automatic payout system that transfers funds directly to sellers' Nigerian bank accounts when transactions are completed. This eliminates manual withdrawal processes and provides instant payouts.

## How It Works

### For Sellers

#### 1. Bank Account Setup (One-Time)
Sellers must add their Nigerian bank account details in the Settings page before receiving payouts:

1. Navigate to **Settings** from the sidebar
2. Select your bank from the dropdown (all Nigerian banks supported)
3. Enter your 10-digit account number
4. Click **Verify Account** - system confirms your account name with the bank
5. Review the verified account name
6. Click **Save Bank Account** to complete setup

**Security**: The system verifies your account details with Paystack before saving, ensuring accurate payouts.

#### 2. Automatic Payouts
When a buyer confirms receipt of the digital asset:

1. Transaction status changes to "completed"
2. System automatically calculates payout: **Price - 5% Commission**
3. Transfer is immediately initiated to your saved bank account
4. Payout appears in your **Payout History** section
5. Money arrives in your bank account (usually instant)

**Example**: 
- Transaction Price: ₦10,000
- Commission (5%): ₦500
- Your Payout: ₦9,500

#### 3. Payout History
View all your payouts in the **Seller Dashboard → My Sales** tab:

- **Transaction**: Name of the item sold
- **Amount**: Payout amount in Naira (₦)
- **Status**: 
  - 🟡 **Pending**: Payout initiated, waiting for processing
  - 🔵 **Processing**: Transfer in progress with Paystack
  - 🟢 **Success**: Money successfully transferred to your bank
  - 🔴 **Failed**: Transfer failed (reason displayed)
- **Date**: When the payout was initiated
- **Reference**: Paystack reference number (click to copy)

### For Buyers

No changes needed! When you click **Release Funds** after confirming receipt:
1. Transaction is marked complete
2. Seller automatically receives their payout
3. No additional steps required

## Technical Implementation

### Database Schema

#### Users Table (Bank Account Fields)
```typescript
bankCode: text           // Bank's code (e.g., "058" for GTBank)
accountNumber: text      // 10-digit account number
accountName: text        // Account holder name
recipientCode: text      // Paystack recipient code for transfers
```

#### Payouts Table
```typescript
id: varchar (UUID)                    // Primary key
transactionId: varchar (UNIQUE)       // Links to transaction (prevents duplicates)
sellerId: varchar                     // Seller receiving payout
amount: decimal(10,2)                 // Payout amount in Naira
status: text                          // pending | processing | success | failed
paystackTransferCode: text            // Paystack transfer code
paystackReference: text               // Paystack reference for tracking
failureReason: text                   // Error message if failed
createdAt: timestamp                  // When payout was created
updatedAt: timestamp                  // Last status update
```

### Backend Endpoints

#### Bank Account Management
- `GET /api/banks` - List all Nigerian banks
- `POST /api/bank-account/verify` - Verify account number and get account name
- `POST /api/bank-account` - Save bank account after verification
- `GET /api/payouts` - Get seller's payout history

#### Transaction Flow
- `PATCH /api/transactions/:id/status` - When status → "completed":
  1. Checks for existing payout (idempotency)
  2. Verifies seller has bank account configured
  3. Calculates payout amount (price - commission)
  4. Creates payout record
  5. Initiates Paystack transfer
  6. Updates payout status based on result

### Paystack Integration

The system uses Paystack's Transfer API with four key functions:

1. **listBanks()**: Get all Nigerian banks for dropdown
2. **verifyAccountNumber()**: Confirm account details with bank
3. **createTransferRecipient()**: Register seller's bank account with Paystack
4. **initiateTransfer()**: Send money to seller's account

**Reference Format**: `PAYOUT-{payoutId}` (stable, no timestamps)

### Security Features

#### Idempotency (Prevents Duplicate Transfers)
- Database-level unique constraint on `payouts.transactionId`
- Application-level check before initiating transfers
- Skips if payout already exists with "success" or "processing" status

#### Authorization
- All endpoints require authentication
- Bank account endpoints verify user ownership
- Only buyers can mark transactions as "completed"
- Only sellers can view their own payouts

#### Data Protection
- Account numbers masked in UI (shows last 4 digits only)
- Paystack secret key server-side only
- No sensitive data in frontend
- Bank details validated before saving

### Error Handling

#### Failed Payouts
- Payout status marked as "failed"
- Failure reason stored and displayed to seller
- Transaction completion not blocked by payout failure
- Seller can contact support to retry payout

#### Missing Bank Account
- System logs warning if seller hasn't set up bank account
- Transaction still completes successfully
- Seller can add bank account later (manual payout via support)

#### API Errors
- Comprehensive error messages from Paystack
- User-friendly error display in UI
- Toast notifications for all failures
- Console logging for debugging

## Frontend Components

### Settings Page (`client/src/pages/Settings.tsx`)
Complete bank account management interface:
- Bank selection dropdown
- Account number input (10 digits only)
- Verify button with loading state
- Displays verified account name
- Save button (enabled after verification)
- Shows current saved account (masked number)
- Reset button to clear form
- Responsive design

### Payout History Section (`client/src/pages/SellerDashboard.tsx`)
Integrated into Seller Dashboard:
- Card with "Payout History" header
- Info tooltip explaining status meanings
- Table showing all payouts
- Status badges with color coding
- Formatted currency (₦X,XXX.XX)
- Formatted dates
- Clickable Paystack references (copy to clipboard)
- Empty state message
- Loading state with spinner

## Testing the System

### Setup Test Environment
1. Get Paystack test secret key from [Paystack Dashboard](https://dashboard.paystack.com/)
2. Add to environment: `PAYSTACK_SECRET_KEY=sk_test_xxx`
3. Ensure Paystack account has **Transfer** feature enabled

### Test Flow
1. **Create Seller Account**: Sign up as seller
2. **Add Bank Account**: 
   - Go to Settings
   - Use test bank details (Paystack provides test accounts)
   - Verify and save
3. **Create Transaction**: Create test transaction as seller
4. **Buy as Different User**: 
   - Sign up as buyer
   - Accept and pay for transaction
5. **Complete Transaction**:
   - Seller marks asset transferred
   - Buyer releases funds (marks completed)
6. **Verify Payout**:
   - Check Payout History in seller dashboard
   - Verify status is "success"
   - Check Paystack dashboard for transfer

### Test Bank Accounts (Paystack Test Mode)
Paystack provides test bank accounts for development. Check their [documentation](https://paystack.com/docs/transfers/single-transfers/) for test account numbers.

## Future Enhancements

### Recommended Additions
1. **Webhook for Transfer Status**: Consume Paystack transfer webhooks to update payout status automatically
2. **Payout Reconciliation**: Scheduled job to sync payout statuses with Paystack
3. **Retry Failed Payouts**: Admin interface to manually retry failed transfers
4. **Payout Notifications**: Email/SMS when payout completes
5. **Payout Analytics**: Dashboard showing total payouts, success rate, etc.
6. **Bulk Payouts**: Support for processing multiple payouts at once
7. **Payout Schedule**: Option to batch payouts (daily/weekly instead of instant)

## Environment Variables

```bash
# Required for payout system
PAYSTACK_SECRET_KEY=sk_live_xxx    # Production key
# or
PAYSTACK_SECRET_KEY=sk_test_xxx    # Test key for development
```

**Important**: 
- Your Paystack account must have the **Transfer** feature enabled
- Transfers require KYC verification in production
- Test mode works without restrictions

## Support & Troubleshooting

### Common Issues

**"Seller has no bank account configured"**
- Seller needs to add bank account in Settings
- Payout will be skipped (can be processed manually later)

**"Failed to verify account"**
- Check account number is 10 digits
- Verify bank code is correct
- Ensure Paystack API is accessible

**"Transfer initiation failed"**
- Check Paystack account has sufficient balance
- Verify Transfer feature is enabled
- Check account has completed KYC (production)
- Review failure reason in Payout History

**"Account name mismatch"**
- Verified account name must match provided name
- Check for typos in account number
- Contact bank if name doesn't match

### Contact Support
For payout issues, sellers should contact platform support with:
- Transaction ID
- Payout reference number
- Account details (last 4 digits)
- Screenshot of error message

## Conclusion

The automatic payout system provides a seamless, secure, and instant way for sellers to receive their earnings. With comprehensive error handling, idempotency guards, and detailed tracking, the system ensures reliable transfers while maintaining a simple user experience.
