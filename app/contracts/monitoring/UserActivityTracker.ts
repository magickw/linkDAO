import { ethers } from 'ethers';
import { EventEmitter } from 'events';

export interface UserActivity {
  userAddress: string;
  contractAddress: string;
  functionName: string;
  timestamp: Date;
  transactionHash: string;
  gasUsed: number;
  success: boolean;
  value?: bigint;
}

export interface UserMetrics {
  userAddress: string;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalGasUsed: number;
  totalValueTransferred: bigint;
  firstActivity: Date;
  lastActivity: Date;
  favoriteContracts: Map<string, number>;
  activityByHour: number[];
}

export class UserActivityTracker extends EventEmitter {
  private provider: ethers.Provider;
  private activities: UserActivity[] = [];
  private userMetrics: Map<string, UserMetrics> = new Map();
  private contractABIs: Map<string, any[]> = new Map();
  private maxActivities = 10000;

  constructor(provider: ethers.Provider) {
    super();
    this.provider = provider;
  }

  addContract(address: string, abi: any[]) {
    this.contractABIs.set(address.toLowerCase(), abi);
    this.setupContractListeners(address, abi);
  }

  private setupContractListeners(address: string, abi: any[]) {
    const contract = new ethers.Contract(address, abi, this.provider);
    
    // Listen to all events to track user activity
    contract.on('*', async (event) => {
      await this.processEvent(address, event);
    });
  }

  private async processEvent(contractAddress: string, event: any) {
    try {
      const receipt = await this.provider.getTransactionReceipt(event.log.transactionHash);
      const transaction = await this.provider.getTransaction(event.log.transactionHash);
      
      if (!receipt || !transaction) return;

      const activity: UserActivity = {
        userAddress: transaction.from,
        contractAddress: contractAddress,
        functionName: this.decodeFunctionName(contractAddress, transaction.data),
        timestamp: new Date(),
        transactionHash: event.log.transactionHash,
        gasUsed: Number(receipt.gasUsed),
        success: receipt.status === 1,
        value: transaction.value
      };

      this.recordActivity(activity);
      this.updateUserMetrics(activity);
      
      this.emit('userActivity', activity);
    } catch (error) {
      console.error('Error processing event:', error);
    }
  }

  private decodeFunctionName(contractAddress: string, data: string): string {
    try {
      const abi = this.contractABIs.get(contractAddress.toLowerCase());
      if (!abi) return 'unknown';

      const iface = new ethers.Interface(abi);
      const decoded = iface.parseTransaction({ data });
      return decoded?.name || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private recordActivity(activity: UserActivity) {
    this.activities.unshift(activity);
    
    // Maintain activity history limit
    if (this.activities.length > this.maxActivities) {
      this.activities = this.activities.slice(0, this.maxActivities);
    }
  }

  private updateUserMetrics(activity: UserActivity) {
    let metrics = this.userMetrics.get(activity.userAddress);
    
    if (!metrics) {
      metrics = {
        userAddress: activity.userAddress,
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        totalGasUsed: 0,
        totalValueTransferred: 0n,
        firstActivity: activity.timestamp,
        lastActivity: activity.timestamp,
        favoriteContracts: new Map(),
        activityByHour: new Array(24).fill(0)
      };
    }

    // Update basic metrics
    metrics.totalTransactions++;
    if (activity.success) {
      metrics.successfulTransactions++;
    } else {
      metrics.failedTransactions++;
    }
    
    metrics.totalGasUsed += activity.gasUsed;
    if (activity.value) {
      metrics.totalValueTransferred += activity.value;
    }
    
    metrics.lastActivity = activity.timestamp;
    
    // Update favorite contracts
    const currentCount = metrics.favoriteContracts.get(activity.contractAddress) || 0;
    metrics.favoriteContracts.set(activity.contractAddress, currentCount + 1);
    
    // Update activity by hour
    const hour = activity.timestamp.getHours();
    metrics.activityByHour[hour]++;
    
    this.userMetrics.set(activity.userAddress, metrics);
  }

  getUserMetrics(userAddress: string): UserMetrics | undefined {
    return this.userMetrics.get(userAddress);
  }

  getAllUserMetrics(): Map<string, UserMetrics> {
    return this.userMetrics;
  }

  getUserActivity(userAddress: string, limit?: number): UserActivity[] {
    const userActivities = this.activities.filter(
      activity => activity.userAddress.toLowerCase() === userAddress.toLowerCase()
    );
    
    return limit ? userActivities.slice(0, limit) : userActivities;
  }

  getContractActivity(contractAddress: string, limit?: number): UserActivity[] {
    const contractActivities = this.activities.filter(
      activity => activity.contractAddress.toLowerCase() === contractAddress.toLowerCase()
    );
    
    return limit ? contractActivities.slice(0, limit) : contractActivities;
  }

  getTopUsers(limit: number = 10): UserMetrics[] {
    return Array.from(this.userMetrics.values())
      .sort((a, b) => b.totalTransactions - a.totalTransactions)
      .slice(0, limit);
  }

  getActiveUsers(timeframeHours: number = 24): UserMetrics[] {
    const cutoff = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);
    
    return Array.from(this.userMetrics.values())
      .filter(metrics => metrics.lastActivity > cutoff)
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  getActivityStats() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const last24h = this.activities.filter(a => a.timestamp > oneDayAgo);
    const lastWeek = this.activities.filter(a => a.timestamp > oneWeekAgo);
    
    return {
      totalActivities: this.activities.length,
      totalUsers: this.userMetrics.size,
      activitiesLast24h: last24h.length,
      activitiesLastWeek: lastWeek.length,
      successRate: this.activities.length > 0 
        ? (this.activities.filter(a => a.success).length / this.activities.length) * 100 
        : 0,
      averageGasUsed: this.activities.length > 0
        ? this.activities.reduce((sum, a) => sum + a.gasUsed, 0) / this.activities.length
        : 0
    };
  }

  getHourlyActivity(): number[] {
    const hourlyStats = new Array(24).fill(0);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    this.activities
      .filter(activity => activity.timestamp > oneDayAgo)
      .forEach(activity => {
        const hour = activity.timestamp.getHours();
        hourlyStats[hour]++;
      });
    
    return hourlyStats;
  }

  getFunctionUsageStats(): Map<string, number> {
    const functionStats = new Map<string, number>();
    
    this.activities.forEach(activity => {
      const current = functionStats.get(activity.functionName) || 0;
      functionStats.set(activity.functionName, current + 1);
    });
    
    return functionStats;
  }

  getContractUsageStats(): Map<string, number> {
    const contractStats = new Map<string, number>();
    
    this.activities.forEach(activity => {
      const current = contractStats.get(activity.contractAddress) || 0;
      contractStats.set(activity.contractAddress, current + 1);
    });
    
    return contractStats;
  }

  exportMetrics() {
    return {
      activities: this.activities,
      userMetrics: Array.from(this.userMetrics.entries()),
      stats: this.getActivityStats(),
      hourlyActivity: this.getHourlyActivity(),
      functionUsage: Array.from(this.getFunctionUsageStats().entries()),
      contractUsage: Array.from(this.getContractUsageStats().entries())
    };
  }

  clearOldData(daysToKeep: number = 30) {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    // Remove old activities
    this.activities = this.activities.filter(activity => activity.timestamp > cutoff);
    
    // Update user metrics to remove users with no recent activity
    for (const [userAddress, metrics] of this.userMetrics) {
      if (metrics.lastActivity < cutoff) {
        this.userMetrics.delete(userAddress);
      }
    }
    
    console.log(`Cleaned up data older than ${daysToKeep} days`);
  }
}