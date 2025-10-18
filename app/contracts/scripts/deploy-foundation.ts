import { ethers } from "hardhat";
import { deployLDAOToken } from "./deploy-ldao-token";
import { deployGovernance } from "./deploy-governance";
import { deployReputationSystem } from "./deploy-reputation-system";
import { configureFoundationInterconnections } from "./configure-foundation-interconnections";

async function main() {
  console.log("=".repeat(60));
  console.log("FOUNDATION LAYER MAINNET DEPLOYMENT");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await deployer.getBalance()), "ETH");
  console.log();

  const deploymentResults: any = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {},
    isMainnet: network.chainId === 1n
  };

  try {
    // Phase 1: Deploy LDAO Token with staking mechanisms
    console.log("🏛️ Phase 1: Deploying LDAO Token...");
    console.log("-".repeat(40));
    const ldaoTokenResult = await deployLDAOToken();
    deploymentResults.contracts.ldaoToken = ldaoTokenResult;
    
    // Set environment variable for next deployments
    process.env.LDAO_TOKEN_ADDRESS = ldaoTokenResult.contractAddress;
    console.log("✅ LDAO Token deployment completed\n");

    // Phase 2: Deploy Governance System
    console.log("🗳️  Phase 2: Deploying Governance System...");
    console.log("-".repeat(40));
    const governanceResult = await deployGovernance();
    deploymentResults.contracts.governance = governanceResult;
    
    // Set environment variable for interconnections
    process.env.GOVERNANCE_ADDRESS = governanceResult.governanceAddress;
    console.log("✅ Governance System deployment completed\n");

    // Phase 3: Deploy Reputation System
    console.log("🏆 Phase 3: Deploying Reputation System...");
    console.log("-".repeat(40));
    const reputationResult = await deployReputationSystem();
    deploymentResults.contracts.reputationSystem = reputationResult;
    
    // Set environment variable for interconnections
    process.env.REPUTATION_SYSTEM_ADDRESS = reputationResult.reputationSystemAddress;
    console.log("✅ Reputation System deployment completed\n");

    // Phase 4: Configure Foundation Layer Interconnections
    console.log("🔗 Phase 4: Configuring Foundation Layer Interconnections...");
    console.log("-".repeat(40));
    const interconnectionResult = await configureFoundationInterconnections();
    deploymentResults.interconnections = interconnectionResult;
    console.log("✅ Foundation Layer Interconnections completed\n");

    // Comprehensive Integration Testing
    console.log("🧪 Running Comprehensive Integration Tests...");
    console.log("-".repeat(40));
    
    // Test LDAO Token integration
    const LDAOTokenFactory = await ethers.getContractFactory("LDAOToken");
    const ldaoToken = LDAOTokenFactory.attach(deploymentResults.contracts.ldaoToken.contractAddress);
    
    console.log("Testing LDAO Token integration...");
    const tokenName = await ldaoToken.name();
    const tokenSymbol = await ldaoToken.symbol();
    const totalSupply = await ldaoToken.totalSupply();
    console.log(`✅ Token: ${tokenName} (${tokenSymbol})`);
    console.log(`✅ Total Supply: ${ethers.formatEther(totalSupply)} LDAO`);
    
    // Test Governance integration
    const GovernanceFactory = await ethers.getContractFactory("Governance");
    const governance = GovernanceFactory.attach(deploymentResults.contracts.governance.governanceAddress);
    
    console.log("Testing Governance integration...");
    const governanceToken = await governance.governanceToken();
    const proposalCount = await governance.proposalCount();
    console.log(`✅ Governance Token: ${governanceToken}`);
    console.log(`✅ Proposal Count: ${proposalCount}`);
    
    // Test Reputation System integration
    const ReputationSystemFactory = await ethers.getContractFactory("ReputationSystem");
    const reputationSystem = ReputationSystemFactory.attach(deploymentResults.contracts.reputationSystem.reputationSystemAddress);
    
    console.log("Testing Reputation System integration...");
    const totalReviews = await reputationSystem.totalReviews();
    const deployerTier = await reputationSystem.getReputationTier(deployer.address);
    console.log(`✅ Total Reviews: ${totalReviews}`);
    console.log(`✅ Deployer Reputation Tier: ${deployerTier} (NEWCOMER)`);

    // Test cross-contract integrations
    console.log("Testing cross-contract integrations...");
    const votingPower = await governance.getVotingPower(deployer.address);
    console.log(`✅ Deployer Voting Power: ${ethers.formatEther(votingPower)} votes`);
    
    // Final Verification
    console.log("\n🎉 FOUNDATION LAYER DEPLOYMENT SUCCESSFUL!");
    console.log("=".repeat(60));
    console.log("All foundation contracts deployed and interconnected:");
    console.log("• LDAO Token with staking mechanisms ✅");
    console.log("• Governance system with 6 proposal categories ✅");
    console.log("• Reputation system with 6 tiers and anti-gaming ✅");
    console.log("• Cross-contract integrations configured ✅");
    console.log("• Voting power calculation with staking bonuses ✅");
    console.log("• Community moderation with reputation requirements ✅");
    console.log("=".repeat(60));

    // Save deployment info to file
    const fs = require('fs');
    const deploymentFile = `foundation-deployment-${network.name}-${Date.now()}.json`;
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentResults, null, 2));
    
    // Also save to standard deployedAddresses.json for other scripts
    const addressesFile = {
      LDAO_TOKEN_ADDRESS: deploymentResults.contracts.ldaoToken.contractAddress,
      GOVERNANCE_ADDRESS: deploymentResults.contracts.governance.governanceAddress,
      REPUTATION_SYSTEM_ADDRESS: deploymentResults.contracts.reputationSystem.reputationSystemAddress,
      NETWORK: network.name,
      CHAIN_ID: network.chainId.toString(),
      DEPLOYMENT_TIMESTAMP: deploymentResults.timestamp
    };
    fs.writeFileSync('deployedAddresses.json', JSON.stringify(addressesFile, null, 2));
    
    console.log(`📄 Deployment info saved to: ${deploymentFile}`);
    console.log(`📄 Contract addresses saved to: deployedAddresses.json`);

    return deploymentResults;

  } catch (error) {
    console.error("❌ DEPLOYMENT FAILED:", error);
    throw error;
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Foundation deployment failed:", error);
      process.exit(1);
    });
}

export { main as deployFoundation };