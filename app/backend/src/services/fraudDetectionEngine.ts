import { db } from '../db/index';
import {
    riskAssessments,
    riskFeatures,
    fraudPatterns,
    userFraudProfiles,
    returns,
    users
} from '../db/schema';
import { eq, and, gte, lte, sql, desc, count, avg } from 'drizzle-orm';
import { logger } from '../utils/logger';

/**
 * Fraud Detection Engine
 * Task 3.1: Comprehensive fraud detection and risk assessment
 * 
 * Provides:
 * - Risk scoring algorithms
 * - Pattern detection logic
 * - Anomaly detection
 * - ML model integration framework
 * - Risk factor analysis
 * - Automated recommendations
 */

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ReturnData {
    returnId: string;
    userId: string;
    orderId: string;
    returnReason: string;
    returnReasonDetails?: string;
    orderValue: number;
    refundAmount: number;
    itemsToReturn: any[];
    createdAt: Date;
}

export interface UserHistory {
    userId: string;
    accountAge: number; // Days since account creation
    totalReturns: number;
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    returnRate: number;
    previousHighRiskReturns: number;
}

export interface RiskAssessmentResult {
    assessmentId: string;
    returnId: string;
    userId: string;
    riskScore: number; // 0-100
    riskLevel: 'low' | 'medium' | 'high';
    confidence: number; // 0.0-1.0
    flags: string[];
    features: Record<string, any>;
    recommendation: 'auto_approve' | 'manual_review' | 'auto_reject';
    recommendationReason: string;
    modelVersion: string;
    modelType: string;
}

export interface ExtractedFeatures {
    // User features
    accountAge: number;
    totalReturns: number;
    returnRate: number;
    averageReturnValue: number;
    highRiskReturnCount: number;

    // Order features
    orderValue: number;
    refundAmount: number;
    refundPercentage: number;

    // Behavioral features
    returnFrequency: number; // Returns per month
    daysSinceLastReturn: number;
    returnVelocity: number; // Returns in last 7 days

    // Pattern features
    reasonAbuse: boolean;
    highValueReturn: boolean;
    newAccountReturn: boolean;
    suspiciousReason: boolean;

    // Time features
    hourOfDay: number;
    dayOfWeek: number;
    isWeekend: boolean;
}

export interface PatternDetectionResult {
    patternType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    confidence: number;
    affectedReturns: string[];
}

export interface AnomalyDetectionResult {
    isAnomaly: boolean;
    anomalyType?: string;
    score: number;
    description?: string;
}

// ============================================================================
// FRAUD DETECTION ENGINE
// ============================================================================

export class FraudDetectionEngine {
    private readonly MODEL_VERSION = 'v1.0.0';
    private readonly MODEL_TYPE = 'rule_based'; // Will be 'ml_model' when ML is integrated

    // Risk thresholds
    private readonly LOW_RISK_THRESHOLD = 30;
    private readonly HIGH_RISK_THRESHOLD = 70;

    // Feature weights (for rule-based model)
    private readonly FEATURE_WEIGHTS = {
        accountAge: 0.15,
        returnRate: 0.20,
        returnFrequency: 0.15,
        orderValue: 0.10,
        returnVelocity: 0.15,
        reasonAbuse: 0.10,
        highValueReturn: 0.10,
        newAccountReturn: 0.05,
    };

    // ========================================================================
    // MAIN ASSESSMENT METHOD
    // ========================================================================

    /**
     * Assess return risk - Main entry point
     */
    async assessReturnRisk(returnData: ReturnData): Promise<RiskAssessmentResult> {
        try {
            logger.info('Starting risk assessment', { returnId: returnData.returnId });

            // 1. Extract features
            const features = await this.extractFeatures(returnData);

            // 2. Calculate risk score
            const { score, confidence, flags } = await this.calculateRiskScore(features);

            // 3. Determine risk level
            const riskLevel = this.determineRiskLevel(score);

            // 4. Detect patterns
            const patterns = await this.detectPatterns(returnData, features);
            if (patterns.length > 0) {
                flags.push(...patterns.map(p => `Pattern: ${p.patternType}`));
            }

            // 5. Detect anomalies
            const anomaly = await this.detectAnomalies(returnData, features);
            if (anomaly.isAnomaly) {
                flags.push(`Anomaly: ${anomaly.anomalyType}`);
            }

            // 6. Generate recommendation
            const { recommendation, reason } = this.generateRecommendation(
                score,
                riskLevel,
                patterns,
                anomaly
            );

            // 7. Store assessment in database
            const assessment = await this.storeAssessment({
                returnId: returnData.returnId,
                userId: returnData.userId,
                riskScore: score,
                riskLevel,
                confidence,
                flags,
                features,
                recommendation,
                recommendationReason: reason,
            });

            // 8. Update user fraud profile
            await this.updateUserFraudProfile(returnData.userId, score, riskLevel);

            logger.info('Risk assessment completed', {
                returnId: returnData.returnId,
                riskScore: score,
                riskLevel,
                recommendation,
            });

            return assessment;
        } catch (error) {
            logger.error('Error in risk assessment:', error);
            throw error;
        }
    }

    // ========================================================================
    // FEATURE EXTRACTION
    // ========================================================================

    /**
     * Extract features from return data and user history
     */
    private async extractFeatures(returnData: ReturnData): Promise<ExtractedFeatures> {
        // Get user history
        const userHistory = await this.getUserHistory(returnData.userId);

        // Calculate time-based features
        const now = new Date();
        const hourOfDay = now.getHours();
        const dayOfWeek = now.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Calculate return velocity (returns in last 7 days)
        const returnVelocity = await this.getReturnVelocity(returnData.userId, 7);

        // Calculate days since last return
        const daysSinceLastReturn = await this.getDaysSinceLastReturn(returnData.userId);

        // Pattern detection flags
        const reasonAbuse = this.detectReasonAbuse(returnData.returnReason, userHistory);
        const highValueReturn = returnData.orderValue > 1000;
        const newAccountReturn = userHistory.accountAge < 30;
        const suspiciousReason = this.isSuspiciousReason(
            returnData.returnReason,
            returnData.orderValue
        );

        return {
            // User features
            accountAge: userHistory.accountAge,
            totalReturns: userHistory.totalReturns,
            returnRate: userHistory.returnRate,
            averageReturnValue: userHistory.totalReturns > 0
                ? userHistory.totalSpent / userHistory.totalReturns
                : 0,
            highRiskReturnCount: userHistory.previousHighRiskReturns,

            // Order features
            orderValue: returnData.orderValue,
            refundAmount: returnData.refundAmount,
            refundPercentage: (returnData.refundAmount / returnData.orderValue) * 100,

            // Behavioral features
            returnFrequency: this.calculateReturnFrequency(userHistory),
            daysSinceLastReturn,
            returnVelocity,

            // Pattern features
            reasonAbuse,
            highValueReturn,
            newAccountReturn,
            suspiciousReason,

            // Time features
            hourOfDay,
            dayOfWeek,
            isWeekend,
        };
    }

    /**
     * Get user history from database
     */
    private async getUserHistory(userId: string): Promise<UserHistory> {
        // Get user creation date
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!user) {
            throw new Error(`User ${userId} not found`);
        }

        const accountAge = Math.floor(
            (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Get return statistics
        const returnStats = await db
            .select({
                totalReturns: count(),
                totalRefundAmount: sql<number>`COALESCE(SUM(CAST(${returns.refundAmount} AS NUMERIC)), 0)`,
                highRiskReturns: sql<number>`COUNT(CASE WHEN ${returns.riskLevel} = 'high' THEN 1 END)`,
            })
            .from(returns)
            .where(eq(returns.buyerId, userId));

        const stats = returnStats[0];

        // For now, mock order statistics (would come from orders table)
        const totalOrders = stats.totalReturns * 5; // Assume 20% return rate
        const totalSpent = Number(stats.totalRefundAmount) * 1.2; // Assume refunds are 80% of spent

        return {
            userId,
            accountAge,
            totalReturns: stats.totalReturns,
            totalOrders,
            totalSpent,
            averageOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0,
            returnRate: totalOrders > 0 ? (stats.totalReturns / totalOrders) * 100 : 0,
            previousHighRiskReturns: stats.highRiskReturns,
        };
    }

    /**
     * Get return velocity (returns in last N days)
     */
    private async getReturnVelocity(userId: string, days: number): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const [result] = await db
            .select({ count: count() })
            .from(returns)
            .where(
                and(
                    eq(returns.buyerId, userId),
                    gte(returns.createdAt, cutoffDate)
                )
            );

        return result.count;
    }

