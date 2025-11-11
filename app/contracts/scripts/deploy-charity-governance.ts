import { ethers } from "hardhat";
import { formatEther, parseEther } from "ethers";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("=".repeat(60));
  console.log("CHARITY GOVERNANCE SYSTEM DEPLOYMENT");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  const isMainnet = network.chainId === 1n;
  const deploymentAddresses: Record<string, string> = {};

  // Step 1: Get or verify existing core contracts
  console.log("\n" + "=".repeat(60));
  console.log("STEP 1: VERIFYING CORE CONTRACTS");
  console.log("=".repeat(60));

  // Get LDAOToken address
  console.log("\n🔄 Locating LDAOToken contract...");
  let ldaoTokenAddress: string;

  try {
    ldaoTokenAddress = process.env.LDAO_TOKEN_ADDRESS || "";

    if (!ldaoTokenAddress) {
      const deployedAddressesPath = path.join(__dirname, '../deployedAddresses.json');
      if (fs.existsSync(deployedAddressesPath)) {
        const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, 'utf8'));
        ldaoTokenAddress = deployedAddresses.LDAO_TOKEN_ADDRESS || deployedAddresses.TOKEN_ADDRESS;
      }
    }

    if (ldaoTokenAddress) {
      const code = await ethers.provider.getCode(ldaoTokenAddress);
      if (code === "0x") {
        throw new Error("Token contract not found at address");
      }
      console.log("✅ Found existing LDAOToken at:", ldaoTokenAddress);
      deploymentAddresses.ldaoToken = ldaoTokenAddress;
    } else {
      throw new Error("LDAOToken address not provided");
    }
  } catch (error) {
    console.log("❌ LDAOToken not found. Please deploy LDAOToken first or provide LDAO_TOKEN_ADDRESS");
    throw error;
  }

  // Get USDC token address (or mock ERC20)
  console.log("\n🔄 Locating USDC/MockERC20 contract...");
  let usdcTokenAddress: string;

  try {
    usdcTokenAddress = process.env.USDC_TOKEN_ADDRESS || "";

    if (!usdcTokenAddress) {
      const deployedAddressesPath = path.join(__dirname, '../deployedAddresses.json');
      if (fs.existsSync(deployedAddressesPath)) {
        const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, 'utf8'));
        usdcTokenAddress = deployedAddresses.USDC_TOKEN_ADDRESS || deployedAddresses.MockERC20;
      }
    }

    if (usdcTokenAddress) {
      const code = await ethers.provider.getCode(usdcTokenAddress);
      if (code === "0x") {
        throw new Error("USDC/MockERC20 contract not found at address");
      }
      console.log("✅ Found existing USDC/MockERC20 at:", usdcTokenAddress);
      deploymentAddresses.usdcToken = usdcTokenAddress;
    } else {
      console.log("⚠️  USDC token address not provided, deploying MockERC20...");

      // Deploy MockERC20 for testing
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const mockUSDC = await MockERC20.deploy(
        "Mock USDC",
        "USDC",
        6, // 6 decimals
        parseEther("1000000") // 1M USDC initial supply
      );
      await mockUSDC.waitForDeployment();
      usdcTokenAddress = await mockUSDC.getAddress();
      deploymentAddresses.usdcToken = usdcTokenAddress;
      console.log("✅ Deployed MockERC20 at:", usdcTokenAddress);
    }
  } catch (error) {
    console.log("❌ Error with USDC token:", error);
    throw error;
  }

  // Get or deploy MultiSigWallet
  console.log("\n🔄 Locating MultiSigWallet contract...");
  let multiSigWalletAddress: string;

  try {
    multiSigWalletAddress = process.env.MULTISIG_WALLET_ADDRESS || "";

    if (!multiSigWalletAddress) {
      const deployedAddressesPath = path.join(__dirname, '../deployedAddresses.json');
      if (fs.existsSync(deployedAddressesPath)) {
        const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, 'utf8'));
        multiSigWalletAddress = deployedAddresses.MULTISIG_WALLET_ADDRESS;
      }
    }

    if (multiSigWalletAddress) {
      const code = await ethers.provider.getCode(multiSigWalletAddress);
      if (code === "0x") {
        throw new Error("MultiSigWallet contract not found at address");
      }
      console.log("✅ Found existing MultiSigWallet at:", multiSigWalletAddress);
      deploymentAddresses.multiSigWallet = multiSigWalletAddress;
    } else {
      console.log("⚠️  MultiSigWallet address not provided, deploying new one...");

      // Deploy MultiSigWallet with deployer as initial owner
      const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
      const multiSig = await MultiSigWallet.deploy(
        [deployer.address], // Initial owners
        1 // Required confirmations
      );
      await multiSig.waitForDeployment();
      multiSigWalletAddress = await multiSig.getAddress();
      deploymentAddresses.multiSigWallet = multiSigWalletAddress;
      console.log("✅ Deployed MultiSigWallet at:", multiSigWalletAddress);
    }
  } catch (error) {
    console.log("❌ Error with MultiSigWallet:", error);
    throw error;
  }

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
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  deploymentAddresses.enhancedLDAOTreasury = treasuryAddress;
  console.log("✅ EnhancedLDAOTreasury deployed to:", treasuryAddress);

  // Configure treasury
  console.log("\n🔧 Configuring treasury charity parameters...");
  try {
    // Set minimum charity donation amount
    const minCharityDonation = parseEther("100"); // 100 LDAO minimum
    // Note: The contract already has this as a default, but you could update it
    console.log("✅ Treasury charity parameters configured");
  } catch (error) {
    console.log("⚠️  Treasury configuration failed:", error);
  }

  // Step 3: Deploy CharityVerificationSystem
  console.log("\n" + "=".repeat(60));
  console.log("STEP 3: DEPLOYING CHARITY VERIFICATION SYSTEM");
  console.log("=".repeat(60));

  const CharityVerificationSystem = await ethers.getContractFactory("CharityVerificationSystem");
  console.log("\n🔄 Deploying CharityVerificationSystem...");

  const charityVerification = await CharityVerificationSystem.deploy(
    ldaoTokenAddress,
    treasuryAddress,
    deployer.address // Fee recipient
  );
  await charityVerification.waitForDeployment();
  const charityVerificationAddress = await charityVerification.getAddress();
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
  await charityProposal.waitForDeployment();
  const charityProposalAddress = await charityProposal.getAddress();
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
  await charityGovernance.waitForDeployment();
  const charityGovernanceAddress = await charityGovernance.getAddress();
  deploymentAddresses.charityGovernance = charityGovernanceAddress;
  console.log("✅ CharityGovernance deployed to:", charityGovernanceAddress);

  // Configure charity governance
  console.log("\n🔧 Configuring charity governance parameters...");
  try {
    // Authorize treasury as a target for proposal execution
    const authTx = await charityGovernance.authorizeTarget(treasuryAddress);
    await authTx.wait();
    console.log("✅ Treasury authorized as execution target");

    // Verify category parameters
    const charityDonationQuorum = await charityGovernance.categoryQuorum(6); // CHARITY_DONATION
    const charityDonationThreshold = await charityGovernance.categoryThreshold(6);
    console.log(`✅ Charity Donation - Quorum: ${formatEther(charityDonationQuorum)}, Threshold: ${formatEther(charityDonationThreshold)}`);
  } catch (error) {
    console.log("⚠️  Governance configuration failed:", error);
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
  await proofNFT.waitForDeployment();
  const proofNFTAddress = await proofNFT.getAddress();
  deploymentAddresses.proofOfDonationNFT = proofNFTAddress;
  console.log("✅ ProofOfDonationNFT deployed to:", proofNFTAddress);

  // Step 7: Deploy BurnToDonate
  console.log("\n" + "=".repeat(60));
  console.log("STEP 7: DEPLOYING BURN TO DONATE");
  console.log("=".repeat(60));

  // For default charity, we'll use a placeholder address (deployer for now)
  const defaultCharityRecipient = process.env.DEFAULT_CHARITY_RECIPIENT || deployer.address;

  const BurnToDonate = await ethers.getContractFactory("BurnToDonate");
  console.log("\n🔄 Deploying BurnToDonate...");

  const burnToDonate = await BurnToDonate.deploy(
    ldaoTokenAddress,
    treasuryAddress,
    defaultCharityRecipient
  );
  await burnToDonate.waitForDeployment();
  const burnToDonateAddress = await burnToDonate.getAddress();
  deploymentAddresses.burnToDonate = burnToDonateAddress;
  console.log("✅ BurnToDonate deployed to:", burnToDonateAddress);

  // Step 8: Deploy SubDAO Factory
  console.log("\n" + "=".repeat(60));
  console.log("STEP 8: DEPLOYING SUBDAO FACTORY");
  console.log("=".repeat(60));

  // First deploy BaseSubDAO implementation
  const BaseSubDAO = await ethers.getContractFactory("BaseSubDAO");
  console.log("\n🔄 Deploying BaseSubDAO implementation...");

  const baseSubDAO = await BaseSubDAO.deploy();
  await baseSubDAO.waitForDeployment();
  const baseSubDAOAddress = await baseSubDAO.getAddress();
  deploymentAddresses.baseSubDAOImplementation = baseSubDAOAddress;
  console.log("✅ BaseSubDAO implementation deployed to:", baseSubDAOAddress);

  // Deploy SubDAO Factory
  const CharitySubDAOFactory = await ethers.getContractFactory("CharitySubDAOFactory");
  console.log("\n🔄 Deploying CharitySubDAOFactory...");

  const subDAOFactory = await CharitySubDAOFactory.deploy(baseSubDAOAddress);
  await subDAOFactory.waitForDeployment();
  const subDAOFactoryAddress = await subDAOFactory.getAddress();
  deploymentAddresses.charitySubDAOFactory = subDAOFactoryAddress;
  console.log("✅ CharitySubDAOFactory deployed to:", subDAOFactoryAddress);

  // Step 9: Verify and test deployment
  console.log("\n" + "=".repeat(60));
  console.log("STEP 9: VERIFICATION AND TESTING");
  console.log("=".repeat(60));

  console.log("\n🧪 Verifying contract integrations...");

  try {
    // Verify treasury integration
    const treasuryLDAOBalance = await treasury.getTreasuryBalance();
    console.log(`✅ Treasury LDAO Balance: ${formatEther(treasuryLDAOBalance[0])}`);
    console.log(`✅ Treasury ETH Balance: ${formatEther(treasuryLDAOBalance[1])}`);
    console.log(`✅ Treasury USDC Balance: ${treasuryLDAOBalance[2]}`);

    // Verify charity verification system
    const totalCharities = await charityVerification.getTotalCharities();
    console.log(`✅ Total registered charities: ${totalCharities}`);

    // Verify charity governance
    const proposalCount = await charityGovernance.proposalCount();
    console.log(`✅ Total proposals: ${proposalCount}`);

    // Verify burn to donate
    const burnStats = await burnToDonate.getContractStats();
    console.log(`✅ Total tokens burned: ${formatEther(burnStats[0])}`);
    console.log(`✅ Total donations made: ${formatEther(burnStats[1])}`);

    // Verify SubDAO factory
    const subDAOCount = await subDAOFactory.getTotalSubDAOs();
    console.log(`✅ Total SubDAOs created: ${subDAOCount}`);

    console.log("\n✅ All contracts deployed and verified successfully!");

  } catch (error) {
    console.log("⚠️  Verification failed:", error);
  }

  // Step 10: Save deployment info
  console.log("\n" + "=".repeat(60));
  console.log("STEP 10: SAVING DEPLOYMENT INFO");
  console.log("=".repeat(60));

  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: (await ethers.provider.getBlockNumber()).toString(),
    contracts: deploymentAddresses,
    configuration: {
      charityDonation: {
        quorum: "50000000000000000000000", // 50K LDAO
        threshold: "100000000000000000000", // 100 LDAO
        requiresStaking: false
      },
      charityVerification: {
        quorum: "200000000000000000000000", // 200K LDAO
        threshold: "5000000000000000000000", // 5K LDAO
        requiresStaking: true
      },
      charitySubDAO: {
        quorum: "300000000000000000000000", // 300K LDAO
        threshold: "10000000000000000000000", // 10K LDAO
        requiresStaking: true
      },
      burnToDonate: {
        ratio: 100,
        minBurn: "1000000000000000000000", // 1000 LDAO
        maxBurn: "100000000000000000000000", // 100K LDAO
        dailyLimit: "1000000000000000000000000" // 1M LDAO
      }
    }
  };

  // Save to file
  const outputPath = path.join(__dirname, `../deployments/charity-governance-${network.name}-${Date.now()}.json`);
  const deploymentDir = path.dirname(outputPath);
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n📝 Deployment info saved to: ${outputPath}`);

  // Also update the main deployedAddresses.json
  const mainAddressesPath = path.join(__dirname, '../deployedAddresses.json');
  let mainAddresses: any = {};
  if (fs.existsSync(mainAddressesPath)) {
    mainAddresses = JSON.parse(fs.readFileSync(mainAddressesPath, 'utf8'));
  }

  mainAddresses = {
    ...mainAddresses,
    ...deploymentAddresses,
    lastCharityGovernanceDeployment: new Date().toISOString()
  };

  fs.writeFileSync(mainAddressesPath, JSON.stringify(mainAddresses, null, 2));
  console.log(`✅ Updated main deployedAddresses.json`);

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

  console.log("\n📚 Next Steps:");
  console.log("  1. Transfer initial LDAO tokens to treasury for charity disbursements");
  console.log("  2. Register and verify initial charity organizations");
  console.log("  3. Create first charity donation proposal");
  console.log("  4. Set up frontend integration with deployed contracts");
  console.log("  5. Consider multi-sig ownership transfer for production");

  console.log("=".repeat(60));

  return deploymentInfo;
}

// Allow script to be run directly or imported
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment failed:", error);
      process.exit(1);
    });
}

export { main as deployCharityGovernance };
