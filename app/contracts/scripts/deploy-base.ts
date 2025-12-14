import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying to Base Network");
  console.log("==========================");

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deployer:", deployerAddress);

  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);

  // Base mainnet configuration
  const BASE_CONFIG = {
    // You'll need to deploy these first or find existing ones on Base
    LDAOToken: "0x...", // To be deployed
    USDC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", // Base USDC
    MultiSigWallet: "0x...", // To be deployed
    Governance: "0x...", // To be deployed
    // Chainlink ETH/USD on Base
    ETH_USD_FEED: "0x5498BB86BC934c8D34FDA08E81D444153d0D06aD"
  };

  console.log("\n📋 Base Configuration:");
  console.log("USDC (Base):", BASE_CONFIG.USDC);
  console.log("ETH/USD Feed (Base):", BASE_CONFIG.ETH_USD_FEED);

  // 1. Deploy LDAOToken (if not already deployed)
  console.log("\n1️⃣ Deploying LDAOToken...");
  const LDAOTokenFactory = await ethers.getContractFactory("LDAOToken");
  const ldaotoken = await LDAOTokenFactory.deploy(deployerAddress);
  await ldaotoken.waitForDeployment();
  const ldaotokenAddress = await ldaotoken.getAddress();
  console.log("✅ LDAOToken deployed to:", ldaotokenAddress);

  // 2. Deploy MultiSigWallet
  console.log("\n2️⃣ Deploying MultiSigWallet...");
  const MultiSigFactory = await ethers.getContractFactory("MultiSigWallet");
  const multisig = await MultiSigFactory.deploy([deployerAddress], 2); // 2 of N
  await multisig.waitForDeployment();
  const multisigAddress = await multisig.getAddress();
  console.log("✅ MultiSigWallet deployed to:", multisigAddress);

  // 3. Deploy Governance
  console.log("\n3️⃣ Deploying Governance...");
  const GovernanceFactory = await ethers.getContractFactory("Governance");
  const governance = await GovernanceFactory.deploy(deployerAddress);
  await governance.waitForDeployment();
  const governanceAddress = await governance.getAddress();
  console.log("✅ Governance deployed to:", governanceAddress);

  // 4. Deploy Optimized LDAOTreasury
  console.log("\n4️⃣ Deploying Optimized LDAOTreasury...");
  const TreasuryFactory = await ethers.getContractFactory("LDAOTreasuryOptimized");
  const treasury = await TreasuryFactory.deploy(
    ldaotokenAddress,
    BASE_CONFIG.USDC,
    multisigAddress,
    governanceAddress,
    BASE_CONFIG.ETH_USD_FEED
  );
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("✅ LDAOTreasuryOptimized deployed to:", treasuryAddress);

  // 5. Deploy CharityGovernance (separate contract)
  console.log("\n5️⃣ Deploying CharityGovernance...");
  const CharityGovFactory = await ethers.getContractFactory("CharityGovernance");
  const charityGov = await CharityGovFactory.deploy(treasuryAddress, ldaotokenAddress);
  await charityGov.waitForDeployment();
  const charityGovAddress = await charityGov.getAddress();
  console.log("✅ CharityGovernance deployed to:", charityGovAddress);

  // 6. Initial setup
  console.log("\n6️⃣ Initial setup...");
  
  // Transfer LDAO tokens to treasury
  const initialSupply = ethers.parseEther("100000000"); // 100M LDAO
  await ldaotoken.transfer(treasuryAddress, initialSupply);
  console.log("   ✅ Transferred 100M LDAO to treasury");

  // Verify ETH price feed
  const ethPrice = await treasury.getETHPrice();
  console.log("   ETH Price:", ethers.formatEther(ethPrice), "USD");

  // Check contract sizes
  const treasuryCode = await ethers.provider.getCode(treasuryAddress);
  const charityGovCode = await ethers.provider.getCode(charityGovAddress);
  console.log("\n📊 Contract Sizes:");
  console.log("   LDAOTreasuryOptimized:", (treasuryCode.length - 2) / 2, "bytes");
  console.log("   CharityGovernance:", (charityGovCode.length - 2) / 2, "bytes");

  // 7. Save deployment info
  const deploymentInfo = {
    network: "base",
    chainId: network.chainId.toString(),
    deployer: deployerAddress,
    deployedAt: new Date().toISOString(),
    contracts: {
      LDAOToken: { address: ldaotokenAddress },
      MultiSigWallet: { address: multisigAddress },
      Governance: { address: governanceAddress },
      LDAOTreasuryOptimized: { 
        address: treasuryAddress,
        size: (treasuryCode.length - 2) / 2
      },
      CharityGovernance: { 
        address: charityGovAddress,
        size: (charityGovCode.length - 2) / 2
      }
    },
    gasEstimates: {
      treasury: "Optimized for <24KB",
      totalDeployment: "~0.01-0.05 ETH on Base"
    }
  };

  const fs = require('fs');
  fs.writeFileSync(
    `deployments/base-mainnet-${Date.now()}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n✅ Base deployment completed!");
  console.log("\n📋 Next Steps:");
  console.log("1. Verify contracts on BaseScan");
  console.log("2. Update frontend with new addresses");
  console.log("3. Test timelock functionality");
  console.log("4. Configure charity governance parameters");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });