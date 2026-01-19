/**
 * Checkout Flow State Reducer
 * Mobile implementation
 */

import {
  ShippingAddress,
  PrioritizedPaymentMethod,
  PrioritizationResult,
  CheckoutRecommendation,
  PaymentError,
  TaxCalculationResult
} from '../types/checkout';

export type CheckoutStep = 'address' | 'review' | 'payment-method' | 'payment-details' | 'processing' | 'confirmation';

export interface CheckoutState {
  // Navigation
  currentStep: CheckoutStep;
  canProceed: boolean;

  // Addresses
  shippingAddress: ShippingAddress;
  billingAddress: ShippingAddress;
  sameAsShipping: boolean;
  savedAddresses: any[];
  selectedSavedAddress: string;
  saveShippingAddress: boolean;
  saveBillingAddress: boolean;

  // Validation
  shippingErrors: Record<string, string>;
  billingErrors: Record<string, string>;

  // Payment
  selectedPaymentMethod: PrioritizedPaymentMethod | null;
  prioritizationResult: PrioritizationResult | null;
  recommendation: CheckoutRecommendation | null;
  savedPaymentMethods: any[];
  selectedSavedPayment: string;
  useEscrow: boolean;

  // Crypto-specific
  selectedNetwork: number | null;
  selectedToken: string | null;

  // Stripe-specific
  stripePaymentIntentId: string | null;
  stripeClientSecret: string | null;

  // Tax
  taxCalculation: TaxCalculationResult | null;

  // Discount
  discountCode: string;
  discountAmount: number;
  discountError: string | null;

  // Order
  orderData: any | null;
  sessionId: string | null;

  // UI State
  loading: boolean;
  loadingSavedData: boolean;
  processing: boolean;
  error: string | null;
  paymentError: PaymentError | null;
  showErrorModal: boolean;

  // Metadata
  metadata: Record<string, any>;
}

export const initialCheckoutState: CheckoutState = {
  // Navigation
  currentStep: 'address',
  canProceed: false,

  // Addresses
  shippingAddress: {
    firstName: '',
    lastName: '',
    email: '',
    address1: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    phone: '',
    address2: ''
  },
  billingAddress: {
    firstName: '',
    lastName: '',
    email: '',
    address1: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    phone: '',
    address2: ''
  },
  sameAsShipping: true,
  savedAddresses: [],
  selectedSavedAddress: '',
  saveShippingAddress: false,
  saveBillingAddress: false,

  // Validation
  shippingErrors: {},
  billingErrors: {},

  // Payment
  selectedPaymentMethod: null,
  prioritizationResult: null,
  recommendation: null,
  savedPaymentMethods: [],
  selectedSavedPayment: '',
  useEscrow: true,

  // Crypto-specific
  selectedNetwork: null,
  selectedToken: null,

  // Stripe-specific
  stripePaymentIntentId: null,
  stripeClientSecret: null,

  // Tax
  taxCalculation: null,

  // Discount
  discountCode: '',
  discountAmount: 0,
  discountError: null,

  // Order
  orderData: null,
  sessionId: null,

  // UI State
  loading: false,
  loadingSavedData: true,
  processing: false,
  error: null,
  paymentError: null,
  showErrorModal: false,

  // Metadata
  metadata: {}
};

