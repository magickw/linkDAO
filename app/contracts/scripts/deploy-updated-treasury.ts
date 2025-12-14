import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying Updated LDAOTreasury with Security Fixes");
  console.log("=====================================================");

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deployer:", deployerAddress);

  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);

  // Existing contract addresses from deployedAddresses-sepolia.json
  const EXISTING_CONTRACTS = {
    LDAOToken: "0xc9F690B45e33ca909bB9ab97836091673232611B",
    Governance: "0x27a78A860445DFFD9073aFd7065dd421487c0F8A",
    MultiSigWallet: "0xA0bD2057F45Deb2553745B5ddbB6e2AB80cFCE98",
    // You'll need to deploy or find a MockERC20 for USDC on Sepolia
    USDC: "0xA31D2faD2B1Ab84Fb420824A5CF3aB5a272782CC" // Using existing MockERC20 as USDC
  };

  // Chainlink ETH/USD Price Feed on Sepolia
  const CHAINLINK_ETH_USD_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

  console.log("\n📋 Deployment Configuration:");
  console.log("LDAOToken:", EXISTING_CONTRACTS.LDAOToken);
  console.log("Governance:", EXISTING_CONTRACTS.Governance);
  console.log("MultiSigWallet:", EXISTING_CONTRACTS.MultiSigWallet);
  console.log("USDC (Mock):", EXISTING_CONTRACTS.USDC);
  console.log("Chainlink ETH/USD Feed:", CHAINLINK_ETH_USD_FEED);

  // 1. Deploy the updated LDAOTreasury
  console.log("\n1️⃣ Deploying updated LDAOTreasury...");
  const LDAOTreasuryFactory = await ethers.getContractFactory("LDAOTreasury");
  const ldaotreasury = await LDAOTreasuryFactory.deploy(
    EXISTING_CONTRACTS.LDAOToken,
    EXISTING_CONTRACTS.USDC,
    EXISTING_CONTRACTS.MultiSigWallet,
    EXISTING_CONTRACTS.Governance,
    CHAINLINK_ETH_USD_FEED
  );
  await ldaotreasury.waitForDeployment();
  const ldaotreasuryAddress = await ldaotreasury.getAddress();
  console.log("✅ Updated LDAOTreasury deployed to:", ldaotreasuryAddress);

  // 2. Deploy CharityMonitor (if not already deployed)
  console.log("\n2️⃣ Deploying CharityMonitor...");
  const CharityMonitorFactory = await ethers.getContractFactory("CharityMonitor");
  const charityMonitor = await CharityMonitorFactory.deploy(ldaotreasuryAddress);
  await charityMonitor.waitForDeployment();
  const charityMonitorAddress = await charityMonitor.getAddress();
  console.log("✅ CharityMonitor deployed to:", charityMonitorAddress);

  // 3. Verify initial setup
  console.log("\n3️⃣ Verifying deployment...");
  
  // Check ETH price feed connection
  const ethPrice = await ldaotreasury.getETHPrice();
  console.log("   ETH Price from oracle:", ethers.formatEther(ethPrice), "USD");

  // Check timelock delay
  const timelockDelay = await ldaotreasury.TIMELOCK_DELAY();
  console.log("   Timelock delay:", timelockDelay.toString(), "seconds");

  // Check if treasury is paused
  const isPaused = await ldaotreasury.paused();
  console.log("   Treasury paused:", isPaused);

  // 4. Save deployment information
  console.log("\n4️⃣ Saving deployment information...");
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployerAddress,
    deployedAt: new Date().toISOString(),
    contracts: {
      UpdatedLDAOTreasury: {
        address: ldaotreasuryAddress,
        constructorArgs: [
          EXISTING_CONTRACTS.LDAOToken,
          EXISTING_CONTRACTS.USDC,
          EXISTING_CONTRACTS.MultiSigWallet,
          EXISTING_CONTRACTS.Governance,
          CHAINLINK_ETH_USD_FEED
        ]
      },
      CharityMonitor: {
        address: charityMonitorAddress,
        treasury: ldaotreasuryAddress
      }
    },
    securityFeatures: {
      chainlinkOracle: true,
      timelockEnabled: true,
      reentrancyGuard: true,
      accessControls: true
    }
  };

  // Write to file
  const fs = require('fs');
  const deploymentFile = `deployments/updated-treasury-${network.name}-${Date.now()}.json`;
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`   ✅ Deployment info saved to: ${deploymentFile}`);

  // 5. Next steps
  console.log("\n📋 Next Steps:");
  console.log("1. Update any frontend contracts to point to the new treasury address");
  console.log("2. Transfer any LDAO tokens from old treasury to new treasury");
  console.log("3. Transfer any ETH/USDC from old treasury to new treasury");
  console.log("4. Test the timelock functionality with a small withdrawal");
  console.log("5. Verify Chainlink oracle is working correctly");

  console.log("\n✅ Deployment completed successfully!");
  console.log("New LDAOTreasury address:", ldaotreasuryAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });