/**
 * Checkout Hook
 * Manages the complete checkout process state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'react-hot-toast';
import CheckoutService, {
  CheckoutSession,
  CheckoutResult,
  PaymentDetails,
  ShippingAddress
} from '@/services/checkoutService';
import { CartItem } from '@/services/cartService';

interface CheckoutState {
  session: CheckoutSession | null;
  loading: boolean;
  error: string | null;
  currentStep: 'review' | 'payment-method' | 'payment-details' | 'shipping' | 'processing' | 'confirmation';
  selectedPaymentMethod: 'crypto' | 'fiat' | null;
  shippingAddress: ShippingAddress | null;
  paymentDetails: PaymentDetails | null;
  result: CheckoutResult | null;
}

interface CheckoutActions {
  createSession: (items: CartItem[]) => Promise<void>;
  selectPaymentMethod: (method: 'crypto' | 'fiat') => void;
  setShippingAddress: (address: ShippingAddress) => void;
  setPaymentDetails: (details: PaymentDetails) => void;
  processCheckout: () => Promise<void>;
  goToStep: (step: CheckoutState['currentStep']) => void;
  reset: () => void;
  validateSession: () => Promise<boolean>;
  applyDiscountCode: (code: string) => Promise<boolean>;
}

const initialState: CheckoutState = {
  session: null,
  loading: false,
  error: null,
  currentStep: 'review',
  selectedPaymentMethod: null,
  shippingAddress: null,
  paymentDetails: null,
  result: null
};

export const useCheckout = (): CheckoutState & CheckoutActions => {
  const [state, setState] = useState<CheckoutState>(initialState);
  const { address } = useAccount();
  const [checkoutService] = useState(() => new CheckoutService());

  // Auto-save to localStorage
  useEffect(() => {
    if (state.session) {
      localStorage.setItem('checkout_session', JSON.stringify({
        sessionId: state.session.sessionId,
        orderId: state.session.orderId,
        currentStep: state.currentStep,
        selectedPaymentMethod: state.selectedPaymentMethod,
        shippingAddress: state.shippingAddress,
        paymentDetails: state.paymentDetails
      }));
    }
  }, [state.session, state.currentStep, state.selectedPaymentMethod, state.shippingAddress, state.paymentDetails]);

  // Restore from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('checkout_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        // Validate session is still active
        checkoutService.validateSession(parsed.sessionId).then(valid => {
          if (valid) {
            checkoutService.getSession(parsed.sessionId).then(session => {
              if (session) {
                setState(prev => ({
                  ...prev,
                  session,
                  currentStep: parsed.currentStep || 'review',
                  selectedPaymentMethod: parsed.selectedPaymentMethod,
                  shippingAddress: parsed.shippingAddress,
                  paymentDetails: parsed.paymentDetails
                }));
              }
            });
          } else {
            localStorage.removeItem('checkout_session');
          }
        });
      } catch (error) {
        console.error('Failed to restore checkout session:', error);
        localStorage.removeItem('checkout_session');
      }
    }
  }, []);

  const createSession = useCallback(async (items: CartItem[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const session = await checkoutService.createCheckoutSession(items, address);
      setState(prev => ({
        ...prev,
        session,
        loading: false,
        currentStep: 'review'
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to create checkout session'
      }));
      toast.error('Failed to initialize checkout');
    }
  }, [address, checkoutService]);

  const selectPaymentMethod = useCallback((method: 'crypto' | 'fiat') => {
    setState(prev => ({
      ...prev,
      selectedPaymentMethod: method,
      currentStep: 'payment-details'
    }));
  }, []);

  const setShippingAddress = useCallback((address: ShippingAddress) => {
    setState(prev => ({
      ...prev,
      shippingAddress: address
    }));
  }, []);

  const setPaymentDetails = useCallback((details: PaymentDetails) => {
    setState(prev => ({
      ...prev,
      paymentDetails: details
    }));
  }, []);

  const processCheckout = useCallback(async () => {
    const { session, selectedPaymentMethod, paymentDetails, shippingAddress } = state;
    
    if (!session || !selectedPaymentMethod || !paymentDetails || !shippingAddress) {
      toast.error('Please complete all required fields');
      return;
    }

    setState(prev => ({ ...prev, loading: true, currentStep: 'processing', error: null }));

    try {
      const result = await checkoutService.processCheckout(
        session,
        selectedPaymentMethod,
        paymentDetails,
        shippingAddress
      );

      if (result.success) {
        setState(prev => ({
          ...prev,
          result,
          loading: false,
          currentStep: 'confirmation'
        }));
        
        // Clear saved session on successful completion
        localStorage.removeItem('checkout_session');
        
        toast.success('Order placed successfully!');
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: result.error || 'Checkout failed',
          currentStep: 'payment-details'
        }));
        toast.error(result.error || 'Checkout failed');
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Checkout failed',
        currentStep: 'payment-details'
      }));
      toast.error('Checkout failed. Please try again.');
    }
  }, [state, checkoutService]);

  const goToStep = useCallback((step: CheckoutState['currentStep']) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
    localStorage.removeItem('checkout_session');
  }, []);

  const validateSession = useCallback(async (): Promise<boolean> => {
    if (!state.session) return false;
    
    try {
      const valid = await checkoutService.validateSession(state.session.sessionId);
      if (!valid) {
        setState(prev => ({ ...prev, error: 'Session expired' }));
        localStorage.removeItem('checkout_session');
        toast.error('Checkout session expired. Please start over.');
      }
      return valid;
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  }, [state.session, checkoutService]);

  const applyDiscountCode = useCallback(async (code: string): Promise<boolean> => {
    if (!state.session) return false;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const result = await checkoutService.applyDiscountCode(state.session.sessionId, code);
      
      if (result.valid && result.discount) {
        // Update session totals with discount
        const updatedSession = { ...state.session };
        if (result.discount.type === 'percentage') {
          const discountAmount = updatedSession.totals.subtotal * (result.discount.value / 100);
          updatedSession.totals.total -= discountAmount;
        } else {
          updatedSession.totals.total -= result.discount.value;
        }

        setState(prev => ({
          ...prev,
          session: updatedSession,
          loading: false
        }));

        toast.success(`Discount applied: ${result.discount.description}`);
        return true;
      } else {
        setState(prev => ({ ...prev, loading: false }));
        toast.error(result.error || 'Invalid discount code');
        return false;
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, loading: false }));
      toast.error('Failed to apply discount code');
      return false;
    }
  }, [state.session, checkoutService]);

  return {
    ...state,
    createSession,
    selectPaymentMethod,
    setShippingAddress,
    setPaymentDetails,
    processCheckout,
    goToStep,
    reset,
    validateSession,
    applyDiscountCode
  };
};

export default useCheckout;