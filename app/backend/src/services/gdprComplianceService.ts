/**
 * GDPR Compliance Service
 * Comprehensive GDPR compliance features for EU user data protection
 */

import { EventEmitter } from 'events';
import { safeLogger } from '../utils/safeLogger';

export interface GDPRCompliantUser {
  userId: string;
  email: string;
  isEUResident: boolean;
  consentRecords: ConsentRecord[];
  dataProcessingActivities: DataProcessingActivity[];
  dataSubjectRights: DataSubjectRight[];
  privacySettings: PrivacySettings;
  dataRetentionSchedule: DataRetentionSchedule;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsentRecord {
  consentId: string;
  userId: string;
  purpose: string;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  consentGiven: boolean;
  consentDate: Date;
  consentMethod: 'explicit' | 'implicit' | 'pre_ticked' | 'opt_out';
  consentEvidence: string;
  withdrawalDate?: Date;
  isActive: boolean;
  consentVersion: string;
}

export interface DataProcessingActivity {
  activityId: string;
  userId: string;
  purpose: string;
  dataCategories: string[];
  legalBasis: string;
  retentionPeriod: number;
  processingDate: Date;
  dataLocation: string;
  thirdPartySharing: boolean;
  thirdParties?: string[];
  securityMeasures: string[];
}

export interface DataSubjectRight {
  requestId: string;
  userId: string;
  rightType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection' | 'automated_decision_making';
  requestDate: Date;
  status: 'received' | 'verified' | 'processing' | 'completed' | 'rejected' | 'appealed';
  responseDeadline: Date;
  completionDate?: Date;
  requestDetails: any;
  responseData?: any;
  verificationMethod: string;
  rejectionReason?: string;
}

export interface PrivacySettings {
  userId: string;
  dataMinimization: boolean;
  pseudonymization: boolean;
  encryption: boolean;
  accessLogging: boolean;
  dataPortability: boolean;
  rightToBeForgotten: boolean;
  marketingOptOut: boolean;
  profilingOptOut: boolean;
  thirdPartySharing: boolean;
  cookieConsent: CookieConsent;
}

export interface CookieConsent {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  consentDate: Date;
  consentString: string;
}

export interface DataRetentionSchedule {
  userId: string;
  dataType: string;
  retentionPeriod: number; // days
  deletionDate: Date;
  deletionReason: string;
  isActive: boolean;
}

export interface GDPRAuditLog {
  logId: string;
  userId?: string;
  action: string;
  dataType: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  legalBasis: string;
  purpose: string;
  dataAccessed?: string[];
  dataModified?: string[];
  accessGranted: boolean;
  securityLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface DataBreachIncident {
  incidentId: string;
  detectionDate: Date;
  reportingDate?: Date;
  affectedUsers: string[];
  dataTypes: string[];
  breachType: 'confidentiality' | 'integrity' | 'availability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  containmentMeasures: string[];
  notificationRequired: boolean;
  supervisoryAuthorityNotified: boolean;
  usersNotified: boolean;
  status: 'detected' | 'contained' | 'investigated' | 'resolved';
}

class GDPRComplianceService extends EventEmitter {
  private users: Map<string, GDPRCompliantUser> = new Map();
  private auditLogs: GDPRAuditLog[] = [];
  private dataBreaches: Map<string, DataBreachIncident> = new Map();
  private isInitialized = false;
  private complianceCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  /**
   * Initialize GDPR compliance service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load existing compliance data
      await this.loadComplianceData();
      
      // Start compliance monitoring
      this.startComplianceMonitoring();
      
      // Setup automated retention policies
      await this.setupRetentionPolicies();
      
      this.isInitialized = true;
      this.emit('initialized');
      
    } catch (error) {
      safeLogger.error('Failed to initialize GDPR compliance service:', error);
      throw error;
    }
  }

  /**
   * Register user for GDPR compliance
   */
  async registerUser(userId: string, email: string, isEUResident: boolean): Promise<void> {
    const user: GDPRCompliantUser = {
      userId,
      email,
      isEUResident,
      consentRecords: [],
      dataProcessingActivities: [],
      dataSubjectRights: [],
      privacySettings: this.getDefaultPrivacySettings(userId),
      dataRetentionSchedule: this.getDefaultRetentionSchedule(userId),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.set(userId, user);
    await this.persistUser(user);
    
    // Log registration
    await this.logDataProcessingActivity(userId, 'user_registration', ['email', 'profile'], 'contract');
    
    this.emit('userRegistered', user);
  }

  /**
   * Record consent for specific purpose
   */
  async recordConsent(
    userId: string,
    purpose: string,
    legalBasis: ConsentRecord['legalBasis'],
    consentGiven: boolean,
    consentMethod: ConsentRecord['consentMethod'],
    evidence: string
  ): Promise<string> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const consentRecord: ConsentRecord = {
      consentId: this.generateConsentId(),
      userId,
      purpose,
      legalBasis,
      consentGiven,
      consentDate: new Date(),
      consentMethod,
      consentEvidence: evidence,
      isActive: consentGiven,
      consentVersion: this.getCurrentConsentVersion()
    };

    user.consentRecords.push(consentRecord);
    user.updatedAt = new Date();
    
    await this.persistUser(user);
    await this.logAuditEvent(userId, 'consent_recorded', 'consent', purpose);
    
    this.emit('consentRecorded', consentRecord);
    
    return consentRecord.consentId;
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(userId: string, purpose: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const consentRecord = user.consentRecords.find(
      record => record.purpose === purpose && record.isActive
    );

    if (consentRecord) {
      consentRecord.isActive = false;
      consentRecord.withdrawalDate = new Date();
      user.updatedAt = new Date();
      
      await this.persistUser(user);
      await this.logAuditEvent(userId, 'consent_withdrawn', 'consent', purpose);
      
      // Trigger data deletion if required
      await this.handleConsentWithdrawal(userId, purpose);
      
      this.emit('consentWithdrawn', { userId, purpose });
    }
  }

  /**
   * Handle data subject rights request
   */
  async handleDataSubjectRequest(
    userId: string,
    rightType: DataSubjectRight['rightType'],
    requestDetails: any,
    verificationMethod: string
  ): Promise<string> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const request: DataSubjectRight = {
      requestId: this.generateRequestId(),
      userId,
      rightType,
      requestDate: new Date(),
      status: 'received',
      responseDeadline: this.calculateResponseDeadline(rightType),
      requestDetails,
      verificationMethod
    };

    user.dataSubjectRights.push(request);
    user.updatedAt = new Date();
    
    await this.persistUser(user);
    await this.logAuditEvent(userId, 'data_subject_request', 'request', rightType);
    
    // Process request
    await this.processDataSubjectRequest(request);
    
    this.emit('dataSubjectRequestReceived', request);
    
    return request.requestId;
  }

