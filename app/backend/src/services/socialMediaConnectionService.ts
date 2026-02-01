/**
 * Social Media Connection Service
 * Manages OAuth connections, token storage, and refresh logic
 */

import crypto from 'crypto';
import { db } from '../db';
import { socialMediaConnections, oauthStates, users } from '../db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { DataEncryptionService } from './dataEncryptionService';
import {
  getOAuthProvider,
  isSupportedPlatform,
  SocialPlatform,
  OAuthTokens,
  BaseOAuthProvider,
  BlueskyOAuthProvider,
} from './oauth';

// Types
export interface SocialMediaConnection {
  id: string;
  userId: string;
  platform: SocialPlatform;
  platformUserId: string;
  platformUsername?: string;
  platformDisplayName?: string;
  platformAvatarUrl?: string;
  status: 'active' | 'expired' | 'revoked' | 'error';
  scopes?: string[];
  pageId?: string;
  pageName?: string;
  pageAccessToken?: string;
  connectedAt: Date;
  lastUsedAt?: Date;
  lastError?: string;
}

export interface InitiateOAuthResult {
  authUrl: string;
  state: string;
}

// OAuth state expiry time (10 minutes)
const OAUTH_STATE_EXPIRY_MS = 10 * 60 * 1000;

class SocialMediaConnectionService {
  private encryptionService: DataEncryptionService;

  constructor() {
    this.encryptionService = new DataEncryptionService();
  }

  /**
   * Connect to Bluesky directly (App Password flow)
   */
  async connectBlueskyDirect(userId: string, handle: string, appPassword: string): Promise<SocialMediaConnection> {
    // Verify user exists
    const userExists = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userExists.length === 0) {
      throw new Error('User not found');
    }

    try {
      // Use the BlueskyOAuthProvider to handle the specific auth logic
      const provider = getOAuthProvider('bluesky') as any; // Cast because 'login' is not on BaseOAuthProvider interface
      if (!provider.login) {
        throw new Error('Bluesky provider does not support direct login');
      }

      const { tokens, userInfo } = await provider.login(handle, appPassword);
      
      // Encrypt tokens
      const encryptedAccessToken = await this.encryptToken(tokens.accessToken);
      const encryptedRefreshToken = tokens.refreshToken
        ? await this.encryptToken(tokens.refreshToken)
        : null;

      // Check if connection already exists
      const existingConnection = await db
        .select()
        .from(socialMediaConnections)
        .where(
          and(
            eq(socialMediaConnections.userId, userId),
            eq(socialMediaConnections.platform, 'bluesky')
          )
        )
        .limit(1);

      let connectionId: string;

      if (existingConnection.length > 0) {
        // Update existing
        await db
          .update(socialMediaConnections)
          .set({
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiry: tokens.expiresAt,
            platformUserId: userInfo.platformUserId,
            platformUsername: userInfo.username,
            platformDisplayName: userInfo.displayName,
            platformAvatarUrl: userInfo.avatarUrl,
            status: 'active',
            lastError: null,
            updatedAt: new Date(),
          })
          .where(eq(socialMediaConnections.id, existingConnection[0].id));
        
        connectionId = existingConnection[0].id;
      } else {
        // Create new
        const newConnections = await db
          .insert(socialMediaConnections)
          .values({
            userId,
            platform: 'bluesky',
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiry: tokens.expiresAt,
            platformUserId: userInfo.platformUserId,
            platformUsername: userInfo.username,
            platformDisplayName: userInfo.displayName,
            platformAvatarUrl: userInfo.avatarUrl,
            status: 'active',
          })
          .returning();
        
        connectionId = newConnections[0].id;
      }

      return {
        id: connectionId,
        userId,
        platform: 'bluesky',
        platformUserId: userInfo.platformUserId,
        platformUsername: userInfo.username,
        platformDisplayName: userInfo.displayName,
        platformAvatarUrl: userInfo.avatarUrl,
        status: 'active',
        connectedAt: new Date(),
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      safeLogger.error('Bluesky direct connection error:', {
        message: errorMessage,
        userId,
        platform: 'bluesky',
        originalError: error
      });

      // Re-throw with the original error message if it's more specific
      if (errorMessage.includes('Invalid handle') ||
          errorMessage.includes('Invalid credentials') ||
          errorMessage.includes('Invalid identifier') ||
          errorMessage.includes('Invalid app password')) {
        throw new Error('Invalid Bluesky handle or app password. Please verify your credentials.');
      }

      // Pass along specific error messages from the provider
      if (errorMessage.startsWith('Bluesky authentication failed:')) {
        throw error; // Already has good error details from provider
      }

      throw new Error(`Failed to connect to Bluesky: ${errorMessage}`);
    }
  }

  /**
   * Initiate OAuth flow for a platform
   */
  async initiateOAuth(userId: string, platform: string, handle?: string): Promise<InitiateOAuthResult> {
    if (!isSupportedPlatform(platform)) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    // Verify user exists
    const userExists = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userExists.length === 0) {
      throw new Error('User not found');
    }

    // Generate state and code verifier
    const state = crypto.randomBytes(32).toString('hex');
    const codeVerifier = (platform === 'twitter' || platform === 'bluesky')
      ? crypto.randomBytes(32).toString('base64url')
      : undefined;

    // Get OAuth provider
    safeLogger.info(`Getting OAuth provider for ${platform}`);
    const provider = getOAuthProvider(platform);

    let authUrl: string;

    // Generate authorization URL
    safeLogger.info(`Generating authorization URL for ${platform}`);
    if (platform === 'bluesky') {
      // Use async method with DPoP for Bluesky
      const blueskyProvider = provider as BlueskyOAuthProvider;
      authUrl = await blueskyProvider.getAuthorizationUrlAsync(state, handle);
    } else {
      authUrl = provider.getAuthorizationUrl(state, codeVerifier);
    }

    // Store state in database for CSRF protection
    const expiresAt = new Date(Date.now() + OAUTH_STATE_EXPIRY_MS);

    safeLogger.info(`Storing OAuth state for ${platform}`, { state, userId });
    await db.insert(oauthStates).values({
      state,
      userId,
      platform,
      codeVerifier,
      redirectUri: provider['config'].callbackUrl,
      expiresAt,
    });

