const { ethers } = require('ethers');

// Configuration from environment
const LDAO_TOKEN_ADDRESS = '0xc9F690B45e33ca909bB9ab97836091673232611B';
const LDAO_TREASURY_ADDRESS = '0xeF85C8CcC03320dA32371940b315D563be2585e5';
const USDC_ADDRESS = '0xA31D2faD2B1Ab84Fb420824A5CF3aB5a272782CC';

// ABI for Treasury contract (simplified)
const TREASURY_ABI = [
  'function purchaseWithETH(uint256 ldaoAmount) external payable',
  'function purchaseWithUSDC(uint256 ldaoAmount) external',
  'function getQuote(uint256 ldaoAmount) external view returns (uint256, uint256, uint256, uint256)',
  'function ldaoPriceInUSD() external view returns (uint256)',
  'function salesActive() external view returns (bool)'
];

// ABI for LDAO token
const LDAO_ABI = [
  'function balanceOf(address owner) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)'
];

// ABI for USDC token
const USDC_ABI = [
  'function balanceOf(address owner) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)'
];

async function testETHPurchase() {
  try {
    console.log('🧪 Testing LDAO Token Purchase with ETH...');
    
    // Connect to Sepolia testnet
    const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/5qxkwSO4d_0qE4wjQPIrp');
    
    // Initialize contracts
    const treasury = new ethers.Contract(LDAO_TREASURY_ADDRESS, TREASURY_ABI, provider);
    
    // Check if sales are active
    const salesActive = await treasury.salesActive();
    console.log(`🛒 Sales status: ${salesActive ? 'ACTIVE' : 'INACTIVE'}`);
    
    if (!salesActive) {
      console.log('❌ Sales are not active. Cannot proceed with purchase test.');
      return;
    }
    
    // Test quote for 100 LDAO tokens
    const ldaoAmount100 = ethers.parseEther('100');
    const [usdAmount100, ethAmount100, usdcAmount100, discount100] = await treasury.getQuote(ldaoAmount100);
    
    console.log(`\n📋 Quote for 100 LDAO tokens:`);
    console.log(`   USD Amount: $${ethers.formatEther(usdAmount100)}`);
    console.log(`   ETH Amount: ${ethers.formatEther(ethAmount100)} ETH`);
    console.log(`   USDC Amount: ${ethers.formatUnits(usdcAmount100, 6)} USDC`);
    console.log(`   Discount: ${(discount100.toNumber() / 10000).toFixed(2)}%`);
    
    // Test quote for 10,000 LDAO tokens (should get volume discount)
    const ldaoAmount10k = ethers.parseEther('10000');
    const [usdAmount10k, ethAmount10k, usdcAmount10k, discount10k] = await treasury.getQuote(ldaoAmount10k);
    
    console.log(`\n📋 Quote for 10,000 LDAO tokens:`);
    console.log(`   USD Amount: $${ethers.formatEther(usdAmount10k)}`);
    console.log(`   ETH Amount: ${ethers.formatEther(ethAmount10k)} ETH`);
    console.log(`   USDC Amount: ${ethers.formatUnits(usdcAmount10k, 6)} USDC`);
    console.log(`   Discount: ${(discount10k.toNumber() / 10000).toFixed(2)}%`);
    
    console.log('\n✅ ETH purchase flow test completed successfully!');
    
  } catch (error) {
    console.error('❌ ETH purchase test failed:', error.message);
  }
}

async function testUSDCPurchase() {
  try {
    console.log('\n🧪 Testing LDAO Token Purchase with USDC...');
    
    // Connect to Sepolia testnet
    const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/5qxkwSO4d_0qE4wjQPIrp');
    
    // Initialize contracts
    const treasury = new ethers.Contract(LDAO_TREASURY_ADDRESS, TREASURY_ABI, provider);
    
    // Test quote for 100 LDAO tokens
    const ldaoAmount100 = ethers.parseEther('100');
    const [usdAmount100, ethAmount100, usdcAmount100, discount100] = await treasury.getQuote(ldaoAmount100);
    
    console.log(`\n📋 Quote for 100 LDAO tokens:`);
    console.log(`   USD Amount: $${ethers.formatEther(usdAmount100)}`);
    console.log(`   ETH Amount: ${ethers.formatEther(ethAmount100)} ETH`);
    console.log(`   USDC Amount: ${ethers.formatUnits(usdcAmount100, 6)} USDC`);
    console.log(`   Discount: ${(discount100.toNumber() / 10000).toFixed(2)}%`);
    
    // Test quote for 10,000 LDAO tokens (should get volume discount)
    const ldaoAmount10k = ethers.parseEther('10000');
    const [usdAmount10k, ethAmount10k, usdcAmount10k, discount10k] = await treasury.getQuote(ldaoAmount10k);
    
    console.log(`\n📋 Quote for 10,000 LDAO tokens:`);
    console.log(`   USD Amount: $${ethers.formatEther(usdAmount10k)}`);
    console.log(`   ETH Amount: ${ethers.formatEther(ethAmount10k)} ETH`);
    console.log(`   USDC Amount: ${ethers.formatUnits(usdcAmount10k, 6)} USDC`);
    console.log(`   Discount: ${(discount10k.toNumber() / 10000).toFixed(2)}%`);
    
    console.log('\n✅ USDC purchase flow test completed successfully!');
    
  } catch (error) {
    console.error('❌ USDC purchase test failed:', error.message);
  }
}

async function main() {
  console.log('🚀 LDAO Token Acquisition System - Contract Interaction Test');
  console.log('=============================================================');
  
  // Test both purchase methods
  await testETHPurchase();
  await testUSDCPurchase();
  
  console.log('\n🏁 All tests completed!');
}

// Run the tests
main().catch(console.error);