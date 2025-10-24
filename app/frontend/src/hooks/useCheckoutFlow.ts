/**
 * useCheckoutFlow - Shared checkout state management and validation
 * Provides common checkout logic for desktop and mobile flows
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export type CheckoutStep = 'cart' | 'shipping' | 'payment' | 'review' | 'processing' | 'confirmation';

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
}

export interface CheckoutState {
  currentStep: CheckoutStep;
  shippingAddress: ShippingAddress;
  isProcessing: boolean;
  errors: Record<string, string>;
  escrowSetup: boolean;
  completedSteps: Set<CheckoutStep>;
}

export interface CheckoutFlowConfig {
  hasPhysicalItems: boolean;
  onComplete: (orderData: any) => void;
  onCancel: () => void;
  autoSaveSession?: boolean;
}

interface UseCheckoutFlowReturn {
  state: CheckoutState;
  steps: Array<{ key: CheckoutStep; title: string; show: boolean }>;
  canProceed: boolean;
  currentStepIndex: number;
  
  // Actions
  setShippingAddress: (address: Partial<ShippingAddress>) => void;
  setEscrowSetup: (setup: boolean) => void;
  nextStep: () => boolean;
  prevStep: () => void;
  goToStep: (step: CheckoutStep) => void;
  validateCurrentStep: () => boolean;
  setError: (field: string, message: string) => void;
  clearError: (field: string) => void;
  clearAllErrors: () => void;
  setProcessing: (processing: boolean) => void;
  markStepComplete: (step: CheckoutStep) => void;
  reset: () => void;
}

const SESSION_STORAGE_KEY = 'linkdao_checkout_session';

const initialShippingAddress: ShippingAddress = {
  firstName: '',
  lastName: '',
  email: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'US',
  phone: ''
};

export const useCheckoutFlow = (config: CheckoutFlowConfig): UseCheckoutFlowReturn => {
  const { hasPhysicalItems, autoSaveSession = true } = config;

  const [currentStep, setCurrentStep] = useState<CheckoutStep>('cart');
  const [shippingAddress, setShippingAddressState] = useState<ShippingAddress>(initialShippingAddress);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [escrowSetup, setEscrowSetupState] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<CheckoutStep>>(new Set());

  // Define checkout steps based on configuration
  const steps = [
    { key: 'cart' as CheckoutStep, title: 'Review Cart', show: true },
    { key: 'shipping' as CheckoutStep, title: 'Shipping Info', show: hasPhysicalItems },
    { key: 'payment' as CheckoutStep, title: 'Payment & Escrow', show: true },
    { key: 'review' as CheckoutStep, title: 'Review Order', show: true },
    { key: 'processing' as CheckoutStep, title: 'Processing', show: false },
    { key: 'confirmation' as CheckoutStep, title: 'Confirmation', show: false }
  ].filter(step => step.show);

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);

  // Auto-save session to localStorage
  useEffect(() => {
    if (!autoSaveSession) return;

    const sessionData = {
      currentStep,
      shippingAddress,
      escrowSetup,
      completedSteps: Array.from(completedSteps),
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Failed to save checkout session:', error);
    }
  }, [currentStep, shippingAddress, escrowSetup, completedSteps, autoSaveSession]);

  // Restore session on mount
  useEffect(() => {
    if (!autoSaveSession) return;

    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!saved) return;

      const sessionData = JSON.parse(saved);
      const age = Date.now() - sessionData.timestamp;
      
      // Session expires after 30 minutes
      if (age > 30 * 60 * 1000) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return;
      }

      setCurrentStep(sessionData.currentStep);
      setShippingAddressState(sessionData.shippingAddress);
      setEscrowSetupState(sessionData.escrowSetup);
      setCompletedSteps(new Set(sessionData.completedSteps));
    } catch (error) {
      console.error('Failed to restore checkout session:', error);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [autoSaveSession]);

  // Validation logic for each step
  const validateCurrentStep = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 'cart':
        // Cart validation handled by parent
        break;

      case 'shipping':
        if (!shippingAddress.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!shippingAddress.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!shippingAddress.email.trim()) {
          newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingAddress.email)) {
          newErrors.email = 'Invalid email format';
        }
        if (!shippingAddress.address1.trim()) newErrors.address1 = 'Address is required';
        if (!shippingAddress.city.trim()) newErrors.city = 'City is required';
        if (!shippingAddress.state.trim()) newErrors.state = 'State is required';
        if (!shippingAddress.zipCode.trim()) newErrors.zipCode = 'ZIP code is required';
        if (!shippingAddress.country) newErrors.country = 'Country is required';
        break;

      case 'payment':
        if (!escrowSetup) newErrors.escrow = 'Please setup escrow protection';
        break;

      case 'review':
        // Final review - check all previous steps completed
        if (hasPhysicalItems && !completedSteps.has('shipping')) {
          newErrors.review = 'Please complete shipping information';
        }
        if (!completedSteps.has('payment')) {
          newErrors.review = 'Please complete payment setup';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentStep, shippingAddress, escrowSetup, hasPhysicalItems, completedSteps]);

  // Navigation
  const nextStep = useCallback((): boolean => {
    if (!validateCurrentStep()) {
      return false;
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      markStepComplete(currentStep);
      setCurrentStep(steps[nextIndex].key);
      setErrors({});
      return true;
    }
    return false;
  }, [currentStep, currentStepIndex, steps, validateCurrentStep]);

  const prevStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].key);
      setErrors({});
    }
  }, [currentStepIndex, steps]);

  const goToStep = useCallback((step: CheckoutStep) => {
    const stepExists = steps.find(s => s.key === step);
    if (stepExists) {
      setCurrentStep(step);
      setErrors({});
    }
  }, [steps]);

  const markStepComplete = useCallback((step: CheckoutStep) => {
    setCompletedSteps(prev => new Set([...prev, step]));
  }, []);

  // State setters
  const setShippingAddress = useCallback((address: Partial<ShippingAddress>) => {
    setShippingAddressState(prev => ({ ...prev, ...address }));
  }, []);

  const setEscrowSetup = useCallback((setup: boolean) => {
    setEscrowSetupState(setup);
    if (setup) {
      clearError('escrow');
    }
  }, []);

  const setProcessing = useCallback((processing: boolean) => {
    setIsProcessing(processing);
  }, []);

  // Error management
  const setError = useCallback((field: string, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }));
  }, []);

  const clearError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Reset to initial state
  const reset = useCallback(() => {
    setCurrentStep('cart');
    setShippingAddressState(initialShippingAddress);
    setIsProcessing(false);
    setErrors({});
    setEscrowSetupState(false);
    setCompletedSteps(new Set());
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  const canProceed = Object.keys(errors).length === 0 && !isProcessing;

  const state: CheckoutState = {
    currentStep,
    shippingAddress,
    isProcessing,
    errors,
    escrowSetup,
    completedSteps
  };

  return {
    state,
    steps,
    canProceed,
    currentStepIndex,
    setShippingAddress,
    setEscrowSetup,
    nextStep,
    prevStep,
    goToStep,
    validateCurrentStep,
    setError,
    clearError,
    clearAllErrors,
    setProcessing,
    markStepComplete,
    reset
  };
};
