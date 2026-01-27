import { eq, desc, and, sql, gte, lte } from 'drizzle-orm';
import { safeLogger } from '../../utils/safeLogger';
import { db } from '../db';
import {
  sellerGrowthProjections,
  sellerPerformanceHistory,
  sellers,
  orders as ordersTable,
  marketplaceListings,
  reviews,
  sellerScorecards
} from '../../db/schema';

export interface SellerGrowthProjection {
  id: number;
  sellerWalletAddress: string;
  projections: {
    revenue: ProjectionData;
    orders: ProjectionData;
    customerBase: ProjectionData;
    marketShare: ProjectionData;
  };
  successFactors: SuccessFactor[];
  improvementRecommendations: ImprovementRecommendation[];
  confidenceLevel: number;
  modelVersion: string;
  createdAt: Date;
}

export interface ProjectionData {
  projectionType: string;
  currentValue: number;
  projectedValue: number;
  confidenceInterval: number;
  projectionPeriodMonths: number;
  growthRate: number;
  trajectory: 'exponential' | 'linear' | 'logarithmic' | 'declining';
  milestones: ProjectionMilestone[];
}

export interface ProjectionMilestone {
  month: number;
  projectedValue: number;
  probability: number;
  keyFactors: string[];
}

export interface SuccessFactor {
  factor: string;
  impact: number; // 0-100
  category: 'performance' | 'market' | 'operational' | 'external';
  description: string;
  currentStatus: 'strong' | 'moderate' | 'weak';
}

export interface ImprovementRecommendation {
  area: string;
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
  expectedImpact: number;
  timeframe: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  resources: string[];
}

export interface HistoricalData {
  revenue: number[];
  orders: number[];
  customers: number[];
  ratings: number[];
  periods: Date[];
}

class SellerGrowthProjectionService {

  // Generate comprehensive growth projections
  async generateSellerGrowthProjections(sellerWalletAddress: string): Promise<SellerGrowthProjection> {
    try {
      // Get historical data
      const historicalData = await this.getHistoricalData(sellerWalletAddress);
      
      // Generate projections for different metrics
      const projections = {
        revenue: await this.projectRevenue(sellerWalletAddress, historicalData),
        orders: await this.projectOrders(sellerWalletAddress, historicalData),
        customerBase: await this.projectCustomerBase(sellerWalletAddress, historicalData),
        marketShare: await this.projectMarketShare(sellerWalletAddress, historicalData)
      };

      // Analyze success factors
      const successFactors = await this.analyzeSuccessFactors(sellerWalletAddress, historicalData);
      
      // Generate improvement recommendations
      const improvementRecommendations = await this.generateImprovementRecommendations(
        sellerWalletAddress, 
        projections, 
        successFactors
      );

      // Calculate overall confidence level
      const confidenceLevel = this.calculateOverallConfidence(projections, historicalData);

      // Save projections
      const savedProjections = await this.saveProjections(sellerWalletAddress, {
        projections,
        successFactors,
        improvementRecommendations,
        confidenceLevel
      });

      return {
        id: savedProjections.id,
        sellerWalletAddress,
        projections,
        successFactors,
        improvementRecommendations,
        confidenceLevel,
        modelVersion: '1.0',
        createdAt: savedProjections.createdAt || new Date()
      };
    } catch (error) {
      safeLogger.error('Error generating seller growth projections:', error);
      throw new Error('Failed to generate seller growth projections');
    }
  }

