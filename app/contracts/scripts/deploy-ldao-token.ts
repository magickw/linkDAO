import { ethers } from "hardhat";

async function main() {
  // Get the contract factories
  const LDAOToken = await ethers.getContractFactory("LDAOToken");
  const TipRouter = await ethers.getContractFactory("TipRouter");
  const RewardPool = await ethers.getContractFactory("RewardPool");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  // Deploy LDAOToken contract with 1 billion tokens minted to the deployer
  console.log("Deploying LDAOToken...");
  const initialSupply = ethers.parseEther("1000000000"); // 1 billion tokens
  const ldaoToken = await LDAOToken.deploy(deployer.address);
  await ldaoToken.waitForDeployment();
  
  console.log("LDAOToken deployed to:", await ldaoToken.getAddress());
  
  // Deploy RewardPool contract
  console.log("Deploying RewardPool...");
  const rewardPool = await RewardPool.deploy(await ldaoToken.getAddress());
  await rewardPool.waitForDeployment();
  
  console.log("RewardPool deployed to:", await rewardPool.getAddress());
  
  // Deploy TipRouter contract
  console.log("Deploying TipRouter...");
  const tipRouter = await TipRouter.deploy(await ldaoToken.getAddress(), await rewardPool.getAddress());
  await tipRouter.waitForDeployment();
  
  console.log("TipRouter deployed to:", await tipRouter.getAddress());
  
  // Transfer some tokens to the RewardPool for initial funding
  console.log("Transferring tokens to RewardPool...");
  const rewardPoolFunding = ethers.parseEther("100000000"); // 100 million tokens
  await ldaoToken.transfer(await rewardPool.getAddress(), rewardPoolFunding);
  
  console.log("Deployment completed successfully!");
  console.log("LDAOToken address:", await ldaoToken.getAddress());
  console.log("RewardPool address:", await rewardPool.getAddress());
  console.log("TipRouter address:", await tipRouter.getAddress());
  
  // Verify the deployment by checking token name
  console.log("Verifying deployment...");
  const tokenName = await ldaoToken.name();
  console.log("LDAOToken name:", tokenName);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});