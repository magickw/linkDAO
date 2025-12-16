import { ethers } from "hardhat";
import { formatEther, parseEther } from "ethers";
import { writeFileSync } from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying ContractRegistry with the account:", deployer.address);
  console.log("Account balance:", formatEther(await deployer.provider.getBalance(deployer.address)));

  // Deploy ContractRegistry (no dependencies)
  console.log("\n🔄 Deploying ContractRegistry...");
  const ContractRegistry = await ethers.getContractFactory("ContractRegistry");
  const contractRegistry = await ContractRegistry.deploy();
  await contractRegistry.waitForDeployment();
  const contractRegistryAddress = await contractRegistry.getAddress();
  console.log("✅ ContractRegistry deployed to:", contractRegistryAddress);

  // Save address to deployedAddresses.json
  const deploymentFile = path.join(__dirname, "..", "deployedAddresses.json");
  
  let existingAddresses = {};
  try {
    const existingData = require(deploymentFile);
    existingAddresses = existingData;
  } catch (error) {
    console.log("No existing deployment file found, creating new one");
  }

  // Update or add ContractRegistry address
  const updatedAddresses = {
    ...existingAddresses,
    CONTRACT_REGISTRY_ADDRESS: contractRegistryAddress,
    deployer: deployer.address,
    network: (await deployer.provider.getNetwork()).name,
    chainId: (await deployer.provider.getNetwork()).chainId.toString(),
    deployedAt: new Date().toISOString()
  };

  writeFileSync(
    deploymentFile,
    JSON.stringify(updatedAddresses, null, 2)
  );

  console.log("\n📝 ContractRegistry address added to deployedAddresses.json");
  console.log(`CONTRACT_REGISTRY_ADDRESS=${contractRegistryAddress}`);

  // Verify contract is working
  console.log("\n🧪 Running basic contract test...");
  
  try {
    // Test ContractRegistry
    const owner = await contractRegistry.owner();
    console.log(`✅ ContractRegistry owner: ${owner}`);
    
    console.log("\n🎉 ContractRegistry deployed and verified successfully!");
    
  } catch (error) {
    console.log("⚠️  Contract verification failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });