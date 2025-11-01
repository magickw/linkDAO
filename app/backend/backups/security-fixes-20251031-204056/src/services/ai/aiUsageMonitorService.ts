import { openaiService } from './openaiService';
import { safeLogger } from '../utils/safeLogger';

/**
 * AI Usage Monitor and Alert Service
 * Tracks AI usage, manages budgets, and sends alerts when thresholds are exceeded
 */
export class AIUsageMonitorService {
  private static instance: AIUsageMonitorService;

  // Budget thresholds (in USD)
  private readonly DAILY_BUDGET = parseFloat(process.env.AI_DAILY_BUDGET || '10');
  private readonly WEEKLY_BUDGET = parseFloat(process.env.AI_WEEKLY_BUDGET || '50');
  private readonly MONTHLY_BUDGET = parseFloat(process.env.AI_MONTHLY_BUDGET || '200');

  // Alert thresholds (percentage of budget)
  private readonly WARNING_THRESHOLD = 0.75; // 75%
  private readonly CRITICAL_THRESHOLD = 0.90; // 90%

  private alertsSent: Set<string> = new Set();

  private constructor() {}

  static getInstance(): AIUsageMonitorService {
    if (!AIUsageMonitorService.instance) {
      AIUsageMonitorService.instance = new AIUsageMonitorService();
    }
    return AIUsageMonitorService.instance;
  }

