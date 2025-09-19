import { ethers } from "hardhat";
import { writeFileSync } from "fs";

interface MonitoringConfig {
  network: string;
  contracts: { [name: string]: string };
  alertThresholds: {
    gasPrice: string;
    transactionFailures: number;
    balanceThreshold: string;
  };
  webhooks: {
    slack?: string;
    discord?: string;
    email?: string;
  };
  checkInterval: number; // in seconds
}

interface ContractMetrics {
  address: string;
  balance: string;
  transactionCount: number;
  lastActivity: number;
  gasUsed: string;
  status: 'healthy' | 'warning' | 'critical';
}

class ContractMonitor {
  private config: MonitoringConfig;
  private provider: any;

  constructor(config: MonitoringConfig) {
    this.config = config;
  }

  async initialize() {
    this.provider = ethers.provider;
    console.log(`🔍 Initializing monitoring for ${this.config.network}`);
  }

  async checkContractHealth(contractName: string, address: string): Promise<ContractMetrics> {
    try {
      const balance = await this.provider.getBalance(address);
      const transactionCount = await this.provider.getTransactionCount(address);
      
      // Get latest block for activity check
      const latestBlock = await this.provider.getBlock('latest');
      
      const metrics: ContractMetrics = {
        address,
        balance: ethers.formatEther(balance),
        transactionCount,
        lastActivity: latestBlock.timestamp,
        gasUsed: '0',
        status: 'healthy'
      };

      // Determine status based on thresholds
      if (balance < ethers.parseEther(this.config.alertThresholds.balanceThreshold)) {
        metrics.status = 'warning';
      }

      return metrics;
    } catch (error) {
      console.error(`Error checking ${contractName}:`, error);
      return {
        address,
        balance: '0',
        transactionCount: 0,
        lastActivity: 0,
        gasUsed: '0',
        status: 'critical'
      };
    }
  }

  async checkAllContracts(): Promise<{ [name: string]: ContractMetrics }> {
    const results: { [name: string]: ContractMetrics } = {};

    for (const [name, address] of Object.entries(this.config.contracts)) {
      results[name] = await this.checkContractHealth(name, address);
    }

    return results;
  }

  async checkGasPrices(): Promise<{ gasPrice: string; status: 'normal' | 'high' | 'critical' }> {
    try {
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice;
      const gasPriceGwei = ethers.formatUnits(gasPrice, 'gwei');
      
      const threshold = parseFloat(this.config.alertThresholds.gasPrice);
      let status: 'normal' | 'high' | 'critical' = 'normal';
      
      if (parseFloat(gasPriceGwei) > threshold * 2) {
        status = 'critical';
      } else if (parseFloat(gasPriceGwei) > threshold) {
        status = 'high';
      }

      return {
        gasPrice: gasPriceGwei,
        status
      };
    } catch (error) {
      console.error('Error checking gas prices:', error);
      return {
        gasPrice: '0',
        status: 'critical'
      };
    }
  }

  async sendAlert(message: string, severity: 'info' | 'warning' | 'critical') {
    const timestamp = new Date().toISOString();
    const alert = {
      timestamp,
      network: this.config.network,
      severity,
      message
    };

    console.log(`🚨 ALERT [${severity.toUpperCase()}]: ${message}`);

    // Log to file
    const logEntry = `${timestamp} [${severity.toUpperCase()}] ${message}\n`;
    writeFileSync('monitoring.log', logEntry, { flag: 'a' });

    // Send to webhooks if configured
    if (this.config.webhooks.slack) {
      await this.sendSlackAlert(alert);
    }

    if (this.config.webhooks.discord) {
      await this.sendDiscordAlert(alert);
    }
  }

  private async sendSlackAlert(alert: any) {
    try {
      const payload = {
        text: `🚨 Contract Monitor Alert`,
        attachments: [{
          color: alert.severity === 'critical' ? 'danger' : 
                 alert.severity === 'warning' ? 'warning' : 'good',
          fields: [
            { title: 'Network', value: alert.network, short: true },
            { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
            { title: 'Message', value: alert.message, short: false },
            { title: 'Time', value: alert.timestamp, short: true }
          ]
        }]
      };

      // Note: In a real implementation, you would use fetch or axios
      console.log('Slack alert payload:', JSON.stringify(payload, null, 2));
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  private async sendDiscordAlert(alert: any) {
    try {
      const embed = {
        title: '🚨 Contract Monitor Alert',
        color: alert.severity === 'critical' ? 0xff0000 : 
               alert.severity === 'warning' ? 0xffaa00 : 0x00ff00,
        fields: [
          { name: 'Network', value: alert.network, inline: true },
          { name: 'Severity', value: alert.severity.toUpperCase(), inline: true },
          { name: 'Message', value: alert.message, inline: false }
        ],
        timestamp: alert.timestamp
      };

      console.log('Discord alert embed:', JSON.stringify(embed, null, 2));
    } catch (error) {
      console.error('Failed to send Discord alert:', error);
    }
  }

  async generateReport(): Promise<string> {
    const contractMetrics = await this.checkAllContracts();
    const gasMetrics = await this.checkGasPrices();
    
    const report = {
      timestamp: new Date().toISOString(),
      network: this.config.network,
      gasPrice: gasMetrics,
      contracts: contractMetrics,
      summary: {
        totalContracts: Object.keys(contractMetrics).length,
        healthyContracts: Object.values(contractMetrics).filter(m => m.status === 'healthy').length,
        warningContracts: Object.values(contractMetrics).filter(m => m.status === 'warning').length,
        criticalContracts: Object.values(contractMetrics).filter(m => m.status === 'critical').length
      }
    };

    const reportJson = JSON.stringify(report, null, 2);
    const filename = `monitoring-report-${Date.now()}.json`;
    writeFileSync(filename, reportJson);
    
    console.log(`📊 Monitoring report saved to ${filename}`);
    return reportJson;
  }

  async startMonitoring() {
    console.log(`🔄 Starting continuous monitoring (interval: ${this.config.checkInterval}s)`);
    
    const monitor = async () => {
      try {
        const contractMetrics = await this.checkAllContracts();
        const gasMetrics = await this.checkGasPrices();

        // Check for alerts
        for (const [name, metrics] of Object.entries(contractMetrics)) {
          if (metrics.status === 'critical') {
            await this.sendAlert(`Contract ${name} is in critical state`, 'critical');
          } else if (metrics.status === 'warning') {
            await this.sendAlert(`Contract ${name} has warnings`, 'warning');
          }
        }

        if (gasMetrics.status === 'critical') {
          await this.sendAlert(`Gas prices are critically high: ${gasMetrics.gasPrice} gwei`, 'critical');
        } else if (gasMetrics.status === 'high') {
          await this.sendAlert(`Gas prices are high: ${gasMetrics.gasPrice} gwei`, 'warning');
        }

        console.log(`✅ Monitoring check completed at ${new Date().toISOString()}`);
      } catch (error) {
        console.error('Monitoring error:', error);
        await this.sendAlert(`Monitoring system error: ${error.message}`, 'critical');
      }
    };

    // Run initial check
    await monitor();

    // Set up interval
    setInterval(monitor, this.config.checkInterval * 1000);
  }
}

// Emergency response procedures
class EmergencyResponse {
  private contracts: { [name: string]: string };
  private multisigAddress: string;

  constructor(contracts: { [name: string]: string }, multisigAddress: string) {
    this.contracts = contracts;
    this.multisigAddress = multisigAddress;
  }

  async pauseContract(contractName: string): Promise<void> {
    try {
      const contract = await ethers.getContractAt(contractName, this.contracts[contractName]);
      
      // Check if contract has pause functionality
      if (contract.pause) {
        console.log(`⏸️  Pausing ${contractName}...`);
        const tx = await contract.pause();
        await tx.wait();
        console.log(`✅ ${contractName} paused successfully`);
      } else {
        console.log(`⚠️  ${contractName} does not support pausing`);
      }
    } catch (error) {
      console.error(`Failed to pause ${contractName}:`, error);
      throw error;
    }
  }

  async pauseAllContracts(): Promise<void> {
    console.log('🚨 EMERGENCY: Pausing all contracts');
    
    const pausableContracts = [
      'Marketplace',
      'EnhancedEscrow',
      'NFTMarketplace',
      'TipRouter'
    ];

    for (const contractName of pausableContracts) {
      if (this.contracts[contractName]) {
        try {
          await this.pauseContract(contractName);
        } catch (error) {
          console.error(`Failed to pause ${contractName}, continuing...`);
        }
      }
    }
  }

  async emergencyWithdraw(contractName: string, token?: string): Promise<void> {
    try {
      const contract = await ethers.getContractAt(contractName, this.contracts[contractName]);
      
      if (contract.emergencyWithdraw) {
        console.log(`💰 Emergency withdrawing from ${contractName}...`);
        const tx = token ? 
          await contract.emergencyWithdraw(token) :
          await contract.emergencyWithdraw();
        await tx.wait();
        console.log(`✅ Emergency withdrawal from ${contractName} completed`);
      }
    } catch (error) {
      console.error(`Emergency withdrawal failed for ${contractName}:`, error);
      throw error;
    }
  }

  generateEmergencyReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      action: 'EMERGENCY_RESPONSE_INITIATED',
      contracts: this.contracts,
      multisig: this.multisigAddress,
      procedures: [
        'All pausable contracts have been paused',
        'Emergency withdrawals initiated where applicable',
        'Multisig wallet notified',
        'Monitoring alerts sent'
      ]
    };

    const reportJson = JSON.stringify(report, null, 2);
    writeFileSync(`emergency-report-${Date.now()}.json`, reportJson);
    
    return reportJson;
  }
}

// Example usage and configuration
async function setupMonitoring() {
  // Load deployed addresses
  const deployedAddresses = require('../deployedAddresses.json');
  
  const config: MonitoringConfig = {
    network: process.env.HARDHAT_NETWORK || 'localhost',
    contracts: deployedAddresses.addresses || {},
    alertThresholds: {
      gasPrice: '50', // 50 gwei
      transactionFailures: 5,
      balanceThreshold: '0.1' // 0.1 ETH
    },
    webhooks: {
      slack: process.env.SLACK_WEBHOOK_URL,
      discord: process.env.DISCORD_WEBHOOK_URL
    },
    checkInterval: 300 // 5 minutes
  };

  const monitor = new ContractMonitor(config);
  await monitor.initialize();
  
  return monitor;
}

export { ContractMonitor, EmergencyResponse, MonitoringConfig, setupMonitoring };