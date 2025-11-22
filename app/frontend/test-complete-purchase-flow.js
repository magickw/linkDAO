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

async function testCompletePurchaseFlow() {
  try {
    console.log('🧪 Testing Complete LDAO Token Purchase Flow...');
    
    // Connect to Sepolia testnet
    const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/5qxkwSO4d_0qE4wjQPIrp');
    
    // Initialize contracts (read-only for testing)
    const treasury = new ethers.Contract(LDAO_TREASURY_ADDRESS, TREASURY_ABI, provider);
    const ldaoToken = new ethers.Contract(LDAO_TOKEN_ADDRESS, LDAO_ABI, provider);
    
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
    
    // Simulate ETH purchase flow (without actually sending transaction)
    console.log('\n💰 Simulating ETH Purchase Flow:');
    console.log(`   Amount: 100 LDAO`);
    console.log(`   Cost: ${ethers.formatEther(ethAmount100)} ETH`);
    console.log(`   Transaction: Would call purchaseWithETH(100 LDAO) with value ${ethers.formatEther(ethAmount100)} ETH`);
    console.log('   Status: SIMULATED (no actual transaction sent)');
    
    // Simulate USDC purchase flow (without actually sending transaction)
    console.log('\n💰 Simulating USDC Purchase Flow:');
    console.log(`   Amount: 100 LDAO`);
    console.log(`   Cost: ${ethers.formatUnits(usdcAmount100, 6)} USDC`);
    console.log(`   Transaction: Would call purchaseWithUSDC(100 LDAO) after USDC approval`);
    console.log('   Status: SIMULATED (no actual transaction sent)');
    
    console.log('\n✅ Complete purchase flow test completed successfully!');
    console.log('\n📝 Note: To execute actual transactions, you would need:');
    console.log('   1. A private key with Sepolia ETH funds');
    console.log('   2. To set the PRIVATE_KEY environment variable');
    console.log('   3. To run the test with a wallet provider instead of read-only provider');
    
  } catch (error) {
    console.error('❌ Complete purchase flow test failed:', error.message);
  }
}

async function main() {
  console.log('🚀 LDAO Token Acquisition System - Complete Purchase Flow Test');
  console.log('==============================================================');
  
  await testCompletePurchaseFlow();
  
  console.log('\n🏁 All tests completed!');
}

// Run the tests
main().catch(console.error);