  // Get existing projections or generate new ones
  async getSellerGrowthProjections(sellerWalletAddress: string): Promise<SellerGrowthProjection | null> {
    try {
      // Check if projections exist and are recent (within 30 days)
      const existingProjections = await db
        .select()
        .from(sellerGrowthProjections)
        .where(eq(sellerGrowthProjections.sellerWalletAddress, sellerWalletAddress))
        .orderBy(desc(sellerGrowthProjections.createdAt))
        .limit(1);

      if (existingProjections.length > 0) {
        const projection = existingProjections[0];
        const createdAt = new Date(projection.createdAt || 0);
        const now = new Date();
        const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

        // If projections are less than 30 days old, return them
        if (daysDiff < 30) {
          return {
            id: projection.id,
            sellerWalletAddress,
            projections: {
              revenue: this.parseProjectionData(projection, 'revenue'),
              orders: this.parseProjectionData(projection, 'orders'),
              customerBase: this.parseProjectionData(projection, 'customer_base'),
              marketShare: this.parseProjectionData(projection, 'market_share')
            },
            successFactors: projection.successFactors ? JSON.parse(projection.successFactors as string) : [],
            improvementRecommendations: projection.improvementRecommendations ? JSON.parse(projection.improvementRecommendations as string) : [],
            confidenceLevel: Number(projection.confidenceInterval),
            modelVersion: projection.modelVersion || '1.0',
            createdAt
          };
        }
      }

      // Generate new projections
      return await this.generateSellerGrowthProjections(sellerWalletAddress);
    } catch (error) {
      safeLogger.error('Error getting seller growth projections:', error);
      return null;
    }
  }

