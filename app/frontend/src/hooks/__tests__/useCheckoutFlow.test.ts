/**
 * Tests for useCheckoutFlow hook
 */

import { renderHook, act } from '@testing-library/react';
import { useCheckoutFlow, CheckoutFlowConfig } from '../useCheckoutFlow';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('useCheckoutFlow', () => {
  const mockConfig: CheckoutFlowConfig = {
    hasPhysicalItems: true,
    onComplete: jest.fn(),
    onCancel: jest.fn(),
    autoSaveSession: false // Disable for tests
  };

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useCheckoutFlow(mockConfig));

      expect(result.current.state.currentStep).toBe('cart');
      expect(result.current.state.isProcessing).toBe(false);
      expect(result.current.state.escrowSetup).toBe(false);
      expect(result.current.state.errors).toEqual({});
      expect(result.current.canProceed).toBe(true);
    });

    it('should include shipping step when hasPhysicalItems is true', () => {
      const { result } = renderHook(() => useCheckoutFlow(mockConfig));

      const shippingStep = result.current.steps.find(s => s.key === 'shipping');
      expect(shippingStep).toBeDefined();
      expect(shippingStep?.show).toBe(true);
    });

    it('should exclude shipping step when hasPhysicalItems is false', () => {
      const config = { ...mockConfig, hasPhysicalItems: false };
      const { result } = renderHook(() => useCheckoutFlow(config));

      const shippingStep = result.current.steps.find(s => s.key === 'shipping');
      expect(shippingStep).toBeUndefined();
    });
  });

  describe('Navigation', () => {
    it('should move to next step when validation passes', () => {
      const { result } = renderHook(() => useCheckoutFlow(mockConfig));

      act(() => {
        result.current.nextStep();
      });

      expect(result.current.state.currentStep).toBe('shipping');
    });

    it('should not move to next step when validation fails', () => {
      const { result } = renderHook(() => useCheckoutFlow(mockConfig));

      // Move to shipping step
      act(() => {
        result.current.nextStep();
      });

      // Try to proceed without filling required fields
      act(() => {
        result.current.nextStep();
      });

      // Should still be on shipping step
      expect(result.current.state.currentStep).toBe('shipping');
      expect(Object.keys(result.current.state.errors).length).toBeGreaterThan(0);
    });

    it('should move to previous step', () => {
      const { result } = renderHook(() => useCheckoutFlow(mockConfig));

      // Move to shipping step
      act(() => {
        result.current.nextStep();
      });

      // Move back to cart
      act(() => {
        result.current.prevStep();
      });

      expect(result.current.state.currentStep).toBe('cart');
    });

    it('should not move to previous step when on first step', () => {
      const { result } = renderHook(() => useCheckoutFlow(mockConfig));

      act(() => {
        result.current.prevStep();
      });

      expect(result.current.state.currentStep).toBe('cart');
    });

    it('should go to specific step', () => {
      const { result } = renderHook(() => useCheckoutFlow(mockConfig));

      act(() => {
        result.current.goToStep('payment');
      });

      expect(result.current.state.currentStep).toBe('payment');
    });
  });

  describe('Validation', () => {
    it('should validate shipping address fields', () => {
      const { result } = renderHook(() => useCheckoutFlow(mockConfig));

      // Move to shipping step
      act(() => {
        result.current.nextStep();
      });

      // Validate without filling fields
      let isValid;
      act(() => {
        isValid = result.current.validateCurrentStep();
      });

      expect(isValid).toBe(false);
      expect(result.current.state.errors.firstName).toBeDefined();
      expect(result.current.state.errors.lastName).toBeDefined();
      expect(result.current.state.errors.email).toBeDefined();
      expect(result.current.state.errors.address1).toBeDefined();
    });

    it('should validate email format', () => {
      const { result } = renderHook(() => useCheckoutFlow(mockConfig));

      act(() => {
        result.current.nextStep(); // Move to shipping
        result.current.setShippingAddress({
          firstName: 'John',
          lastName: 'Doe',
          email: 'invalid-email',
          address1: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'US'
        });
      });

      let isValid;
      act(() => {
        isValid = result.current.validateCurrentStep();
      });

      expect(isValid).toBe(false);
      expect(result.current.state.errors.email).toBe('Invalid email format');
    });

    it('should pass validation with valid shipping address', () => {
      const { result } = renderHook(() => useCheckoutFlow(mockConfig));

      act(() => {
        result.current.nextStep(); // Move to shipping
        result.current.setShippingAddress({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          address1: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'US'
        });
      });

      let isValid;
      act(() => {
        isValid = result.current.validateCurrentStep();
      });

      expect(isValid).toBe(true);
      expect(Object.keys(result.current.state.errors)).toHaveLength(0);
    });

    it('should validate escrow setup on payment step', () => {
      const { result } = renderHook(() => useCheckoutFlow(mockConfig));

      // Navigate to payment step
      act(() => {
        result.current.goToStep('payment');
      });

      let isValid;
      act(() => {
        isValid = result.current.validateCurrentStep();
      });

      expect(isValid).toBe(false);
      expect(result.current.state.errors.escrow).toBeDefined();
    });
  });

  describe('State Management', () => {
    it('should update shipping address', () => {
      const { result } = renderHook(() => useCheckoutFlow(mockConfig));

      act(() => {
        result.current.setShippingAddress({
          firstName: 'John',
          lastName: 'Doe'
        });
      });

      expect(result.current.state.shippingAddress.firstName).toBe('John');
      expect(result.current.state.shippingAddress.lastName).toBe('Doe');
    });

    it('should set escrow setup status', () => {
      const { result } = renderHook(() => useCheckoutFlow(mockConfig));

      act(() => {
        result.current.setEscrowSetup(true);
      });

      expect(result.current.state.escrowSetup).toBe(true);
    });

    it('should set processing status', () => {
      const { result } = renderHook(() => useCheckoutFlow(mockConfig));

      act(() => {
        result.current.setProcessing(true);
      });

      expect(result.current.state.isProcessing).toBe(true);
      expect(result.current.canProceed).toBe(false);
    });

    it('should set and clear errors', () => {
      const { result } = renderHook(() => useCheckoutFlow(mockConfig));

      act(() => {
        result.current.setError('testField', 'Test error');
      });

      expect(result.current.state.errors.testField).toBe('Test error');

      act(() => {
        result.current.clearError('testField');
      });

      expect(result.current.state.errors.testField).toBeUndefined();
    });

    it('should clear all errors', () => {
      const { result } = renderHook(() => useCheckoutFlow(mockConfig));

      act(() => {
        result.current.setError('field1', 'Error 1');
        result.current.setError('field2', 'Error 2');
      });

      expect(Object.keys(result.current.state.errors)).toHaveLength(2);

      act(() => {
        result.current.clearAllErrors();
      });

      expect(Object.keys(result.current.state.errors)).toHaveLength(0);
    });

    it('should mark steps as complete', () => {
      const { result } = renderHook(() => useCheckoutFlow(mockConfig));

      act(() => {
        result.current.markStepComplete('cart');
        result.current.markStepComplete('shipping');
      });

      expect(result.current.state.completedSteps.has('cart')).toBe(true);
      expect(result.current.state.completedSteps.has('shipping')).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should save session to localStorage when autoSaveSession is enabled', () => {
      const config = { ...mockConfig, autoSaveSession: true };
      const { result } = renderHook(() => useCheckoutFlow(config));

      act(() => {
        result.current.setShippingAddress({ firstName: 'John' });
      });

      // Allow time for effect to run
      setTimeout(() => {
        const saved = localStorageMock.getItem('linkdao_checkout_session');
        expect(saved).toBeTruthy();
        
        if (saved) {
          const parsed = JSON.parse(saved);
          expect(parsed.shippingAddress.firstName).toBe('John');
        }
      }, 100);
    });

    it('should reset state', () => {
      const { result } = renderHook(() => useCheckoutFlow(mockConfig));

      // Set some state
      act(() => {
        result.current.setShippingAddress({ firstName: 'John' });
        result.current.setEscrowSetup(true);
        result.current.goToStep('payment');
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.state.currentStep).toBe('cart');
      expect(result.current.state.shippingAddress.firstName).toBe('');
      expect(result.current.state.escrowSetup).toBe(false);
    });
  });
});
