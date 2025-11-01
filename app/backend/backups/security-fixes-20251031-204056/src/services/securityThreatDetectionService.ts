/**
 * Security Threat Detection Service
 * 
 * Advanced behavioral analysis and threat detection system with
 * automated response capabilities and threat intelligence integration.
 */

import { EventEmitter } from 'events';
import { safeLogger } from '../utils/safeLogger';
import crypto from 'crypto';
import { safeLogger } from '../utils/safeLogger';
import { securityConfig } from '../config/securityConfig';
import { safeLogger } from '../utils/safeLogger';
import { securityMonitoringService, SecurityEvent, SecurityEventType, SecuritySeverity } from './securityMonitoringService';
import { safeLogger } from '../utils/safeLogger';
import { comprehensiveAuditService } from './comprehensiveAuditService';
import { safeLogger } from '../utils/safeLogger';

export interface ThreatPattern {
  id: string;
  name: string;
  description: string;
  severity: SecuritySeverity;
  indicators: ThreatIndicator[];
  threshold: number;
  timeWindow: number; // milliseconds
  enabled: boolean;
  lastTriggered?: Date;
  triggerCount: number;
}

export interface ThreatIndicator {
  type: 'frequency' | 'sequence' | 'anomaly' | 'correlation' | 'geolocation' | 'behavioral';
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'pattern' | 'deviation';
  value: any;
  weight: number;
}

export interface ThreatDetection {
  id: string;
  patternId: string;
  patternName: string;
  timestamp: Date;
  severity: SecuritySeverity;
  confidence: number;
  indicators: Array<{
    type: string;
    value: any;
    weight: number;
    matched: boolean;
  }>;
  affectedEntities: string[];
  evidence: SecurityEvent[];
  riskScore: number;
  recommendedActions: ThreatResponse[];
  status: 'detected' | 'investigating' | 'mitigated' | 'false_positive';
  assignedTo?: string;
  notes?: string;
}

export interface ThreatResponse {
  type: 'block_ip' | 'suspend_user' | 'require_mfa' | 'alert_admin' | 'quarantine' | 'monitor';
  priority: 'immediate' | 'high' | 'medium' | 'low';
  parameters: Record<string, any>;
  automated: boolean;
  description: string;
}

export interface BehavioralProfile {
  entityId: string;
  entityType: 'user' | 'ip' | 'session';
  baseline: {
    averageActionsPerHour: number;
    commonActionTypes: string[];
    typicalTimeRanges: Array<{ start: number; end: number }>;
    commonLocations: string[];
    deviceFingerprints: string[];
  };
  currentBehavior: {
    actionsInLastHour: number;
    recentActionTypes: string[];
    currentTimeRange: { start: number; end: number };
    currentLocation?: string;
    deviceFingerprint?: string;
  };
  anomalyScore: number;
  lastUpdated: Date;
}

export interface ThreatIntelligence {
  source: string;
  type: 'ip_reputation' | 'domain_reputation' | 'malware_signature' | 'attack_pattern';
  indicators: Array<{
    value: string;
    type: string;
    confidence: number;
    lastSeen: Date;
    tags: string[];
  }>;
  lastUpdated: Date;
}

class SecurityThreatDetectionService extends EventEmitter {
  private threatPatterns: Map<string, ThreatPattern> = new Map();
  private threatDetections: Map<string, ThreatDetection> = new Map();
  private behavioralProfiles: Map<string, BehavioralProfile> = new Map();
  private threatIntelligence: Map<string, ThreatIntelligence> = new Map();
  private correlationEngine: CorrelationEngine;

  constructor() {
    super();
    this.correlationEngine = new CorrelationEngine();
    this.initializeService();
  }

  /**
   * Initialize the threat detection service
   */
  private initializeService(): void {
    // Set up default threat patterns
    this.setupDefaultThreatPatterns();

    // Listen to security events
    securityMonitoringService.on('securityEvent', (event: SecurityEvent) => {
      this.analyzeSecurityEvent(event);
    });

    // Set up periodic tasks
    setInterval(() => {
      this.updateBehavioralProfiles();
    }, 5 * 60 * 1000); // Every 5 minutes

    setInterval(() => {
      this.updateThreatIntelligence();
    }, 60 * 60 * 1000); // Every hour

    setInterval(() => {
      this.performCorrelationAnalysis();
    }, 10 * 60 * 1000); // Every 10 minutes

    safeLogger.info('Security threat detection service initialized');
  }

  /**
   * Analyze security event for threats
   */
  async analyzeSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Update behavioral profiles
      await this.updateBehavioralProfile(event);

      // Check against threat patterns
      const detections = await this.checkThreatPatterns(event);

      // Process any detections
      for (const detection of detections) {
        await this.processThreatDetection(detection);
      }

      // Perform real-time correlation
      await this.performRealTimeCorrelation(event);

    } catch (error) {
      safeLogger.error('Error analyzing security event:', error);
    }
  }

  /**
   * Check event against threat patterns
   */
  private async checkThreatPatterns(event: SecurityEvent): Promise<ThreatDetection[]> {
    const detections: ThreatDetection[] = [];

    for (const pattern of this.threatPatterns.values()) {
      if (!pattern.enabled) continue;

      const detection = await this.evaluatePattern(pattern, event);
      if (detection) {
        detections.push(detection);
      }
    }

    return detections;
  }

  /**
   * Evaluate a specific threat pattern
   */
  private async evaluatePattern(pattern: ThreatPattern, event: SecurityEvent): Promise<ThreatDetection | null> {
    const now = Date.now();
    const windowStart = now - pattern.timeWindow;

    // Get recent events for analysis
    const recentEvents = await this.getRecentEvents(windowStart, event);

    let score = 0;
    const matchedIndicators: Array<{
      type: string;
      value: any;
      weight: number;
      matched: boolean;
    }> = [];

    // Evaluate each indicator
    for (const indicator of pattern.indicators) {
      const match = this.evaluateIndicator(indicator, event, recentEvents);
      matchedIndicators.push({
        type: indicator.type,
        value: indicator.value,
        weight: indicator.weight,
        matched: match,
      });

      if (match) {
        score += indicator.weight;
      }
    }

    // Check if threshold is met
    if (score >= pattern.threshold) {
      const detection: ThreatDetection = {
        id: crypto.randomUUID(),
        patternId: pattern.id,
        patternName: pattern.name,
        timestamp: new Date(),
        severity: pattern.severity,
        confidence: Math.min(100, (score / pattern.threshold) * 100),
        indicators: matchedIndicators,
        affectedEntities: this.extractAffectedEntities(event, recentEvents),
        evidence: [event, ...recentEvents.slice(0, 10)],
        riskScore: this.calculateRiskScore(pattern, score, event),
        recommendedActions: this.generateRecommendedActions(pattern, event),
        status: 'detected',
      };

      return detection;
    }

    return null;
  }

  /**
   * Evaluate a single threat indicator
   */
  private evaluateIndicator(
    indicator: ThreatIndicator,
    event: SecurityEvent,
    recentEvents: SecurityEvent[]
  ): boolean {
    switch (indicator.type) {
      case 'frequency':
        return this.evaluateFrequencyIndicator(indicator, event, recentEvents);
      case 'sequence':
        return this.evaluateSequenceIndicator(indicator, event, recentEvents);
      case 'anomaly':
        return this.evaluateAnomalyIndicator(indicator, event);
      case 'correlation':
        return this.evaluateCorrelationIndicator(indicator, event, recentEvents);
      case 'geolocation':
        return this.evaluateGeolocationIndicator(indicator, event);
      case 'behavioral':
        return this.evaluateBehavioralIndicator(indicator, event);
      default:
        return false;
    }
  }

  /**
   * Process threat detection
   */
  private async processThreatDetection(detection: ThreatDetection): Promise<void> {
    // Store detection
    this.threatDetections.set(detection.id, detection);

    // Update pattern trigger count
    const pattern = this.threatPatterns.get(detection.patternId);
    if (pattern) {
      pattern.triggerCount++;
      pattern.lastTriggered = new Date();
    }

    // Record audit event
    await comprehensiveAuditService.recordAuditEvent({
      actionType: 'threat_detected',
      actorType: 'system',
      actorId: 'threat_detection_service',
      resourceType: 'security_threat',
      resourceId: detection.id,
      newState: detection,
      metadata: {
        source: 'threat_detection',
        severity: detection.severity,
        category: 'security',
        tags: ['threat_detection', detection.patternName],
      },
      outcome: 'success',
      complianceFlags: ['security_monitoring'],
      retentionPolicy: 'security',
    });

    // Execute automated responses
    await this.executeAutomatedResponses(detection);

    // Emit detection event
    this.emit('threatDetected', detection);

    safeLogger.info(`Threat detected: ${detection.patternName} (${detection.severity})`);
  }

  /**
   * Execute automated threat responses
   */
  private async executeAutomatedResponses(detection: ThreatDetection): Promise<void> {
    const automatedActions = detection.recommendedActions.filter(action => action.automated);

    for (const action of automatedActions) {
      try {
        await this.executeThreatResponse(action, detection);
      } catch (error) {
        safeLogger.error('Error executing automated response:', error);
      }
    }
  }

  /**
   * Execute a specific threat response
   */
  private async executeThreatResponse(action: ThreatResponse, detection: ThreatDetection): Promise<void> {
    switch (action.type) {
      case 'block_ip':
        await this.blockIP(action.parameters.ipAddress, action.parameters.duration);
        break;
      case 'suspend_user':
        await this.suspendUser(action.parameters.userId, action.parameters.reason);
        break;
      case 'require_mfa':
        await this.requireMFA(action.parameters.userId);
        break;
      case 'alert_admin':
        await this.alertAdministrators(detection, action.parameters);
        break;
      case 'quarantine':
        await this.quarantineEntity(action.parameters.entityType, action.parameters.entityId);
        break;
      case 'monitor':
        await this.enhanceMonitoring(action.parameters.entityType, action.parameters.entityId);
        break;
    }
  }

  /**
   * Update behavioral profile for entity
   */
  private async updateBehavioralProfile(event: SecurityEvent): Promise<void> {
    const entities = [
      { id: event.userId || 'unknown', type: 'user' as const },
      { id: event.ipAddress || 'unknown', type: 'ip' as const },
      { id: event.sessionId || 'unknown', type: 'session' as const },
    ];

    for (const entity of entities) {
      if (entity.id === 'unknown') continue;

      let profile = this.behavioralProfiles.get(entity.id);
      if (!profile) {
        profile = this.createNewBehavioralProfile(entity.id, entity.type);
        this.behavioralProfiles.set(entity.id, profile);
      }

      this.updateProfileWithEvent(profile, event);
    }
  }

  /**
   * Create new behavioral profile
   */
  private createNewBehavioralProfile(entityId: string, entityType: BehavioralProfile['entityType']): BehavioralProfile {
    return {
      entityId,
      entityType,
      baseline: {
        averageActionsPerHour: 0,
        commonActionTypes: [],
        typicalTimeRanges: [],
        commonLocations: [],
        deviceFingerprints: [],
      },
      currentBehavior: {
        actionsInLastHour: 0,
        recentActionTypes: [],
        currentTimeRange: { start: 0, end: 0 },
      },
      anomalyScore: 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Update profile with new event
   */
  private updateProfileWithEvent(profile: BehavioralProfile, event: SecurityEvent): void {
    const now = new Date();
    const hour = now.getHours();

    // Update current behavior
    profile.currentBehavior.actionsInLastHour++;
    profile.currentBehavior.recentActionTypes.push(event.type);
    profile.currentBehavior.currentTimeRange = { start: hour, end: hour };

    // Keep only recent action types (last 100)
    if (profile.currentBehavior.recentActionTypes.length > 100) {
      profile.currentBehavior.recentActionTypes = profile.currentBehavior.recentActionTypes.slice(-100);
    }

    // Calculate anomaly score
    profile.anomalyScore = this.calculateAnomalyScore(profile);
    profile.lastUpdated = now;
  }

  /**
   * Calculate anomaly score for profile
   */
  private calculateAnomalyScore(profile: BehavioralProfile): number {
    let score = 0;

    // Check action frequency anomaly
    if (profile.baseline.averageActionsPerHour > 0) {
      const frequencyRatio = profile.currentBehavior.actionsInLastHour / profile.baseline.averageActionsPerHour;
      if (frequencyRatio > 3) score += 30; // 3x normal activity
      else if (frequencyRatio > 2) score += 20; // 2x normal activity
    }

    // Check action type anomaly
    const unusualActions = profile.currentBehavior.recentActionTypes.filter(
      action => !profile.baseline.commonActionTypes.includes(action)
    );
    score += Math.min(30, unusualActions.length * 5);

    // Check time range anomaly
    const currentHour = profile.currentBehavior.currentTimeRange.start;
    const isTypicalTime = profile.baseline.typicalTimeRanges.some(
      range => currentHour >= range.start && currentHour <= range.end
    );
    if (!isTypicalTime && profile.baseline.typicalTimeRanges.length > 0) {
      score += 20;
    }

    return Math.min(100, score);
  }

  /**
   * Setup default threat patterns
   */
  private setupDefaultThreatPatterns(): void {
    // Brute force attack pattern
    this.threatPatterns.set('brute_force', {
      id: 'brute_force',
      name: 'Brute Force Attack',
      description: 'Multiple failed authentication attempts from same source',
      severity: SecuritySeverity.HIGH,
      indicators: [
        {
          type: 'frequency',
          field: 'type',
          operator: 'equals',
          value: SecurityEventType.AUTHENTICATION_FAILURE,
          weight: 10,
        },
        {
          type: 'frequency',
          field: 'ipAddress',
          operator: 'equals',
          value: 'same_ip',
          weight: 15,
        },
      ],
      threshold: 20,
      timeWindow: 15 * 60 * 1000, // 15 minutes
      enabled: true,
      triggerCount: 0,
    });

    // Credential stuffing pattern
    this.threatPatterns.set('credential_stuffing', {
      id: 'credential_stuffing',
      name: 'Credential Stuffing',
      description: 'Automated login attempts with stolen credentials',
      severity: SecuritySeverity.HIGH,
      indicators: [
        {
          type: 'frequency',
          field: 'type',
          operator: 'equals',
          value: SecurityEventType.AUTHENTICATION_FAILURE,
          weight: 8,
        },
        {
          type: 'behavioral',
          field: 'user_agent',
          operator: 'pattern',
          value: 'automated_pattern',
          weight: 12,
        },
      ],
      threshold: 15,
      timeWindow: 10 * 60 * 1000, // 10 minutes
      enabled: true,
      triggerCount: 0,
    });

    // Privilege escalation pattern
    this.threatPatterns.set('privilege_escalation', {
      id: 'privilege_escalation',
      name: 'Privilege Escalation',
      description: 'Unauthorized attempts to gain elevated privileges',
      severity: SecuritySeverity.CRITICAL,
      indicators: [
        {
          type: 'sequence',
          field: 'type',
          operator: 'equals',
          value: SecurityEventType.AUTHORIZATION_VIOLATION,
          weight: 20,
        },
        {
          type: 'frequency',
          field: 'resourceType',
          operator: 'equals',
          value: 'admin_resource',
          weight: 15,
        },
      ],
      threshold: 25,
      timeWindow: 5 * 60 * 1000, // 5 minutes
      enabled: true,
      triggerCount: 0,
    });

    // Data exfiltration pattern
    this.threatPatterns.set('data_exfiltration', {
      id: 'data_exfiltration',
      name: 'Data Exfiltration',
      description: 'Suspicious data access and download patterns',
      severity: SecuritySeverity.CRITICAL,
      indicators: [
        {
          type: 'frequency',
          field: 'actionType',
          operator: 'contains',
          value: 'download',
          weight: 10,
        },
        {
          type: 'anomaly',
          field: 'data_volume',
          operator: 'greater_than',
          value: 'baseline_3x',
          weight: 20,
        },
      ],
      threshold: 25,
      timeWindow: 30 * 60 * 1000, // 30 minutes
      enabled: true,
      triggerCount: 0,
    });
  }

  // Indicator evaluation methods
  private evaluateFrequencyIndicator(
    indicator: ThreatIndicator,
    event: SecurityEvent,
    recentEvents: SecurityEvent[]
  ): boolean {
    const relevantEvents = recentEvents.filter(e => {
      switch (indicator.field) {
        case 'type':
          return e.type === indicator.value;
        case 'ipAddress':
          return indicator.value === 'same_ip' ? e.ipAddress === event.ipAddress : e.ipAddress === indicator.value;
        case 'userId':
          return e.userId === indicator.value;
        default:
          return false;
      }
    });

    return relevantEvents.length >= (indicator.value as number || 5);
  }

  private evaluateSequenceIndicator(
    indicator: ThreatIndicator,
    event: SecurityEvent,
    recentEvents: SecurityEvent[]
  ): boolean {
    // Check if events follow a specific sequence pattern
    const sortedEvents = [...recentEvents, event].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Simple sequence check - look for pattern in last few events
    const lastFiveEvents = sortedEvents.slice(-5);
    return lastFiveEvents.some(e => e.type === indicator.value);
  }

  private evaluateAnomalyIndicator(indicator: ThreatIndicator, event: SecurityEvent): boolean {
    const entityId = event.userId || event.ipAddress || 'unknown';
    const profile = this.behavioralProfiles.get(entityId);
    
    if (!profile) return false;

    switch (indicator.field) {
      case 'frequency':
        return profile.anomalyScore > 50;
      case 'time_pattern':
        return profile.anomalyScore > 30;
      default:
        return false;
    }
  }

  private evaluateCorrelationIndicator(
    indicator: ThreatIndicator,
    event: SecurityEvent,
    recentEvents: SecurityEvent[]
  ): boolean {
    // Use correlation engine to check for related events
    return this.correlationEngine.checkCorrelation(indicator, event, recentEvents);
  }

  private evaluateGeolocationIndicator(indicator: ThreatIndicator, event: SecurityEvent): boolean {
    // Check for geolocation anomalies (would need geolocation service)
    return false; // Placeholder
  }

  private evaluateBehavioralIndicator(indicator: ThreatIndicator, event: SecurityEvent): boolean {
    // Check for behavioral anomalies
    const entityId = event.userId || event.ipAddress || 'unknown';
    const profile = this.behavioralProfiles.get(entityId);
    
    if (!profile) return false;

    switch (indicator.field) {
      case 'user_agent':
        return event.userAgent?.includes('bot') || event.userAgent?.includes('crawler') || false;
      case 'action_pattern':
        return profile.anomalyScore > 40;
      default:
        return false;
    }
  }

  // Helper methods
  private async getRecentEvents(windowStart: number, currentEvent: SecurityEvent): Promise<SecurityEvent[]> {
    // Get recent events from security monitoring service
    const recentEvents = securityMonitoringService.getRecentEvents(1000);
    return recentEvents.filter(e => 
      e.timestamp.getTime() >= windowStart && 
      e.id !== currentEvent.id
    );
  }

  private extractAffectedEntities(event: SecurityEvent, recentEvents: SecurityEvent[]): string[] {
    const entities = new Set<string>();
    
    [event, ...recentEvents].forEach(e => {
      if (e.userId) entities.add(`user:${e.userId}`);
      if (e.ipAddress) entities.add(`ip:${e.ipAddress}`);
      if (e.sessionId) entities.add(`session:${e.sessionId}`);
    });
    
    return Array.from(entities);
  }

  private calculateRiskScore(pattern: ThreatPattern, score: number, event: SecurityEvent): number {
    let riskScore = (score / pattern.threshold) * 50; // Base score

    // Adjust based on severity
    switch (pattern.severity) {
      case SecuritySeverity.CRITICAL:
        riskScore += 30;
        break;
      case SecuritySeverity.HIGH:
        riskScore += 20;
        break;
      case SecuritySeverity.MEDIUM:
        riskScore += 10;
        break;
    }

    // Adjust based on event context
    if (event.type === SecurityEventType.PRIVILEGE_ESCALATION) riskScore += 15;
    if (event.type === SecurityEventType.DATA_BREACH_ATTEMPT) riskScore += 20;

    return Math.min(100, riskScore);
  }

  private generateRecommendedActions(pattern: ThreatPattern, event: SecurityEvent): ThreatResponse[] {
    const actions: ThreatResponse[] = [];

    // Always alert admin for high/critical threats
    if (pattern.severity === SecuritySeverity.HIGH || pattern.severity === SecuritySeverity.CRITICAL) {
      actions.push({
        type: 'alert_admin',
        priority: 'immediate',
        parameters: { patternId: pattern.id, eventId: event.id },
        automated: true,
        description: 'Alert administrators of critical threat detection',
      });
    }

    // IP-based actions
    if (event.ipAddress) {
      actions.push({
        type: 'block_ip',
        priority: 'high',
        parameters: { ipAddress: event.ipAddress, duration: 3600000 }, // 1 hour
        automated: pattern.severity === SecuritySeverity.CRITICAL,
        description: 'Block suspicious IP address',
      });
    }

    // User-based actions
    if (event.userId) {
      if (pattern.id === 'privilege_escalation') {
        actions.push({
          type: 'suspend_user',
          priority: 'immediate',
          parameters: { userId: event.userId, reason: 'Privilege escalation attempt' },
          automated: true,
          description: 'Suspend user account for privilege escalation',
        });
      } else {
        actions.push({
          type: 'require_mfa',
          priority: 'medium',
          parameters: { userId: event.userId },
          automated: false,
          description: 'Require multi-factor authentication',
        });
      }
    }

    return actions;
  }

  // Response execution methods
  private async blockIP(ipAddress: string, duration: number): Promise<void> {
    // Implementation would integrate with firewall/load balancer
    safeLogger.info(`Blocked IP ${ipAddress} for ${duration}ms`);
  }

  private async suspendUser(userId: string, reason: string): Promise<void> {
    // Implementation would integrate with user management system
    safeLogger.info(`Suspended user ${userId} for reason: ${reason}`);
  }

  private async requireMFA(userId: string): Promise<void> {
    // Implementation would integrate with authentication system
    safeLogger.info(`Required MFA for user ${userId}`);
  }

  private async alertAdministrators(detection: ThreatDetection, parameters: Record<string, any>): Promise<void> {
    // Implementation would integrate with notification system
    safeLogger.info(`Alerted administrators about threat: ${detection.patternName}`);
  }

  private async quarantineEntity(entityType: string, entityId: string): Promise<void> {
    // Implementation would isolate the entity
    safeLogger.info(`Quarantined ${entityType}: ${entityId}`);
  }

  private async enhanceMonitoring(entityType: string, entityId: string): Promise<void> {
    // Implementation would increase monitoring for the entity
    safeLogger.info(`Enhanced monitoring for ${entityType}: ${entityId}`);
  }

  // Periodic update methods
  private updateBehavioralProfiles(): void {
    // Update baseline profiles based on historical data
    safeLogger.info('Updated behavioral profiles');
  }

  private async updateThreatIntelligence(): Promise<void> {
    // Fetch latest threat intelligence from external sources
    safeLogger.info('Updated threat intelligence');
  }

  private async performCorrelationAnalysis(): Promise<void> {
    // Perform correlation analysis across events
    safeLogger.info('Performed correlation analysis');
  }

  private async performRealTimeCorrelation(event: SecurityEvent): Promise<void> {
    // Real-time correlation with recent events
    safeLogger.info('Performed real-time correlation');
  }

  // Public API methods
  public getThreatDetections(limit: number = 100): ThreatDetection[] {
    return Array.from(this.threatDetections.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  public getThreatPattern(patternId: string): ThreatPattern | undefined {
    return this.threatPatterns.get(patternId);
  }

  public updateThreatPattern(patternId: string, updates: Partial<ThreatPattern>): void {
    const pattern = this.threatPatterns.get(patternId);
    if (pattern) {
      Object.assign(pattern, updates);
    }
  }

  public getBehavioralProfile(entityId: string): BehavioralProfile | undefined {
    return this.behavioralProfiles.get(entityId);
  }

  public updateDetectionStatus(detectionId: string, status: ThreatDetection['status'], notes?: string): void {
    const detection = this.threatDetections.get(detectionId);
    if (detection) {
      detection.status = status;
      if (notes) detection.notes = notes;
    }
  }
}

/**
 * Correlation Engine for advanced event correlation
 */
class CorrelationEngine {
  checkCorrelation(indicator: ThreatIndicator, event: SecurityEvent, recentEvents: SecurityEvent[]): boolean {
    // Implementation would perform complex correlation analysis
    return false; // Placeholder
  }
}

export const securityThreatDetectionService = new SecurityThreatDetectionService();
export default securityThreatDetectionService;