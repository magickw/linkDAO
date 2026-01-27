import { Request, Response } from 'express';
import { returnReasonAnalysisService } from '../services/returnReasonAnalysisService';
import { safeLogger } from '../utils/safeLogger';

/**
 * Controller for return reason analysis endpoints
 * Handles categorization, trend analysis, and NLP-based clustering
 */
export class ReturnReasonAnalysisController {
  /**
   * Get reason categorization
   * GET /api/admin/returns/reasons/categorization
   */
  async getCategorization(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, sellerId } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'startDate and endDate are required',
        });
        return;
      }

      const period = {
        start: startDate as string,
        end: endDate as string,
      };

      const categorization = await returnReasonAnalysisService.categorizeReasons(
        period,
        sellerId as string | undefined
      );

      res.json({
        success: true,
        data: categorization,
      });
    } catch (error) {
      safeLogger.error('Error getting reason categorization:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get reason categorization',
      });
    }
  }

  /**
   * Get reason trends
   * GET /api/admin/returns/reasons/trends
   */
  async getTrends(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, sellerId } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'startDate and endDate are required',
        });
        return;
      }

      const period = {
        start: startDate as string,
        end: endDate as string,
      };

      const trends = await returnReasonAnalysisService.analyzeReasonTrends(
        period,
        sellerId as string | undefined
      );

      res.json({
        success: true,
        data: trends,
      });
    } catch (error) {
      safeLogger.error('Error getting reason trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get reason trends',
      });
    }
  }

  /**
   * Get reason clusters
   * GET /api/admin/returns/reasons/clusters
   */
  async getClusters(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, sellerId } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'startDate and endDate are required',
        });
        return;
      }

      const period = {
        start: startDate as string,
        end: endDate as string,
      };

      const clusters = await returnReasonAnalysisService.clusterReasons(
        period,
        sellerId as string | undefined
      );

      res.json({
        success: true,
        data: clusters,
      });
    } catch (error) {
      safeLogger.error('Error getting reason clusters:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get reason clusters',
      });
    }
  }

  /**
   * Get comprehensive reason analytics
   * GET /api/admin/returns/reasons/analytics
   */
  async getComprehensiveAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, sellerId } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'startDate and endDate are required',
        });
        return;
      }

      const period = {
        start: startDate as string,
        end: endDate as string,
      };

      const analytics = await returnReasonAnalysisService.getComprehensiveReasonAnalytics(
        period,
        sellerId as string | undefined
      );

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      safeLogger.error('Error getting comprehensive reason analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get comprehensive reason analytics',
      });
    }
  }
}

export const returnReasonAnalysisController = new ReturnReasonAnalysisController();