    return { authUrl, state };
  }

  /**
   * Complete OAuth flow after callback
   */
  async completeOAuth(state: string, code: string, callbackParams?: URLSearchParams): Promise<SocialMediaConnection> {
    // Find and validate OAuth state
    const storedStates = await db
      .select()
      .from(oauthStates)
      .where(eq(oauthStates.state, state))
      .limit(1);

    if (storedStates.length === 0) {
      throw new Error('Invalid or expired OAuth state');
    }

    const storedState = storedStates[0];

    // Check if expired
    if (new Date() > storedState.expiresAt) {
      await db.delete(oauthStates).where(eq(oauthStates.state, state));
      throw new Error('OAuth state expired');
    }

    const platform = storedState.platform as SocialPlatform;
    const provider = getOAuthProvider(platform);

    try {
      let tokens: OAuthTokens;
      let userInfo: any;

      // Handle Bluesky OAuth with DPoP separately
      if (platform === 'bluesky' && callbackParams) {
        const blueskyProvider = provider as BlueskyOAuthProvider;
        const result = await blueskyProvider.exchangeCodeForTokensWithDPoP(callbackParams);
        tokens = result.tokens;
        userInfo = result.userInfo;
      } else {
        // Standard OAuth flow
        tokens = await provider.exchangeCodeForTokens(
          code,
          storedState.codeVerifier || undefined
        );
        userInfo = await provider.getUserInfo(tokens.accessToken);
      }

      // Encrypt tokens for storage (for non-DPoP managed tokens)
      const encryptedAccessToken = tokens.accessToken === 'dpop-managed'
        ? 'dpop-managed'
        : await this.encryptToken(tokens.accessToken);
      const encryptedRefreshToken = tokens.refreshToken
        ? (tokens.refreshToken === 'dpop-managed' ? 'dpop-managed' : await this.encryptToken(tokens.refreshToken))
        : null;

      // Facebook Page Support
      let pageId: string | undefined;
      let pageName: string | undefined;
      let pageAccessToken: string | undefined;

      if (platform === 'facebook') {
        const pages = await (provider as any).getManagedPages(tokens.accessToken);
        if (pages && pages.length > 0) {
          const page = pages[0];
          pageId = page.id;
          pageName = page.name;
          if (page.accessToken) {
            pageAccessToken = await this.encryptToken(page.accessToken);
          }
        }
      }

      // Check if connection already exists
      const existingConnection = await db
        .select()
        .from(socialMediaConnections)
        .where(
          and(
            eq(socialMediaConnections.userId, storedState.userId),
            eq(socialMediaConnections.platform, platform)
          )
        )
        .limit(1);

      let connectionId: string;

      if (existingConnection.length > 0) {
        // Update existing connection
        await db
          .update(socialMediaConnections)
          .set({
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiry: tokens.expiresAt,
            platformUserId: userInfo.platformUserId,
            platformUsername: userInfo.username,
            platformDisplayName: userInfo.displayName,
            platformAvatarUrl: userInfo.avatarUrl,
            scopes: tokens.scopes ? JSON.stringify(tokens.scopes) : null,
            status: 'active',
            lastError: null,
            pageId: pageId || null,
            pageName: pageName || null,
            pageAccessToken: pageAccessToken || null,
            updatedAt: new Date(),
          })
          .where(eq(socialMediaConnections.id, existingConnection[0].id));

        connectionId = existingConnection[0].id;
      } else {
        // Create new connection
        const newConnections = await db
          .insert(socialMediaConnections)
          .values({
            userId: storedState.userId,
            platform,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiry: tokens.expiresAt,
            platformUserId: userInfo.platformUserId,
            platformUsername: userInfo.username,
            platformDisplayName: userInfo.displayName,
            platformAvatarUrl: userInfo.avatarUrl,
            scopes: tokens.scopes ? JSON.stringify(tokens.scopes) : null,
            status: 'active',
            pageId: pageId || null,
            pageName: pageName || null,
            pageAccessToken: pageAccessToken || null,
          })
          .returning();

        connectionId = newConnections[0].id;
      }

      // Clean up OAuth state
      await db.delete(oauthStates).where(eq(oauthStates.state, state));

      // Clean up expired states
      await this.cleanupExpiredStates();

      // Return connection info
      return {
        id: connectionId,
        userId: storedState.userId,
        platform,
        platformUserId: userInfo.platformUserId,
        platformUsername: userInfo.username,
        platformDisplayName: userInfo.displayName,
        platformAvatarUrl: userInfo.avatarUrl,
        status: 'active',
        scopes: tokens.scopes,
        pageId,
        pageName,
        pageAccessToken,
        connectedAt: new Date(),
      };
    } catch (error) {
      // Clean up OAuth state on error
      await db.delete(oauthStates).where(eq(oauthStates.state, state));
      safeLogger.error('OAuth completion error:', error);
      throw error;
    }
  }

  /**
   * Get all connections for a user
   */
  async getConnections(userId: string): Promise<SocialMediaConnection[]> {
    const connections = await db
      .select({
        id: socialMediaConnections.id,
        userId: socialMediaConnections.userId,
        platform: socialMediaConnections.platform,
        platformUserId: socialMediaConnections.platformUserId,
        platformUsername: socialMediaConnections.platformUsername,
        platformDisplayName: socialMediaConnections.platformDisplayName,
        platformAvatarUrl: socialMediaConnections.platformAvatarUrl,
        status: socialMediaConnections.status,
        scopes: socialMediaConnections.scopes,
        connectedAt: socialMediaConnections.connectedAt,
        lastUsedAt: socialMediaConnections.lastUsedAt,
        lastError: socialMediaConnections.lastError,
        pageId: socialMediaConnections.pageId,
        pageName: socialMediaConnections.pageName,
        pageAccessToken: socialMediaConnections.pageAccessToken,
      })
      .from(socialMediaConnections)
      .where(eq(socialMediaConnections.userId, userId));

    return connections.map((conn) => ({
      ...conn,
      platform: conn.platform as SocialPlatform,
      status: conn.status as 'active' | 'expired' | 'revoked' | 'error',
      scopes: conn.scopes ? JSON.parse(conn.scopes) : undefined,
      connectedAt: conn.connectedAt || new Date(),
      lastUsedAt: conn.lastUsedAt || undefined,
      lastError: conn.lastError || undefined,
      pageId: conn.pageId || undefined,
      pageName: conn.pageName || undefined,
      pageAccessToken: conn.pageAccessToken || undefined,
    }));
  }

  /**
   * Get a specific connection
   */
  async getConnection(userId: string, platform: string): Promise<SocialMediaConnection | null> {
    if (!isSupportedPlatform(platform)) {
      return null;
    }

    const connections = await db
      .select()
      .from(socialMediaConnections)
      .where(
        and(
          eq(socialMediaConnections.userId, userId),
          eq(socialMediaConnections.platform, platform)
        )
      )
      .limit(1);

    if (connections.length === 0) {
      return null;
    }

    const conn = connections[0];
    return {
      id: conn.id,
      userId: conn.userId,
      platform: conn.platform as SocialPlatform,
      platformUserId: conn.platformUserId,
      platformUsername: conn.platformUsername || undefined,
      platformDisplayName: conn.platformDisplayName || undefined,
      platformAvatarUrl: conn.platformAvatarUrl || undefined,
      status: conn.status as 'active' | 'expired' | 'revoked' | 'error',
      scopes: conn.scopes ? JSON.parse(conn.scopes) : undefined,
      connectedAt: conn.connectedAt || new Date(),
      lastUsedAt: conn.lastUsedAt || undefined,
      lastError: conn.lastError || undefined,
      pageId: conn.pageId || undefined,
      pageName: conn.pageName || undefined,
      pageAccessToken: conn.pageAccessToken || undefined,
    };
  }

  /**
   * Disconnect a platform
   */
  async disconnectPlatform(userId: string, platform: string): Promise<void> {
    if (!isSupportedPlatform(platform)) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const connections = await db
      .select()
      .from(socialMediaConnections)
      .where(
        and(
          eq(socialMediaConnections.userId, userId),
          eq(socialMediaConnections.platform, platform)
        )
      )
      .limit(1);

    if (connections.length === 0) {
      return; // Already disconnected
    }

    const connection = connections[0];

    try {
      // Try to revoke token on the platform
      const provider = getOAuthProvider(platform);
      const decryptedToken = await this.decryptToken(connection.accessToken);
      await provider.revokeToken(decryptedToken);
    } catch (error) {
      // Log but don't fail - we'll delete the connection anyway
      safeLogger.warn('Token revocation failed:', { platform, error });
    }

    // Delete the connection
    await db
      .delete(socialMediaConnections)
      .where(eq(socialMediaConnections.id, connection.id));
  }

  /**
   * Get access token for a connection (with auto-refresh)
   */
  async getAccessToken(userId: string, platform: string): Promise<string | null> {
    const connections = await db
      .select()
      .from(socialMediaConnections)
      .where(
        and(
          eq(socialMediaConnections.userId, userId),
          eq(socialMediaConnections.platform, platform)
        )
      )
      .limit(1);

    if (connections.length === 0) {
      return null;
    }

    const connection = connections[0];

    // Check if token needs refresh
    if (connection.tokenExpiry && new Date() >= connection.tokenExpiry) {
      if (connection.refreshToken) {
        try {
          const newTokens = await this.refreshToken(connection.id);
          return newTokens.accessToken;
        } catch (error) {
          safeLogger.error('Token refresh failed:', { platform, error });
          // Mark as expired
          await db
            .update(socialMediaConnections)
            .set({
              status: 'expired',
              lastError: 'Token refresh failed',
              updatedAt: new Date(),
            })
            .where(eq(socialMediaConnections.id, connection.id));
          return null;
        }
      } else {
        // No refresh token, mark as expired
        await db
          .update(socialMediaConnections)
          .set({
            status: 'expired',
            lastError: 'Token expired, reconnection required',
            updatedAt: new Date(),
          })
          .where(eq(socialMediaConnections.id, connection.id));
        return null;
      }
    }

    // Decrypt and return token
    return this.decryptToken(connection.accessToken);
  }

  /**
   * Get page access token for a connection (if available)
   */
  async getPageAccessToken(userId: string, platform: string): Promise<{ token: string; pageId: string } | null> {
    const connections = await db
      .select({
        id: socialMediaConnections.id,
        pageAccessToken: socialMediaConnections.pageAccessToken,
        pageId: socialMediaConnections.pageId,
      })
      .from(socialMediaConnections)
      .where(
        and(
          eq(socialMediaConnections.userId, userId),
          eq(socialMediaConnections.platform, platform)
        )
      )
      .limit(1);

    if (connections.length === 0) {
      return null;
    }

    const connection = connections[0];

    if (!connection.pageId || !connection.pageAccessToken) {
      return null;
    }

    return {
      token: await this.decryptToken(connection.pageAccessToken),
      pageId: connection.pageId,
    };
  }

  /**
   * Refresh token for a connection
   */
  async refreshToken(connectionId: string): Promise<OAuthTokens> {
    const connections = await db
      .select()
      .from(socialMediaConnections)
      .where(eq(socialMediaConnections.id, connectionId))
      .limit(1);

    if (connections.length === 0) {
      throw new Error('Connection not found');
    }

    const connection = connections[0];

    if (!connection.refreshToken) {
      throw new Error('No refresh token available');
    }

    const platform = connection.platform as SocialPlatform;
    const provider = getOAuthProvider(platform);

    if (!provider.supportsRefreshToken()) {
      throw new Error(`${platform} does not support token refresh`);
    }

    // Decrypt refresh token
    const decryptedRefreshToken = await this.decryptToken(connection.refreshToken);

    // Refresh the token
    const newTokens = await provider.refreshAccessToken(decryptedRefreshToken);

    // Encrypt new tokens
    const encryptedAccessToken = await this.encryptToken(newTokens.accessToken);
    const encryptedRefreshToken = newTokens.refreshToken
      ? await this.encryptToken(newTokens.refreshToken)
      : connection.refreshToken;

    // Update connection
    await db
      .update(socialMediaConnections)
      .set({
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiry: newTokens.expiresAt,
        status: 'active',
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(socialMediaConnections.id, connectionId));

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      expiresAt: newTokens.expiresAt,
    };
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(connectionId: string): Promise<void> {
    await db
      .update(socialMediaConnections)
      .set({
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(socialMediaConnections.id, connectionId));
  }

  /**
   * Mark connection with error
   */
  async markConnectionError(connectionId: string, error: string): Promise<void> {
    await db
      .update(socialMediaConnections)
      .set({
        status: 'error',
        lastError: error,
        updatedAt: new Date(),
      })
      .where(eq(socialMediaConnections.id, connectionId));
  }

  /**
   * Encrypt a token for storage
   */
  private async encryptToken(token: string): Promise<string> {
    return this.encryptionService.encryptField(token, 'accessToken', 'OAUTH_TOKENS');
  }

  /**
   * Decrypt a stored token
   */
  private async decryptToken(encryptedToken: string): Promise<string> {
    return this.encryptionService.decryptField(encryptedToken, 'accessToken', 'OAUTH_TOKENS');
  }

  /**
   * Clean up expired OAuth states
   */
  private async cleanupExpiredStates(): Promise<void> {
    try {
      await db
        .delete(oauthStates)
        .where(lt(oauthStates.expiresAt, new Date()));
    } catch (error) {
      safeLogger.error('Error cleaning up expired OAuth states:', error);
    }
  }
}

export const socialMediaConnectionService = new SocialMediaConnectionService();
