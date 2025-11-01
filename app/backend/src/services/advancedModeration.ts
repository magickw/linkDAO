/**
 * Advanced Content Reporting and Moderation System
 * Includes ML-based abuse detection and reputation-weighted reporting
 */

import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { blockchainService } from './blockchainIntegration';

export interface ContentReport {
  id: string;
  contentId: string;
  contentType: 'post' | 'comment' | 'user' | 'community';
  reporterId: string;
  reporterAddress: string;
  reason: string;
  category: 'spam' | 'harassment' | 'hate_speech' | 'violence' | 'adult_content' | 'misinformation' | 'other';
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  reporterReputation: number;
  mlScore?: number; // ML-based severity score
  createdAt: Date;
}

export interface ModerationAction {
  id: string;
  reportId: string;
  moderatorId: string;
  action: 'approve' | 'remove' | 'warn' | 'ban' | 'dismiss';
  reason: string;
  createdAt: Date;
}

export interface AbuseDetectionResult {
  isAbusive: boolean;
  confidence: number;
  categories: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedAction: 'flag' | 'auto_remove' | 'escalate';
}

export class AdvancedModerationService {
  /**
   * Submit a content report with reputation weighting
   */
  async submitReport(
    contentId: string,
    contentType: ContentReport['contentType'],
    reporterId: string,
    reporterAddress: string,
    category: ContentReport['category'],
    reason: string,
    description?: string
  ): Promise<ContentReport> {
    try {
      // Get reporter's reputation from blockchain
      const reputation = await blockchainService.getUserReputation(reporterAddress);

      // Calculate priority based on reputation and category
      const priority = this.calculateReportPriority(category, reputation);

      // Check for duplicate reports
      const existingReports = await this.getReportsByContent(contentId);
      const isDuplicate = existingReports.some(r => r.reporterId === reporterId);

      if (isDuplicate) {
        throw new Error('You have already reported this content');
      }

      // Create report
      const report: ContentReport = {
        id: this.generateId(),
        contentId,
        contentType,
        reporterId,
        reporterAddress,
        reason,
        category,
        description,
        priority,
        status: 'pending',
        reporterReputation: reputation,
        createdAt: new Date(),
      };

      // Run ML-based abuse detection
      const mlResult = await this.detectAbuse(reason, description || '');
      report.mlScore = mlResult.confidence;

      // Auto-escalate if ML detects high-severity abuse
      if (mlResult.severity === 'critical' && mlResult.confidence > 0.9) {
        report.priority = 'critical';
        report.status = 'reviewing';

        // Auto-remove if confidence is very high
        if (mlResult.suggestedAction === 'auto_remove') {
          await this.autoModerateContent(contentId, contentType, mlResult);
        }
      }

      // Store report (implementation depends on your DB schema)
      // await db.insert(reports).values(report);

      // Aggregate reports for this content
      await this.aggregateReports(contentId);

      return report;
    } catch (error) {
      safeLogger.error('Error submitting report:', error);
      throw error;
    }
  }

  /**
   * ML-based abuse detection
   */
  async detectAbuse(content: string, context: string): Promise<AbuseDetectionResult> {
    try {
      // Keywords and patterns for different abuse categories
      const patterns = {
        spam: ['buy now', 'click here', 'free money', 'act fast', 'limited time'],
        harassment: ['idiot', 'stupid', 'loser', 'hate you', 'kill yourself'],
        hate_speech: ['racial slurs', 'sexist', 'homophobic', 'bigot'],
        violence: ['kill', 'hurt', 'attack', 'bomb', 'shoot'],
        adult_content: ['nsfw', 'explicit', 'porn', 'xxx'],
        misinformation: ['fake news', 'hoax', 'conspiracy', 'debunked'],
      };

      const detectedCategories: string[] = [];
      let totalScore = 0;

      const combinedText = `${content} ${context}`.toLowerCase();

      // Simple pattern matching (in production, use actual ML model)
      for (const [category, keywords] of Object.entries(patterns)) {
        const matches = keywords.filter(keyword => combinedText.includes(keyword.toLowerCase()));
        if (matches.length > 0) {
          detectedCategories.push(category);
          totalScore += matches.length * 0.2;
        }
      }

      // Sentiment analysis (simplified)
      const negativeWords = ['bad', 'terrible', 'awful', 'worst', 'horrible', 'disgusting'];
      const negativeCount = negativeWords.filter(word => combinedText.includes(word)).length;
      totalScore += negativeCount * 0.1;

      // Calculate confidence (0-1)
      const confidence = Math.min(totalScore, 1);

      // Determine severity
      let severity: AbuseDetectionResult['severity'] = 'low';
      if (confidence > 0.7) severity = 'critical';
      else if (confidence > 0.5) severity = 'high';
      else if (confidence > 0.3) severity = 'medium';

      // Suggest action
      let suggestedAction: AbuseDetectionResult['suggestedAction'] = 'flag';
      if (confidence > 0.8) suggestedAction = 'auto_remove';
      else if (confidence > 0.6) suggestedAction = 'escalate';

      return {
        isAbusive: confidence > 0.3,
        confidence,
        categories: detectedCategories,
        severity,
        suggestedAction,
      };
    } catch (error) {
      safeLogger.error('Error in abuse detection:', error);
      return {
        isAbusive: false,
        confidence: 0,
        categories: [],
        severity: 'low',
        suggestedAction: 'flag',
      };
    }
  }

