import { safeLogger } from '../utils/safeLogger';
import { selfHostedStorageService } from '../services/selfHostedStorageService';
import { backupService } from '../services/backupService';

// Configuration
const MONITORING_INTERVAL = parseInt(process.env.MONITORING_INTERVAL || '60000'); // 1 minute
const ALERT_THRESHOLD_CPU = parseFloat(process.env.ALERT_THRESHOLD_CPU || '80');
const ALERT_THRESHOLD_MEMORY = parseFloat(process.env.ALERT_THRESHOLD_MEMORY || '85');
const ALERT_THRESHOLD_DISK = parseFloat(process.env.ALERT_THRESHOLD_DISK || '90');
const ALERT_THRESHOLD_STORAGE_ERRORS = parseInt(process.env.ALERT_THRESHOLD_STORAGE_ERRORS || '10');

// Alert types
export type AlertType = 'cpu' | 'memory' | 'disk' | 'storage' | 'backup' | 'security' | 'performance';

// Alert levels
export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';

// Alert interface
export interface Alert {
  id: string;
  type: AlertType;
  level: AlertLevel;
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: Record<string, any>;
}

// System metrics
export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: number;
  timestamp: Date;
}

// Storage metrics
export interface StorageMetrics {
  totalFiles: number;
  totalSize: number;
  errorCount: number;
  lastError?: string;
  timestamp: Date;
}

export class StorageMonitoringService {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alerts: Alert[] = [];
  private errorCount: number = 0;
  private lastErrorTime: Date | null = null;

  constructor() {
    this.startMonitoring();
  }

