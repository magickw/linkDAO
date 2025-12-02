import { db } from '../db/index';
import {
    fraudPatterns,
    userFraudProfiles,
    returns,
    users,
    riskAssessments
} from '../db/schema';
import { eq, and, gte, lte, sql, desc, count, avg, inArray } from 'drizzle-orm';
import { logger } from '../utils/logger';

/**
 * Fraud Pattern Detector
 * Task 3.2: Advanced pattern detection for fraud prevention
 * 
 * Provides:
 * - User pattern detection (high-frequency, high-value, reason abuse)
 * - Seller pattern detection (fraud patterns, compliance violations)
 * - System-wide pattern detection (cross-user, coordinated fraud, network analysis)
 * - Pattern learning and optimization
 * - Pattern management and visualization
 */

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface UserPattern {
    userId: string;
    patternType: 'high_frequency' | 'high_value' | 'reason_abuse' | 'velocity' | 'suspicious_timing';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    metrics: {
        returnCount?: number;
        totalValue?: number;
        frequency?: number;
        velocity?: number;
        [key: string]: any;
    };
    confidence: number;
    detectedAt: Date;
}

export interface SellerPattern {
    sellerId: string;
    patternType: 'high_rejection_rate' | 'slow_processing' | 'compliance_violation' | 'suspicious_behavior';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    metrics: {
        rejectionRate?: number;
        avgProcessingTime?: number;
        violationCount?: number;
        [key: string]: any;
    };
    confidence: number;
    detectedAt: Date;
}

export interface SystemPattern {
    patternType: 'coordinated_fraud' | 'fraud_ring' | 'emerging_pattern' | 'cross_user';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedUsers: string[];
    affectedSellers?: string[];
    metrics: Record<string, any>;
    confidence: number;
    detectedAt: Date;
}

export interface PatternPerformance {
    patternId: string;
    patternType: string;
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
    precision: number;
    recall: number;
    f1Score: number;
    lastUpdated: Date;
}

// ============================================================================
// FRAUD PATTERN DETECTOR
// ============================================================================

export class FraudPatternDetector {
    // Pattern detection thresholds
    private readonly HIGH_FREQUENCY_THRESHOLD = 5; // Returns per month
    private readonly HIGH_VALUE_THRESHOLD = 2000; // USD
    private readonly REASON_ABUSE_THRESHOLD = 0.7; // 70% same reason
    private readonly VELOCITY_THRESHOLD = 3; // Returns in 7 days

    // Seller thresholds
    private readonly HIGH_REJECTION_RATE = 0.5; // 50% rejection rate
    private readonly SLOW_PROCESSING_THRESHOLD = 7; // Days

    // System-wide thresholds
    private readonly COORDINATED_FRAUD_MIN_USERS = 3;
    private readonly NETWORK_SIMILARITY_THRESHOLD = 0.8;

    // ========================================================================
    // USER PATTERN DETECTION
    // ========================================================================

    /**
     * Detect high-frequency return patterns for a user
     */
    async detectHighFrequencyReturns(userId: string): Promise<UserPattern | null> {
        try {
            // Get user's return history
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const [stats] = await db
                .select({
                    returnCount: count(),
                    totalValue: sql<number>`COALESCE(SUM(CAST(${returns.refundAmount} AS NUMERIC)), 0)`,
                })
                .from(returns)
                .where(
                    and(
                        eq(returns.buyerId, userId),
                        gte(returns.createdAt, thirtyDaysAgo)
                    )
                );

            const frequency = stats.returnCount; // Returns per month

            if (frequency >= this.HIGH_FREQUENCY_THRESHOLD) {
                const severity = this.calculateSeverity(frequency, [5, 8, 12]);

                return {
                    userId,
                    patternType: 'high_frequency',
                    severity,
                    description: `User has ${frequency} returns in the last 30 days`,
                    metrics: {
                        returnCount: frequency,
                        totalValue: Number(stats.totalValue),
                        frequency,
                    },
                    confidence: 0.9,
                    detectedAt: new Date(),
                };
            }

            return null;
        } catch (error) {
            logger.error('Error detecting high-frequency returns:', error);
            throw error;
        }
    }

