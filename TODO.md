# Paystack Payout System Update

## Backend Changes
- [x] Update commission calculation in server/paystack.ts (10% total commission)
- [x] Remove subaccount logic from server/paystack.ts
- [x] Update bank account creation in server/routes.ts to use transfer recipients
- [x] Update payout logic in server/routes.ts for direct transfers
- [x] Update schema in shared/schema.ts (remove paystackSubaccountCode)

## UI Changes
- [ ] Update Settings page to display/edit bank accounts
- [ ] Add validation for required bank accounts
- [ ] Update onboarding for company accounts

## Testing
- [ ] Test payment initialization with new commission calculation
- [ ] Test bank account setup and transfer initiation
- [ ] Test payout flow end-to-end
- [ ] Update database schema migration
