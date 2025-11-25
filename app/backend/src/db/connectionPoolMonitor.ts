/**
 * Database Connection Pool Metrics Service
 * 
 * Tracks and monitors database connection pool health and performance.
 * Provides metrics for monitoring, alerting, and performance tuning.
 */

import { safeLogger } from '../utils/safeLogger';

export interface ConnectionPoolMetrics {
    timestamp: number;
    activeConnections: number;
    idleConnections: number;
    waitingClients: number;
    totalConnections: number;
    maxConnections: number;
    connectionErrors: number;
    queryCount: number;
    avgQueryDuration: number;
    poolUtilization: number; // Percentage
}

export interface AlertThresholds {
    highUtilization: number; // Percentage (default: 80%)
    criticalUtilization: number; // Percentage (default: 95%)
    maxErrors: number; // Max errors per minute (default: 10)
    slowQueryThreshold: number; // Milliseconds (default: 1000)
}

class ConnectionPoolMonitor {
    private metrics: ConnectionPoolMetrics;
    private metricsHistory: ConnectionPoolMetrics[] = [];
    private maxHistorySize = 1000; // Keep last 1000 metrics snapshots
    private queryDurations: number[] = [];
    private errorCount = 0;
    private lastErrorReset = Date.now();
    private connectionErrorCount = 0;
    private lastConnectionErrorReset = Date.now();
    private alertThresholds: AlertThresholds;
    private alertCallbacks: ((alert: PoolAlert) => void)[] = [];

    constructor(maxConnections: number, thresholds?: Partial<AlertThresholds>) {
        this.metrics = {
            timestamp: Date.now(),
            activeConnections: 0,
            idleConnections: 0,
            waitingClients: 0,
            totalConnections: 0,
            maxConnections,
            connectionErrors: 0,
            queryCount: 0,
            avgQueryDuration: 0,
            poolUtilization: 0,
        };

        this.alertThresholds = {
            highUtilization: thresholds?.highUtilization ?? 80,
            criticalUtilization: thresholds?.criticalUtilization ?? 95,
            maxErrors: thresholds?.maxErrors ?? 10,
            slowQueryThreshold: thresholds?.slowQueryThreshold ?? 1000,
        };
    }

    /**
     * Update connection pool metrics
     */
    updateMetrics(update: Partial<Omit<ConnectionPoolMetrics, 'timestamp' | 'poolUtilization'>>) {
        this.metrics = {
            ...this.metrics,
            ...update,
            timestamp: Date.now(),
        };

        // Calculate pool utilization
        this.metrics.poolUtilization = (this.metrics.totalConnections / this.metrics.maxConnections) * 100;

        // Add to history
        this.metricsHistory.push({ ...this.metrics });
        if (this.metricsHistory.length > this.maxHistorySize) {
            this.metricsHistory.shift();
        }

        // Check for alerts
        this.checkAlerts();
    }

    /**
     * Record a query execution
     */
    recordQuery(duration: number) {
        this.metrics.queryCount++;
        this.queryDurations.push(duration);

        // Keep only last 100 query durations for average calculation
        if (this.queryDurations.length > 100) {
            this.queryDurations.shift();
        }

        // Calculate average query duration
        this.metrics.avgQueryDuration =
            this.queryDurations.reduce((sum, d) => sum + d, 0) / this.queryDurations.length;

        // Alert on slow queries
        if (duration > this.alertThresholds.slowQueryThreshold) {
            this.triggerAlert({
                level: 'warning',
                type: 'slow_query',
                message: `Slow query detected: ${duration}ms`,
                metrics: { ...this.metrics },
            });
        }
    }

    /**
     * Record a connection error
     */
    recordError(error?: any) {
        this.errorCount++;
        this.metrics.connectionErrors++;

        // Check if this is a connection-specific error
        let isConnectionError = false;
        if (error && typeof error === 'object' && 'code' in error) {
            const errorCode = (error as any).code;
            if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT') {
                isConnectionError = true;
                this.connectionErrorCount++;
            }
        }

        // Reset error count every minute
        const now = Date.now();
        if (now - this.lastErrorReset > 60000) {
            this.errorCount = 1;
            this.lastErrorReset = now;
        }
        
        // Reset connection error count every 5 minutes
        if (now - this.lastConnectionErrorReset > 300000) {
            this.connectionErrorCount = 1;
            this.lastConnectionErrorReset = now;
        }

        // Alert on high error rate
        if (this.errorCount > this.alertThresholds.maxErrors) {
            this.triggerAlert({
                level: 'critical',
                type: 'high_error_rate',
                message: `High error rate: ${this.errorCount} errors in the last minute`,
                metrics: { ...this.metrics },
            });
        }
        
