/**
 * Intrusion Detection Service
 * Monitors for suspicious patterns and anomalies
 */

export interface Anomaly {
  id: string;
  userId?: string;
  metric: string;
  value: any;
  baseline: any;
  deviation: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  details?: any;
}

export interface SecurityAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  walletAddress?: string;
  description: string;
  timestamp: number;
  details?: any;
  resolved: boolean;
}

export interface Baseline {
  userId: string;
  metric: string;
  mean: number;
  stddev: number;
  samples: number[];
  min: number;
  max: number;
  lastUpdated: number;
}

/**
 * Intrusion Detection Service
 */
export class IntrusionDetectionService {
  private static instance: IntrusionDetectionService;
  private baselines: Map<string, Baseline> = new Map();
  private alerts: SecurityAlert[] = [];
  private anomalies: Anomaly[] = [];
  private monitoringEnabled: boolean = true;
  private alertCallbacks: Map<string, (alert: SecurityAlert) => void> = new Map();

  // Thresholds for anomaly detection
  private readonly ANOMALY_THRESHOLD = 3; // 3 standard deviations
  private readonly CRITICAL_THRESHOLD = 5; // 5 standard deviations
  private readonly MIN_SAMPLES = 10; // Minimum samples to establish baseline
  private readonly MAX_SAMPLES = 100; // Maximum samples to keep in baseline

  private constructor() {
    // Start monitoring
    this.startMonitoring();
  }

  static getInstance(): IntrusionDetectionService {
    if (!IntrusionDetectionService.instance) {
      IntrusionDetectionService.instance = new IntrusionDetectionService();
    }
    return IntrusionDetectionService.instance;
  }

  /**
   * Detect anomaly in a metric
   */
  detectAnomaly(
    userId: string,
    metric: string,
    value: number,
    details?: any
  ): Anomaly | null {
    if (!this.monitoringEnabled) {
      return null;
    }

    const key = `${userId}:${metric}`;
    const baseline = this.baselines.get(key);

    if (!baseline) {
      // Initialize baseline with first value
      this.initializeBaseline(userId, metric, value);
      return null;
    }

    // Update baseline with new value
    this.updateBaseline(userId, metric, value);

    // Calculate deviation
    const deviation = Math.abs((value - baseline.mean) / baseline.stddev);

    // Check if anomaly
    if (deviation >= this.ANOMALY_THRESHOLD) {
      const severity = this.calculateSeverity(deviation);
      const anomaly: Anomaly = {
        id: this.generateId(),
        userId,
        metric,
        value,
        baseline: { mean: baseline.mean, stddev: baseline.stddev },
        deviation,
        threshold: this.ANOMALY_THRESHOLD,
        severity,
        timestamp: Date.now(),
        details
      };

      this.anomalies.push(anomaly);

      // Create security alert if severity is high or critical
      if (severity === 'high' || severity === 'critical') {
        this.createAlert(
          `Anomaly detected: ${metric}`,
          severity,
          userId,
          undefined,
          { anomaly, details }
        );
      }

      return anomaly;
    }

    return null;
  }

  /**
   * Initialize baseline for a metric
   */
  private initializeBaseline(userId: string, metric: string, value: number): void {
    const baseline: Baseline = {
      userId,
      metric,
      mean: value,
      stddev: 0,
      samples: [value],
      min: value,
      max: value,
      lastUpdated: Date.now()
    };

    this.baselines.set(`${userId}:${metric}`, baseline);
  }

