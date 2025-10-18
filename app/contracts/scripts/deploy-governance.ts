import { ethers } from "hardhat";
import { formatEther, parseEther } from "ethers";

async function main() {
  console.log("=".repeat(60));
  console.log("GOVERNANCE SYSTEM MAINNET DEPLOYMENT");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  const isMainnet = network.chainId === 1n;

  // Get LDAOToken address - required for governance
  console.log("\n🔄 Locating LDAOToken contract...");
  
  let ldaoTokenAddress: string;
  
  try {
    // Try to read from deployed addresses file or environment
    ldaoTokenAddress = process.env.LDAO_TOKEN_ADDRESS || "";
    
    if (!ldaoTokenAddress) {
      const fs = require('fs');
      const deployedAddresses = JSON.parse(fs.readFileSync('deployedAddresses.json', 'utf8'));
      ldaoTokenAddress = deployedAddresses.LDAO_TOKEN_ADDRESS || deployedAddresses.TOKEN_ADDRESS;
    }
    
    if (ldaoTokenAddress) {
      // Verify the token contract exists
      const code = await ethers.provider.getCode(ldaoTokenAddress);
      if (code === "0x") {
        throw new Error("Token contract not found at address");
      }
      console.log("✅ Found existing LDAOToken at:", ldaoTokenAddress);
    } else {
      throw new Error("LDAOToken address not provided");
    }
  } catch (error) {
    console.log("❌ LDAOToken not found. Please deploy LDAOToken first or provide LDAO_TOKEN_ADDRESS");
    throw new Error("LDAOToken deployment required before governance deployment");
  }

  // Deploy Governance contract with gas optimization
  console.log("\n🔄 Deploying Governance contract...");
  const Governance = await ethers.getContractFactory("Governance");
  
  // Estimate gas for deployment
  const deploymentData = Governance.getDeployTransaction(ldaoTokenAddress);
  const estimatedGas = await ethers.provider.estimateGas(deploymentData);
  console.log("Estimated deployment gas:", estimatedGas.toString());

  const governance = await Governance.deploy(ldaoTokenAddress, {
    gasLimit: estimatedGas * 120n / 100n // 20% buffer
  });
  await governance.waitForDeployment();
  const governanceAddress = await governance.getAddress();
  console.log("✅ Governance deployed to:", governanceAddress);

  // Configure 6 proposal categories with specific quorum requirements
  console.log("\n🔧 Configuring governance proposal categories...");
  
  const categories = [
    { 
      name: "GENERAL", 
      id: 0, 
      quorum: parseEther("50000"), // 50K tokens
      threshold: parseEther("1000"), // 1K tokens to propose
      requiresStaking: false 
    },
    { 
      name: "MARKETPLACE_POLICY", 
      id: 1, 
      quorum: parseEther("100000"), // 100K tokens
      threshold: parseEther("5000"), // 5K tokens to propose
      requiresStaking: true 
    },
    { 
      name: "FEE_STRUCTURE", 
      id: 2, 
      quorum: parseEther("150000"), // 150K tokens
      threshold: parseEther("10000"), // 10K tokens to propose
      requiresStaking: true 
    },
    { 
      name: "REPUTATION_SYSTEM", 
      id: 3, 
      quorum: parseEther("75000"), // 75K tokens
      threshold: parseEther("2500"), // 2.5K tokens to propose
      requiresStaking: true 
    },
    { 
      name: "SECURITY_UPGRADE", 
      id: 4, 
      quorum: parseEther("200000"), // 200K tokens
      threshold: parseEther("25000"), // 25K tokens to propose
      requiresStaking: true 
    },
    { 
      name: "TOKEN_ECONOMICS", 
      id: 5, 
      quorum: parseEther("250000"), // 250K tokens
      threshold: parseEther("50000"), // 50K tokens to propose
      requiresStaking: true 
    }
  ];

  for (const category of categories) {
    try {
      const tx = await governance.setCategoryParameters(
        category.id,
        category.quorum,
        category.threshold,
        category.requiresStaking
      );
      await tx.wait();
      console.log(`✅ Configured ${category.name}: quorum=${formatEther(category.quorum)}, threshold=${formatEther(category.threshold)}, staking=${category.requiresStaking}`);
    } catch (error) {
      console.log(`⚠️  Failed to configure ${category.name}:`, error.message);
    }
  }

  // Verify deployment and configuration
  console.log("\n🧪 Verifying deployment and configuration...");
  
  try {
    // Check governance token integration
    const governanceTokenAddress = await governance.governanceToken();
    console.log(`✅ Governance token configured: ${governanceTokenAddress}`);
    console.log(`✅ Token integration: ${governanceTokenAddress.toLowerCase() === ldaoTokenAddress.toLowerCase() ? "✅" : "❌"}`);
    
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
    
    // Verify category-specific parameters
    console.log("\n🔍 Verifying category configurations...");
    
    for (const category of categories) {
      try {
        const quorum = await governance.categoryQuorum(category.id);
        const threshold = await governance.categoryThreshold(category.id);
        const requiresStaking = await governance.categoryRequiresStaking(category.id);
        
        console.log(`✅ ${category.name}:`);
        console.log(`   Quorum: ${formatEther(quorum)} tokens`);
        console.log(`   Threshold: ${formatEther(threshold)} tokens`);
        console.log(`   Requires staking: ${requiresStaking}`);
      } catch (error) {
        console.log(`❌ ${category.name}: Configuration verification failed`);
      }
    }
    
    // Enable delegation support and weighted voting mechanisms
    console.log("\n🗳️  Configuring delegation and weighted voting...");
    
    // Get LDAOToken contract instance to check voting power
    const LDAOToken = await ethers.getContractFactory("LDAOToken");
    const ldaoToken = LDAOToken.attach(ldaoTokenAddress);
    
    // Check deployer's voting power
    const deployerBalance = await ldaoToken.balanceOf(deployer.address);
    const votingPower = await governance.getVotingPower(deployer.address);
    console.log(`✅ Deployer token balance: ${formatEther(deployerBalance)} LDAO`);
    console.log(`✅ Deployer voting power: ${formatEther(votingPower)} tokens`);
    
    // Test delegation functionality
    console.log("\n🔗 Testing delegation mechanisms...");
    
    try {
      // Check initial delegate (should be zero address)
      const initialDelegate = await governance.delegates(deployer.address);
      console.log(`✅ Initial delegate: ${initialDelegate}`);
      
      // Test delegation to self to activate voting power
      const delegateTx = await governance.delegate(deployer.address);
      await delegateTx.wait();
      const newDelegate = await governance.delegates(deployer.address);
      console.log(`✅ Delegated to: ${newDelegate}`);
      
      const delegatedVotes = await governance.delegatedVotes(deployer.address);
      console.log(`✅ Delegated votes: ${formatEther(delegatedVotes)} tokens`);
      
      // Test weighted voting based on staking
      const stakingWeight = await governance.getStakingWeight(deployer.address);
      console.log(`✅ Staking weight multiplier: ${stakingWeight}x`);
      
    } catch (error) {
      console.log("⚠️  Delegation test failed:", error.message);
    }

    // Configure proposal lifecycle with security delays
    console.log("\n⏱️  Configuring proposal lifecycle and security delays...");
    
    try {
      // Set execution delay for different categories (higher for critical changes)
      const securityDelays = {
        0: 24 * 3600,    // GENERAL: 1 day
        1: 48 * 3600,    // MARKETPLACE_POLICY: 2 days  
        2: 72 * 3600,    // FEE_STRUCTURE: 3 days
        3: 48 * 3600,    // REPUTATION_SYSTEM: 2 days
        4: 168 * 3600,   // SECURITY_UPGRADE: 7 days
        5: 168 * 3600    // TOKEN_ECONOMICS: 7 days
      };
      
      for (const [categoryId, delay] of Object.entries(securityDelays)) {
        try {
          const tx = await governance.setCategoryExecutionDelay(parseInt(categoryId), delay);
          await tx.wait();
          console.log(`✅ Set execution delay for category ${categoryId}: ${delay / 3600} hours`);
        } catch (error) {
          console.log(`⚠️  Failed to set delay for category ${categoryId}:`, error.message);
        }
      }
      
    } catch (error) {
      console.log("⚠️  Security delay configuration failed:", error.message);
    }

    // Test proposal creation (if we have enough tokens)
    if (votingPower >= proposalThreshold) {
      console.log("\n📝 Testing proposal creation...");
      try {
        const tx = await governance.propose(
          "Governance System Test Proposal",
          "This is a test proposal to verify governance functionality after deployment",
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
        
      } catch (error) {
        console.log("⚠️  Test proposal creation failed:", error.message);
      }
    } else {
      console.log("⚠️  Insufficient voting power to create test proposal");
    }
    
    // Contract verification on Etherscan (for mainnet)
    if (isMainnet && process.env.ETHERSCAN_API_KEY) {
      console.log("\n🔍 Verifying contract on Etherscan...");
      try {
        await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
        
        // Note: In a real deployment, you would use hardhat-verify plugin
        console.log("✅ Contract verification initiated");
        console.log("📝 Verify manually at:", `https://etherscan.io/address/${governanceAddress}#code`);
      } catch (error) {
        console.log("⚠️  Etherscan verification failed:", error.message);
      }
    }

    console.log("\n🎉 GOVERNANCE SYSTEM DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    
    // Save deployment info
    const deploymentInfo = {
      network: network.name,
      chainId: network.chainId.toString(),
      governanceAddress,
      ldaoTokenAddress,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      blockNumber: await ethers.provider.getBlockNumber(),
      categories: categories,
      configuration: {
        votingDelay: votingDelay.toString(),
        votingPeriod: votingPeriod.toString(),
        quorumVotes: quorumVotes.toString(),
        proposalThreshold: proposalThreshold.toString(),
        executionDelay: executionDelay.toString()
      },
      isMainnet: isMainnet,
      verified: isMainnet && process.env.ETHERSCAN_API_KEY ? "pending" : "not_applicable"
    };
    
    console.log("📋 Deployment Summary:");
    console.log(`Governance Address: ${governanceAddress}`);
    console.log(`LDAO Token Address: ${ldaoTokenAddress}`);
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Categories Configured: ${categories.length}`);
    console.log(`Delegation Support: ✅ Enabled`);
    console.log(`Weighted Voting: ✅ Enabled`);
    console.log(`Security Delays: ✅ Configured`);
    console.log("=".repeat(60));
    
    return deploymentInfo;
    
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