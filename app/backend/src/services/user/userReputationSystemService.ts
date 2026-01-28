import { databaseService } from '../databaseService';
import { safeLogger } from '../../utils/safeLogger';
import { users, userReputationScores, reputationChangeEvents, reputationPenalties, reputationHistory } from '../../db/schema';
import { eq, and, gte, lte, desc, sql, count, avg } from 'drizzle-orm';

export interface UserReputation {
  userId: string;
  overallScore: number;
  moderationScore: number;
  reportingScore: number;
  juryScore: number;
  violationCount: number;
  helpfulReportsCount: number;
  falseReportsCount: number;
  successfulAppealsCount: number;
  juryDecisionsCount: number;
  juryAccuracyRate: number;
  lastViolationAt: Date | null;
  reputationTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  createdAt: Date;
  updatedAt: Date;
}

export interface ReputationChangeEvent {
  id: string;
  userId: string;
  eventType: 'violation' | 'helpful_report' | 'false_report' | 'successful_appeal' | 'jury_accuracy' | 'manual_adjustment';
  scoreChange: number;
  previousScore: number;
  newScore: number;
  severityMultiplier: number;
  relatedEntityId: string;
  description: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface ReputationPenalty {
  id: string;
  userId: string;
  penaltyType: 'warning' | 'temporary_limit' | 'permanent_limit' | 'suspension' | 'ban';
  severityLevel: number;
  violationCount: number;
  penaltyStart: Date;
  penaltyEnd: Date | null;
  isActive: boolean;
  caseId: string;
  description: string;
  createdAt: Date;
}

export interface ReputationTier {
  name: 'bronze' | 'silver' | 'gold' | 'platinum';
  minScore: number;
  maxScore: number;
  benefits: string[];
  restrictions: string[];
}

export interface ReputationMetrics {
  userId: string;
  engagementScore: number;
  qualityScore: number;
  communityScore: number;
  trustScore: number;
  activityScore: number;
  consistencyScore: number;
}

export class UserReputationSystemService {
  private reputationTiers: ReputationTier[];

  constructor() {
    this.reputationTiers = [
      {
        name: 'bronze',
        minScore: 0,
        maxScore: 500,
        benefits: ['Basic community access'],
        restrictions: ['Limited posting frequency', 'No premium features']
      },
      {
        name: 'silver',
        minScore: 501,
        maxScore: 1000,
        benefits: ['Increased posting limits', 'Access to private communities'],
        restrictions: ['Moderated posting']
      },
      {
        name: 'gold',
        minScore: 1001,
        maxScore: 2000,
        benefits: ['Unlimited posting', 'Premium features', 'Moderation privileges'],
        restrictions: []
      },
      {
        name: 'platinum',
        minScore: 2001,
        maxScore: 10000,
        benefits: ['All gold benefits', 'Community leadership', 'Early access to features'],
        restrictions: []
      }
    ];
  }

  /**
   * Get user reputation by user ID
   */
  async getUserReputation(userId: string): Promise<UserReputation | null> {
    try {
      const db = databaseService.getDatabase();
      
      const reputationData = await db
        .select()
        .from(userReputationScores)
        .where(eq(userReputationScores.userId, userId))
        .limit(1);

      if (reputationData.length === 0) {
        // Create default reputation for new user
        return await this.createDefaultReputation(userId);
      }

      const rep = reputationData[0];
      
      return {
        userId: rep.userId,
        overallScore: parseFloat(rep.overallScore.toString()),
        moderationScore: parseFloat(rep.moderationScore.toString()),
        reportingScore: parseFloat(rep.reportingScore.toString()),
        juryScore: parseFloat(rep.juryScore.toString()),
        violationCount: rep.violationCount,
        helpfulReportsCount: rep.helpfulReportsCount,
        falseReportsCount: rep.falseReportsCount,
        successfulAppealsCount: rep.successfulAppealsCount,
        juryDecisionsCount: rep.juryDecisionsCount,
        juryAccuracyRate: parseFloat(rep.juryAccuracyRate.toString()),
        lastViolationAt: rep.lastViolationAt,
        reputationTier: rep.reputationTier as 'bronze' | 'silver' | 'gold' | 'platinum',
        createdAt: rep.createdAt,
        updatedAt: rep.updatedAt
      };

    } catch (error) {
      safeLogger.error('Error getting user reputation:', error);
      return null;
    }
  }

