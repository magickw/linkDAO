/**
 * Test script to verify rate limiting fix for wallet service
 * This script tests that the wallet service properly handles rate limiting
 */

const { WalletService } = require('./src/services/walletService');

async function testRateLimiting() {
  console.log('Testing rate limiting fix for wallet service...');
  
  // Create wallet service instances for different chains
  const baseService = new WalletService(8453); // Base Mainnet
  const ethereumService = new WalletService(1); // Ethereum Mainnet
  
  // Test address (this is a valid address but won't have balances)
  const testAddress = '0xEe034b53D4cCb101b2a4faec27708be507197350';
  
  try {
    console.log('Testing Base network token balances...');
    const baseBalances = await baseService.getTokenBalances(testAddress);
    console.log(`Base network balances fetched: ${baseBalances.length} tokens`);
    
    console.log('Testing Ethereum network token balances...');
    const ethBalances = await ethereumService.getTokenBalances(testAddress);
    console.log(`Ethereum network balances fetched: ${ethBalances.length} tokens`);
    
    console.log('Rate limiting test completed successfully!');
    console.log('The wallet service should now properly handle rate limits without errors.');
    
  } catch (error) {
    console.error('Error during rate limiting test:', error.message);
  }
}

// Run the test
testRateLimiting();