/**
 * Document Performance Monitoring Service
 * Monitors document loading times, errors, and user experience metrics
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface PerformanceMetric {
  documentPath: string;
  title: string;
  category: string;
  timestamp: Date;
  loadTime: number; // milliseconds
  fileSize: number; // bytes
  renderTime?: number;
  errorCount: number;
  userAgent?: string;
  connectionType?: string;
  cacheHit: boolean;
}

export interface ErrorLog {
  id: string;
  documentPath: string;
  errorType: 'load_failure' | 'parse_error' | 'render_error' | 'network_error';
  errorMessage: string;
  timestamp: Date;
  userAgent?: string;
  stackTrace?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceAlert {
  id: string;
  documentPath: string;
  alertType: 'slow_loading' | 'high_error_rate' | 'large_file_size' | 'render_issues';
  threshold: number;
  currentValue: number;
  severity: 'warning' | 'critical';
  timestamp: Date;
  description: string;
  recommendations: string[];
}

export interface PerformanceReport {
  summary: {
    totalDocuments: number;
    averageLoadTime: number;
    totalErrors: number;
    errorRate: number;
    slowDocuments: number;
    cacheHitRate: number;
  };
  slowestDocuments: Array<{
    path: string;
    title: string;
    averageLoadTime: number;
    fileSize: number;
  }>;
  errorsByType: Record<string, number>;
  alerts: PerformanceAlert[];
  recommendations: string[];
}

export class DocumentPerformanceMonitoringService {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private errors: Map<string, ErrorLog[]> = new Map();
  private alerts: PerformanceAlert[] = [];
  private thresholds: {
    loadTime: number;
    fileSize: number;
    errorRate: number;
    renderTime: number;
  };

  constructor() {
    this.thresholds = {
      loadTime: 3000,    // 3 seconds
      fileSize: 1048576, // 1MB
      errorRate: 0.05,   // 5%
      renderTime: 1000   // 1 second
    };
  }

  /**
   * Record performance metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date()
    };

    const documentMetrics = this.metrics.get(metric.documentPath) || [];
    documentMetrics.push(fullMetric);
    
    // Keep only last 1000 metrics per document
    if (documentMetrics.length > 1000) {
      documentMetrics.splice(0, documentMetrics.length - 1000);
    }
    
    this.metrics.set(metric.documentPath, documentMetrics);

    // Check for performance issues
    this.checkPerformanceThresholds(metric.documentPath);
  }

  /**
   * Record error
   */
  recordError(error: Omit<ErrorLog, 'id' | 'timestamp'>): void {
    const fullError: ErrorLog = {
      ...error,
      id: this.generateErrorId(),
      timestamp: new Date()
    };

    const documentErrors = this.errors.get(error.documentPath) || [];
    documentErrors.push(fullError);
    
    // Keep only last 500 errors per document
    if (documentErrors.length > 500) {
      documentErrors.splice(0, documentErrors.length - 500);
    }
    
    this.errors.set(error.documentPath, documentErrors);

    // Check error rate thresholds
    this.checkErrorRateThresholds(error.documentPath);
  }

  /**
   * Check performance thresholds and create alerts
   */
  private checkPerformanceThresholds(documentPath: string): void {
    const metrics = this.metrics.get(documentPath) || [];
    if (metrics.length < 5) return; // Need at least 5 samples

    const recentMetrics = metrics.slice(-10); // Last 10 metrics
    const averageLoadTime = recentMetrics.reduce((sum, m) => sum + m.loadTime, 0) / recentMetrics.length;
    const averageFileSize = recentMetrics.reduce((sum, m) => sum + m.fileSize, 0) / recentMetrics.length;

    // Check load time threshold
    if (averageLoadTime > this.thresholds.loadTime) {
      this.createAlert({
        documentPath,
        alertType: 'slow_loading',
        threshold: this.thresholds.loadTime,
        currentValue: averageLoadTime,
        severity: averageLoadTime > this.thresholds.loadTime * 2 ? 'critical' : 'warning',
        description: `Document loading slower than expected (${Math.round(averageLoadTime)}ms vs ${this.thresholds.loadTime}ms threshold)`,
        recommendations: [
          'Optimize document size and complexity',
          'Enable compression',
          'Consider lazy loading for large content',
          'Review image optimization'
        ]
      });
    }

    // Check file size threshold
    if (averageFileSize > this.thresholds.fileSize) {
      this.createAlert({
        documentPath,
        alertType: 'large_file_size',
        threshold: this.thresholds.fileSize,
        currentValue: averageFileSize,
        severity: averageFileSize > this.thresholds.fileSize * 2 ? 'critical' : 'warning',
        description: `Document file size exceeds recommended limit (${Math.round(averageFileSize / 1024)}KB vs ${Math.round(this.thresholds.fileSize / 1024)}KB threshold)`,
        recommendations: [
          'Compress images and media',
          'Remove unnecessary content',
          'Split large documents into smaller sections',
          'Use external links for supplementary content'
        ]
      });
    }
  }

  /**
   * Check error rate thresholds
   */
  private checkErrorRateThresholds(documentPath: string): void {
    const metrics = this.metrics.get(documentPath) || [];
    const errors = this.errors.get(documentPath) || [];
    
    if (metrics.length < 10) return; // Need sufficient sample size

    const recentMetrics = metrics.slice(-50); // Last 50 requests
    const recentErrors = errors.filter(e => 
      e.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    );

    const errorRate = recentErrors.length / recentMetrics.length;

    if (errorRate > this.thresholds.errorRate) {
      this.createAlert({
        documentPath,
        alertType: 'high_error_rate',
        threshold: this.thresholds.errorRate,
        currentValue: errorRate,
        severity: errorRate > this.thresholds.errorRate * 2 ? 'critical' : 'warning',
        description: `High error rate detected (${Math.round(errorRate * 100)}% vs ${Math.round(this.thresholds.errorRate * 100)}% threshold)`,
        recommendations: [
          'Review document format and syntax',
          'Check for broken links and references',
          'Validate document metadata',
          'Monitor server-side errors'
        ]
      });
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp'>): void {
    // Check if similar alert already exists
    const existingAlert = this.alerts.find(a => 
      a.documentPath === alertData.documentPath && 
      a.alertType === alertData.alertType &&
      a.timestamp > new Date(Date.now() - 60 * 60 * 1000) // Within last hour
    );

    if (existingAlert) return; // Don't create duplicate alerts

    const alert: PerformanceAlert = {
      ...alertData,
      id: this.generateAlertId(),
      timestamp: new Date()
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.splice(0, this.alerts.length - 100);
    }

    console.log(`Performance alert created: ${alert.alertType} for ${alert.documentPath}`);
  }

  /**
   * Get performance metrics for a document
   */
  getDocumentMetrics(documentPath: string, hours: number = 24): PerformanceMetric[] {
    const metrics = this.metrics.get(documentPath) || [];
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return metrics.filter(m => m.timestamp > cutoff);
  }

  /**
   * Get error logs for a document
   */
  getDocumentErrors(documentPath: string, hours: number = 24): ErrorLog[] {
    const errors = this.errors.get(documentPath) || [];
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return errors.filter(e => e.timestamp > cutoff);
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport(hours: number = 24): PerformanceReport {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    // Collect all recent metrics
    const allMetrics: PerformanceMetric[] = [];
    const allErrors: ErrorLog[] = [];
    
    for (const [path, metrics] of this.metrics.entries()) {
      const recentMetrics = metrics.filter(m => m.timestamp > cutoff);
      allMetrics.push(...recentMetrics);
      
      const errors = this.errors.get(path) || [];
      const recentErrors = errors.filter(e => e.timestamp > cutoff);
      allErrors.push(...recentErrors);
    }

    // Calculate summary statistics
    const totalDocuments = this.metrics.size;
    const averageLoadTime = allMetrics.length > 0 
      ? allMetrics.reduce((sum, m) => sum + m.loadTime, 0) / allMetrics.length 
      : 0;
    const totalErrors = allErrors.length;
    const errorRate = allMetrics.length > 0 ? totalErrors / allMetrics.length : 0;
    const slowDocuments = this.getSlowDocuments().length;
    const cacheHitRate = allMetrics.length > 0
      ? allMetrics.filter(m => m.cacheHit).length / allMetrics.length
      : 0;

    // Find slowest documents
    const slowestDocuments = this.getSlowDocuments().slice(0, 10);

    // Group errors by type
    const errorsByType = allErrors.reduce((acc, error) => {
      acc[error.errorType] = (acc[error.errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get recent alerts
    const recentAlerts = this.alerts.filter(a => a.timestamp > cutoff);

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      averageLoadTime,
      errorRate,
      slowDocuments,
      cacheHitRate,
      totalErrors
    });

    return {
      summary: {
        totalDocuments,
        averageLoadTime: Math.round(averageLoadTime),
        totalErrors,
        errorRate: Math.round(errorRate * 100) / 100,
        slowDocuments,
        cacheHitRate: Math.round(cacheHitRate * 100) / 100
      },
      slowestDocuments,
      errorsByType,
      alerts: recentAlerts,
      recommendations
    };
  }

  /**
   * Get slowest loading documents
   */
  private getSlowDocuments(): Array<{
    path: string;
    title: string;
    averageLoadTime: number;
    fileSize: number;
  }> {
    const slowDocuments: Array<{
      path: string;
      title: string;
      averageLoadTime: number;
      fileSize: number;
    }> = [];

    for (const [path, metrics] of this.metrics.entries()) {
      if (metrics.length < 5) continue; // Need sufficient data

      const recentMetrics = metrics.slice(-20); // Last 20 requests
      const averageLoadTime = recentMetrics.reduce((sum, m) => sum + m.loadTime, 0) / recentMetrics.length;
      const averageFileSize = recentMetrics.reduce((sum, m) => sum + m.fileSize, 0) / recentMetrics.length;

      if (averageLoadTime > this.thresholds.loadTime) {
        slowDocuments.push({
          path,
          title: recentMetrics[0]?.title || path,
          averageLoadTime: Math.round(averageLoadTime),
          fileSize: Math.round(averageFileSize)
        });
      }
    }

    return slowDocuments.sort((a, b) => b.averageLoadTime - a.averageLoadTime);
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(stats: {
    averageLoadTime: number;
    errorRate: number;
    slowDocuments: number;
    cacheHitRate: number;
    totalErrors: number;
  }): string[] {
    const recommendations: string[] = [];

    if (stats.averageLoadTime > this.thresholds.loadTime) {
      recommendations.push('Overall document loading is slow - consider global optimizations');
    }

    if (stats.errorRate > this.thresholds.errorRate) {
      recommendations.push('High error rate detected - review document quality and server stability');
    }

    if (stats.slowDocuments > 0) {
      recommendations.push(`${stats.slowDocuments} documents are loading slowly - prioritize optimization`);
    }

    if (stats.cacheHitRate < 0.8) {
      recommendations.push('Low cache hit rate - review caching strategy');
    }

    if (stats.totalErrors > 50) {
      recommendations.push('High number of errors - investigate common failure patterns');
    }

    if (recommendations.length === 0) {
      recommendations.push('Document performance is within acceptable thresholds');
    }

    return recommendations;
  }

  // Helper methods
  private generateErrorId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear old data to prevent memory leaks
   */
  cleanup(daysToKeep: number = 7): void {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    // Clean up metrics
    for (const [path, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(m => m.timestamp > cutoff);
      if (filteredMetrics.length === 0) {
        this.metrics.delete(path);
      } else {
        this.metrics.set(path, filteredMetrics);
      }
    }

    // Clean up errors
    for (const [path, errors] of this.errors.entries()) {
      const filteredErrors = errors.filter(e => e.timestamp > cutoff);
      if (filteredErrors.length === 0) {
        this.errors.delete(path);
      } else {
        this.errors.set(path, filteredErrors);
      }
    }

    // Clean up alerts
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
  }
}

export const documentPerformanceMonitoringService = new DocumentPerformanceMonitoringService();