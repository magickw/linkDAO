import { db } from '../db';
import { 
  userReputationScores, 
  reputationChangeEvents, 
  reputationPenalties, 
  reputationThresholds,
  users,
  reputationHistory,
  workflowInstances
} from '../db/schema';
import { eq, and, desc, asc, sql, inArray, gt, lte, between } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';
import { AdminWebSocketService } from './adminWebSocketService';

export interface AdvancedReputationImpact {
  baseImpact: number;
  timeDecayFactor: number;
  contextualMultiplier: number;
  networkEffect: number;
  predictedImpact: number;
  confidence: number;
}

export interface RealTimeReputationUpdate {
  userId: string;
  previousScore: number;
  newScore: number;
  change: number;
  reason: string;
  timestamp: Date;
  impactAnalysis: AdvancedReputationImpact;
}

export interface BulkReputationOperation {
  operationId: string;
  userIds: string[];
  operationType: 'adjustment' | 'penalty' | 'restoration';
  changes: Record<string, number>;
  justification: string;
  performedBy: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  createdAt: Date;
  completedAt?: Date;
  rollbackData?: Record<string, any>;
}

export interface ReputationAnalytics {
  userId: string;
  currentScore: number;
  scoreTrend: Array<{ date: string; score: number }>;
  volatility: number;
  anomalyScore: number;
  prediction: {
    nextMonthScore: number;
    confidence: number;
    riskFactors: string[];
  };
  networkInfluence: {
    influenceScore: number;
    connectedUsers: number;
    averagePeerScore: number;
  };
}

export interface ProgressivePenaltyConfig {
  violationType: string;
  severityLevels: Array<{
    level: number;
    threshold: number;
    basePenalty: number;
    escalationMultiplier: number;
    recoveryTimeDays: number;
  }>;
  escalationRules: Array<{
    condition: string;
    multiplier: number;
    description: string;
  }>;
  recoveryConfig: {
    baseRecoveryRate: number;
    goodBehaviorBonus: number;
    timeDecayFactor: number;
  };
}

export class AdvancedReputationService extends EventEmitter {
  private static instance: AdvancedReputationService;
  private impactCache = new Map<string, { data: AdvancedReputationImpact; timestamp: number }>();
  private bulkOperations = new Map<string, BulkReputationOperation>();
  private readonly IMPACT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly NETWORK_INFLUENCE_RADIUS = 3; // Degrees of separation

  constructor() {
    super();
    this.initializeRealTimeUpdates();
  }

  static getInstance(): AdvancedReputationService {
    if (!AdvancedReputationService.instance) {
      AdvancedReputationService.instance = new AdvancedReputationService();
    }
    return AdvancedReputationService.instance;
  }

  /**
   * Calculate advanced reputation impact with time decay, contextual multipliers, and network effects
   */
  async calculateAdvancedImpact(
    userId: string,
    eventType: string,
    eventData: Record<string, any>,
    context: Record<string, any> = {}
  ): Promise<AdvancedReputationImpact> {
    try {
      const cacheKey = `${userId}:${eventType}:${JSON.stringify(eventData)}`;
      
      // Check cache first
      const cached = this.impactCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.IMPACT_CACHE_TTL) {
        return cached.data;
      }

      // Get user reputation data
      const userReputation = await this.getUserReputationData(userId);
      if (!userReputation) {
        throw new Error(`User reputation not found: ${userId}`);
      }

      // Calculate base impact
      const baseImpact = await this.calculateBaseImpact(eventType, eventData, userReputation);
      
      // Apply time decay factor
      const timeDecayFactor = await this.calculateTimeDecayFactor(userId, eventType);
      
      // Calculate contextual multiplier
      const contextualMultiplier = await this.calculateContextualMultiplier(
        eventType, eventData, context, userReputation
      );
      
      // Calculate network effect
      const networkEffect = await this.calculateNetworkEffect(userId, eventType, eventData);
      
      // Predict future impact using ML model
      const { predictedImpact, confidence } = await this.predictFutureImpact(
        userId, eventType, eventData, context
      );

      const impact: AdvancedReputationImpact = {
        baseImpact,
        timeDecayFactor,
        contextualMultiplier,
        networkEffect,
        predictedImpact,
        confidence
      };

      // Cache the result
      this.impactCache.set(cacheKey, { data: impact, timestamp: Date.now() });
      
      return impact;
    } catch (error) {
      logger.error('Failed to calculate advanced reputation impact', { error, userId, eventType, eventData });
      throw error;
    }
  }

  /**
   * Apply reputation change with advanced impact calculation and real-time updates
   */
  async applyAdvancedReputationChange(
    userId: string,
    eventType: string,
    scoreChange: number,
    reason: string,
    eventData: Record<string, any> = {},
    context: Record<string, any> = {},
    performedBy?: string
  ): Promise<RealTimeReputationUpdate> {
    try {
      // Calculate advanced impact
      const impactAnalysis = await this.calculateAdvancedImpact(userId, eventType, eventData, context);
      
      // Apply impact multipliers to base score change
      const adjustedScoreChange = Math.round(
        scoreChange * 
        impactAnalysis.timeDecayFactor * 
        impactAnalysis.contextualMultiplier * 
        impactAnalysis.networkEffect
      );

      // Get current reputation
      const currentReputation = await this.getUserReputationData(userId);
      const previousScore = Number(currentReputation?.overallScore || 50);
      const newScore = Math.max(0, Math.min(100, previousScore + adjustedScoreChange));

      // Create reputation change event
      await db.insert(reputationChangeEvents).values({
        userId,
        eventType,
        scoreChange: adjustedScoreChange,
        previousScore,
        newScore,
        description: reason,
        metadata: {
          context,
          performedBy
        }
      });

      // Update user reputation score
      await db.update(userReputationScores)
        .set({
          overallScore: newScore,
          lastUpdated: new Date()
        })
        .where(eq(userReputationScores.userId, userId));

      // Create real-time update
      const update: RealTimeReputationUpdate = {
        userId,
        previousScore: Number(previousScore),
        newScore: Number(newScore),
        change: adjustedScoreChange,
        reason,
        timestamp: new Date(),
        impactAnalysis
      };

      // Emit real-time update
      this.emit('reputationUpdated', update);
      
      // Send WebSocket notification
      await this.sendRealTimeNotification(update);

      logger.info('Advanced reputation change applied', {
        userId,
        eventType,
        previousScore,
        newScore,
        change: adjustedScoreChange,
        impactAnalysis
      });

      return update;
    } catch (error) {
      logger.error('Failed to apply advanced reputation change', { error, userId, eventType, scoreChange });
      throw error;
    }
  }

  /**
   * Perform bulk reputation operation with rollback capability
   */
  async performBulkReputationOperation(
    operation: Omit<BulkReputationOperation, 'operationId' | 'createdAt' | 'status'>
  ): Promise<BulkReputationOperation> {
    const operationId = `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Create operation record
      const bulkOperation: BulkReputationOperation = {
        ...operation,
        operationId,
        status: 'pending',
        createdAt: new Date()
      };

      this.bulkOperations.set(operationId, bulkOperation);

      // Start operation in background
      this.processBulkOperation(operationId).catch(error => {
        logger.error('Bulk operation failed', { error, operationId });
        this.updateBulkOperationStatus(operationId, 'failed', error.message);
      });

      logger.info('Bulk reputation operation initiated', { operationId, userCount: operation.userIds.length });
      
      return bulkOperation;
    } catch (error) {
      logger.error('Failed to initiate bulk reputation operation', { error, operationId });
      throw error;
    }
  }

  /**
   * Get advanced reputation analytics with trend analysis and anomaly detection
   */
  async getAdvancedReputationAnalytics(userId: string): Promise<ReputationAnalytics> {
    try {
      // Get current score
      const currentReputation = await this.getUserReputationData(userId);
      const currentScore = Number(currentReputation?.overallScore || 50);

      // Get score trend over last 30 days
      const scoreTrend = await this.calculateScoreTrend(userId, 30);

      // Calculate volatility
      const volatility = this.calculateVolatility(scoreTrend);

      // Detect anomalies
      const anomalyScore = await this.detectAnomalies(userId, scoreTrend);

      // Predict future score
      const prediction = await this.predictFutureScore(userId, scoreTrend);

      // Calculate network influence
      const networkInfluence = await this.calculateNetworkInfluence(userId);

      return {
        userId,
        currentScore,
        scoreTrend,
        volatility,
        anomalyScore,
        prediction,
        networkInfluence
      };
    } catch (error) {
      logger.error('Failed to get advanced reputation analytics', { error, userId });
      throw error;
    }
  }

  /**
   * Configure progressive penalty system
   */
  async configureProgressivePenalty(config: ProgressivePenaltyConfig): Promise<void> {
    try {
      // Store penalty configuration
      await db.insert(reputationPenalties).values({
        userId: config.userId || '00000000-0000-0000-0000-000000000000', // Default UUID
        penaltyType: config.violationType,
        severityLevel: 1,
        violationCount: 1,
        description: `Progressive penalty for ${config.violationType}`,
        isActive: true
      });

      logger.info('Progressive penalty system configured', { violationType: config.violationType });
    } catch (error) {
      logger.error('Failed to configure progressive penalty', { error, violationType: config.violationType });
      throw error;
    }
  }

  /**
   * Apply progressive penalty with dynamic escalation
   */
  async applyProgressivePenalty(
    userId: string,
    violationType: string,
    violationData: Record<string, any>,
    context: Record<string, any> = {}
  ): Promise<RealTimeReputationUpdate> {
    try {
      // Get penalty configuration
      const penaltyConfig = await db.query.reputationPenalties.findFirst({
        where: and(
          eq(reputationPenalties.violationType, violationType),
          eq(reputationPenalties.isActive, true)
        )
      });

      if (!penaltyConfig) {
        throw new Error(`No progressive penalty configuration found for violation type: ${violationType}`);
      }

      // Get user's violation history
      const violationHistory = await this.getUserViolationHistory(userId, violationType);
      const violationCount = violationHistory.length;

      // Determine severity level
      const severityLevel = this.determineSeverityLevel(violationCount, penaltyConfig.severityConfig);
      
      // Calculate base penalty
      let basePenalty = severityLevel.basePenalty;
      
      // Apply escalation rules
      const escalationMultiplier = this.calculateEscalationMultiplier(violationData, penaltyConfig.escalationRules);
      basePenalty = Math.round(basePenalty * escalationMultiplier);

      // Apply penalty with advanced impact calculation
      const result = await this.applyAdvancedReputationChange(
        userId,
        'violation_penalty',
        -basePenalty,
        `Progressive penalty for ${violationType} (Level ${severityLevel.level})`,
        violationData,
        {
          ...context,
          violationType,
          severityLevel: severityLevel.level,
          violationCount,
          escalationMultiplier
        }
      );

      // Schedule penalty recovery
      await this.schedulePenaltyRecovery(userId, violationType, severityLevel.recoveryTimeDays);

      return result;
    } catch (error) {
      logger.error('Failed to apply progressive penalty', { error, userId, violationType });
      throw error;
    }
  }

  // Private helper methods
  private async getUserReputationData(userId: string) {
    const [reputation] = await db.select()
      .from(userReputationScores)
      .where(eq(userReputationScores.userId, userId))
      .limit(1);
    return reputation;
  }

  private async calculateBaseImpact(eventType: string, eventData: Record<string, any>, userReputation: any): Promise<number> {
    // Base impact calculation based on event type and user reputation
    const impactMap: Record<string, number> = {
      'policy_violation': -10,
      'helpful_report': 5,
      'false_report': -15,
      'successful_appeal': 8,
      'jury_service': 3,
      'community_contribution': 6
    };

    return impactMap[eventType] || 0;
  }

  private async calculateTimeDecayFactor(userId: string, eventType: string): Promise<number> {
    // Calculate time decay based on recent events
    const recentEvents = await db.query.reputationChangeEvents.findMany({
      where: and(
        eq(reputationChangeEvents.userId, userId),
        eq(reputationChangeEvents.eventType, eventType),
        gt(reputationChangeEvents.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
      ),
      orderBy: desc(reputationChangeEvents.createdAt),
      limit: 10
    });

    if (recentEvents.length === 0) return 1.0;

    // Apply time decay (recent events have less impact)
    const decayFactor = Math.max(0.5, 1.0 - (recentEvents.length * 0.1));
    return decayFactor;
  }

  private async calculateContextualMultiplier(
    eventType: string, 
    eventData: Record<string, any>, 
    context: Record<string, any>,
    userReputation: any
  ): Promise<number> {
    let multiplier = 1.0;

    // Adjust based on user reputation tier
    if (userReputation.overallScore >= 80) multiplier *= 0.8; // High reputation users get less penalty
    if (userReputation.overallScore <= 20) multiplier *= 1.2; // Low reputation users get more penalty

    // Adjust based on transaction value
    if (eventData.transactionValue) {
      const value = parseFloat(eventData.transactionValue);
      if (value > 1000) multiplier *= 1.5;
      else if (value > 100) multiplier *= 1.2;
    }

    // Adjust based on user history
    if (context.userHistory) {
      const history = context.userHistory;
      if (history.previousViolations > 3) multiplier *= 1.3;
      if (history.successfulAppeals > 5) multiplier *= 0.9;
    }

    return Math.max(0.1, Math.min(3.0, multiplier));
  }

  private async calculateNetworkEffect(userId: string, eventType: string, eventData: Record<string, any>): Promise<number> {
    // Calculate network effect based on connected users
    // This is a simplified implementation - in production, this would use graph analysis
    const connectedUsers = await this.getConnectedUsers(userId, this.NETWORK_INFLUENCE_RADIUS);
    
    if (connectedUsers.length === 0) return 1.0;

    const averageConnectedScore = connectedUsers.reduce((sum, user) => sum + (user.reputationScore || 50), 0) / connectedUsers.length;
    const networkEffect = 1.0 + ((averageConnectedScore - 50) / 100) * 0.2; // ±20% based on network

    return Math.max(0.8, Math.min(1.2, networkEffect));
  }

  private async predictFutureImpact(
    userId: string,
    eventType: string,
    eventData: Record<string, any>,
    context: Record<string, any>
  ): Promise<{ predictedImpact: number; confidence: number }> {
    // Simple prediction model - in production, this would use ML
    const historicalEvents = await this.getUserReputationHistory(userId, 90); // Last 90 days
    
    if (historicalEvents.length < 5) {
      return { predictedImpact: 0, confidence: 0.3 }; // Low confidence for new users
    }

    // Calculate trend
    const recentEvents = historicalEvents.slice(-10);
    const scoreChanges = recentEvents.map(e => e.scoreChange);
    const averageChange = scoreChanges.reduce((sum, change) => sum + change, 0) / scoreChanges.length;
    
    // Predict based on trend and current event
    const predictedImpact = averageChange * 0.7; // 70% weight on historical trend
    const confidence = Math.min(0.9, historicalEvents.length / 20); // Confidence increases with more data

    return { predictedImpact, confidence };
  }

  private async getConnectedUsers(userId: string, radius: number): Promise<Array<{userId: string; reputationScore: number}>> {
    // Simplified network analysis - in production, this would use graph database
    // For now, return users who have interacted with the same content/disputes
    const interactions = await db.query.reputationChangeEvents.findMany({
      where: eq(reputationChangeEvents.userId, userId),
      limit: 10
    });

    // This is a placeholder - real implementation would analyze transaction graphs
    return [];
  }

  private async getUserReputationHistory(userId: string, days: number) {
    return await db.query.reputationChangeEvents.findMany({
      where: and(
        eq(reputationChangeEvents.userId, userId),
        gt(reputationChangeEvents.createdAt, new Date(Date.now() - days * 24 * 60 * 60 * 1000))
      ),
      orderBy: desc(reputationChangeEvents.createdAt)
    });
  }

  private async getUserViolationHistory(userId: string, violationType: string) {
    return await db.query.reputationChangeEvents.findMany({
      where: and(
        eq(reputationChangeEvents.userId, userId),
        eq(reputationChangeEvents.eventType, 'violation_penalty'),
        gt(reputationChangeEvents.createdAt, new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)) // Last year
      ),
      orderBy: desc(reputationChangeEvents.createdAt)
    });
  }

  private determineSeverityLevel(violationCount: number, severityConfig: any[]): any {
    for (const level of severityConfig) {
      if (violationCount >= level.threshold) {
        return level;
      }
    }
    return severityConfig[0]; // Default to first level
  }

  private calculateEscalationMultiplier(violationData: Record<string, any>, escalationRules: any[]): number {
    let multiplier = 1.0;
    
    for (const rule of escalationRules) {
      if (this.evaluateEscalationCondition(rule.condition, violationData)) {
        multiplier *= rule.multiplier;
      }
    }
    
    return multiplier;
  }

  private evaluateEscalationCondition(condition: string, data: Record<string, any>): boolean {
    // Simple condition evaluation - in production, this would be more sophisticated
    try {
      // This is a placeholder - real implementation would use a proper expression evaluator
      return condition.includes('repeat_offender') && data.repeatOffender === true;
    } catch {
      return false;
    }
  }

  private async schedulePenaltyRecovery(userId: string, violationType: string, recoveryTimeDays: number): Promise<void> {
    // Schedule automatic penalty recovery
    // In production, this would use a job queue system
    setTimeout(async () => {
      try {
        await this.applyAdvancedReputationChange(
          userId,
          'penalty_recovery',
          5, // Small recovery bonus
          `Automatic penalty recovery for ${violationType}`,
          { violationType, recoveryTimeDays }
        );
      } catch (error) {
        logger.error('Failed to apply scheduled penalty recovery', { error, userId, violationType });
      }
    }, recoveryTimeDays * 24 * 60 * 60 * 1000);
  }

  private async processBulkOperation(operationId: string): Promise<void> {
    const operation = this.bulkOperations.get(operationId);
    if (!operation) return;

    try {
      this.updateBulkOperationStatus(operationId, 'in_progress');

      const rollbackData: Record<string, any> = {};
      const errors: string[] = [];

      for (const userId of operation.userIds) {
        try {
          // Get current reputation for rollback
          const currentReputation = await this.getUserReputationData(userId);
          rollbackData[userId] = {
            previousScore: currentReputation?.overallScore || 50,
            previousData: currentReputation
          };

          // Apply change
          const change = operation.changes[userId] || 0;
          await this.applyAdvancedReputationChange(
            userId,
            `bulk_${operation.operationType}`,
            change,
            operation.justification,
            { bulkOperationId: operationId },
            { performedBy: operation.performedBy }
          );
        } catch (error) {
          logger.error('Failed to apply bulk operation to user', { error, userId, operationId });
          errors.push(`User ${userId}: ${error.message}`);
        }
      }

      // Update operation with rollback data
      operation.rollbackData = rollbackData;
      operation.status = errors.length > 0 ? 'completed_with_errors' : 'completed';
      operation.completedAt = new Date();

      if (errors.length > 0) {
        logger.warn('Bulk operation completed with errors', { operationId, errorCount: errors.length });
      }

      this.updateBulkOperationStatus(operationId, operation.status as any);
    } catch (error) {
      logger.error('Bulk operation failed', { error, operationId });
      this.updateBulkOperationStatus(operationId, 'failed', error.message);
    }
  }

  private updateBulkOperationStatus(operationId: string, status: string, error?: string): void {
    const operation = this.bulkOperations.get(operationId);
    if (operation) {
      operation.status = status as any;
      if (error) {
        operation.error = error;
      }
      this.bulkOperations.set(operationId, operation);
      this.emit('bulkOperationStatusChanged', { operationId, status, error });
    }
  }

  private async calculateScoreTrend(userId: string, days: number): Promise<Array<{ date: string; score: number }>> {
    const history = await this.getUserReputationHistory(userId, days);
    const trendMap = new Map<string, number>();

    // Group by date and calculate average score for each day
    history.forEach(event => {
      const date = event.createdAt.toISOString().split('T')[0];
      trendMap.set(date, event.newScore);
    });

    return Array.from(trendMap.entries())
      .map(([date, score]) => ({ date, score }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateVolatility(scoreTrend: Array<{ date: string; score: number }>): number {
    if (scoreTrend.length < 2) return 0;

    const changes = [];
    for (let i = 1; i < scoreTrend.length; i++) {
      changes.push(Math.abs(scoreTrend[i].score - scoreTrend[i-1].score));
    }

    const averageChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    return Math.min(1.0, averageChange / 10); // Normalize to 0-1 scale
  }

  private async detectAnomalies(userId: string, scoreTrend: Array<{ date: string; score: number }>): Promise<number> {
    if (scoreTrend.length < 5) return 0;

    // Simple anomaly detection using standard deviation
    const scores = scoreTrend.map(t => t.score);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Check for recent anomalies
    const recentScores = scores.slice(-3);
    let anomalyScore = 0;
    
    recentScores.forEach(score => {
      const zScore = Math.abs(score - mean) / (stdDev || 1);
      if (zScore > 2) anomalyScore += zScore - 2;
    });

    return Math.min(1.0, anomalyScore / 3);
  }

  private async predictFutureScore(userId: string, scoreTrend: Array<{ date: string; score: number }>): Promise<{ nextMonthScore: number; confidence: number; riskFactors: string[] }> {
    if (scoreTrend.length < 7) {
      return { nextMonthScore: 50, confidence: 0.2, riskFactors: ['insufficient_data'] };
    }

    // Simple linear regression for prediction
    const n = scoreTrend.length;
    const sumX = scoreTrend.reduce((sum, _, index) => sum + index, 0);
    const sumY = scoreTrend.reduce((sum, trend) => sum + trend.score, 0);
    const sumXY = scoreTrend.reduce((sum, trend, index) => sum + index * trend.score, 0);
    const sumXX = scoreTrend.reduce((sum, _, index) => sum + index * index, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict next month (30 days)
    const nextMonthScore = Math.max(0, Math.min(100, intercept + slope * (n + 30)));
    
    // Calculate confidence based on trend consistency
    const volatility = this.calculateVolatility(scoreTrend);
    const confidence = Math.max(0.1, Math.min(0.9, 1.0 - volatility));

    // Identify risk factors
    const riskFactors: string[] = [];
    if (volatility > 0.5) riskFactors.push('high_volatility');
    if (scoreTrend.slice(-3).every(t => t.score < 30)) riskFactors.push('recent_low_scores');
    if (slope < -0.5) riskFactors.push('declining_trend');

    return { nextMonthScore, confidence, riskFactors };
  }

  private async calculateNetworkInfluence(userId: string): Promise<{ influenceScore: number; connectedUsers: number; averagePeerScore: number }> {
    // Simplified network influence calculation
    const connectedUsers = await this.getConnectedUsers(userId, this.NETWORK_INFLUENCE_RADIUS);
    
    if (connectedUsers.length === 0) {
      return { influenceScore: 0, connectedUsers: 0, averagePeerScore: 50 };
    }

    const averagePeerScore = connectedUsers.reduce((sum, user) => sum + (user.reputationScore || 50), 0) / connectedUsers.length;
    
    // Influence score based on number of connections and average peer score
    const influenceScore = Math.min(100, (connectedUsers.length * 5) + (averagePeerScore - 50));

    return {
      influenceScore: Math.max(0, influenceScore),
      connectedUsers: connectedUsers.length,
      averagePeerScore
    };
  }

  private initializeRealTimeUpdates(): void {
    // Set up event listeners for real-time updates
    this.on('reputationUpdated', (update: RealTimeReputationUpdate) => {
      // This would integrate with WebSocket service in production
      logger.info('Real-time reputation update emitted', { update });
    });
  }

  private async sendRealTimeNotification(update: RealTimeReputationUpdate): Promise<void> {
    try {
      // Send WebSocket notification
      await adminWebSocketService.broadcastToUser(update.userId, {
        type: 'reputation_update',
        data: {
          walletAddress: update.walletAddress,
          previousScore: update.previousScore,
          newScore: update.newScore,
          change: update.change,
          reason: update.reason,
          timestamp: update.timestamp
        }
      });

      // Store notification for persistence
      // This would integrate with notification service in production
    } catch (error) {
      logger.error('Failed to send real-time reputation notification', { error, update });
    }
  }
}

export const advancedReputationService = AdvancedReputationService.getInstance();