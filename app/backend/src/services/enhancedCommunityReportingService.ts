import { db } from '../db';
import { 
  contentReports as communityReports,  // Using contentReports as communityReports
  users, 
  userReputationScores, 
  reputationChangeEvents,
  workflowInstances,
  workflowStepExecutions
} from '../db/schema';
import { eq, and, or, desc, asc, sql, inArray, gt, count, between } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';
import { advancedReputationService } from './advancedReputationService';

export interface CommunityReport {
  id: number;
  reporterId: string;
  targetType: 'post' | 'user' | 'comment' | 'listing';
  targetId: string;
  reportType: string;
  reason: string;
  evidence?: string[];
  status: 'pending' | 'validated' | 'rejected' | 'escalated';
  consensusScore: number;
  reporterWeight: number;
  validationVotes: number;
  rejectionVotes: number;
  createdAt: Date;
  validatedAt?: Date;
}

export interface ConsensusBasedWeight {
  reporterId: string;
  baseWeight: number;
  consensusMultiplier: number;
  accuracyScore: number;
  communityTrust: number;
  expertiseBonus: number;
  finalWeight: number;
}

export interface ReportValidationResult {
  reportId: number;
  isValid: boolean;
  consensusScore: number;
  participatingUsers: number;
  validationReason: string;
  rewards: Array<{
    userId: string;
    amount: number;
    reason: string;
  }>;
  penalties: Array<{
    userId: string;
    amount: number;
    reason: string;
  }>;
}

export interface EnhancedReportingAnalytics {
  totalReports: number;
  validatedReports: number;
  rejectedReports: number;
  consensusRate: number;
  averageTimeToValidation: number;
  topReporters: Array<{
    userId: string;
    reportCount: number;
    accuracyRate: number;
    totalReward: number;
  }>;
  reportingTrends: Array<{
    date: string;
    reports: number;
    validated: number;
    consensusScore: number;
  }>;
}

export class EnhancedCommunityReportingService extends EventEmitter {
  private static instance: EnhancedCommunityReportingService;
  private consensusThreshold = 0.6; // 60% consensus required
  private minimumParticipants = 3; // Minimum users for validation
  private reportingWeightDecay = 0.95; // Daily decay factor
  private expertiseBonusMultiplier = 1.5; // Bonus for subject matter experts

  constructor() {
    super();
  }

  static getInstance(): EnhancedCommunityReportingService {
    if (!EnhancedCommunityReportingService.instance) {
      EnhancedCommunityReportingService.instance = new EnhancedCommunityReportingService();
    }
    return EnhancedCommunityReportingService.instance;
  }

  /**
   * Submit community report with enhanced consensus-based weighting
   */
  async submitEnhancedReport(reportData: {
    reporterId: string;
    targetType: 'post' | 'user' | 'comment' | 'listing';
    targetId: string;
    reportType: string;
    reason: string;
    evidence?: string[];
  }): Promise<CommunityReport> {
    try {
      // Calculate reporter's consensus-based weight
      const reporterWeight = await this.calculateConsensusBasedWeight(reportData.reporterId, reportData.reportType);
      
      // Check if reporter has sufficient weight
      if (reporterWeight.finalWeight < 0.1) {
        throw new Error('Insufficient reputation weight to submit reports');
      }

      // Check for duplicate reports
      const existingReport = await this.findExistingReport(reportData.reporterId, reportData.targetType, reportData.targetId);
      if (existingReport) {
        throw new Error('You have already reported this content');
      }

      // Create report
      const [report] = await db.insert(communityReports).values({
        id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        reporterId: reportData.reporterId,
        targetType: reportData.targetType,
        targetId: reportData.targetId,
        reportType: reportData.reportType,
        reason: reportData.reason,
        evidence: reportData.evidence || [],
        status: 'pending',
        consensusScore: 0,
        reporterWeight: reporterWeight.finalWeight,
        validationVotes: 0,
        rejectionVotes: 0,
        createdAt: new Date()
      }).returning();

      logger.info('Enhanced community report submitted', {
        reportId: report.id,
        reporterId: reportData.reporterId,
        targetType: reportData.targetType,
        targetId: reportData.targetId,
        reporterWeight: reporterWeight.finalWeight
      });

      // Trigger validation process
      this.startConsensusValidation(String(report.id));

      return report;
    } catch (error) {
      logger.error('Failed to submit enhanced community report', { error, reportData });
      throw error;
    }
  }

