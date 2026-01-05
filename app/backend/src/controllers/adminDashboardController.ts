/// <reference path="../types/express.d.ts" />
import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { adminDashboardService } from '../services/adminDashboardService';
import { FinancialMonitoringService } from '../services/financialMonitoringService';
import { auditService } from '../services/auditService';
import { orderSearchService } from '../services/orderSearchService';
import { getAdminWebSocketService } from '../services/adminWebSocketService';

const financialMonitoringService = new FinancialMonitoringService();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

class AdminDashboardController {
  // Dashboard configuration methods
  async getDashboardConfig(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      const config = await adminDashboardService.getDashboardConfig(adminId);

      res.json({
        success: true,
        data: config,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId
        }
      });
    } catch (error) {
      safeLogger.error('Error getting dashboard config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateDashboardConfig(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      const { config } = req.body;
      if (!config) {
        return res.status(400).json({
          success: false,
          error: 'Dashboard configuration is required'
        });
      }

      const updatedConfig = await adminDashboardService.updateDashboardConfig(adminId, config);

      // Notify other admin sessions via WebSocket
      const webSocketService = getAdminWebSocketService();
      if (webSocketService) {
        webSocketService.sendToAdmin(adminId, 'dashboard_config_updated', {
          config: updatedConfig,
          updatedBy: adminId
        });
      }

      res.json({
        success: true,
        data: updatedConfig,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          action: 'config_updated'
        }
      });
    } catch (error) {
      safeLogger.error('Error updating dashboard config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update dashboard configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async resetDashboardConfig(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      const defaultConfig = await adminDashboardService.resetDashboardConfig(adminId);

      // Notify via WebSocket
      const webSocketService = getAdminWebSocketService();
      if (webSocketService) {
        webSocketService.sendToAdmin(adminId, 'dashboard_config_reset', {
          config: defaultConfig,
          resetBy: adminId
        });
      }

      res.json({
        success: true,
        data: defaultConfig,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          action: 'config_reset'
        }
      });
    } catch (error) {
      safeLogger.error('Error resetting dashboard config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset dashboard configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async exportDashboardConfig(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      const exportData = await adminDashboardService.exportDashboardConfig(adminId);

      res.json({
        success: true,
        data: exportData,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          action: 'config_exported'
        }
      });
    } catch (error) {
      safeLogger.error('Error exporting dashboard config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export dashboard configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async importDashboardConfig(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      const { configData } = req.body;
      if (!configData) {
        return res.status(400).json({
          success: false,
          error: 'Configuration data is required'
        });
      }

      const importedConfig = await adminDashboardService.importDashboardConfig(adminId, configData);

      // Notify via WebSocket
      const webSocketService = getAdminWebSocketService();
      if (webSocketService) {
        webSocketService.sendToAdmin(adminId, 'dashboard_config_imported', {
          config: importedConfig,
          importedBy: adminId
        });
      }

      res.json({
        success: true,
        data: importedConfig,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          action: 'config_imported'
        }
      });
    } catch (error) {
      safeLogger.error('Error importing dashboard config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to import dashboard configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // User preferences methods
  async getUserPreferences(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      const preferences = await adminDashboardService.getUserPreferences(adminId);

      res.json({
        success: true,
        data: preferences,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId
        }
      });
    } catch (error) {
      safeLogger.error('Error getting user preferences:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user preferences',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateUserPreferences(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      const { preferences } = req.body;
      if (!preferences) {
        return res.status(400).json({
          success: false,
          error: 'Preferences data is required'
        });
      }

      const updatedPreferences = await adminDashboardService.updateUserPreferences(adminId, preferences);

      res.json({
        success: true,
        data: updatedPreferences,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          action: 'preferences_updated'
        }
      });
    } catch (error) {
      safeLogger.error('Error updating user preferences:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user preferences',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Layout configuration methods
  async getLayoutConfig(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      const layout = await adminDashboardService.getLayoutConfig(adminId);

      res.json({
        success: true,
        data: layout,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId
        }
      });
    } catch (error) {
      safeLogger.error('Error getting layout config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get layout configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateLayoutConfig(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      const { layout } = req.body;
      if (!layout) {
        return res.status(400).json({
          success: false,
          error: 'Layout configuration is required'
        });
      }

      const updatedLayout = await adminDashboardService.updateLayoutConfig(adminId, layout);

      // Notify via WebSocket
      const webSocketService = getAdminWebSocketService();
      if (webSocketService) {
        webSocketService.sendToAdmin(adminId, 'layout_updated', {
          layout: updatedLayout,
          updatedBy: adminId
        });
      }

      res.json({
        success: true,
        data: updatedLayout,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          action: 'layout_updated'
        }
      });
    } catch (error) {
      safeLogger.error('Error updating layout config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update layout configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async addWidget(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      const { widget } = req.body;
      if (!widget) {
        return res.status(400).json({
          success: false,
          error: 'Widget configuration is required'
        });
      }

      const addedWidget = await adminDashboardService.addWidget(adminId, widget);

      // Notify via WebSocket
      const webSocketService = getAdminWebSocketService();
      if (webSocketService) {
        webSocketService.sendToAdmin(adminId, 'widget_added', {
          widget: addedWidget,
          addedBy: adminId
        });
      }

      res.json({
        success: true,
        data: addedWidget,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          action: 'widget_added'
        }
      });
    } catch (error) {
      safeLogger.error('Error adding widget:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add widget',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateWidget(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      const { widgetId } = req.params;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      if (!widgetId) {
        return res.status(400).json({
          success: false,
          error: 'Widget ID is required'
        });
      }

      const { updates } = req.body;
      if (!updates) {
        return res.status(400).json({
          success: false,
          error: 'Widget updates are required'
        });
      }

      const updatedWidget = await adminDashboardService.updateWidget(adminId, widgetId, updates);

      // Notify via WebSocket
      const webSocketService = getAdminWebSocketService();
      if (webSocketService) {
        webSocketService.sendToAdmin(adminId, 'widget_updated', {
          widget: updatedWidget,
          updatedBy: adminId
        });
      }

      res.json({
        success: true,
        data: updatedWidget,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          action: 'widget_updated',
          widgetId
        }
      });
    } catch (error) {
      safeLogger.error('Error updating widget:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update widget',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async removeWidget(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      const { widgetId } = req.params;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      if (!widgetId) {
        return res.status(400).json({
          success: false,
          error: 'Widget ID is required'
        });
      }

      await adminDashboardService.removeWidget(adminId, widgetId);

      // Notify via WebSocket
      const webSocketService = getAdminWebSocketService();
      if (webSocketService) {
        webSocketService.sendToAdmin(adminId, 'widget_removed', {
          widgetId,
          removedBy: adminId
        });
      }

      res.json({
        success: true,
        data: { widgetId },
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          action: 'widget_removed',
          widgetId
        }
      });
    } catch (error) {
      safeLogger.error('Error removing widget:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove widget',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Dashboard data methods
  async getDashboardMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      const { timeRange, categories } = req.query;

      const metrics = await adminDashboardService.getDashboardMetrics(adminId, {
        timeRange: timeRange as string,
        categories: categories ? (categories as string).split(',') : undefined
      });

      res.json({
        success: true,
        data: metrics,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          timeRange,
          categories
        }
      });
    } catch (error) {
      safeLogger.error('Error getting dashboard metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getAlerts(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      const { severity, acknowledged, limit } = req.query;

      const alerts = await adminDashboardService.getAlerts(adminId, {
        severity: severity as string,
        acknowledged: acknowledged === 'true',
        limit: limit ? parseInt(limit as string) : undefined
      });

      res.json({
        success: true,
        data: alerts,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          filters: { severity, acknowledged, limit }
        }
      });
    } catch (error) {
      safeLogger.error('Error getting alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get alerts',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async acknowledgeAlert(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      const { alertId } = req.params;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      if (!alertId) {
        return res.status(400).json({
          success: false,
          error: 'Alert ID is required'
        });
      }

      await adminDashboardService.acknowledgeAlert(adminId, alertId);

      // Notify other admins via WebSocket
      const webSocketService = getAdminWebSocketService();
      if (webSocketService) {
        webSocketService.broadcastToAllAdmins('alert_acknowledged', {
          alertId,
          acknowledgedBy: adminId,
          acknowledgedAt: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        data: { alertId, acknowledgedBy: adminId },
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          action: 'alert_acknowledged',
          alertId
        }
      });
    } catch (error) {
      safeLogger.error('Error acknowledging alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge alert',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async dismissAlert(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      const { alertId } = req.params;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      if (!alertId) {
        return res.status(400).json({
          success: false,
          error: 'Alert ID is required'
        });
      }

      await adminDashboardService.dismissAlert(adminId, alertId);

      // Notify other admins via WebSocket
      const webSocketService = getAdminWebSocketService();
      if (webSocketService) {
        webSocketService.broadcastToAllAdmins('alert_dismissed', {
          alertId,
          dismissedBy: adminId,
          dismissedAt: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        data: { alertId, dismissedBy: adminId },
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          action: 'alert_dismissed',
          alertId
        }
      });
    } catch (error) {
      safeLogger.error('Error dismissing alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to dismiss alert',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Analytics methods
  async getDashboardUsageAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      const { timeRange } = req.query;

      const analytics = await adminDashboardService.getDashboardUsageAnalytics(adminId, {
        timeRange: timeRange as string
      });

      res.json({
        success: true,
        data: analytics,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          timeRange
        }
      });
    } catch (error) {
      safeLogger.error('Error getting dashboard usage analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard usage analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getDashboardPerformanceMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      const { timeRange } = req.query;

      const metrics = await adminDashboardService.getDashboardPerformanceMetrics(adminId, {
        timeRange: timeRange as string
      });

      res.json({
        success: true,
        data: metrics,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          timeRange
        }
      });
    } catch (error) {
      safeLogger.error('Error getting dashboard performance metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard performance metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Financial Monitoring Methods
  async getFinancialMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      const metrics = await financialMonitoringService.getFinancialMetrics();

      res.json({
        success: true,
        data: metrics,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId
        }
      });
    } catch (error) {
      safeLogger.error('Error getting financial metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get financial metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getRecentTransactions(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      // Validate and sanitize limit parameter
      const rawLimit = req.query.limit;
      let limit = 50; // default

      if (rawLimit) {
        const parsedLimit = parseInt(rawLimit as string, 10);
        if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 200) {
          return res.status(400).json({
            success: false,
            error: 'Invalid limit parameter. Must be between 1 and 200.'
          });
        }
        limit = parsedLimit;
      }

      const transactions = await financialMonitoringService.getRecentTransactions(limit);

      res.json({
        success: true,
        data: transactions,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          limit,
          count: transactions.length
        }
      });
    } catch (error) {
      safeLogger.error('Error getting recent transactions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get recent transactions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async reconcileOrders(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      const { startDate, endDate } = req.body;

      // Validate dates if provided
      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;

      if (startDate) {
        parsedStartDate = new Date(startDate);
        if (isNaN(parsedStartDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid startDate format'
          });
        }
      }

      if (endDate) {
        parsedEndDate = new Date(endDate);
        if (isNaN(parsedEndDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid endDate format'
          });
        }
      }

      // Validate date ordering
      if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
        return res.status(400).json({
          success: false,
          error: 'startDate must be before endDate'
        });
      }

      const reconciliationStats = await financialMonitoringService.reconcileOrders(
        parsedStartDate,
        parsedEndDate
      );

      res.json({
        success: true,
        data: reconciliationStats,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          period: {
            startDate: parsedStartDate?.toISOString(),
            endDate: parsedEndDate?.toISOString()
          }
        }
      });
    } catch (error) {
      safeLogger.error('Error reconciling orders:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reconcile orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async generateFinancialReport(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      const { startDate, endDate } = req.body;

      // Validate required dates
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Both startDate and endDate are required'
        });
      }

      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);

      if (isNaN(parsedStartDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid startDate format'
        });
      }

      if (isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid endDate format'
        });
      }

      // Validate date ordering
      if (parsedStartDate > parsedEndDate) {
        return res.status(400).json({
          success: false,
          error: 'startDate must be before endDate'
        });
      }

      const report = await financialMonitoringService.generateFinancialReport(
        parsedStartDate,
        parsedEndDate
      );

      res.json({
        success: true,
        data: report,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          period: {
            startDate: parsedStartDate.toISOString(),
            endDate: parsedEndDate.toISOString()
          }
        }
      });
    } catch (error) {
      safeLogger.error('Error generating financial report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate financial report',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Audit Log Methods
  async getAuditLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      // Parse query parameters
      const {
        userId,
        action,
        resourceType,
        resourceId,
        startDate,
        endDate,
        limit,
        offset
      } = req.query;

      // Validate and parse limit
      let parsedLimit = 100; // default
      if (limit) {
        const limitNum = parseInt(limit as string, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 500) {
          return res.status(400).json({
            success: false,
            error: 'Invalid limit parameter. Must be between 1 and 500.'
          });
        }
        parsedLimit = limitNum;
      }

      // Validate and parse offset
      let parsedOffset = 0;
      if (offset) {
        const offsetNum = parseInt(offset as string, 10);
        if (isNaN(offsetNum) || offsetNum < 0) {
          return res.status(400).json({
            success: false,
            error: 'Invalid offset parameter. Must be >= 0.'
          });
        }
        parsedOffset = offsetNum;
      }

      // Parse dates if provided
      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;

      if (startDate) {
        parsedStartDate = new Date(startDate as string);
        if (isNaN(parsedStartDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid startDate format'
          });
        }
      }

      if (endDate) {
        parsedEndDate = new Date(endDate as string);
        if (isNaN(parsedEndDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid endDate format'
          });
        }
      }

      const logs = await auditService.getLogs({
        userId: userId as string | undefined,
        action: action as string | undefined,
        resourceType: resourceType as string | undefined,
        resourceId: resourceId as string | undefined,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        limit: parsedLimit,
        offset: parsedOffset
      });

      res.json({
        success: true,
        data: logs,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          count: logs.length,
          limit: parsedLimit,
          offset: parsedOffset
        }
      });
    } catch (error) {
      safeLogger.error('Error getting audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get audit logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getAuditStatistics(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      const { startDate, endDate } = req.query;

      // Parse dates if provided
      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;

      if (startDate) {
        parsedStartDate = new Date(startDate as string);
        if (isNaN(parsedStartDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid startDate format'
          });
        }
      }

      if (endDate) {
        parsedEndDate = new Date(endDate as string);
        if (isNaN(parsedEndDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid endDate format'
          });
        }
      }

      const statistics = await auditService.getStatistics(parsedStartDate, parsedEndDate);

      res.json({
        success: true,
        data: statistics,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          period: {
            startDate: parsedStartDate?.toISOString(),
            endDate: parsedEndDate?.toISOString()
          }
        }
      });
    } catch (error) {
      safeLogger.error('Error getting audit statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get audit statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getResourceAuditLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      const { resourceType, resourceId } = req.params;
      const { limit } = req.query;

      if (!resourceType || !resourceId) {
        return res.status(400).json({
          success: false,
          error: 'resourceType and resourceId are required'
        });
      }

      // Validate and parse limit
      let parsedLimit = 50; // default
      if (limit) {
        const limitNum = parseInt(limit as string, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
          return res.status(400).json({
            success: false,
            error: 'Invalid limit parameter. Must be between 1 and 200.'
          });
        }
        parsedLimit = limitNum;
      }

      const logs = await auditService.getLogsForResource(
        resourceType,
        resourceId,
        parsedLimit
      );

      res.json({
        success: true,
        data: logs,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          resourceType,
          resourceId,
          count: logs.length
        }
      });
    } catch (error) {
      safeLogger.error('Error getting resource audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get resource audit logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Order Search Methods
  async searchOrders(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      const {
        query,
        status,
        sellerId,
        buyerId,
        minAmount,
        maxAmount,
        paymentMethod,
        startDate,
        endDate,
        limit,
        offset
      } = req.query;

      // Parse and validate limit
      let parsedLimit = 20; // default
      if (limit) {
        const limitNum = parseInt(limit as string, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
          return res.status(400).json({
            success: false,
            error: 'Invalid limit parameter. Must be between 1 and 100.'
          });
        }
        parsedLimit = limitNum;
      }

      // Parse and validate offset
      let parsedOffset = 0;
      if (offset) {
        const offsetNum = parseInt(offset as string, 10);
        if (isNaN(offsetNum) || offsetNum < 0) {
          return res.status(400).json({
            success: false,
            error: 'Invalid offset parameter. Must be >= 0.'
          });
        }
        parsedOffset = offsetNum;
      }

      // Parse dates if provided
      let dateRange: { start: Date; end: Date } | undefined;
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate as string) : new Date(0);
        const end = endDate ? new Date(endDate as string) : new Date();

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid date format'
          });
        }

        dateRange = { start, end };
      }

      // Parse amounts
      const parsedMinAmount = minAmount ? parseFloat(minAmount as string) : undefined;
      const parsedMaxAmount = maxAmount ? parseFloat(maxAmount as string) : undefined;

      const results = await orderSearchService.searchOrders({
        query: query as string | undefined,
        status: status ? (Array.isArray(status) ? status as string[] : [status as string]) : undefined,
        sellerId: sellerId as string | undefined,
        buyerId: buyerId as string | undefined,
        minAmount: parsedMinAmount,
        maxAmount: parsedMaxAmount,
        paymentMethod: paymentMethod as string | undefined,
        dateRange
      }, parsedLimit, parsedOffset);

      res.json({
        success: true,
        data: results.orders,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          total: results.total,
          limit: parsedLimit,
          offset: parsedOffset
        }
      });
    } catch (error) {
      safeLogger.error('Error searching orders:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getOrderSearchSuggestions(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      const { query, limit } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Query parameter is required'
        });
      }

      // Parse limit
      let parsedLimit = 5; // default
      if (limit) {
        const limitNum = parseInt(limit as string, 10);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 20) {
          return res.status(400).json({
            success: false,
            error: 'Invalid limit parameter. Must be between 1 and 20.'
          });
        }
        parsedLimit = limitNum;
      }

      const suggestions = await orderSearchService.getSuggestions(
        query as string,
        parsedLimit
      );

      res.json({
        success: true,
        data: suggestions,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId,
          count: suggestions.length
        }
      });
    } catch (error) {
      safeLogger.error('Error getting order search suggestions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get search suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getOrderSearchFilters(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin ID not found in request'
        });
      }

      const filters = await orderSearchService.getPopularFilters();

      res.json({
        success: true,
        data: filters,
        metadata: {
          timestamp: new Date().toISOString(),
          adminId
        }
      });
    } catch (error) {
      safeLogger.error('Error getting order search filters:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get search filters',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const adminDashboardController = new AdminDashboardController();
