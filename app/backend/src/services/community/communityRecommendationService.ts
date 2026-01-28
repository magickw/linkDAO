import { getAIService } from '../aiService';
import { safeLogger } from '../../utils/safeLogger';
import { communityService } from './communityService';
import { analyticsService } from '../analyticsService';

const aiService = getAIService();
const communitySvc = communityService;

export interface CommunityRecommendation {
  id: string;
  name: string;
  displayName: string;
  description: string;
  memberCount: number;
  category: string;
  avatar?: string;
  icon?: string;
  reason: string;
  confidence: number;
  matchFactors: string[];
  trendingScore?: number;
  growthRate?: number;
}

export interface UserCommunityContext {
  userId: string;
  joinedCommunities: string[];
  interests: string[];
  activityHistory: {
    communityId: string;
    lastActive: Date;
    postCount: number;
    voteCount: number;
  }[];
}

export class CommunityRecommendationService {
  /**
   * Generate personalized community recommendations for a user
   * @param context User context including joined communities and interests
   * @returns Array of recommended communities
   */
  async generateRecommendations(context: UserCommunityContext): Promise<CommunityRecommendation[]> {
    const startTime = Date.now();
    
    try {
      // Get all communities from service
      const allCommunities = await communitySvc.getAllCommunities();
      
      // Filter out already joined communities
      const unjoinedCommunities = allCommunities.filter(
        community => !context.joinedCommunities.includes(community.id)
      );
      
      // If user has no interests or activity, return popular communities
      if ((!context.interests || context.interests.length === 0) && 
          (!context.activityHistory || context.activityHistory.length === 0)) {
        const popularRecommendations = await this.getPopularCommunities(unjoinedCommunities);
        
        // Track analytics
        await analyticsService.trackUserEvent(
          context.userId,
          'ai_recommendations_session',
          'ai_recommendations_generated',
          {
            userId: context.userId,
            recommendationCount: popularRecommendations.length,
            algorithm: 'popular_communities',
            processingTime: Date.now() - startTime
          }
        );
        
        return popularRecommendations;
      }
      
      // Get AI-powered recommendations
      const aiRecommendations = await this.getAIRecommendations(context, unjoinedCommunities);
      
      // Combine with trending communities for diversity
      const trendingCommunities = await this.getTrendingCommunities(unjoinedCommunities);
      
      // Merge and deduplicate recommendations
      const mergedRecommendations = this.mergeRecommendations(
        aiRecommendations, 
        trendingCommunities
      );
      
      // Sort by confidence score
      const sortedRecommendations = mergedRecommendations.sort((a, b) => b.confidence - a.confidence);
      
      await analyticsService.trackUserEvent(
        context.userId,
        'ai_recommendations_session',
        'ai_recommendations_generated',
        {
          userId: context.userId,
          recommendationCount: sortedRecommendations.length,
          algorithm: 'ai_enhanced',
          processingTime: Date.now() - startTime,
          aiRecommendationCount: aiRecommendations.length,
          trendingRecommendationCount: trendingCommunities.length
        }
      );
      
      return sortedRecommendations;
    } catch (error) {
      safeLogger.error('Error generating community recommendations:', error);
      
      await analyticsService.trackUserEvent(
        context.userId,
        'ai_recommendations_session',
        'ai_recommendations_error',
        {
          userId: context.userId,
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTime: Date.now() - startTime
        }
      );
      
      // Fallback to popular communities
      const allCommunities = await communitySvc.getAllCommunities();
      const unjoinedCommunities = allCommunities.filter(
        community => !context.joinedCommunities.includes(community.id)
      );
      return this.getPopularCommunities(unjoinedCommunities);
    }
  }

  /**
   * Get popular communities as fallback recommendations
   */
  private async getPopularCommunities(communities: any[]): Promise<CommunityRecommendation[]> {
    // Sort by member count
    const sortedCommunities = [...communities].sort((a, b) => b.memberCount - a.memberCount);
    
    // Take top 10 and convert to recommendation format
    return sortedCommunities.slice(0, 10).map((community, index) => ({
      id: community.id,
      name: community.name,
      displayName: community.displayName,
      description: community.description,
      memberCount: community.memberCount,
      category: community.category,
      avatar: community.avatar,
      icon: community.icon,
      reason: 'Popular community with many members',
      confidence: Math.max(90 - index * 5, 50), // Decreasing confidence
      matchFactors: ['Member count', 'Popularity'],
      trendingScore: community.trendingScore || 0,
      growthRate: community.growthRate || 0
    }));
  }

  /**
   * Get AI-powered recommendations based on user context
   */
  private async getAIRecommendations(
    context: UserCommunityContext, 
    communities: any[]
  ): Promise<CommunityRecommendation[]> {
    try {
      // Prepare context for AI
      const aiContext = {
        userId: context.userId,
        joinedCommunities: context.joinedCommunities,
        interests: context.interests,
        activityHistory: context.activityHistory,
        availableCommunities: communities.map(c => ({
          id: c.id,
          name: c.name,
          displayName: c.displayName,
          description: c.description,
          memberCount: c.memberCount,
          category: c.category,
          tags: c.tags || []
        }))
      };

      // Create prompt for AI
      const prompt = `
        Based on the user context, recommend the most relevant communities from the available list.
        
        User Context:
        - Joined Communities: ${context.joinedCommunities.join(', ')}
        - Interests: ${context.interests.join(', ')}
        - Activity History: ${context.activityHistory.length} communities with activity
        
        Available Communities:
        ${communities.slice(0, 20).map(c => 
          `- ${c.name} (${c.category}): ${c.description?.substring(0, 100) || 'No description'}`
        ).join('\n')}
        
        Provide exactly 5 community recommendations with:
        1. Community ID
        2. Reason for recommendation
        3. Confidence score (0-100)
        4. Match factors (what makes it relevant)
        
        Format as JSON array with objects containing: id, reason, confidence, matchFactors
      `;

      // Get AI response
      const response = await aiService.generateText([
        {
          role: 'system',
          content: 'You are a community recommendation engine for a DAO platform. Recommend the most relevant communities for users based on their interests and activity.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], 'gpt-3.5-turbo', 1000);

      // Parse AI response
      let recommendations: any[] = [];
      try {
        // Try to extract JSON from response
        const jsonMatch = response.content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          recommendations = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        safeLogger.warn('Failed to parse AI recommendations response:', parseError);
        // Fallback to simple parsing
        recommendations = this.parseRecommendationsFromText(response.content, communities);
      }

      // Convert to proper format
      return recommendations.map((rec: any) => {
        const community = communities.find(c => c.id === rec.id);
        if (!community) return null;
        
        return {
          id: community.id,
          name: community.name,
          displayName: community.displayName,
          description: community.description,
          memberCount: community.memberCount,
          category: community.category,
          avatar: community.avatar,
          icon: community.icon,
          reason: rec.reason || 'Recommended based on your interests',
          confidence: Math.min(Math.max(rec.confidence || 70, 0), 100),
          matchFactors: Array.isArray(rec.matchFactors) ? rec.matchFactors : ['AI recommendation'],
          trendingScore: community.trendingScore || 0,
          growthRate: community.growthRate || 0
        };
      }).filter(Boolean) as CommunityRecommendation[];
    } catch (error) {
      safeLogger.error('Error getting AI recommendations:', error);
      // Return empty array on error
      return [];
    }
  }

  /**
   * Get trending communities based on recent activity
   */
  private async getTrendingCommunities(communities: any[]): Promise<CommunityRecommendation[]> {
    try {
      // Sort by trending score
      const sortedCommunities = [...communities].sort((a, b) => 
        (b.trendingScore || 0) - (a.trendingScore || 0)
      );
      
      // Take top 3 and convert to recommendation format
      return sortedCommunities.slice(0, 3).map((community, index) => ({
        id: community.id,
        name: community.name,
        displayName: community.displayName,
        description: community.description,
        memberCount: community.memberCount,
        category: community.category,
        avatar: community.avatar,
        icon: community.icon,
        reason: 'Trending community with recent activity',
        confidence: Math.max(80 - index * 10, 50), // Decreasing confidence
        matchFactors: ['Trending activity', 'Recent growth'],
        trendingScore: community.trendingScore || 0,
        growthRate: community.growthRate || 0
      }));
    } catch (error) {
      safeLogger.error('Error getting trending communities:', error);
      // Return empty array on error
      return [];
    }
  }

  /**
   * Merge and deduplicate recommendations from different sources
   */
  private mergeRecommendations(
    aiRecommendations: CommunityRecommendation[],
    trendingRecommendations: CommunityRecommendation[]
  ): CommunityRecommendation[] {
    const mergedMap = new Map<string, CommunityRecommendation>();
    
    // Add AI recommendations
    aiRecommendations.forEach(rec => {
      mergedMap.set(rec.id, rec);
    });
    
    // Add trending recommendations, boosting confidence if already present
    trendingRecommendations.forEach(rec => {
      if (mergedMap.has(rec.id)) {
        // If already present, boost confidence and merge match factors
        const existing = mergedMap.get(rec.id)!;
        mergedMap.set(rec.id, {
          ...existing,
          confidence: Math.min(100, existing.confidence + 10),
          matchFactors: [...new Set([...existing.matchFactors, ...rec.matchFactors])]
        });
      } else {
        mergedMap.set(rec.id, rec);
      }
    });
    
    return Array.from(mergedMap.values());
  }

  /**
   * Simple parser for AI text responses when JSON parsing fails
   */
  private parseRecommendationsFromText(content: string, communities: any[]): any[] {
    // This is a fallback parser that would need to be more sophisticated in a real implementation
    // For now, we'll return empty array to trigger the fallback mechanism
    return [];
  }
}

export const communityRecommendationService = new CommunityRecommendationService();
