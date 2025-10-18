import { ethers } from "hardhat";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";

async function main() {
  console.log("🚀 Starting Phase 4.1: NFT and Social Features Deployment (Simple)");
  console.log("================================================================");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

  const addressesPath = join(__dirname, "../deployedAddresses.json");
  let addresses: any = {};
  
  try {
    const existingData = readFileSync(addressesPath, "utf8");
    addresses = JSON.parse(existingData);
    console.log("✅ Loaded existing deployment addresses");
  } catch (error) {
    console.log("⚠️  No existing deployedAddresses.json found, creating new one");
  }

  const network = await deployer.provider.getNetwork();
  let totalGasUsed = BigInt(0);

  try {
    // 1. Deploy FollowModule (simplest contract)
    console.log("\n1️⃣  Deploying FollowModule...");
    const FollowModule = await ethers.getContractFactory("FollowModule");
    const followModule = await FollowModule.deploy();
    await followModule.waitForDeployment();
    
    const followModuleAddress = await followModule.getAddress();
    console.log("✅ FollowModule deployed to:", followModuleAddress);

    const followModuleTx = await followModule.deploymentTransaction()?.wait();
    if (followModuleTx) {
      totalGasUsed += followModuleTx.gasUsed;
    }

    addresses.FollowModule = {
      address: followModuleAddress,
      deployer: deployer.address,
      deployedAt: new Date().toISOString(),
      network: network.name,
      chainId: network.chainId.toString(),
      contractName: "FollowModule"
    };

    // Test FollowModule
    console.log("🧪 Testing FollowModule...");
    const owner = await followModule.owner();
    console.log(`   Owner: ${owner}`);

    // 2. Deploy PaymentRouter
    console.log("\n2️⃣  Deploying PaymentRouter...");
    const feeBasisPoints = 250; // 2.5%
    const feeCollector = deployer.address;

    const PaymentRouter = await ethers.getContractFactory("PaymentRouter");
    const paymentRouter = await PaymentRouter.deploy(feeBasisPoints, feeCollector);
    await paymentRouter.waitForDeployment();
    
    const paymentRouterAddress = await paymentRouter.getAddress();
    console.log("✅ PaymentRouter deployed to:", paymentRouterAddress);

    const paymentRouterTx = await paymentRouter.deploymentTransaction()?.wait();
    if (paymentRouterTx) {
      totalGasUsed += paymentRouterTx.gasUsed;
    }

    addresses.PaymentRouter = {
      address: paymentRouterAddress,
      deployer: deployer.address,
      deployedAt: new Date().toISOString(),
      network: network.name,
      chainId: network.chainId.toString(),
      contractName: "PaymentRouter",
      constructorArgs: {
        feeBasisPoints,
        feeCollector
      }
    };

    // Test PaymentRouter
    console.log("🧪 Testing PaymentRouter...");
    const currentFee = await paymentRouter.feeBasisPoints();
    const currentCollector = await paymentRouter.feeCollector();
    console.log(`   Fee: ${currentFee} basis points (${Number(currentFee)/100}%)`);
    console.log(`   Fee collector: ${currentCollector}`);

    // 3. Deploy TipRouter (if we have LDAO token)
    if (addresses.LDAOToken?.address) {
      console.log("\n3️⃣  Deploying TipRouter...");
      const ldaoTokenAddress = addresses.LDAOToken.address;
      const rewardPoolAddress = addresses.EnhancedRewardPool?.address || paymentRouterAddress; // Fallback

      const TipRouter = await ethers.getContractFactory("TipRouter");
      const tipRouter = await TipRouter.deploy(ldaoTokenAddress, rewardPoolAddress);
      await tipRouter.waitForDeployment();
      
      const tipRouterAddress = await tipRouter.getAddress();
      console.log("✅ TipRouter deployed to:", tipRouterAddress);

      const tipRouterTx = await tipRouter.deploymentTransaction()?.wait();
      if (tipRouterTx) {
        totalGasUsed += tipRouterTx.gasUsed;
      }

      addresses.TipRouter = {
        address: tipRouterAddress,
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        network: network.name,
        chainId: network.chainId.toString(),
        contractName: "TipRouter",
        constructorArgs: {
          ldaoToken: ldaoTokenAddress,
          rewardPool: rewardPoolAddress
        }
      };

      // Test TipRouter
      console.log("🧪 Testing TipRouter...");
      const ldaoAddr = await tipRouter.ldao();
      const rewardPoolAddr = await tipRouter.rewardPool();
      const feeBps = await tipRouter.feeBps();
      console.log(`   LDAO token: ${ldaoAddr}`);
      console.log(`   Reward pool: ${rewardPoolAddr}`);
      console.log(`   Fee: ${feeBps} basis points (${Number(feeBps)/100}%)`);
    } else {
      console.log("\n⚠️  Skipping TipRouter deployment - LDAO token not found");
    }

    // 4. Add completion marker
    addresses.Phase4_1_Extended_Features_Partial = {
      address: "COMPLETED",
      deployer: deployer.address,
      deployedAt: new Date().toISOString(),
      network: network.name,
      chainId: network.chainId.toString(),
      contractName: "Phase4.1_Partial_Completion",
      deployedContracts: {
        followModule: addresses.FollowModule?.address,
        paymentRouter: addresses.PaymentRouter?.address,
        tipRouter: addresses.TipRouter?.address
      }
    };

    // Save addresses
    writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
    console.log("✅ Deployment addresses updated");

    // Display summary
    console.log("\n📋 Phase 4.1 Deployment Summary (Partial)");
    console.log("==========================================");
    console.log(`FollowModule: ${addresses.FollowModule?.address}`);
    console.log(`PaymentRouter: ${addresses.PaymentRouter?.address}`);
    if (addresses.TipRouter?.address) {
      console.log(`TipRouter: ${addresses.TipRouter.address}`);
    }
    console.log(`Total Gas Used: ${totalGasUsed.toString()}`);
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Deployer: ${deployer.address}`);
    console.log("==========================================");

    console.log("\n✅ Features Implemented:");
    console.log("• Social following system");
    console.log("• Multi-token payment routing (ETH and ERC20)");
    console.log("• Platform fee collection");
    if (addresses.TipRouter?.address) {
      console.log("• Social tipping functionality");
    }

    console.log("\n🎉 Phase 4.1: Extended Features (Partial) deployment completed!");

    return {
      followModule: addresses.FollowModule?.address,
      paymentRouter: addresses.PaymentRouter?.address,
      tipRouter: addresses.TipRouter?.address,
      totalGasUsed: totalGasUsed.toString()
    };

  } catch (error) {
    console.error("❌ Phase 4.1 deployment failed:", error);
    throw error;
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment failed:", error);
      process.exit(1);
    });
}

export { main as deployPhase4SimpleFeatures };