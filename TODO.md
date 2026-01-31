# Korapay Integration Implementation Plan

## Information Gathered
- Current Paystack integration in `server/paystack.ts`, `server/routes.ts`, `server/payout.ts`, `server/transfer_new.ts`
- Database schema in `shared/schema.ts` with transactions and payouts collections
- Payment flow: buyer pays baseAmount + 5% service fee, seller gets baseAmount, platform keeps service fee minus gateway charges
- Webhook handling for payment confirmation and transfer status updates
- Admin dashboard exists but needs enhancement for Korapay stats and manual retry

## Plan

### 1. Create Korapay Service (`server/services/korapay.ts`)
- Implement `initializePayment()` using Korapay Collections API
- Implement `verifyWebhook()` for webhook signature validation
- Implement `transferToSeller()` using Korapay Transfers/Disbursement API
- Handle idempotent payouts to prevent double transfers
- Include retry logic for failed transfers

### 2. Create Payment Routes (`server/routes/payments.ts`)
- POST /api/payments/initialize: Calculate totalAmount, call Korapay charge API, save transaction with status="pending"
- Replace existing Paystack payment initialization in `server/routes.ts`

### 3. Create Webhook Routes (`server/routes/webhook.ts`)
- POST /api/korapay/webhook: Verify signature, handle payment success, trigger immediate payout
- Update transaction status to "paid" on successful payment
- Call payout function immediately after payment confirmation

### 4. Create Admin Routes (`server/routes/admin.ts`)
- GET /admin/login: Admin login page
- GET /admin/dashboard: Dashboard with revenue stats, service fees, payouts, transaction table, payout logs
- POST /admin/payouts/retry: Manual retry for failed payouts

### 5. Update Main Routes (`server/routes.ts`)
- Remove Paystack payment routes
- Add Korapay routes
- Update webhook endpoint to use Korapay

### 6. Update Payout Logic (`server/payout.ts`)
- Modify to use Korapay transfer API instead of Paystack
- Ensure only baseAmount is sent to seller
- Update balance checking for Korapay fees

### 7. Environment Variables
- Add KORAPAY_PUBLIC_KEY, KORAPAY_SECRET_KEY, KORAPAY_WEBHOOK_SECRET
- Remove Paystack keys (but keep for now if needed)

### 8. Admin Dashboard Frontend
- Create /admin/login page
- Enhance /admin/dashboard with Korapay-specific stats
- Add manual payout retry button

### 9. Database Updates (if needed)
- Reuse existing schema, map korapayReference to paystackReference field
- Ensure payoutStatus tracks immediate payouts

## Dependent Files to be edited
- `server/paystack.ts` (remove or keep as backup)
- `server/routes.ts` (update payment and webhook routes)
- `server/payout.ts` (update transfer logic)
- `server/transfer_new.ts` (replace with Korapay transfer logic)
- `client/src/pages/AdminDashboard.tsx` (enhance with new stats)
- `.env` or environment files (add Korapay keys)

## Followup steps
- Test payment initialization with Korapay sandbox
- Test webhook handling
- Test immediate payouts
- Test admin dashboard functionality
- Update documentation

## Current Status
- [ ] Create korapay service
- [ ] Create payment routes
- [ ] Create webhook routes
- [ ] Create admin routes
- [ ] Update main routes
- [ ] Update payout logic
- [ ] Update environment variables
- [ ] Update admin dashboard frontend
- [ ] Test integration