export type CheckoutAction =
  // Navigation
  | { type: 'SET_STEP'; payload: CheckoutStep }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_CAN_PROCEED'; payload: boolean }

  // Addresses
  | { type: 'SET_SHIPPING_ADDRESS'; payload: Partial<ShippingAddress> }
  | { type: 'SET_BILLING_ADDRESS'; payload: Partial<ShippingAddress> }
  | { type: 'SET_SAME_AS_SHIPPING'; payload: boolean }
  | { type: 'SET_SAVED_ADDRESSES'; payload: any[] }
  | { type: 'SELECT_SAVED_ADDRESS'; payload: string }
  | { type: 'SET_SAVE_SHIPPING_ADDRESS'; payload: boolean }
  | { type: 'SET_SAVE_BILLING_ADDRESS'; payload: boolean }
  | { type: 'LOAD_SAVED_ADDRESS'; payload: ShippingAddress }

  // Validation
  | { type: 'SET_SHIPPING_ERRORS'; payload: Record<string, string> }
  | { type: 'SET_BILLING_ERRORS'; payload: Record<string, string> }
  | { type: 'CLEAR_ERRORS' }

  // Payment
  | { type: 'SET_PAYMENT_METHOD'; payload: PrioritizedPaymentMethod | null }
  | { type: 'SET_PRIORITIZATION_RESULT'; payload: PrioritizationResult | null }
  | { type: 'SET_RECOMMENDATION'; payload: CheckoutRecommendation | null }
  | { type: 'SET_SAVED_PAYMENT_METHODS'; payload: any[] }
  | { type: 'SELECT_SAVED_PAYMENT'; payload: string }
  | { type: 'SET_USE_ESCROW'; payload: boolean }

  // Crypto-specific
  | { type: 'SET_SELECTED_NETWORK'; payload: number | null }
  | { type: 'SET_SELECTED_TOKEN'; payload: string | null }

  // Stripe-specific
  | { type: 'SET_STRIPE_PAYMENT_INTENT'; payload: { intentId: string; clientSecret: string } }
  | { type: 'CLEAR_STRIPE_DATA' }

  // Tax
  | { type: 'SET_TAX_CALCULATION'; payload: TaxCalculationResult | null }

  // Discount
  | { type: 'SET_DISCOUNT_CODE'; payload: string }
  | { type: 'APPLY_DISCOUNT'; payload: { amount: number; code: string } }
  | { type: 'SET_DISCOUNT_ERROR'; payload: string | null }

  // Order
  | { type: 'SET_ORDER_DATA'; payload: any }
  | { type: 'SET_SESSION_ID'; payload: string }

  // UI State
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LOADING_SAVED_DATA'; payload: boolean }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PAYMENT_ERROR'; payload: PaymentError | null }
  | { type: 'SET_SHOW_ERROR_MODAL'; payload: boolean }
  | { type: 'CLEAR_ERROR' }

  // Metadata
  | { type: 'SET_METADATA'; payload: Record<string, any> }
  | { type: 'UPDATE_METADATA'; payload: Record<string, any> }

  // Bulk operations
  | { type: 'RESET_STATE' }
  | { type: 'LOAD_FROM_SESSION'; payload: Partial<CheckoutState> };

const stepOrder: CheckoutStep[] = ['address', 'review', 'payment-method', 'payment-details', 'processing', 'confirmation'];

