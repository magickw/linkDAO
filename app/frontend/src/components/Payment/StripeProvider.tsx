/**
 * Stripe Provider - Wraps the application with Stripe Elements
 */

import React, { ReactNode } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { STRIPE_PUBLISHABLE_KEY, validateStripeConfig } from '@/config/stripe';

// Initialize Stripe outside of component to avoid recreating on every render
let stripePromise: Promise<Stripe | null> | null = null;

const getStripe = () => {
  if (!stripePromise) {
    // Validate configuration
    const validation = validateStripeConfig();
    if (!validation.isValid) {
      console.error('Stripe configuration errors:', validation.errors);
      // Return null promise instead of throwing to prevent app crash
      return Promise.resolve(null);
    }

    // Wrap Stripe loading in try-catch to handle potential extension interference
    try {
      stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      return Promise.resolve(null);
    }
  }
  return stripePromise;
};

interface StripeProviderProps {
  children: ReactNode;
  /**
   * Optional Stripe Elements options
   * Can be used to customize appearance, fonts, etc.
   */
  options?: StripeElementsOptions;
}

/**
 * StripeProvider component
 *
 * Wraps children with Stripe Elements provider
 * Must be placed above any components that use Stripe Elements
 *
 * @example
 * ```tsx
 * <StripeProvider>
 *   <CheckoutPage />
 * </StripeProvider>
 * ```
 */
export const StripeProvider: React.FC<StripeProviderProps> = ({
  children,
  options = {}
}) => {
  const stripe = getStripe();

  // Default appearance options for Stripe Elements
  const defaultOptions: StripeElementsOptions = {
    appearance: {
      theme: 'night', // Matches dark theme of app
      variables: {
        colorPrimary: '#3B82F6', // Blue-500
        colorBackground: '#1F2937', // Gray-800
        colorText: '#FFFFFF',
        colorDanger: '#EF4444', // Red-500
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
      rules: {
        '.Input': {
          backgroundColor: '#374151', // Gray-700
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '12px',
        },
        '.Input:focus': {
          border: '1px solid #3B82F6',
          boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
        },
        '.Label': {
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '14px',
          marginBottom: '8px',
        },
      }
    },
    ...options,
  };

  return (
    <Elements stripe={stripe} options={defaultOptions}>
      {children}
    </Elements>
  );
};

/**
 * Hook to check if Stripe is properly configured
 * Useful for conditional rendering or error handling
 */
export const useStripeConfigured = (): boolean => {
  const validation = validateStripeConfig();
  return validation.isValid;
};

export default StripeProvider;
