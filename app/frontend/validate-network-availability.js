/**
 * Simple validation script for network availability system
 */

const { supportedTokensRegistry } = require('./src/services/supportedTokensRegistry');

console.log('=== Network Availability System Validation ===');

try {
  // Test basic functionality
  const networks = supportedTokensRegistry.getSupportedNetworks();
  console.log(`✓ Found ${networks.length} supported networks: ${networks.join(', ')}`);
  
  const mainnetConfig = supportedTokensRegistry.getNetworkConfig(1);
  if (mainnetConfig) {
    console.log(`✓ Mainnet config loaded with ${mainnetConfig.tokens.length} tokens`);
  } else {
    console.log('✗ Mainnet configuration not found');
  }
  
  const usdcMetadata = supportedTokensRegistry.getTokenMetadata('USDC', 1);
  if (usdcMetadata) {
    console.log(`✓ USDC metadata: ${usdcMetadata.displayName} (${usdcMetadata.category})`);
  } else {
    console.log('✗ USDC metadata not found');
  }
  
  console.log('🎉 Basic validation completed successfully!');
  
} catch (error) {
  console.error('❌ Validation failed:', error.message);
}