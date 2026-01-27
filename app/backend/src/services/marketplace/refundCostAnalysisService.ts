import { db } from '../../db/index';
import { refundFinancialRecords, refundProviderTransactions } from '../../db/schema';
import { eq, and, gte, lte, sum, avg, count, sql } from 'drizzle-orm';
import { logger } from '../../utils/logger';

/**
 * Refund Cost Analysis Service
 * Task 2.3: Create cost analysis system
 * 
 * Provides comprehensive cost analysis for refund operations including:
 * - Processing fee calculations
 * - Shipping cost tracking
 * - Administrative overhead
 * 
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
 * Properties: 24, 25, 26
 */

/**
 * Processing Fee Breakdown
 * Detailed breakdown of all processing fees
 */
export interface ProcessingFeeBreakdown {
  totalProcessingFees: number;
  providerFees: Record<string, number>;
  averageFeePerTransaction: number;
  feesByPaymentMethod: Record<string, {
    totalFees: number;
    transactionCount: number;
    averageFee: number;
  }>;
  feePercentageOfRefunds: number;
}

/**
 * Shipping Cost Analysis
 * Analysis of shipping costs related to returns
 */
export interface ShippingCostAnalysis {
  totalShippingCosts: number;
  averageShippingCostPerReturn: number;
  shippingCostsByCarrier: Record<string, {
    totalCost: number;
    returnCount: number;
    averageCost: number;
  }>;
  shippingCostsByRegion: Record<string, {
    totalCost: number;
    returnCount: number;
    averageCost: number;
  }>;
  returnShippingCoverage: {
    sellerPaid: number;
    customerPaid: number;
    platformSubsidized: number;
  };
}

/**
 * Administrative Overhead Analysis
 * Analysis of administrative costs for processing returns
 */
export interface AdministrativeOverheadAnalysis {
  totalAdministrativeOverhead: number;
  costPerReturn: number;
  laborCosts: {
    customerServiceTime: number;
    inspectionTime: number;
    processingTime: number;
    totalLaborCost: number;
  };
  systemCosts: {
    apiCalls: number;
    storageUsage: number;
    computeResources: number;
    totalSystemCost: number;
  };
  overheadByReturnType: Record<string, {
    totalOverhead: number;
    returnCount: number;
    averageOverhead: number;
  }>;
}

/**
 * Comprehensive Cost Analysis
 * Complete cost analysis combining all cost components
 * Property 24: Comprehensive Cost Calculation
 */
export interface ComprehensiveCostAnalysis {
  totalCosts: number;
  processingFees: ProcessingFeeBreakdown;
  shippingCosts: ShippingCostAnalysis;
  administrativeOverhead: AdministrativeOverheadAnalysis;
  costBreakdown: {
    processingFeesPercentage: number;
    shippingCostsPercentage: number;
    administrativeOverheadPercentage: number;
  };
  costPerReturn: number;
  costToRevenueRatio: number;
}

/**
 * Cost Trend Analysis
 * Historical cost trends and projections
 */
export interface CostTrendAnalysis {
  currentPeriod: ComprehensiveCostAnalysis;
  previousPeriod: ComprehensiveCostAnalysis;
  periodComparison: {
    totalCostChange: number;
    totalCostChangePercentage: number;
    processingFeeChange: number;
    shippingCostChange: number;
    overheadChange: number;
  };
  trends: {
    costPerReturnTrend: 'increasing' | 'decreasing' | 'stable';
    efficiencyTrend: 'improving' | 'declining' | 'stable';
    projectedNextPeriodCost: number;
  };
}

/**
 * Profitability Metrics
 * Key profitability indicators for refund operations
 * Task 2.3: Add profitability metrics
 */
export interface ProfitabilityMetrics {
  // Refund-to-revenue ratio
  refundToRevenueRatio: number; // Percentage of revenue that is refunded

  // Cost per return
  costPerReturn: number; // Average total cost per return
  costPerReturnBreakdown: {
    processingFeePerReturn: number;
    shippingCostPerReturn: number;
    administrativeOverheadPerReturn: number;
  };

  // Net impact calculations
  netImpact: {
    totalRevenueLoss: number; // Total refunded amount
    totalCosts: number; // All costs associated with refunds
    netFinancialImpact: number; // Revenue loss + costs
    impactOnPlatformFees: number; // Lost platform fees
    impactOnSellerRevenue: number; // Lost seller revenue
  };

  // Profitability ratios
  profitabilityRatios: {
    costToRefundRatio: number; // Costs as percentage of refund amount
    netImpactToRevenueRatio: number; // Net impact as percentage of total revenue
    returnRate: number; // Percentage of orders that result in returns
  };

  // Efficiency metrics
  efficiencyMetrics: {
    averageRefundAmount: number;
    averageReturnProcessingTime: number; // In hours
    costEfficiencyScore: number; // Lower is better (cost per dollar refunded)
  };
}

/**
 * Predictive Model Result
 * Forecasts for future refund metrics
 * Task 2.3: Implement forecasting algorithms
 */
