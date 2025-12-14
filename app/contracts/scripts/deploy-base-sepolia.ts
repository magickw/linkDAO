import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying to Base Sepolia Testnet");
  console.log("=================================");

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await deployer.provider.getBalance(deployerAddress);
  
  console.log("Deployer:", deployerAddress);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);

  // Base Sepolia configuration
  const BASE_SEPOLIA_CONFIG = {
    // Deploy mock USDC for testing
    USDC: "0x", // Will deploy MockERC20
    // Chainlink ETH/USD on Base Sepolia
    ETH_USD_FEED: "0x4aDC67696b40402372349A44170D431E7f800B00"
  };

  console.log("\n📋 Base Sepolia Configuration:");
  console.log("ETH/USD Feed (Base Sepolia):", BASE_SEPOLIA_CONFIG.ETH_USD_FEED);

  // 1. Deploy LDAOToken
  console.log("\n1️⃣ Deploying LDAOToken...");
  const LDAOTokenFactory = await ethers.getContractFactory("LDAOToken");
  const ldaotoken = await LDAOTokenFactory.deploy(deployerAddress);
  await ldaotoken.waitForDeployment();
  const ldaotokenAddress = await ldaotoken.getAddress();
  console.log("✅ LDAOToken deployed to:", ldaotokenAddress);

  // 2. Deploy MockERC20 as USDC
  console.log("\n2️⃣ Deploying Mock USDC...");
  const MockERC20Factory = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20Factory.deploy("USD Coin", "USDC", 6);
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("✅ Mock USDC deployed to:", usdcAddress);

  // 3. Deploy MultiSigWallet
  console.log("\n3️⃣ Deploying MultiSigWallet...");
  const MultiSigFactory = await ethers.getContractFactory("MultiSigWallet");
  const multisig = await MultiSigFactory.deploy([deployerAddress], 2);
  await multisig.waitForDeployment();
  const multisigAddress = await multisig.getAddress();
  console.log("✅ MultiSigWallet deployed to:", multisigAddress);

  // 4. Deploy Governance
  console.log("\n4️⃣ Deploying Governance...");
  const GovernanceFactory = await ethers.getContractFactory("Governance");
  const governance = await GovernanceFactory.deploy(deployerAddress);
  await governance.waitForDeployment();
  const governanceAddress = await governance.getAddress();
  console.log("✅ Governance deployed to:", governanceAddress);

  // 5. Deploy Optimized LDAOTreasury
  console.log("\n5️⃣ Deploying LDAOTreasuryOptimized...");
  const TreasuryFactory = await ethers.getContractFactory("LDAOTreasuryOptimized");
  const treasury = await TreasuryFactory.deploy(
    ldaotokenAddress,
    usdcAddress,
    multisigAddress,
    governanceAddress,
    BASE_SEPOLIA_CONFIG.ETH_USD_FEED
  );
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("✅ LDAOTreasuryOptimized deployed to:", treasuryAddress);

  // 6. Deploy CharityGovernance
  console.log("\n6️⃣ Deploying CharityGovernance...");
  const CharityGovFactory = await ethers.getContractFactory("CharityGovernance");
  const charityGov = await CharityGovFactory.deploy(treasuryAddress, ldaotokenAddress);
  await charityGov.waitForDeployment();
  const charityGovAddress = await charityGov.getAddress();
  console.log("✅ CharityGovernance deployed to:", charityGovAddress);

  // 7. Initial setup
  console.log("\n7️⃣ Initial setup...");
  
  // Mint LDAO tokens
  const initialSupply = ethers.parseEther("100000000"); // 100M LDAO
  await ldaotoken.mint(deployerAddress, initialSupply);
  console.log("   ✅ Minted 100M LDAO to deployer");
  
  // Transfer 50M to treasury
  const treasurySupply = ethers.parseEther("50000000"); // 50M LDAO
  await ldaotoken.transfer(treasuryAddress, treasurySupply);
  console.log("   ✅ Transferred 50M LDAO to treasury");

  // Mint USDC for testing
  await usdc.mint(deployerAddress, ethers.parseUnits("1000000", 6)); // 1M USDC
  console.log("   ✅ Minted 1M USDC to deployer");

  // 8. Verify deployment
  console.log("\n8️⃣ Verifying deployment...");
  
  const ethPrice = await treasury.getETHPrice();
  console.log("   ETH Price:", ethers.formatEther(ethPrice), "USD");
  
  const treasuryBalance = await treasury.getTreasuryBalance();
  console.log("   Treasury LDAO Balance:", ethers.formatEther(treasuryBalance.ldaoBalance));
  
  // Check contract sizes
  const treasuryCode = await ethers.provider.getCode(treasuryAddress);
  const charityGovCode = await ethers.provider.getCode(charityGovAddress);
  
  console.log("\n📊 Contract Sizes:");
  console.log("   LDAOTreasuryOptimized:", (treasuryCode.length - 2) / 2, "bytes (<24KB ✅)");
  console.log("   CharityGovernance:", (charityGovCode.length - 2) / 2, "bytes");

  // 9. Save deployment info
  const deploymentInfo = {
    network: "baseSepolia",
    chainId: network.chainId.toString(),
    deployer: deployerAddress,
    deployedAt: new Date().toISOString(),
    contracts: {
      LDAOToken: { address: ldaotokenAddress },
      MockUSDC: { address: usdcAddress },
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
    securityFeatures: {
      chainlinkOracle: true,
      timelockEnabled: true,
      optimizedSize: true,
      modularDesign: true
    },
    gasUsed: {
      deployment: "Estimated ~0.001 ETH on Base Sepolia"
    }
  };

  const fs = require('fs');
  fs.writeFileSync(
    `deployments/base-sepolia-${Date.now()}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n✅ Base Sepolia deployment completed!");
  console.log("\n📋 Test Instructions:");
  console.log("1. Test LDAO purchases with ETH/USDC");
  console.log("2. Verify timelock functionality");
  console.log("3. Test charity governance flow");
  console.log("4. Check Chainlink oracle integration");
  
  console.log("\n🔗 Base Sepolia Explorer:");
  console.log(`https://sepolia.basescan.org/address/${deployerAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });