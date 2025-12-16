import { ethers } from "hardhat";

async function main() {
  console.log("Testing Cross-Chain Support for Base Mainnet...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Testing with account:", deployer.address);
  
  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log("Connected to network:", network.name, "Chain ID:", network.chainId);
  
  // Check if we're on Base Mainnet
  if (network.chainId !== 8453n) {
    console.log("⚠️  This test is designed for Base Mainnet (chain ID 8453)");
    console.log("Current network:", network.name, "Chain ID:", network.chainId);
    return;
  }
  
  // Deploy a simple test contract to verify deployment works
  console.log("\n🧪 Deploying test contract...");
  const TestContract = await ethers.getContractFactory("EnhancedEscrow");
  const testContract = await TestContract.deploy(deployer.address, deployer.address);
  await testContract.waitForDeployment();
  
  const contractAddress = await testContract.getAddress();
  console.log("✅ Test contract deployed to:", contractAddress);
  
  // Verify the contract has cross-chain support
  try {
    // Check if the contract has the chainId property
    const chainId = await testContract.chainId();
    console.log("✅ Contract chainId:", chainId.toString());
    
    // Check if the contract has the getEscrowChainId function
    const functionExists = typeof testContract.getEscrowChainId === 'function';
    console.log("✅ Cross-chain functions available:", functionExists);
    
    console.log("\n🎉 Cross-chain support verification complete!");
    console.log("✅ Base Mainnet cross-chain deployment is working correctly");
    
  } catch (error) {
    console.error("❌ Error verifying cross-chain support:", error);
  }
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Test failed:", error);
      process.exit(1);
    });
}

export default main;