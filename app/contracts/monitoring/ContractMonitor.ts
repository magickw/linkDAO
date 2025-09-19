import { ethers } from 'ethers';
import { EventEmitter } from 'events';

export interface ContractMetrics {
  contractAddress: string;
  contractName: string;
  transactionCount: number;
  gasUsed: bigint;
  errorCount: number;
  lastActivity: Date;
  healthStatus: 'healthy' | 'warning' | 'critical';
}

export interface SecurityAlert {
  severity: 'low' | 'medium' | 'high' | 'critical';
  contractAddress: string;
  alertType: string;
  description: string;
  timestamp: Date;
  transactionHash?: string;
}

export class ContractMonitor extends EventEmitter {
  private provider: ethers.Provider;
  private contracts: Map<string, ethers.Contract> = new Map();
  private metrics: Map<string, ContractMetrics> = new Map();
  private alertThresholds: Map<string, any> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(provider: ethers.Provider) {
    super();
    this.provider = provider;
    this.setupDefaultThresholds();
  }

  private setupDefaultThresholds() {
    this.alertThresholds.set('gasUsage', {
      warning: ethers.parseEther('0.1'),
      critical: ethers.parseEther('0.5')
    });
    this.alertThresholds.set('transactionRate', {
      warning: 100,
      critical: 500
    });
    this.alertThresholds.set('errorRate', {
      warning: 0.05, // 5%
      critical: 0.15  // 15%
    });
  }

  addContract(name: string, address: string, abi: any[]) {
    const contract = new ethers.Contract(address, abi, this.provider);
    this.contracts.set(name, contract);
    
    this.metrics.set(name, {
      contractAddress: address,
      contractName: name,
      transactionCount: 0,
      gasUsed: 0n,
      errorCount: 0,
      lastActivity: new Date(),
      healthStatus: 'healthy'
    });

    this.setupContractListeners(name, contract);
  }

  private setupContractListeners(name: string, contract: ethers.Contract) {
    // Listen to all events from the contract
    contract.on('*', (event) => {
      this.updateMetrics(name, event);
    });

    // Monitor specific events for security alerts
    this.setupSecurityListeners(name, contract);
  }

  private setupSecurityListeners(name: string, contract: ethers.Contract) {
    // Monitor for emergency pause events
    if (contract.interface.hasEvent('EmergencyPause')) {
      contract.on('EmergencyPause', (reason, timestamp) => {
        this.emitSecurityAlert({
          severity: 'critical',
          contractAddress: contract.target as string,
          alertType: 'EMERGENCY_PAUSE',
          description: `Contract ${name} was emergency paused: ${reason}`,
          timestamp: new Date()
        });
      });
    }

    // Monitor for ownership transfers
    if (contract.interface.hasEvent('OwnershipTransferred')) {
      contract.on('OwnershipTransferred', (previousOwner, newOwner) => {
        this.emitSecurityAlert({
          severity: 'high',
          contractAddress: contract.target as string,
          alertType: 'OWNERSHIP_TRANSFER',
          description: `Ownership transferred from ${previousOwner} to ${newOwner}`,
          timestamp: new Date()
        });
      });
    }

    // Monitor for large value transfers
    if (contract.interface.hasEvent('Transfer')) {
      contract.on('Transfer', (from, to, value) => {
        const threshold = ethers.parseEther('10000'); // 10k tokens
        if (value > threshold) {
          this.emitSecurityAlert({
            severity: 'medium',
            contractAddress: contract.target as string,
            alertType: 'LARGE_TRANSFER',
            description: `Large transfer detected: ${ethers.formatEther(value)} tokens`,
            timestamp: new Date()
          });
        }
      });
    }
  }

  private updateMetrics(contractName: string, event: any) {
    const metrics = this.metrics.get(contractName);
    if (!metrics) return;

    metrics.transactionCount++;
    metrics.lastActivity = new Date();
    
    // Update health status based on activity
    this.updateHealthStatus(contractName);
    
    this.metrics.set(contractName, metrics);
    this.emit('metricsUpdated', contractName, metrics);
  }

  private updateHealthStatus(contractName: string) {
    const metrics = this.metrics.get(contractName);
    if (!metrics) return;

    const errorRate = metrics.errorCount / Math.max(metrics.transactionCount, 1);
    const gasThreshold = this.alertThresholds.get('gasUsage');
    const errorThreshold = this.alertThresholds.get('errorRate');

    if (errorRate >= errorThreshold.critical || metrics.gasUsed >= gasThreshold.critical) {
      metrics.healthStatus = 'critical';
    } else if (errorRate >= errorThreshold.warning || metrics.gasUsed >= gasThreshold.warning) {
      metrics.healthStatus = 'warning';
    } else {
      metrics.healthStatus = 'healthy';
    }
  }

  private emitSecurityAlert(alert: SecurityAlert) {
    this.emit('securityAlert', alert);
    console.warn(`[SECURITY ALERT] ${alert.severity.toUpperCase()}: ${alert.description}`);
  }

  startMonitoring(intervalMs: number = 60000) {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
    }, intervalMs);

    console.log('Contract monitoring started');
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('Contract monitoring stopped');
  }

  private async performHealthChecks() {
    for (const [name, contract] of this.contracts) {
      try {
        // Check if contract is still responsive
        await contract.getAddress();
        
        // Check contract balance if applicable
        const balance = await this.provider.getBalance(contract.target as string);
        
        // Emit health check results
        this.emit('healthCheck', {
          contractName: name,
          address: contract.target,
          balance: balance.toString(),
          timestamp: new Date()
        });
      } catch (error) {
        this.emitSecurityAlert({
          severity: 'critical',
          contractAddress: contract.target as string,
          alertType: 'CONTRACT_UNRESPONSIVE',
          description: `Contract ${name} is unresponsive: ${error}`,
          timestamp: new Date()
        });
      }
    }
  }

  getMetrics(contractName?: string): ContractMetrics | Map<string, ContractMetrics> {
    if (contractName) {
      return this.metrics.get(contractName) || {} as ContractMetrics;
    }
    return this.metrics;
  }

  getHealthSummary() {
    const summary = {
      healthy: 0,
      warning: 0,
      critical: 0,
      total: this.metrics.size
    };

    for (const metrics of this.metrics.values()) {
      summary[metrics.healthStatus]++;
    }

    return summary;
  }
}