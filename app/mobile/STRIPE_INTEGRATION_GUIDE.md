# Stripe Payment Sheet Integration Guide for LinkDAO Mobile

## Overview

This guide explains how to integrate native Stripe Payment Sheet functionality into the LinkDAO mobile app for secure, SCA-compliant credit card payments.

## Current Status

The current `CheckoutScreen.tsx` implementation uses a **mock** approach for Stripe payments. To enable production-ready Stripe payments with native Payment Sheet, follow the steps below.

## Prerequisites

1. **Stripe Account**: You need a Stripe account with API keys
2. **React Native Environment**: Ensure your React Native environment is properly set up
3. **Backend API**: Your backend must support Stripe PaymentIntent creation

## Installation Steps

### 1. Install Stripe React Native Dependencies

```bash
cd app/mobile
npm install @stripe/stripe-react-native
cd ios && pod install && cd ..
```

### 2. Update app.json for Android

Add the following to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "@stripe/stripe-react-native",
        {
          "androidPackage": "com.stripe.android.paymentsheet"
        }
      ]
    ]
  }
}
```

### 3. Configure Environment Variables

Add Stripe keys to your environment configuration:

```env
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
API_BASE_URL=https://api.yourdomain.com
```

## Implementation Steps

### Step 1: Create Stripe Service

Create `src/services/stripeService.ts`:

```typescript
import { StripeProvider } from '@stripe/stripe-react-native';
import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';

interface StripeServiceConfig {
  publishableKey: string;
  merchantDisplayName: string;
}

class StripeService {
  private static instance: StripeService;
  private config: StripeServiceConfig;
  private initialized: boolean = false;

  private constructor() {
    this.config = {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      merchantDisplayName: 'LinkDAO Marketplace',
    };
  }

  public static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  public isConfigured(): boolean {
    return !!this.config.publishableKey && this.config.publishableKey.startsWith('pk_');
  }

  public getConfig(): StripeServiceConfig {
    return this.config;
  }

  public setConfig(config: Partial<StripeServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export default StripeService;

// Stripe Provider Component
export function StripeAppProvider({ children }: { children: React.ReactNode }) {
  const stripeService = StripeService.getInstance();
  const [publishableKey, setPublishableKey] = useState<string>('');

  useEffect(() => {
    const config = stripeService.getConfig();
    setPublishableKey(config.publishableKey);
  }, []);

  if (!publishableKey) {
    console.warn('Stripe publishable key not configured');
    return <>{children}</>;
  }

  return (
    <StripeProvider
      publishableKey={publishableKey}
      merchantIdentifier="merchant.linkdao.marketplace"
      urlScheme="linkdao"
    >
      {children}
    </StripeProvider>
  );
}
```

### Step 2: Update CheckoutScreen with Native Stripe

Replace the mock `processStripePayment` function in `CheckoutScreen.tsx` with this implementation:

```typescript
import { useStripe, useConfirmPayment } from '@stripe/stripe-react-native';

// In CheckoutScreen component:
const { confirmPayment } = useConfirmPayment();

const processStripePayment = async () => {
  // Validate shipping address
  if (!shippingAddress.fullName || !shippingAddress.addressLine1 || 
      !shippingAddress.city || !shippingAddress.postalCode) {
    Alert.alert('Error', 'Please complete all shipping address fields');
    return;
  }

  setLoading(true);
  try {
    // Step 1: Create PaymentIntent on backend
    const response = await fetch(`${API_BASE_URL}/api/payments/create-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`, // Add auth token if needed
      },
      body: JSON.stringify({
        amount: Math.round(total * 100), // Convert to cents
        currency: 'usd',
        items: items,
        shippingAddress,
        sellerId,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to create payment intent');
    }

    // Step 2: Confirm payment using Stripe Payment Sheet
    const { error, paymentIntent } = await confirmPayment(data.clientSecret, {
      paymentMethodType: 'Card',
      billingDetails: {
        name: shippingAddress.fullName,
        address: {
          city: shippingAddress.city,
          country: shippingAddress.country,
          line1: shippingAddress.addressLine1,
          line2: shippingAddress.addressLine2,
          postalCode: shippingAddress.postalCode,
          state: shippingAddress.state,
        },
      },
    });

    if (error) {
      console.error('Stripe payment error:', error);
      throw new Error(error.message || 'Payment failed');
    }

    if (paymentIntent?.status === 'Succeeded') {
      Alert.alert(
        'Payment Successful',
        'Your order has been placed successfully!',
        [{ text: 'OK', onPress: () => navigation.navigate('Home' as never) }]
      );
    } else {
      throw new Error('Payment was not successful');
    }
  } catch (error) {
    console.error('Payment processing error:', error);
    Alert.alert(
      'Payment Failed',
      error instanceof Error ? error.message : 'There was an error processing your payment'
    );
  } finally {
    setLoading(false);
  }
};
```

### Step 3: Update Backend to Support Mobile Stripe

Ensure your backend endpoint `/api/payments/create-intent` returns the correct format:

```typescript
// Backend endpoint (app/backend/src/routes/mobilePaymentRoutes.ts)
router.post('/create-intent', authenticateToken, csrfProtection, async (req, res) => {
  try {
    const { amount, currency, items, shippingAddress, sellerId } = req.body;

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: generateOrderId(),
        sellerId,
        items: JSON.stringify(items),
        shippingAddress: JSON.stringify(shippingAddress),
      },
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('PaymentIntent creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment intent',
    });
  }
});
```

### Step 4: Update App.tsx to Wrap with Stripe Provider

```typescript
import { StripeAppProvider } from './services/stripeService';

export default function App() {
  return (
    <StripeAppProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          {/* Your existing navigation */}
        </NavigationContainer>
      </SafeAreaProvider>
    </StripeAppProvider>
  );
}
```

### Step 5: Update Navigation to Include Checkout Screen

```typescript
// In App.tsx
export type RootStackParamList = {
  Home: undefined;
  Profile: undefined;
  Wallet: undefined;
  Governance: undefined;
  Checkout: {
    items: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
      image?: string;
    }>;
    total: number;
    sellerId: string;
  };
  // ... other routes
};

