/**
 * Social Media Service
 * Handles OAuth connections and cross-posting to social platforms
 */

import * as Linking from 'expo-linking';
import { apiClient } from '@linkdao/shared';

export type SocialPlatform = 'twitter' | 'facebook' | 'linkedin' | 'threads';

export interface OAuthConnection {
    platform: SocialPlatform;
    connected: boolean;
    username?: string;
    profileUrl?: string;
}

class SocialMediaService {
    /**
     * Get all connected platforms
     */
    async getConnectedPlatforms(): Promise<OAuthConnection[]> {
        try {
            const response = await apiClient.get<{ connections: OAuthConnection[] }>(
                '/api/social-media/connections'
            );

            if (response.success && response.data) {
                return response.data.connections;
            }

            return [];
        } catch (error) {
            console.error('Failed to get connected platforms:', error);
            return [];
        }
    }

    /**
     * Initiate OAuth connection for a platform
     */
    async connectPlatform(platform: SocialPlatform): Promise<void> {
        try {
            // Get OAuth URL from backend
            const response = await apiClient.get<{ authUrl: string }>(
                `/api/social-media/connect/${platform}`
            );

            if (response.success && response.data?.authUrl) {
                // Open OAuth URL in browser
                await Linking.openURL(response.data.authUrl);
            } else {
                throw new Error('Failed to get OAuth URL');
            }
        } catch (error) {
            console.error(`Failed to connect ${platform}:`, error);
            throw error;
        }
    }

    /**
     * Disconnect a platform
     */
    async disconnectPlatform(platform: SocialPlatform): Promise<boolean> {
        try {
            const response = await apiClient.delete(`/api/social-media/disconnect/${platform}`);
            return response.success;
        } catch (error) {
            console.error(`Failed to disconnect ${platform}:`, error);
            return false;
        }
    }

    /**
     * Handle OAuth callback
     */
    async handleOAuthCallback(url: string): Promise<{
        success: boolean;
        platform?: SocialPlatform;
        error?: string;
    }> {
        try {
            const { queryParams } = Linking.parse(url);

            if (!queryParams) {
                return { success: false, error: 'Invalid callback URL' };
            }

            const { code, state, platform } = queryParams as {
                code?: string;
                state?: string;
                platform?: string;
            };

            if (!code || !platform) {
                return { success: false, error: 'Missing OAuth parameters' };
            }

            // Send code to backend to complete OAuth flow
            const response = await apiClient.post('/api/social-media/callback', {
                platform,
                code,
                state,
            });

            if (response.success) {
                return {
                    success: true,
                    platform: platform as SocialPlatform,
                };
            }

            return {
                success: false,
                error: response.error || 'OAuth callback failed',
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'OAuth callback failed',
            };
        }
    }

    /**
     * Share post to connected platforms
     */
    async sharePost(
        postId: string,
        platforms: SocialPlatform[],
        content: string,
        mediaUrls?: string[]
    ): Promise<{
        success: boolean;
        results?: Record<SocialPlatform, boolean>;
        error?: string;
    }> {
        try {
            const response = await apiClient.post<{ results: Record<SocialPlatform, boolean> }>(
                '/api/social-media/share',
                {
                    postId,
                    platforms,
                    content,
                    mediaUrls,
                }
            );

            if (response.success && response.data) {
                return {
                    success: true,
                    results: response.data.results,
                };
            }

            return {
                success: false,
                error: response.error || 'Failed to share post',
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to share post',
            };
        }
    }
}

export const socialMediaService = new SocialMediaService();
