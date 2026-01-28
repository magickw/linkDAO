import { safeLogger } from '../../utils/safeLogger';
import { db } from '../../db';
import {
  user_consents,
  data_retention_policies,
  data_retention_logs,
  moderationCases,
  contentReports,
  moderationActions,
  moderationAppeals
} from '../../db/schema';
import { eq, and, lt, sql } from 'drizzle-orm';
import { geofencingComplianceService } from '../geofencingComplianceService';
export interface RetentionPolicy {
  id: string;
  name: string;
  dataType: string;
  retentionPeriodDays: number;
  region?: string;
  autoDelete: boolean;
  archiveBeforeDelete: boolean;
  encryptArchive: boolean;
  notifyBeforeDelete: boolean;
  notificationDays: number;
  active: boolean;
}

export interface DataCleanupResult {
  recordsProcessed: number;
  recordsDeleted: number;
  recordsArchived: number;
  errors: string[];
  executionTimeMs: number;
}

export interface RetentionAuditLog {
  id: string;
  policyId: string;
  action: 'delete' | 'archive' | 'notify';
  recordCount: number;
  dataType: string;
  executedAt: Date;
  executedBy: string;
  success: boolean;
  errorMessage?: string;
}

// Default retention policies
const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    id: 'moderation_cases_eu',
    name: 'EU Moderation Cases',
    dataType: 'moderation_cases',
    retentionPeriodDays: 365,
    region: 'EU',
    autoDelete: true,
    archiveBeforeDelete: true,
    encryptArchive: true,
    notifyBeforeDelete: true,
    notificationDays: 30,
    active: true
  },
  {
    id: 'moderation_cases_us',
    name: 'US Moderation Cases',
    dataType: 'moderation_cases',
    retentionPeriodDays: 1095,
    region: 'US',
    autoDelete: true,
    archiveBeforeDelete: true,
    encryptArchive: false,
    notifyBeforeDelete: false,
    notificationDays: 0,
    active: true
  },
  {
    id: 'content_reports_global',
    name: 'Global Content Reports',
    dataType: 'content_reports',
    retentionPeriodDays: 730,
    autoDelete: true,
    archiveBeforeDelete: false,
    encryptArchive: false,
    notifyBeforeDelete: false,
    notificationDays: 0,
    active: true
  },
  {
    id: 'moderation_actions_global',
    name: 'Global Moderation Actions',
    dataType: 'moderation_actions',
    retentionPeriodDays: 2555, // 7 years for audit purposes
    autoDelete: false,
    archiveBeforeDelete: true,
    encryptArchive: true,
    notifyBeforeDelete: true,
    notificationDays: 90,
    active: true
  },
  {
    id: 'appeals_global',
    name: 'Global Appeals',
    dataType: 'moderation_appeals',
    retentionPeriodDays: 1825, // 5 years
    autoDelete: true,
    archiveBeforeDelete: true,
    encryptArchive: true,
    notifyBeforeDelete: true,
    notificationDays: 60,
    active: true
  }
];

export class DataRetentionService {
  private retentionPolicies: RetentionPolicy[];
  private auditLogs: RetentionAuditLog[];

  constructor() {
    this.retentionPolicies = [...DEFAULT_RETENTION_POLICIES];
    this.auditLogs = [];
  }

  /**
   * Execute data retention cleanup based on policies
   */
  async executeRetentionCleanup(
    policyIds?: string[],
    dryRun: boolean = false
  ): Promise<DataCleanupResult> {
    const startTime = Date.now();
    const result: DataCleanupResult = {
      recordsProcessed: 0,
      recordsDeleted: 0,
      recordsArchived: 0,
      errors: [],
      executionTimeMs: 0
    };

    try {
      const policiesToExecute = policyIds 
        ? this.retentionPolicies.filter(p => policyIds.includes(p.id) && p.active)
        : this.retentionPolicies.filter(p => p.active);

      for (const policy of policiesToExecute) {
        try {
          const policyResult = await this.executePolicyCleanup(policy, dryRun);
          result.recordsProcessed += policyResult.recordsProcessed;
          result.recordsDeleted += policyResult.recordsDeleted;
          result.recordsArchived += policyResult.recordsArchived;
          result.errors.push(...policyResult.errors);

          // Log successful execution
          if (!dryRun) {
            await this.logRetentionAction({
              id: `${policy.id}_${Date.now()}`,
              policyId: policy.id,
              action: policy.autoDelete ? 'delete' : 'archive',
              recordCount: policyResult.recordsDeleted + policyResult.recordsArchived,
              dataType: policy.dataType,
              executedAt: new Date(),
              executedBy: 'system',
              success: policyResult.errors.length === 0
            });
          }
        } catch (error) {
          const errorMessage = `Policy ${policy.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMessage);

          // Log failed execution
          if (!dryRun) {
            await this.logRetentionAction({
              id: `${policy.id}_${Date.now()}_error`,
              policyId: policy.id,
              action: 'delete',
              recordCount: 0,
              dataType: policy.dataType,
              executedAt: new Date(),
              executedBy: 'system',
              success: false,
              errorMessage
            });
          }
        }
      }
    } catch (error) {
      result.errors.push(`Cleanup execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    result.executionTimeMs = Date.now() - startTime;
    return result;
  }

  /**
   * Get records that will be affected by retention policies
   */
  async getRecordsForRetention(policyId: string): Promise<{
    policy: RetentionPolicy;
    recordCount: number;
    oldestRecord: Date | null;
    newestRecord: Date | null;
  }> {
    const policy = this.retentionPolicies.find(p => p.id === policyId);
    if (!policy) {
      throw new Error(`Policy ${policyId} not found`);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriodDays);

    let recordCount = 0;
    let oldestRecord: Date | null = null;
    let newestRecord: Date | null = null;

    try {
      switch (policy.dataType) {
        case 'moderation_cases':
          const cases = await db
            .select({
              count: sql<number>`count(*)`,
              oldest: sql<Date>`min(created_at)`,
              newest: sql<Date>`max(created_at)`
            })
            .from(moderationCases)
            .where(lt(moderationCases.createdAt, cutoffDate));
          
          recordCount = cases[0]?.count || 0;
          oldestRecord = cases[0]?.oldest || null;
          newestRecord = cases[0]?.newest || null;
          break;

        case 'content_reports':
          const reports = await db
            .select({
              count: sql<number>`count(*)`,
              oldest: sql<Date>`min(created_at)`,
              newest: sql<Date>`max(created_at)`
            })
            .from(contentReports)
            .where(lt(contentReports.createdAt, cutoffDate));
          
          recordCount = reports[0]?.count || 0;
          oldestRecord = reports[0]?.oldest || null;
          newestRecord = reports[0]?.newest || null;
          break;

        case 'moderation_actions':
          const actions = await db
            .select({
              count: sql<number>`count(*)`,
              oldest: sql<Date>`min(created_at)`,
              newest: sql<Date>`max(created_at)`
            })
            .from(moderationActions)
            .where(lt(moderationActions.createdAt, cutoffDate));
          
          recordCount = actions[0]?.count || 0;
          oldestRecord = actions[0]?.oldest || null;
          newestRecord = actions[0]?.newest || null;
          break;

        case 'moderation_appeals':
          const appeals = await db
            .select({
              count: sql<number>`count(*)`,
              oldest: sql<Date>`min(created_at)`,
              newest: sql<Date>`max(created_at)`
            })
            .from(moderationAppeals)
            .where(lt(moderationAppeals.createdAt, cutoffDate));
          
          recordCount = appeals[0]?.count || 0;
          oldestRecord = appeals[0]?.oldest || null;
          newestRecord = appeals[0]?.newest || null;
          break;
      }
    } catch (error) {
      throw new Error(`Failed to count records for policy ${policyId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      policy,
      recordCount,
      oldestRecord,
      newestRecord
    };
  }

  /**
   * Create or update retention policy
   */
  updateRetentionPolicy(policy: RetentionPolicy): void {
    const existingIndex = this.retentionPolicies.findIndex(p => p.id === policy.id);
    if (existingIndex >= 0) {
      this.retentionPolicies[existingIndex] = policy;
    } else {
      this.retentionPolicies.push(policy);
    }
  }

  /**
   * Get retention policy for specific data type and region
   */
  getApplicablePolicy(dataType: string, region?: string): RetentionPolicy | null {
    // First try to find region-specific policy
    if (region) {
      const regionPolicy = this.retentionPolicies.find(p => 
        p.dataType === dataType && 
        p.region === region && 
        p.active
      );
      if (regionPolicy) return regionPolicy;
    }

    // Fall back to global policy
    return this.retentionPolicies.find(p => 
      p.dataType === dataType && 
      !p.region && 
      p.active
    ) || null;
  }

  /**
   * Get all retention policies
   */
  getAllPolicies(): RetentionPolicy[] {
    return [...this.retentionPolicies];
  }

  /**
   * Get retention audit logs
   */
  getAuditLogs(limit: number = 100): RetentionAuditLog[] {
    return this.auditLogs
      .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime())
      .slice(0, limit);
  }

  private async executePolicyCleanup(
    policy: RetentionPolicy,
    dryRun: boolean
  ): Promise<DataCleanupResult> {
    const result: DataCleanupResult = {
      recordsProcessed: 0,
      recordsDeleted: 0,
      recordsArchived: 0,
      errors: [],
      executionTimeMs: 0
    };

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriodDays);

    try {
      switch (policy.dataType) {
        case 'moderation_cases':
          const casesResult = await this.cleanupModerationCases(policy, cutoffDate, dryRun);
          Object.assign(result, casesResult);
          break;

        case 'content_reports':
          const reportsResult = await this.cleanupContentReports(policy, cutoffDate, dryRun);
          Object.assign(result, reportsResult);
          break;

        case 'moderation_actions':
          const actionsResult = await this.cleanupModerationActions(policy, cutoffDate, dryRun);
          Object.assign(result, actionsResult);
          break;

        case 'moderation_appeals':
          const appealsResult = await this.cleanupModerationAppeals(policy, cutoffDate, dryRun);
          Object.assign(result, appealsResult);
          break;

        default:
          result.errors.push(`Unknown data type: ${policy.dataType}`);
      }
    } catch (error) {
      result.errors.push(`Policy execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  private async cleanupModerationCases(
    policy: RetentionPolicy,
    cutoffDate: Date,
    dryRun: boolean
  ): Promise<Partial<DataCleanupResult>> {
    const records = await db
      .select()
      .from(moderationCases)
      .where(lt(moderationCases.createdAt, cutoffDate));

    if (dryRun) {
      return { recordsProcessed: records.length };
    }

    let deleted = 0;
    let archived = 0;

    for (const record of records) {
      try {
        if (policy.archiveBeforeDelete) {
          await this.archiveRecord('moderation_cases', record, policy.encryptArchive);
          archived++;
        }

        if (policy.autoDelete) {
          await db.delete(moderationCases).where(eq(moderationCases.id, record.id));
          deleted++;
        }
      } catch (error) {
        // Continue with other records even if one fails
        safeLogger.error(`Failed to process moderation case ${record.id}:`, error);
      }
    }

    return {
      recordsProcessed: records.length,
      recordsDeleted: deleted,
      recordsArchived: archived
    };
  }

  private async cleanupContentReports(
    policy: RetentionPolicy,
    cutoffDate: Date,
    dryRun: boolean
  ): Promise<Partial<DataCleanupResult>> {
    const records = await db
      .select()
      .from(contentReports)
      .where(lt(contentReports.createdAt, cutoffDate));

    if (dryRun) {
      return { recordsProcessed: records.length };
    }

    let deleted = 0;
    let archived = 0;

    for (const record of records) {
      try {
        if (policy.archiveBeforeDelete) {
          await this.archiveRecord('content_reports', record, policy.encryptArchive);
          archived++;
        }

        if (policy.autoDelete) {
          await db.delete(contentReports).where(eq(contentReports.id, record.id));
          deleted++;
        }
      } catch (error) {
        safeLogger.error(`Failed to process content report ${record.id}:`, error);
      }
    }

    return {
      recordsProcessed: records.length,
      recordsDeleted: deleted,
      recordsArchived: archived
    };
  }

  private async cleanupModerationActions(
    policy: RetentionPolicy,
    cutoffDate: Date,
    dryRun: boolean
  ): Promise<Partial<DataCleanupResult>> {
    const records = await db
      .select()
      .from(moderationActions)
      .where(lt(moderationActions.createdAt, cutoffDate));

    if (dryRun) {
      return { recordsProcessed: records.length };
    }

    let deleted = 0;
    let archived = 0;

    for (const record of records) {
      try {
        if (policy.archiveBeforeDelete) {
          await this.archiveRecord('moderation_actions', record, policy.encryptArchive);
          archived++;
        }

        if (policy.autoDelete) {
          await db.delete(moderationActions).where(eq(moderationActions.id, record.id));
          deleted++;
        }
      } catch (error) {
        safeLogger.error(`Failed to process moderation action ${record.id}:`, error);
      }
    }

    return {
      recordsProcessed: records.length,
      recordsDeleted: deleted,
      recordsArchived: archived
    };
  }

  private async cleanupModerationAppeals(
    policy: RetentionPolicy,
    cutoffDate: Date,
    dryRun: boolean
  ): Promise<Partial<DataCleanupResult>> {
    const records = await db
      .select()
      .from(moderationAppeals)
      .where(lt(moderationAppeals.createdAt, cutoffDate));

    if (dryRun) {
      return { recordsProcessed: records.length };
    }

    let deleted = 0;
    let archived = 0;

    for (const record of records) {
      try {
        if (policy.archiveBeforeDelete) {
          await this.archiveRecord('moderation_appeals', record, policy.encryptArchive);
          archived++;
        }

        if (policy.autoDelete) {
          await db.delete(moderationAppeals).where(eq(moderationAppeals.id, record.id));
          deleted++;
        }
      } catch (error) {
        safeLogger.error(`Failed to process moderation appeal ${record.id}:`, error);
      }
    }

    return {
      recordsProcessed: records.length,
      recordsDeleted: deleted,
      recordsArchived: archived
    };
  }

  private async archiveRecord(
    tableName: string,
    record: any,
    encrypt: boolean
  ): Promise<void> {
    // In a real implementation, this would store to cold storage (S3 Glacier, etc.)
    // For now, we'll simulate archiving by logging
    const archiveData = {
      tableName,
      record,
      archivedAt: new Date(),
      encrypted: encrypt
    };

    // TODO: Implement actual archiving to cold storage
    safeLogger.info(`Archiving ${tableName} record ${record.id}:`, archiveData);
  }

  private async logRetentionAction(log: RetentionAuditLog): Promise<void> {
    this.auditLogs.push(log);
    
    // Keep only last 1000 audit logs in memory
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-1000);
    }

    // TODO: Persist audit logs to database
    safeLogger.info('Retention action logged:', log);
  }
}

export const dataRetentionService = new DataRetentionService();
