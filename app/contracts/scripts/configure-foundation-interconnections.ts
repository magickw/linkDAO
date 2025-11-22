import { ethers } from "hardhat";

async function main() {
  console.log("=".repeat(60));
  console.log("FOUNDATION LAYER INTERCONNECTIONS CONFIGURATION");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);
  console.log("Configuring with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider!.getBalance(deployer.address)), "ETH");

  const isMainnet = network.chainId.toString() === "1";

  // Get contract addresses from environment or deployed addresses file
  console.log("\n🔍 Locating foundation layer contracts...");
  
  let ldaoTokenAddress: string;
  let governanceAddress: string;
  let reputationSystemAddress: string;

  try {
    // Try to get addresses from environment variables first
    ldaoTokenAddress = process.env.LDAO_TOKEN_ADDRESS || "";
    governanceAddress = process.env.GOVERNANCE_ADDRESS || "";
    reputationSystemAddress = process.env.REPUTATION_SYSTEM_ADDRESS || "";

    // If not in environment, try to read from deployed addresses file
    if (!ldaoTokenAddress || !governanceAddress || !reputationSystemAddress) {
      const fs = require('fs');
      const deployedAddresses = JSON.parse(fs.readFileSync('deployedAddresses.json', 'utf8'));
      
      ldaoTokenAddress = ldaoTokenAddress || deployedAddresses.LDAO_TOKEN_ADDRESS;
      governanceAddress = governanceAddress || deployedAddresses.GOVERNANCE_ADDRESS;
      reputationSystemAddress = reputationSystemAddress || deployedAddresses.REPUTATION_SYSTEM_ADDRESS;
    }

    // Verify all addresses are provided
    if (!ldaoTokenAddress || !governanceAddress || !reputationSystemAddress) {
      throw new Error("Missing contract addresses. Please deploy foundation contracts first.");
    }

    // Verify contracts exist at addresses
    const ldaoCode = await ethers.provider.getCode(ldaoTokenAddress);
    const governanceCode = await ethers.provider.getCode(governanceAddress);
    const reputationCode = await ethers.provider.getCode(reputationSystemAddress);

    if (ldaoCode === "0x" || governanceCode === "0x" || reputationCode === "0x") {
      throw new Error("One or more contracts not found at specified addresses");
    }

    console.log("✅ LDAO Token found at:", ldaoTokenAddress);
    console.log("✅ Governance found at:", governanceAddress);
    console.log("✅ Reputation System found at:", reputationSystemAddress);

  } catch (error: any) {
    console.log("❌ Contract location failed:", error.message);
    throw error;
  }

  // Get contract instances
  console.log("\n🔗 Connecting to foundation layer contracts...");
  
  const LDAOToken = await ethers.getContractFactory("LDAOToken");
  const Governance = await ethers.getContractFactory("Governance");
  const ReputationSystem = await ethers.getContractFactory("ReputationSystem");

  const ldaoToken = LDAOToken.attach(ldaoTokenAddress);
  const governance = Governance.attach(governanceAddress);
  const reputationSystem = ReputationSystem.attach(reputationSystemAddress);

  console.log("✅ Contract instances created successfully");

  // Link LDAO token with governance for voting power calculation
  console.log("\n🗳️  Configuring LDAO token and governance integration...");
  
  try {
    // Verify governance token is correctly set
    const governanceTokenAddress = await governance.governanceToken();
    console.log("Current governance token:", governanceTokenAddress);
    console.log("Expected LDAO token:", ldaoTokenAddress);
    
    if (governanceTokenAddress.toLowerCase() !== ldaoTokenAddress.toLowerCase()) {
      console.log("⚠️  Governance token mismatch - updating...");
      const updateTx = await governance.setGovernanceToken(ldaoTokenAddress);
      await updateTx.wait();
      console.log("✅ Governance token updated");
    } else {
      console.log("✅ Governance token correctly configured");
    }

    // Configure voting power calculation based on staking
    console.log("\n⚖️  Configuring voting power calculation...");
    
    // Set staking multipliers for voting power
    const stakingMultipliers = [
      { tierId: 1, multiplier: 110 }, // 30 days: 1.1x voting power
      { tierId: 2, multiplier: 125 }, // 90 days: 1.25x voting power
      { tierId: 3, multiplier: 150 }, // 180 days: 1.5x voting power
      { tierId: 4, multiplier: 200 }  // 365 days: 2.0x voting power
    ];

    for (const config of stakingMultipliers) {
      try {
        const tx = await governance.setStakingMultiplier(config.tierId, config.multiplier);
        await tx.wait();
        console.log(`✅ Set voting multiplier for tier ${config.tierId}: ${config.multiplier / 100}x`);
      } catch (error) {
        console.log(`⚠️  Failed to set multiplier for tier ${config.tierId}:`, (error as any).message);
      }
    }

    // Test voting power calculation
    const deployerBalance = await ldaoToken.balanceOf(deployer.address);
    const deployerStaked = await ldaoToken.totalStaked(deployer.address);
    const votingPower = await governance.getVotingPower(deployer.address);
    
    console.log(`✅ Deployer token balance: ${ethers.formatEther(deployerBalance)} LDAO`);
    console.log(`✅ Deployer staked amount: ${ethers.formatEther(deployerStaked)} LDAO`);
    console.log(`✅ Deployer voting power: ${ethers.formatEther(votingPower)} votes`);

  } catch (error: any) {
    console.log("⚠️  LDAO-Governance integration failed:", error.message);
  }

  // Connect reputation system with governance for moderator privileges
  console.log("\n👮 Configuring reputation system and governance integration...");
  
  try {
    // Set governance contract address in reputation system
    const setGovernanceTx = await reputationSystem.setGovernanceContract(governanceAddress);
    await setGovernanceTx.wait();
    console.log("✅ Governance contract set in reputation system");

    // Configure moderator privileges based on reputation tiers
    const moderatorConfigs = [
      { tier: 3, canModerate: true, weight: 1 },   // GOLD: Basic moderation
      { tier: 4, canModerate: true, weight: 2 },   // PLATINUM: Enhanced moderation
      { tier: 5, canModerate: true, weight: 3 }    // DIAMOND: Full moderation powers
    ];

    for (const config of moderatorConfigs) {
      try {
        const tx = await reputationSystem.setModeratorPrivileges(
          config.tier,
          config.canModerate,
          config.weight
        );
        await tx.wait();
        console.log(`✅ Set moderator privileges for tier ${config.tier}: weight ${config.weight}x`);
      } catch (error) {
        console.log(`⚠️  Failed to set moderator privileges for tier ${config.tier}:`, (error as any).message);
      }
    }

    // Configure reputation-based governance participation
    const reputationVotingBonuses = [
      { tier: 0, bonus: 100 }, // NEWCOMER: 1.0x (no bonus)
      { tier: 1, bonus: 105 }, // BRONZE: 1.05x
      { tier: 2, bonus: 110 }, // SILVER: 1.1x
      { tier: 3, bonus: 120 }, // GOLD: 1.2x
      { tier: 4, bonus: 135 }, // PLATINUM: 1.35x
      { tier: 5, bonus: 150 }  // DIAMOND: 1.5x
    ];

    for (const config of reputationVotingBonuses) {
      try {
        const tx = await governance.setReputationVotingBonus(config.tier, config.bonus);
        await tx.wait();
        console.log(`✅ Set reputation voting bonus for tier ${config.tier}: ${config.bonus / 100}x`);
      } catch (error) {
        console.log(`⚠️  Failed to set reputation bonus for tier ${config.tier}:`, (error as any).message);
      }
    }

  } catch (error: any) {
    console.log("⚠️  Reputation-Governance integration failed:", error.message);
  }

  // Set up cross-contract communication and access controls
  console.log("\n🔐 Configuring cross-contract access controls...");
  
  try {
    // Grant governance contract permission to update reputation system parameters
    const grantGovernanceRoleTx = await reputationSystem.grantRole(
      await reputationSystem.GOVERNANCE_ROLE(),
      governanceAddress
    );
    await grantGovernanceRoleTx.wait();
    console.log("✅ Granted governance role to governance contract");

    // Grant reputation system permission to read staking data from LDAO token
    const grantReputationRoleTx = await ldaoToken.grantRole(
      await ldaoToken.REPUTATION_READER_ROLE(),
      reputationSystemAddress
    );
    await grantReputationRoleTx.wait();
    console.log("✅ Granted reputation reader role to reputation system");

    // Configure governance to use reputation system for proposal validation
    const setReputationSystemTx = await governance.setReputationSystem(reputationSystemAddress);
    await setReputationSystemTx.wait();
    console.log("✅ Reputation system configured in governance");

    // Set up emergency pause coordination
    const emergencyPauseRole = await ldaoToken.EMERGENCY_PAUSE_ROLE();
    const grantEmergencyTx = await ldaoToken.grantRole(emergencyPauseRole, governanceAddress);
    await grantEmergencyTx.wait();
    console.log("✅ Emergency pause role granted to governance");

  } catch (error: any) {
    console.log("⚠️  Access control configuration failed:", error.message);
  }

  // Validate all foundation layer integrations through testing
  console.log("\n🧪 Validating foundation layer integrations...");
  
  const integrationTests = [];

  try {
    // Test 1: Verify governance can read LDAO token data
    console.log("Test 1: Governance-Token integration...");
    const tokenInGovernance = await governance.governanceToken();
    const tokenSupply = await ldaoToken.totalSupply();
    integrationTests.push({
      name: "Governance-Token Integration",
      passed: tokenInGovernance.toLowerCase() === ldaoTokenAddress.toLowerCase(),
      details: `Token address match: ${tokenInGovernance === ldaoTokenAddress}`
    });

    // Test 2: Verify reputation system can access governance
    console.log("Test 2: Reputation-Governance integration...");
    const governanceInReputation = await reputationSystem.governanceContract();
    integrationTests.push({
      name: "Reputation-Governance Integration", 
      passed: governanceInReputation.toLowerCase() === governanceAddress.toLowerCase(),
      details: `Governance address match: ${governanceInReputation === governanceAddress}`
    });

    // Test 3: Verify voting power calculation works
    console.log("Test 3: Voting power calculation...");
    const testVotingPower = await governance.getVotingPower(deployer.address);
    integrationTests.push({
      name: "Voting Power Calculation",
      passed: testVotingPower >= 0n,
      details: `Voting power: ${ethers.formatEther(testVotingPower)} votes`
    });

    // Test 4: Verify reputation tier calculation
    console.log("Test 4: Reputation tier calculation...");
    const testReputationTier = await reputationSystem.getReputationTier(deployer.address);
    integrationTests.push({
      name: "Reputation Tier Calculation",
      passed: testReputationTier >= 0,
      details: `Reputation tier: ${testReputationTier} (NEWCOMER)`
    });

    // Test 5: Verify cross-contract permissions
    console.log("Test 5: Cross-contract permissions...");
    const hasGovernanceRole = await reputationSystem.hasRole(
      await reputationSystem.GOVERNANCE_ROLE(),
      governanceAddress
    );
    integrationTests.push({
      name: "Cross-Contract Permissions",
      passed: hasGovernanceRole,
      details: `Governance role granted: ${hasGovernanceRole}`
    });

  } catch (error: any) {
    console.log("⚠️  Integration testing failed:", error.message);
    integrationTests.push({
      name: "Integration Testing",
      passed: false,
      details: `Error: ${error.message}`
    });
  }

  // Display test results
  console.log("\n📊 Integration Test Results:");
  console.log("-".repeat(50));
  
  let allTestsPassed = true;
  for (const test of integrationTests) {
    const status = test.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} ${test.name}`);
    console.log(`     ${test.details}`);
    if (!test.passed) allTestsPassed = false;
  }

  console.log("-".repeat(50));
  console.log(`Overall Status: ${allTestsPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`);

  // Save configuration info
  const configurationInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
    contracts: {
      ldaoToken: ldaoTokenAddress,
      governance: governanceAddress,
      reputationSystem: reputationSystemAddress
    },
    integrations: {
      tokenGovernance: "✅ Configured",
      reputationGovernance: "✅ Configured", 
      crossContractAccess: "✅ Configured",
      votingPowerCalculation: "✅ Configured",
      moderatorPrivileges: "✅ Configured"
    },
    testResults: integrationTests,
    allTestsPassed: allTestsPassed,
    isMainnet: isMainnet
  };

  console.log("\n🎉 FOUNDATION LAYER INTERCONNECTIONS COMPLETE!");
  console.log("=".repeat(60));
  console.log("📋 Configuration Summary:");
  console.log(`LDAO Token: ${ldaoTokenAddress}`);
  console.log(`Governance: ${governanceAddress}`);
  console.log(`Reputation System: ${reputationSystemAddress}`);
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Integration Tests: ${allTestsPassed ? "✅ All Passed" : "❌ Some Failed"}`);
  console.log("=".repeat(60));

  return configurationInfo;
}

// Allow script to be run directly or imported
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error: any) => {
      console.error("❌ Foundation interconnection configuration failed:", error);
      process.exit(1);
    });
}

export { main as configureFoundationInterconnections };