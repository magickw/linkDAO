import { Request, Response } from 'express';
import { sellerReturnPerformanceService } from '../services/marketplace/sellerReturnPerformanceService';

/**
 * Seller Return Performance Controller
 * 
 * Handles HTTP requests for seller return performance analytics
 * Validates: Requirements 2.1, 5.1, 5.3, 5.4
 */

export class SellerReturnPerformanceController {
  /**
   * Get return metrics for a specific seller
   * GET /api/admin/returns/seller/:sellerId/metrics
   */
  async getSellerMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const { startDate, endDate } = req.query;

      if (!sellerId) {
        res.status(400).json({
          success: false,
          error: 'Seller ID is required',
        });
        return;
      }

      // Parse dates or use defaults (last 30 days)
      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate
        ? new Date(startDate as string)
        : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      const metrics = await sellerReturnPerformanceService.getSellerReturnMetrics(
        sellerId,
        start,
        end
      );

      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      console.error('Error getting seller metrics:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get seller metrics',
      });
    }
  }

  /**
   * Get compliance metrics for a specific seller
   * GET /api/admin/returns/seller/:sellerId/compliance
   */
  async getSellerCompliance(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const { startDate, endDate } = req.query;

      if (!sellerId) {
        res.status(400).json({
          success: false,
          error: 'Seller ID is required',
        });
        return;
      }

      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate
        ? new Date(startDate as string)
        : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      const compliance = await sellerReturnPerformanceService.getSellerComplianceMetrics(
        sellerId,
        start,
        end
      );

      res.status(200).json({
        success: true,
        data: compliance,
      });
    } catch (error) {
      console.error('Error getting seller compliance:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get seller compliance',
      });
    }
  }

  /**
   * Compare seller performance against platform averages
   * GET /api/admin/returns/seller/:sellerId/comparison
   */
  async compareSellerPerformance(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const { startDate, endDate } = req.query;

      if (!sellerId) {
        res.status(400).json({
          success: false,
          error: 'Seller ID is required',
        });
        return;
      }

      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate
        ? new Date(startDate as string)
        : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      const comparison = await sellerReturnPerformanceService.compareSellerPerformance(
        sellerId,
        start,
        end
      );

      res.status(200).json({
        success: true,
        data: comparison,
      });
    } catch (error) {
      console.error('Error comparing seller performance:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to compare seller performance',
      });
    }
  }

  /**
   * Get platform-wide averages
   * GET /api/admin/returns/platform/averages
   */
  async getPlatformAverages(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate
        ? new Date(startDate as string)
        : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      const averages = await sellerReturnPerformanceService.getPlatformAverages(start, end);

      res.status(200).json({
        success: true,
        data: averages,
      });
    } catch (error) {
      console.error('Error getting platform averages:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get platform averages',
      });
    }
  }

  /**
   * Get all sellers' performance metrics for comparison
   * GET /api/admin/returns/sellers/performance
   */
  async getAllSellersPerformance(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, sortBy, order, limit } = req.query;

      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate
        ? new Date(startDate as string)
        : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      // This would be implemented to get all sellers and their metrics
      // For now, returning a placeholder response
      res.status(200).json({
        success: true,
        data: {
          sellers: [],
          platformAverages: await sellerReturnPerformanceService.getPlatformAverages(start, end),
          timeRange: { start, end },
        },
      });
    } catch (error) {
      console.error('Error getting all sellers performance:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sellers performance',
      });
    }
  }
}

export const sellerReturnPerformanceController = new SellerReturnPerformanceController();