export interface PredictiveModelResult {
  forecastPeriod: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    projectedRefundVolume: number;
    projectedRefundAmount: number;
    projectedTotalCosts: number;
  };
  confidenceInterval: {
    lowerBound: number;
    upperBound: number;
  };
  modelType: 'linear_regression' | 'exponential_smoothing';
  trends: {
    volumeTrend: number; // Slope
    costTrend: number; // Slope
  };
}

/**
 * Scenario Analysis Result
 * Impact analysis of hypothetical scenarios
 * Task 2.3: Scenario analysis
 */
export interface ScenarioAnalysisResult {
  scenarioName: string;
  parameters: {
    returnRateChange: number; // Percentage change (e.g., 0.1 for +10%)
    processingCostChange: number; // Percentage change
    shippingCostChange: number; // Percentage change
  };
  baselineMetrics: {
    totalCosts: number;
    costPerReturn: number;
    netFinancialImpact: number;
  };
  projectedMetrics: {
    totalCosts: number;
    costPerReturn: number;
    netFinancialImpact: number;
  };
  impact: {
    costDifference: number;
    costDifferencePercentage: number;
    profitabilityImpact: number;
  };
}

/**
 * Refund Cost Analysis Service Class
 * Implements comprehensive cost analysis for refund operations
 */
export class RefundCostAnalysisService {
  // Cost configuration constants
  private readonly AVERAGE_CUSTOMER_SERVICE_COST_PER_HOUR = 25; // USD
  private readonly AVERAGE_INSPECTION_COST_PER_HOUR = 30; // USD
  private readonly AVERAGE_PROCESSING_COST_PER_HOUR = 20; // USD
  private readonly AVERAGE_CUSTOMER_SERVICE_TIME_MINUTES = 15;
  private readonly AVERAGE_INSPECTION_TIME_MINUTES = 10;
  private readonly AVERAGE_PROCESSING_TIME_MINUTES = 5;
  private readonly API_CALL_COST = 0.001; // USD per API call
  private readonly STORAGE_COST_PER_GB_MONTH = 0.023; // USD
  private readonly COMPUTE_COST_PER_HOUR = 0.05; // USD

  /**
   * Calculate processing fees for refund transactions
   * Property 24: Comprehensive Cost Calculation
   * 
   * @param startDate - Start date for analysis period
   * @param endDate - End date for analysis period
   * @returns Processing fee breakdown
   */
  async calculateProcessingFees(
    startDate: Date,
    endDate: Date
  ): Promise<ProcessingFeeBreakdown> {
    try {
      logger.info('Calculating processing fees', { startDate, endDate });

      // Get total processing fees
      const [totalStats] = await db
        .select({
          totalProcessingFees: sum(refundFinancialRecords.processingFee),
          totalRefundAmount: sum(refundFinancialRecords.refundAmount),
          transactionCount: count(refundFinancialRecords.id),
          averageFee: avg(refundFinancialRecords.processingFee)
        })
        .from(refundFinancialRecords)
        .where(
          and(
            gte(refundFinancialRecords.createdAt, startDate),
            lte(refundFinancialRecords.createdAt, endDate),
            eq(refundFinancialRecords.status, 'completed')
          )
        );

      // Get fees by provider
      const providerFees = await db
        .select({
          provider: refundFinancialRecords.paymentProvider,
          totalFees: sum(refundFinancialRecords.processingFee)
        })
        .from(refundFinancialRecords)
        .where(
          and(
            gte(refundFinancialRecords.createdAt, startDate),
            lte(refundFinancialRecords.createdAt, endDate),
            eq(refundFinancialRecords.status, 'completed')
          )
        )
        .groupBy(refundFinancialRecords.paymentProvider);

      // Get fees by payment method
      const methodFees = await db
        .select({
          method: refundFinancialRecords.refundMethod,
          totalFees: sum(refundFinancialRecords.processingFee),
          transactionCount: count(refundFinancialRecords.id),
          averageFee: avg(refundFinancialRecords.processingFee)
        })
        .from(refundFinancialRecords)
        .where(
          and(
            gte(refundFinancialRecords.createdAt, startDate),
            lte(refundFinancialRecords.createdAt, endDate),
            eq(refundFinancialRecords.status, 'completed')
          )
        )
        .groupBy(refundFinancialRecords.refundMethod);

      const totalProcessingFees = Number(totalStats.totalProcessingFees) || 0;
      const totalRefundAmount = Number(totalStats.totalRefundAmount) || 0;
      const transactionCount = Number(totalStats.transactionCount) || 0;

      // Build provider fees map
      const providerFeesMap: Record<string, number> = {};
      providerFees.forEach(pf => {
        providerFeesMap[pf.provider] = Number(pf.totalFees) || 0;
      });

      // Build payment method fees map
      const feesByPaymentMethod: Record<string, any> = {};
      methodFees.forEach(mf => {
        if (mf.method) {
          feesByPaymentMethod[mf.method] = {
            totalFees: Number(mf.totalFees) || 0,
            transactionCount: Number(mf.transactionCount) || 0,
            averageFee: Number(mf.averageFee) || 0
          };
        }
      });

      return {
        totalProcessingFees,
        providerFees: providerFeesMap,
        averageFeePerTransaction: transactionCount > 0 ? totalProcessingFees / transactionCount : 0,
        feesByPaymentMethod,
        feePercentageOfRefunds: totalRefundAmount > 0 ? (totalProcessingFees / totalRefundAmount) * 100 : 0
      };
    } catch (error) {
      logger.error('Error calculating processing fees:', error);
      throw new Error('Failed to calculate processing fees');
    }
  }