  /**
   * Create default reputation for a new user
   */
  private async createDefaultReputation(userId: string): Promise<UserReputation> {
    try {
      const db = databaseService.getDatabase();
      
      const defaultReputation: UserReputation = {
        userId,
        overallScore: 1000,
        moderationScore: 1000,
        reportingScore: 1000,
        juryScore: 1000,
        violationCount: 0,
        helpfulReportsCount: 0,
        falseReportsCount: 0,
        successfulAppealsCount: 0,
        juryDecisionsCount: 0,
        juryAccuracyRate: 0,
        lastViolationAt: null,
        reputationTier: 'bronze',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Insert into database
      await db.insert(userReputationScores).values({
        userId,
        overallScore: defaultReputation.overallScore,
        moderationScore: defaultReputation.moderationScore,
        reportingScore: defaultReputation.reportingScore,
        juryScore: defaultReputation.juryScore,
        violationCount: defaultReputation.violationCount,
        helpfulReportsCount: defaultReputation.helpfulReportsCount,
        falseReportsCount: defaultReputation.falseReportsCount,
        successfulAppealsCount: defaultReputation.successfulAppealsCount,
        juryDecisionsCount: defaultReputation.juryDecisionsCount,
        juryAccuracyRate: defaultReputation.juryAccuracyRate,
        lastViolationAt: defaultReputation.lastViolationAt,
        reputationTier: defaultReputation.reputationTier,
        createdAt: defaultReputation.createdAt,
        updatedAt: defaultReputation.updatedAt
      });

      return defaultReputation;

    } catch (error) {
      safeLogger.error('Error creating default reputation:', error);
      throw new Error('Failed to create default reputation');
    }
  }

  /**
   * Update user reputation based on an event
   */
  async updateUserReputation(
    userId: string,
    eventType: 'violation' | 'helpful_report' | 'false_report' | 'successful_appeal' | 'jury_accuracy' | 'manual_adjustment',
    scoreChange: number,
    relatedEntityId?: string,
    description?: string,
    metadata?: Record<string, any>
  ): Promise<UserReputation | null> {
    try {
      // Get current reputation
      let currentReputation = await this.getUserReputation(userId);
      if (!currentReputation) {
        currentReputation = await this.createDefaultReputation(userId);
      }

      // Calculate new score
      const previousScore = currentReputation.overallScore;
      const newScore = Math.max(0, previousScore + scoreChange);
      
      // Determine severity multiplier
      let severityMultiplier = 1.0;
      if (eventType === 'violation') {
        severityMultiplier = Math.max(1.0, currentReputation.violationCount / 10);
      } else if (eventType === 'helpful_report') {
        severityMultiplier = 1.2;
      }

      // Update reputation scores
      const updatedReputation = await this.updateReputationScores(
        userId,
        eventType,
        scoreChange,
        severityMultiplier
      );

      // Record reputation change event
      await this.recordReputationChangeEvent(
        userId,
        eventType,
        scoreChange,
        previousScore,
        newScore,
        severityMultiplier,
        relatedEntityId,
        description,
        metadata
      );

      // Update reputation tier
      const newTier = this.determineReputationTier(newScore);
      if (newTier !== updatedReputation.reputationTier) {
        await this.updateReputationTier(userId, newTier);
        updatedReputation.reputationTier = newTier;
      }

      return updatedReputation;

    } catch (error) {
      safeLogger.error('Error updating user reputation:', error);
      return null;
    }
  }

  /**
   * Update reputation scores in database
   */
  private async updateReputationScores(
    userId: string,
    eventType: string,
    scoreChange: number,
    severityMultiplier: number
  ): Promise<UserReputation> {
    try {
      const db = databaseService.getDatabase();
      
      // Update specific score based on event type
      let updateFields: Partial<typeof userReputationScores.$inferSelect> = {};
      
      switch (eventType) {
        case 'violation':
          updateFields = {
            overallScore: sql`overall_score + ${scoreChange}` as any,
            moderationScore: sql`moderation_score + ${scoreChange}` as any,
            violationCount: sql`violation_count + 1` as any,
            lastViolationAt: new Date()
          };
          break;
        case 'helpful_report':
          updateFields = {
            overallScore: sql`overall_score + ${scoreChange}` as any,
            reportingScore: sql`reporting_score + ${scoreChange}` as any,
            helpfulReportsCount: sql`helpful_reports_count + 1` as any
          };
          break;
        case 'false_report':
          updateFields = {
            overallScore: sql`overall_score + ${scoreChange}` as any,
            reportingScore: sql`reporting_score + ${scoreChange}` as any,
            falseReportsCount: sql`false_reports_count + 1` as any
          };
          break;
        case 'successful_appeal':
          updateFields = {
            overallScore: sql`overall_score + ${scoreChange}` as any,
            moderationScore: sql`moderation_score + ${scoreChange}` as any,
            successfulAppealsCount: sql`successful_appeals_count + 1` as any
          };
          break;
        case 'jury_accuracy':
          updateFields = {
            overallScore: sql`overall_score + ${scoreChange}` as any,
            juryScore: sql`jury_score + ${scoreChange}` as any,
            juryDecisionsCount: sql`jury_decisions_count + 1` as any
          };
          break;
        default:
          updateFields = {
            overallScore: sql`overall_score + ${scoreChange}` as any
          };
      }

      // Apply severity multiplier
      if (severityMultiplier !== 1.0) {
        // This would be implemented with more complex SQL in a real system
      }

      // Update the record
      const [updatedRecord] = await db
        .update(userReputationScores)
        .set({
          ...updateFields,
          updatedAt: new Date()
        })
        .where(eq(userReputationScores.userId, userId))
        .returning();

      if (!updatedRecord) {
        throw new Error('Failed to update reputation scores');
      }

      return {
        userId: updatedRecord.userId,
        overallScore: parseFloat(updatedRecord.overallScore.toString()),
        moderationScore: parseFloat(updatedRecord.moderationScore.toString()),
        reportingScore: parseFloat(updatedRecord.reportingScore.toString()),
        juryScore: parseFloat(updatedRecord.juryScore.toString()),
        violationCount: updatedRecord.violationCount,
        helpfulReportsCount: updatedRecord.helpfulReportsCount,
        falseReportsCount: updatedRecord.falseReportsCount,
        successfulAppealsCount: updatedRecord.successfulAppealsCount,
        juryDecisionsCount: updatedRecord.juryDecisionsCount,
        juryAccuracyRate: parseFloat(updatedRecord.juryAccuracyRate.toString()),
        lastViolationAt: updatedRecord.lastViolationAt,
        reputationTier: updatedRecord.reputationTier as 'bronze' | 'silver' | 'gold' | 'platinum',
        createdAt: updatedRecord.createdAt,
        updatedAt: updatedRecord.updatedAt
      };

    } catch (error) {
      safeLogger.error('Error updating reputation scores:', error);
      throw new Error('Failed to update reputation scores');
    }
  }

  /**
   * Record a reputation change event
   */
  private async recordReputationChangeEvent(
    userId: string,
    eventType: string,
    scoreChange: number,
    previousScore: number,
    newScore: number,
    severityMultiplier: number,
    relatedEntityId?: string,
    description?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const db = databaseService.getDatabase();
      
      await db.insert(reputationChangeEvents).values({
        userId,
        eventType,
        scoreChange,
        previousScore,
        newScore,
        severityMultiplier,
        relatedEntityId: relatedEntityId || '',
        description: description || '',
        metadata: metadata ? JSON.stringify(metadata) : '{}',
        createdAt: new Date()
      });

    } catch (error) {
      safeLogger.error('Error recording reputation change event:', error);
    }
  }

