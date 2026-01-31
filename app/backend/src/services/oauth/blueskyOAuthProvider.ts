/**
 * Bluesky Provider
 * Implements AT Protocol for Bluesky social network
 */

import { BskyAgent, RichText } from '@atproto/api';
import { BaseOAuthProvider, OAuthConfig, OAuthTokens, OAuthUserInfo, SocialMediaContent, PostResult } from './baseOAuthProvider';
import { safeLogger } from '../../utils/safeLogger';

// Bluesky API endpoints
const BSKY_SERVICE_URL = 'https://bsky.social';

export class BlueskyOAuthProvider extends BaseOAuthProvider {
  constructor() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.linkdao.io';
    // Use the official public metadata URL as the production default Client ID
    const defaultClientId = 'https://api.linkdao.io/api/social-media/bluesky-metadata.json';
    const config: OAuthConfig = {
      clientId: process.env.BLUESKY_CLIENT_ID || (process.env.NODE_ENV === 'production' ? defaultClientId : `${backendUrl}/api/social-media/bluesky-metadata.json`),
      clientSecret: process.env.BLUESKY_CLIENT_SECRET || '',
      callbackUrl: process.env.BLUESKY_CALLBACK_URL || `${backendUrl}/api/social-media/callback/bluesky`,
      scopes: ['atproto'],
      authorizationUrl: '', // Bluesky uses dynamic discovery
      tokenUrl: '',
    };
    super('bluesky', config);
  }

  /**
     * Build Bluesky authorization URL
     * Note: Bluesky OAuth is discovery-based. For now, we return a placeholder
     * or use a simplified app-password based connection if OAuth is not configured.
     */
    getAuthorizationUrl(state: string, _codeVerifier?: string): string {
      safeLogger.info('Building Bluesky authorization URL', { state, hasClientId: !!this.config.clientId });
  
      if (this.config.clientId) {
        // In a real implementation, this would point to an OAuth entry point
        // For AT Protocol, the client_id is typically the URL of the client's metadata
        return `https://bsky.app/oauth/authorize?client_id=${encodeURIComponent(this.config.clientId)}&state=${state}&redirect_uri=${encodeURIComponent(this.config.callbackUrl)}`;
      }
  
      // Fallback if no Client ID (dev mode)
      // We'll throw a more specific error that the controller can handle
      throw new Error('Bluesky OAuth is not configured. Please set BLUESKY_CLIENT_ID environment variable to enable Bluesky integration.');
    }
  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, _codeVerifier?: string): Promise<OAuthTokens> {
    try {
      // simplified placeholder for exchange
      // In real ATProto OAuth, this is a more complex multi-step process
      return {
        accessToken: code, // Placeholder
        refreshToken: 'placeholder',
        expiresAt: new Date(Date.now() + 3600 * 1000),
      };
    } catch (error) {
      safeLogger.error('Bluesky token exchange error:', error);
      throw error;
    }
  }

  /**
   * Refresh an expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    try {
      // Placeholder
      return {
        accessToken: refreshToken,
        refreshToken: refreshToken,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      };
    } catch (error) {
      safeLogger.error('Bluesky token refresh error:', error);
      throw error;
    }
  }

  /**
   * Get user information from Bluesky
   */
  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    try {
      const { BskyAgent } = await import('@atproto/api');
      const agent = new BskyAgent({ service: BSKY_SERVICE_URL });
      
      // Use the token to resume session if possible
      // In this architecture, accessToken might be the session JWT
      await agent.resumeSession({ accessJwt: accessToken, refreshJwt: '', handle: '', did: '', active: true });
      
      const profile = await agent.getProfile({ actor: agent.session?.handle || '' });
      
      return {
        platformUserId: profile.data.did,
        username: profile.data.handle,
        displayName: profile.data.displayName,
        avatarUrl: profile.data.avatar,
      };
    } catch (error) {
      safeLogger.error('Bluesky user info error:', error);
      throw error;
    }
  }

  /**
   * Revoke an access token
   */
  async revokeToken(_accessToken: string): Promise<void> {
    // Session cleanup
  }

  /**
   * Post to Bluesky
   */
  async postContent(accessToken: string, content: SocialMediaContent): Promise<PostResult> {
    try {
      const adaptedContent = this.adaptContent(content);
      const { BskyAgent, RichText } = await import('@atproto/api');
      
      // Resume session with the stored token
      const agent = new BskyAgent({ service: BSKY_SERVICE_URL });
      
      const rt = new RichText({ text: adaptedContent.text });
      await rt.detectFacets(agent);

      const postPayload: any = {
        text: rt.text,
        facets: rt.facets,
        createdAt: new Date().toISOString(),
      };

      // Handle media
      if (adaptedContent.mediaUrls && adaptedContent.mediaUrls.length > 0) {
        const images = await this.uploadMedia(accessToken, adaptedContent.mediaUrls);
        if (images.length > 0) {
          postPayload.embed = {
            $type: 'app.bsky.embed.images',
            images: images,
          };
        }
      }

      // We need a valid session to post.
      if (accessToken.includes('.')) {
        // Looks like a JWT
        await agent.resumeSession({ accessJwt: accessToken, refreshJwt: '', handle: '', did: '', active: true });
      }

      const response = await agent.post(postPayload);

      return {
        success: true,
        externalPostId: response.uri,
        externalPostUrl: `https://bsky.app/profile/${agent.session?.handle}/post/${response.uri.split('/').pop()}`,
      };
    } catch (error) {
      safeLogger.error('Bluesky post error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error posting to Bluesky',
      };
    }
  }

  /**
   * Upload media to Bluesky
   */
  private async uploadMedia(accessToken: string, mediaUrls: string[]): Promise<any[]> {
    const images: any[] = [];
    try {
      const { BskyAgent } = await import('@atproto/api');
      const agent = new BskyAgent({ service: BSKY_SERVICE_URL });
      await agent.resumeSession({ accessJwt: accessToken, refreshJwt: '', handle: '', did: '', active: true });

      for (const url of mediaUrls) {
        try {
          const response = await fetch(url);
          const blob = await response.arrayBuffer();
          const contentType = response.headers.get('content-type') || 'image/jpeg';

          const upload = await agent.uploadBlob(new Uint8Array(blob), { encoding: contentType });
          
          images.push({
            alt: '', // Could be enhanced with AI description later
            image: upload.data.blob,
          });

          if (images.length >= 4) break; // Bluesky limit
        } catch (error) {
          safeLogger.error('Error uploading media to Bluesky:', { url, error });
        }
      }
    } catch (e) {
      return [];
    }

    return images;
  }

  supportsRefreshToken(): boolean {
    return true;
  }
}
