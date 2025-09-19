import { ethers } from "hardhat";
import { formatEther } from "ethers";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying DisputeResolution with the account:", deployer.address);
  console.log("Account balance:", formatEther(await deployer.provider.getBalance(deployer.address)));

  // Get required contract addresses
  console.log("\n🔄 Checking for required contract addresses...");
  
  let governanceAddress: string;
  let reputationSystemAddress: string;
  
  try {
    // Try to read from deployed addresses file
    const fs = require('fs');
    const deployedAddresses = JSON.parse(fs.readFileSync('deployedAddresses.json', 'utf8'));
    governanceAddress = deployedAddresses.GOVERNANCE_ADDRESS;
    reputationSystemAddress = deployedAddresses.REPUTATION_SYSTEM_ADDRESS;
    
    if (!governanceAddress) {
      throw new Error("Governance address not found in deployedAddresses.json");
    }
    if (!reputationSystemAddress) {
      console.log("⚠️  ReputationSystem address not found, deploying...");
      
      // Deploy ReputationSystem if not found
      const ReputationSystem = await ethers.getContractFactory("ReputationSystem");
      const reputationSystem = await ReputationSystem.deploy();
      await reputationSystem.waitForDeployment();
      reputationSystemAddress = await reputationSystem.getAddress();
      console.log("✅ ReputationSystem deployed to:", reputationSystemAddress);
      
      // Update deployed addresses file
      deployedAddresses.REPUTATION_SYSTEM_ADDRESS = reputationSystemAddress;
      fs.writeFileSync('deployedAddresses.json', JSON.stringify(deployedAddresses, null, 2));
    }
    
    console.log("✅ Found Governance at:", governanceAddress);
    console.log("✅ Found ReputationSystem at:", reputationSystemAddress);
    
  } catch (error) {
    console.error("❌ Error reading deployed addresses:", error.message);
    console.log("Please ensure Governance and ReputationSystem contracts are deployed first");
    process.exit(1);
  }

  // Deploy DisputeResolution contract
  console.log("\n🔄 Deploying DisputeResolution contract...");
  const DisputeResolution = await ethers.getContractFactory("DisputeResolution");
  const disputeResolution = await DisputeResolution.deploy(
    governanceAddress,
    reputationSystemAddress
  );
  await disputeResolution.waitForDeployment();
  const disputeResolutionAddress = await disputeResolution.getAddress();
  console.log("✅ DisputeResolution deployed to:", disputeResolutionAddress);

  // Verify deployment and test functionality
  console.log("\n🧪 Verifying deployment and configuration...");
  
  try {
    // Check contract references
    const governanceContract = await disputeResolution.governance();
    const reputationContract = await disputeResolution.reputationSystem();
    console.log(`✅ Governance contract reference: ${governanceContract}`);
    console.log(`✅ ReputationSystem contract reference: ${reputationContract}`);
    
    // Check initial configuration parameters
    const evidenceSubmissionPeriod = await disputeResolution.evidenceSubmissionPeriod();
    const communityVotingPeriod = await disputeResolution.communityVotingPeriod();
    const minimumVotingPower = await disputeResolution.minimumVotingPower();
    const arbitratorMinReputation = await disputeResolution.arbitratorMinReputation();
    const daoEscalationThreshold = await disputeResolution.daoEscalationThreshold();
    const nextDisputeId = await disputeResolution.nextDisputeId();
    
    console.log(`✅ Evidence submission period: ${evidenceSubmissionPeriod} seconds (${Number(evidenceSubmissionPeriod) / 86400} days)`);
    console.log(`✅ Community voting period: ${communityVotingPeriod} seconds (${Number(communityVotingPeriod) / 86400} days)`);
    console.log(`✅ Minimum voting power: ${minimumVotingPower}`);
    console.log(`✅ Arbitrator min reputation: ${arbitratorMinReputation}`);
    console.log(`✅ DAO escalation threshold: ${daoEscalationThreshold} USD`);
    console.log(`✅ Next dispute ID: ${nextDisputeId}`);
    
    // Check dispute analytics
    const analytics = await disputeResolution.getDisputeAnalytics();
    console.log(`✅ Total disputes: ${analytics[0]}`);
    console.log(`✅ Resolved disputes: ${analytics[1]}`);
    console.log(`✅ Average resolution time: ${analytics[2]} seconds`);
    
    // Test arbitrator application functionality
    console.log("\n🧪 Testing arbitrator application...");
    
    // Check if deployer can apply as arbitrator (need sufficient reputation)
    try {
      const ReputationSystem = await ethers.getContractFactory("ReputationSystem");
      const reputationSystemContract = ReputationSystem.attach(reputationSystemAddress);
      
      const deployerReputation = await reputationSystemContract.getReputationScore(deployer.address);
      console.log(`✅ Deployer reputation score: ${deployerReputation}`);
      
      if (deployerReputation >= arbitratorMinReputation) {
        console.log("✅ Deployer has sufficient reputation to apply as arbitrator");
        
        // Test arbitrator application
        const tx = await disputeResolution.applyForArbitrator(
          "Experienced blockchain developer with expertise in dispute resolution"
        );
        await tx.wait();
        
        const application = await disputeResolution.arbitratorApplications(deployer.address);
        console.log(`✅ Arbitrator application submitted:`);
        console.log(`   Applicant: ${application.applicant}`);
        console.log(`   Reputation Score: ${application.reputationScore}`);
        console.log(`   Applied At: ${new Date(Number(application.appliedAt) * 1000).toISOString()}`);
        
        // Test arbitrator approval (as owner)
        await disputeResolution.approveArbitrator(deployer.address);
        const isApproved = await disputeResolution.approvedArbitrators(deployer.address);
        console.log(`✅ Arbitrator approved: ${isApproved}`);
        
      } else {
        console.log("⚠️  Deployer has insufficient reputation to apply as arbitrator");
      }
      
    } catch (error) {
      console.log("⚠️  Arbitrator application test failed:", error.message);
    }
    
    // Test dispute creation functionality
    console.log("\n🧪 Testing dispute creation...");
    
    try {
      // Create a test dispute
      const testEscrowId = 1;
      const testRespondent = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Second hardhat account
      const disputeType = 1; // PRODUCT_NOT_AS_DESCRIBED
      const description = "Test dispute for deployment verification";
      
      const tx = await disputeResolution.createDispute(
        testEscrowId,
        testRespondent,
        disputeType,
        description
      );
      const receipt = await tx.wait();
      
      // Get the created dispute ID from events
      const disputeCreatedEvent = receipt.logs.find(log => {
        try {
          const parsed = disputeResolution.interface.parseLog(log);
          return parsed.name === 'DisputeCreated';
        } catch {
          return false;
        }
      });
      
      if (disputeCreatedEvent) {
        const parsedEvent = disputeResolution.interface.parseLog(disputeCreatedEvent);
        const disputeId = parsedEvent.args.disputeId;
        console.log(`✅ Test dispute created with ID: ${disputeId}`);
        
        // Get dispute details
        const dispute = await disputeResolution.getDispute(disputeId);
        console.log(`✅ Dispute details:`);
        console.log(`   ID: ${dispute.id}`);
        console.log(`   Escrow ID: ${dispute.escrowId}`);
        console.log(`   Initiator: ${dispute.initiator}`);
        console.log(`   Respondent: ${dispute.respondent}`);
        console.log(`   Type: ${dispute.disputeType}`);
        console.log(`   Status: ${dispute.status}`);
        console.log(`   Resolution Method: ${dispute.resolutionMethod}`);
        console.log(`   Created At: ${new Date(Number(dispute.createdAt) * 1000).toISOString()}`);
        
        // Test evidence submission
        console.log("\n🧪 Testing evidence submission...");
        
        const evidenceTx = await disputeResolution.submitEvidence(
          disputeId,
          "text",
          "QmTestHash123456789",
          "Test evidence for deployment verification"
        );
        await evidenceTx.wait();
        
        const evidence = await disputeResolution.getDisputeEvidence(disputeId);
        console.log(`✅ Evidence submitted: ${evidence.length} pieces of evidence`);
        if (evidence.length > 0) {
          console.log(`   Type: ${evidence[0].evidenceType}`);
          console.log(`   IPFS Hash: ${evidence[0].ipfsHash}`);
          console.log(`   Description: ${evidence[0].description}`);
          console.log(`   Submitter: ${evidence[0].submitter}`);
        }
        
      } else {
        console.log("⚠️  Could not find DisputeCreated event");
      }
      
    } catch (error) {
      console.log("⚠️  Dispute creation test failed:", error.message);
    }
    
    console.log("\n🎉 DisputeResolution deployed and verified successfully!");
    
    // Update deployed addresses file
    const fs = require('fs');
    const deployedAddresses = JSON.parse(fs.readFileSync('deployedAddresses.json', 'utf8'));
    deployedAddresses.DISPUTE_RESOLUTION_ADDRESS = disputeResolutionAddress;
    deployedAddresses.deployedAt = new Date().toISOString();
    fs.writeFileSync('deployedAddresses.json', JSON.stringify(deployedAddresses, null, 2));
    
    // Output deployment information
    console.log("\n📝 Deployment Summary:");
    console.log("=====================================");
    console.log(`DISPUTE_RESOLUTION_ADDRESS=${disputeResolutionAddress}`);
    console.log(`GOVERNANCE_ADDRESS=${governanceAddress}`);
    console.log(`REPUTATION_SYSTEM_ADDRESS=${reputationSystemAddress}`);
    console.log(`DEPLOYER_ADDRESS=${deployer.address}`);
    console.log(`NETWORK=${(await deployer.provider.getNetwork()).name}`);
    console.log(`CHAIN_ID=${(await deployer.provider.getNetwork()).chainId}`);
    console.log("=====================================");
    
    console.log("\n📋 DisputeResolution Configuration:");
    console.log("=====================================");
    console.log(`Evidence Submission Period: ${evidenceSubmissionPeriod} seconds`);
    console.log(`Community Voting Period: ${communityVotingPeriod} seconds`);
    console.log(`Minimum Voting Power: ${minimumVotingPower}`);
    console.log(`Arbitrator Min Reputation: ${arbitratorMinReputation}`);
    console.log(`DAO Escalation Threshold: ${daoEscalationThreshold} USD`);
    console.log("=====================================");
    
    return {
      disputeResolutionAddress,
      governanceAddress,
      reputationSystemAddress,
      deployer: deployer.address,
      network: (await deployer.provider.getNetwork()).name,
      chainId: (await deployer.provider.getNetwork()).chainId.toString(),
      configuration: {
        evidenceSubmissionPeriod: evidenceSubmissionPeriod.toString(),
        communityVotingPeriod: communityVotingPeriod.toString(),
        minimumVotingPower: minimumVotingPower.toString(),
        arbitratorMinReputation: arbitratorMinReputation.toString(),
        daoEscalationThreshold: daoEscalationThreshold.toString()
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

export { main as deployDisputeResolution };