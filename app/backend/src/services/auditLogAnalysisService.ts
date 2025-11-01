import { db } from '../db/connectionPool';
import { 
  admin_audit_logs,
  moderation_cases,
  content_reports,
  moderation_appeals
} from '../db/schema';
import { eq, and, gte, lte, desc, like, count, sql } from 'drizzle-orm';

export interface AuditLogEntry {
  id: number;
  adminId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface AuditSearchFilters {
  adminId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  limit?: number;
  offset?: number;
}

export interface AuditAnalytics {
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByAdmin: Record<string, number>;
  actionsByResource: Record<string, number>;
  actionsOverTime: Array<{ date: string; count: number }>;
  topAdmins: Array<{ adminId: string; actionCount: number }>;
  suspiciousActivity: Array<{
    type: 'bulk_changes' | 'off_hours' | 'unusual_ip' | 'rapid_succession';
    description: string;
    adminId: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export interface ComplianceReport {
  period: { start: Date; end: Date };
  totalChanges: number;
  configurationChanges: number;
  policyChanges: number;
  vendorChanges: number;
  adminActivity: Record<string, {
    totalActions: number;
    configChanges: number;
    lastActivity: Date;
  }>;
  dataRetentionCompliance: {
    oldestRecord: Date;
    recordsToDelete: number;
    retentionPolicyDays: number;
  };
}

export class AuditLogAnalysisService {
  // Search audit logs with filters
  async searchAuditLogs(filters: AuditSearchFilters): Promise<{
    logs: AuditLogEntry[];
    total: number;
    hasMore: boolean;
  }> {
    const conditions = [];
    
    if (filters.adminId) {
      conditions.push(eq(admin_audit_logs.adminId, filters.adminId));
    }
    
    if (filters.action) {
      conditions.push(like(admin_audit_logs.action, `%${filters.action}%`));
    }
    
    if (filters.resourceType) {
      conditions.push(eq(admin_audit_logs.resourceType, filters.resourceType));
    }
    
    if (filters.resourceId) {
      conditions.push(eq(admin_audit_logs.resourceId, filters.resourceId));
    }
    
    if (filters.startDate) {
      conditions.push(gte(admin_audit_logs.timestamp, filters.startDate));
    }
    
    if (filters.endDate) {
      conditions.push(lte(admin_audit_logs.timestamp, filters.endDate));
    }
    
    if (filters.ipAddress) {
      conditions.push(eq(admin_audit_logs.ipAddress, filters.ipAddress));
    }

    // Get total count
    const totalQuery = db.select({ count: count() }).from(admin_audit_logs);
    if (conditions.length > 0) {
      totalQuery.where(and(...conditions));
    }
    const totalResult = await totalQuery;
    const total = totalResult[0]?.count || 0;

    // Get paginated results
    let query = db.select().from(admin_audit_logs);
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    
    const logs = await query
      .orderBy(desc(admin_audit_logs.timestamp))
      .limit(limit)
      .offset(offset);

    return {
      logs: logs.map(this.mapAuditLogEntry),
      total,
      hasMore: offset + logs.length < total
    };
  }

  // Get audit analytics for a time period
  async getAuditAnalytics(startDate: Date, endDate: Date): Promise<AuditAnalytics> {
    const [
      totalActions,
      actionsByType,
      actionsByAdmin,
      actionsByResource,
      actionsOverTime,
      topAdmins,
      suspiciousActivity
    ] = await Promise.all([
      this.getTotalActions(startDate, endDate),
      this.getActionsByType(startDate, endDate),
      this.getActionsByAdmin(startDate, endDate),
      this.getActionsByResource(startDate, endDate),
      this.getActionsOverTime(startDate, endDate),
      this.getTopAdmins(startDate, endDate),
      this.detectSuspiciousActivity(startDate, endDate)
    ]);

    return {
      totalActions,
      actionsByType,
      actionsByAdmin,
      actionsByResource,
      actionsOverTime,
      topAdmins,
      suspiciousActivity
    };
  }

  // Generate compliance report
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<ComplianceReport> {
    const [
      totalChanges,
      configurationChanges,
      policyChanges,
      vendorChanges,
      adminActivity,
      dataRetentionInfo
    ] = await Promise.all([
      this.getTotalActions(startDate, endDate),
      this.getActionCount('update', 'threshold_configuration', startDate, endDate),
      this.getActionCount('update', 'policy_configuration', startDate, endDate),
      this.getActionCount('update', 'vendor_configuration', startDate, endDate),
      this.getAdminActivity(startDate, endDate),
      this.getDataRetentionInfo()
    ]);

    return {
      period: { start: startDate, end: endDate },
      totalChanges,
      configurationChanges,
      policyChanges,
      vendorChanges,
      adminActivity,
      dataRetentionCompliance: dataRetentionInfo
    };
  }

  // Export audit logs for compliance
  async exportAuditLogs(
    filters: AuditSearchFilters,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const { logs } = await this.searchAuditLogs({ ...filters, limit: 10000 });
    
    if (format === 'csv') {
      return this.convertToCSV(logs);
    }
    
    return JSON.stringify(logs, null, 2);
  }

  // Detect policy violations in audit logs
  async detectPolicyViolations(startDate: Date, endDate: Date): Promise<Array<{
    type: string;
    description: string;
    adminId: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high';
    evidence: any;
  }>> {
    const violations = [];

    // Check for unauthorized configuration changes
    const unauthorizedChanges = await this.detectUnauthorizedChanges(startDate, endDate);
    violations.push(...unauthorizedChanges);

    // Check for bulk operations without approval
    const bulkOperations = await this.detectBulkOperations(startDate, endDate);
    violations.push(...bulkOperations);

    // Check for off-hours activity
    const offHoursActivity = await this.detectOffHoursActivity(startDate, endDate);
    violations.push(...offHoursActivity);

    return violations;
  }

  // Private helper methods
  private async getTotalActions(startDate: Date, endDate: Date): Promise<number> {
    const result = await db.select({ count: count() })
      .from(admin_audit_logs)
      .where(and(
        gte(admin_audit_logs.timestamp, startDate),
        lte(admin_audit_logs.timestamp, endDate)
      ));
    
    return result[0]?.count || 0;
  }

  private async getActionsByType(startDate: Date, endDate: Date): Promise<Record<string, number>> {
    const results = await db.select({
      action: admin_audit_logs.action,
      count: count()
    })
    .from(admin_audit_logs)
    .where(and(
      gte(admin_audit_logs.timestamp, startDate),
      lte(admin_audit_logs.timestamp, endDate)
    ))
    .groupBy(admin_audit_logs.action);

    return results.reduce((acc, item) => {
      acc[item.action] = item.count;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getActionsByAdmin(startDate: Date, endDate: Date): Promise<Record<string, number>> {
    const results = await db.select({
      adminId: admin_audit_logs.adminId,
      count: count()
    })
    .from(admin_audit_logs)
    .where(and(
      gte(admin_audit_logs.timestamp, startDate),
      lte(admin_audit_logs.timestamp, endDate)
    ))
    .groupBy(admin_audit_logs.adminId);

    return results.reduce((acc, item) => {
      acc[item.adminId] = item.count;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getActionsByResource(startDate: Date, endDate: Date): Promise<Record<string, number>> {
    const results = await db.select({
      resourceType: admin_audit_logs.resourceType,
      count: count()
    })
    .from(admin_audit_logs)
    .where(and(
      gte(admin_audit_logs.timestamp, startDate),
      lte(admin_audit_logs.timestamp, endDate)
    ))
    .groupBy(admin_audit_logs.resourceType);

    return results.reduce((acc, item) => {
      acc[item.resourceType] = item.count;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getActionsOverTime(startDate: Date, endDate: Date): Promise<Array<{ date: string; count: number }>> {
    const results = await db.select({
      date: sql<string>`DATE(${admin_audit_logs.timestamp})`,
      count: count()
    })
    .from(admin_audit_logs)
    .where(and(
      gte(admin_audit_logs.timestamp, startDate),
      lte(admin_audit_logs.timestamp, endDate)
    ))
    .groupBy(sql`DATE(${admin_audit_logs.timestamp})`)
    .orderBy(sql`DATE(${admin_audit_logs.timestamp})`);

    return results.map(item => ({
      date: item.date,
      count: item.count
    }));
  }

  private async getTopAdmins(startDate: Date, endDate: Date): Promise<Array<{ adminId: string; actionCount: number }>> {
    const results = await db.select({
      adminId: admin_audit_logs.adminId,
      actionCount: count()
    })
    .from(admin_audit_logs)
    .where(and(
      gte(admin_audit_logs.timestamp, startDate),
      lte(admin_audit_logs.timestamp, endDate)
    ))
    .groupBy(admin_audit_logs.adminId)
    .orderBy(desc(count()))
    .limit(10);

    return results.map(item => ({
      adminId: item.adminId,
      actionCount: item.actionCount
    }));
  }

  private async detectSuspiciousActivity(startDate: Date, endDate: Date): Promise<Array<{
    type: 'bulk_changes' | 'off_hours' | 'unusual_ip' | 'rapid_succession';
    description: string;
    adminId: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high';
  }>> {
    const suspicious = [];

    // Detect bulk changes (more than 10 actions in 5 minutes)
    const bulkChanges = await this.detectBulkChanges(startDate, endDate);
    suspicious.push(...bulkChanges);

    // Detect off-hours activity (outside 9-5 business hours)
    const offHours = await this.detectOffHoursActivity(startDate, endDate);
    suspicious.push(...offHours);

    return suspicious;
  }

  private async detectBulkChanges(startDate: Date, endDate: Date): Promise<any[]> {
    // Implementation for detecting bulk changes
    // This would analyze time windows and action counts
    return [];
  }

  private async detectOffHoursActivity(startDate: Date, endDate: Date): Promise<any[]> {
    // Implementation for detecting off-hours activity
    // This would check timestamps against business hours
    return [];
  }

  private async getActionCount(action: string, resourceType: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await db.select({ count: count() })
      .from(admin_audit_logs)
      .where(and(
        eq(admin_audit_logs.action, action),
        eq(admin_audit_logs.resourceType, resourceType),
        gte(admin_audit_logs.timestamp, startDate),
        lte(admin_audit_logs.timestamp, endDate)
      ));
    
    return result[0]?.count || 0;
  }

  private async getAdminActivity(startDate: Date, endDate: Date): Promise<Record<string, any>> {
    const results = await db.select({
      adminId: admin_audit_logs.adminId,
      totalActions: count(),
      lastActivity: sql<Date>`MAX(${admin_audit_logs.timestamp})`
    })
    .from(admin_audit_logs)
    .where(and(
      gte(admin_audit_logs.timestamp, startDate),
      lte(admin_audit_logs.timestamp, endDate)
    ))
    .groupBy(admin_audit_logs.adminId);

    return results.reduce((acc, item) => {
      acc[item.adminId] = {
        totalActions: item.totalActions,
        configChanges: 0, // Would need additional query
        lastActivity: item.lastActivity
      };
      return acc;
    }, {} as Record<string, any>);
  }

  private async getDataRetentionInfo(): Promise<any> {
    const oldestRecord = await db.select({
      timestamp: admin_audit_logs.timestamp
    })
    .from(admin_audit_logs)
    .orderBy(admin_audit_logs.timestamp)
    .limit(1);

    const retentionPolicyDays = 365; // 1 year retention
    const cutoffDate = new Date(Date.now() - retentionPolicyDays * 24 * 60 * 60 * 1000);
    
    const recordsToDelete = await db.select({ count: count() })
      .from(admin_audit_logs)
      .where(lte(admin_audit_logs.timestamp, cutoffDate));

    return {
      oldestRecord: oldestRecord[0]?.timestamp || new Date(),
      recordsToDelete: recordsToDelete[0]?.count || 0,
      retentionPolicyDays
    };
  }

  private async detectUnauthorizedChanges(startDate: Date, endDate: Date): Promise<any[]> {
    // Implementation for detecting unauthorized changes
    return [];
  }

  private async detectBulkOperations(startDate: Date, endDate: Date): Promise<any[]> {
    // Implementation for detecting bulk operations
    return [];
  }

  private convertToCSV(logs: AuditLogEntry[]): string {
    const headers = ['ID', 'Admin ID', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'Timestamp'];
    const rows = logs.map(log => [
      log.id,
      log.adminId,
      log.action,
      log.resourceType,
      log.resourceId || '',
      log.ipAddress || '',
      log.timestamp.toISOString()
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private mapAuditLogEntry(row: any): AuditLogEntry {
    return {
      id: row.id,
      adminId: row.adminId,
      action: row.action,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      oldValues: row.oldValues ? JSON.parse(row.oldValues) : null,
      newValues: row.newValues ? JSON.parse(row.newValues) : null,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      timestamp: row.timestamp
    };
  }
}

export const auditLogAnalysisService = new AuditLogAnalysisService();
