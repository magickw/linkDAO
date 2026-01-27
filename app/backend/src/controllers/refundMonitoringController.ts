import { Request, Response } from 'express';
import { refundMonitoringService } from '../services/refundMonitoringService';
import { refundCostAnalysisService } from '../services/refundCostAnalysisService';
import { logger } from '../utils/logger';

/**
 * Refund Monitoring Controller
 * Handles HTTP requests for refund monitoring and analytics
 * 
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 * Properties: 7, 8, 9, 10
 */
class RefundMonitoringController {
  /**
   * Get comprehensive refund transaction tracking data
   * Property 7: Multi-Provider Transaction Tracking
   * 
   * GET /api/admin/refunds/tracker
   */
  async getTransactionTracker(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'startDate and endDate are required'
        });
        return;
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          error: 'Invalid date format',
          message: 'startDate and endDate must be valid ISO date strings'
        });
        return;
      }

      const tracker = await refundMonitoringService.getTransactionTracker(start, end);
      
      res.status(200).json(tracker);
    } catch (error) {
      logger.error('Error in getTransactionTracker:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve transaction tracker data'
      });
    }
  }

  /**
   * Get real-time payment provider status
   * Property 8: Failure Detection and Alerting
   * 
   * GET /api/admin/refunds/providers/status
   */
  async getProviderStatus(req: Request, res: Response): Promise<void> {
    try {
      const providerStatus = await refundMonitoringService.getProviderStatus();
      res.status(200).json(providerStatus);
    } catch (error) {
      logger.error('Error in getProviderStatus:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve provider status'
      });
    }
  }

  /**
   * Monitor provider health metrics
   * 
   * GET /api/admin/refunds/providers/health
   */
  async monitorProviderHealth(req: Request, res: Response): Promise<void> {
    try {
      const healthMetrics = await refundMonitoringService.monitorProviderHealth();
      res.status(200).json(healthMetrics);
    } catch (error) {
      logger.error('Error in monitorProviderHealth:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to monitor provider health'
      });
    }
  }

  /**
   * Get refund reconciliation data
   * Property 9: Transaction Reconciliation Completeness
   * 
   * GET /api/admin/refunds/reconciliation
   */
  async getReconciliationData(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'startDate and endDate are required'
        });
        return;
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          error: 'Invalid date format',
          message: 'startDate and endDate must be valid ISO date strings'
        });
        return;
      }

      const reconciliation = await refundMonitoringService.getReconciliationData(start, end);
      
      res.status(200).json(reconciliation);
    } catch (error) {
      logger.error('Error in getReconciliationData:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve reconciliation data'
      });
    }
  }

  /**
   * Analyze refund failures
   * Property 10: Discrepancy Detection
   * 
   * GET /api/admin/refunds/failures/analysis
   */
  async analyzeFailures(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'startDate and endDate are required'
        });
        return;
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          error: 'Invalid date format',
          message: 'startDate and endDate must be valid ISO date strings'
        });
        return;
      }

      const failureAnalysis = await refundMonitoringService.analyzeFailures(start, end);
      
      res.status(200).json(failureAnalysis);
    } catch (error) {
      logger.error('Error in analyzeFailures:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to analyze refund failures'
      });
    }
  }

  /**
   * Detect failure patterns in refund transactions
   * 
   * GET /api/admin/refunds/failures/patterns
   */
  async detectFailurePatterns(req: Request, res: Response): Promise<void> {
    try {
      const lookbackMinutes = req.query.lookbackMinutes 
        ? parseInt(req.query.lookbackMinutes as string) 
        : 60;

      if (isNaN(lookbackMinutes) || lookbackMinutes < 1) {
        res.status(400).json({
          error: 'Invalid parameter',
          message: 'lookbackMinutes must be a positive number'
        });
        return;
      }

      const patterns = await refundMonitoringService.detectFailurePatterns(lookbackMinutes);
      
      res.status(200).json(patterns);
    } catch (error) {
      logger.error('Error in detectFailurePatterns:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to detect failure patterns'
      });
    }
  }

  /**
   * Generate alerts based on current system state
   * 
   * GET /api/admin/refunds/alerts
   */
  async generateAlerts(req: Request, res: Response): Promise<void> {
    try {
      const alerts = await refundMonitoringService.generateAlerts();
      res.status(200).json(alerts);
    } catch (error) {
      logger.error('Error in generateAlerts:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate alerts'
      });
    }
  }

  /**
   * Generate remediation suggestions
   * 
   * POST /api/admin/refunds/remediation/suggestions
   */
  async generateRemediationSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const { alerts, patterns } = req.body;

      if (!alerts || !patterns) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'alerts and patterns are required'
        });
        return;
      }

      const suggestions = await refundMonitoringService.generateRemediationSuggestions(
        alerts,
        patterns
      );
      
      res.status(200).json(suggestions);
    } catch (error) {
      logger.error('Error in generateRemediationSuggestions:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate remediation suggestions'
      });
    }
  }

  /**
   * Track a refund transaction
   * 
   * POST /api/admin/refunds/track
   */
  async trackRefundTransaction(req: Request, res: Response): Promise<void> {
    try {
      const refundData = req.body;

      // Validate required fields
      const requiredFields = ['returnId', 'refundId', 'originalAmount', 'refundAmount', 'paymentProvider'];
      const missingFields = requiredFields.filter(field => !refundData[field]);

      if (missingFields.length > 0) {
        res.status(400).json({
          error: 'Missing required fields',
          message: `The following fields are required: ${missingFields.join(', ')}`
        });
        return;
      }

      const refundRecord = await refundMonitoringService.trackRefundTransaction(refundData);
      
      res.status(201).json(refundRecord);
    } catch (error) {
      logger.error('Error in trackRefundTransaction:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to track refund transaction'
      });
    }
  }

  /**
   * Update refund transaction status
   * 
   * PATCH /api/admin/refunds/:refundRecordId/status
   */
  async updateRefundStatus(req: Request, res: Response): Promise<void> {
    try {
      const { refundRecordId } = req.params;
      const { status, processedAt, failureReason } = req.body;

      if (!status) {
        res.status(400).json({
          error: 'Missing required parameter',
          message: 'status is required'
        });
        return;
      }

      const validStatuses = ['pending', 'completed', 'failed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          error: 'Invalid status',
          message: `status must be one of: ${validStatuses.join(', ')}`
        });
        return;
      }

      await refundMonitoringService.updateRefundStatus(
        refundRecordId,
        status,
        processedAt ? new Date(processedAt) : undefined,
        failureReason
      );
      
      res.status(200).json({ message: 'Refund status updated successfully' });
    } catch (error) {
      logger.error('Error in updateRefundStatus:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update refund status'
      });
    }
  }

  /**
   * Get refund transaction details
   * 
   * GET /api/admin/refunds/:refundRecordId
   */
  async getRefundDetails(req: Request, res: Response): Promise<void> {
    try {
      const { refundRecordId } = req.params;

      // This would need to be implemented in the service
      // For now, return a placeholder response
      res.status(501).json({
        error: 'Not implemented',
        message: 'This endpoint is not yet implemented'
      });
    } catch (error) {
      logger.error('Error in getRefundDetails:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve refund details'
      });
    }
  }

  /**
   * Get refund audit log
   * 
   * GET /api/admin/refunds/:refundRecordId/audit-log
   */
  async getRefundAuditLog(req: Request, res: Response): Promise<void> {
    try {
      const { refundRecordId } = req.params;

      // This would need to be implemented in the service
      // For now, return a placeholder response
      res.status(501).json({
        error: 'Not implemented',
        message: 'This endpoint is not yet implemented'
      });
    } catch (error) {
      logger.error('Error in getRefundAuditLog:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve refund audit log'
      });
    }
  }

  /**
   * Export refund data
   * 
   * GET /api/admin/refunds/export
   */
  async exportRefundData(req: Request, res: Response): Promise<void> {
    try {
      const { format, startDate, endDate } = req.query;

      if (!format || !startDate || !endDate) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'format, startDate, and endDate are required'
        });
        return;
      }

      const validFormats = ['csv', 'excel', 'json'];
      if (!validFormats.includes(format as string)) {
        res.status(400).json({
          error: 'Invalid format',
          message: `format must be one of: ${validFormats.join(', ')}`
        });
        return;
      }

      // This would need to be implemented in the service
      // For now, return a placeholder response
      res.status(501).json({
        error: 'Not implemented',
        message: 'This endpoint is not yet implemented'
      });
    } catch (error) {
      logger.error('Error in exportRefundData:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to export refund data'
      });
    }
  }

  /**
   * Calculate revenue impact from refunds
   * Property 24: Comprehensive Cost Calculation
   * Property 25: Multi-Dimensional Impact Analysis
   * 
   * GET /api/admin/refunds/revenue-impact
   */
  async calculateRevenueImpact(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'startDate and endDate are required'
        });
        return;
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          error: 'Invalid date format',
          message: 'startDate and endDate must be valid ISO date strings'
        });
        return;
      }

      const revenueImpact = await refundMonitoringService.calculateRevenueImpact(start, end);
      
      res.status(200).json(revenueImpact);
    } catch (error) {
      logger.error('Error in calculateRevenueImpact:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to calculate revenue impact'
      });
    }
  }

  /**
   * Get comprehensive cost analysis
   * Property 24: Comprehensive Cost Calculation
   * Property 25: Multi-Dimensional Impact Analysis
   * 
   * GET /api/admin/refunds/cost-analysis
   */
  async getCostAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'startDate and endDate are required'
        });
        return;
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          error: 'Invalid date format',
          message: 'startDate and endDate must be valid ISO date strings'
        });
        return;
      }

      const costAnalysis = await refundCostAnalysisService.getComprehensiveCostAnalysis(start, end);
      
      res.status(200).json(costAnalysis);
    } catch (error) {
      logger.error('Error in getCostAnalysis:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get cost analysis'
      });
    }
  }

  /**
   * Get cost trend analysis
   * Property 25: Multi-Dimensional Impact Analysis
   * Property 26: Historical Data Forecasting
   * 
   * GET /api/admin/refunds/cost-trends
   */
  async getCostTrends(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'startDate and endDate are required'
        });
        return;
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          error: 'Invalid date format',
          message: 'startDate and endDate must be valid ISO date strings'
        });
        return;
      }

      const costTrends = await refundCostAnalysisService.getCostTrendAnalysis(start, end);
      
      res.status(200).json(costTrends);
    } catch (error) {
      logger.error('Error in getCostTrends:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get cost trends'
      });
    }
  }

  /**
   * Get processing fees breakdown
   * Property 24: Comprehensive Cost Calculation
   * 
   * GET /api/admin/refunds/processing-fees
   */
  async getProcessingFees(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'startDate and endDate are required'
        });
        return;
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          error: 'Invalid date format',
          message: 'startDate and endDate must be valid ISO date strings'
        });
        return;
      }

      const processingFees = await refundCostAnalysisService.calculateProcessingFees(start, end);
      
      res.status(200).json(processingFees);
    } catch (error) {
      logger.error('Error in getProcessingFees:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get processing fees'
      });
    }
  }

  /**
   * Get shipping costs analysis
   * Property 24: Comprehensive Cost Calculation
   * 
   * GET /api/admin/refunds/shipping-costs
   */
  async getShippingCosts(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'startDate and endDate are required'
        });
        return;
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          error: 'Invalid date format',
          message: 'startDate and endDate must be valid ISO date strings'
        });
        return;
      }

      const shippingCosts = await refundCostAnalysisService.calculateShippingCosts(start, end);
      
      res.status(200).json(shippingCosts);
    } catch (error) {
      logger.error('Error in getShippingCosts:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get shipping costs'
      });
    }
  }

  /**
   * Get administrative overhead analysis
   * Property 24: Comprehensive Cost Calculation
   * 
   * GET /api/admin/refunds/administrative-overhead
   */
  async getAdministrativeOverhead(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'startDate and endDate are required'
        });
        return;
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          error: 'Invalid date format',
          message: 'startDate and endDate must be valid ISO date strings'
        });
        return;
      }

      const overhead = await refundCostAnalysisService.calculateAdministrativeOverhead(start, end);
      
      res.status(200).json(overhead);
    } catch (error) {
      logger.error('Error in getAdministrativeOverhead:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get administrative overhead'
      });
    }
  }

  /**
   * Get profitability metrics
   * Task 2.3: Add profitability metrics
   * 
   * Calculates comprehensive profitability metrics including:
   * - Refund-to-revenue ratio
   * - Cost per return
   * - Net impact calculations
   * 
   * GET /api/admin/refunds/profitability-metrics
   */
  async getProfitabilityMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, totalRevenue } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          error: 'Missing required parameters',
          message: 'startDate and endDate are required'
        });
        return;
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          error: 'Invalid date format',
          message: 'startDate and endDate must be valid ISO date strings'
        });
        return;
      }

      // Parse optional totalRevenue parameter
      let revenue: number | undefined;
      if (totalRevenue) {
        revenue = parseFloat(totalRevenue as string);
        if (isNaN(revenue) || revenue < 0) {
          res.status(400).json({
            error: 'Invalid parameter',
            message: 'totalRevenue must be a non-negative number'
          });
          return;
        }
      }

      const profitabilityMetrics = await refundCostAnalysisService.calculateProfitabilityMetrics(
        start,
        end,
        revenue
      );
      
      res.status(200).json(profitabilityMetrics);
    } catch (error) {
      logger.error('Error in getProfitabilityMetrics:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get profitability metrics'
      });
    }
  }
}

// Export singleton instance
export const refundMonitoringController = new RefundMonitoringController();
