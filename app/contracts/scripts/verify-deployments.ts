import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Verifying Recent Deployments on Sepolia");
  console.log("=====================================");
  
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deployer:", deployerAddress);
  
  // Recent contract addresses from Etherscan (truncated)
  const recentDeployments = [
    "0x5fe959ff30d",
    "0x83fa87c462b", 
    "0xd36ccde891",
    "0xe78a7b46d6"
  ];
  
  console.log("\nChecking recent deployments...");
  
  for (const addr of recentDeployments) {
    try {
      const code = await ethers.provider.getCode(addr);
      if (code !== "0x") {
        console.log(`✅ Contract found at ${addr}`);
        
        // Try to identify the contract
        try {
          // Check if it's LDAOToken
          const ldaotoken = await ethers.getContractAt("LDAOToken", addr);
          const name = await ldaotoken.name().catch(() => "");
          if (name) {
            console.log(`   Identified as: LDAOToken - ${name}`);
            continue;
          }
        } catch {}
        
        try {
          // Check if it's ReputationSystem
          const reputationSystem = await ethers.getContractAt("ReputationSystem", addr);
          const owner = await reputationSystem.owner().catch(() => "");
          if (owner) {
            console.log(`   Identified as: ReputationSystem`);
            continue;
          }
        } catch {}
        
        try {
          // Check if it's SocialReputationToken
          const socialToken = await ethers.getContractAt("SocialReputationToken", addr);
          const name = await socialToken.name().catch(() => "");
          if (name) {
            console.log(`   Identified as: SocialReputationToken - ${name}`);
            continue;
          }
        } catch {}
        
        try {
          // Check if it's ReputationBridge
          const bridge = await ethers.getContractAt("ReputationBridge", addr);
          const paused = await bridge.paused().catch(() => "");
          if (paused !== undefined) {
            console.log(`   Identified as: ReputationBridge`);
            continue;
          }
        } catch {}
        
        console.log(`   Contract type: Unknown`);
      } else {
        console.log(`❌ No contract at ${addr}`);
      }
    } catch (error) {
      console.log(`❌ Error checking ${addr}: ${error.message}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });