import { ethers, upgrades } from "hardhat";
import { writeFileSync, readFileSync } from "fs";
import { resolve } from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying enhanced social contracts with account:", deployer.address);

  // Read existing addresses
  const addressesPath = resolve(__dirname, "..", "deployedAddresses.json");
  let addresses: any = {};
  
  try {
    const addressesData = readFileSync(addressesPath, "utf8");
    addresses = JSON.parse(addressesData);
  } catch (error) {
    console.log("No existing addresses file found, will create new one");
  }

  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "ChainId:", network.chainId);

  // Deploy enhanced ProfileRegistry
  console.log("\n1️⃣  Deploying enhanced ProfileRegistry...");
  const ProfileRegistry = await ethers.getContractFactory("ProfileRegistry");
  const profileRegistry = await ProfileRegistry.deploy();
  await profileRegistry.waitForDeployment();
  
  const profileRegistryAddress = await profileRegistry.getAddress();
  console.log("✅ ProfileRegistry deployed to:", profileRegistryAddress);
  
  // Deploy enhanced FollowModule
  console.log("\n2️⃣  Deploying enhanced FollowModule...");
  const FollowModule = await ethers.getContractFactory("FollowModule");
  const followModule = await FollowModule.deploy(profileRegistryAddress);
  await followModule.waitForDeployment();
  
  const followModuleAddress = await followModule.getAddress();
  console.log("✅ FollowModule deployed to:", followModuleAddress);
  
  // Get LDAO token and reward pool addresses
  let ldaoTokenAddress = addresses.LDAOToken?.address || addresses.TOKEN_ADDRESS;
  let rewardPoolAddress = addresses.RewardPool?.address || addresses.EnhancedRewardPool?.address;
  
  // If addresses not found, deploy mock contracts for testing
  if (!ldaoTokenAddress) {
    console.log("\n⚠️  LDAO token address not found, deploying mock LDAOToken...");
    const MockLDAOToken = await ethers.getContractFactory("LDAOToken");
    const mockLDAOToken = await MockLDAOToken.deploy();
    await mockLDAOToken.waitForDeployment();
    ldaoTokenAddress = await mockLDAOToken.getAddress();
    console.log("✅ Mock LDAOToken deployed to:", ldaoTokenAddress);
  }
  
  if (!rewardPoolAddress) {
    console.log("\n⚠️  Reward pool address not found, deploying mock RewardPool...");
    const MockRewardPool = await ethers.getContractFactory("RewardPool");
    const mockRewardPool = await MockRewardPool.deploy(ldaoTokenAddress, deployer.address);
    await mockRewardPool.waitForDeployment();
    rewardPoolAddress = await mockRewardPool.getAddress();
    console.log("✅ Mock RewardPool deployed to:", rewardPoolAddress);
  }
  
  // Deploy enhanced TipRouter
  console.log("\n3️⃣  Deploying enhanced TipRouter...");
  const TipRouter = await ethers.getContractFactory("TipRouter");
  const tipRouter = await TipRouter.deploy(ldaoTokenAddress, rewardPoolAddress);
  await tipRouter.waitForDeployment();
  
  const tipRouterAddress = await tipRouter.getAddress();
  console.log("✅ TipRouter deployed to:", tipRouterAddress);
  
  // Deploy SocialReputationToken
  console.log("\n4️⃣  Deploying SocialReputationToken...");
  const SocialReputationToken = await ethers.getContractFactory("SocialReputationToken");
  const socialReputationToken = await SocialReputationToken.deploy(
    profileRegistryAddress,
    followModuleAddress,
    tipRouterAddress
  );
  await socialReputationToken.waitForDeployment();
  
  const socialReputationTokenAddress = await socialReputationToken.getAddress();
  console.log("✅ SocialReputationToken deployed to:", socialReputationTokenAddress);

  // Save deployment info
  const deploymentInfo = {
    ProfileRegistry: {
      address: profileRegistryAddress,
      deployer: deployer.address,
      deployedAt: new Date().toISOString(),
      network: network.name,
      chainId: network.chainId.toString(),
      contractName: "ProfileRegistry"
    },
    FollowModule: {
      address: followModuleAddress,
      deployer: deployer.address,
      deployedAt: new Date().toISOString(),
      network: network.name,
      chainId: network.chainId.toString(),
      contractName: "FollowModule"
    },
    TipRouter: {
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
    },
    SocialReputationToken: {
      address: socialReputationTokenAddress,
      deployer: deployer.address,
      deployedAt: new Date().toISOString(),
      network: network.name,
      chainId: network.chainId.toString(),
      contractName: "SocialReputationToken",
      constructorArgs: {
        profileRegistry: profileRegistryAddress,
        followModule: followModuleAddress,
        tipRouter: tipRouterAddress
      }
    }
  };

  // Update addresses
  addresses = { ...addresses, ...deploymentInfo };

  // Write updated addresses
  writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("\n💾 Deployment info saved to deployedAddresses.json");

  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...");
  
  // Test ProfileRegistry
  const profileName = await profileRegistry.name();
  const profileSymbol = await profileRegistry.symbol();
  console.log(`   ProfileRegistry - Name: ${profileName}, Symbol: ${profileSymbol}`);
  
  // Test FollowModule
  const followOwner = await followModule.owner();
  console.log(`   FollowModule - Owner: ${followOwner}`);
  
  // Test TipRouter
  const ldaoAddr = await tipRouter.ldao();
  const rewardPoolAddr = await tipRouter.rewardPool();
  const feeBps = await tipRouter.feeBps();
  console.log(`   TipRouter - LDAO: ${ldaoAddr}, RewardPool: ${rewardPoolAddr}, Fee: ${feeBps}bps`);
  
  // Test SocialReputationToken
  const repName = await socialReputationToken.name();
  const repSymbol = await socialReputationToken.symbol();
  console.log(`   SocialReputationToken - Name: ${repName}, Symbol: ${repSymbol}`);

  console.log("\n🎉 All enhanced social contracts deployed successfully!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});