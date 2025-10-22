import { ethers } from "hardhat";
import { Contract } from "ethers";

interface DeploymentResult {
  ldaoBridge: Contract;
  bridgeValidator: Contract;
  ldaoBridgeToken?: Contract;
}

async function main(): Promise<DeploymentResult> {
  console.log("Starting LDAO Bridge deployment...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);

  // Deploy or get existing LDAO Token address
  let ldaoTokenAddress: string;
  
  try {
    // Try to get existing LDAO Token deployment
    const existingDeployments = require("../deployed-addresses-localhost.json");
    ldaoTokenAddress = existingDeployments.LDAOToken;
    console.log("Using existing LDAO Token at:", ldaoTokenAddress);
  } catch (error) {
    // Deploy LDAO Token if not exists
    console.log("Deploying LDAO Token...");
    const LDAOToken = await ethers.getContractFactory("LDAOToken");
    const ldaoToken = await LDAOToken.deploy(deployer.address);
    await ldaoToken.waitForDeployment();
    ldaoTokenAddress = await ldaoToken.getAddress();
    console.log("LDAO Token deployed to:", ldaoTokenAddress);
  }

  // Deploy Bridge Validator
  console.log("Deploying Bridge Validator...");
  const BridgeValidator = await ethers.getContractFactory("BridgeValidator");
  const bridgeValidator = await BridgeValidator.deploy(deployer.address);
  await bridgeValidator.waitForDeployment();
  const bridgeValidatorAddress = await bridgeValidator.getAddress();
  console.log("Bridge Validator deployed to:", bridgeValidatorAddress);

  // Deploy LDAO Bridge
  console.log("Deploying LDAO Bridge...");
  const LDAOBridge = await ethers.getContractFactory("LDAOBridge");
  const ldaoBridge = await LDAOBridge.deploy(ldaoTokenAddress, deployer.address);
  await ldaoBridge.waitForDeployment();
  const ldaoBridgeAddress = await ldaoBridge.getAddress();
  console.log("LDAO Bridge deployed to:", ldaoBridgeAddress);

  // Deploy Bridge Token for destination chains (if not Ethereum mainnet)
  let ldaoBridgeToken: Contract | undefined;
  if (network.chainId !== 1n) { // Not Ethereum mainnet
    console.log("Deploying LDAO Bridge Token for destination chain...");
    const LDAOBridgeToken = await ethers.getContractFactory("LDAOBridgeToken");
    ldaoBridgeToken = await LDAOBridgeToken.deploy(
      "Bridged LinkDAO Token",
      "bLDAO",
      ldaoBridgeAddress,
      deployer.address
    );
    await ldaoBridgeToken.waitForDeployment();
    const ldaoBridgeTokenAddress = await ldaoBridgeToken.getAddress();
    console.log("LDAO Bridge Token deployed to:", ldaoBridgeTokenAddress);
  }

  // Initialize bridge with validators
  console.log("Setting up initial validators...");
  
  // Add deployer as initial validator (for testing)
  const stakeAmount = ethers.parseEther("10000"); // 10,000 LDAO
  
  // First, approve the validator contract to spend tokens
  const ldaoToken = await ethers.getContractAt("LDAOToken", ldaoTokenAddress);
  const approveTx = await ldaoToken.approve(bridgeValidatorAddress, stakeAmount);
  await approveTx.wait();
  console.log("Approved validator contract to spend LDAO tokens");

  // Add validator
  const addValidatorTx = await bridgeValidator.addValidator(deployer.address, stakeAmount);
  await addValidatorTx.wait();
  console.log("Added initial validator:", deployer.address);

  // Configure bridge fee collection
  console.log("Configuring bridge parameters...");
  
  // Set validator threshold to 1 for testing (in production, should be higher)
  const setThresholdTx = await bridgeValidator.updateThreshold(1);
  await setThresholdTx.wait();
  console.log("Set validator threshold to 1");

  // Save deployment addresses
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    contracts: {
      LDAOToken: ldaoTokenAddress,
      LDAOBridge: ldaoBridgeAddress,
      BridgeValidator: bridgeValidatorAddress,
      ...(ldaoBridgeToken && { LDAOBridgeToken: await ldaoBridgeToken.getAddress() })
    },
    timestamp: new Date().toISOString()
  };

  // Write deployment info to file
  const fs = require("fs");
  const deploymentFile = `deployed-bridge-addresses-${network.name}.json`;
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment info saved to ${deploymentFile}`);

  console.log("\n=== LDAO Bridge Deployment Complete ===");
  console.log("LDAO Token:", ldaoTokenAddress);
  console.log("LDAO Bridge:", ldaoBridgeAddress);
  console.log("Bridge Validator:", bridgeValidatorAddress);
  if (ldaoBridgeToken) {
    console.log("LDAO Bridge Token:", await ldaoBridgeToken.getAddress());
  }
  console.log("==========================================");

  return {
    ldaoBridge,
    bridgeValidator,
    ldaoBridgeToken
  };
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