const { ethers } = require('ethers');

// Configuration from environment
const LDAO_TOKEN_ADDRESS = '0xc9F690B45e33ca909bB9ab97836091673232611B';
const LDAO_TREASURY_ADDRESS = '0xeF85C8CcC03320dA32371940b315D563be2585e5';

// ABI for Treasury contract (simplified)
const TREASURY_ABI = [
  'function purchaseWithETH(uint256 ldaoAmount) external payable',
  'function purchaseWithUSDC(uint256 ldaoAmount) external',
  'function getQuote(uint256 ldaoAmount) external view returns (uint256, uint256, uint256, uint256)',
  'function ldaoPriceInUSD() external view returns (uint256)',
  'function salesActive() external view returns (bool)',
  'function getPricingTier(uint256 tierId) external view returns (uint256, uint256, bool)'
];

async function testVolumeDiscounts() {
  try {
    console.log('🧪 Testing LDAO Token Volume Discounts...');
    
    // Connect to Sepolia testnet
    const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/5qxkwSO4d_0qE4wjQPIrp');
    
    // Initialize contracts (read-only for testing)
    const treasury = new ethers.Contract(LDAO_TREASURY_ADDRESS, TREASURY_ABI, provider);
    
    // Check if sales are active
    const salesActive = await treasury.salesActive();
    console.log(`🛒 Sales status: ${salesActive ? 'ACTIVE' : 'INACTIVE'}`);
    
    if (!salesActive) {
      console.log('❌ Sales are not active. Cannot proceed with discount test.');
      return;
    }
    
    // Test different purchase amounts to check for volume discounts
    const testAmounts = [
      '100',      // Small purchase - no discount
      '1000',     // Medium purchase - might get discount
      '10000',    // Large purchase - should get discount
      '50000',    // Very large purchase - should get bigger discount
      '100000',   // Huge purchase - should get maximum discount
      '500000',   // Massive purchase - should get maximum discount
      '1000000'   // Maximum purchase - should get maximum discount
    ];
    
    console.log('\n📊 Volume Discount Analysis:');
    console.log('=====================================');
    
    for (const amount of testAmounts) {
      const ldaoAmount = ethers.parseEther(amount);
      const [usdAmount, ethAmount, usdcAmount, discount] = await treasury.getQuote(ldaoAmount);
      
      console.log(`\nAmount: ${parseInt(amount).toLocaleString()} LDAO`);
      console.log(`   USD Cost: $${parseFloat(ethers.formatEther(usdAmount)).toFixed(2)}`);
      console.log(`   ETH Cost: ${ethers.formatEther(ethAmount)} ETH`);
      console.log(`   USDC Cost: ${ethers.formatUnits(usdcAmount, 6)} USDC`);
      console.log(`   Discount: ${(discount.toNumber() / 100).toFixed(2)}%`);
      
      // Calculate effective price per LDAO
      const usdPerLDAO = parseFloat(ethers.formatEther(usdAmount)) / parseFloat(amount);
      console.log(`   Effective Price: $${usdPerLDAO.toFixed(4)} per LDAO`);
    }
    
    // Test pricing tiers
    console.log('\n📋 Pricing Tier Information:');
    console.log('============================');
    
    // Check first few pricing tiers
    for (let i = 1; i <= 5; i++) {
      try {
        const [threshold, discountBps, active] = await treasury.getPricingTier(i);
        if (threshold.gt(0)) {
          console.log(`Tier ${i}:`);
          console.log(`   Threshold: ${ethers.formatEther(threshold)} LDAO`);
          console.log(`   Discount: ${(discountBps.toNumber() / 100).toFixed(2)}%`);
          console.log(`   Active: ${active ? 'YES' : 'NO'}`);
        }
      } catch (error) {
        // Tier might not exist
        break;
      }
    }
    
    console.log('\n✅ Volume discount test completed successfully!');
    
  } catch (error) {
    console.error('❌ Volume discount test failed:', error.message);
  }
}

async function main() {
  console.log('🚀 LDAO Token Acquisition System - Volume Discount Test');
  console.log('====================================================');
  
  await testVolumeDiscounts();
  
  console.log('\n🏁 All tests completed!');
}

// Run the tests
main().catch(console.error);