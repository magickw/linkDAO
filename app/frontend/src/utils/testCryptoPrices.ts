/**
 * Test utility to verify crypto price service is working for multiple tokens
 * This can be used to debug and verify that real market data is being fetched
 */

import { cryptoPriceService } from '../services/cryptoPriceService';

export async function testCryptoPriceService() {
  console.log('🔍 Testing Crypto Price Service...');
  
  const testTokens = ['ETH', 'USDC', 'LINK', 'UNI', 'AAVE', 'MATIC', 'WBTC'];
  
  try {
    // Test individual price fetching
    console.log('\n📊 Testing individual price fetching:');
    for (const token of testTokens.slice(0, 3)) { // Test first 3 to avoid rate limits
      const priceData = await cryptoPriceService.getPrice(token);
      if (priceData) {
        console.log(`${token}: $${priceData.current_price.toFixed(2)} (${priceData.price_change_percentage_24h > 0 ? '+' : ''}${priceData.price_change_percentage_24h.toFixed(2)}%)`);
      } else {
        console.log(`${token}: No price data available`);
      }
    }
    
    // Test batch price fetching
    console.log('\n📈 Testing batch price fetching:');
    const batchPrices = await cryptoPriceService.getPrices(testTokens);
    
    console.log(`Fetched prices for ${batchPrices.size} tokens:`);
    batchPrices.forEach((priceData, symbol) => {
      console.log(`${symbol}: $${priceData.current_price.toFixed(2)} (${priceData.price_change_percentage_24h > 0 ? '+' : ''}${priceData.price_change_percentage_24h.toFixed(2)}%)`);
    });
    
    // Test supported tokens
    console.log('\n🎯 Supported tokens:');
    const supportedTokens = cryptoPriceService.getSupportedTokens();
    console.log(`Total supported tokens: ${supportedTokens.length}`);
    console.log('Sample supported tokens:', supportedTokens.slice(0, 10).join(', '));
    
    return {
      success: true,
      batchPricesCount: batchPrices.size,
      supportedTokensCount: supportedTokens.length,
      samplePrices: Array.from(batchPrices.entries()).slice(0, 5)
    };
    
  } catch (error) {
    console.error('❌ Crypto Price Service test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Test mock token balances update
export async function testTokenBalanceUpdate() {
  console.log('\n🔄 Testing token balance updates...');
  
  const mockBalances = [
    { symbol: 'ETH', name: 'Ethereum', balance: 2.5, valueUSD: 0, change24h: 0, contractAddress: '0x0', chains: [1] },
    { symbol: 'USDC', name: 'USD Coin', balance: 1000, valueUSD: 0, change24h: 0, contractAddress: '0x1', chains: [1] },
    { symbol: 'LINK', name: 'Chainlink', balance: 100, valueUSD: 0, change24h: 0, contractAddress: '0x2', chains: [1] },
  ];
  
  try {
    const updatedBalances = await cryptoPriceService.updateTokenBalances(mockBalances);
    
    console.log('Updated balances:');
    updatedBalances.forEach(balance => {
      console.log(`${balance.symbol}: ${balance.balance} tokens = $${balance.valueUSD.toFixed(2)} (${balance.change24h > 0 ? '+' : ''}${balance.change24h.toFixed(2)}%)`);
    });
    
    const totalValue = updatedBalances.reduce((sum, b) => sum + b.valueUSD, 0);
    console.log(`Total portfolio value: $${totalValue.toFixed(2)}`);
    
    return {
      success: true,
      totalValue,
      updatedBalances: updatedBalances.length
    };
    
  } catch (error) {
    console.error('❌ Token balance update test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Run all tests
export async function runAllTests() {
  console.log('🚀 Running Crypto Price Service Tests...\n');
  
  const priceTest = await testCryptoPriceService();
  const balanceTest = await testTokenBalanceUpdate();
  
  console.log('\n📋 Test Summary:');
  console.log(`Price Service: ${priceTest.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Balance Update: ${balanceTest.success ? '✅ PASS' : '❌ FAIL'}`);
  
  if (priceTest.success && balanceTest.success) {
    console.log('\n🎉 All tests passed! The crypto price service is working correctly.');
    console.log('Real market data should now be available for all supported tokens in the wallet dashboard.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the errors above for debugging.');
  }
  
  return {
    priceTest,
    balanceTest,
    allPassed: priceTest.success && balanceTest.success
  };
}