  /**
   * Calculate consensus-based reporting weight
   */
  async calculateConsensusBasedWeight(reporterId: string, reportType: string): Promise<ConsensusBasedWeight> {
    try {
      // Get reporter's reputation data
      const [reporter] = await db.select()
        .from(userReputationScores)
        .where(eq(userReputationScores.userId, reporterId));

      if (!reporter) {
        return {
          reporterId,
          baseWeight: 0.5,
          consensusMultiplier: 1.0,
          accuracyScore: 0.5,
          communityTrust: 0.5,
          expertiseBonus: 1.0,
          finalWeight: 0.5
        };
      }

      // Base weight from overall reputation score
      const baseWeight = Math.max(0.1, parseFloat(reporter.overallScore) / 100);

      // Calculate accuracy score from reporting history
      const accuracyScore = await this.calculateReporterAccuracy(reporterId);

      // Calculate community trust based on consensus participation
      const communityTrust = await this.calculateCommunityTrust(reporterId);

      // Calculate expertise bonus for specific report types
      const expertiseBonus = await this.calculateExpertiseBonus(reporterId, reportType);

      // Calculate consensus multiplier based on recent validation results
      const consensusMultiplier = await this.calculateConsensusMultiplier(reporterId);

      // Calculate final weight
      const finalWeight = baseWeight * consensusMultiplier * accuracyScore * communityTrust * expertiseBonus;

      return {
        reporterId,
        baseWeight,
        consensusMultiplier,
        accuracyScore,
        communityTrust,
        expertiseBonus,
        finalWeight: Math.min(2.0, finalWeight) // Cap at 2x multiplier
      };
    } catch (error) {
      logger.error('Failed to calculate consensus-based weight', { error, reporterId, reportType });
      throw error;
    }
  }

  /**
   * Start consensus validation process for a report
   */
  private async startConsensusValidation(reportId: number): Promise<void> {
    try {
      const report = await db.query.communityReports.findFirst({
        where: eq(communityReports.id, reportId)
      });

      if (!report) {
        throw new Error(`Report not found: ${reportId}`);
      }

      // Select validators based on reputation and expertise
      const validators = await this.selectConsensusValidators(report.targetType, report.reportType);
      
      if (validators.length < this.minimumParticipants) {
        logger.warn('Insufficient validators for consensus', { 
          reportId, 
          validatorsFound: validators.length,
          minimumRequired: this.minimumParticipants 
        });
        return;
      }

      // Create validation workflow
      await this.createValidationWorkflow(reportId, validators);

      logger.info('Consensus validation started', { 
        reportId, 
        validatorCount: validators.length 
      });
    } catch (error) {
      logger.error('Failed to start consensus validation', { error, reportId });
    }
  }

  /**
   * Select validators for consensus based on reputation and expertise
   */
  private async selectConsensusValidators(targetType: string, reportType: string, limit: number = 10): Promise<Array<{userId: string; weight: number}>> {
    try {
      // Get users with sufficient reputation and no conflicts of interest
      const potentialValidators = await db.select({
        userId: userReputationScores.userId,
        overallScore: userReputationScores.overallScore,
        moderationScore: userReputationScores.moderationScore
      })
      .from(userReputationScores)
      .where(and(
        gt(userReputationScores.overallScore, '60'), // Minimum reputation threshold
        gt(userReputationScores.moderationScore, '50') // Good moderation history
      ))
      .orderBy(desc(userReputationScores.overallScore))
      .limit(limit * 2); // Get more than needed for filtering

      // Filter out users who have interacted with the target
      const validators = [];
      for (const validator of potentialValidators) {
        const hasConflict = await this.checkConflictOfInterest(validator.userId, targetType, reportType);
        if (!hasConflict) {
          const weight = await this.calculateConsensusBasedWeight(validator.userId, reportType);
          validators.push({
            userId: validator.userId,
            weight: weight.finalWeight
          });
        }

        if (validators.length >= limit) break;
      }

      return validators.slice(0, limit);
    } catch (error) {
      logger.error('Failed to select consensus validators', { error, targetType, reportType });
      return [];
    }
  }

