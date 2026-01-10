/**
 * Twitter/X OAuth 2.0 Provider
 * Implements OAuth 2.0 with PKCE for Twitter API v2
 */

import { BaseOAuthProvider, OAuthConfig, OAuthTokens, OAuthUserInfo, SocialMediaContent, PostResult } from './baseOAuthProvider';
import { safeLogger } from '../../utils/safeLogger';

// Twitter API endpoints
const TWITTER_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
const TWITTER_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const TWITTER_REVOKE_URL = 'https://api.twitter.com/2/oauth2/revoke';
const TWITTER_USER_URL = 'https://api.twitter.com/2/users/me';
const TWITTER_TWEET_URL = 'https://api.twitter.com/2/tweets';
const TWITTER_MEDIA_UPLOAD_URL = 'https://upload.twitter.com/1.1/media/upload.json';

// Default scopes for Twitter
const DEFAULT_SCOPES = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];

export class TwitterOAuthProvider extends BaseOAuthProvider {
  constructor() {
    const config: OAuthConfig = {
      clientId: process.env.TWITTER_CLIENT_ID || '',
      clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
      callbackUrl: process.env.TWITTER_CALLBACK_URL || 'http://localhost:3001/api/social-media/callback/twitter',
      scopes: DEFAULT_SCOPES,
      authorizationUrl: TWITTER_AUTH_URL,
      tokenUrl: TWITTER_TOKEN_URL,
    };
    super('twitter', config);
  }

  /**
   * Build Twitter OAuth 2.0 authorization URL with PKCE
   */
  getAuthorizationUrl(state: string, codeVerifier?: string): string {
    if (!codeVerifier) {
      throw new Error('Code verifier is required for Twitter OAuth 2.0 PKCE');
    }

    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.callbackUrl,
      scope: this.config.scopes.join(' '),
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${TWITTER_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, codeVerifier?: string): Promise<OAuthTokens> {
    if (!codeVerifier) {
      throw new Error('Code verifier is required for Twitter OAuth 2.0 PKCE');
    }

    try {
      const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');

      const response = await fetch(TWITTER_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.config.callbackUrl,
          code_verifier: codeVerifier,
        }).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        safeLogger.error('Twitter token exchange failed:', { status: response.status, error: errorText });
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
        tokenType: data.token_type,
        scopes: data.scope?.split(' '),
      };
    } catch (error) {
      safeLogger.error('Twitter token exchange error:', error);
      throw error;
    }
  }

  /**
   * Refresh an expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    try {
      const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');

      const response = await fetch(TWITTER_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        safeLogger.error('Twitter token refresh failed:', { status: response.status, error: errorText });
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // Twitter may or may not return a new refresh token
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
        tokenType: data.token_type,
        scopes: data.scope?.split(' '),
      };
    } catch (error) {
      safeLogger.error('Twitter token refresh error:', error);
      throw error;
    }
  }

  /**
   * Get user information from Twitter
   */
  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    try {
      const response = await fetch(`${TWITTER_USER_URL}?user.fields=profile_image_url,name,username`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        safeLogger.error('Twitter user info fetch failed:', { status: response.status, error: errorText });
        throw new Error(`Failed to get user info: ${response.status}`);
      }

      const data = await response.json();
      const user = data.data;

      return {
        platformUserId: user.id,
        username: user.username,
        displayName: user.name,
        avatarUrl: user.profile_image_url?.replace('_normal', '_400x400'), // Get higher resolution
      };
    } catch (error) {
      safeLogger.error('Twitter user info error:', error);
      throw error;
    }
  }

  /**
   * Revoke an access token
   */
  async revokeToken(accessToken: string): Promise<void> {
    try {
      const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');

      const response = await fetch(TWITTER_REVOKE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          token: accessToken,
          token_type_hint: 'access_token',
        }).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        safeLogger.error('Twitter token revoke failed:', { status: response.status, error: errorText });
        // Don't throw - revocation failure shouldn't prevent disconnect
      }
    } catch (error) {
      safeLogger.error('Twitter token revoke error:', error);
      // Don't throw - revocation failure shouldn't prevent disconnect
    }
  }

  /**
   * Post a tweet
   */
  async postContent(accessToken: string, content: SocialMediaContent): Promise<PostResult> {
    try {
      const adaptedContent = this.adaptContent(content);

      // Build tweet payload
      const tweetPayload: any = {
        text: adaptedContent.text,
      };

      // Handle media if present
      if (adaptedContent.mediaUrls && adaptedContent.mediaUrls.length > 0) {
        const mediaIds = await this.uploadMedia(accessToken, adaptedContent.mediaUrls);
        if (mediaIds.length > 0) {
          tweetPayload.media = { media_ids: mediaIds };
        }
      }

      const response = await fetch(TWITTER_TWEET_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tweetPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        safeLogger.error('Twitter post failed:', { status: response.status, error: errorData });
        return {
          success: false,
          error: errorData.detail || errorData.title || 'Failed to post tweet',
        };
      }

      const data = await response.json();
      const tweetId = data.data?.id;

      return {
        success: true,
        externalPostId: tweetId,
        externalPostUrl: tweetId ? `https://twitter.com/i/web/status/${tweetId}` : undefined,
      };
    } catch (error) {
      safeLogger.error('Twitter post error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error posting to Twitter',
      };
    }
  }

  /**
   * Upload media to Twitter
   * Note: Twitter API v2 doesn't have direct media upload, need to use v1.1
   */
  private async uploadMedia(accessToken: string, mediaUrls: string[]): Promise<string[]> {
    const mediaIds: string[] = [];

    for (const url of mediaUrls) {
      try {
        // Download the media from URL
        const mediaResponse = await fetch(url);
        if (!mediaResponse.ok) {
          safeLogger.warn('Failed to fetch media:', { url });
          continue;
        }

        const mediaBuffer = await mediaResponse.arrayBuffer();
        const mediaBase64 = Buffer.from(mediaBuffer).toString('base64');
        const contentType = mediaResponse.headers.get('content-type') || 'image/jpeg';

        // Upload to Twitter using v1.1 API
        // Note: This requires OAuth 1.0a or app-only auth in some cases
        // For OAuth 2.0, media upload is more complex and may require chunked upload
        // This is a simplified implementation
        const uploadResponse = await fetch(TWITTER_MEDIA_UPLOAD_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            media_data: mediaBase64,
          }).toString(),
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          if (uploadData.media_id_string) {
            mediaIds.push(uploadData.media_id_string);
          }
        } else {
          safeLogger.warn('Media upload failed:', { url, status: uploadResponse.status });
        }
      } catch (error) {
        safeLogger.error('Error uploading media to Twitter:', { url, error });
      }
    }

    return mediaIds;
  }

  /**
   * Twitter supports refresh tokens
   */
  supportsRefreshToken(): boolean {
    return true;
  }
}
