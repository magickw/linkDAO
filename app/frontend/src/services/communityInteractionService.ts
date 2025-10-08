import { CommunityService } from './communityService';
import { CommunityMembershipService } from './communityMembershipService';
import { 
  Community, 
  CreateCommunityInput 
} from '../models/Community';
import { 
  CommunityMembership, 
  CreateCommunityMembershipInput 
} from '../models/CommunityMembership';

// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

export interface JoinCommunityRequest {
  communityId: string;
  userAddress: string;
}

export interface LeaveCommunityRequest {
  communityId: string;
  userAddress: string;
}

export interface CreatePostRequest {
  communityId: string;
  authorAddress: string;
  title: string;
  content: string;
  mediaUrls?: string[];
  tags?: string[];
  postType?: string;
}

export interface ModerationAction {
  communityId: string;
  moderatorAddress: string;
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  action: 'remove' | 'approve' | 'pin' | 'lock' | 'ban' | 'warn';
  reason?: string;
  duration?: number; // For temporary actions like bans
}

export interface CommunitySettings {
  communityId: string;
  moderatorAddress: string;
  settings: {
    requireApproval?: boolean;
    minimumReputation?: number;
    allowedPostTypes?: string[];
    autoModeration?: boolean;
    stakingRequirements?: Array<{
      action: string;
      tokenAddress: string;
      minimumAmount: string;
      lockDuration: number;
    }>;
  };
}

/**
 * Community Interaction Service
 * Handles real community interactions including joining, posting, and moderation
 */
export class CommunityInteractionService {
  /**
   * Join a community with real database operations
   * @param request - Join community request
   * @returns Success status and membership data
   */
  static async joinCommunity(request: JoinCommunityRequest): Promise<{
    success: boolean;
    data?: CommunityMembership;
    message?: string;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${request.communityId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: request.userAddress
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: result.error || 'Failed to join community'
        };
      }
      
      return {
        success: true,
        data: result.data,
        message: 'Successfully joined community'
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          message: 'Request timeout'
        };
      }
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to join community'
      };
    }
  }

  /**
   * Leave a community with real database operations
   * @param request - Leave community request
   * @returns Success status
   */
  static async leaveCommunity(request: LeaveCommunityRequest): Promise<{
    success: boolean;
    message?: string;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${request.communityId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: request.userAddress
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: result.error || 'Failed to leave community'
        };
      }
      
      return {
        success: true,
        message: 'Successfully left community'
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          message: 'Request timeout'
        };
      }
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to leave community'
      };
    }
  }

  /**
   * Create a post in a community with validation
   * @param request - Create post request
   * @returns Success status and post data
   */
  static async createCommunityPost(request: CreatePostRequest): Promise<{
    success: boolean;
    data?: any;
    message?: string;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Longer timeout for post creation
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${request.communityId}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authorAddress: request.authorAddress,
          title: request.title,
          content: request.content,
          mediaUrls: request.mediaUrls || [],
          tags: request.tags || [],
          postType: request.postType || 'discussion'
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: result.error || 'Failed to create post'
        };
      }
      
      return {
        success: true,
        data: result.data,
        message: 'Post created successfully'
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          message: 'Request timeout'
        };
      }
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create post'
      };
    }
  }

  /**
   * Perform moderation action on community content
   * @param action - Moderation action details
   * @returns Success status
   */
  static async performModerationAction(action: ModerationAction): Promise<{
    success: boolean;
    message?: string;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${action.communityId}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moderatorAddress: action.moderatorAddress,
          targetType: action.targetType,
          targetId: action.targetId,
          action: action.action,
          reason: action.reason,
          duration: action.duration
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: result.error || 'Failed to perform moderation action'
        };
      }
      
      return {
        success: true,
        message: 'Moderation action completed successfully'
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          message: 'Request timeout'
        };
      }
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to perform moderation action'
      };
    }
  }

  /**
   * Update community settings (moderator only)
   * @param settingsUpdate - Community settings update
   * @returns Success status
   */
  static async updateCommunitySettings(settingsUpdate: CommunitySettings): Promise<{
    success: boolean;
    message?: string;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${settingsUpdate.communityId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moderatorAddress: settingsUpdate.moderatorAddress,
          settings: settingsUpdate.settings
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: result.error || 'Failed to update community settings'
        };
      }
      
      return {
        success: true,
        message: 'Community settings updated successfully'
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          message: 'Request timeout'
        };
      }
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update community settings'
      };
    }
  }

  /**
   * Get community moderation queue (moderator only)
   * @param communityId - Community ID
   * @param moderatorAddress - Moderator wallet address
   * @returns Moderation queue items
   */
  static async getModerationQueue(communityId: string, moderatorAddress: string): Promise<{
    success: boolean;
    data?: any[];
    message?: string;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(
        `${BACKEND_API_BASE_URL}/api/communities/${communityId}/moderation-queue?moderator=${moderatorAddress}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      
      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: result.error || 'Failed to fetch moderation queue'
        };
      }
      
      return {
        success: true,
        data: result.data || [],
        message: 'Moderation queue fetched successfully'
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          message: 'Request timeout'
        };
      }
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch moderation queue'
      };
    }
  }

  /**
   * Check if user has moderation permissions in a community
   * @param communityId - Community ID
   * @param userAddress - User wallet address
   * @returns Moderation permissions
   */
  static async checkModerationPermissions(communityId: string, userAddress: string): Promise<{
    success: boolean;
    data?: {
      isModerator: boolean;
      isAdmin: boolean;
      permissions: string[];
    };
    message?: string;
  }> {
    try {
      const membership = await CommunityMembershipService.getMembership(communityId, userAddress);
      
      if (!membership) {
        return {
          success: true,
          data: {
            isModerator: false,
            isAdmin: false,
            permissions: []
          }
        };
      }
      
      const isModerator = ['moderator', 'admin', 'owner'].includes(membership.role);
      const isAdmin = ['admin', 'owner'].includes(membership.role);
      
      const permissions = [];
      if (isModerator) {
        permissions.push('moderate_posts', 'moderate_comments', 'warn_users');
      }
      if (isAdmin) {
        permissions.push('ban_users', 'update_settings', 'manage_moderators');
      }
      
      return {
        success: true,
        data: {
          isModerator,
          isAdmin,
          permissions
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to check permissions'
      };
    }
  }

  /**
   * Get community analytics (moderator only)
   * @param communityId - Community ID
   * @param moderatorAddress - Moderator wallet address
   * @returns Community analytics data
   */
  static async getCommunityAnalytics(communityId: string, moderatorAddress: string): Promise<{
    success: boolean;
    data?: {
      memberGrowth: number[];
      postActivity: number[];
      engagementMetrics: {
        averagePostsPerDay: number;
        averageCommentsPerPost: number;
        activeMembers: number;
        retentionRate: number;
      };
    };
    message?: string;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(
        `${BACKEND_API_BASE_URL}/api/communities/${communityId}/analytics?moderator=${moderatorAddress}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      
      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: result.error || 'Failed to fetch community analytics'
        };
      }
      
      return {
        success: true,
        data: result.data,
        message: 'Analytics fetched successfully'
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          message: 'Request timeout'
        };
      }
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch analytics'
      };
    }
  }
}