  /**
   * Calculate shipping costs for returns
   * Property 24: Comprehensive Cost Calculation
   * 
   * @param startDate - Start date for analysis period
   * @param endDate - End date for analysis period
   * @returns Shipping cost analysis
   */
  async calculateShippingCosts(
    startDate: Date,
    endDate: Date
  ): Promise<ShippingCostAnalysis> {
    try {
      logger.info('Calculating shipping costs', { startDate, endDate });

      // Query shipping costs from metadata
      const refundRecords = await db
        .select({
          id: refundFinancialRecords.id,
          metadata: refundFinancialRecords.metadata
        })
        .from(refundFinancialRecords)
        .where(
          and(
            gte(refundFinancialRecords.createdAt, startDate),
            lte(refundFinancialRecords.createdAt, endDate),
            eq(refundFinancialRecords.status, 'completed')
          )
        );

      let totalShippingCosts = 0;
      let returnCount = 0;
      const shippingCostsByCarrier: Record<string, { totalCost: number; returnCount: number }> = {};
      const shippingCostsByRegion: Record<string, { totalCost: number; returnCount: number }> = {};
      const returnShippingCoverage = {
        sellerPaid: 0,
        customerPaid: 0,
        platformSubsidized: 0
      };

      // Process each refund record's metadata
      refundRecords.forEach(record => {
        const metadata = record.metadata as any;
        if (metadata && metadata.shippingCost) {
          const shippingCost = Number(metadata.shippingCost) || 0;
          totalShippingCosts += shippingCost;
          returnCount++;

          // Track by carrier
          const carrier = metadata.shippingCarrier || 'unknown';
          if (!shippingCostsByCarrier[carrier]) {
            shippingCostsByCarrier[carrier] = { totalCost: 0, returnCount: 0 };
          }
          shippingCostsByCarrier[carrier].totalCost += shippingCost;
          shippingCostsByCarrier[carrier].returnCount++;

          // Track by region
          const region = metadata.shippingRegion || 'unknown';
          if (!shippingCostsByRegion[region]) {
            shippingCostsByRegion[region] = { totalCost: 0, returnCount: 0 };
          }
          shippingCostsByRegion[region].totalCost += shippingCost;
          shippingCostsByRegion[region].returnCount++;

          // Track coverage
          const paidBy = metadata.shippingPaidBy || 'customer';
          if (paidBy === 'seller') {
            returnShippingCoverage.sellerPaid += shippingCost;
          } else if (paidBy === 'platform') {
            returnShippingCoverage.platformSubsidized += shippingCost;
          } else {
            returnShippingCoverage.customerPaid += shippingCost;
          }
        }
      });

      // Calculate averages for carriers
      const shippingCostsByCarrierWithAvg: Record<string, any> = {};
      Object.entries(shippingCostsByCarrier).forEach(([carrier, data]) => {
        shippingCostsByCarrierWithAvg[carrier] = {
          totalCost: data.totalCost,
          returnCount: data.returnCount,
          averageCost: data.returnCount > 0 ? data.totalCost / data.returnCount : 0
        };
      });

      // Calculate averages for regions
      const shippingCostsByRegionWithAvg: Record<string, any> = {};
      Object.entries(shippingCostsByRegion).forEach(([region, data]) => {
        shippingCostsByRegionWithAvg[region] = {
          totalCost: data.totalCost,
          returnCount: data.returnCount,
          averageCost: data.returnCount > 0 ? data.totalCost / data.returnCount : 0
        };
      });

      return {
        totalShippingCosts,
        averageShippingCostPerReturn: returnCount > 0 ? totalShippingCosts / returnCount : 0,
        shippingCostsByCarrier: shippingCostsByCarrierWithAvg,
        shippingCostsByRegion: shippingCostsByRegionWithAvg,
        returnShippingCoverage
      };
    } catch (error) {
      logger.error('Error calculating shipping costs:', error);
      throw new Error('Failed to calculate shipping costs');
    }
  }

