import { eq, desc, and, sql, gte, lte, count } from 'drizzle-orm';
import { safeLogger } from '../../utils/safeLogger';
import { db } from '../db';
import { 
  marketplaceHealthMetrics,
  sellers,
  orders,
  marketplaceListings,
  reviews,
  disputes,
  sellerScorecards
} from '../../db/schema';

export interface MarketplaceHealthDashboard {
  overallHealth: {
    score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    trend: 'improving' | 'stable' | 'declining';
  };
  sellerMetrics: {
    totalSellers: number;
    activeSellers: number;
    newSellers: number;
    sellerDistribution: SellerDistribution;
    averageSellerScore: number;
    topPerformers: number;
  };
  marketTrends: {
    totalVolume: number;
    averageOrderValue: number;
    orderGrowthRate: number;
    categoryPerformance: CategoryPerformance[];
    seasonalTrends: SeasonalTrend[];
  };
  qualityMetrics: {
    averageRating: number;
    disputeRate: number;
    resolutionTime: number;
    customerSatisfaction: number;
  };
  recommendations: MarketplaceRecommendation[];
}

export interface SellerDistribution {
  byTier: { tier: string; count: number; percentage: number }[];
  byRegion: { region: string; count: number; percentage: number }[];
  concentration: {
    top10Percentage: number;
    herfindahlIndex: number;
    concentrationLevel: 'low' | 'medium' | 'high';
  };
}

export interface CategoryPerformance {
  category: string;
  volume: number;
  growth: number;
  averagePrice: number;
  sellerCount: number;
  competitiveness: number;
}

export interface SeasonalTrend {
  period: string;
  volume: number;
  orders: number;
  averageValue: number;
  growthRate: number;
}

export interface MarketplaceRecommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  actionItems: string[];
}

class MarketplaceHealthService {

  // Generate comprehensive marketplace health dashboard
  async getMarketplaceHealthDashboard(): Promise<MarketplaceHealthDashboard> {
    try {
      const [
        overallHealth,
        sellerMetrics,
        marketTrends,
        qualityMetrics
      ] = await Promise.all([
        this.calculateOverallHealth(),
        this.getSellerMetrics(),
        this.getMarketTrends(),
        this.getQualityMetrics()
      ]);

      const recommendations = this.generateMarketplaceRecommendations({
        overallHealth,
        sellerMetrics,
        marketTrends,
        qualityMetrics
      });

      return {
        overallHealth,
        sellerMetrics,
        marketTrends,
        qualityMetrics,
        recommendations
      };
    } catch (error) {
      safeLogger.error('Error generating marketplace health dashboard:', error);
      throw new Error('Failed to generate marketplace health dashboard');
    }
  }

  // Calculate overall marketplace health score
  private async calculateOverallHealth(): Promise<MarketplaceHealthDashboard['overallHealth']> {
    try {
      // Get key health indicators
      const [sellerActivity, orderVolume, qualityScore, growthRate] = await Promise.all([
        this.getSellerActivityScore(),
        this.getOrderVolumeScore(),
        this.getQualityScore(),
        this.getGrowthRateScore()
      ]);

      // Calculate weighted health score
      const healthScore = Math.round(
        sellerActivity * 0.25 +
        orderVolume * 0.30 +
        qualityScore * 0.25 +
        growthRate * 0.20
      );

      // Determine status
      let status: 'excellent' | 'good' | 'fair' | 'poor';
      if (healthScore >= 85) status = 'excellent';
      else if (healthScore >= 70) status = 'good';
      else if (healthScore >= 55) status = 'fair';
      else status = 'poor';

      // Get trend (compare with previous period)
      const trend = await this.getHealthTrend();

      return {
        score: healthScore,
        status,
        trend
      };
    } catch (error) {
      safeLogger.error('Error calculating overall health:', error);
      return {
        score: 0,
        status: 'poor',
        trend: 'stable'
      };
    }
  }

  // Get seller metrics
  private async getSellerMetrics(): Promise<MarketplaceHealthDashboard['sellerMetrics']> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get seller counts
      const [totalSellers, newSellers, activeSellers] = await Promise.all([
        db.select({ count: count() }).from(sellers),
        db.select({ count: count() }).from(sellers).where(gte(sellers.createdAt, thirtyDaysAgo)),
        this.getActiveSellerCount()
      ]);

      // Get seller distribution
      const sellerDistribution = await this.getSellerDistribution();