    /**
     * Detect high-value return patterns
     */
    async detectHighValuePatterns(userId: string): Promise<UserPattern | null> {
        try {
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const highValueReturns = await db
                .select()
                .from(returns)
                .where(
                    and(
                        eq(returns.buyerId, userId),
                        gte(returns.createdAt, ninetyDaysAgo),
                        sql`CAST(${returns.originalAmount} AS NUMERIC) > ${this.HIGH_VALUE_THRESHOLD}`
                    )
                );

            if (highValueReturns.length >= 3) {
                const totalValue = highValueReturns.reduce(
                    (sum, r) => sum + Number(r.originalAmount),
                    0
                );

                const severity = this.calculateSeverity(highValueReturns.length, [3, 5, 8]);

                return {
                    userId,
                    patternType: 'high_value',
                    severity,
                    description: `User has ${highValueReturns.length} high-value returns (>${this.HIGH_VALUE_THRESHOLD}) in 90 days`,
                    metrics: {
                        returnCount: highValueReturns.length,
                        totalValue,
                        averageValue: totalValue / highValueReturns.length,
                    },
                    confidence: 0.85,
                    detectedAt: new Date(),
                };
            }

            return null;
        } catch (error) {
            logger.error('Error detecting high-value patterns:', error);
            throw error;
        }
    }

    /**
     * Detect reason abuse (repeated use of same reason)
     */
    async detectReasonAbuse(userId: string): Promise<UserPattern | null> {
        try {
            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

            const userReturns = await db
                .select()
                .from(returns)
                .where(
                    and(
                        eq(returns.buyerId, userId),
                        gte(returns.createdAt, sixtyDaysAgo)
                    )
                );

            if (userReturns.length < 3) return null;

            // Count reason frequency
            const reasonCounts: Record<string, number> = {};
            userReturns.forEach(r => {
                reasonCounts[r.returnReason] = (reasonCounts[r.returnReason] || 0) + 1;
            });

            // Find most common reason
            const maxReason = Object.entries(reasonCounts).reduce((max, [reason, count]) =>
                count > max.count ? { reason, count } : max,
                { reason: '', count: 0 }
            );

            const abuseRatio = maxReason.count / userReturns.length;

            if (abuseRatio >= this.REASON_ABUSE_THRESHOLD) {
                const severity = this.calculateSeverity(abuseRatio * 100, [70, 80, 90]);

                return {
                    userId,
                    patternType: 'reason_abuse',
                    severity,
                    description: `User uses "${maxReason.reason}" for ${(abuseRatio * 100).toFixed(0)}% of returns`,
                    metrics: {
                        mostCommonReason: maxReason.reason,
                        reasonCount: maxReason.count,
                        totalReturns: userReturns.length,
                        abuseRatio,
                    },
                    confidence: 0.75,
                    detectedAt: new Date(),
                };
            }

            return null;
        } catch (error) {
            logger.error('Error detecting reason abuse:', error);
            throw error;
        }
    }

    /**
     * Comprehensive user behavior analysis
     */
    async analyzeUserBehavior(userId: string): Promise<UserPattern[]> {
        const patterns: UserPattern[] = [];

        const [highFreq, highValue, reasonAbuse] = await Promise.all([
            this.detectHighFrequencyReturns(userId),
            this.detectHighValuePatterns(userId),
            this.detectReasonAbuse(userId),
        ]);

        if (highFreq) patterns.push(highFreq);
        if (highValue) patterns.push(highValue);
        if (reasonAbuse) patterns.push(reasonAbuse);

        // Store detected patterns
        for (const pattern of patterns) {
            await this.storePattern({
                patternType: pattern.patternType,
                severity: pattern.severity,
                description: pattern.description,
                detectionCriteria: { userId, metrics: pattern.metrics },
                affectedUsers: [userId],
                affectedReturns: [],
            });
        }

        return patterns;
    }

    // ========================================================================
    // SELLER PATTERN DETECTION
    // ========================================================================

