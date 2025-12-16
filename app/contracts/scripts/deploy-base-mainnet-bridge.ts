import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying LDAO Bridge Contracts to Base Mainnet");
  console.log("==================================================");

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await deployer.provider.getBalance(deployerAddress);
  
  console.log("Deployer:", deployerAddress);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);

  // Verify we're on Base Mainnet
  if (network.chainId !== 8453n) {
    console.log("❌ This script is designed for Base Mainnet (chain ID 8453)");
    process.exit(1);
  }

  try {
    // Deploy LDAO Bridge Token for Base (destination chain - mint mechanism)
    console.log("\n1️⃣ Deploying LDAO Bridge Token for Base...");
    const LDAOBridgeToken = await ethers.getContractFactory("LDAOBridgeToken");
    const ldaoBridgeToken = await LDAOBridgeToken.deploy(
      "Bridged LinkDAO Token",
      "bLDAO",
      ethers.ZeroAddress, // Bridge address (to be set after bridge deployment)
      deployerAddress
    );
    await ldaoBridgeToken.waitForDeployment();
    const ldaoBridgeTokenAddress = await ldaoBridgeToken.getAddress();
    console.log("✅ LDAO Bridge Token deployed to:", ldaoBridgeTokenAddress);

    // For a complete deployment, we would also need to:
    // 1. Deploy the main LDAO Bridge on Ethereum (source chain)
    // 2. Set up the bridge address in the LDAOBridgeToken contract
    // 3. Configure chain parameters
    // 4. Set up validators

    // Save deployment info
    const deploymentInfo = {
      network: "base-mainnet",
      chainId: network.chainId.toString(),
      deployer: deployerAddress,
      contracts: {
        LDAOBridgeToken: ldaoBridgeTokenAddress
      },
      timestamp: new Date().toISOString()
    };

    const fs = require("fs");
    fs.writeFileSync(
      `deployments/ldao-bridge-base-${Date.now()}.json`,
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("💾 Deployment info saved to deployments/ldao-bridge-base-*.json");

    console.log("\n🎉 LDAO Bridge contracts deployed successfully to Base Mainnet!");
    console.log("\n📋 Next Steps:");
    console.log("1. Deploy LDAO Bridge on Ethereum mainnet");
    console.log("2. Update LDAOBridgeToken with the Ethereum bridge address");
    console.log("3. Configure chain parameters on both contracts");
    console.log("4. Set up validator network");
    console.log("5. Test cross-chain transfers");

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });