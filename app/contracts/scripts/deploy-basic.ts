import { ethers } from "hardhat";

async function main() {
  console.log("Deploying basic contracts...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy Counter (simplest contract)
  const Counter = await ethers.getContractFactory("Counter");
  const counter = await Counter.deploy();
  await counter.deployed();
  console.log("Counter deployed to:", counter.address);

  console.log("Basic deployment complete!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});