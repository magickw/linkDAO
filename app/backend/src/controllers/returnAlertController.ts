import { Request, Response } from 'express';
import { returnAlertManagerService } from '../services/marketplace/returnAlertManagerService';
import { safeLogger } from '../utils/safeLogger';

/**
 * Return Alert Controller
 * Handles HTTP requests for return alert management and monitoring
 */
export class ReturnAlertController {
  /**
   * Get all active alerts
   * GET /api/admin/returns/alerts/active
   */
  async getActiveAlerts(req: Request, res: Response): Promise<void> {
    try {
      const alerts = returnAlertManagerService.getActiveAlerts();
      res.status(200).json({
        success: true,
        data: alerts
      });
    } catch (error) {
      safeLogger.error('Error getting active alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve active alerts'
      });
    }
  }

  /**
   * Get alert by ID
   * GET /api/admin/returns/alerts/:alertId
   */
  async getAlertById(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      
      if (!alertId) {
        res.status(400).json({
          success: false,
          error: 'alertId is required'
        });
        return;
      }
      
      const alert = returnAlertManagerService.getAlert(alertId);
      if (!alert) {
        res.status(404).json({
          success: false,
          error: 'Alert not found'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: alert
      });
    } catch (error) {
      safeLogger.error('Error getting alert by ID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve alert'
      });
    }
  }

  /**
   * Get alert history
   * GET /api/admin/returns/alerts/history
   */
  async getAlertHistory(req: Request, res: Response): Promise<void> {
    try {
      const { limit } = req.query;
      const limitNum = limit ? parseInt(limit as string) : 100;
      
      const alerts = await returnAlertManagerService.getAlertHistory(limitNum);
      res.status(200).json({
        success: true,
        data: alerts
      });
    } catch (error) {
      safeLogger.error('Error getting alert history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve alert history'
      });
    }
  }

  /**
   * Get alert statistics
   * GET /api/admin/returns/alerts/stats
   */
  async getAlertStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await returnAlertManagerService.getAlertStats();
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      safeLogger.error('Error getting alert stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve alert statistics'
      });
    }
  }

  /**
   * Get all alert configurations
   * GET /api/admin/returns/alerts/configs
   */
  async getAlertConfigs(req: Request, res: Response): Promise<void> {
    try {
      const configs = returnAlertManagerService.getAlertConfigs();
      res.status(200).json({
        success: true,
        data: configs
      });
    } catch (error) {
      safeLogger.error('Error getting alert configs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve alert configurations'
      });
    }
  }

  /**
   * Get alert configuration by ID
   * GET /api/admin/returns/alerts/configs/:configId
   */
  async getAlertConfigById(req: Request, res: Response): Promise<void> {
    try {
      const { configId } = req.params;
      
      if (!configId) {
        res.status(400).json({
          success: false,
          error: 'configId is required'
        });
        return;
      }
      
      const config = returnAlertManagerService.getAlertConfig(configId);
      if (!config) {
        res.status(404).json({
          success: false,
          error: 'Alert configuration not found'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        data: config
      });
    } catch (error) {
      safeLogger.error('Error getting alert config by ID:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve alert configuration'
      });
    }
  }

  /**
   * Create or update alert configuration
   * POST /api/admin/returns/alerts/configs
   */
  async createOrUpdateAlertConfig(req: Request, res: Response): Promise<void> {
    try {
      const configData = req.body;
      
      if (!configData.name || !configData.alertType || !configData.severity) {
        res.status(400).json({
          success: false,
          error: 'name, alertType, and severity are required'
        });
        return;
      }
      
      const config = returnAlertManagerService.setAlertConfig(configData);
      res.status(200).json({
        success: true,
        data: config
      });
    } catch (error) {
      safeLogger.error('Error creating/updating alert config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create/update alert configuration'
      });
    }
  }

  /**
   * Delete alert configuration
   * DELETE /api/admin/returns/alerts/configs/:configId
   */
  async deleteAlertConfig(req: Request, res: Response): Promise<void> {
    try {
      const { configId } = req.params;
      
      if (!configId) {
        res.status(400).json({
          success: false,
          error: 'configId is required'
        });
        return;
      }
      
      const deleted = returnAlertManagerService.deleteAlertConfig(configId);
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Alert configuration not found'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: 'Alert configuration deleted successfully'
      });
    } catch (error) {
      safeLogger.error('Error deleting alert config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete alert configuration'
      });
    }
  }

  /**
   * Toggle alert configuration (enable/disable)
   * POST /api/admin/returns/alerts/configs/:configId/toggle
   */
  async toggleAlertConfig(req: Request, res: Response): Promise<void> {
    try {
      const { configId } = req.params;
      const { enabled } = req.body;
      
      if (!configId) {
        res.status(400).json({
          success: false,
          error: 'configId is required'
        });
        return;
      }
      
      if (typeof enabled !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'enabled must be a boolean value'
        });
        return;
      }
      
      const toggled = returnAlertManagerService.toggleAlertConfig(configId, enabled);
      if (!toggled) {
        res.status(404).json({
          success: false,
          error: 'Alert configuration not found'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: `Alert configuration ${enabled ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error) {
      safeLogger.error('Error toggling alert config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle alert configuration'
      });
    }
  }

  /**
   * Acknowledge an alert
   * POST /api/admin/returns/alerts/:alertId/acknowledge
   */
  async acknowledgeAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      const { acknowledgedBy } = req.body;
      
      if (!alertId) {
        res.status(400).json({
          success: false,
          error: 'alertId is required'
        });
        return;
      }
      
      if (!acknowledgedBy) {
        res.status(400).json({
          success: false,
          error: 'acknowledgedBy is required'
        });
        return;
      }
      
      const acknowledged = await returnAlertManagerService.acknowledgeAlert(alertId, acknowledgedBy);
      if (!acknowledged) {
        res.status(404).json({
          success: false,
          error: 'Alert not found'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: 'Alert acknowledged successfully'
      });
    } catch (error) {
      safeLogger.error('Error acknowledging alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge alert'
      });
    }
  }

  /**
   * Resolve an alert
   * POST /api/admin/returns/alerts/:alertId/resolve
   */
  async resolveAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      const { resolvedBy, resolutionNotes } = req.body;
      
      if (!alertId) {
        res.status(400).json({
          success: false,
          error: 'alertId is required'
        });
        return;
      }
      
      if (!resolvedBy) {
        res.status(400).json({
          success: false,
          error: 'resolvedBy is required'
        });
        return;
      }
      
      const resolved = await returnAlertManagerService.resolveAlert(alertId, resolvedBy, resolutionNotes);
      if (!resolved) {
        res.status(404).json({
          success: false,
          error: 'Alert not found'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: 'Alert resolved successfully'
      });
    } catch (error) {
      safeLogger.error('Error resolving alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resolve alert'
      });
    }
  }

  /**
   * Dismiss an alert
   * POST /api/admin/returns/alerts/:alertId/dismiss
   */
  async dismissAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      const { dismissedBy } = req.body;
      
      if (!alertId) {
        res.status(400).json({
          success: false,
          error: 'alertId is required'
        });
        return;
      }
      
      if (!dismissedBy) {
        res.status(400).json({
          success: false,
          error: 'dismissedBy is required'
        });
        return;
      }
      
      const dismissed = await returnAlertManagerService.dismissAlert(alertId, dismissedBy);
      if (!dismissed) {
        res.status(404).json({
          success: false,
          error: 'Alert not found'
        });
        return;
      }
      
      res.status(200).json({
        success: true,
        message: 'Alert dismissed successfully'
      });
    } catch (error) {
      safeLogger.error('Error dismissing alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to dismiss alert'
      });
    }
  }

  /**
   * Trigger alert checking manually
   * POST /api/admin/returns/alerts/check
   */
  async triggerAlertCheck(req: Request, res: Response): Promise<void> {
    try {
      await returnAlertManagerService.checkAllAlerts();
      res.status(200).json({
        success: true,
        message: 'Alert checking completed successfully'
      });
    } catch (error) {
      safeLogger.error('Error triggering alert check:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to trigger alert checking'
      });
    }
  }
}

export const returnAlertController = new ReturnAlertController();