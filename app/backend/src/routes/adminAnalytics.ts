import { Router } from 'express';
import { db } from '../db';
import { emailAnalytics } from '../db/schema/emailAnalyticsSchema';
import { eq, gte, sql, count, desc } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * Get email analytics (admin only)
 */
router.get('/email-analytics', authenticateToken, async (req, res) => {
    try {
        const { range = '7d' } = req.query;

        // Calculate date range
        const now = new Date();
        let startDate = new Date();

        switch (range) {
            case '7d':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(now.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(now.getDate() - 90);
                break;
            default:
                startDate.setDate(now.getDate() - 7);
        }

        // Get overall stats
        const [overallStats] = await db
            .select({
                totalSent: count(),
                totalOpened: sql<number>`COUNT(CASE WHEN ${emailAnalytics.openedAt} IS NOT NULL THEN 1 END)`,
                totalClicked: sql<number>`COUNT(CASE WHEN ${emailAnalytics.clickedAt} IS NOT NULL THEN 1 END)`,
            })
            .from(emailAnalytics)
            .where(gte(emailAnalytics.sentAt, startDate));

        const openRate = overallStats.totalSent > 0
            ? (Number(overallStats.totalOpened) / overallStats.totalSent) * 100
            : 0;
        const clickRate = overallStats.totalSent > 0
            ? (Number(overallStats.totalClicked) / overallStats.totalSent) * 100
            : 0;

        // Get stats by email type
        const byType = await db
            .select({
                emailType: emailAnalytics.emailType,
                sent: count(),
                opened: sql<number>`COUNT(CASE WHEN ${emailAnalytics.openedAt} IS NOT NULL THEN 1 END)`,
                clicked: sql<number>`COUNT(CASE WHEN ${emailAnalytics.clickedAt} IS NOT NULL THEN 1 END)`,
            })
            .from(emailAnalytics)
            .where(gte(emailAnalytics.sentAt, startDate))
            .groupBy(emailAnalytics.emailType);

        // Get stats by date
        const byDate = await db
            .select({
                date: sql<string>`DATE(${emailAnalytics.sentAt})`,
                sent: count(),
                opened: sql<number>`COUNT(CASE WHEN ${emailAnalytics.openedAt} IS NOT NULL THEN 1 END)`,
                clicked: sql<number>`COUNT(CASE WHEN ${emailAnalytics.clickedAt} IS NOT NULL THEN 1 END)`,
            })
            .from(emailAnalytics)
            .where(gte(emailAnalytics.sentAt, startDate))
            .groupBy(sql`DATE(${emailAnalytics.sentAt})`)
            .orderBy(sql`DATE(${emailAnalytics.sentAt})`);

        res.json({
            totalSent: overallStats.totalSent,
            totalOpened: Number(overallStats.totalOpened),
            totalClicked: Number(overallStats.totalClicked),
            openRate,
            clickRate,
            byType: byType.map(item => ({
                emailType: item.emailType,
                sent: item.sent,
                opened: Number(item.opened),
                clicked: Number(item.clicked),
            })),
            byDate: byDate.map(item => ({
                date: item.date,
                sent: item.sent,
                opened: Number(item.opened),
                clicked: Number(item.clicked),
            })),
        });
    } catch (error) {
        console.error('Error fetching email analytics:', error);
        res.status(500).json({ error: 'Failed to fetch email analytics' });
    }
});

export default router;
