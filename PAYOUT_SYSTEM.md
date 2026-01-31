# Korapay Integration Instructions

1. Ensure your project has environment variables configured.

2. Add to environment:
KORAPAY_PUBLIC_KEY=<your_korapay_public_key>
KORAPAY_SECRET_KEY=<your_korapay_secret_key>   # Live key for production
KORAPAY_WEBHOOK_SECRET=<your_korapay_webhook_secret>

3. Ensure Korapay account has **Collections** and **Transfers/Disbursement** features enabled

4. Configure webhook URL in Korapay dashboard: https://yourdomain.com/api/korapay/webhook

5. Payment flow:
   - Buyer pays baseAmount + 5% service fee
   - Gateway charges deducted from service fee
   - Seller receives 100% of baseAmount immediately after payment confirmation

6. Payouts are processed immediately via Korapay Transfers API

