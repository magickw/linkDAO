/**
 * Bluesky Provider
 * Implements AT Protocol OAuth 2.0 with DPoP for Bluesky social network
 * Uses @atproto/oauth-client-node for proper OAuth support
 * Fallback to direct authentication (app password) is still supported via login() method
 */

import { AtpAgent, RichText } from '@atproto/api';
import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { BaseOAuthProvider, OAuthConfig, OAuthTokens, OAuthUserInfo, SocialMediaContent, PostResult } from './baseOAuthProvider';
import { getBlueskyStateStore, getBlueskySessionStore } from './dpopKeyStorage';
import { safeLogger } from '../../utils/safeLogger';

// Bluesky API endpoints
const BSKY_SERVICE_URL = 'https://bsky.social';

// Singleton OAuth client instance
let oauthClient: NodeOAuthClient | null = null;

/**
 * Get or create the NodeOAuthClient singleton
 */
async function getOAuthClient(): Promise<NodeOAuthClient> {
  if (oauthClient) {
    return oauthClient;
  }

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.linkdao.io';
  const clientId = `${backendUrl}/api/social-media/bluesky-metadata.json`;

  oauthClient = new NodeOAuthClient({
    clientMetadata: {
      client_id: clientId,
      client_name: 'LinkDAO',
      client_uri: backendUrl,
      redirect_uris: [`${backendUrl}/api/social-media/callback/bluesky`],
      scope: 'atproto transition:generic',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      application_type: 'web',
      dpop_bound_access_tokens: true,
    },
    stateStore: getBlueskyStateStore(),
    sessionStore: getBlueskySessionStore(),
  });

  return oauthClient;
}

export class BlueskyOAuthProvider extends BaseOAuthProvider {
  constructor() {
    // Bluesky OAuth configuration for AT Protocol
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.linkdao.io';
    const config: OAuthConfig = {
      clientId: `${backendUrl}/api/social-media/bluesky-metadata.json`,
      clientSecret: '', // AT Protocol OAuth doesn't use client secret (PKCE instead)
      callbackUrl: `${backendUrl}/api/social-media/callback/bluesky`,
      scopes: ['atproto', 'transition:generic'],
      authorizationUrl: `${BSKY_SERVICE_URL}/oauth/authorize`,
      tokenUrl: `${BSKY_SERVICE_URL}/oauth/token`,
    };
    super('bluesky', config);
  }

  /**
   * Build Bluesky AT Protocol authorization URL using NodeOAuthClient
   * This generates a proper DPoP-bound authorization URL
   */
  async getAuthorizationUrlAsync(state: string, handle?: string): Promise<string> {
    try {
      const client = await getOAuthClient();

      // Use the handle to resolve the user's PDS and get the authorization URL
      const input = handle || 'bsky.social';
      const authUrl = await client.authorize(input, {
        state,
        scope: 'atproto transition:generic',
      });

      return authUrl.toString();
    } catch (error) {
      safeLogger.error('Error generating Bluesky OAuth URL:', error);
      throw error;
    }
  }

  /**
   * Build Bluesky AT Protocol authorization URL
   * Uses OAuth 2.0 with PKCE (legacy method for backward compatibility)
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
   * Exchange authorization code for tokens using NodeOAuthClient
   * This handles DPoP proof generation automatically
   */
  async exchangeCodeForTokensWithDPoP(callbackParams: URLSearchParams): Promise<{ tokens: OAuthTokens; userInfo: OAuthUserInfo }> {
    try {
      const client = await getOAuthClient();

      // Use the callback method which handles DPoP automatically
      const result = await client.callback(callbackParams);
      const session = result.session;

      // Get token info from the session
      const tokenInfo = await session.getTokenInfo();

      // Get user profile
      const agent = new AtpAgent({ service: BSKY_SERVICE_URL });

      // Use the session's fetchHandler for authenticated requests
      const profileResponse = await fetch(`${BSKY_SERVICE_URL}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(session.did)}`, {
        headers: {
          'Authorization': `DPoP ${(await session.getTokenInfo()).aud}`,
        },
      });

      let profile: any = { handle: session.did, displayName: null, avatar: null };

      // Try to get profile through the session's fetch handler
      try {
        const profileResp = await session.fetchHandler('/xrpc/app.bsky.actor.getProfile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (profileResp.ok) {
          profile = await profileResp.json();
        }
      } catch (profileError) {
        safeLogger.warn('Could not fetch Bluesky profile:', profileError);
      }

      const tokens: OAuthTokens = {
        accessToken: 'dpop-managed', // Token is managed by the session store
        refreshToken: 'dpop-managed',
        expiresAt: tokenInfo.expiresAt,
        tokenType: 'DPoP',
        scopes: tokenInfo.scope.split(' '),
      };

      const userInfo: OAuthUserInfo = {
        platformUserId: session.did,
        username: profile.handle || session.did,
        displayName: profile.displayName || profile.handle,
        avatarUrl: profile.avatar,
      };

      return { tokens, userInfo };
    } catch (error) {
      safeLogger.error('Bluesky OAuth token exchange error:', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for tokens (legacy method)
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
   * Refresh an expired access token using NodeOAuthClient
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    try {
      // For DPoP-managed sessions, try to restore the session
      if (refreshToken === 'dpop-managed') {
        safeLogger.warn('Cannot refresh DPoP-managed token without session context');
        throw new Error('Session-based refresh required');
      }

      // 1. Try AT Protocol session refresh FIRST (for App Password flow)
      try {
        safeLogger.info('Attempting AT Protocol session refresh for Bluesky');

        // Directly call the refresh endpoint
        const refreshResponse = await fetch(`${BSKY_SERVICE_URL}/xrpc/com.atproto.server.refreshSession`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${refreshToken}`,
          },
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          safeLogger.info('Successfully refreshed Bluesky session via AT Protocol RPC');
          return {
            accessToken: data.accessJwt,
            refreshToken: data.refreshJwt,
            expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // ~2 hours
            tokenType: 'Bearer',
            scopes: this.config.scopes,
          };
        }
      } catch (atprotoError: any) {
        // If it's a 400 Bad Request, it might be an OAuth token instead of a session token
        safeLogger.warn('AT Protocol session refresh failed, will attempt standard OAuth refresh:', atprotoError.message);
      }

      // 2. Fallback to standard OAuth 2.0 refresh
      safeLogger.info('Attempting standard OAuth 2.0 refresh for Bluesky');
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
        const errorText = await response.text();
        safeLogger.error('Bluesky OAuth refresh failed:', { status: response.status, body: errorText });
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();
      safeLogger.info('Successfully refreshed Bluesky token via OAuth endpoint');

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
   * Refresh access token using DPoP session
   */
  async refreshWithDPoP(did: string): Promise<OAuthTokens> {
    try {
      const client = await getOAuthClient();

      // Restore the session with auto-refresh
      const session = await client.restore(did, true);
      const tokenInfo = await session.getTokenInfo();

      return {
        accessToken: 'dpop-managed',
        refreshToken: 'dpop-managed',
        expiresAt: tokenInfo.expiresAt,
        tokenType: 'DPoP',
        scopes: tokenInfo.scope.split(' '),
      };
    } catch (error) {
      safeLogger.error('Bluesky DPoP refresh error:', error);
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

      // Resume session with proper AtpSessionData
      await agent.resumeSession({
        accessJwt: accessToken,
        refreshJwt: '',
        did: did,
        handle: '',
        active: true,
      });

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
   * Get user info using DPoP session
   */
  async getUserInfoWithDPoP(did: string): Promise<OAuthUserInfo> {
    try {
      const client = await getOAuthClient();
      const session = await client.restore(did);

      // Fetch profile through the session's authenticated handler
      const response = await session.fetchHandler('/xrpc/app.bsky.actor.getProfile', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to get profile: ${response.status}`);
      }

      const profile = await response.json();

      return {
        platformUserId: session.did,
        username: profile.handle,
        displayName: profile.displayName,
        avatarUrl: profile.avatar,
      };
    } catch (error) {
      safeLogger.error('Bluesky DPoP user info error:', error);
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
      let did: string;
      try {
        const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
        did = payload.sub;
      } catch (parseError) {
        safeLogger.warn('Failed to parse Bluesky token during revocation, skipping');
        return;
      }

      // Try to resume session - if it fails, the token is already invalid
      try {
        await agent.resumeSession({
          accessJwt: accessToken,
          refreshJwt: '',
          did: did,
          handle: '',
          active: true,
        });
        await agent.com.atproto.server.deleteSession();
      } catch (sessionError: any) {
        // Session already invalid/expired - nothing to revoke
        safeLogger.warn('Bluesky session already invalid during revocation:', sessionError?.message);
      }
    } catch (error) {
      // Ignore errors during revocation
      safeLogger.warn('Bluesky revoke token warning:', error);
    }
  }

  /**
   * Revoke token using DPoP session
   */
  async revokeWithDPoP(did: string): Promise<void> {
    try {
      const client = await getOAuthClient();
      const session = await client.restore(did);
      await session.signOut();
    } catch (error) {
      safeLogger.warn('Bluesky DPoP revocation warning:', error);
    }
  }

  /**
   * Post to Bluesky using DPoP session
   */
  async postWithDPoP(did: string, content: SocialMediaContent): Promise<PostResult> {
    try {
      const adaptedContent = this.adaptContent(content);
      const client = await getOAuthClient();

      // Restore the session with auto-refresh
      const session = await client.restore(did, 'auto');

      // Create agent with DPoP fetch handler
      const agent = new AtpAgent({
        service: session.serverMetadata.issuer,
      });

      // Create RichText and detect facets
      const rt = new RichText({ text: adaptedContent.text });

      // Detect facets using manual parsing (to avoid network calls)
      // The agent.getProfile calls would need DPoP auth

      const postPayload: any = {
        $type: 'app.bsky.feed.post',
        text: rt.text,
        facets: rt.facets || [],
        createdAt: new Date().toISOString(),
      };

      // Handle media
      if (adaptedContent.mediaUrls && adaptedContent.mediaUrls.length > 0) {
        const images = await this.uploadMediaWithSession(session, adaptedContent.mediaUrls);
        if (images.length > 0) {
          postPayload.embed = {
            $type: 'app.bsky.embed.images',
            images: images,
          };
        }
      }

      // Post via XRPC
      const response = await session.fetchHandler('/xrpc/com.atproto.repo.createRecord', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repo: session.did,
          collection: 'app.bsky.feed.post',
          record: postPayload,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Post failed: ${errorText}`);
      }

      const result = await response.json();

      return {
        success: true,
        externalPostId: result.uri,
        externalPostUrl: `https://bsky.app/profile/${session.did}/post/${result.uri.split('/').pop()}`,
      };
    } catch (error) {
      safeLogger.error('Bluesky DPoP post error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error posting to Bluesky',
      };
    }
  }

  /**
   * Upload media using DPoP session
   */
  private async uploadMediaWithSession(session: any, mediaUrls: string[]): Promise<any[]> {
    const images: any[] = [];

    for (const url of mediaUrls) {
      try {
        const response = await fetch(url);
        const blob = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Upload blob via XRPC
        const uploadResponse = await session.fetchHandler('/xrpc/com.atproto.repo.uploadBlob', {
          method: 'POST',
          headers: {
            'Content-Type': contentType,
          },
          body: new Uint8Array(blob),
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          images.push({
            alt: 'Image shared from LinkDAO',
            image: uploadResult.blob,
          });
        }

        if (images.length >= 4) break; // Bluesky limit
      } catch (error) {
        safeLogger.error('Error uploading media to Bluesky:', { url, error });
      }
    }

    return images;
  }

  /**
   * Post to Bluesky (legacy method for app password connections)
   */
  async postContent(accessToken: string, content: SocialMediaContent): Promise<PostResult> {
    try {
      const adaptedContent = this.adaptContent(content);
      const agent = new AtpAgent({ service: BSKY_SERVICE_URL });

      // Parse JWT for DID and restore session
      let did: string;
      try {
        const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
        did = payload.sub;
      } catch (parseError) {
        safeLogger.error('Failed to parse Bluesky access token:', parseError);
        return {
          success: false,
          error: 'Invalid access token format. Please reconnect your Bluesky account.',
        };
      }

      // Try to resume session - handle DID mismatch gracefully
      try {
        await agent.resumeSession({
          accessJwt: accessToken,
          refreshJwt: '',
          did: did,
          handle: '',
          active: true,
        });
      } catch (sessionError: any) {
        const errorMessage = sessionError?.message || String(sessionError);

        // Handle DID mismatch - this means the session is stale or account changed
        if (errorMessage.includes('DID mismatch')) {
          safeLogger.warn('Bluesky DID mismatch - session needs reauthorization', { did });
          return {
            success: false,
            error: 'Your Bluesky session has expired or the account has changed. Please reconnect your Bluesky account in Settings.',
          };
        }

        // Handle expired/invalid token
        if (errorMessage.includes('expired') || errorMessage.includes('invalid') || errorMessage.includes('Unauthorized')) {
          safeLogger.warn('Bluesky session expired or invalid', { did });
          return {
            success: false,
            error: 'Your Bluesky session has expired. Please reconnect your Bluesky account in Settings.',
          };
        }

        // Re-throw other session errors
        throw sessionError;
      }

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
   * Upload media to Bluesky (legacy method)
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

  /**
   * Check if a connection uses DPoP
   */
  isDPoP(tokenType: string): boolean {
    return tokenType === 'DPoP' || tokenType === 'dpop-managed';
  }
}
