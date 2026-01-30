import { authenticatedFetch } from './authService';

export interface RecommendationScore {
  userId: string;
  score: number;
  reasons: string[];
  mutualConnections: number;
  activityScore: number;
  reputationScore: number;
  communityOverlap: number;
  profile?: {
    displayName: string;
    handle: string;
    avatarUrl: string;
    bio: string;
    walletAddress: string;
  };
}

export interface RecommendationResponse {
  success: boolean;
  data: {
    recommendations: RecommendationScore[];
    metadata: {
      algorithm: string;
      totalFound: number;
      returned: number;
      timestamp: string;
    };
  };
}

export interface RecommendationInsights {
  success: boolean;
  data: {
    followingCount: number;
    mutualConnections: number;
    recommendationQuality: string;
    suggestions: string;
    lastUpdated: string;
  };
}

export interface RecommendationFeedback {
  success: boolean;
  message: string;
}

/**
 * User Recommendation Service
 * Handles fetching user recommendations and recording feedback
 */
export class UserRecommendationService {
  private static readonly BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.linkdao.io';

  /**
   * Get personalized user recommendations
   */
  static async getUserRecommendations(options: {
    limit?: number;
    algorithm?: 'collaborative' | 'content' | 'hybrid';
    communityId?: string;
  } = {}): Promise<RecommendationResponse> {
    const { limit = 10, algorithm = 'hybrid', communityId } = options;

    const params = new URLSearchParams({
      limit: limit.toString(),
      algorithm
    });

    if (communityId) {
      params.append('communityId', communityId);
    }

    const response = await authenticatedFetch(
      `${this.BASE_URL}/api/recommendations/users?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get community recommendations
   */
  static async getCommunityRecommendations(options: {
    limit?: number;
  } = {}): Promise<RecommendationResponse> {
    const { limit = 10 } = options;

    const params = new URLSearchParams({
      limit: limit.toString()
    });

    const response = await authenticatedFetch(
      `${this.BASE_URL}/api/recommendations/communities?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch community recommendations: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Record feedback on recommendations
   */
  static async recordFeedback(feedback: {
    recommendedUserId: string;
    action: 'view' | 'follow' | 'dismiss' | 'report';
    type?: string;
  }): Promise<RecommendationFeedback> {
    const response = await authenticatedFetch(
      `${this.BASE_URL}/api/recommendations/feedback`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(feedback)
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to record feedback: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get recommendation insights
   */
  static async getRecommendationInsights(): Promise<RecommendationInsights> {
    const response = await authenticatedFetch(
      `${this.BASE_URL}/api/recommendations/insights`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch recommendation insights: ${response.statusText}`);
    }

    return response.json();
  }
}

export default UserRecommendationService;