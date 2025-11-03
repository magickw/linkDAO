/// <reference path="../types/express.d.ts" />
import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { reportService } from '../services/reportService';
import { reputationService } from '../services/reputationService';

export class ReportController {
  async submitReport(req: Request, res: Response) {
    try {
      const { contentId, contentType, reason, details, category } = req.body;
      const reporterId = req.user?.id;

      if (!reporterId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check if user has already reported this content
      const existingReport = await reportService.getExistingReport(contentId, reporterId);
      if (existingReport) {
        return res.status(409).json({ 
          error: 'You have already reported this content',
          reportId: existingReport.id 
        });
      }

      // Get reporter's reputation weight
      const reporterWeight = await reportService.getReporterWeight(reporterId);

      const report = await reportService.submitReport({
        contentId,
        contentType,
        reporterId,
        reason,
        details,
        category,
        weight: reporterWeight
      });

      // Trigger aggregation check
      await reportService.checkAggregationThreshold(contentId);

      res.status(201).json({
        success: true,
        reportId: report.id,
        message: 'Report submitted successfully'
      });
    } catch (error) {
      safeLogger.error('Error submitting report:', error);
      res.status(500).json({ error: 'Failed to submit report' });
    }
  }

  async getUserReports(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const reports = await reportService.getUserReports(userId, page, limit);
      
      res.json({
        success: true,
        reports: reports.data,
        pagination: {
          page,
          limit,
          total: reports.total,
          totalPages: Math.ceil(reports.total / limit)
        }
      });
    } catch (error) {
      safeLogger.error('Error fetching user reports:', error);
      res.status(500).json({ error: 'Failed to fetch reports' });
    }
  }

  async getReportStatus(req: Request, res: Response) {
    try {
      const { contentId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const status = await reportService.getContentReportStatus(contentId, userId);
      
      res.json({
        success: true,
        ...status
      });
    } catch (error) {
      safeLogger.error('Error fetching report status:', error);
      res.status(500).json({ error: 'Failed to fetch report status' });
    }
  }

  async getModerationQueue(req: Request, res: Response) {
    try {
      const { status, page = 1, limit = 50 } = req.query;
      
      const queue = await reportService.getModerationQueue({
        status: status as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      res.json({
        success: true,
        reports: queue.data,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: queue.total,
          totalPages: Math.ceil(queue.total / parseInt(limit as string))
        }
      });
    } catch (error) {
      safeLogger.error('Error fetching moderation queue:', error);
      res.status(500).json({ error: 'Failed to fetch moderation queue' });
    }
  }

  async updateReportStatus(req: Request, res: Response) {
    try {
      const { reportId } = req.params;
      const { status, resolution, moderatorNotes } = req.body;
      const moderatorId = req.user?.id;

      if (!moderatorId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const updatedReport = await reportService.updateReportStatus(
        parseInt(reportId),
        status,
        moderatorId,
        { resolution, moderatorNotes }
      );

      // Update reporter reputation based on resolution
      if (status === 'resolved' || status === 'dismissed') {
        await reportService.updateReporterReputation(updatedReport.reporterId, status === 'resolved');
      }

      res.json({
        success: true,
        report: updatedReport,
        message: 'Report status updated successfully'
      });
    } catch (error) {
      safeLogger.error('Error updating report status:', error);
      res.status(500).json({ error: 'Failed to update report status' });
    }
  }

  async getReportAnalytics(req: Request, res: Response) {
    try {
      const analytics = await reportService.getReportAnalytics();
      
      res.json({
        success: true,
        analytics
      });
    } catch (error) {
      safeLogger.error('Error fetching report analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }

  async aggregateReports(req: Request, res: Response) {
    try {
      const { contentId } = req.body;
      
      const result = await reportService.aggregateReportsForContent(contentId);
      
      res.json({
        success: true,
        escalated: result.escalated,
        totalWeight: result.totalWeight,
        reportCount: result.reportCount
      });
    } catch (error) {
      safeLogger.error('Error aggregating reports:', error);
      res.status(500).json({ error: 'Failed to aggregate reports' });
    }
  }

  async updateReporterReputation(req: Request, res: Response) {
    try {
      const { reporterId, isAccurate } = req.body;
      
      await reportService.updateReporterReputation(reporterId, isAccurate);
      
      res.json({
        success: true,
        message: 'Reporter reputation updated'
      });
    } catch (error) {
      safeLogger.error('Error updating reporter reputation:', error);
      res.status(500).json({ error: 'Failed to update reputation' });
    }
  }
}

export const reportController = new ReportController();
