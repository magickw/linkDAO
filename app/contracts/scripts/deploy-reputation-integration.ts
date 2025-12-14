import { ethers } from "hardhat";
import { ReputationSystem, SocialReputationToken, ReputationBridge, LDAOToken } from "../typechain-types";

async function main() {
  console.log("🚀 Deploying Reputation System Integration to Testnet");
  console.log("=================================================");

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deployer:", deployerAddress);

  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);

  // 1. Deploy LDAOToken (if not already deployed)
  console.log("\n1️⃣ Deploying LDAOToken...");
  const LDAOTokenFactory = await ethers.getContractFactory("LDAOToken");
  const ldaoToken = (await LDAOTokenFactory.deploy(deployerAddress)) as LDAOToken;
  await ldaoToken.waitForDeployment();
  const ldaoTokenAddress = await ldaoToken.getAddress();
  console.log("✅ LDAOToken deployed to:", ldaoTokenAddress);

  // 2. Deploy ReputationSystem
  console.log("\n2️⃣ Deploying ReputationSystem...");
  const ReputationSystemFactory = await ethers.getContractFactory("ReputationSystem");
  const reputationSystem = (await ReputationSystemFactory.deploy()) as ReputationSystem;
  await reputationSystem.waitForDeployment();
  const reputationSystemAddress = await reputationSystem.getAddress();
  console.log("✅ ReputationSystem deployed to:", reputationSystemAddress);

  // 3. Deploy SocialReputationToken
  console.log("\n3️⃣ Deploying SocialReputationToken...");
  const SocialReputationTokenFactory = await ethers.getContractFactory("SocialReputationToken");
  const socialReputationToken = (await SocialReputationTokenFactory.deploy(
    ethers.ZeroAddress, // profileRegistry (to be set later)
    ethers.ZeroAddress, // followModule (to be set later)
    ethers.ZeroAddress  // tipRouter (to be set later)
  )) as SocialReputationToken;
  await socialReputationToken.waitForDeployment();
  const socialReputationTokenAddress = await socialReputationToken.getAddress();
  console.log("✅ SocialReputationToken deployed to:", socialReputationTokenAddress);

  // 4. Deploy ReputationBridge
  console.log("\n4️⃣ Deploying ReputationBridge...");
  const ReputationBridgeFactory = await ethers.getContractFactory("ReputationBridge");
  const reputationBridge = (await ReputationBridgeFactory.deploy(
    reputationSystemAddress,
    socialReputationTokenAddress
  )) as ReputationBridge;
  await reputationBridge.waitForDeployment();
  const reputationBridgeAddress = await reputationBridge.getAddress();
  console.log("✅ ReputationBridge deployed to:", reputationBridgeAddress);

  // 5. Initial Setup
  console.log("\n5️⃣ Setting up initial configuration...");

  // Add deployer as moderator
  console.log("   Adding moderator...");
  await reputationSystem.addModerator(deployerAddress);
  console.log("   ✅ Moderator added");

  // Update SocialReputationToken contracts
  console.log("   Updating contract addresses...");
  await socialReputationToken.updateContracts(
    ethers.ZeroAddress, // profileRegistry
    ethers.ZeroAddress, // followModule
    ethers.ZeroAddress  // tipRouter
  );
  console.log("   ✅ Contract addresses updated");

  // 6. Test Integration
  console.log("\n6️⃣ Testing integration...");

  // Create some test users
  const [, user1, user2, user3] = await ethers.getSigners();

  // Record successful transactions to build reputation
  console.log("   Building reputation scores...");
  await reputationSystem.recordSuccessfulTransaction(
    await user1.getAddress(),
    ethers.parseEther("1000")
  );
  await reputationSystem.recordSuccessfulTransaction(
    await user2.getAddress(),
    ethers.parseEther("5000")
  );
  await reputationSystem.recordSuccessfulTransaction(
    await user3.getAddress(),
    ethers.parseEther("10000")
  );
  console.log("   ✅ Reputation scores built");

  // Submit reviews to increase reputation
  console.log("   Submitting reviews...");
  await reputationSystem.connect(user1).submitReview(
    await user2.getAddress(),
    1,
    5,
    "QmTestHash1",
    true
  );
  await reputationSystem.connect(user1).submitReview(
    await user3.getAddress(),
    2,
    5,
    "QmTestHash2",
    true
  );
  console.log("   ✅ Reviews submitted");

  // Test reputation bridge
  console.log("   Testing reputation bridge...");
  const [canClaim, tier, reward] = await reputationBridge.getClaimStatus(await user1.getAddress());
  console.log(`   User1 can claim: ${canClaim}, Tier: ${tier}, Reward: ${ethers.formatEther(reward)} LREP`);

  if (canClaim) {
    await reputationBridge.connect(user1).claimReputationTokens();
    const balance = await socialReputationToken.balanceOf(await user1.getAddress());
    console.log(`   ✅ Tokens claimed: ${ethers.formatEther(balance)} LREP`);
  }

  // 7. Save deployment information
  console.log("\n7️⃣ Saving deployment information...");
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployerAddress,
    deployedAt: new Date().toISOString(),
    contracts: {
      LDAOToken: {
        address: ldaoTokenAddress,
        owner: deployerAddress
      },
      ReputationSystem: {
        address: reputationSystemAddress,
        owner: deployerAddress
      },
      SocialReputationToken: {
        address: socialReputationTokenAddress,
        owner: deployerAddress
      },
      ReputationBridge: {
        address: reputationBridgeAddress,
        owner: deployerAddress
      }
    },
    testResults: {
      reputationScores: {
        user1: (await reputationSystem.getReputationScore(await user1.getAddress())).totalPoints.toString(),
        user2: (await reputationSystem.getReputationScore(await user2.getAddress())).totalPoints.toString(),
        user3: (await reputationSystem.getReputationScore(await user3.getAddress())).totalPoints.toString()
      },
      tokenBalances: {
        user1: ethers.formatEther(await socialReputationToken.balanceOf(await user1.getAddress())),
        user2: ethers.formatEther(await socialReputationToken.balanceOf(await user2.getAddress())),
        user3: ethers.formatEther(await socialReputationToken.balanceOf(await user3.getAddress()))
      }
    }
  };

  // Save to file
  const fs = require("fs");
  const path = require("path");
  const deploymentFile = path.join(__dirname, `../deployments/reputation-integration-${network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`   ✅ Deployment saved to: ${deploymentFile}`);

  // 8. Verification (if on testnet)
  if (network.name !== "localhost" && network.name !== "hardhat") {
    console.log("\n8️⃣ Verifying contracts...");
    
    try {
      console.log("   Verifying LDAOToken...");
      await hre.run("verify:verify", {
        address: ldaoTokenAddress,
        constructorArguments: [deployerAddress]
      });

      console.log("   Verifying ReputationSystem...");
      await hre.run("verify:verify", {
        address: reputationSystemAddress,
        constructorArguments: []
      });

      console.log("   Verifying SocialReputationToken...");
      await hre.run("verify:verify", {
        address: socialReputationTokenAddress,
        constructorArguments: [
          ethers.ZeroAddress,
          ethers.ZeroAddress,
          ethers.ZeroAddress
        ]
      });

      console.log("   Verifying ReputationBridge...");
      await hre.run("verify:verify", {
        address: reputationBridgeAddress,
        constructorArguments: [reputationSystemAddress, socialReputationTokenAddress]
      });

      console.log("   ✅ All contracts verified");
    } catch (error) {
      console.error("   ❌ Verification failed:", error);
    }
  }

  // 9. Summary
  console.log("\n📊 Deployment Summary");
  console.log("===================");
  console.log("Network:", network.name);
  console.log("LDAOToken:", ldaoTokenAddress);
  console.log("ReputationSystem:", reputationSystemAddress);
  console.log("SocialReputationToken:", socialReputationTokenAddress);
  console.log("ReputationBridge:", reputationBridgeAddress);
  console.log("\n✅ Reputation system integration deployed successfully!");
  console.log("\nNext Steps:");
  console.log("1. Update frontend with new contract addresses");
  console.log("2. Configure profile registry, follow module, and tip router");
  console.log("3. Test end-to-end reputation flow");
  console.log("4. Set up monitoring dashboard");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });