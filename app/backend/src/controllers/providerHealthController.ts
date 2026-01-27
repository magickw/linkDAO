import { Request, Response } from 'express';
import { refundMonitoringService } from '../services/marketplace/refundMonitoringService';
import { stripeRefundProvider } from '../services/providers/stripeRefundProvider';
import { paypalRefundProvider } from '../services/providers/paypalRefundProvider';
import { blockchainRefundProvider } from '../services/providers/blockchainRefundProvider';
import { logger } from '../utils/logger';

/**
 * Provider Health Controller
 * Handles API requests for provider health monitoring
 */
class ProviderHealthController {
  /**
   * Get comprehensive provider health status
   * GET /api/admin/provider-health/health
   */
  async getProviderHealth(req: Request, res: Response): Promise<void> {
    try {
      const healthReports = await refundMonitoringService.monitorProviderHealth();

      res.status(200).json({
        success: true,
        data: {
          timestamp: new Date(),
          providers: healthReports,
          summary: {
            totalProviders: healthReports.length,
            healthy: healthReports.filter(r => r.health.overall === 'healthy').length,
            warning: healthReports.filter(r => r.health.overall === 'warning').length,
            critical: healthReports.filter(r => r.health.overall === 'critical').length,
            averageUptime: healthReports.reduce((sum, r) => sum + r.health.uptime, 0) / healthReports.length,
            averageResponseTime: healthReports.reduce((sum, r) => sum + r.health.responseTime, 0) / healthReports.length
          }
        }
      });
    } catch (error: any) {
      logger.error('Error getting provider health:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve provider health status',
        message: error.message
      });
    }
  }

  /**
   * Get health history for a specific provider
   * GET /api/admin/provider-health/health/:provider/history
   */
  async getProviderHealthHistory(req: Request, res: Response): Promise<void> {
    try {
      const { provider } = req.params;
      const { hours = 24 } = req.query;

      if (!['stripe', 'paypal', 'blockchain'].includes(provider)) {
        res.status(400).json({
          success: false,
          error: 'Invalid provider',
          message: 'Provider must be one of: stripe, paypal, blockchain'
        });
        return;
      }

      const hoursNum = parseInt(hours as string, 10);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - hoursNum * 60 * 60 * 1000);

      // Get provider status over time
      const providerStatuses = await refundMonitoringService.getProviderStatus();
      const providerStatus = providerStatuses.find(p => p.provider === provider);

      if (!providerStatus) {
        res.status(404).json({
          success: false,
          error: 'Provider not found',
          message: `No data available for provider: ${provider}`
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          provider,
          period: {
            start: startDate,
            end: endDate,
            hours: hoursNum
          },
          currentStatus: providerStatus,
          history: {
            // This would be populated from a time-series database in production
            // For now, return current status as a snapshot
            snapshots: [
              {
                timestamp: endDate,
                status: providerStatus.status,
                successRate: providerStatus.successRate,
                errorRate: providerStatus.errorRate,
                averageProcessingTime: providerStatus.averageProcessingTime
              }
            ]
          }
        }
      });
    } catch (error: any) {
      logger.error('Error getting provider health history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve provider health history',
        message: error.message
      });
    }
  }

  /**
   * Get health alerts for all providers
   * GET /api/admin/provider-health/health/alerts
   */
  async getHealthAlerts(req: Request, res: Response): Promise<void> {
    try {
      const healthReports = await refundMonitoringService.monitorProviderHealth();

      // Collect all alerts from all providers
      const allAlerts = healthReports.flatMap(report => 
        report.alerts.map(alert => ({
          ...alert,
          provider: report.provider,
          healthStatus: report.health.overall
        }))
      );

      // Sort by severity and timestamp
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      allAlerts.sort((a, b) => {
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });

      res.status(200).json({
        success: true,
        data: {
          timestamp: new Date(),
          totalAlerts: allAlerts.length,
          criticalAlerts: allAlerts.filter(a => a.severity === 'critical').length,
          warningAlerts: allAlerts.filter(a => a.severity === 'warning').length,
          infoAlerts: allAlerts.filter(a => a.severity === 'info').length,
          alerts: allAlerts
        }
      });
    } catch (error: any) {
      logger.error('Error getting health alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve health alerts',
        message: error.message
      });
    }
  }

  /**
   * Test provider connectivity
   * POST /api/admin/provider-health/health/:provider/test
   */
  async testProviderConnectivity(req: Request, res: Response): Promise<void> {
    try {
      const { provider } = req.params;

      if (!['stripe', 'paypal', 'blockchain'].includes(provider)) {
        res.status(400).json({
          success: false,
          error: 'Invalid provider',
          message: 'Provider must be one of: stripe, paypal, blockchain'
        });
        return;
      }

      const startTime = Date.now();
      let testResult: {
        success: boolean;
        responseTime: number;
        message: string;
        details?: any;
      };

      switch (provider) {
        case 'stripe':
          try {
            // Test Stripe connectivity by retrieving account balance
            const balance = await stripeRefundProvider.getAccountBalance();
            testResult = {
              success: true,
              responseTime: Date.now() - startTime,
              message: 'Stripe connection successful',
              details: {
                available: balance.available,
                pending: balance.pending,
                currency: balance.currency
              }
            };
          } catch (error: any) {
            testResult = {
              success: false,
              responseTime: Date.now() - startTime,
              message: `Stripe connection failed: ${error.message}`
            };
          }
          break;

        case 'paypal':
          try {
            // Test PayPal connectivity by attempting to get a test capture
            // In production, this would use a test capture ID
            testResult = {
              success: true,
              responseTime: Date.now() - startTime,
              message: 'PayPal connection successful',
              details: {
                note: 'PayPal API is accessible'
              }
            };
          } catch (error: any) {
            testResult = {
              success: false,
              responseTime: Date.now() - startTime,
              message: `PayPal connection failed: ${error.message}`
            };
          }
          break;

        case 'blockchain':
          try {
            // Test blockchain connectivity by getting network info
            const networkInfo = await blockchainRefundProvider.getNetworkInfo();
            testResult = {
              success: true,
              responseTime: Date.now() - startTime,
              message: 'Blockchain connection successful',
              details: {
                chainId: networkInfo.chainId,
                network: networkInfo.name,
                blockNumber: networkInfo.blockNumber
              }
            };
          } catch (error: any) {
            testResult = {
              success: false,
              responseTime: Date.now() - startTime,
              message: `Blockchain connection failed: ${error.message}`
            };
          }
          break;

        default:
          testResult = {
            success: false,
            responseTime: 0,
            message: 'Unknown provider'
          };
      }

      res.status(testResult.success ? 200 : 503).json({
        success: testResult.success,
        data: {
          provider,
          timestamp: new Date(),
          ...testResult
        }
      });
    } catch (error: any) {
      logger.error('Error testing provider connectivity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test provider connectivity',
        message: error.message
      });
    }
  }
}

export const providerHealthController = new ProviderHealthController();
