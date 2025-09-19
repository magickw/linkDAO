import { ethers } from "hardhat";
import { formatEther, parseEther } from "ethers";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying Governance infrastructure with the account:", deployer.address);
  console.log("Account balance:", formatEther(await deployer.provider.getBalance(deployer.address)));

  // First, we need to deploy or get the LDAOToken address
  console.log("\n🔄 Checking for existing LDAOToken...");
  
  let ldaoTokenAddress: string;
  
  try {
    // Try to read from deployed addresses file
    const fs = require('fs');
    const deployedAddresses = JSON.parse(fs.readFileSync('deployedAddresses.json', 'utf8'));
    ldaoTokenAddress = deployedAddresses.TOKEN_ADDRESS;
    console.log("✅ Found existing LDAOToken at:", ldaoTokenAddress);
  } catch (error) {
    // Deploy LDAOToken if not found
    console.log("📦 LDAOToken not found, deploying...");
    const LDAOToken = await ethers.getContractFactory("LDAOToken");
    const ldaoToken = await LDAOToken.deploy(deployer.address); // Treasury address
    await ldaoToken.waitForDeployment();
    ldaoTokenAddress = await ldaoToken.getAddress();
    console.log("✅ LDAOToken deployed to:", ldaoTokenAddress);
  }

  // Deploy Governance contract
  console.log("\n🔄 Deploying Governance contract...");
  const Governance = await ethers.getContractFactory("Governance");
  const governance = await Governance.deploy(ldaoTokenAddress);
  await governance.waitForDeployment();
  const governanceAddress = await governance.getAddress();
  console.log("✅ Governance deployed to:", governanceAddress);

  // Verify deployment and configure governance
  console.log("\n🧪 Verifying deployment and configuration...");
  
  try {
    // Check governance token integration
    const governanceTokenAddress = await governance.governanceToken();
    console.log(`✅ Governance token configured: ${governanceTokenAddress}`);
    
    // Check initial parameters
    const votingDelay = await governance.votingDelay();
    const votingPeriod = await governance.votingPeriod();
    const quorumVotes = await governance.quorumVotes();
    const proposalThreshold = await governance.proposalThreshold();
    const executionDelay = await governance.executionDelay();
    
    console.log(`✅ Voting delay: ${votingDelay} blocks (~${Number(votingDelay) * 12 / 3600} hours)`);
    console.log(`✅ Voting period: ${votingPeriod} blocks (~${Number(votingPeriod) * 12 / 3600} hours)`);
    console.log(`✅ Quorum votes: ${formatEther(quorumVotes)} tokens`);
    console.log(`✅ Proposal threshold: ${formatEther(proposalThreshold)} tokens`);
    console.log(`✅ Execution delay: ${executionDelay} seconds (${Number(executionDelay) / 3600} hours)`);
    
    // Check category-specific parameters
    console.log("\n🔧 Verifying category-specific parameters...");
    
    const categories = [
      { name: "GENERAL", id: 0 },
      { name: "MARKETPLACE_POLICY", id: 1 },
      { name: "FEE_STRUCTURE", id: 2 },
      { name: "REPUTATION_SYSTEM", id: 3 },
      { name: "SECURITY_UPGRADE", id: 4 },
      { name: "TOKEN_ECONOMICS", id: 5 }
    ];
    
    for (const category of categories) {
      const quorum = await governance.categoryQuorum(category.id);
      const threshold = await governance.categoryThreshold(category.id);
      const requiresStaking = await governance.categoryRequiresStaking(category.id);
      
      console.log(`✅ ${category.name}:`);
      console.log(`   Quorum: ${formatEther(quorum)} tokens`);
      console.log(`   Threshold: ${formatEther(threshold)} tokens`);
      console.log(`   Requires staking: ${requiresStaking}`);
    }
    
    // Test proposal creation (if we have enough tokens)
    console.log("\n🧪 Testing proposal creation...");
    
    // Get LDAOToken contract instance
    const LDAOToken = await ethers.getContractFactory("LDAOToken");
    const ldaoToken = LDAOToken.attach(ldaoTokenAddress);
    
    // Check deployer's voting power
    const votingPower = await governance.getVotingPower(deployer.address);
    console.log(`✅ Deployer voting power: ${formatEther(votingPower)} tokens`);
    
    if (votingPower >= proposalThreshold) {
      // Create a test proposal
      const tx = await governance.propose(
        "Test Proposal",
        "This is a test proposal to verify governance functionality",
        0, // GENERAL category
        [], // No targets
        [], // No values
        [], // No signatures
        []  // No calldatas
      );
      
      const receipt = await tx.wait();
      const proposalId = await governance.proposalCount();
      
      console.log(`✅ Test proposal created with ID: ${proposalId}`);
      
      // Get proposal details
      const proposal = await governance.getProposal(proposalId);
      console.log(`✅ Proposal state: ${proposal.state}`);
      console.log(`✅ Proposal category: ${proposal.category}`);
      console.log(`✅ Start block: ${proposal.startBlock}`);
      console.log(`✅ End block: ${proposal.endBlock}`);
      
    } else {
      console.log("⚠️  Insufficient voting power to create test proposal");
    }
    
    // Test delegate functionality
    console.log("\n🧪 Testing delegate functionality...");
    
    // Check initial delegate (should be zero address)
    const initialDelegate = await governance.delegates(deployer.address);
    console.log(`✅ Initial delegate: ${initialDelegate}`);
    
    // Test delegation to self
    await governance.delegate(deployer.address);
    const newDelegate = await governance.delegates(deployer.address);
    console.log(`✅ Delegated to: ${newDelegate}`);
    
    const delegatedVotes = await governance.delegatedVotes(deployer.address);
    console.log(`✅ Delegated votes: ${formatEther(delegatedVotes)} tokens`);
    
    console.log("\n🎉 Governance infrastructure deployed and verified successfully!");
    
    // Output deployment information
    console.log("\n📝 Deployment Summary:");
    console.log("=====================================");
    console.log(`GOVERNANCE_ADDRESS=${governanceAddress}`);
    console.log(`LDAO_TOKEN_ADDRESS=${ldaoTokenAddress}`);
    console.log(`DEPLOYER_ADDRESS=${deployer.address}`);
    console.log(`NETWORK=${(await deployer.provider.getNetwork()).name}`);
    console.log(`CHAIN_ID=${(await deployer.provider.getNetwork()).chainId}`);
    console.log("=====================================");
    
    console.log("\n📋 Governance Configuration:");
    console.log("=====================================");
    console.log(`Voting Delay: ${votingDelay} blocks`);
    console.log(`Voting Period: ${votingPeriod} blocks`);
    console.log(`Quorum: ${formatEther(quorumVotes)} tokens`);
    console.log(`Proposal Threshold: ${formatEther(proposalThreshold)} tokens`);
    console.log(`Execution Delay: ${executionDelay} seconds`);
    console.log("=====================================");
    
    return {
      governanceAddress,
      ldaoTokenAddress,
      deployer: deployer.address,
      network: (await deployer.provider.getNetwork()).name,
      chainId: (await deployer.provider.getNetwork()).chainId.toString(),
      configuration: {
        votingDelay: votingDelay.toString(),
        votingPeriod: votingPeriod.toString(),
        quorumVotes: quorumVotes.toString(),
        proposalThreshold: proposalThreshold.toString(),
        executionDelay: executionDelay.toString()
      }
    };
    
  } catch (error) {
    console.log("⚠️  Contract verification failed:", error.message);
    throw error;
  }
}

// Allow script to be run directly or imported
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment failed:", error);
      process.exit(1);
    });
}

export { main as deployGovernance };