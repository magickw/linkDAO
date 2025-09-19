import { ethers } from "hardhat";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";

async function main() {
  console.log("Deploying FollowModule...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()));

  // Deploy FollowModule (no constructor arguments needed)
  const FollowModule = await ethers.getContractFactory("FollowModule");
  const followModule = await FollowModule.deploy();
  await followModule.deployed();

  console.log("FollowModule deployed to:", followModule.address);

  // Save deployment info
  const deploymentInfo = {
    address: followModule.address,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    transactionHash: followModule.deployTransaction.hash,
    blockNumber: followModule.deployTransaction.blockNumber,
    gasUsed: (await followModule.deployTransaction.wait()).gasUsed.toString(),
    contractName: "FollowModule",
    constructorArgs: {}
  };

  // Read existing addresses file or create new one
  const addressesPath = join(__dirname, "../deployedAddresses.json");
  let addresses: any = {};
  
  try {
    const existingData = readFileSync(addressesPath, "utf8");
    addresses = JSON.parse(existingData);
  } catch (error) {
    console.log("Creating new deployedAddresses.json file");
  }

  // Update addresses
  addresses.FollowModule = deploymentInfo;

  // Write updated addresses
  writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("Deployment info saved to deployedAddresses.json");

  // Test basic functionality
  console.log("Testing basic functionality...");
  
  const owner = await followModule.owner();
  console.log("Contract owner:", owner);
  
  // Test follow/unfollow functionality with deployer account
  const testUser = deployer.address;
  const testTarget = "0x1234567890123456789012345678901234567890"; // Dummy address for testing
  
  console.log("Testing follow functionality...");
  
  // Check initial state
  const initialFollowerCount = await followModule.followerCount(testTarget);
  const initialFollowingCount = await followModule.followingCount(testUser);
  const initialIsFollowing = await followModule.isFollowing(testUser, testTarget);
  
  console.log("Initial follower count for test target:", initialFollowerCount.toString());
  console.log("Initial following count for deployer:", initialFollowingCount.toString());
  console.log("Initially following test target:", initialIsFollowing);

  // Note: We won't actually execute follow/unfollow in deployment script
  // as it would require gas and might fail with dummy address
  console.log("Follow functionality test skipped in deployment (would require valid target address)");

  // Verify contract on Etherscan (if not local network)
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 31337 && network.chainId !== 1337) {
    console.log("Waiting for block confirmations...");
    await followModule.deployTransaction.wait(6);
    
    try {
      await hre.run("verify:verify", {
        address: followModule.address,
        constructorArguments: [],
      });
      console.log("Contract verified on Etherscan");
    } catch (error) {
      console.log("Verification failed:", error);
    }
  }

  console.log("FollowModule deployment completed successfully!");
  
  return {
    address: followModule.address,
    contract: followModule
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export default main;