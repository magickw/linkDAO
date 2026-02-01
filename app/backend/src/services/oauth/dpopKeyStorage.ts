/**
 * DPoP Key Storage for AT Protocol OAuth
 * Implements NodeSavedStateStore and NodeSavedSessionStore interfaces
 * for use with @atproto/oauth-client-node
 */

import { db } from '../../db';
import { oauthStates, socialMediaConnections } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { DataEncryptionService } from '../dataEncryptionService';
import { safeLogger } from '../../utils/safeLogger';
import type { NodeSavedState, NodeSavedSession } from '@atproto/oauth-client-node';
import type { SimpleStore, GetOptions } from '@atproto-labs/simple-store';

// Encryption service for secure storage
const encryptionService = new DataEncryptionService();

/**
 * OAuth State Store for Bluesky
 * Stores temporary state during the OAuth authorization flow
 */
export class BlueskyStateStore implements SimpleStore<string, NodeSavedState> {
  async get(key: string, _options?: GetOptions): Promise<NodeSavedState | undefined> {
    try {
      const states = await db
        .select()
        .from(oauthStates)
        .where(eq(oauthStates.state, key))
        .limit(1);

      if (states.length === 0) {
        return undefined;
      }

      const state = states[0];

      // Check if expired
      if (new Date() > state.expiresAt) {
        await this.del(key);
        return undefined;
      }

      // Parse the stored state data
      // The state data is stored in a custom JSON column we'll add or use metadata field
      const metadata = state.metadata ? JSON.parse(state.metadata) : null;
      if (!metadata || !metadata.dpopJwk) {
        return undefined;
      }

      return {
        iss: metadata.iss,
        dpopJwk: metadata.dpopJwk,
        authMethod: metadata.authMethod,
        verifier: state.codeVerifier || undefined,
        appState: metadata.appState,
      };
    } catch (error) {
      safeLogger.error('Error getting Bluesky state:', error);
      return undefined;
    }
  }

  async set(key: string, value: NodeSavedState): Promise<void> {
    try {
      // Store the state data
      const metadata = JSON.stringify({
        iss: value.iss,
        dpopJwk: value.dpopJwk,
        authMethod: value.authMethod,
        appState: value.appState,
      });

      // Check if state exists
      const existing = await db
        .select()
        .from(oauthStates)
        .where(eq(oauthStates.state, key))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(oauthStates)
          .set({
            codeVerifier: value.verifier || null,
            metadata: metadata,
          })
          .where(eq(oauthStates.state, key));
      } else {
        // If creating a new state, we need userId and platform
        // This will be called after initiateOAuth sets up the basic state
        safeLogger.warn('BlueskyStateStore.set called but no existing state found for key:', key);
      }
    } catch (error) {
      safeLogger.error('Error setting Bluesky state:', error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await db.delete(oauthStates).where(eq(oauthStates.state, key));
    } catch (error) {
      safeLogger.error('Error deleting Bluesky state:', error);
    }
  }

  async clear(): Promise<void> {
    // We don't clear all states, just let them expire
    safeLogger.warn('BlueskyStateStore.clear called - not implemented');
  }
}

/**
 * OAuth Session Store for Bluesky
 * Stores persistent session data with DPoP keys in the social_media_connections table
 */
export class BlueskySessionStore implements SimpleStore<string, NodeSavedSession> {
  async get(key: string, _options?: GetOptions): Promise<NodeSavedSession | undefined> {
    try {
      // Key is the Bluesky DID (sub)
      const connections = await db
        .select()
        .from(socialMediaConnections)
        .where(
          and(
            eq(socialMediaConnections.platform, 'bluesky'),
            eq(socialMediaConnections.platformUserId, key)
          )
        )
        .limit(1);

      if (connections.length === 0) {
        return undefined;
      }

      const connection = connections[0];

      // Decrypt the tokens and DPoP key
      const accessToken = await encryptionService.decryptField(
        connection.accessToken,
        'accessToken',
        'OAUTH_TOKENS'
      );

      let refreshToken: string | undefined;
      if (connection.refreshToken) {
        refreshToken = await encryptionService.decryptField(
          connection.refreshToken,
          'refreshToken',
          'OAUTH_TOKENS'
        );
      }

      // Get DPoP key if available
      let dpopJwk: any;
      if (connection.dpopPrivateKey) {
        const decryptedKey = await encryptionService.decryptField(
          connection.dpopPrivateKey,
          'dpopPrivateKey',
          'OAUTH_TOKENS'
        );
        dpopJwk = JSON.parse(decryptedKey);
      } else {
        // No DPoP key stored - this connection was created with app password
        return undefined;
      }

      // Parse scopes
      const scope = connection.scopes ? JSON.parse(connection.scopes).join(' ') : 'atproto';

      // Build the session object
      return {
        dpopJwk,
        authMethod: 'none' as any, // AT Protocol uses PKCE, not client auth
        tokenSet: {
          iss: 'https://bsky.social', // Will be updated when we have proper issuer tracking
          sub: key as any, // DID format
          aud: 'https://bsky.social',
          scope: scope as any,
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'DPoP' as const,
          expires_at: connection.tokenExpiry?.toISOString(),
        },
      };
    } catch (error) {
      safeLogger.error('Error getting Bluesky session:', error);
      return undefined;
    }
  }

