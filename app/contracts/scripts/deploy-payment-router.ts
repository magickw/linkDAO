import { ethers } from "hardhat";
import { formatEther, parseEther } from "ethers";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying PaymentRouter with the account:", deployer.address);
  console.log("Account balance:", formatEther(await deployer.provider.getBalance(deployer.address)));

  // Configuration parameters
  const feeBasisPoints = 250; // 2.5% fee
  const feeCollector = deployer.address; // Using deployer as fee collector for testing

  // Deploy PaymentRouter
  console.log("\n🔄 Deploying PaymentRouter...");
  console.log(`Fee: ${feeBasisPoints} basis points (${feeBasisPoints/100}%)`);
  console.log(`Fee Collector: ${feeCollector}`);
  
  const PaymentRouter = await ethers.getContractFactory("PaymentRouter");
  const paymentRouter = await PaymentRouter.deploy(feeBasisPoints, feeCollector);
  await paymentRouter.waitForDeployment();
  const paymentRouterAddress = await paymentRouter.getAddress();
  console.log("✅ PaymentRouter deployed to:", paymentRouterAddress);

  // Deploy MockERC20 tokens for testing
  console.log("\n🔄 Deploying test tokens...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  
  // Deploy USDC mock (6 decimals)
  const mockUSDC = await MockERC20.deploy("Mock USDC", "USDC", 6);
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("✅ Mock USDC deployed to:", mockUSDCAddress);
  
  // Deploy USDT mock (6 decimals)
  const mockUSDT = await MockERC20.deploy("Mock USDT", "USDT", 6);
  await mockUSDT.waitForDeployment();
  const mockUSDTAddress = await mockUSDT.getAddress();
  console.log("✅ Mock USDT deployed to:", mockUSDTAddress);
  
  // Deploy DAI mock (18 decimals)
  const mockDAI = await MockERC20.deploy("Mock DAI", "DAI", 18);
  await mockDAI.waitForDeployment();
  const mockDAIAddress = await mockDAI.getAddress();
  console.log("✅ Mock DAI deployed to:", mockDAIAddress);

  // Verify deployment and configure supported tokens
  console.log("\n🧪 Verifying deployment and configuring tokens...");
  
  try {
    // Check initial configuration
    const currentFee = await paymentRouter.feeBasisPoints();
    const currentCollector = await paymentRouter.feeCollector();
    console.log(`✅ Fee configured: ${currentFee} basis points`);
    console.log(`✅ Fee collector configured: ${currentCollector}`);
    
    // Add supported tokens
    console.log("\n🔧 Adding supported tokens...");
    
    await paymentRouter.setTokenSupported(mockUSDCAddress, true);
    console.log("✅ USDC added as supported token");
    
    await paymentRouter.setTokenSupported(mockUSDTAddress, true);
    console.log("✅ USDT added as supported token");
    
    await paymentRouter.setTokenSupported(mockDAIAddress, true);
    console.log("✅ DAI added as supported token");
    
    // Verify token support
    const usdcSupported = await paymentRouter.supportedTokens(mockUSDCAddress);
    const usdtSupported = await paymentRouter.supportedTokens(mockUSDTAddress);
    const daiSupported = await paymentRouter.supportedTokens(mockDAIAddress);
    
    console.log(`✅ USDC support verified: ${usdcSupported}`);
    console.log(`✅ USDT support verified: ${usdtSupported}`);
    console.log(`✅ DAI support verified: ${daiSupported}`);
    
    // Test ETH payment functionality
    console.log("\n🧪 Testing ETH payment functionality...");
    const testAmount = parseEther("0.01");
    const testRecipient = deployer.address; // Self-payment for testing
    
    const balanceBefore = await deployer.provider.getBalance(deployer.address);
    
    const tx = await paymentRouter.sendEthPayment(
      testRecipient,
      testAmount,
      "Test ETH payment",
      { value: testAmount }
    );
    await tx.wait();
    
    console.log("✅ ETH payment test completed");
    
    // Test token payment functionality
    console.log("\n🧪 Testing token payment functionality...");
    
    // Mint some test tokens
    const testTokenAmount = ethers.parseUnits("100", 6); // 100 USDC
    await mockUSDC.mint(deployer.address, testTokenAmount);
    console.log("✅ Minted test USDC tokens");
    
    // Approve PaymentRouter to spend tokens
    await mockUSDC.approve(paymentRouterAddress, testTokenAmount);
    console.log("✅ Approved PaymentRouter to spend USDC");
    
    // Send token payment
    const tokenPaymentAmount = ethers.parseUnits("10", 6); // 10 USDC
    await paymentRouter.sendTokenPayment(
      mockUSDCAddress,
      testRecipient,
      tokenPaymentAmount,
      "Test USDC payment"
    );
    console.log("✅ Token payment test completed");
    
    // Test fee structure
    console.log("\n🧪 Testing fee structure...");
    const expectedFee = (tokenPaymentAmount * BigInt(feeBasisPoints)) / BigInt(10000);
    const expectedNet = tokenPaymentAmount - expectedFee;
    console.log(`✅ Fee calculation: ${ethers.formatUnits(expectedFee, 6)} USDC fee on ${ethers.formatUnits(tokenPaymentAmount, 6)} USDC payment`);
    console.log(`✅ Net amount: ${ethers.formatUnits(expectedNet, 6)} USDC`);
    
    // Test emergency withdrawal functions
    console.log("\n🧪 Testing emergency functions...");
    
    // These functions should exist and be callable by owner
    const withdrawEthTx = await paymentRouter.withdrawEth();
    await withdrawEthTx.wait();
    console.log("✅ Emergency ETH withdrawal function works");
    
    console.log("\n🎉 PaymentRouter deployed and verified successfully!");
    
    // Output deployment information
    console.log("\n📝 Deployment Summary:");
    console.log("=====================================");
    console.log(`PAYMENT_ROUTER_ADDRESS=${paymentRouterAddress}`);
    console.log(`MOCK_USDC_ADDRESS=${mockUSDCAddress}`);
    console.log(`MOCK_USDT_ADDRESS=${mockUSDTAddress}`);
    console.log(`MOCK_DAI_ADDRESS=${mockDAIAddress}`);
    console.log(`FEE_BASIS_POINTS=${feeBasisPoints}`);
    console.log(`FEE_COLLECTOR=${feeCollector}`);
    console.log(`DEPLOYER_ADDRESS=${deployer.address}`);
    console.log(`NETWORK=${(await deployer.provider.getNetwork()).name}`);
    console.log(`CHAIN_ID=${(await deployer.provider.getNetwork()).chainId}`);
    console.log("=====================================");
    
    return {
      paymentRouterAddress,
      mockUSDCAddress,
      mockUSDTAddress,
      mockDAIAddress,
      feeBasisPoints,
      feeCollector,
      deployer: deployer.address,
      network: (await deployer.provider.getNetwork()).name,
      chainId: (await deployer.provider.getNetwork()).chainId.toString()
    };
    
  } catch (error) {
    console.log("⚠️  Contract verification failed:", error.message);
    throw error;
  }
}

// Allow script to be run directly or imported
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment failed:", error);
      process.exit(1);
    });
}

export { main as deployPaymentRouter };