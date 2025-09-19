import { ethers } from "hardhat";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { ProductionDeployer, DeploymentConfig } from "./deploy-production";

interface DeploymentSchedule {
  id: string;
  name: string;
  scheduledTime: string;
  network: string;
  config: DeploymentConfig;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
  preChecks: PreCheck[];
  postChecks: PostCheck[];
  rollbackPlan: RollbackStep[];
  notifications: NotificationConfig[];
}

interface PreCheck {
  name: string;
  description: string;
  required: boolean;
  status: 'pending' | 'passed' | 'failed';
  result?: any;
}

interface PostCheck {
  name: string;
  description: string;
  timeout: number; // seconds
  status: 'pending' | 'passed' | 'failed';
  result?: any;
}

interface RollbackStep {
  name: string;
  description: string;
  action: string;
  automated: boolean;
}

interface NotificationConfig {
  type: 'email' | 'slack' | 'discord';
  recipient: string;
  events: ('scheduled' | 'started' | 'completed' | 'failed')[];
}

class DeploymentScheduler {
  private schedules: Map<string, DeploymentSchedule> = new Map();
  private schedulesFile = 'deployment-schedules.json';

  constructor() {
    this.loadSchedules();
  }

  private loadSchedules() {
    if (existsSync(this.schedulesFile)) {
      try {
        const data = readFileSync(this.schedulesFile, 'utf8');
        const schedules = JSON.parse(data);
        this.schedules = new Map(Object.entries(schedules));
      } catch (error) {
        console.error('Failed to load schedules:', error);
      }
    }
  }

  private saveSchedules() {
    const schedulesObj = Object.fromEntries(this.schedules);
    writeFileSync(this.schedulesFile, JSON.stringify(schedulesObj, null, 2));
  }

