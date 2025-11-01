# Stripe Payment Integration - Implementation Guide

## Overview

This guide covers the complete Stripe payment integration for fiat currency payments in the LinkDAO marketplace. The integration supports:

- **Credit/Debit Card Payments** via Stripe
- **3D Secure (SCA)** authentication for EU compliance
- **Saved Payment Methods** for returning customers
- **Webhooks** for async payment confirmation
- **Multi-Currency Support** (USD, EUR, GBP, etc.)
- **Professional UX** with loading states and error handling

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Stripe Dashboard Configuration](#stripe-dashboard-configuration)
4. [Local Development](#local-development)
5. [Using the Components](#using-the-components)
6. [Testing](#testing)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts

1. **Stripe Account** - [Sign up at stripe.com](https://dashboard.stripe.com/register)
2. **Stripe Test Mode** enabled (for development)

### Required Packages

All packages are already installed:
- `stripe` - Server-side Stripe SDK
- `@stripe/stripe-js` - Client-side Stripe SDK
- `@stripe/react-stripe-js` - Stripe React components
- `micro` - Webhook body parsing

---

## Environment Setup

### 1. Get Your Stripe API Keys

1. Log into [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **API keys**
3. Copy your keys:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

### 2. Get Your Webhook Signing Secret

1. Navigate to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for (or select **All events** for simplicity)
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

### 3. Configure Environment Variables

Create or update your `.env.local` file:

```bash
# Stripe Configuration
# Get these from: https://dashboard.stripe.com/test/apikeys

# Publishable Key (safe for client-side, starts with pk_)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Secret Key (SERVER SIDE ONLY, starts with sk_)
STRIPE_SECRET_KEY=sk_test_51XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Webhook Signing Secret (starts with whsec_)
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**⚠️ IMPORTANT SECURITY NOTES:**
- **NEVER** commit `.env.local` to git
- **NEVER** expose `STRIPE_SECRET_KEY` to the client
- Only `NEXT_PUBLIC_*` variables are safe for the browser
- Keep your webhook secret secure

---

## Stripe Dashboard Configuration

### 1. Enable Payment Methods

1. Go to **Settings** → **Payment methods**
2. Enable the payment methods you want to support:
   - ✅ Card (Visa, Mastercard, Amex, etc.)
   - ✅ Link (Stripe's 1-click checkout)
   - Optional: Apple Pay, Google Pay, ACH, etc.

### 2. Configure 3D Secure

1. Go to **Settings** → **Radar** → **Rules**
2. Enable **3D Secure** for enhanced security
3. Set to **Automatic** to comply with SCA requirements

### 3. Set Up Webhooks (Production)

For development, you'll use Stripe CLI. For production:

1. **Developers** → **Webhooks** → **Add endpoint**
2. URL: `https://yourdomain.com/api/stripe/webhook`
3. Events to select:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.processing`
   - `payment_intent.canceled`
   - `payment_intent.requires_action`
   - `charge.refunded`
   - `charge.dispute.created`

---

## Local Development

### 1. Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Linux
# Download from: https://github.com/stripe/stripe-cli/releases
```

### 2. Login to Stripe CLI

```bash
stripe login
```

This will open your browser to authenticate.

### 3. Forward Webhooks to Local

In a separate terminal, run:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will:
- Display your webhook signing secret (starts with `whsec_`)
- Forward Stripe events to your local server

**Copy the webhook signing secret** and add it to `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 4. Start Your Development Server

```bash
npm run dev
```

Your app is now ready to accept Stripe payments locally!

---

## Using the Components

### Simple Checkout (Recommended)

The easiest way to integrate Stripe checkout:

```tsx
import { StripeCheckout } from '@/components/Payment';

function CheckoutPage() {
  return (
    <StripeCheckout
      amount={99.99}
      currency="USD"
      orderId="order_123456"
      onSuccess={(paymentIntentId) => {
        console.log('Payment successful!', paymentIntentId);
        router.push('/order/success');
      }}
      onError={(error) => {
        console.error('Payment failed:', error);
      }}
      onCancel={() => {
        router.push('/cart');
      }}
    />
  );
}
```

### Advanced: Custom Integration

If you need more control:

```tsx
import {
  StripeProvider,
  StripePaymentForm
} from '@/components/Payment';

function CustomCheckout() {
  const [clientSecret, setClientSecret] = useState<string>('');

  useEffect(() => {
    // Create payment intent
    fetch('/api/stripe/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 99.99,
        currency: 'usd',
        orderId: 'order_123'
      })
    })
      .then(res => res.json())
      .then(data => setClientSecret(data.clientSecret));
  }, []);

  if (!clientSecret) return <LoadingState />;

  return (
    <StripeProvider options={{ clientSecret }}>
      <StripePaymentForm
        clientSecret={clientSecret}
        amount={99.99}
        currency="USD"
        onSuccess={(paymentIntentId) => {
          console.log('Success!', paymentIntentId);
        }}
      />
    </StripeProvider>
  );
}
```

### Saving Payment Methods

To save a customer's payment method for future purchases:

```tsx
<StripeCheckout
  amount={99.99}
  orderId="order_123"
  customerId="cus_XXXXXXXXXX"  // Stripe customer ID
  savePaymentMethod={true}      // Save card for future
  onSuccess={handleSuccess}
/>
```

**Note**: You need to create a Stripe Customer first:

```tsx
// API route to create customer
const customer = await stripe.customers.create({
  email: user.email,
  name: user.name,
  metadata: {
    userId: user.id
  }
});
```

---

## Testing

### Test Card Numbers

Stripe provides test cards for different scenarios:

| Card Number | Scenario |
|------------|----------|
| `4242 4242 4242 4242` | Success |
| `4000 0025 0000 3155` | Requires 3D Secure |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0000 0000 0002` | Declined (generic) |
| `4000 0000 0000 0069` | Expired card |

**Any future expiry date and any 3-digit CVC will work.**

### Testing 3D Secure

1. Use card: `4000 0025 0000 3155`
2. Enter any future expiry and CVC
3. Click "Pay"
4. You'll see a 3D Secure modal
5. Click "Complete" or "Fail" to test different outcomes

### Testing Webhooks Locally

1. Make sure `stripe listen` is running
2. Make a test payment
3. Check the Stripe CLI terminal for webhook events
4. Verify your webhook handler logs

---

## Production Deployment

### 1. Update Environment Variables

In your production environment (Vercel, AWS, etc.), set:

```bash
# Use LIVE keys (not test keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXXXXXX
STRIPE_SECRET_KEY=sk_live_XXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXX  # From production webhook
```

### 2. Configure Production Webhook

1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Switch to **Live mode** (toggle in top-right)
3. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
4. Copy the signing secret
5. Add to production environment variables

### 3. Enable Live Mode

1. Complete Stripe account activation
2. Submit business information
3. Verify bank account
4. Switch to Live mode in dashboard

### 4. Test Production

1. Use a **real card** (your own)
2. Test a small transaction ($0.50)
3. Verify webhook events arrive
4. Check payment appears in Stripe Dashboard
5. Test refund functionality

### 5. Monitor

Set up monitoring for:
- Failed payments
- Webhook failures
- Dispute/chargeback alerts
- Unusual transaction patterns

---

## API Reference

### Create Payment Intent

**Endpoint**: `POST /api/stripe/create-payment-intent`

**Request Body**:
```json
{
  "amount": 99.99,
  "currency": "usd",
  "orderId": "order_123",
  "customerId": "cus_XXX",  // optional
  "savePaymentMethod": true, // optional
  "metadata": {              // optional
    "productId": "prod_123"
  }
}
```

**Response**:
```json
{
  "clientSecret": "pi_XXX_secret_YYY",
  "paymentIntentId": "pi_XXXXXXXXXX",
  "amount": 9999,
  "currency": "usd"
}
```

### Get Payment Status

**Endpoint**: `GET /api/stripe/payment-status?paymentIntentId=pi_XXX`

**Response**:
```json
{
  "id": "pi_XXXXXXXXXX",
  "status": "succeeded",
  "amount": 9999,
  "currency": "usd",
  "paymentMethod": {
    "type": "card",
    "card": {
      "brand": "visa",
      "last4": "4242"
    }
  }
}
```

---

## Troubleshooting

### "Missing stripe-signature header"

**Problem**: Webhook endpoint not receiving proper Stripe signature

**Solutions**:
- Verify webhook endpoint is correctly configured in Stripe Dashboard
- Check that endpoint URL is publicly accessible
- Ensure you're using the correct webhook secret

### "Invalid signature"

**Problem**: Webhook signature verification fails

**Solutions**:
- Verify `STRIPE_WEBHOOK_SECRET` matches the one in Stripe Dashboard
- Make sure you're not modifying the request body before verification
- Check that `bodyParser` is disabled in webhook API route

### "Payment requires authentication but authentication is not handled"

**Problem**: 3D Secure not working

**Solutions**:
- Ensure `redirect: 'if_required'` is set in `confirmPayment()`
- Check that return URL is configured correctly
- Verify 3D Secure is enabled in Stripe Dashboard

### "Invalid client secret"

**Problem**: Client secret is malformed or expired

**Solutions**:
- Client secrets expire after 24 hours - create a new one
- Verify payment intent was created successfully
- Check for typos in client secret

### Test Payments Not Working

**Problem**: Test mode payments fail

**Solutions**:
- Verify you're using test API keys (starting with `pk_test_` and `sk_test_`)
- Use official Stripe test card numbers
- Check browser console for errors
- Verify all environment variables are set

### Webhook Not Receiving Events

**Problem**: Production webhooks not firing

**Solutions**:
- Verify endpoint URL is publicly accessible (not localhost)
- Check webhook endpoint in Stripe Dashboard
- Verify correct events are selected
- Test with "Send test webhook" in Dashboard
- Check server logs for errors

---

## Security Best Practices

### ✅ DO:
- Store secret keys in environment variables
- Validate webhook signatures
- Use HTTPS in production
- Implement idempotency for webhooks
- Log all payment events
- Set up fraud detection (Stripe Radar)
- Require 3D Secure for high-value transactions
- Keep Stripe SDK updated

### ❌ DON'T:
- Never commit API keys to version control
- Never expose secret keys to client-side code
- Never skip webhook signature verification
- Never store full card numbers
- Don't trust client-side payment amounts
- Don't process webhooks synchronously

---

## Next Steps

### Recommended Enhancements

1. **Customer Portal**: Let users manage saved payment methods
2. **Subscription Support**: Add recurring billing
3. **Split Payments**: Support marketplace fees and payouts
4. **Receipt Generation**: Email receipts automatically
5. **Refund UI**: Build admin panel for refunds
6. **Analytics**: Track conversion rates and failed payments
7. **Multi-Currency**: Auto-detect customer location and currency

### Integration with Existing Systems

This Stripe integration can work alongside the existing crypto payment system:

```tsx
function UnifiedCheckout() {
  const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'fiat'>('crypto');

  return (
    <div>
      {/* Payment method selector */}
      <PaymentMethodGrid
        methods={[
          { id: 'usdc', type: 'usdc', name: 'USDC' },
          { id: 'card', type: 'card', name: 'Credit Card' }
        ]}
        onSelectMethod={(id) => setPaymentMethod(id === 'card' ? 'fiat' : 'crypto')}
      />

      {/* Show appropriate checkout */}
      {paymentMethod === 'fiat' ? (
        <StripeCheckout {...checkoutProps} />
      ) : (
        <CryptoCheckout {...checkoutProps} />
      )}
    </div>
  );
}
```

---

## Support and Resources

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe API Reference**: https://stripe.com/docs/api
- **Stripe Testing**: https://stripe.com/docs/testing
- **Stripe Security**: https://stripe.com/docs/security
- **Stripe Dashboard**: https://dashboard.stripe.com

---

## Conclusion

Your Stripe integration is now complete! You have:

✅ Secure payment processing
✅ 3D Secure authentication
✅ Webhook handling
✅ Professional UX components
✅ Error handling and retry logic
✅ Test and production configurations

**You're ready to accept fiat payments!** 🎉

For questions or issues, consult the troubleshooting section or contact Stripe support.

---

**Last Updated**: 2025-10-31
**Version**: 1.0.0
**Status**: ✅ Production Ready
