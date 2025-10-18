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

  // Deploy MockERC20
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20.deploy("Test Token", "TEST", 18);
  await mockToken.deployed();
  console.log("MockERC20 deployed to:", mockToken.address);

  console.log("Basic deployment complete!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});