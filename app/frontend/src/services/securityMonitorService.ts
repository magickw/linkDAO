/**
 * Security Monitoring and Alerting Service
 * Provides real-time security monitoring, anomaly detection, and alerting
 */

export interface SecurityAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  timestamp: number;
  details?: any;
  resolved: boolean;
}

export interface SecurityMetrics {
  totalAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  resolvedAlerts: number;
  activeAlerts: number;
}

export interface AnomalyDetectionConfig {
  unusualTransactionAmount: bigint;
  unusualGasPrice: bigint;
  multipleFailedAttempts: number;
  suspiciousAddressPattern: RegExp[];
  unusualContractInteraction: boolean;
}

export class SecurityMonitorService {
  private static instance: SecurityMonitorService;
  private alerts: SecurityAlert[] = [];
  private alertCallbacks: Map<string, (alert: SecurityAlert) => void> = new Map();
  private readonly STORAGE_KEY = 'linkdao_security_alerts';
  private readonly MAX_ALERTS = 1000;

  private readonly anomalyConfig: AnomalyDetectionConfig = {
    unusualTransactionAmount: parseEther('10000'), // 10,000 ETH
    unusualGasPrice: parseGwei('100'), // 100 gwei
    multipleFailedAttempts: 5,
    suspiciousAddressPattern: [
      /(.)\1{10,}/, // Repeated characters
      /012345|543210|abcdef|fedcba/i, // Sequential characters
    ],
    unusualContractInteraction: true,
  };

  private constructor() {
    this.loadAlerts();
    this.startMonitoring();
  }

  static getInstance(): SecurityMonitorService {
    if (!SecurityMonitorService.instance) {
      SecurityMonitorService.instance = new SecurityMonitorService();
    }
    return SecurityMonitorService.instance;
  }

