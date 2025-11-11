const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("=".repeat(60));
  console.log("CHARITY GOVERNANCE SYSTEM DEPLOYMENT");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);
  console.log("Deploying with account:", deployer.address);
  // const balance = await ethers.provider.getBalance(deployer.address);
  // console.log("Account balance:", ethers.formatUnits(balance, 18), "ETH");

  const deploymentAddresses = {};

  // Step 1: Get or verify existing core contracts
  console.log("\n" + "=".repeat(60));
  console.log("STEP 1: VERIFYING CORE CONTRACTS");
  console.log("=".repeat(60));

  // Get LDAOToken address
  console.log("\n🔄 Locating LDAOToken contract...");
  let ldaoTokenAddress = process.env.LDAO_TOKEN_ADDRESS || "";

  if (!ldaoTokenAddress) {
    const deployedAddressesPath = path.join(__dirname, '../deployedAddresses-sepolia.json');
    if (fs.existsSync(deployedAddressesPath)) {
      const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, 'utf8'));
      ldaoTokenAddress = deployedAddresses.contracts?.LDAOToken?.address || deployedAddresses.LDAO_TOKEN_ADDRESS || deployedAddresses.TOKEN_ADDRESS;
    }
  }

  if (!ldaoTokenAddress) {
    throw new Error("LDAOToken address not found. Please set LDAO_TOKEN_ADDRESS environment variable");
  }

  const code = await ethers.provider.getCode(ldaoTokenAddress);
  if (code === "0x") {
    throw new Error("Token contract not found at address");
  }
  console.log("✅ Found existing LDAOToken at:", ldaoTokenAddress);
  deploymentAddresses.ldaoToken = ldaoTokenAddress;

  // Get USDC token address
  console.log("\n🔄 Locating USDC/MockERC20 contract...");
  let usdcTokenAddress = process.env.USDC_TOKEN_ADDRESS || "";

  if (!usdcTokenAddress) {
    const deployedAddressesPath = path.join(__dirname, '../deployedAddresses-sepolia.json');
    if (fs.existsSync(deployedAddressesPath)) {
      const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, 'utf8'));
      usdcTokenAddress = deployedAddresses.contracts?.MockERC20?.address || deployedAddresses.USDC_TOKEN_ADDRESS;
    }
  }

  if (!usdcTokenAddress) {
    console.log("⚠️  USDC token address not provided, using default charity recipient as placeholder...");
    usdcTokenAddress = deployer.address; // Use deployer as placeholder
  }

  console.log("✅ Using USDC/MockERC20 at:", usdcTokenAddress);
  deploymentAddresses.usdcToken = usdcTokenAddress;

  // Get MultiSigWallet address
  console.log("\n🔄 Locating MultiSigWallet...");
  let multiSigWalletAddress = process.env.MULTISIG_WALLET_ADDRESS || "";

  if (!multiSigWalletAddress) {
    const deployedAddressesPath = path.join(__dirname, '../deployedAddresses-sepolia.json');
    if (fs.existsSync(deployedAddressesPath)) {
      const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, 'utf8'));
      multiSigWalletAddress = deployedAddresses.contracts?.MultiSigWallet?.address || deployedAddresses.MULTISIG_WALLET_ADDRESS;
    }
  }

  if (!multiSigWalletAddress) {
    console.log("⚠️  MultiSigWallet not found, deploying new one...");
    const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
  const multiSig = await MultiSigWallet.deploy([deployer.address], 1);
  await multiSig.deployed();
  multiSigWalletAddress = multiSig.address;
    console.log("✅ Deployed MultiSigWallet at:", multiSigWalletAddress);
  } else {
    console.log("✅ Using existing MultiSigWallet at:", multiSigWalletAddress);
  }
  deploymentAddresses.multiSigWallet = multiSigWalletAddress;

  // Step 2: Deploy EnhancedLDAOTreasury
  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: DEPLOYING ENHANCED LDAO TREASURY");
  console.log("=".repeat(60));

  const EnhancedLDAOTreasury = await ethers.getContractFactory("EnhancedLDAOTreasury");
  console.log("\n🔄 Deploying EnhancedLDAOTreasury...");

  const treasury = await EnhancedLDAOTreasury.deploy(
    ldaoTokenAddress,
    usdcTokenAddress,
    multiSigWalletAddress
  );
  await treasury.deployed();
  const treasuryAddress = treasury.address;
  deploymentAddresses.enhancedLDAOTreasury = treasuryAddress;
  console.log("✅ EnhancedLDAOTreasury deployed to:", treasuryAddress);

  // Step 3: Deploy CharityVerificationSystem
  console.log("\n" + "=".repeat(60));
  console.log("STEP 3: DEPLOYING CHARITY VERIFICATION SYSTEM");
  console.log("=".repeat(60));

  const CharityVerificationSystem = await ethers.getContractFactory("CharityVerificationSystem");
  console.log("\n🔄 Deploying CharityVerificationSystem...");

  const charityVerification = await CharityVerificationSystem.deploy(
    ldaoTokenAddress,
    treasuryAddress,
    deployer.address
  );
  await charityVerification.deployed();
  const charityVerificationAddress = charityVerification.address;
  deploymentAddresses.charityVerificationSystem = charityVerificationAddress;
  console.log("✅ CharityVerificationSystem deployed to:", charityVerificationAddress);

  // Step 4: Deploy CharityProposal
  console.log("\n" + "=".repeat(60));
  console.log("STEP 4: DEPLOYING CHARITY PROPOSAL CONTRACT");
  console.log("=".repeat(60));

  const CharityProposal = await ethers.getContractFactory("CharityProposal");
  console.log("\n🔄 Deploying CharityProposal...");

  const charityProposal = await CharityProposal.deploy(
    ldaoTokenAddress,
    treasuryAddress
  );
  await charityProposal.deployed();
  const charityProposalAddress = charityProposal.address;
  deploymentAddresses.charityProposal = charityProposalAddress;
  console.log("✅ CharityProposal deployed to:", charityProposalAddress);

  // Step 5: Deploy CharityGovernance
  console.log("\n" + "=".repeat(60));
  console.log("STEP 5: DEPLOYING CHARITY GOVERNANCE");
  console.log("=".repeat(60));

  const CharityGovernance = await ethers.getContractFactory("CharityGovernance");
  console.log("\n🔄 Deploying CharityGovernance...");

  const charityGovernance = await CharityGovernance.deploy(
    ldaoTokenAddress,
    treasuryAddress
  );
  await charityGovernance.deployed();
  const charityGovernanceAddress = charityGovernance.address;
  deploymentAddresses.charityGovernance = charityGovernanceAddress;
  console.log("✅ CharityGovernance deployed to:", charityGovernanceAddress);

  // Configure charity governance
  console.log("\n🔧 Configuring charity governance parameters...");
  try {
    const authTx = await charityGovernance.authorizeTarget(treasuryAddress);
    await authTx.wait();
    console.log("✅ Treasury authorized as execution target");
  } catch (error) {
    console.log("⚠️  Governance configuration failed:", error.message);
  }

  // Step 6: Deploy ProofOfDonationNFT
  console.log("\n" + "=".repeat(60));
  console.log("STEP 6: DEPLOYING PROOF OF DONATION NFT");
  console.log("=".repeat(60));

  const ProofOfDonationNFT = await ethers.getContractFactory("ProofOfDonationNFT");
  console.log("\n🔄 Deploying ProofOfDonationNFT...");

  const proofNFT = await ProofOfDonationNFT.deploy(
    "LDAO Proof of Donation",
    "LDAO-POD",
    ldaoTokenAddress,
    charityGovernanceAddress
  );
  await proofNFT.deployed();
  const proofNFTAddress = proofNFT.address;
  deploymentAddresses.proofOfDonationNFT = proofNFTAddress;
  console.log("✅ ProofOfDonationNFT deployed to:", proofNFTAddress);

  // Step 7: Deploy BurnToDonate
  console.log("\n" + "=".repeat(60));
  console.log("STEP 7: DEPLOYING BURN TO DONATE");
  console.log("=".repeat(60));

  const defaultCharityRecipient = process.env.DEFAULT_CHARITY_RECIPIENT || deployer.address;

  const BurnToDonate = await ethers.getContractFactory("BurnToDonate");
  console.log("\n🔄 Deploying BurnToDonate...");

  const burnToDonate = await BurnToDonate.deploy(
    ldaoTokenAddress,
    treasuryAddress,
    defaultCharityRecipient
  );
  await burnToDonate.deployed();
  const burnToDonateAddress = burnToDonate.address;
  deploymentAddresses.burnToDonate = burnToDonateAddress;
  console.log("✅ BurnToDonate deployed to:", burnToDonateAddress);

  // Step 8: Deploy SubDAO Factory
  console.log("\n" + "=".repeat(60));
  console.log("STEP 8: DEPLOYING SUBDAO FACTORY");
  console.log("=".repeat(60));

  const BaseSubDAO = await ethers.getContractFactory("BaseSubDAO");
  console.log("\n🔄 Deploying BaseSubDAO implementation...");

  const baseSubDAO = await BaseSubDAO.deploy();
  await baseSubDAO.deployed();
  const baseSubDAOAddress = baseSubDAO.address;
  deploymentAddresses.baseSubDAOImplementation = baseSubDAOAddress;
  console.log("✅ BaseSubDAO implementation deployed to:", baseSubDAOAddress);

  const CharitySubDAOFactory = await ethers.getContractFactory("CharitySubDAOFactory");
  console.log("\n🔄 Deploying CharitySubDAOFactory...");

  const subDAOFactory = await CharitySubDAOFactory.deploy(baseSubDAOAddress);
  await subDAOFactory.deployed();
  const subDAOFactoryAddress = subDAOFactory.address;
  deploymentAddresses.charitySubDAOFactory = subDAOFactoryAddress;
  console.log("✅ CharitySubDAOFactory deployed to:", subDAOFactoryAddress);

  // Step 9: Save deployment info
  console.log("\n" + "=".repeat(60));
  console.log("STEP 9: SAVING DEPLOYMENT INFO");
  console.log("=".repeat(60));

  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: (await ethers.provider.getBlockNumber()).toString(),
    contracts: deploymentAddresses
  };

  // Update the main deployedAddresses-sepolia.json
  const mainAddressesPath = path.join(__dirname, '../deployedAddresses-sepolia.json');
  let mainAddresses = {};
  if (fs.existsSync(mainAddressesPath)) {
    mainAddresses = JSON.parse(fs.readFileSync(mainAddressesPath, 'utf8'));
  }

  // Add new charity contracts to the contracts section
  if (!mainAddresses.contracts) {
    mainAddresses.contracts = {};
  }

  mainAddresses.contracts.EnhancedLDAOTreasury = {
    address: deploymentAddresses.enhancedLDAOTreasury,
    owner: deployer.address,
    deploymentTx: "pending"
  };
  mainAddresses.contracts.CharityVerificationSystem = {
    address: deploymentAddresses.charityVerificationSystem,
    owner: deployer.address,
    deploymentTx: "pending"
  };
  mainAddresses.contracts.CharityProposal = {
    address: deploymentAddresses.charityProposal,
    owner: deployer.address,
    deploymentTx: "pending"
  };
  mainAddresses.contracts.CharityGovernance = {
    address: deploymentAddresses.charityGovernance,
    owner: deployer.address,
    deploymentTx: "pending"
  };
  mainAddresses.contracts.ProofOfDonationNFT = {
    address: deploymentAddresses.proofOfDonationNFT,
    owner: deployer.address,
    deploymentTx: "pending"
  };
  mainAddresses.contracts.BurnToDonate = {
    address: deploymentAddresses.burnToDonate,
    owner: deployer.address,
    deploymentTx: "pending"
  };
  mainAddresses.contracts.BaseSubDAO = {
    address: deploymentAddresses.baseSubDAOImplementation,
    owner: deployer.address,
    deploymentTx: "pending"
  };
  mainAddresses.contracts.CharitySubDAOFactory = {
    address: deploymentAddresses.charitySubDAOFactory,
    owner: deployer.address,
    deploymentTx: "pending"
  };

  mainAddresses.lastCharityGovernanceDeployment = new Date().toISOString();

  fs.writeFileSync(mainAddressesPath, JSON.stringify(mainAddresses, null, 2));
  console.log(`✅ Updated deployedAddresses-sepolia.json`);

  // Also save a timestamped backup
  const deploymentDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  const backupPath = path.join(deploymentDir, `charity-governance-sepolia-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📝 Deployment backup saved to: ${backupPath}`);

  console.log("\n" + "=".repeat(60));
  console.log("🎉 CHARITY GOVERNANCE DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));

  console.log("\n📋 Deployment Summary:");
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log("\n📍 Contract Addresses:");
  console.log(`  LDAO Token: ${deploymentAddresses.ldaoToken}`);
  console.log(`  USDC Token: ${deploymentAddresses.usdcToken}`);
  console.log(`  MultiSig Wallet: ${deploymentAddresses.multiSigWallet}`);
  console.log(`  Enhanced Treasury: ${deploymentAddresses.enhancedLDAOTreasury}`);
  console.log(`  Charity Verification: ${deploymentAddresses.charityVerificationSystem}`);
  console.log(`  Charity Proposal: ${deploymentAddresses.charityProposal}`);
  console.log(`  Charity Governance: ${deploymentAddresses.charityGovernance}`);
  console.log(`  Proof of Donation NFT: ${deploymentAddresses.proofOfDonationNFT}`);
  console.log(`  Burn to Donate: ${deploymentAddresses.burnToDonate}`);
  console.log(`  BaseSubDAO Implementation: ${deploymentAddresses.baseSubDAOImplementation}`);
  console.log(`  SubDAO Factory: ${deploymentAddresses.charitySubDAOFactory}`);

  console.log("\n✨ Features Enabled:");
  console.log("  ✅ Charity Proposal System");
  console.log("  ✅ Treasury Integration");
  console.log("  ✅ Proof-of-Donation NFTs");
  console.log("  ✅ Burn-to-Donate Mechanism");
  console.log("  ✅ Regional SubDAO Support");
  console.log("  ✅ Charity Verification System");

  console.log("=".repeat(60));

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });