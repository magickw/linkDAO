const { ethers } = require('ethers');

// Configuration - Using the Sepolia Chainlink ETH/USD price feed
const CHAINLINK_ETH_USD_FEED = '0x694AA1769357215DE4FAC081bf1f309aDC325306';

// ABI for Chainlink price feed
const CHAINLINK_ABI = [
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() view returns (uint8)'
];

// ABI for our fixed treasury contract
const FIXED_TREASURY_ABI = [
  'function _getETHPriceFromOracle() view returns (uint256)',
  'function ethPriceFeed() view returns (address)'
];

async function testChainlinkPrice() {
  try {
    console.log('🧪 Testing Chainlink ETH/USD Price Feed...');
    
    // Connect to Sepolia testnet
    const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/5qxkwSO4d_0qE4wjQPIrp');
    
    // Initialize Chainlink price feed contract
    const priceFeed = new ethers.Contract(CHAINLINK_ETH_USD_FEED, CHAINLINK_ABI, provider);
    
    // Get latest price data
    const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();
    const decimals = await priceFeed.decimals();
    
    console.log(`\n📋 Chainlink ETH/USD Price Feed Data:`);
    console.log(`   Round ID: ${roundId.toString()}`);
    console.log(`   Price: $${ethers.utils.formatUnits(answer, decimals)}`);
    console.log(`   Decimals: ${decimals}`);
    console.log(`   Last Updated: ${new Date(updatedAt.toNumber() * 1000).toISOString()}`);
    
    // Convert to our internal format (18 decimals)
    const priceInWei = ethers.utils.parseUnits(answer.toString(), 18 - decimals);
    console.log(`   Price in 18 decimals: ${ethers.utils.formatEther(priceInWei)} USD per ETH`);
    
    // Test our fixed treasury contract (if deployed)
    console.log('\n📋 Testing Fixed Treasury Contract (if deployed):');
    
    // This would be the address of the deployed FixedLDAOTreasury contract
    // For now, we'll just show what the function would return
    console.log('   Note: This test shows how the fixed contract would work with live Chainlink data');
    console.log('   The fixed contract converts Chainlink price (8 decimals) to internal format (18 decimals)');
    console.log('   Conversion formula: price * 1e10 (to go from 8 to 18 decimals)');
    
    const convertedPrice = answer.mul(ethers.BigNumber.from(10).pow(10));
    console.log(`   Converted price: ${ethers.utils.formatEther(convertedPrice)} USD per ETH`);
    
    console.log('\n✅ Chainlink price feed test completed successfully!');
    console.log('\n📝 Key Benefits of Chainlink Integration:');
    console.log('   - Real-time ETH price updates');
    console.log('   - Decentralized price feeds for security');
    console.log('   - Automatic adjustment to market conditions');
    console.log('   - No more hardcoded prices that can cause financial losses');
    
  } catch (error) {
    console.error('❌ Chainlink price feed test failed:', error.message);
  }
}

async function main() {
  console.log('🚀 LDAO Token Acquisition System - Chainlink Price Feed Test');
  console.log('========================================================');
  
  await testChainlinkPrice();
  
  console.log('\n🏁 All tests completed!');
}

// Run the tests
main().catch(console.error);