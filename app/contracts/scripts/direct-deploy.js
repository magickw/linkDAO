const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Contract ABIs and bytecode (you'll need to compile these first)
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
  console.log("🚀 Starting LinkDAO Direct Deployment to Base Sepolia...");
  
  // Check environment variables
  if (!process.env.PRIVATE_KEY) {
    console.error("❌ PRIVATE_KEY not found in .env file");
    process.exit(1);
  }
  
  if (!process.env.ALCHEMY_API_KEY) {
    console.error("❌ ALCHEMY_API_KEY not found in .env file");
    process.exit(1);
  }
  
  // Connect to Base Sepolia
  const rpcUrl = `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log("Deploying contracts with account:", wallet.address);
  
  try {
    const balance = await wallet.getBalance();
    console.log("Account balance:", ethers.formatEther(balance), "ETH");
    
    if (balance.lt(ethers.parseEther("0.01"))) {
      console.log("⚠️  Warning: Low balance. You might need more ETH for deployment.");
      console.log("💡 Get testnet ETH from: https://www.alchemy.com/faucets/base-sepolia");
    }
  } catch (error) {
    console.error("❌ Failed to connect to Base Sepolia. Check your ALCHEMY_API_KEY and network connection.");
    process.exit(1);
  }
  
  // Load contract artifacts
  console.log("\n📦 Loading contract artifacts...");
  const contracts = {
    ProfileRegistry: await loadContractData('ProfileRegistry'),
    FollowModule: await loadContractData('FollowModule'),
    LDAOToken: await loadContractData('LDAOToken'),
    PaymentRouter: await loadContractData('PaymentRouter'),
    Governance: await loadContractData('Governance')
  };
  
  // Check if we have all contracts
  const missingContracts = Object.entries(contracts)
    .filter(([name, data]) => !data)
    .map(([name]) => name);
    
  if (missingContracts.length > 0) {
    console.error("❌ Missing contract artifacts. Please compile contracts first:");
    console.error("   cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/contracts");
    console.error("   npx hardhat compile --config hardhat.config.cjs");
    console.error("Missing contracts:", missingContracts.join(', '));
    process.exit(1);
  }
  
  console.log("✅ All contract artifacts loaded");
  
  // Deploy contracts in order
  const deployedAddresses = {};
  
  try {
    // 1. Deploy ProfileRegistry
    console.log("\n🔄 Deploying ProfileRegistry...");
    const ProfileRegistryFactory = new ethers.ContractFactory(
      contracts.ProfileRegistry.abi,
      contracts.ProfileRegistry.bytecode,
      wallet
    );
    const profileRegistry = await ProfileRegistryFactory.deploy();
    await profileRegistry.deployed();
    deployedAddresses.PROFILE_REGISTRY_ADDRESS = profileRegistry.address;
    console.log("✅ ProfileRegistry deployed to:", profileRegistry.address);
    
    // 2. Deploy FollowModule
    console.log("\n🔄 Deploying FollowModule...");
    const FollowModuleFactory = new ethers.ContractFactory(
      contracts.FollowModule.abi,
      contracts.FollowModule.bytecode,
      wallet
    );
    const followModule = await FollowModuleFactory.deploy();
    await followModule.deployed();
    deployedAddresses.FOLLOW_MODULE_ADDRESS = followModule.address;
    console.log("✅ FollowModule deployed to:", followModule.address);
    
    // 3. Deploy LDAOToken
    console.log("\n🔄 Deploying LDAOToken...");
    const LDAOTokenFactory = new ethers.ContractFactory(
      contracts.LDAOToken.abi,
      contracts.LDAOToken.bytecode,
      wallet
    );
    const ldaoToken = await LDAOTokenFactory.deploy(wallet.address); // Treasury address
    await ldaoToken.deployed();
    deployedAddresses.TOKEN_ADDRESS = ldaoToken.address;
    console.log("✅ LDAOToken deployed to:", ldaoToken.address);
    
    // 4. Deploy PaymentRouter
    console.log("\n🔄 Deploying PaymentRouter...");
    const PaymentRouterFactory = new ethers.ContractFactory(
      contracts.PaymentRouter.abi,
      contracts.PaymentRouter.bytecode,
      wallet
    );
    const paymentRouter = await PaymentRouterFactory.deploy(
      250, // 2.5% fee (250 basis points)
      wallet.address // Fee collector address
    );
    await paymentRouter.deployed();
    deployedAddresses.PAYMENT_ROUTER_ADDRESS = paymentRouter.address;
    console.log("✅ PaymentRouter deployed to:", paymentRouter.address);
    
    // 5. Deploy Governance
    console.log("\n🔄 Deploying Governance...");
    const GovernanceFactory = new ethers.ContractFactory(
      contracts.Governance.abi,
      contracts.Governance.bytecode,
      wallet
    );
    const governance = await GovernanceFactory.deploy(ldaoToken.address);
    await governance.deployed();
    deployedAddresses.GOVERNANCE_ADDRESS = governance.address;
    console.log("✅ Governance deployed to:", governance.address);
    
    // Post-deployment configuration
    console.log("\n🔧 Configuring contracts...");
    try {
      const tx = await paymentRouter.setTokenSupported(ldaoToken.address, true);
      await tx.wait();
      console.log("✅ LDAOToken added as supported token in PaymentRouter");
    } catch (error) {
      console.log("⚠️  Failed to configure PaymentRouter:", error.message);
    }
    
    // Save addresses to JSON file
    const fullAddresses = {
      ...deployedAddresses,
      deployer: wallet.address,
      network: "baseSepolia",
      chainId: "84532",
      deployedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      "deployedAddresses-baseSepolia.json",
      JSON.stringify(fullAddresses, null, 2)
    );
    
    console.log("\n📝 Deployment Summary:");
    console.log("=====================================");
    console.log("Network: Base Sepolia (Chain ID: 84532)");
    console.log(`PROFILE_REGISTRY_ADDRESS=${deployedAddresses.PROFILE_REGISTRY_ADDRESS}`);
    console.log(`FOLLOW_MODULE_ADDRESS=${deployedAddresses.FOLLOW_MODULE_ADDRESS}`);
    console.log(`PAYMENT_ROUTER_ADDRESS=${deployedAddresses.PAYMENT_ROUTER_ADDRESS}`);
    console.log(`GOVERNANCE_ADDRESS=${deployedAddresses.GOVERNANCE_ADDRESS}`);
    console.log(`TOKEN_ADDRESS=${deployedAddresses.TOKEN_ADDRESS}`);
    console.log("=====================================");
    
    console.log("\n🔗 View contracts on Base Sepolia Explorer:");
    Object.entries(deployedAddresses).forEach(([name, address]) => {
      console.log(`${name}: https://sepolia.basescan.org/address/${address}`);
    });
    
    console.log("\n💾 Addresses saved to deployedAddresses-baseSepolia.json");
    
    // Verify contracts are working
    console.log("\n🧪 Running basic contract tests...");
    
    try {
      const totalSupply = await ldaoToken.totalSupply();
      console.log(`✅ LDAOToken total supply: ${ethers.formatEther(totalSupply)} LDAO`);
      
      const profileName = await profileRegistry.name();
      console.log(`✅ ProfileRegistry name: ${profileName}`);
      
      const followerCount = await followModule.followerCount(wallet.address);
      console.log(`✅ FollowModule working, follower count: ${followerCount}`);
      
      const fee = await paymentRouter.feeBasisPoints();
      console.log(`✅ PaymentRouter fee: ${fee} basis points (${fee/100}%)`);
      
      const proposalCount = await governance.proposalCount();
      console.log(`✅ Governance proposal count: ${proposalCount}`);
      
      console.log("\n🎉 All contracts deployed and verified successfully!");
      
    } catch (error) {
      console.log("⚠️  Contract verification failed:", error.message);
    }
    
    return deployedAddresses;
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then((addresses) => {
    console.log("\n🎯 Final Contract Addresses:");
    console.log("PROFILE_REGISTRY_ADDRESS=" + addresses.PROFILE_REGISTRY_ADDRESS);
    console.log("FOLLOW_MODULE_ADDRESS=" + addresses.FOLLOW_MODULE_ADDRESS);
    console.log("PAYMENT_ROUTER_ADDRESS=" + addresses.PAYMENT_ROUTER_ADDRESS);
    console.log("GOVERNANCE_ADDRESS=" + addresses.GOVERNANCE_ADDRESS);
    console.log("TOKEN_ADDRESS=" + addresses.TOKEN_ADDRESS);
    console.log("\n🌐 Your contracts are now live on Base Sepolia!");
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });