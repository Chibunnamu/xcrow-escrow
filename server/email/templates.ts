
export const getWelcomeEmailTemplate = (name: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Welcome to Xcrow!</h2>
    </div>
    <p>Hello ${name},</p>
    <p>Thank you for creating an account with Xcrow. We're excited to have you on board.</p>
    <p>With Xcrow, you can securely buy and sell with confidence.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://xcrowpay.com/dashboard" class="button">Go to Dashboard</a>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Xcrow. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

export const getLoginAlertTemplate = (name: string, time: string, ip: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; color: #333; }
    .container { max-width: 600px; margin: auto; padding: 20px; }
    .alert { background-color: #f8f9fa; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h2>New Login Detected</h2>
    <p>Hello ${name},</p>
    <p>We noticed a new login to your Xcrow account.</p>
    <div class="alert">
      <p><strong>Time:</strong> ${time}</p>
      <p><strong>IP Address:</strong> ${ip}</p>
    </div>
    <p>If this was you, you can ignore this email. If you don't recognize this activity, please contact support immediately.</p>
  </div>
</body>
</html>
`;

export const getTransactionCreatedTemplate = (sellerName: string, itemName: string, price: string, link: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; color: #333; }
    .container { max-width: 600px; margin: auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Transaction Created</h2>
    <p>Hello,</p>
    <p>A new transaction has been created by <strong>${sellerName}</strong>.</p>
    <ul>
      <li><strong>Item:</strong> ${itemName}</li>
      <li><strong>Price:</strong> ₦${price}</li>
    </ul>
    <p>To proceed, please click the button below to view and accept the transaction:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${link}" class="button">View Transaction</a>
    </div>
  </div>
</body>
</html>
`;

export const getPaymentMadeTemplate = (recipientName: string, payerName: string, amount: string, itemName: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; color: #333; }
    .container { max-width: 600px; margin: auto; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Payment Received</h2>
    <p>Hello ${recipientName},</p>
    <p>Good news! <strong>${payerName}</strong> has made a payment of <strong>₦${amount}</strong> for <strong>${itemName}</strong>.</p>
    <p>The funds are now securely held in escrow. Please proceed with delivering the item or service.</p>
    <p>Once the buyer confirms receipt, the funds will be released to you.</p>
  </div>
</body>
</html>
`;

export const getPayoutCompletedTemplate = (name: string, amount: string, itemName: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; color: #333; }
    .container { max-width: 600px; margin: auto; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Payout Completed</h2>
    <p>Hello ${name},</p>
    <p>Your payout of <strong>₦${amount}</strong> for the transaction <strong>${itemName}</strong> has been successfully processed.</p>
    <p>The funds should reflect in your bank account shortly.</p>
    <p>Thank you for using Xcrow!</p>
  </div>
</body>
</html>
`;
