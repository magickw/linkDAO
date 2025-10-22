/**
 * Payment Method Prioritization Core Logic Tests
 * Tests core prioritization algorithms, cost calculation accuracy,
 * and user preference learning mechanisms
 * Requirements: 1.1, 4.1, 5.1
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Core prioritization logic functions for testing
class PaymentMethodPrioritizationCore {
  /**
   * Calculate cost score based on cost ratio
   * Lower cost = higher score
   */
  calculateCostScore(totalCost: number, transactionAmount: number): number {
    if (transactionAmount <= 0) return 0;

    const costRatio = totalCost / transactionAmount;
    
    // Progressive scoring based on cost ratio
    if (costRatio <= 1.005) return 1.0;      // Less than 0.5% cost - excellent
    if (costRatio <= 1.01) return 0.95;      // Less than 1% cost - very good
    if (costRatio <= 1.02) return 0.85;      // Less than 2% cost - good
    if (costRatio <= 1.03) return 0.75;      // Less than 3% cost - acceptable
    if (costRatio <= 1.05) return 0.60;      // Less than 5% cost - moderate
    if (costRatio <= 1.10) return 0.40;      // Less than 10% cost - high
    if (costRatio <= 1.15) return 0.25;      // Less than 15% cost - very high
    if (costRatio <= 1.20) return 0.15;      // Less than 20% cost - excessive
    
    return 0.05; // More than 20% cost - prohibitive
  }

  /**
   * Calculate user preference score with time decay
   */
  calculatePreferenceScore(
    methodType: string,
    preferences: {
      preferredMethods: Array<{
        methodType: string;
        score: number;
        lastUsed: Date;
        usageCount: number;
      }>;
      avoidedMethods: string[];
      preferStablecoins: boolean;
      preferFiat: boolean;
    }
  ): number {
    // Check if method is explicitly avoided
    if (preferences.avoidedMethods.includes(methodType)) {
      return 0.1; // Very low score for avoided methods
    }

    // Find specific preference for this method
    const methodPreference = preferences.preferredMethods.find(
      pref => pref.methodType === methodType
    );

    if (methodPreference) {
      // Apply time decay to preference score
      const daysSinceLastUse = this.getDaysSince(methodPreference.lastUsed);
      const decayFactor = Math.max(0.3, 1 - (daysSinceLastUse / 30)); // 30-day decay
      
      return methodPreference.score * decayFactor;
    }

    // Apply general preferences for method types
    if (methodType === 'STABLECOIN_USDC' || methodType === 'STABLECOIN_USDT') {
      return preferences.preferStablecoins ? 0.8 : 0.6;
    }

    if (methodType === 'FIAT_STRIPE') {
      return preferences.preferFiat ? 0.9 : 0.7;
    }

    // Default neutral score for other methods
    return 0.5;
  }

  /**
   * Calculate availability score based on balance and network conditions
   */
  calculateAvailabilityScore(
    method: {
      type: string;
      chainId?: number;
      token?: { address: string; symbol: string; chainId: number };
    },
    context: {
      chainId: number;
      transactionAmount: number;
      walletBalances: Array<{
        token: { address: string; symbol: string; chainId: number };
        balanceUSD: number;
        chainId: number;
      }>;
    },
    gasFee: number
  ): number {
    // Fiat payments are always available
    if (method.type === 'FIAT_STRIPE') {
      return 1.0;
    }

    // Check network compatibility
    if (method.chainId && method.chainId !== context.chainId) {
      return 0.2; // Low score for wrong network
    }

    // Check user balance for crypto methods
    if (method.token) {
      const balance = context.walletBalances.find(
        b => b.token.address.toLowerCase() === method.token!.address.toLowerCase() &&
             b.chainId === context.chainId
      );

      if (!balance) {
        return 0.1; // Very low score for no balance
      }

      const requiredAmount = context.transactionAmount + gasFee;
      if (balance.balanceUSD < requiredAmount) {
        const availableRatio = balance.balanceUSD / requiredAmount;
        return Math.max(0.1, availableRatio * 0.5); // Partial availability score
      }
    }

    return 1.0; // Fully available
  }

  /**
   * Calculate stablecoin bonus
   */
  calculateStablecoinBonus(methodType: string, gasFee: number, confidence: number): number {
    if (methodType !== 'STABLECOIN_USDC' && methodType !== 'STABLECOIN_USDT') {
      return 0;
    }

    // Base stablecoin bonus
    let bonus = 0.15; // 15% bonus

    // Additional bonus for low gas fees
    if (gasFee < 5) {
      bonus += 0.05; // 5% additional bonus for very low gas fees
    }

    // Additional bonus for high confidence estimates
    if (confidence > 0.8) {
      bonus += 0.03; // 3% additional bonus for high confidence
    }

    return bonus;
  }

  /**
   * Calculate network optimization score
   */
  calculateNetworkOptimizationScore(
    methodType: string,
    networkCongestion: 'low' | 'medium' | 'high',
    blockTime: number
  ): number {
    if (methodType === 'FIAT_STRIPE') {
      return 1.0; // Fiat doesn't depend on network conditions
    }

    // Score based on network congestion (lower congestion = higher score)
    let networkScore = 0.5;
    switch (networkCongestion) {
      case 'low':
        networkScore = 1.0;
        break;
      case 'medium':
        networkScore = 0.7;
        break;
      case 'high':
        networkScore = 0.3;
        break;
    }

    // Adjust based on block time (faster = better)
    if (blockTime < 5) {
      networkScore += 0.1; // Bonus for fast networks
    } else if (blockTime > 30) {
      networkScore -= 0.1; // Penalty for slow networks
    }

    return Math.max(0, Math.min(1, networkScore));
  }

  /**
   * Combine all scores into total score
   */
  calculateTotalScore(
    costScore: number,
    preferenceScore: number,
    availabilityScore: number,
    stablecoinBonus: number,
    networkOptimizationScore: number,
    weights: {
      costWeight: number;
      preferenceWeight: number;
      availabilityWeight: number;
      networkWeight: number;
    } = {
      costWeight: 0.4,
      preferenceWeight: 0.3,
      availabilityWeight: 0.2,
      networkWeight: 0.1
    }
  ): number {
    // Apply weighted scoring
    const weightedScore = 
      (costScore * weights.costWeight) +
      (preferenceScore * weights.preferenceWeight) +
      (availabilityScore * weights.availabilityWeight) +
      (networkOptimizationScore * weights.networkWeight);

    // Add stablecoin bonus
    const totalScore = weightedScore + stablecoinBonus;

    // Normalize to valid range
    return Math.max(0, Math.min(1, totalScore));
  }

  /**
   * Prioritize payment methods based on scores
   */
  prioritizePaymentMethods(
    methods: Array<{
      id: string;
      type: string;
      name: string;
      chainId?: number;
      token?: { address: string; symbol: string; chainId: number };
    }>,
    context: {
      chainId: number;
      transactionAmount: number;
      walletBalances: Array<{
        token: { address: string; symbol: string; chainId: number };
        balanceUSD: number;
        chainId: number;
      }>;
      preferences: {
        preferredMethods: Array<{
          methodType: string;
          score: number;
          lastUsed: Date;
          usageCount: number;
        }>;
        avoidedMethods: string[];
        preferStablecoins: boolean;
        preferFiat: boolean;
      };
      marketConditions: {
        networkCongestion: 'low' | 'medium' | 'high';
        blockTime: number;
      };
    },
    costEstimates: Record<string, { totalCost: number; gasFee: number; confidence: number }>
  ) {
    const scoredMethods = methods.map(method => {
      const costEstimate = costEstimates[method.id] || { totalCost: context.transactionAmount * 1.1, gasFee: 10, confidence: 0.5 };
      
      const costScore = this.calculateCostScore(costEstimate.totalCost, context.transactionAmount);
      const preferenceScore = this.calculatePreferenceScore(method.type, context.preferences);
      const availabilityScore = this.calculateAvailabilityScore(method, context, costEstimate.gasFee);
      const stablecoinBonus = this.calculateStablecoinBonus(method.type, costEstimate.gasFee, costEstimate.confidence);
      const networkOptimizationScore = this.calculateNetworkOptimizationScore(
        method.type,
        context.marketConditions.networkCongestion,
        context.marketConditions.blockTime
      );

      const totalScore = this.calculateTotalScore(
        costScore,
        preferenceScore,
        availabilityScore,
        stablecoinBonus,
        networkOptimizationScore
      );

      return {
        method,
        costScore,
        preferenceScore,
        availabilityScore,
        stablecoinBonus,
        networkOptimizationScore,
        totalScore,
        costEstimate
      };
    });

    // Sort by total score (descending) and assign priorities
    return scoredMethods
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((scored, index) => ({
        ...scored,
        priority: index + 1
      }));
  }

  private getDaysSince(date: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

describe('Payment Method Prioritization Core Logic Tests', () => {
  let prioritizationCore: PaymentMethodPrioritizationCore;

  // Test data
  const testMethods = [
    {
      id: 'usdc-ethereum',
      type: 'STABLECOIN_USDC',
      name: 'USDC (Ethereum)',
      chainId: 1,
      token: { address: '0xA0b86a33E6441e6e80D0c4C6C7527d72', symbol: 'USDC', chainId: 1 }
    },
    {
      id: 'fiat-stripe',
      type: 'FIAT_STRIPE',
      name: 'Credit/Debit Card'
    },
    {
      id: 'eth-ethereum',
      type: 'NATIVE_ETH',
      name: 'Ethereum',
      chainId: 1,
      token: { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', chainId: 1 }
    }
  ];

  const testContext = {
    chainId: 1,
    transactionAmount: 100,
    walletBalances: [
      {
        token: { address: '0xA0b86a33E6441e6e80D0c4C6C7527d72', symbol: 'USDC', chainId: 1 },
        balanceUSD: 1000,
        chainId: 1
      },
      {
        token: { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', chainId: 1 },
        balanceUSD: 2000,
        chainId: 1
      }
    ],
    preferences: {
      preferredMethods: [
        {
          methodType: 'STABLECOIN_USDC',
          score: 0.9,
          lastUsed: new Date(Date.now() - 86400000), // 1 day ago
          usageCount: 5
        }
      ],
      avoidedMethods: [],
      preferStablecoins: true,
      preferFiat: false
    },
    marketConditions: {
      networkCongestion: 'low' as const,
      blockTime: 12
    }
  };

  const testCostEstimates = {
    'usdc-ethereum': { totalCost: 105, gasFee: 5, confidence: 0.9 },
    'fiat-stripe': { totalCost: 103, gasFee: 0, confidence: 1.0 },
    'eth-ethereum': { totalCost: 125, gasFee: 25, confidence: 0.8 }
  };

  beforeEach(() => {
    prioritizationCore = new PaymentMethodPrioritizationCore();
  });

  describe('Cost Score Calculation', () => {
    it('should calculate correct cost scores for different cost ratios', () => {
      const baseAmount = 1000;

      // Test different cost scenarios
      const testCases = [
        { totalCost: 1005, expectedScore: 1.0 },   // 0.5% cost
        { totalCost: 1010, expectedScore: 0.95 },  // 1% cost
        { totalCost: 1050, expectedScore: 0.60 },  // 5% cost
        { totalCost: 1100, expectedScore: 0.40 },  // 10% cost
        { totalCost: 1200, expectedScore: 0.15 }   // 20% cost
      ];

      testCases.forEach(testCase => {
        const score = prioritizationCore.calculateCostScore(testCase.totalCost, baseAmount);
        expect(score).toBe(testCase.expectedScore);
      });
    });

    it('should handle edge cases in cost calculation', () => {
      // Test zero transaction amount
      const zeroAmountScore = prioritizationCore.calculateCostScore(100, 0);
      expect(zeroAmountScore).toBe(0);

      // Test very high cost ratio
      const highCostScore = prioritizationCore.calculateCostScore(500, 100);
      expect(highCostScore).toBe(0.05); // Should be very low
    });
  });

  describe('User Preference Score Calculation', () => {
    it('should apply user preferences correctly', () => {
      const preferences = {
        preferredMethods: [
          {
            methodType: 'STABLECOIN_USDC',
            score: 0.9,
            lastUsed: new Date(),
            usageCount: 5
          }
        ],
        avoidedMethods: [],
        preferStablecoins: true,
        preferFiat: false
      };

      const usdcScore = prioritizationCore.calculatePreferenceScore('STABLECOIN_USDC', preferences);
      expect(usdcScore).toBe(0.9);

      const fiatScore = prioritizationCore.calculatePreferenceScore('FIAT_STRIPE', preferences);
      expect(fiatScore).toBe(0.7); // Default for fiat when not preferred
    });

    it('should apply time decay to preference scores', () => {
      const recentPreferences = {
        preferredMethods: [
          {
            methodType: 'STABLECOIN_USDC',
            score: 0.9,
            lastUsed: new Date(), // Just used
            usageCount: 5
          }
        ],
        avoidedMethods: [],
        preferStablecoins: true,
        preferFiat: false
      };

      const oldPreferences = {
        preferredMethods: [
          {
            methodType: 'STABLECOIN_USDC',
            score: 0.9,
            lastUsed: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            usageCount: 5
          }
        ],
        avoidedMethods: [],
        preferStablecoins: true,
        preferFiat: false
      };

      const recentScore = prioritizationCore.calculatePreferenceScore('STABLECOIN_USDC', recentPreferences);
      const oldScore = prioritizationCore.calculatePreferenceScore('STABLECOIN_USDC', oldPreferences);

      expect(recentScore).toBeGreaterThan(oldScore);
      expect(oldScore).toBeGreaterThanOrEqual(0.27); // 0.9 * 0.3 (minimum decay factor)
    });

    it('should handle avoided methods correctly', () => {
      const preferences = {
        preferredMethods: [],
        avoidedMethods: ['NATIVE_ETH'],
        preferStablecoins: true,
        preferFiat: false
      };

      const ethScore = prioritizationCore.calculatePreferenceScore('NATIVE_ETH', preferences);
      expect(ethScore).toBe(0.1); // Very low for avoided methods
    });
  });

  describe('Availability Score Calculation', () => {
    it('should give fiat payments full availability', () => {
      const fiatMethod = { type: 'FIAT_STRIPE' };
      const score = prioritizationCore.calculateAvailabilityScore(fiatMethod, testContext, 0);
      expect(score).toBe(1.0);
    });

    it('should handle insufficient balance scenarios', () => {
      const method = {
        type: 'STABLECOIN_USDC',
        chainId: 1,
        token: { address: '0xA0b86a33E6441e6e80D0c4C6C7527d72', symbol: 'USDC', chainId: 1 }
      };

      const contextWithLowBalance = {
        ...testContext,
        walletBalances: [
          {
            token: { address: '0xA0b86a33E6441e6e80D0c4C6C7527d72', symbol: 'USDC', chainId: 1 },
            balanceUSD: 50, // Only 50 USD, need 100 + gas
            chainId: 1
          }
        ]
      };

      const score = prioritizationCore.calculateAvailabilityScore(method, contextWithLowBalance, 5);
      expect(score).toBeLessThan(0.5); // Should be low due to insufficient balance
    });

    it('should handle wrong network scenarios', () => {
      const method = {
        type: 'STABLECOIN_USDC',
        chainId: 137, // Polygon
        token: { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', chainId: 137 }
      };

      const score = prioritizationCore.calculateAvailabilityScore(method, testContext, 5);
      expect(score).toBe(0.2); // Low score for wrong network
    });
  });

  describe('Stablecoin Bonus Calculation', () => {
    it('should apply stablecoin bonus correctly', () => {
      const usdcBonus = prioritizationCore.calculateStablecoinBonus('STABLECOIN_USDC', 3, 0.9);
      expect(usdcBonus).toBeGreaterThan(0.15); // Base bonus + low gas + high confidence

      const ethBonus = prioritizationCore.calculateStablecoinBonus('NATIVE_ETH', 3, 0.9);
      expect(ethBonus).toBe(0); // No bonus for non-stablecoins
    });

    it('should apply additional bonuses for optimal conditions', () => {
      const lowGasHighConfidenceBonus = prioritizationCore.calculateStablecoinBonus('STABLECOIN_USDC', 3, 0.9);
      const highGasLowConfidenceBonus = prioritizationCore.calculateStablecoinBonus('STABLECOIN_USDC', 10, 0.5);

      expect(lowGasHighConfidenceBonus).toBeGreaterThan(highGasLowConfidenceBonus);
    });
  });

  describe('Network Optimization Score Calculation', () => {
    it('should score network conditions correctly', () => {
      const lowCongestionScore = prioritizationCore.calculateNetworkOptimizationScore('STABLECOIN_USDC', 'low', 5);
      const highCongestionScore = prioritizationCore.calculateNetworkOptimizationScore('STABLECOIN_USDC', 'high', 60);

      expect(lowCongestionScore).toBeGreaterThan(highCongestionScore);
      expect(lowCongestionScore).toBeGreaterThanOrEqual(1.0); // Should get bonus for fast blocks
    });

    it('should give fiat payments optimal network scores', () => {
      const fiatScore = prioritizationCore.calculateNetworkOptimizationScore('FIAT_STRIPE', 'high', 60);
      expect(fiatScore).toBe(1.0); // Always optimal for fiat
    });
  });

  describe('Total Score Calculation', () => {
    it('should combine scores correctly with weights', () => {
      const totalScore = prioritizationCore.calculateTotalScore(
        0.8,  // costScore
        0.9,  // preferenceScore
        1.0,  // availabilityScore
        0.15, // stablecoinBonus
        0.9   // networkOptimizationScore
      );

      expect(totalScore).toBeGreaterThan(0);
      expect(totalScore).toBeLessThanOrEqual(1);
      
      // Should be high due to good scores and stablecoin bonus
      expect(totalScore).toBeGreaterThan(0.9);
    });

    it('should normalize scores to valid range', () => {
      // Test with scores that would exceed 1.0
      const totalScore = prioritizationCore.calculateTotalScore(
        1.0,  // costScore
        1.0,  // preferenceScore
        1.0,  // availabilityScore
        0.5,  // large stablecoinBonus
        1.0   // networkOptimizationScore
      );

      expect(totalScore).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Full Prioritization Flow', () => {
    it('should prioritize payment methods correctly', () => {
      const result = prioritizationCore.prioritizePaymentMethods(
        testMethods,
        testContext,
        testCostEstimates
      );

      expect(result).toHaveLength(testMethods.length);
      
      // Results should be sorted by total score (descending)
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].totalScore).toBeGreaterThanOrEqual(result[i + 1].totalScore);
        expect(result[i].priority).toBe(i + 1);
      }

      // USDC should likely be first due to stablecoin bonus and user preference
      const usdcResult = result.find(r => r.method.type === 'STABLECOIN_USDC');
      expect(usdcResult).toBeTruthy();
      expect(usdcResult?.stablecoinBonus).toBeGreaterThan(0);
    });

    it('should handle high gas fee scenarios', () => {
      const highGasCostEstimates = {
        'usdc-ethereum': { totalCost: 150, gasFee: 50, confidence: 0.9 },
        'fiat-stripe': { totalCost: 103, gasFee: 0, confidence: 1.0 },
        'eth-ethereum': { totalCost: 175, gasFee: 75, confidence: 0.8 }
      };

      const result = prioritizationCore.prioritizePaymentMethods(
        testMethods,
        testContext,
        highGasCostEstimates
      );

      // Fiat should be prioritized when crypto has high gas fees
      const fiatResult = result.find(r => r.method.type === 'FIAT_STRIPE');
      expect(fiatResult?.priority).toBeLessThanOrEqual(2); // Should be in top 2
    });

    it('should respect user preferences in prioritization', () => {
      const contextWithFiatPreference = {
        ...testContext,
        preferences: {
          ...testContext.preferences,
          preferFiat: true,
          preferStablecoins: false
        }
      };

      const result = prioritizationCore.prioritizePaymentMethods(
        testMethods,
        contextWithFiatPreference,
        testCostEstimates
      );

      const fiatResult = result.find(r => r.method.type === 'FIAT_STRIPE');
      expect(fiatResult?.preferenceScore).toBe(0.9); // High preference for fiat
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty payment methods array', () => {
      const result = prioritizationCore.prioritizePaymentMethods(
        [],
        testContext,
        {}
      );

      expect(result).toHaveLength(0);
    });

    it('should handle missing cost estimates', () => {
      const incompleteCostEstimates = {
        'usdc-ethereum': { totalCost: 105, gasFee: 5, confidence: 0.9 }
        // Missing other methods
      };

      // Should not throw error, but may have undefined behavior
      expect(() => {
        prioritizationCore.prioritizePaymentMethods(
          testMethods,
          testContext,
          incompleteCostEstimates
        );
      }).not.toThrow();
    });

    it('should handle extreme values gracefully', () => {
      const extremeCostEstimates = {
        'usdc-ethereum': { totalCost: 0, gasFee: 0, confidence: 0 },
        'fiat-stripe': { totalCost: 1000000, gasFee: 0, confidence: 1.0 },
        'eth-ethereum': { totalCost: -100, gasFee: -50, confidence: 2.0 }
      };

      const result = prioritizationCore.prioritizePaymentMethods(
        testMethods,
        testContext,
        extremeCostEstimates
      );

      expect(result).toHaveLength(testMethods.length);
      
      // All scores should be in valid range
      result.forEach(r => {
        expect(r.totalScore).toBeGreaterThanOrEqual(0);
        expect(r.totalScore).toBeLessThanOrEqual(1);
      });
    });
  });
});