import React, { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Button } from '@/design-system/components/Button';
import { LoadingState } from './LoadingStates';
import { AlertCircle, CheckCircle, CreditCard } from 'lucide-react';

interface StripeSetupFormProps {
  clientSecret: string;
  onSuccess: (setupIntentId: string, paymentMethodId: string) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

export const StripeSetupForm: React.FC<StripeSetupFormProps> = ({
  clientSecret,
  onSuccess,
  onError,
  onCancel
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/setup-complete`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Setup failed');
        onError?.(new Error(error.message));
      } else if (setupIntent && setupIntent.status === 'succeeded') {
        // Setup succeeded
        if (typeof setupIntent.payment_method === 'string') {
            onSuccess(setupIntent.id, setupIntent.payment_method);
        } else {
             // Handle case where payment_method is an object (expanded)
             onSuccess(setupIntent.id, setupIntent.payment_method?.id || '');
        }
      } else {
        setErrorMessage('Setup status: ' + setupIntent?.status);
      }
    } catch (err) {
      console.error('Setup error:', err);
      setErrorMessage('An unexpected error occurred.');
      onError?.(err as Error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative">
      {isProcessing && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center">
          <LoadingState
            message="Saving payment method..."
            progress={50}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className={`space-y-6 ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="rounded-md overflow-hidden">
            <PaymentElement />
          </div>
        </div>

        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-red-400">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <p className="text-xs text-white/70">
            🔒 Your card details are securely saved with Stripe for future use.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!stripe || isProcessing}
            className="flex-1"
          >
            {isProcessing ? 'Saving...' : 'Save Card'}
          </Button>
        </div>
      </form>
    </div>
  );
};
