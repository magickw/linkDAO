import { safeLogger } from '../utils/safeLogger';

export interface PaymentMetrics {
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  averageProcessingTime: number;
  totalVolume: number;
  successRate: number;
  errorsByType: Record<string, number>;
}

export class X402PaymentAnalytics {
  private static instance: X402PaymentAnalytics;
  private metrics: PaymentMetrics = {
    totalPayments: 0,
    successfulPayments: 0,
    failedPayments: 0,
    averageProcessingTime: 0,
    totalVolume: 0,
    successRate: 0,
    errorsByType: {}
  };
  private paymentTimes: number[] = [];

  private constructor() {}

  static getInstance(): X402PaymentAnalytics {
    if (!X402PaymentAnalytics.instance) {
      X402PaymentAnalytics.instance = new X402PaymentAnalytics();
    }
    return X402PaymentAnalytics.instance;
  }

  /**
   * Record a payment attempt
   */
  recordPaymentAttempt(amount: number, startTime: number): void {
    this.metrics.totalPayments++;
    this.metrics.totalVolume += amount;
    this.paymentTimes.push(Date.now() - startTime);
    
    // Keep only last 100 payment times for average calculation
    if (this.paymentTimes.length > 100) {
      this.paymentTimes.shift();
    }
    
    this.updateAverageProcessingTime();
    this.updateSuccessRate();
  }

  /**
   * Record a successful payment
   */
  recordSuccessfulPayment(amount: number, startTime: number): void {
    this.metrics.successfulPayments++;
    this.recordPaymentAttempt(amount, startTime);
    
    safeLogger.info('x402_payment_success', {
      amount,
      processingTime: Date.now() - startTime,
      totalPayments: this.metrics.totalPayments,
      successRate: this.metrics.successRate
    });
  }

  /**
   * Record a failed payment
   */
  recordFailedPayment(amount: number, startTime: number, errorType: string): void {
    this.metrics.failedPayments++;
    this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;
    this.recordPaymentAttempt(amount, startTime);
    
    safeLogger.warn('x402_payment_failure', {
      amount,
      errorType,
      processingTime: Date.now() - startTime,
      totalPayments: this.metrics.totalPayments,
      successRate: this.metrics.successRate
    });
  }

  /**
   * Update average processing time
   */
  private updateAverageProcessingTime(): void {
    if (this.paymentTimes.length === 0) {
      this.metrics.averageProcessingTime = 0;
      return;
    }
    
    const sum = this.paymentTimes.reduce((acc, time) => acc + time, 0);
    this.metrics.averageProcessingTime = sum / this.paymentTimes.length;
  }

  /**
   * Update success rate
   */
  private updateSuccessRate(): void {
    if (this.metrics.totalPayments === 0) {
      this.metrics.successRate = 0;
      return;
    }
    
    this.metrics.successRate = (this.metrics.successfulPayments / this.metrics.totalPayments) * 100;
  }

  /**
   * Get current metrics
   */
  getMetrics(): PaymentMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics(): void {
    this.metrics = {
      totalPayments: 0,
      successfulPayments: 0,
      failedPayments: 0,
      averageProcessingTime: 0,
      totalVolume: 0,
      successRate: 0,
      errorsByType: {}
    };
    this.paymentTimes = [];
  }

  /**
   * Get health status based on metrics
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
  } {
    const issues: string[] = [];
    
    // Check success rate
    if (this.metrics.successRate < 95 && this.metrics.totalPayments > 10) {
      issues.push(`Low success rate: ${this.metrics.successRate.toFixed(1)}%`);
    }
    
    // Check average processing time
    if (this.metrics.averageProcessingTime > 30000) { // 30 seconds
      issues.push(`High processing time: ${(this.metrics.averageProcessingTime / 1000).toFixed(1)}s`);
    }
    
    // Check error patterns
    const commonErrors = Object.entries(this.metrics.errorsByType)
      .filter(([_, count]) => count > this.metrics.totalPayments * 0.1) // > 10% of errors
      .map(([errorType]) => errorType);
    
    if (commonErrors.length > 0) {
      issues.push(`Frequent errors: ${commonErrors.join(', ')}`);
    }
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.length >= 2 || this.metrics.successRate < 90) {
      status = 'critical';
    } else if (issues.length > 0 || this.metrics.successRate < 95) {
      status = 'warning';
    }
    
    return { status, issues };
  }
}

// Export singleton instance
export const x402PaymentAnalytics = X402PaymentAnalytics.getInstance();