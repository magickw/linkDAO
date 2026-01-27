import { db } from '../db';
import { users, orders } from '../../db/schema';
import { marketplaceUsers } from '../../db/marketplaceSchema';
import { eq, and, gte, lte, sql, desc, asc } from 'drizzle-orm';
import { EventEmitter } from 'events';
import { realTimeComplianceMonitoringService } from './realTimeComplianceMonitoringService';
import { realTimeComplianceAlertService } from './realTimeComplianceAlertService';

/**
 * Seller Return Performance Analytics Service
 * 
 * Provides comprehensive analytics on seller return performance including:
 * - Return metrics by seller
 * - Compliance scoring
 * - Comparative analysis across sellers
 * 
 * Validates: Requirements 2.1, 5.1, 5.3, 5.4
 * 
 * NOTE: This service is designed to work with the return analytics schema
 * that will be created in Task 1.1. Currently using placeholder implementations
 * until the schema is available.
 */

// Placeholder return interface until schema is created
interface ReturnRecord {
  id: string;
  sellerId: string;
  orderId: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  createdAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  refundAmount?: number;
}

export interface SellerReturnMetrics {
  sellerId: string;
  sellerName: string;
  totalReturns: number;
  approvedReturns: number;
  rejectedReturns: number;
  pendingReturns: number;
  returnRate: number; // percentage of orders that result in returns
  approvalRate: number; // percentage of returns approved
  averageProcessingTime: number; // in hours
  averageRefundAmount: number;
  totalRefundAmount: number;
  customerSatisfactionScore: number;
  complianceScore: number;
  riskScore: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface SellerComplianceMetrics {
  sellerId: string;
  sellerName: string;
  complianceScore: number; // 0-100
  policyViolations: number;
  processingTimeCompliance: number; // percentage within SLA
  approvalRateDeviation: number; // deviation from platform average
  customerComplaintRate: number;
  violations: PolicyViolation[];
  recommendations: string[];
}

export interface PolicyViolation {
  violationType: 'processing_delay' | 'approval_rate' | 'refund_delay' | 'policy_mismatch';
  severity: 'minor' | 'major' | 'critical';
  description: string;
  occurrenceCount: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
}

export interface SellerComparisonData {
  sellerId: string;
  sellerName: string;
  metrics: {
    returnRate: number;
    approvalRate: number;
    averageProcessingTime: number;
    customerSatisfactionScore: number;
    complianceScore: number;
  };
  ranking: {
    returnRateRank: number;
    approvalRateRank: number;
    processingTimeRank: number;
    satisfactionRank: number;
    overallRank: number;
  };
  percentiles: {
    returnRate: number;
    approvalRate: number;
    processingTime: number;
    satisfaction: number;
  };
}

export interface PlatformAverages {
  averageReturnRate: number;
  averageApprovalRate: number;
  averageProcessingTime: number;
  averageCustomerSatisfaction: number;
  medianReturnRate: number;
  medianApprovalRate: number;
  medianProcessingTime: number;
}

export class SellerReturnPerformanceService extends EventEmitter {
  constructor() {
    super();
    this.setupRealTimeListeners();
  }

  /**
   * Setup real-time event listeners
   */
  private setupRealTimeListeners(): void {
    // Listen to real-time compliance monitoring events
    realTimeComplianceMonitoringService.on('violation_detected', (alert) => {
      this.emit('real_time_violation', alert);
    });

    // Listen to alert service events
    realTimeComplianceAlertService.on('alert_processed', (alert) => {
      this.emit('compliance_alert', alert);
    });
  }

  /**
   * Get comprehensive return metrics for a specific seller
   * Property 4: Comprehensive Trend Analysis - includes all dimensions
   */
  async getSellerReturnMetrics(
    sellerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SellerReturnMetrics> {
    try {
      // Get seller information from users table
      const sellerResult = await db
        .select()
        .from(users)
        .where(eq(users.id, sellerId))
        .limit(1);

      const seller = sellerResult[0];
      if (!seller) {
        throw new Error(`Seller not found: ${sellerId}`);
      }

      // TODO: Replace with actual returns table query once schema is created (Task 1.1)
      // For now, using placeholder empty array
      const sellerReturns: ReturnRecord[] = [];

      // Calculate metrics
      const totalReturns = sellerReturns.length;
      const approvedReturns = sellerReturns.filter(r => r.status === 'approved').length;
      const rejectedReturns = sellerReturns.filter(r => r.status === 'rejected').length;
      const pendingReturns = sellerReturns.filter(r => r.status === 'pending').length;

      // Get total orders for return rate calculation
      const sellerOrders = await db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(
          and(
            eq(orders.sellerId, sellerId),
            gte(orders.createdAt, startDate),
            lte(orders.createdAt, endDate)
          )
        );

      const totalOrders = Number(sellerOrders[0]?.count || 0);
      const returnRate = totalOrders > 0 ? (totalReturns / totalOrders) * 100 : 0;
      const approvalRate = totalReturns > 0 ? (approvedReturns / totalReturns) * 100 : 0;

      // Calculate average processing time
      const processingTimes = sellerReturns
        .filter(r => r.approvedAt || r.rejectedAt)
        .map(r => {
          const endTime = r.approvedAt || r.rejectedAt;
          return endTime ? (endTime.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60) : 0;
        });

      const averageProcessingTime = processingTimes.length > 0
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
        : 0;

      // Calculate refund amounts
      const refundAmounts = sellerReturns
        .filter(r => r.refundAmount)
        .map(r => Number(r.refundAmount || 0));

      const totalRefundAmount = refundAmounts.reduce((sum, amount) => sum + amount, 0);
      const averageRefundAmount = refundAmounts.length > 0
        ? totalRefundAmount / refundAmounts.length
        : 0;

      // Calculate customer satisfaction (placeholder - would integrate with actual satisfaction data)
      const customerSatisfactionScore = await this.calculateCustomerSatisfaction(sellerId, startDate, endDate);

      // Calculate compliance score
      const complianceScore = await this.calculateComplianceScore(sellerId, startDate, endDate);

      // Calculate risk score (placeholder - would integrate with fraud detection)
      const riskScore = await this.calculateRiskScore(sellerId, startDate, endDate);

      return {
        sellerId,
        sellerName: seller.displayName || seller.handle || 'Unknown',
        totalReturns,
        approvedReturns,
        rejectedReturns,
        pendingReturns,
        returnRate,
        approvalRate,
        averageProcessingTime,
        averageRefundAmount,
        totalRefundAmount,
        customerSatisfactionScore,
        complianceScore,
        riskScore,
        timeRange: {
          start: startDate,
          end: endDate,
        },
      };
    } catch (error) {
      console.error('Error getting seller return metrics:', error);
      throw error;
    }
  }

  /**
   * Get compliance metrics and violations for a seller
   * Property 15: Policy Compliance Verification
   * Property 16: Violation Detection and Response
   */
  async getSellerComplianceMetrics(
    sellerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SellerComplianceMetrics> {
    try {
      const sellerResult = await db
        .select()
        .from(users)
        .where(eq(users.id, sellerId))
        .limit(1);

      const seller = sellerResult[0];
      if (!seller) {
        throw new Error(`Seller not found: ${sellerId}`);
      }

      // TODO: Replace with actual returns table query once schema is created (Task 1.1)
      const sellerReturns: ReturnRecord[] = [];

      // Detect policy violations
      const violations = await this.detectPolicyViolations(sellerId, sellerReturns, startDate, endDate);

      // Emit real-time violation detection if new violations found
      if (violations.length > 0) {
        this.emit('violations_detected', {
          sellerId,
          sellerName: seller.handle || 'Unknown Seller',
          violations,
          timestamp: new Date()
        });
      }

      // Calculate compliance metrics
      const platformAverages = await this.getPlatformAverages(startDate, endDate);

      const totalReturns = sellerReturns.length;
      const approvedReturns = sellerReturns.filter(r => r.status === 'approved').length;
      const approvalRate = totalReturns > 0 ? (approvedReturns / totalReturns) * 100 : 0;

      // Calculate processing time compliance (within 48 hours)
      const processingTimeCompliant = sellerReturns.filter(r => {
        if (!r.approvedAt && !r.rejectedAt) return false;
        const endTime = r.approvedAt || r.rejectedAt;
        const processingTime = endTime ? (endTime.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60) : 0;
        return processingTime <= 48;
      }).length;

      const processingTimeCompliance = totalReturns > 0
        ? (processingTimeCompliant / totalReturns) * 100
        : 100;

      // Calculate approval rate deviation from platform average
      const approvalRateDeviation = Math.abs(approvalRate - platformAverages.averageApprovalRate);

      // Calculate customer complaint rate (placeholder)
      const customerComplaintRate = await this.calculateCustomerComplaintRate(sellerId, startDate, endDate);

      // Calculate overall compliance score
      const complianceScore = this.calculateOverallComplianceScore({
        processingTimeCompliance,
        approvalRateDeviation,
        customerComplaintRate,
        violationCount: violations.length,
      });

      // Generate recommendations
      const recommendations = this.generateComplianceRecommendations(
        violations,
        processingTimeCompliance,
        approvalRateDeviation,
        customerComplaintRate
      );

      // Emit compliance score update for real-time monitoring
      this.emit('compliance_score_updated', {
        sellerId,
        sellerName: seller.handle || 'Unknown Seller',
        complianceScore,
        previousScore: await this.getPreviousComplianceScore(sellerId),
        timestamp: new Date()
      });

      return {
        sellerId,
        sellerName: seller.handle || 'Unknown Seller',
        complianceScore,
        policyViolations: violations.length,
        processingTimeCompliance,
        approvalRateDeviation,
        customerComplaintRate,
        violations,
        recommendations,
      };
    } catch (error) {
      console.error('Error getting seller compliance metrics:', error);
      throw error;
    }
  }

  /**
   * Compare seller performance against platform averages and other sellers
   * Property 17: Statistical Outlier Identification
   * Property 20: Comparative Analysis and Best Practices
   */
  async compareSellerPerformance(
    sellerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SellerComparisonData> {
    try {
      // Get seller metrics
      const sellerMetrics = await this.getSellerReturnMetrics(sellerId, startDate, endDate);

      // Get all sellers' metrics for comparison
      const allSellers = await db
        .select()
        .from(users)
        .innerJoin(marketplaceUsers, eq(users.id, marketplaceUsers.userId))
        .where(eq(marketplaceUsers.role, 'seller'));

      const allSellerMetrics = await Promise.all(
        allSellers.map(s => this.getSellerReturnMetrics(s.users.id, startDate, endDate))
      );

      // Calculate rankings
      const returnRateRanking = this.calculateRanking(
        allSellerMetrics,
        m => m.returnRate,
        'asc' // lower is better
      );
      const approvalRateRanking = this.calculateRanking(
        allSellerMetrics,
        m => m.approvalRate,
        'desc' // higher is better
      );
      const processingTimeRanking = this.calculateRanking(
        allSellerMetrics,
        m => m.averageProcessingTime,
        'asc' // lower is better
      );
      const satisfactionRanking = this.calculateRanking(
        allSellerMetrics,
        m => m.customerSatisfactionScore,
        'desc' // higher is better
      );

      // Calculate overall ranking (average of all rankings)
      const sellerReturnRateRank = returnRateRanking.findIndex(m => m.sellerId === sellerId) + 1;
      const sellerApprovalRateRank = approvalRateRanking.findIndex(m => m.sellerId === sellerId) + 1;
      const sellerProcessingTimeRank = processingTimeRanking.findIndex(m => m.sellerId === sellerId) + 1;
      const sellerSatisfactionRank = satisfactionRanking.findIndex(m => m.sellerId === sellerId) + 1;

      const overallRank = Math.round(
        (sellerReturnRateRank + sellerApprovalRateRank + sellerProcessingTimeRank + sellerSatisfactionRank) / 4
      );

      // Calculate percentiles
      const percentiles = {
        returnRate: this.calculatePercentile(allSellerMetrics, m => m.returnRate, sellerMetrics.returnRate),
        approvalRate: this.calculatePercentile(allSellerMetrics, m => m.approvalRate, sellerMetrics.approvalRate),
        processingTime: this.calculatePercentile(allSellerMetrics, m => m.averageProcessingTime, sellerMetrics.averageProcessingTime),
        satisfaction: this.calculatePercentile(allSellerMetrics, m => m.customerSatisfactionScore, sellerMetrics.customerSatisfactionScore),
      };

      return {
        sellerId,
        sellerName: sellerMetrics.sellerName,
        metrics: {
          returnRate: sellerMetrics.returnRate,
          approvalRate: sellerMetrics.approvalRate,
          averageProcessingTime: sellerMetrics.averageProcessingTime,
          customerSatisfactionScore: sellerMetrics.customerSatisfactionScore,
          complianceScore: sellerMetrics.complianceScore,
        },
        ranking: {
          returnRateRank: sellerReturnRateRank,
          approvalRateRank: sellerApprovalRateRank,
          processingTimeRank: sellerProcessingTimeRank,
          satisfactionRank: sellerSatisfactionRank,
          overallRank,
        },
        percentiles,
      };
    } catch (error) {
      console.error('Error comparing seller performance:', error);
      throw error;
    }
  }

  /**
   * Get platform-wide averages for comparison
   */
  async getPlatformAverages(startDate: Date, endDate: Date): Promise<PlatformAverages> {
    try {
      // Get all sellers (users with marketplace role)
      const allSellers = await db
        .select()
        .from(users)
        .innerJoin(marketplaceUsers, eq(users.id, marketplaceUsers.userId))
        .where(eq(marketplaceUsers.role, 'seller'));

      const allMetrics = await Promise.all(
        allSellers.map(s => this.getSellerReturnMetrics(s.users.id, startDate, endDate))
      );

      const returnRates = allMetrics.map(m => m.returnRate);
      const approvalRates = allMetrics.map(m => m.approvalRate);
      const processingTimes = allMetrics.map(m => m.averageProcessingTime);
      const satisfactionScores = allMetrics.map(m => m.customerSatisfactionScore);

      return {
        averageReturnRate: this.calculateAverage(returnRates),
        averageApprovalRate: this.calculateAverage(approvalRates),
        averageProcessingTime: this.calculateAverage(processingTimes),
        averageCustomerSatisfaction: this.calculateAverage(satisfactionScores),
        medianReturnRate: this.calculateMedian(returnRates),
        medianApprovalRate: this.calculateMedian(approvalRates),
        medianProcessingTime: this.calculateMedian(processingTimes),
      };
    } catch (error) {
      console.error('Error calculating platform averages:', error);
      throw error;
    }
  }

  /**
   * Detect policy violations for a seller
   */
  private async detectPolicyViolations(
    sellerId: string,
    sellerReturns: ReturnRecord[],
    startDate: Date,
    endDate: Date
  ): Promise<PolicyViolation[]> {
    const violations: PolicyViolation[] = [];

    // Check for processing delays (> 48 hours)
    const delayedReturns = sellerReturns.filter(r => {
      if (!r.approvedAt && !r.rejectedAt) return false;
      const endTime = r.approvedAt || r.rejectedAt;
      const processingTime = endTime ? (endTime.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60) : 0;
      return processingTime > 48;
    });

    if (delayedReturns.length > 0) {
      violations.push({
        violationType: 'processing_delay',
        severity: delayedReturns.length > sellerReturns.length * 0.3 ? 'critical' : 'major',
        description: `${delayedReturns.length} returns processed beyond 48-hour SLA`,
        occurrenceCount: delayedReturns.length,
        firstOccurrence: delayedReturns[delayedReturns.length - 1].createdAt,
        lastOccurrence: delayedReturns[0].createdAt,
      });
    }

    // Check for abnormal approval rates
    const platformAverages = await this.getPlatformAverages(startDate, endDate);
    const approvalRate = sellerReturns.length > 0
      ? (sellerReturns.filter(r => r.status === 'approved').length / sellerReturns.length) * 100
      : 0;

    const approvalRateDeviation = Math.abs(approvalRate - platformAverages.averageApprovalRate);

    if (approvalRateDeviation > 20) {
      violations.push({
        violationType: 'approval_rate',
        severity: approvalRateDeviation > 40 ? 'critical' : 'major',
        description: `Approval rate (${approvalRate.toFixed(1)}%) deviates significantly from platform average (${platformAverages.averageApprovalRate.toFixed(1)}%)`,
        occurrenceCount: 1,
        firstOccurrence: startDate,
        lastOccurrence: endDate,
      });
    }

    return violations;
  }

  /**
   * Calculate overall compliance score
   */
  private calculateOverallComplianceScore(metrics: {
    processingTimeCompliance: number;
    approvalRateDeviation: number;
    customerComplaintRate: number;
    violationCount: number;
  }): number {
    // Start with 100 and deduct points for issues
    let score = 100;

    // Deduct for processing time non-compliance
    score -= (100 - metrics.processingTimeCompliance) * 0.3;

    // Deduct for approval rate deviation
    score -= Math.min(metrics.approvalRateDeviation, 50) * 0.4;

    // Deduct for customer complaints
    score -= metrics.customerComplaintRate * 0.2;

    // Deduct for violations
    score -= metrics.violationCount * 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate compliance recommendations
   */
  private generateComplianceRecommendations(
    violations: PolicyViolation[],
    processingTimeCompliance: number,
    approvalRateDeviation: number,
    customerComplaintRate: number
  ): string[] {
    const recommendations: string[] = [];

    if (processingTimeCompliance < 80) {
      recommendations.push('Improve return processing speed to meet 48-hour SLA');
    }

    if (approvalRateDeviation > 20) {
      recommendations.push('Review return approval criteria to align with platform standards');
    }

    if (customerComplaintRate > 10) {
      recommendations.push('Address customer satisfaction issues in return process');
    }

    violations.forEach(v => {
      if (v.severity === 'critical') {
        recommendations.push(`Urgent: Address ${v.violationType} violations`);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Maintain current excellent performance standards');
    }

    return recommendations;
  }

  /**
   * Calculate customer satisfaction score (placeholder)
   */
  private async calculateCustomerSatisfaction(
    sellerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // Placeholder - would integrate with actual satisfaction survey data
    return 4.2;
  }

  /**
   * Calculate compliance score (placeholder)
   */
  private async calculateComplianceScore(
    sellerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const complianceMetrics = await this.getSellerComplianceMetrics(sellerId, startDate, endDate);
    return complianceMetrics.complianceScore;
  }

  /**
   * Calculate risk score (placeholder)
   */
  private async calculateRiskScore(
    sellerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // Placeholder - would integrate with fraud detection engine
    return 15;
  }

  /**
   * Calculate customer complaint rate (placeholder)
   */
  private async calculateCustomerComplaintRate(
    sellerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // Placeholder - would integrate with customer support system
    return 5.2;
  }

  /**
   * Get previous compliance score for comparison
   */
  private async getPreviousComplianceScore(sellerId: string): Promise<number | null> {
    // TODO: Implement actual cache/database lookup for previous score
    return null;
  }

  /**
   * Calculate ranking for a metric
   */
  private calculateRanking<T>(
    items: T[],
    getValue: (item: T) => number,
    order: 'asc' | 'desc'
  ): T[] {
    return [...items].sort((a, b) => {
      const aVal = getValue(a);
      const bVal = getValue(b);
      return order === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }

  /**
   * Calculate percentile for a value
   */
  private calculatePercentile<T>(
    items: T[],
    getValue: (item: T) => number,
    value: number
  ): number {
    const values = items.map(getValue).sort((a, b) => a - b);
    const index = values.findIndex(v => v >= value);
    return index >= 0 ? (index / values.length) * 100 : 100;
  }

  /**
   * Calculate average
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate median
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }
}

export const sellerReturnPerformanceService = new SellerReturnPerformanceService();
