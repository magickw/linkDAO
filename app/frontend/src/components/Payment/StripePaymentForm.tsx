/**
 * Stripe Payment Form - Card payment form using Stripe Elements
 */

import React, { useState, useEffect } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { StripePaymentElementOptions } from '@stripe/stripe-js';
import { Button } from '@/design-system/components/Button';
import { LoadingState } from './LoadingStates';
import { PaymentErrorMessages } from '@/services/paymentErrorMessages';
import { AlertCircle, CheckCircle, CreditCard } from 'lucide-react';

interface StripePaymentFormProps {
  /**
   * Client secret from payment intent (created server-side)
   */
  clientSecret: string;

  /**
   * Amount to display (in dollars)
   */
  amount: number;

  /**
   * Currency (USD, EUR, etc.)
   */
  currency?: string;

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

  /**
   * Additional metadata to attach to payment
   */
  metadata?: Record<string, string>;
}

export const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  clientSecret,
  amount,
  currency = 'USD',
  onSuccess,
  onError,
  onCancel,
  metadata = {}
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);

  // Payment Element options
  const paymentElementOptions: StripePaymentElementOptions = {
    layout: 'tabs',
    // Enable specific payment methods
    // Stripe will automatically show available methods based on currency and amount
    wallets: {
      applePay: 'auto',
      googlePay: 'auto',
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't loaded yet
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // Return URL after 3D Secure authentication
          return_url: `${window.location.origin}/payment/confirm`,
          payment_method_data: {
            // Attach metadata
            metadata: metadata,
          },
        },
        // Prevent redirect for successful payments without 3DS
        redirect: 'if_required',
      });

      if (error) {
        // Payment failed
        const friendlyError = PaymentErrorMessages.getUserFriendlyError(
          new Error(error.message || 'Payment failed')
        );
        setPaymentError(friendlyError.message);

        if (onError) {
          onError(new Error(error.message || 'Payment failed'));
        }
      } else if (paymentIntent) {
        // Payment succeeded
        if (paymentIntent.status === 'succeeded') {
          setPaymentSucceeded(true);
          onSuccess(paymentIntent.id);
        } else if (paymentIntent.status === 'processing') {
          // Payment is being processed (e.g., bank transfer)
          setPaymentSucceeded(true);
          onSuccess(paymentIntent.id);
        } else if (paymentIntent.status === 'requires_action') {
          // 3D Secure or other action required
          // Stripe will handle this automatically with redirect
          console.log('Additional action required');
        } else {
          setPaymentError('Payment status: ' + paymentIntent.status);
        }
      }
    } catch (err) {
      const error = err as Error;
      const friendlyError = PaymentErrorMessages.getUserFriendlyError(error);
      setPaymentError(friendlyError.message);

      if (onError) {
        onError(error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Show success state
  if (paymentSucceeded) {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-4">
          <CheckCircle className="text-green-400" size={48} />
          <div>
            <h3 className="text-xl font-semibold text-white mb-1">
              Payment Successful!
            </h3>
            <p className="text-sm text-white/60">
              Your payment of {currency} {amount.toFixed(2)} has been processed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show processing state
  if (isProcessing) {
    return (
      <LoadingState
        message="Processing payment..."
        submessage="Please do not close this window. This may take a few moments."
        progress={50}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Amount Display */}
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="text-blue-400" size={24} />
            <span className="text-white/70">Total Amount:</span>
          </div>
          <span className="text-2xl font-bold text-white">
            {currency} {amount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <PaymentElement options={paymentElementOptions} />
      </div>

      {/* Error Display */}
      {paymentError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-sm font-semibold text-red-400 mb-1">
                Payment Failed
              </h4>
              <p className="text-xs text-white/70">{paymentError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
        <p className="text-xs text-white/70">
          🔒 Your payment information is encrypted and secure. We use Stripe for payment processing
          and never store your card details.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={!stripe || isProcessing}
          className="flex-1"
        >
          {isProcessing ? 'Processing...' : `Pay ${currency} ${amount.toFixed(2)}`}
        </Button>
      </div>

      {/* 3D Secure Notice */}
      <div className="text-center">
        <p className="text-xs text-white/50">
          You may be asked to verify your payment with your bank (3D Secure)
        </p>
      </div>
    </form>
  );
};

/**
 * Wrapper component that includes the StripeProvider
 * Use this if you need a standalone payment form
 */
interface StandaloneStripePaymentFormProps extends StripePaymentFormProps {
  // All props from StripePaymentFormProps
}

export const StandaloneStripePaymentForm: React.FC<StandaloneStripePaymentFormProps> = (props) => {
  return (
    <StripePaymentForm {...props} />
  );
};