        // Alert specifically on connection errors
        if (isConnectionError && this.connectionErrorCount > 3) {
            this.triggerAlert({
                level: 'critical',
                type: 'high_error_rate',
                message: `High connection error rate: ${this.connectionErrorCount} connection errors in the last 5 minutes`,
                metrics: { ...this.metrics },
            });
        }
    }

    /**
     * Check for alert conditions
     */
    private checkAlerts() {
        const { poolUtilization } = this.metrics;

        if (poolUtilization >= this.alertThresholds.criticalUtilization) {
            this.triggerAlert({
                level: 'critical',
                type: 'pool_exhaustion',
                message: `Critical pool utilization: ${poolUtilization.toFixed(1)}%`,
                metrics: { ...this.metrics },
            });
        } else if (poolUtilization >= this.alertThresholds.highUtilization) {
            this.triggerAlert({
                level: 'warning',
                type: 'high_utilization',
                message: `High pool utilization: ${poolUtilization.toFixed(1)}%`,
                metrics: { ...this.metrics },
            });
        }
    }

    /**
     * Trigger an alert
     */
    private triggerAlert(alert: PoolAlert) {
        safeLogger.warn(`[DB Pool Alert] ${alert.level.toUpperCase()}: ${alert.message}`, {
            type: alert.type,
            metrics: alert.metrics,
        });

        // Call registered alert callbacks
        this.alertCallbacks.forEach((callback) => {
            try {
                callback(alert);
            } catch (error) {
                safeLogger.error('Error in alert callback:', error);
            }
        });
    }

    /**
     * Register an alert callback
     */
    onAlert(callback: (alert: PoolAlert) => void) {
        this.alertCallbacks.push(callback);
    }

    /**
     * Get current metrics
     */
    getCurrentMetrics(): ConnectionPoolMetrics {
        return { ...this.metrics };
    }

    /**
     * Get metrics history
     */
    getMetricsHistory(limit?: number): ConnectionPoolMetrics[] {
        if (limit) {
            return this.metricsHistory.slice(-limit);
        }
        return [...this.metricsHistory];
    }

    /**
     * Get metrics summary for a time period
     */
    getMetricsSummary(periodMs: number = 300000): MetricsSummary {
        const cutoff = Date.now() - periodMs;
        const recentMetrics = this.metricsHistory.filter((m) => m.timestamp >= cutoff);

        if (recentMetrics.length === 0) {
            return {
                period: periodMs,
                avgUtilization: 0,
                maxUtilization: 0,
                avgQueryDuration: 0,
                totalQueries: 0,
                totalErrors: 0,
            };
        }

        return {
            period: periodMs,
            avgUtilization:
                recentMetrics.reduce((sum, m) => sum + m.poolUtilization, 0) / recentMetrics.length,
            maxUtilization: Math.max(...recentMetrics.map((m) => m.poolUtilization)),
            avgQueryDuration:
                recentMetrics.reduce((sum, m) => sum + m.avgQueryDuration, 0) / recentMetrics.length,
            totalQueries: recentMetrics[recentMetrics.length - 1].queryCount - recentMetrics[0].queryCount,
            totalErrors:
                recentMetrics[recentMetrics.length - 1].connectionErrors - recentMetrics[0].connectionErrors,
        };
    }

    /**
     * Reset metrics
     */
    reset() {
        this.metrics.queryCount = 0;
        this.metrics.connectionErrors = 0;
        this.queryDurations = [];
        this.errorCount = 0;
        this.lastErrorReset = Date.now();
    }

    /**
     * Get performance recommendations
     */
    getRecommendations(): string[] {
        const recommendations: string[] = [];
        const summary = this.getMetricsSummary();

        if (summary.avgUtilization > 80) {
            recommendations.push(
                `High average pool utilization (${summary.avgUtilization.toFixed(1)}%). Consider increasing max_connections.`
            );
        }

        if (summary.avgQueryDuration > 500) {
            recommendations.push(
                `High average query duration (${summary.avgQueryDuration.toFixed(0)}ms). Consider optimizing slow queries or adding indexes.`
            );
        }

        if (summary.totalErrors > 5) {
            recommendations.push(
                `${summary.totalErrors} connection errors in the last 5 minutes. Check database connectivity and health.`
            );
        }

        if (this.metrics.waitingClients > 0) {
            recommendations.push(
                `${this.metrics.waitingClients} clients waiting for connections. Pool may be undersized.`
            );
        }

        return recommendations;
    }
}

export interface PoolAlert {
    level: 'warning' | 'critical';
    type: 'high_utilization' | 'pool_exhaustion' | 'high_error_rate' | 'slow_query';
    message: string;
    metrics: ConnectionPoolMetrics;
}

export interface MetricsSummary {
    period: number;
    avgUtilization: number;
    maxUtilization: number;
    avgQueryDuration: number;
    totalQueries: number;
    totalErrors: number;
}

// Singleton instance
let monitorInstance: ConnectionPoolMonitor | null = null;

export function initializeMonitor(maxConnections: number, thresholds?: Partial<AlertThresholds>) {
    monitorInstance = new ConnectionPoolMonitor(maxConnections, thresholds);
    return monitorInstance;
}

export function getMonitor(): ConnectionPoolMonitor | null {
    return monitorInstance;
}

export { ConnectionPoolMonitor };
