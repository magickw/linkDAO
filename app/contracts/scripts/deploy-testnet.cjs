const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Starting LinkDAO Contract Deployment to", network.name);
  
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  const balance = await deployer.getBalance();
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Check if we have enough balance for deployment
  if (balance.lt(ethers.parseEther("0.01"))) {
    console.log("⚠️  Warning: Low balance. You might need more ETH for deployment.");
  }

  // Deploy contracts in the correct order (dependencies first)
  
  // 1. Deploy ProfileRegistry (no dependencies)
  console.log("\n🔄 Deploying ProfileRegistry...");
  const ProfileRegistry = await ethers.getContractFactory("ProfileRegistry");
  const profileRegistry = await ProfileRegistry.deploy();
  await profileRegistry.deployed();
  console.log("✅ ProfileRegistry deployed to:", profileRegistry.address);

  // 2. Deploy FollowModule (no dependencies)
  console.log("\n🔄 Deploying FollowModule...");
  const FollowModule = await ethers.getContractFactory("FollowModule");
  const followModule = await FollowModule.deploy();
  await followModule.deployed();
  console.log("✅ FollowModule deployed to:", followModule.address);

  // 3. Deploy LDAOToken (needs treasury address - using deployer)
  console.log("\n🔄 Deploying LDAOToken...");
  const LDAOToken = await ethers.getContractFactory("LDAOToken");
  const ldaoToken = await LDAOToken.deploy(deployer.address); // Treasury address
  await ldaoToken.deployed();
  console.log("✅ LDAOToken deployed to:", ldaoToken.address);

  // 4. Deploy PaymentRouter (needs fee basis points and fee collector)
  console.log("\n🔄 Deploying PaymentRouter...");
  const PaymentRouter = await ethers.getContractFactory("PaymentRouter");
  const paymentRouter = await PaymentRouter.deploy(
    250, // 2.5% fee (250 basis points)
    deployer.address // Fee collector address
  );
  await paymentRouter.deployed();
  console.log("✅ PaymentRouter deployed to:", paymentRouter.address);

  // 5. Deploy Governance (needs LDAOToken address)
  console.log("\n🔄 Deploying Governance...");
  const Governance = await ethers.getContractFactory("Governance");
  const governance = await Governance.deploy(ldaoToken.address);
  await governance.deployed();
  console.log("✅ Governance deployed to:", governance.address);

  // Post-deployment configuration
  console.log("\n🔧 Configuring contracts...");
  
  // Add LDAO token as supported token in PaymentRouter
  try {
    const tx = await paymentRouter.setTokenSupported(ldaoToken.address, true);
    await tx.wait();
    console.log("✅ LDAOToken added as supported token in PaymentRouter");
  } catch (error) {
    console.log("⚠️  Failed to configure PaymentRouter:", error.message);
  }

  // Save addresses to JSON file
  const addresses = {
    PROFILE_REGISTRY_ADDRESS: profileRegistry.address,
    FOLLOW_MODULE_ADDRESS: followModule.address,
    PAYMENT_ROUTER_ADDRESS: paymentRouter.address,
    GOVERNANCE_ADDRESS: governance.address,
    TOKEN_ADDRESS: ldaoToken.address,
    
    // Additional contract addresses for reference
    deployer: deployer.address,
    network: network.name,
    chainId: network.config.chainId.toString(),
    deployedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(
    `deployedAddresses-${network.name}.json`,
    JSON.stringify(addresses, null, 2)
  );
  
  console.log("\n📝 Deployment Summary:");
  console.log("=====================================");
  console.log(`Network: ${network.name} (Chain ID: ${network.config.chainId})`);
  console.log(`PROFILE_REGISTRY_ADDRESS=${profileRegistry.address}`);
  console.log(`FOLLOW_MODULE_ADDRESS=${followModule.address}`);
  console.log(`PAYMENT_ROUTER_ADDRESS=${paymentRouter.address}`);
  console.log(`GOVERNANCE_ADDRESS=${governance.address}`);
  console.log(`TOKEN_ADDRESS=${ldaoToken.address}`);
  console.log("=====================================");
  
  console.log(`\n💾 Addresses saved to deployedAddresses-${network.name}.json`);
  
  // Provide blockchain explorer links
  const getExplorerUrl = (address) => {
    switch(network.config.chainId) {
      case 84532: // Base Sepolia
        return `https://sepolia.basescan.org/address/${address}`;
      case 8453: // Base Mainnet
        return `https://basescan.org/address/${address}`;
      case 11155111: // Ethereum Sepolia
        return `https://sepolia.etherscan.io/address/${address}`;
      case 1: // Ethereum Mainnet
        return `https://etherscan.io/address/${address}`;
      default:
        return `Address: ${address}`;
    }
  };

  console.log("\n🔗 View contracts on blockchain explorer:");
  console.log("ProfileRegistry:", getExplorerUrl(profileRegistry.address));
  console.log("FollowModule:", getExplorerUrl(followModule.address));
  console.log("LDAOToken:", getExplorerUrl(ldaoToken.address));
  console.log("PaymentRouter:", getExplorerUrl(paymentRouter.address));
  console.log("Governance:", getExplorerUrl(governance.address));
  
  // Verify contracts are working
  console.log("\n🧪 Running basic contract tests...");
  
  try {
    // Test LDAOToken
    const totalSupply = await ldaoToken.totalSupply();
    console.log(`✅ LDAOToken total supply: ${ethers.formatEther(totalSupply)} LDAO`);
    
    // Test ProfileRegistry
    const profileName = await profileRegistry.name();
    console.log(`✅ ProfileRegistry name: ${profileName}`);
    
    // Test FollowModule
    const followerCount = await followModule.followerCount(deployer.address);
    console.log(`✅ FollowModule working, follower count for deployer: ${followerCount}`);
    
    // Test PaymentRouter
    const fee = await paymentRouter.feeBasisPoints();
    console.log(`✅ PaymentRouter fee: ${fee} basis points (${fee/100}%)`);
    
    // Test Governance
    const proposalCount = await governance.proposalCount();
    console.log(`✅ Governance proposal count: ${proposalCount}`);
    
    console.log("\n🎉 All contracts deployed and verified successfully!");
    
  } catch (error) {
    console.log("⚠️  Contract verification failed:", error.message);
  }

  return addresses;
}

main()
  .then((addresses) => {
    console.log("\n🎯 Final Contract Addresses:");
    console.log("PROFILE_REGISTRY_ADDRESS=" + addresses.PROFILE_REGISTRY_ADDRESS);
    console.log("FOLLOW_MODULE_ADDRESS=" + addresses.FOLLOW_MODULE_ADDRESS);
    console.log("PAYMENT_ROUTER_ADDRESS=" + addresses.PAYMENT_ROUTER_ADDRESS);
    console.log("GOVERNANCE_ADDRESS=" + addresses.GOVERNANCE_ADDRESS);
    console.log("TOKEN_ADDRESS=" + addresses.TOKEN_ADDRESS);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });