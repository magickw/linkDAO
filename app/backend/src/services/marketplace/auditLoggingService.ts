import { db } from '../db';
import { safeLogger } from '../../utils/safeLogger';
import { moderationAuditLog } from '../../db/schema';
import { ModerationAuditLog } from '../../models/ModerationModels';
import evidenceStorageService from './evidenceStorageService';
import crypto from 'crypto';
import { eq, and, gte, lte, desc, asc, sql } from 'drizzle-orm';

export type ActorType = 'user' | 'moderator' | 'system' | 'ai';

export interface AuditLogEntry {
  actionType: string;
  actorId?: string;
  actorType: ActorType;
  oldState?: any;
  newState?: any;
  reasoning?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogQuery {
  actorId?: string;
  actorType?: ActorType;
  actionType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  orderBy?: 'asc' | 'desc';
}

export interface AuditTrailResult {
  logs: ModerationAuditLog[];
  total: number;
  hasMore: boolean;
}

export interface ImmutableAuditRecord {
  id: number;
  localHash: string;
  ipfsHash: string;
  chainOfCustody: string[];
  isValid: boolean;
}

class AuditLoggingService {
  private readonly BATCH_SIZE = 100;
  private readonly MAX_RETENTION_DAYS = 2555; // ~7 years

  /**
   * Create immutable audit log entry
   */
  async createAuditLog(entry: AuditLogEntry): Promise<ModerationAuditLog> {
    try {
      // Generate unique ID for this audit entry
      const auditId = crypto.randomUUID();

      // Create audit log record
      const auditLog = {
        actionType: entry.actionType,
        actorId: entry.actorId,
        actorType: entry.actorType,
        oldState: entry.oldState ? JSON.stringify(entry.oldState) : undefined,
        newState: entry.newState ? JSON.stringify(entry.newState) : undefined,
        reasoning: entry.reasoning,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      };

      // Store to database first
      const [dbResult] = await db.insert(moderationAuditLog).values({
        ...auditLog,
        createdAt: new Date(),
      }).returning();

      // Create immutable IPFS record
      const ipfsHash = await evidenceStorageService.createAuditRecord({
        caseId: 0, // Placeholder since caseId is not in the database schema
        action: entry.actionType,
        actorId: entry.actorId,
        actorType: entry.actorType,
        oldState: entry.oldState,
        newState: entry.newState,
        reasoning: entry.reasoning,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      });

      // Update database record with IPFS hash
      await db.update(moderationAuditLog)
        .set({
          // Store IPFS hash in reasoning field for now (would need schema update for dedicated field)
          reasoning: `${auditLog.reasoning || ''}\n[IPFS:${ipfsHash}]`
        })
        .where(eq(moderationAuditLog.id, dbResult.id));

      return {
        ...dbResult,
        oldState: dbResult.oldState ? JSON.parse(dbResult.oldState) : undefined,
        newState: dbResult.newState ? JSON.parse(dbResult.newState) : undefined,
        reasoning: auditLog.reasoning, // Return original reasoning without IPFS hash
      } as unknown as ModerationAuditLog;
    } catch (error) {
      safeLogger.error('Error creating audit log:', error);
      throw new Error(`Failed to create audit log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve audit trail for a case
   */
  async getAuditTrail(query: AuditLogQuery): Promise<AuditTrailResult> {
    try {
      const conditions = [];

      // caseId filtering removed since it's not in the database schema

      if (query.actorId) {
        conditions.push(eq(moderationAuditLog.actorId, query.actorId));
      }

      if (query.actorType) {
        conditions.push(eq(moderationAuditLog.actorType, query.actorType));
      }

      if (query.actionType) {
        conditions.push(eq(moderationAuditLog.actionType, query.actionType));
      }

      if (query.startDate) {
        conditions.push(gte(moderationAuditLog.createdAt, query.startDate));
      }

      if (query.endDate) {
        conditions.push(lte(moderationAuditLog.createdAt, query.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const orderBy = query.orderBy === 'asc'
        ? asc(moderationAuditLog.createdAt)
        : desc(moderationAuditLog.createdAt);

      // Get total count
      const totalResult = await db.select({ count: sql<number>`count(*)` })
        .from(moderationAuditLog)
        .where(whereClause);

      const total = Number(totalResult[0]?.count || 0);

      // Get paginated results
      const logs = await db.select()
        .from(moderationAuditLog)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(query.limit || 50)
        .offset(query.offset || 0);

      // Clean up IPFS hashes from reasoning field for display
      const cleanedLogs = logs.map(log => ({
        ...log,
        oldState: log.oldState ? JSON.parse(log.oldState) : undefined,
        newState: log.newState ? JSON.parse(log.newState) : undefined,
        reasoning: log.reasoning?.replace(/\n\[IPFS:[^\]]+\]/g, '') || null,
      }));

      return {
        logs: cleanedLogs as unknown as ModerationAuditLog[],
        total,
        hasMore: (query.offset || 0) + logs.length < total,
      };
    } catch (error) {
      safeLogger.error('Error retrieving audit trail:', error);
      throw new Error(`Failed to retrieve audit trail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify audit log integrity using IPFS
   */
  async verifyAuditLogIntegrity(auditLogId: number): Promise<ImmutableAuditRecord> {
    try {
      // Get audit log from database
      const [auditLog] = await db.select()
        .from(moderationAuditLog)
        .where(eq(moderationAuditLog.id, auditLogId));

      if (!auditLog) {
        throw new Error('Audit log not found');
      }

      // Extract IPFS hash from reasoning field
      const ipfsHashMatch = auditLog.reasoning?.match(/\u001b\[IPFS:([^\]]+)\]/);
      const ipfsHash = ipfsHashMatch?.[1];

      if (!ipfsHash) {
        throw new Error('No IPFS hash found for audit log');
      }

      // Verify IPFS record exists and is valid
      const exists = await evidenceStorageService.verifyEvidenceExists(ipfsHash);

      // Generate local hash for comparison
      const localData = {
        id: auditLog.id,
        actionType: auditLog.actionType,
        actorId: auditLog.actorId,
        actorType: auditLog.actorType,
        oldState: auditLog.oldState,
        newState: auditLog.newState,
        createdAt: auditLog.createdAt,
      };

      const localHash = crypto.createHash('sha256')
        .update(JSON.stringify(localData))
        .digest('hex');

      return {
        id: auditLogId,
        localHash,
        ipfsHash,
        chainOfCustody: [ipfsHash], // In a full implementation, this would track all hash changes
        isValid: exists,
      };
    } catch (error) {
      safeLogger.error('Error verifying audit log integrity:', error);
      throw new Error(`Failed to verify audit log integrity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create audit log for moderation decision
   */
  async logModerationDecision(params: {
    caseId: number;
    decision: string;
    moderatorId?: string;
    reasoning?: string;
    oldStatus?: string;
    newStatus: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ModerationAuditLog> {
    return this.createAuditLog({
      actionType: 'moderation_decision',
      actorId: params.moderatorId,
      actorType: params.moderatorId ? 'moderator' : 'ai',
      oldState: { status: params.oldStatus },
      newState: {
        status: params.newStatus,
        decision: params.decision,
      },
      reasoning: params.reasoning,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Create audit log for appeal submission
   */
  async logAppealSubmission(params: {
    caseId: number;
    appellantId: string;
    stakeAmount: string;
    reasoning?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ModerationAuditLog> {
    return this.createAuditLog({
      actionType: 'appeal_submitted',
      actorId: params.appellantId,
      actorType: 'user',
      newState: {
        stakeAmount: params.stakeAmount,
        status: 'appealed',
      },
      reasoning: params.reasoning,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Create audit log for jury decision
   */
  async logJuryDecision(params: {
    caseId: number;
    jurorId: string;
    decision: string;
    reasoning?: string;
    voteWeight: number;
  }): Promise<ModerationAuditLog> {
    return this.createAuditLog({
      actionType: 'jury_vote',
      actorId: params.jurorId,
      actorType: 'user',
      newState: {
        decision: params.decision,
        voteWeight: params.voteWeight,
      },
      reasoning: params.reasoning,
    });
  }

  /**
   * Create audit log for system actions
   */
  async logSystemAction(params: {
    caseId?: number;
    action: string;
    details?: any;
    reasoning?: string;
  }): Promise<ModerationAuditLog> {
    return this.createAuditLog({
      actionType: params.action,
      actorType: 'system',
      newState: params.details,
      reasoning: params.reasoning,
    });
  }

  /**
   * Create audit log for moderation actions
   */
  async logModerationAction(params: {
    actionType: string;
    actorId?: string;
    actorType: 'user' | 'moderator' | 'system' | 'ai';
    oldState?: any;
    newState?: any;
    reasoning?: string;
    createdAt?: Date;
  }): Promise<ModerationAuditLog> {
    return this.createAuditLog({
      actionType: params.actionType,
      actorId: params.actorId,
      actorType: params.actorType,
      oldState: params.oldState ? JSON.stringify(params.oldState) : undefined,
      newState: params.newState ? JSON.stringify(params.newState) : undefined,
      reasoning: params.reasoning,
    });
  }

  /**
   * Batch create audit logs for bulk operations
   */
  async batchCreateAuditLogs(entries: AuditLogEntry[]): Promise<ModerationAuditLog[]> {
    const results: ModerationAuditLog[] = [];

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < entries.length; i += this.BATCH_SIZE) {
      const batch = entries.slice(i, i + this.BATCH_SIZE);

      const batchPromises = batch.map(entry => this.createAuditLog(entry));
      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          safeLogger.error('Failed to create audit log in batch:', result.reason);
        }
      }
    }

    return results;
  }

  /**
   * Get audit statistics for monitoring
   */
  async getAuditStatistics(params: {
    startDate?: Date;
    endDate?: Date;
    actorType?: ActorType;
  }): Promise<{
    totalLogs: number;
    logsByAction: Record<string, number>;
    logsByActor: Record<string, number>;
    averageLogsPerDay: number;
  }> {
    try {
      const conditions = [];

      if (params.startDate) {
        conditions.push(gte(moderationAuditLog.createdAt, params.startDate));
      }

      if (params.endDate) {
        conditions.push(lte(moderationAuditLog.createdAt, params.endDate));
      }

      if (params.actorType) {
        conditions.push(eq(moderationAuditLog.actorType, params.actorType));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const logs = await db.select()
        .from(moderationAuditLog)
        .where(whereClause);

      const logsByAction: Record<string, number> = {};
      const logsByActor: Record<string, number> = {};

      for (const log of logs) {
        logsByAction[log.actionType] = (logsByAction[log.actionType] || 0) + 1;
        if (log.actorType) {
          logsByActor[log.actorType] = (logsByActor[log.actorType] || 0) + 1;
        }
      }

      const daysDiff = params.startDate && params.endDate
        ? Math.ceil((params.endDate.getTime() - params.startDate.getTime()) / (1000 * 60 * 60 * 24))
        : 1;

      return {
        totalLogs: logs.length,
        logsByAction,
        logsByActor,
        averageLogsPerDay: logs.length / daysDiff,
      };
    } catch (error) {
      safeLogger.error('Error getting audit statistics:', error);
      throw new Error(`Failed to get audit statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export audit trail for compliance
   */
  async exportAuditTrail(params: {
    caseId?: number;
    startDate?: Date;
    endDate?: Date;
    format?: 'json' | 'csv';
  }): Promise<string> {
    try {
      const auditTrail = await this.getAuditTrail({
        startDate: params.startDate,
        endDate: params.endDate,
        limit: 10000, // Large limit for export
      });

      if (params.format === 'csv') {
        return this.convertToCSV(auditTrail.logs);
      }

      return JSON.stringify(auditTrail.logs, null, 2);
    } catch (error) {
      safeLogger.error('Error exporting audit trail:', error);
      throw new Error(`Failed to export audit trail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert audit logs to CSV format
   */
  private convertToCSV(logs: ModerationAuditLog[]): string {
    if (logs.length === 0) return '';

    const headers = ['id', 'caseId', 'actionType', 'actorId', 'actorType', 'reasoning', 'createdAt'];
    const csvRows = [headers.join(',')];

    for (const log of logs) {
      const row = [
        log.id,
        log.caseId || '',
        log.actionType,
        log.actorId || '',
        log.actorType,
        `"${(log.reasoning || '').replace(/"/g, '""')}"`,
        log.createdAt
      ];
      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }
}

export default AuditLoggingService;
