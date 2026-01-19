/**
 * Frontend Checkout Reducer and State Management Tests
 */

import { describe, test, expect } from '@jest/globals';
import {
  checkoutReducer,
  initialCheckoutState,
  canProceedFromStep,
  CheckoutAction,
  CheckoutState
} from '../reducers/checkoutReducer';

describe('Checkout Reducer Tests', () => {
  describe('Navigation Actions', () => {
    test('should set specific step', () => {
      const action: CheckoutAction = { type: 'SET_STEP', payload: 'payment-method' };
      const newState = checkoutReducer(initialCheckoutState, action);

      expect(newState.currentStep).toBe('payment-method');
    });

    test('should advance to next step', () => {
      const state = { ...initialCheckoutState, currentStep: 'address' as const };
      const action: CheckoutAction = { type: 'NEXT_STEP' };
      const newState = checkoutReducer(state, action);

      expect(newState.currentStep).toBe('review');
    });

    test('should go back to previous step', () => {
      const state = { ...initialCheckoutState, currentStep: 'review' as const };
      const action: CheckoutAction = { type: 'PREV_STEP' };
      const newState = checkoutReducer(state, action);

      expect(newState.currentStep).toBe('address');
    });

    test('should not go before first step', () => {
      const state = { ...initialCheckoutState, currentStep: 'address' as const };
      const action: CheckoutAction = { type: 'PREV_STEP' };
      const newState = checkoutReducer(state, action);

      expect(newState.currentStep).toBe('address');
    });

    test('should not advance past last step', () => {
      const state = { ...initialCheckoutState, currentStep: 'confirmation' as const };
      const action: CheckoutAction = { type: 'NEXT_STEP' };
      const newState = checkoutReducer(state, action);

      expect(newState.currentStep).toBe('confirmation');
    });
  });

  describe('Address Actions', () => {
    test('should update shipping address', () => {
      const action: CheckoutAction = {
        type: 'SET_SHIPPING_ADDRESS',
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          address1: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102'
        }
      };

      const newState = checkoutReducer(initialCheckoutState, action);

      expect(newState.shippingAddress.firstName).toBe('John');
      expect(newState.shippingAddress.lastName).toBe('Doe');
      expect(newState.shippingAddress.city).toBe('San Francisco');
    });

    test('should update billing address separately when sameAsShipping is false', () => {
      const state = { ...initialCheckoutState, sameAsShipping: false };

      const action: CheckoutAction = {
        type: 'SET_BILLING_ADDRESS',
        payload: {
          firstName: 'Jane',
          lastName: 'Smith'
        }
      };

      const newState = checkoutReducer(state, action);

      expect(newState.billingAddress.firstName).toBe('Jane');
      expect(newState.shippingAddress.firstName).toBe(''); // Unchanged
    });

    test('should sync billing address when sameAsShipping is true', () => {
      const state = { ...initialCheckoutState, sameAsShipping: true };

      const action: CheckoutAction = {
        type: 'SET_SHIPPING_ADDRESS',
        payload: {
          city: 'Los Angeles'
        }
      };

      const newState = checkoutReducer(state, action);

      expect(newState.shippingAddress.city).toBe('Los Angeles');
      expect(newState.billingAddress.city).toBe('Los Angeles');
    });

    test('should copy shipping to billing when enabling sameAsShipping', () => {
      const state = {
        ...initialCheckoutState,
        sameAsShipping: false,
        shippingAddress: {
          ...initialCheckoutState.shippingAddress,
          firstName: 'John',
          city: 'New York'
        }
      };

      const action: CheckoutAction = {
        type: 'SET_SAME_AS_SHIPPING',
        payload: true
      };

      const newState = checkoutReducer(state, action);

      expect(newState.sameAsShipping).toBe(true);
      expect(newState.billingAddress.firstName).toBe('John');
      expect(newState.billingAddress.city).toBe('New York');
    });

    test('should load saved address', () => {
      const savedAddress = {
        firstName: 'Saved',
        lastName: 'Address',
        email: 'saved@example.com',
        address1: '456 Oak Ave',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        country: 'US',
        phone: '555-0100',
        address2: 'Apt 5'
      };

      const action: CheckoutAction = {
        type: 'LOAD_SAVED_ADDRESS',
        payload: savedAddress
      };

      const newState = checkoutReducer(initialCheckoutState, action);

      expect(newState.shippingAddress).toEqual(savedAddress);
    });
  });

  describe('Validation Actions', () => {
    test('should set shipping errors', () => {
      const errors = {
        firstName: 'First name is required',
        zipCode: 'Invalid zip code format'
      };

      const action: CheckoutAction = {
        type: 'SET_SHIPPING_ERRORS',
        payload: errors
      };

      const newState = checkoutReducer(initialCheckoutState, action);

      expect(newState.shippingErrors).toEqual(errors);
    });

    test('should set billing errors', () => {
      const errors = {
        city: 'City is required'
      };

      const action: CheckoutAction = {
        type: 'SET_BILLING_ERRORS',
        payload: errors
      };

      const newState = checkoutReducer(initialCheckoutState, action);

      expect(newState.billingErrors).toEqual(errors);
    });

    test('should clear all errors', () => {
      const state = {
        ...initialCheckoutState,
        shippingErrors: { firstName: 'Error' },
        billingErrors: { city: 'Error' },
        error: 'General error'
      };

      const action: CheckoutAction = { type: 'CLEAR_ERRORS' };
      const newState = checkoutReducer(state, action);

      expect(newState.shippingErrors).toEqual({});
      expect(newState.billingErrors).toEqual({});
      expect(newState.error).toBeNull();
    });
  });

  describe('Payment Actions', () => {
    test('should set selected payment method', () => {
      const paymentMethod: any = {
        type: 'crypto',
        name: 'USDC',
        confidence: 0.95
      };

      const action: CheckoutAction = {
        type: 'SET_PAYMENT_METHOD',
        payload: paymentMethod
      };

      const newState = checkoutReducer(initialCheckoutState, action);

      expect(newState.selectedPaymentMethod).toEqual(paymentMethod);
    });

    test('should set selected network', () => {
      const action: CheckoutAction = {
        type: 'SET_SELECTED_NETWORK',
        payload: 1 // Ethereum mainnet
      };

      const newState = checkoutReducer(initialCheckoutState, action);

      expect(newState.selectedNetwork).toBe(1);
    });

    test('should set selected token', () => {
      const action: CheckoutAction = {
        type: 'SET_SELECTED_TOKEN',
        payload: 'USDC'
      };

      const newState = checkoutReducer(initialCheckoutState, action);

      expect(newState.selectedToken).toBe('USDC');
    });

    test('should set Stripe payment intent', () => {
      const action: CheckoutAction = {
        type: 'SET_STRIPE_PAYMENT_INTENT',
        payload: {
          intentId: 'pi_123456',
          clientSecret: 'pi_123456_secret_abc'
        }
      };

      const newState = checkoutReducer(initialCheckoutState, action);

      expect(newState.stripePaymentIntentId).toBe('pi_123456');
      expect(newState.stripeClientSecret).toBe('pi_123456_secret_abc');
    });

    test('should clear Stripe data', () => {
      const state = {
        ...initialCheckoutState,
        stripePaymentIntentId: 'pi_123456',
        stripeClientSecret: 'secret'
      };

      const action: CheckoutAction = { type: 'CLEAR_STRIPE_DATA' };
      const newState = checkoutReducer(state, action);

      expect(newState.stripePaymentIntentId).toBeNull();
      expect(newState.stripeClientSecret).toBeNull();
    });
  });

  describe('UI State Actions', () => {
    test('should set loading state', () => {
      const action: CheckoutAction = {
        type: 'SET_LOADING',
        payload: true
      };

      const newState = checkoutReducer(initialCheckoutState, action);

      expect(newState.loading).toBe(true);
    });

    test('should set processing state', () => {
      const action: CheckoutAction = {
        type: 'SET_PROCESSING',
        payload: true
      };

      const newState = checkoutReducer(initialCheckoutState, action);

      expect(newState.processing).toBe(true);
    });

    test('should set error message', () => {
      const action: CheckoutAction = {
        type: 'SET_ERROR',
        payload: 'Payment failed'
      };

      const newState = checkoutReducer(initialCheckoutState, action);

      expect(newState.error).toBe('Payment failed');
    });

    test('should show error modal', () => {
      const action: CheckoutAction = {
        type: 'SET_SHOW_ERROR_MODAL',
        payload: true
      };

      const newState = checkoutReducer(initialCheckoutState, action);

      expect(newState.showErrorModal).toBe(true);
    });
  });

  describe('Bulk Operations', () => {
    test('should reset to initial state', () => {
      const modifiedState = {
        ...initialCheckoutState,
        currentStep: 'payment-method' as const,
        shippingAddress: {
          ...initialCheckoutState.shippingAddress,
          firstName: 'Test'
        },
        loading: true
      };

      const action: CheckoutAction = { type: 'RESET_STATE' };
      const newState = checkoutReducer(modifiedState, action);

      expect(newState).toEqual(initialCheckoutState);
    });

    test('should load from session', () => {
      const sessionData = {
        currentStep: 'review' as const,
        shippingAddress: {
          firstName: 'Session',
          lastName: 'User',
          email: 'session@example.com',
          address1: '789 Pine St',
          city: 'Seattle',
          state: 'WA',
          zipCode: '98101',
          country: 'US',
          phone: '',
          address2: ''
        }
      };

      const action: CheckoutAction = {
        type: 'LOAD_FROM_SESSION',
        payload: sessionData
      };

      const newState = checkoutReducer(initialCheckoutState, action);

      expect(newState.currentStep).toBe('review');
      expect(newState.shippingAddress.firstName).toBe('Session');
    });
  });

  describe('Metadata Actions', () => {
    test('should set metadata', () => {
      const metadata = {
        source: 'mobile',
        referrer: 'google',
        campaignId: 'summer-sale'
      };

      const action: CheckoutAction = {
        type: 'SET_METADATA',
        payload: metadata
      };

      const newState = checkoutReducer(initialCheckoutState, action);

      expect(newState.metadata).toEqual(metadata);
    });

    test('should update metadata', () => {
      const state = {
        ...initialCheckoutState,
        metadata: {
          source: 'mobile',
          campaignId: 'winter-sale'
        }
      };

      const action: CheckoutAction = {
        type: 'UPDATE_METADATA',
        payload: {
          attemptCount: 1,
          lastError: null
        }
      };

      const newState = checkoutReducer(state, action);

      expect(newState.metadata).toEqual({
        source: 'mobile',
        campaignId: 'winter-sale',
        attemptCount: 1,
        lastError: null
      });
    });
  });

  describe('Validation Helper - canProceedFromStep', () => {
    test('should allow proceeding from address step when valid', () => {
      const state: CheckoutState = {
        ...initialCheckoutState,
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          address1: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          country: 'US',
          phone: '555-0100',
          address2: ''
        },
        shippingErrors: {}
      };

      const canProceed = canProceedFromStep(state);
      expect(canProceed).toBe(true);
    });

    test('should not allow proceeding from address step when invalid', () => {
      const state: CheckoutState = {
        ...initialCheckoutState,
        shippingAddress: {
          ...initialCheckoutState.shippingAddress,
          firstName: '', // Missing required field
        },
        shippingErrors: { firstName: 'Required' }
      };

      const canProceed = canProceedFromStep(state);
      expect(canProceed).toBe(false);
    });

    test('should require tax calculation to proceed from review', () => {
      const stateWithTax: CheckoutState = {
        ...initialCheckoutState,
        currentStep: 'review',
        taxCalculation: {
          taxAmount: 8.50,
          taxBreakdown: [],
          taxRate: 0.085
        }
      };

      const stateWithoutTax: CheckoutState = {
        ...initialCheckoutState,
        currentStep: 'review',
        taxCalculation: null
      };

      expect(canProceedFromStep(stateWithTax)).toBe(true);
      expect(canProceedFromStep(stateWithoutTax)).toBe(false);
    });

    test('should require payment method to proceed from payment-method step', () => {
      const stateWithPayment: CheckoutState = {
        ...initialCheckoutState,
        currentStep: 'payment-method',
        selectedPaymentMethod: {
          type: 'crypto',
          name: 'USDC',
          confidence: 0.95,
          estimatedTime: '5 minutes',
          fees: { gasFee: 2.5, platformFee: 1.0 },
          benefits: [],
          requirements: []
        }
      };

      const stateWithoutPayment: CheckoutState = {
        ...initialCheckoutState,
        currentStep: 'payment-method',
        selectedPaymentMethod: null
      };

      expect(canProceedFromStep(stateWithPayment)).toBe(true);
      expect(canProceedFromStep(stateWithoutPayment)).toBe(false);
    });

    test('should require network and token for crypto payment details', () => {
      const validCryptoState: CheckoutState = {
        ...initialCheckoutState,
        currentStep: 'payment-details',
        selectedPaymentMethod: {
          type: 'crypto',
          name: 'USDC',
          confidence: 0.95,
          estimatedTime: '5 minutes',
          fees: {},
          benefits: [],
          requirements: []
        },
        selectedNetwork: 1,
        selectedToken: 'USDC'
      };

      const invalidCryptoState: CheckoutState = {
        ...initialCheckoutState,
        currentStep: 'payment-details',
        selectedPaymentMethod: {
          type: 'crypto',
          name: 'USDC',
          confidence: 0.95,
          estimatedTime: '5 minutes',
          fees: {},
          benefits: [],
          requirements: []
        },
        selectedNetwork: null,
        selectedToken: null
      };

      expect(canProceedFromStep(validCryptoState)).toBe(true);
      expect(canProceedFromStep(invalidCryptoState)).toBe(false);
    });

    test('should require Stripe client secret for fiat payment', () => {
      const validFiatState: CheckoutState = {
        ...initialCheckoutState,
        currentStep: 'payment-details',
        selectedPaymentMethod: {
          type: 'fiat',
          name: 'Credit Card',
          confidence: 0.90,
          estimatedTime: 'instant',
          fees: {},
          benefits: [],
          requirements: []
        },
        stripeClientSecret: 'pi_secret_123'
      };

      const invalidFiatState: CheckoutState = {
        ...initialCheckoutState,
        currentStep: 'payment-details',
        selectedPaymentMethod: {
          type: 'fiat',
          name: 'Credit Card',
          confidence: 0.90,
          estimatedTime: 'instant',
          fees: {},
          benefits: [],
          requirements: []
        },
        stripeClientSecret: null,
        selectedSavedPayment: ''
      };

      expect(canProceedFromStep(validFiatState)).toBe(true);
      expect(canProceedFromStep(invalidFiatState)).toBe(false);
    });

    test('should require order data to proceed from processing', () => {
      const stateWithOrder: CheckoutState = {
        ...initialCheckoutState,
        currentStep: 'processing',
        orderData: {
          orderId: 'ORD-123',
          status: 'pending'
        }
      };

      const stateWithoutOrder: CheckoutState = {
        ...initialCheckoutState,
        currentStep: 'processing',
        orderData: null
      };

      expect(canProceedFromStep(stateWithOrder)).toBe(true);
      expect(canProceedFromStep(stateWithoutOrder)).toBe(false);
    });

    test('should always allow proceeding from confirmation', () => {
      const state: CheckoutState = {
        ...initialCheckoutState,
        currentStep: 'confirmation'
      };

      expect(canProceedFromStep(state)).toBe(true);
    });
  });

  describe('State Immutability', () => {
    test('should not mutate original state', () => {
      const originalState = { ...initialCheckoutState };
      const action: CheckoutAction = {
        type: 'SET_SHIPPING_ADDRESS',
        payload: { firstName: 'Test' }
      };

      checkoutReducer(initialCheckoutState, action);

      expect(initialCheckoutState).toEqual(originalState);
    });

    test('should return new state object', () => {
      const action: CheckoutAction = {
        type: 'SET_LOADING',
        payload: true
      };

      const newState = checkoutReducer(initialCheckoutState, action);

      expect(newState).not.toBe(initialCheckoutState);
    });
  });

  describe('Complex State Transitions', () => {
    test('should handle complete checkout flow', () => {
      let state = initialCheckoutState;

      // Step 1: Enter address
      state = checkoutReducer(state, {
        type: 'SET_SHIPPING_ADDRESS',
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          address1: '123 Main St',
          city: 'SF',
          state: 'CA',
          zipCode: '94102',
          country: 'US'
        }
      });

      // Step 2: Proceed to review
      state = checkoutReducer(state, { type: 'NEXT_STEP' });
      expect(state.currentStep).toBe('review');

      // Step 3: Set tax calculation
      state = checkoutReducer(state, {
        type: 'SET_TAX_CALCULATION',
        payload: { taxAmount: 8.50, taxBreakdown: [], taxRate: 0.085 }
      });

      // Step 4: Proceed to payment method
      state = checkoutReducer(state, { type: 'NEXT_STEP' });
      expect(state.currentStep).toBe('payment-method');

      // Step 5: Select payment method
      state = checkoutReducer(state, {
        type: 'SET_PAYMENT_METHOD',
        payload: {
          type: 'crypto',
          name: 'USDC',
          confidence: 0.95,
          estimatedTime: '5 min',
          fees: {},
          benefits: [],
          requirements: []
        }
      });

      // Step 6: Proceed to payment details
      state = checkoutReducer(state, { type: 'NEXT_STEP' });
      expect(state.currentStep).toBe('payment-details');

      // Step 7: Complete payment details
      state = checkoutReducer(state, {
        type: 'SET_SELECTED_NETWORK',
        payload: 1
      });
      state = checkoutReducer(state, {
        type: 'SET_SELECTED_TOKEN',
        payload: 'USDC'
      });

      // Step 8: Process payment
      state = checkoutReducer(state, { type: 'NEXT_STEP' });
      expect(state.currentStep).toBe('processing');

      state = checkoutReducer(state, {
        type: 'SET_PROCESSING',
        payload: true
      });

      // Step 9: Complete checkout
      state = checkoutReducer(state, {
        type: 'SET_ORDER_DATA',
        payload: { orderId: 'ORD-123', status: 'completed' }
      });

      state = checkoutReducer(state, { type: 'NEXT_STEP' });
      expect(state.currentStep).toBe('confirmation');

      // Verify final state
      expect(state.shippingAddress.firstName).toBe('John');
      expect(state.selectedPaymentMethod?.type).toBe('crypto');
      expect(state.orderData?.orderId).toBe('ORD-123');
    });
  });
});
