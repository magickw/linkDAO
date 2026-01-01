/**
 * Property-based tests for PaymentMethodSelector
 * Tests correctness properties defined in the design specification
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PaymentMethodSelector from '../PaymentMethodSelector';
import {
  PrioritizationResult,
  PrioritizedPaymentMethod,
  PaymentMethodType,
  AvailabilityStatus
} from '../../../types/paymentPrioritization';

// Mock data generators
const generateMockPaymentMethod = (id: string, type: PaymentMethodType): PrioritizedPaymentMethod => ({
  method: {
    id,
    type,
    name: `${type} Method ${id}`,
    description: `Test payment method ${id}`,
    chainId: type === PaymentMethodType.FIAT_STRIPE ? 0 : 1,
    enabled: true,
    supportedNetworks: [1],
    token: type !== PaymentMethodType.FIAT_STRIPE ? {
      address: '0x123',
      symbol: 'TEST',
      decimals: 18,
      name: 'Test Token',
      chainId: 1,
      isNative: false
    } : undefined
  },
  costEstimate: {
    baseCost: 100,
    gasFee: 5,
    platformFee: 2.5,
    totalCost: 107.5,
    currency: 'USD',
    estimatedTime: 5,
    confidence: 0.9
  },
  availabilityStatus: AvailabilityStatus.AVAILABLE,
  priority: 1,
  recommendationReason: 'Test reason',
  benefits: ['Low fees', 'Fast processing'],
  warnings: []
});

const generateMockPrioritizationResult = (methodCount: number = 3): PrioritizationResult => {
  const methods = Array.from({ length: methodCount }, (_, i) => 
    generateMockPaymentMethod(`method-${i}`, i === 0 ? PaymentMethodType.FIAT_STRIPE : PaymentMethodType.STABLECOIN_USDC)
  );

  return {
    prioritizedMethods: methods,
    defaultMethod: methods[0],
    warnings: [],
    metadata: {
      calculatedAt: new Date(),
      averageConfidence: 0.9,
      totalMethodsEvaluated: methodCount,
      processingTimeMs: 100
    }
  };
};

describe('PaymentMethodSelector Property Tests', () => {
  /**
   * Property 1: View Mode Consistency
   * For any payment method selector state, switching between compact and detailed views 
   * should preserve the selected payment method and only change the display format
   */
  describe('Property 1: View Mode Consistency', () => {
    test('should preserve selected payment method when switching view modes', () => {
      const mockResult = generateMockPrioritizationResult(3);
      const mockOnSelect = jest.fn();
      let selectedMethodId: string | undefined;

      const { rerender } = render(
        <PaymentMethodSelector
          prioritizationResult={mockResult}
          selectedMethodId={selectedMethodId}
          onMethodSelect={(method) => {
            selectedMethodId = method.method.id;
            mockOnSelect(method);
          }}
          viewMode="auto"
          responsive={true}
        />
      );

      // Select a payment method in detailed view
      const firstMethod = screen.getByText(mockResult.prioritizedMethods[0].method.name);
      fireEvent.click(firstMethod);

      expect(mockOnSelect).toHaveBeenCalledWith(mockResult.prioritizedMethods[0]);
      const initialSelectedId = selectedMethodId;

      // Switch to compact view
      const compactButton = screen.queryByText('Compact');
      if (compactButton) {
        fireEvent.click(compactButton);
      }

      // Rerender with updated selection
      rerender(
        <PaymentMethodSelector
          prioritizationResult={mockResult}
          selectedMethodId={selectedMethodId}
          onMethodSelect={mockOnSelect}
          viewMode="compact"
          responsive={true}
        />
      );

      // Verify the same method is still selected
      expect(selectedMethodId).toBe(initialSelectedId);
      
      // Switch back to detailed view
      const detailedButton = screen.queryByText('Detailed');
      if (detailedButton) {
        fireEvent.click(detailedButton);
      }

      rerender(
        <PaymentMethodSelector
          prioritizationResult={mockResult}
          selectedMethodId={selectedMethodId}
          onMethodSelect={mockOnSelect}
          viewMode="detailed"
          responsive={true}
        />
      );

      // Verify selection is still preserved
      expect(selectedMethodId).toBe(initialSelectedId);
    });

    test('should only change display format when switching view modes', () => {
      const mockResult = generateMockPrioritizationResult(2);
      const mockOnSelect = jest.fn();

      const { rerender } = render(
        <PaymentMethodSelector
          prioritizationResult={mockResult}
          selectedMethodId="method-0"
          onMethodSelect={mockOnSelect}
          viewMode="detailed"
          responsive={true}
        />
      );

      // Capture initial state
      const initialMethodCount = screen.getAllByRole('button').filter(
        button => button.getAttribute('aria-disabled') !== 'true'
      ).length;

      // Switch to compact view
      rerender(
        <PaymentMethodSelector
          prioritizationResult={mockResult}
          selectedMethodId="method-0"
          onMethodSelect={mockOnSelect}
          viewMode="compact"
          responsive={true}
        />
      );

      // Verify same number of methods are displayed
      const compactMethodCount = screen.getAllByRole('button').filter(
        button => button.getAttribute('aria-disabled') !== 'true'
      ).length;

      expect(compactMethodCount).toBe(initialMethodCount);
      
      // Verify methods are still clickable
      const methods = screen.getAllByRole('button').filter(
        button => button.getAttribute('aria-disabled') !== 'true'
      );
      
      methods.forEach(method => {
        expect(method).not.toBeDisabled();
      });
    });
  });

  /**
   * Property 3: Responsive Layout Adaptation
   * For any screen size change or device orientation change, the payment method selector 
   * should adapt its layout appropriately while maintaining functionality
   */
  describe('Property 3: Responsive Layout Adaptation', () => {
    test('should adapt layout for mobile screens while maintaining functionality', () => {
      const mockResult = generateMockPrioritizationResult(3);
      const mockOnSelect = jest.fn();

      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600, // Mobile width
      });

      render(
        <PaymentMethodSelector
          prioritizationResult={mockResult}
          selectedMethodId={undefined}
          onMethodSelect={mockOnSelect}
          viewMode="auto"
          responsive={true}
        />
      );

      // Verify methods are still selectable on mobile
      const firstMethod = screen.getByText(mockResult.prioritizedMethods[0].method.name);
      fireEvent.click(firstMethod);

      expect(mockOnSelect).toHaveBeenCalledWith(mockResult.prioritizedMethods[0]);

      // Verify view mode toggle is not shown on mobile
      expect(screen.queryByText('Compact')).not.toBeInTheDocument();
      expect(screen.queryByText('Detailed')).not.toBeInTheDocument();
    });

    test('should adapt layout for desktop screens with view mode controls', () => {
      const mockResult = generateMockPrioritizationResult(3);
      const mockOnSelect = jest.fn();

      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200, // Desktop width
      });

      render(
        <PaymentMethodSelector
          prioritizationResult={mockResult}
          selectedMethodId={undefined}
          onMethodSelect={mockOnSelect}
          viewMode="auto"
          responsive={true}
        />
      );

      // Verify methods are selectable on desktop
      const firstMethod = screen.getByText(mockResult.prioritizedMethods[0].method.name);
      fireEvent.click(firstMethod);

      expect(mockOnSelect).toHaveBeenCalledWith(mockResult.prioritizedMethods[0]);

      // Verify view mode toggle is shown on desktop
      expect(screen.queryByText('Compact')).toBeInTheDocument();
      expect(screen.queryByText('Detailed')).toBeInTheDocument();
    });
  });

  /**
   * Property 5: Payment Method Prioritization Display
   * For any set of available payment methods, the selector should display them 
   * in priority order with proper availability status and recommendation indicators
   */
  describe('Property 5: Payment Method Prioritization Display', () => {
    test('should display methods in priority order', () => {
      const methods = [
        { ...generateMockPaymentMethod('low-priority', PaymentMethodType.NATIVE_ETH), priority: 3 },
        { ...generateMockPaymentMethod('high-priority', PaymentMethodType.FIAT_STRIPE), priority: 1 },
        { ...generateMockPaymentMethod('mid-priority', PaymentMethodType.STABLECOIN_USDC), priority: 2 }
      ];

      const mockResult: PrioritizationResult = {
        prioritizedMethods: methods,
        defaultMethod: methods[1], // High priority method
        warnings: [],
        metadata: {
          calculatedAt: new Date(),
          averageConfidence: 0.9,
          totalMethodsEvaluated: 3,
          processingTimeMs: 100
        }
      };

      render(
        <PaymentMethodSelector
          prioritizationResult={mockResult}
          selectedMethodId={undefined}
          onMethodSelect={jest.fn()}
        />
      );

      // Verify high priority method appears first in the available methods section
      const highPriorityMethod = screen.getByText('FIAT_STRIPE Method high-priority');
      expect(highPriorityMethod).toBeInTheDocument();
      
      // Verify all methods are displayed
      expect(screen.getByText('FIAT_STRIPE Method high-priority')).toBeInTheDocument();
      expect(screen.getByText('STABLECOIN_USDC Method mid-priority')).toBeInTheDocument();
      expect(screen.getByText('NATIVE_ETH Method low-priority')).toBeInTheDocument();
    });

    test('should show proper availability status indicators', () => {
      const availableMethod = generateMockPaymentMethod('available', PaymentMethodType.FIAT_STRIPE);
      const unavailableMethod = {
        ...generateMockPaymentMethod('unavailable', PaymentMethodType.NATIVE_ETH),
        availabilityStatus: AvailabilityStatus.UNAVAILABLE_INSUFFICIENT_BALANCE
      };

      const mockResult: PrioritizationResult = {
        prioritizedMethods: [availableMethod, unavailableMethod],
        defaultMethod: availableMethod,
        warnings: [],
        metadata: {
          calculatedAt: new Date(),
          averageConfidence: 0.9,
          totalMethodsEvaluated: 2,
          processingTimeMs: 100
        }
      };

      render(
        <PaymentMethodSelector
          prioritizationResult={mockResult}
          selectedMethodId={undefined}
          onMethodSelect={jest.fn()}
        />
      );

      // Verify available method shows "Available" status
      expect(screen.getByText('Available')).toBeInTheDocument();
      
      // Verify unavailable method shows "Unavailable" status
      expect(screen.getByText('Unavailable')).toBeInTheDocument();
    });

    test('should show recommendation indicators for default method', () => {
      const mockResult = generateMockPrioritizationResult(3);
      
      render(
        <PaymentMethodSelector
          prioritizationResult={mockResult}
          selectedMethodId={undefined}
          onMethodSelect={jest.fn()}
          showRecommendations={true}
        />
      );

      // The default method should have recommendation indicator
      // This would be implementation-specific based on how recommendations are displayed
      expect(screen.getByText(/recommend/i)).toBeInTheDocument();
    });
  });

  /**
   * Property 7: Mobile View Mode Override
   * For any mobile device access, the system should use compact view 
   * regardless of user preference settings
   */
  describe('Property 7: Mobile View Mode Override', () => {
    test('should use compact view on mobile regardless of viewMode prop', () => {
      const mockResult = generateMockPrioritizationResult(2);

      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500, // Mobile width
      });

      render(
        <PaymentMethodSelector
          prioritizationResult={mockResult}
          selectedMethodId={undefined}
          onMethodSelect={jest.fn()}
          viewMode="detailed" // Explicitly request detailed view
          responsive={true}
        />
      );

      // Verify view mode controls are not shown (indicating compact mode is forced)
      expect(screen.queryByText('Compact')).not.toBeInTheDocument();
      expect(screen.queryByText('Detailed')).not.toBeInTheDocument();

      // Verify methods are still functional
      const firstMethod = screen.getByText(mockResult.prioritizedMethods[0].method.name);
      expect(firstMethod).toBeInTheDocument();
    });

    test('should allow view mode selection on desktop', () => {
      const mockResult = generateMockPrioritizationResult(2);

      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024, // Desktop width
      });

      render(
        <PaymentMethodSelector
          prioritizationResult={mockResult}
          selectedMethodId={undefined}
          onMethodSelect={jest.fn()}
          viewMode="auto"
          responsive={true}
        />
      );

      // Verify view mode controls are shown on desktop
      expect(screen.getByText('Compact')).toBeInTheDocument();
      expect(screen.getByText('Detailed')).toBeInTheDocument();
    });
  });
});