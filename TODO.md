# Paystack Payout and Commission Logic Implementation

## Completed Tasks
- [ ] Analyze current codebase and create implementation plan
- [ ] Get user approval for plan

## In Progress
- [ ] Update schema.ts: Remove paystackSubaccountCode, change settlementType default
- [ ] Update paystack.ts: Remove subaccount functions, update commission calculation
- [ ] Update transfer.ts: Ensure proper transfer recipient creation and bulk transfer support
- [ ] Update routes.ts: Change bank account setup to use transfer recipients
- [ ] Update routes.ts: Update payout logic to use transfers API properly
- [ ] Update routes.ts: Add validations for bank accounts and duplicate transfers
- [ ] Update UI components: Add bank account display/edit in settings
- [ ] Update UI components: Add notifications for missing accounts
- [ ] Add logging and safety measures: Log all transfer attempts, prevent duplicates

## Testing and Validation
- [ ] Test commission calculations (10% pool model)
- [ ] Verify transfer API integration
- [ ] Update client UI for bank account management
- [ ] Test payout flow end-to-end
- [ ] Test bulk transfers functionality