  /**
   * Check if current usage is within budget
   */
  async checkBudget(period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<{
    withinBudget: boolean;
    usage: number;
    budget: number;
    percentageUsed: number;
    alertLevel: 'none' | 'warning' | 'critical' | 'exceeded';
  }> {
    const usage = await this.getUsageForPeriod(period);
    const budget = this.getBudget(period);
    const percentageUsed = (usage / budget) * 100;

    let alertLevel: 'none' | 'warning' | 'critical' | 'exceeded' = 'none';
    if (percentageUsed >= 100) {
      alertLevel = 'exceeded';
    } else if (percentageUsed >= this.CRITICAL_THRESHOLD * 100) {
      alertLevel = 'critical';
    } else if (percentageUsed >= this.WARNING_THRESHOLD * 100) {
      alertLevel = 'warning';
    }

    return {
      withinBudget: usage < budget,
      usage,
      budget,
      percentageUsed,
      alertLevel
    };
  }

  /**
   * Monitor usage and send alerts if needed
   */
  async monitorAndAlert(period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<void> {
    const status = await this.checkBudget(period);

    if (status.alertLevel !== 'none') {
      await this.sendAlert(period, status);
    }
  }

  /**
   * Get usage for a specific time period
   */
  private async getUsageForPeriod(period: 'daily' | 'weekly' | 'monthly'): Promise<number> {
    const metrics = openaiService.getUsageMetrics();

    // In a production system, you would query a database for period-specific usage
    // For now, we'll use the total cost from the service
    // TODO: Implement time-based usage tracking in database

    return metrics.totalCost;
  }

  /**
   * Get budget for a specific period
   */
  private getBudget(period: 'daily' | 'weekly' | 'monthly'): number {
    switch (period) {
      case 'daily':
        return this.DAILY_BUDGET;
      case 'weekly':
        return this.WEEKLY_BUDGET;
      case 'monthly':
        return this.MONTHLY_BUDGET;
    }
  }

  /**
   * Send alert to administrators
   */
  private async sendAlert(
    period: string,
    status: {
      usage: number;
      budget: number;
      percentageUsed: number;
      alertLevel: string;
    }
  ): Promise<void> {
    const alertKey = `${period}-${status.alertLevel}-${new Date().toISOString().split('T')[0]}`;

    // Prevent duplicate alerts
    if (this.alertsSent.has(alertKey)) {
      return;
    }

    this.alertsSent.add(alertKey);

    const message = this.formatAlertMessage(period, status);

    // Log alert (in production, send email/Slack notification)
    safeLogger.warn('🚨 AI BUDGET ALERT:', message);

    // TODO: Integrate with notification system
    // await notificationService.sendAdminAlert({
    //   title: 'AI Budget Alert',
    //   message,
    //   priority: status.alertLevel === 'exceeded' ? 'critical' : 'high'
    // });
  }

  /**
   * Format alert message
   */
  private formatAlertMessage(
    period: string,
    status: {
      usage: number;
      budget: number;
      percentageUsed: number;
      alertLevel: string;
    }
  ): string {
    const emoji = status.alertLevel === 'exceeded' ? '🔴' : status.alertLevel === 'critical' ? '🟠' : '🟡';

    return `${emoji} AI ${period} budget ${status.alertLevel}!
    Usage: $${status.usage.toFixed(2)} / $${status.budget.toFixed(2)} (${status.percentageUsed.toFixed(1)}%)
    ${status.alertLevel === 'exceeded' ? 'Budget exceeded! AI requests may be rate-limited.' : ''}`;
  }

  /**
   * Get detailed usage report
   */
  async getUsageReport(period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<{
    period: string;
    usage: number;
    budget: number;
    percentageUsed: number;
    remainingBudget: number;
    projectedEndOfMonthCost: number;
    metrics: {
      totalRequests: number;
      totalTokens: number;
      totalCost: number;
      averageCostPerRequest: number;
    };
    alerts: {
      alertLevel: string;
      message: string;
    }[];
  }> {
    const metrics = openaiService.getUsageMetrics();
    const budget = this.getBudget(period);
    const percentageUsed = (metrics.totalCost / budget) * 100;

    // Project end-of-month cost based on current usage
    const daysInMonth = 30;
    const dayOfMonth = new Date().getDate();
    const projectedEndOfMonthCost = (metrics.totalCost / dayOfMonth) * daysInMonth;

    const alerts: { alertLevel: string; message: string }[] = [];

    if (percentageUsed >= 100) {
      alerts.push({
        alertLevel: 'exceeded',
        message: 'Budget exceeded! Consider increasing budget or optimizing usage.'
      });
    } else if (percentageUsed >= this.CRITICAL_THRESHOLD * 100) {
      alerts.push({
        alertLevel: 'critical',
        message: 'Critical: Approaching budget limit. Usage will be throttled soon.'
      });
    } else if (percentageUsed >= this.WARNING_THRESHOLD * 100) {
      alerts.push({
        alertLevel: 'warning',
        message: 'Warning: You have used more than 75% of your AI budget.'
      });
    }

    return {
      period,
      usage: metrics.totalCost,
      budget,
      percentageUsed,
      remainingBudget: Math.max(0, budget - metrics.totalCost),
      projectedEndOfMonthCost,
      metrics,
      alerts
    };
  }

  /**
   * Check if request should be allowed based on budget
   */
  async shouldAllowRequest(): Promise<{ allowed: boolean; reason?: string }> {
    const status = await this.checkBudget('daily');

    if (status.alertLevel === 'exceeded') {
      return {
        allowed: false,
        reason: 'Daily AI budget exceeded. Please try again tomorrow or increase budget.'
      };
    }

    // Also check monthly budget
    const monthlyStatus = await this.checkBudget('monthly');
    if (monthlyStatus.alertLevel === 'exceeded') {
      return {
        allowed: false,
        reason: 'Monthly AI budget exceeded. Requests are temporarily disabled.'
      };
    }

    return { allowed: true };
  }

  /**
   * Get cost estimate for an operation
   */
  estimateCost(operation: {
    type: 'moderation' | 'insight' | 'prediction' | 'anomaly';
    inputTokens?: number;
    outputTokens?: number;
  }): number {
    // GPT-4 Turbo pricing (as of Oct 2024)
    const INPUT_COST_PER_1K = 0.01;
    const OUTPUT_COST_PER_1K = 0.03;

    // Default token estimates
    const estimates = {
      moderation: { input: 500, output: 300 },
      insight: { input: 800, output: 500 },
      prediction: { input: 1000, output: 600 },
      anomaly: { input: 1200, output: 700 }
    };

    const estimate = estimates[operation.type];
    const inputTokens = operation.inputTokens || estimate.input;
    const outputTokens = operation.outputTokens || estimate.output;

    const inputCost = (inputTokens / 1000) * INPUT_COST_PER_1K;
    const outputCost = (outputTokens / 1000) * OUTPUT_COST_PER_1K;

    return inputCost + outputCost;
  }

  /**
   * Get cost savings from caching
   */
  async getCacheSavings(): Promise<{
    cacheHits: number;
    estimatedSavings: number;
    savingsPercentage: number;
  }> {
    // Import aiCacheService
    const { aiCacheService } = await import('./aiCacheService');

    const avgCost = openaiService.getUsageMetrics().averageCostPerRequest;
    const savings = await aiCacheService.estimateSavings(avgCost);

    const totalCost = openaiService.getUsageMetrics().totalCost;
    const totalWithoutCache = totalCost + savings.estimatedSavings;
    const savingsPercentage = totalWithoutCache > 0
      ? (savings.estimatedSavings / totalWithoutCache) * 100
      : 0;

    return {
      ...savings,
      savingsPercentage
    };
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations(): Promise<string[]> {
    const report = await this.getUsageReport('monthly');
    const savings = await this.getCacheSavings();
    const recommendations: string[] = [];

    if (report.percentageUsed > 80) {
      recommendations.push('Consider increasing your monthly budget to avoid service interruptions');
    }

    if (report.metrics.averageCostPerRequest > 0.05) {
      recommendations.push('High cost per request detected. Consider using GPT-3.5-turbo for simpler tasks');
    }

    if (savings.savingsPercentage < 20) {
      recommendations.push('Caching is providing limited savings. Review cache TTLs and coverage');
    }

    if (report.projectedEndOfMonthCost > report.budget * 1.2) {
      recommendations.push('Projected costs exceed budget by 20%. Implement stricter usage controls');
    }

    if (report.metrics.totalRequests > 1000 && savings.cacheHits < 100) {
      recommendations.push('Low cache hit rate. Ensure caching is properly configured');
    }

    return recommendations;
  }

  /**
   * Reset daily usage tracking (to be called by cron job)
   */
  async resetDailyUsage(): Promise<void> {
    // Clear daily alerts
    const today = new Date().toISOString().split('T')[0];
    Array.from(this.alertsSent).forEach(key => {
      if (key.includes('daily') && !key.includes(today)) {
        this.alertsSent.delete(key);
      }
    });

    // TODO: Implement database-based usage tracking
    // await db.aiUsage.create({
    //   date: new Date(),
    //   totalCost: 0,
    //   totalRequests: 0,
    //   totalTokens: 0
    // });
  }

  /**
   * Reset monthly usage tracking
   */
  async resetMonthlyUsage(): Promise<void> {
    openaiService.resetUsageMetrics();
    this.alertsSent.clear();
  }
}

export const aiUsageMonitor = AIUsageMonitorService.getInstance();
