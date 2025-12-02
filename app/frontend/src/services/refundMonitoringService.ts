import { apiClient } from '../config/api';

/**
 * Refund Transaction Tracker Interface
 */
export interface RefundTransactionTracker {
  totalRefunds: number;
  totalRefundAmount: number;
  successfulRefunds: number;
  failedRefunds: number;
  pendingRefunds: number;
  averageRefundTime: number;
  providerBreakdown: ProviderRefundStats[];
}

/**
 * Provider-specific refund statistics
 */
export interface ProviderRefundStats {
  provider: string;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalAmount: number;
  averageProcessingTime: number;
  successRate: number;
}

/**
 * Payment Provider Status
 */
export interface PaymentProviderStatus {
  provider: 'stripe' | 'paypal' | 'blockchain';
  status: 'operational' | 'degraded' | 'down';
  successRate: number;
  averageProcessingTime: number;
  lastSuccessfulRefund: Date | null;
  errorRate: number;
  recentErrors: string[];
}

/**
 * Refund Reconciliation Data
 */
export interface RefundReconciliation {
  totalReconciled: number;
  totalPending: number;
  totalDiscrepancies: number;
  totalDiscrepancyAmount: number;
  reconciliationRate: number;
  averageReconciliationTime: number;
}

/**
 * Refund Failure Analysis
 */
export interface RefundFailureAnalysis {
  totalFailures: number;
  failuresByProvider: Record<string, number>;
  failuresByReason: Record<string, number>;
  averageRetryCount: number;
  successfulRetries: number;
  permanentFailures: number;
}

/**
 * Failure Pattern
 */
export interface FailurePattern {
  patternId: string;
  patternType: 'provider_outage' | 'rate_limit' | 'insufficient_funds' | 'network_error' | 'validation_error' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedProvider?: string;
  occurrenceCount: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  affectedTransactions: string[];
  description: string;
  confidence: number;
}

/**
 * Alert Data
 */
export interface Alert {
  alertId: string;
  alertType: 'failure_spike' | 'provider_degraded' | 'provider_down' | 'high_discrepancy' | 'pattern_detected';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  affectedProvider?: string;
  affectedTransactionCount: number;
  detectedAt: Date;
  remediationSteps: string[];
  relatedPatterns?: FailurePattern[];
  metadata?: Record<string, any>;
}

/**
 * Remediation Suggestion
 */
export interface RemediationSuggestion {
  suggestionId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'immediate_action' | 'investigation' | 'monitoring' | 'configuration';
  title: string;
  description: string;
  steps: string[];
  estimatedImpact: string;
  automatable: boolean;
}

/**
 * Refund Monitoring Service
 * Frontend service for interacting with refund monitoring APIs
 * 
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 * Properties: 7, 8, 9, 10
 */
class RefundMonitoringService {
  private baseUrl = '/api/admin/refunds';

