/// <reference path="../types/express.d.ts" />
import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { adminDashboardService } from '../services/adminDashboardService';
import { getAdminWebSocketService } from '../services/adminWebSocketService';

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
}

export const adminDashboardController = new AdminDashboardController();
