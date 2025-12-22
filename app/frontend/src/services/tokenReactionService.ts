/**
 * Token Reaction Service
 * Handles API calls for token-based reactions with staking mechanism
 */

import {
  TokenReaction,
  ReactionSummary,
  ReactionAnalytics,
  CreateReactionRequest,
  CreateReactionResponse,
  GetReactionsRequest,
  GetReactionsResponse,
  ReactionType,
  ReactionError,
  REACTION_TYPES
} from '../types/tokenReaction';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class TokenReactionService {
  private getAuthToken(): string | null {
    // Try multiple possible token storage locations
    return (
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('auth_token') ||
      localStorage.getItem('linkdao-auth-token') ||
      null
    );
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      // Get auth token and add to headers if available
      const token = this.getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {})
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers,
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw this.handleError(error);
    }
  }

  private handleError(error: any): ReactionError {
    if (error.message?.includes('insufficient balance')) {
      return {
        code: 'INSUFFICIENT_BALANCE',
        message: 'Insufficient token balance for this reaction',
        details: error
      };
    }

    if (error.message?.includes('invalid amount')) {
      return {
        code: 'INVALID_AMOUNT',
        message: 'Invalid reaction amount specified',
        details: error
      };
    }

    if (error.message?.includes('not found')) {
      return {
        code: 'POST_NOT_FOUND',
        message: 'Post not found',
        details: error
      };
    }

    if (error.message?.includes('network') || error.name === 'NetworkError') {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error occurred. Please check your connection.',
        details: error
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
      details: error
    };
  }

  /**
   * Create a new token reaction with improved error handling
   */
  async createReaction(request: CreateReactionRequest): Promise<CreateReactionResponse> {
    // Validate reaction type
    if (!REACTION_TYPES[request.type]) {
      throw new Error(`Invalid reaction type: ${request.type}`);
    }

    // Validate amount
    const minAmount = REACTION_TYPES[request.type].tokenCost;
    if (request.amount < minAmount) {
      throw new Error(`Minimum amount for ${request.type} reaction is ${minAmount} tokens`);
    }

    try {
      return await this.makeRequest<CreateReactionResponse>('/api/reactions', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    } catch (error) {
      console.error('Failed to create reaction:', error);
      // Re-throw to let caller handle it
      throw error;
    }
  }

  /**
   * Get reactions for a post with improved error handling
   */
  async getReactions(request: GetReactionsRequest): Promise<GetReactionsResponse> {
    const params = new URLSearchParams({
      postId: request.postId,
      ...(request.reactionType && { reactionType: request.reactionType }),
      ...(request.limit && { limit: request.limit.toString() }),
      ...(request.offset && { offset: request.offset.toString() }),
    });

    try {
      return await this.makeRequest<GetReactionsResponse>(`/api/reactions?${params}`);
    } catch (error) {
      console.error('Failed to get reactions:', error);
      // Return empty response instead of throwing to prevent UI crashes
      return {
        reactions: [],
        summaries: [],
        analytics: {
          postId: request.postId,
          totalReactions: 0,
          totalTokensStaked: 0,
          totalRewardsDistributed: 0,
          reactionBreakdown: {
            '🔥': { count: 0, totalAmount: 0, averageAmount: 0 },
            '🚀': { count: 0, totalAmount: 0, averageAmount: 0 },
            '💎': { count: 0, totalAmount: 0, averageAmount: 0 }
          }
        },
        hasMore: false
      } as GetReactionsResponse;
    }
  }

  /**
   * Get reaction summaries for a post with improved error handling
   */
  async getReactionSummaries(postId: string | number): Promise<ReactionSummary[]> {
    try {
      return await this.makeRequest<ReactionSummary[]>(`/api/reactions/${postId}/summaries`);
    } catch (error: any) {
      if (error?.message?.includes('422') || error?.message?.includes('HTTP 422')) {
        return [];
      }
      return [];
    }
  }

  /**
   * Get reaction analytics for a post with improved error handling
   */
  async getReactionAnalytics(postId: string | number): Promise<ReactionAnalytics> {
    try {
      return await this.makeRequest<ReactionAnalytics>(`/api/reactions/${postId}/analytics`);
    } catch (error) {
      console.error('Failed to get reaction analytics:', error);
      // Return empty object instead of throwing to prevent UI crashes
      return {
        postId,
        totalReactions: 0,
        totalTokensStaked: 0,
        totalRewardsDistributed: 0,
        reactionBreakdown: {
          '🔥': { count: 0, totalAmount: 0, averageAmount: 0 },
          '🚀': { count: 0, totalAmount: 0, averageAmount: 0 },
          '💎': { count: 0, totalAmount: 0, averageAmount: 0 }
        },
        topReactors: [],
        milestoneProgress: []
      } as ReactionAnalytics;
    }
  }

  /**
   * Get user's reactions for a post
   */
  async getUserReactions(postId: string | number, userId: string): Promise<TokenReaction[]> {
    return this.makeRequest<TokenReaction[]>(`/api/reactions/${postId}/user/${userId}`);
  }

  /**
   * Remove a reaction (unstake tokens)
   */
  async removeReaction(reactionId: string): Promise<{ success: boolean; refundAmount: number }> {
    return this.makeRequest<{ success: boolean; refundAmount: number }>(`/api/reactions/${reactionId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get top reactors for a post
   */
  async getTopReactors(postId: string | number, limit: number = 10): Promise<Array<{
    userId: string;
    walletAddress: string;
    handle?: string;
    avatar?: string;
    totalAmount: number;
    reactionTypes: ReactionType[];
  }>> {
    return this.makeRequest<any[]>(`/api/reactions/${postId}/top-reactors?limit=${limit}`);
  }

  /**
   * Calculate reaction rewards for a post
   */
  calculateRewards(reactions: TokenReaction[]): number {
    return reactions.reduce((total, reaction) => {
      const config = REACTION_TYPES[reaction.type];
      const baseReward = reaction.amount * 0.1; // 10% base reward
      const multipliedReward = baseReward * config.multiplier;
      return total + multipliedReward;
    }, 0);
  }

  /**
   * Check if user can afford a reaction
   */
  async canAffordReaction(
    reactionType: ReactionType,
    amount: number,
    userBalance: number
  ): Promise<boolean> {
    const config = REACTION_TYPES[reactionType];
    const totalCost = amount * config.tokenCost;
    return userBalance >= totalCost;
  }

  /**
   * Get reaction milestones
   */
  getReactionMilestones(reactionType: ReactionType) {
    const baseMilestones = [10, 25, 50, 100, 250, 500, 1000];
    const config = REACTION_TYPES[reactionType];
    
    return baseMilestones.map(threshold => ({
      threshold: threshold * config.tokenCost,
      reached: false,
      reward: threshold * config.multiplier * 0.1,
      description: `${threshold * config.tokenCost} ${config.name} tokens staked`
    }));
  }

  /**
   * Format reaction amount for display
   */
  formatReactionAmount(amount: number): string {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toString();
  }

  /**
   * Get reaction color theme
   */
  getReactionTheme(reactionType: ReactionType): {
    primary: string;
    secondary: string;
    gradient: string;
    glow: string;
  } {
    switch (reactionType) {
      case '🔥':
        return {
          primary: '#FF6B35',
          secondary: '#FF8E53',
          gradient: 'from-orange-500 to-red-500',
          glow: 'shadow-orange-500/50'
        };
      case '🚀':
        return {
          primary: '#4F46E5',
          secondary: '#7C3AED',
          gradient: 'from-indigo-500 to-purple-500',
          glow: 'shadow-indigo-500/50'
        };
      case '💎':
        return {
          primary: '#06B6D4',
          secondary: '#0891B2',
          gradient: 'from-cyan-500 to-blue-500',
          glow: 'shadow-cyan-500/50'
        };
      default:
        return {
          primary: '#6B7280',
          secondary: '#9CA3AF',
          gradient: 'from-gray-500 to-gray-600',
          glow: 'shadow-gray-500/50'
        };
    }
  }

  /**
   * Validate reaction input
   */
  validateReactionInput(reactionType: ReactionType, amount: number): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!REACTION_TYPES[reactionType]) {
      errors.push('Invalid reaction type');
    }
    
    if (amount <= 0) {
      errors.push('Amount must be greater than 0');
    }
    
    if (reactionType && amount < REACTION_TYPES[reactionType].tokenCost) {
      errors.push(`Minimum amount for ${REACTION_TYPES[reactionType].name} is ${REACTION_TYPES[reactionType].tokenCost} tokens`);
    }
    
    if (amount > 10000) {
      errors.push('Maximum amount is 10,000 tokens per reaction');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const tokenReactionService = new TokenReactionService();
export default tokenReactionService;