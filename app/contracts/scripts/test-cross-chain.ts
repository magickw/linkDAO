import { ethers } from "hardhat";

async function main() {
  console.log("Testing LinkDAO Cross-Chain Functionality...");
  
  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);
  
  // Get test accounts
  const [deployer, user1, user2] = await ethers.getSigners();
  console.log("Using accounts:", deployer.address, user1.address, user2.address);
  
  // Try to load deployment info
  try {
    const fs = require("fs");
    let deploymentFile = "";
    
    if (network.chainId === 11155111n) {
      deploymentFile = "deployed-cross-chain-sepolia.json";
    } else if (network.chainId === 84532n) {
      deploymentFile = "deployed-cross-chain-base-sepolia.json";
    } else if (network.chainId === 80001n) {
      deploymentFile = "deployed-cross-chain-polygon-mumbai.json";
    } else if (network.chainId === 421613n) {
      deploymentFile = "deployed-cross-chain-arbitrum-goerli.json";
    } else if (network.chainId === 1n) {
      deploymentFile = "deployed-cross-chain-ethereum.json";
    } else if (network.chainId === 8453n) {
      deploymentFile = "deployed-cross-chain-base.json";
    } else if (network.chainId === 137n) {
      deploymentFile = "deployed-cross-chain-polygon.json";
    } else if (network.chainId === 42161n) {
      deploymentFile = "deployed-cross-chain-arbitrum.json";
    }
    
    if (fs.existsSync(deploymentFile)) {
      const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
      console.log("\n=== Loaded Deployment Information ===");
      console.log("Network:", deploymentData.network);
      console.log("Chain ID:", deploymentData.chainId);
      console.log("Deployer:", deploymentData.deployer);
      
      console.log("\n=== Deployed Contracts ===");
      for (const [contractName, contractAddress] of Object.entries(deploymentData.contracts)) {
        console.log(`${contractName}: ${contractAddress}`);
      }
      
      // If this is the source chain (Sepolia or Ethereum), test bridge functionality
      if (network.chainId === 11155111n || network.chainId === 1n) {
        console.log("\n=== Testing Bridge Functionality ===");
        console.log("This network is a source chain. You can test bridge initiation here.");
        console.log("Example commands:");
        console.log("- Approve tokens for bridging");
        console.log("- Call initiateBridge() with amount and destination chain");
        console.log("- Verify transaction is created");
      } else {
        console.log("\n=== Testing Destination Chain Functionality ===");
        console.log("This network is a destination chain. You can test token minting here.");
        console.log("Example commands:");
        console.log("- Verify bridge token contract is deployed");
        console.log("- Check minting functionality");
        console.log("- Verify supply cap enforcement");
      }
    } else {
      console.log(`\nNo deployment file found for ${network.name} (${network.chainId})`);
      console.log("Please deploy contracts first using the appropriate deployment script.");
    }
  } catch (error) {
    console.error("Error loading deployment information:", error);
  }
  
  console.log("\n=== Cross-Chain Test Instructions ===");
  console.log("To test cross-chain functionality:");
  console.log("1. Deploy source chain contracts (Sepolia/Ethereum)");
  console.log("2. Deploy destination chain contracts (Base Sepolia, Polygon Mumbai, etc.)");
  console.log("3. Set up validator network");
  console.log("4. Initialize chain configurations");
  console.log("5. Run this test script on each network");
  
  console.log("\n=== Manual Testing Instructions ===");
  console.log("On source chain:");
  console.log("1. Approve LDAO tokens for the bridge contract");
  console.log("2. Call initiateBridge() with amount and destination chain ID");
  console.log("3. Verify bridge transaction is created");
  
  console.log("\nOn destination chain:");
  console.log("1. Verify bridge token contract is deployed");
  console.log("2. Check that tokens can be minted by bridge");
  console.log("3. Verify supply cap enforcement");
  
  console.log("\n=== Expected Results ===");
  console.log("✓ All cross-chain transfers complete successfully");
  console.log("✓ Validator consensus works correctly");
  console.log("✓ Tokens are properly locked and minted");
  console.log("✓ Fees are collected and accounted for");
  console.log("✓ Error conditions are handled gracefully");
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Test execution failed:", error);
      process.exit(1);
    });
}

export default main;