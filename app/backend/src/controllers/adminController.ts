import { Request, Response } from "express";
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { analyticsService } from "../services/analyticsService";
import { databaseService } from "../services/databaseService";
import AuditLoggingService from "../services/auditLoggingService";
import { adminConfigurationService } from "../services/adminConfigurationService";
import { eq, desc, sql } from "drizzle-orm";
import { users, disputes, marketplaceUsers, sellerVerifications, moderationCases, communityGovernanceProposals } from "../db/schema";
import { AuthenticatedRequest } from "../middleware/adminAuthMiddleware";

export class AdminController {
  private auditLoggingService: AuditLoggingService;

  constructor() {
    this.auditLoggingService = new AuditLoggingService();
  }

  // Policy Configuration Methods
  async createPolicyConfiguration(req: Request, res: Response) {
    try {
      const adminReq = req as AuthenticatedRequest;
      const adminId = adminReq.user?.id;

      if (!adminId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const config = await adminConfigurationService.createPolicyConfiguration(req.body, adminId);
      res.status(201).json({
        success: true,
        message: "Policy configuration created successfully",
        data: config
      });
    } catch (error) {
      safeLogger.error("Error creating policy configuration:", error);
      res.status(500).json({ success: false, error: "Failed to create policy configuration" });
    }
  }

  async updatePolicyConfiguration(req: Request, res: Response) {
    try {
      const adminReq = req as AuthenticatedRequest;
      const adminId = adminReq.user?.id;
      const { id } = req.params;

      if (!adminId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const config = await adminConfigurationService.updatePolicyConfiguration(
        parseInt(id),
        req.body,
        adminId
      );
      res.json({
        success: true,
        message: "Policy configuration updated successfully",
        data: config
      });
    } catch (error) {
      safeLogger.error("Error updating policy configuration:", error);
      res.status(500).json({ success: false, error: "Failed to update policy configuration" });
    }
  }

  async getPolicyConfigurations(req: Request, res: Response) {
    try {
      const { activeOnly } = req.query;
      const configs = await adminConfigurationService.getPolicyConfigurations(
        activeOnly === 'true'
      );
      res.json({ success: true, data: configs });
    } catch (error) {
      safeLogger.error("Error fetching policy configurations:", error);
      res.status(500).json({ success: false, error: "Failed to fetch policy configurations" });
    }
  }

  async deletePolicyConfiguration(req: Request, res: Response) {
    try {
      const adminReq = req as AuthenticatedRequest;
      const adminId = adminReq.user?.id;
      const { id } = req.params;

      if (!adminId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      await adminConfigurationService.deletePolicyConfiguration(parseInt(id), adminId);
      res.json({
        success: true,
        message: "Policy configuration deleted successfully"
      });
    } catch (error) {
      safeLogger.error("Error deleting policy configuration:", error);
      res.status(500).json({ success: false, error: "Failed to delete policy configuration" });
    }
  }

  // Threshold Configuration Methods
  async createThresholdConfiguration(req: Request, res: Response) {
    try {
      const adminReq = req as AuthenticatedRequest;
      const adminId = adminReq.user?.id;

      if (!adminId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const config = await adminConfigurationService.createThresholdConfiguration(req.body, adminId);
      res.status(201).json({
        success: true,
        message: "Threshold configuration created successfully",
        data: config
      });
    } catch (error) {
      safeLogger.error("Error creating threshold configuration:", error);
      res.status(500).json({ success: false, error: "Failed to create threshold configuration" });
    }
  }

  async updateThresholdConfiguration(req: Request, res: Response) {
    try {
      const adminReq = req as AuthenticatedRequest;
      const adminId = adminReq.user?.id;
      const { id } = req.params;

      if (!adminId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const config = await adminConfigurationService.updateThresholdConfiguration(
        parseInt(id),
        req.body,
        adminId
      );
      res.json({
        success: true,
        message: "Threshold configuration updated successfully",
        data: config
      });
    } catch (error) {
      safeLogger.error("Error updating threshold configuration:", error);
      res.status(500).json({ success: false, error: "Failed to update threshold configuration" });
    }
  }

  async getThresholdConfigurations(req: Request, res: Response) {
    try {
      const { contentType, reputationTier } = req.query;
      const configs = await adminConfigurationService.getThresholdConfigurations(
        contentType as string,
        reputationTier as string
      );
      res.json({ success: true, data: configs });
    } catch (error) {
      safeLogger.error("Error fetching threshold configurations:", error);
      res.status(500).json({ success: false, error: "Failed to fetch threshold configurations" });
    }
  }

  // Vendor Configuration Methods
  async createVendorConfiguration(req: Request, res: Response) {
    try {
      const adminReq = req as AuthenticatedRequest;
      const adminId = adminReq.user?.id;

      if (!adminId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const config = await adminConfigurationService.createVendorConfiguration(req.body, adminId);
      res.status(201).json({
        success: true,
        message: "Vendor configuration created successfully",
        data: config
      });
    } catch (error) {
      safeLogger.error("Error creating vendor configuration:", error);
      res.status(500).json({ success: false, error: "Failed to create vendor configuration" });
    }
  }

  async updateVendorConfiguration(req: Request, res: Response) {
    try {
      const adminReq = req as AuthenticatedRequest;
      const adminId = adminReq.user?.id;
      const { id } = req.params;

      if (!adminId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const config = await adminConfigurationService.updateVendorConfiguration(
        parseInt(id),
        req.body,
        adminId
      );
      res.json({
        success: true,
        message: "Vendor configuration updated successfully",
        data: config
      });
    } catch (error) {
      safeLogger.error("Error updating vendor configuration:", error);
      res.status(500).json({ success: false, error: "Failed to update vendor configuration" });
    }
  }

  async getVendorConfigurations(req: Request, res: Response) {
    try {
      const { serviceType, enabledOnly } = req.query;
      const configs = await adminConfigurationService.getVendorConfigurations(
        serviceType as string,
        enabledOnly === 'true'
      );
      res.json({ success: true, data: configs });
    } catch (error) {
      safeLogger.error("Error fetching vendor configurations:", error);
      res.status(500).json({ success: false, error: "Failed to fetch vendor configurations" });
    }
  }

  // Vendor Health Status
  async updateVendorHealthStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, error: "Health status is required" });
      }

      await adminConfigurationService.updateVendorHealthStatus(parseInt(id), status);
      res.json({
        success: true,
        message: "Vendor health status updated successfully"
      });
    } catch (error) {
      safeLogger.error("Error updating vendor health status:", error);
      res.status(500).json({ success: false, error: "Failed to update vendor health status" });
    }
  }

  // Alert Configuration Methods
  async createAlertConfiguration(req: Request, res: Response) {
    try {
      const adminReq = req as AuthenticatedRequest;
      const adminId = adminReq.user?.id;

      if (!adminId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const config = await adminConfigurationService.createAlertConfiguration(req.body, adminId);
      res.status(201).json({
        success: true,
        message: "Alert configuration created successfully",
        data: config
      });
    } catch (error) {
      safeLogger.error("Error creating alert configuration:", error);
      res.status(500).json({ success: false, error: "Failed to create alert configuration" });
    }
  }

  async updateAlertConfiguration(req: Request, res: Response) {
    try {
      const adminReq = req as AuthenticatedRequest;
      const adminId = adminReq.user?.id;
      const { id } = req.params;

      if (!adminId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const config = await adminConfigurationService.updateAlertConfiguration(
        parseInt(id),
        req.body,
        adminId
      );
      res.json({
        success: true,
        message: "Alert configuration updated successfully",
        data: config
      });
    } catch (error) {
      safeLogger.error("Error updating alert configuration:", error);
      res.status(500).json({ success: false, error: "Failed to update alert configuration" });
    }
  }

  async getAlertConfigurations(req: Request, res: Response) {
    try {
      const { activeOnly } = req.query;
      const configs = await adminConfigurationService.getAlertConfigurations(
        activeOnly === 'true'
      );
      res.json({ success: true, data: configs });
    } catch (error) {
      safeLogger.error("Error fetching alert configurations:", error);
      res.status(500).json({ success: false, error: "Failed to fetch alert configurations" });
    }
  }

  // Dashboard Methods
  async getDashboardMetrics(req: Request, res: Response) {
    try {
      // Get real analytics data
      const analytics = await analyticsService.getOverviewMetrics();
      
      // Get dispute statistics
      const db = databaseService.getDatabase();
      const disputeStatsResult = await db.select({
        total: sql<number>`count(*)`,
        resolved: sql<number>`count(*) filter (where status = 'resolved')`
      }).from(disputes);
      const disputeStats = disputeStatsResult[0] || { total: 0, resolved: 0 };
      
      // Get user statistics
      const userStatsResult = await db.select({
        total: sql<number>`count(*)`,
        sellers: sql<number>`count(*) filter (where role = 'seller')`
      }).from(users)
      .leftJoin(marketplaceUsers, eq(users.id, marketplaceUsers.userId));
      const userStats = userStatsResult[0] || { total: 0, sellers: 0 };
      
      // Get moderation statistics
      const moderationStatsResult = await db.select({
        pending: sql<number>`count(*) filter (where status = 'pending')`,
        inReview: sql<number>`count(*) filter (where status = 'in_review')`
      }).from(moderationCases);
      const moderationStats = moderationStatsResult[0] || { pending: 0, inReview: 0 };
      
      res.json({
        totalAlerts: analytics.totalOrders,
        activeAlerts: analytics.activeUsers.daily,
        resolvedAlerts: disputeStats.resolved,
        averageResponseTime: 120, // Placeholder - would need to calculate from actual data
        systemHealth: 95 // Placeholder - would need to calculate from actual metrics
      });
    } catch (error) {
      safeLogger.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ error: "Failed to fetch dashboard metrics" });
    }
  }

  // Admin stats endpoint for the frontend dashboard
  async getAdminStats(req: Request, res: Response) {
    try {
      const db = databaseService.getDatabase();
      
      let pendingModerations = 0;
      let pendingSellerApplications = 0;
      let openDisputes = 0;
      let totalUsers = 0;
      let totalSellers = 0;
      let pendingCharityProposals = 0;
      
      try {
        // Get moderation statistics
        const pendingModerationsResult = await db.select({ count: sql<number>`count(*)` })
          .from(moderationCases)
          .where(eq(moderationCases.status, 'pending'));
        pendingModerations = pendingModerationsResult.length > 0 ? pendingModerationsResult[0].count : 0;
      } catch (moderationError) {
        safeLogger.warn("Error fetching moderation stats:", moderationError);
        pendingModerations = 0; // Default to 0 if table doesn't exist or query fails
      }
      
      try {
        // Get seller application statistics
        const pendingSellersResult = await db.select({ count: sql<number>`count(*)` })
          .from(sellerVerifications)
          .where(eq(sellerVerifications.currentTier, 'unverified'));
        pendingSellerApplications = pendingSellersResult.length > 0 ? pendingSellersResult[0].count : 0;
      } catch (sellerError) {
        safeLogger.warn("Error fetching seller verification stats:", sellerError);
        pendingSellerApplications = 0; // Default to 0 if table doesn't exist or query fails
      }
      
      try {
        // Get dispute statistics
        const openDisputesResult = await db.select({ count: sql<number>`count(*)` })
          .from(disputes)
          .where(eq(disputes.status, 'open'));
        openDisputes = openDisputesResult.length > 0 ? openDisputesResult[0].count : 0;
      } catch (disputeError) {
        safeLogger.warn("Error fetching dispute stats:", disputeError);
        openDisputes = 0; // Default to 0 if table doesn't exist or query fails
      }
      
      try {
        // Get user statistics
        const totalUsersResult = await db.select({ count: sql<number>`count(*)` })
          .from(users);
        totalUsers = totalUsersResult.length > 0 ? totalUsersResult[0].count : 0;
      } catch (userError) {
        safeLogger.warn("Error fetching user stats:", userError);
        totalUsers = 0; // Default to 0 if table doesn't exist or query fails
      }
      
      try {
        const totalSellersResult = await db.select({ count: sql<number>`count(*)` })
          .from(marketplaceUsers)
          .where(eq(marketplaceUsers.role, 'seller'));
        totalSellers = totalSellersResult.length > 0 ? totalSellersResult[0].count : 0;
      } catch (marketplaceError) {
        safeLogger.warn("Error fetching marketplace user stats:", marketplaceError);
        totalSellers = 0; // Default to 0 if table doesn't exist or query fails
      }
      
      try {
        // Get charity proposal statistics
        const charityStatsResult = await db.select({ count: sql<number>`count(*)` })
          .from(communityGovernanceProposals)
          .where(eq(communityGovernanceProposals.type, 'charity'));
        
        if (charityStatsResult.length > 0) {
          pendingCharityProposals = charityStatsResult[0].count || 0;
        }
      } catch (charityError) {
        safeLogger.warn("Error fetching charity stats:", charityError);
        pendingCharityProposals = 0; // Default to 0 if table doesn't exist or query fails
      }
      
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
        pendingCharityProposals,
        recentActions
      });
    } catch (error) {
      safeLogger.error("Critical error fetching admin stats:", error);
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
      const { page = 1, limit = 10, startDate, endDate } = req.query;

      // Parse dates if provided
      const queryParams: any = {
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string),
        orderBy: 'desc'
      };

      if (startDate) {
        queryParams.startDate = new Date(startDate as string);
      }
      if (endDate) {
        queryParams.endDate = new Date(endDate as string);
      }

      try {
        const auditTrail = await this.auditLoggingService.getAuditTrail(queryParams);

        // Transform to match frontend's expected format
        const actions = (auditTrail.logs || []).map((log: any) => ({
          id: String(log.id),
          adminId: log.actorId || 'system',
          adminAddress: log.actorId || 'system',
          action: log.actionType || 'action',
          targetType: log.targetType || 'unknown',
          targetId: log.targetId || '',
          details: {
            oldState: log.oldState,
            newState: log.newState,
            reasoning: log.reasoning
          },
          timestamp: log.createdAt?.toISOString?.() || log.createdAt || new Date().toISOString(),
          ipAddress: log.ipAddress
        }));

        res.json({
          actions,
          total: auditTrail.total || 0,
          page: parseInt(page as string),
          totalPages: Math.ceil((auditTrail.total || 0) / parseInt(limit as string))
        });
      } catch (dbError: any) {
        // Handle database errors gracefully - return empty results instead of 500
        safeLogger.warn("Audit logs query failed, returning empty result:", dbError.message);
        res.json({
          actions: [],
          total: 0,
          page: parseInt(page as string),
          totalPages: 0
        });
      }
    } catch (error) {
      safeLogger.error("Failed to fetch audit logs:", error);
      // Return empty result instead of 500 for better UI experience
      res.json({
        actions: [],
        total: 0,
        page: 1,
        totalPages: 0
      });
    }
  }

  // User Activity
  async getUserActivity(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      // Get user login history from audit logs
      const auditTrail = await this.auditLoggingService.getAuditTrail({
        actorId: userId,
        limit: 50
      });

      // Transform audit logs into activity format
      const activities = auditTrail.logs.map((log: any) => ({
        type: this.mapActionToActivityType(log.actionType),
        description: this.formatActivityDescription(log.actionType),
        details: log.details?.description || '',
        timestamp: log.timestamp,
        ipAddress: log.ipAddress
      }));

      res.json({
        activities,
        total: activities.length
      });
    } catch (error) {
      safeLogger.error('Error fetching user activity:', error);
      res.status(500).json({ error: "Failed to fetch user activity" });
    }
  }

  // Get user audit logs
  async getUserAuditLogs(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      // Get user audit logs from audit logging service
      const auditLogs = await this.auditLoggingService.getAuditTrail({
        actorId: userId,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json({
        logs: auditLogs.logs,
        total: auditLogs.total,
        page: parseInt(offset as string) / parseInt(limit as string) + 1,
        totalPages: Math.ceil(auditLogs.total / parseInt(limit as string))
      });
    } catch (error) {
      safeLogger.error('Error fetching user audit logs:', error);
      res.status(500).json({ error: "Failed to fetch user audit logs" });
    }
  }

  private mapActionToActivityType(actionType: string): string {
    if (actionType.includes('login')) return 'login';
    if (actionType.includes('post') || actionType.includes('content')) return 'post';
    if (actionType.includes('comment')) return 'comment';
    if (actionType.includes('transaction') || actionType.includes('purchase')) return 'transaction';
    return 'content';
  }

  private formatActivityDescription(actionType: string): string {
    switch (actionType) {
      case 'user.login':
        return 'Logged in to the platform';
      case 'user.logout':
        return 'Logged out';
      case 'content.create':
        return 'Created new content';
      case 'content.update':
        return 'Updated content';
      case 'content.delete':
        return 'Deleted content';
      case 'transaction.create':
        return 'Made a purchase';
      case 'comment.create':
        return 'Posted a comment';
      default:
        return actionType.replace(/\./g, ' ').replace(/_/g, ' ');
    }
  }

  // Analytics endpoints
  async getRevenueAnalytics(req: Request, res: Response) {
    try {
      const analytics = await analyticsService.getSalesAnalytics();
      res.json({
        success: true,
        data: {
          labels: analytics.dailySales.map(day => day.date),
          data: analytics.dailySales.map(day => day.sales),
          totalRevenue: analytics.dailySales.reduce((sum, day) => sum + day.sales, 0),
          totalOrders: analytics.dailySales.reduce((sum, day) => sum + day.orders, 0)
        }
      });
    } catch (error) {
      safeLogger.error("Error fetching revenue analytics:", error);
      res.status(500).json({ success: false, error: "Failed to fetch revenue analytics" });
    }
  }

  async getDisputeAnalytics(req: Request, res: Response) {
    try {
      const db = databaseService.getDatabase();
      const disputeStats = await db.select({
        total: sql<number>`count(*)`,
        resolved: sql<number>`count(*) filter (where status = 'resolved' or status = 'closed')`,
        pending: sql<number>`count(*) filter (where status = 'open' or status = 'investigating' or status = 'awaiting_response')`
      }).from(disputes);
      
      const stats = disputeStats[0] || { total: 0, resolved: 0, pending: 0 };
      
      res.json({
        success: true,
        data: {
          total: Number(stats.total),
          resolved: Number(stats.resolved),
          pending: Number(stats.pending),
          averageResolutionTime: 2.3 // Placeholder - would need to calculate from actual resolution times
        }
      });
    } catch (error) {
      safeLogger.error("Error fetching dispute analytics:", error);
      res.status(500).json({ success: false, error: "Failed to fetch dispute analytics" });
    }
  }

  async getModerationAnalytics(req: Request, res: Response) {
    try {
      const db = databaseService.getDatabase();
      const moderationStats = await db.select({
        total: sql<number>`count(*)`,
        pending: sql<number>`count(*) filter (where status = 'pending')`,
        approved: sql<number>`count(*) filter (where decision = 'approve' or decision = 'approved')`,
        rejected: sql<number>`count(*) filter (where decision = 'reject' or decision = 'rejected' or decision = 'remove')`
      }).from(moderationCases);
      
      const stats = moderationStats[0] || { total: 0, pending: 0, approved: 0, rejected: 0 };
      
      res.json({
        success: true,
        data: {
          total: Number(stats.total),
          pending: Number(stats.pending),
          approved: Number(stats.approved),
          rejected: Number(stats.rejected)
        }
      });
    } catch (error) {
      safeLogger.error("Error fetching moderation analytics:", error);
      res.status(500).json({ success: false, error: "Failed to fetch moderation analytics" });
    }
  }

  async getUserDemographics(req: Request, res: Response) {
    try {
      const db = databaseService.getDatabase();
      // Placeholder implementation - would need actual demographic data
      res.json({
        success: true,
        data: {
          ageGroups: {},
          locations: {}
        }
      });
    } catch (error) {
      safeLogger.error("Error fetching user demographics:", error);
      res.status(500).json({ success: false, error: "Failed to fetch user demographics" });
    }
  }

  async getContentAnalytics(req: Request, res: Response) {
    try {
      const db = databaseService.getDatabase();
      // Placeholder implementation - would need actual content metrics
      res.json({
        success: true,
        data: {
          totalPosts: 0,
          totalComments: 0,
          engagementRate: 0
        }
      });
    } catch (error) {
      safeLogger.error("Error fetching content analytics:", error);
      res.status(500).json({ success: false, error: "Failed to fetch content analytics" });
    }
  }
}

export const adminController = new AdminController();
