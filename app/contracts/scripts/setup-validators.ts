import { ethers } from "hardhat";

async function main() {
  console.log("Setting up validators for cross-chain bridge...");
  
  // Load cross-chain configuration
  const crossChainConfig = require("../cross-chain-deployment-config.json");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  
  // Load deployed contract addresses
  // In a real deployment, you would load these from the deployment files
  const deployedAddresses = {
    "ethereum": {
      "LDAOToken": "0x...", // Replace with actual deployed address
      "BridgeValidator": "0x..." // Replace with actual deployed address
    }
  };
  
  // Connect to Bridge Validator contract on Ethereum (source chain)
  const bridgeValidatorAddress = deployedAddresses.ethereum.BridgeValidator;
  const BridgeValidator = await ethers.getContractFactory("BridgeValidator");
  const bridgeValidator = BridgeValidator.attach(bridgeValidatorAddress);
  
  console.log("Connected to Bridge Validator at:", bridgeValidatorAddress);
  
  // Connect to LDAO Token contract
  const ldaoTokenAddress = deployedAddresses.ethereum.LDAOToken;
  const LDAOToken = await ethers.getContractFactory("LDAOToken");
  const ldaoToken = LDAOToken.attach(ldaoTokenAddress);
  
  console.log("Connected to LDAO Token at:", ldaoTokenAddress);
  
  // Set up initial validators
  console.log("Setting up initial validators...");
  
  // Get stake amount from configuration
  const stakeAmount = ethers.parseEther(crossChainConfig.validators.stakeAmount.toString());
  console.log(`Required stake amount: ${ethers.formatEther(stakeAmount)} LDAO`);
  
  // Add each validator
  for (const validatorAddress of crossChainConfig.validators.initialValidators) {
    try {
      console.log(`Adding validator: ${validatorAddress}`);
      
      // Check if validator already exists
      const isValidator = await bridgeValidator.isValidator(validatorAddress);
      if (isValidator) {
        console.log(`✓ Validator ${validatorAddress} already exists`);
        continue;
      }
      
      // Approve validator contract to spend tokens
      console.log(`Approving ${ethers.formatEther(stakeAmount)} LDAO for validator ${validatorAddress}...`);
      const approveTx = await ldaoToken.approve(bridgeValidatorAddress, stakeAmount);
      if ('wait' in approveTx) await (approveTx as any).wait();
      console.log(`✓ Approved tokens for ${validatorAddress}`);
      
      // Add validator
      console.log(`Adding validator ${validatorAddress}...`);
      const addTx = await bridgeValidator.addValidator(validatorAddress, stakeAmount);
      if ('wait' in addTx) await (addTx as any).wait();
      console.log(`✓ Added validator ${validatorAddress}`);
      
    } catch (error) {
      console.error(`✗ Failed to add validator ${validatorAddress}:`, error);
    }
  }
  
  // Set validator threshold
  console.log(`Setting validator threshold to ${crossChainConfig.bridge.parameters.validatorThreshold}...`);
  try {
    const thresholdTx = await bridgeValidator.updateThreshold(crossChainConfig.bridge.parameters.validatorThreshold);
    if ('wait' in thresholdTx) await (thresholdTx as any).wait();
    console.log(`✓ Validator threshold set to ${crossChainConfig.bridge.parameters.validatorThreshold}`);
  } catch (error) {
    console.error("✗ Failed to set validator threshold:", error);
  }
  
  // Verify validator setup
  console.log("Verifying validator setup...");
  try {
    const validatorCount = await bridgeValidator.getActiveValidatorCount();
    console.log(`Total active validators: ${validatorCount}`);
    
    for (const validatorAddress of crossChainConfig.validators.initialValidators) {
      const isValidator = await bridgeValidator.isValidator(validatorAddress);
      const validatorInfo = await bridgeValidator.validators(validatorAddress);
      console.log(`Validator ${validatorAddress}: ${isValidator ? 'Active' : 'Inactive'}`);
      if (isValidator) {
        console.log(`  Stake: ${ethers.formatEther(validatorInfo.stake)} LDAO`);
        console.log(`  Reputation: ${validatorInfo.reputation}`);
      }
    }
  } catch (error) {
    console.error("✗ Failed to verify validator setup:", error);
  }
  
  console.log("\n=== Validator Setup Complete ===");
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Validator setup failed:", error);
      process.exit(1);
    });
}

export default main;