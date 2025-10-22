/**
 * Privacy-Compliant Analytics Service
 * Implements GDPR-compliant analytics with user consent management
 */

import { EventEmitter } from 'events';

export interface UserConsent {
  userId: string;
  consentId: string;
  analyticsConsent: boolean;
  marketingConsent: boolean;
  functionalConsent: boolean;
  performanceConsent: boolean;
  consentDate: Date;
  consentVersion: string;
  ipAddress?: string;
  userAgent?: string;
  consentMethod: 'explicit' | 'implicit' | 'legitimate_interest';
  withdrawalDate?: Date;
  isActive: boolean;
}

export interface PrivacyCompliantEvent {
  eventId: string;
  userId?: string;
  sessionId: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: Date;
  consentRequired: boolean;
  hasConsent: boolean;
  dataRetentionDays: number;
  isAnonymized: boolean;
  gdprLawfulBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
}

export interface DataMinimizationRule {
  eventType: string;
  allowedFields: string[];
  requiredConsent: ('analytics' | 'marketing' | 'functional' | 'performance')[];
  retentionPeriod: number; // days
  anonymizationDelay: number; // days
  deletionTriggers: string[];
}

export interface GDPRDataRequest {
  requestId: string;
  userId: string;
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  requestDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  completionDate?: Date;
  requestDetails: Record<string, any>;
  verificationMethod: string;
  responseData?: any;
}