  /**
   * Update baseline with new value
   */
  private updateBaseline(userId: string, metric: string, value: number): void {
    const key = `${userId}:${metric}`;
    const baseline = this.baselines.get(key);

    if (!baseline) {
      this.initializeBaseline(userId, metric, value);
      return;
    }

    // Add new sample
    baseline.samples.push(value);

    // Keep only last N samples
    if (baseline.samples.length > this.MAX_SAMPLES) {
      baseline.samples.shift();
    }

    // Calculate new mean and stddev
    const sum = baseline.samples.reduce((a, b) => a + b, 0);
    baseline.mean = sum / baseline.samples.length;

    const variance = baseline.samples.reduce((a, b) => a + Math.pow(b - baseline.mean, 2), 0) / baseline.samples.length;
    baseline.stddev = Math.sqrt(variance);

    // Update min/max
    baseline.min = Math.min(...baseline.samples);
    baseline.max = Math.max(...baseline.samples);

    baseline.lastUpdated = Date.now();
  }

  /**
   * Calculate severity based on deviation
   */
  private calculateSeverity(deviation: number): Anomaly['severity'] {
    if (deviation >= this.CRITICAL_THRESHOLD) {
      return 'critical';
    } else if (deviation >= this.ANOMALY_THRESHOLD * 1.5) {
      return 'high';
    } else if (deviation >= this.ANOMALY_THRESHOLD * 1.2) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Create security alert
   */
  createAlert(
    type: string,
    severity: SecurityAlert['severity'],
    userId?: string,
    walletAddress?: string,
    details?: any
  ): SecurityAlert {
    const alert: SecurityAlert = {
      id: this.generateId(),
      type,
      severity,
      userId,
      walletAddress,
      description: type,
      timestamp: Date.now(),
      details,
      resolved: false
    };

    this.alerts.push(alert);

    // Notify callbacks
    this.alertCallbacks.forEach((callback, id) => {
      try {
        callback(alert);
      } catch (error) {
        console.error(`Alert callback ${id} failed:`, error);
      }
    });

    return alert;
  }

  /**
   * Detect suspicious transaction patterns
   */
  detectSuspiciousTransaction(
    userId: string,
    walletAddress: string,
    to: string,
    value: bigint,
    frequency: number
  ): SecurityAlert | null {
    // Check for high-value transactions
    const valueEth = Number(value) / 1e18;
    const anomaly = this.detectAnomaly(userId, `transaction_value:${walletAddress}`, valueEth, { to });
    if (anomaly && anomaly.severity === 'critical') {
      return this.createAlert(
        'Suspicious high-value transaction',
        'critical',
        userId,
        walletAddress,
        { to, value: valueEth, anomaly }
      );
    }

    // Check for high transaction frequency
    const freqAnomaly = this.detectAnomaly(userId, `transaction_frequency:${walletAddress}`, frequency, { to });
    if (freqAnomaly && freqAnomaly.severity === 'high') {
      return this.createAlert(
        'Suspicious transaction frequency',
        'high',
        userId,
        walletAddress,
        { to, frequency, anomaly: freqAnomaly }
      );
    }

    return null;
  }

  /**
   * Detect suspicious authentication patterns
   */
  detectSuspiciousAuthentication(
    userId: string,
    ipAddress: string,
    userAgent: string,
    failedAttempts: number
  ): SecurityAlert | null {
    // Check for multiple failed attempts
    if (failedAttempts > 5) {
      return this.createAlert(
        'Multiple failed authentication attempts',
        'high',
        userId,
        undefined,
        { ipAddress, userAgent, failedAttempts }
      );
    }

    // Check for unusual IP address
    const anomaly = this.detectAnomaly(userId, 'auth_ip', this.hashIpAddress(ipAddress), { ipAddress });
    if (anomaly && anomaly.severity === 'high') {
      return this.createAlert(
        'Unusual IP address detected',
        'medium',
        userId,
        undefined,
        { ipAddress, userAgent, anomaly }
      );
    }

    return null;
  }

  /**
   * Detect suspicious wallet activity
   */
  detectSuspiciousWalletActivity(
    userId: string,
    walletAddress: string,
    action: string,
    timestamp: number
  ): SecurityAlert | null {
    // Check for rapid wallet operations
    const anomaly = this.detectAnomaly(userId, `wallet_operation_rate:${walletAddress}`, 1, { action, timestamp });
    if (anomaly && anomaly.severity === 'high') {
      return this.createAlert(
        'Suspicious wallet activity detected',
        'high',
        userId,
        walletAddress,
        { action, timestamp, anomaly }
      );
    }

    return null;
  }

  /**
   * Get alerts
   */
  getAlerts(filter?: {
    userId?: string;
    walletAddress?: string;
    severity?: SecurityAlert['severity'];
    resolved?: boolean;
  }): SecurityAlert[] {
    let filtered = [...this.alerts];

    if (filter) {
      if (filter.userId) {
        filtered = filtered.filter(a => a.userId === filter.userId);
      }
      if (filter.walletAddress) {
        filtered = filtered.filter(a => a.walletAddress === filter.walletAddress);
      }
      if (filter.severity) {
        filtered = filtered.filter(a => a.severity === filter.severity);
      }
      if (filter.resolved !== undefined) {
        filtered = filtered.filter(a => a.resolved === filter.resolved);
      }
    }

    return filtered;
  }

  /**
   * Get anomalies
   */
  getAnomalies(filter?: {
    userId?: string;
    metric?: string;
    severity?: Anomaly['severity'];
  }): Anomaly[] {
    let filtered = [...this.anomalies];

    if (filter) {
      if (filter.userId) {
        filtered = filtered.filter(a => a.userId === filter.userId);
      }
      if (filter.metric) {
        filtered = filtered.filter(a => a.metric === filter.metric);
      }
      if (filter.severity) {
        filtered = filtered.filter(a => a.severity === filter.severity);
      }
    }

    return filtered;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(olderThan: number): void {
    const now = Date.now();
    this.alerts = this.alerts.filter(a => now - a.timestamp < olderThan);
  }

  /**
   * Register alert callback
   */
  onAlert(callback: (alert: SecurityAlert) => void): string {
    const id = this.generateId();
    this.alertCallbacks.set(id, callback);
    return id;
  }

  /**
   * Unregister alert callback
   */
  offAlert(id: string): void {
    this.alertCallbacks.delete(id);
  }

  /**
   * Get baselines
   */
  getBaselines(userId?: string): Baseline[] {
    let baselines = Array.from(this.baselines.values());
    if (userId) {
      baselines = baselines.filter(b => b.userId === userId);
    }
    return baselines;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalAlerts: number;
    activeAlerts: number;
    alertsBySeverity: Record<SecurityAlert['severity'], number>;
    totalAnomalies: number;
    anomaliesBySeverity: Record<Anomaly['severity'], number>;
    totalBaselines: number;
  } {
    const alertsBySeverity: Record<SecurityAlert['severity'], number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    const anomaliesBySeverity: Record<Anomaly['severity'], number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    this.alerts.forEach(a => alertsBySeverity[a.severity]++);
    this.anomalies.forEach(a => anomaliesBySeverity[a.severity]++);

    return {
      totalAlerts: this.alerts.length,
      activeAlerts: this.alerts.filter(a => !a.resolved).length,
      alertsBySeverity,
      totalAnomalies: this.anomalies.length,
      anomaliesBySeverity,
      totalBaselines: this.baselines.size
    };
  }

  /**
   * Enable/disable monitoring
   */
  setMonitoringEnabled(enabled: boolean): void {
    this.monitoringEnabled = enabled;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.baselines.clear();
    this.alerts = [];
    this.anomalies = [];
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    // Periodic cleanup of old data
    setInterval(() => {
      this.clearOldAlerts(7 * 24 * 60 * 60 * 1000); // Clear alerts older than 7 days
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `ids_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Hash IP address for baseline comparison
   */
  private hashIpAddress(ip: string): number {
    // Simple hash function for IP addresses
    const parts = ip.split('.').map(Number);
    return parts.reduce((acc, part, index) => acc + part * Math.pow(256, 3 - index), 0);
  }
}

export const intrusionDetectionService = IntrusionDetectionService.getInstance();