  /**
   * Calculate administrative overhead for return processing
   * Property 24: Comprehensive Cost Calculation
   * 
   * @param startDate - Start date for analysis period
   * @param endDate - End date for analysis period
   * @returns Administrative overhead analysis
   */
  async calculateAdministrativeOverhead(
    startDate: Date,
    endDate: Date
  ): Promise<AdministrativeOverheadAnalysis> {
    try {
      logger.info('Calculating administrative overhead', { startDate, endDate });

      // Get return count and metadata
      const refundRecords = await db
        .select({
          id: refundFinancialRecords.id,
          metadata: refundFinancialRecords.metadata,
          createdAt: refundFinancialRecords.createdAt,
          processedAt: refundFinancialRecords.processedAt
        })
        .from(refundFinancialRecords)
        .where(
          and(
            gte(refundFinancialRecords.createdAt, startDate),
            lte(refundFinancialRecords.createdAt, endDate),
            eq(refundFinancialRecords.status, 'completed')
          )
        );

      const returnCount = refundRecords.length;

      // Calculate labor costs
      const customerServiceTimeHours = (returnCount * this.AVERAGE_CUSTOMER_SERVICE_TIME_MINUTES) / 60;
      const inspectionTimeHours = (returnCount * this.AVERAGE_INSPECTION_TIME_MINUTES) / 60;
      const processingTimeHours = (returnCount * this.AVERAGE_PROCESSING_TIME_MINUTES) / 60;

      const customerServiceCost = customerServiceTimeHours * this.AVERAGE_CUSTOMER_SERVICE_COST_PER_HOUR;
      const inspectionCost = inspectionTimeHours * this.AVERAGE_INSPECTION_COST_PER_HOUR;
      const processingCost = processingTimeHours * this.AVERAGE_PROCESSING_COST_PER_HOUR;
      const totalLaborCost = customerServiceCost + inspectionCost + processingCost;

      // Calculate system costs
      // Estimate API calls: 5 per return (create, update, provider calls, notifications, etc.)
      const apiCallCount = returnCount * 5;
      const apiCallCost = apiCallCount * this.API_CALL_COST;

      // Estimate storage: 1MB per return for documents, images, logs
      const storageGB = (returnCount * 1) / 1024;
      const storageCost = storageGB * this.STORAGE_COST_PER_GB_MONTH;

      // Estimate compute: average 2 minutes of compute per return
      const computeHours = (returnCount * 2) / 60;
      const computeCost = computeHours * this.COMPUTE_COST_PER_HOUR;

      const totalSystemCost = apiCallCost + storageCost + computeCost;

      // Calculate overhead by return type
      const overheadByReturnType: Record<string, { totalOverhead: number; returnCount: number }> = {};

      refundRecords.forEach(record => {
        const metadata = record.metadata as any;
        const returnType = metadata?.returnType || 'standard';

        if (!overheadByReturnType[returnType]) {
          overheadByReturnType[returnType] = { totalOverhead: 0, returnCount: 0 };
        }

        // Allocate overhead proportionally
        const overheadPerReturn = (totalLaborCost + totalSystemCost) / returnCount;
        overheadByReturnType[returnType].totalOverhead += overheadPerReturn;
        overheadByReturnType[returnType].returnCount++;
      });

      // Calculate averages for return types
      const overheadByReturnTypeWithAvg: Record<string, any> = {};
      Object.entries(overheadByReturnType).forEach(([type, data]) => {
        overheadByReturnTypeWithAvg[type] = {
          totalOverhead: data.totalOverhead,
          returnCount: data.returnCount,
          averageOverhead: data.returnCount > 0 ? data.totalOverhead / data.returnCount : 0
        };
      });

      const totalAdministrativeOverhead = totalLaborCost + totalSystemCost;

      return {
        totalAdministrativeOverhead,
        costPerReturn: returnCount > 0 ? totalAdministrativeOverhead / returnCount : 0,
        laborCosts: {
          customerServiceTime: customerServiceTimeHours,
          inspectionTime: inspectionTimeHours,
          processingTime: processingTimeHours,
          totalLaborCost
        },
        systemCosts: {
          apiCalls: apiCallCount,
          storageUsage: storageGB,
          computeResources: computeHours,
          totalSystemCost
        },
        overheadByReturnType: overheadByReturnTypeWithAvg
      };
    } catch (error) {
      logger.error('Error calculating administrative overhead:', error);
      throw new Error('Failed to calculate administrative overhead');
    }
  }

  /**
   * Get comprehensive cost analysis
   * Property 24: Comprehensive Cost Calculation
   * Property 25: Multi-Dimensional Impact Analysis
   * 
   * Combines all cost components into a complete analysis
   * @param startDate - Start date for analysis period
   * @param endDate - End date for analysis period
   * @returns Comprehensive cost analysis
   */
  async getComprehensiveCostAnalysis(
    startDate: Date,
    endDate: Date
  ): Promise<ComprehensiveCostAnalysis> {
    try {
      logger.info('Getting comprehensive cost analysis', { startDate, endDate });

      // Get all cost components in parallel
      const [processingFees, shippingCosts, administrativeOverhead] = await Promise.all([
        this.calculateProcessingFees(startDate, endDate),
        this.calculateShippingCosts(startDate, endDate),
        this.calculateAdministrativeOverhead(startDate, endDate)
      ]);

      // Calculate total costs
      const totalCosts =
        processingFees.totalProcessingFees +
        shippingCosts.totalShippingCosts +
        administrativeOverhead.totalAdministrativeOverhead;

      // Calculate cost breakdown percentages
      const costBreakdown = {
        processingFeesPercentage: totalCosts > 0 ? (processingFees.totalProcessingFees / totalCosts) * 100 : 0,
        shippingCostsPercentage: totalCosts > 0 ? (shippingCosts.totalShippingCosts / totalCosts) * 100 : 0,
        administrativeOverheadPercentage: totalCosts > 0 ? (administrativeOverhead.totalAdministrativeOverhead / totalCosts) * 100 : 0
      };

      // Get total refund amount for cost-to-revenue ratio
      const [revenueStats] = await db
        .select({
          totalRefundAmount: sum(refundFinancialRecords.refundAmount),
          returnCount: count(refundFinancialRecords.id)
        })
        .from(refundFinancialRecords)
        .where(
          and(
            gte(refundFinancialRecords.createdAt, startDate),
            lte(refundFinancialRecords.createdAt, endDate),
            eq(refundFinancialRecords.status, 'completed')
          )
        );

      const totalRefundAmount = Number(revenueStats.totalRefundAmount) || 0;
      const returnCount = Number(revenueStats.returnCount) || 0;

      return {
        totalCosts,
        processingFees,
        shippingCosts,
        administrativeOverhead,
        costBreakdown,
        costPerReturn: returnCount > 0 ? totalCosts / returnCount : 0,
        costToRevenueRatio: totalRefundAmount > 0 ? (totalCosts / totalRefundAmount) * 100 : 0
      };
    } catch (error) {
      logger.error('Error getting comprehensive cost analysis:', error);
      throw new Error('Failed to get comprehensive cost analysis');
    }
  }

  /**
   * Get cost trend analysis
   * Property 25: Multi-Dimensional Impact Analysis
   * Property 26: Historical Data Forecasting
   * 
   * Analyzes cost trends over time and provides projections
   * @param currentStartDate - Start date for current period
   * @param currentEndDate - End date for current period
   * @returns Cost trend analysis
   */
  async getCostTrendAnalysis(
    currentStartDate: Date,
    currentEndDate: Date
  ): Promise<CostTrendAnalysis> {
    try {
      logger.info('Getting cost trend analysis', { currentStartDate, currentEndDate });

      // Calculate period duration
      const periodDuration = currentEndDate.getTime() - currentStartDate.getTime();

      // Calculate previous period dates
      const previousStartDate = new Date(currentStartDate.getTime() - periodDuration);
      const previousEndDate = new Date(currentStartDate.getTime());

      // Get cost analysis for both periods in parallel
      const [currentPeriod, previousPeriod] = await Promise.all([
        this.getComprehensiveCostAnalysis(currentStartDate, currentEndDate),
        this.getComprehensiveCostAnalysis(previousStartDate, previousEndDate)
      ]);

      // Calculate period comparison
      const totalCostChange = currentPeriod.totalCosts - previousPeriod.totalCosts;
      const totalCostChangePercentage = previousPeriod.totalCosts > 0
        ? (totalCostChange / previousPeriod.totalCosts) * 100
        : 0;

      const processingFeeChange =
        currentPeriod.processingFees.totalProcessingFees -
        previousPeriod.processingFees.totalProcessingFees;

      const shippingCostChange =
        currentPeriod.shippingCosts.totalShippingCosts -
        previousPeriod.shippingCosts.totalShippingCosts;

      const overheadChange =
        currentPeriod.administrativeOverhead.totalAdministrativeOverhead -
        previousPeriod.administrativeOverhead.totalAdministrativeOverhead;

      // Determine trends
      const costPerReturnChange = currentPeriod.costPerReturn - previousPeriod.costPerReturn;
      const costPerReturnChangePercentage = previousPeriod.costPerReturn > 0
        ? (costPerReturnChange / previousPeriod.costPerReturn) * 100
        : 0;

      let costPerReturnTrend: 'increasing' | 'decreasing' | 'stable';
      if (Math.abs(costPerReturnChangePercentage) < 5) {
        costPerReturnTrend = 'stable';
      } else if (costPerReturnChangePercentage > 0) {
        costPerReturnTrend = 'increasing';
      } else {
        costPerReturnTrend = 'decreasing';
      }

      // Efficiency trend (lower cost-to-revenue ratio is better)
      const efficiencyChange = currentPeriod.costToRevenueRatio - previousPeriod.costToRevenueRatio;
      let efficiencyTrend: 'improving' | 'declining' | 'stable';
      if (Math.abs(efficiencyChange) < 2) {
        efficiencyTrend = 'stable';
      } else if (efficiencyChange < 0) {
        efficiencyTrend = 'improving';
      } else {
        efficiencyTrend = 'declining';
      }

      // Simple linear projection for next period
      const projectedNextPeriodCost = currentPeriod.totalCosts + totalCostChange;

      return {
        currentPeriod,
        previousPeriod,
        periodComparison: {
          totalCostChange,
          totalCostChangePercentage,
          processingFeeChange,
          shippingCostChange,
          overheadChange
        },
        trends: {
          costPerReturnTrend,
          efficiencyTrend,
          projectedNextPeriodCost: Math.max(0, projectedNextPeriodCost) // Ensure non-negative
        }
      };
    } catch (error) {
      logger.error('Error getting cost trend analysis:', error);
      throw new Error('Failed to get cost trend analysis');
    }
  }

