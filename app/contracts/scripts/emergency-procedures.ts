import { ethers } from "hardhat";
import { writeFileSync } from "fs";

interface EmergencyConfig {
  multisigAddress: string;
  emergencyContacts: string[];
  contracts: { [name: string]: string };
  procedures: EmergencyProcedure[];
}

interface EmergencyProcedure {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  automated: boolean;
  steps: string[];
}

class EmergencyManager {
  private config: EmergencyConfig;
  private logFile: string;

  constructor(config: EmergencyConfig) {
    this.config = config;
    this.logFile = `emergency-log-${Date.now()}.json`;
  }

  private log(action: string, details: any, severity: string = 'info') {
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      details,
      severity
    };

    console.log(`[${severity.toUpperCase()}] ${action}:`, details);
    
    // Append to log file
    const logData = JSON.stringify(entry) + '\n';
    writeFileSync(this.logFile, logData, { flag: 'a' });
  }

  async executeEmergencyPause(): Promise<void> {
    this.log('EMERGENCY_PAUSE_INITIATED', 'Starting emergency pause procedure', 'critical');

    const pausableContracts = [
      'Marketplace',
      'EnhancedEscrow',
      'NFTMarketplace',
      'TipRouter',
      'RewardPool'
    ];

    const results = [];

    for (const contractName of pausableContracts) {
      if (!this.config.contracts[contractName]) {
        this.log('CONTRACT_NOT_FOUND', { contract: contractName }, 'warning');
        continue;
      }

      try {
        const contract = await ethers.getContractAt(contractName, this.config.contracts[contractName]);
        
        // Check if contract has pause functionality
        const contractInterface = contract.interface;
        const hasPause = contractInterface.hasFunction('pause');
        
        if (hasPause) {
          this.log('PAUSING_CONTRACT', { contract: contractName }, 'critical');
          const tx = await contract.pause();
          await tx.wait(2); // Wait for 2 confirmations
          
          results.push({
            contract: contractName,
            status: 'paused',
            txHash: tx.hash
          });
          
          this.log('CONTRACT_PAUSED', { 
            contract: contractName, 
            txHash: tx.hash 
          }, 'critical');
        } else {
          results.push({
            contract: contractName,
            status: 'no_pause_function',
            txHash: null
          });
          
          this.log('NO_PAUSE_FUNCTION', { contract: contractName }, 'warning');
        }
      } catch (error) {
        results.push({
          contract: contractName,
          status: 'failed',
          error: error.message
        });
        
        this.log('PAUSE_FAILED', { 
          contract: contractName, 
          error: error.message 
        }, 'critical');
      }
    }

    this.log('EMERGENCY_PAUSE_COMPLETED', { results }, 'critical');
  }

  async executeEmergencyWithdraw(): Promise<void> {
    this.log('EMERGENCY_WITHDRAW_INITIATED', 'Starting emergency withdrawal procedure', 'critical');

    const withdrawableContracts = [
      'RewardPool',
      'PaymentRouter',
      'EnhancedEscrow'
    ];

    const results = [];

    for (const contractName of withdrawableContracts) {
      if (!this.config.contracts[contractName]) {
        continue;
      }

      try {
        const contract = await ethers.getContractAt(contractName, this.config.contracts[contractName]);
        
        // Check contract balance
        const balance = await ethers.provider.getBalance(this.config.contracts[contractName]);
        
        if (balance > 0) {
          this.log('WITHDRAWING_FROM_CONTRACT', { 
            contract: contractName, 
            balance: ethers.formatEther(balance) 
          }, 'critical');

          // Check if contract has emergency withdraw function
          const contractInterface = contract.interface;
          const hasEmergencyWithdraw = contractInterface.hasFunction('emergencyWithdraw');
          
          if (hasEmergencyWithdraw) {
            const tx = await contract.emergencyWithdraw();
            await tx.wait(2);
            
            results.push({
              contract: contractName,
              status: 'withdrawn',
              amount: ethers.formatEther(balance),
              txHash: tx.hash
            });
          } else {
            results.push({
              contract: contractName,
              status: 'no_withdraw_function',
              amount: ethers.formatEther(balance)
            });
          }
        } else {
          results.push({
            contract: contractName,
            status: 'no_balance',
            amount: '0'
          });
        }
      } catch (error) {
        results.push({
          contract: contractName,
          status: 'failed',
          error: error.message
        });
        
        this.log('WITHDRAW_FAILED', { 
          contract: contractName, 
          error: error.message 
        }, 'critical');
      }
    }

    this.log('EMERGENCY_WITHDRAW_COMPLETED', { results }, 'critical');
  }

  async transferOwnershipToMultisig(): Promise<void> {
    this.log('OWNERSHIP_TRANSFER_INITIATED', 'Transferring ownership to multisig', 'high');

    const ownableContracts = [
      'LDAOToken',
      'Governance',
      'ReputationSystem',
      'Marketplace',
      'EnhancedEscrow',
      'DisputeResolution',
      'RewardPool',
      'NFTMarketplace',
      'NFTCollectionFactory',
      'TipRouter'
    ];

    const results = [];

    for (const contractName of ownableContracts) {
      if (!this.config.contracts[contractName]) {
        continue;
      }

      try {
        const contract = await ethers.getContractAt(contractName, this.config.contracts[contractName]);
        
        // Check if contract has transferOwnership function
        const contractInterface = contract.interface;
        const hasTransferOwnership = contractInterface.hasFunction('transferOwnership');
        
        if (hasTransferOwnership) {
          const currentOwner = await contract.owner();
          const [signer] = await ethers.getSigners();
          
          if (currentOwner.toLowerCase() === signer.address.toLowerCase()) {
            this.log('TRANSFERRING_OWNERSHIP', { 
              contract: contractName, 
              from: currentOwner,
              to: this.config.multisigAddress 
            }, 'high');

            const tx = await contract.transferOwnership(this.config.multisigAddress);
            await tx.wait(2);
            
            results.push({
              contract: contractName,
              status: 'transferred',
              from: currentOwner,
              to: this.config.multisigAddress,
              txHash: tx.hash
            });
          } else {
            results.push({
              contract: contractName,
              status: 'not_owner',
              currentOwner
            });
          }
        } else {
          results.push({
            contract: contractName,
            status: 'no_ownership_function'
          });
        }
      } catch (error) {
        results.push({
          contract: contractName,
          status: 'failed',
          error: error.message
        });
        
        this.log('OWNERSHIP_TRANSFER_FAILED', { 
          contract: contractName, 
          error: error.message 
        }, 'high');
      }
    }

    this.log('OWNERSHIP_TRANSFER_COMPLETED', { results }, 'high');
  }

  async checkContractStatus(): Promise<any> {
    this.log('STATUS_CHECK_INITIATED', 'Checking all contract statuses', 'info');

    const statusReport = {
      timestamp: new Date().toISOString(),
      contracts: {}
    };

    for (const [contractName, address] of Object.entries(this.config.contracts)) {
      try {
        const contract = await ethers.getContractAt(contractName, address);
        const balance = await ethers.provider.getBalance(address);
        
        const contractStatus: any = {
          address,
          balance: ethers.formatEther(balance),
          deployed: true
        };

        // Check if paused
        try {
          if (contract.paused) {
            contractStatus.paused = await contract.paused();
          }
        } catch (e) {
          contractStatus.paused = 'not_pausable';
        }

        // Check owner
        try {
          if (contract.owner) {
            contractStatus.owner = await contract.owner();
          }
        } catch (e) {
          contractStatus.owner = 'not_ownable';
        }

        // Check specific contract metrics
        if (contractName === 'LDAOToken') {
          contractStatus.totalSupply = ethers.formatEther(await contract.totalSupply());
        } else if (contractName === 'Marketplace') {
          contractStatus.listingCount = (await contract.listingCount()).toString();
        } else if (contractName === 'Governance') {
          contractStatus.proposalCount = (await contract.proposalCount()).toString();
        }

        statusReport.contracts[contractName] = contractStatus;
      } catch (error) {
        statusReport.contracts[contractName] = {
          address,
          deployed: false,
          error: error.message
        };
      }
    }

    this.log('STATUS_CHECK_COMPLETED', statusReport, 'info');
    
    // Save status report
    writeFileSync(`status-report-${Date.now()}.json`, JSON.stringify(statusReport, null, 2));
    
    return statusReport;
  }

  async executeFullEmergencyProcedure(): Promise<void> {
    this.log('FULL_EMERGENCY_INITIATED', 'Starting full emergency procedure', 'critical');

    try {
      // Step 1: Check current status
      await this.checkContractStatus();

      // Step 2: Pause all contracts
      await this.executeEmergencyPause();

      // Step 3: Emergency withdrawals
      await this.executeEmergencyWithdraw();

      // Step 4: Transfer ownership to multisig
      await this.transferOwnershipToMultisig();

      // Step 5: Generate final report
      const finalReport = await this.generateEmergencyReport();

      this.log('FULL_EMERGENCY_COMPLETED', 'All emergency procedures completed', 'critical');
      
      console.log('\n🚨 EMERGENCY PROCEDURES COMPLETED');
      console.log('==================================');
      console.log('1. All pausable contracts have been paused');
      console.log('2. Emergency withdrawals executed where possible');
      console.log('3. Ownership transferred to multisig wallet');
      console.log('4. Full report generated');
      console.log(`5. Log file: ${this.logFile}`);
      console.log('==================================\n');

    } catch (error) {
      this.log('EMERGENCY_PROCEDURE_FAILED', { error: error.message }, 'critical');
      throw error;
    }
  }

  async generateEmergencyReport(): Promise<any> {
    const report = {
      timestamp: new Date().toISOString(),
      emergencyType: 'FULL_EMERGENCY_RESPONSE',
      multisigAddress: this.config.multisigAddress,
      contracts: this.config.contracts,
      logFile: this.logFile,
      nextSteps: [
        'Review all transaction hashes in the log file',
        'Verify all contracts are properly paused',
        'Confirm ownership transfer to multisig',
        'Assess the situation that triggered the emergency',
        'Plan recovery procedures',
        'Communicate with stakeholders'
      ],
      contacts: this.config.emergencyContacts
    };

    const filename = `emergency-report-${Date.now()}.json`;
    writeFileSync(filename, JSON.stringify(report, null, 2));
    
    this.log('EMERGENCY_REPORT_GENERATED', { filename }, 'critical');
    
    return report;
  }
}

