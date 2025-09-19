import { ethers } from 'ethers';
import { ContractMonitor } from './ContractMonitor';
import { AlertingSystem } from './AlertingSystem';
import { DashboardServer } from './DashboardServer';
import { UserActivityTracker } from './UserActivityTracker';

// Contract addresses - these will be populated after mainnet deployment
const MAINNET_CONTRACTS = {
  LDAOToken: '',
  Governance: '',
  ReputationSystem: '',
  ProfileRegistry: '',
  SimpleProfileRegistry: '',
  PaymentRouter: '',
  EnhancedEscrow: '',
  DisputeResolution: '',
  Marketplace: '',
  RewardPool: '',
  NFTMarketplace: '',
  NFTCollectionFactory: '',
  TipRouter: '',
  FollowModule: '',
  Counter: '',
  MockERC20: ''
};

// Contract ABIs - these will be loaded from deployment artifacts
const CONTRACT_ABIS: { [key: string]: any[] } = {};

export class MainnetMonitoringSetup {
  private provider: ethers.Provider;
  private contractMonitor: ContractMonitor;
  private alertingSystem: AlertingSystem;
  private dashboardServer: DashboardServer;
  private userActivityTracker: UserActivityTracker;

  constructor(rpcUrl: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contractMonitor = new ContractMonitor(this.provider);
    this.alertingSystem = new AlertingSystem();
    this.userActivityTracker = new UserActivityTracker(this.provider);
    this.dashboardServer = new DashboardServer(
      this.contractMonitor,
      this.alertingSystem,
      3001
    );
  }

  async initialize() {
    console.log('Initializing mainnet monitoring system...');

    // Load contract ABIs
    await this.loadContractABIs();

    // Setup contract monitoring
    this.setupContractMonitoring();

    // Configure alerting
    this.configureAlerting();

    // Setup user activity tracking
    this.setupUserActivityTracking();

    // Start monitoring services
    this.startServices();

    console.log('Mainnet monitoring system initialized successfully');
  }

  private async loadContractABIs() {
    try {
      // Load ABIs from deployment artifacts
      const fs = require('fs');
      const path = require('path');

      const artifactsPath = path.join(__dirname, '../artifacts/contracts');
      
      for (const contractName of Object.keys(MAINNET_CONTRACTS)) {
        try {
          const artifactPath = path.join(artifactsPath, `${contractName}.sol/${contractName}.json`);
          if (fs.existsSync(artifactPath)) {
            const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
            CONTRACT_ABIS[contractName] = artifact.abi;
            console.log(`Loaded ABI for ${contractName}`);
          }
        } catch (error) {
          console.warn(`Could not load ABI for ${contractName}:`, error);
        }
      }
    } catch (error) {
      console.error('Error loading contract ABIs:', error);
    }
  }

  private setupContractMonitoring() {
    console.log('Setting up contract monitoring...');

    for (const [contractName, address] of Object.entries(MAINNET_CONTRACTS)) {
      if (address && CONTRACT_ABIS[contractName]) {
        this.contractMonitor.addContract(contractName, address, CONTRACT_ABIS[contractName]);
        console.log(`Added monitoring for ${contractName} at ${address}`);
      }
    }

    // Setup event listeners
    this.contractMonitor.on('metricsUpdated', (contractName, metrics) => {
      console.log(`Metrics updated for ${contractName}:`, metrics);
    });

    this.contractMonitor.on('securityAlert', (alert) => {
      console.warn('Security alert:', alert);
      this.alertingSystem.processAlert(alert);
    });

    this.contractMonitor.on('healthCheck', (data) => {
      console.log('Health check:', data);
    });
  }

  private configureAlerting() {
    console.log('Configuring alerting system...');

    // Add Slack notification channel
    if (process.env.SLACK_WEBHOOK_URL) {
      this.alertingSystem.addNotificationChannel('slack', {
        type: 'slack',
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL
        },
        enabled: true
      });
    }

    // Add webhook notification channel
    if (process.env.ALERT_WEBHOOK_URL) {
      this.alertingSystem.addNotificationChannel('webhook', {
        type: 'webhook',
        config: {
          url: process.env.ALERT_WEBHOOK_URL,
          headers: {
            'Authorization': `Bearer ${process.env.ALERT_WEBHOOK_TOKEN}`
          }
        },
        enabled: true
      });
    }

    // Add email notification channel
    if (process.env.ALERT_EMAIL_RECIPIENTS) {
      this.alertingSystem.addNotificationChannel('email', {
        type: 'email',
        config: {
          recipients: process.env.ALERT_EMAIL_RECIPIENTS.split(',')
        },
        enabled: true
      });
    }