  /**
   * Calculate profitability metrics
   * Task 2.3: Add profitability metrics
   * 
   * Calculates comprehensive profitability metrics including:
   * - Refund-to-revenue ratio
   * - Cost per return
   * - Net impact calculations
   * 
   * @param startDate - Start date for analysis period
   * @param endDate - End date for analysis period
   * @param totalRevenue - Total revenue for the period (optional, for ratio calculations)
   * @returns Profitability metrics
   */
  async calculateProfitabilityMetrics(
    startDate: Date,
    endDate: Date,
    totalRevenue?: number
  ): Promise<ProfitabilityMetrics> {
    try {
      logger.info('Calculating profitability metrics', { startDate, endDate });

      // Get comprehensive cost analysis
      const costAnalysis = await this.getComprehensiveCostAnalysis(startDate, endDate);

      // Get refund financial data
      const [refundStats] = await db
        .select({
          totalRefundAmount: sum(refundFinancialRecords.refundAmount),
          totalPlatformFeeImpact: sum(refundFinancialRecords.platformFeeImpact),
          totalSellerImpact: sum(refundFinancialRecords.sellerImpact),
          returnCount: count(refundFinancialRecords.id),
          averageRefundAmount: avg(refundFinancialRecords.refundAmount),
          averageProcessingTime: avg(
            sql`EXTRACT(EPOCH FROM (${refundFinancialRecords.processedAt} - ${refundFinancialRecords.createdAt})) / 3600`
          )
        })
        .from(refundFinancialRecords)
        .where(
          and(
            gte(refundFinancialRecords.createdAt, startDate),
            lte(refundFinancialRecords.createdAt, endDate),
            eq(refundFinancialRecords.status, 'completed')
          )
        );

      const totalRefundAmount = Number(refundStats.totalRefundAmount) || 0;
      const totalPlatformFeeImpact = Number(refundStats.totalPlatformFeeImpact) || 0;
      const totalSellerImpact = Number(refundStats.totalSellerImpact) || 0;
      const returnCount = Number(refundStats.returnCount) || 0;
      const averageRefundAmount = Number(refundStats.averageRefundAmount) || 0;
      const averageProcessingTime = Number(refundStats.averageProcessingTime) || 0;

      // Calculate refund-to-revenue ratio
      const refundToRevenueRatio = totalRevenue && totalRevenue > 0
        ? (totalRefundAmount / totalRevenue) * 100
        : 0;

      // Calculate cost per return breakdown
      const costPerReturn = returnCount > 0 ? costAnalysis.totalCosts / returnCount : 0;
      const costPerReturnBreakdown = {
        processingFeePerReturn: returnCount > 0
          ? costAnalysis.processingFees.totalProcessingFees / returnCount
          : 0,
        shippingCostPerReturn: returnCount > 0
          ? costAnalysis.shippingCosts.totalShippingCosts / returnCount
          : 0,
        administrativeOverheadPerReturn: returnCount > 0
          ? costAnalysis.administrativeOverhead.totalAdministrativeOverhead / returnCount
          : 0
      };

      // Calculate net impact
      const totalRevenueLoss = totalRefundAmount;
      const totalCosts = costAnalysis.totalCosts;
      const netFinancialImpact = totalRevenueLoss + totalCosts;

      const netImpact = {
        totalRevenueLoss,
        totalCosts,
        netFinancialImpact,
        impactOnPlatformFees: totalPlatformFeeImpact,
        impactOnSellerRevenue: totalSellerImpact
      };

      // Calculate profitability ratios
      const costToRefundRatio = totalRefundAmount > 0
        ? (totalCosts / totalRefundAmount) * 100
        : 0;

      const netImpactToRevenueRatio = totalRevenue && totalRevenue > 0
        ? (netFinancialImpact / totalRevenue) * 100
        : 0;

      // Calculate return rate (requires total orders - estimate from metadata if available)
      let returnRate = 0;
      if (totalRevenue && totalRevenue > 0 && averageRefundAmount > 0) {
        // Estimate total orders from revenue and average refund amount
        const estimatedTotalOrders = totalRevenue / averageRefundAmount;
        returnRate = estimatedTotalOrders > 0
          ? (returnCount / estimatedTotalOrders) * 100
          : 0;
      }

      const profitabilityRatios = {
        costToRefundRatio,
        netImpactToRevenueRatio,
        returnRate
      };

      // Calculate efficiency metrics
      const costEfficiencyScore = totalRefundAmount > 0
        ? totalCosts / totalRefundAmount
        : 0;

      const efficiencyMetrics = {
        averageRefundAmount,
        averageReturnProcessingTime: averageProcessingTime,
        costEfficiencyScore
      };

      return {
        refundToRevenueRatio,
        costPerReturn,
        costPerReturnBreakdown,
        netImpact,
        profitabilityRatios,
        efficiencyMetrics
      };
    } catch (error) {
      logger.error('Error calculating profitability metrics:', error);
      throw new Error('Failed to calculate profitability metrics');
    }
  }

