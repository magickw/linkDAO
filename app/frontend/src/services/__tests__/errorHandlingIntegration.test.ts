import { 
  enhancedGasFeeThresholdHandler,
  EnhancedGasFeeThresholdConfig,
  ENHANCED_DEFAULT_GAS_FEE_CONFIG
} from '../enhancedGasFeeThresholdHandler';

import {
  enhancedNetworkUnavailabilityHandler
} from '../enhancedNetworkUnavailabilityHandler';

import {
  enhancedPaymentMethodUnavailabilityHandler,
  EnhancedUnavailabilityReason,
  EnhancedTransactionContext
} from '../enhancedPaymentMethodUnavailabilityHandler';

import { PaymentMethod, PaymentMethodType, GasEstimate } from '../../types/paymentPrioritization';

describe('Error Handling and Fallback Mechanisms Integration', () => {
  const mockPaymentMethods: PaymentMethod[] = [
    {
      id: 'usdc-1',
      name: 'USDC',
      type: PaymentMethodType.STABLECOIN_USDC,
      isAvailable: true,
      networkId: 1
    },
    {
      id: 'stripe-1',
      name: 'Credit Card',
      type: PaymentMethodType.FIAT_STRIPE,
      isAvailable: true
    },
    {
      id: 'eth-1',
      name: 'Ethereum',
      type: PaymentMethodType.NATIVE_ETH,
      isAvailable: true,
      networkId: 1
    }
  ];

  const mockTransactionContext: EnhancedTransactionContext = {
    amount: 100,
    currency: 'USD',
    urgency: 'medium',
    userExperience: 'intermediate',
    costSensitivity: 'medium'
  };

  beforeEach(() => {
    // Reset handlers
    enhancedGasFeeThresholdHandler.clearCache();
    enhancedNetworkUnavailabilityHandler.clearAllCaches();
    enhancedPaymentMethodUnavailabilityHandler.clearOldData(0);
  });

  describe('Gas Fee Threshold Handling', () => {
    it('should handle low gas fees correctly', async () => {
      const gasEstimate: GasEstimate = {
        gasLimit: '21000',
        gasPrice: '20000000000', // 20 Gwei
        totalCostUSD: 5
      };

      const result = await enhancedGasFeeThresholdHandler.handleGasFee(
        mockPaymentMethods[2], // ETH
        gasEstimate,
        mockPaymentMethods.slice(0, 2), // USDC and Stripe alternatives
        100
      );

      expect(result.action).toBe('proceed');
      expect(result.severity).toBe('low');
      expect(result.userConfirmationRequired).toBe(false);
    });

    it('should handle high gas fees with alternatives', async () => {
      const gasEstimate: GasEstimate = {
        gasLimit: '21000',
        gasPrice: '200000000000', // 200 Gwei
        totalCostUSD: 60
      };

      const result = await enhancedGasFeeThresholdHandler.handleGasFee(
        mockPaymentMethods[2], // ETH
        gasEstimate,
        mockPaymentMethods.slice(0, 2), // USDC and Stripe alternatives
        100
      );

      expect(result.action).toBe('block_transaction');
      expect(result.severity).toBe('critical');
      expect(result.alternatives).toBeDefined();
      expect(result.alternatives!.length).toBeGreaterThan(0);
      expect(result.recommendations).toContain('Consider using a different payment method to avoid excessive fees');
    });

    it('should provide network congestion awareness', async () => {
      const gasEstimate: GasEstimate = {
        gasLimit: '21000',
        gasPrice: '150000000000', // 150 Gwei
        totalCostUSD: 35
      };

      const result = await enhancedGasFeeThresholdHandler.handleGasFee(
        mockPaymentMethods[2], // ETH
        gasEstimate,
        mockPaymentMethods.slice(0, 2),
        100,
        '1' // Ethereum mainnet
      );

      expect(result.networkCongestionLevel).toBeDefined();
      expect(result.estimatedWaitTime).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Network Unavailability Handling', () => {
    it('should suggest network switch for unsupported payment method', async () => {
      const result = await enhancedNetworkUnavailabilityHandler.handleUnsupportedNetwork(
        mockPaymentMethods[0], // USDC
        56, // BSC (not optimal for USDC)
        mockPaymentMethods.slice(1) // Stripe and ETH alternatives
      );

      expect(result.action).toBe('suggest_network_switch');
      expect(result.targetNetwork).toBeDefined();
      expect(result.targetNetworkName).toBeDefined();
      expect(result.migrationInstructions).toBeDefined();
      expect(result.severity).toBeDefined();
    });

    it('should suggest alternatives when network switch is not viable', async () => {
      const result = await enhancedNetworkUnavailabilityHandler.handleUnsupportedNetwork(
        mockPaymentMethods[2], // ETH
        56, // BSC (ETH not available)
        [mockPaymentMethods[1]] // Only Stripe available
      );

      expect(result.action).toBe('show_fiat_option');
      expect(result.alternatives).toBeDefined();
      expect(result.alternatives![0].type).toBe(PaymentMethodType.FIAT_STRIPE);
      expect(result.recommendations).toContain('Fiat payment bypasses network issues');
    });

    it('should handle network connection errors gracefully', async () => {
      const result = await enhancedNetworkUnavailabilityHandler.handleNetworkConnectionError(
        1, // Ethereum
        mockPaymentMethods
      );

      expect(result.canRetry).toBe(true);
      expect(result.alternatives).toBeDefined();
      expect(result.userMessage).toContain('connection issues');
    });
  });

  describe('Payment Method Unavailability Handling', () => {
    it('should handle insufficient balance with intelligent fallbacks', async () => {
      const reason: EnhancedUnavailabilityReason = {
        type: 'insufficient_balance',
        message: 'Insufficient USDC balance',
        details: 'Current balance: 50 USDC, Required: 100 USDC',
        severity: 'medium',
        isTemporary: false,
        suggestedActions: ['Add funds to wallet', 'Use alternative payment method']
      };

      const result = await enhancedPaymentMethodUnavailabilityHandler.handleUnavailableMethod(
        mockPaymentMethods[0], // USDC
        reason,
        mockTransactionContext,
        mockPaymentMethods.slice(1) // Stripe and ETH alternatives
      );

      expect(result.fallbackMethods).toBeDefined();
      expect(result.fallbackMethods.length).toBeGreaterThan(0);
      expect(result.fallbackMethods[0].type).toBe(PaymentMethodType.FIAT_STRIPE); // Should prioritize fiat
      expect(result.actionRequired).toBeDefined();
      expect(result.actionRequired![0].type).toBe('add_funds');
      expect(result.canProceedWithoutAction).toBe(true);
      expect(result.userGuidance).toBeDefined();
    });

    it('should handle network errors with fiat prioritization', async () => {
      const reason: EnhancedUnavailabilityReason = {
        type: 'network_error',
        message: 'Unable to connect to Ethereum network',
        severity: 'medium',
        isTemporary: true,
        suggestedActions: ['Check internet connection', 'Try again later']
      };

      const result = await enhancedPaymentMethodUnavailabilityHandler.handleUnavailableMethod(
        mockPaymentMethods[2], // ETH
        reason,
        mockTransactionContext,
        mockPaymentMethods.slice(0, 2) // USDC and Stripe alternatives
      );

      expect(result.fallbackMethods[0].type).toBe(PaymentMethodType.FIAT_STRIPE);
      expect(result.retryStrategy).toBeDefined();
      expect(result.retryStrategy!.canRetry).toBe(true);
      expect(result.retryStrategy!.autoRetry).toBe(true);
      expect(result.alternativeStrategies).toBeDefined();
      expect(result.alternativeStrategies.length).toBeGreaterThan(0);
    });

    it('should handle critical errors with escalated support', async () => {
      const reason: EnhancedUnavailabilityReason = {
        type: 'validation_failed',
        message: 'Critical validation error',
        details: 'Smart contract validation failed',
        errorCode: 'CRITICAL_001',
        severity: 'critical',
        isTemporary: false,
        suggestedActions: ['Contact technical support']
      };

      const result = await enhancedPaymentMethodUnavailabilityHandler.handleUnavailableMethod(
        mockPaymentMethods[0], // USDC
        reason,
        mockTransactionContext,
        mockPaymentMethods.slice(1)
      );

      expect(result.severity).toBe('critical');
      expect(result.actionRequired).toBeDefined();
      expect(result.actionRequired![0].type).toBe('contact_support');
      expect(result.actionRequired![0].priority).toBe('high');
      expect(result.technicalMessage).toContain('CRITICAL_001');
      expect(result.estimatedResolutionTime).toBe(1800); // 30 minutes for critical issues
    });

    it('should provide context-aware guidance for beginners', async () => {
      const beginnerContext: EnhancedTransactionContext = {
        ...mockTransactionContext,
        userExperience: 'beginner'
      };

      const reason: EnhancedUnavailabilityReason = {
        type: 'wallet_disconnected',
        message: 'Wallet connection lost',
        severity: 'low',
        isTemporary: true,
        suggestedActions: ['Reconnect wallet']
      };

      const result = await enhancedPaymentMethodUnavailabilityHandler.handleUnavailableMethod(
        mockPaymentMethods[0], // USDC
        reason,
        beginnerContext,
        mockPaymentMethods.slice(1)
      );

      expect(result.userGuidance.stepByStepInstructions).toBeDefined();
      expect(result.userGuidance.stepByStepInstructions!.length).toBeGreaterThan(0);
      expect(result.fallbackMethods[0].type).toBe(PaymentMethodType.FIAT_STRIPE); // Should prioritize simpler methods for beginners
    });

    it('should handle urgent transactions with fast fallbacks', async () => {
      const urgentContext: EnhancedTransactionContext = {
        ...mockTransactionContext,
        urgency: 'high'
      };

      const reason: EnhancedUnavailabilityReason = {
        type: 'service_unavailable',
        message: 'Service temporarily unavailable',
        severity: 'medium',
        isTemporary: true,
        suggestedActions: ['Try alternative payment method']
      };

      const result = await enhancedPaymentMethodUnavailabilityHandler.handleUnavailableMethod(
        mockPaymentMethods[0], // USDC
        reason,
        urgentContext,
        mockPaymentMethods.slice(1)
      );

      expect(result.fallbackMethods[0].type).toBe(PaymentMethodType.FIAT_STRIPE); // Should prioritize fastest method
      expect(result.retryStrategy?.retryAfter).toBeLessThan(60); // Faster retry for urgent transactions
      expect(result.alternativeStrategies[0].type).toBe('immediate_fallback');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle cascading failures gracefully', async () => {
      // Simulate multiple payment method failures
      const failures = [
        {
          method: mockPaymentMethods[2], // ETH
          reason: {
            type: 'network_error' as const,
            message: 'Network connection failed',
            severity: 'medium' as const,
            isTemporary: true,
            suggestedActions: ['Check connection']
          }
        },
        {
          method: mockPaymentMethods[0], // USDC
          reason: {
            type: 'insufficient_balance' as const,
            message: 'Insufficient balance',
            severity: 'medium' as const,
            isTemporary: false,
            suggestedActions: ['Add funds']
          }
        }
      ];

      const results = await Promise.all(
        failures.map(({ method, reason }) =>
          enhancedPaymentMethodUnavailabilityHandler.handleUnavailableMethod(
            method,
            reason,
            mockTransactionContext,
            mockPaymentMethods.filter(m => m.id !== method.id)
          )
        )
      );

      // Both should recommend fiat as the final fallback
      results.forEach(result => {
        expect(result.fallbackMethods.some(m => m.type === PaymentMethodType.FIAT_STRIPE)).toBe(true);
      });
    });

    it('should provide comprehensive error recovery workflow', async () => {
      const reason: EnhancedUnavailabilityReason = {
        type: 'gas_estimation_failed',
        message: 'Unable to estimate gas',
        severity: 'low',
        isTemporary: true,
        suggestedActions: ['Retry with higher gas limit', 'Refresh page']
      };

      const result = await enhancedPaymentMethodUnavailabilityHandler.handleUnavailableMethod(
        mockPaymentMethods[2], // ETH
        reason,
        mockTransactionContext,
        mockPaymentMethods.slice(0, 2)
      );

      // Should provide multiple recovery strategies
      expect(result.alternativeStrategies.length).toBeGreaterThan(1);
      expect(result.alternativeStrategies.some(s => s.type === 'immediate_fallback')).toBe(true);
      expect(result.alternativeStrategies.some(s => s.type === 'parameter_adjustment')).toBe(true);
      
      // Should have actionable user guidance
      expect(result.userGuidance.troubleshootingTips.length).toBeGreaterThan(0);
      expect(result.userGuidance.preventionTips.length).toBeGreaterThan(0);
      
      // Should support auto-retry
      expect(result.retryStrategy?.autoRetry).toBe(true);
      expect(result.retryStrategy?.retryWithDifferentParams).toBe(true);
    });
  });

  describe('Configuration and Customization', () => {
    it('should allow gas fee threshold customization', () => {
      const customConfig: EnhancedGasFeeThresholdConfig = {
        ...ENHANCED_DEFAULT_GAS_FEE_CONFIG,
        warningThreshold: 5,
        blockingThreshold: 25,
        dynamicThresholdEnabled: false
      };

      enhancedGasFeeThresholdHandler.updateConfig(customConfig);
      const updatedConfig = enhancedGasFeeThresholdHandler.getConfig();

      expect(updatedConfig.warningThreshold).toBe(5);
      expect(updatedConfig.blockingThreshold).toBe(25);
      expect(updatedConfig.dynamicThresholdEnabled).toBe(false);
    });

    it('should track failure patterns for learning', () => {
      const method = mockPaymentMethods[0];
      const reason: EnhancedUnavailabilityReason = {
        type: 'network_error',
        message: 'Test failure',
        severity: 'medium',
        isTemporary: true,
        suggestedActions: []
      };

      // Record multiple failures
      enhancedPaymentMethodUnavailabilityHandler.recordRetryAttempt(method, reason);
      enhancedPaymentMethodUnavailabilityHandler.recordRetryAttempt(method, reason);

      const patterns = enhancedPaymentMethodUnavailabilityHandler.getFailurePatterns(method);
      expect(patterns.length).toBeGreaterThan(0);
    });
  });
});