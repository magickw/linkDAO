import { EventEmitter } from 'events';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { 
  adminAuditLog, 
  users,
  admin_sessions
} from '../db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// Security Audit Event Interface
export interface SecurityAuditEvent {
  id?: string;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent?: string;
  actionType: string;
  resourceType: string;
  resourceId?: string;
  actionCategory: 'read' | 'write' | 'approve' | 'reject' | 'export' | 'configure';
  beforeState?: any;
  afterState?: any;
  changes?: Record<string, any>;
  reason?: string;
  justification?: string;
  riskScore: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  outcome: 'success' | 'failure' | 'partial';
  complianceFlags: string[];
  requiresApproval?: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  metadata?: Record<string, any>;
}

// Audit Query Interface
export interface AuditQuery {
  userId?: string;
  sessionId?: string;
  actionType?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  severity?: string;
  outcome?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'timestamp' | 'riskScore' | 'severity';
  sortOrder?: 'asc' | 'desc';
}

// Compliance Rule Interface
export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  conditions: Record<string, any>;
  actions: string[];
  retentionPeriod: number; // in days
  createdAt: Date;
  updatedAt: Date;
}

// Retention Policy Interface
export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  category: string;
  retentionPeriod: number; // in days
  appliesTo: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Security Incident Interface
export interface SecurityIncident {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  description: string;
  affectedSystems: string[];
  indicators: string[];
  status: 'detected' | 'investigating' | 'resolved' | 'closed';
  actionsTaken: string[];
  timeline: {
    timestamp: Date;
    eventType: string;
    description: string;
    source: string;
    severity: string;
  }[];
  assignedTo?: string;
  resolutionNotes?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Tamper Detection Interface
export interface TamperDetectionRecord {
  id: string;
  timestamp: Date;
  resourceType: string;
  resourceId: string;
  expectedHash: string;
  actualHash: string;
  discrepancy: string;
  detectedBy: string;
  resolved: boolean;
  resolutionNotes?: string;
  resolvedAt?: Date;
}

export class SecurityAuditService extends EventEmitter {
  private complianceRules: Map<string, ComplianceRule> = new Map();
  private retentionPolicies: Map<string, RetentionPolicy> = new Map();
  private incidents: Map<string, SecurityIncident> = new Map();
  private tamperRecords: Map<string, TamperDetectionRecord> = new Map();
  private isInitialized = false;

  constructor() {
    super();
    this.setupDefaultComplianceRules();
    this.setupDefaultRetentionPolicies();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadComplianceRules();
      await this.loadRetentionPolicies();
      this.isInitialized = true;
      this.emit('initialized');
      safeLogger.info('Security audit service initialized');
    } catch (error) {
      safeLogger.error('Failed to initialize security audit service:', error);
      throw error;
    }
  }

