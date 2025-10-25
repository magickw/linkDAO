import { Request, Response } from 'express';
import { databaseService } from '../services/databaseService';
import { contentReports } from '../db/schema';
import { z } from 'zod';

// Validation schema for content reports
const ContentReportSchema = z.object({
  contentId: z.string(),
  contentType: z.enum(['post', 'comment', 'listing', 'dm', 'username']),
  reason: z.enum([
    'spam',
    'harassment',
    'hate_speech',
    'violence',
    'nsfw',
    'scam',
    'fake_content',
    'copyright',
    'other'
  ]),
  details: z.string().optional()
});

export class ContentReportController {
  /**
   * Submit a content report
   */
  async submitReport(req: Request, res: Response): Promise<void> {
    try {
      // Get reporter user ID from authenticated session
      const reporterAddress = (req as any).user?.walletAddress;

      if (!reporterAddress) {
        res.status(401).json({
          success: false,
          error: 'Authentication required to submit reports'
        });
        return;
      }

      // Validate request body
      const validatedInput = ContentReportSchema.parse(req.body);

      // Get reporter user ID from database
      const db = databaseService.getDatabase();
      const users = await db
        .select()
        .from(require('../db/schema').users)
        .where(require('drizzle-orm').eq(
          require('../db/schema').users.walletAddress,
          reporterAddress
        ))
        .limit(1);

      if (users.length === 0) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      const reporterId = users[0].id;

      // Create content report
      const newReport = await db.insert(contentReports).values({
        contentId: validatedInput.contentId,
        contentType: validatedInput.contentType,
        reporterId,
        reason: validatedInput.reason,
        details: validatedInput.details || '',
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Log report submission
      console.log(`[MODERATION] Content report submitted: ${newReport[0].id} - ${validatedInput.reason} for ${validatedInput.contentType} ${validatedInput.contentId}`);

      res.json({
        success: true,
        data: {
          reportId: newReport[0].id,
          message: 'Report submitted successfully. Our moderation team will review it soon.'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error submitting content report:', error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid report data',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to submit report. Please try again.'
      });
    }
  }

  /**
   * Get reports for a specific content item (admin only)
   */
  async getReportsForContent(req: Request, res: Response): Promise<void> {
    try {
      const { contentId } = req.params;

      if (!contentId) {
        res.status(400).json({
          success: false,
          error: 'Content ID is required'
        });
        return;
      }

      const db = databaseService.getDatabase();
      const reports = await db
        .select()
        .from(contentReports)
        .where(require('drizzle-orm').eq(contentReports.contentId, contentId))
        .orderBy(require('drizzle-orm').desc(contentReports.createdAt));

      res.json({
        success: true,
        data: {
          contentId,
          reports,
          totalReports: reports.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error retrieving content reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve reports'
      });
    }
  }

  /**
   * Get all pending reports (admin only)
   */
  async getPendingReports(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const db = databaseService.getDatabase();
      const reports = await db
        .select()
        .from(contentReports)
        .where(require('drizzle-orm').eq(contentReports.status, 'open'))
        .orderBy(require('drizzle-orm').desc(contentReports.createdAt))
        .limit(limit)
        .offset(offset);

      const totalCount = await db
        .select({ count: require('drizzle-orm').sql<number>`COUNT(*)` })
        .from(contentReports)
        .where(require('drizzle-orm').eq(contentReports.status, 'open'));

      res.json({
        success: true,
        data: {
          reports,
          pagination: {
            page,
            limit,
            total: totalCount[0]?.count || 0,
            totalPages: Math.ceil((totalCount[0]?.count || 0) / limit)
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error retrieving pending reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve pending reports'
      });
    }
  }

  /**
   * Update report status (admin only)
   */
  async updateReportStatus(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const { status, resolution } = req.body;

      if (!reportId || !status) {
        res.status(400).json({
          success: false,
          error: 'Report ID and status are required'
        });
        return;
      }

      const validStatuses = ['open', 'under_review', 'resolved', 'dismissed'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Invalid status value'
        });
        return;
      }

      const db = databaseService.getDatabase();
      const updated = await db
        .update(contentReports)
        .set({
          status,
          resolution: resolution || null,
          updatedAt: new Date()
        })
        .where(require('drizzle-orm').eq(contentReports.id, parseInt(reportId)))
        .returning();

      if (updated.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Report not found'
        });
        return;
      }

      console.log(`[MODERATION] Report ${reportId} status updated to: ${status}`);

      res.json({
        success: true,
        data: updated[0],
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error updating report status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update report status'
      });
    }
  }
}

export const contentReportController = new ContentReportController();
