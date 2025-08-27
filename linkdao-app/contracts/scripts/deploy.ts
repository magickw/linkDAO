import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy ProfileRegistry
  const ProfileRegistry = await ethers.getContractFactory("ProfileRegistry");
  const profileRegistry = await ProfileRegistry.deploy();
  await profileRegistry.waitForDeployment();
  console.log("ProfileRegistry deployed to:", await profileRegistry.getAddress());

  // Deploy FollowModule
  const FollowModule = await ethers.getContractFactory("FollowModule");
  const followModule = await FollowModule.deploy();
  await followModule.waitForDeployment();
  console.log("FollowModule deployed to:", await followModule.getAddress());

  // Deploy PaymentRouter (0% fee, deployer as fee collector)
  const PaymentRouter = await ethers.getContractFactory("PaymentRouter");
  const paymentRouter = await PaymentRouter.deploy(0n, deployer.address);
  await paymentRouter.waitForDeployment();
  console.log("PaymentRouter deployed to:", await paymentRouter.getAddress());

  // Deploy Governance (using ProfileRegistry as governance token for now)
  const Governance = await ethers.getContractFactory("Governance");
  const governance = await Governance.deploy(
    await profileRegistry.getAddress(), // Using ProfileRegistry as governance token for demo
    1n, // voting delay (1 block)
    100n, // voting period (100 blocks)
    1n, // quorum votes
    1n // proposal threshold
  );
  await governance.waitForDeployment();
  console.log("Governance deployed to:", await governance.getAddress());

  // Save addresses to file
  const fs = await import("fs");
  const addresses = {
    profileRegistry: await profileRegistry.getAddress(),
    followModule: await followModule.getAddress(),
    paymentRouter: await paymentRouter.getAddress(),
    governance: await governance.getAddress()
  };
  
  fs.writeFileSync(
    "deployedAddresses.json",
    JSON.stringify(addresses, null, 2)
  );
  
  console.log("Addresses saved to deployedAddresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });