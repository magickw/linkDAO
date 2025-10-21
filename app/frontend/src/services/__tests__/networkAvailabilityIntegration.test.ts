/**
 * Network Availability Integration Tests
 * Tests the integration between supported tokens registry and network compatibility checker
 */

import { supportedTokensRegistry } from '../supportedTokensRegistry';
import { networkCompatibilityChecker } from '../networkCompatibilityChecker';
import { PaymentMethodType } from '../../types/paymentPrioritization';
import { SUPPORTED_PAYMENT_METHODS } from '../../config/paymentMethodPrioritization';

// Mock chain IDs to avoid wagmi import issues
const CHAIN_IDS = {
  mainnet: 1,
  polygon: 137,
  arbitrum: 42161,
  sepolia: 11155111
};

describe('Network Availability Integration', () => {
  describe('Supported Tokens Registry', () => {
    test('should return token metadata for USDC on mainnet', () => {
      const metadata = supportedTokensRegistry.getTokenMetadata('USDC', CHAIN_IDS.mainnet);
      
      expect(metadata).toBeDefined();
      expect(metadata?.token.symbol).toBe('USDC');
      expect(metadata?.token.chainId).toBe(CHAIN_IDS.mainnet);
      expect(metadata?.category).toBe('stablecoin');
      expect(metadata?.riskLevel).toBe('low');
    });

    test('should return tokens for Polygon network', () => {
      const tokens = supportedTokensRegistry.getTokensForNetwork(CHAIN_IDS.polygon);
      
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens.some(t => t.token.symbol === 'USDC')).toBe(true);
      expect(tokens.some(t => t.token.symbol === 'MATIC')).toBe(true);
    });

    test('should check token availability correctly', () => {
      const usdcMainnet = SUPPORTED_PAYMENT_METHODS.find(
        m => m.type === PaymentMethodType.STABLECOIN_USDC && m.chainId === CHAIN_IDS.mainnet
      );
      
      expect(usdcMainnet).toBeDefined();
      
      if (usdcMainnet?.token) {
        const availability = supportedTokensRegistry.isTokenAvailable(usdcMainnet.token, CHAIN_IDS.mainnet);
        expect(availability.available).toBe(true);
        
        // Test unavailable scenario
        const unavailableResult = supportedTokensRegistry.isTokenAvailable(usdcMainnet.token, 999);
        expect(unavailableResult.available).toBe(false);
        expect(unavailableResult.reason).toContain('Network not supported');
      }
    });

    test('should return supported networks', () => {
      const networks = supportedTokensRegistry.getSupportedNetworks();
      
      expect(networks).toContain(CHAIN_IDS.mainnet);
      expect(networks).toContain(CHAIN_IDS.polygon);
      expect(networks).toContain(CHAIN_IDS.arbitrum);
      expect(networks).toContain(CHAIN_IDS.sepolia);
    });
  });

  describe('Network Compatibility Checker', () => {
    test('should validate USDC support on mainnet', async () => {
      const usdcMethod = SUPPORTED_PAYMENT_METHODS.find(
        m => m.type === PaymentMethodType.STABLECOIN_USDC && m.chainId === CHAIN_IDS.mainnet
      );
      
      expect(usdcMethod).toBeDefined();
      
      if (usdcMethod) {
        const result = await networkCompatibilityChecker.validatePaymentMethodSupport(
          usdcMethod,
          CHAIN_IDS.mainnet
        );
        
        expect(result.isSupported).toBe(true);
        expect(result.supportLevel).toBe('full');
        expect(result.availabilityStatus).toBe('available');
      }
    });

    test('should validate fiat payment support on all networks', async () => {
      const fiatMethod = SUPPORTED_PAYMENT_METHODS.find(
        m => m.type === PaymentMethodType.FIAT_STRIPE
      );
      
      expect(fiatMethod).toBeDefined();
      
      if (fiatMethod) {
        const networks = [CHAIN_IDS.mainnet, CHAIN_IDS.polygon, CHAIN_IDS.arbitrum, CHAIN_IDS.sepolia];
        
        for (const chainId of networks) {
          const result = await networkCompatibilityChecker.validatePaymentMethodSupport(
            fiatMethod,
            chainId
          );
          
          expect(result.isSupported).toBe(true);
          expect(result.supportLevel).toBe('full');
          expect(result.benefits).toContain('No gas fees');
        }
      }
    });

    test('should provide network switching suggestions', async () => {
      const usdcMainnet = SUPPORTED_PAYMENT_METHODS.find(
        m => m.type === PaymentMethodType.STABLECOIN_USDC && m.chainId === CHAIN_IDS.mainnet
      );
      
      expect(usdcMainnet).toBeDefined();
      
      if (usdcMainnet) {
        const suggestions = await networkCompatibilityChecker.getNetworkSwitchingSuggestions(
          usdcMainnet,
          CHAIN_IDS.mainnet,
          { preferLowGas: true }
        );
        
        expect(suggestions.length).toBeGreaterThan(0);
        
        // Should suggest Polygon for lower gas fees
        const polygonSuggestion = suggestions.find(s => s.chainId === CHAIN_IDS.polygon);
        expect(polygonSuggestion).toBeDefined();
        expect(polygonSuggestion?.benefits.some(b => b.includes('gas fees'))).toBe(true);
      }
    });

    test('should check payment method support on networks', () => {
      // USDC should be supported on mainnet, polygon, arbitrum
      expect(networkCompatibilityChecker.isPaymentMethodSupportedOnNetwork(
        PaymentMethodType.STABLECOIN_USDC,
        CHAIN_IDS.mainnet
      )).toBe(true);
      
      expect(networkCompatibilityChecker.isPaymentMethodSupportedOnNetwork(
        PaymentMethodType.STABLECOIN_USDC,
        CHAIN_IDS.polygon
      )).toBe(true);
      
      // Fiat should be supported everywhere
      expect(networkCompatibilityChecker.isPaymentMethodSupportedOnNetwork(
        PaymentMethodType.FIAT_STRIPE,
        CHAIN_IDS.mainnet
      )).toBe(true);
      
      expect(networkCompatibilityChecker.isPaymentMethodSupportedOnNetwork(
        PaymentMethodType.FIAT_STRIPE,
        999 // Non-existent network
      )).toBe(true);
    });

    test('should generate compatibility matrix', () => {
      const matrix = networkCompatibilityChecker.getPaymentMethodCompatibilityMatrix();
      
      expect(matrix.length).toBeGreaterThan(0);
      
      const mainnetMatrix = matrix.find(m => m.chainId === CHAIN_IDS.mainnet);
      expect(mainnetMatrix).toBeDefined();
      expect(mainnetMatrix?.supportedMethods.length).toBeGreaterThan(0);
      
      // Fiat should be supported on all networks
      const fiatSupport = mainnetMatrix?.supportedMethods.find(
        m => m.method === PaymentMethodType.FIAT_STRIPE
      );
      expect(fiatSupport?.supported).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle cross-network token recommendations', async () => {
      // Get USDC on mainnet
      const usdcMainnet = SUPPORTED_PAYMENT_METHODS.find(
        m => m.type === PaymentMethodType.STABLECOIN_USDC && m.chainId === CHAIN_IDS.mainnet
      );
      
      expect(usdcMainnet).toBeDefined();
      
      if (usdcMainnet?.token) {
        // Check networks that support this token
        const supportedNetworks = supportedTokensRegistry.getNetworksForToken(usdcMainnet.token);
        expect(supportedNetworks).toContain(CHAIN_IDS.mainnet);
        
        // Get alternative tokens on Polygon
        const alternatives = supportedTokensRegistry.getAlternativeTokens(usdcMainnet.token, CHAIN_IDS.polygon);
        expect(alternatives.length).toBeGreaterThan(0);
        
        // Should include USDT and MATIC as alternatives
        expect(alternatives.some(t => t.symbol === 'USDT' || t.symbol === 'MATIC')).toBe(true);
      }
    });

    test('should provide fallback recommendations when method unavailable', async () => {
      // Create a hypothetical unavailable method
      const unavailableMethod = {
        id: 'test-unavailable',
        type: PaymentMethodType.STABLECOIN_USDC,
        name: 'Test Unavailable',
        description: 'Test method',
        enabled: true,
        supportedNetworks: [999] // Non-existent network
      };
      
      const fallbacks = await networkCompatibilityChecker.getFallbackNetworkRecommendations(
        unavailableMethod,
        999, // Current non-existent network
        100 // $100 transaction
      );
      
      expect(fallbacks.length).toBeGreaterThan(0);
      
      // Should suggest real networks with USDC support
      const realNetworkSuggestion = fallbacks.find(f => 
        [CHAIN_IDS.mainnet, CHAIN_IDS.polygon, CHAIN_IDS.arbitrum].includes(f.chainId)
      );
      expect(realNetworkSuggestion).toBeDefined();
    });

    test('should recommend tokens for specific use cases', () => {
      // Test small transaction recommendations on Polygon
      const smallTxTokens = supportedTokensRegistry.getRecommendedTokens(
        CHAIN_IDS.polygon,
        'small_transactions',
        2
      );
      
      expect(smallTxTokens.length).toBeGreaterThan(0);
      expect(smallTxTokens[0].gasEfficiency).toBe('high');
      
      // Test large transaction recommendations on mainnet
      const largeTxTokens = supportedTokensRegistry.getRecommendedTokens(
        CHAIN_IDS.mainnet,
        'large_transactions',
        2
      );
      
      expect(largeTxTokens.length).toBeGreaterThan(0);
      expect(largeTxTokens.some(t => t.category === 'stablecoin')).toBe(true);
    });
  });
});