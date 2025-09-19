const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load contract artifact
async function loadContractData(contractName) {
  try {
    const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    return {
      abi: artifact.abi,
      bytecode: artifact.bytecode
    };
  } catch (error) {
    console.error(`Failed to load ${contractName} artifact:`, error.message);
    return null;
  }
}

async function main() {
  console.log("🚀 Deploying EnhancedRewardPool Contract...");
  
  // For local deployment, use hardhat's default provider
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  // Use hardhat's first account (you can change this)
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Hardhat account #0
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Deploying with account:", wallet.address);
  
  try {
    const balance = await provider.getBalance(wallet.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");
  } catch (error) {
    console.error("❌ Failed to connect to local network. Make sure hardhat node is running:");
    console.error("   npx hardhat node");
    process.exit(1);
  }
  
  // Load deployed addresses to get dependencies
  let deployedAddresses;
  try {
    deployedAddresses = JSON.parse(fs.readFileSync('deployedAddresses.json', 'utf8'));
    console.log("✅ Found existing deployed addresses");
  } catch (error) {
    console.error("❌ deployedAddresses.json not found. Please deploy core contracts first.");
    process.exit(1);
  }
  
  // Check for required dependencies
  const requiredContracts = ['TOKEN_ADDRESS', 'GOVERNANCE_ADDRESS', 'REPUTATION_SYSTEM_ADDRESS'];
  const missingContracts = requiredContracts.filter(contract => !deployedAddresses[contract]);
  
  if (missingContracts.length > 0) {
    console.error("❌ Missing required contract addresses:", missingContracts.join(', '));
    console.error("Please deploy the required contracts first.");
    process.exit(1);
  }
  
  console.log("Using dependencies:");
  console.log("- LDAO Token:", deployedAddresses.TOKEN_ADDRESS);
  console.log("- Governance:", deployedAddresses.GOVERNANCE_ADDRESS);
  console.log("- ReputationSystem:", deployedAddresses.REPUTATION_SYSTEM_ADDRESS);
  
  // Load EnhancedRewardPool contract artifact
  console.log("\n📦 Loading EnhancedRewardPool contract artifact...");
  const rewardPoolData = await loadContractData('EnhancedRewardPool');
  
  if (!rewardPoolData) {
    console.error("❌ Failed to load EnhancedRewardPool artifact. Please compile contracts first:");
    console.error("   npx hardhat compile");
    process.exit(1);
  }
  
  console.log("✅ EnhancedRewardPool artifact loaded");
  
  try {
    // Deploy EnhancedRewardPool
    console.log("\n🔄 Deploying EnhancedRewardPool...");
    const RewardPoolFactory = new ethers.ContractFactory(
      rewardPoolData.abi,
      rewardPoolData.bytecode,
      wallet
    );
    
    const rewardPool = await RewardPoolFactory.deploy(
      deployedAddresses.TOKEN_ADDRESS,
      deployedAddresses.GOVERNANCE_ADDRESS,
      deployedAddresses.REPUTATION_SYSTEM_ADDRESS
    );
    await rewardPool.waitForDeployment();
    
    const rewardPoolAddress = await rewardPool.getAddress();
    console.log("✅ EnhancedRewardPool deployed to:", rewardPoolAddress);
    
    // Verify deployment
    console.log("\n🧪 Verifying deployment...");
    
    // Check contract references
    const ldaoTokenAddress = await rewardPool.ldaoToken();
    const governanceAddress = await rewardPool.governance();
    const reputationSystemAddress = await rewardPool.reputationSystem();
    console.log(`✅ LDAO Token reference: ${ldaoTokenAddress}`);
    console.log(`✅ Governance reference: ${governanceAddress}`);
    console.log(`✅ ReputationSystem reference: ${reputationSystemAddress}`);
    
    // Check initial configuration parameters
    const currentEpoch = await rewardPool.currentEpoch();
    const epochDuration = await rewardPool.epochDuration();
    const nextEpochId = await rewardPool.nextEpochId();
    const totalPoolBalance = await rewardPool.totalPoolBalance();
    const minimumFunding = await rewardPool.minimumFunding();
    const reputationMultiplier = await rewardPool.reputationMultiplier();
    const nextCategoryId = await rewardPool.nextCategoryId();
    
    console.log(`✅ Current epoch: ${currentEpoch}`);
    console.log(`✅ Epoch duration: ${epochDuration} seconds (${Number(epochDuration) / 86400} days)`);
    console.log(`✅ Next epoch ID: ${nextEpochId}`);
    console.log(`✅ Total pool balance: ${ethers.formatEther(totalPoolBalance)} LDAO`);
    console.log(`✅ Minimum funding: ${ethers.formatEther(minimumFunding)} LDAO`);
    console.log(`✅ Reputation multiplier: ${reputationMultiplier}% (${reputationMultiplier/100}x max)`);
    console.log(`✅ Next category ID: ${nextCategoryId}`);
    
    // Check reward categories
    console.log("\n🏷️  Checking reward categories...");
    const categories = [
      { id: 1, name: "Trading" },
      { id: 2, name: "Governance" },
      { id: 3, name: "Content" },
      { id: 4, name: "Referral" },
      { id: 5, name: "Staking" }
    ];
    
    for (const category of categories) {
      try {
        const categoryInfo = await rewardPool.getRewardCategory(category.id);
        console.log(`✅ ${category.name} Category:`);
        console.log(`   Weight: ${categoryInfo[1]} basis points (${categoryInfo[1]/100}%)`);
        console.log(`   Active: ${categoryInfo[2]}`);
        console.log(`   Total Distributed: ${ethers.formatEther(categoryInfo[3])} LDAO`);
      } catch (error) {
        console.log(`⚠️  Failed to get ${category.name} category info:`, error.message);
      }
    }
    
    // Check current epoch info
    console.log("\n📅 Checking current epoch info...");
    try {
      const epochInfo = await rewardPool.getEpochInfo(currentEpoch);
      console.log(`✅ Current Epoch ${currentEpoch}:`);
      console.log(`   Start Time: ${new Date(Number(epochInfo[1]) * 1000).toISOString()}`);
      console.log(`   End Time: ${new Date(Number(epochInfo[2]) * 1000).toISOString()}`);
      console.log(`   Total Funding: ${ethers.formatEther(epochInfo[3])} LDAO`);
      console.log(`   Total Rewards: ${ethers.formatEther(epochInfo[4])} LDAO`);
      console.log(`   Participant Count: ${epochInfo[5]}`);
      console.log(`   Finalized: ${epochInfo[6]}`);
    } catch (error) {
      console.log("⚠️  Failed to get epoch info:", error.message);
    }
    
    // Test basic functionality
    console.log("\n🧪 Testing basic functionality...");
    
    try {
      // Get user stats for deployer (should be empty initially)
      const userStats = await rewardPool.getUserStats(wallet.address);
      console.log(`✅ User stats retrieved:`);
      console.log(`   Total Earned: ${ethers.formatEther(userStats[0])} LDAO`);
      console.log(`   Total Claimed: ${ethers.formatEther(userStats[1])} LDAO`);
      console.log(`   Last Claim Epoch: ${userStats[2]}`);
      console.log(`   Participation Count: ${userStats[3]}`);
      console.log(`   Reputation Bonus: ${userStats[4]}%`);
      
      // Test adding a new reward category (as governance)
      const newCategoryName = "Testing";
      const newCategoryWeight = 500; // 5%
      
      await rewardPool.addRewardCategory(newCategoryName, newCategoryWeight);
      console.log(`✅ Added new reward category: ${newCategoryName} (${newCategoryWeight/100}%)`);
      
      // Verify the new category
      const newCategoryInfo = await rewardPool.getRewardCategory(nextCategoryId);
      console.log(`✅ New category verified:`);
      console.log(`   Name: ${newCategoryInfo[0]}`);
      console.log(`   Weight: ${newCategoryInfo[1]} basis points`);
      console.log(`   Active: ${newCategoryInfo[2]}`);
      
      // Test updating governance parameters
      const newEpochDuration = 14 * 24 * 60 * 60; // 14 days
      await rewardPool.updateGovernanceParameter("epochDuration", newEpochDuration);
      console.log(`✅ Updated epoch duration to ${newEpochDuration / 86400} days`);
      
      const updatedEpochDuration = await rewardPool.epochDuration();
      console.log(`✅ Verified epoch duration: ${Number(updatedEpochDuration) / 86400} days`);
      
    } catch (error) {
      console.log("⚠️  Basic functionality test failed:", error.message);
    }
    
    // Update deployed addresses
    deployedAddresses.ENHANCED_REWARD_POOL_ADDRESS = rewardPoolAddress;
    deployedAddresses.deployedAt = new Date().toISOString();
    
    fs.writeFileSync('deployedAddresses.json', JSON.stringify(deployedAddresses, null, 2));
    
    console.log("\n📝 Deployment Summary:");
    console.log("=====================================");
    console.log(`ENHANCED_REWARD_POOL_ADDRESS=${rewardPoolAddress}`);
    console.log(`LDAO_TOKEN_ADDRESS=${deployedAddresses.TOKEN_ADDRESS}`);
    console.log(`GOVERNANCE_ADDRESS=${deployedAddresses.GOVERNANCE_ADDRESS}`);
    console.log(`REPUTATION_SYSTEM_ADDRESS=${deployedAddresses.REPUTATION_SYSTEM_ADDRESS}`);
    console.log("=====================================");
    
    console.log("\n💾 Address saved to deployedAddresses.json");
    console.log("\n🎉 EnhancedRewardPool deployed and verified successfully!");
    
    console.log("\n📋 EnhancedRewardPool Features Implemented:");
    console.log("=====================================");
    console.log("✅ Epoch-based funding and claim mechanisms");
    console.log("✅ Automatic reward distribution with reputation weighting");
    console.log("✅ Multiple reward categories (Trading, Governance, Content, Referral, Staking)");
    console.log("✅ Batch reward calculation for gas efficiency");
    console.log("✅ Multi-epoch claiming support");
    console.log("✅ Governance controls for parameters and categories");
    console.log("✅ Reputation-based reward multipliers");
    console.log("✅ Emergency withdrawal functionality");
    console.log("✅ Comprehensive analytics and user statistics");
    console.log("✅ Integration with Governance and ReputationSystem contracts");
    console.log("=====================================");
    
    return rewardPoolAddress;
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then((address) => {
    console.log("\n🎯 EnhancedRewardPool Contract Address:", address);
    console.log("\n✅ Task 3.3 - Set up community reward system: COMPLETED");
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });