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

async function testETHPurchase() {
  try {
    console.log('🧪 Testing LDAO Token Purchase with ETH...');
    
    // Connect to Sepolia testnet
    const provider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/5qxkwSO4d_0qE4wjQPIrp');
    
    // You'll need to provide a private key with Sepolia ETH
    // For security, never hardcode private keys in production code
    const privateKey = process.env.PRIVATE_KEY || 'YOUR_PRIVATE_KEY_HERE';
    if (privateKey === 'YOUR_PRIVATE_KEY_HERE') {
      console.log('⚠️  Please set PRIVATE_KEY environment variable with a Sepolia test wallet private key');
      return;
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`💳 Using wallet address: ${wallet.address}`);
    
    // Initialize contracts
    const treasury = new ethers.Contract(LDAO_TREASURY_ADDRESS, TREASURY_ABI, wallet);
    const ldaoToken = new ethers.Contract(LDAO_TOKEN_ADDRESS, LDAO_ABI, wallet);
    
    // Check if sales are active
    const salesActive = await treasury.salesActive();
    console.log(`🛒 Sales status: ${salesActive ? 'ACTIVE' : 'INACTIVE'}`);
    
    if (!salesActive) {
      console.log('❌ Sales are not active. Cannot proceed with purchase test.');
      return;
    }
    
    // Check wallet balance
    const ethBalance = await wallet.getBalance();
    console.log(`💰 Wallet ETH balance: ${ethers.utils.formatEther(ethBalance)} ETH`);
    
    if (ethBalance.lt(ethers.utils.parseEther('0.1'))) {
      console.log('⚠️  Low ETH balance. Please add Sepolia ETH to your wallet.');
      console.log(' Faucet: https://sepoliafaucet.com/');
      return;
    }
    
    // Check current LDAO balance
    const initialLDAOBalance = await ldaoToken.balanceOf(wallet.address);
    console.log(`💰 Wallet LDAO balance: ${ethers.utils.formatEther(initialLDAOBalance)} LDAO`);
    
    // Test quote for 100 LDAO tokens
    const ldaoAmount = ethers.utils.parseEther('100');
    const [usdAmount, ethAmount, usdcAmount, discount] = await treasury.getQuote(ldaoAmount);
    
    console.log(`\n📋 Quote for 100 LDAO tokens:`);
    console.log(`   USD Amount: $${ethers.utils.formatEther(usdAmount)}`);
    console.log(`   ETH Amount: ${ethers.utils.formatEther(ethAmount)} ETH`);
    console.log(`   USDC Amount: ${ethers.utils.formatUnits(usdcAmount, 6)} USDC`);
    console.log(`   Discount: ${(discount.toNumber() / 10000).toFixed(2)}%`);
    
    // Proceed with purchase
    console.log('\n🛒 Proceeding with purchase...');
    const tx = await treasury.purchaseWithETH(ldaoAmount, {
      value: ethAmount
    });
    
    console.log(`⏳ Transaction submitted: ${tx.hash}`);
    console.log('   Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Check final LDAO balance
    const finalLDAOBalance = await ldaoToken.balanceOf(wallet.address);
    const tokensReceived = finalLDAOBalance.sub(initialLDAOBalance);
    
    console.log(`\n💰 LDAO balance change:`);
    console.log(`   Before: ${ethers.utils.formatEther(initialLDAOBalance)} LDAO`);
    console.log(`   After:  ${ethers.utils.formatEther(finalLDAOBalance)} LDAO`);
    console.log(`   Received: ${ethers.utils.formatEther(tokensReceived)} LDAO`);
    
    if (tokensReceived.gte(ldaoAmount)) {
      console.log('✅ ETH purchase test completed successfully!');
    } else {
      console.log('❌ Purchase may have failed - received fewer tokens than expected');
    }
    
  } catch (error) {
    console.error('❌ ETH purchase test failed:', error.message);
  }
}

// Run the test
testETHPurchase().catch(console.error);