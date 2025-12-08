import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

interface DeploymentConfig {
  network: string;
  multiSigAddress?: string;
  governanceDelay?: number;
  initialOwner?: string;
  verifyContracts?: boolean;
}

interface DeployedContract {
  name: string;
  address: string;
  owner: string;
  deploymentTx: string;
}

class BaseDeploymentManager {
  private config: DeploymentConfig;
  private deployedContracts: Map<string, DeployedContract> = new Map();
  private deployer: any;

  constructor(config: DeploymentConfig) {
    this.config = config;
  }

  async initialize() {
    const [deployer] = await ethers.getSigners();
    this.deployer = deployer;
    
    console.log('🚀 Starting Base deployment process...');
    console.log('📍 Network:', this.config.network);
    console.log('👤 Deployer:', deployer.address);
    
    // Check if deployer has sufficient balance for deployment
    try {
      const provider = ethers.provider;
      const balance = await provider.getBalance(deployer.address);
      console.log('💰 Balance:', ethers.formatEther(balance), 'ETH');
      
      if (balance.lt(ethers.parseEther("0.01"))) {
        console.warn('⚠️  Warning: Low balance detected. Deployment may fail due to insufficient funds.');
      }
    } catch (error) {
      console.log('⚠️  Could not fetch balance, continuing deployment...');
    }
  }

  async deployAllContracts() {
    console.log('\n📦 Deploying all contracts to Base...\n');

    // Phase 1: Foundation contracts
    await this.deployFoundationContracts();
    
    // Phase 2: Core service contracts
    await this.deployCoreServiceContracts();
    
    // Phase 3: Marketplace contracts
    await this.deployMarketplaceContracts();
    
    // Phase 4: Extended feature contracts
    await this.deployExtendedFeatureContracts();

    console.log('\n✅ All contracts deployed successfully to Base!');
  }

  private async deployFoundationContracts() {
    console.log('🏗️  Phase 1: Foundation Contracts');

    // Deploy LDAOToken - constructor takes only treasury address
    await this.deployContract('LDAOToken', [
      this.deployer.address // treasury address
    ]);

    // Deploy Counter for testing
    await this.deployContract('Counter', []);
  }

  private async deployCoreServiceContracts() {
    console.log('\n🔧 Phase 2: Core Service Contracts');

    const ldaoToken = this.deployedContracts.get('LDAOToken');

    // Deploy MultiSigWallet first - constructor(address[] memory _owners, uint256 _requiredConfirmations, uint256 _timeDelay)
    await this.deployContract('MultiSigWallet', [
      [this.deployer.address], // owners - using deployer for now
      1, // required confirmations (using 1 for single owner, minimum required)
      0 // time delay
    ]);

    // Deploy MockUSDC - constructor(string memory name, string memory symbol, uint8 decimals_, uint256 initialSupply)
    await this.deployContract('MockUSDC', [
      'USD Coin', // name
      'USDC', // symbol
      6, // decimals
      ethers.parseUnits('1000000', 6) // initial supply (1M USDC)
    ]);

    // Deploy ReputationSystem - constructor()
    await this.deployContract('ReputationSystem', []);

    // Deploy LDAOTreasury - constructor(address _ldaoToken, address _usdcToken, address payable _multiSigWallet, address _governance)
    const multiSigWallet = this.deployedContracts.get('MultiSigWallet');
    const mockUSDC = this.deployedContracts.get('MockUSDC');
    await this.deployContract('LDAOTreasury', [
      ldaoToken?.address, // _ldaoToken
      mockUSDC?.address, // _usdcToken
      multiSigWallet?.address, // _multiSigWallet
      this.deployer.address // _governance - using deployer as placeholder for now
    ]);

    // Deploy Governance - constructor(address _governanceToken, address _reputationSystem, address _treasury, address _multiSigWallet)
    const reputationSystem = this.deployedContracts.get('ReputationSystem');
    const treasury = this.deployedContracts.get('LDAOTreasury');
    const multiSigWalletForGov = this.deployedContracts.get('MultiSigWallet');
    await this.deployContract('Governance', [
      ldaoToken?.address, // _governanceToken
      reputationSystem?.address, // _reputationSystem
      treasury?.address, // _treasury
      multiSigWalletForGov?.address // _multiSigWallet
    ]);

    // Update LDAOTreasury with the proper governance address
    const governanceContract = this.deployedContracts.get('Governance');
    if (governanceContract && treasury?.address) {
      try {
        const treasuryContract = await ethers.getContractAt('LDAOTreasury', treasury?.address);
        const tx = await treasuryContract.updateGovernance(governanceContract.address);
        await tx.wait();
        console.log('✅ Updated LDAOTreasury with Governance address');
      } catch (error) {
        console.log('⚠️  Failed to update LDAOTreasury governance address:', error.message);
      }
    }

    // Deploy ProfileRegistry - constructor()
    await this.deployContract('ProfileRegistry', []);

    // Deploy SimpleProfileRegistry - constructor()
    await this.deployContract('SimpleProfileRegistry', []);

    // Deploy PaymentRouter - constructor(uint256 _feeBasisPoints, address _feeCollector)
    await this.deployContract('PaymentRouter', [
      250, // 2.5% fee
      this.deployer.address // fee collector
    ]);
  }

