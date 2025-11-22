import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

interface OwnershipInfo {
  contractName: string;
  address: string;
  currentOwner: string;
  pendingOwner?: string;
  isOwnable: boolean;
  isOwnable2Step: boolean;
  canTransfer: boolean;
  canAccept: boolean;
}

class OwnershipManager {
  private signer: any;
  private network: string;
  private deploymentData: any;

  constructor() {
    this.network = hre.network.name;
  }

  async initialize() {
    const [signer] = await ethers.getSigners();
    this.signer = signer;
    
    console.log('👑 Ownership Manager');
    console.log('===================');
    console.log(`Network: ${this.network}`);
    console.log(`Your Address: ${signer.address}`);
    console.log(`Balance: ${ethers.formatEther(await signer.getBalance())} ETH\n`);

    // Load deployment data
    await this.loadDeploymentData();
  }

  private async loadDeploymentData() {
    const possiblePaths = [
      path.join(__dirname, '..', `deployedAddresses-${this.network}.json`),
      path.join(__dirname, '..', 'deployedAddresses.json')
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        this.deploymentData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`📄 Loaded deployment data from: ${path.basename(filePath)}`);
        return;
      }
    }

    throw new Error('❌ No deployment data found. Deploy contracts first.');
  }

  async analyzeOwnership(): Promise<OwnershipInfo[]> {
    console.log('🔍 Analyzing contract ownership...\n');
    
    const ownershipInfo: OwnershipInfo[] = [];

    for (const [contractName, contractData] of Object.entries(this.deploymentData.contracts)) {
      const info = await this.analyzeContractOwnership(contractName, contractData as any);
      ownershipInfo.push(info);
    }

    return ownershipInfo;
  }

  private async analyzeContractOwnership(contractName: string, contractData: any): Promise<OwnershipInfo> {
    const info: OwnershipInfo = {
      contractName,
      address: contractData.address,
      currentOwner: '',
      isOwnable: false,
      isOwnable2Step: false,
      canTransfer: false,
      canAccept: false
    };

    try {
      const contract = await ethers.getContractAt(contractName, contractData.address);
      
      // Check if contract has owner function
      if (contract.owner) {
        info.isOwnable = true;
        info.currentOwner = await contract.owner();
        info.canTransfer = info.currentOwner.toLowerCase() === this.signer.address.toLowerCase();
        
        console.log(`📋 ${contractName}`);
        console.log(`   Address: ${info.address}`);
        console.log(`   Owner: ${info.currentOwner}`);
        console.log(`   You can transfer: ${info.canTransfer ? '✅' : '❌'}`);

        // Check if it's Ownable2Step
        if (contract.pendingOwner) {
          info.isOwnable2Step = true;
          try {
            info.pendingOwner = await contract.pendingOwner();
            info.canAccept = info.pendingOwner?.toLowerCase() === this.signer.address.toLowerCase();
            
            if (info.pendingOwner !== ethers.constants.AddressZero) {
              console.log(`   Pending Owner: ${info.pendingOwner}`);
              console.log(`   You can accept: ${info.canAccept ? '✅' : '❌'}`);
            }
          } catch (error) {
            // Ignore if pendingOwner call fails
          }
        }
      } else {
        console.log(`📋 ${contractName}`);
        console.log(`   Address: ${info.address}`);
        console.log(`   Owner: Not Ownable`);
      }
      
      console.log(''); // Empty line for readability

    } catch (error) {
      console.log(`❌ Error analyzing ${contractName}:`, error.message);
    }

    return info;
  }

  async transferOwnership(contractName: string, newOwner: string): Promise<boolean> {
    try {
      const contractData = this.deploymentData.contracts[contractName];
      if (!contractData) {
        throw new Error(`Contract ${contractName} not found in deployment data`);
      }

      const contract = await ethers.getContractAt(contractName, contractData.address);
      
      // Verify current ownership
      const currentOwner = await contract.owner();
      if (currentOwner.toLowerCase() !== this.signer.address.toLowerCase()) {
        throw new Error(`You are not the current owner. Current owner: ${currentOwner}`);
      }

      console.log(`🔄 Transferring ${contractName} ownership to ${newOwner}...`);
      
      const tx = await contract.transferOwnership(newOwner);
      console.log(`   Transaction: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
      
      // Check if it's Ownable2Step
      if (contract.pendingOwner) {
        const pendingOwner = await contract.pendingOwner();
        console.log(`✅ Ownership transfer initiated. Pending owner: ${pendingOwner}`);
        console.log(`⚠️  New owner must call acceptOwnership() to complete the transfer`);
      } else {
        const newCurrentOwner = await contract.owner();
        console.log(`✅ Ownership transferred successfully. New owner: ${newCurrentOwner}`);
      }

      return true;

    } catch (error) {
      console.error(`❌ Failed to transfer ownership:`, error.message);
      return false;
    }
  }

  async acceptOwnership(contractName: string): Promise<boolean> {
    try {
      const contractData = this.deploymentData.contracts[contractName];
      if (!contractData) {
        throw new Error(`Contract ${contractName} not found in deployment data`);
      }

      const contract = await ethers.getContractAt(contractName, contractData.address);
      
      if (!contract.acceptOwnership) {
        throw new Error(`Contract ${contractName} does not support Ownable2Step`);
      }

      // Verify pending ownership
      const pendingOwner = await contract.pendingOwner();
      if (pendingOwner.toLowerCase() !== this.signer.address.toLowerCase()) {
        throw new Error(`You are not the pending owner. Pending owner: ${pendingOwner}`);
      }

      console.log(`✅ Accepting ownership of ${contractName}...`);
      
      const tx = await contract.acceptOwnership();
      console.log(`   Transaction: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
      
      const newOwner = await contract.owner();
      console.log(`✅ Ownership accepted successfully. New owner: ${newOwner}`);

      return true;

    } catch (error) {
      console.error(`❌ Failed to accept ownership:`, error.message);
      return false;
    }
  }

  async transferAllToMultiSig(multiSigAddress: string): Promise<void> {
    console.log(`🔐 Transferring all contracts to multi-sig: ${multiSigAddress}\n`);
    
    const ownershipInfo = await this.analyzeOwnership();
    const transferableContracts = ownershipInfo.filter(info => info.canTransfer);

    if (transferableContracts.length === 0) {
      console.log('❌ No contracts available for transfer');
      return;
    }

    console.log(`📋 Found ${transferableContracts.length} contracts to transfer:\n`);
    
    for (const info of transferableContracts) {
      console.log(`   - ${info.contractName} (${info.address})`);
    }

    console.log('\n🚀 Starting transfers...\n');

    let successCount = 0;
    for (const info of transferableContracts) {
      const success = await this.transferOwnership(info.contractName, multiSigAddress);
      if (success) {
        successCount++;
      }
      
      // Wait between transfers to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n📊 Transfer Summary:`);
    console.log(`   Successful: ${successCount}/${transferableContracts.length}`);
    console.log(`   Failed: ${transferableContracts.length - successCount}/${transferableContracts.length}`);

    if (successCount === transferableContracts.length) {
      console.log(`\n✅ All contracts successfully transferred to multi-sig!`);
    } else {
      console.log(`\n⚠️  Some transfers failed. Check the logs above for details.`);
    }
  }

  async acceptAllPendingOwnership(): Promise<void> {
    console.log(`✅ Accepting all pending ownership transfers...\n`);
    
    const ownershipInfo = await this.analyzeOwnership();
    const acceptableContracts = ownershipInfo.filter(info => info.canAccept);

    if (acceptableContracts.length === 0) {
      console.log('❌ No pending ownership transfers to accept');
      return;
    }

    console.log(`📋 Found ${acceptableContracts.length} contracts with pending ownership:\n`);
    
    for (const info of acceptableContracts) {
      console.log(`   - ${info.contractName} (${info.address})`);
    }

    console.log('\n🚀 Accepting ownership...\n');

    let successCount = 0;
    for (const info of acceptableContracts) {
      const success = await this.acceptOwnership(info.contractName);
      if (success) {
        successCount++;
      }
      
      // Wait between accepts to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n📊 Acceptance Summary:`);
    console.log(`   Successful: ${successCount}/${acceptableContracts.length}`);
    console.log(`   Failed: ${acceptableContracts.length - successCount}/${acceptableContracts.length}`);
  }

  async generateOwnershipReport(): Promise<string> {
    const ownershipInfo = await this.analyzeOwnership();
    
    let report = '# Contract Ownership Report\n\n';
    report += `**Network**: ${this.network}\n`;
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Your Address**: ${this.signer.address}\n\n`;

    // Summary
    const ownableContracts = ownershipInfo.filter(info => info.isOwnable);
    const ownedByYou = ownershipInfo.filter(info => info.canTransfer);
    const pendingForYou = ownershipInfo.filter(info => info.canAccept);

    report += '## Summary\n\n';
    report += `- Total Contracts: ${ownershipInfo.length}\n`;
    report += `- Ownable Contracts: ${ownableContracts.length}\n`;
    report += `- Owned by You: ${ownedByYou.length}\n`;
    report += `- Pending for You: ${pendingForYou.length}\n\n`;

    // Detailed breakdown
    report += '## Contract Details\n\n';
    report += '| Contract | Address | Current Owner | Status |\n';
    report += '|----------|---------|---------------|--------|\n';

    for (const info of ownershipInfo) {
      let status = 'Not Ownable';
      if (info.isOwnable) {
        if (info.canTransfer) {
          status = '✅ You Own';
        } else if (info.canAccept) {
          status = '⏳ Pending';
        } else {
          status = '❌ Other Owner';
        }
      }

      const shortAddress = `${info.address.slice(0, 6)}...${info.address.slice(-4)}`;
      const shortOwner = info.currentOwner ? `${info.currentOwner.slice(0, 6)}...${info.currentOwner.slice(-4)}` : 'N/A';
      
      report += `| ${info.contractName} | ${shortAddress} | ${shortOwner} | ${status} |\n`;
    }

    report += '\n';

    // Action items
    if (ownedByYou.length > 0) {
      report += '## Action Items\n\n';
      report += '### Contracts You Own\n\n';
      report += 'Consider transferring these to a multi-sig wallet for security:\n\n';
      
      for (const info of ownedByYou) {
        report += `- **${info.contractName}**: ${info.address}\n`;
      }
      report += '\n';
    }

    if (pendingForYou.length > 0) {
      report += '### Pending Ownership Transfers\n\n';
      report += 'You can accept ownership of these contracts:\n\n';
      
      for (const info of pendingForYou) {
        report += `- **${info.contractName}**: ${info.address}\n`;
      }
      report += '\n';
      report += 'Run: `npm run ownership:accept-all` to accept all pending transfers.\n\n';
    }

    // Recommendations
    report += '## Security Recommendations\n\n';
    report += '1. **Use Multi-Sig Wallets**: Transfer ownership to multi-sig for production\n';
    report += '2. **Test on Testnet**: Always test ownership transfers on testnet first\n';
    report += '3. **Document Changes**: Keep records of all ownership transfers\n';
    report += '4. **Emergency Procedures**: Ensure emergency contacts have access\n';
    report += '5. **Regular Audits**: Review ownership structure regularly\n\n';

    return report;
  }

  async saveOwnershipReport() {
    const report = await this.generateOwnershipReport();
    const filename = `ownership-report-${this.network}-${Date.now()}.md`;
    const filepath = path.join(__dirname, '..', 'reports', filename);
    
    // Create reports directory if it doesn't exist
    const reportsDir = path.dirname(filepath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(filepath, report);
    console.log(`📄 Ownership report saved to: ${filename}`);
  }
}

// CLI Commands
async function analyzeOwnership() {
  const manager = new OwnershipManager();
  await manager.initialize();
  
  const ownershipInfo = await manager.analyzeOwnership();
  await manager.saveOwnershipReport();
  
  return ownershipInfo;
}

async function transferToMultiSig(multiSigAddress: string) {
  if (!ethers.isAddress(multiSigAddress)) {
    throw new Error('Invalid multi-sig address');
  }

  const manager = new OwnershipManager();
  await manager.initialize();
  
  await manager.transferAllToMultiSig(multiSigAddress);
}

async function acceptAllPending() {
  const manager = new OwnershipManager();
  await manager.initialize();
  
  await manager.acceptAllPendingOwnership();
}

async function transferSingleContract(contractName: string, newOwner: string) {
  if (!ethers.isAddress(newOwner)) {
    throw new Error('Invalid new owner address');
  }

  const manager = new OwnershipManager();
  await manager.initialize();
  
  await manager.transferOwnership(contractName, newOwner);
}

async function acceptSingleContract(contractName: string) {
  const manager = new OwnershipManager();
  await manager.initialize();
  
  await manager.acceptOwnership(contractName);
}

// Main function for CLI usage
async function main() {
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];

  try {
    switch (command) {
      case 'analyze':
        await analyzeOwnership();
        break;
        
      case 'transfer-all':
        if (!arg1) {
          throw new Error('Multi-sig address required: npm run ownership:transfer-all 0x...');
        }
        await transferToMultiSig(arg1);
        break;
        
      case 'accept-all':
        await acceptAllPending();
        break;
        
      case 'transfer':
        if (!arg1 || !arg2) {
          throw new Error('Usage: npm run ownership:transfer ContractName 0x...');
        }
        await transferSingleContract(arg1, arg2);
        break;
        
      case 'accept':
        if (!arg1) {
          throw new Error('Contract name required: npm run ownership:accept ContractName');
        }
        await acceptSingleContract(arg1);
        break;
        
      default:
        console.log('📋 Available commands:');
        console.log('  analyze           - Check ownership status of all contracts');
        console.log('  transfer-all <addr> - Transfer all contracts to multi-sig');
        console.log('  accept-all        - Accept all pending ownership transfers');
        console.log('  transfer <name> <addr> - Transfer specific contract');
        console.log('  accept <name>     - Accept specific contract ownership');
        console.log('');
        console.log('Examples:');
        console.log('  npm run ownership:analyze');
        console.log('  npm run ownership:transfer-all 0x1234567890123456789012345678901234567890');
        console.log('  npm run ownership:accept-all');
        console.log('  npm run ownership:transfer LDAOToken 0x1234567890123456789012345678901234567890');
        console.log('  npm run ownership:accept LDAOToken');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Export functions for use in other scripts
export {
  OwnershipManager,
  analyzeOwnership,
  transferToMultiSig,
  acceptAllPending,
  transferSingleContract,
  acceptSingleContract
};

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}