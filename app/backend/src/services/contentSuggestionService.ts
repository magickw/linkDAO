/**
 * Content Suggestion Service
 * Analyzes user behavior and feedback to suggest content improvements and new content
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface UserBehaviorData {
  userId?: string;
  sessionId: string;
  documentPath: string;
  action: 'view' | 'search' | 'download' | 'share' | 'feedback' | 'exit';
  timestamp: Date;
  duration?: number; // milliseconds
  searchQuery?: string;
  feedbackRating?: number; // 1-5
  feedbackComment?: string;
  exitPoint?: number; // percentage of document read
  userAgent?: string;
  referrer?: string;
}

export interface ContentGap {
  id: string;
  topic: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  evidence: {
    searchQueries: string[];
    userRequests: number;
    relatedDocuments: string[];
    competitorContent?: string[];
  };
  suggestedContent: {
    title: string;
    description: string;
    estimatedLength: 'short' | 'medium' | 'long';
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    format: 'guide' | 'tutorial' | 'faq' | 'troubleshooting' | 'reference';
  };
  createdAt: Date;
  status: 'identified' | 'planned' | 'in_progress' | 'completed' | 'rejected';
}

export interface ContentImprovement {
  id: string;
  documentPath: string;
  improvementType: 'clarity' | 'completeness' | 'accuracy' | 'structure' | 'examples';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: {
    userFeedback: Array<{
      rating: number;
      comment: string;
      timestamp: Date;
    }>;
    behaviorMetrics: {
      averageReadTime: number;
      exitRate: number;
      searchesAfterReading: number;
    };
    commonSearches: string[];
  };
  suggestions: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  createdAt: Date;
  status: 'identified' | 'planned' | 'in_progress' | 'completed' | 'rejected';
}

export interface ContentSuggestionReport {
  summary: {
    totalGaps: number;
    totalImprovements: number;
    highPriorityItems: number;
    completedSuggestions: number;
  };
  topContentGaps: ContentGap[];
  topImprovements: ContentImprovement[];
  trendingTopics: Array<{
    topic: string;
    searchCount: number;
    trend: 'rising' | 'stable' | 'declining';
  }>;
  userSatisfactionTrends: Array<{
    category: string;
    averageRating: number;
    trend: 'improving' | 'stable' | 'declining';
  }>;
  recommendations: string[];
}

export class ContentSuggestionService {
  private behaviorData: UserBehaviorData[] = [];
  private contentGaps: Map<string, ContentGap> = new Map();
  private contentImprovements: Map<string, ContentImprovement> = new Map();
  private searchQueries: Map<string, number> = new Map();

  /**
   * Record user behavior data
   */
  recordUserBehavior(data: UserBehaviorData): void {
    this.behaviorData.push(data);

    // Keep only last 10,000 behavior records
    if (this.behaviorData.length > 10000) {
      this.behaviorData.splice(0, this.behaviorData.length - 10000);
    }

    // Track search queries
    if (data.action === 'search' && data.searchQuery) {
      const query = data.searchQuery.toLowerCase().trim();
      this.searchQueries.set(query, (this.searchQueries.get(query) || 0) + 1);
    }

    // Analyze behavior for content suggestions
    this.analyzeBehaviorForSuggestions(data);
  }

  /**
   * Analyze user behavior to identify content gaps and improvements
   */
  private analyzeBehaviorForSuggestions(data: UserBehaviorData): void {
    // Identify content gaps from unsuccessful searches
    if (data.action === 'search' && data.searchQuery) {
      this.identifyContentGapsFromSearch(data);
    }

    // Identify improvements from user feedback
    if (data.action === 'feedback' && data.feedbackRating !== undefined) {
      this.identifyImprovementsFromFeedback(data);
    }

    // Identify improvements from exit behavior
    if (data.action === 'exit' && data.exitPoint !== undefined) {
      this.identifyImprovementsFromExitBehavior(data);
    }
  }

  /**
   * Identify content gaps from search queries
   */
  private identifyContentGapsFromSearch(data: UserBehaviorData): void {
    if (!data.searchQuery) return;

    const query = data.searchQuery.toLowerCase().trim();
    const searchCount = this.searchQueries.get(query) || 0;

    // If search query appears frequently but doesn't lead to document views, it might be a content gap
    if (searchCount >= 5) {
      const relatedViews = this.behaviorData.filter(b => 
        b.sessionId === data.sessionId && 
        b.action === 'view' && 
        b.timestamp > data.timestamp &&
        b.timestamp.getTime() - data.timestamp.getTime() < 300000 // Within 5 minutes
      );

      if (relatedViews.length === 0) {
        // No documents viewed after search - potential content gap
        this.createContentGap(query, searchCount);
      }
    }
  }

  /**
   * Create or update content gap
   */
  private createContentGap(searchQuery: string, searchCount: number): void {
    const gapId = this.generateGapId(searchQuery);
    const existingGap = this.contentGaps.get(gapId);

    if (existingGap) {
      // Update existing gap
      existingGap.evidence.searchQueries.push(searchQuery);
      existingGap.evidence.userRequests = searchCount;
      existingGap.priority = this.calculateGapPriority(searchCount);
    } else {
      // Create new gap
      const gap: ContentGap = {
        id: gapId,
        topic: this.extractTopicFromQuery(searchQuery),
        category: this.categorizeQuery(searchQuery),
        priority: this.calculateGapPriority(searchCount),
        evidence: {
          searchQueries: [searchQuery],
          userRequests: searchCount,
          relatedDocuments: []
        },
        suggestedContent: this.generateContentSuggestion(searchQuery),
        createdAt: new Date(),
        status: 'identified'
      };

      this.contentGaps.set(gapId, gap);
    }
  }

  /**
   * Identify improvements from user feedback
   */
  private identifyImprovementsFromFeedback(data: UserBehaviorData): void {
    if (!data.documentPath || data.feedbackRating === undefined) return;

    // Low ratings indicate potential improvements needed
    if (data.feedbackRating <= 2) {
      this.createContentImprovement(data, 'accuracy', 'User reported low satisfaction');
    }
  }

  /**
   * Identify improvements from exit behavior
   */
  private identifyImprovementsFromExitBehavior(data: UserBehaviorData): void {
    if (!data.documentPath || data.exitPoint === undefined) return;

    // Early exits might indicate content issues
    if (data.exitPoint < 0.3) { // Exited before reading 30%
      this.createContentImprovement(data, 'structure', 'Users exiting early - content may be unclear or poorly structured');
    }
  }

  /**
   * Create or update content improvement suggestion
   */
  private createContentImprovement(
    data: UserBehaviorData, 
    type: ContentImprovement['improvementType'],
    description: string
  ): void {
    if (!data.documentPath) return;

    const improvementId = `${data.documentPath}-${type}`;
    const existing = this.contentImprovements.get(improvementId);

    if (existing) {
      // Update existing improvement
      if (data.feedbackRating !== undefined && data.feedbackComment) {
        existing.evidence.userFeedback.push({
          rating: data.feedbackRating,
          comment: data.feedbackComment,
          timestamp: data.timestamp
        });
      }
    } else {
      // Create new improvement
      const improvement: ContentImprovement = {
        id: improvementId,
        documentPath: data.documentPath,
        improvementType: type,
        priority: 'medium',
        description,
        evidence: {
          userFeedback: data.feedbackRating !== undefined && data.feedbackComment ? [{
            rating: data.feedbackRating,
            comment: data.feedbackComment,
            timestamp: data.timestamp
          }] : [],
          behaviorMetrics: {
            averageReadTime: 0,
            exitRate: 0,
            searchesAfterReading: 0
          },
          commonSearches: []
        },
        suggestions: this.generateImprovementSuggestions(type),
        estimatedEffort: 'medium',
        createdAt: new Date(),
        status: 'identified'
      };

      this.contentImprovements.set(improvementId, improvement);
    }
  }

  /**
   * Generate content suggestion report
   */
  generateSuggestionReport(): ContentSuggestionReport {
    const gaps = Array.from(this.contentGaps.values());
    const improvements = Array.from(this.contentImprovements.values());

    const summary = {
      totalGaps: gaps.length,
      totalImprovements: improvements.length,
      highPriorityItems: [...gaps, ...improvements].filter(item => item.priority === 'high' || item.priority === 'critical').length,
      completedSuggestions: [...gaps, ...improvements].filter(item => item.status === 'completed').length
    };

    const topContentGaps = gaps
      .filter(gap => gap.status === 'identified')
      .sort((a, b) => b.evidence.userRequests - a.evidence.userRequests)
      .slice(0, 10);

    const topImprovements = improvements
      .filter(imp => imp.status === 'identified')
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 10);

    const trendingTopics = this.getTrendingTopics();
    const userSatisfactionTrends = this.getUserSatisfactionTrends();
    const recommendations = this.generateRecommendations(summary, gaps, improvements);

    return {
      summary,
      topContentGaps,
      topImprovements,
      trendingTopics,
      userSatisfactionTrends,
      recommendations
    };
  }

  /**
   * Get trending topics from search data
   */
  private getTrendingTopics(): Array<{
    topic: string;
    searchCount: number;
    trend: 'rising' | 'stable' | 'declining';
  }> {
    const topics: Array<{
      topic: string;
      searchCount: number;
      trend: 'rising' | 'stable' | 'declining';
    }> = [];

    // Get top search queries
    const sortedQueries = Array.from(this.searchQueries.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20);

    for (const [query, count] of sortedQueries) {
      topics.push({
        topic: this.extractTopicFromQuery(query),
        searchCount: count,
        trend: 'stable' // In a real implementation, this would compare with historical data
      });
    }

    return topics;
  }

  /**
   * Get user satisfaction trends by category
   */
  private getUserSatisfactionTrends(): Array<{
    category: string;
    averageRating: number;
    trend: 'improving' | 'stable' | 'declining';
  }> {
    const categoryRatings: Record<string, number[]> = {};

    // Group feedback by category
    for (const data of this.behaviorData) {
      if (data.action === 'feedback' && data.feedbackRating !== undefined && data.documentPath) {
        const category = this.getCategoryFromPath(data.documentPath);
        if (!categoryRatings[category]) {
          categoryRatings[category] = [];
        }
        categoryRatings[category].push(data.feedbackRating);
      }
    }

    // Calculate averages
    return Object.entries(categoryRatings).map(([category, ratings]) => ({
      category,
      averageRating: ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length,
      trend: 'stable' as const // In a real implementation, this would compare with historical data
    }));
  }

  // Helper methods
  private generateGapId(query: string): string {
    return `gap-${query.replace(/\s+/g, '-').toLowerCase()}`;
  }

  private extractTopicFromQuery(query: string): string {
    // Simple topic extraction - in a real implementation, this would use NLP
    return query.split(' ').slice(0, 3).join(' ');
  }

  private categorizeQuery(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('wallet') || lowerQuery.includes('metamask')) return 'wallet';
    if (lowerQuery.includes('token') || lowerQuery.includes('ldao')) return 'tokens';
    if (lowerQuery.includes('security') || lowerQuery.includes('safe')) return 'security';
    if (lowerQuery.includes('error') || lowerQuery.includes('problem')) return 'troubleshooting';
    if (lowerQuery.includes('how') || lowerQuery.includes('tutorial')) return 'tutorials';
    
    return 'general';
  }

  private calculateGapPriority(searchCount: number): ContentGap['priority'] {
    if (searchCount >= 50) return 'critical';
    if (searchCount >= 20) return 'high';
    if (searchCount >= 10) return 'medium';
    return 'low';
  }

  private generateContentSuggestion(query: string): ContentGap['suggestedContent'] {
    const category = this.categorizeQuery(query);
    
    return {
      title: `How to ${query}`,
      description: `Comprehensive guide addressing user queries about: ${query}`,
      estimatedLength: 'medium',
      difficulty: 'beginner',
      format: category === 'troubleshooting' ? 'troubleshooting' : 'guide'
    };
  }

  private generateImprovementSuggestions(type: ContentImprovement['improvementType']): string[] {
    switch (type) {
      case 'clarity':
        return [
          'Simplify complex language',
          'Add more examples',
          'Improve section structure',
          'Add visual aids'
        ];
      case 'completeness':
        return [
          'Add missing information',
          'Include more use cases',
          'Add troubleshooting section',
          'Expand on key concepts'
        ];
      case 'accuracy':
        return [
          'Verify all information is current',
          'Update outdated references',
          'Check technical accuracy',
          'Review external links'
        ];
      case 'structure':
        return [
          'Reorganize content flow',
          'Add table of contents',
          'Improve headings',
          'Break up large sections'
        ];
      case 'examples':
        return [
          'Add practical examples',
          'Include code samples',
          'Add screenshots',
          'Create step-by-step guides'
        ];
      default:
        return ['Review and improve content'];
    }
  }

  private getCategoryFromPath(documentPath: string): string {
    // Extract category from document path
    const pathParts = documentPath.split('/');
    return pathParts[pathParts.length - 2] || 'general';
  }

  private generateRecommendations(
    summary: any,
    gaps: ContentGap[],
    improvements: ContentImprovement[]
  ): string[] {
    const recommendations: string[] = [];

    if (summary.totalGaps > 0) {
      recommendations.push(`${summary.totalGaps} content gaps identified - prioritize creating missing content`);
    }

    if (summary.totalImprovements > 0) {
      recommendations.push(`${summary.totalImprovements} improvement opportunities found`);
    }

    if (summary.highPriorityItems > 0) {
      recommendations.push(`${summary.highPriorityItems} high-priority items need immediate attention`);
    }

    const criticalGaps = gaps.filter(g => g.priority === 'critical').length;
    if (criticalGaps > 0) {
      recommendations.push(`${criticalGaps} critical content gaps require urgent action`);
    }

    if (summary.totalGaps === 0 && summary.totalImprovements === 0) {
      recommendations.push('Content appears to be meeting user needs effectively');
    }

    return recommendations;
  }
}

export const contentSuggestionService = new ContentSuggestionService();