  /**
   * Start monitoring services
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectAndAnalyzeMetrics();
      } catch (error) {
        safeLogger.error('Monitoring cycle failed:', error);
      }
    }, MONITORING_INTERVAL);
    
    safeLogger.info('Storage monitoring service started');
  }

  /**
   * Collect and analyze system metrics
   */
  private async collectAndAnalyzeMetrics(): Promise<void> {
    try {
      // Collect system metrics
      const systemMetrics = await this.collectSystemMetrics();
      await this.analyzeSystemMetrics(systemMetrics);
      
      // Collect storage metrics
      const storageMetrics = await this.collectStorageMetrics();
      await this.analyzeStorageMetrics(storageMetrics);
      
      // Check backup status
      await this.checkBackupStatus();
      
      // Clean up old alerts
      this.cleanupOldAlerts();
    } catch (error) {
      safeLogger.error('Metrics collection failed:', error);
    }
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<SystemMetrics> {
    // In a real implementation, you would collect actual system metrics
    // For now, we'll simulate with mock data
    const metrics: SystemMetrics = {
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      diskUsage: Math.random() * 100,
      uptime: process.uptime(),
      timestamp: new Date()
    };
    
    return metrics;
  }

  /**
   * Analyze system metrics and generate alerts
   */
  private async analyzeSystemMetrics(metrics: SystemMetrics): Promise<void> {
    // CPU usage alert
    if (metrics.cpuUsage > ALERT_THRESHOLD_CPU) {
      await this.createAlert({
        type: 'cpu',
        level: metrics.cpuUsage > 95 ? 'critical' : 'warning',
        message: `High CPU usage detected: ${metrics.cpuUsage.toFixed(2)}%`,
        metadata: { cpuUsage: metrics.cpuUsage }
      });
    }
    
    // Memory usage alert
    if (metrics.memoryUsage > ALERT_THRESHOLD_MEMORY) {
      await this.createAlert({
        type: 'memory',
        level: metrics.memoryUsage > 95 ? 'critical' : 'warning',
        message: `High memory usage detected: ${metrics.memoryUsage.toFixed(2)}%`,
        metadata: { memoryUsage: metrics.memoryUsage }
      });
    }
    
    // Disk usage alert
    if (metrics.diskUsage > ALERT_THRESHOLD_DISK) {
      await this.createAlert({
        type: 'disk',
        level: metrics.diskUsage > 98 ? 'critical' : 'warning',
        message: `High disk usage detected: ${metrics.diskUsage.toFixed(2)}%`,
        metadata: { diskUsage: metrics.diskUsage }
      });
    }
  }

  /**
   * Collect storage metrics
   */
  private async collectStorageMetrics(): Promise<StorageMetrics> {
    try {
      const stats = await selfHostedStorageService.getStorageStats();
      
      const metrics: StorageMetrics = {
        totalFiles: stats.totalFiles,
        totalSize: stats.totalSize,
        errorCount: this.errorCount,
        lastError: this.lastErrorTime ? `Last error: ${this.lastErrorTime.toISOString()}` : undefined,
        timestamp: new Date()
      };
      
      return metrics;
    } catch (error) {
      this.errorCount++;
      this.lastErrorTime = new Date();
      
      throw error;
    }
  }

  /**
   * Analyze storage metrics and generate alerts
   */
  private async analyzeStorageMetrics(metrics: StorageMetrics): Promise<void> {
    // Storage error rate alert
    if (metrics.errorCount > ALERT_THRESHOLD_STORAGE_ERRORS) {
      await this.createAlert({
        type: 'storage',
        level: 'error',
        message: `High storage error rate detected: ${metrics.errorCount} errors`,
        metadata: { errorCount: metrics.errorCount, lastError: metrics.lastError }
      });
    }
    
    // Storage capacity alert (if we knew the total capacity)
    // This would be implemented when we have actual disk space monitoring
  }

  /**
   * Check backup status
   */
  private async checkBackupStatus(): Promise<void> {
    try {
      const backups = await backupService.listBackups();
      
      if (backups.length === 0) {
        await this.createAlert({
          type: 'backup',
          level: 'warning',
          message: 'No backups found - backup system may not be configured properly'
        });
        return;
      }
      
      // Check if last backup is too old
      const lastBackup = backups[0];
      const ageInHours = (Date.now() - lastBackup.timestamp.getTime()) / (1000 * 60 * 60);
      
      if (ageInHours > 24) {
        await this.createAlert({
          type: 'backup',
          level: 'warning',
          message: `Last backup is ${ageInHours.toFixed(1)} hours old`,
          metadata: { lastBackupTime: lastBackup.timestamp.toISOString() }
        });
      }
    } catch (error) {
      await this.createAlert({
        type: 'backup',
        level: 'error',
        message: `Backup status check failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }

  /**
   * Create and send alert
   */
  private async createAlert(alertData: {
    type: AlertType;
    level: AlertLevel;
    message: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: alertData.type,
      level: alertData.level,
      message: alertData.message,
      timestamp: new Date(),
      resolved: false,
      metadata: alertData.metadata
    };
    
    this.alerts.push(alert);
    
    // Log alert
    safeLogger[alert.level === 'critical' ? 'error' : 
               alert.level === 'error' ? 'error' : 
               alert.level === 'warning' ? 'warn' : 'info'](
      `STORAGE ALERT [${alert.type.toUpperCase()}]: ${alert.message}`,
      alert.metadata
    );
    
    // Send external notifications if needed
    await this.sendAlertNotification(alert);
  }

  /**
   * Send alert notification (placeholder for external integrations)
   */
  private async sendAlertNotification(alert: Alert): Promise<void> {
    // In a real implementation, you would integrate with:
    // - Email services (SMTP, SendGrid, etc.)
    // - SMS services (Twilio, AWS SNS, etc.)
    // - Chat services (Slack, Discord, etc.)
    // - Monitoring services (PagerDuty, Opsgenie, etc.)
    
    // For now, we'll just log that notifications would be sent
    safeLogger.info('Alert notification would be sent here', {
      alertId: alert.id,
      type: alert.type,
      level: alert.level,
      message: alert.message
    });
  }

  /**
   * Get current alerts
   */
  async getAlerts(options?: {
    type?: AlertType;
    level?: AlertLevel;
    limit?: number;
    unresolvedOnly?: boolean;
  }): Promise<Alert[]> {
    let filteredAlerts = [...this.alerts];
    
    if (options?.type) {
      filteredAlerts = filteredAlerts.filter(alert => alert.type === options.type);
    }
    
    if (options?.level) {
      filteredAlerts = filteredAlerts.filter(alert => alert.level === options.level);
    }
    
    if (options?.unresolvedOnly) {
      filteredAlerts = filteredAlerts.filter(alert => !alert.resolved);
    }
    
    // Sort by timestamp (newest first)
    filteredAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (options?.limit) {
      filteredAlerts = filteredAlerts.slice(0, options.limit);
    }
    
    return filteredAlerts;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    
    if (alert) {
      alert.resolved = true;
      safeLogger.info(`Alert resolved: ${alertId}`);
      return true;
    }
    
    return false;
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    return await this.collectSystemMetrics();
  }

  /**
   * Get storage metrics
   */
  async getStorageMetrics(): Promise<StorageMetrics> {
    return await this.collectStorageMetrics();
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    avgResponseTime: number;
    errorRate: number;
    throughput: number;
    timestamp: Date;
  }> {
    // In a real implementation, you would collect actual performance metrics
    // For now, we'll return mock data
    return {
      avgResponseTime: Math.random() * 1000, // 0-1000ms
      errorRate: Math.random() * 5, // 0-5%
      throughput: Math.random() * 1000, // 0-1000 requests/minute
      timestamp: new Date()
    };
  }

  /**
   * Cleanup old alerts
   */
  private cleanupOldAlerts(): void {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 1 week ago
    const initialLength = this.alerts.length;
    
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoffDate);
    
    if (this.alerts.length < initialLength) {
      safeLogger.info(`Cleaned up ${initialLength - this.alerts.length} old alerts`);
    }
  }

  /**
   * Reset error counters
   */
  async resetErrorCounters(): Promise<void> {
    this.errorCount = 0;
    this.lastErrorTime = null;
    safeLogger.info('Storage error counters reset');
  }

  /**
   * Stop monitoring service
   */
  async stop(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    safeLogger.info('Storage monitoring service stopped');
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    metrics: {
      system: SystemMetrics;
      storage: StorageMetrics;
      performance: any;
    };
  }> {
    try {
      const systemMetrics = await this.collectSystemMetrics();
      const storageMetrics = await this.collectStorageMetrics();
      const performanceMetrics = await this.getPerformanceMetrics();
      
      const issues: string[] = [];
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      // Check system metrics
      if (systemMetrics.cpuUsage > ALERT_THRESHOLD_CPU) {
        issues.push(`High CPU usage: ${systemMetrics.cpuUsage.toFixed(2)}%`);
        if (systemMetrics.cpuUsage > 95) status = 'unhealthy';
        else if (status === 'healthy') status = 'degraded';
      }
      
      if (systemMetrics.memoryUsage > ALERT_THRESHOLD_MEMORY) {
        issues.push(`High memory usage: ${systemMetrics.memoryUsage.toFixed(2)}%`);
        if (systemMetrics.memoryUsage > 95) status = 'unhealthy';
        else if (status === 'healthy') status = 'degraded';
      }
      
      if (systemMetrics.diskUsage > ALERT_THRESHOLD_DISK) {
        issues.push(`High disk usage: ${systemMetrics.diskUsage.toFixed(2)}%`);
        if (systemMetrics.diskUsage > 98) status = 'unhealthy';
        else if (status === 'healthy') status = 'degraded';
      }
      
      // Check storage errors
      if (storageMetrics.errorCount > ALERT_THRESHOLD_STORAGE_ERRORS) {
        issues.push(`High error rate: ${storageMetrics.errorCount} errors`);
        if (storageMetrics.errorCount > ALERT_THRESHOLD_STORAGE_ERRORS * 2) status = 'unhealthy';
        else if (status === 'healthy') status = 'degraded';
      }
      
      return {
        status,
        issues,
        metrics: {
          system: systemMetrics,
          storage: storageMetrics,
          performance: performanceMetrics
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        issues: [`Health check failed: ${error instanceof Error ? error.message : String(error)}`],
        metrics: {
          system: await this.collectSystemMetrics(),
          storage: await this.collectStorageMetrics(),
          performance: await this.getPerformanceMetrics()
        }
      };
    }
  }
}

// Export singleton instance
export const storageMonitoringService = new StorageMonitoringService();
export default StorageMonitoringService;