/**
 * Cost Effectiveness Integration Validation Script
 * Simple validation script to test the integration between services
 */

import { PaymentMethodType, PaymentMethod } from '../types/paymentPrioritization';
import { gasFeeEstimationService } from './gasFeeEstimationService';
import { transactionCostCalculator } from './transactionCostCalculator';
import { exchangeRateService } from './exchangeRateService';
import { CostEffectivenessCalculator } from './costEffectivenessCalculator';

// Mock payment methods for testing
const mockPaymentMethods: PaymentMethod[] = [
  {
    id: 'usdc-mainnet',
    type: PaymentMethodType.STABLECOIN_USDC,
    name: 'USDC (Ethereum)',
    description: 'USD Coin on Ethereum mainnet',
    token: {
      address: '0xA0b86a33E6441e8e4E8b8e4E8b8e4E8b8e4E8b8e',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      chainId: 1
    },
    chainId: 1,
    enabled: true,
    supportedNetworks: [1]
  },
  {
    id: 'fiat-stripe',
    type: PaymentMethodType.FIAT_STRIPE,
    name: 'Credit/Debit Card',
    description: 'Traditional payment with Stripe',
    enabled: true,
    supportedNetworks: []
  }
];

async function validateGasFeeEstimationService(): Promise<boolean> {
  console.log('🔍 Validating Gas Fee Estimation Service...');
  
  try {
    // Test gas estimation
    const gasEstimate = await gasFeeEstimationService.getGasEstimate(1, 'erc20Transfer');
    console.log('✅ Gas estimate:', {
      gasLimit: gasEstimate.gasLimit.toString(),
      gasPrice: gasEstimate.gasPrice.toString(),
      totalCostUSD: gasEstimate.totalCostUSD,
      confidence: gasEstimate.confidence
    });

    // Test network conditions
    const networkConditions = await gasFeeEstimationService.getNetworkConditions(1);
    console.log('✅ Network conditions:', {
      chainId: networkConditions.chainId,
      gasPrice: networkConditions.gasPrice.toString(),
      gasPriceUSD: networkConditions.gasPriceUSD,
      networkCongestion: networkConditions.networkCongestion,
      blockTime: networkConditions.blockTime
    });

    // Test threshold validation
    const validation = gasFeeEstimationService.validateGasFeeThreshold(gasEstimate, {
      maxAcceptableGasFeeUSD: 50,
      warningThresholdUSD: 25,
      blockTransactionThresholdUSD: 100
    });
    console.log('✅ Threshold validation:', validation);

    return true;
  } catch (error) {
    console.error('❌ Gas Fee Estimation Service validation failed:', error);
    return false;
  }
}

async function validateExchangeRateService(): Promise<boolean> {
  console.log('🔍 Validating Exchange Rate Service...');
  
  try {
    // Test exchange rate fetching
    const ethToUsd = await exchangeRateService.getExchangeRate('ETH', 'USD');
    console.log('✅ ETH to USD rate:', ethToUsd);

    const usdcToUsd = await exchangeRateService.getExchangeRate('USDC', 'USD');
    console.log('✅ USDC to USD rate:', usdcToUsd);

    // Test currency conversion
    const conversion = await exchangeRateService.convertCurrency(100, 'USDC', 'USD');
    console.log('✅ Currency conversion (100 USDC to USD):', conversion);

    // Test currency formatting
    const formatted = exchangeRateService.formatCurrency(1234.56, 'USD');
    console.log('✅ Currency formatting ($1234.56):', formatted);

    // Test multiple rates
    const multipleRates = await exchangeRateService.getMultipleExchangeRates('ETH', ['USD', 'USDC']);
    console.log('✅ Multiple exchange rates:', multipleRates);

    return true;
  } catch (error) {
    console.error('❌ Exchange Rate Service validation failed:', error);
    return false;
  }
}

async function validateTransactionCostCalculator(): Promise<boolean> {
  console.log('🔍 Validating Transaction Cost Calculator...');
  
  try {
    const testAmount = 100; // $100 USD

    // Test cost calculation for USDC
    const usdcMethod = mockPaymentMethods.find(m => m.type === PaymentMethodType.STABLECOIN_USDC);
    if (usdcMethod) {
      const usdcCost = await transactionCostCalculator.calculateTransactionCost(usdcMethod, testAmount);
      console.log('✅ USDC transaction cost:', {
        totalCost: usdcCost.totalCost,
        baseCost: usdcCost.baseCost,
        gasFee: usdcCost.gasFee,
        estimatedTime: usdcCost.estimatedTime,
        confidence: usdcCost.confidence
      });
    }

    // Test cost calculation for fiat
    const fiatMethod = mockPaymentMethods.find(m => m.type === PaymentMethodType.FIAT_STRIPE);
    if (fiatMethod) {
      const fiatCost = await transactionCostCalculator.calculateTransactionCost(fiatMethod, testAmount);
      console.log('✅ Fiat transaction cost:', {
        totalCost: fiatCost.totalCost,
        baseCost: fiatCost.baseCost,
        gasFee: fiatCost.gasFee,
        estimatedTime: fiatCost.estimatedTime,
        confidence: fiatCost.confidence
      });
    }

    // Test cost comparison
    const comparison = await transactionCostCalculator.comparePaymentMethods(mockPaymentMethods, testAmount);
    console.log('✅ Payment method comparison:', comparison.map(c => ({
      method: c.method.name,
      totalCost: c.costEstimate.totalCost,
      isRecommended: c.isRecommended,
      reasonForRecommendation: c.reasonForRecommendation
    })));

    return true;
  } catch (error) {
    console.error('❌ Transaction Cost Calculator validation failed:', error);
    return false;
  }
}

