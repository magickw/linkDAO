import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

interface ContractInfo {
  address: string;
  owner?: string;
  deploymentTx?: string;
}

interface DeploymentData {
  network: string;
  chainId: number;
  deployer: string;
  deployedAt: string;
  contracts: { [key: string]: ContractInfo };
}

class DeploymentChecker {
  private network: string;
  private deploymentData: DeploymentData | null = null;

  constructor() {
    this.network = hre.network.name;
  }

  async loadDeploymentData(): Promise<boolean> {
    const possiblePaths = [
      path.join(__dirname, '..', `deployedAddresses-${this.network}.json`),
      path.join(__dirname, '..', 'deployedAddresses.json')
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        try {
          const data = fs.readFileSync(filePath, 'utf8');
          this.deploymentData = JSON.parse(data);
          console.log(`📄 Loaded deployment data from: ${path.basename(filePath)}`);
          return true;
        } catch (error) {
          console.error(`❌ Error reading ${filePath}:`, error);
        }
      }
    }

    console.log('❌ No deployment data found');
    return false;
  }

  async checkNetworkStatus() {
    const network = await ethers.provider.getNetwork();
    const blockNumber = await ethers.provider.getBlockNumber();
    const gasPrice = await ethers.provider.getGasPrice();

    console.log('\n🌐 Network Status');
    console.log('================');
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Block Number: ${blockNumber}`);
    console.log(`Gas Price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);

    if (this.deploymentData) {
      const isCorrectNetwork = network.chainId === this.deploymentData.chainId;
      console.log(`Deployment Network Match: ${isCorrectNetwork ? '✅' : '❌'}`);
      
      if (!isCorrectNetwork) {
        console.log(`⚠️  Warning: Connected to chain ${network.chainId} but deployment was on chain ${this.deploymentData.chainId}`);
      }
    }
  }

  async checkContractDeployments() {
    if (!this.deploymentData) {
      console.log('❌ No deployment data available');
      return;
    }

    console.log('\n📋 Contract Deployment Status');
    console.log('=============================');

    for (const [contractName, contractInfo] of Object.entries(this.deploymentData.contracts)) {
      await this.checkSingleContract(contractName, contractInfo);
    }
  }

  private async checkSingleContract(contractName: string, contractInfo: ContractInfo) {
    try {
      // Check if contract exists at address
      const code = await ethers.provider.getCode(contractInfo.address);
      const isDeployed = code !== '0x';

      console.log(`\n📦 ${contractName}`);
      console.log(`   Address: ${contractInfo.address}`);
      console.log(`   Deployed: ${isDeployed ? '✅' : '❌'}`);

      if (!isDeployed) {
        console.log(`   ⚠️  No contract code found at this address`);
        return;
      }

      // Try to get contract instance and check ownership
      try {
        const contract = await ethers.getContractAt(contractName, contractInfo.address);
        
        // Check if contract has owner function
        if (contract.owner) {
          const currentOwner = await contract.owner();
          console.log(`   Owner: ${currentOwner}`);
          
          // Check if it's a known address
          if (currentOwner === this.deploymentData?.deployer) {
            console.log(`   👤 Owned by deployer`);
          } else if (currentOwner === ethers.constants.AddressZero) {
            console.log(`   ⚠️  Ownership renounced`);
          } else {
            console.log(`   👥 Owned by external address`);
          }

          // Check if using Ownable2Step
          if (contract.pendingOwner) {
            try {
              const pendingOwner = await contract.pendingOwner();
              if (pendingOwner !== ethers.constants.AddressZero) {
                console.log(`   ⏳ Pending owner: ${pendingOwner}`);
              }
            } catch (error) {
              // Ignore if pendingOwner doesn't exist
            }
          }
        } else {
          console.log(`   👤 No ownership (not Ownable)`);
        }

        // Check if contract is paused (if it has pause functionality)
        if (contract.paused) {
          try {
            const isPaused = await contract.paused();
            console.log(`   ⏸️  Paused: ${isPaused ? 'Yes' : 'No'}`);
          } catch (error) {
            // Ignore if paused function doesn't exist
          }
        }

        // Get some basic info for specific contracts
        await this.getContractSpecificInfo(contractName, contract);

      } catch (error) {
        console.log(`   ⚠️  Could not interact with contract: ${error.message}`);
      }

      // Check deployment transaction
      if (contractInfo.deploymentTx) {
        try {
          const tx = await ethers.provider.getTransaction(contractInfo.deploymentTx);
          if (tx) {
            console.log(`   📄 Deployment Tx: ${contractInfo.deploymentTx}`);
            console.log(`   ⛽ Gas Used: ${tx.gasLimit?.toString()}`);
          }
        } catch (error) {
          console.log(`   ⚠️  Could not fetch deployment transaction`);
        }
      }

    } catch (error) {
      console.log(`❌ Error checking ${contractName}:`, error.message);
    }
  }

  private async getContractSpecificInfo(contractName: string, contract: any) {
    try {
      switch (contractName) {
        case 'LDAOToken':
          const totalSupply = await contract.totalSupply();
          const symbol = await contract.symbol();
          console.log(`   🪙 ${symbol} Total Supply: ${ethers.utils.formatEther(totalSupply)}`);
          break;

        case 'Governance':
          const votingDelay = await contract.votingDelay();
          const votingPeriod = await contract.votingPeriod();
          console.log(`   🗳️  Voting Delay: ${votingDelay} blocks`);
          console.log(`   🗳️  Voting Period: ${votingPeriod} blocks`);
          break;

        case 'Marketplace':
          if (contract.platformFee) {
            const platformFee = await contract.platformFee();
            console.log(`   💰 Platform Fee: ${platformFee / 100}%`);
          }
          break;

        case 'NFTMarketplace':
          if (contract.name) {
            const name = await contract.name();
            console.log(`   🎨 NFT Collection: ${name}`);
          }
          break;
      }
    } catch (error) {
      // Ignore errors for contract-specific info
    }
  }

  async checkWalletStatus() {
    try {
      const [signer] = await ethers.getSigners();
      const balance = await signer.getBalance();

      console.log('\n💼 Wallet Status');
      console.log('================');
      console.log(`Address: ${signer.address}`);
      console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH`);

      if (this.deploymentData) {
        const isDeployer = signer.address.toLowerCase() === this.deploymentData.deployer.toLowerCase();
        console.log(`Is Deployer: ${isDeployer ? '✅' : '❌'}`);
      }
    } catch (error) {
      console.log('❌ Could not check wallet status:', error.message);
    }
  }

  async generateOwnershipSummary() {
    if (!this.deploymentData) return;

    console.log('\n👑 Ownership Summary');
    console.log('===================');

    const ownershipMap = new Map<string, string[]>();

    for (const [contractName, contractInfo] of Object.entries(this.deploymentData.contracts)) {
      try {
        const contract = await ethers.getContractAt(contractName, contractInfo.address);
        
        if (contract.owner) {
          const owner = await contract.owner();
          const contracts = ownershipMap.get(owner) || [];
          contracts.push(contractName);
          ownershipMap.set(owner, contracts);
        }
      } catch (error) {
        // Ignore errors
      }
    }

    for (const [owner, contracts] of ownershipMap) {
      console.log(`\n👤 ${owner}`);
      for (const contractName of contracts) {
        console.log(`   - ${contractName}`);
      }
    }
  }

  async suggestNextSteps() {
    console.log('\n🎯 Suggested Next Steps');
    console.log('=======================');

    if (!this.deploymentData) {
      console.log('1. Deploy contracts to this network');
      console.log('2. Run: npm run deploy:' + this.network);
      return;
    }

    const [signer] = await ethers.getSigners();
    const isDeployer = signer.address.toLowerCase() === this.deploymentData.deployer.toLowerCase();

    if (isDeployer) {
      console.log('1. ✅ You are the deployer - you can manage ownership');
      console.log('2. Consider transferring ownership to a multi-sig wallet');
      console.log('3. Set up monitoring and alerts');
      console.log('4. Verify contracts on Etherscan');
    } else {
      console.log('1. ⚠️  You are not the deployer');
      console.log('2. Contact the deployer to transfer ownership');
      console.log('3. Or use a multi-sig if ownership was transferred there');
    }

    console.log('4. Update frontend configuration with contract addresses');
    console.log('5. Test all contract interactions');
    console.log('6. Set up governance parameters');
  }
}

async function main() {
  const checker = new DeploymentChecker();
  
  console.log('🔍 Checking Deployment Status...\n');

  const hasDeploymentData = await checker.loadDeploymentData();
  
  await checker.checkNetworkStatus();
  await checker.checkWalletStatus();
  
  if (hasDeploymentData) {
    await checker.checkContractDeployments();
    await checker.generateOwnershipSummary();
  }
  
  await checker.suggestNextSteps();
}

// Export for use in other scripts
export { DeploymentChecker };

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}