import { eq, desc, and, sql, gte, lte } from 'drizzle-orm';
import { safeLogger } from '../../utils/safeLogger';
import { db } from '../db';
import { 
  sellerRiskAssessments, 
  sellers,
  orders,
  disputes,
  marketplaceListings,
  reviews,
  userReputation
} from '../../db/schema';

export interface SellerRiskProfile {
  id: number;
  sellerWalletAddress: string;
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskDimensions: {
    financialRisk: number;
    operationalRisk: number;
    reputationRisk: number;
    complianceRisk: number;
  };
  riskFactors: RiskFactor[];
  mitigationRecommendations: string[];
  lastAssessedAt: Date;
}

export interface RiskFactor {
  category: string;
  factor: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: number;
  description: string;
}

export interface RiskMetrics {
  disputeRate: number;
  averageOrderValue: number;
  orderVolatility: number;
  customerComplaintRate: number;
  refundRate: number;
  accountAge: number; // in days
  verificationLevel: number; // 0-100
  reputationScore: number;
  responseTimeVariability: number;
}

class SellerRiskAssessmentService {

  // Main risk assessment function
  async assessSellerRisk(sellerWalletAddress: string): Promise<SellerRiskProfile> {
    try {
      // Get risk metrics
      const metrics = await this.getRiskMetrics(sellerWalletAddress);
      
      // Calculate risk dimensions
      const riskDimensions = {
        financialRisk: this.calculateFinancialRisk(metrics),
        operationalRisk: this.calculateOperationalRisk(metrics),
        reputationRisk: this.calculateReputationRisk(metrics),
        complianceRisk: this.calculateComplianceRisk(metrics)
      };

      // Calculate overall risk score (weighted average)
      const overallRiskScore = this.calculateOverallRiskScore(riskDimensions);
      
      // Determine risk level
      const riskLevel = this.determineRiskLevel(overallRiskScore);
      
      // Identify risk factors
      const riskFactors = this.identifyRiskFactors(metrics, riskDimensions);
      
      // Generate mitigation recommendations
      const mitigationRecommendations = this.generateMitigationRecommendations(riskFactors, riskDimensions);

      // Save assessment
      const assessment = await this.saveRiskAssessment(sellerWalletAddress, {
        overallRiskScore,
        riskDimensions,
        riskLevel,
        riskFactors,
        mitigationRecommendations
      });

      return {
        id: assessment.id,
        sellerWalletAddress,
        overallRiskScore,
        riskLevel,
        riskDimensions,
        riskFactors,
        mitigationRecommendations,
        lastAssessedAt: assessment.lastAssessedAt || new Date()
      };
    } catch (error) {
      safeLogger.error('Error assessing seller risk:', error);
      throw new Error('Failed to assess seller risk');
    }
  }

  // Get existing risk assessment or create new one
  async getSellerRiskAssessment(sellerWalletAddress: string): Promise<SellerRiskProfile | null> {
    try {
      // Check if assessment exists and is recent (within 7 days)
      const existingAssessment = await db
        .select()
        .from(sellerRiskAssessments)
        .where(eq(sellerRiskAssessments.sellerWalletAddress, sellerWalletAddress))
        .limit(1);

      if (existingAssessment.length > 0) {
        const assessment = existingAssessment[0];
        const lastAssessed = new Date(assessment.lastAssessedAt || 0);
        const now = new Date();
        const daysDiff = (now.getTime() - lastAssessed.getTime()) / (1000 * 60 * 60 * 24);

        // If assessment is less than 7 days old, return it
        if (daysDiff < 7) {
          return {
            id: assessment.id,
            sellerWalletAddress,
            overallRiskScore: Number(assessment.overallRiskScore),
            riskLevel: assessment.riskLevel as 'low' | 'medium' | 'high' | 'critical',
            riskDimensions: {
              financialRisk: Number(assessment.financialRisk),
              operationalRisk: Number(assessment.operationalRisk),
              reputationRisk: Number(assessment.reputationRisk),
              complianceRisk: Number(assessment.complianceRisk)
            },
            riskFactors: assessment.riskFactors ? JSON.parse(assessment.riskFactors as string) : [],
            mitigationRecommendations: assessment.mitigationRecommendations ? JSON.parse(assessment.mitigationRecommendations as string) : [],
            lastAssessedAt: lastAssessed
          };
        }
      }

      // Calculate new assessment
      return await this.assessSellerRisk(sellerWalletAddress);
    } catch (error) {
      safeLogger.error('Error getting seller risk assessment:', error);
      return null;
    }
  }

  // Get risk metrics from database
  private async getRiskMetrics(sellerWalletAddress: string): Promise<RiskMetrics> {
    try {
      // Get seller account age
      const sellerData = await db
        .select()
        .from(sellers)
        .where(eq(sellers.walletAddress, sellerWalletAddress))
        .limit(1);

      const accountAge = sellerData.length > 0 
        ? Math.floor((Date.now() - new Date(sellerData[0].createdAt || 0).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Get order statistics
      const orderStats = await db
        .select({
          totalOrders: sql<number>`count(*)`,
          completedOrders: sql<number>`count(*) filter (where orders.status = 'completed')`,
          disputedOrders: sql<number>`count(*) filter (where orders.status = 'disputed')`,
          averageOrderValue: sql<number>`coalesce(avg(orders.total_amount::numeric), 0)`,
          totalRevenue: sql<number>`coalesce(sum(orders.total_amount::numeric) filter (where orders.status = 'completed'), 0)`
        })
        .from(orders)
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .where(eq(marketplaceListings.sellerAddress, sellerWalletAddress));

      // Get reputation score
      const reputationData = await db
        .select()
        .from(userReputation)
        .where(eq(userReputation.walletAddress, sellerWalletAddress))
        .limit(1);

      // Get review statistics
      const reviewStats = await db
        .select({
          averageRating: sql<number>`coalesce(avg(rating), 0)`,
          totalReviews: sql<number>`count(*)`,
          negativeReviews: sql<number>`count(*) filter (where rating <= 2)`
        })
        .from(reviews)
        .where(eq(reviews.revieweeId, sellerWalletAddress));

      const orderData = orderStats[0] || { 
        totalOrders: 0, 
        completedOrders: 0, 
        disputedOrders: 0, 
        averageOrderValue: 0, 
        totalRevenue: 0 
      };
      const reputationScore = reputationData.length > 0 ? Number(reputationData[0].reputationScore) : 0;
      const reviewData = reviewStats[0] || { averageRating: 0, totalReviews: 0, negativeReviews: 0 };

      // Calculate derived metrics
      const disputeRate = orderData.totalOrders > 0 ? orderData.disputedOrders / orderData.totalOrders : 0;
      const customerComplaintRate = reviewData.totalReviews > 0 ? reviewData.negativeReviews / reviewData.totalReviews : 0;
      
      // Calculate order volatility (coefficient of variation)
      const orderVolatility = await this.calculateOrderVolatility(sellerWalletAddress);
      
      // Calculate verification level based on seller profile completeness
      const verificationLevel = await this.calculateVerificationLevel(sellerWalletAddress);

      return {
        disputeRate,
        averageOrderValue: Number(orderData.averageOrderValue),
        orderVolatility,
        customerComplaintRate,
        refundRate: disputeRate * 0.7, // Estimate: 70% of disputes result in refunds
        accountAge,
        verificationLevel,
        reputationScore,
        responseTimeVariability: 0.3 // Mock data - would need message response tracking
      };
    } catch (error) {
      safeLogger.error('Error getting risk metrics:', error);
      return {
        disputeRate: 0,
        averageOrderValue: 0,
        orderVolatility: 0,
        customerComplaintRate: 0,
        refundRate: 0,
        accountAge: 0,
        verificationLevel: 0,
        reputationScore: 0,
        responseTimeVariability: 0
      };
    }
  }

  // Calculate financial risk (0-100, higher is riskier)
  private calculateFinancialRisk(metrics: RiskMetrics): number {
    let riskScore = 0;

    // High average order value increases risk
    if (metrics.averageOrderValue > 1000) riskScore += 30;
    else if (metrics.averageOrderValue > 500) riskScore += 20;
    else if (metrics.averageOrderValue > 100) riskScore += 10;

    // High order volatility increases risk
    if (metrics.orderVolatility > 0.8) riskScore += 25;
    else if (metrics.orderVolatility > 0.5) riskScore += 15;
    else if (metrics.orderVolatility > 0.3) riskScore += 10;

    // High refund rate increases risk
    if (metrics.refundRate > 0.1) riskScore += 25;
    else if (metrics.refundRate > 0.05) riskScore += 15;
    else if (metrics.refundRate > 0.02) riskScore += 10;

    // New accounts are riskier
    if (metrics.accountAge < 30) riskScore += 20;
    else if (metrics.accountAge < 90) riskScore += 10;

    return Math.min(100, riskScore);
  }

  // Calculate operational risk (0-100, higher is riskier)
  private calculateOperationalRisk(metrics: RiskMetrics): number {
    let riskScore = 0;

    // High dispute rate increases risk
    if (metrics.disputeRate > 0.1) riskScore += 40;
    else if (metrics.disputeRate > 0.05) riskScore += 25;
    else if (metrics.disputeRate > 0.02) riskScore += 15;

    // High response time variability increases risk
    if (metrics.responseTimeVariability > 0.5) riskScore += 20;
    else if (metrics.responseTimeVariability > 0.3) riskScore += 10;

    // Low verification level increases risk
    if (metrics.verificationLevel < 30) riskScore += 25;
    else if (metrics.verificationLevel < 60) riskScore += 15;
    else if (metrics.verificationLevel < 80) riskScore += 10;

    return Math.min(100, riskScore);
  }

  // Calculate reputation risk (0-100, higher is riskier)
  private calculateReputationRisk(metrics: RiskMetrics): number {
    let riskScore = 0;

    // Low reputation score increases risk
    if (metrics.reputationScore < 20) riskScore += 40;
    else if (metrics.reputationScore < 50) riskScore += 25;
    else if (metrics.reputationScore < 80) riskScore += 15;

    // High customer complaint rate increases risk
    if (metrics.customerComplaintRate > 0.2) riskScore += 30;
    else if (metrics.customerComplaintRate > 0.1) riskScore += 20;
    else if (metrics.customerComplaintRate > 0.05) riskScore += 10;

    // New accounts with no reputation history are riskier
    if (metrics.accountAge < 30 && metrics.reputationScore === 0) riskScore += 30;

    return Math.min(100, riskScore);
  }

  // Calculate compliance risk (0-100, higher is riskier)
  private calculateComplianceRisk(metrics: RiskMetrics): number {
    let riskScore = 0;

    // Low verification level increases compliance risk
    if (metrics.verificationLevel < 50) riskScore += 30;
    else if (metrics.verificationLevel < 80) riskScore += 15;

    // High dispute rate may indicate policy violations
    if (metrics.disputeRate > 0.05) riskScore += 20;

    // New accounts need more compliance monitoring
    if (metrics.accountAge < 60) riskScore += 15;

    // High-value transactions need more compliance oversight
    if (metrics.averageOrderValue > 500) riskScore += 10;

    return Math.min(100, riskScore);
  }

  // Calculate overall risk score (weighted average)
  private calculateOverallRiskScore(riskDimensions: SellerRiskProfile['riskDimensions']): number {
    const weights = {
      financialRisk: 0.30,
      operationalRisk: 0.30,
      reputationRisk: 0.25,
      complianceRisk: 0.15
    };

    const weightedSum = 
      riskDimensions.financialRisk * weights.financialRisk +
      riskDimensions.operationalRisk * weights.operationalRisk +
      riskDimensions.reputationRisk * weights.reputationRisk +
      riskDimensions.complianceRisk * weights.complianceRisk;

    return Math.round(weightedSum);
  }

  // Determine risk level based on overall score
  private determineRiskLevel(overallRiskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (overallRiskScore >= 80) return 'critical';
    if (overallRiskScore >= 60) return 'high';
    if (overallRiskScore >= 40) return 'medium';
    return 'low';
  }

  // Identify specific risk factors
  private identifyRiskFactors(metrics: RiskMetrics, riskDimensions: SellerRiskProfile['riskDimensions']): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Financial risk factors
    if (metrics.averageOrderValue > 1000) {
      factors.push({
        category: 'financial',
        factor: 'high_order_value',
        severity: 'high',
        impact: 30,
        description: 'High average order values increase financial exposure'
      });
    }

    if (metrics.orderVolatility > 0.5) {
      factors.push({
        category: 'financial',
        factor: 'order_volatility',
        severity: metrics.orderVolatility > 0.8 ? 'high' : 'medium',
        impact: 25,
        description: 'Inconsistent order patterns may indicate instability'
      });
    }

    // Operational risk factors
    if (metrics.disputeRate > 0.05) {
      factors.push({
        category: 'operational',
        factor: 'high_dispute_rate',
        severity: metrics.disputeRate > 0.1 ? 'critical' : 'high',
        impact: 40,
        description: 'High dispute rate indicates operational issues'
      });
    }

    if (metrics.verificationLevel < 60) {
      factors.push({
        category: 'operational',
        factor: 'low_verification',
        severity: metrics.verificationLevel < 30 ? 'high' : 'medium',
        impact: 25,
        description: 'Incomplete profile verification increases operational risk'
      });
    }

    // Reputation risk factors
    if (metrics.reputationScore < 50) {
      factors.push({
        category: 'reputation',
        factor: 'low_reputation',
        severity: metrics.reputationScore < 20 ? 'critical' : 'high',
        impact: 40,
        description: 'Low reputation score indicates past performance issues'
      });
    }

    if (metrics.customerComplaintRate > 0.1) {
      factors.push({
        category: 'reputation',
        factor: 'high_complaint_rate',
        severity: metrics.customerComplaintRate > 0.2 ? 'high' : 'medium',
        impact: 30,
        description: 'High customer complaint rate damages reputation'
      });
    }

    // Account age risk factors
    if (metrics.accountAge < 30) {
      factors.push({
        category: 'operational',
        factor: 'new_account',
        severity: 'medium',
        impact: 20,
        description: 'New accounts require additional monitoring'
      });
    }

    return factors;
  }

  // Generate mitigation recommendations
  private generateMitigationRecommendations(riskFactors: RiskFactor[], riskDimensions: SellerRiskProfile['riskDimensions']): string[] {
    const recommendations: string[] = [];

    // Financial risk mitigations
    if (riskDimensions.financialRisk > 60) {
      recommendations.push('Consider implementing additional payment verification for high-value orders');
      recommendations.push('Enable escrow services for orders above $500 to reduce financial risk');
    }

    // Operational risk mitigations
    if (riskDimensions.operationalRisk > 60) {
      recommendations.push('Complete profile verification to improve operational trust score');
      recommendations.push('Implement automated order tracking and customer communication');
    }

    // Reputation risk mitigations
    if (riskDimensions.reputationRisk > 60) {
      recommendations.push('Focus on improving customer service and product quality');
      recommendations.push('Proactively address customer concerns to prevent negative reviews');
    }

    // Compliance risk mitigations
    if (riskDimensions.complianceRisk > 60) {
      recommendations.push('Complete KYC verification to reduce compliance risk');
      recommendations.push('Review and ensure adherence to platform policies');
    }

    // Specific risk factor mitigations
    const highRiskFactors = riskFactors.filter(f => f.severity === 'high' || f.severity === 'critical');
    if (highRiskFactors.some(f => f.factor === 'high_dispute_rate')) {
      recommendations.push('Analyze dispute patterns and improve product descriptions and shipping processes');
    }

    if (highRiskFactors.some(f => f.factor === 'low_verification')) {
      recommendations.push('Complete email, phone, and identity verification to build trust');
    }

    return recommendations;
  }

  // Calculate order volatility (coefficient of variation)
  private async calculateOrderVolatility(sellerWalletAddress: string): Promise<number> {
    try {
      // Get last 12 weeks of order data
      const twelveWeeksAgo = new Date();
      twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

      const weeklyOrders = await db
        .select({
          week: sql<string>`date_trunc('week', orders.created_at)`,
          orderCount: sql<number>`count(*)`,
          totalValue: sql<number>`sum(orders.total_amount::numeric)`
        })
        .from(orders)
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .where(and(
          eq(marketplaceListings.sellerAddress, sellerWalletAddress),
          gte(orders.createdAt, twelveWeeksAgo)
        ))
        .groupBy(sql`date_trunc('week', orders.created_at)`)
        .orderBy(sql`date_trunc('week', orders.created_at)`);

      if (weeklyOrders.length < 2) return 0;

      // Calculate coefficient of variation for order values
      const values = weeklyOrders.map(w => Number(w.totalValue));
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      return mean > 0 ? stdDev / mean : 0;
    } catch (error) {
      safeLogger.error('Error calculating order volatility:', error);
      return 0;
    }
  }

  // Calculate verification level based on profile completeness
  private async calculateVerificationLevel(sellerWalletAddress: string): Promise<number> {
    try {
      const seller = await db
        .select()
        .from(sellers)
        .where(eq(sellers.walletAddress, sellerWalletAddress))
        .limit(1);

      if (seller.length === 0) return 0;

      const profile = seller[0];
      let score = 0;

      // Basic profile completion (40 points)
      if (profile.storeName) score += 20;
      if (profile.bio) score += 10;
      if (profile.profileImageCdn) score += 10;

      // Contact verification (30 points)
      // Note: These fields don't exist in current schema, using mock logic
      score += 15; // Email verification (mock)
      score += 15; // Phone verification (mock)

      // Enhanced verification (30 points)
      if (profile.ensHandle && profile.ensVerified) score += 15;
      if (profile.websiteUrl) score += 5;
      if (profile.twitterHandle || profile.discordHandle) score += 5;
      score += 5; // KYC verification (mock)

      return Math.min(100, score);
    } catch (error) {
      safeLogger.error('Error calculating verification level:', error);
      return 0;
    }
  }

  // Save risk assessment to database
  private async saveRiskAssessment(sellerWalletAddress: string, assessmentData: {
    overallRiskScore: number;
    riskDimensions: SellerRiskProfile['riskDimensions'];
    riskLevel: string;
    riskFactors: RiskFactor[];
    mitigationRecommendations: string[];
  }) {
    try {
      // Check if assessment exists
      const existing = await db
        .select()
        .from(sellerRiskAssessments)
        .where(eq(sellerRiskAssessments.sellerWalletAddress, sellerWalletAddress))
        .limit(1);

      const now = new Date();

      if (existing.length > 0) {
        // Update existing assessment
        const updated = await db
          .update(sellerRiskAssessments)
          .set({
            overallRiskScore: assessmentData.overallRiskScore.toString(),
            financialRisk: assessmentData.riskDimensions.financialRisk.toString(),
            operationalRisk: assessmentData.riskDimensions.operationalRisk.toString(),
            reputationRisk: assessmentData.riskDimensions.reputationRisk.toString(),
            complianceRisk: assessmentData.riskDimensions.complianceRisk.toString(),
            riskFactors: JSON.stringify(assessmentData.riskFactors),
            riskLevel: assessmentData.riskLevel,
            mitigationRecommendations: JSON.stringify(assessmentData.mitigationRecommendations),
            lastAssessedAt: now,
            updatedAt: now
          })
          .where(eq(sellerRiskAssessments.sellerWalletAddress, sellerWalletAddress))
          .returning();

        return updated[0];
      } else {
        // Create new assessment
        const created = await db
          .insert(sellerRiskAssessments)
          .values({
            sellerWalletAddress,
            overallRiskScore: assessmentData.overallRiskScore.toString(),
            financialRisk: assessmentData.riskDimensions.financialRisk.toString(),
            operationalRisk: assessmentData.riskDimensions.operationalRisk.toString(),
            reputationRisk: assessmentData.riskDimensions.reputationRisk.toString(),
            complianceRisk: assessmentData.riskDimensions.complianceRisk.toString(),
            riskFactors: JSON.stringify(assessmentData.riskFactors),
            riskLevel: assessmentData.riskLevel,
            mitigationRecommendations: JSON.stringify(assessmentData.mitigationRecommendations),
            lastAssessedAt: now,
            createdAt: now,
            updatedAt: now
          })
          .returning();

        return created[0];
      }
    } catch (error) {
      safeLogger.error('Error saving risk assessment:', error);
      throw error;
    }
  }

  // Get risk trend analysis
  async getRiskTrendAnalysis(sellerWalletAddress: string): Promise<{
    currentRisk: number;
    previousRisk: number;
    trend: 'improving' | 'stable' | 'deteriorating';
    changePercent: number;
  }> {
    try {
      const assessments = await db
        .select()
        .from(sellerRiskAssessments)
        .where(eq(sellerRiskAssessments.sellerWalletAddress, sellerWalletAddress))
        .orderBy(desc(sellerRiskAssessments.lastAssessedAt))
        .limit(2);

      if (assessments.length < 2) {
        return {
          currentRisk: assessments.length > 0 ? Number(assessments[0].overallRiskScore) : 0,
          previousRisk: 0,
          trend: 'stable',
          changePercent: 0
        };
      }

      const currentRisk = Number(assessments[0].overallRiskScore);
      const previousRisk = Number(assessments[1].overallRiskScore);
      const changePercent = previousRisk !== 0 ? ((currentRisk - previousRisk) / previousRisk) * 100 : 0;

      let trend: 'improving' | 'stable' | 'deteriorating' = 'stable';
      if (Math.abs(changePercent) > 10) {
        trend = changePercent < 0 ? 'improving' : 'deteriorating'; // Lower risk score is better
      }

      return {
        currentRisk,
        previousRisk,
        trend,
        changePercent: Math.round(changePercent * 100) / 100
      };
    } catch (error) {
      safeLogger.error('Error getting risk trend analysis:', error);
      return {
        currentRisk: 0,
        previousRisk: 0,
        trend: 'stable',
        changePercent: 0
      };
    }
  }
}

export const sellerRiskAssessmentService = new SellerRiskAssessmentService();