  // Get historical performance data
  private async getHistoricalData(sellerWalletAddress: string): Promise<HistoricalData> {
    try {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      // Get monthly revenue data
      const revenueData = await db
        .select({
          month: sql<string>`date_trunc('month', ordersTable.created_at)`,
          revenue: sql<number>`coalesce(sum(ordersTable.total_amount::numeric), 0)`,
          orderCount: sql<number>`count(*)`,
          uniqueCustomers: sql<number>`count(distinct ordersTable.buyer_id)`
        })
        .from(ordersTable)
        .innerJoin(marketplaceListings, eq(ordersTable.listingId, marketplaceListings.id))
        .where(and(
          eq(marketplaceListings.sellerAddress, sellerWalletAddress),
          eq(ordersTable.status, 'completed'),
          gte(ordersTable.createdAt, twelveMonthsAgo)
        ))
        .groupBy(sql`date_trunc('month', ordersTable.created_at)`)
        .orderBy(sql`date_trunc('month', ordersTable.created_at)`);

      // Get monthly rating data
      const ratingData = await db
        .select({
          month: sql<string>`date_trunc('month', reviews.created_at)`,
          averageRating: sql<number>`coalesce(avg(rating), 0)`
        })
        .from(reviews)
        .where(and(
          eq(reviews.revieweeId, sellerWalletAddress),
          gte(reviews.createdAt, twelveMonthsAgo)
        ))
        .groupBy(sql`date_trunc('month', reviews.created_at)`)
        .orderBy(sql`date_trunc('month', reviews.created_at)`);

      // Process data into arrays
      const revenue: number[] = [];
      const orders: number[] = [];
      const customers: number[] = [];
      const ratings: number[] = [];
      const periods: Date[] = [];

      // Fill in data for each month
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().substring(0, 7); // YYYY-MM format

        const monthRevenue = revenueData.find(d => d.month?.startsWith(monthKey));
        const monthRating = ratingData.find(d => d.month?.startsWith(monthKey));

        revenue.push(monthRevenue ? Number(monthRevenue.revenue) : 0);
        orders.push(monthRevenue ? Number(monthRevenue.orderCount) : 0);
        customers.push(monthRevenue ? Number(monthRevenue.uniqueCustomers) : 0);
        ratings.push(monthRating ? Number(monthRating.averageRating) : 0);
        periods.push(new Date(date.getFullYear(), date.getMonth(), 1));
      }

      return { revenue, orders, customers, ratings, periods };
    } catch (error) {
      safeLogger.error('Error getting historical data:', error);
      return {
        revenue: [],
        orders: [],
        customers: [],
        ratings: [],
        periods: []
      };
    }
  }

  // Project revenue growth
  private async projectRevenue(sellerWalletAddress: string, historicalData: HistoricalData): Promise<ProjectionData> {
    try {
      const { revenue, periods } = historicalData;
      
      if (revenue.length < 3) {
        return this.createDefaultProjection('revenue', 0);
      }

      // Calculate growth trend
      const growthRates = this.calculateGrowthRates(revenue);
      const averageGrowthRate = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
      
      // Determine trajectory type
      const trajectory = this.determineTrajectory(revenue, growthRates);
      
      // Project future values
      const currentValue = revenue[revenue.length - 1];
      const projectionPeriodMonths = 12;
      const projectedValue = this.calculateProjectedValue(currentValue, averageGrowthRate, projectionPeriodMonths, trajectory);
      
      // Calculate confidence interval based on data consistency
      const confidenceInterval = this.calculateConfidenceInterval(growthRates);
      
      // Generate milestones
      const milestones = this.generateMilestones(currentValue, projectedValue, projectionPeriodMonths, trajectory);

      return {
        projectionType: 'revenue',
        currentValue,
        projectedValue,
        confidenceInterval,
        projectionPeriodMonths,
        growthRate: averageGrowthRate * 100,
        trajectory,
        milestones
      };
    } catch (error) {
      safeLogger.error('Error projecting revenue:', error);
      return this.createDefaultProjection('revenue', 0);
    }
  }

  // Project order volume growth
  private async projectOrders(sellerWalletAddress: string, historicalData: HistoricalData): Promise<ProjectionData> {
    try {
      const { orders } = historicalData;
      
      if (orders.length < 3) {
        return this.createDefaultProjection('orders', 0);
      }

      const growthRates = this.calculateGrowthRates(orders);
      const averageGrowthRate = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
      const trajectory = this.determineTrajectory(orders, growthRates);
      
      const currentValue = orders[orders.length - 1];
      const projectionPeriodMonths = 12;
      const projectedValue = this.calculateProjectedValue(currentValue, averageGrowthRate, projectionPeriodMonths, trajectory);
      const confidenceInterval = this.calculateConfidenceInterval(growthRates);
      const milestones = this.generateMilestones(currentValue, projectedValue, projectionPeriodMonths, trajectory);

      return {
        projectionType: 'orders',
        currentValue,
        projectedValue,
        confidenceInterval,
        projectionPeriodMonths,
        growthRate: averageGrowthRate * 100,
        trajectory,
        milestones
      };
    } catch (error) {
      safeLogger.error('Error projecting orders:', error);
      return this.createDefaultProjection('orders', 0);
    }
  }

  // Project customer base growth
  private async projectCustomerBase(sellerWalletAddress: string, historicalData: HistoricalData): Promise<ProjectionData> {
    try {
      const { customers } = historicalData;
      
      if (customers.length < 3) {
        return this.createDefaultProjection('customer_base', 0);
      }

      // Customer base typically grows more slowly and plateaus
      const growthRates = this.calculateGrowthRates(customers);
      const averageGrowthRate = Math.min(growthRates.reduce((a, b) => a + b, 0) / growthRates.length, 0.1); // Cap at 10% monthly
      const trajectory = 'logarithmic'; // Customer growth typically follows logarithmic pattern
      
      const currentValue = customers[customers.length - 1];
      const projectionPeriodMonths = 12;
      const projectedValue = this.calculateProjectedValue(currentValue, averageGrowthRate, projectionPeriodMonths, trajectory);
      const confidenceInterval = this.calculateConfidenceInterval(growthRates);
      const milestones = this.generateMilestones(currentValue, projectedValue, projectionPeriodMonths, trajectory);

      return {
        projectionType: 'customer_base',
        currentValue,
        projectedValue,
        confidenceInterval,
        projectionPeriodMonths,
        growthRate: averageGrowthRate * 100,
        trajectory,
        milestones
      };
    } catch (error) {
      safeLogger.error('Error projecting customer base:', error);
      return this.createDefaultProjection('customer_base', 0);
    }
  }

  // Project market share growth
  private async projectMarketShare(sellerWalletAddress: string, historicalData: HistoricalData): Promise<ProjectionData> {
    try {
      // Get total marketplace revenue for comparison
      const totalMarketRevenue = await this.getTotalMarketRevenue();
      const sellerRevenue = historicalData.revenue[historicalData.revenue.length - 1];
      
      const currentMarketShare = totalMarketRevenue > 0 ? (sellerRevenue / totalMarketRevenue) * 100 : 0;
      
      // Market share growth is typically limited and competitive
      const projectedGrowthRate = Math.min(0.02, currentMarketShare * 0.1); // Conservative growth
      const projectionPeriodMonths = 12;
      const projectedMarketShare = currentMarketShare * (1 + projectedGrowthRate) ** projectionPeriodMonths;
      
      const milestones = this.generateMilestones(currentMarketShare, projectedMarketShare, projectionPeriodMonths, 'linear');

      return {
        projectionType: 'market_share',
        currentValue: currentMarketShare,
        projectedValue: projectedMarketShare,
        confidenceInterval: 60, // Lower confidence for market share predictions
        projectionPeriodMonths,
        growthRate: projectedGrowthRate * 100,
        trajectory: 'linear',
        milestones
      };
    } catch (error) {
      safeLogger.error('Error projecting market share:', error);
      return this.createDefaultProjection('market_share', 0);
    }
  }

  // Analyze success factors
  private async analyzeSuccessFactors(sellerWalletAddress: string, historicalData: HistoricalData): Promise<SuccessFactor[]> {
    try {
      const factors: SuccessFactor[] = [];

      // Performance factors
      const avgRating = historicalData.ratings.reduce((a, b) => a + b, 0) / historicalData.ratings.length;
      factors.push({
        factor: 'Customer Satisfaction',
        impact: Math.min(100, avgRating * 20),
        category: 'performance',
        description: 'High customer ratings drive repeat business and referrals',
        currentStatus: avgRating >= 4.5 ? 'strong' : avgRating >= 3.5 ? 'moderate' : 'weak'
      });

      // Order consistency
      const orderConsistency = this.calculateConsistency(historicalData.orders);
      factors.push({
        factor: 'Order Consistency',
        impact: orderConsistency * 100,
        category: 'operational',
        description: 'Consistent order volume indicates stable business operations',
        currentStatus: orderConsistency >= 0.8 ? 'strong' : orderConsistency >= 0.6 ? 'moderate' : 'weak'
      });

      // Revenue growth trend
      const revenueGrowth = this.calculateGrowthRates(historicalData.revenue);
      const avgRevenueGrowth = revenueGrowth.reduce((a, b) => a + b, 0) / revenueGrowth.length;
      factors.push({
        factor: 'Revenue Growth Trend',
        impact: Math.min(100, Math.max(0, (avgRevenueGrowth + 0.1) * 500)),
        category: 'performance',
        description: 'Positive revenue trends indicate business momentum',
        currentStatus: avgRevenueGrowth > 0.05 ? 'strong' : avgRevenueGrowth > 0 ? 'moderate' : 'weak'
      });

      // Customer retention (estimated)
      const customerRetention = this.estimateCustomerRetention(historicalData);
      factors.push({
        factor: 'Customer Retention',
        impact: customerRetention * 100,
        category: 'performance',
        description: 'High customer retention reduces acquisition costs and increases lifetime value',
        currentStatus: customerRetention >= 0.7 ? 'strong' : customerRetention >= 0.5 ? 'moderate' : 'weak'
      });

      // Market position
      const marketPosition = await this.assessMarketPosition(sellerWalletAddress);
      factors.push({
        factor: 'Market Position',
        impact: marketPosition * 100,
        category: 'market',
        description: 'Strong market position provides competitive advantages',
        currentStatus: marketPosition >= 0.7 ? 'strong' : marketPosition >= 0.5 ? 'moderate' : 'weak'
      });

      return factors;
    } catch (error) {
      safeLogger.error('Error analyzing success factors:', error);
      return [];
    }
  }

  // Generate improvement recommendations
  private async generateImprovementRecommendations(
    sellerWalletAddress: string,
    projections: SellerGrowthProjection['projections'],
    successFactors: SuccessFactor[]
  ): Promise<ImprovementRecommendation[]> {
    try {
      const recommendations: ImprovementRecommendation[] = [];

      // Analyze weak success factors
      const weakFactors = successFactors.filter(f => f.currentStatus === 'weak');
      
      for (const factor of weakFactors) {
        switch (factor.factor) {
          case 'Customer Satisfaction':
            recommendations.push({
              area: 'Customer Experience',
              priority: 'high',
              recommendation: 'Focus on improving product quality and customer service to boost ratings',
              expectedImpact: 25,
              timeframe: '3-6 months',
              difficulty: 'moderate',
              resources: ['Customer service training', 'Quality control processes', 'Feedback system']
            });
            break;
          
          case 'Order Consistency':
            recommendations.push({
              area: 'Operations',
              priority: 'medium',
              recommendation: 'Implement inventory management and demand forecasting to stabilize order flow',
              expectedImpact: 20,
              timeframe: '2-4 months',
              difficulty: 'moderate',
              resources: ['Inventory management system', 'Demand forecasting tools', 'Process optimization']
            });
            break;
          
          case 'Revenue Growth Trend':
            recommendations.push({
              area: 'Sales & Marketing',
              priority: 'high',
              recommendation: 'Develop marketing strategy and expand product offerings to drive revenue growth',
              expectedImpact: 30,
              timeframe: '4-8 months',
              difficulty: 'hard',
              resources: ['Marketing budget', 'Product development', 'Market research', 'SEO optimization']
            });
            break;
        }
      }

      // Growth-specific recommendations
      if (projections.revenue.growthRate < 5) {
        recommendations.push({
          area: 'Revenue Optimization',
          priority: 'high',
          recommendation: 'Implement dynamic pricing and upselling strategies to increase average order value',
          expectedImpact: 15,
          timeframe: '1-3 months',
          difficulty: 'easy',
          resources: ['Pricing analysis tools', 'Product bundling', 'Cross-selling automation']
        });
      }

      if (projections.customerBase.growthRate < 10) {
        recommendations.push({
          area: 'Customer Acquisition',
          priority: 'medium',
          recommendation: 'Launch referral program and improve social media presence to attract new customers',
          expectedImpact: 20,
          timeframe: '2-4 months',
          difficulty: 'moderate',
          resources: ['Referral system', 'Social media management', 'Content creation', 'Influencer partnerships']
        });
      }

      return recommendations;
    } catch (error) {
      safeLogger.error('Error generating improvement recommendations:', error);
      return [];
    }
  }

  // Helper methods

  private calculateGrowthRates(values: number[]): number[] {
    const rates: number[] = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] > 0) {
        rates.push((values[i] - values[i - 1]) / values[i - 1]);
      } else {
        rates.push(values[i] > 0 ? 1 : 0);
      }
    }
    return rates;
  }

  private determineTrajectory(values: number[], growthRates: number[]): 'exponential' | 'linear' | 'logarithmic' | 'declining' {
    const avgGrowthRate = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
    const growthAcceleration = this.calculateAcceleration(growthRates);

    if (avgGrowthRate < -0.05) return 'declining';
    if (growthAcceleration > 0.02) return 'exponential';
    if (growthAcceleration < -0.02) return 'logarithmic';
    return 'linear';
  }

  private calculateAcceleration(growthRates: number[]): number {
    if (growthRates.length < 2) return 0;
    
    const accelerations: number[] = [];
    for (let i = 1; i < growthRates.length; i++) {
      accelerations.push(growthRates[i] - growthRates[i - 1]);
    }
    
    return accelerations.reduce((a, b) => a + b, 0) / accelerations.length;
  }

  private calculateProjectedValue(
    currentValue: number, 
    growthRate: number, 
    months: number, 
    trajectory: string
  ): number {
    switch (trajectory) {
      case 'exponential':
        return currentValue * Math.pow(1 + growthRate, months);
      case 'logarithmic':
        return currentValue * (1 + Math.log(1 + months * growthRate));
      case 'declining':
        return Math.max(0, currentValue * Math.pow(1 + growthRate, months));
      default: // linear
        return Math.max(0, currentValue * (1 + growthRate * months));
    }
  }

  private calculateConfidenceInterval(growthRates: number[]): number {
    if (growthRates.length < 2) return 50;
    
    const variance = this.calculateVariance(growthRates);
    const consistency = Math.max(0, 1 - variance);
    
    return Math.round(consistency * 100);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private generateMilestones(
    currentValue: number, 
    projectedValue: number, 
    months: number, 
    trajectory: string
  ): ProjectionMilestone[] {
    const milestones: ProjectionMilestone[] = [];
    const monthlyGrowthRate = Math.pow(projectedValue / currentValue, 1 / months) - 1;
    
    for (let month = 3; month <= months; month += 3) {
      let value: number;
      
      switch (trajectory) {
        case 'exponential':
          value = currentValue * Math.pow(1 + monthlyGrowthRate, month);
          break;
        case 'logarithmic':
          value = currentValue * (1 + Math.log(1 + month * monthlyGrowthRate));
          break;
        default:
          value = currentValue + (projectedValue - currentValue) * (month / months);
      }
      
      milestones.push({
        month,
        projectedValue: Math.round(value),
        probability: Math.max(0.5, 1 - (month / months) * 0.3), // Decreasing probability over time
        keyFactors: this.getKeyFactorsForMilestone(month)
      });
    }
    
    return milestones;
  }

  private getKeyFactorsForMilestone(month: number): string[] {
    const factors = [
      'Market conditions remain stable',
      'Customer satisfaction maintained',
      'Operational efficiency improved',
      'No major competitive threats'
    ];
    
    if (month <= 6) {
      factors.push('Short-term marketing initiatives successful');
    } else {
      factors.push('Long-term strategic initiatives implemented');
      factors.push('Market expansion successful');
    }
    
    return factors;
  }

  private calculateConsistency(values: number[]): number {
    if (values.length < 2) return 0;
    
    const coefficientOfVariation = Math.sqrt(this.calculateVariance(values)) / (values.reduce((a, b) => a + b, 0) / values.length);
    return Math.max(0, 1 - coefficientOfVariation);
  }

  private estimateCustomerRetention(historicalData: HistoricalData): number {
    // Simplified estimation based on customer growth vs order growth
    const customerGrowth = this.calculateGrowthRates(historicalData.customers);
    const orderGrowth = this.calculateGrowthRates(historicalData.orders);
    
    if (customerGrowth.length === 0 || orderGrowth.length === 0) return 0.5;
    
    const avgCustomerGrowth = customerGrowth.reduce((a, b) => a + b, 0) / customerGrowth.length;
    const avgOrderGrowth = orderGrowth.reduce((a, b) => a + b, 0) / orderGrowth.length;
    
    // If orders grow faster than customers, retention is likely higher
    const retentionIndicator = avgOrderGrowth > avgCustomerGrowth ? 0.7 : 0.5;
    return Math.min(0.9, Math.max(0.3, retentionIndicator));
  }

  private async assessMarketPosition(sellerWalletAddress: string): Promise<number> {
    try {
      // Get seller's performance relative to marketplace average
      const sellerScorecard = await db
        .select()
        .from(sellerScorecards)
        .where(eq(sellerScorecards.sellerWalletAddress, sellerWalletAddress))
        .limit(1);

      if (sellerScorecard.length === 0) return 0.5;

      const sellerScore = Number(sellerScorecard[0].overallScore);
      
      // Get marketplace average score
      const avgScoreResult = await db
        .select({
          averageScore: sql<number>`coalesce(avg(overall_score::numeric), 50)`
        })
        .from(sellerScorecards);

      const marketplaceAverage = Number(avgScoreResult[0]?.averageScore || 50);
      
      // Calculate relative position (0-1 scale)
      return Math.min(1, Math.max(0, sellerScore / Math.max(marketplaceAverage, 50)));
    } catch (error) {
      safeLogger.error('Error assessing market position:', error);
      return 0.5;
    }
  }

  private async getTotalMarketRevenue(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await db
        .select({
          totalRevenue: sql<number>`coalesce(sum(total_amount::numeric), 0)`
        })
        .from(ordersTable)
        .where(and(
          eq(ordersTable.status, 'completed'),
          gte(ordersTable.createdAt, thirtyDaysAgo)
        ));

      return Number(result[0]?.totalRevenue || 0);
    } catch (error) {
      safeLogger.error('Error getting total market revenue:', error);
      return 0;
    }
  }

  private createDefaultProjection(type: string, currentValue: number): ProjectionData {
    return {
      projectionType: type,
      currentValue,
      projectedValue: currentValue,
      confidenceInterval: 50,
      projectionPeriodMonths: 12,
      growthRate: 0,
      trajectory: 'linear',
      milestones: []
    };
  }

  private parseProjectionData(projection: any, type: string): ProjectionData {
    // This would parse stored projection data from database
    // For now, return default structure
    return this.createDefaultProjection(type, 0);
  }

  private calculateOverallConfidence(projections: SellerGrowthProjection['projections'], historicalData: HistoricalData): number {
    const confidences = [
      projections.revenue.confidenceInterval,
      projections.orders.confidenceInterval,
      projections.customerBase.confidenceInterval,
      projections.marketShare.confidenceInterval
    ];

    // Weight by data quality
    const dataQuality = Math.min(100, (historicalData.revenue.length / 12) * 100);
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    
    return Math.round((avgConfidence + dataQuality) / 2);
  }

  // Save projections to database
  private async saveProjections(sellerWalletAddress: string, data: {
    projections: SellerGrowthProjection['projections'];
    successFactors: SuccessFactor[];
    improvementRecommendations: ImprovementRecommendation[];
    confidenceLevel: number;
  }) {
    try {
      // Save each projection type separately
      const projectionTypes = ['revenue', 'orders', 'customer_base', 'market_share'];
      
      for (const type of projectionTypes) {
        const projection = data.projections[type as keyof typeof data.projections];
        
        await db.insert(sellerGrowthProjections).values({
          sellerWalletAddress,
          projectionType: type,
          currentValue: projection.currentValue.toString(),
          projectedValue: projection.projectedValue.toString(),
          confidenceInterval: projection.confidenceInterval.toString(),
          projectionPeriodMonths: projection.projectionPeriodMonths,
          successFactors: JSON.stringify(data.successFactors),
          improvementRecommendations: JSON.stringify(data.improvementRecommendations),
          modelVersion: '1.0',
          createdAt: new Date()
        });
      }

      // Return the first projection record as representative
      const saved = await db
        .select()
        .from(sellerGrowthProjections)
        .where(eq(sellerGrowthProjections.sellerWalletAddress, sellerWalletAddress))
        .orderBy(desc(sellerGrowthProjections.createdAt))
        .limit(1);

      return saved[0];
    } catch (error) {
      safeLogger.error('Error saving projections:', error);
      throw error;
    }
  }
}

export const sellerGrowthProjectionService = new SellerGrowthProjectionService();