  private async deployMarketplaceContracts() {
    console.log('\n🏪 Phase 3: Marketplace Contracts');

    const ldaoToken = this.deployedContracts.get('LDAOToken');
    const governance = this.deployedContracts.get('Governance');
    const reputation = this.deployedContracts.get('ReputationSystem');

    // Deploy EnhancedEscrow - constructor(address _ldaoToken, address _governance)
    await this.deployContract('EnhancedEscrow', [
      ldaoToken?.address,
      governance?.address
    ]);

    // Deploy DisputeResolution - constructor(address _governance, address _reputationSystem)
    await this.deployContract('DisputeResolution', [
      governance?.address,
      reputation?.address
    ]);

    // Deploy Marketplace - constructor(address _ldaoToken)
    await this.deployContract('Marketplace', [
      ldaoToken?.address
    ]);

    // Deploy RewardPool - constructor(address _ldao)
    await this.deployContract('RewardPool', [
      ldaoToken?.address
    ]);
  }

  private async deployExtendedFeatureContracts() {
    console.log('\n🎨 Phase 4: Extended Feature Contracts');

    const ldaoToken = this.deployedContracts.get('LDAOToken');
    const rewardPool = this.deployedContracts.get('RewardPool');

    // Deploy NFTMarketplace - constructor()
    await this.deployContract('NFTMarketplace', []);

    // Deploy NFTCollectionFactory - constructor()
    await this.deployContract('NFTCollectionFactory', []);

    // Deploy TipRouter - constructor(address _ldao, address _rewardPool)
    await this.deployContract('TipRouter', [
      ldaoToken?.address,
      rewardPool?.address
    ]);

    // Deploy FollowModule - constructor()
    await this.deployContract('FollowModule', []);
  }

  private async deployContract(contractName: string, args: any[] = []) {
    try {
      console.log(`📋 Deploying ${contractName}...`);
      
      const ContractFactory = await ethers.getContractFactory(contractName);
      const contract = await ContractFactory.deploy(...args);
      console.log(`⏳ Waiting for ${contractName} deployment...`);
      
      // For ethers v6, use waitForDeployment() instead of deployed()
      const deploymentTx = contract.deploymentTransaction();
      await contract.waitForDeployment();
      const contractAddress = await contract.getAddress();

      // Get the owner separately to handle potential issues on Base network
      let contractOwner = this.deployer.address; // Default to deployer
      try {
        // Wait a bit to ensure the contract is fully deployed
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (contract.owner) {
          contractOwner = await contract.owner();
        }
      } catch (error) {
        console.log(`⚠️  Could not fetch owner for ${contractName}, using deployer address as default`);
        console.log(`   Error:`, error.message);
      }

      const deployedContract: DeployedContract = {
        name: contractName,
        address: contractAddress,
        owner: contractOwner,
        deploymentTx: deploymentTx.hash
      };

      this.deployedContracts.set(contractName, deployedContract);
      
      console.log(`✅ ${contractName} deployed to: ${contractAddress}`);
      console.log(`   Owner: ${deployedContract.owner}`);
      console.log(`   Tx: ${deployedContract.deploymentTx}`);

      // Verify on Etherscan/Basescan if enabled
      if (this.config.verifyContracts && this.config.network !== 'localhost' && this.config.network !== 'hardhat') {
        console.log(`🔍 Verifying ${contractName} on ${this.config.network}...`);
        await this.verifyContract(contractAddress, contractName, args);
      }

    } catch (error) {
      console.error(`❌ Failed to deploy ${contractName}:`, error);
      throw error;
    }
  }

  async setupOwnership() {
    console.log('\n👑 Setting up ownership structure...');

    if (this.config.multiSigAddress) {
      await this.transferToMultiSig();
    } else if (this.config.initialOwner) {
      await this.transferToOwner();
    } else {
      console.log('⚠️  No ownership transfer configured - contracts remain with deployer');
    }
  }