class PrivacyCompliantAnalyticsService extends EventEmitter {
  private consentStore: Map<string, UserConsent> = new Map();
  private eventQueue: PrivacyCompliantEvent[] = [];
  private dataMinimizationRules: Map<string, DataMinimizationRule> = new Map();
  private gdprRequests: Map<string, GDPRDataRequest> = new Map();
  private isInitialized = false;
  private retentionCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.setupDefaultDataMinimizationRules();
  }

  /**
   * Initialize the privacy-compliant analytics service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load existing consent records
      await this.loadConsentRecords();
      
      // Load data minimization rules
      await this.loadDataMinimizationRules();
      
      // Start retention policy enforcement
      this.startRetentionPolicyEnforcement();
      
      this.isInitialized = true;
      this.emit('initialized');
      
    } catch (error) {
      console.error('Failed to initialize privacy-compliant analytics:', error);
      throw error;
    }
  }

  /**
   * Record user consent
   */
  async recordConsent(consent: Omit<UserConsent, 'consentId' | 'consentDate' | 'isActive'>): Promise<string> {
    const consentRecord: UserConsent = {
      ...consent,
      consentId: this.generateConsentId(),
      consentDate: new Date(),
      isActive: true
    };

    // Store consent record
    this.consentStore.set(consent.userId, consentRecord);
    
    // Persist to database
    await this.persistConsentRecord(consentRecord);
    
    // Process queued events for this user
    await this.processQueuedEvents(consent.userId);
    
    this.emit('consentRecorded', consentRecord);
    
    return consentRecord.consentId;
  }

  /**
   * Update user consent
   */
  async updateConsent(userId: string, updates: Partial<UserConsent>): Promise<void> {
    const existingConsent = this.consentStore.get(userId);
    if (!existingConsent) {
      throw new Error('No existing consent found for user');
    }

    const updatedConsent: UserConsent = {
      ...existingConsent,
      ...updates,
      consentDate: new Date(),
      consentVersion: this.getCurrentConsentVersion()
    };

    this.consentStore.set(userId, updatedConsent);
    await this.persistConsentRecord(updatedConsent);
    
    this.emit('consentUpdated', updatedConsent);
  }

  /**
   * Withdraw user consent
   */
  async withdrawConsent(userId: string, consentTypes?: string[]): Promise<void> {
    const existingConsent = this.consentStore.get(userId);
    if (!existingConsent) {
      throw new Error('No existing consent found for user');
    }

    const withdrawnConsent: UserConsent = {
      ...existingConsent,
      analyticsConsent: consentTypes ? !consentTypes.includes('analytics') && existingConsent.analyticsConsent : false,
      marketingConsent: consentTypes ? !consentTypes.includes('marketing') && existingConsent.marketingConsent : false,
      functionalConsent: consentTypes ? !consentTypes.includes('functional') && existingConsent.functionalConsent : false,
      performanceConsent: consentTypes ? !consentTypes.includes('performance') && existingConsent.performanceConsent : false,
      withdrawalDate: new Date(),
      isActive: false
    };

    this.consentStore.set(userId, withdrawnConsent);
    await this.persistConsentRecord(withdrawnConsent);
    
    // Trigger data deletion if required
    if (!consentTypes || consentTypes.includes('analytics')) {
      await this.triggerDataDeletion(userId, 'consent_withdrawn');
    }
    
    this.emit('consentWithdrawn', withdrawnConsent);
  }

  /**
   * Track analytics event with privacy compliance
   */
  async trackEvent(
    eventType: string,
    eventData: Record<string, any>,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    const rule = this.dataMinimizationRules.get(eventType);
    if (!rule) {
      console.warn(`No data minimization rule found for event type: ${eventType}`);
      return;
    }

    // Check consent requirements
    const hasRequiredConsent = userId ? await this.checkConsentRequirements(userId, rule.requiredConsent) : false;
    
    // Apply data minimization
    const minimizedData = this.applyDataMinimization(eventData, rule);
    
    const event: PrivacyCompliantEvent = {
      eventId: this.generateEventId(),
      userId,
      sessionId: sessionId || this.generateSessionId(),
      eventType,
      eventData: minimizedData,
      timestamp: new Date(),
      consentRequired: rule.requiredConsent.length > 0,
      hasConsent: hasRequiredConsent,
      dataRetentionDays: rule.retentionPeriod,
      isAnonymized: !userId || !hasRequiredConsent,
      gdprLawfulBasis: hasRequiredConsent ? 'consent' : 'legitimate_interests'
    };

    if (event.hasConsent || !event.consentRequired) {
      await this.persistEvent(event);
      this.emit('eventTracked', event);
    } else {
      // Queue event for later processing if consent is obtained
      this.eventQueue.push(event);
      this.emit('eventQueued', event);
    }
  }

  /**
   * Handle GDPR data subject requests
   */
  async handleGDPRRequest(request: Omit<GDPRDataRequest, 'requestId' | 'requestDate' | 'status'>): Promise<string> {
    const gdprRequest: GDPRDataRequest = {
      ...request,
      requestId: this.generateRequestId(),
      requestDate: new Date(),
      status: 'pending'
    };

    this.gdprRequests.set(gdprRequest.requestId, gdprRequest);
    await this.persistGDPRRequest(gdprRequest);
    
    // Process request based on type
    await this.processGDPRRequest(gdprRequest);
    
    this.emit('gdprRequestReceived', gdprRequest);
    
    return gdprRequest.requestId;
  }

  /**
   * Get user's data for GDPR access request
   */
  async getUserData(userId: string): Promise<any> {
    const consent = this.consentStore.get(userId);
    const events = await this.getUserEvents(userId);
    const profile = await this.getUserProfile(userId);
    
    return {
      consent,
      events: events.map(event => ({
        ...event,
        eventData: this.sanitizeEventData(event.eventData)
      })),
      profile: this.sanitizeProfileData(profile),
      dataRetentionInfo: await this.getDataRetentionInfo(userId)
    };
  }

  /**
   * Delete user data for GDPR erasure request
   */
  async deleteUserData(userId: string, reason: string = 'gdpr_erasure'): Promise<void> {
    // Delete consent records
    this.consentStore.delete(userId);
    
    // Delete analytics events
    await this.deleteUserEvents(userId);
    
    // Delete profile data
    await this.deleteUserProfile(userId);
    
    // Log deletion for audit trail
    await this.logDataDeletion(userId, reason);
    
    this.emit('userDataDeleted', { userId, reason });
  }

  /**
   * Anonymize user data
   */
  async anonymizeUserData(userId: string): Promise<void> {
    const events = await this.getUserEvents(userId);
    
    for (const event of events) {
      const anonymizedEvent = {
        ...event,
        userId: undefined,
        eventData: this.anonymizeEventData(event.eventData),
        isAnonymized: true
      };
      
      await this.updateEvent(event.eventId, anonymizedEvent);
    }
    
    this.emit('userDataAnonymized', { userId });
  }

  /**
   * Check if user has required consent
   */
  private async checkConsentRequirements(userId: string, requiredConsent: string[]): Promise<boolean> {
    const consent = this.consentStore.get(userId);
    if (!consent || !consent.isActive) return false;

    return requiredConsent.every(type => {
      switch (type) {
        case 'analytics': return consent.analyticsConsent;
        case 'marketing': return consent.marketingConsent;
        case 'functional': return consent.functionalConsent;
        case 'performance': return consent.performanceConsent;
        default: return false;
      }
    });
  }

  /**
   * Apply data minimization rules
   */
  private applyDataMinimization(data: Record<string, any>, rule: DataMinimizationRule): Record<string, any> {
    const minimizedData: Record<string, any> = {};
    
    for (const field of rule.allowedFields) {
      if (data[field] !== undefined) {
        minimizedData[field] = data[field];
      }
    }
    
    return minimizedData;
  }

  /**
   * Setup default data minimization rules
   */
  private setupDefaultDataMinimizationRules(): void {
    const rules: DataMinimizationRule[] = [
      {
        eventType: 'page_view',
        allowedFields: ['page', 'referrer', 'timestamp'],
        requiredConsent: ['analytics'],
        retentionPeriod: 365,
        anonymizationDelay: 30,
        deletionTriggers: ['consent_withdrawn']
      },
      {
        eventType: 'user_interaction',
        allowedFields: ['action', 'element', 'timestamp'],
        requiredConsent: ['analytics'],
        retentionPeriod: 180,
        anonymizationDelay: 14,
        deletionTriggers: ['consent_withdrawn']
      },
      {
        eventType: 'performance_metric',
        allowedFields: ['metric', 'value', 'timestamp'],
        requiredConsent: ['performance'],
        retentionPeriod: 90,
        anonymizationDelay: 7,
        deletionTriggers: ['consent_withdrawn']
      },
      {
        eventType: 'error_tracking',
        allowedFields: ['error', 'stack', 'timestamp'],
        requiredConsent: [],
        retentionPeriod: 30,
        anonymizationDelay: 1,
        deletionTriggers: []
      }
    ];

    rules.forEach(rule => {
      this.dataMinimizationRules.set(rule.eventType, rule);
    });
  }

  /**
   * Process GDPR request
   */
  private async processGDPRRequest(request: GDPRDataRequest): Promise<void> {
    try {
      request.status = 'processing';
      await this.persistGDPRRequest(request);

      let responseData: any;

      switch (request.requestType) {
        case 'access':
          responseData = await this.getUserData(request.userId);
          break;
        case 'erasure':
          await this.deleteUserData(request.userId, 'gdpr_erasure');
          responseData = { deleted: true };
          break;
        case 'portability':
          responseData = await this.exportUserData(request.userId);
          break;
        case 'rectification':
          responseData = await this.rectifyUserData(request.userId, request.requestDetails);
          break;
        case 'restriction':
          responseData = await this.restrictUserDataProcessing(request.userId);
          break;
        case 'objection':
          responseData = await this.handleDataProcessingObjection(request.userId);
          break;
      }

      request.status = 'completed';
      request.completionDate = new Date();
      request.responseData = responseData;
      
      await this.persistGDPRRequest(request);
      this.emit('gdprRequestCompleted', request);

    } catch (error) {
      request.status = 'rejected';
      await this.persistGDPRRequest(request);
      this.emit('gdprRequestFailed', { request, error });
    }
  }

  /**
   * Start retention policy enforcement
   */
  private startRetentionPolicyEnforcement(): void {
    // Run retention check daily
    this.retentionCheckInterval = setInterval(async () => {
      await this.enforceRetentionPolicies();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Enforce data retention policies
   */
  private async enforceRetentionPolicies(): Promise<void> {
    const now = new Date();
    
    for (const [eventType, rule] of this.dataMinimizationRules) {
      const cutoffDate = new Date(now.getTime() - rule.retentionPeriod * 24 * 60 * 60 * 1000);
      const anonymizationDate = new Date(now.getTime() - rule.anonymizationDelay * 24 * 60 * 60 * 1000);
      
      // Delete old events
      await this.deleteEventsOlderThan(eventType, cutoffDate);
      
      // Anonymize events
      await this.anonymizeEventsOlderThan(eventType, anonymizationDate);
    }
  }

  // Helper methods for data persistence and retrieval
  private generateConsentId(): string {
    return `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `gdpr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentConsentVersion(): string {
    return '1.0.0'; // Should be configurable
  }

  // Placeholder methods for database operations
  private async loadConsentRecords(): Promise<void> {
    // Implementation would load from database
  }

  private async loadDataMinimizationRules(): Promise<void> {
    // Implementation would load from database
  }

  private async persistConsentRecord(consent: UserConsent): Promise<void> {
    // Implementation would persist to database
  }

  private async persistEvent(event: PrivacyCompliantEvent): Promise<void> {
    // Implementation would persist to database
  }

  private async persistGDPRRequest(request: GDPRDataRequest): Promise<void> {
    // Implementation would persist to database
  }

  private async processQueuedEvents(userId: string): Promise<void> {
    // Implementation would process queued events
  }

  private async triggerDataDeletion(userId: string, reason: string): Promise<void> {
    // Implementation would trigger data deletion
  }

  private async getUserEvents(userId: string): Promise<PrivacyCompliantEvent[]> {
    // Implementation would retrieve user events
    return [];
  }

  private async getUserProfile(userId: string): Promise<any> {
    // Implementation would retrieve user profile
    return {};
  }

  private async getDataRetentionInfo(userId: string): Promise<any> {
    // Implementation would get retention info
    return {};
  }

  private async deleteUserEvents(userId: string): Promise<void> {
    // Implementation would delete user events
  }

  private async deleteUserProfile(userId: string): Promise<void> {
    // Implementation would delete user profile
  }

  private async logDataDeletion(userId: string, reason: string): Promise<void> {
    // Implementation would log deletion
  }

  private async updateEvent(eventId: string, event: Partial<PrivacyCompliantEvent>): Promise<void> {
    // Implementation would update event
  }

  private async exportUserData(userId: string): Promise<any> {
    // Implementation would export user data
    return {};
  }

  private async rectifyUserData(userId: string, updates: any): Promise<any> {
    // Implementation would rectify user data
    return {};
  }

  private async restrictUserDataProcessing(userId: string): Promise<any> {
    // Implementation would restrict processing
    return {};
  }

  private async handleDataProcessingObjection(userId: string): Promise<any> {
    // Implementation would handle objection
    return {};
  }

  private async deleteEventsOlderThan(eventType: string, cutoffDate: Date): Promise<void> {
    // Implementation would delete old events
  }

  private async anonymizeEventsOlderThan(eventType: string, cutoffDate: Date): Promise<void> {
    // Implementation would anonymize events
  }

  private sanitizeEventData(data: Record<string, any>): Record<string, any> {
    // Implementation would sanitize event data
    return data;
  }

  private sanitizeProfileData(data: any): any {
    // Implementation would sanitize profile data
    return data;
  }

  private anonymizeEventData(data: Record<string, any>): Record<string, any> {
    // Implementation would anonymize event data
    return data;
  }
}

export const privacyCompliantAnalyticsService = new PrivacyCompliantAnalyticsService();