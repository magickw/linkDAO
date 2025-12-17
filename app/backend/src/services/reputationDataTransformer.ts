import { ReputationData, ReputationHistoryEntry } from './reputationService';
import { UserReputation, ReputationBreakdown, ProgressMilestone } from '../../frontend/src/types/reputation';

/**
 * Transform backend reputation data to frontend format
 */
export class ReputationDataTransformer {
  /**
   * Transform backend ReputationData to frontend UserReputation
   */
  static transformReputationData(backendData: ReputationData): UserReputation {
    // Calculate total score from backend data
    const totalScore = backendData.score;
    
    // Determine reputation level based on score
    const level = this.calculateLevel(totalScore);
    
    // Transform breakdown data
    const breakdown: ReputationBreakdown = {
      posting: backendData.totalTransactions,
      governance: backendData.positiveReviews,
      community: backendData.successfulSales,
      trading: backendData.successfulPurchases,
      moderation: backendData.resolvedDisputes,
      total: totalScore
    };
    
    // Create progress milestones based on backend data
    const progress: ProgressMilestone[] = [
      {
        category: 'posting',
        current: backendData.totalTransactions,
        target: Math.max(backendData.totalTransactions * 1.5, 100), // Simple target calculation
        reward: 'Next Milestone',
        progress: Math.min(100, (backendData.totalTransactions / Math.max(backendData.totalTransactions * 1.5, 100)) * 100)
      },
      {
        category: 'governance',
        current: backendData.positiveReviews,
        target: Math.max(backendData.positiveReviews * 1.5, 50),
        reward: 'Next Milestone',
        progress: Math.min(100, (backendData.positiveReviews / Math.max(backendData.positiveReviews * 1.5, 50)) * 100)
      },
      {
        category: 'community',
        current: backendData.successfulSales,
        target: Math.max(backendData.successfulSales * 1.5, 25),
        reward: 'Next Milestone',
        progress: Math.min(100, (backendData.successfulSales / Math.max(backendData.successfulSales * 1.5, 25)) * 100)
      }
    ];
    
    return {
      totalScore,
      level,
      badges: [], // Badges would need to be fetched separately or calculated
      progress,
      breakdown,
      achievements: [] // Achievements would need to be fetched separately or calculated
    };
  }
  
  /**
   * Transform backend reputation history to frontend reputation events
   */
  static transformReputationHistory(backendHistory: ReputationHistoryEntry[], userId: string): any[] {
    return backendHistory.map(entry => ({
      id: entry.id,
      userId,
      type: this.mapEventType(entry.eventType),
      category: this.determineCategory(entry.eventType),
      points: entry.scoreChange,
      description: entry.description || `Reputation ${entry.scoreChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(entry.scoreChange)}`,
      timestamp: entry.createdAt,
      metadata: {}
    }));
  }
  
  /**
   * Calculate reputation level based on score
   */
  private static calculateLevel(score: number): any {
    // Import the REPUTATION_LEVELS constant
    const REPUTATION_LEVELS = [
      {
        id: 1,
        name: 'Newcomer',
        minScore: 0,
        maxScore: 99,
        color: '#94A3B8',
        icon: '🌱',
        privileges: ['basic_posting', 'basic_voting']
      },
      {
        id: 2,
        name: 'Contributor',
        minScore: 100,
        maxScore: 499,
        color: '#10B981',
        icon: '🌿',
        privileges: ['basic_posting', 'basic_voting', 'create_polls']
      },
      {
        id: 3,
        name: 'Active Member',
        minScore: 500,
        maxScore: 1499,
        color: '#3B82F6',
        icon: '⭐',
        privileges: ['basic_posting', 'basic_voting', 'create_polls', 'moderate_comments']
      },
      {
        id: 4,
        name: 'Trusted User',
        minScore: 1500,
        maxScore: 4999,
        color: '#8B5CF6',
        icon: '💎',
        privileges: ['basic_posting', 'basic_voting', 'create_polls', 'moderate_comments', 'create_proposals']
      },
      {
        id: 5,
        name: 'Community Leader',
        minScore: 5000,
        maxScore: 14999,
        color: '#F59E0B',
        icon: '👑',
        privileges: ['basic_posting', 'basic_voting', 'create_polls', 'moderate_comments', 'create_proposals', 'moderate_posts']
      },
      {
        id: 6,
        name: 'Legend',
        minScore: 15000,
        maxScore: Infinity,
        color: '#EF4444',
        icon: '🏆',
        privileges: ['basic_posting', 'basic_voting', 'create_polls', 'moderate_comments', 'create_proposals', 'moderate_posts', 'admin_actions']
      }
    ];
    
    return REPUTATION_LEVELS.find(
      level => score >= level.minScore && score <= level.maxScore
    ) || REPUTATION_LEVELS[0];
  }
  
  /**
   * Map backend event types to frontend event types
   */
  private static mapEventType(backendEventType: string): string {
    const eventTypeMap: Record<string, string> = {
      'review_received': 'post_liked',
      'transaction_completed': 'tip_received',
      'dispute_created': 'moderation_action',
      'dispute_resolved': 'moderation_action',
      'response_time': 'community_joined',
      'completion_rate': 'achievement_unlocked'
    };
    
    return eventTypeMap[backendEventType] || 'post_created';
  }
  
  /**
   * Determine category based on event type
   */
  private static determineCategory(eventType: string): any {
    const categoryMap: Record<string, string> = {
      'review_received': 'governance',
      'transaction_completed': 'trading',
      'dispute_created': 'moderation',
      'dispute_resolved': 'moderation',
      'response_time': 'community',
      'completion_rate': 'community'
    };
    
    return categoryMap[eventType] || 'posting';
  }
}