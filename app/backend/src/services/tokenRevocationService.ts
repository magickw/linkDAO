/**
 * Token Revocation Service
 * Manages revoked JWT tokens using Redis
 */

import { RedisService } from './redisService';
import { safeLogger } from '../utils/safeLogger';

export class TokenRevocationService {
    private redisService: RedisService;
    private readonly TOKEN_REVOCATION_PREFIX = 'revoked:token:';
    private readonly USER_REVOCATION_PREFIX = 'revoked:user:';

    constructor() {
        this.redisService = RedisService.getInstance();
    }

    /**
     * Revoke a specific token
     * @param tokenId - Unique identifier for the token (jti claim)
     * @param expiresAt - Token expiration timestamp
     */
    async revokeToken(tokenId: string, expiresAt: number): Promise<void> {
        try {
            const ttl = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));

            if (ttl > 0) {
                await this.redisService.set(
                    `${this.TOKEN_REVOCATION_PREFIX}${tokenId}`,
                    { revokedAt: Date.now() },
                    ttl
                );
                safeLogger.info(`[TokenRevocation] Revoked token: ${tokenId}`);
            } else {
                safeLogger.debug(`[TokenRevocation] Token already expired: ${tokenId}`);
            }
        } catch (error) {
            safeLogger.error('[TokenRevocation] Error revoking token:', error);
            throw error;
        }
    }

    /**
     * Check if a token is revoked
     * @param tokenId - Unique identifier for the token (jti claim)
     */
    async isTokenRevoked(tokenId: string): Promise<boolean> {
        try {
            const exists = await this.redisService.exists(`${this.TOKEN_REVOCATION_PREFIX}${tokenId}`);
            return exists;
        } catch (error) {
            safeLogger.error('[TokenRevocation] Error checking token revocation:', error);
            // Fail secure: if we can't check, assume it's revoked
            return true;
        }
    }

    /**
     * Revoke all tokens for a user
     * @param userId - User ID
     * @param ttl - Time to live in seconds (should match longest token expiration)
     */
    async revokeAllUserTokens(userId: string, ttl: number = 86400): Promise<void> {
        try {
            await this.redisService.set(
                `${this.USER_REVOCATION_PREFIX}${userId}`,
                { revokedAt: Date.now() },
                ttl
            );
            safeLogger.info(`[TokenRevocation] Revoked all tokens for user: ${userId}`);
        } catch (error) {
            safeLogger.error('[TokenRevocation] Error revoking user tokens:', error);
            throw error;
        }
    }

    /**
     * Check if all user tokens are revoked
     * @param userId - User ID
     * @param tokenIssuedAt - When the token was issued (iat claim)
     */
    async areUserTokensRevoked(userId: string, tokenIssuedAt: number): Promise<boolean> {
        try {
            const revocationData = await this.redisService.get(`${this.USER_REVOCATION_PREFIX}${userId}`);

            if (!revocationData) {
                return false;
            }

            // Token is revoked if it was issued before the revocation timestamp
            return tokenIssuedAt < revocationData.revokedAt;
        } catch (error) {
            safeLogger.error('[TokenRevocation] Error checking user token revocation:', error);
            // Fail secure: if we can't check, assume it's revoked
            return true;
        }
    }

    /**
     * Clear user token revocation (e.g., after password reset)
     * @param userId - User ID
     */
    async clearUserRevocation(userId: string): Promise<void> {
        try {
            await this.redisService.del(`${this.USER_REVOCATION_PREFIX}${userId}`);
            safeLogger.info(`[TokenRevocation] Cleared revocation for user: ${userId}`);
        } catch (error) {
            safeLogger.error('[TokenRevocation] Error clearing user revocation:', error);
            throw error;
        }
    }

    /**
     * Get revocation statistics
     */
    async getRevocationStats(): Promise<{ totalRevokedTokens: number; totalRevokedUsers: number }> {
        try {
            const tokenKeys = await this.redisService.keys(`${this.TOKEN_REVOCATION_PREFIX}*`);
            const userKeys = await this.redisService.keys(`${this.USER_REVOCATION_PREFIX}*`);

            return {
                totalRevokedTokens: tokenKeys.length,
                totalRevokedUsers: userKeys.length
            };
        } catch (error) {
            safeLogger.error('[TokenRevocation] Error getting revocation stats:', error);
            return { totalRevokedTokens: 0, totalRevokedUsers: 0 };
        }
    }
}

// Singleton instance
export const tokenRevocationService = new TokenRevocationService();