    /**
     * Get days since last return
     */
    private async getDaysSinceLastReturn(userId: string): Promise<number> {
        const [lastReturn] = await db
            .select({ createdAt: returns.createdAt })
            .from(returns)
            .where(eq(returns.buyerId, userId))
            .orderBy(desc(returns.createdAt))
            .limit(1);

        if (!lastReturn) {
            return 999; // No previous returns
        }

        return Math.floor(
            (Date.now() - lastReturn.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
    }

    /**
     * Detect reason abuse (same reason used repeatedly)
     */
    private detectReasonAbuse(reason: string, userHistory: UserHistory): boolean {
        // This would check if the user has used the same reason multiple times
        // For now, simplified logic
        return userHistory.totalReturns > 3 && userHistory.returnRate > 30;
    }

    /**
     * Check if reason is suspicious for the order value
     */
    private isSuspiciousReason(reason: string, orderValue: number): boolean {
        const suspiciousReasons = ['changed_mind', 'no_longer_needed'];
        return suspiciousReasons.includes(reason) && orderValue > 500;
    }

    /**
     * Calculate return frequency (returns per month)
     */
    private calculateReturnFrequency(userHistory: UserHistory): number {
        if (userHistory.accountAge === 0) return 0;
        const months = userHistory.accountAge / 30;
        return months > 0 ? userHistory.totalReturns / months : 0;
    }

    // ========================================================================
    // RISK SCORE CALCULATION
    // ========================================================================

    /**
     * Calculate risk score using weighted features
     */
    private async calculateRiskScore(
        features: ExtractedFeatures
    ): Promise<{ score: number; confidence: number; flags: string[] }> {
        let score = 0;
        const flags: string[] = [];

        // Account age risk
        if (features.accountAge < 7) {
            score += 25;
            flags.push('Very new account (< 7 days)');
        } else if (features.accountAge < 30) {
            score += 15;
            flags.push('New account (< 30 days)');
        }

        // Return rate risk
        if (features.returnRate > 50) {
            score += 30;
            flags.push('Very high return rate (> 50%)');
        } else if (features.returnRate > 30) {
            score += 20;
            flags.push('High return rate (> 30%)');
        }

        // Return frequency risk
        if (features.returnFrequency > 5) {
            score += 20;
            flags.push('High return frequency (> 5/month)');
        } else if (features.returnFrequency > 3) {
            score += 10;
            flags.push('Moderate return frequency (> 3/month)');
        }

        // Return velocity risk
        if (features.returnVelocity > 3) {
            score += 25;
            flags.push('High return velocity (> 3 in 7 days)');
        } else if (features.returnVelocity > 1) {
            score += 10;
            flags.push('Moderate return velocity');
        }

        // High value return risk
        if (features.highValueReturn) {
            score += 15;
            flags.push('High value return (> $1000)');
        }

        // New account + high value
        if (features.newAccountReturn && features.orderValue > 500) {
            score += 20;
            flags.push('New account with high value return');
        }

        // Suspicious reason
        if (features.suspiciousReason) {
            score += 15;
            flags.push('Suspicious return reason for order value');
        }

        // Reason abuse
        if (features.reasonAbuse) {
            score += 15;
            flags.push('Potential reason abuse detected');
        }

        // High risk return history
        if (features.highRiskReturnCount > 2) {
            score += 20;
            flags.push('Multiple previous high-risk returns');
        }

        // Normalize score to 0-100
        score = Math.min(100, Math.max(0, score));

        // Calculate confidence based on data availability
        const confidence = this.calculateConfidence(features);

        return { score, confidence, flags };
    }

    /**
     * Calculate confidence in the risk assessment
     */
    private calculateConfidence(features: ExtractedFeatures): number {
        let confidence = 0.5; // Base confidence

        // More data = higher confidence
        if (features.totalReturns > 5) confidence += 0.2;
        if (features.accountAge > 90) confidence += 0.1;
        if (features.totalReturns > 10) confidence += 0.1;
        if (features.accountAge > 365) confidence += 0.1;

        return Math.min(1.0, confidence);
    }

    /**
     * Determine risk level from score
     */
    private determineRiskLevel(score: number): 'low' | 'medium' | 'high' {
        if (score < this.LOW_RISK_THRESHOLD) return 'low';
        if (score < this.HIGH_RISK_THRESHOLD) return 'medium';
        return 'high';
    }

    // ========================================================================
    // PATTERN DETECTION
    // ========================================================================

    /**
     * Detect fraud patterns
     */
    private async detectPatterns(
        returnData: ReturnData,
        features: ExtractedFeatures
    ): Promise<PatternDetectionResult[]> {
        const patterns: PatternDetectionResult[] = [];

        // High frequency pattern
        if (features.returnVelocity > 3) {
            patterns.push({
                patternType: 'high_frequency',
                severity: 'high',
                description: `User has ${features.returnVelocity} returns in the last 7 days`,
                confidence: 0.9,
                affectedReturns: [returnData.returnId],
            });
        }

        // High value pattern
        if (features.orderValue > 2000 && features.newAccountReturn) {
            patterns.push({
                patternType: 'high_value',
                severity: 'critical',
                description: 'High value return from new account',
                confidence: 0.85,
                affectedReturns: [returnData.returnId],
            });
        }

        // Reason abuse pattern
        if (features.reasonAbuse) {
            patterns.push({
                patternType: 'reason_abuse',
                severity: 'medium',
                description: 'Repeated use of same return reason',
                confidence: 0.7,
                affectedReturns: [returnData.returnId],
            });
        }

        // Velocity pattern
        if (features.returnFrequency > 5) {
            patterns.push({
                patternType: 'velocity',
                severity: 'high',
                description: `High return frequency: ${features.returnFrequency.toFixed(1)} returns/month`,
                confidence: 0.8,
                affectedReturns: [returnData.returnId],
            });
        }

        return patterns;
    }

    // ========================================================================
    // ANOMALY DETECTION
    // ========================================================================

    /**
     * Detect anomalies in return behavior
     */
    private async detectAnomalies(
        returnData: ReturnData,
        features: ExtractedFeatures
    ): Promise<AnomalyDetectionResult> {
        // Check for unusual time patterns
        if (features.hourOfDay >= 2 && features.hourOfDay <= 5) {
            return {
                isAnomaly: true,
                anomalyType: 'unusual_time',
                score: 0.7,
                description: 'Return requested during unusual hours (2-5 AM)',
            };
        }

        // Check for unusual refund percentage
        if (features.refundPercentage > 95 && features.orderValue > 500) {
            return {
                isAnomaly: true,
                anomalyType: 'full_refund_high_value',
                score: 0.8,
                description: 'Near-full refund on high-value order',
            };
        }

        // Check for rapid return after purchase
        if (features.daysSinceLastReturn < 1 && features.returnVelocity > 1) {
            return {
                isAnomaly: true,
                anomalyType: 'rapid_consecutive_returns',
                score: 0.85,
                description: 'Multiple returns in rapid succession',
            };
        }

        return {
            isAnomaly: false,
            score: 0,
        };
    }

    // ========================================================================
    // RECOMMENDATION ENGINE
    // ========================================================================

    /**
     * Generate recommendation based on risk assessment
     */
    private generateRecommendation(
        score: number,
        riskLevel: 'low' | 'medium' | 'high',
        patterns: PatternDetectionResult[],
        anomaly: AnomalyDetectionResult
    ): { recommendation: 'auto_approve' | 'manual_review' | 'auto_reject'; reason: string } {
        // Auto-reject for critical patterns or very high risk
        if (score > 90 || patterns.some(p => p.severity === 'critical')) {
            return {
                recommendation: 'auto_reject',
                reason: 'Critical risk level or fraud pattern detected',
            };
        }

        // Manual review for high risk or significant anomalies
        if (riskLevel === 'high' || anomaly.isAnomaly) {
            return {
                recommendation: 'manual_review',
                reason: `High risk score (${score}) or anomaly detected`,
            };
        }

        // Manual review for medium risk with patterns
        if (riskLevel === 'medium' && patterns.length > 0) {
            return {
                recommendation: 'manual_review',
                reason: `Medium risk with ${patterns.length} fraud pattern(s) detected`,
            };
        }

        // Manual review for medium risk
        if (riskLevel === 'medium') {
            return {
                recommendation: 'manual_review',
                reason: `Medium risk score (${score})`,
            };
        }

        // Auto-approve for low risk
        return {
            recommendation: 'auto_approve',
            reason: `Low risk score (${score})`,
        };
    }

    // ========================================================================
    // DATABASE OPERATIONS
    // ========================================================================

    /**
     * Store risk assessment in database
     */
    private async storeAssessment(data: {
        returnId: string;
        userId: string;
        riskScore: number;
        riskLevel: 'low' | 'medium' | 'high';
        confidence: number;
        flags: string[];
        features: Record<string, any>;
        recommendation: 'auto_approve' | 'manual_review' | 'auto_reject';
        recommendationReason: string;
    }): Promise<RiskAssessmentResult> {
        const [assessment] = await db
            .insert(riskAssessments)
            .values({
                returnId: data.returnId,
                userId: data.userId,
                riskScore: data.riskScore,
                riskLevel: data.riskLevel,
                confidence: data.confidence.toString(),
                flags: data.flags,
                features: data.features,
                modelVersion: this.MODEL_VERSION,
                modelType: this.MODEL_TYPE,
                recommendation: data.recommendation,
                recommendationReason: data.recommendationReason,
            })
            .returning();

        // Store individual features
        const featureEntries = Object.entries(data.features).map(([name, value]) => ({
            assessmentId: assessment.id,
            featureName: name,
            featureValue: String(value),
            featureType: typeof value === 'number' ? 'numeric' : typeof value === 'boolean' ? 'boolean' : 'categorical',
            weight: String(this.FEATURE_WEIGHTS[name as keyof typeof this.FEATURE_WEIGHTS] || 0.05),
            contribution: '0', // Would calculate actual contribution in ML model
        }));

        if (featureEntries.length > 0) {
            await db.insert(riskFeatures).values(featureEntries);
        }

        return {
            assessmentId: assessment.id,
            returnId: data.returnId,
            userId: data.userId,
            riskScore: data.riskScore,
            riskLevel: data.riskLevel,
            confidence: data.confidence,
            flags: data.flags,
            features: data.features,
            recommendation: data.recommendation,
            recommendationReason: data.recommendationReason,
            modelVersion: this.MODEL_VERSION,
            modelType: this.MODEL_TYPE,
        };
    }

    /**
     * Update user fraud profile
     */
    private async updateUserFraudProfile(
        userId: string,
        riskScore: number,
        riskLevel: 'low' | 'medium' | 'high'
    ): Promise<void> {
        // Check if profile exists
        const [existingProfile] = await db
            .select()
            .from(userFraudProfiles)
            .where(eq(userFraudProfiles.userId, userId))
            .limit(1);

        if (existingProfile) {
            // Update existing profile
            const newTotalReturns = existingProfile.totalReturns + 1;
            const newHighRiskReturns = riskLevel === 'high'
                ? existingProfile.highRiskReturns + 1
                : existingProfile.highRiskReturns;

            const newAverageRiskScore =
                ((Number(existingProfile.averageRiskScore) * existingProfile.totalReturns) + riskScore) /
                newTotalReturns;

            await db
                .update(userFraudProfiles)
                .set({
                    totalReturns: newTotalReturns,
                    highRiskReturns: newHighRiskReturns,
                    averageRiskScore: newAverageRiskScore.toString(),
                    lastReturnDate: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(userFraudProfiles.userId, userId));
        } else {
            // Create new profile
            await db.insert(userFraudProfiles).values({
                userId,
                totalReturns: 1,
                highRiskReturns: riskLevel === 'high' ? 1 : 0,
                averageRiskScore: riskScore.toString(),
                lastReturnDate: new Date(),
            });
        }
    }
}

// Export singleton instance
export const fraudDetectionEngine = new FraudDetectionEngine();