    // Configure mainnet-specific alert rules
    this.alertingSystem.addRule({
      id: 'mainnet-high-value-transfer',
      name: 'Mainnet High Value Transfer',
      condition: (data) => {
        if (data.alertType === 'LARGE_TRANSFER') {
          // Lower threshold for mainnet due to real value
          const value = parseFloat(data.description.match(/[\d.]+/)?.[0] || '0');
          return value > 1000; // 1000 tokens instead of 10000
        }
        return false;
      },
      severity: 'high',
      cooldownMs: 300000 // 5 minutes
    });

    this.alertingSystem.addRule({
      id: 'mainnet-governance-proposal',
      name: 'Mainnet Governance Proposal',
      condition: (data) => data.eventName === 'ProposalCreated',
      severity: 'medium',
      cooldownMs: 0
    });

    this.alertingSystem.addRule({
      id: 'mainnet-contract-upgrade',
      name: 'Mainnet Contract Upgrade',
      condition: (data) => data.eventName === 'Upgraded',
      severity: 'high',
      cooldownMs: 0
    });
  }

  private setupUserActivityTracking() {
    console.log('Setting up user activity tracking...');

    for (const [contractName, address] of Object.entries(MAINNET_CONTRACTS)) {
      if (address && CONTRACT_ABIS[contractName]) {
        this.userActivityTracker.addContract(address, CONTRACT_ABIS[contractName]);
      }
    }

    this.userActivityTracker.on('userActivity', (activity) => {
      // Log significant user activities
      if (activity.value && activity.value > ethers.parseEther('1')) {
        console.log('Significant user activity:', activity);
      }
    });
  }

  private startServices() {
    console.log('Starting monitoring services...');

    // Start contract monitoring
    this.contractMonitor.startMonitoring(30000); // 30 second intervals

    // Start dashboard server
    this.dashboardServer.start();

    // Setup periodic cleanup
    setInterval(() => {
      this.userActivityTracker.clearOldData(30); // Keep 30 days of data
    }, 24 * 60 * 60 * 1000); // Run daily

    console.log('All monitoring services started');
  }

  // Method to update contract addresses after deployment
  updateContractAddress(contractName: string, address: string) {
    if (MAINNET_CONTRACTS.hasOwnProperty(contractName)) {
      MAINNET_CONTRACTS[contractName as keyof typeof MAINNET_CONTRACTS] = address;
      
      if (CONTRACT_ABIS[contractName]) {
        this.contractMonitor.addContract(contractName, address, CONTRACT_ABIS[contractName]);
        this.userActivityTracker.addContract(address, CONTRACT_ABIS[contractName]);
        console.log(`Updated monitoring for ${contractName} at ${address}`);
      }
    }
  }

  // Method to get current monitoring status
  getMonitoringStatus() {
    return {
      contractsMonitored: Object.values(MAINNET_CONTRACTS).filter(addr => addr !== '').length,
      totalContracts: Object.keys(MAINNET_CONTRACTS).length,
      healthSummary: this.contractMonitor.getHealthSummary(),
      alertStats: this.alertingSystem.getAlertStats(),
      activityStats: this.userActivityTracker.getActivityStats()
    };
  }

  // Method to export monitoring data
  exportMonitoringData() {
    return {
      contractMetrics: Array.from((this.contractMonitor.getMetrics() as Map<string, any>).entries()),
      alertHistory: this.alertingSystem.getAlertHistory(),
      userMetrics: this.userActivityTracker.exportMetrics(),
      timestamp: new Date().toISOString()
    };
  }

  // Graceful shutdown
  async shutdown() {
    console.log('Shutting down monitoring system...');
    
    this.contractMonitor.stopMonitoring();
    this.dashboardServer.stop();
    
    console.log('Monitoring system shut down successfully');
  }
}

// Main execution function
export async function startMainnetMonitoring() {
  const rpcUrl = process.env.MAINNET_RPC_URL || 'https://eth-mainnet.alchemyapi.io/v2/your-api-key';
  
  const monitoring = new MainnetMonitoringSetup(rpcUrl);
  
  try {
    await monitoring.initialize();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Received SIGINT, shutting down gracefully...');
      await monitoring.shutdown();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM, shutting down gracefully...');
      await monitoring.shutdown();
      process.exit(0);
    });
    
    return monitoring;
  } catch (error) {
    console.error('Failed to start mainnet monitoring:', error);
    process.exit(1);
  }
}

// Export for use in deployment scripts
export { MAINNET_CONTRACTS, CONTRACT_ABIS };