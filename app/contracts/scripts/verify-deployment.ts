import { ethers } from "hardhat";

async function main() {
  console.log("Verifying LinkDAO Cross-Chain Deployment...");
  
  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deployer account:", deployer.address);
  
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
      console.log("\n=== Deployment Information ===");
      console.log("Network:", deploymentData.network);
      console.log("Chain ID:", deploymentData.chainId);
      console.log("Deployer:", deploymentData.deployer);
      console.log("Timestamp:", deploymentData.timestamp);
      
      console.log("\n=== Deployed Contracts ===");
      for (const [contractName, contractAddress] of Object.entries(deploymentData.contracts)) {
        console.log(`${contractName}: ${contractAddress}`);
        
        // Try to verify contract code
        try {
          const code = await ethers.provider.getCode(contractAddress as string);
          if (code === "0x") {
            console.log(`  ❌ Contract not deployed at ${contractAddress}`);
          } else {
            console.log(`  ✅ Contract verified at ${contractAddress}`);
          }
        } catch (error) {
          console.log(`  ❓ Unable to verify contract at ${contractAddress}`);
        }
      }
    } else {
      console.log(`No deployment file found for ${network.name} (${network.chainId})`);
    }
  } catch (error) {
    console.error("Error reading deployment information:", error);
  }
  
  console.log("\n=== Verification Complete ===");
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Verification failed:", error);
      process.exit(1);
    });
}

export default main;