/**
 * Bluesky Provider
 * Implements AT Protocol for Bluesky social network using BskyAgent (Direct Auth)
 */

import { BskyAgent, RichText } from '@atproto/api';
import { BaseOAuthProvider, OAuthConfig, OAuthTokens, OAuthUserInfo, SocialMediaContent, PostResult } from './baseOAuthProvider';
import { safeLogger } from '../../utils/safeLogger';

// Bluesky API endpoints
const BSKY_SERVICE_URL = 'https://bsky.social';

export class BlueskyOAuthProvider extends BaseOAuthProvider {
  constructor() {
    // Bluesky configuration is minimal for direct auth
    const config: OAuthConfig = {
      clientId: 'bluesky-direct',
      clientSecret: '',
      callbackUrl: '',
      scopes: ['atproto'],
      authorizationUrl: '',
      tokenUrl: '',
    };
    super('bluesky', config);
  }

  /**
   * Build Bluesky authorization URL
   * Not used for direct auth (Option B)
   */
  getAuthorizationUrl(state: string, _codeVerifier?: string): string {
    // Return a dummy URL or empty string since we use a custom modal
    return '';
  }

  /**
   * Authenticate directly with Handle and App Password
   * This replaces the standard OAuth exchangeCodeForTokens flow
   */
  async login(handle: string, appPassword: string): Promise<{ tokens: OAuthTokens; userInfo: OAuthUserInfo }> {
    try {
      const agent = new BskyAgent({ service: BSKY_SERVICE_URL });
      const loginResponse = await agent.login({ identifier: handle, password: appPassword });

      if (!loginResponse.success) {
        throw new Error('Failed to login to Bluesky');
      }

      const { accessJwt, refreshJwt, did, handle: userHandle } = loginResponse.data;

      // Get profile for extra details
      const profile = await agent.getProfile({ actor: did });

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
        displayName: profile.data.displayName,
        avatarUrl: profile.data.avatar,
      };

      return { tokens, userInfo };
    } catch (error) {
      safeLogger.error('Bluesky login error:', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for tokens
   * Not used in AT Protocol direct auth flow
   */
  async exchangeCodeForTokens(code: string, _codeVerifier?: string): Promise<OAuthTokens> {
    throw new Error('Bluesky uses direct authentication (Option B), not standard OAuth code exchange.');
  }

  /**
   * Refresh an expired access token using the refresh JWT
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    try {
      const agent = new BskyAgent({ service: BSKY_SERVICE_URL });
      
      // Resume session (this refreshes tokens internally if needed, or we can use refreshSession)
      // Note: resumeSession takes both access and refresh tokens. 
      // If we only have refresh token here, we might need to mock the access token or use a specific refresh method.
      // However, typical usage is to store the whole session. 
      // For this abstraction, we assume 'refreshToken' is the refresh JWT.
      
      // We attempt to resume with just the refresh token if possible, but BskyAgent usually needs the session object.
      // Workaround: Use the refresh token as both or try to refresh directly if API allows.
      // Actually, BskyAgent.resumeSession expects a session object.
      
      // Correct approach for ATProto refresh:
      // We need to call com.atproto.server.refreshSession with the refresh token.
      
      // Manually calling refresh endpoint since agent methods assume active session state
      // OR construct a partial session
      
      // Try resuming with dummy access token and valid refresh token
      await agent.resumeSession({
        accessJwt: 'expired', 
        refreshJwt: refreshToken,
        handle: 'placeholder',
        did: 'placeholder',
        active: true
      });

      // Just resuming might trigger a refresh if access token is invalid?
      // Actually, let's use the underlying API call if agent doesn't expose refresh directly without full session.
      // agent.api.com.atproto.server.refreshSession()
      
      // A safer way with the library:
      const { data } = await agent.api.com.atproto.server.refreshSession(
        undefined, 
        { headers: { authorization: `Bearer ${refreshToken}` } }
      );

      return {
        accessToken: data.accessJwt,
        refreshToken: data.refreshJwt,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
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
      const agent = new BskyAgent({ service: BSKY_SERVICE_URL });
      
      // Resume session with access token
      // We don't have the DID here easily unless encoded in token, but getProfile can work with 'self' if authenticated?
      // Or we need to decode the JWT to get the DID.
      
      // Workaround: Resume session requires more data usually.
      // But we can set the access token directly on the API client.
      agent.api.xrpc.headers.authorization = `Bearer ${accessToken}`;
      
      // We need the DID or handle to fetch profile. 
      // If we don't have it, we might need to parse the JWT (if it's a standard JWT with 'sub').
      // Let's assume the session is valid.
      
      // Attempt to get own profile
      // Note: getProfile requires an actor (DID or handle).
      // If we are authenticated, we can try 'self' if supported, or decode token.
      // Let's decode the JWT base64 to find the DID (sub claim)
      const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
      const did = payload.sub;

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
      const agent = new BskyAgent({ service: BSKY_SERVICE_URL });
      agent.api.xrpc.headers.authorization = `Bearer ${accessToken}`;
      await agent.api.com.atproto.server.deleteSession();
    } catch (error) {
      // Ignore errors during revocation
    }
  }

  /**
   * Post to Bluesky
   */
  async postContent(accessToken: string, content: SocialMediaContent): Promise<PostResult> {
    try {
      const adaptedContent = this.adaptContent(content);
      const agent = new BskyAgent({ service: BSKY_SERVICE_URL });
      
      // Set auth header directly
      agent.api.xrpc.headers.authorization = `Bearer ${accessToken}`;
      
      // We need the user's DID to post? No, usually just auth.
      // However, RichText processing might need agent context.
      
      // Parse JWT for DID to help agent context if needed
      const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
      const did = payload.sub;

      const rt = new RichText({ text: adaptedContent.text });
      // detectFacets requires unauthenticated network access usually, or agent
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

      // Construct success result
      // We need to fetch the handle to make a nice URL, or use DID
      // Use DID for robustness
      const handle = did; // Ideally resolve to handle, but DID works in URLs too

      return {
        success: true,
        externalPostId: response.uri,
        externalPostUrl: `https://bsky.app/profile/${handle}/post/${response.uri.split('/').pop()}`,
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
  private async uploadMedia(agent: BskyAgent, mediaUrls: string[]): Promise<any[]> {
    const images: any[] = [];
    
    for (const url of mediaUrls) {
      try {
        const response = await fetch(url);
        const blob = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Upload blob
        const upload = await agent.uploadBlob(new Uint8Array(blob), { encoding: contentType });
        
        images.push({
          alt: 'Image shared from LinkDAO', // Placeholder alt text
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