  // Setup default compliance rules
  private setupDefaultComplianceRules(): void {
    // GDPR compliance rule
    this.complianceRules.set('gdpr_data_access', {
      id: 'gdpr_data_access',
      name: 'GDPR Data Access Logging',
      description: 'Log all personal data access for GDPR compliance',
      category: 'privacy',
      enabled: true,
      conditions: {
        resourceTypes: ['user_profile', 'personal_data'],
        actions: ['view', 'export']
      },
      actions: ['log_access', 'notify_privacy_officer'],
      retentionPeriod: 3650, // 10 years
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // SOX compliance rule
    this.complianceRules.set('sox_admin_actions', {
      id: 'sox_admin_actions',
      name: 'SOX Administrative Actions',
      description: 'Log all administrative actions for SOX compliance',
      category: 'financial',
      enabled: true,
      conditions: {
        resourceTypes: ['financial_data', 'admin_settings'],
        actions: ['modify', 'delete', 'approve']
      },
      actions: ['log_action', 'require_justification'],
      retentionPeriod: 2555, // 7 years
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Setup default retention policies
  private setupDefaultRetentionPolicies(): void {
    // General audit log retention
    this.retentionPolicies.set('general_audit', {
      id: 'general_audit',
      name: 'General Audit Logs',
      description: 'Standard retention for general audit logs',
      category: 'general',
      retentionPeriod: 365, // 1 year
      appliesTo: ['authentication', 'authorization', 'data_access'],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Security incident retention
    this.retentionPolicies.set('security_incidents', {
      id: 'security_incidents',
      name: 'Security Incidents',
      description: 'Extended retention for security incidents',
      category: 'security',
      retentionPeriod: 1825, // 5 years
      appliesTo: ['security_event', 'incident'],
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Load compliance rules from database
  private async loadComplianceRules(): Promise<void> {
    // In a real implementation, this would load from database
    safeLogger.info('Loading compliance rules from database');
  }

  // Load retention policies from database
  private async loadRetentionPolicies(): Promise<void> {
    // In a real implementation, this would load from database
    safeLogger.info('Loading retention policies from database');
  }

  // Log a security audit event
  async logSecurityEvent(event: Omit<SecurityAuditEvent, 'id' | 'timestamp'>): Promise<string> {
    try {
      const auditEvent: SecurityAuditEvent = {
        ...event,
        id: uuidv4(),
        timestamp: new Date()
      };

      // Apply compliance rules
      await this.applyComplianceRules(auditEvent);

      // Store in database
      await db.insert(adminAuditLog).values({
        id: auditEvent.id,
        adminId: auditEvent.userId || 'system',
        adminEmail: '', // Would be populated from user lookup
        adminRole: 'system',
        actionType: auditEvent.actionType,
        actionCategory: auditEvent.actionCategory,
        entityType: auditEvent.resourceType,
        entityId: auditEvent.resourceId,
        beforeState: auditEvent.beforeState ? JSON.stringify(auditEvent.beforeState) : null,
        afterState: auditEvent.afterState ? JSON.stringify(auditEvent.afterState) : null,
        changes: auditEvent.changes ? JSON.stringify(auditEvent.changes) : null,
        reason: auditEvent.reason,
        justification: auditEvent.justification,
        ipAddress: auditEvent.ipAddress,
        userAgent: auditEvent.userAgent,
        sessionId: auditEvent.sessionId,
        requiresApproval: auditEvent.requiresApproval || false,
        approvedBy: auditEvent.approvedBy,
        approvedAt: auditEvent.approvedAt,
        timestamp: auditEvent.timestamp
      });

      this.emit('securityEventLogged', auditEvent);
      safeLogger.info('Security event logged', { eventId: auditEvent.id, actionType: auditEvent.actionType });

      return auditEvent.id!;
    } catch (error) {
      safeLogger.error('Error logging security event:', error);
      throw new Error('Failed to log security event');
    }
  }

  // Apply compliance rules to an event
  private async applyComplianceRules(event: SecurityAuditEvent): Promise<void> {
    for (const rule of this.complianceRules.values()) {
      if (!rule.enabled) continue;

      const matchesResourceType = rule.conditions.resourceTypes?.includes(event.resourceType);
      const matchesAction = rule.conditions.actions?.includes(event.actionType);

      if (matchesResourceType && matchesAction) {
        // Apply rule actions
        for (const action of rule.actions) {
          switch (action) {
            case 'log_access':
              safeLogger.info('GDPR compliance: Data access logged', {
                userId: event.userId,
                resourceType: event.resourceType,
                resourceId: event.resourceId
              });
              break;
            case 'notify_privacy_officer':
              // In a real implementation, this would send a notification
              safeLogger.info('GDPR compliance: Notifying privacy officer');
              break;
            case 'require_justification':
              if (!event.justification) {
                safeLogger.warn('SOX compliance: Justification required for administrative action', {
                  actionType: event.actionType,
                  resourceType: event.resourceType
                });
              }
              break;
          }
        }
      }
    }
  }

  // Query audit events
  async queryAuditEvents(query: AuditQuery): Promise<SecurityAuditEvent[]> {
    try {
      let dbQuery = db.select().from(adminAuditLog);

      // Apply filters
      const conditions = [];
      
      if (query.userId) {
        conditions.push(eq(adminAuditLog.adminId, query.userId));
      }
      
      if (query.actionType) {
        conditions.push(eq(adminAuditLog.actionType, query.actionType));
      }
      
      if (query.resourceType) {
        conditions.push(eq(adminAuditLog.entityType, query.resourceType));
      }
      
      if (query.resourceId) {
        conditions.push(eq(adminAuditLog.entityId, query.resourceId));
      }
      
      if (query.startDate && query.endDate) {
        conditions.push(and(
          gte(adminAuditLog.timestamp, query.startDate),
          lte(adminAuditLog.timestamp, query.endDate)
        ));
      } else if (query.startDate) {
        conditions.push(gte(adminAuditLog.timestamp, query.startDate));
      } else if (query.endDate) {
        conditions.push(lte(adminAuditLog.timestamp, query.endDate));
      }

      if (conditions.length > 0) {
        dbQuery = dbQuery.where(and(...conditions));
      }

      // Apply ordering
      if (query.orderBy === 'timestamp') {
        dbQuery = query.sortOrder === 'desc' 
          ? dbQuery.orderBy(desc(adminAuditLog.timestamp))
          : dbQuery.orderBy(adminAuditLog.timestamp);
      }

      // Apply limit and offset
      if (query.limit) {
        dbQuery = dbQuery.limit(query.limit);
      }
      
      if (query.offset) {
        dbQuery = dbQuery.offset(query.offset);
      }

      const results = await dbQuery;
      
      // Transform to SecurityAuditEvent format
      return results.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        userId: row.adminId,
        sessionId: row.sessionId || undefined,
        ipAddress: row.ipAddress || '',
        userAgent: row.userAgent || undefined,
        actionType: row.actionType,
        resourceType: row.entityType,
        resourceId: row.entityId || undefined,
        actionCategory: row.actionCategory as any,
        beforeState: row.beforeState ? JSON.parse(row.beforeState) : undefined,
        afterState: row.afterState ? JSON.parse(row.afterState) : undefined,
        changes: row.changes ? JSON.parse(row.changes) : undefined,
        reason: row.reason || undefined,
        justification: row.justification || undefined,
        riskScore: 0, // Would be calculated based on event properties
        severity: 'low', // Would be determined based on event properties
        outcome: 'success', // Would be determined based on event properties
        complianceFlags: [], // Would be populated based on compliance rules
        requiresApproval: row.requiresApproval || undefined,
        approvedBy: row.approvedBy || undefined,
        approvedAt: row.approvedAt || undefined,
        metadata: {} // Would be populated with additional metadata
      }));
    } catch (error) {
      safeLogger.error('Error querying audit events:', error);
      throw new Error('Failed to query audit events');
    }
  }

  // Log authentication event
  async logAuthenticationEvent(
    userId: string,
    action: string,
    outcome: 'success' | 'failure',
    ipAddress: string,
    details: Record<string, any> = {},
    userAgent?: string
  ): Promise<string> {
    return this.logSecurityEvent({
      userId,
      ipAddress,
      userAgent,
      actionType: action,
      resourceType: 'authentication',
      actionCategory: action.includes('login') ? 'read' : 'write',
      outcome,
      details,
      riskScore: action === 'login_failure' ? 5 : 1,
      severity: action === 'login_failure' ? 'medium' : 'low',
      complianceFlags: ['GDPR'],
      metadata: details
    });
  }

  // Log data access event
  async logDataAccessEvent(
    userId: string,
    resource: string,
    action: string,
    outcome: 'success' | 'failure',
    details: Record<string, any> = {}
  ): Promise<string> {
    return this.logSecurityEvent({
      userId,
      ipAddress: details.ipAddress || 'unknown',
      actionType: action,
      resourceType: resource,
      actionCategory: 'read',
      outcome,
      details,
      riskScore: 3,
      severity: 'low',
      complianceFlags: ['GDPR'],
      metadata: details
    });
  }

  // Log admin action
  async logAdminAction(
    adminUserId: string,
    action: string,
    targetResource: string,
    outcome: 'success' | 'failure',
    ipAddress: string,
    details: Record<string, any> = {}
  ): Promise<string> {
    return this.logSecurityEvent({
      userId: adminUserId,
      ipAddress,
      actionType: action,
      resourceType: targetResource,
      actionCategory: this.getActionCategory(action),
      outcome,
      details,
      riskScore: this.calculateAdminActionRisk(action, outcome),
      severity: outcome === 'failure' ? 'error' : 'warning',
      complianceFlags: ['SOX', 'ISO27001'],
      justification: details.justification,
      beforeState: details.beforeState,
      afterState: details.afterState,
      changes: details.changes
    });
  }

  // Get action category based on action type
  private getActionCategory(action: string): 'read' | 'write' | 'approve' | 'reject' | 'export' | 'configure' {
    if (action.includes('view') || action.includes('read')) return 'read';
    if (action.includes('create') || action.includes('update') || action.includes('modify')) return 'write';
    if (action.includes('approve')) return 'approve';
    if (action.includes('reject')) return 'reject';
    if (action.includes('export')) return 'export';
    if (action.includes('configure') || action.includes('setting')) return 'configure';
    return 'write';
  }

  // Calculate risk score for admin actions
  private calculateAdminActionRisk(action: string, outcome: string): number {
    let baseScore = 1;
    
    // Increase score based on action type
    if (action.includes('delete')) baseScore += 3;
    if (action.includes('approve')) baseScore += 2;
    if (action.includes('modify')) baseScore += 1;
    if (action.includes('export')) baseScore += 2;
    
    // Increase score for failures
    if (outcome === 'failure') baseScore += 2;
    
    return Math.min(baseScore, 10);
  }

  // Log security incident
  async logSecurityIncident(
    incidentType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    ipAddress: string,
    details: Record<string, any>,
    threatIndicators: string[] = []
  ): Promise<string> {
    return this.logSecurityEvent({
      ipAddress,
      actionType: 'incident_detected',
      resourceType: 'security_system',
      actionCategory: 'write',
      outcome: 'success',
      details,
      riskScore: this.mapSeverityToRiskScore(severity),
      severity,
      complianceFlags: ['ISO27001'],
      threatIndicators
    });
  }

  // Map severity to risk score
  private mapSeverityToRiskScore(severity: string): number {
    switch (severity) {
      case 'critical': return 10;
      case 'high': return 7;
      case 'medium': return 4;
      case 'low': return 1;
      default: return 1;
    }
  }

  // Report a security incident
  async reportIncident(
    severity: SecurityIncident['severity'],
    category: string,
    title: string,
    description: string,
    affectedSystems: string[],
    indicators: string[]
  ): Promise<SecurityIncident> {
    const incidentId = uuidv4();
    
    const incident: SecurityIncident = {
      id: incidentId,
      timestamp: new Date(),
      severity,
      category,
      title,
      description,
      affectedSystems,
      indicators,
      status: 'detected',
      actionsTaken: [],
      timeline: [{
        timestamp: new Date(),
        eventType: 'INCIDENT_DETECTED',
        description: `Incident detected: ${title}`,
        source: 'SECURITY_SYSTEM',
        severity: 'CRITICAL'
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.incidents.set(incidentId, incident);

    safeLogger.error('Security incident reported', {
      incidentId,
      severity,
      category,
      title,
      affectedSystems
    });

    this.emit('incidentReported', incident);

    // Trigger automated response
    await this.triggerAutomatedResponse(incident);

    return incident;
  }

  // Trigger automated incident response
  private async triggerAutomatedResponse(incident: SecurityIncident): Promise<void> {
    try {
      // Log the incident
      await this.logSecurityIncident(
        incident.category,
        incident.severity,
        'system',
        {
          title: incident.title,
          description: incident.description,
          affectedSystems: incident.affectedSystems
        },
        incident.indicators
      );

      // Take actions based on severity
      switch (incident.severity) {
        case 'critical':
          await this.handleCriticalIncident(incident);
          break;
        case 'high':
          await this.handleHighIncident(incident);
          break;
        case 'medium':
          await this.handleMediumIncident(incident);
          break;
        case 'low':
          await this.handleLowIncident(incident);
          break;
      }
    } catch (error) {
      safeLogger.error('Error in automated incident response', { incidentId: incident.id, error });
    }
  }

  // Handle critical incident
  private async handleCriticalIncident(incident: SecurityIncident): Promise<void> {
    safeLogger.error('CRITICAL SECURITY INCIDENT', { incident });
    
    // Immediate actions for critical incidents
    // In a real implementation, this would:
    // 1. Notify security team immediately
    // 2. Block affected systems
    // 3. Preserve evidence
    // 4. Initiate emergency response procedures
  }

  // Handle high incident
  private async handleHighIncident(incident: SecurityIncident): Promise<void> {
    safeLogger.warn('HIGH SECURITY INCIDENT', { incident });
    
    // Enhanced monitoring and notification
    // In a real implementation, this would:
    // 1. Notify security team urgently
    // 2. Increase monitoring
    // 3. Begin investigation
  }

  // Handle medium incident
  private async handleMediumIncident(incident: SecurityIncident): Promise<void> {
    safeLogger.warn('MEDIUM SECURITY INCIDENT', { incident });
    
    // Standard notification
    // In a real implementation, this would:
    // 1. Log for review
    // 2. Notify appropriate team members
  }

  // Handle low incident
  private async handleLowIncident(incident: SecurityIncident): Promise<void> {
    safeLogger.info('LOW SECURITY INCIDENT', { incident });
    
    // Log for review
  }

  // Record tamper detection
  async recordTamperDetection(
    resourceType: string,
    resourceId: string,
    expectedHash: string,
    actualHash: string,
    detectedBy: string,
    discrepancy: string
  ): Promise<TamperDetectionRecord> {
    const recordId = uuidv4();
    
    const tamperRecord: TamperDetectionRecord = {
      id: recordId,
      timestamp: new Date(),
      resourceType,
      resourceId,
      expectedHash,
      actualHash,
      discrepancy,
      detectedBy,
      resolved: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tamperRecords.set(recordId, tamperRecord);

    safeLogger.warn('Tamper detection recorded', {
      recordId,
      resourceType,
      resourceId,
      discrepancy
    });

    this.emit('tamperDetected', tamperRecord);

    return tamperRecord;
  }

  // Resolve tamper detection
  async resolveTamperDetection(
    recordId: string,
    resolutionNotes: string,
    resolvedBy: string
  ): Promise<boolean> {
    const record = this.tamperRecords.get(recordId);
    if (!record) {
      return false;
    }

    record.resolved = true;
    record.resolutionNotes = resolutionNotes;
    record.resolvedAt = new Date();
    record.updatedAt = new Date();

    this.tamperRecords.set(recordId, record);

    safeLogger.info('Tamper detection resolved', {
      recordId,
      resolvedBy,
      resolutionNotes
    });

    this.emit('tamperResolved', record);

    return true;
  }

  // Generate audit report
  async generateAuditReport(
    startDate: Date,
    endDate: Date,
    filters?: {
      userId?: string;
      actionTypes?: string[];
      severityLevels?: string[];
    }
  ): Promise<any> {
    try {
      // Query audit events for the report period
      const query: AuditQuery = {
        startDate,
        endDate,
        userId: filters?.userId,
        limit: 10000 // Maximum records for report
      };

      const events = await this.queryAuditEvents(query);

      // Filter by action types and severity if specified
      let filteredEvents = events;
      if (filters?.actionTypes) {
        filteredEvents = filteredEvents.filter(event => 
          filters.actionTypes!.includes(event.actionType)
        );
      }
      
      if (filters?.severityLevels) {
        filteredEvents = filteredEvents.filter(event => 
          filters.severityLevels!.includes(event.severity)
        );
      }

      // Generate report statistics
      const report = {
        period: {
          start: startDate,
          end: endDate
        },
        summary: {
          totalEvents: filteredEvents.length,
          byActionType: this.groupBy(filteredEvents, 'actionType'),
          byResourceType: this.groupBy(filteredEvents, 'resourceType'),
          bySeverity: this.groupBy(filteredEvents, 'severity'),
          byUser: this.groupBy(filteredEvents, 'userId')
        },
        events: filteredEvents,
        compliance: {
          gdprEvents: filteredEvents.filter(e => e.complianceFlags.includes('GDPR')).length,
          soxEvents: filteredEvents.filter(e => e.complianceFlags.includes('SOX')).length,
          isoEvents: filteredEvents.filter(e => e.complianceFlags.includes('ISO27001')).length
        },
        incidents: Array.from(this.incidents.values()).filter(incident => 
          incident.timestamp >= startDate && incident.timestamp <= endDate
        ),
        tamperRecords: Array.from(this.tamperRecords.values()).filter(record => 
          record.timestamp >= startDate && record.timestamp <= endDate
        )
      };

      return report;
    } catch (error) {
      safeLogger.error('Error generating audit report:', error);
      throw new Error('Failed to generate audit report');
    }
  }

  // Helper function to group array by property
  private groupBy<T>(array: T[], property: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const key = (item as any)[property] || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  // Get incident by ID
  getIncident(incidentId: string): SecurityIncident | undefined {
    return this.incidents.get(incidentId);
  }

  // Get all incidents
  getAllIncidents(): SecurityIncident[] {
    return Array.from(this.incidents.values());
  }

  // Update incident status
  async updateIncidentStatus(
    incidentId: string,
    status: SecurityIncident['status'],
    updatedBy: string
  ): Promise<boolean> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      return false;
    }

    incident.status = status;
    incident.updatedAt = new Date();
    incident.assignedTo = updatedBy;

    // Add to timeline
    incident.timeline.push({
      timestamp: new Date(),
      eventType: 'STATUS_UPDATE',
      description: `Incident status updated to ${status}`,
      source: updatedBy,
      severity: 'INFO'
    });

    this.incidents.set(incidentId, incident);
    this.emit('incidentUpdated', incident);

    return true;
  }
}

// Export singleton instance
export const securityAuditService = new SecurityAuditService();