      // Get average seller score
      const avgScoreResult = await db
        .select({
          averageScore: sql<number>`coalesce(avg(overall_score::numeric), 0)`
        })
        .from(sellerScorecards);

      const averageSellerScore = Number(avgScoreResult[0]?.averageScore || 0);

      // Count top performers (score >= 80)
      const topPerformersResult = await db
        .select({ count: count() })
        .from(sellerScorecards)
        .where(sql`overall_score::numeric >= 80`);

      return {
        totalSellers: totalSellers[0].count,
        activeSellers: activeSellers,
        newSellers: newSellers[0].count,
        sellerDistribution,
        averageSellerScore,
        topPerformers: topPerformersResult[0].count
      };
    } catch (error) {
      safeLogger.error('Error getting seller metrics:', error);
      return {
        totalSellers: 0,
        activeSellers: 0,
        newSellers: 0,
        sellerDistribution: {
          byTier: [],
          byRegion: [],
          concentration: { top10Percentage: 0, herfindahlIndex: 0, concentrationLevel: 'low' }
        },
        averageSellerScore: 0,
        topPerformers: 0
      };
    }
  }

  // Get market trends
  private async getMarketTrends(): Promise<MarketplaceHealthDashboard['marketTrends']> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get total volume and average order value
      const volumeResult = await db
        .select({
          totalVolume: sql<number>`coalesce(sum(total_amount::numeric), 0)`,
          averageOrderValue: sql<number>`coalesce(avg(total_amount::numeric), 0)`,
          orderCount: count()
        })
        .from(orders)
        .where(and(
          eq(orders.status, 'completed'),
          gte(orders.createdAt, thirtyDaysAgo)
        ));

      // Get growth rate
      const orderGrowthRate = await this.calculateOrderGrowthRate();

      // Get category performance
      const categoryPerformance = await this.getCategoryPerformance();

      // Get seasonal trends
      const seasonalTrends = await this.getSeasonalTrends();

      const volumeData = volumeResult[0] || { totalVolume: 0, averageOrderValue: 0, orderCount: 0 };

      return {
        totalVolume: Number(volumeData.totalVolume),
        averageOrderValue: Number(volumeData.averageOrderValue),
        orderGrowthRate,
        categoryPerformance,
        seasonalTrends
      };
    } catch (error) {
      safeLogger.error('Error getting market trends:', error);
      return {
        totalVolume: 0,
        averageOrderValue: 0,
        orderGrowthRate: 0,
        categoryPerformance: [],
        seasonalTrends: []
      };
    }
  }

  // Get quality metrics
  private async getQualityMetrics(): Promise<MarketplaceHealthDashboard['qualityMetrics']> {
    try {
      // Get average rating
      const ratingResult = await db
        .select({
          averageRating: sql<number>`coalesce(avg(rating), 0)`
        })
        .from(reviews);

      // Get dispute rate
      const [totalOrders, disputedOrders] = await Promise.all([
        db.select({ count: count() }).from(orders),
        db.select({ count: count() }).from(disputes)
      ]);

      const disputeRate = totalOrders[0].count > 0 ? disputedOrders[0].count / totalOrders[0].count : 0;

      // Calculate customer satisfaction (based on ratings >= 4)
      const satisfactionResult = await db
        .select({
          totalReviews: count(),
          positiveReviews: sql<number>`count(*) filter (where rating >= 4)`
        })
        .from(reviews);

      const satisfactionData = satisfactionResult[0] || { totalReviews: 0, positiveReviews: 0 };
      const customerSatisfaction = satisfactionData.totalReviews > 0 
        ? satisfactionData.positiveReviews / satisfactionData.totalReviews 
        : 0;

      return {
        averageRating: Number(ratingResult[0]?.averageRating || 0),
        disputeRate: disputeRate * 100, // Convert to percentage
        resolutionTime: 72, // Mock data - would need dispute resolution tracking
        customerSatisfaction: customerSatisfaction * 100 // Convert to percentage
      };
    } catch (error) {
      safeLogger.error('Error getting quality metrics:', error);
      return {
        averageRating: 0,
        disputeRate: 0,
        resolutionTime: 0,
        customerSatisfaction: 0
      };
    }
  }

  // Helper methods

  private async getSellerActivityScore(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [totalSellers, activeSellers] = await Promise.all([
        db.select({ count: count() }).from(sellers),
        this.getActiveSellerCount()
      ]);

      const activityRate = totalSellers[0].count > 0 ? activeSellers / totalSellers[0].count : 0;
      return Math.round(activityRate * 100);
    } catch (error) {
      safeLogger.error('Error getting seller activity score:', error);
      return 0;
    }
  }

  private async getOrderVolumeScore(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const orderCount = await db
        .select({ count: count() })
        .from(orders)
        .where(gte(orders.createdAt, thirtyDaysAgo));

      // Score based on order volume (normalize to 0-100 scale)
      // This is a simplified scoring - in practice, you'd compare against targets
      const dailyOrders = orderCount[0].count / 30;
      if (dailyOrders >= 100) return 100;
      if (dailyOrders >= 50) return 80;
      if (dailyOrders >= 20) return 60;
      if (dailyOrders >= 10) return 40;
      return Math.min(40, dailyOrders * 4);
    } catch (error) {
      safeLogger.error('Error getting order volume score:', error);
      return 0;
    }
  }

  private async getQualityScore(): Promise<number> {
    try {
      const [avgRating, disputeRate] = await Promise.all([
        db.select({ rating: sql<number>`coalesce(avg(rating), 0)` }).from(reviews),
        this.getDisputeRate()
      ]);

      const ratingScore = (Number(avgRating[0]?.rating || 0) / 5) * 100;
      const disputeScore = Math.max(0, 100 - (disputeRate * 1000)); // Penalize high dispute rates

      return Math.round((ratingScore + disputeScore) / 2);
    } catch (error) {
      safeLogger.error('Error getting quality score:', error);
      return 0;
    }
  }

  private async getGrowthRateScore(): Promise<number> {
    try {
      const growthRate = await this.calculateOrderGrowthRate();
      
      // Score based on growth rate
      if (growthRate >= 20) return 100;
      if (growthRate >= 10) return 80;
      if (growthRate >= 5) return 60;
      if (growthRate >= 0) return 40;
      return Math.max(0, 40 + growthRate); // Negative growth reduces score
    } catch (error) {
      safeLogger.error('Error getting growth rate score:', error);
      return 0;
    }
  }

  private async getActiveSellerCount(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Count sellers with orders in the last 30 days
      const result = await db
        .select({ count: sql<number>`count(distinct ml.seller_address)` })
        .from(orders)
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .where(gte(orders.createdAt, thirtyDaysAgo));

      return result[0]?.count || 0;
    } catch (error) {
      safeLogger.error('Error getting active seller count:', error);
      return 0;
    }
  }

  private async getSellerDistribution(): Promise<SellerDistribution> {
    try {
      // Get distribution by tier
      const tierDistribution = await db
        .select({
          tier: sellerScorecards.performanceTier,
          count: count()
        })
        .from(sellerScorecards)
        .groupBy(sellerScorecards.performanceTier);

      const totalSellers = tierDistribution.reduce((sum, tier) => sum + tier.count, 0);
      const byTier = tierDistribution.map(tier => ({
        tier: tier.tier || 'bronze',
        count: tier.count,
        percentage: totalSellers > 0 ? (tier.count / totalSellers) * 100 : 0
      }));

      // Mock region distribution (would need location data)
      const byRegion = [
        { region: 'North America', count: Math.floor(totalSellers * 0.4), percentage: 40 },
        { region: 'Europe', count: Math.floor(totalSellers * 0.3), percentage: 30 },
        { region: 'Asia', count: Math.floor(totalSellers * 0.2), percentage: 20 },
        { region: 'Other', count: Math.floor(totalSellers * 0.1), percentage: 10 }
      ];

      // Calculate concentration metrics
      const concentration = await this.calculateMarketConcentration();

      return {
        byTier,
        byRegion,
        concentration
      };
    } catch (error) {
      safeLogger.error('Error getting seller distribution:', error);
      return {
        byTier: [],
        byRegion: [],
        concentration: { top10Percentage: 0, herfindahlIndex: 0, concentrationLevel: 'low' }
      };
    }
  }

  private async calculateMarketConcentration(): Promise<SellerDistribution['concentration']> {
    try {
      // Get seller revenue distribution
      const sellerRevenues = await db
        .select({
          sellerAddress: marketplaceListings.sellerAddress,
          revenue: sql<number>`coalesce(sum(orders.total_amount::numeric), 0)`
        })
        .from(orders)
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .where(eq(orders.status, 'completed'))
        .groupBy(marketplaceListings.sellerAddress)
        .orderBy(desc(sql`sum(orders.total_amount::numeric)`));

      if (sellerRevenues.length === 0) {
        return { top10Percentage: 0, herfindahlIndex: 0, concentrationLevel: 'low' };
      }

      const totalRevenue = sellerRevenues.reduce((sum, seller) => sum + Number(seller.revenue), 0);
      
      // Calculate top 10% share
      const top10Count = Math.max(1, Math.floor(sellerRevenues.length * 0.1));
      const top10Revenue = sellerRevenues.slice(0, top10Count).reduce((sum, seller) => sum + Number(seller.revenue), 0);
      const top10Percentage = totalRevenue > 0 ? (top10Revenue / totalRevenue) * 100 : 0;

      // Calculate Herfindahl-Hirschman Index
      const marketShares = sellerRevenues.map(seller => Number(seller.revenue) / totalRevenue);
      const herfindahlIndex = marketShares.reduce((sum, share) => sum + Math.pow(share, 2), 0) * 10000;

      // Determine concentration level
      let concentrationLevel: 'low' | 'medium' | 'high';
      if (herfindahlIndex < 1500) concentrationLevel = 'low';
      else if (herfindahlIndex < 2500) concentrationLevel = 'medium';
      else concentrationLevel = 'high';

      return {
        top10Percentage: Math.round(top10Percentage * 100) / 100,
        herfindahlIndex: Math.round(herfindahlIndex),
        concentrationLevel
      };
    } catch (error) {
      safeLogger.error('Error calculating market concentration:', error);
      return { top10Percentage: 0, herfindahlIndex: 0, concentrationLevel: 'low' };
    }
  }

  private async calculateOrderGrowthRate(): Promise<number> {
    try {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const [currentOrders, previousOrders] = await Promise.all([
        db.select({ count: count() }).from(orders).where(gte(orders.createdAt, currentMonthStart)),
        db.select({ count: count() }).from(orders).where(and(
          gte(orders.createdAt, previousMonthStart),
          lte(orders.createdAt, previousMonthEnd)
        ))
      ]);

      const current = currentOrders[0].count;
      const previous = previousOrders[0].count;

      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    } catch (error) {
      safeLogger.error('Error calculating order growth rate:', error);
      return 0;
    }
  }

  private async getCategoryPerformance(): Promise<CategoryPerformance[]> {
    try {
      // Mock category performance data (would need category tracking)
      return [
        {
          category: 'Electronics',
          volume: 150000,
          growth: 15.5,
          averagePrice: 299.99,
          sellerCount: 45,
          competitiveness: 0.75
        },
        {
          category: 'Fashion',
          volume: 120000,
          growth: 8.2,
          averagePrice: 89.99,
          sellerCount: 78,
          competitiveness: 0.85
        },
        {
          category: 'Home & Garden',
          volume: 95000,
          growth: 12.1,
          averagePrice: 149.99,
          sellerCount: 32,
          competitiveness: 0.65
        }
      ];
    } catch (error) {
      safeLogger.error('Error getting category performance:', error);
      return [];
    }
  }

  private async getSeasonalTrends(): Promise<SeasonalTrend[]> {
    try {
      // Get last 12 months of data
      const trends: SeasonalTrend[] = [];
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const monthData = await db
          .select({
            volume: sql<number>`coalesce(sum(total_amount::numeric), 0)`,
            orders: count(),
            averageValue: sql<number>`coalesce(avg(total_amount::numeric), 0)`
          })
          .from(orders)
          .where(and(
            eq(orders.status, 'completed'),
            gte(orders.createdAt, monthStart),
            lte(orders.createdAt, monthEnd)
          ));

        const data = monthData[0] || { volume: 0, orders: 0, averageValue: 0 };
        
        trends.push({
          period: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
          volume: Number(data.volume),
          orders: data.orders,
          averageValue: Number(data.averageValue),
          growthRate: 0 // Would calculate based on previous period
        });
      }

      // Calculate growth rates
      for (let i = 1; i < trends.length; i++) {
        const current = trends[i].volume;
        const previous = trends[i - 1].volume;
        trends[i].growthRate = previous > 0 ? ((current - previous) / previous) * 100 : 0;
      }

      return trends;
    } catch (error) {
      safeLogger.error('Error getting seasonal trends:', error);
      return [];
    }
  }

  private async getDisputeRate(): Promise<number> {
    try {
      const [totalOrders, disputedOrders] = await Promise.all([
        db.select({ count: count() }).from(orders),
        db.select({ count: count() }).from(disputes)
      ]);

      return totalOrders[0].count > 0 ? disputedOrders[0].count / totalOrders[0].count : 0;
    } catch (error) {
      safeLogger.error('Error getting dispute rate:', error);
      return 0;
    }
  }

  private async getHealthTrend(): Promise<'improving' | 'stable' | 'declining'> {
    try {
      // Get last two health metric records
      const recentMetrics = await db
        .select()
        .from(marketplaceHealthMetrics)
        .where(eq(marketplaceHealthMetrics.metricName, 'overall_health_score'))
        .orderBy(desc(marketplaceHealthMetrics.createdAt))
        .limit(2);

      if (recentMetrics.length < 2) return 'stable';

      const current = Number(recentMetrics[0].metricValue);
      const previous = Number(recentMetrics[1].metricValue);
      const changePercent = ((current - previous) / previous) * 100;

      if (Math.abs(changePercent) < 5) return 'stable';
      return changePercent > 0 ? 'improving' : 'declining';
    } catch (error) {
      safeLogger.error('Error getting health trend:', error);
      return 'stable';
    }
  }

  // Generate marketplace recommendations
  private generateMarketplaceRecommendations(data: {
    overallHealth: MarketplaceHealthDashboard['overallHealth'];
    sellerMetrics: MarketplaceHealthDashboard['sellerMetrics'];
    marketTrends: MarketplaceHealthDashboard['marketTrends'];
    qualityMetrics: MarketplaceHealthDashboard['qualityMetrics'];
  }): MarketplaceRecommendation[] {
    const recommendations: MarketplaceRecommendation[] = [];

    // Health-based recommendations
    if (data.overallHealth.score < 70) {
      recommendations.push({
        category: 'overall_health',
        priority: 'high',
        title: 'Improve Overall Marketplace Health',
        description: 'Marketplace health score is below optimal levels',
        impact: 'Critical for platform sustainability and growth',
        actionItems: [
          'Focus on seller onboarding and retention',
          'Improve dispute resolution processes',
          'Enhance quality control measures'
        ]
      });
    }

    // Seller-based recommendations
    if (data.sellerMetrics.averageSellerScore < 60) {
      recommendations.push({
        category: 'seller_performance',
        priority: 'high',
        title: 'Enhance Seller Performance Support',
        description: 'Average seller performance scores are below target',
        impact: 'Improved seller performance leads to better customer experience',
        actionItems: [
          'Implement seller training programs',
          'Provide performance feedback and coaching',
          'Create seller success resources'
        ]
      });
    }

    // Market concentration recommendations
    if (data.sellerMetrics.sellerDistribution.concentration.concentrationLevel === 'high') {
      recommendations.push({
        category: 'market_structure',
        priority: 'medium',
        title: 'Reduce Market Concentration',
        description: 'High market concentration may limit competition',
        impact: 'Better competition leads to improved prices and innovation',
        actionItems: [
          'Incentivize new seller onboarding',
          'Support small and medium sellers',
          'Implement anti-monopoly measures'
        ]
      });
    }

    // Quality-based recommendations
    if (data.qualityMetrics.disputeRate > 5) {
      recommendations.push({
        category: 'quality_control',
        priority: 'high',
        title: 'Reduce Dispute Rate',
        description: 'Dispute rate is above acceptable threshold',
        impact: 'Lower dispute rates improve customer trust and satisfaction',
        actionItems: [
          'Improve product description standards',
          'Enhance seller verification processes',
          'Implement proactive quality monitoring'
        ]
      });
    }

    // Growth-based recommendations
    if (data.marketTrends.orderGrowthRate < 5) {
      recommendations.push({
        category: 'growth',
        priority: 'medium',
        title: 'Accelerate Market Growth',
        description: 'Order growth rate is below target levels',
        impact: 'Sustained growth is essential for platform success',
        actionItems: [
          'Launch marketing campaigns to attract buyers',
          'Expand into new product categories',
          'Improve user experience and conversion rates'
        ]
      });
    }

    return recommendations;
  }

  // Record marketplace health metric
  async recordHealthMetric(
    metricName: string,
    metricValue: number,
    category: string,
    metricUnit?: string,
    metadata: any = {}
  ): Promise<void> {
    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 1);

      await db.insert(marketplaceHealthMetrics).values({
        metricName,
        metricValue: metricValue.toString(),
        metricUnit,
        category,
        periodStart,
        periodEnd,
        metadata: JSON.stringify(metadata),
        createdAt: now
      });
    } catch (error) {
      safeLogger.error('Error recording health metric:', error);
      throw error;
    }
  }
}

export const marketplaceHealthService = new MarketplaceHealthService();
