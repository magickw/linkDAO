import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

export interface MultisigConfig {
  treasury: {
    address: string;
    signers: string[];
    threshold: number;
    purpose: string;
  };
  emergency: {
    address: string;
    signers: string[];
    threshold: number;
    purpose: string;
  };
  governance: {
    address: string;
    signers: string[];
    threshold: number;
    purpose: string;
  };
}

export interface OwnershipTransferPlan {
  contractName: string;
  currentOwner: string;
  targetMultisig: 'treasury' | 'emergency' | 'governance';
  targetAddress: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface TransferResult {
  contractName: string;
  success: boolean;
  transactionHash?: string;
  gasUsed?: number;
  error?: string;
  status: 'completed' | 'pending' | 'failed';
}

export class MultisigOwnershipManager {
  private signer: any;
  private network: string;
  private deploymentData: any;
  private multisigConfig: MultisigConfig;

  constructor(multisigConfig: MultisigConfig) {
    this.network = hre.network.name;
    this.multisigConfig = multisigConfig;
  }

  async initialize() {
    const [signer] = await ethers.getSigners();
    this.signer = signer;
    
    console.log('🔐 Multisig Ownership Transfer Manager');
    console.log('=====================================');
    console.log(`Network: ${this.network}`);
    console.log(`Deployer Address: ${signer.address}`);
    console.log(`Balance: ${ethers.formatEther(await signer.provider.getBalance(signer.address))} ETH\n`);

    // Load deployment data
    await this.loadDeploymentData();
    
    // Validate multisig configurations
    await this.validateMultisigConfigurations();
  }

