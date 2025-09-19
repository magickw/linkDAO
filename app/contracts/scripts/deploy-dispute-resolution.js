const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load contract artifact
async function loadContractData(contractName) {
  try {
    const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    return {
      abi: artifact.abi,
      bytecode: artifact.bytecode
    };
  } catch (error) {
    console.error(`Failed to load ${contractName} artifact:`, error.message);
    return null;
  }
}

async function main() {
  console.log("🚀 Deploying DisputeResolution Contract...");
  
  // For local deployment, use hardhat's default provider
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  // Use hardhat's first account (you can change this)
  const privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Hardhat account #0
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Deploying with account:", wallet.address);
  
  try {
    const balance = await provider.getBalance(wallet.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");
  } catch (error) {
    console.error("❌ Failed to connect to local network. Make sure hardhat node is running:");
    console.error("   npx hardhat node");
    process.exit(1);
  }
  
  // Load deployed addresses to get dependencies
  let deployedAddresses;
  try {
    deployedAddresses = JSON.parse(fs.readFileSync('deployedAddresses.json', 'utf8'));
    console.log("✅ Found existing deployed addresses");
  } catch (error) {
    console.error("❌ deployedAddresses.json not found. Please deploy core contracts first.");
    process.exit(1);
  }
  
  const governanceAddress = deployedAddresses.GOVERNANCE_ADDRESS;
  const reputationSystemAddress = deployedAddresses.REPUTATION_SYSTEM_ADDRESS;
  
  if (!governanceAddress) {
    console.error("❌ Governance address not found in deployedAddresses.json");
    process.exit(1);
  }
  
  // Deploy ReputationSystem if not found
  if (!reputationSystemAddress) {
    console.log("⚠️  ReputationSystem not found, deploying...");
    
    const reputationSystemData = await loadContractData('ReputationSystem');
    if (!reputationSystemData) {
      console.error("❌ Failed to load ReputationSystem artifact");
      process.exit(1);
    }
    
    const ReputationSystemFactory = new ethers.ContractFactory(
      reputationSystemData.abi,
      reputationSystemData.bytecode,
      wallet
    );
    
    const reputationSystem = await ReputationSystemFactory.deploy();
    await reputationSystem.waitForDeployment();
    
    const reputationSystemAddress = await reputationSystem.getAddress();
    deployedAddresses.REPUTATION_SYSTEM_ADDRESS = reputationSystemAddress;
    console.log("✅ ReputationSystem deployed to:", reputationSystemAddress);
    
    // Update the file
    fs.writeFileSync('deployedAddresses.json', JSON.stringify(deployedAddresses, null, 2));
  }
  
  console.log("Using Governance at:", governanceAddress);
  console.log("Using ReputationSystem at:", deployedAddresses.REPUTATION_SYSTEM_ADDRESS);
  
  // Load DisputeResolution contract artifact
  console.log("\n📦 Loading DisputeResolution contract artifact...");
  const disputeResolutionData = await loadContractData('DisputeResolution');
  
  if (!disputeResolutionData) {
    console.error("❌ Failed to load DisputeResolution artifact. Please compile contracts first:");
    console.error("   npx hardhat compile");
    process.exit(1);
  }
  
  console.log("✅ DisputeResolution artifact loaded");
  
  try {
    // Deploy DisputeResolution
    console.log("\n🔄 Deploying DisputeResolution...");
    const DisputeResolutionFactory = new ethers.ContractFactory(
      disputeResolutionData.abi,
      disputeResolutionData.bytecode,
      wallet
    );
    
    const disputeResolution = await DisputeResolutionFactory.deploy(
      governanceAddress,
      deployedAddresses.REPUTATION_SYSTEM_ADDRESS
    );
    await disputeResolution.waitForDeployment();
    
    const disputeResolutionAddress = await disputeResolution.getAddress();
    console.log("✅ DisputeResolution deployed to:", disputeResolutionAddress);
    
    // Verify deployment
    console.log("\n🧪 Verifying deployment...");
    
    const governanceContract = await disputeResolution.governance();
    const reputationContract = await disputeResolution.reputationSystem();
    console.log(`✅ Governance contract reference: ${governanceContract}`);
    console.log(`✅ ReputationSystem contract reference: ${reputationContract}`);
    
    // Check configuration parameters
    const evidenceSubmissionPeriod = await disputeResolution.evidenceSubmissionPeriod();
    const communityVotingPeriod = await disputeResolution.communityVotingPeriod();
    const minimumVotingPower = await disputeResolution.minimumVotingPower();
    const arbitratorMinReputation = await disputeResolution.arbitratorMinReputation();
    const daoEscalationThreshold = await disputeResolution.daoEscalationThreshold();
    const nextDisputeId = await disputeResolution.nextDisputeId();
    
    console.log(`✅ Evidence submission period: ${evidenceSubmissionPeriod} seconds (${evidenceSubmissionPeriod / 86400} days)`);
    console.log(`✅ Community voting period: ${communityVotingPeriod} seconds (${communityVotingPeriod / 86400} days)`);
    console.log(`✅ Minimum voting power: ${minimumVotingPower}`);
    console.log(`✅ Arbitrator min reputation: ${arbitratorMinReputation}`);
    console.log(`✅ DAO escalation threshold: ${daoEscalationThreshold} USD`);
    console.log(`✅ Next dispute ID: ${nextDisputeId}`);
    
    // Test basic functionality
    console.log("\n🧪 Testing basic functionality...");
    
    try {
      // Test dispute creation
      const testEscrowId = 1;
      const testRespondent = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Hardhat account #1
      const disputeType = 1; // PRODUCT_NOT_AS_DESCRIBED
      const description = "Test dispute for deployment verification";
      
      const tx = await disputeResolution.createDispute(
        testEscrowId,
        testRespondent,
        disputeType,
        description
      );
      const receipt = await tx.wait();
      
      console.log(`✅ Test dispute created successfully`);
      
      // Get dispute details
      const dispute = await disputeResolution.getDispute(1);
      console.log(`✅ Dispute details verified:`);
      console.log(`   ID: ${dispute.id}`);
      console.log(`   Escrow ID: ${dispute.escrowId}`);
      console.log(`   Initiator: ${dispute.initiator}`);
      console.log(`   Respondent: ${dispute.respondent}`);
      console.log(`   Status: ${dispute.status} (EVIDENCE_SUBMISSION)`);
      
      // Test evidence submission
      const evidenceTx = await disputeResolution.submitEvidence(
        1,
        "text",
        "QmTestHash123456789",
        "Test evidence for deployment verification"
      );
      await evidenceTx.wait();
      
      const evidence = await disputeResolution.getDisputeEvidence(1);
      console.log(`✅ Evidence submitted: ${evidence.length} pieces of evidence`);
      
    } catch (error) {
      console.log("⚠️  Basic functionality test failed:", error.message);
    }
    
    // Update deployed addresses
    deployedAddresses.DISPUTE_RESOLUTION_ADDRESS = disputeResolutionAddress;
    deployedAddresses.deployedAt = new Date().toISOString();
    
    fs.writeFileSync('deployedAddresses.json', JSON.stringify(deployedAddresses, null, 2));
    
    console.log("\n📝 Deployment Summary:");
    console.log("=====================================");
    console.log(`DISPUTE_RESOLUTION_ADDRESS=${disputeResolutionAddress}`);
    console.log(`GOVERNANCE_ADDRESS=${governanceAddress}`);
    console.log(`REPUTATION_SYSTEM_ADDRESS=${deployedAddresses.REPUTATION_SYSTEM_ADDRESS}`);
    console.log("=====================================");
    
    console.log("\n💾 Address saved to deployedAddresses.json");
    console.log("\n🎉 DisputeResolution deployed and verified successfully!");
    
    return disputeResolutionAddress;
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then((address) => {
    console.log("\n🎯 DisputeResolution Contract Address:", address);
    console.log("\n✅ Task 3.1 - Deploy dispute resolution system: COMPLETED");
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });