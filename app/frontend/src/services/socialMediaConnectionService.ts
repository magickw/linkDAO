/**
 * Social Media Connection Service
 * Handles OAuth connections to social media platforms (Twitter, Facebook, LinkedIn, Threads)
 */

import { get, post, del } from './globalFetchWrapper';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:10000';

// Platform types
export type SocialPlatform = 'twitter' | 'facebook' | 'linkedin' | 'threads' | 'bluesky';

// Connection status
export type ConnectionStatus = 'active' | 'expired' | 'revoked' | 'error';

// Social media connection data
export interface SocialMediaConnection {
  id: string;
  userId: string;
  platform: SocialPlatform;
  platformUsername?: string;
  platformDisplayName?: string;
  platformAvatarUrl?: string;
  status: ConnectionStatus;
  lastError?: string;
  lastUsedAt?: string;
  connectedAt: string;
  updatedAt: string;
}

// OAuth initiation response
export interface OAuthInitiationResponse {
  success: boolean;
  data?: {
    authUrl: string;
    platform: SocialPlatform;
  };
  message: string;
  error?: string;
}

// Get connections response
export interface GetConnectionsResponse {
  success: boolean;
  data: SocialMediaConnection[];
  message: string;
}

// Disconnect response
export interface DisconnectResponse {
  success: boolean;
  message: string;
  error?: string;
}

// Refresh token response
export interface RefreshTokenResponse {
  success: boolean;
  data?: SocialMediaConnection;
  message: string;
  error?: string;
}

/**
 * Initiate OAuth flow for a platform
 * @param platform - The social media platform to connect
 * @returns OAuth authorization URL
 */
export const initiateOAuth = async (
  platform: SocialPlatform
): Promise<OAuthInitiationResponse> => {
  try {
    const response = await post<OAuthInitiationResponse>(
      `${API_BASE_URL}/api/social-media/connect/${platform}`
    );

    if (!response.success) {
      throw new Error(response.error || response.data?.message || 'Failed to initiate OAuth');
    }

    return response.data || { success: false, message: 'No data received' };
  } catch (error) {
    console.error(`Error initiating OAuth for ${platform}:`, error);
    return {
      success: false,
      message: 'Failed to initiate OAuth connection',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get all social media connections for the current user
 * @returns List of connected platforms
 */
export const getConnections = async (): Promise<GetConnectionsResponse> => {
  try {
    const response = await get<GetConnectionsResponse>(
      `${API_BASE_URL}/api/social-media/connections`
    );

    if (!response.success) {
      throw new Error(response.error || response.data?.message || 'Failed to fetch connections');
    }

    return response.data || { success: false, data: [], message: 'No data received' };
  } catch (error) {
    console.error('Error fetching connections:', error);
    return {
      success: false,
      data: [],
      message: 'Failed to fetch connections',
    };
  }
};

/**
 * Get connection status for a specific platform
 * @param platform - The social media platform
 * @returns Connection status or null if not connected
 */
export const getConnectionStatus = async (
  platform: SocialPlatform
): Promise<SocialMediaConnection | null> => {
  try {
    const response = await get<{ success: boolean; data: SocialMediaConnection }>(
      `${API_BASE_URL}/api/social-media/connections/${platform}`
    );

    if (response.status === 404) {
      return null; // No connection exists
    }

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch connection status');
    }

    return response.data?.data || null;
  } catch (error) {
    console.error(`Error fetching connection status for ${platform}:`, error);
    return null;
  }
};

/**
 * Disconnect a social media platform
 * @param platform - The social media platform to disconnect
 * @returns Success status
 */
export const disconnectPlatform = async (
  platform: SocialPlatform
): Promise<DisconnectResponse> => {
  try {
    const response = await del<DisconnectResponse>(
      `${API_BASE_URL}/api/social-media/connections/${platform}`
    );

    if (!response.success) {
      throw new Error(response.error || response.data?.message || 'Failed to disconnect platform');
    }

    return response.data || { success: false, message: 'No data received' };
  } catch (error) {
    console.error(`Error disconnecting ${platform}:`, error);
    return {
      success: false,
      message: 'Failed to disconnect platform',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Refresh OAuth token for a platform
 * @param platform - The social media platform
 * @returns Updated connection data
 */
export const refreshToken = async (
  platform: SocialPlatform
): Promise<RefreshTokenResponse> => {
  try {
    const response = await post<RefreshTokenResponse>(
      `${API_BASE_URL}/api/social-media/connections/${platform}/refresh`
    );

    if (!response.success) {
      throw new Error(response.error || response.data?.message || 'Failed to refresh token');
    }

    return response.data || { success: false, message: 'No data received' };
  } catch (error) {
    console.error(`Error refreshing token for ${platform}:`, error);
    return {
      success: false,
      message: 'Failed to refresh token',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Platform configuration for UI display
 */
export const PLATFORM_CONFIG: Record<SocialPlatform, {
  name: string;
  displayName: string;
  icon: string;
  color: string;
  description: string;
  features: string[];
}> = {
  twitter: {
    name: 'twitter',
    displayName: 'Twitter / X',
    icon: '𝕏',
    color: '#000000',
    description: 'Share your statuses to Twitter/X with up to 280 characters and 4 images',
    features: ['280 characters', '4 images', 'Real-time posting'],
  },
  facebook: {
    name: 'facebook',
    displayName: 'Facebook',
    icon: 'f',
    color: '#1877F2',
    description: 'Share your statuses to Facebook with up to 63,206 characters and 10 images',
    features: ['63,206 characters', '10 images', 'Rich media support'],
  },
  linkedin: {
    name: 'linkedin',
    displayName: 'LinkedIn',
    icon: 'in',
    color: '#0A66C2',
    description: 'Share professional updates to LinkedIn with up to 3,000 characters and 9 images',
    features: ['3,000 characters', '9 images', 'Professional network'],
  },
  threads: {
    name: 'threads',
    displayName: 'Threads',
    icon: '@',
    color: '#000000',
    description: 'Share your statuses to Threads with up to 500 characters and 10 images',
    features: ['500 characters', '10 images', 'Instagram integration'],
  },
  bluesky: {
    name: 'bluesky',
    displayName: 'Bluesky',
    icon: '🦋',
    color: '#0085FF',
    description: 'Share your statuses to Bluesky with up to 300 characters and 4 images',
    features: ['300 characters', '4 images', 'Open network'],
  },
};

/**
 * Check if a platform is connected
 * @param connections - List of connections
 * @param platform - Platform to check
 * @returns Connection object or null
 */
export const isPlatformConnected = (
  connections: SocialMediaConnection[],
  platform: SocialPlatform
): SocialMediaConnection | null => {
  return connections.find(conn => conn.platform === platform) || null;
};

/**
 * Get platform display name
 * @param platform - Platform enum
 * @returns Display name
 */
export const getPlatformDisplayName = (platform: SocialPlatform): string => {
  return PLATFORM_CONFIG[platform].displayName;
};

/**
 * Get platform icon
 * @param platform - Platform enum
 * @returns Icon character
 */
export const getPlatformIcon = (platform: SocialPlatform): string => {
  return PLATFORM_CONFIG[platform].icon;
};

/**
 * Get platform color
 * @param platform - Platform enum
 * @returns Color hex code
 */
export const getPlatformColor = (platform: SocialPlatform): string => {
  return PLATFORM_CONFIG[platform].color;
};