// Add Checkout screen to navigator
<Stack.Screen 
  name="Checkout" 
  component={CheckoutScreen} 
  options={{ title: 'Checkout' }} 
/>
```

## Testing

### Test Mode

1. Use Stripe test keys (`pk_test_` and `sk_test_`)
2. Use Stripe test card numbers:
   - Success: `4242 4242 4242 4242`
   - Requires 3D Secure: `4000 0025 0000 3155`
   - Declined: `4000 0000 0000 0002`

### Production Mode

1. Switch to live keys (`pk_live_` and `sk_live_`)
2. Test with real cards in small amounts
3. Verify webhook events are received

## Security Considerations

1. **Never store card data**: Stripe handles all card data securely
2. **Use HTTPS**: All API calls must be over HTTPS
3. **Validate amounts**: Always validate amounts on the backend
4. **Webhook verification**: Verify Stripe webhook signatures
5. **Error handling**: Handle all Stripe errors gracefully

## Troubleshooting

### Common Issues

1. **"No publishable key provided"**
   - Ensure `STRIPE_PUBLISHABLE_KEY` is set in environment
   - Check that the key starts with `pk_`

2. **"Payment failed"**
   - Check backend logs for PaymentIntent creation errors
   - Verify Stripe account is activated
   - Check webhook endpoint is accessible

3. **3D Secure not working**
   - Ensure you're using test card `4000 0025 0000 3155`
   - Check that your Stripe account supports 3D Secure
   - Verify return URL is configured in Stripe Dashboard

## Next Steps

1. **Install dependencies**: Run the installation commands above
2. **Configure environment**: Add Stripe keys to your environment
3. **Update CheckoutScreen**: Replace mock implementation with native Stripe
4. **Test thoroughly**: Test with both test and production cards
5. **Monitor webhooks**: Set up Stripe webhook monitoring

## Additional Resources

- [Stripe React Native Documentation](https://stripe.com/docs/stripe-react-native)
- [Payment Sheet Guide](https://stripe.com/docs/stripe-react-native/payment-sheet)
- [Stripe Test Cards](https://stripe.com/docs/testing)

## Support

For issues or questions:
- Check Stripe documentation
- Review backend logs
- Test with Stripe dashboard payment events