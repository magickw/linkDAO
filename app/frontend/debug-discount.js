const { ethers } = require('ethers');

// Configuration from environment
const LDAO_TREASURY_ADDRESS = '0xeF85C8CcC03320dA32371940b315D563be2585e5';

// ABI for Treasury contract
const TREASURY_ABI = [
  'function getQuote(uint256 ldaoAmount) external view returns (uint256, uint256, uint256, uint256)',
  'function getPricingTier(uint256 tierId) external view returns (uint256, uint256, bool)',
  'function salesActive() external view returns (bool)'
];

async function debugDiscount() {
  try {
    // Connect to Sepolia testnet
    const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/5qxkwSO4d_0qE4wjQPIrp');
    
    // Initialize contracts
    const treasury = new ethers.Contract(LDAO_TREASURY_ADDRESS, TREASURY_ABI, provider);
    
    // Check if sales are active
    const salesActive = await treasury.salesActive();
    console.log(`🛒 Sales status: ${salesActive ? 'ACTIVE' : 'INACTIVE'}`);
    
    if (!salesActive) {
      console.log('❌ Sales are not active. Cannot proceed with debug test.');
      return;
    }
    
    console.log('🔍 Debugging Volume Discount Calculation...\n');
    
    // Test amounts
    const testAmounts = [
      '100000',   // 100k - should get 5% discount (500 basis points)
      '500000',   // 500k - should get 10% discount (1000 basis points)
      '1000000'   // 1M - should get 15% discount (1500 basis points)
    ];
    
    for (const amount of testAmounts) {
      const ldaoAmount = ethers.parseEther(amount);
      
      // Get the raw discount value from the contract
      try {
        // Note: _getVolumeDiscount is internal, so we can't call it directly
        // We'll infer it from the quote
        const [usdAmount, ethAmount, usdcAmount, discount] = await treasury.getQuote(ldaoAmount);
        
        console.log(`Amount: ${parseInt(amount).toLocaleString()} LDAO`);
        console.log(`   Raw discount value: ${discount.toString()}`);
        console.log(`   Calculated percentage: ${(discount.toNumber() / 10000).toFixed(4)}%`);
        console.log('');
      } catch (error) {
        console.log(`Error getting discount for ${amount} LDAO:`, error.message);
      }
    }
    
    // Check pricing tiers directly
    console.log('📋 Direct Pricing Tier Check:');
    console.log('===========================');
    
    for (let i = 1; i <= 3; i++) {
      try {
        const [threshold, discountBps, active] = await treasury.getPricingTier(i);
        console.log(`Tier ${i}:`);
        console.log(`   Threshold: ${ethers.formatEther(threshold)} LDAO`);
        console.log(`   Raw discountBps: ${discountBps.toString()}`);
        console.log(`   Calculated percentage: ${(discountBps.toNumber() / 10000).toFixed(4)}%`);
        console.log(`   Active: ${active ? 'YES' : 'NO'}`);
        console.log('');
      } catch (error) {
        console.log(`Error checking tier ${i}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugDiscount();