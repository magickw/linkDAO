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
  private agent: BskyAgent;

  constructor() {
    const config: OAuthConfig = {
      clientId: process.env.BLUESKY_CLIENT_ID || '',
      clientSecret: process.env.BLUESKY_CLIENT_SECRET || '',
      callbackUrl: process.env.BLUESKY_CALLBACK_URL || 'http://localhost:3001/api/social-media/callback/bluesky',
      scopes: ['atproto'],
      authorizationUrl: '', // Bluesky uses dynamic discovery
      tokenUrl: '',
    };
    super('bluesky', config);
    this.agent = new BskyAgent({ service: BSKY_SERVICE_URL });
  }

  /**
   * Build Bluesky authorization URL
   * Note: Bluesky OAuth is discovery-based. For now, we return a placeholder 
   * or use a simplified app-password based connection if OAuth is not configured.
   */
  getAuthorizationUrl(state: string, _codeVerifier?: string): string {
    // For Bluesky, we'll likely need the user's handle to start discovery
    // This architecture doesn't easily support handle-first auth in initiateOAuth
    // So we'll return a URL that includes our callback and state
    if (this.config.clientId) {
      // In a real implementation, this would point to an OAuth entry point
      return `https://bsky.app/oauth/authorize?client_id=${encodeURIComponent(this.config.clientId)}&state=${state}&redirect_uri=${encodeURIComponent(this.config.callbackUrl)}`;
    }
    
    // Fallback if no Client ID (dev mode)
    throw new Error('Bluesky OAuth Client ID is not configured');
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
      // Use the token to resume session if possible
      // In this architecture, accessToken might be the session JWT
      await this.agent.resumeSession({ accessJwt: accessToken, refreshJwt: '', handle: '', did: '', active: true });
      
      const profile = await this.agent.getProfile({ actor: this.agent.session?.handle || '' });
      
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
      
      // Resume session with the stored token
      // Note: We need to know the handle/did to resume properly if using session-based auth
      // For now we assume the agent can be initialized or we use the token directly
      const agent = new BskyAgent({ service: BSKY_SERVICE_URL });
      
      // Attempt to resume session
      // This is a bit tricky without the full session object, 
      // but if accessToken is the JWT, we can try to use it
      
      // For simplicity in this implementation, we use the agent to create a post
      // In a real app, you'd store the full session object
      
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

      // We need a valid session to post. If accessToken is an App Password, we login.
      // If it's a JWT, we resume.
      if (accessToken.includes('.')) {
        // Looks like a JWT
        await agent.resumeSession({ accessJwt: accessToken, refreshJwt: '', handle: '', did: '', active: true });
      } else {
        // Might be an App Password (for simpler dev/testing)
        // Note: we'd need the handle too.
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
    const agent = new BskyAgent({ service: BSKY_SERVICE_URL });
    
    try {
      await agent.resumeSession({ accessJwt: accessToken, refreshJwt: '', handle: '', did: '', active: true });
    } catch (e) {
      return [];
    }

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

    return images;
  }

  supportsRefreshToken(): boolean {
    return true;
  }
}
