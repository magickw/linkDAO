/**
 * Network Availability Validation Script
 * Simple validation to ensure the network availability system works correctly
 */

import { supportedTokensRegistry } from './supportedTokensRegistry';
import { networkCompatibilityChecker } from './networkCompatibilityChecker';
import { PaymentMethodType } from '../types/paymentPrioritization';
import { SUPPORTED_PAYMENT_METHODS } from '../config/paymentMethodPrioritization';

// Chain IDs for validation
const CHAIN_IDS = {
  mainnet: 1,
  polygon: 137,
  arbitrum: 42161,
  sepolia: 11155111
};

export async function validateNetworkAvailabilitySystem(): Promise<{
  success: boolean;
  results: string[];
  errors: string[];
}> {
  const results: string[] = [];
  const errors: string[] = [];

  try {
    // Test 1: Validate supported tokens registry
    results.push('Testing Supported Tokens Registry...');
    
    const networks = supportedTokensRegistry.getSupportedNetworks();
    if (networks.length > 0) {
      results.push(`✓ Found ${networks.length} supported networks`);
    } else {
      errors.push('✗ No supported networks found');
    }

    // Test 2: Check USDC metadata
    const usdcMetadata = supportedTokensRegistry.getTokenMetadata('USDC', CHAIN_IDS.mainnet);
    if (usdcMetadata && usdcMetadata.category === 'stablecoin') {
      results.push('✓ USDC metadata loaded correctly');
    } else {
      errors.push('✗ USDC metadata not found or incorrect');
    }

    // Test 3: Check network configurations
    const mainnetConfig = supportedTokensRegistry.getNetworkConfig(CHAIN_IDS.mainnet);
    if (mainnetConfig && mainnetConfig.tokens.length > 0) {
      results.push(`✓ Mainnet config loaded with ${mainnetConfig.tokens.length} tokens`);
    } else {
      errors.push('✗ Mainnet configuration not found or empty');
    }

    // Test 4: Test token availability
    const usdcMainnet = SUPPORTED_PAYMENT_METHODS.find(
      m => m.type === PaymentMethodType.STABLECOIN_USDC && m.chainId === CHAIN_IDS.mainnet
    );
    
    if (usdcMainnet?.token) {
      const availability = supportedTokensRegistry.isTokenAvailable(usdcMainnet.token, CHAIN_IDS.mainnet);
      if (availability.available) {
        results.push('✓ USDC availability check passed');
      } else {
        errors.push(`✗ USDC availability check failed: ${availability.reason}`);
      }
    } else {
      errors.push('✗ USDC mainnet payment method not found');
    }

    // Test 5: Test network compatibility checker
    results.push('Testing Network Compatibility Checker...');
    
    const fiatMethod = SUPPORTED_PAYMENT_METHODS.find(
      m => m.type === PaymentMethodType.FIAT_STRIPE
    );
    
    if (fiatMethod) {
      const compatibility = await networkCompatibilityChecker.validatePaymentMethodSupport(
        fiatMethod,
        CHAIN_IDS.mainnet
      );
      
      if (compatibility.isSupported && compatibility.supportLevel === 'full') {
        results.push('✓ Fiat payment compatibility check passed');
      } else {
        errors.push('✗ Fiat payment compatibility check failed');
      }
    } else {
      errors.push('✗ Fiat payment method not found');
    }

    // Test 6: Test payment method support checking
    const usdcSupported = networkCompatibilityChecker.isPaymentMethodSupportedOnNetwork(
      PaymentMethodType.STABLECOIN_USDC,
      CHAIN_IDS.mainnet
    );
    
    if (usdcSupported) {
      results.push('✓ USDC support check on mainnet passed');
    } else {
      errors.push('✗ USDC support check on mainnet failed');
    }

    // Test 7: Test compatibility matrix generation
    const matrix = networkCompatibilityChecker.getPaymentMethodCompatibilityMatrix();
    if (matrix.length > 0) {
      results.push(`✓ Compatibility matrix generated with ${matrix.length} networks`);
    } else {
      errors.push('✗ Compatibility matrix generation failed');
    }

    // Test 8: Test network switching suggestions
    if (usdcMainnet) {
      const suggestions = await networkCompatibilityChecker.getNetworkSwitchingSuggestions(
        usdcMainnet,
        CHAIN_IDS.mainnet,
        { preferLowGas: true }
      );
      
      if (suggestions.length > 0) {
        results.push(`✓ Network switching suggestions generated (${suggestions.length} options)`);
      } else {
        results.push('ℹ No network switching suggestions (expected for mainnet USDC)');
      }
    }

    // Test 9: Test token search functionality
    const searchResults = supportedTokensRegistry.searchTokens('USDC');
    if (searchResults.length > 0) {
      results.push(`✓ Token search functionality works (found ${searchResults.length} USDC tokens)`);
    } else {
      errors.push('✗ Token search functionality failed');
    }

    // Test 10: Test recommended tokens
    const recommendedTokens = supportedTokensRegistry.getRecommendedTokens(
      CHAIN_IDS.polygon,
      'small_transactions',
      3
    );
    
    if (recommendedTokens.length > 0) {
      results.push(`✓ Token recommendations work (${recommendedTokens.length} tokens for small transactions)`);
    } else {
      errors.push('✗ Token recommendations failed');
    }

    const success = errors.length === 0;
    
    if (success) {
      results.push('🎉 All network availability system tests passed!');
    } else {
      results.push(`❌ ${errors.length} test(s) failed`);
    }

    return { success, results, errors };

  } catch (error) {
    errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return { success: false, results, errors };
  }
}

// Export for use in other modules
export default validateNetworkAvailabilitySystem;