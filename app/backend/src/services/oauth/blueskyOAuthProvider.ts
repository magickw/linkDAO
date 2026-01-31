/**
 * Bluesky Provider
 * Implements AT Protocol OAuth 2.0 for Bluesky social network
 * Uses @atproto/oauth-client for proper OAuth support (recommended approach)
 * Fallback to direct authentication (app password) is still supported via login() method
 */

import { AtpAgent, RichText } from '@atproto/api';
import { BaseOAuthProvider, OAuthConfig, OAuthTokens, OAuthUserInfo, SocialMediaContent, PostResult } from './baseOAuthProvider';
import { safeLogger } from '../../utils/safeLogger';

// Bluesky API endpoints
const BSKY_SERVICE_URL = 'https://bsky.social';

export class BlueskyOAuthProvider extends BaseOAuthProvider {
  constructor() {
    // Bluesky OAuth configuration for AT Protocol
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.linkdao.io';
    const config: OAuthConfig = {
      clientId: `${backendUrl}/api/social-media/bluesky-metadata.json`,
      clientSecret: '', // AT Protocol OAuth doesn't use client secret (PKCE instead)
      callbackUrl: `${backendUrl}/api/social-media/callback/bluesky`,
      scopes: ['atproto'],
      authorizationUrl: `${BSKY_SERVICE_URL}/oauth/authorize`,
      tokenUrl: `${BSKY_SERVICE_URL}/oauth/token`,
    };
    super('bluesky', config);
  }

  /**
   * Build Bluesky AT Protocol authorization URL
   * Uses OAuth 2.0 with PKCE
   */
  getAuthorizationUrl(state: string, codeVerifier?: string): string {
    const codeChallenge = codeVerifier
      ? this.generateCodeChallenge(codeVerifier)
      : undefined;

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.callbackUrl,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state,
    });

    // Add PKCE parameters
    if (codeChallenge) {
      params.append('code_challenge', codeChallenge);
      params.append('code_challenge_method', 'S256');
    }

    return `${this.config.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens using AT Protocol OAuth
   */
  async exchangeCodeForTokens(code: string, codeVerifier?: string): Promise<OAuthTokens> {
    try {
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.config.clientId,
        redirect_uri: this.config.callbackUrl,
      });

      // Add PKCE verifier if available
      if (codeVerifier) {
        body.append('code_verifier', codeVerifier);
      }

      const response = await fetch(this.config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        safeLogger.error('Bluesky token exchange error:', { status: response.status, body: errorText });
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
        tokenType: data.token_type || 'Bearer',
        scopes: this.config.scopes,
      };
    } catch (error) {
      safeLogger.error('Bluesky OAuth token exchange error:', error);
      throw error;
    }
  }

  /**
   * Authenticate directly with Handle and App Password
   * This is a fallback method (not recommended by AT Protocol, but still supported)
   * Users should prefer OAuth instead
   */
  async login(handle: string, appPassword: string): Promise<{ tokens: OAuthTokens; userInfo: OAuthUserInfo }> {
    try {
      safeLogger.warn('Using deprecated app password authentication for Bluesky. OAuth is recommended.');

      const agent = new AtpAgent({ service: BSKY_SERVICE_URL });

      let loginResponse;
      try {
        loginResponse = await agent.login({ identifier: handle, password: appPassword });
      } catch (loginError) {
        // Capture specific error from BskyAgent
        const errorMessage = loginError instanceof Error ? loginError.message : String(loginError);
        safeLogger.error('BskyAgent.login threw error:', {
          message: errorMessage,
          handle,
          service: BSKY_SERVICE_URL
        });

        // Check if it's an authentication error
        if (errorMessage.includes('Invalid credentials') ||
            errorMessage.includes('Invalid identifier') ||
            errorMessage.includes('Unauthorized') ||
            errorMessage.includes('401')) {
          throw new Error('Invalid handle or app password');
        }

        throw new Error(`Bluesky authentication failed: ${errorMessage}`);
      }

      if (!loginResponse.success) {
        safeLogger.error('Bluesky login returned unsuccessful response:', loginResponse);
        throw new Error('Failed to login to Bluesky');
      }

      const { accessJwt, refreshJwt, did, handle: userHandle } = loginResponse.data;

      // Get profile for extra details
      let profile;
      try {
        profile = await agent.getProfile({ actor: did });
      } catch (profileError) {
        const errorMessage = profileError instanceof Error ? profileError.message : String(profileError);
        safeLogger.error('Failed to fetch Bluesky profile:', { did, error: errorMessage });
        // Continue without profile data if it fails
        profile = { data: { displayName: null, avatar: null } };
      }

      const tokens: OAuthTokens = {
        accessToken: accessJwt,
        refreshToken: refreshJwt,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // ~2 hours default
        tokenType: 'Bearer',
        scopes: ['atproto'],
      };

      const userInfo: OAuthUserInfo = {
        platformUserId: did,
        username: userHandle,
        displayName: profile.data?.displayName || userHandle,
        avatarUrl: profile.data?.avatar,
      };

      return { tokens, userInfo };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      safeLogger.error('Bluesky login error:', {
        message: errorMessage,
        handle,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Refresh an expired access token using AT Protocol refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    try {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
      });

      const response = await fetch(this.config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
        tokenType: data.token_type || 'Bearer',
        scopes: this.config.scopes,
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
      const agent = new AtpAgent({ service: BSKY_SERVICE_URL });

      // Restore session with the access token
      // The agent will use this token for subsequent API calls
      const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
      const did = payload.sub;

      // Set the access token directly on the agent by creating a synthetic session
      agent.session = {
        accessJwt: accessToken,
        refreshJwt: undefined,
        did: did,
        handle: '',
      };

      const profile = await agent.getProfile({ actor: did });

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
  async revokeToken(accessToken: string): Promise<void> {
    try {
      const agent = new AtpAgent({ service: BSKY_SERVICE_URL });

      // Restore session with the access token
      const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
      const did = payload.sub;

      // Use resumeSession method instead of direct assignment
      await agent.resumeSession({
        accessJwt: accessToken,
        refreshJwt: undefined,
        did: did,
        handle: '',
      });

      await agent.com.atproto.server.deleteSession();
    } catch (error) {
      // Ignore errors during revocation
      safeLogger.warn('Bluesky revoke token warning:', error);
    }
  }

  /**
   * Post to Bluesky
   */
  async postContent(accessToken: string, content: SocialMediaContent): Promise<PostResult> {
    try {
      const adaptedContent = this.adaptContent(content);
      const agent = new AtpAgent({ service: BSKY_SERVICE_URL });

      // Parse JWT for DID and restore session
      const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
      const did = payload.sub;

      // Use resumeSession method instead of direct assignment
      await agent.resumeSession({
        accessJwt: accessToken,
        refreshJwt: undefined,
        did: did,
        handle: '',
      });

      const rt = new RichText({ text: adaptedContent.text });
      await rt.detectFacets(agent);

      const postPayload: any = {
        text: rt.text,
        facets: rt.facets,
        createdAt: new Date().toISOString(),
      };

      // Handle media
      if (adaptedContent.mediaUrls && adaptedContent.mediaUrls.length > 0) {
        const images = await this.uploadMedia(agent, adaptedContent.mediaUrls);
        if (images.length > 0) {
          postPayload.embed = {
            $type: 'app.bsky.embed.images',
            images: images,
          };
        }
      }

      // Post to repo
      const response = await agent.post(postPayload);

      return {
        success: true,
        externalPostId: response.uri,
        externalPostUrl: `https://bsky.app/profile/${did}/post/${response.uri.split('/').pop()}`,
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
  private async uploadMedia(agent: AtpAgent, mediaUrls: string[]): Promise<any[]> {
    const images: any[] = [];

    for (const url of mediaUrls) {
      try {
        const response = await fetch(url);
        const blob = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Upload blob
        const upload = await agent.uploadBlob(new Uint8Array(blob), { encoding: contentType });

        images.push({
          alt: 'Image shared from LinkDAO',
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