  async set(key: string, value: NodeSavedSession): Promise<void> {
    try {
      // Encrypt the tokens and DPoP key
      const encryptedAccessToken = await encryptionService.encryptField(
        value.tokenSet.access_token,
        'accessToken',
        'OAUTH_TOKENS'
      );

      let encryptedRefreshToken: string | null = null;
      if (value.tokenSet.refresh_token) {
        encryptedRefreshToken = await encryptionService.encryptField(
          value.tokenSet.refresh_token,
          'refreshToken',
          'OAUTH_TOKENS'
        );
      }

      // Encrypt the DPoP JWK
      const encryptedDpopKey = await encryptionService.encryptField(
        JSON.stringify(value.dpopJwk),
        'dpopPrivateKey',
        'OAUTH_TOKENS'
      );

      // Calculate key thumbprint for identification
      const keyId = value.dpopJwk.kid || this.calculateKeyThumbprint(value.dpopJwk);

      // Parse token expiry
      const tokenExpiry = value.tokenSet.expires_at
        ? new Date(value.tokenSet.expires_at)
        : new Date(Date.now() + 2 * 60 * 60 * 1000); // Default 2 hours

      // Update the connection
      await db
        .update(socialMediaConnections)
        .set({
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiry,
          dpopPrivateKey: encryptedDpopKey,
          dpopPublicKeyId: keyId,
          scopes: JSON.stringify(value.tokenSet.scope.split(' ')),
          status: 'active',
          lastError: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(socialMediaConnections.platform, 'bluesky'),
            eq(socialMediaConnections.platformUserId, key)
          )
        );
    } catch (error) {
      safeLogger.error('Error setting Bluesky session:', error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      // Mark the connection as revoked rather than deleting it
      await db
        .update(socialMediaConnections)
        .set({
          status: 'revoked',
          accessToken: '', // Clear tokens
          refreshToken: null,
          dpopPrivateKey: null,
          dpopPublicKeyId: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(socialMediaConnections.platform, 'bluesky'),
            eq(socialMediaConnections.platformUserId, key)
          )
        );
    } catch (error) {
      safeLogger.error('Error deleting Bluesky session:', error);
    }
  }

  async clear(): Promise<void> {
    // We don't clear all sessions
    safeLogger.warn('BlueskySessionStore.clear called - not implemented');
  }

  /**
   * Calculate a simple key thumbprint for identification
   */
  private calculateKeyThumbprint(jwk: any): string {
    // Simple thumbprint based on key material
    const keyMaterial = JSON.stringify({
      kty: jwk.kty,
      crv: jwk.crv,
      x: jwk.x,
      y: jwk.y,
    });

    // Use a simple hash
    let hash = 0;
    for (let i = 0; i < keyMaterial.length; i++) {
      const char = keyMaterial.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}

// Singleton instances
let stateStore: BlueskyStateStore | null = null;
let sessionStore: BlueskySessionStore | null = null;

export function getBlueskyStateStore(): BlueskyStateStore {
  if (!stateStore) {
    stateStore = new BlueskyStateStore();
  }
  return stateStore;
}

export function getBlueskySessionStore(): BlueskySessionStore {
  if (!sessionStore) {
    sessionStore = new BlueskySessionStore();
  }
  return sessionStore;
}
