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
import { ModerationQueue as ModerationQueueItem } from '../types/auth';
import { requestManager } from './requestManager';
import { enhancedAuthService } from './enhancedAuthService';

// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

export interface CommunityAnalyticsResponse {
  success: boolean;
  analytics: {
    totalPosts: number;
    totalComments: number;
    activeUsers: number;
    moderationStats: {
      pending: number;
      approved: number;
      rejected: number;
    };
  };
}

export interface CreatePostInput {
  communityId: string;
  communityIds?: string[];
  title: string;
  content: string;
  tags?: string[];
  mediaUrls?: string[];
  postType?: string;
}

export interface CreatePostResponse {
  success: boolean;
  postId?: string;
  message?: string;
}

export interface AIAssistedPostTitleResponse {
  title: string;
  suggestions: string[];
}

export interface AIAssistedPostContentResponse {
  content: string;
}

export interface AIAssistedPostTagsResponse {
  tags: string[];
}

export interface AIAssistedPostImprovementResponse {
  improvedContent: string;
  suggestions: string[];
}

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
  communityIds?: string[]; // For multi-community posting
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
  targetType: string;
  targetId: string;
  action: string;
  reason?: string;
  duration?: number;
}

export interface UpdateCommunitySettingsParams {
  communityId: string;
  moderatorAddress: string;
  settings: any;
}



/**
 * Community Interaction Service
 * Handles real community interactions including joining, posting, and moderation
 */
export class CommunityInteractionService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${BACKEND_API_BASE_URL}/communities`;
  }

  /**
   * Create a new post in a community
   */
  async createPost(input: CreatePostInput): Promise<boolean> {
    try {
      // Client-side validation
      if (!input.communityId) {
        throw new Error('Community ID is required');
      }

      if (!input.title || input.title.trim().length < 1) {
        throw new Error('Post title is required');
      }

      if (!input.content || input.content.trim().length < 1) {
        throw new Error('Post content is required');
      }

      if (input.title.trim().length > 200) {
        throw new Error('Post title must be less than 200 characters');
      }

      if (input.content.trim().length > 10000) {
        throw new Error('Post content must be less than 10,000 characters');
      }

      if (input.tags && input.tags.length > 10) {
        throw new Error('Cannot have more than 10 tags');
      }

      if (input.mediaUrls && input.mediaUrls.length > 5) {
        throw new Error('Cannot have more than 5 media URLs');
      }

      const response = await requestManager.request<CreatePostResponse>(`${this.baseUrl}/${input.communityId}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      // TODO: Implement analytics tracking when analyticsService is available
      // analyticsService.trackUserEvent('post_created', {
      //   communityId: input.communityId,
      //   postType: input.postType || 'discussion',
      //   titleLength: input.title.length,
      //   contentLength: input.content.length,
      //   tagCount: input.tags?.length || 0,
      //   mediaCount: input.mediaUrls?.length || 0
      // });

      return response.success;
    } catch (error) {
      console.error('Error creating post:', error);

      // TODO: Implement error tracking when analyticsService is available

      return false;
    }
  }

  /**
   * Generate AI-assisted post title
   */
  async generatePostTitle(content: string, communityId: string, communityName: string): Promise<AIAssistedPostTitleResponse> {
    try {
      // Client-side validation
      if (!content || content.trim().length < 20) {
        throw new Error('Content must be at least 20 characters for title generation');
      }

      if (content.trim().length > 10000) {
        throw new Error('Content is too long for title generation');
      }

      const response = await requestManager.request<AIAssistedPostTitleResponse>(`${this.baseUrl}/${communityId}/ai/generate-title`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, communityName }),
      });

      return response;
    } catch (error) {
      console.error('Error generating post title:', error);
      throw error;
    }
  }

  /**
   * Generate AI-assisted post content
   */
  async generatePostContent(topic: string, communityId: string, communityName: string): Promise<AIAssistedPostContentResponse> {
    try {
      // Client-side validation
      if (!topic || topic.trim().length < 5) {
        throw new Error('Topic must be at least 5 characters for content generation');
      }

      if (topic.trim().length > 200) {
        throw new Error('Topic is too long for content generation');
      }

      const response = await requestManager.request<AIAssistedPostContentResponse>(`${this.baseUrl}/${communityId}/ai/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic, communityName }),
      });

      return response;
    } catch (error) {
      console.error('Error generating post content:', error);
      throw error;
    }
  }

  /**
   * Generate AI-assisted post tags
   */
  async generatePostTags(content: string, communityId: string, communityName: string): Promise<AIAssistedPostTagsResponse> {
    try {
      // Client-side validation
      if (!content || content.trim().length < 30) {
        throw new Error('Content must be at least 30 characters for tag generation');
      }

      if (content.trim().length > 10000) {
        throw new Error('Content is too long for tag generation');
      }

      const response = await requestManager.request<AIAssistedPostTagsResponse>(`${this.baseUrl}/${communityId}/ai/generate-tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, communityName }),
      });

      return response;
    } catch (error) {
      console.error('Error generating post tags:', error);
      throw error;
    }
  }

  /**
   * Improve post content with AI assistance
   */
  async improvePostContent(content: string, communityId: string, communityName: string): Promise<AIAssistedPostImprovementResponse> {
    try {
      // Client-side validation
      if (!content || content.trim().length < 50) {
        throw new Error('Content must be at least 50 characters for improvement');
      }

      if (content.trim().length > 10000) {
        throw new Error('Content is too long for improvement');
      }

      const response = await requestManager.request<AIAssistedPostImprovementResponse>(`${this.baseUrl}/${communityId}/ai/improve-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, communityName }),
      });

      return response;
    } catch (error) {
      console.error('Error improving post content:', error);
      throw error;
    }
  }

  /**
   * Join a community
   */
  async joinCommunity(communityId: string): Promise<boolean> {
    try {
      const response = await requestManager.request<{ success: boolean }>(`${this.baseUrl}/${communityId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // TODO: Implement success tracking when analyticsService is available

      return response.success;
    } catch (error) {
      console.error('Error joining community:', error);

      // TODO: Implement error tracking when analyticsService is available

      return false;
    }
  }

  /**
   * Leave a community
   */
  async leaveCommunity(communityId: string): Promise<boolean> {
    try {
      const response = await requestManager.request<{ success: boolean }>(`${this.baseUrl}/${communityId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // TODO: Implement success tracking when analyticsService is available

      return response.success;
    } catch (error) {
      console.error('Error leaving community:', error);

      // TODO: Implement error tracking when analyticsService is available

      return false;
    }
  }

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
      // Get authentication headers
      const authHeaders = await enhancedAuthService.getAuthHeaders();

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${request.communityId}/posts`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          authorAddress: request.authorAddress,
          title: request.title,
          content: request.content,
          mediaUrls: request.mediaUrls,
          tags: request.tags,
          postType: request.postType,
          communityIds: request.communityIds
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
   * Create an AI-assisted post in a community
   * @param request - Create post request with AI assistance
   * @returns Success status and post data or AI suggestions
   */
  static async createAIAssistedPost(request: CreatePostRequest & {
    aiAction?: 'generate_title' | 'generate_content' | 'generate_tags' | 'improve_content';
    communityContext?: any;
  }): Promise<{
    success: boolean;
    data?: any;
    message?: string;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Longer timeout for AI operations

    try {
      // Get authentication headers
      const authHeaders = await enhancedAuthService.getAuthHeaders();

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${request.communityId}/posts/ai-assisted`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          authorAddress: request.authorAddress,
          title: request.title,
          content: request.content,
          mediaUrls: request.mediaUrls,
          tags: request.tags,
          postType: request.postType,
          aiAction: request.aiAction,
          communityContext: request.communityContext
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: result.error || 'Failed to process AI request'
        };
      }

      return {
        success: true,
        data: result.data,
        message: 'AI request processed successfully'
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
        message: error instanceof Error ? error.message : 'Failed to process AI request'
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
      // Get authentication headers
      const authHeaders = await enhancedAuthService.getAuthHeaders();

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${action.communityId}/moderate`, {
        method: 'POST',
        headers: authHeaders,
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
  static async updateCommunitySettings(settingsUpdate: UpdateCommunitySettingsParams): Promise<{
    success: boolean;
    message?: string;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      // Get authentication headers
      const authHeaders = await enhancedAuthService.getAuthHeaders();

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${settingsUpdate.communityId}/settings`, {
        method: 'PUT',
        headers: authHeaders,
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
        data: result.queue || [],
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

}

export const communityInteractionService = new CommunityInteractionService();
export default communityInteractionService;