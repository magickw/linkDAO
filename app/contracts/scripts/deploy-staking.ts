import { ethers } from "hardhat";
import { formatEther } from "ethers";
import { writeFileSync } from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying EnhancedLDAOStaking contract with the account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", formatEther(balance.toString()));

  // Get LDAO token address from environment or existing deployment
  const ldaoTokenAddress = process.env.LDAO_TOKEN_ADDRESS || "0xc9F690B45e33ca909bB9ab97836091673232611B";
  
  console.log("\n🔄 Deploying EnhancedLDAOStaking...");
  console.log("   LDAO Token Address:", ldaoTokenAddress);
  console.log("   Deployer/Owner:", deployer.address);
  
  const EnhancedLDAOStaking = await ethers.getContractFactory("EnhancedLDAOStaking");
  const stakingContract = await EnhancedLDAOStaking.deploy(ldaoTokenAddress, deployer.address);
  await stakingContract.deployed();
  const stakingAddress = stakingContract.address;
  console.log("✅ EnhancedLDAOStaking deployed to:", stakingAddress);

  // Save address to JSON file
  const stakingInfo = {
    STAKING_CONTRACT_ADDRESS: stakingAddress,
    LDAO_TOKEN_ADDRESS: ldaoTokenAddress,
    deployer: deployer.address,
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployedAt: new Date().toISOString()
  };
  
  writeFileSync(
    "staking-deployment.json",
    JSON.stringify(stakingInfo, null, 2)
  );
  
  console.log("\n📝 Staking Contract Deployment Summary:");
  console.log("=====================================");
  console.log(`STAKING_CONTRACT_ADDRESS=${stakingAddress}`);
  console.log(`LDAO_TOKEN_ADDRESS=${ldaoTokenAddress}`);
  console.log("=====================================");
  
  console.log("\n💾 Deployment info saved to staking-deployment.json");
  console.log("\n📝 Next Steps:");
  console.log(`1. Update NEXT_PUBLIC_API_STAKING_ADDRESS in frontend .env files to: ${stakingAddress}`);
  console.log(`2. Update STAKING_CONTRACT_ADDRESS in backend .env files to: ${stakingAddress}`);
  console.log("3. Restart your application to use the new staking contract");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });