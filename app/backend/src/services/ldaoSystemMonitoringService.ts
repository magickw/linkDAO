import { eq, desc, gte, lte, and } from 'drizzle-orm';
import { db } from '../db/connection';
import { systemMetrics, userFeedback, performanceLogs } from '../db/schema';
import { createNotification } from './notificationService';
import { sendEmail } from './emailService';

export interface SystemMetrics {
  id: string;
  metricType: 'performance' | 'usage' | 'error' | 'business';
  metricName: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
  timestamp: Date;
}

export interface PerformanceMetrics {
  responseTime: {
    average: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerSecond: number;
    transactionsPerSecond: number;
  };
  errorRate: {
    percentage: number;
    count: number;
  };
  systemHealth: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
}

export interface UserFeedback {
  id: string;
  userId: string;
  feature: string;
  rating: number;
  comment?: string;
  category: 'bug' | 'feature-request' | 'improvement' | 'praise';
  status: 'new' | 'reviewed' | 'in-progress' | 'resolved';
  createdAt: Date;
}

export interface SystemAlert {
  id: string;
  type: 'performance' | 'error' | 'security' | 'business';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metrics: Record<string, any>;
  isResolved: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

class LDAOSystemMonitoringService {
  private alertThresholds = {
    responseTime: { warning: 1000, critical: 3000 }, // milliseconds
    errorRate: { warning: 1, critical: 5 }, // percentage
    cpuUsage: { warning: 70, critical: 90 }, // percentage
    memoryUsage: { warning: 80, critical: 95 }, // percentage
    transactionFailureRate: { warning: 2, critical: 10 } // percentage
  };

  // Performance Monitoring
  async recordMetric(metric: Omit<SystemMetrics, 'id'>): Promise<void> {
    try {
      const metricId = `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await db.insert(systemMetrics).values({
        id: metricId,
        ...metric
      });

      // Check if metric triggers any alerts
      await this.checkAlertThresholds(metric);
    } catch (error) {
      console.error('Error recording system metric:', error);
    }
  }

  async getPerformanceMetrics(timeframe: 'hour' | 'day' | 'week' = 'hour'): Promise<PerformanceMetrics> {
    try {
      const startTime = this.getStartTime(timeframe);
      
      const metrics = await db.select()
        .from(systemMetrics)
        .where(and(
          gte(systemMetrics.timestamp, startTime),
          eq(systemMetrics.metricType, 'performance')
        ))
        .orderBy(desc(systemMetrics.timestamp));

      return this.calculatePerformanceMetrics(metrics);
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      throw new Error('Failed to fetch performance metrics');
    }
  }

  async getLDAOSpecificMetrics(): Promise<any> {
    try {
      const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
      
      const metrics = await db.select()
        .from(systemMetrics)
        .where(and(
          gte(systemMetrics.timestamp, startTime),
          eq(systemMetrics.metricType, 'business')
        ));

      // Calculate LDAO-specific metrics
      const tokenPurchases = metrics.filter(m => m.metricName === 'ldao_token_purchase').length;
      const stakingTransactions = metrics.filter(m => m.metricName === 'ldao_staking_transaction').length;
      const dexTrades = metrics.filter(m => m.metricName === 'ldao_dex_trade').length;
      const earnedTokens = metrics
        .filter(m => m.metricName === 'ldao_tokens_earned')
        .reduce((sum, m) => sum + m.value, 0);

      const totalTransactionValue = metrics
        .filter(m => m.metricName === 'ldao_transaction_value')
        .reduce((sum, m) => sum + m.value, 0);

      return {
        tokenPurchases,
        stakingTransactions,
        dexTrades,
        earnedTokens,
        totalTransactionValue,
        averageTransactionValue: tokenPurchases > 0 ? totalTransactionValue / tokenPurchases : 0,
        userEngagement: {
          activeUsers: await this.getActiveUsersCount(),
          newSignups: await this.getNewSignupsCount(),
          retentionRate: await this.calculateRetentionRate()
        }
      };
    } catch (error) {
      console.error('Error fetching LDAO-specific metrics:', error);
      throw new Error('Failed to fetch LDAO metrics');
    }
  }

  // User Feedback Monitoring
  async recordUserFeedback(feedback: Omit<UserFeedback, 'id' | 'createdAt'>): Promise<UserFeedback> {
    try {
      const feedbackId = `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const [newFeedback] = await db.insert(userFeedback).values({
        id: feedbackId,
        ...feedback,
        createdAt: new Date()
      }).returning();

      // Process feedback for immediate action if needed
      await this.processFeedback(newFeedback);

      return newFeedback;
    } catch (error) {
      console.error('Error recording user feedback:', error);
      throw new Error('Failed to record user feedback');
    }
  }

  async getFeedbackSummary(timeframe: 'day' | 'week' | 'month' = 'week'): Promise<any> {
    try {
      const startTime = this.getStartTime(timeframe);
      
      const feedback = await db.select()
        .from(userFeedback)
        .where(gte(userFeedback.createdAt, startTime));

      const totalFeedback = feedback.length;
      const averageRating = feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback;
      
      const feedbackByCategory = feedback.reduce((acc, f) => {
        acc[f.category] = (acc[f.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const feedbackByFeature = feedback.reduce((acc, f) => {
        acc[f.feature] = (acc[f.feature] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalFeedback,
        averageRating,
        feedbackByCategory,
        feedbackByFeature,
        recentFeedback: feedback.slice(0, 10),
        sentimentAnalysis: await this.analyzeFeedbackSentiment(feedback)
      };
    } catch (error) {
      console.error('Error fetching feedback summary:', error);
      throw new Error('Failed to fetch feedback summary');
    }
  }

  // Alert System
  async createAlert(alert: Omit<SystemAlert, 'id' | 'createdAt'>): Promise<SystemAlert> {
    try {
      const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const newAlert = {
        id: alertId,
        ...alert,
        createdAt: new Date()
      };

      // Store alert in database (would need to create alerts table)
      // await db.insert(systemAlerts).values(newAlert);

      // Send notifications based on severity
      await this.handleAlertNotifications(newAlert);

      return newAlert;
    } catch (error) {
      console.error('Error creating system alert:', error);
      throw new Error('Failed to create system alert');
    }
  }

  private async checkAlertThresholds(metric: Omit<SystemMetrics, 'id'>): Promise<void> {
    try {
      const alerts: SystemAlert[] = [];

      // Check response time alerts
      if (metric.metricName === 'response_time') {
        if (metric.value > this.alertThresholds.responseTime.critical) {
          alerts.push({
            type: 'performance',
            severity: 'critical',
            title: 'Critical Response Time Alert',
            description: `Response time is ${metric.value}ms, exceeding critical threshold of ${this.alertThresholds.responseTime.critical}ms`,
            metrics: { responseTime: metric.value },
            isResolved: false
          });
        } else if (metric.value > this.alertThresholds.responseTime.warning) {
          alerts.push({
            type: 'performance',
            severity: 'medium',
            title: 'High Response Time Warning',
            description: `Response time is ${metric.value}ms, exceeding warning threshold of ${this.alertThresholds.responseTime.warning}ms`,
            metrics: { responseTime: metric.value },
            isResolved: false
          });
        }
      }

      // Check error rate alerts
      if (metric.metricName === 'error_rate') {
        if (metric.value > this.alertThresholds.errorRate.critical) {
          alerts.push({
            type: 'error',
            severity: 'critical',
            title: 'Critical Error Rate Alert',
            description: `Error rate is ${metric.value}%, exceeding critical threshold of ${this.alertThresholds.errorRate.critical}%`,
            metrics: { errorRate: metric.value },
            isResolved: false
          });
        }
      }

      // Check LDAO-specific alerts
      if (metric.metricName === 'ldao_transaction_failure_rate') {
        if (metric.value > this.alertThresholds.transactionFailureRate.critical) {
          alerts.push({
            type: 'business',
            severity: 'critical',
            title: 'LDAO Transaction Failure Alert',
            description: `LDAO transaction failure rate is ${metric.value}%, indicating potential system issues`,
            metrics: { transactionFailureRate: metric.value },
            isResolved: false
          });
        }
      }

      // Create alerts
      for (const alert of alerts) {
        await this.createAlert(alert);
      }
    } catch (error) {
      console.error('Error checking alert thresholds:', error);
    }
  }

  private async handleAlertNotifications(alert: SystemAlert): Promise<void> {
    try {
      // Notify system administrators
      if (alert.severity === 'critical' || alert.severity === 'high') {
        await this.notifyAdministrators(alert);
      }

      // Log alert for monitoring dashboard
      await this.logAlert(alert);

      // If LDAO-related, notify LDAO team specifically
      if (alert.title.toLowerCase().includes('ldao')) {
        await this.notifyLDAOTeam(alert);
      }
    } catch (error) {
      console.error('Error handling alert notifications:', error);
    }
  }

  // System Health Monitoring
  async recordSystemHealth(): Promise<void> {
    try {
      const healthMetrics = await this.collectSystemHealthMetrics();
      
      for (const [metricName, value] of Object.entries(healthMetrics)) {
        await this.recordMetric({
          metricType: 'performance',
          metricName,
          value: value as number,
          unit: this.getMetricUnit(metricName),
          tags: { component: 'system' },
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error recording system health:', error);
    }
  }

  async recordLDAOTransactionMetrics(transactionData: any): Promise<void> {
    try {
      const metrics = [
        {
          metricType: 'business' as const,
          metricName: 'ldao_token_purchase',
          value: 1,
          unit: 'count',
          tags: { 
            paymentMethod: transactionData.paymentMethod,
            amount: transactionData.amount.toString()
          },
          timestamp: new Date()
        },
        {
          metricType: 'business' as const,
          metricName: 'ldao_transaction_value',
          value: transactionData.value,
          unit: 'usd',
          tags: { 
            transactionType: transactionData.type
          },
          timestamp: new Date()
        }
      ];

      for (const metric of metrics) {
        await this.recordMetric(metric);
      }
    } catch (error) {
      console.error('Error recording LDAO transaction metrics:', error);
    }
  }

  // Dashboard Data
  async getDashboardData(): Promise<any> {
    try {
      const [
        performanceMetrics,
        ldaoMetrics,
        feedbackSummary,
        recentAlerts
      ] = await Promise.all([
        this.getPerformanceMetrics('day'),
        this.getLDAOSpecificMetrics(),
        this.getFeedbackSummary('day'),
        this.getRecentAlerts(10)
      ]);

      return {
        performance: performanceMetrics,
        ldao: ldaoMetrics,
        feedback: feedbackSummary,
        alerts: recentAlerts,
        systemStatus: await this.getSystemStatus(),
        uptime: await this.calculateUptime()
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw new Error('Failed to fetch dashboard data');
    }
  }

  // Utility Methods
  private calculatePerformanceMetrics(metrics: SystemMetrics[]): PerformanceMetrics {
    const responseTimes = metrics
      .filter(m => m.metricName === 'response_time')
      .map(m => m.value)
      .sort((a, b) => a - b);

    const errorCounts = metrics.filter(m => m.metricName === 'error_count');
    const requestCounts = metrics.filter(m => m.metricName === 'request_count');

    const totalRequests = requestCounts.reduce((sum, m) => sum + m.value, 0);
    const totalErrors = errorCounts.reduce((sum, m) => sum + m.value, 0);

    return {
      responseTime: {
        average: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
        p95: responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.95)] : 0,
        p99: responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.99)] : 0
      },
      throughput: {
        requestsPerSecond: totalRequests / 3600, // Assuming 1-hour timeframe
        transactionsPerSecond: metrics.filter(m => m.metricName === 'transaction_count').reduce((sum, m) => sum + m.value, 0) / 3600
      },
      errorRate: {
        percentage: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
        count: totalErrors
      },
      systemHealth: {
        cpuUsage: this.getLatestMetricValue(metrics, 'cpu_usage'),
        memoryUsage: this.getLatestMetricValue(metrics, 'memory_usage'),
        diskUsage: this.getLatestMetricValue(metrics, 'disk_usage')
      }
    };
  }

  private async collectSystemHealthMetrics(): Promise<Record<string, number>> {
    // In production, this would collect real system metrics
    return {
      cpu_usage: Math.random() * 100,
      memory_usage: Math.random() * 100,
      disk_usage: Math.random() * 100,
      network_io: Math.random() * 1000,
      database_connections: Math.floor(Math.random() * 100)
    };
  }

  private async processFeedback(feedback: UserFeedback): Promise<void> {
    try {
      // Auto-categorize critical feedback
      if (feedback.rating <= 2 && feedback.category === 'bug') {
        await this.createAlert({
          type: 'business',
          severity: 'medium',
          title: 'Critical User Feedback Received',
          description: `User reported critical issue with ${feedback.feature}: ${feedback.comment}`,
          metrics: { rating: feedback.rating },
          isResolved: false
        });
      }

      // Track feedback metrics
      await this.recordMetric({
        metricType: 'business',
        metricName: 'user_feedback_rating',
        value: feedback.rating,
        unit: 'rating',
        tags: { 
          feature: feedback.feature,
          category: feedback.category
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error processing feedback:', error);
    }
  }

  private async analyzeFeedbackSentiment(feedback: UserFeedback[]): Promise<any> {
    // Simple sentiment analysis based on ratings and keywords
    const positive = feedback.filter(f => f.rating >= 4).length;
    const neutral = feedback.filter(f => f.rating === 3).length;
    const negative = feedback.filter(f => f.rating <= 2).length;

    return {
      positive: (positive / feedback.length) * 100,
      neutral: (neutral / feedback.length) * 100,
      negative: (negative / feedback.length) * 100,
      overallSentiment: positive > negative ? 'positive' : negative > positive ? 'negative' : 'neutral'
    };
  }

  private async notifyAdministrators(alert: SystemAlert): Promise<void> {
    try {
      const adminEmails = ['admin@web3marketplace.com', 'devops@web3marketplace.com'];
      
      for (const email of adminEmails) {
        await sendEmail({
          to: email,
          subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
          template: 'system-alert',
          data: {
            alertTitle: alert.title,
            alertDescription: alert.description,
            severity: alert.severity,
            metrics: alert.metrics,
            timestamp: alert.createdAt
          }
        });
      }
    } catch (error) {
      console.error('Error notifying administrators:', error);
    }
  }

  private async notifyLDAOTeam(alert: SystemAlert): Promise<void> {
    try {
      const ldaoTeamEmails = ['ldao-team@web3marketplace.com'];
      
      for (const email of ldaoTeamEmails) {
        await sendEmail({
          to: email,
          subject: `[LDAO ALERT] ${alert.title}`,
          template: 'ldao-alert',
          data: {
            alertTitle: alert.title,
            alertDescription: alert.description,
            severity: alert.severity,
            metrics: alert.metrics,
            timestamp: alert.createdAt
          }
        });
      }
    } catch (error) {
      console.error('Error notifying LDAO team:', error);
    }
  }

  private async logAlert(alert: SystemAlert): Promise<void> {
    try {
      await db.insert(performanceLogs).values({
        id: `log-${Date.now()}`,
        level: alert.severity,
        message: alert.description,
        metadata: alert.metrics,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error logging alert:', error);
    }
  }

  private getStartTime(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case 'hour':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 60 * 60 * 1000);
    }
  }

  private getMetricUnit(metricName: string): string {
    const units: Record<string, string> = {
      'response_time': 'ms',
      'cpu_usage': 'percent',
      'memory_usage': 'percent',
      'disk_usage': 'percent',
      'error_rate': 'percent',
      'request_count': 'count',
      'transaction_count': 'count',
      'ldao_transaction_value': 'usd'
    };
    return units[metricName] || 'count';
  }

  private getLatestMetricValue(metrics: SystemMetrics[], metricName: string): number {
    const metric = metrics.find(m => m.metricName === metricName);
    return metric ? metric.value : 0;
  }

  private async getActiveUsersCount(): Promise<number> {
    // Mock implementation - in production, query user activity
    return Math.floor(Math.random() * 1000) + 500;
  }

  private async getNewSignupsCount(): Promise<number> {
    // Mock implementation - in production, query new user registrations
    return Math.floor(Math.random() * 50) + 10;
  }

  private async calculateRetentionRate(): Promise<number> {
    // Mock implementation - in production, calculate actual retention
    return Math.random() * 20 + 70; // 70-90%
  }

  private async getRecentAlerts(limit: number): Promise<SystemAlert[]> {
    // Mock implementation - in production, query alerts table
    return [];
  }

  private async getSystemStatus(): Promise<string> {
    // Mock implementation - in production, check actual system health
    return 'healthy';
  }

  private async calculateUptime(): Promise<number> {
    // Mock implementation - in production, calculate actual uptime
    return 99.9;
  }
}

export const ldaoSystemMonitoringService = new LDAOSystemMonitoringService();