  /**
   * Determine reputation tier based on score
   */
  private determineReputationTier(score: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
    for (const tier of this.reputationTiers) {
      if (score >= tier.minScore && score <= tier.maxScore) {
        return tier.name;
      }
    }
    return 'bronze'; // Default to bronze if no tier matches
  }

  /**
   * Update user's reputation tier
   */
  private async updateReputationTier(
    userId: string,
    tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  ): Promise<void> {
    try {
      const db = databaseService.getDatabase();
      
      await db
        .update(userReputationScores)
        .set({
          reputationTier: tier,
          updatedAt: new Date()
        })
        .where(eq(userReputationScores.userId, userId));

    } catch (error) {
      safeLogger.error('Error updating reputation tier:', error);
    }
  }

  /**
   * Apply reputation-based penalties
   */
  async applyReputationPenalty(
    userId: string,
    penaltyType: 'warning' | 'temporary_limit' | 'permanent_limit' | 'suspension' | 'ban',
    severityLevel: number,
    description: string,
    caseId?: string,
    durationDays?: number
  ): Promise<ReputationPenalty> {
    try {
      const db = databaseService.getDatabase();
      
      const penalty: ReputationPenalty = {
        id: `penalty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        penaltyType,
        severityLevel,
        violationCount: severityLevel, // Simplified - in reality this would be tracked separately
        penaltyStart: new Date(),
        penaltyEnd: durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000) : null,
        isActive: true,
        caseId: caseId || '',
        description,
        createdAt: new Date()
      };

      // Insert penalty record
      await db.insert(reputationPenalties).values({
        userId: penalty.userId,
        penaltyType: penalty.penaltyType,
        severityLevel: penalty.severityLevel,
        violationCount: penalty.violationCount,
        penaltyStart: penalty.penaltyStart,
        penaltyEnd: penalty.penaltyEnd,
        isActive: penalty.isActive,
        caseId: penalty.caseId,
        description: penalty.description,
        createdAt: penalty.createdAt
      });

      // Update user reputation based on penalty
      const scoreChange = this.calculatePenaltyScoreChange(penaltyType, severityLevel);
      await this.updateUserReputation(userId, 'violation', scoreChange, caseId, description);

      return penalty;

    } catch (error) {
      safeLogger.error('Error applying reputation penalty:', error);
      throw new Error('Failed to apply reputation penalty');
    }
  }

  /**
   * Calculate score change for a penalty
   */
  private calculatePenaltyScoreChange(
    penaltyType: 'warning' | 'temporary_limit' | 'permanent_limit' | 'suspension' | 'ban',
    severityLevel: number
  ): number {
    const basePenalties: Record<string, number> = {
      'warning': -10,
      'temporary_limit': -50,
      'permanent_limit': -100,
      'suspension': -200,
      'ban': -500
    };

    const basePenalty = basePenalties[penaltyType] || -10;
    return basePenalty * severityLevel;
  }

  /**
   * Get user's reputation history
   */
  async getReputationHistory(userId: string, limit: number = 50): Promise<ReputationChangeEvent[]> {
    try {
      const db = databaseService.getDatabase();
      
      const historyData = await db
        .select()
        .from(reputationChangeEvents)
        .where(eq(reputationChangeEvents.userId, userId))
        .orderBy(desc(reputationChangeEvents.createdAt))
        .limit(limit);

      return historyData.map(event => ({
        id: event.id,
        userId: event.userId,
        eventType: event.eventType as any,
        scoreChange: parseFloat(event.scoreChange.toString()),
        previousScore: parseFloat(event.previousScore.toString()),
        newScore: parseFloat(event.newScore.toString()),
        severityMultiplier: parseFloat(event.severityMultiplier.toString()),
        relatedEntityId: event.relatedEntityId,
        description: event.description,
        metadata: event.metadata ? JSON.parse(event.metadata) : {},
        createdAt: event.createdAt
      }));

    } catch (error) {
      safeLogger.error('Error getting reputation history:', error);
      return [];
    }
  }

  /**
   * Get reputation leaderboard
   */
  async getReputationLeaderboard(limit: number = 100): Promise<UserReputation[]> {
    try {
      const db = databaseService.getDatabase();
      
      const leaderboardData = await db
        .select()
        .from(userReputationScores)
        .orderBy(desc(userReputationScores.overallScore))
        .limit(limit);

      return leaderboardData.map(rep => ({
        userId: rep.userId,
        overallScore: parseFloat(rep.overallScore.toString()),
        moderationScore: parseFloat(rep.moderationScore.toString()),
        reportingScore: parseFloat(rep.reportingScore.toString()),
        juryScore: parseFloat(rep.juryScore.toString()),
        violationCount: rep.violationCount,
        helpfulReportsCount: rep.helpfulReportsCount,
        falseReportsCount: rep.falseReportsCount,
        successfulAppealsCount: rep.successfulAppealsCount,
        juryDecisionsCount: rep.juryDecisionsCount,
        juryAccuracyRate: parseFloat(rep.juryAccuracyRate.toString()),
        lastViolationAt: rep.lastViolationAt,
        reputationTier: rep.reputationTier as 'bronze' | 'silver' | 'gold' | 'platinum',
        createdAt: rep.createdAt,
        updatedAt: rep.updatedAt
      }));

    } catch (error) {
      safeLogger.error('Error getting reputation leaderboard:', error);
      return [];
    }
  }

  /**
   * Calculate multi-dimensional reputation metrics
   */
  async calculateReputationMetrics(userId: string): Promise<ReputationMetrics> {
    try {
      const reputation = await this.getUserReputation(userId);
      if (!reputation) {
        throw new Error('User reputation not found');
      }

      // Calculate engagement score (based on activity)
      const engagementScore = Math.min(100, 
        (reputation.helpfulReportsCount + reputation.juryDecisionsCount) * 2
      );

      // Calculate quality score (based on accuracy)
      const qualityScore = reputation.juryAccuracyRate * 100;

      // Calculate community score (based on helpful contributions)
      const communityScore = Math.min(100, reputation.helpfulReportsCount * 3);

      // Calculate trust score (based on reputation tier and violation history)
      let trustScore = 50; // Base score
      if (reputation.reputationTier === 'gold') trustScore += 20;
      else if (reputation.reputationTier === 'silver') trustScore += 10;
      else if (reputation.reputationTier === 'platinum') trustScore += 30;
      
      trustScore -= reputation.violationCount * 5;
      trustScore = Math.max(0, Math.min(100, trustScore));

      // Calculate activity score (based on recent activity)
      const activityScore = Math.min(100, 
        (reputation.helpfulReportsCount + reputation.successfulAppealsCount) * 2
      );

      // Calculate consistency score (based on reporting accuracy)
      const consistencyScore = Math.min(100, 
        (reputation.helpfulReportsCount / Math.max(1, reputation.helpfulReportsCount + reputation.falseReportsCount)) * 100
      );

      return {
        userId,
        engagementScore,
        qualityScore,
        communityScore,
        trustScore,
        activityScore,
        consistencyScore
      };

    } catch (error) {
      safeLogger.error('Error calculating reputation metrics:', error);
      
      // Return default metrics
      return {
        userId,
        engagementScore: 50,
        qualityScore: 50,
        communityScore: 50,
        trustScore: 50,
        activityScore: 50,
        consistencyScore: 50
      };
    }
  }

  /**
   * Get reputation tiers configuration
   */
  getReputationTiers(): ReputationTier[] {
    return [...this.reputationTiers];
  }

  /**
   * Update reputation tiers configuration
   */
  async updateReputationTiers(tiers: ReputationTier[]): Promise<void> {
    this.reputationTiers = tiers;
    // In a real implementation, this would also update the database
  }
}

export const userReputationSystemService = new UserReputationSystemService();
