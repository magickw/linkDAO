import { ethers } from "hardhat";

async function main() {
  console.log("Starting LinkDAO Cross-Chain Deployment...");
  
  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log("Deploying to network:", network.name, "Chain ID:", network.chainId);
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());
  
  // Deploy based on network
  if (network.chainId === 1n) { // Ethereum Mainnet
    console.log("\n=== Deploying Source Chain Contracts (Ethereum) ===");
    
    // Deploy LDAO Token (if not already deployed)
    console.log("Deploying LDAO Token...");
    const LDAOToken = await ethers.getContractFactory("LDAOToken");
    const ldaoToken = await LDAOToken.deploy(deployer.address);
    await ldaoToken.waitForDeployment();
    const ldaoTokenAddress = await ldaoToken.getAddress();
    console.log("LDAO Token deployed to:", ldaoTokenAddress);
    
    // Deploy LDAO Bridge
    console.log("Deploying LDAO Bridge...");
    const LDAOBridge = await ethers.getContractFactory("LDAOBridge");
    const ldaoBridge = await LDAOBridge.deploy(ldaoTokenAddress, deployer.address);
    await ldaoBridge.waitForDeployment();
    const ldaoBridgeAddress = await ldaoBridge.getAddress();
    console.log("LDAO Bridge deployed to:", ldaoBridgeAddress);
    
    // Deploy Bridge Validator
    console.log("Deploying Bridge Validator...");
    const BridgeValidator = await ethers.getContractFactory("BridgeValidator");
    const bridgeValidator = await BridgeValidator.deploy(deployer.address);
    await bridgeValidator.waitForDeployment();
    const bridgeValidatorAddress = await bridgeValidator.getAddress();
    console.log("Bridge Validator deployed to:", bridgeValidatorAddress);
    
    // Save deployment info
    const deploymentInfo = {
      network: network.name,
      chainId: network.chainId.toString(),
      deployer: deployer.address,
      contracts: {
        LDAOToken: ldaoTokenAddress,
        LDAOBridge: ldaoBridgeAddress,
        BridgeValidator: bridgeValidatorAddress
      },
      timestamp: new Date().toISOString()
    };
    
    const fs = require("fs");
    fs.writeFileSync(`deployed-cross-chain-ethereum.json`, JSON.stringify(deploymentInfo, null, 2));
    console.log("Deployment info saved to deployed-cross-chain-ethereum.json");
    
  } else if (network.chainId === 8453n) { // Base Mainnet
    console.log("\n=== Deploying Destination Chain Contracts (Base) ===");
    
    // For destination chains, we need the bridge address from source chain
    // In a real deployment, this would be provided as an environment variable
    const bridgeAddress = process.env.LDAO_BRIDGE_ADDRESS || "0x0000000000000000000000000000000000000000";
    
    // Deploy LDAO Bridge Token
    console.log("Deploying LDAO Bridge Token...");
    const LDAOBridgeToken = await ethers.getContractFactory("LDAOBridgeToken");
    const ldaoBridgeToken = await LDAOBridgeToken.deploy(
      "Bridged LinkDAO Token",
      "bLDAO",
      bridgeAddress,
      deployer.address
    );
    await ldaoBridgeToken.waitForDeployment();
    const ldaoBridgeTokenAddress = await ldaoBridgeToken.getAddress();
    console.log("LDAO Bridge Token deployed to:", ldaoBridgeTokenAddress);
    
    // Save deployment info
    const deploymentInfo = {
      network: network.name,
      chainId: network.chainId.toString(),
      deployer: deployer.address,
      contracts: {
        LDAOBridgeToken: ldaoBridgeTokenAddress
      },
      timestamp: new Date().toISOString()
    };
    
    const fs = require("fs");
    fs.writeFileSync(`deployed-cross-chain-base.json`, JSON.stringify(deploymentInfo, null, 2));
    console.log("Deployment info saved to deployed-cross-chain-base.json");
    
  } else if (network.chainId === 137n) { // Polygon Mainnet
    console.log("\n=== Deploying Destination Chain Contracts (Polygon) ===");
    
    // For destination chains, we need the bridge address from source chain
    // In a real deployment, this would be provided as an environment variable
    const bridgeAddress = process.env.LDAO_BRIDGE_ADDRESS || "0x0000000000000000000000000000000000000000";
    
    // Deploy LDAO Bridge Token
    console.log("Deploying LDAO Bridge Token...");
    const LDAOBridgeToken = await ethers.getContractFactory("LDAOBridgeToken");
    const ldaoBridgeToken = await LDAOBridgeToken.deploy(
      "Bridged LinkDAO Token",
      "bLDAO",
      bridgeAddress,
      deployer.address
    );
    await ldaoBridgeToken.waitForDeployment();
    const ldaoBridgeTokenAddress = await ldaoBridgeToken.getAddress();
    console.log("LDAO Bridge Token deployed to:", ldaoBridgeTokenAddress);
    
    // Save deployment info
    const deploymentInfo = {
      network: network.name,
      chainId: network.chainId.toString(),
      deployer: deployer.address,
      contracts: {
        LDAOBridgeToken: ldaoBridgeTokenAddress
      },
      timestamp: new Date().toISOString()
    };
    
    const fs = require("fs");
    fs.writeFileSync(`deployed-cross-chain-polygon.json`, JSON.stringify(deploymentInfo, null, 2));
    console.log("Deployment info saved to deployed-cross-chain-polygon.json");
    
  } else if (network.chainId === 42161n) { // Arbitrum Mainnet
    console.log("\n=== Deploying Destination Chain Contracts (Arbitrum) ===");
    
    // For destination chains, we need the bridge address from source chain
    // In a real deployment, this would be provided as an environment variable
    const bridgeAddress = process.env.LDAO_BRIDGE_ADDRESS || "0x0000000000000000000000000000000000000000";
    
    // Deploy LDAO Bridge Token
    console.log("Deploying LDAO Bridge Token...");
    const LDAOBridgeToken = await ethers.getContractFactory("LDAOBridgeToken");
    const ldaoBridgeToken = await LDAOBridgeToken.deploy(
      "Bridged LinkDAO Token",
      "bLDAO",
      bridgeAddress,
      deployer.address
    );
    await ldaoBridgeToken.waitForDeployment();
    const ldaoBridgeTokenAddress = await ldaoBridgeToken.getAddress();
    console.log("LDAO Bridge Token deployed to:", ldaoBridgeTokenAddress);
    
    // Save deployment info
    const deploymentInfo = {
      network: network.name,
      chainId: network.chainId.toString(),
      deployer: deployer.address,
      contracts: {
        LDAOBridgeToken: ldaoBridgeTokenAddress
      },
      timestamp: new Date().toISOString()
    };
    
    const fs = require("fs");
    fs.writeFileSync(`deployed-cross-chain-arbitrum.json`, JSON.stringify(deploymentInfo, null, 2));
    console.log("Deployment info saved to deployed-cross-chain-arbitrum.json");
    
  } else {
    console.log("\n=== Network not configured for cross-chain deployment ===");
    console.log("Please deploy to Ethereum (source) or Base, Polygon, or Arbitrum (destination) networks.");
    console.log("For testnet deployment, use: npm run deploy:cross-chain:testnet");
  }
  
  console.log("\n=== Cross-Chain Deployment Complete ===");
  console.log("Next steps:");
  console.log("1. If deployed to Ethereum, deploy LDAOBridgeToken to destination chains");
  console.log("2. Set up validator network");
  console.log("3. Initialize chain configurations");
  console.log("4. Test cross-chain transfers");
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Deployment failed:", error);
      process.exit(1);
    });
}

export default main;