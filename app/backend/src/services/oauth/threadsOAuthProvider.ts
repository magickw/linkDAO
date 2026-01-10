/**
 * Threads OAuth Provider
 * Implements OAuth 2.0 for Threads API (Meta)
 *
 * Threads API uses a two-step publishing process:
 * 1. Create a media container with content
 * 2. Publish the container
 */

import { BaseOAuthProvider, OAuthConfig, OAuthTokens, OAuthUserInfo, SocialMediaContent, PostResult } from './baseOAuthProvider';
import { safeLogger } from '../../utils/safeLogger';

// Threads API endpoints
const THREADS_AUTH_URL = 'https://threads.net/oauth/authorize';
const THREADS_TOKEN_URL = 'https://graph.threads.net/oauth/access_token';
const THREADS_API_BASE = 'https://graph.threads.net/v1.0';

// Default scopes for Threads
// threads_basic - Read profile info
// threads_content_publish - Post content
const DEFAULT_SCOPES = ['threads_basic', 'threads_content_publish'];

export class ThreadsOAuthProvider extends BaseOAuthProvider {
  constructor() {
    const config: OAuthConfig = {
      clientId: process.env.THREADS_APP_ID || process.env.THREADS_CLIENT_ID || '',
      clientSecret: process.env.THREADS_APP_SECRET || process.env.THREADS_CLIENT_SECRET || '',
      callbackUrl: process.env.THREADS_CALLBACK_URL || 'http://localhost:3001/api/social-media/callback/threads',
      scopes: DEFAULT_SCOPES,
      authorizationUrl: THREADS_AUTH_URL,
      tokenUrl: THREADS_TOKEN_URL,
    };
    super('threads', config);
  }

