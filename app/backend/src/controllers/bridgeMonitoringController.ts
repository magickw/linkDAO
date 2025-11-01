import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { BridgeMonitoringService } from '../services/bridgeMonitoringService';
import { logger } from '../utils/logger';
import { stringifyWithBigInt } from '../utils/bigIntSerializer';

export class BridgeMonitoringController {
  constructor(private bridgeMonitoringService: BridgeMonitoringService) {}

  /**
   * Get bridge transaction by nonce
   */
  public getBridgeTransaction = async (req: Request, res: Response): Promise<void> => {
    try {
      const { nonce } = req.params;
      
      if (!nonce || isNaN(Number(nonce))) {
        res.status(400).json({
          success: false,
          error: 'Invalid nonce parameter'
        });
        return;
      }

      const transaction = await this.bridgeMonitoringService.getBridgeTransaction(Number(nonce));
      
      if (!transaction) {
        res.status(404).json({
          success: false,
          error: 'Bridge transaction not found'
        });
        return;
      }

      res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      logger.error('Error getting bridge transaction:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Get bridge transactions with pagination and filtering
   */
  public getBridgeTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const status = req.query.status as string;

      const result = await this.bridgeMonitoringService.getBridgeTransactions(page, limit, status);

      res.json({
        success: true,
        data: {
          transactions: result.transactions,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error getting bridge transactions:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Get bridge events for a transaction
   */
  public getBridgeEvents = async (req: Request, res: Response): Promise<void> => {
    try {
      const { transactionId } = req.params;
      
      if (!transactionId) {
        res.status(400).json({
          success: false,
          error: 'Transaction ID is required'
        });
        return;
      }

      const events = await this.bridgeMonitoringService.getBridgeEvents(transactionId);

      res.json({
        success: true,
        data: events
      });
    } catch (error) {
      logger.error('Error getting bridge events:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Get latest bridge metrics
   */
  public getBridgeMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const metrics = await this.bridgeMonitoringService.getLatestMetrics();

      if (!metrics) {
        res.status(404).json({
          success: false,
          error: 'No metrics available'
        });
        return;
      }

      res.setHeader('Content-Type', 'application/json');
      res.send(stringifyWithBigInt({
        success: true,
        data: metrics
      }));
    } catch (error) {
      logger.error('Error getting bridge metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Get bridge health status
   */
  public getBridgeHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const health = await this.bridgeMonitoringService.checkBridgeHealth();

      const statusCode = health.isHealthy ? 200 : 503;

      res.status(statusCode).json({
        success: health.isHealthy,
        data: health
      });
    } catch (error) {
      logger.error('Error checking bridge health:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Start bridge monitoring
   */
  public startMonitoring = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.bridgeMonitoringService.startMonitoring();

      res.json({
        success: true,
        message: 'Bridge monitoring started successfully'
      });
    } catch (error) {
      logger.error('Error starting bridge monitoring:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start bridge monitoring'
      });
    }
  };

  /**
   * Stop bridge monitoring
   */
  public stopMonitoring = async (req: Request, res: Response): Promise<void> => {
    try {
      this.bridgeMonitoringService.stopMonitoring();

      res.json({
        success: true,
        message: 'Bridge monitoring stopped successfully'
      });
    } catch (error) {
      logger.error('Error stopping bridge monitoring:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to stop bridge monitoring'
      });
    }
  };

  /**
   * Get bridge statistics
   */
  public getBridgeStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const timeframe = req.query.timeframe as string || '24h';
      
      // Calculate timeframe in milliseconds
      let timeframeMs: number;
      switch (timeframe) {
        case '1h':
          timeframeMs = 60 * 60 * 1000;
          break;
        case '24h':
          timeframeMs = 24 * 60 * 60 * 1000;
          break;
        case '7d':
          timeframeMs = 7 * 24 * 60 * 60 * 1000;
          break;
        case '30d':
          timeframeMs = 30 * 24 * 60 * 60 * 1000;
          break;
        default:
          timeframeMs = 24 * 60 * 60 * 1000;
      }

      // This would typically query the database for statistics
      // For now, we'll return the latest metrics
      const metrics = await this.bridgeMonitoringService.getLatestMetrics();

      res.setHeader('Content-Type', 'application/json');
      res.send(stringifyWithBigInt({
        success: true,
        data: {
          timeframe,
          metrics: metrics || {
            totalTransactions: 0,
            totalVolume: '0',
            totalFees: '0',
            successRate: 0,
            averageCompletionTime: 0,
            activeValidators: 0,
            chainMetrics: {}
          }
        }
      }));
    } catch (error) {
      logger.error('Error getting bridge statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Get validator performance
   */
  public getValidatorPerformance = async (req: Request, res: Response): Promise<void> => {
    try {
      const { validatorAddress } = req.params;
      
      if (!validatorAddress) {
        res.status(400).json({
          success: false,
          error: 'Validator address is required'
        });
        return;
      }

      // This would query validator performance from database
      // For now, return placeholder data
      const performance = {
        validatorAddress,
        totalValidations: 0,
        successfulValidations: 0,
        failedValidations: 0,
        reputationScore: 100,
        stakeAmount: '0',
        lastActivity: null,
        isActive: true
      };

      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      logger.error('Error getting validator performance:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Get bridge alerts
   */
  public getBridgeAlerts = async (req: Request, res: Response): Promise<void> => {
    try {
      const severity = req.query.severity as string;
      const resolved = req.query.resolved === 'true';
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      // This would query alerts from database
      // For now, return empty array
      const alerts: any[] = [];

      res.json({
        success: true,
        data: {
          alerts,
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
        }
      });
    } catch (error) {
      logger.error('Error getting bridge alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Create bridge alert
   */
  public createBridgeAlert = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        alertType,
        severity,
        title,
        message,
        chainId,
        transactionId,
        validatorAddress,
        metadata
      } = req.body;

      if (!alertType || !severity || !title || !message) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: alertType, severity, title, message'
        });
        return;
      }

      // This would create an alert in the database
      const alertId = `alert-${Date.now()}`;

      res.status(201).json({
        success: true,
        data: {
          id: alertId,
          alertType,
          severity,
          title,
          message,
          chainId,
          transactionId,
          validatorAddress,
          metadata,
          isResolved: false,
          createdAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Error creating bridge alert:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Resolve bridge alert
   */
  public resolveBridgeAlert = async (req: Request, res: Response): Promise<void> => {
    try {
      const { alertId } = req.params;
      const { resolvedBy } = req.body;

      if (!alertId) {
        res.status(400).json({
          success: false,
          error: 'Alert ID is required'
        });
        return;
      }

      // This would update the alert in the database
      res.json({
        success: true,
        message: 'Alert resolved successfully',
        data: {
          id: alertId,
          isResolved: true,
          resolvedAt: new Date(),
          resolvedBy
        }
      });
    } catch (error) {
      logger.error('Error resolving bridge alert:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Get chain status
   */
  public getChainStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { chainId } = req.params;

      if (chainId && isNaN(Number(chainId))) {
        res.status(400).json({
          success: false,
          error: 'Invalid chain ID'
        });
        return;
      }

      // This would query chain status from database
      // For now, return placeholder data
      const chainStatus = {
        chainId: Number(chainId),
        chainName: 'Unknown',
        isActive: true,
        lastBlockProcessed: 0,
        lastHealthCheck: new Date(),
        isHealthy: true,
        totalLocked: '0',
        totalBridged: '0'
      };

      res.json({
        success: true,
        data: chainStatus
      });
    } catch (error) {
      logger.error('Error getting chain status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}