  /**
   * Register an alert callback
   */
  onAlert(callback: (alert: SecurityAlert) => void): string {
    const id = `callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.alertCallbacks.set(id, callback);
    return id;
  }

  /**
   * Unregister an alert callback
   */
  offAlert(id: string): void {
    this.alertCallbacks.delete(id);
  }

  /**
   * Create a security alert
   */
  async createAlert(
    severity: SecurityAlert['severity'],
    type: string,
    message: string,
    details?: any
  ): Promise<SecurityAlert> {
    const alert: SecurityAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      severity,
      type,
      message,
      timestamp: Date.now(),
      details,
      resolved: false,
    };

    this.alerts.unshift(alert);

    // Keep only the most recent alerts
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(0, this.MAX_ALERTS);
    }

    this.saveAlerts();
    this.notifyCallbacks(alert);

    // Send to backend for persistent storage and notification
    await this.sendAlertToBackend(alert);

    return alert;
  }

  /**
   * Monitor transaction for security issues
   */
  async monitorTransaction(
    to: string,
    value: bigint,
    data: string,
    gasPrice?: bigint
  ): Promise<{ safe: boolean; warnings: string[]; alerts: SecurityAlert[] }> {
    const warnings: string[] = [];
    const alerts: SecurityAlert[] = [];

    // Check for unusual transaction amount
    if (value > this.anomalyConfig.unusualTransactionAmount) {
      const warning = `Unusually large transaction amount: ${formatEther(value)} ETH`;
      warnings.push(warning);
      const alert = await this.createAlert(
        'high',
        'unusual_transaction',
        warning,
        { to, value: value.toString(), data }
      );
      alerts.push(alert);
    }

    // Check for unusual gas price
    if (gasPrice && gasPrice > this.anomalyConfig.unusualGasPrice) {
      const warning = `Unusually high gas price: ${formatGwei(gasPrice)} gwei`;
      warnings.push(warning);
      const alert = await this.createAlert(
        'medium',
        'high_gas_price',
        warning,
        { to, gasPrice: gasPrice.toString() }
      );
      alerts.push(alert);
    }

    // Check for suspicious address patterns
    for (const pattern of this.anomalyConfig.suspiciousAddressPattern) {
      if (pattern.test(to)) {
        const warning = `Suspicious address pattern detected: ${to}`;
        warnings.push(warning);
        const alert = await this.createAlert(
          'high',
          'suspicious_address',
          warning,
          { to, pattern: pattern.toString() }
        );
        alerts.push(alert);
      }
    }

    // Check for contract interaction
    if (data && data.length > 10) {
      const warning = `Contract interaction detected with address: ${to}`;
      warnings.push(warning);
      if (this.anomalyConfig.unusualContractInteraction) {
        const alert = await this.createAlert(
          'medium',
          'contract_interaction',
          warning,
          { to, data: data.substring(0, 100) + '...' }
        );
        alerts.push(alert);
      }
    }

    return {
      safe: alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length === 0,
      warnings,
      alerts,
    };
  }

  /**
   * Monitor failed authentication attempts
   */
  async monitorFailedAuthAttempt(
    walletAddress: string,
    reason: string
  ): Promise<{ blocked: boolean; alert?: SecurityAlert }> {
    const key = `failed_auth_${walletAddress}`;
    const attempts = this.getFailedAttempts(key);

    if (attempts >= this.anomalyConfig.multipleFailedAttempts) {
      const alert = await this.createAlert(
        'critical',
        'multiple_failed_auth',
        `Multiple failed authentication attempts for wallet ${walletAddress}`,
        { walletAddress, attempts, reason }
      );

      // Block the wallet temporarily
      this.blockWallet(walletAddress, 30 * 60 * 1000); // 30 minutes

      return { blocked: true, alert };
    }

    this.incrementFailedAttempts(key);
    return { blocked: false };
  }

  /**
   * Monitor unusual wallet activity
   */
  async monitorWalletActivity(
    walletAddress: string,
    activity: {
      transactionCount: number;
      totalValue: bigint;
      uniqueAddresses: Set<string>;
      timeWindow: number; // in milliseconds
    }
  ): Promise<{ suspicious: boolean; alert?: SecurityAlert }> {
    // Check for rapid transactions
    const transactionsPerHour = (activity.transactionCount / activity.timeWindow) * 3600000;
    if (transactionsPerHour > 100) {
      const alert = await this.createAlert(
        'high',
        'rapid_transactions',
        `Unusually high transaction rate: ${transactionsPerHour.toFixed(0)} transactions/hour`,
        { walletAddress, transactionCount: activity.transactionCount, timeWindow: activity.timeWindow }
      );
      return { suspicious: true, alert };
    }

    // Check for high total value in short time
    if (activity.totalValue > parseEther('100000')) {
      const alert = await this.createAlert(
        'critical',
        'high_value_transfers',
        `Unusually high transfer volume: ${formatEther(activity.totalValue)} ETH in ${activity.timeWindow / 60000} minutes`,
        { walletAddress, totalValue: activity.totalValue.toString(), timeWindow: activity.timeWindow }
      );
      return { suspicious: true, alert };
    }

    // Check for many unique addresses (potential dusting attack)
    if (activity.uniqueAddresses.size > 50) {
      const alert = await this.createAlert(
        'medium',
        'dusting_attack',
        `Potential dusting attack: ${activity.uniqueAddresses.size} unique addresses in ${activity.timeWindow / 60000} minutes`,
        { walletAddress, uniqueAddressCount: activity.uniqueAddresses.size }
      );
      return { suspicious: true, alert };
    }

    return { suspicious: false };
  }

  /**
   * Get all alerts
   */
  getAlerts(filters?: {
    severity?: SecurityAlert['severity'];
    type?: string;
    resolved?: boolean;
    limit?: number;
  }): SecurityAlert[] {
    let filtered = [...this.alerts];

    if (filters?.severity) {
      filtered = filtered.filter(a => a.severity === filters.severity);
    }

    if (filters?.type) {
      filtered = filtered.filter(a => a.type === filters.type);
    }

    if (filters?.resolved !== undefined) {
      filtered = filtered.filter(a => a.resolved === filters.resolved);
    }

    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  /**
   * Get security metrics
   */
  getMetrics(): SecurityMetrics {
    const totalAlerts = this.alerts.length;
    const resolvedAlerts = this.alerts.filter(a => a.resolved).length;
    const activeAlerts = totalAlerts - resolvedAlerts;

    return {
      totalAlerts,
      criticalAlerts: this.alerts.filter(a => a.severity === 'critical' && !a.resolved).length,
      highAlerts: this.alerts.filter(a => a.severity === 'high' && !a.resolved).length,
      mediumAlerts: this.alerts.filter(a => a.severity === 'medium' && !a.resolved).length,
      lowAlerts: this.alerts.filter(a => a.severity === 'low' && !a.resolved).length,
      resolvedAlerts,
      activeAlerts,
    };
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.saveAlerts();
      return true;
    }
    return false;
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(olderThanDays: number = 30): number {
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    const beforeCount = this.alerts.length;
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff || !a.resolved);
    const cleared = beforeCount - this.alerts.length;
    this.saveAlerts();
    return cleared;
  }

  /**
   * Get failed attempts count
   */
  private getFailedAttempts(key: string): number {
    const data = localStorage.getItem(key);
    if (!data) return 0;
    const { count, timestamp } = JSON.parse(data);
    // Reset if older than 15 minutes
    if (Date.now() - timestamp > 15 * 60 * 1000) {
      localStorage.removeItem(key);
      return 0;
    }
    return count;
  }

  /**
   * Increment failed attempts
   */
  private incrementFailedAttempts(key: string): void {
    const current = this.getFailedAttempts(key);
    localStorage.setItem(key, JSON.stringify({
      count: current + 1,
      timestamp: Date.now()
    }));
  }

  /**
   * Block a wallet temporarily
   */
  private blockWallet(walletAddress: string, durationMs: number): void {
    const key = `blocked_wallet_${walletAddress}`;
    localStorage.setItem(key, JSON.stringify({
      blockedUntil: Date.now() + durationMs,
      reason: 'Multiple failed authentication attempts'
    }));
  }

  /**
   * Check if wallet is blocked
   */
  isWalletBlocked(walletAddress: string): { blocked: boolean; reason?: string; blockedUntil?: number } {
    const key = `blocked_wallet_${walletAddress}`;
    const data = localStorage.getItem(key);
    if (!data) return { blocked: false };

    const { blockedUntil, reason } = JSON.parse(data);
    if (Date.now() > blockedUntil) {
      localStorage.removeItem(key);
      return { blocked: false };
    }

    return { blocked: true, reason, blockedUntil };
  }

  /**
   * Notify all registered callbacks
   */
  private notifyCallbacks(alert: SecurityAlert): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });
  }

  /**
   * Send alert to backend for persistent storage and notification
   */
  private async sendAlertToBackend(alert: SecurityAlert): Promise<void> {
    try {
      // In production, send to backend API
      // await fetch('/api/security/alerts', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(alert)
      // });
    } catch (error) {
      console.error('Failed to send alert to backend:', error);
    }
  }

  /**
   * Save alerts to localStorage
   */
  private saveAlerts(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.alerts));
    } catch (error) {
      console.error('Failed to save alerts:', error);
    }
  }

  /**
   * Load alerts from localStorage
   */
  private loadAlerts(): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        this.alerts = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
      this.alerts = [];
    }
  }

  /**
   * Start monitoring interval
   */
  private startMonitoring(): void {
    // Clear old alerts every hour
    setInterval(() => {
      this.clearOldAlerts(7); // Keep alerts for 7 days
    }, 60 * 60 * 1000);

    // Clean up failed auth attempts every 15 minutes
    setInterval(() => {
      Object.keys(localStorage)
        .filter(key => key.startsWith('failed_auth_'))
        .forEach(key => {
          const data = localStorage.getItem(key);
          if (data) {
            const { timestamp } = JSON.parse(data);
            if (Date.now() - timestamp > 15 * 60 * 1000) {
              localStorage.removeItem(key);
            }
          }
        });
    }, 15 * 60 * 1000);

    // Clean up blocked wallets every 5 minutes
    setInterval(() => {
      Object.keys(localStorage)
        .filter(key => key.startsWith('blocked_wallet_'))
        .forEach(key => {
          const data = localStorage.getItem(key);
          if (data) {
            const { blockedUntil } = JSON.parse(data);
            if (Date.now() > blockedUntil) {
              localStorage.removeItem(key);
            }
          }
        });
    }, 5 * 60 * 1000);
  }

  /**
   * Clear all alerts and monitoring data
   */
  clearAll(): void {
    this.alerts = [];
    localStorage.removeItem(this.STORAGE_KEY);
    
    // Clear monitoring data
    Object.keys(localStorage)
      .filter(key => key.startsWith('failed_auth_') || key.startsWith('blocked_wallet_'))
      .forEach(key => localStorage.removeItem(key));
  }
}

// Helper functions
function parseEther(eth: string): bigint {
  return BigInt(Math.floor(parseFloat(eth) * 1e18));
}

function parseGwei(gwei: string): bigint {
  return BigInt(Math.floor(parseFloat(gwei) * 1e9));
}

function formatEther(wei: bigint): string {
  return (Number(wei) / 1e18).toFixed(6);
}

function formatGwei(wei: bigint): string {
  return (Number(wei) / 1e9).toFixed(2);
}

// Export singleton instance
export const securityMonitorService = SecurityMonitorService.getInstance();