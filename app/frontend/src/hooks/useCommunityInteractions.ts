import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import {
  CommunityInteractionService,
  JoinCommunityRequest,
  LeaveCommunityRequest,
  CreatePostRequest,
  ModerationAction,
  UpdateCommunitySettingsParams
} from '../services/communityInteractionService';
import { useAuth } from '../context/AuthContext';

export interface UseCommunityInteractionsReturn {
  // State
  loading: boolean;
  error: string | null;

  // Join/Leave functions
  joinCommunity: (communityId: string) => Promise<boolean>;
  leaveCommunity: (communityId: string) => Promise<boolean>;

  // Posting functions
  createPost: (params: {
    communityId: string;
    communityIds?: string[];
    title: string;
    content: string;
    mediaUrls?: string[];
    tags?: string[];
    postType?: string;
  }) => Promise<boolean>;

  // Moderation functions
  moderateContent: (params: {
    communityId: string;
    targetType: 'post' | 'comment' | 'user';
    targetId: string;
    action: 'remove' | 'approve' | 'pin' | 'lock' | 'ban' | 'warn';
    reason?: string;
    duration?: number;
  }) => Promise<boolean>;

  updateSettings: (params: {
    communityId: string;
    settings: any;
  }) => Promise<boolean>;

  // Utility functions
  checkPermissions: (communityId: string) => Promise<{
    isModerator: boolean;
    isAdmin: boolean;
    permissions: string[];
  } | null>;

  getModerationQueue: (communityId: string) => Promise<any[] | null>;
  getAnalytics: (communityId: string) => Promise<any | null>;

  // Clear error
  clearError: () => void;
}

/**
 * Hook for community interactions including joining, posting, and moderation
 */
export function useCommunityInteractions(): UseCommunityInteractionsReturn {
  const { address } = useAccount();
  const { ensureAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const joinCommunity = useCallback(async (communityId: string): Promise<boolean> => {
    if (!address) {
      setError('Wallet not connected');
      return false;
    }

    // Ensure user is authenticated with backend
    const authResult = await ensureAuthenticated();
    if (!authResult.success) {
      setError(authResult.error || 'Authentication failed');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await CommunityInteractionService.joinCommunity({
        communityId,
        userAddress: address
      });

      if (!result.success) {
        setError(result.message || 'Failed to join community');
        return false;
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join community';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [address]);

  const leaveCommunity = useCallback(async (communityId: string): Promise<boolean> => {
    if (!address) {
      setError('Wallet not connected');
      return false;
    }

    // Ensure user is authenticated with backend
    const authResult = await ensureAuthenticated();
    if (!authResult.success) {
      setError(authResult.error || 'Authentication failed');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await CommunityInteractionService.leaveCommunity({
        communityId,
        userAddress: address
      });

      if (!result.success) {
        setError(result.message || 'Failed to leave community');
        return false;
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to leave community';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [address]);

  const createPost = useCallback(async (params: {
    communityId: string;
    communityIds?: string[];
    title: string;
    content: string;
    mediaUrls?: string[];
    tags?: string[];
    postType?: string;
  }): Promise<boolean> => {
    if (!address) {
      setError('Wallet not connected');
      return false;
    }

    // Ensure user is authenticated with backend
    const authResult = await ensureAuthenticated();
    if (!authResult.success) {
      setError(authResult.error || 'Authentication failed');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await CommunityInteractionService.createCommunityPost({
        ...params,
        authorAddress: address
      });

      if (!result.success) {
        setError(result.message || 'Failed to create post');
        return false;
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create post';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [address]);

  const moderateContent = useCallback(async (params: {
    communityId: string;
    targetType: 'post' | 'comment' | 'user';
    targetId: string;
    action: 'remove' | 'approve' | 'pin' | 'lock' | 'ban' | 'warn';
    reason?: string;
    duration?: number;
  }): Promise<boolean> => {
    if (!address) {
      setError('Wallet not connected');
      return false;
    }

    // Ensure user is authenticated with backend
    const authResult = await ensureAuthenticated();
    if (!authResult.success) {
      setError(authResult.error || 'Authentication failed');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await CommunityInteractionService.performModerationAction({
        ...params,
        moderatorAddress: address
      });

      if (!result.success) {
        setError(result.message || 'Failed to perform moderation action');
        return false;
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to perform moderation action';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [address]);

  const updateSettings = useCallback(async (params: {
    communityId: string;
    settings: any;
  }): Promise<boolean> => {
    if (!address) {
      setError('Wallet not connected');
      return false;
    }

    // Ensure user is authenticated with backend
    const authResult = await ensureAuthenticated();
    if (!authResult.success) {
      setError(authResult.error || 'Authentication failed');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await CommunityInteractionService.updateCommunitySettings({
        communityId: params.communityId,
        moderatorAddress: address,
        settings: params.settings
      });

      if (!result.success) {
        setError(result.message || 'Failed to update settings');
        return false;
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update settings';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [address]);

  const checkPermissions = useCallback(async (communityId: string) => {
    if (!address) {
      return null;
    }

    try {
      const result = await CommunityInteractionService.checkModerationPermissions(
        communityId,
        address
      );

      if (!result.success || !result.data) {
        return null;
      }

      return result.data;
    } catch (err) {
      console.error('Error checking permissions:', err);
      return null;
    }
  }, [address]);

  const getModerationQueue = useCallback(async (communityId: string) => {
    if (!address) {
      return null;
    }

    try {
      setLoading(true);
      const result = await CommunityInteractionService.getModerationQueue(
        communityId,
        address
      );

      if (!result.success || !result.data) {
        return null;
      }

      return result.data;
    } catch (err) {
      console.error('Error fetching moderation queue:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [address]);

  const getAnalytics = useCallback(async (communityId: string) => {
    if (!address) {
      return null;
    }

    try {
      setLoading(true);
      // TODO: Implement analytics functionality when the service method is available
      console.warn('getCommunityAnalytics method not implemented in CommunityInteractionService');
      return null;
    } catch (err) {
      console.error('Error fetching analytics:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [address, ensureAuthenticated]);

  return {
    loading,
    error,
    joinCommunity,
    leaveCommunity,
    createPost,
    moderateContent,
    updateSettings,
    checkPermissions,
    getModerationQueue,
    getAnalytics,
    clearError
  };
}