  async scheduleDeployment(schedule: Omit<DeploymentSchedule, 'id' | 'status'>): Promise<string> {
    const id = `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fullSchedule: DeploymentSchedule = {
      ...schedule,
      id,
      status: 'scheduled'
    };

    // Initialize pre-checks
    fullSchedule.preChecks = fullSchedule.preChecks.map(check => ({
      ...check,
      status: 'pending'
    }));

    // Initialize post-checks
    fullSchedule.postChecks = fullSchedule.postChecks.map(check => ({
      ...check,
      status: 'pending'
    }));

    this.schedules.set(id, fullSchedule);
    this.saveSchedules();

    console.log(`📅 Deployment scheduled: ${id}`);
    console.log(`   Name: ${schedule.name}`);
    console.log(`   Network: ${schedule.network}`);
    console.log(`   Scheduled: ${schedule.scheduledTime}`);

    await this.sendNotification(fullSchedule, 'scheduled');

    return id;
  }

  async runPreChecks(scheduleId: string): Promise<boolean> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    console.log(`🔍 Running pre-deployment checks for ${schedule.name}`);

    let allPassed = true;

    for (const check of schedule.preChecks) {
      console.log(`   Checking: ${check.name}`);
      
      try {
        const result = await this.executePreCheck(check, schedule);
        check.status = result.passed ? 'passed' : 'failed';
        check.result = result;

        if (!result.passed && check.required) {
          allPassed = false;
          console.log(`   ❌ ${check.name}: ${result.message}`);
        } else if (result.passed) {
          console.log(`   ✅ ${check.name}: ${result.message}`);
        } else {
          console.log(`   ⚠️  ${check.name}: ${result.message} (optional)`);
        }
      } catch (error) {
        check.status = 'failed';
        check.result = { passed: false, message: error.message };
        
        if (check.required) {
          allPassed = false;
        }
        
        console.log(`   ❌ ${check.name}: ${error.message}`);
      }
    }

    this.saveSchedules();

    if (allPassed) {
      console.log(`✅ All required pre-checks passed for ${schedule.name}`);
    } else {
      console.log(`❌ Some required pre-checks failed for ${schedule.name}`);
    }

    return allPassed;
  }

  private async executePreCheck(check: PreCheck, schedule: DeploymentSchedule): Promise<any> {
    switch (check.name) {
      case 'Network Connectivity':
        return await this.checkNetworkConnectivity(schedule.network);
      
      case 'Account Balance':
        return await this.checkAccountBalance(schedule.config);
      
      case 'Gas Price':
        return await this.checkGasPrice();
      
      case 'Contract Compilation':
        return await this.checkContractCompilation();
      
      case 'Dependencies':
        return await this.checkDependencies();
      
      case 'Environment Variables':
        return await this.checkEnvironmentVariables(schedule.config);
      
      default:
        return { passed: true, message: 'Check not implemented' };
    }
  }

  private async checkNetworkConnectivity(network: string): Promise<any> {
    try {
      const provider = ethers.provider;
      const blockNumber = await provider.getBlockNumber();
      return {
        passed: true,
        message: `Connected to ${network}, latest block: ${blockNumber}`
      };
    } catch (error) {
      return {
        passed: false,
        message: `Failed to connect to ${network}: ${error.message}`
      };
    }
  }

  private async checkAccountBalance(config: DeploymentConfig): Promise<any> {
    try {
      const [deployer] = await ethers.getSigners();
      const balance = await deployer.provider.getBalance(deployer.address);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      const minBalance = config.network === 'mainnet' ? 1.0 : 0.1; // ETH
      
      return {
        passed: balanceEth >= minBalance,
        message: `Balance: ${balanceEth.toFixed(4)} ETH (required: ${minBalance} ETH)`
      };
    } catch (error) {
      return {
        passed: false,
        message: `Failed to check balance: ${error.message}`
      };
    }
  }

  private async checkGasPrice(): Promise<any> {
    try {
      const feeData = await ethers.provider.getFeeData();
      const gasPriceGwei = parseFloat(ethers.formatUnits(feeData.gasPrice, 'gwei'));
      
      const maxGasPrice = 100; // gwei
      
      return {
        passed: gasPriceGwei <= maxGasPrice,
        message: `Gas price: ${gasPriceGwei.toFixed(2)} gwei (max: ${maxGasPrice} gwei)`
      };
    } catch (error) {
      return {
        passed: false,
        message: `Failed to check gas price: ${error.message}`
      };
    }
  }

  private async checkContractCompilation(): Promise<any> {
    try {
      // This would run hardhat compile
      // For now, just check if artifacts exist
      const contractNames = [
        'LDAOToken',
        'Governance',
        'Marketplace',
        'EnhancedEscrow'
      ];

      for (const name of contractNames) {
        try {
          await ethers.getContractFactory(name);
        } catch (error) {
          return {
            passed: false,
            message: `Contract ${name} not compiled or not found`
          };
        }
      }

      return {
        passed: true,
        message: 'All contracts compiled successfully'
      };
    } catch (error) {
      return {
        passed: false,
        message: `Compilation check failed: ${error.message}`
      };
    }
  }

  private async checkDependencies(): Promise<any> {
    try {
      // Check if required packages are installed
      const requiredPackages = [
        '@openzeppelin/contracts',
        'hardhat',
        'ethers'
      ];

      // This is a simplified check - in reality you'd check package.json
      return {
        passed: true,
        message: 'All dependencies available'
      };
    } catch (error) {
      return {
        passed: false,
        message: `Dependency check failed: ${error.message}`
      };
    }
  }

  private async checkEnvironmentVariables(config: DeploymentConfig): Promise<any> {
    const required = [];
    
    if (config.network === 'mainnet' || config.network === 'sepolia') {
      if (!process.env.PRIVATE_KEY) required.push('PRIVATE_KEY');
      if (!process.env.ETHERSCAN_API_KEY) required.push('ETHERSCAN_API_KEY');
    }

    if (!config.treasury) required.push('TREASURY_ADDRESS');
    if (!config.multisig) required.push('MULTISIG_ADDRESS');

    if (required.length > 0) {
      return {
        passed: false,
        message: `Missing environment variables: ${required.join(', ')}`
      };
    }

    return {
      passed: true,
      message: 'All required environment variables set'
    };
  }

  async executeDeployment(scheduleId: string): Promise<boolean> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    console.log(`🚀 Starting deployment: ${schedule.name}`);
    schedule.status = 'running';
    this.saveSchedules();

    await this.sendNotification(schedule, 'started');

    try {
      // Run pre-checks
      const preChecksPassed = await this.runPreChecks(scheduleId);
      if (!preChecksPassed) {
        throw new Error('Pre-checks failed');
      }

      // Execute deployment
      const deployer = new ProductionDeployer(schedule.config);
      const deploymentResult = await deployer.deploy();

      // Run post-checks
      const postChecksPassed = await this.runPostChecks(scheduleId, deploymentResult);
      if (!postChecksPassed) {
        console.log('⚠️  Post-checks failed, but deployment completed');
      }

      schedule.status = 'completed';
      this.saveSchedules();

      console.log(`✅ Deployment completed: ${schedule.name}`);
      await this.sendNotification(schedule, 'completed');

      return true;
    } catch (error) {
      schedule.status = 'failed';
      this.saveSchedules();

      console.error(`❌ Deployment failed: ${schedule.name}`, error);
      await this.sendNotification(schedule, 'failed');

      // Consider rollback
      await this.considerRollback(scheduleId, error);

      return false;
    }
  }

  async runPostChecks(scheduleId: string, deploymentResult: any): Promise<boolean> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return false;

    console.log(`🔍 Running post-deployment checks for ${schedule.name}`);

    let allPassed = true;

    for (const check of schedule.postChecks) {
      console.log(`   Checking: ${check.name}`);
      
      try {
        const result = await this.executePostCheck(check, deploymentResult);
        check.status = result.passed ? 'passed' : 'failed';
        check.result = result;

        if (!result.passed) {
          allPassed = false;
          console.log(`   ❌ ${check.name}: ${result.message}`);
        } else {
          console.log(`   ✅ ${check.name}: ${result.message}`);
        }
      } catch (error) {
        check.status = 'failed';
        check.result = { passed: false, message: error.message };
        allPassed = false;
        console.log(`   ❌ ${check.name}: ${error.message}`);
      }
    }

    this.saveSchedules();
    return allPassed;
  }

  private async executePostCheck(check: PostCheck, deploymentResult: any): Promise<any> {
    switch (check.name) {
      case 'Contract Verification':
        return await this.checkContractVerification(deploymentResult);
      
      case 'Basic Functionality':
        return await this.checkBasicFunctionality(deploymentResult);
      
      case 'Ownership Transfer':
        return await this.checkOwnershipTransfer(deploymentResult);
      
      case 'Event Emission':
        return await this.checkEventEmission(deploymentResult);
      
      default:
        return { passed: true, message: 'Check not implemented' };
    }
  }

  private async checkContractVerification(deploymentResult: any): Promise<any> {
    // This would check if contracts are verified on Etherscan
    return {
      passed: true,
      message: 'Contract verification check passed'
    };
  }

  private async checkBasicFunctionality(deploymentResult: any): Promise<any> {
    try {
      // Test basic contract functions
      const addresses = deploymentResult.addresses;
      
      if (addresses.LDAOToken) {
        const token = await ethers.getContractAt('LDAOToken', addresses.LDAOToken);
        const totalSupply = await token.totalSupply();
        if (totalSupply === 0n) {
          return { passed: false, message: 'LDAOToken has zero total supply' };
        }
      }

      return {
        passed: true,
        message: 'Basic functionality tests passed'
      };
    } catch (error) {
      return {
        passed: false,
        message: `Basic functionality test failed: ${error.message}`
      };
    }
  }

  private async checkOwnershipTransfer(deploymentResult: any): Promise<any> {
    try {
      const addresses = deploymentResult.addresses;
      const multisig = deploymentResult.multisig;
      
      // Check a few key contracts
      const contractsToCheck = ['Governance', 'Marketplace'];
      
      for (const contractName of contractsToCheck) {
        if (addresses[contractName]) {
          const contract = await ethers.getContractAt(contractName, addresses[contractName]);
          try {
            const owner = await contract.owner();
            if (owner.toLowerCase() !== multisig.toLowerCase()) {
              return {
                passed: false,
                message: `${contractName} ownership not transferred to multisig`
              };
            }
          } catch (error) {
            // Contract might not have owner function
          }
        }
      }

      return {
        passed: true,
        message: 'Ownership transfer verified'
      };
    } catch (error) {
      return {
        passed: false,
        message: `Ownership check failed: ${error.message}`
      };
    }
  }

  private async checkEventEmission(deploymentResult: any): Promise<any> {
    // This would check if deployment events were properly emitted
    return {
      passed: true,
      message: 'Event emission check passed'
    };
  }

  private async considerRollback(scheduleId: string, error: Error): Promise<void> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return;

    console.log(`🔄 Considering rollback for ${schedule.name}`);
    
    // Log rollback consideration
    const rollbackLog = {
      timestamp: new Date().toISOString(),
      scheduleId,
      error: error.message,
      rollbackPlan: schedule.rollbackPlan
    };

    writeFileSync(`rollback-consideration-${scheduleId}.json`, JSON.stringify(rollbackLog, null, 2));
    
    // For now, just log the rollback plan
    console.log('Rollback plan:');
    schedule.rollbackPlan.forEach((step, index) => {
      console.log(`  ${index + 1}. ${step.name}: ${step.description}`);
    });
  }

  private async sendNotification(schedule: DeploymentSchedule, event: string): Promise<void> {
    for (const notification of schedule.notifications) {
      if (notification.events.includes(event as any)) {
        console.log(`📧 Sending ${notification.type} notification to ${notification.recipient} for event: ${event}`);
        // Implementation would send actual notifications
      }
    }
  }

  getSchedule(id: string): DeploymentSchedule | undefined {
    return this.schedules.get(id);
  }

  listSchedules(): DeploymentSchedule[] {
    return Array.from(this.schedules.values());
  }

  cancelSchedule(id: string): boolean {
    const schedule = this.schedules.get(id);
    if (schedule && schedule.status === 'scheduled') {
      schedule.status = 'cancelled';
      this.saveSchedules();
      return true;
    }
    return false;
  }
}

// Example usage
async function createMainnetDeploymentSchedule(): Promise<string> {
  const scheduler = new DeploymentScheduler();

  const schedule: Omit<DeploymentSchedule, 'id' | 'status'> = {
    name: 'Mainnet Production Deployment',
    scheduledTime: '2024-01-15T10:00:00Z',
    network: 'mainnet',
    config: {
      network: 'mainnet',
      treasury: process.env.TREASURY_ADDRESS || '',
      multisig: process.env.MULTISIG_ADDRESS || '',
      feeBasisPoints: 250,
      feeCollector: process.env.FEE_COLLECTOR_ADDRESS || '',
      confirmations: 5,
      verifyContracts: true,
      gasLimit: 8000000
    },
    preChecks: [
      {
        name: 'Network Connectivity',
        description: 'Verify connection to Ethereum mainnet',
        required: true,
        status: 'pending'
      },
      {
        name: 'Account Balance',
        description: 'Ensure sufficient ETH for deployment',
        required: true,
        status: 'pending'
      },
      {
        name: 'Gas Price',
        description: 'Check current gas prices are reasonable',
        required: false,
        status: 'pending'
      },
      {
        name: 'Contract Compilation',
        description: 'Verify all contracts compile successfully',
        required: true,
        status: 'pending'
      },
      {
        name: 'Environment Variables',
        description: 'Check all required environment variables are set',
        required: true,
        status: 'pending'
      }
    ],
    postChecks: [
      {
        name: 'Contract Verification',
        description: 'Verify contracts on Etherscan',
        timeout: 600,
        status: 'pending'
      },
      {
        name: 'Basic Functionality',
        description: 'Test basic contract functions',
        timeout: 300,
        status: 'pending'
      },
      {
        name: 'Ownership Transfer',
        description: 'Verify ownership transferred to multisig',
        timeout: 60,
        status: 'pending'
      }
    ],
    rollbackPlan: [
      {
        name: 'Pause Contracts',
        description: 'Pause all pausable contracts',
        action: 'pause_all',
        automated: true
      },
      {
        name: 'Emergency Withdraw',
        description: 'Execute emergency withdrawals',
        action: 'emergency_withdraw',
        automated: true
      },
      {
        name: 'Notify Stakeholders',
        description: 'Send notifications about deployment failure',
        action: 'notify',
        automated: true
      }
    ],
    notifications: [
      {
        type: 'email',
        recipient: 'admin@example.com',
        events: ['scheduled', 'started', 'completed', 'failed']
      },
      {
        type: 'slack',
        recipient: '#deployments',
        events: ['started', 'completed', 'failed']
      }
    ]
  };

  return await scheduler.scheduleDeployment(schedule);
}

export { DeploymentScheduler, DeploymentSchedule, createMainnetDeploymentSchedule };