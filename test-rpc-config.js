/**
 * Test script to verify RPC configuration
 * This script checks that the environment variables are properly set
 */

// Load environment variables
require('dotenv').config({ path: './app/frontend/.env' });

function testRpcConfig() {
  console.log('Testing RPC configuration...');
  
  // Check if RPC URLs are configured
  const rpcUrls = {
    'Mainnet': process.env.NEXT_PUBLIC_MAINNET_RPC_URL,
    'Base': process.env.NEXT_PUBLIC_BASE_RPC_URL || process.env.BASE_RPC_URL,
    'Base Sepolia': process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_BASE_GOERLI_RPC_URL,
    'Polygon': process.env.NEXT_PUBLIC_POLYGON_RPC_URL,
    'Arbitrum': process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL,
    'Sepolia': process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL
  };
  
  console.log('RPC URL Configuration:');
  Object.entries(rpcUrls).forEach(([network, url]) => {
    if (url) {
      console.log(`✓ ${network}: Configured`);
    } else {
      console.log(`✗ ${network}: Not configured`);
    }
  });
  
  // Check for Alchemy URLs which should have better rate limits
  const hasAlchemyUrls = Object.values(rpcUrls).some(url => url && url.includes('alchemy.com'));
  if (hasAlchemyUrls) {
    console.log('\n✓ Alchemy RPC URLs detected - should have better rate limits');
  } else {
    console.log('\n⚠ No Alchemy RPC URLs detected - may experience rate limiting');
  }
  
  console.log('\nConfiguration test completed.');
}

// Run the test
testRpcConfig();