  /**
   * Build Threads OAuth authorization URL
   */
  getAuthorizationUrl(state: string, _codeVerifier?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.callbackUrl,
      scope: this.config.scopes.join(','),
      response_type: 'code',
      state: state,
    });

    return `${THREADS_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, _codeVerifier?: string): Promise<OAuthTokens> {
    try {
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.config.callbackUrl,
        code: code,
      });

      const response = await fetch(THREADS_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        safeLogger.error('Threads token exchange failed:', { status: response.status, error: errorText });
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const data = await response.json();

      // Exchange short-lived token for long-lived token
      const longLivedToken = await this.exchangeForLongLivedToken(data.access_token);

      return {
        accessToken: longLivedToken.accessToken,
        refreshToken: longLivedToken.refreshToken,
        expiresAt: longLivedToken.expiresAt,
        tokenType: 'Bearer',
        scopes: this.config.scopes,
      };
    } catch (error) {
      safeLogger.error('Threads token exchange error:', error);
      throw error;
    }
  }

  /**
   * Exchange short-lived token for long-lived token (60 days)
   */
  private async exchangeForLongLivedToken(shortLivedToken: string): Promise<OAuthTokens> {
    try {
      const params = new URLSearchParams({
        grant_type: 'th_exchange_token',
        client_secret: this.config.clientSecret,
        access_token: shortLivedToken,
      });

      const response = await fetch(`${THREADS_API_BASE}/access_token?${params.toString()}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorText = await response.text();
        safeLogger.error('Threads long-lived token exchange failed:', { status: response.status, error: errorText });
        // Fall back to short-lived token
        return {
          accessToken: shortLivedToken,
          expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
        };
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        expiresAt: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000)
          : new Date(Date.now() + 60 * 24 * 3600 * 1000), // 60 days default
        tokenType: data.token_type || 'Bearer',
      };
    } catch (error) {
      safeLogger.error('Threads long-lived token exchange error:', error);
      // Fall back to short-lived token
      return {
        accessToken: shortLivedToken,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      };
    }
  }

  /**
   * Refresh an expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    try {
      const params = new URLSearchParams({
        grant_type: 'th_refresh_token',
        access_token: refreshToken,
      });

      const response = await fetch(`${THREADS_API_BASE}/refresh_access_token?${params.toString()}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorText = await response.text();
        safeLogger.error('Threads token refresh failed:', { status: response.status, error: errorText });
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        expiresAt: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000)
          : new Date(Date.now() + 60 * 24 * 3600 * 1000), // 60 days
        tokenType: data.token_type || 'Bearer',
      };
    } catch (error) {
      safeLogger.error('Threads token refresh error:', error);
      throw error;
    }
  }

  /**
   * Get user information from Threads
   */
  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    try {
      const params = new URLSearchParams({
        fields: 'id,username,threads_profile_picture_url,threads_biography',
        access_token: accessToken,
      });

      const response = await fetch(`${THREADS_API_BASE}/me?${params.toString()}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorText = await response.text();
        safeLogger.error('Threads user info fetch failed:', { status: response.status, error: errorText });
        throw new Error(`Failed to get user info: ${response.status}`);
      }

      const data = await response.json();

      return {
        platformUserId: data.id,
        username: data.username,
        displayName: data.username, // Threads uses username as display name
        avatarUrl: data.threads_profile_picture_url,
      };
    } catch (error) {
      safeLogger.error('Threads user info error:', error);
      throw error;
    }
  }

  /**
   * Revoke an access token
   * Note: Threads doesn't have a public token revocation endpoint
   */
  async revokeToken(_accessToken: string): Promise<void> {
    // Threads doesn't provide a token revocation endpoint
    // Users must manually revoke access from their Threads settings
    safeLogger.info('Threads token revocation: Token removed from storage (manual revocation required on Threads)');
  }

  /**
   * Post content to Threads
   * Uses two-step process: create container, then publish
   */
  async postContent(accessToken: string, content: SocialMediaContent): Promise<PostResult> {
    try {
      const adaptedContent = this.adaptContent(content);

      // Get user ID first
      const userInfo = await this.getUserInfo(accessToken);
      const userId = userInfo.platformUserId;

      // Step 1: Create media container
      const containerParams: Record<string, string> = {
        media_type: 'TEXT',
        text: adaptedContent.text,
        access_token: accessToken,
      };

      // Add link if present
      if (adaptedContent.link) {
        containerParams.text = `${adaptedContent.text}\n\n${adaptedContent.link}`;
      }

      // Note: For image/video posts, you would need to:
      // 1. Set media_type to 'IMAGE' or 'VIDEO'
      // 2. Add image_url or video_url parameter
      // 3. For carousel, set media_type to 'CAROUSEL' and add children

      const createResponse = await fetch(`${THREADS_API_BASE}/${userId}/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(containerParams).toString(),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        safeLogger.error('Threads container creation failed:', { status: createResponse.status, error: errorData });

        if (createResponse.status === 401) {
          return {
            success: false,
            error: 'Access token expired or invalid. Please reconnect your Threads account.',
          };
        }

        return {
          success: false,
          error: errorData.error?.message || 'Failed to create Threads post container',
        };
      }

      const containerData = await createResponse.json();
      const containerId = containerData.id;

      // Step 2: Publish the container
      // Wait a moment for the container to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      const publishResponse = await fetch(`${THREADS_API_BASE}/${userId}/threads_publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          creation_id: containerId,
          access_token: accessToken,
        }).toString(),
      });

      if (!publishResponse.ok) {
        const errorData = await publishResponse.json();
        safeLogger.error('Threads publish failed:', { status: publishResponse.status, error: errorData });

        return {
          success: false,
          error: errorData.error?.message || 'Failed to publish Threads post',
        };
      }

      const publishData = await publishResponse.json();
      const postId = publishData.id;

      return {
        success: true,
        externalPostId: postId,
        externalPostUrl: `https://www.threads.net/@${userInfo.username}/post/${postId}`,
      };
    } catch (error) {
      safeLogger.error('Threads post error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error posting to Threads',
      };
    }
  }

  /**
   * Threads supports token refresh (long-lived tokens can be refreshed)
   */
  supportsRefreshToken(): boolean {
    return true;
  }
}