  /**
   * Calculate report priority based on reputation and category
   */
  private calculateReportPriority(
    category: ContentReport['category'],
    reputation: number
  ): ContentReport['priority'] {
    // High-reputation users get higher priority
    const reputationMultiplier = reputation > 1000 ? 2 : reputation > 500 ? 1.5 : 1;

    // Critical categories
    const criticalCategories = ['violence', 'hate_speech', 'harassment'];
    if (criticalCategories.includes(category)) {
      return reputation > 500 ? 'critical' : 'high';
    }

    // High-priority categories
    const highCategories = ['spam', 'adult_content'];
    if (highCategories.includes(category)) {
      return reputation > 500 ? 'high' : 'medium';
    }

    // Default priority based on reputation
    if (reputation > 1000) return 'high';
    if (reputation > 500) return 'medium';
    return 'low';
  }

  /**
   * Aggregate reports for a piece of content
   */
  private async aggregateReports(contentId: string): Promise<{
    totalReports: number;
    averageReputation: number;
    categories: Map<string, number>;
    recommendedAction: string;
  }> {
    try {
      const reports = await this.getReportsByContent(contentId);

      if (reports.length === 0) {
        return {
          totalReports: 0,
          averageReputation: 0,
          categories: new Map(),
          recommendedAction: 'none',
        };
      }

      // Calculate weighted score based on reporter reputation
      const totalReputation = reports.reduce((sum, r) => sum + r.reporterReputation, 0);
      const averageReputation = totalReputation / reports.length;

      // Count categories
      const categories = new Map<string, number>();
      reports.forEach(report => {
        const count = categories.get(report.category) || 0;
        categories.set(report.category, count + 1);
      });

      // Determine recommended action
      let recommendedAction = 'review';
      if (reports.length >= 5 && averageReputation > 500) {
        recommendedAction = 'remove';
      } else if (reports.length >= 10) {
        recommendedAction = 'remove';
      } else if (reports.length >= 3 && averageReputation > 1000) {
        recommendedAction = 'escalate';
      }

      return {
        totalReports: reports.length,
        averageReputation,
        categories,
        recommendedAction,
      };
    } catch (error) {
      safeLogger.error('Error aggregating reports:', error);
      return {
        totalReports: 0,
        averageReputation: 0,
        categories: new Map(),
        recommendedAction: 'none',
      };
    }
  }

  /**
   * Auto-moderate content based on ML results
   */
  private async autoModerateContent(
    contentId: string,
    contentType: ContentReport['contentType'],
    mlResult: AbuseDetectionResult
  ): Promise<void> {
    try {
      safeLogger.info(`Auto-moderating ${contentType} ${contentId}:`, mlResult);

      // In production, implement actual moderation actions:
      // - Remove content
      // - Notify moderators
      // - Log action
      // - Notify content creator

      // For now, just log
      const action = {
        contentId,
        contentType,
        action: 'auto_remove',
        reason: `ML detected ${mlResult.severity} abuse (confidence: ${mlResult.confidence})`,
        categories: mlResult.categories,
        timestamp: new Date(),
      };

      safeLogger.info('Auto-moderation action:', action);
    } catch (error) {
      safeLogger.error('Error in auto-moderation:', error);
    }
  }

  /**
   * Get reports for specific content
   */
  private async getReportsByContent(contentId: string): Promise<ContentReport[]> {
    // Mock implementation - replace with actual DB query
    return [];
  }

  /**
   * Get moderation queue with smart prioritization
   */
  async getModerationQueue(
    filters?: {
      status?: ContentReport['status'];
      priority?: ContentReport['priority'];
      category?: ContentReport['category'];
      limit?: number;
    }
  ): Promise<ContentReport[]> {
    try {
      // In production, query from database with filters
      // Order by: priority DESC, reporterReputation DESC, createdAt DESC

      // Mock implementation
      return [];
    } catch (error) {
      safeLogger.error('Error getting moderation queue:', error);
      return [];
    }
  }

  /**
   * Take moderation action
   */
  async takeModerationAction(
    reportId: string,
    moderatorId: string,
    action: ModerationAction['action'],
    reason: string
  ): Promise<ModerationAction> {
    try {
      const moderationAction: ModerationAction = {
        id: this.generateId(),
        reportId,
        moderatorId,
        action,
        reason,
        createdAt: new Date(),
      };

      // Update report status
      // await db.update(reports).set({ status: 'resolved' }).where(eq(reports.id, reportId));

      // Log action
      // await db.insert(moderationActions).values(moderationAction);

      return moderationAction;
    } catch (error) {
      safeLogger.error('Error taking moderation action:', error);
      throw error;
    }
  }

  /**
   * Get moderation analytics
   */
  async getModerationAnalytics(timeRange: 'day' | 'week' | 'month' = 'week'): Promise<{
    totalReports: number;
    resolvedReports: number;
    pendingReports: number;
    categoryBreakdown: Map<string, number>;
    averageResponseTime: number;
    autoModeratedCount: number;
    accuracyRate: number;
  }> {
    try {
      // In production, query from database with date filters
      // Calculate metrics

      return {
        totalReports: 0,
        resolvedReports: 0,
        pendingReports: 0,
        categoryBreakdown: new Map(),
        averageResponseTime: 0,
        autoModeratedCount: 0,
        accuracyRate: 0,
      };
    } catch (error) {
      safeLogger.error('Error getting moderation analytics:', error);
      throw error;
    }
  }

  /**
   * Train ML model with feedback
   */
  async trainWithFeedback(
    reportId: string,
    wasAccurate: boolean,
    actualCategory?: string
  ): Promise<void> {
    try {
      // In production, store feedback for model retraining
      safeLogger.info('ML feedback:', { reportId, wasAccurate, actualCategory });
    } catch (error) {
      safeLogger.error('Error recording ML feedback:', error);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const moderationService = new AdvancedModerationService();