  private async transferToMultiSig() {
    console.log(`🔐 Transferring ownership to multi-sig: ${this.config.multiSigAddress}`);
    
    for (const [contractName, contractInfo] of this.deployedContracts) {
      try {
        const contract = await ethers.getContractAt(contractName, contractInfo.address);
        
        // Check if contract has ownership functionality
        if (contract.transferOwnership) {
          console.log(`Transferring ${contractName} ownership...`);
          const tx = await contract.transferOwnership(this.config.multiSigAddress);
          await tx.wait();
          
          console.log(`✅ ${contractName} ownership transferred`);
        } else {
          console.log(`⚠️  ${contractName} does not have ownership functionality`);
        }
      } catch (error) {
        console.error(`❌ Failed to transfer ${contractName} ownership:`, error);
      }
    }
  }

  private async transferToOwner() {
    console.log(`👤 Transferring ownership to: ${this.config.initialOwner}`);
    
    for (const [contractName, contractInfo] of this.deployedContracts) {
      try {
        const contract = await ethers.getContractAt(contractName, contractInfo.address);
        
        if (contract.transferOwnership) {
          const tx = await contract.transferOwnership(this.config.initialOwner);
          await tx.wait();
          
          console.log(`✅ ${contractName} ownership transferred`);
        }
      } catch (error) {
        console.error(`❌ Failed to transfer ${contractName} ownership:`, error);
      }
    }
  }

  async verifyContract(address: string, contractName: string, constructorArgs: any[]) {
    try {
      console.log(`🔍 Verifying contract ${contractName} at ${address}...`);

      // Use hardhat-verify plugin
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: constructorArgs,
      });

      console.log(`✅ Contract ${contractName} verified on ${this.config.network}`);
    } catch (error: any) {
      if (error.message.includes('Already Verified')) {
        console.log(`✅ Contract ${contractName} already verified`);
      } else if (error.message.includes('does not have bytecode')) {
        console.log(`⚠️  Contract ${contractName} not yet indexed, skipping verification`);
      } else if (error.message.includes('Contract source code not verified')) {
        console.log(`⚠️  Contract ${contractName} source code verification failed`);
      } else {
        console.log(`⚠️  Verification for ${contractName} failed:`, error.message);
        console.log(`   You can manually verify later`);
      }
    }
  }

  async saveDeploymentInfo() {
    const deploymentInfo = {
      network: this.config.network,
      chainId: (await ethers.provider.getNetwork()).chainId,
      deployer: this.deployer.address,
      deployedAt: new Date().toISOString(),
      multiSigAddress: this.config.multiSigAddress,
      contracts: Object.fromEntries(
        Array.from(this.deployedContracts.entries()).map(([name, info]) => [
          name,
          {
            address: info.address,
            owner: info.owner,
            deploymentTx: info.deploymentTx
          }
        ])
      )
    };

    const filename = `deployedAddresses-${this.config.network}.json`;
    const filepath = path.join(__dirname, '..', filename);
    
    fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n📄 Deployment info saved to: ${filename}`);

    // Also update the main addresses file for the current network
    const mainAddressesPath = path.join(__dirname, '..', 'deployedAddresses.json');
    fs.writeFileSync(mainAddressesPath, JSON.stringify(deploymentInfo, null, 2));
  }

  async generateOwnershipReport() {
    console.log('\n📊 Ownership Report');
    console.log('==================');
    
    for (const [contractName, contractInfo] of this.deployedContracts) {
      try {
        const contract = await ethers.getContractAt(contractName, contractInfo.address);
        
        if (contract.owner) {
          const currentOwner = await contract.owner();
          console.log(`${contractName}: ${currentOwner}`);
        } else {
          console.log(`${contractName}: No ownership (or not Ownable)`);
        }
      } catch (error) {
        console.log(`${contractName}: Error checking ownership`);
      }
    }
  }
}

// Main deployment function
async function main() {
  const network = hre.network.name;
  
  // Configuration based on network
  const config: DeploymentConfig = {
    network,
    verifyContracts: true,
    // Add your multi-sig address here for production deployments
    multiSigAddress: process.env.MULTI_SIG_ADDRESS,
    // Or specify an initial owner
    initialOwner: process.env.INITIAL_OWNER,
  };

  const deploymentManager = new BaseDeploymentManager(config);
  
  try {
    await deploymentManager.initialize();
    await deploymentManager.deployAllContracts();
    await deploymentManager.setupOwnership();
    await deploymentManager.saveDeploymentInfo();
    await deploymentManager.generateOwnershipReport();
    
    console.log('\n🎉 Base deployment completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Verify all contracts on Basescan');
    console.log('2. Set up monitoring and alerts');
    console.log('3. Configure governance parameters');
    console.log('4. Test all contract interactions');
    console.log('5. Update frontend with new addresses');
    
  } catch (error) {
    console.error('\n❌ Base deployment failed:', error);
    process.exit(1);
  }
}

// Run deployment if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export default main;