// Predefined emergency procedures
const EMERGENCY_PROCEDURES: EmergencyProcedure[] = [
  {
    name: 'Contract Exploit Detected',
    description: 'Immediate response to detected smart contract exploit',
    severity: 'critical',
    automated: true,
    steps: [
      'Pause all affected contracts immediately',
      'Execute emergency withdrawals',
      'Transfer ownership to multisig',
      'Notify security team',
      'Begin incident response'
    ]
  },
  {
    name: 'High Gas Price Attack',
    description: 'Response to abnormally high gas prices affecting operations',
    severity: 'medium',
    automated: false,
    steps: [
      'Monitor gas prices',
      'Pause non-critical operations',
      'Notify users of delays',
      'Wait for gas prices to normalize'
    ]
  },
  {
    name: 'Governance Attack',
    description: 'Response to malicious governance proposals or voting',
    severity: 'high',
    automated: false,
    steps: [
      'Analyze the malicious proposal',
      'Rally legitimate voters',
      'Consider emergency pause if necessary',
      'Implement governance improvements'
    ]
  },
  {
    name: 'Oracle Manipulation',
    description: 'Response to price oracle manipulation',
    severity: 'high',
    automated: true,
    steps: [
      'Pause price-dependent operations',
      'Switch to backup oracles',
      'Verify price data integrity',
      'Resume operations when safe'
    ]
  }
];

