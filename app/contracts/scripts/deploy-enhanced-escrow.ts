import { ethers } from "hardhat";

async function main() {
  // Get the contract factories
  const EnhancedEscrow = await ethers.getContractFactory("EnhancedEscrow");
  const Marketplace = await ethers.getContractFactory("Marketplace");
  
  // Deploy EnhancedEscrow contract
  // For now, we'll use the owner as the governance address
  // In a real deployment, this would be the actual governance contract address
  const [owner] = await ethers.getSigners();
  console.log("Deploying EnhancedEscrow with account:", owner.address);
  
  const enhancedEscrow = await EnhancedEscrow.deploy(owner.address);
  await enhancedEscrow.waitForDeployment();
  
  console.log("EnhancedEscrow deployed to:", await enhancedEscrow.getAddress());
  
  // Deploy Marketplace contract
  console.log("Deploying Marketplace...");
  const marketplace = await Marketplace.deploy();
  await marketplace.waitForDeployment();
  
  console.log("Marketplace deployed to:", await marketplace.getAddress());
  
  // Set the EnhancedEscrow address in the Marketplace contract if needed
  // This would depend on how you want to integrate the two contracts
  
  console.log("Deployment completed successfully!");
  console.log("EnhancedEscrow address:", await enhancedEscrow.getAddress());
  console.log("Marketplace address:", await marketplace.getAddress());
  
  // Verify the deployment by calling a function
  console.log("Verifying deployment...");
  const escrowAddress = await enhancedEscrow.getAddress();
  console.log("EnhancedEscrow contract deployed at:", escrowAddress);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});