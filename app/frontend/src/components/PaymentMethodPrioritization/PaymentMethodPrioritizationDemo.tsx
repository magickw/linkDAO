/**
 * Payment Method Prioritization Demo Component
 * Comprehensive demo showcasing all payment method prioritization UI components
 */

import React, { useState, useEffect } from 'react';
import {
  PaymentMethodCard,
  PaymentMethodSelector,
  CostComparisonTable,
  GasFeeWarning,
  UserPreferenceIndicator,
  PreferenceLearningFeedback
} from './index';
import {
  PrioritizedPaymentMethod,
  PaymentMethodType,
  PrioritizationResult,
  UserPreferences,
  AvailabilityStatus,
  PrioritizationRecommendation,
  PrioritizationWarning
} from '../../types/paymentPrioritization';

const PaymentMethodPrioritizationDemo: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<PrioritizedPaymentMethod | null>(null);
  const [viewMode, setViewMode] = useState<'selector' | 'comparison' | 'individual'>('selector');
  const [showWarnings, setShowWarnings] = useState(true);
  const [showPreferences, setShowPreferences] = useState(true);

  // Mock data for demonstration
  const mockPrioritizationResult: PrioritizationResult = {
    prioritizedMethods: [
      {
        method: {
          id: 'usdc-polygon',
          type: PaymentMethodType.STABLECOIN_USDC,
          name: 'USDC (Polygon)',
          description: 'USD Coin on Polygon - stable value with low gas fees',
          chainId: 137,
          icon: '/icons/usdc.svg',
          enabled: true,
          supportedNetworks: [137]
        },
        priority: 1,
        costEstimate: {
          totalCost: 102.15,
          baseCost: 100.00,
          gasFee: 2.15,
          estimatedTime: 3,
          confidence: 0.95,
          currency: 'USD',
          breakdown: {
            amount: 100.00,
            gasLimit: BigInt(21000),
            gasPrice: BigInt(30000000000),
            networkFee: 2.15,
            platformFee: 0
          }
        },
        availabilityStatus: AvailabilityStatus.AVAILABLE,
        userPreferenceScore: 0.85,
        recommendationReason: 'Recommended: Low gas fees and stable value',
        totalScore: 0.92,
        benefits: ['Price stability', 'Low gas fees', 'Fast confirmation'],
        warnings: []
      },
      {
        method: {
          id: 'fiat-stripe',
          type: PaymentMethodType.FIAT_STRIPE,
          name: 'Credit/Debit Card',
          description: 'Traditional payment with Stripe - no gas fees, familiar experience',
          icon: '/icons/credit-card.svg',
          enabled: true,
          supportedNetworks: []
        },
        priority: 2,
        costEstimate: {
          totalCost: 103.50,
          baseCost: 100.00,
          gasFee: 0,
          estimatedTime: 1,
          confidence: 0.99,
          currency: 'USD',
          breakdown: {
            amount: 100.00,
            platformFee: 3.50
          }
        },
        availabilityStatus: AvailabilityStatus.AVAILABLE,
        userPreferenceScore: 0.65,
        recommendationReason: 'No gas fees and familiar payment experience',
        totalScore: 0.88,
        benefits: ['No gas fees', 'Familiar payment flow', 'Buyer protection'],
        warnings: []
      },
      {
        method: {
          id: 'usdt-mainnet',
          type: PaymentMethodType.STABLECOIN_USDT,
          name: 'USDT (Ethereum)',
          description: 'Tether USD on Ethereum mainnet - widely accepted stablecoin',
          chainId: 1,
          icon: '/icons/usdt.svg',
          enabled: true,
          supportedNetworks: [1]
        },
        priority: 3,
        costEstimate: {
          totalCost: 135.80,
          baseCost: 100.00,
          gasFee: 35.80,
          estimatedTime: 12,
          confidence: 0.78,
          currency: 'USD',
          breakdown: {
            amount: 100.00,
            gasLimit: BigInt(65000),
            gasPrice: BigInt(45000000000),
            networkFee: 35.80
          }
        },
        availabilityStatus: AvailabilityStatus.AVAILABLE,
        userPreferenceScore: 0.45,
        recommendationReason: 'Available but high gas fees - consider alternatives',
        totalScore: 0.65,
        benefits: ['Widely accepted', 'Stable value'],
        warnings: ['High gas fees: $35.80', 'Network congestion']
      },
      {
        method: {
          id: 'eth-mainnet',
          type: PaymentMethodType.NATIVE_ETH,
          name: 'ETH (Ethereum)',
          description: 'Native Ethereum token - widely accepted but variable gas costs',
          chainId: 1,
          icon: '/icons/eth.svg',
          enabled: true,
          supportedNetworks: [1]
        },
        priority: 4,
        costEstimate: {
          totalCost: 142.30,
          baseCost: 100.00,
          gasFee: 42.30,
          estimatedTime: 15,
          confidence: 0.72,
          currency: 'USD',
          breakdown: {
            amount: 100.00,
            gasLimit: BigInt(21000),
            gasPrice: BigInt(55000000000),
            networkFee: 42.30
          }
        },
        availabilityStatus: AvailabilityStatus.UNAVAILABLE_HIGH_GAS_FEES,
        userPreferenceScore: 0.30,
        recommendationReason: 'Unavailable: Gas fees exceed acceptable threshold',
        totalScore: 0.45,
        benefits: ['Native token', 'Broad acceptance'],
        warnings: ['Very high gas fees: $42.30', 'Cost exceeds threshold']
      }
    ],
    defaultMethod: null, // Will be set to first available method
    recommendations: [
      {
        type: 'cost_savings',
        message: 'Save $33.65 by using USDC (Polygon) instead of USDT (Ethereum)',
        suggestedMethod: PaymentMethodType.STABLECOIN_USDC,
        potentialSavings: 33.65
      },
      {
        type: 'convenience',
        message: 'USDC prioritized for stable value and predictable costs',
        suggestedMethod: PaymentMethodType.STABLECOIN_USDC
      }
    ],
    warnings: [
      {
        type: 'high_gas_fees',
        message: 'Gas fees are currently high on Ethereum mainnet',
        affectedMethods: [PaymentMethodType.STABLECOIN_USDT, PaymentMethodType.NATIVE_ETH],
        severity: 'high',
        actionRequired: 'Consider using Polygon network or fiat payment'
      }
    ],
    metadata: {
      calculatedAt: new Date(),
      totalMethodsEvaluated: 4,
      averageConfidence: 0.86,
      processingTimeMs: 245
    }
  };

  // Set default method
  mockPrioritizationResult.defaultMethod = mockPrioritizationResult.prioritizedMethods.find(
    method => method.availabilityStatus === AvailabilityStatus.AVAILABLE
  ) ?? null;

  const mockUserPreferences: UserPreferences = {
    preferredMethods: [
      {
        methodType: PaymentMethodType.STABLECOIN_USDC,
        score: 0.85,
        usageCount: 12,
        lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        averageTransactionAmount: 150.00
      },
      {
        methodType: PaymentMethodType.FIAT_STRIPE,
        score: 0.65,
        usageCount: 8,
        lastUsed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
        averageTransactionAmount: 75.00
      },
      {
        methodType: PaymentMethodType.STABLECOIN_USDT,
        score: 0.45,
        usageCount: 3,
        lastUsed: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 1 month ago
        averageTransactionAmount: 200.00
      }
    ],
    avoidedMethods: [],
    maxGasFeeThreshold: 25,
    preferStablecoins: true,
    preferFiat: false,
    lastUsedMethods: [
      {
        methodType: PaymentMethodType.STABLECOIN_USDC,
        usedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        transactionAmount: 120.00,
        chainId: 137,
        successful: true
      },
      {
        methodType: PaymentMethodType.FIAT_STRIPE,
        usedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        transactionAmount: 85.00,
        successful: true
      }
    ],
    autoSelectBestOption: true
  };

  useEffect(() => {
    if (mockPrioritizationResult.defaultMethod && !selectedMethod) {
      setSelectedMethod(mockPrioritizationResult.defaultMethod);
    }
  }, [mockPrioritizationResult.defaultMethod, selectedMethod]);

  const handleMethodSelect = (method: PrioritizedPaymentMethod) => {
    setSelectedMethod(method);
  };

  const handlePreferenceUpdate = (methodType: PaymentMethodType, action: 'prefer' | 'avoid') => {
    console.log(`User ${action}s ${methodType}`);
    // In a real implementation, this would update user preferences
  };

  const handleFeedback = (methodType: PaymentMethodType, feedback: 'helpful' | 'not_helpful', reason?: string) => {
    console.log(`User feedback for ${methodType}: ${feedback}`, reason);
    // In a real implementation, this would be sent to analytics
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Payment Method Prioritization Demo
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Intelligent payment method ordering with cost estimates, user preferences, and real-time recommendations
        </p>

        {/* View Mode Toggle */}
        <div className="flex justify-center space-x-2 mb-8">
          <button
            onClick={() => setViewMode('selector')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'selector'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Payment Selector
          </button>
          <button
            onClick={() => setViewMode('comparison')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'comparison'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Cost Comparison
          </button>
          <button
            onClick={() => setViewMode('individual')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'individual'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Individual Cards
          </button>
        </div>

        {/* Options */}
        <div className="flex justify-center space-x-4 mb-8">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showWarnings}
              onChange={(e) => setShowWarnings(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Show Warnings</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showPreferences}
              onChange={(e) => setShowPreferences(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Show Preferences</span>
          </label>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'selector' && (
        <div className="space-y-8">
          <PaymentMethodSelector
            prioritizationResult={mockPrioritizationResult}
            selectedMethodId={selectedMethod?.method.id}
            onMethodSelect={handleMethodSelect}
            showCostBreakdown={true}
            showRecommendations={true}
            showWarnings={showWarnings}
            layout="grid"
            responsive={true}
          />

          {/* Gas Fee Warning */}
          {showWarnings && selectedMethod && selectedMethod.costEstimate.gasFee > 25 && (
            <GasFeeWarning
              paymentMethods={mockPrioritizationResult.prioritizedMethods}
              selectedMethod={selectedMethod}
              gasFeeThreshold={25}
              onAlternativeSelect={handleMethodSelect}
            />
          )}

          {/* Preference Learning Feedback */}
          {showPreferences && (
            <PreferenceLearningFeedback
              paymentMethods={mockPrioritizationResult.prioritizedMethods}
              userPreferences={mockUserPreferences}
              recommendations={mockPrioritizationResult.recommendations}
              selectedMethod={selectedMethod || undefined}
              onFeedback={handleFeedback}
              showLearningInsights={true}
            />
          )}
        </div>
      )}

      {viewMode === 'comparison' && (
        <div className="space-y-8">
          <CostComparisonTable
            paymentMethods={mockPrioritizationResult.prioritizedMethods}
            selectedMethodId={selectedMethod?.method.id}
            onMethodSelect={handleMethodSelect}
            showGasFeeWarnings={showWarnings}
            showSavingsCalculation={true}
          />

          {/* Gas Fee Warning */}
          {showWarnings && selectedMethod && selectedMethod.costEstimate.gasFee > 25 && (
            <GasFeeWarning
              paymentMethods={mockPrioritizationResult.prioritizedMethods}
              selectedMethod={selectedMethod}
              gasFeeThreshold={25}
              onAlternativeSelect={handleMethodSelect}
            />
          )}
        </div>
      )}

      {viewMode === 'individual' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mockPrioritizationResult.prioritizedMethods.map((method) => (
              <div key={method.method.id} className="space-y-4">
                <PaymentMethodCard
                  paymentMethod={method}
                  isSelected={selectedMethod?.method.id === method.method.id}
                  isRecommended={method.priority === 1}
                  onSelect={handleMethodSelect}
                  showCostBreakdown={true}
                />

                {/* User Preference Indicator */}
                {showPreferences && (
                  <UserPreferenceIndicator
                    paymentMethod={method}
                    userPreferences={mockUserPreferences}
                    showPreferenceDetails={true}
                    showRecommendationReason={true}
                    showCostSavings={true}
                    onPreferenceUpdate={handlePreferenceUpdate}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Gas Fee Warning */}
          {showWarnings && selectedMethod && selectedMethod.costEstimate.gasFee > 25 && (
            <GasFeeWarning
              paymentMethods={mockPrioritizationResult.prioritizedMethods}
              selectedMethod={selectedMethod}
              gasFeeThreshold={25}
              onAlternativeSelect={handleMethodSelect}
            />
          )}
        </div>
      )}

      {/* Selected Method Summary */}
      {selectedMethod && (
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            Selected Payment Method
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-blue-700 font-medium">Method:</span>
              <div className="text-blue-900 font-semibold">
                {selectedMethod.method.name}
              </div>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Total Cost:</span>
              <div className="text-blue-900 font-semibold">
                ${selectedMethod.costEstimate.totalCost.toFixed(2)}
              </div>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Priority:</span>
              <div className="text-blue-900 font-semibold">
                #{selectedMethod.priority}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-blue-700 font-medium">Reason:</span>
            <div className="text-blue-900">
              {selectedMethod.recommendationReason}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodPrioritizationDemo;