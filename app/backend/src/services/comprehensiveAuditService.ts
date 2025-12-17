/**
 * Comprehensive Audit Service
 * 
 * Advanced audit logging and analysis system for detailed tracking
 * of all admin actions with visualization and search capabilities.
 */

import { EventEmitter } from 'events';
import { safeLogger } from '../utils/safeLogger';
import crypto from 'crypto';
import { securityConfig } from '../config/securityConfig';
import AuditLoggingService from './auditLoggingService';

const auditLoggingService = new AuditLoggingService();

export interface AuditEvent {
  id: string;
  timestamp: Date;
  actionType: string;
  actorId: string;
  actorType: 'user' | 'moderator' | 'system' | 'ai';
  resourceType: string;
  resourceId?: string;
  oldState?: Record<string, any>;
  newState?: Record<string, any>;
  details?: string; // Additional details about the event
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    requestId?: string;
    source: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    tags: string[];
  };
  outcome: 'success' | 'failure' | 'partial';
  errorDetails?: string;
  complianceFlags: string[];
  retentionPolicy: string;
}

export interface AuditSearchCriteria {
  startDate?: Date;
  endDate?: Date;
  actorId?: string;
  actionType?: string;
  resourceType?: string;
  severity?: string;
  category?: string;
  tags?: string[];
  outcome?: string;
  complianceFlags?: string[];
  textSearch?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditAnalytics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByActor: Record<string, number>;
  eventsByOutcome: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  eventsByCategory: Record<string, number>;
  timeSeriesData: Array<{
    timestamp: Date;
    count: number;
    severity: string;
  }>;
  topActors: Array<{
    actorId: string;
    eventCount: number;
    lastActivity: Date;
  }>;
  suspiciousPatterns: Array<{
    pattern: string;
    description: string;
    severity: string;
    occurrences: number;
  }>;
}

export interface AuditVisualization {
  type: 'timeline' | 'heatmap' | 'network' | 'treemap' | 'sankey';
  data: any;
  config: Record<string, any>;
  title: string;
  description: string;
}

export interface ComplianceReport {
  id: string;
  reportType: string;
  generatedAt: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalEvents: number;
    complianceScore: number;
    violations: number;
    recommendations: string[];
  };
  sections: Array<{
    title: string;
    content: any;
    complianceStatus: 'compliant' | 'non-compliant' | 'partial';
  }>;
  metadata: Record<string, any>;
}

class ComprehensiveAuditService extends EventEmitter {
  private auditEvents: Map<string, AuditEvent> = new Map();
  private searchIndex: Map<string, Set<string>> = new Map();
  private retentionPolicies: Map<string, number> = new Map();

  constructor() {
    super();
    this.initializeService();
  }

  /**
   * Initialize the audit service
   */
  private initializeService(): void {
    // Set up retention policies
    this.setupRetentionPolicies();

    // Set up periodic cleanup
    setInterval(() => {
      this.performRetentionCleanup();
    }, 24 * 60 * 60 * 1000); // Daily

    // Set up search index maintenance
    setInterval(() => {
      this.maintainSearchIndex();
    }, 60 * 60 * 1000); // Hourly

    safeLogger.info('Comprehensive audit service initialized');
  }

  /**
   * Record comprehensive audit event
   */
  async recordAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent> {
    const auditEvent: AuditEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    // Store in memory for fast access
    this.auditEvents.set(auditEvent.id, auditEvent);

    // Update search index
    this.updateSearchIndex(auditEvent);

    // Store in persistent audit log
    await auditLoggingService.createAuditLog({
      actionType: auditEvent.actionType,
      actorId: auditEvent.actorId,
      actorType: auditEvent.actorType,
      oldState: auditEvent.oldState,
      newState: auditEvent.newState,
      ipAddress: auditEvent.metadata.ipAddress,
      userAgent: auditEvent.metadata.userAgent,
      metadata: {
        resourceType: auditEvent.resourceType,
        resourceId: auditEvent.resourceId,
        sessionId: auditEvent.metadata.sessionId,
        ...auditEvent.metadata,
      },
    });

    // Emit event for real-time processing
    this.emit('auditEvent', auditEvent);

    // Check for compliance violations
    await this.checkComplianceViolations(auditEvent);

    // Analyze for suspicious patterns
    await this.analyzeSuspiciousPatterns(auditEvent);

    return auditEvent;
  }

  /**
   * Search audit events with advanced criteria
   */
  async searchAuditEvents(criteria: AuditSearchCriteria): Promise<{
    events: AuditEvent[];
    total: number;
    hasMore: boolean;
  }> {
    let events = Array.from(this.auditEvents.values());

    // Apply filters
    if (criteria.startDate) {
      events = events.filter(e => e.timestamp >= criteria.startDate!);
    }
    if (criteria.endDate) {
      events = events.filter(e => e.timestamp <= criteria.endDate!);
    }
    if (criteria.actorId) {
      events = events.filter(e => e.actorId === criteria.actorId);
    }
    if (criteria.actionType) {
      events = events.filter(e => e.actionType === criteria.actionType);
    }
    if (criteria.resourceType) {
      events = events.filter(e => e.resourceType === criteria.resourceType);
    }
    if (criteria.severity) {
      events = events.filter(e => e.metadata.severity === criteria.severity);
    }
    if (criteria.category) {
      events = events.filter(e => e.metadata.category === criteria.category);
    }
    if (criteria.outcome) {
      events = events.filter(e => e.outcome === criteria.outcome);
    }
    if (criteria.tags && criteria.tags.length > 0) {
      events = events.filter(e => 
        criteria.tags!.some(tag => e.metadata.tags.includes(tag))
      );
    }
    if (criteria.complianceFlags && criteria.complianceFlags.length > 0) {
      events = events.filter(e => 
        criteria.complianceFlags!.some(flag => e.complianceFlags.includes(flag))
      );
    }
    if (criteria.textSearch) {
      events = events.filter(e => this.matchesTextSearch(e, criteria.textSearch!));
    }

    // Sort events
    const sortBy = criteria.sortBy || 'timestamp';
    const sortOrder = criteria.sortOrder || 'desc';
    events.sort((a, b) => {
      const aValue = this.getEventValue(a, sortBy);
      const bValue = this.getEventValue(b, sortBy);
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    const total = events.length;
    const offset = criteria.offset || 0;
    const limit = criteria.limit || 100;
    
    const paginatedEvents = events.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      events: paginatedEvents,
      total,
      hasMore,
    };
  }

  /**
   * Generate audit trail visualization
   */
  async generateAuditVisualization(
    type: AuditVisualization['type'],
    criteria: AuditSearchCriteria
  ): Promise<AuditVisualization> {
    const { events } = await this.searchAuditEvents(criteria);

    switch (type) {
      case 'timeline':
        return this.generateTimelineVisualization(events);
      case 'heatmap':
        return this.generateHeatmapVisualization(events);
      case 'network':
        return this.generateNetworkVisualization(events);
      case 'treemap':
        return this.generateTreemapVisualization(events);
      case 'sankey':
        return this.generateSankeyVisualization(events);
      default:
        throw new Error(`Unsupported visualization type: ${type}`);
    }
  }

  /**
   * Generate audit analytics
   */
  async generateAuditAnalytics(criteria: AuditSearchCriteria): Promise<AuditAnalytics> {
    const { events } = await this.searchAuditEvents(criteria);

    const analytics: AuditAnalytics = {
      totalEvents: events.length,
      eventsByType: this.groupBy(events, 'actionType'),
      eventsByActor: this.groupBy(events, 'actorId'),
      eventsByOutcome: this.groupBy(events, 'outcome'),
      eventsBySeverity: this.groupBy(events, e => e.metadata.severity),
      eventsByCategory: this.groupBy(events, e => e.metadata.category),
      timeSeriesData: this.generateTimeSeriesData(events),
      topActors: this.getTopActors(events),
      suspiciousPatterns: await this.detectSuspiciousPatterns(events),
    };

    return analytics;
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    reportType: string,
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    const criteria: AuditSearchCriteria = {
      startDate,
      endDate,
      complianceFlags: this.getComplianceFlagsForReport(reportType),
    };

    const { events } = await this.searchAuditEvents(criteria);
    const analytics = await this.generateAuditAnalytics(criteria);

    const report: ComplianceReport = {
      id: crypto.randomUUID(),
      reportType,
      generatedAt: new Date(),
      period: { startDate, endDate },
      summary: {
        totalEvents: events.length,
        complianceScore: this.calculateComplianceScore(events),
        violations: this.countComplianceViolations(events),
        recommendations: this.generateComplianceRecommendations(events),
      },
      sections: await this.generateReportSections(reportType, events, analytics),
      metadata: {
        generatedBy: 'comprehensive-audit-service',
        version: '1.0.0',
        criteria,
      },
    };

    return report;
  }

  /**
   * Export audit data
   */
  async exportAuditData(
    criteria: AuditSearchCriteria,
    format: 'json' | 'csv' | 'xml'
  ): Promise<string> {
    const { events } = await this.searchAuditEvents(criteria);

    switch (format) {
      case 'json':
        return JSON.stringify(events, null, 2);
      case 'csv':
        return this.convertToCSV(events);
      case 'xml':
        return this.convertToXML(events);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Validate audit data integrity
   */
  async validateAuditIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
    checksPerformed: string[];
  }> {
    const issues: string[] = [];
    const checksPerformed: string[] = [];

    // Check for missing events
    checksPerformed.push('Missing events check');
    const missingEvents = await this.checkForMissingEvents();
    if (missingEvents.length > 0) {
      issues.push(`Found ${missingEvents.length} missing events in sequence`);
    }

    // Check for tampered events
    checksPerformed.push('Event tampering check');
    const tamperedEvents = await this.checkForTamperedEvents();
    if (tamperedEvents.length > 0) {
      issues.push(`Found ${tamperedEvents.length} potentially tampered events`);
    }

    // Check retention compliance
    checksPerformed.push('Retention compliance check');
    const retentionIssues = await this.checkRetentionCompliance();
    issues.push(...retentionIssues);

    // Check data consistency
    checksPerformed.push('Data consistency check');
    const consistencyIssues = await this.checkDataConsistency();
    issues.push(...consistencyIssues);

    return {
      isValid: issues.length === 0,
      issues,
      checksPerformed,
    };
  }

  // Private helper methods

  private setupRetentionPolicies(): void {
    this.retentionPolicies.set('security', 7 * 365 * 24 * 60 * 60 * 1000); // 7 years
    this.retentionPolicies.set('financial', 7 * 365 * 24 * 60 * 60 * 1000); // 7 years
    this.retentionPolicies.set('user_data', 3 * 365 * 24 * 60 * 60 * 1000); // 3 years
    this.retentionPolicies.set('system', 1 * 365 * 24 * 60 * 60 * 1000); // 1 year
    this.retentionPolicies.set('default', 2 * 365 * 24 * 60 * 60 * 1000); // 2 years
  }

  private updateSearchIndex(event: AuditEvent): void {
    // Index by action type
    this.addToIndex('actionType', event.actionType, event.id);
    
    // Index by actor
    this.addToIndex('actorId', event.actorId, event.id);
    
    // Index by resource type
    this.addToIndex('resourceType', event.resourceType, event.id);
    
    // Index by tags
    event.metadata.tags.forEach(tag => {
      this.addToIndex('tag', tag, event.id);
    });
    
    // Index by compliance flags
    event.complianceFlags.forEach(flag => {
      this.addToIndex('complianceFlag', flag, event.id);
    });
  }

  private addToIndex(indexType: string, value: string, eventId: string): void {
    const key = `${indexType}:${value}`;
    if (!this.searchIndex.has(key)) {
      this.searchIndex.set(key, new Set());
    }
    this.searchIndex.get(key)!.add(eventId);
  }

  private matchesTextSearch(event: AuditEvent, searchText: string): boolean {
    const searchLower = searchText.toLowerCase();
    
    return (
      event.actionType.toLowerCase().includes(searchLower) ||
      event.actorId.toLowerCase().includes(searchLower) ||
      event.resourceType.toLowerCase().includes(searchLower) ||
      (event.resourceId && event.resourceId.toLowerCase().includes(searchLower)) ||
      event.metadata.category.toLowerCase().includes(searchLower) ||
      event.metadata.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
      (event.errorDetails && event.errorDetails.toLowerCase().includes(searchLower))
    );
  }

  private getEventValue(event: AuditEvent, field: string): any {
    switch (field) {
      case 'timestamp':
        return event.timestamp;
      case 'actionType':
        return event.actionType;
      case 'actorId':
        return event.actorId;
      case 'severity':
        return event.metadata.severity;
      default:
        return event.timestamp;
    }
  }

  private groupBy<T>(items: T[], keyFn: string | ((item: T) => string)): Record<string, number> {
    return items.reduce((acc, item) => {
      const key = typeof keyFn === 'string' ? (item as any)[keyFn] : keyFn(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private generateTimeSeriesData(events: AuditEvent[]): Array<{
    timestamp: Date;
    count: number;
    severity: string;
  }> {
    const timeGroups = new Map<string, Map<string, number>>();
    
    events.forEach(event => {
      const hour = new Date(event.timestamp);
      hour.setMinutes(0, 0, 0);
      const hourKey = hour.toISOString();
      
      if (!timeGroups.has(hourKey)) {
        timeGroups.set(hourKey, new Map());
      }
      
      const severityMap = timeGroups.get(hourKey)!;
      const severity = event.metadata.severity;
      severityMap.set(severity, (severityMap.get(severity) || 0) + 1);
    });
    
    const result: Array<{ timestamp: Date; count: number; severity: string }> = [];
    
    timeGroups.forEach((severityMap, hourKey) => {
      severityMap.forEach((count, severity) => {
        result.push({
          timestamp: new Date(hourKey),
          count,
          severity,
        });
      });
    });
    
    return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private getTopActors(events: AuditEvent[]): Array<{
    actorId: string;
    eventCount: number;
    lastActivity: Date;
  }> {
    const actorStats = new Map<string, { count: number; lastActivity: Date }>();
    
    events.forEach(event => {
      const current = actorStats.get(event.actorId) || { count: 0, lastActivity: new Date(0) };
      actorStats.set(event.actorId, {
        count: current.count + 1,
        lastActivity: event.timestamp > current.lastActivity ? event.timestamp : current.lastActivity,
      });
    });
    
    return Array.from(actorStats.entries())
      .map(([actorId, stats]) => ({
        actorId,
        eventCount: stats.count,
        lastActivity: stats.lastActivity,
      }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);
  }

  private async detectSuspiciousPatterns(events: AuditEvent[]): Promise<Array<{
    pattern: string;
    description: string;
    severity: string;
    occurrences: number;
  }>> {
    const patterns: Array<{
      pattern: string;
      description: string;
      severity: string;
      occurrences: number;
    }> = [];

    // Detect rapid successive actions by same actor
    const actorActions = new Map<string, AuditEvent[]>();
    events.forEach(event => {
      if (!actorActions.has(event.actorId)) {
        actorActions.set(event.actorId, []);
      }
      actorActions.get(event.actorId)!.push(event);
    });

    actorActions.forEach((actorEvents, actorId) => {
      const sortedEvents = actorEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      let rapidActions = 0;
      
      for (let i = 1; i < sortedEvents.length; i++) {
        const timeDiff = sortedEvents[i].timestamp.getTime() - sortedEvents[i-1].timestamp.getTime();
        if (timeDiff < 1000) { // Less than 1 second apart
          rapidActions++;
        }
      }
      
      if (rapidActions > 10) {
        patterns.push({
          pattern: 'rapid_successive_actions',
          description: `Actor ${actorId} performed ${rapidActions} rapid successive actions`,
          severity: 'medium',
          occurrences: rapidActions,
        });
      }
    });

    // Detect unusual time patterns
    const hourCounts = new Map<number, number>();
    events.forEach(event => {
      const hour = event.timestamp.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    const offHoursActivity = (hourCounts.get(0) || 0) + (hourCounts.get(1) || 0) + 
                            (hourCounts.get(2) || 0) + (hourCounts.get(3) || 0) + 
                            (hourCounts.get(4) || 0) + (hourCounts.get(5) || 0);
    
    if (offHoursActivity > events.length * 0.2) {
      patterns.push({
        pattern: 'off_hours_activity',
        description: `High activity during off-hours (${offHoursActivity} events)`,
        severity: 'medium',
        occurrences: offHoursActivity,
      });
    }

    return patterns;
  }

  private generateTimelineVisualization(events: AuditEvent[]): AuditVisualization {
    const timelineData = events.map(event => ({
      id: event.id,
      timestamp: event.timestamp,
      actionType: event.actionType,
      actorId: event.actorId,
      severity: event.metadata.severity,
      outcome: event.outcome,
    }));

    return {
      type: 'timeline',
      data: timelineData,
      config: {
        xAxis: 'timestamp',
        yAxis: 'actionType',
        colorBy: 'severity',
        sizeBy: 'outcome',
      },
      title: 'Audit Event Timeline',
      description: 'Chronological view of audit events with severity and outcome indicators',
    };
  }

  private generateHeatmapVisualization(events: AuditEvent[]): AuditVisualization {
    const heatmapData = new Map<string, Map<string, number>>();
    
    events.forEach(event => {
      const hour = event.timestamp.getHours();
      const day = event.timestamp.getDay();
      const dayKey = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day];
      
      if (!heatmapData.has(dayKey)) {
        heatmapData.set(dayKey, new Map());
      }
      
      const hourMap = heatmapData.get(dayKey)!;
      hourMap.set(hour.toString(), (hourMap.get(hour.toString()) || 0) + 1);
    });

    return {
      type: 'heatmap',
      data: Array.from(heatmapData.entries()).map(([day, hours]) => ({
        day,
        hours: Object.fromEntries(hours),
      })),
      config: {
        xAxis: 'hour',
        yAxis: 'day',
        valueField: 'count',
      },
      title: 'Activity Heatmap',
      description: 'Distribution of audit events by day of week and hour',
    };
  }

  private generateNetworkVisualization(events: AuditEvent[]): AuditVisualization {
    const nodes = new Set<string>();
    const links: Array<{ source: string; target: string; weight: number }> = [];
    const linkMap = new Map<string, number>();

    events.forEach(event => {
      nodes.add(event.actorId);
      if (event.resourceId) {
        nodes.add(event.resourceId);
        
        const linkKey = `${event.actorId}->${event.resourceId}`;
        linkMap.set(linkKey, (linkMap.get(linkKey) || 0) + 1);
      }
    });

    linkMap.forEach((weight, linkKey) => {
      const [source, target] = linkKey.split('->');
      links.push({ source, target, weight });
    });

    return {
      type: 'network',
      data: {
        nodes: Array.from(nodes).map(id => ({ id, type: id.startsWith('user_') ? 'user' : 'resource' })),
        links,
      },
      config: {
        nodeSize: 'degree',
        linkWidth: 'weight',
        colorBy: 'type',
      },
      title: 'Actor-Resource Network',
      description: 'Network visualization of relationships between actors and resources',
    };
  }

  private generateTreemapVisualization(events: AuditEvent[]): AuditVisualization {
    const hierarchy = new Map<string, Map<string, number>>();
    
    events.forEach(event => {
      if (!hierarchy.has(event.resourceType)) {
        hierarchy.set(event.resourceType, new Map());
      }
      
      const actionMap = hierarchy.get(event.resourceType)!;
      actionMap.set(event.actionType, (actionMap.get(event.actionType) || 0) + 1);
    });

    const treemapData = Array.from(hierarchy.entries()).map(([resourceType, actions]) => ({
      name: resourceType,
      children: Array.from(actions.entries()).map(([actionType, count]) => ({
        name: actionType,
        value: count,
      })),
    }));

    return {
      type: 'treemap',
      data: treemapData,
      config: {
        valueField: 'value',
        categoryField: 'name',
        hierarchical: true,
      },
      title: 'Action Distribution by Resource Type',
      description: 'Hierarchical view of actions grouped by resource type',
    };
  }

  private generateSankeyVisualization(events: AuditEvent[]): AuditVisualization {
    const flows = new Map<string, number>();
    
    events.forEach(event => {
      const flowKey = `${event.actorType}->${event.actionType}->${event.outcome}`;
      flows.set(flowKey, (flows.get(flowKey) || 0) + 1);
    });

    const sankeyData = Array.from(flows.entries()).map(([flowKey, value]) => {
      const [source, action, target] = flowKey.split('->');
      return { source, action, target, value };
    });

    return {
      type: 'sankey',
      data: sankeyData,
      config: {
        sourceField: 'source',
        targetField: 'target',
        valueField: 'value',
        categoryField: 'action',
      },
      title: 'Audit Flow Diagram',
      description: 'Flow of actions from actor types to outcomes',
    };
  }

  private getComplianceFlagsForReport(reportType: string): string[] {
    const flagMap: Record<string, string[]> = {
      'gdpr': ['gdpr_data_access', 'gdpr_data_deletion', 'gdpr_consent'],
      'pci': ['pci_data_access', 'pci_encryption', 'pci_audit'],
      'sox': ['sox_financial_data', 'sox_access_control', 'sox_audit_trail'],
      'hipaa': ['hipaa_phi_access', 'hipaa_encryption', 'hipaa_audit'],
    };
    
    return flagMap[reportType] || [];
  }

  private calculateComplianceScore(events: AuditEvent[]): number {
    if (events.length === 0) return 100;
    
    const violations = this.countComplianceViolations(events);
    return Math.max(0, 100 - (violations / events.length) * 100);
  }

  private countComplianceViolations(events: AuditEvent[]): number {
    return events.filter(event => 
      event.complianceFlags.some(flag => flag.includes('violation'))
    ).length;
  }

  private generateComplianceRecommendations(events: AuditEvent[]): string[] {
    const recommendations: string[] = [];
    
    const violations = events.filter(event => 
      event.complianceFlags.some(flag => flag.includes('violation'))
    );
    
    if (violations.length > 0) {
      recommendations.push('Address compliance violations in audit trail');
    }
    
    const failedEvents = events.filter(event => event.outcome === 'failure');
    if (failedEvents.length > events.length * 0.1) {
      recommendations.push('Investigate high failure rate in audit events');
    }
    
    return recommendations;
  }

  private async generateReportSections(
    reportType: string,
    events: AuditEvent[],
    analytics: AuditAnalytics
  ): Promise<ComplianceReport['sections']> {
    const sections: ComplianceReport['sections'] = [];
    
    // Executive Summary
    sections.push({
      title: 'Executive Summary',
      content: {
        totalEvents: analytics.totalEvents,
        timeRange: events.length > 0 ? {
          start: Math.min(...events.map(e => e.timestamp.getTime())),
          end: Math.max(...events.map(e => e.timestamp.getTime())),
        } : null,
        keyMetrics: analytics.eventsBySeverity,
      },
      complianceStatus: 'compliant',
    });
    
    // Detailed Analysis
    sections.push({
      title: 'Detailed Analysis',
      content: {
        eventsByType: analytics.eventsByType,
        topActors: analytics.topActors,
        suspiciousPatterns: analytics.suspiciousPatterns,
      },
      complianceStatus: analytics.suspiciousPatterns.length > 0 ? 'partial' : 'compliant',
    });
    
    return sections;
  }

  private convertToCSV(events: AuditEvent[]): string {
    const headers = [
      'ID', 'Timestamp', 'Action Type', 'Actor ID', 'Actor Type',
      'Resource Type', 'Resource ID', 'Outcome', 'Severity', 'Category'
    ];
    
    const rows = events.map(event => [
      event.id,
      event.timestamp.toISOString(),
      event.actionType,
      event.actorId,
      event.actorType,
      event.resourceType,
      event.resourceId || '',
      event.outcome,
      event.metadata.severity,
      event.metadata.category,
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private convertToXML(events: AuditEvent[]): string {
    const xmlEvents = events.map(event => `
      <event id="${event.id}">
        <timestamp>${event.timestamp.toISOString()}</timestamp>
        <actionType>${event.actionType}</actionType>
        <actorId>${event.actorId}</actorId>
        <actorType>${event.actorType}</actorType>
        <resourceType>${event.resourceType}</resourceType>
        <resourceId>${event.resourceId || ''}</resourceId>
        <outcome>${event.outcome}</outcome>
        <severity>${event.metadata.severity}</severity>
        <category>${event.metadata.category}</category>
      </event>
    `).join('');
    
    return `<?xml version="1.0" encoding="UTF-8"?><auditEvents>${xmlEvents}</auditEvents>`;
  }

  private async checkForMissingEvents(): Promise<string[]> {
    // Implementation would check for gaps in event sequence
    return [];
  }

  private async checkForTamperedEvents(): Promise<string[]> {
    // Implementation would verify event integrity
    return [];
  }

  private async checkRetentionCompliance(): Promise<string[]> {
    const issues: string[] = [];
    const now = Date.now();
    
    this.auditEvents.forEach(event => {
      const retentionPeriod = this.retentionPolicies.get(event.retentionPolicy) || 
                             this.retentionPolicies.get('default')!;
      const expiryTime = event.timestamp.getTime() + retentionPeriod;
      
      if (now > expiryTime) {
        issues.push(`Event ${event.id} exceeds retention period`);
      }
    });
    
    return issues;
  }

  private async checkDataConsistency(): Promise<string[]> {
    const issues: string[] = [];
    
    // Check for events with missing required fields
    this.auditEvents.forEach(event => {
      if (!event.actionType || !event.actorId || !event.resourceType) {
        issues.push(`Event ${event.id} has missing required fields`);
      }
    });
    
    return issues;
  }

  private performRetentionCleanup(): void {
    const now = Date.now();
    const eventsToDelete: string[] = [];
    
    this.auditEvents.forEach((event, eventId) => {
      const retentionPeriod = this.retentionPolicies.get(event.retentionPolicy) || 
                             this.retentionPolicies.get('default')!;
      const expiryTime = event.timestamp.getTime() + retentionPeriod;
      
      if (now > expiryTime) {
        eventsToDelete.push(eventId);
      }
    });
    
    eventsToDelete.forEach(eventId => {
      this.auditEvents.delete(eventId);
    });
    
    if (eventsToDelete.length > 0) {
      safeLogger.info(`Cleaned up ${eventsToDelete.length} expired audit events`);
    }
  }

  private maintainSearchIndex(): void {
    // Remove entries for deleted events
    this.searchIndex.forEach((eventIds, key) => {
      const validIds = new Set<string>();
      eventIds.forEach(eventId => {
        if (this.auditEvents.has(eventId)) {
          validIds.add(eventId);
        }
      });
      this.searchIndex.set(key, validIds);
    });
  }

  private async checkComplianceViolations(event: AuditEvent): Promise<void> {
    // Check for potential compliance violations
    if (event.actionType === 'data_access' && !event.metadata.tags.includes('authorized')) {
      event.complianceFlags.push('potential_gdpr_violation');
    }
    
    if (event.resourceType === 'payment_data' && event.metadata.severity !== 'high') {
      event.complianceFlags.push('potential_pci_violation');
    }
  }

  private async analyzeSuspiciousPatterns(event: AuditEvent): Promise<void> {
    // Real-time pattern analysis
    const recentEvents = Array.from(this.auditEvents.values())
      .filter(e => e.actorId === event.actorId)
      .filter(e => Date.now() - e.timestamp.getTime() < 60000) // Last minute
      .length;
    
    if (recentEvents > 10) {
      this.emit('suspiciousActivity', {
        type: 'rapid_actions',
        actorId: event.actorId,
        eventCount: recentEvents,
        timeWindow: '1 minute',
      });
    }
  }
}

export const comprehensiveAuditService = new ComprehensiveAuditService();
export default comprehensiveAuditService;
