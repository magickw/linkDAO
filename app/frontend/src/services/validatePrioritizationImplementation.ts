/**
 * Validation Script for Payment Method Prioritization Implementation
 * Simple validation to ensure core functionality works correctly
 */

import PaymentMethodScoringSystem from './paymentMethodScoringSystem';
import DynamicPrioritizationEngine from './dynamicPrioritizationEngine';
import StablecoinPrioritizationRules from './stablecoinPrioritizationRules';
import {
  PaymentMethod,
  PaymentMethodType,
  CostEstimate,
  PrioritizationContext,
  UserPreferences
} from '../types/paymentPrioritization';

export async function validatePrioritizationImplementation(): Promise<{
  success: boolean;
  results: string[];
  errors: string[];
}> {
  const results: string[] = [];
  const errors: string[] = [];

  try {
    // Test 1: Scoring System Initialization
    results.push('✓ Testing PaymentMethodScoringSystem initialization...');
    const scoringSystem = new PaymentMethodScoringSystem();
    results.push('✓ PaymentMethodScoringSystem initialized successfully');

    // Test 2: Stablecoin Rules Initialization
    results.push('✓ Testing StablecoinPrioritizationRules initialization...');
    const stablecoinRules = new StablecoinPrioritizationRules();
    results.push('✓ StablecoinPrioritizationRules initialized successfully');

    // Test 3: Basic Configuration Access
    results.push('✓ Testing configuration access...');
    const configs = scoringSystem.getAllConfigs();
    if (configs[PaymentMethodType.STABLECOIN_USDC]) {
      results.push('✓ USDC configuration found');
    } else {
      errors.push('✗ USDC configuration missing');
    }

    // Test 4: Stablecoin Rules Validation
    results.push('✓ Testing stablecoin rules...');
    const rules = stablecoinRules.getRules();
    if (rules.length > 0) {
      results.push(`✓ Found ${rules.length} stablecoin prioritization rules`);
      
      const usdcFirstRule = rules.find(r => r.name === 'USDC_FIRST');
      if (usdcFirstRule) {
        results.push('✓ USDC_FIRST rule found');
      } else {
        errors.push('✗ USDC_FIRST rule missing');
      }
    } else {
      errors.push('✗ No stablecoin rules found');
    }

    // Test 5: Mock Scoring Calculation
    results.push('✓ Testing mock scoring calculation...');
    
    const mockMethod: PaymentMethod = {
      id: 'usdc-test',
      type: PaymentMethodType.STABLECOIN_USDC,
      name: 'USDC Test',
      description: 'Test USDC method',
      chainId: 1,
      enabled: true,
      supportedNetworks: [1]
    };

    const mockCostEstimate: CostEstimate = {
      totalCost: 105,
      baseCost: 100,
      gasFee: 5,
      estimatedTime: 3,
      confidence: 0.9,
      currency: 'USD',
      breakdown: {
        amount: 100,
        gasLimit: BigInt(21000),
        gasPrice: BigInt(20000000000),
        networkFee: 0,
        platformFee: 0
      }
    };

    const mockPreferences: UserPreferences = {
      preferredMethods: [],
      avoidedMethods: [],
      maxGasFeeThreshold: 25,
      preferStablecoins: true,
      preferFiat: false,
      lastUsedMethods: [],
      autoSelectBestOption: true
    };

    const mockContext: PrioritizationContext = {
      userContext: {
        chainId: 1,
        preferences: mockPreferences,
        walletBalances: []
      },
      transactionAmount: 100,
      transactionCurrency: 'USD',
      marketConditions: {
        gasConditions: [{
          chainId: 1,
          gasPrice: BigInt(20000000000),
          gasPriceUSD: 5,
          networkCongestion: 'low',
          blockTime: 12,
          lastUpdated: new Date()
        }],
        exchangeRates: [],
        networkAvailability: [],
        lastUpdated: new Date()
      },
      availablePaymentMethods: [mockMethod]
    };

    const scoringComponents = await scoringSystem.calculateMethodScore(
      mockMethod,
      mockContext,
      mockCostEstimate
    );

    if (scoringComponents.totalScore > 0 && scoringComponents.totalScore <= 1) {
      results.push(`✓ Scoring calculation successful: ${scoringComponents.totalScore.toFixed(3)}`);
    } else {
      errors.push(`✗ Invalid score calculated: ${scoringComponents.totalScore}`);
    }

    if (scoringComponents.stablecoinBonus > 0) {
      results.push('✓ Stablecoin bonus applied correctly');
    } else {
      errors.push('✗ Stablecoin bonus not applied');
    }

    // Test 6: Scoring Validation
    results.push('✓ Testing scoring validation...');
    const validation = scoringSystem.validateScoring(mockMethod, scoringComponents, mockContext);
    
    if (validation.isValid) {
      results.push('✓ Scoring validation passed');
    } else {
      errors.push(`✗ Scoring validation failed: ${validation.errors.join(', ')}`);
    }

    // Test 7: Configuration Updates
    results.push('✓ Testing configuration updates...');
    const originalConfig = scoringSystem.getMethodConfig(PaymentMethodType.STABLECOIN_USDC);
    const originalCostWeight = originalConfig.costWeight;
    
    scoringSystem.updateMethodConfig(PaymentMethodType.STABLECOIN_USDC, { costWeight: 0.5 });
    const updatedConfig = scoringSystem.getMethodConfig(PaymentMethodType.STABLECOIN_USDC);
    
    if (updatedConfig.costWeight === 0.5) {
      results.push('✓ Configuration update successful');
    } else {
      errors.push('✗ Configuration update failed');
    }

    // Restore original config
    scoringSystem.updateMethodConfig(PaymentMethodType.STABLECOIN_USDC, { costWeight: originalCostWeight });

    results.push('✓ All core prioritization components validated successfully');

  } catch (error) {
    errors.push(`✗ Validation error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    success: errors.length === 0,
    results,
    errors
  };
}

// Export for use in other validation scripts
export default validatePrioritizationImplementation;