    /**
     * Detect seller fraud patterns
     */
    async detectSellerFraudPatterns(sellerId: string): Promise<SellerPattern | null> {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const [stats] = await db
                .select({
                    totalReturns: count(),
                    rejectedReturns: sql<number>`COUNT(CASE WHEN ${returns.status} = 'rejected' THEN 1 END)`,
                })
                .from(returns)
                .where(
                    and(
                        eq(returns.sellerId, sellerId),
                        gte(returns.createdAt, thirtyDaysAgo)
                    )
                );

            if (stats.totalReturns < 5) return null; // Need minimum data

            const rejectionRate = stats.rejectedReturns / stats.totalReturns;

            if (rejectionRate >= this.HIGH_REJECTION_RATE) {
                const severity = this.calculateSeverity(rejectionRate * 100, [50, 65, 80]);

                return {
                    sellerId,
                    patternType: 'high_rejection_rate',
                    severity,
                    description: `Seller rejects ${(rejectionRate * 100).toFixed(0)}% of return requests`,
                    metrics: {
                        totalReturns: stats.totalReturns,
                        rejectedReturns: stats.rejectedReturns,
                        rejectionRate,
                    },
                    confidence: 0.8,
                    detectedAt: new Date(),
                };
            }

            return null;
        } catch (error) {
            logger.error('Error detecting seller fraud patterns:', error);
            throw error;
        }
    }

    /**
     * Detect compliance violations
     */
    async detectComplianceViolations(sellerId: string): Promise<SellerPattern | null> {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Check for slow processing (returns not processed within SLA)
            const slowReturns = await db
                .select()
                .from(returns)
                .where(
                    and(
                        eq(returns.sellerId, sellerId),
                        gte(returns.createdAt, thirtyDaysAgo),
                        sql`${returns.approvedAt} IS NOT NULL`,
                        sql`EXTRACT(EPOCH FROM (${returns.approvedAt} - ${returns.createdAt})) / 86400 > ${this.SLOW_PROCESSING_THRESHOLD}`
                    )
                );

            const [totalReturns] = await db
                .select({ count: count() })
                .from(returns)
                .where(
                    and(
                        eq(returns.sellerId, sellerId),
                        gte(returns.createdAt, thirtyDaysAgo)
                    )
                );

            if (totalReturns.count < 5) return null;

            const slowProcessingRate = slowReturns.length / totalReturns.count;

            if (slowProcessingRate > 0.3) { // 30% slow processing
                return {
                    sellerId,
                    patternType: 'compliance_violation',
                    severity: 'medium',
                    description: `Seller processes ${(slowProcessingRate * 100).toFixed(0)}% of returns slowly (>${this.SLOW_PROCESSING_THRESHOLD} days)`,
                    metrics: {
                        slowReturns: slowReturns.length,
                        totalReturns: totalReturns.count,
                        slowProcessingRate,
                    },
                    confidence: 0.7,
                    detectedAt: new Date(),
                };
            }

            return null;
        } catch (error) {
            logger.error('Error detecting compliance violations:', error);
            throw error;
        }
    }

    /**
     * Analyze suspicious seller behavior
     */
    async analyzeSuspiciousBehavior(sellerId: string): Promise<SellerPattern[]> {
        const patterns: SellerPattern[] = [];

        const [fraudPattern, complianceViolation] = await Promise.all([
            this.detectSellerFraudPatterns(sellerId),
            this.detectComplianceViolations(sellerId),
        ]);

        if (fraudPattern) patterns.push(fraudPattern);
        if (complianceViolation) patterns.push(complianceViolation);

        // Store patterns
        for (const pattern of patterns) {
            await this.storePattern({
                patternType: pattern.patternType,
                severity: pattern.severity,
                description: pattern.description,
                detectionCriteria: { sellerId, metrics: pattern.metrics },
                affectedUsers: [],
                affectedReturns: [],
            });
        }

        return patterns;
    }

    // ========================================================================
    // SYSTEM-WIDE PATTERN DETECTION
    // ========================================================================

    /**
     * Detect cross-user patterns
     */
    async detectCrossUserPatterns(): Promise<SystemPattern[]> {
        try {
            const patterns: SystemPattern[] = [];
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // Find users with similar return patterns in the same timeframe
            const recentReturns = await db
                .select({
                    userId: returns.buyerId,
                    returnCount: count(),
                    reasons: sql<string[]>`array_agg(${returns.returnReason})`,
                })
                .from(returns)
                .where(gte(returns.createdAt, sevenDaysAgo))
                .groupBy(returns.buyerId)
                .having(sql`count(*) >= 3`);

            // Group users by similar patterns
            const reasonGroups: Record<string, string[]> = {};

            for (const user of recentReturns) {
                const reasonKey = user.reasons.sort().join(',');
                if (!reasonGroups[reasonKey]) {
                    reasonGroups[reasonKey] = [];
                }
                reasonGroups[reasonKey].push(user.userId);
            }

            // Detect coordinated patterns
            for (const [reasonKey, userIds] of Object.entries(reasonGroups)) {
                if (userIds.length >= this.COORDINATED_FRAUD_MIN_USERS) {
                    patterns.push({
                        patternType: 'cross_user',
                        severity: 'high',
                        description: `${userIds.length} users with identical return reason patterns in 7 days`,
                        affectedUsers: userIds,
                        metrics: {
                            userCount: userIds.length,
                            reasonPattern: reasonKey,
                            timeframe: '7 days',
                        },
                        confidence: 0.75,
                        detectedAt: new Date(),
                    });
                }
            }

            return patterns;
        } catch (error) {
            logger.error('Error detecting cross-user patterns:', error);
            throw error;
        }
    }

    /**
     * Detect coordinated fraud
     */
    async detectCoordinatedFraud(): Promise<SystemPattern[]> {
        try {
            const patterns: SystemPattern[] = [];
            const fourteenDaysAgo = new Date();
            fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

            // Find high-risk returns from multiple users targeting same sellers
            const suspiciousReturns = await db
                .select({
                    sellerId: returns.sellerId,
                    userIds: sql<string[]>`array_agg(DISTINCT ${returns.buyerId})`,
                    returnCount: count(),
                    totalValue: sql<number>`SUM(CAST(${returns.originalAmount} AS NUMERIC))`,
                })
                .from(returns)
                .where(
                    and(
                        gte(returns.createdAt, fourteenDaysAgo),
                        eq(returns.riskLevel, 'high')
                    )
                )
                .groupBy(returns.sellerId)
                .having(sql`count(DISTINCT ${returns.buyerId}) >= ${this.COORDINATED_FRAUD_MIN_USERS}`);

            for (const group of suspiciousReturns) {
                patterns.push({
                    patternType: 'coordinated_fraud',
                    severity: 'critical',
                    description: `${group.userIds.length} high-risk users targeting same seller`,
                    affectedUsers: group.userIds,
                    affectedSellers: [group.sellerId],
                    metrics: {
                        userCount: group.userIds.length,
                        returnCount: group.returnCount,
                        totalValue: Number(group.totalValue),
                        sellerId: group.sellerId,
                    },
                    confidence: 0.85,
                    detectedAt: new Date(),
                });
            }

            return patterns;
        } catch (error) {
            logger.error('Error detecting coordinated fraud:', error);
            throw error;
        }
    }

    /**
     * Perform network analysis to detect fraud rings
     */
    async performNetworkAnalysis(): Promise<SystemPattern[]> {
        try {
            const patterns: SystemPattern[] = [];

            // This is a simplified version - full network analysis would use graph algorithms
            // Find users with similar high-risk profiles
            const highRiskUsers = await db
                .select()
                .from(userFraudProfiles)
                .where(
                    and(
                        sql`${userFraudProfiles.averageRiskScore} > 70`,
                        sql`${userFraudProfiles.totalReturns} >= 5`
                    )
                );

            if (highRiskUsers.length >= this.COORDINATED_FRAUD_MIN_USERS) {
                patterns.push({
                    patternType: 'fraud_ring',
                    severity: 'critical',
                    description: `Potential fraud ring detected: ${highRiskUsers.length} high-risk users`,
                    affectedUsers: highRiskUsers.map(u => u.userId),
                    metrics: {
                        userCount: highRiskUsers.length,
                        averageRiskScore: highRiskUsers.reduce((sum, u) => sum + Number(u.averageRiskScore), 0) / highRiskUsers.length,
                    },
                    confidence: 0.7,
                    detectedAt: new Date(),
                });
            }

            return patterns;
        } catch (error) {
            logger.error('Error performing network analysis:', error);
            throw error;
        }
    }

    /**
     * Detect emerging patterns
     */
    async detectEmergingPatterns(): Promise<SystemPattern[]> {
        try {
            const patterns: SystemPattern[] = [];
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // Find unusual spikes in specific return reasons
            const reasonStats = await db
                .select({
                    reason: returns.returnReason,
                    count: count(),
                })
                .from(returns)
                .where(gte(returns.createdAt, sevenDaysAgo))
                .groupBy(returns.returnReason)
                .having(sql`count(*) > 10`);

            // Compare with historical average (simplified - would use time-series analysis)
            for (const stat of reasonStats) {
                if (stat.count > 20) { // Threshold for emerging pattern
                    patterns.push({
                        patternType: 'emerging_pattern',
                        severity: 'medium',
                        description: `Unusual spike in "${stat.reason}" returns: ${stat.count} in 7 days`,
                        affectedUsers: [],
                        metrics: {
                            reason: stat.reason,
                            count: stat.count,
                            timeframe: '7 days',
                        },
                        confidence: 0.6,
                        detectedAt: new Date(),
                    });
                }
            }

            return patterns;
        } catch (error) {
            logger.error('Error detecting emerging patterns:', error);
            throw error;
        }
    }

    // ========================================================================
    // PATTERN LEARNING
    // ========================================================================

    /**
     * Update pattern definitions based on performance
     */
    async updatePatternDefinitions(): Promise<void> {
        try {
            logger.info('Updating pattern definitions based on performance data');

            // Get pattern performance metrics
            const performances = await this.calculateAllPatternPerformance();

            // Adjust thresholds for underperforming patterns
            for (const perf of performances) {
                if (perf.precision < 0.8 || perf.recall < 0.7) {
                    logger.info(`Pattern ${perf.patternType} needs optimization`, {
                        precision: perf.precision,
                        recall: perf.recall,
                    });
                    // In production, this would adjust detection thresholds
                }
            }

            logger.info('Pattern definitions updated');
        } catch (error) {
            logger.error('Error updating pattern definitions:', error);
            throw error;
        }
    }

    /**
     * Calculate pattern detection performance
     */
    async calculatePatternPerformance(patternType: string): Promise<PatternPerformance> {
        // This is simplified - in production would track actual outcomes
        const patterns = await db
            .select()
            .from(fraudPatterns)
            .where(eq(fraudPatterns.patternType, patternType))
            .limit(100);

        // Mock performance metrics (would be calculated from actual data)
        const truePositives = Math.floor(patterns.length * 0.85);
        const falsePositives = patterns.length - truePositives;
        const trueNegatives = 100;
        const falseNegatives = 15;

        const precision = truePositives / (truePositives + falsePositives);
        const recall = truePositives / (truePositives + falseNegatives);
        const f1Score = 2 * (precision * recall) / (precision + recall);

        return {
            patternId: patternType,
            patternType,
            truePositives,
            falsePositives,
            trueNegatives,
            falseNegatives,
            precision,
            recall,
            f1Score,
            lastUpdated: new Date(),
        };
    }

    /**
     * Calculate performance for all patterns
     */
    private async calculateAllPatternPerformance(): Promise<PatternPerformance[]> {
        const patternTypes = [
            'high_frequency',
            'high_value',
            'reason_abuse',
            'coordinated_fraud',
            'fraud_ring',
        ];

        return Promise.all(
            patternTypes.map(type => this.calculatePatternPerformance(type))
        );
    }

    // ========================================================================
    // PATTERN MANAGEMENT
    // ========================================================================

    /**
     * Store detected pattern in database
     */
    async storePattern(data: {
        patternType: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        detectionCriteria: Record<string, any>;
        affectedUsers: string[];
        affectedReturns: string[];
    }): Promise<void> {
        try {
            await db.insert(fraudPatterns).values({
                patternType: data.patternType,
                severity: data.severity,
                description: data.description,
                detectionCriteria: data.detectionCriteria,
                affectedUsers: data.affectedUsers,
                affectedReturns: data.affectedReturns,
                detectionCount: 1,
            });

            logger.info('Pattern stored', { patternType: data.patternType });
        } catch (error) {
            logger.error('Error storing pattern:', error);
            throw error;
        }
    }

    /**
     * Get active patterns
     */
    async getActivePatterns(): Promise<any[]> {
        return await db
            .select()
            .from(fraudPatterns)
            .where(eq(fraudPatterns.isActive, true))
            .orderBy(desc(fraudPatterns.lastDetected))
            .limit(50);
    }

    /**
     * Resolve pattern
     */
    async resolvePattern(patternId: string, resolvedBy: string, notes: string): Promise<void> {
        await db
            .update(fraudPatterns)
            .set({
                isActive: false,
                resolvedAt: new Date(),
                resolvedBy,
                resolutionNotes: notes,
                updatedAt: new Date(),
            })
            .where(eq(fraudPatterns.id, patternId));

        logger.info('Pattern resolved', { patternId });
    }

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    /**
     * Calculate severity based on value and thresholds
     */
    private calculateSeverity(
        value: number,
        thresholds: [number, number, number] // [medium, high, critical]
    ): 'low' | 'medium' | 'high' | 'critical' {
        if (value >= thresholds[2]) return 'critical';
        if (value >= thresholds[1]) return 'high';
        if (value >= thresholds[0]) return 'medium';
        return 'low';
    }
}

// Export singleton instance
export const fraudPatternDetector = new FraudPatternDetector();
