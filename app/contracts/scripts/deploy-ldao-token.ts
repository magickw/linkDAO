import { ethers } from "hardhat";
import { LDAOToken } from "../typechain-types";

async function main() {
  console.log("Deploying LDAOToken contract...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()));

  // Set treasury address (using deployer for now, should be DAO treasury in production)
  const treasuryAddress = deployer.address;

  // Deploy LDAOToken
  const LDAOTokenFactory = await ethers.getContractFactory("LDAOToken");
  const ldaoToken = await LDAOTokenFactory.deploy(treasuryAddress) as LDAOToken;

  await ldaoToken.deployed();

  console.log("LDAOToken deployed to:", ldaoToken.address);
  console.log("Treasury address:", treasuryAddress);

  // Verify initial setup
  const totalSupply = await ldaoToken.totalSupply();
  const treasuryBalance = await ldaoToken.balanceOf(treasuryAddress);
  const initialSupply = await ldaoToken.INITIAL_SUPPLY();

  console.log("\n=== Deployment Verification ===");
  console.log("Total Supply:", ethers.utils.formatEther(totalSupply));
  console.log("Treasury Balance:", ethers.utils.formatEther(treasuryBalance));
  console.log("Expected Initial Supply:", ethers.utils.formatEther(initialSupply));
  console.log("Supply Match:", totalSupply.eq(initialSupply) ? "✓" : "✗");

  // Test staking tiers
  console.log("\n=== Staking Tiers Verification ===");
  for (let i = 1; i <= 4; i++) {
    try {
      const tier = await ldaoToken.stakingTiers(i);
      console.log(`Tier ${i}:`);
      console.log(`  Lock Period: ${tier.lockPeriod} seconds (${tier.lockPeriod / 86400} days)`);
      console.log(`  Reward Rate: ${tier.rewardRate} basis points (${tier.rewardRate / 100}%)`);
      console.log(`  Min Stake: ${ethers.utils.formatEther(tier.minStakeAmount)} LDAO`);
      console.log(`  Active: ${tier.isActive}`);
    } catch (error) {
      console.log(`Tier ${i}: Not configured`);
    }
  }

  // Test premium membership threshold
  const premiumThreshold = await ldaoToken.PREMIUM_MEMBERSHIP_THRESHOLD();
  console.log("\n=== Premium Membership ===");
  console.log("Premium Threshold:", ethers.utils.formatEther(premiumThreshold), "LDAO");

  // Save deployment info
  const deploymentInfo = {
    network: await ethers.provider.getNetwork(),
    contractAddress: ldaoToken.address,
    deployerAddress: deployer.address,
    treasuryAddress: treasuryAddress,
    blockNumber: await ethers.provider.getBlockNumber(),
    timestamp: new Date().toISOString(),
    totalSupply: totalSupply.toString(),
    initialSupply: initialSupply.toString()
  };

  console.log("\n=== Deployment Complete ===");
  console.log("Contract Address:", ldaoToken.address);
  console.log("Transaction Hash:", ldaoToken.deployTransaction.hash);
  console.log("Block Number:", ldaoToken.deployTransaction.blockNumber);

  return deploymentInfo;
}

// Handle both direct execution and module import
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Deployment failed:", error);
      process.exit(1);
    });
}

export { main as deployLDAOToken };