  private async loadDeploymentData() {
    const possiblePaths = [
      path.join(__dirname, '..', `deployedAddresses-${this.network}.json`),
      path.join(__dirname, '..', 'deployedAddresses.json'),
      path.join(__dirname, '..', 'deployed-addresses-localhost.json')
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

  private async validateMultisigConfigurations() {
    console.log('🔍 Validating multisig configurations...\n');

    for (const [type, config] of Object.entries(this.multisigConfig)) {
      console.log(`📋 ${type.toUpperCase()} Multisig:`);
      console.log(`   Address: ${config.address}`);
      console.log(`   Signers: ${config.signers.length}`);
      console.log(`   Threshold: ${config.threshold}/${config.signers.length}`);
      console.log(`   Purpose: ${config.purpose}`);

      // Validate address format
      if (!ethers.isAddress(config.address)) {
        throw new Error(`Invalid ${type} multisig address: ${config.address}`);
      }

      // Validate threshold
      if (config.threshold > config.signers.length || config.threshold < 1) {
        throw new Error(`Invalid ${type} multisig threshold: ${config.threshold}/${config.signers.length}`);
      }

      // Validate signer addresses
      for (const signer of config.signers) {
        if (!ethers.isAddress(signer)) {
          throw new Error(`Invalid signer address in ${type} multisig: ${signer}`);
        }
      }

      // Check if multisig contract exists (optional)
      try {
        const code = await this.signer.provider.getCode(config.address);
        if (code === '0x') {
          console.log(`   ⚠️  Warning: No contract code at ${config.address} (EOA or not deployed)`);
        } else {
          console.log(`   ✅ Contract verified at address`);
        }
      } catch (error) {
        console.log(`   ⚠️  Could not verify contract at address`);
      }

      console.log('');
    }
  }

  generateOwnershipTransferPlan(): OwnershipTransferPlan[] {
    const plan: OwnershipTransferPlan[] = [];

    // Define ownership transfer strategy
    const ownershipStrategy = {
      // Treasury multisig handles financial contracts
      treasury: [
        'LDAOToken',
        'Marketplace', 
        'EnhancedEscrow',
        'PaymentRouter',
        'EnhancedRewardPool',
        'NFTMarketplace'
      ],
      // Emergency multisig handles security-critical contracts
      emergency: [
        'DisputeResolution',
        'ReputationSystem'
      ],
      // Governance multisig handles governance contracts
      governance: [
        'Governance'
      ]
    };

    // Create transfer plan based on strategy
    for (const [multisigType, contractNames] of Object.entries(ownershipStrategy)) {
      const multisigConfig = this.multisigConfig[multisigType as keyof MultisigConfig];
      
      for (const contractName of contractNames) {
        if (this.deploymentData[contractName]) {
          plan.push({
            contractName,
            currentOwner: this.signer.address, // Assuming deployer is current owner
            targetMultisig: multisigType as 'treasury' | 'emergency' | 'governance',
            targetAddress: multisigConfig.address,
            reason: `Transfer to ${multisigType} multisig for ${multisigConfig.purpose}`,
            priority: this.getTransferPriority(contractName)
          });
        }
      }
    }

    return plan;
  }

  private getTransferPriority(contractName: string): 'high' | 'medium' | 'low' {
    // High priority: Financial and security contracts
    const highPriority = ['LDAOToken', 'Marketplace', 'EnhancedEscrow', 'DisputeResolution'];
    
    // Medium priority: Governance and reputation
    const mediumPriority = ['Governance', 'ReputationSystem'];
    
    if (highPriority.includes(contractName)) return 'high';
    if (mediumPriority.includes(contractName)) return 'medium';
    return 'low';
  }

  async executeOwnershipTransferPlan(plan: OwnershipTransferPlan[]): Promise<TransferResult[]> {
    console.log('🚀 Executing ownership transfer plan...\n');
    
    const results: TransferResult[] = [];
    
    // Sort by priority (high first)
    const sortedPlan = plan.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    console.log(`📋 Transfer Plan (${sortedPlan.length} contracts):`);
    for (const item of sortedPlan) {
      console.log(`   ${item.priority.toUpperCase()}: ${item.contractName} → ${item.targetMultisig} multisig`);
    }
    console.log('');

    // Execute transfers
    for (const transferPlan of sortedPlan) {
      console.log(`🔄 Transferring ${transferPlan.contractName}...`);
      
      const result = await this.transferContractOwnership(transferPlan);
      results.push(result);
      
      if (result.success) {
        console.log(`   ✅ Success: ${result.transactionHash}`);
        console.log(`   ⛽ Gas used: ${result.gasUsed?.toLocaleString()}`);
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
      }
      
      console.log('');
      
      // Wait between transfers to avoid rate limiting
      await this.delay(3000);
    }

    return results;
  }

  private async transferContractOwnership(plan: OwnershipTransferPlan): Promise<TransferResult> {
    const result: TransferResult = {
      contractName: plan.contractName,
      success: false,
      status: 'failed'
    };

    try {
      // Get contract instance
      const contractAddress = this.deploymentData[plan.contractName];
      if (!contractAddress) {
        throw new Error(`Contract ${plan.contractName} not found in deployment data`);
      }

      const contract = await ethers.getContractAt(plan.contractName, contractAddress);
      
      // Verify current ownership
      if (!contract.owner) {
        throw new Error(`Contract ${plan.contractName} is not ownable`);
      }

      const currentOwner = await contract.owner();
      if (currentOwner.toLowerCase() !== this.signer.address.toLowerCase()) {
        throw new Error(`Not the current owner. Current: ${currentOwner}, Expected: ${this.signer.address}`);
      }

      // Execute transfer
      console.log(`   Current owner: ${currentOwner}`);
      console.log(`   New owner: ${plan.targetAddress}`);
      console.log(`   Reason: ${plan.reason}`);

      const tx = await contract.transferOwnership(plan.targetAddress);
      const receipt = await tx.wait();

      result.transactionHash = tx.hash;
      result.gasUsed = Number(receipt.gasUsed);
      result.success = true;

      // Check if it's a 2-step ownership transfer
      if (contract.pendingOwner) {
        const pendingOwner = await contract.pendingOwner();
        if (pendingOwner.toLowerCase() === plan.targetAddress.toLowerCase()) {
          result.status = 'pending';
          console.log(`   ⏳ 2-step transfer initiated. Multisig must accept ownership.`);
        } else {
          result.status = 'completed';
        }
      } else {
        // Verify immediate transfer
        const newOwner = await contract.owner();
        if (newOwner.toLowerCase() === plan.targetAddress.toLowerCase()) {
          result.status = 'completed';
        } else {
          throw new Error(`Transfer verification failed. Expected: ${plan.targetAddress}, Got: ${newOwner}`);
        }
      }

    } catch (error: any) {
      result.error = error.message;
      result.success = false;
      result.status = 'failed';
    }

    return result;
  }

  async validateMultisigTransactions(results: TransferResult[]): Promise<void> {
    console.log('🔍 Validating multisig transaction requirements...\n');

    const pendingTransfers = results.filter(r => r.status === 'pending');
    
    if (pendingTransfers.length === 0) {
      console.log('✅ No pending transfers requiring multisig acceptance');
      return;
    }

    console.log(`📋 Pending transfers requiring multisig acceptance: ${pendingTransfers.length}`);
    
    for (const result of pendingTransfers) {
      const contractAddress = this.deploymentData[result.contractName];
      const contract = await ethers.getContractAt(result.contractName, contractAddress);
      
      const pendingOwner = await contract.pendingOwner();
      const multisigType = this.getMultisigTypeByAddress(pendingOwner);
      
      console.log(`\n📋 ${result.contractName}:`);
      console.log(`   Contract: ${contractAddress}`);
      console.log(`   Pending Owner: ${pendingOwner}`);
      console.log(`   Multisig Type: ${multisigType}`);
      
      if (multisigType) {
        const config = this.multisigConfig[multisigType];
        console.log(`   Required Signatures: ${config.threshold}/${config.signers.length}`);
        console.log(`   Signers: ${config.signers.join(', ')}`);
      }
    }

    console.log('\n📝 Next Steps for Multisig Owners:');
    console.log('1. Each multisig must call acceptOwnership() for their assigned contracts');
    console.log('2. Ensure sufficient signers are available to meet threshold requirements');
    console.log('3. Test the acceptance process on testnet first');
    console.log('4. Document all ownership changes for audit trail');
  }

  private getMultisigTypeByAddress(address: string): keyof MultisigConfig | null {
    for (const [type, config] of Object.entries(this.multisigConfig)) {
      if (config.address.toLowerCase() === address.toLowerCase()) {
        return type as keyof MultisigConfig;
      }
    }
    return null;
  }

  generateOwnershipTransferReport(plan: OwnershipTransferPlan[], results: TransferResult[]): string {
    let report = '# Ownership Transfer Report\n\n';
    report += `**Network**: ${this.network}\n`;
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Deployer**: ${this.signer.address}\n\n`;

    // Executive Summary
    const successful = results.filter(r => r.success).length;
    const pending = results.filter(r => r.status === 'pending').length;
    const failed = results.filter(r => !r.success).length;
    const totalGasUsed = results.reduce((sum, r) => sum + (r.gasUsed || 0), 0);

    report += '## Executive Summary\n\n';
    report += `- **Total Contracts**: ${results.length}\n`;
    report += `- **Successful Transfers**: ${successful}\n`;
    report += `- **Pending Acceptance**: ${pending}\n`;
    report += `- **Failed Transfers**: ${failed}\n`;
    report += `- **Total Gas Used**: ${totalGasUsed.toLocaleString()}\n\n`;

    // Multisig Configuration
    report += '## Multisig Configuration\n\n';
    for (const [type, config] of Object.entries(this.multisigConfig)) {
      report += `### ${type.toUpperCase()} Multisig\n\n`;
      report += `- **Address**: \`${config.address}\`\n`;
      report += `- **Threshold**: ${config.threshold}/${config.signers.length}\n`;
      report += `- **Purpose**: ${config.purpose}\n`;
      report += `- **Signers**:\n`;
      for (const signer of config.signers) {
        report += `  - \`${signer}\`\n`;
      }
      report += '\n';
    }

    // Transfer Results
    report += '## Transfer Results\n\n';
    report += '| Contract | Target Multisig | Status | Transaction | Gas Used |\n';
    report += '|----------|----------------|--------|-------------|----------|\n';

    for (const result of results) {
      const planItem = plan.find(p => p.contractName === result.contractName);
      const targetMultisig = planItem?.targetMultisig || 'Unknown';
      const status = result.success ? 
        (result.status === 'pending' ? '⏳ Pending' : '✅ Complete') : 
        '❌ Failed';
      const txHash = result.transactionHash ? 
        `[${result.transactionHash.slice(0, 8)}...](https://etherscan.io/tx/${result.transactionHash})` : 
        'N/A';
      const gasUsed = result.gasUsed ? result.gasUsed.toLocaleString() : 'N/A';

      report += `| ${result.contractName} | ${targetMultisig} | ${status} | ${txHash} | ${gasUsed} |\n`;
    }

    report += '\n';

    // Failed Transfers
    const failedResults = results.filter(r => !r.success);
    if (failedResults.length > 0) {
      report += '## Failed Transfers\n\n';
      for (const result of failedResults) {
        report += `### ${result.contractName}\n\n`;
        report += `**Error**: ${result.error}\n\n`;
        report += '**Possible Solutions**:\n';
        report += '- Verify you are the current owner\n';
        report += '- Check multisig address is correct\n';
        report += '- Ensure sufficient gas limit\n';
        report += '- Try again after network congestion clears\n\n';
      }
    }

    // Pending Transfers
    const pendingResults = results.filter(r => r.status === 'pending');
    if (pendingResults.length > 0) {
      report += '## Pending Transfers (Require Multisig Acceptance)\n\n';
      for (const result of pendingResults) {
        const planItem = plan.find(p => p.contractName === result.contractName);
        const multisigType = planItem?.targetMultisig;
        const config = multisigType ? this.multisigConfig[multisigType] : null;

        report += `### ${result.contractName}\n\n`;
        report += `**Contract Address**: \`${this.deploymentData[result.contractName]}\`\n`;
        report += `**Multisig Address**: \`${planItem?.targetAddress}\`\n`;
        report += `**Required Signatures**: ${config?.threshold}/${config?.signers.length}\n\n`;
        report += '**Action Required**: Multisig owners must call `acceptOwnership()` function\n\n';
      }
    }

    // Security Recommendations
    report += '## Security Recommendations\n\n';
    report += '1. **Verify Multisig Setup**: Ensure all multisig wallets are properly configured\n';
    report += '2. **Test Acceptance**: Test ownership acceptance on testnet first\n';
    report += '3. **Backup Plans**: Have emergency procedures for ownership recovery\n';
    report += '4. **Documentation**: Maintain detailed records of all ownership changes\n';
    report += '5. **Regular Audits**: Review ownership structure periodically\n';
    report += '6. **Signer Security**: Ensure multisig signers use hardware wallets\n\n';

    return report;
  }

  async saveTransferReport(plan: OwnershipTransferPlan[], results: TransferResult[]) {
    const report = this.generateOwnershipTransferReport(plan, results);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ownership-transfer-${this.network}-${timestamp}.md`;
    const reportsDir = path.join(__dirname, '..', 'reports');
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filepath = path.join(reportsDir, filename);
    fs.writeFileSync(filepath, report);
    
    // Also save raw data as JSON
    const dataFilename = `ownership-transfer-data-${this.network}-${timestamp}.json`;
    const dataFilepath = path.join(reportsDir, dataFilename);
    fs.writeFileSync(dataFilepath, JSON.stringify({ plan, results }, null, 2));

    console.log(`📄 Transfer report saved to: ${filename}`);
    console.log(`📊 Transfer data saved to: ${dataFilename}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Load multisig configuration from file or environment
export function loadMultisigConfig(): MultisigConfig {
  const configPath = path.join(__dirname, '..', 'multisig-config.json');
  
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  // Fallback to environment variables
  return {
    treasury: {
      address: process.env.TREASURY_MULTISIG_ADDRESS || '',
      signers: (process.env.TREASURY_SIGNERS || '').split(',').filter(Boolean),
      threshold: parseInt(process.env.TREASURY_THRESHOLD || '2'),
      purpose: 'Treasury management and fee collection'
    },
    emergency: {
      address: process.env.EMERGENCY_MULTISIG_ADDRESS || '',
      signers: (process.env.EMERGENCY_SIGNERS || '').split(',').filter(Boolean),
      threshold: parseInt(process.env.EMERGENCY_THRESHOLD || '2'),
      purpose: 'Emergency response and incident management'
    },
    governance: {
      address: process.env.GOVERNANCE_MULTISIG_ADDRESS || '',
      signers: (process.env.GOVERNANCE_SIGNERS || '').split(',').filter(Boolean),
      threshold: parseInt(process.env.GOVERNANCE_THRESHOLD || '3'),
      purpose: 'Governance and protocol upgrades'
    }
  };
}

// Main execution function
export async function executeMultisigOwnershipTransfer() {
  try {
    console.log('🔐 Starting multisig ownership transfer process...\n');

    // Load configuration
    const multisigConfig = loadMultisigConfig();
    
    // Validate configuration
    for (const [type, config] of Object.entries(multisigConfig)) {
      if (!config.address || !ethers.isAddress(config.address)) {
        throw new Error(`Invalid ${type} multisig address: ${config.address}`);
      }
      if (config.signers.length === 0) {
        throw new Error(`No signers configured for ${type} multisig`);
      }
    }

    // Initialize manager
    const manager = new MultisigOwnershipManager(multisigConfig);
    await manager.initialize();

    // Generate transfer plan
    const plan = manager.generateOwnershipTransferPlan();
    console.log(`📋 Generated transfer plan for ${plan.length} contracts\n`);

    // Execute transfers
    const results = await manager.executeOwnershipTransferPlan(plan);

    // Validate multisig requirements
    await manager.validateMultisigTransactions(results);

    // Generate and save report
    await manager.saveTransferReport(plan, results);

    // Summary
    const successful = results.filter(r => r.success).length;
    const total = results.length;

    console.log(`\n📊 Transfer Summary:`);
    console.log(`✅ Successful: ${successful}/${total}`);
    console.log(`⏳ Pending: ${results.filter(r => r.status === 'pending').length}`);
    console.log(`❌ Failed: ${results.filter(r => !r.success).length}`);

    if (successful === total) {
      console.log('\n🎉 All ownership transfers completed successfully!');
    } else {
      console.log('\n⚠️ Some transfers require attention. Check the report for details.');
    }

    return results;

  } catch (error) {
    console.error('❌ Multisig ownership transfer failed:', error);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  executeMultisigOwnershipTransfer()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}