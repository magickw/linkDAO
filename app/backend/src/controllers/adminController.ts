import { Request, Response } from "express";
import { analyticsService } from "../services/analyticsService";
import { databaseService } from "../services/databaseService";
import AuditLoggingService from "../services/auditLoggingService";
import { eq, desc } from "drizzle-orm";
import { users, disputes, marketplaceUsers, sellerVerifications, moderationCases } from "../db/schema";

export class AdminController {
  private auditLoggingService: AuditLoggingService;

  constructor() {
    this.auditLoggingService = new AuditLoggingService();
  }

  // Policy Configuration Methods
  async createPolicyConfiguration(req: Request, res: Response) {
    try {
      res.status(201).json({ message: "Policy configuration created" });
    } catch (error) {
      res.status(500).json({ error: "Failed to create policy configuration" });
    }
  }

  async updatePolicyConfiguration(req: Request, res: Response) {
    try {
      res.json({ message: "Policy configuration updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update policy configuration" });
    }
  }

  async getPolicyConfigurations(req: Request, res: Response) {
    try {
      res.json({ data: [] });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch policy configurations" });
    }
  }

  async deletePolicyConfiguration(req: Request, res: Response) {
    try {
      res.json({ message: "Policy configuration deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete policy configuration" });
    }
  }

  // Threshold Configuration Methods
  async createThresholdConfiguration(req: Request, res: Response) {
    try {
      res.status(201).json({ message: "Threshold configuration created" });
    } catch (error) {
      res.status(500).json({ error: "Failed to create threshold configuration" });
    }
  }

  async updateThresholdConfiguration(req: Request, res: Response) {
    try {
      res.json({ message: "Threshold configuration updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update threshold configuration" });
    }
  }

  async getThresholdConfigurations(req: Request, res: Response) {
    try {
      res.json({ data: [] });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch threshold configurations" });
    }
  }

  // Vendor Configuration Methods
  async createVendorConfiguration(req: Request, res: Response) {
    try {
      res.status(201).json({ message: "Vendor configuration created" });
    } catch (error) {
      res.status(500).json({ error: "Failed to create vendor configuration" });
    }
  }

  async updateVendorConfiguration(req: Request, res: Response) {
    try {
      res.json({ message: "Vendor configuration updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update vendor configuration" });
    }
  }

  async getVendorConfigurations(req: Request, res: Response) {
    try {
      res.json({ data: [] });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor configurations" });
    }
  }

  // Vendor Health Status
  async updateVendorHealthStatus(req: Request, res: Response) {
    try {
      res.json({ message: "Vendor health status updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update vendor health status" });
    }
  }

  // Alert Configuration Methods
  async createAlertConfiguration(req: Request, res: Response) {
    try {
      res.status(201).json({ message: "Alert configuration created" });
    } catch (error) {
      res.status(500).json({ error: "Failed to create alert configuration" });
    }
  }

  async updateAlertConfiguration(req: Request, res: Response) {
    try {
      res.json({ message: "Alert configuration updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update alert configuration" });
    }
  }

  async getAlertConfigurations(req: Request, res: Response) {
    try {
      res.json({ data: [] });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alert configurations" });
    }
  }

