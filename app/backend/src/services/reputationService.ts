import { DatabaseService } from './databaseService';
import { 
  userReputationScores, 
  reputationChangeEvents, 
  reputationPenalties, 
  reputationThresholds,
  reputationRewards,
  jurorPerformance,
  reporterPerformance,
  moderationCases,
  moderationAppeals,
  contentReports
} from '../db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

export interface ReputationScore {
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
  lastViolationAt?: Date;
  reputationTier: string;
}

export interface ReputationChangeEvent {
  userId: string;
  eventType: string;
  scoreChange: number;
  previousScore: number;
  newScore: number;
  severityMultiplier?: number;
  caseId?: number;
  appealId?: number;
  reportId?: number;
  description: string;
  metadata?: Record<string, any>;
}

export interface ReputationPenalty {
  userId: string;
  penaltyType: string;
  severityLevel: number;
  violationCount: number;
  penaltyStart: Date;
  penaltyEnd?: Date;
  isActive: boolean;
  caseId?: number;
  description: string;
}

export class ReputationService {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = new DatabaseService();
  }

  /**
   * Get user's current reputation score
   */
  async getUserReputation(userId: string): Promise<ReputationScore | null> {
    const result = await this.databaseService.db
      .select()
      .from(userReputationScores)
      .where(eq(userReputationScores.userId, userId))
      .limit(1);

    if (result.length === 0) {
      // Initialize reputation for new user
      await this.initializeUserReputation(userId);
      return this.getUserReputation(userId);
    }

    const score = result[0];
    return {
      userId: score.userId,
      overallScore: parseFloat(score.overallScore),
      moderationScore: parseFloat(score.moderationScore),
      reportingScore: parseFloat(score.reportingScore),
      juryScore: parseFloat(score.juryScore),
      violationCount: score.violationCount,
      helpfulReportsCount: score.helpfulReportsCount,
      falseReportsCount: score.falseReportsCount,
      successfulAppealsCount: score.successfulAppealsCount,
      juryDecisionsCount: score.juryDecisionsCount,
      juryAccuracyRate: parseFloat(score.juryAccuracyRate),
      lastViolationAt: score.lastViolationAt,
      reputationTier: score.reputationTier
    };
  }

  /**
   * Initialize reputation for a new user
   */
  async initializeUserReputation(userId: string): Promise<void> {
    await this.databaseService.db.insert(userReputationScores).values({
      userId,
      overallScore: '1000',
      moderationScore: '1000',
      reportingScore: '1000',
      juryScore: '1000',
      violationCount: 0,
      helpfulReportsCount: 0,
      falseReportsCount: 0,
      successfulAppealsCount: 0,
      juryDecisionsCount: 0,
      juryAccuracyRate: '0',
      reputationTier: 'silver'
    }).onConflictDoNothing();
  }

  /**
   * Apply reputation impact for policy violations
   */
  async applyViolationPenalty(
    userId: string, 
    caseId: number, 
    violationType: string, 
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<void> {
    const currentReputation = await this.getUserReputation(userId);
    if (!currentReputation) return;

    // Calculate penalty based on severity and user's violation history
    const basePenalty = this.calculateViolationPenalty(severity, currentReputation.violationCount);
    const severityMultiplier = this.getSeverityMultiplier(severity);
    const finalPenalty = basePenalty * severityMultiplier;

    const newScore = Math.max(0, currentReputation.overallScore - finalPenalty);

    // Record the reputation change
    await this.recordReputationChange({
      userId,
      eventType: 'policy_violation',
      scoreChange: -finalPenalty,
      previousScore: currentReputation.overallScore,
      newScore,
      severityMultiplier,
      caseId,
      description: `Policy violation: ${violationType} (${severity})`,
      metadata: { violationType, severity, violationCount: currentReputation.violationCount + 1 }
    });

    // Apply progressive penalties if needed
    await this.applyProgressivePenalty(userId, currentReputation.violationCount + 1, caseId);
  }

  /**
   * Reward helpful community reports
   */
  async rewardHelpfulReport(userId: string, reportId: number, accuracy: number): Promise<void> {
    const currentReputation = await this.getUserReputation(userId);
    if (!currentReputation) return;

    const baseReward = await this.getRewardAmount('helpful_report');
    const accuracyMultiplier = Math.max(0.5, accuracy); // Minimum 50% of reward
    const reputationMultiplier = this.getReputationMultiplier(currentReputation.reportingScore);
    
    const finalReward = baseReward * accuracyMultiplier * reputationMultiplier;
    const newScore = currentReputation.overallScore + finalReward;

    await this.recordReputationChange({
      userId,
      eventType: 'helpful_report',
      scoreChange: finalReward,
      previousScore: currentReputation.overallScore,
      newScore,
      reportId,
      description: `Helpful report reward (accuracy: ${(accuracy * 100).toFixed(1)}%)`,
      metadata: { accuracy, accuracyMultiplier, reputationMultiplier }
    });

    // Update reporter performance
    await this.databaseService.db.insert(reporterPerformance).values({
      reporterId: userId,
      reportId,
      reportAccuracy: 'accurate',
      moderatorAgreement: true,
      weightApplied: String(this.getReportingWeight(currentReputation.reportingScore)),
      reputationImpact: String(finalReward)
    });
  }

  /**
   * Penalize false reports
   */
  async penalizeFalseReport(userId: string, reportId: number): Promise<void> {
    const currentReputation = await this.getUserReputation(userId);
    if (!currentReputation) return;

    const basePenalty = 25; // Base penalty for false reports
    const falseReportMultiplier = Math.min(3, 1 + (currentReputation.falseReportsCount * 0.5));
    const finalPenalty = basePenalty * falseReportMultiplier;

    const newScore = Math.max(0, currentReputation.overallScore - finalPenalty);

    await this.recordReputationChange({
      userId,
      eventType: 'false_report',
      scoreChange: -finalPenalty,
      previousScore: currentReputation.overallScore,
      newScore,
      reportId,
      description: `False report penalty (count: ${currentReputation.falseReportsCount + 1})`,
      metadata: { falseReportCount: currentReputation.falseReportsCount + 1, multiplier: falseReportMultiplier }
    });

    // Update reporter performance
    await this.databaseService.db.insert(reporterPerformance).values({
      reporterId: userId,
      reportId,
      reportAccuracy: 'inaccurate',
      moderatorAgreement: false,
      weightApplied: String(this.getReportingWeight(currentReputation.reportingScore)),
      reputationImpact: String(-finalPenalty)
    });
  }

  /**
   * Restore reputation for successful appeals
   */
  async restoreReputationForAppeal(userId: string, appealId: number, originalPenalty: number): Promise<void> {
    const currentReputation = await this.getUserReputation(userId);
    if (!currentReputation) return;

    // Restore 75% of original penalty plus bonus for successful appeal
    const restorationAmount = originalPenalty * 0.75;
    const appealBonus = 50; // Bonus for successful appeal
    const totalRestoration = restorationAmount + appealBonus;

    const newScore = currentReputation.overallScore + totalRestoration;

    await this.recordReputationChange({
      userId,
      eventType: 'successful_appeal',
      scoreChange: totalRestoration,
      previousScore: currentReputation.overallScore,
      newScore,
      appealId,
      description: `Reputation restored for successful appeal`,
      metadata: { originalPenalty, restorationAmount, appealBonus }
    });
  }

  /**
   * Update juror performance and reputation
   */
  async updateJurorPerformance(
    jurorId: string,
    appealId: number,
    vote: string,
    wasMajority: boolean,
    wasCorrect: boolean,
    stakeAmount: number,
    responseTimeMinutes: number
  ): Promise<void> {
    const currentReputation = await this.getUserReputation(jurorId);
    if (!currentReputation) return;

    let rewardAmount = 0;
    let penaltyAmount = 0;

    if (wasCorrect) {
      // Reward for correct decision
      const baseReward = await this.getRewardAmount('accurate_jury_vote');
      const timeBonus = responseTimeMinutes < 60 ? 1.2 : 1.0; // 20% bonus for quick response
      rewardAmount = baseReward * timeBonus;
    } else {
      // Penalty for incorrect decision (slash part of stake)
      penaltyAmount = stakeAmount * 0.1; // 10% slash for incorrect vote
    }

    const netChange = rewardAmount - penaltyAmount;
    const newScore = Math.max(0, currentReputation.overallScore + netChange);

    if (netChange !== 0) {
      await this.recordReputationChange({
        userId: jurorId,
        eventType: wasCorrect ? 'jury_accurate_vote' : 'jury_inaccurate_vote',
        scoreChange: netChange,
        previousScore: currentReputation.overallScore,
        newScore,
        appealId,
        description: `Jury performance: ${wasCorrect ? 'accurate' : 'inaccurate'} vote`,
        metadata: { vote, wasMajority, wasCorrect, responseTimeMinutes, stakeAmount }
      });
    }

    // Record juror performance
    await this.databaseService.db.insert(jurorPerformance).values({
      jurorId,
      appealId,
      vote,
      wasMajority,
      wasCorrect,
      stakeAmount: String(stakeAmount),
      rewardEarned: String(rewardAmount),
      penaltyApplied: String(penaltyAmount),
      responseTimeMinutes,
      qualityScore: String(wasCorrect ? (wasMajority ? 1.0 : 0.8) : 0.2)
    });

    // Update jury accuracy rate
    await this.updateJuryAccuracyRate(jurorId);
  }

  /**
   * Get moderation strictness multiplier based on reputation
   */
  async getModerationStrictness(userId: string): Promise<number> {
    const reputation = await this.getUserReputation(userId);
    if (!reputation) return 1.0;

    const thresholds = await this.databaseService.db
      .select()
      .from(reputationThresholds)
      .where(and(
        eq(reputationThresholds.thresholdType, 'moderation_strictness'),
        eq(reputationThresholds.isActive, true),
        lte(reputationThresholds.minScore, String(reputation.overallScore)),
        gte(reputationThresholds.maxScore, String(reputation.overallScore))
      ))
      .limit(1);

    return thresholds.length > 0 ? parseFloat(thresholds[0].multiplier) : 1.0;
  }

  /**
   * Get reporting weight based on reputation
   */
  getReportingWeight(reportingScore: number): number {
    if (reportingScore < 500) return 0.5;
    if (reportingScore < 1500) return 1.0;
    return 1.5;
  }

  /**
   * Check if user is eligible for jury duty
   */
  async isEligibleForJury(userId: string): Promise<boolean> {
    const reputation = await this.getUserReputation(userId);
    if (!reputation) return false;

    const threshold = await this.databaseService.db
      .select()
      .from(reputationThresholds)
      .where(and(
        eq(reputationThresholds.thresholdType, 'jury_eligibility'),
        eq(reputationThresholds.isActive, true)
      ))
      .limit(1);

    const minScore = threshold.length > 0 ? parseFloat(threshold[0].minScore) : 1500;
    return reputation.overallScore >= minScore && reputation.juryAccuracyRate >= 0.7;
  }

  /**
   * Get active penalties for user
   */
  async getActivePenalties(userId: string): Promise<ReputationPenalty[]> {
    const penalties = await this.databaseService.db
      .select()
      .from(reputationPenalties)
      .where(and(
        eq(reputationPenalties.userId, userId),
        eq(reputationPenalties.isActive, true)
      ))
      .orderBy(desc(reputationPenalties.createdAt));

    return penalties.map((p: any) => ({
      userId: p.userId,
      penaltyType: p.penaltyType,
      severityLevel: p.severityLevel,
      violationCount: p.violationCount,
      penaltyStart: p.penaltyStart,
      penaltyEnd: p.penaltyEnd,
      isActive: p.isActive,
      caseId: p.caseId,
      description: p.description
    }));
  }

  // Private helper methods

  private async recordReputationChange(event: ReputationChangeEvent): Promise<void> {
    await this.databaseService.db.insert(reputationChangeEvents).values({
      userId: event.userId,
      eventType: event.eventType,
      scoreChange: String(event.scoreChange),
      previousScore: String(event.previousScore),
      newScore: String(event.newScore),
      severityMultiplier: event.severityMultiplier ? String(event.severityMultiplier) : undefined,
      caseId: event.caseId,
      appealId: event.appealId,
      reportId: event.reportId,
      description: event.description,
      metadata: event.metadata ? JSON.stringify(event.metadata) : undefined
    });
  }

  private calculateViolationPenalty(severity: string, violationCount: number): number {
    const basePenalties: Record<string, number> = {
      low: 50,
      medium: 100,
      high: 200,
      critical: 400
    };

    const base = basePenalties[severity] || 100;
    const escalationMultiplier = Math.min(3, 1 + (violationCount * 0.2)); // Max 3x penalty
    
    return base * escalationMultiplier;
  }

  private getSeverityMultiplier(severity: string): number {
    const multipliers: Record<string, number> = {
      low: 0.5,
      medium: 1.0,
      high: 1.5,
      critical: 2.0
    };
    return multipliers[severity] || 1.0;
  }

  private getReputationMultiplier(score: number): number {
    if (score >= 2000) return 1.5;
    if (score >= 1500) return 1.2;
    if (score >= 1000) return 1.0;
    if (score >= 500) return 0.8;
    return 0.5;
  }

  private async getRewardAmount(rewardType: string): Promise<number> {
    const reward = await this.databaseService.db
      .select()
      .from(reputationRewards)
      .where(and(
        eq(reputationRewards.rewardType, rewardType),
        eq(reputationRewards.isActive, true)
      ))
      .limit(1);

    return reward.length > 0 ? parseFloat(reward[0].baseReward) : 50;
  }

  private async applyProgressivePenalty(userId: string, violationCount: number, caseId: number): Promise<void> {
    let penaltyType = '';
    let severityLevel = 1;
    let duration = 0; // in seconds

    if (violationCount >= 10) {
      penaltyType = 'permanent_ban';
      severityLevel = 5;
    } else if (violationCount >= 7) {
      penaltyType = 'temporary_ban';
      severityLevel = 4;
      duration = 30 * 24 * 60 * 60; // 30 days
    } else if (violationCount >= 5) {
      penaltyType = 'posting_restriction';
      severityLevel = 3;
      duration = 7 * 24 * 60 * 60; // 7 days
    } else if (violationCount >= 3) {
      penaltyType = 'content_review';
      severityLevel = 2;
      duration = 3 * 24 * 60 * 60; // 3 days
    } else if (violationCount >= 2) {
      penaltyType = 'rate_limit';
      severityLevel = 1;
      duration = 24 * 60 * 60; // 1 day
    }

    if (penaltyType) {
      const penaltyEnd = duration > 0 ? new Date(Date.now() + duration * 1000) : null;

      await this.databaseService.db.insert(reputationPenalties).values({
        userId,
        penaltyType,
        severityLevel,
        violationCount,
        penaltyEnd,
        caseId,
        description: `Progressive penalty for ${violationCount} violations`
      });
    }
  }

  private async updateJuryAccuracyRate(jurorId: string): Promise<void> {
    const performance = await this.databaseService.db
      .select({
        total: sql<number>`count(*)`,
        correct: sql<number>`count(*) filter (where was_correct = true)`
      })
      .from(jurorPerformance)
      .where(eq(jurorPerformance.jurorId, jurorId));

    if (performance.length > 0 && performance[0].total > 0) {
      const accuracyRate = performance[0].correct / performance[0].total;
      
      await this.databaseService.db
        .update(userReputationScores)
        .set({
          juryDecisionsCount: performance[0].total,
          juryAccuracyRate: String(accuracyRate),
          updatedAt: new Date()
        })
        .where(eq(userReputationScores.userId, jurorId));
    }
  }
}

export const reputationService = new ReputationService();