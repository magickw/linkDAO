import { ethers } from "hardhat";
import { formatEther } from "ethers";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying Profile Registry contracts with the account:", deployer.address);
  console.log("Account balance:", formatEther(await deployer.provider.getBalance(deployer.address)));

  // Deploy ProfileRegistry
  console.log("\n🔄 Deploying ProfileRegistry...");
  const ProfileRegistry = await ethers.getContractFactory("ProfileRegistry");
  const profileRegistry = await ProfileRegistry.deploy();
  await profileRegistry.waitForDeployment();
  const profileRegistryAddress = await profileRegistry.getAddress();
  console.log("✅ ProfileRegistry deployed to:", profileRegistryAddress);

  // Deploy SimpleProfileRegistry
  console.log("\n🔄 Deploying SimpleProfileRegistry...");
  const SimpleProfileRegistry = await ethers.getContractFactory("SimpleProfileRegistry");
  const simpleProfileRegistry = await SimpleProfileRegistry.deploy();
  await simpleProfileRegistry.waitForDeployment();
  const simpleProfileRegistryAddress = await simpleProfileRegistry.getAddress();
  console.log("✅ SimpleProfileRegistry deployed to:", simpleProfileRegistryAddress);

  // Verify deployments by testing basic functionality
  console.log("\n🧪 Verifying deployments...");
  
  try {
    // Test ProfileRegistry
    const profileName = await profileRegistry.name();
    const profileSymbol = await profileRegistry.symbol();
    console.log(`✅ ProfileRegistry - Name: ${profileName}, Symbol: ${profileSymbol}`);
    
    // Test SimpleProfileRegistry
    const simpleName = await simpleProfileRegistry.name();
    const simpleSymbol = await simpleProfileRegistry.symbol();
    console.log(`✅ SimpleProfileRegistry - Name: ${simpleName}, Symbol: ${simpleSymbol}`);
    
    // Test profile creation on ProfileRegistry
    console.log("\n🧪 Testing profile creation...");
    const tx1 = await profileRegistry.createProfile(
      "testuser",
      "testuser.eth",
      "QmTestAvatar123",
      "QmTestBio456"
    );
    await tx1.wait();
    
    const profile = await profileRegistry.getProfileByAddress(deployer.address);
    console.log(`✅ Profile created - Handle: ${profile.handle}, ENS: ${profile.ens}`);
    
    // Test profile creation on SimpleProfileRegistry
    const tx2 = await simpleProfileRegistry.createProfile(
      "simpleuser",
      "QmSimpleAvatar789"
    );
    await tx2.wait();
    
    const simpleProfile = await simpleProfileRegistry.getProfileByAddress(deployer.address);
    console.log(`✅ Simple profile created - Handle: ${simpleProfile.handle}`);
    
    // Test handle reservation system
    console.log("\n🧪 Testing handle reservation...");
    const profileByHandle = await profileRegistry.getProfileByHandle("testuser");
    console.log(`✅ Handle lookup works - Found profile with handle: ${profileByHandle.handle}`);
    
    // Test ENS integration
    console.log("\n🧪 Testing ENS integration...");
    await profileRegistry.updateEns(1, "newtestuser.eth");
    const updatedProfile = await profileRegistry.getProfileByAddress(deployer.address);
    console.log(`✅ ENS updated - New ENS: ${updatedProfile.ens}`);
    
    // Test avatar storage system
    console.log("\n🧪 Testing avatar storage...");
    await profileRegistry.updateProfile(1, "QmNewAvatar999", "QmNewBio888");
    const updatedProfile2 = await profileRegistry.getProfileByAddress(deployer.address);
    console.log(`✅ Profile updated - New Avatar CID: ${updatedProfile2.avatarCid}`);
    
    console.log("\n🎉 Profile Registry contracts deployed and verified successfully!");
    
    // Output deployment information
    console.log("\n📝 Deployment Summary:");
    console.log("=====================================");
    console.log(`PROFILE_REGISTRY_ADDRESS=${profileRegistryAddress}`);
    console.log(`SIMPLE_PROFILE_REGISTRY_ADDRESS=${simpleProfileRegistryAddress}`);
    console.log(`DEPLOYER_ADDRESS=${deployer.address}`);
    console.log(`NETWORK=${(await deployer.provider.getNetwork()).name}`);
    console.log(`CHAIN_ID=${(await deployer.provider.getNetwork()).chainId}`);
    console.log("=====================================");
    
    return {
      profileRegistryAddress,
      simpleProfileRegistryAddress,
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

export { main as deployProfileRegistry };