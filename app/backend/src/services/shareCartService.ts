import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { AuthenticatedUser } from '../middleware/authMiddleware';
import crypto from 'crypto';

interface SharedCart {
    id: string;
    shareToken: string;
    userId: string;
    cartSnapshot: any;
    expiresAt: Date;
    createdAt: Date;
    viewCount: number;
    lastViewedAt: Date | null;
}

export class ShareCartService {
    /**
     * Generate a shareable cart link
     */
    async shareCart(user: AuthenticatedUser, cartSnapshot: any): Promise<{ shareToken: string; expiresAt: Date }> {
        try {
            if (!db) {
                throw new Error('Database connection not available');
            }

            // Generate unique share token
            const shareToken = this.generateShareToken();

            // Set expiration to 7 days from now
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            // Insert shared cart
            await db.execute(`
        INSERT INTO shared_carts (share_token, user_id, cart_snapshot, expires_at)
        VALUES ($1, $2, $3, $4)
      `, [shareToken, user.id, JSON.stringify(cartSnapshot), expiresAt]);

            safeLogger.info(`[ShareCartService] Created shared cart with token: ${shareToken}`);

            return { shareToken, expiresAt };
        } catch (error) {
            safeLogger.error('Error sharing cart:', error);
            throw error;
        }
    }

    /**
     * Get shared cart by token
     */
    async getSharedCart(shareToken: string): Promise<SharedCart | null> {
        try {
            if (!db) {
                throw new Error('Database connection not available');
            }

            const result = await db.execute(`
        SELECT * FROM shared_carts
        WHERE share_token = $1 AND expires_at > NOW()
      `, [shareToken]);

            if (!result.rows || result.rows.length === 0) {
                return null;
            }

            const row = result.rows[0] as any;

            // Update view count
            await db.execute(`
        UPDATE shared_carts
        SET view_count = view_count + 1, last_viewed_at = NOW()
        WHERE share_token = $1
      `, [shareToken]);

            return {
                id: row.id,
                shareToken: row.share_token,
                userId: row.user_id,
                cartSnapshot: typeof row.cart_snapshot === 'string'
                    ? JSON.parse(row.cart_snapshot)
                    : row.cart_snapshot,
                expiresAt: new Date(row.expires_at),
                createdAt: new Date(row.created_at),
                viewCount: row.view_count,
                lastViewedAt: row.last_viewed_at ? new Date(row.last_viewed_at) : null
            };
        } catch (error) {
            safeLogger.error('Error getting shared cart:', error);
            throw error;
        }
    }

    /**
     * Delete expired shared carts (cleanup job)
     */
    async deleteExpiredCarts(): Promise<number> {
        try {
            if (!db) {
                throw new Error('Database connection not available');
            }

            const result = await db.execute(`
        DELETE FROM shared_carts
        WHERE expires_at < NOW()
      `);

            const deletedCount = result.rowCount || 0;
            safeLogger.info(`[ShareCartService] Deleted ${deletedCount} expired shared carts`);

            return deletedCount;
        } catch (error) {
            safeLogger.error('Error deleting expired carts:', error);
            throw error;
        }
    }

    /**
     * Generate a unique share token
     */
    private generateShareToken(): string {
        return crypto.randomBytes(32).toString('base64url');
    }
}

export const shareCartService = new ShareCartService();