  /**
   * Get comprehensive refund transaction tracking data
   * Property 7: Multi-Provider Transaction Tracking
   * 
   * @param startDate - Start date for the tracking period
   * @param endDate - End date for the tracking period
   * @returns RefundTransactionTracker with all metrics
   */
  async getTransactionTracker(
    startDate: Date,
    endDate: Date
  ): Promise<RefundTransactionTracker> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/tracker`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching transaction tracker:', error);
      throw new Error('Failed to fetch refund transaction tracking data');
    }
  }

  /**
   * Get real-time payment provider status
   * Property 8: Failure Detection and Alerting
   * 
   * Monitors health and performance of all payment providers
   * @returns Array of PaymentProviderStatus for each provider
   */
  async getProviderStatus(): Promise<PaymentProviderStatus[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/providers/status`);
      return response.data.map((provider: any) => ({
        ...provider,
        lastSuccessfulRefund: provider.lastSuccessfulRefund 
          ? new Date(provider.lastSuccessfulRefund) 
          : null
      }));
    } catch (error) {
      console.error('Error fetching provider status:', error);
      throw new Error('Failed to fetch payment provider status');
    }
  }

  /**
   * Monitor provider health metrics
   * Comprehensive health monitoring for all payment providers
   * @returns Detailed health metrics for each provider
   */
  async monitorProviderHealth(): Promise<Array<{
    provider: 'stripe' | 'paypal' | 'blockchain';
    health: {
      overall: 'healthy' | 'warning' | 'critical';
      uptime: number;
      responseTime: number;
      errorRate: number;
      throughput: number;
    };
    metrics: {
      last5Minutes: {
        successCount: number;
        failureCount: number;
        averageResponseTime: number;
      };
      last15Minutes: {
        successCount: number;
        failureCount: number;
        averageResponseTime: number;
      };
      lastHour: {
        successCount: number;
        failureCount: number;
        averageResponseTime: number;
      };
    };
    alerts: Array<{
      severity: 'info' | 'warning' | 'critical';
      message: string;
      timestamp: Date;
    }>;
    recommendations: string[];
  }>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/providers/health`);
      return response.data.map((health: any) => ({
        ...health,
        alerts: health.alerts.map((alert: any) => ({
          ...alert,
          timestamp: new Date(alert.timestamp)
        }))
      }));
    } catch (error) {
      console.error('Error monitoring provider health:', error);
      throw new Error('Failed to monitor provider health');
    }
  }

  /**
   * Get refund reconciliation data
   * Property 9: Transaction Reconciliation Completeness
   * 
   * Tracks reconciliation status and identifies discrepancies
   * @param startDate - Start date for reconciliation period
   * @param endDate - End date for reconciliation period
   * @returns RefundReconciliation data
   */
  async getReconciliationData(
    startDate: Date,
    endDate: Date
  ): Promise<RefundReconciliation> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/reconciliation`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching reconciliation data:', error);
      throw new Error('Failed to fetch reconciliation data');
    }
  }

  /**
   * Analyze refund failures
   * Property 10: Discrepancy Detection
   * 
   * Provides detailed analysis of refund failures and patterns
   * @param startDate - Start date for analysis period
   * @param endDate - End date for analysis period
   * @returns RefundFailureAnalysis data
   */
  async analyzeFailures(
    startDate: Date,
    endDate: Date
  ): Promise<RefundFailureAnalysis> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/failures/analysis`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error analyzing failures:', error);
      throw new Error('Failed to analyze refund failures');
    }
  }

  /**
   * Detect failure patterns in refund transactions
   * Analyzes recent failures to identify patterns and trends
   * @param lookbackMinutes - How far back to analyze (default: 60 minutes)
   * @returns Array of detected failure patterns
   */
  async detectFailurePatterns(lookbackMinutes: number = 60): Promise<FailurePattern[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/failures/patterns`, {
        params: { lookbackMinutes }
      });
      return response.data.map((pattern: any) => ({
        ...pattern,
        firstOccurrence: new Date(pattern.firstOccurrence),
        lastOccurrence: new Date(pattern.lastOccurrence)
      }));
    } catch (error) {
      console.error('Error detecting failure patterns:', error);
      throw new Error('Failed to detect failure patterns');
    }
  }

  /**
   * Generate alerts based on current system state
   * Analyzes provider status, failure patterns, and reconciliation data
   * @returns Array of generated alerts
   */
  async generateAlerts(): Promise<Alert[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/alerts`);
      return response.data.map((alert: any) => ({
        ...alert,
        detectedAt: new Date(alert.detectedAt),
        relatedPatterns: alert.relatedPatterns?.map((pattern: any) => ({
          ...pattern,
          firstOccurrence: new Date(pattern.firstOccurrence),
          lastOccurrence: new Date(pattern.lastOccurrence)
        }))
      }));
    } catch (error) {
      console.error('Error generating alerts:', error);
      throw new Error('Failed to generate alerts');
    }
  }

  /**
   * Generate remediation suggestions based on current alerts and patterns
   * Provides prioritized, actionable suggestions for administrators
   * @param alerts - Current active alerts
   * @param patterns - Detected failure patterns
   * @returns Array of remediation suggestions
   */
  async generateRemediationSuggestions(
    alerts: Alert[],
    patterns: FailurePattern[]
  ): Promise<RemediationSuggestion[]> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/remediation/suggestions`, {
        alerts,
        patterns
      });
      return response.data;
    } catch (error) {
      console.error('Error generating remediation suggestions:', error);
      throw new Error('Failed to generate remediation suggestions');
    }
  }

  /**
   * Track a refund transaction
   * Creates or updates a refund financial record
   * @param refundData - Refund transaction data
   * @returns Created refund record
   */
  async trackRefundTransaction(refundData: {
    returnId: string;
    refundId: string;
    originalAmount: number;
    refundAmount: number;
    processingFee?: number;
    platformFeeImpact?: number;
    sellerImpact?: number;
    paymentProvider: string;
    providerTransactionId?: string;
    currency?: string;
    refundMethod?: string;
    metadata?: any;
  }): Promise<any> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/track`, refundData);
      return response.data;
    } catch (error) {
      console.error('Error tracking refund transaction:', error);
      throw new Error('Failed to track refund transaction');
    }
  }

  /**
   * Update refund transaction status
   * @param refundRecordId - ID of the refund record
   * @param status - New status
   * @param processedAt - Processing timestamp
   * @param failureReason - Reason for failure (if applicable)
   */
  async updateRefundStatus(
    refundRecordId: string,
    status: 'pending' | 'completed' | 'failed' | 'cancelled',
    processedAt?: Date,
    failureReason?: string
  ): Promise<void> {
    try {
      await apiClient.patch(`${this.baseUrl}/${refundRecordId}/status`, {
        status,
        processedAt: processedAt?.toISOString(),
        failureReason
      });
    } catch (error) {
      console.error('Error updating refund status:', error);
      throw new Error('Failed to update refund status');
    }
  }

  /**
   * Get refund transaction details
   * @param refundRecordId - ID of the refund record
   * @returns Detailed refund transaction information
   */
  async getRefundDetails(refundRecordId: string): Promise<any> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${refundRecordId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching refund details:', error);
      throw new Error('Failed to fetch refund details');
    }
  }

  /**
   * Get refund audit log
   * @param refundRecordId - ID of the refund record
   * @returns Array of audit log entries
   */
  async getRefundAuditLog(refundRecordId: string): Promise<any[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${refundRecordId}/audit-log`);
      return response.data.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }));
    } catch (error) {
      console.error('Error fetching refund audit log:', error);
      throw new Error('Failed to fetch refund audit log');
    }
  }

  /**
   * Export refund data
   * @param format - Export format (csv, excel, json)
   * @param startDate - Start date for export
   * @param endDate - End date for export
   * @returns Blob containing the exported data
   */
  async exportRefundData(
    format: 'csv' | 'excel' | 'json',
    startDate: Date,
    endDate: Date
  ): Promise<Blob> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/export`, {
        params: {
          format,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting refund data:', error);
      throw new Error('Failed to export refund data');
    }
  }
}

// Export singleton instance
export const refundMonitoringService = new RefundMonitoringService();
