/**
 * Stripe Checkout Component
 *
 * Complete Stripe checkout flow integrating all components:
 * - Payment intent creation
 * - Stripe Elements form
 * - 3D Secure authentication
 * - Success/error handling
 */

import React, { useState, useEffect } from 'react';
import { StripeProvider } from './StripeProvider';
import { StripePaymentForm } from './StripePaymentForm';
import { LoadingState } from './LoadingStates';
import { AlertCircle } from 'lucide-react';

interface StripeCheckoutProps {
  /**
   * Amount to charge (in dollars)
   */
  amount: number;

  /**
   * Currency code (USD, EUR, etc.)
   */
  currency?: string;

  /**
   * Order ID for tracking
   */
  orderId: string;

  /**
   * User's wallet address (required for identification)
   */
  userAddress?: string;

  /**
   * Optional Stripe customer ID
   * If provided, payment method can be saved for future use
   */
  customerId?: string;

  /**
   * Save payment method for future purchases
   */
  savePaymentMethod?: boolean;

  /**
   * Additional metadata to attach to payment
   */
  metadata?: Record<string, string>;

  /**
   * Callback when payment succeeds
   */
  onSuccess: (paymentIntentId: string) => void;

  /**
   * Callback when payment fails
   */
  onError?: (error: Error) => void;

  /**
   * Callback when user cancels
   */
  onCancel?: () => void;
}

export const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  amount,
  currency = 'USD',
  orderId,
  userAddress,
  customerId,
  savePaymentMethod = false,
  metadata = {},
  onSuccess,
  onError,
  onCancel
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create payment intent when component mounts
  useEffect(() => {
    createPaymentIntent();
  }, [amount, currency, orderId]);

  const createPaymentIntent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          userAddress: userAddress || '0x0000000000000000000000000000000000000000',
          currency: currency.toLowerCase(),
          orderId,
          customerId,
          savePaymentMethod,
          metadata,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment intent');
      }

      setClientSecret(data.clientSecret);
    } catch (err) {
      const error = err as Error;
      console.error('Error creating payment intent:', error);
      setError(error.message);

      if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    createPaymentIntent();
  };

  // Show loading state while creating payment intent
  if (isLoading) {
    return (
      <LoadingState
        message="Preparing payment..."
        submessage="Setting up secure payment form"
        progress={50}
      />
    );
  }

  // Show error state if payment intent creation failed
  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={24} />
          <div>
            <h3 className="text-lg font-semibold text-red-400 mb-1">
              Payment Setup Failed
            </h3>
            <p className="text-sm text-white/70">{error}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  // Show payment form once client secret is available
  if (!clientSecret) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-6">
        <p className="text-white/70">Unable to initialize payment</p>
      </div>
    );
  }

  return (
    <StripeProvider
      options={{
        clientSecret,
      }}
    >
      <StripePaymentForm
        clientSecret={clientSecret}
        amount={amount}
        currency={currency}
        onSuccess={onSuccess}
        onError={onError}
        onCancel={onCancel}
        metadata={metadata}
      />
    </StripeProvider>
  );
};

/**
 * Example usage:
 *
 * ```tsx
 * <StripeCheckout
 *   amount={99.99}
 *   currency="USD"
 *   orderId="order_123"
 *   onSuccess={(paymentIntentId) => {
 *     console.log('Payment successful!', paymentIntentId);
 *     router.push('/order/success');
 *   }}
 *   onError={(error) => {
 *     console.error('Payment failed:', error);
 *   }}
 *   onCancel={() => {
 *     router.push('/cart');
 *   }}
 * />
 * ```
 */
