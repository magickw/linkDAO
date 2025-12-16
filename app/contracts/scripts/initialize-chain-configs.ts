import { ethers } from "hardhat";

async function main() {
  console.log("Initializing chain configurations...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  
  // Load cross-chain configuration
  const crossChainConfig = require("../cross-chain-deployment-config.json");
  
  // Load deployed contract addresses
  // In a real deployment, you would load these from the deployment files
  const deployedAddresses = {
    "ethereum": {
      "LDAOBridge": "0x...", // Replace with actual deployed address
      "BridgeValidator": "0x..." // Replace with actual deployed address
    },
    "base": {
      "LDAOBridgeToken": "0x..." // Replace with actual deployed address
    },
    "polygon": {
      "LDAOBridgeToken": "0x..." // Replace with actual deployed address
    },
    "arbitrum": {
      "LDAOBridgeToken": "0x..." // Replace with actual deployed address
    }
  };
  
  // Connect to LDAO Bridge contract on Ethereum (source chain)
  const ldaoBridgeAddress = deployedAddresses.ethereum.LDAOBridge;
  const LDAOBridge = await ethers.getContractFactory("LDAOBridge");
  const ldaoBridge = LDAOBridge.attach(ldaoBridgeAddress);
  
  console.log("Connected to LDAO Bridge at:", ldaoBridgeAddress);
  
  // Initialize chain configurations
  console.log("Initializing chain configurations...");
  
  // Map chain names to LDAOBridge.ChainId enum values
  const chainIdMap: { [key: string]: number } = {
    "ethereum": 0,
    "polygon": 1,
    "arbitrum": 2,
    "base": 3
  };
  
  // Update chain configurations for each supported chain
  for (const [chainName, chainConfig] of Object.entries(crossChainConfig.chainConfigs)) {
    const config: any = chainConfig;
    if (config.isSupported) {
      try {
        const chainId = chainIdMap[chainName];
        if (chainId !== undefined) {
          console.log(`Updating configuration for ${chainName} (Chain ID: ${chainId})...`);
          
          // Get the token address for this chain
          let tokenAddress = config.tokenAddress;
          if (chainName !== "ethereum") {
            // For destination chains, use the deployed bridge token address
            const chainAddresses: any = (deployedAddresses as any)[chainName];
            tokenAddress = chainAddresses?.LDAOBridgeToken || tokenAddress;
          }
          
          // Update chain configuration
          const tx = await ldaoBridge.updateChainConfig(chainId, {
            isSupported: config.isSupported,
            minBridgeAmount: ethers.parseEther(config.minBridgeAmount.replace('10000000000000000000', '10')),
            maxBridgeAmount: ethers.parseEther(config.maxBridgeAmount.replace('1000000000000000000000000', '1000000')),
            baseFee: ethers.parseEther(config.baseFee.replace('1000000000000000000', '1')),
            feePercentage: config.feePercentage,
            tokenAddress: tokenAddress,
            isLockChain: config.isLockChain
          });
          
          if ('wait' in tx) await (tx as any).wait();
          console.log(`✓ Configuration updated for ${chainName}`);
        }
      } catch (error) {
        console.error(`✗ Failed to update configuration for ${chainName}:`, error);
      }
    }
  }
  
  console.log("\n=== Chain Configuration Initialization Complete ===");
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Initialization failed:", error);
      process.exit(1);
    });
}

export default main;