async function validateCostEffectivenessCalculator(): Promise<boolean> {
  console.log('🔍 Validating Cost Effectiveness Calculator...');
  
  try {
    const costCalculator = new CostEffectivenessCalculator();
    const testAmount = 100; // $100 USD

    // Test network conditions
    const networkConditions = await costCalculator.getNetworkConditions(1);
    console.log('✅ Network conditions from cost calculator:', {
      chainId: networkConditions.chainId,
      gasPrice: networkConditions.gasPrice.toString(),
      gasPriceUSD: networkConditions.gasPriceUSD,
      networkCongestion: networkConditions.networkCongestion
    });

    // Test transaction cost calculation
    const usdcMethod = mockPaymentMethods.find(m => m.type === PaymentMethodType.STABLECOIN_USDC);
    if (usdcMethod) {
      const costEstimate = await costCalculator.calculateTransactionCost(usdcMethod, testAmount, networkConditions);
      console.log('✅ Cost estimate from integrated calculator:', {
        totalCost: costEstimate.totalCost,
        baseCost: costEstimate.baseCost,
        gasFee: costEstimate.gasFee,
        confidence: costEstimate.confidence,
        estimatedTime: costEstimate.estimatedTime
      });

      // Test gas fee threshold validation
      const isAcceptable = costCalculator.isGasFeeAcceptable(costEstimate, 50);
      console.log('✅ Gas fee acceptable (threshold $50):', isAcceptable);
    }

    // Test payment method comparison
    const comparison = await costCalculator.comparePaymentMethods(mockPaymentMethods, testAmount, [networkConditions]);
    console.log('✅ Payment method comparison from integrated calculator:', comparison.map(c => ({
      method: c.method.name,
      totalCost: c.costEstimate.totalCost,
      isRecommended: c.isRecommended,
      reasonForRecommendation: c.reasonForRecommendation
    })));

    return true;
  } catch (error) {
    console.error('❌ Cost Effectiveness Calculator validation failed:', error);
    return false;
  }
}

async function validateCacheOperations(): Promise<boolean> {
  console.log('🔍 Validating Cache Operations...');
  
  try {
    // Test cache statistics
    const gasCacheStats = gasFeeEstimationService.getCacheStats();
    const exchangeCacheStats = exchangeRateService.getCacheStats();
    const transactionCacheStats = transactionCostCalculator.getCacheStats();

    console.log('✅ Cache statistics:', {
      gasEstimation: gasCacheStats,
      exchangeRate: exchangeCacheStats,
      transactionCost: transactionCacheStats
    });

    // Test cache clearing
    gasFeeEstimationService.clearCache();
    exchangeRateService.clearCache();
    transactionCostCalculator.clearCache();

    const clearedGasCacheStats = gasFeeEstimationService.getCacheStats();
    const clearedExchangeCacheStats = exchangeRateService.getCacheStats();
    const clearedTransactionCacheStats = transactionCostCalculator.getCacheStats();

    console.log('✅ Cache statistics after clearing:', {
      gasEstimation: clearedGasCacheStats,
      exchangeRate: clearedExchangeCacheStats,
      transactionCost: clearedTransactionCacheStats
    });

    return true;
  } catch (error) {
    console.error('❌ Cache operations validation failed:', error);
    return false;
  }
}

async function runValidation(): Promise<void> {
  console.log('🚀 Starting Cost Effectiveness Integration Validation...\n');

  const results = await Promise.all([
    validateGasFeeEstimationService(),
    validateExchangeRateService(),
    validateTransactionCostCalculator(),
    validateCostEffectivenessCalculator(),
    validateCacheOperations()
  ]);

  const passedTests = results.filter(result => result).length;
  const totalTests = results.length;

  console.log('\n📊 Validation Summary:');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);

  if (passedTests === totalTests) {
    console.log('🎉 All validations passed! Cost effectiveness integration is working correctly.');
  } else {
    console.log('⚠️  Some validations failed. Please check the error messages above.');
  }
}

// Export for use in other modules
export {
  validateGasFeeEstimationService,
  validateExchangeRateService,
  validateTransactionCostCalculator,
  validateCostEffectivenessCalculator,
  validateCacheOperations,
  runValidation
};

// Run validation if this file is executed directly
if (require.main === module) {
  runValidation().catch(console.error);
}