import { ethers } from "hardhat";
import { formatEther } from "ethers";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying ReputationSystem with the account:", deployer.address);
  console.log("Account balance:", formatEther(await deployer.provider.getBalance(deployer.address)));

  // Deploy ReputationSystem
  console.log("\n🔄 Deploying ReputationSystem...");
  const ReputationSystem = await ethers.getContractFactory("ReputationSystem");
  const reputationSystem = await ReputationSystem.deploy();
  await reputationSystem.waitForDeployment();
  const reputationSystemAddress = await reputationSystem.getAddress();
  console.log("✅ ReputationSystem deployed to:", reputationSystemAddress);

  // Verify deployment by checking contract state
  console.log("\n🧪 Verifying deployment...");
  
  try {
    // Check initial configuration
    const nextReviewId = await reputationSystem.nextReviewId();
    const totalReviews = await reputationSystem.totalReviews();
    const minReviewInterval = await reputationSystem.minReviewInterval();
    const maxReviewsPerDay = await reputationSystem.maxReviewsPerDay();
    const suspiciousActivityThreshold = await reputationSystem.suspiciousActivityThreshold();
    const moderatorMinReputation = await reputationSystem.moderatorMinReputation();
    
    console.log(`✅ Next Review ID: ${nextReviewId}`);
    console.log(`✅ Total Reviews: ${totalReviews}`);
    console.log(`✅ Min Review Interval: ${minReviewInterval} seconds (${minReviewInterval/3600} hours)`);
    console.log(`✅ Max Reviews Per Day: ${maxReviewsPerDay}`);
    console.log(`✅ Suspicious Activity Threshold: ${suspiciousActivityThreshold}`);
    console.log(`✅ Moderator Min Reputation: ${moderatorMinReputation}`);
    
    // Check tier thresholds
    const tierThresholds = [];
    for (let i = 0; i < 6; i++) {
      const threshold = await reputationSystem.tierThresholds(i);
      tierThresholds.push(threshold.toString());
    }
    console.log(`✅ Tier Thresholds: [${tierThresholds.join(', ')}]`);
    
    // Test reputation tier calculation for a new user (should be NEWCOMER)
    const testUserTier = await reputationSystem.getReputationTier(deployer.address);
    console.log(`✅ Test user tier (should be 0 - NEWCOMER): ${testUserTier}`);
    
    // Test weighted score calculation for a new user (should be 0)
    const testUserScore = await reputationSystem.calculateWeightedScore(deployer.address);
    console.log(`✅ Test user weighted score (should be 0): ${testUserScore}`);
    
    console.log("\n🎉 ReputationSystem deployed and verified successfully!");
    
    // Output deployment information
    console.log("\n📝 Deployment Summary:");
    console.log("=====================================");
    console.log(`REPUTATION_SYSTEM_ADDRESS=${reputationSystemAddress}`);
    console.log(`DEPLOYER_ADDRESS=${deployer.address}`);
    console.log(`NETWORK=${(await deployer.provider.getNetwork()).name}`);
    console.log(`CHAIN_ID=${(await deployer.provider.getNetwork()).chainId}`);
    console.log("=====================================");
    
    return {
      reputationSystemAddress,
      deployer: deployer.address,
      network: (await deployer.provider.getNetwork()).name,
      chainId: (await deployer.provider.getNetwork()).chainId.toString()
    };
    
  } catch (error) {
    console.log("⚠️  Contract verification failed:", error.message);
    throw error;
  }
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

export { main as deployReputationSystem };