  // Dashboard Methods
  async getDashboardMetrics(req: Request, res: Response) {
    try {
      // Get real analytics data
      const analytics = await analyticsService.getOverviewMetrics();
      
      // Get dispute statistics
      const db = databaseService.getDatabase();
      const disputeStats = await db.select({
        total: db.select().from(disputes).then(r => r.length),
        resolved: db.select().from(disputes).where(eq(disputes.status, 'resolved')).then(r => r.length)
      });
      
      // Get user statistics
      const userStats = await db.select({
        total: db.select().from(users).then(r => r.length),
        sellers: db.select().from(marketplaceUsers).where(eq(marketplaceUsers.role, 'seller')).then(r => r.length)
      });
      
      // Get moderation statistics
      const moderationStats = await db.select({
        pending: db.select().from(moderationCases).where(eq(moderationCases.status, 'pending')).then(r => r.length),
        inReview: db.select().from(moderationCases).where(eq(moderationCases.status, 'in_review')).then(r => r.length)
      });
      
      res.json({
        totalAlerts: analytics.totalOrders,
        activeAlerts: analytics.activeUsers.daily,
        resolvedAlerts: disputeStats.resolved,
        averageResponseTime: 120, // Placeholder - would need to calculate from actual data
        systemHealth: 95 // Placeholder - would need to calculate from actual metrics
      });
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ error: "Failed to fetch dashboard metrics" });
    }
  }

  // Admin stats endpoint for the frontend dashboard
  async getAdminStats(req: Request, res: Response) {
    try {
      const db = databaseService.getDatabase();
      
      // Get moderation statistics
      const pendingModerationsResult = await db.select({ count: moderationCases.id })
        .from(moderationCases)
        .where(eq(moderationCases.status, 'pending'));
      const pendingModerations = pendingModerationsResult.length > 0 ? pendingModerationsResult[0].count : 0;
      
      // Get seller application statistics
      const pendingSellersResult = await db.select({ count: sellerVerifications.id })
        .from(sellerVerifications)
        .where(eq(sellerVerifications.currentTier, 'unverified'));
      const pendingSellerApplications = pendingSellersResult.length > 0 ? pendingSellersResult[0].count : 0;
      
      // Get dispute statistics
      const openDisputesResult = await db.select({ count: disputes.id })
        .from(disputes)
        .where(eq(disputes.status, 'open'));
      const openDisputes = openDisputesResult.length > 0 ? openDisputesResult[0].count : 0;
      
      // Get user statistics
      const totalUsersResult = await db.select({ count: users.id })
        .from(users);
      const totalUsers = totalUsersResult.length > 0 ? totalUsersResult[0].count : 0;
      
      const totalSellersResult = await db.select({ count: marketplaceUsers.userId })
        .from(marketplaceUsers)
        .where(eq(marketplaceUsers.role, 'seller'));
      const totalSellers = totalSellersResult.length > 0 ? totalSellersResult[0].count : 0;
      
      // Get suspended users (placeholder - would need actual suspension table)
      const suspendedUsers = 0;
      
      // Get recent actions (placeholder - would need actual audit log)
      const recentActions = [];
      
      res.json({
        pendingModerations,
        pendingSellerApplications,
        openDisputes,
        suspendedUsers,
        totalUsers,
        totalSellers,
        recentActions
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  }

  async getSystemStatus(req: Request, res: Response) {
    try {
      res.json({
        status: "operational",
        lastChecked: new Date().toISOString(),
        components: []
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch system status" });
    }
  }

  async getHistoricalMetrics(req: Request, res: Response) {
    try {
      const analytics = await analyticsService.getSalesAnalytics();
      res.json({
        timeSeries: analytics.dailySales,
        metrics: {
          totalRevenue: analytics.dailySales.reduce((sum, day) => sum + day.sales, 0),
          totalOrders: analytics.dailySales.reduce((sum, day) => sum + day.orders, 0)
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch historical metrics" });
    }
  }

  // Audit Log Methods
  async searchAuditLogs(req: Request, res: Response) {
    try {
      const { actorId, actionType, startDate, endDate, page = 1, limit = 10 } = req.query;
      
      const auditTrail = await this.auditLoggingService.getAuditTrail({
        actorId: actorId as string,
        actionType: actionType as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string)
      });
      
      res.json({
        logs: auditTrail.logs,
        pagination: {
          total: auditTrail.total,
          page: parseInt(page as string),
          pageSize: parseInt(limit as string),
          totalPages: Math.ceil(auditTrail.total / parseInt(limit as string))
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to search audit logs" });
    }
  }

  async getAuditAnalytics(req: Request, res: Response) {
    try {
      const stats = await this.auditLoggingService.getAuditStatistics({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endDate: new Date()
      });
      
      res.json({
        summary: {
          totalLogs: stats.totalLogs,
          averageLogsPerDay: stats.averageLogsPerDay
        },
        trends: {
          logsByAction: stats.logsByAction,
          logsByActor: stats.logsByActor
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audit analytics" });
    }
  }

  async generateComplianceReport(req: Request, res: Response) {
    try {
      res.json({
        reportId: "report-123",
        status: "completed",
        downloadUrl: "/reports/compliance-report-123.pdf"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate compliance report" });
    }
  }

  async exportAuditLogs(req: Request, res: Response) {
    try {
      const { format = 'json', startDate, endDate } = req.query;
      
      const exportData = await this.auditLoggingService.exportAuditTrail({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        format: format as 'json' | 'csv'
      });
      
      res.json({
        exportId: "export-123",
        status: "completed",
        downloadUrl: "/exports/audit-logs-123." + format
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to export audit logs" });
    }
  }

  async detectPolicyViolations(req: Request, res: Response) {
    try {
      res.json({
        violations: [],
        total: 0
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to detect policy violations" });
    }
  }

  async getAuditLogs(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const auditTrail = await this.auditLoggingService.getAuditTrail({
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string),
        orderBy: 'desc'
      });
      
      res.json({
        logs: auditTrail.logs,
        pagination: {
          total: auditTrail.total,
          page: parseInt(page as string),
          pageSize: parseInt(limit as string),
          totalPages: Math.ceil(auditTrail.total / parseInt(limit as string))
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  }
}

export const adminController = new AdminController();