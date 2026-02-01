# Fix Transactions Fetching Flow

## Backend Changes
- [x] Add req.user validation to GET /api/transactions/buyer route
- [x] Ensure consistent { transactions: [] } response shape

## Frontend Changes
- [x] Fix query destructuring in SellerDashboard.tsx
- [x] Add defensive array handling for transactions
- [x] Ensure safe .find()/.map() operations

## Testing
- [x] Test backend endpoint returns correct shape
- [x] Verify frontend handles responses safely
