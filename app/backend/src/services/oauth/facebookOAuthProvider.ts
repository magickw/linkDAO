/**
 * Facebook OAuth Provider
 * Implements OAuth 2.0 for Facebook Graph API
 */

import { BaseOAuthProvider, OAuthConfig, OAuthTokens, OAuthUserInfo, SocialMediaContent, PostResult } from './baseOAuthProvider';
import { safeLogger } from '../../utils/safeLogger';

// Facebook API endpoints (using v18.0)
const FACEBOOK_API_VERSION = 'v18.0';
const FACEBOOK_AUTH_URL = `https://www.facebook.com/${FACEBOOK_API_VERSION}/dialog/oauth`;
const FACEBOOK_TOKEN_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/oauth/access_token`;
const FACEBOOK_DEBUG_TOKEN_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/debug_token`;
const FACEBOOK_USER_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/me`;
const FACEBOOK_FEED_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/me/feed`;

// Default scopes for Facebook
// Note: public_profile is always included by default
// - pages_manage_posts: Create and manage posts as a Page
// - pages_read_engagement: Read engagement data for Pages
//
// NOTE: 'publish_to_groups' requires specific app review and is often restricted.
// NOTE: 'pages_manage_posts' and 'pages_read_engagement' require "Business" app type verification.
// If the app is in "Consumer" mode, these will cause "Invalid Scopes".
// We generate a limited scope set for development/consumer apps.
const DEFAULT_SCOPES = ['public_profile', 'email'];

export class FacebookOAuthProvider extends BaseOAuthProvider {
  constructor() {
    const config: OAuthConfig = {
      clientId: process.env.FACEBOOK_APP_ID || '',
      clientSecret: process.env.FACEBOOK_APP_SECRET || '',
      callbackUrl: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:3001/api/social-media/callback/facebook',
      scopes: DEFAULT_SCOPES,
      authorizationUrl: FACEBOOK_AUTH_URL,
      tokenUrl: FACEBOOK_TOKEN_URL,
    };
    super('facebook', config);
  }

  /**
   * Build Facebook OAuth authorization URL
   */
  getAuthorizationUrl(state: string, _codeVerifier?: string): string {
    if (!this.config.clientId) {
      throw new Error('Facebook App ID is not configured (FACEBOOK_APP_ID)');
    }

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.callbackUrl,
      scope: this.config.scopes.join(','),
      state: state,
      response_type: 'code',
    });

    return `${FACEBOOK_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, _codeVerifier?: string): Promise<OAuthTokens> {
    try {
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.callbackUrl,
        code: code,
      });

      const response = await fetch(`${FACEBOOK_TOKEN_URL}?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        safeLogger.error('Facebook token exchange failed:', { status: response.status, error: errorData });
        throw new Error(`Token exchange failed: ${errorData.error?.message || response.status}`);
      }

      const data = await response.json();

      // Facebook returns expires_in in seconds
      const expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined;

      return {
        accessToken: data.access_token,
        expiresAt,
        tokenType: data.token_type || 'bearer',
      };
    } catch (error) {
      safeLogger.error('Facebook token exchange error:', error);
      throw error;
    }
  }

  /**
   * Exchange short-lived token for long-lived token
   * Facebook short-lived tokens expire in ~2 hours, long-lived in ~60 days
   */
  async exchangeForLongLivedToken(shortLivedToken: string): Promise<OAuthTokens> {
    try {
      const params = new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        fb_exchange_token: shortLivedToken,
      });

      const response = await fetch(`${FACEBOOK_TOKEN_URL}?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        safeLogger.error('Facebook long-lived token exchange failed:', { status: response.status, error: errorData });
        throw new Error(`Long-lived token exchange failed: ${errorData.error?.message || response.status}`);
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        expiresAt: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000)
          : undefined,
        tokenType: data.token_type || 'bearer',
      };
    } catch (error) {
      safeLogger.error('Facebook long-lived token error:', error);
      throw error;
    }
  }

  /**
   * Refresh an expired access token
   * Note: Facebook doesn't use traditional refresh tokens
   * Long-lived tokens need to be refreshed before they expire
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    // For Facebook, we try to exchange the current token for a new long-lived one
    // This only works if the token hasn't expired yet
    return this.exchangeForLongLivedToken(refreshToken);
  }

  /**
   * Get user information from Facebook
   */
  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    try {
      const params = new URLSearchParams({
        fields: 'id,name,email,picture.type(large)',
        access_token: accessToken,
      });

      const response = await fetch(`${FACEBOOK_USER_URL}?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        safeLogger.error('Facebook user info fetch failed:', { status: response.status, error: errorData });
        throw new Error(`Failed to get user info: ${errorData.error?.message || response.status}`);
      }

      const data = await response.json();

      return {
        platformUserId: data.id,
        displayName: data.name,
        email: data.email,
        avatarUrl: data.picture?.data?.url,
      };
    } catch (error) {
      safeLogger.error('Facebook user info error:', error);
      throw error;
    }
  }

  /**
   * Revoke an access token (delete app permissions)
   */
  async revokeToken(accessToken: string): Promise<void> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/${FACEBOOK_API_VERSION}/me/permissions?access_token=${accessToken}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        safeLogger.error('Facebook token revoke failed:', { status: response.status, error: errorData });
      }
    } catch (error) {
      safeLogger.error('Facebook token revoke error:', error);
    }
  }

  /**
   * Post content to Facebook
   * Note: Posting to personal timeline requires publish_actions permission
   * which is only available to apps that have gone through app review
   *
   * For general use, this would post to a Page the user manages
   */
  async postContent(accessToken: string, content: SocialMediaContent): Promise<PostResult> {
    try {
      const adaptedContent = this.adaptContent(content);

      // Build post payload
      const postPayload: Record<string, string> = {
        message: adaptedContent.text,
        access_token: accessToken,
      };

      // Add link if present
      if (adaptedContent.link) {
        postPayload.link = adaptedContent.link;
      }

      // Note: For media, Facebook requires either:
      // 1. A URL to an image (using 'url' parameter on /photos endpoint)
      // 2. Uploading to /photos endpoint first, then attaching to post
      // This is a simplified implementation that handles text/link posts

      const response = await fetch(FACEBOOK_FEED_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(postPayload).toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        safeLogger.error('Facebook post failed:', { status: response.status, error: errorData });

        // Check for common errors
        if (errorData.error?.code === 190) {
          return {
            success: false,
            error: 'Access token expired or invalid. Please reconnect your Facebook account.',
          };
        }
        if (errorData.error?.code === 200) {
          return {
            success: false,
            error: 'Posting permission denied. App may need additional permissions.',
          };
        }

        return {
          success: false,
          error: errorData.error?.message || 'Failed to post to Facebook',
        };
      }

      const data = await response.json();

      return {
        success: true,
        externalPostId: data.id,
        externalPostUrl: data.id ? `https://www.facebook.com/${data.id}` : undefined,
      };
    } catch (error) {
      safeLogger.error('Facebook post error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error posting to Facebook',
      };
    }
  }

  /**
   * Get user's managed pages (for page posting)
   */
  async getManagedPages(accessToken: string): Promise<Array<{ id: string; name: string; accessToken: string }>> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/${FACEBOOK_API_VERSION}/me/accounts?access_token=${accessToken}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        safeLogger.error('Facebook pages fetch failed:', { status: response.status, error: errorData });
        return [];
      }

      const data = await response.json();
      return (data.data || []).map((page: any) => ({
        id: page.id,
        name: page.name,
        accessToken: page.access_token,
      }));
    } catch (error) {
      safeLogger.error('Facebook pages fetch error:', error);
      return [];
    }
  }

  /**
   * Post to a specific Facebook Page
   */
  async postToPage(pageAccessToken: string, pageId: string, content: SocialMediaContent): Promise<PostResult> {
    try {
      const adaptedContent = this.adaptContent(content);

      const postPayload: Record<string, string> = {
        message: adaptedContent.text,
        access_token: pageAccessToken,
      };

      if (adaptedContent.link) {
        postPayload.link = adaptedContent.link;
      }

      const response = await fetch(
        `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${pageId}/feed`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(postPayload).toString(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        safeLogger.error('Facebook page post failed:', { status: response.status, error: errorData });
        return {
          success: false,
          error: errorData.error?.message || 'Failed to post to Facebook Page',
        };
      }

      const data = await response.json();

      return {
        success: true,
        externalPostId: data.id,
        externalPostUrl: data.id ? `https://www.facebook.com/${data.id}` : undefined,
      };
    } catch (error) {
      safeLogger.error('Facebook page post error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error posting to Facebook Page',
      };
    }
  }

  /**
   * Facebook doesn't use traditional refresh tokens
   * Long-lived tokens can be refreshed before expiry
   */
  supportsRefreshToken(): boolean {
    return false; // Not traditional refresh tokens
  }
}