  /**
   * Generate predictive model for refund metrics
   * Task 2.3: Implement forecasting algorithms
   * 
   * Uses historical data to forecast future refund volume and costs
   * @param historicalStartDate - Start of historical data
   * @param historicalEndDate - End of historical data
   * @param forecastDays - Number of days to forecast
   * @returns Predictive model result
   */
  async generatePredictiveModel(
    historicalStartDate: Date,
    historicalEndDate: Date,
    forecastDays: number = 30
  ): Promise<PredictiveModelResult> {
    try {
      logger.info('Generating predictive model', { historicalStartDate, historicalEndDate, forecastDays });

      // Get daily refund data
      const dailyData = await db
        .select({
          date: sql<string>`DATE(${refundFinancialRecords.createdAt})`,
          count: count(refundFinancialRecords.id),
          amount: sum(refundFinancialRecords.refundAmount),
          costs: sum(refundFinancialRecords.processingFee) // Approximation for now, ideally would include all costs
        })
        .from(refundFinancialRecords)
        .where(
          and(
            gte(refundFinancialRecords.createdAt, historicalStartDate),
            lte(refundFinancialRecords.createdAt, historicalEndDate)
          )
        )
        .groupBy(sql`DATE(${refundFinancialRecords.createdAt})`)
        .orderBy(sql`DATE(${refundFinancialRecords.createdAt})`);

      if (dailyData.length < 2) {
        throw new Error('Insufficient historical data for forecasting');
      }

      // Prepare data points for regression (x = day index, y = value)
      const volumePoints = dailyData.map((d, i) => ({ x: i, y: Number(d.count) || 0 }));
      const amountPoints = dailyData.map((d, i) => ({ x: i, y: Number(d.amount) || 0 }));

      // Simple Linear Regression
      const calculateRegression = (points: { x: number, y: number }[]) => {
        const n = points.length;
        const sumX = points.reduce((acc, p) => acc + p.x, 0);
        const sumY = points.reduce((acc, p) => acc + p.y, 0);
        const sumXY = points.reduce((acc, p) => acc + (p.x * p.y), 0);
        const sumXX = points.reduce((acc, p) => acc + (p.x * p.x), 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        return { slope, intercept };
      };

      const volumeRegression = calculateRegression(volumePoints);
      const amountRegression = calculateRegression(amountPoints);

      // Calculate projections
      let projectedRefundVolume = 0;
      let projectedRefundAmount = 0;
      const lastDayIndex = dailyData.length - 1;

      for (let i = 1; i <= forecastDays; i++) {
        const dayIndex = lastDayIndex + i;
        const dailyVolume = Math.max(0, volumeRegression.slope * dayIndex + volumeRegression.intercept);
        const dailyAmount = Math.max(0, amountRegression.slope * dayIndex + amountRegression.intercept);

        projectedRefundVolume += dailyVolume;
        projectedRefundAmount += dailyAmount;
      }

      // Estimate costs based on projected volume (using average cost per return from recent data)
      const recentCostAnalysis = await this.getComprehensiveCostAnalysis(historicalStartDate, historicalEndDate);
      const avgCostPerReturn = recentCostAnalysis.costPerReturn;
      const projectedTotalCosts = projectedRefundVolume * avgCostPerReturn;

      // Calculate confidence interval (simplified standard error)
      // In a real implementation, this would be more statistically rigorous
      const volumeVariance = volumePoints.reduce((acc, p) => {
        const predicted = volumeRegression.slope * p.x + volumeRegression.intercept;
        return acc + Math.pow(p.y - predicted, 2);
      }, 0) / volumePoints.length;

      const standardError = Math.sqrt(volumeVariance);
      const confidenceInterval = {
        lowerBound: projectedRefundVolume - (standardError * forecastDays * 1.96),
        upperBound: projectedRefundVolume + (standardError * forecastDays * 1.96)
      };

      const forecastStartDate = new Date(historicalEndDate);
      forecastStartDate.setDate(forecastStartDate.getDate() + 1);

      const forecastEndDate = new Date(forecastStartDate);
      forecastEndDate.setDate(forecastEndDate.getDate() + forecastDays);

      return {
        forecastPeriod: {
          startDate: forecastStartDate,
          endDate: forecastEndDate
        },
        metrics: {
          projectedRefundVolume: Math.round(projectedRefundVolume),
          projectedRefundAmount,
          projectedTotalCosts
        },
        confidenceInterval,
        modelType: 'linear_regression',
        trends: {
          volumeTrend: volumeRegression.slope,
          costTrend: amountRegression.slope // Using amount trend as proxy for cost trend direction
        }
      };

    } catch (error) {
      logger.error('Error generating predictive model:', error);
      throw new Error('Failed to generate predictive model');
    }
  }

  /**
   * Run scenario analysis
   * Task 2.3: Scenario analysis
   * 
   * Simulates impact of changing parameters on costs and profitability
   * @param startDate - Baseline period start
   * @param endDate - Baseline period end
   * @param parameters - Scenario parameters
   * @returns Scenario analysis result
   */
  async runScenarioAnalysis(
    startDate: Date,
    endDate: Date,
    parameters: {
      returnRateChange?: number; // 0.1 = +10%
      processingCostChange?: number;
      shippingCostChange?: number;
    }
  ): Promise<ScenarioAnalysisResult> {
    try {
      logger.info('Running scenario analysis', { startDate, endDate, parameters });

      // Get baseline metrics
      const baselineAnalysis = await this.getComprehensiveCostAnalysis(startDate, endDate);
      const baselineProfitability = await this.calculateProfitabilityMetrics(startDate, endDate);

      const returnRateChange = parameters.returnRateChange || 0;
      const processingCostChange = parameters.processingCostChange || 0;
      const shippingCostChange = parameters.shippingCostChange || 0;

      // Calculate projected metrics
      // 1. Impact of return rate change (affects volume of returns)
      const volumeMultiplier = 1 + returnRateChange;

      // 2. Impact of cost changes
      const projectedProcessingFees = baselineAnalysis.processingFees.totalProcessingFees * volumeMultiplier * (1 + processingCostChange);
      const projectedShippingCosts = baselineAnalysis.shippingCosts.totalShippingCosts * volumeMultiplier * (1 + shippingCostChange);
      const projectedOverhead = baselineAnalysis.administrativeOverhead.totalAdministrativeOverhead * volumeMultiplier; // Assuming overhead scales with volume

      const projectedTotalCosts = projectedProcessingFees + projectedShippingCosts + projectedOverhead;

      // Projected return count
      const baselineReturnCount = baselineAnalysis.totalCosts / baselineAnalysis.costPerReturn; // Estimate count
      const projectedReturnCount = baselineReturnCount * volumeMultiplier;

      const projectedCostPerReturn = projectedReturnCount > 0 ? projectedTotalCosts / projectedReturnCount : 0;

      // Net financial impact (Revenue Loss + Costs)
      // Assuming average refund amount stays same
      const baselineRevenueLoss = baselineProfitability.netImpact.totalRevenueLoss;
      const projectedRevenueLoss = baselineRevenueLoss * volumeMultiplier;
      const projectedNetFinancialImpact = projectedRevenueLoss + projectedTotalCosts;

      return {
        scenarioName: `Scenario: Rate ${returnRateChange > 0 ? '+' : ''}${(returnRateChange * 100).toFixed(0)}%, Proc ${processingCostChange > 0 ? '+' : ''}${(processingCostChange * 100).toFixed(0)}%, Ship ${shippingCostChange > 0 ? '+' : ''}${(shippingCostChange * 100).toFixed(0)}%`,
        parameters: {
          returnRateChange,
          processingCostChange,
          shippingCostChange
        },
        baselineMetrics: {
          totalCosts: baselineAnalysis.totalCosts,
          costPerReturn: baselineAnalysis.costPerReturn,
          netFinancialImpact: baselineProfitability.netImpact.netFinancialImpact
        },
        projectedMetrics: {
          totalCosts: projectedTotalCosts,
          costPerReturn: projectedCostPerReturn,
          netFinancialImpact: projectedNetFinancialImpact
        },
        impact: {
          costDifference: projectedTotalCosts - baselineAnalysis.totalCosts,
          costDifferencePercentage: baselineAnalysis.totalCosts > 0
            ? ((projectedTotalCosts - baselineAnalysis.totalCosts) / baselineAnalysis.totalCosts) * 100
            : 0,
          profitabilityImpact: -(projectedNetFinancialImpact - baselineProfitability.netImpact.netFinancialImpact) // Negative because increased cost/loss is bad
        }
      };

    } catch (error) {
      logger.error('Error running scenario analysis:', error);
      throw new Error('Failed to run scenario analysis');
    }
  }

  /**
   * Update cost configuration
   * Allows administrators to customize cost calculation parameters
   * @param config - Cost configuration updates
   */
  updateCostConfiguration(config: {
    customerServiceCostPerHour?: number;
    inspectionCostPerHour?: number;
    processingCostPerHour?: number;
    customerServiceTimeMinutes?: number;
    inspectionTimeMinutes?: number;
    processingTimeMinutes?: number;
    apiCallCost?: number;
    storageCostPerGBMonth?: number;
    computeCostPerHour?: number;
  }): void {
    if (config.customerServiceCostPerHour !== undefined) {
      (this as any).AVERAGE_CUSTOMER_SERVICE_COST_PER_HOUR = config.customerServiceCostPerHour;
    }
    if (config.inspectionCostPerHour !== undefined) {
      (this as any).AVERAGE_INSPECTION_COST_PER_HOUR = config.inspectionCostPerHour;
    }
    if (config.processingCostPerHour !== undefined) {
      (this as any).AVERAGE_PROCESSING_COST_PER_HOUR = config.processingCostPerHour;
    }
    if (config.customerServiceTimeMinutes !== undefined) {
      (this as any).AVERAGE_CUSTOMER_SERVICE_TIME_MINUTES = config.customerServiceTimeMinutes;
    }
    if (config.inspectionTimeMinutes !== undefined) {
      (this as any).AVERAGE_INSPECTION_TIME_MINUTES = config.inspectionTimeMinutes;
    }
    if (config.processingTimeMinutes !== undefined) {
      (this as any).AVERAGE_PROCESSING_TIME_MINUTES = config.processingTimeMinutes;
    }
    if (config.apiCallCost !== undefined) {
      (this as any).API_CALL_COST = config.apiCallCost;
    }
    if (config.storageCostPerGBMonth !== undefined) {
      (this as any).STORAGE_COST_PER_GB_MONTH = config.storageCostPerGBMonth;
    }
    if (config.computeCostPerHour !== undefined) {
      (this as any).COMPUTE_COST_PER_HOUR = config.computeCostPerHour;
    }

    logger.info('Cost configuration updated', config);
  }
}

// Export singleton instance
export const refundCostAnalysisService = new RefundCostAnalysisService();
