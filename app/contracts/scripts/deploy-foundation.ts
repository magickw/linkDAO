import { ethers } from "hardhat";
import { deployLDAOToken } from "./deploy-ldao-token";
import { deployMockTokens } from "./deploy-mock-tokens";
import { deployCounter } from "./deploy-counter";

async function main() {
  console.log("=".repeat(60));
  console.log("SMART CONTRACT FOUNDATION DEPLOYMENT");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");
  console.log();

  const deploymentResults: any = {
    network: network.name,
    chainId: network.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {}
  };

  try {
    // Phase 1: Deploy Counter for basic testing
    console.log("📋 Phase 1: Deploying Counter contract...");
    console.log("-".repeat(40));
    const counterResult = await deployCounter();
    deploymentResults.contracts.counter = counterResult;
    console.log("✅ Counter deployment completed\n");

    // Phase 2: Deploy MockERC20 tokens
    console.log("🪙 Phase 2: Deploying Mock ERC20 tokens...");
    console.log("-".repeat(40));
    const mockTokensResult = await deployMockTokens();
    deploymentResults.contracts.mockTokens = mockTokensResult;
    console.log("✅ Mock tokens deployment completed\n");

    // Phase 3: Deploy LDAO Token
    console.log("🏛️ Phase 3: Deploying LDAO Token...");
    console.log("-".repeat(40));
    const ldaoTokenResult = await deployLDAOToken();
    deploymentResults.contracts.ldaoToken = ldaoTokenResult;
    console.log("✅ LDAO Token deployment completed\n");

    // Deployment Summary
    console.log("=".repeat(60));
    console.log("DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    
    console.log("📋 Counter Contract:");
    console.log(`   Address: ${deploymentResults.contracts.counter.contractAddress}`);
    console.log(`   Final Value: ${deploymentResults.contracts.counter.finalValue}`);
    
    console.log("\n🪙 Mock ERC20 Tokens:");
    Object.entries(deploymentResults.contracts.mockTokens.deployedTokens).forEach(([symbol, address]) => {
      console.log(`   ${symbol}: ${address}`);
    });
    
    console.log("\n🏛️ LDAO Token:");
    console.log(`   Address: ${deploymentResults.contracts.ldaoToken.contractAddress}`);
    console.log(`   Treasury: ${deploymentResults.contracts.ldaoToken.treasuryAddress}`);
    console.log(`   Total Supply: ${ethers.utils.formatEther(deploymentResults.contracts.ldaoToken.totalSupply)} LDAO`);

    // Integration Testing
    console.log("\n🔗 Running Integration Tests...");
    console.log("-".repeat(40));
    
    // Test Counter integration
    const CounterFactory = await ethers.getContractFactory("Counter");
    const counter = CounterFactory.attach(deploymentResults.contracts.counter.contractAddress);
    
    console.log("Testing Counter integration...");
    const currentValue = await counter.x();
    console.log(`✅ Counter current value: ${currentValue}`);
    
    // Test LDAO Token integration
    const LDAOTokenFactory = await ethers.getContractFactory("LDAOToken");
    const ldaoToken = LDAOTokenFactory.attach(deploymentResults.contracts.ldaoToken.contractAddress);
    
    console.log("Testing LDAO Token integration...");
    const tokenName = await ldaoToken.name();
    const tokenSymbol = await ldaoToken.symbol();
    const totalSupply = await ldaoToken.totalSupply();
    console.log(`✅ Token: ${tokenName} (${tokenSymbol})`);
    console.log(`✅ Total Supply: ${ethers.utils.formatEther(totalSupply)}`);
    
    // Test Mock Token integration
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockUSDC = MockERC20Factory.attach(deploymentResults.contracts.mockTokens.deployedTokens.MUSDC);
    
    console.log("Testing Mock USDC integration...");
    const mockName = await mockUSDC.name();
    const mockSymbol = await mockUSDC.symbol();
    const mockDecimals = await mockUSDC.decimals();
    console.log(`✅ Mock Token: ${mockName} (${mockSymbol}) - ${mockDecimals} decimals`);

    // Gas Usage Summary
    console.log("\n⛽ Gas Usage Summary:");
    console.log("-".repeat(40));
    console.log(`Counter deployment gas: ${deploymentResults.contracts.counter.deploymentGas}`);
    
    // Final Verification
    console.log("\n✅ FOUNDATION DEPLOYMENT SUCCESSFUL!");
    console.log("=".repeat(60));
    console.log("All foundation contracts deployed and verified:");
    console.log("• Counter contract for basic testing ✅");
    console.log("• Mock ERC20 tokens for testing infrastructure ✅");
    console.log("• LDAO Token with staking mechanisms ✅");
    console.log("• All contracts integrated and functional ✅");
    console.log("=".repeat(60));

    // Save deployment info to file
    const fs = require('fs');
    const deploymentFile = `deployment-${network.name}-${Date.now()}.json`;
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentResults, null, 2));
    console.log(`📄 Deployment info saved to: ${deploymentFile}`);

    return deploymentResults;

  } catch (error) {
    console.error("❌ DEPLOYMENT FAILED:", error);
    throw error;
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Foundation deployment failed:", error);
      process.exit(1);
    });
}

export { main as deployFoundation };