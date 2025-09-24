# Verification Service Setup Guide

The email and phone verification failures you're experiencing are due to missing service configurations. This guide will help you set up proper email and SMS services.

## Current Issue
The backend currently uses mock verification endpoints that only return success messages without actually sending emails or SMS. To fix this, you need to configure real email and SMS services.

## Quick Fix Configuration

### 1. Email Service Setup (Gmail SMTP)

Add these environment variables to your `.env` file:

```bash
# Email Service Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@linkdao.io

# For Gmail, you need an App Password (not your regular password)
# 1. Enable 2-Factor Authentication on your Gmail account
# 2. Go to Google Account settings → Security → App passwords
# 3. Generate an app password for "Mail"
# 4. Use that password as SMTP_PASS
```

### 2. SMS Service Setup (Twilio)

Add these environment variables to your `.env` file:

```bash
# SMS Service Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# To get Twilio credentials:
# 1. Sign up at https://www.twilio.com
# 2. Get a phone number from the Twilio Console
# 3. Find your Account SID and Auth Token in the Dashboard
```

### 3. Install Required Dependencies

Run this command to install the necessary packages:

```bash
cd app/backend
npm install nodemailer @types/nodemailer twilio
```

### 4. Update Your Backend

Replace the mock verification endpoints in your backend with the new service. Add this to your main server file:

```typescript
import verificationRoutes from './routes/verificationRoutes';
app.use('/api/verification', verificationRoutes);

// Also update the marketplace routes to use the new service:
app.use('/marketplace/seller/verification', verificationRoutes);
```

## Alternative Email Services

### SendGrid (Recommended for Production)
```bash
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
```

### AWS SES
```bash
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
FROM_EMAIL=noreply@yourdomain.com
```

## Testing the Fix

After configuration, you can test the services:

1. **Check Service Status:**
   ```bash
   curl http://localhost:10000/api/verification/status
   ```

2. **Test Email Service:**
   ```bash
   curl http://localhost:10000/api/verification/test-email
   ```

3. **Send Test Email:**
   ```bash
   curl -X POST http://localhost:10000/api/verification/email \
     -H "Content-Type: application/json" \
     -d '{"email":"your-email@gmail.com"}'
   ```

4. **Send Test SMS:**
   ```bash
   curl -X POST http://localhost:10000/api/verification/phone \
     -H "Content-Type: application/json" \
     -d '{"phone":"+1234567890"}'
   ```

## Security Features Included

The new verification service includes:

- **Rate Limiting**: Max 5 attempts per email/phone per hour
- **Code Expiration**: Verification codes expire in 10 minutes
- **Attempt Limits**: Max 3 verification attempts per code
- **Input Validation**: Email and phone format validation
- **Secure Templates**: Professional HTML email templates

## Production Considerations

For production deployment:

1. Use SendGrid or AWS SES instead of Gmail SMTP
2. Set up proper DNS records (SPF, DKIM, DMARC) for email deliverability
3. Use environment variables for all sensitive configuration
4. Monitor email/SMS delivery rates and costs
5. Implement webhook endpoints for delivery confirmations

## Troubleshooting

If you still see "Failed to send verification email/SMS":

1. **Check Environment Variables**: Ensure all required variables are set
2. **Verify Service Status**: Use the `/api/verification/status` endpoint
3. **Check Logs**: Look for error messages in your backend logs
4. **Test Service Connections**: Use the test endpoints in development
5. **Check Rate Limits**: You might be hitting rate limits

## Immediate Solution for Development

For quick testing, you can use these free tier options:

1. **Gmail SMTP**: Free for low volume (use your personal Gmail with app password)
2. **Twilio Trial**: $15 free credit for testing SMS
3. **SendGrid**: 100 emails/day free tier

Once configured, your verification system will work properly with real email and SMS delivery.