  /**
   * Calculate reporter accuracy score
   */
  private async calculateReporterAccuracy(reporterId: string): Promise<number> {
    try {
      // Get reporter's historical reports
      const reports = await db.query.communityReports.findMany({
        where: eq(communityReports.reporterId, reporterId),
        orderBy: desc(communityReports.createdAt),
        limit: 20 // Last 20 reports
      });

      if (reports.length === 0) return 0.5; // Default accuracy for new reporters

      const validatedReports = reports.filter(r => r.status === 'validated').length;
      const totalReports = reports.length;
      
      // Calculate accuracy with time decay
      let weightedAccuracy = 0;
      let totalWeight = 0;
      
      reports.forEach((report, index) => {
        const ageInDays = (Date.now() - report.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        const weight = Math.pow(this.reportingWeightDecay, ageInDays);
        
        const isAccurate = report.status === 'validated' ? 1 : 0;
        weightedAccuracy += isAccurate * weight;
        totalWeight += weight;
      });

      const accuracy = totalWeight > 0 ? weightedAccuracy / totalWeight : 0.5;
      return Math.max(0.1, Math.min(1.0, accuracy));
    } catch (error) {
      logger.error('Failed to calculate reporter accuracy', { error, reporterId });
      return 0.5;
    }
  }

  /**
   * Calculate community trust score
   */
  private async calculateCommunityTrust(reporterId: string): Promise<number> {
    try {
      // Get consensus participation data
      const participationData = await db.select({
        totalValidations: count(),
        agreements: sql<number>`count(case when validation_vote = 'agree' then 1 end)`,
        averageConsensus: sql<number>`avg(consensus_score)`
      })
      .from(reputationChangeEvents)
      .where(eq(reputationChangeEvents.userId, reporterId));

      if (participationData.length === 0 || participationData[0].totalValidations === 0) {
        return 0.5; // Default trust for new users
      }

      const data = participationData[0];
      const agreementRate = data.agreements / data.totalValidations;
      const consensusBonus = Math.min(0.2, (data.averageConsensus || 0) * 0.3);

      return Math.max(0.1, Math.min(1.0, agreementRate + consensusBonus));
    } catch (error) {
      logger.error('Failed to calculate community trust', { error, reporterId });
      return 0.5;
    }
  }

  /**
   * Calculate expertise bonus for specific report types
   */
  private async calculateExpertiseBonus(reporterId: string, reportType: string): Promise<number> {
    try {
      // Get historical reports of the same type
      const sameTypeReports = await db.query.communityReports.findMany({
        where: and(
          eq(communityReports.reporterId, reporterId),
          eq(communityReports.reportType, reportType)
        ),
        orderBy: desc(communityReports.createdAt),
        limit: 10
      });

      if (sameTypeReports.length === 0) return 1.0; // No expertise bonus for new report types

      const validatedSameType = sameTypeReports.filter(r => r.status === 'validated').length;
      const accuracyRate = validatedSameType / sameTypeReports.length;

      // Apply expertise bonus based on accuracy
      if (accuracyRate > 0.8) return this.expertiseBonusMultiplier;
      if (accuracyRate > 0.6) return 1.2;
      return 1.0;
    } catch (error) {
      logger.error('Failed to calculate expertise bonus', { error, reporterId, reportType });
      return 1.0;
    }
  }

  /**
   * Calculate consensus multiplier based on recent validation results
   */
  private async calculateConsensusMultiplier(reporterId: string): Promise<number> {
    try {
      // Get recent consensus participation
      const recentParticipation = await db.query.reputationChangeEvents.findMany({
        where: and(
          eq(reputationChangeEvents.userId, reporterId),
          gt(reputationChangeEvents.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
        ),
        orderBy: desc(reputationChangeEvents.createdAt),
        limit: 5
      });

      if (recentParticipation.length === 0) return 1.0;

      // Calculate average consensus alignment
      const averageConsensus = recentParticipation.reduce((sum, event) => {
        return sum + (event.metadata?.consensusScore || 0.5);
      }, 0) / recentParticipation.length;

      // Multiplier based on consensus alignment
      return Math.max(0.8, Math.min(1.3, 0.7 + (averageConsensus * 0.6)));
    } catch (error) {
      logger.error('Failed to calculate consensus multiplier', { error, reporterId });
      return 1.0;
    }
  }

  /**
   * Create validation workflow for consensus-based validation
   */
  private async createValidationWorkflow(reportId: number, validators: Array<{userId: string; weight: number}>): Promise<void> {
    try {
      // Create workflow instance
      const [workflowInstance] = await db.insert(workflowInstances).values({
        id: `validation-${reportId}`,
        templateId: 'community-report-validation',
        status: 'pending',
        priority: 5,
        contextData: {
          reportId,
          validators: validators.map(v => ({ userId: v.userId, weight: v.weight })),
          consensusThreshold: this.consensusThreshold,
          minimumParticipants: this.minimumParticipants
        }
      }).returning();

      // Create validation steps for each validator
      for (const validator of validators) {
        await db.insert(workflowStepExecutions).values({
          instanceId: workflowInstance.id,
          stepId: 'validate-report',
          status: 'pending',
          inputData: {
            reportId,
            validatorId: validator.userId,
            validatorWeight: validator.weight,
            validationDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          }
        });
      }

      logger.info('Validation workflow created', { 
        workflowInstanceId: workflowInstance.id,
        reportId,
        validatorCount: validators.length 
      });
    } catch (error) {
      logger.error('Failed to create validation workflow', { error, reportId });
    }
  }

  /**
   * Process validation result and calculate consensus
   */
  async processValidationResult(reportId: number, validatorVotes: Array<{userId: string; vote: 'validate' | 'reject'; weight: number}>): Promise<ReportValidationResult> {
    try {
      const report = await db.query.communityReports.findFirst({
        where: eq(communityReports.id, reportId)
      });

      if (!report) {
        throw new Error(`Report not found: ${reportId}`);
      }

      // Calculate weighted consensus
      let totalValidationWeight = 0;
      let totalRejectionWeight = 0;
      let participatingUsers = 0;

      validatorVotes.forEach(vote => {
        if (vote.vote === 'validate') {
          totalValidationWeight += vote.weight;
        } else {
          totalRejectionWeight += vote.weight;
        }
        participatingUsers++;
      });

      const totalWeight = totalValidationWeight + totalRejectionWeight;
      const consensusScore = totalWeight > 0 ? totalValidationWeight / totalWeight : 0;
      const isValid = consensusScore >= this.consensusThreshold && participatingUsers >= this.minimumParticipants;

      // Determine validation reason
      let validationReason = '';
      if (!isValid && participatingUsers < this.minimumParticipants) {
        validationReason = 'Insufficient participation for consensus';
      } else if (!isValid) {
        validationReason = 'Consensus threshold not met';
      } else {
        validationReason = `Consensus achieved with ${(consensusScore * 100).toFixed(1)}% validation rate`;
      }

      // Calculate rewards and penalties
      const rewards: Array<{userId: string; amount: number; reason: string}> = [];
      const penalties: Array<{userId: string; amount: number; reason: string}> = [];

      validatorVotes.forEach(vote => {
        if (isValid && vote.vote === 'validate') {
          // Reward accurate validators
          const rewardAmount = Math.round(vote.weight * 2); // 2 points per weight unit
          rewards.push({
            userId: vote.userId,
            amount: rewardAmount,
            reason: 'Accurate report validation'
          });
        } else if (!isValid && vote.vote === 'reject') {
          // Reward accurate rejectors
          const rewardAmount = Math.round(vote.weight * 1.5);
          rewards.push({
            userId: vote.userId,
            amount: rewardAmount,
            reason: 'Accurate report rejection'
          });
        } else {
          // Penalize inaccurate validators
          const penaltyAmount = Math.round(vote.weight * 0.5); // Smaller penalty
          penalties.push({
            userId: vote.userId,
            amount: penaltyAmount,
            reason: 'Inaccurate validation'
          });
        }
      });

      // Apply rewards and penalties
      await this.applyValidationRewardsAndPenalties(rewards, penalties);

      // Update report status
      await db.update(communityReports)
        .set({
          status: isValid ? 'validated' : 'rejected',
          consensusScore,
          validationVotes: totalValidationWeight > 0 ? Math.round(totalValidationWeight) : 0,
          rejectionVotes: totalRejectionWeight > 0 ? Math.round(totalRejectionWeight) : 0,
          validatedAt: new Date()
        })
        .where(eq(communityReports.id, reportId));

      // Reward/punish original reporter
      if (isValid) {
        await advancedReputationService.applyAdvancedReputationChange(
          report.reporterId,
          'helpful_report',
          Math.round(10 * parseFloat(report.reporterWeight || '1')),
          'Community report validated by consensus',
          { reportId, consensusScore, participatingUsers }
        );
      } else {
        await advancedReputationService.applyAdvancedReputationChange(
          report.reporterId,
          'false_report',
          Math.round(-5 * report.reporterWeight),
          'Community report rejected by consensus',
          { reportId, consensusScore, participatingUsers }
        );
      }

      logger.info('Validation result processed', {
        reportId,
        isValid,
        consensusScore,
        participatingUsers,
        rewardsCount: rewards.length,
        penaltiesCount: penalties.length
      });

      return {
        reportId,
        isValid,
        consensusScore,
        participatingUsers,
        validationReason,
        rewards,
        penalties
      };
    } catch (error) {
      logger.error('Failed to process validation result', { error, reportId });
      throw error;
    }
  }

  /**
   * Apply validation rewards and penalties
   */
  private async applyValidationRewardsAndPenalties(
    rewards: Array<{userId: string; amount: number; reason: string}>,
    penalties: Array<{userId: string; amount: number; reason: string}>
  ): Promise<void> {
    try {
      // Apply rewards
      for (const reward of rewards) {
        await advancedReputationService.applyAdvancedReputationChange(
          reward.userId,
          'validation_reward',
          reward.amount,
          reward.reason,
          { rewardType: 'validation' }
        );
      }

      // Apply penalties
      for (const penalty of penalties) {
        await advancedReputationService.applyAdvancedReputationChange(
          penalty.userId,
          'validation_penalty',
          penalty.amount,
          penalty.reason,
          { penaltyType: 'validation' }
        );
      }
    } catch (error) {
      logger.error('Failed to apply validation rewards and penalties', { error, rewards, penalties });
    }
  }

  /**
   * Get enhanced reporting analytics
   */
  async getEnhancedReportingAnalytics(timeRange: {start: Date; end: Date}): Promise<EnhancedReportingAnalytics> {
    try {
      // Get basic statistics
      const [totalReports] = await db
        .select({ count: count() })
        .from(communityReports)
        .where(between(communityReports.createdAt, timeRange.start, timeRange.end));

      const [validatedReports] = await db
        .select({ count: count() })
        .from(communityReports)
        .where(and(
          eq(communityReports.status, 'validated'),
          between(communityReports.createdAt, timeRange.start, timeRange.end)
        ));

      const [rejectedReports] = await db
        .select({ count: count() })
        .from(communityReports)
        .where(and(
          eq(communityReports.status, 'rejected'),
          between(communityReports.createdAt, timeRange.start, timeRange.end)
        ));

      // Calculate consensus rate
      const consensusRate = totalReports.count > 0 ? 
        (validatedReports.count / totalReports.count) * 100 : 0;

      // Get top reporters
      const topReporters = await db.select({
        userId: communityReports.reporterId,
        reportCount: count(),
        accuracyRate: sql<number>`sum(case when status = 'validated' then 1 else 0 end) / count(*)`,
        totalReward: sql<number>`sum(case when status = 'validated' then 10 else 0 end)`
      })
      .from(communityReports)
      .where(between(communityReports.createdAt, timeRange.start, timeRange.end))
      .groupBy(communityReports.reporterId)
      .orderBy(desc(count()))
      .limit(10);

      // Get reporting trends
      const reportingTrends = await db.select({
        date: sql<string>`date_trunc('day', ${communityReports.createdAt})::text`,
        reports: count(),
        validated: sql<number>`sum(case when status = 'validated' then 1 else 0 end)`,
        consensusScore: sql<number>`avg(consensus_score)`
      })
      .from(communityReports)
      .where(between(communityReports.createdAt, timeRange.start, timeRange.end))
      .groupBy(sql`date_trunc('day', ${communityReports.createdAt})`)
      .orderBy(asc(sql`date_trunc('day', ${communityReports.createdAt})`));

      // Calculate average time to validation
      const validationTimes = await db.select({
        validationTime: sql<number>`extract(epoch from (validated_at - created_at))`
      })
      .from(communityReports)
      .where(and(
        eq(communityReports.status, 'validated'),
        between(communityReports.createdAt, timeRange.start, timeRange.end),
        sql`${communityReports.validatedAt} is not null`
      ));

      const averageTimeToValidation = validationTimes.length > 0 ?
        validationTimes.reduce((sum, vt) => sum + (vt.validationTime || 0), 0) / validationTimes.length / 3600 : 0; // Convert to hours

      return {
        totalReports: totalReports.count,
        validatedReports: validatedReports.count,
        rejectedReports: rejectedReports.count,
        consensusRate,
        averageTimeToValidation,
        topReporters: topReporters.map(reporter => ({
          userId: reporter.userId,
          reportCount: reporter.reportCount,
          accuracyRate: reporter.accuracyRate || 0,
          totalReward: reporter.totalReward || 0
        })),
        reportingTrends: reportingTrends.map(trend => ({
          date: trend.date,
          reports: trend.reports,
          validated: trend.validated || 0,
          consensusScore: trend.consensusScore || 0
        }))
      };
    } catch (error) {
      logger.error('Failed to get enhanced reporting analytics', { error, timeRange });
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private async findExistingReport(reporterId: string, targetType: string, targetId: string): Promise<CommunityReport | null> {
    const [existing] = await db.select()
      .from(communityReports)
      .where(and(
        eq(communityReports.reporterId, reporterId),
        eq(communityReports.targetType, targetType),
        eq(communityReports.targetId, targetId),
        eq(communityReports.status, 'pending')
      ))
      .limit(1);
    
    return existing || null;
  }

  private async checkConflictOfInterest(userId: string, targetType: string, targetId: string): Promise<boolean> {
    // Check if user has interacted with the target content
    // This is a simplified implementation
    try {
      // Check if user created the content
      if (targetType === 'post' || targetType === 'comment') {
        const [content] = await db.select()
          .from(users) // This would query the appropriate content table
          .where(eq(users.id, targetId))
          .limit(1);
        
        if (content && 'userId' in content && content.userId === userId) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to check conflict of interest', { error, userId, targetType, targetId });
      return true; // Assume conflict on error
    }
  }
}

export const enhancedCommunityReportingService = EnhancedCommunityReportingService.getInstance();