  /**
   * Get user data for access request
   */
  async getUserDataExport(userId: string): Promise<any> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await this.logAuditEvent(userId, 'data_access', 'export', 'data_subject_access');

    return {
      personalData: await this.getPersonalData(userId),
      consentRecords: user.consentRecords,
      processingActivities: user.dataProcessingActivities,
      privacySettings: user.privacySettings,
      auditLogs: this.getUserAuditLogs(userId),
      dataRetention: user.dataRetentionSchedule
    };
  }

  /**
   * Delete user data (right to be forgotten)
   */
  async deleteUserData(userId: string, reason: string = 'user_request'): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if deletion is legally required or permitted
    const canDelete = await this.validateDeletionRequest(userId);
    if (!canDelete) {
      throw new Error('Data deletion not permitted due to legal obligations');
    }

    // Delete user data across all systems
    await this.performDataDeletion(userId);
    
    // Remove from compliance tracking
    this.users.delete(userId);
    
    await this.logAuditEvent(userId, 'data_deleted', 'user_data', reason);
    
    this.emit('userDataDeleted', { userId, reason });
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(userId: string, settings: Partial<PrivacySettings>): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.privacySettings = { ...user.privacySettings, ...settings };
    user.updatedAt = new Date();
    
    await this.persistUser(user);
    await this.logAuditEvent(userId, 'privacy_settings_updated', 'settings', 'user_preference');
    
    this.emit('privacySettingsUpdated', { userId, settings });
  }