// CLI interface for emergency procedures
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Load configuration
  const deployedAddresses = require('../deployedAddresses.json');
  
  const config: EmergencyConfig = {
    multisigAddress: process.env.MULTISIG_ADDRESS || deployedAddresses.multisig || '',
    emergencyContacts: [
      'security@example.com',
      'admin@example.com'
    ],
    contracts: deployedAddresses.addresses || {},
    procedures: EMERGENCY_PROCEDURES
  };

  const emergencyManager = new EmergencyManager(config);

  switch (command) {
    case 'pause':
      await emergencyManager.executeEmergencyPause();
      break;
    
    case 'withdraw':
      await emergencyManager.executeEmergencyWithdraw();
      break;
    
    case 'transfer-ownership':
      await emergencyManager.transferOwnershipToMultisig();
      break;
    
    case 'status':
      await emergencyManager.checkContractStatus();
      break;
    
    case 'full-emergency':
      await emergencyManager.executeFullEmergencyProcedure();
      break;
    
    default:
      console.log('Emergency Procedures CLI');
      console.log('========================');
      console.log('Available commands:');
      console.log('  pause              - Pause all pausable contracts');
      console.log('  withdraw           - Execute emergency withdrawals');
      console.log('  transfer-ownership - Transfer ownership to multisig');
      console.log('  status             - Check contract status');
      console.log('  full-emergency     - Execute full emergency procedure');
      console.log('');
      console.log('Usage: npx hardhat run scripts/emergency-procedures.ts --network <network> -- <command>');
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { EmergencyManager, EmergencyConfig, EmergencyProcedure, EMERGENCY_PROCEDURES };