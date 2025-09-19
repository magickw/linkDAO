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

class DeploymentManager {
  private config: DeploymentConfig;
  private deployedContracts: Map<string, DeployedContract> = new Map();
  private deployer: any;

  constructor(config: DeploymentConfig) {
    this.config = config;
  }

  async initialize() {
    const [deployer] = await ethers.getSigners();
    this.deployer = deployer;
    
    console.log('🚀 Starting deployment process...');
    console.log('📍 Network:', this.config.network);
    console.log('👤 Deployer:', deployer.address);
    console.log('💰 Balance:', ethers.utils.formatEther(await deployer.getBalance()), 'ETH');
  }

  async deployAllContracts() {
    console.log('\n📦 Deploying all contracts...\n');

    // Phase 1: Foundation contracts
    await this.deployFoundationContracts();
    
    // Phase 2: Core service contracts
    await this.deployCoreServiceContracts();
    
    // Phase 3: Marketplace contracts
    await this.deployMarketplaceContracts();
    
    // Phase 4: Extended feature contracts
    await this.deployExtendedFeatureContracts();

    console.log('\n✅ All contracts deployed successfully!');
  }

  private async deployFoundationContracts() {
    console.log('🏗️  Phase 1: Foundation Contracts');
    
    // Deploy LDAOToken
    await this.deployContract('LDAOToken', [
      ethers.utils.parseEther('1000000000'), // 1 billion tokens
      'LDAO Token',
      'LDAO'
    ]);

    // Deploy MockERC20 for testing
    await this.deployContract('MockERC20', [
      'Mock Token',
      'MOCK',
      ethers.utils.parseEther('1000000')
    ]);

    // Deploy Counter for testing
    await this.deployContract('Counter', []);
  }

  private async deployCoreServiceContracts() {
    console.log('\n🔧 Phase 2: Core Service Contracts');
    
    const ldaoToken = this.deployedContracts.get('LDAOToken');
    
    // Deploy Governance
    await this.deployContract('Governance', [
      ldaoToken?.address,
      1, // voting delay (blocks)
      17280, // voting period (~3 days)
      ethers.utils.parseEther('100000') // quorum
    ]);

    // Deploy ReputationSystem
    await this.deployContract('ReputationSystem', []);

    // Deploy ProfileRegistry
    await this.deployContract('ProfileRegistry', []);

    // Deploy SimpleProfileRegistry
    await this.deployContract('SimpleProfileRegistry', []);

    // Deploy PaymentRouter
    await this.deployContract('PaymentRouter', []);
  }

  private async deployMarketplaceContracts() {
    console.log('\n🏪 Phase 3: Marketplace Contracts');
    
    const governance = this.deployedContracts.get('Governance');
    const reputation = this.deployedContracts.get('ReputationSystem');
    
    // Deploy EnhancedEscrow
    await this.deployContract('EnhancedEscrow', [
      governance?.address,
      7 * 24 * 60 * 60 // 7 days default timeout
    ]);

    // Deploy DisputeResolution
    await this.deployContract('DisputeResolution', [
      governance?.address,
      reputation?.address
    ]);

    // Deploy Marketplace
    await this.deployContract('Marketplace', []);

    // Deploy RewardPool
    await this.deployContract('RewardPool', []);
  }

  private async deployExtendedFeatureContracts() {
    console.log('\n🎨 Phase 4: Extended Feature Contracts');
    
    // Deploy NFTMarketplace
    await this.deployContract('NFTMarketplace', []);

    // Deploy NFTCollectionFactory
    await this.deployContract('NFTCollectionFactory', []);

    // Deploy TipRouter
    await this.deployContract('TipRouter', []);

    // Deploy FollowModule
    await this.deployContract('FollowModule', []);
  }

  private async deployContract(contractName: string, args: any[] = []) {
    try {
      console.log(`📋 Deploying ${contractName}...`);
      
      const ContractFactory = await ethers.getContractFactory(contractName);
      const contract = await ContractFactory.deploy(...args);
      await contract.deployed();

      const deployedContract: DeployedContract = {
        name: contractName,
        address: contract.address,
        owner: await contract.owner?.() || this.deployer.address,
        deploymentTx: contract.deployTransaction.hash
      };

      this.deployedContracts.set(contractName, deployedContract);
      
      console.log(`✅ ${contractName} deployed to: ${contract.address}`);
      console.log(`   Owner: ${deployedContract.owner}`);
      console.log(`   Tx: ${deployedContract.deploymentTx}`);

      // Verify on Etherscan if enabled
      if (this.config.verifyContracts && this.config.network !== 'localhost') {
        await this.verifyContract(contract.address, args);
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

  async verifyContract(address: string, constructorArgs: any[]) {
    try {
      console.log(`🔍 Verifying contract at ${address}...`);
      
      await hre.run('verify:verify', {
        address: address,
        constructorArguments: constructorArgs,
      });
      
      console.log(`✅ Contract verified on Etherscan`);
    } catch (error) {
      console.log(`⚠️  Verification failed (this is normal if already verified):`, error.message);
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
    verifyContracts: network !== 'localhost' && network !== 'hardhat',
    // Add your multi-sig address here for production deployments
    multiSigAddress: process.env.MULTI_SIG_ADDRESS,
    // Or specify an initial owner
    initialOwner: process.env.INITIAL_OWNER,
  };

  const deploymentManager = new DeploymentManager(config);
  
  try {
    await deploymentManager.initialize();
    await deploymentManager.deployAllContracts();
    await deploymentManager.setupOwnership();
    await deploymentManager.saveDeploymentInfo();
    await deploymentManager.generateOwnershipReport();
    
    console.log('\n🎉 Deployment completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Verify all contracts on Etherscan');
    console.log('2. Set up monitoring and alerts');
    console.log('3. Configure governance parameters');
    console.log('4. Test all contract interactions');
    console.log('5. Update frontend with new addresses');
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Ownership management functions
export async function claimOwnership(contractAddress: string, contractName: string) {
  const [signer] = await ethers.getSigners();
  const contract = await ethers.getContractAt(contractName, contractAddress);
  
  console.log(`Claiming ownership of ${contractName} at ${contractAddress}`);
  
  const currentOwner = await contract.owner();
  console.log('Current owner:', currentOwner);
  
  if (currentOwner.toLowerCase() === signer.address.toLowerCase()) {
    console.log('✅ You are already the owner');
    return;
  }
  
  // If using Ownable2Step, accept ownership
  if (contract.acceptOwnership) {
    const pendingOwner = await contract.pendingOwner();
    if (pendingOwner.toLowerCase() === signer.address.toLowerCase()) {
      const tx = await contract.acceptOwnership();
      await tx.wait();
      console.log('✅ Ownership claimed successfully');
    } else {
      console.log('❌ You are not the pending owner');
    }
  } else {
    console.log('❌ Cannot claim ownership - you are not the current owner');
  }
}

export async function transferOwnership(
  contractAddress: string,
  contractName: string,
  newOwner: string
) {
  const [signer] = await ethers.getSigners();
  const contract = await ethers.getContractAt(contractName, contractAddress);
  
  console.log(`Transferring ownership of ${contractName} to ${newOwner}`);
  
  const currentOwner = await contract.owner();
  if (currentOwner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error('You are not the current owner');
  }
  
  const tx = await contract.transferOwnership(newOwner);
  await tx.wait();
  
  console.log('✅ Ownership transfer initiated');
  
  // If using Ownable2Step, remind about acceptance
  if (contract.pendingOwner) {
    console.log('⚠️  New owner must call acceptOwnership() to complete the transfer');
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