  /**
   * Report data breach
   */
  async reportDataBreach(
    affectedUsers: string[],
    dataTypes: string[],
    breachType: DataBreachIncident['breachType'],
    severity: DataBreachIncident['severity']
  ): Promise<string> {
    const incident: DataBreachIncident = {
      incidentId: this.generateIncidentId(),
      detectionDate: new Date(),
      affectedUsers,
      dataTypes,
      breachType,
      severity,
      containmentMeasures: [],
      notificationRequired: severity === 'high' || severity === 'critical',
      supervisoryAuthorityNotified: false,
      usersNotified: false,
      status: 'detected'
    };

    this.dataBreaches.set(incident.incidentId, incident);
    await this.persistDataBreach(incident);
    
    // Determine notification requirements
    if (incident.notificationRequired) {
      await this.scheduleBreachNotifications(incident);
    }
    
    this.emit('dataBreachReported', incident);
    
    return incident.incidentId;
  }

  /**
   * Get compliance status for user
   */
  async getComplianceStatus(userId: string): Promise<any> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      isCompliant: await this.checkUserCompliance(userId),
      consentStatus: this.getConsentStatus(user),
      dataRetentionStatus: this.getRetentionStatus(user),
      pendingRequests: user.dataSubjectRights.filter(r => r.status !== 'completed'),
      lastAudit: this.getLastAuditDate(userId),
      riskLevel: await this.assessComplianceRisk(userId)
    };
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<any> {
    const report = {
      reportPeriod: { startDate, endDate },
      totalUsers: this.users.size,
      euUsers: Array.from(this.users.values()).filter(u => u.isEUResident).length,
      consentMetrics: await this.getConsentMetrics(startDate, endDate),
      dataSubjectRequests: await this.getDataSubjectRequestMetrics(startDate, endDate),
      dataBreaches: await this.getDataBreachMetrics(startDate, endDate),
      complianceScore: await this.calculateComplianceScore(),
      recommendations: await this.generateComplianceRecommendations()
    };

    await this.logAuditEvent(undefined, 'compliance_report_generated', 'report', 'regulatory_compliance');
    
    return report;
  }

  /**
   * Process data subject request
   */
  private async processDataSubjectRequest(request: DataSubjectRight): Promise<void> {
    try {
      request.status = 'processing';
      
      let responseData: any;
      
      switch (request.rightType) {
        case 'access':
          responseData = await this.getUserDataExport(request.userId);
          break;
        case 'rectification':
          responseData = await this.rectifyUserData(request.userId, request.requestDetails);
          break;
        case 'erasure':
          await this.deleteUserData(request.userId, 'data_subject_request');
          responseData = { deleted: true };
          break;
        case 'portability':
          responseData = await this.exportPortableData(request.userId);
          break;
        case 'restriction':
          responseData = await this.restrictDataProcessing(request.userId);
          break;
        case 'objection':
          responseData = await this.handleProcessingObjection(request.userId, request.requestDetails);
          break;
      }
      
      request.status = 'completed';
      request.completionDate = new Date();
      request.responseData = responseData;
      
      const user = this.users.get(request.userId);
      if (user) {
        await this.persistUser(user);
      }
      
      this.emit('dataSubjectRequestCompleted', request);
      
    } catch (error) {
      request.status = 'rejected';
      request.rejectionReason = error instanceof Error ? error.message : 'Unknown error';
      
      this.emit('dataSubjectRequestFailed', { request, error });
    }
  }

  /**
   * Start compliance monitoring
   */
  private startComplianceMonitoring(): void {
    // Run compliance checks daily
    this.complianceCheckInterval = setInterval(async () => {
      await this.runComplianceChecks();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Run automated compliance checks
   */
  private async runComplianceChecks(): Promise<void> {
    // Check consent expiry
    await this.checkConsentExpiry();
    
    // Enforce retention policies
    await this.enforceRetentionPolicies();
    
    // Check pending requests
    await this.checkPendingRequests();
    
    // Validate data processing activities
    await this.validateProcessingActivities();
  }

  // Helper methods
  private generateConsentId(): string {
    return `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `request_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateIncidentId(): string {
    return `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentConsentVersion(): string {
    return '1.0.0';
  }

  private calculateResponseDeadline(rightType: string): Date {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30); // 30 days as per GDPR
    return deadline;
  }

  private getDefaultPrivacySettings(userId: string): PrivacySettings {
    return {
      userId,
      dataMinimization: true,
      pseudonymization: true,
      encryption: true,
      accessLogging: true,
      dataPortability: true,
      rightToBeForgotten: true,
      marketingOptOut: false,
      profilingOptOut: false,
      thirdPartySharing: false,
      cookieConsent: {
        necessary: true,
        functional: false,
        analytics: false,
        marketing: false,
        consentDate: new Date(),
        consentString: ''
      }
    };
  }

  private getDefaultRetentionSchedule(userId: string): DataRetentionSchedule {
    return {
      userId,
      dataType: 'user_profile',
      retentionPeriod: 2555, // 7 years
      deletionDate: new Date(Date.now() + 2555 * 24 * 60 * 60 * 1000),
      deletionReason: 'retention_policy',
      isActive: true
    };
  }

  // Placeholder methods for implementation
  private async loadComplianceData(): Promise<void> {
    // Load from database
  }

  private async setupRetentionPolicies(): Promise<void> {
    // Setup retention policies
  }

  private async persistUser(user: GDPRCompliantUser): Promise<void> {
    // Persist to database
  }

  private async persistDataBreach(incident: DataBreachIncident): Promise<void> {
    // Persist to database
  }

  private async logDataProcessingActivity(userId: string, activity: string, dataCategories: string[], legalBasis: string): Promise<void> {
    // Log processing activity
  }

  private async logAuditEvent(userId: string | undefined, action: string, dataType: string, purpose: string): Promise<void> {
    // Log audit event
  }

  private async handleConsentWithdrawal(userId: string, purpose: string): Promise<void> {
    // Handle consent withdrawal
  }

  private async getPersonalData(userId: string): Promise<any> {
    // Get personal data
    return {};
  }

  private getUserAuditLogs(userId: string): GDPRAuditLog[] {
    return this.auditLogs.filter(log => log.userId === userId);
  }

  private async validateDeletionRequest(userId: string): Promise<boolean> {
    // Validate deletion request
    return true;
  }

  private async performDataDeletion(userId: string): Promise<void> {
    // Perform data deletion
  }

  private async scheduleBreachNotifications(incident: DataBreachIncident): Promise<void> {
    // Schedule breach notifications
  }

  private async checkUserCompliance(userId: string): Promise<boolean> {
    // Check user compliance
    return true;
  }

  private getConsentStatus(user: GDPRCompliantUser): any {
    // Get consent status
    return {};
  }

  private getRetentionStatus(user: GDPRCompliantUser): any {
    // Get retention status
    return {};
  }

  private getLastAuditDate(userId: string): Date | null {
    // Get last audit date
    return null;
  }

  private async assessComplianceRisk(userId: string): Promise<string> {
    // Assess compliance risk
    return 'low';
  }

  private async getConsentMetrics(startDate: Date, endDate: Date): Promise<any> {
    // Get consent metrics
    return {};
  }

  private async getDataSubjectRequestMetrics(startDate: Date, endDate: Date): Promise<any> {
    // Get data subject request metrics
    return {};
  }

  private async getDataBreachMetrics(startDate: Date, endDate: Date): Promise<any> {
    // Get data breach metrics
    return {};
  }

  private async calculateComplianceScore(): Promise<number> {
    // Calculate compliance score
    return 95;
  }

  private async generateComplianceRecommendations(): Promise<string[]> {
    // Generate recommendations
    return [];
  }

  private async rectifyUserData(userId: string, updates: any): Promise<any> {
    // Rectify user data
    return {};
  }

  private async exportPortableData(userId: string): Promise<any> {
    // Export portable data
    return {};
  }

  private async restrictDataProcessing(userId: string): Promise<any> {
    // Restrict data processing
    return {};
  }

  private async handleProcessingObjection(userId: string, details: any): Promise<any> {
    // Handle processing objection
    return {};
  }

  private async checkConsentExpiry(): Promise<void> {
    // Check consent expiry
  }

  private async enforceRetentionPolicies(): Promise<void> {
    // Enforce retention policies
  }

  private async checkPendingRequests(): Promise<void> {
    // Check pending requests
  }

  private async validateProcessingActivities(): Promise<void> {
    // Validate processing activities
  }
}

export const gdprComplianceService = new GDPRComplianceService();