export function checkoutReducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    // Navigation
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };

    case 'NEXT_STEP': {
      const currentIndex = stepOrder.indexOf(state.currentStep);
      const nextIndex = Math.min(currentIndex + 1, stepOrder.length - 1);
      return { ...state, currentStep: stepOrder[nextIndex] };
    }

    case 'PREV_STEP': {
      const currentIndex = stepOrder.indexOf(state.currentStep);
      const prevIndex = Math.max(currentIndex - 1, 0);
      return { ...state, currentStep: stepOrder[prevIndex] };
    }

    case 'SET_CAN_PROCEED':
      return { ...state, canProceed: action.payload };

    // Addresses
    case 'SET_SHIPPING_ADDRESS':
      return {
        ...state,
        shippingAddress: { ...state.shippingAddress, ...action.payload },
        // Auto-update billing if same as shipping
        ...(state.sameAsShipping && { billingAddress: { ...state.shippingAddress, ...action.payload } })
      };

    case 'SET_BILLING_ADDRESS':
      return {
        ...state,
        billingAddress: { ...state.billingAddress, ...action.payload }
      };

    case 'SET_SAME_AS_SHIPPING':
      return {
        ...state,
        sameAsShipping: action.payload,
        // Copy shipping to billing if enabling
        ...(action.payload && { billingAddress: { ...state.shippingAddress } })
      };

    case 'SET_SAVED_ADDRESSES':
      return { ...state, savedAddresses: action.payload };

    case 'SELECT_SAVED_ADDRESS':
      return { ...state, selectedSavedAddress: action.payload };

    case 'SET_SAVE_SHIPPING_ADDRESS':
      return { ...state, saveShippingAddress: action.payload };

    case 'SET_SAVE_BILLING_ADDRESS':
      return { ...state, saveBillingAddress: action.payload };

    case 'LOAD_SAVED_ADDRESS':
      return {
        ...state,
        shippingAddress: action.payload,
        ...(state.sameAsShipping && { billingAddress: action.payload })
      };

    // Validation
    case 'SET_SHIPPING_ERRORS':
      return { ...state, shippingErrors: action.payload };

    case 'SET_BILLING_ERRORS':
      return { ...state, billingErrors: action.payload };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        shippingErrors: {},
        billingErrors: {},
        error: null,
        paymentError: null
      };

    // Payment
    case 'SET_PAYMENT_METHOD':
      return { ...state, selectedPaymentMethod: action.payload };

    case 'SET_PRIORITIZATION_RESULT':
      return { ...state, prioritizationResult: action.payload };

    case 'SET_RECOMMENDATION':
      return { ...state, recommendation: action.payload };

    case 'SET_SAVED_PAYMENT_METHODS':
      return { ...state, savedPaymentMethods: action.payload };

    case 'SELECT_SAVED_PAYMENT':
      return { ...state, selectedSavedPayment: action.payload };

    case 'SET_USE_ESCROW':
      return { ...state, useEscrow: action.payload };

    // Crypto-specific
    case 'SET_SELECTED_NETWORK':
      return { ...state, selectedNetwork: action.payload };

    case 'SET_SELECTED_TOKEN':
      return { ...state, selectedToken: action.payload };

    // Stripe-specific
    case 'SET_STRIPE_PAYMENT_INTENT':
      return {
        ...state,
        stripePaymentIntentId: action.payload.intentId,
        stripeClientSecret: action.payload.clientSecret
      };

    case 'CLEAR_STRIPE_DATA':
      return {
        ...state,
        stripePaymentIntentId: null,
        stripeClientSecret: null
      };

    // Tax
    case 'SET_TAX_CALCULATION':
      return { ...state, taxCalculation: action.payload };

    // Discount
    case 'SET_DISCOUNT_CODE':
      return { ...state, discountCode: action.payload, discountError: null };

    case 'APPLY_DISCOUNT':
      return {
        ...state,
        discountAmount: action.payload.amount,
        discountCode: action.payload.code,
        discountError: null
      };

    case 'SET_DISCOUNT_ERROR':
      return { ...state, discountError: action.payload };

    // Order
    case 'SET_ORDER_DATA':
      return { ...state, orderData: action.payload };

    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload };

    // UI State
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_LOADING_SAVED_DATA':
      return { ...state, loadingSavedData: action.payload };

    case 'SET_PROCESSING':
      return { ...state, processing: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_PAYMENT_ERROR':
      return { ...state, paymentError: action.payload };

    case 'SET_SHOW_ERROR_MODAL':
      return { ...state, showErrorModal: action.payload };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
        paymentError: null,
        showErrorModal: false
      };

    // Metadata
    case 'SET_METADATA':
      return { ...state, metadata: action.payload };

    case 'UPDATE_METADATA':
      return {
        ...state,
        metadata: { ...state.metadata, ...action.payload }
      };

    // Bulk operations
    case 'RESET_STATE':
      return initialCheckoutState;

    case 'LOAD_FROM_SESSION':
      return { ...state, ...action.payload };

    default:
      return state;
  }
}

/**
 * Helper function to validate if can proceed to next step
 */
export function canProceedFromStep(state: CheckoutState): boolean {
  switch (state.currentStep) {
    case 'address':
      return (
        Object.keys(state.shippingErrors).length === 0 &&
        state.shippingAddress.firstName.trim() !== '' &&
        state.shippingAddress.lastName.trim() !== '' &&
        state.shippingAddress.address1.trim() !== '' &&
        state.shippingAddress.city.trim() !== '' &&
        state.shippingAddress.state.trim() !== '' &&
        state.shippingAddress.zipCode.trim() !== '' &&
        (!state.sameAsShipping ? Object.keys(state.billingErrors).length === 0 : true)
      );

    case 'review':
      return state.taxCalculation !== null;

    case 'payment-method':
      return state.selectedPaymentMethod !== null;

    case 'payment-details':
      // Add specific validation based on payment method type
      if (!state.selectedPaymentMethod) return false;

      if (state.selectedPaymentMethod.method.type === 'STABLECOIN_USDC' ||
          state.selectedPaymentMethod.method.type === 'STABLECOIN_USDT' ||
          state.selectedPaymentMethod.method.type === 'NATIVE_ETH') {
        // Crypto logic: usually just needs to be selected, maybe check wallet connected if available in state
        return true;
      }

      if (state.selectedPaymentMethod.method.type === 'FIAT_STRIPE') {
        return state.stripeClientSecret !== null || state.selectedSavedPayment !== '';
      }

      return true;

    case 'processing':
      return state.orderData !== null;

    case 'confirmation':
      return true;

    default:
      return false;
  }
}
