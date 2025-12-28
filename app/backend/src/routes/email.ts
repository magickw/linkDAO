import { Router } from 'express';
import { db } from '../db';
import { emailAnalytics } from '../db/schema/emailAnalyticsSchema';
import { securityAlertsConfig } from '../db/schema/securitySchema';
import { eq, and, isNull } from 'drizzle-orm';
import * as crypto from 'crypto';

const router = Router();

/**
 * Track email open (1x1 pixel)
 */
router.get('/track/open/:trackingId', async (req, res) => {
    try {
        const { trackingId } = req.params;

        // Update analytics - only record first open
        await db.update(emailAnalytics)
            .set({ openedAt: new Date() })
            .where(and(
                eq(emailAnalytics.trackingId, trackingId),
                isNull(emailAnalytics.openedAt)
            ));

        // Return 1x1 transparent GIF pixel
        const pixel = Buffer.from(
            'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            'base64'
        );

        res.set({
            'Content-Type': 'image/gif',
            'Content-Length': pixel.length,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        res.send(pixel);
    } catch (error) {
        console.error('Error tracking email open:', error);
        // Still return pixel even on error
        const pixel = Buffer.from(
            'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
            'base64'
        );
        res.set('Content-Type', 'image/gif');
        res.send(pixel);
    }
});

/**
 * Track email click and redirect
 */
router.get('/track/click/:trackingId', async (req, res) => {
    try {
        const { trackingId } = req.params;
        const { redirect } = req.query;

        if (!redirect) {
            return res.status(400).json({ error: 'Missing redirect parameter' });
        }

        // Update analytics - only record first click
        await db.update(emailAnalytics)
            .set({ clickedAt: new Date() })
            .where(and(
                eq(emailAnalytics.trackingId, trackingId),
                isNull(emailAnalytics.clickedAt)
            ));

        // Redirect to original URL
        res.redirect(decodeURIComponent(redirect as string));
    } catch (error) {
        console.error('Error tracking email click:', error);
        // Redirect anyway
        const { redirect } = req.query;
        if (redirect) {
            res.redirect(decodeURIComponent(redirect as string));
        } else {
            res.status(500).json({ error: 'Failed to track click' });
        }
    }
});

/**
 * Unsubscribe from non-critical emails
 */
router.post('/unsubscribe', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Missing unsubscribe token' });
        }

        // Find config by token
        const [config] = await db.select()
            .from(securityAlertsConfig)
            .where(eq(securityAlertsConfig.unsubscribeToken, token));

        if (!config) {
            return res.status(404).json({ error: 'Invalid unsubscribe token' });
        }

        // Mark as unsubscribed
        await db.update(securityAlertsConfig)
            .set({
                unsubscribedAt: new Date(),
                emailNotificationsEnabled: false,
                updatedAt: new Date()
            })
            .where(eq(securityAlertsConfig.unsubscribeToken, token));

        res.json({
            success: true,
            message: 'Successfully unsubscribed from non-critical security emails. You will still receive critical security alerts.'
        });
    } catch (error) {
        console.error('Error processing unsubscribe:', error);
        res.status(500).json({ error: 'Failed to process unsubscribe request' });
    }
});

/**
 * Resubscribe to emails
 */
router.post('/resubscribe', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Missing token' });
        }

        // Find config by token
        const [config] = await db.select()
            .from(securityAlertsConfig)
            .where(eq(securityAlertsConfig.unsubscribeToken, token));

        if (!config) {
            return res.status(404).json({ error: 'Invalid token' });
        }

        // Re-enable emails
        await db.update(securityAlertsConfig)
            .set({
                unsubscribedAt: null,
                emailNotificationsEnabled: true,
                updatedAt: new Date()
            })
            .where(eq(securityAlertsConfig.unsubscribeToken, token));

        res.json({
            success: true,
            message: 'Successfully resubscribed to security email notifications'
        });
    } catch (error) {
        console.error('Error processing resubscribe:', error);
        res.status(500).json({ error: 'Failed to process resubscribe request' });
    }
});

/**
 * Generate unsubscribe token for a user
 */
export function generateUnsubscribeToken(userId: string): string {
    const secret = process.env.UNSUBSCRIBE_SECRET || 'default-secret-change-in-production';
    return crypto
        .createHash('sha256')
        .update(`${userId}-${Date.now()}-${secret}`)
        .digest('hex');
}

/**
 * Generate tracking ID for email analytics
 */
export function generateTrackingId(): string {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Wrap URL with click tracking
 */
export function wrapLinkWithTracking(url: string, trackingId: string): string {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    return `${backendUrl}/api/email/track/click/${trackingId}?redirect=${encodeURIComponent(url)}`;
}

export default router;
