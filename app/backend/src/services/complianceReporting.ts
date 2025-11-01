import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';

/**
 * Compliance Reporting and Audit Trail System for LDAO Token Acquisition
 * Handles regulatory reporting, audit trails, and compliance documentation
 */

export interface AuditTrailEntry {
  id: string;
  timestamp: Date;
  user_id?: string;
  action: string;
  resource_type: 'USER' | 'TRANSACTION' | 'KYC' | 'SYSTEM' | 'COMPLIANCE';
  resource_id: string;
  old_values?: any;
  new_values?: any;
  metadata: {
    ip_address?: string;
    user_agent?: string;
    session_id?: string;
    api_endpoint?: string;
    request_id?: string;
  };
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  compliance_relevant: boolean;
}

export interface RegulatoryReport {
  id: string;
  report_type: 'SAR' | 'CTR' | 'FBAR' | 'FINCEN' | 'GDPR' | 'CCPA' | 'CUSTOM';
  jurisdiction: string;
  reporting_period: {
    start_date: Date;
    end_date: Date;
  };
  generated_at: Date;
  generated_by: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'FILED' | 'REJECTED';
  data: any;
  file_path?: string;
  filing_reference?: string;
  filing_date?: Date;
  reviewer?: string;
  review_notes?: string;
  regulatory_body: string;
  deadline: Date;
  auto_generated: boolean;
}

export interface CompliancePolicy {
  id: string;
  name: string;
  description: string;
  policy_type: 'KYC' | 'AML' | 'DATA_PROTECTION' | 'TRANSACTION_LIMITS' | 'REPORTING';
  jurisdiction: string;
  effective_date: Date;
  expiry_date?: Date;
  version: string;
  rules: PolicyRule[];
  enforcement_level: 'ADVISORY' | 'WARNING' | 'BLOCKING' | 'REPORTING';
  created_by: string;
  approved_by?: string;
  approval_date?: Date;
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  condition: string; // JSON logic expression
  action: string;
  parameters: any;
  enabled: boolean;
}

export interface ComplianceViolation {
  id: string;
  policy_id: string;
  rule_id: string;
  violation_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  user_id?: string;
  transaction_id?: string;
  detected_at: Date;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  resolution_notes?: string;
  resolved_by?: string;
  resolved_at?: Date;
  remediation_actions: string[];
}

export interface DataRetentionPolicy {
  id: string;
  data_type: string;
  retention_period_days: number;
  jurisdiction: string;
  legal_basis: string;
  deletion_method: 'SOFT_DELETE' | 'HARD_DELETE' | 'ANONYMIZE';
  exceptions: string[];
  created_at: Date;
  updated_at: Date;
}

export interface PrivacyRequest {
  id: string;
  user_id: string;
  request_type: 'ACCESS' | 'RECTIFICATION' | 'ERASURE' | 'PORTABILITY' | 'RESTRICTION' | 'OBJECTION';
  jurisdiction: 'GDPR' | 'CCPA' | 'PIPEDA' | 'OTHER';
  submitted_at: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'PARTIALLY_COMPLETED';
  deadline: Date;
  description: string;
  verification_method: string;
  verification_status: 'PENDING' | 'VERIFIED' | 'FAILED';
  processing_notes: string[];
  completed_at?: Date;
  data_provided?: string; // File path or data reference
}

export class ComplianceReportingService extends EventEmitter {
  private auditTrail: Map<string, AuditTrailEntry> = new Map();
  private regulatoryReports: Map<string, RegulatoryReport> = new Map();
  private compliancePolicies: Map<string, CompliancePolicy> = new Map();
  private violations: Map<string, ComplianceViolation> = new Map();
  private retentionPolicies: Map<string, DataRetentionPolicy> = new Map();
  private privacyRequests: Map<string, PrivacyRequest> = new Map();
  private reportsDirectory: string;

  constructor(reportsDirectory: string = './compliance-reports') {
    super();
    this.reportsDirectory = reportsDirectory;
    this.initializeDefaultPolicies();
    this.initializeRetentionPolicies();
  }

  /**
   * Initialize default compliance policies
   */
  private initializeDefaultPolicies(): void {
    // KYC Policy
    this.addCompliancePolicy({
      id: 'KYC_POLICY_US',
      name: 'US KYC Requirements',
      description: 'Know Your Customer requirements for US jurisdiction',
      policy_type: 'KYC',
      jurisdiction: 'US',
      effective_date: new Date('2024-01-01'),
      version: '1.0',
      rules: [
        {
          id: 'KYC_VERIFICATION_REQUIRED',
          name: 'KYC Verification Required',
          description: 'Users must complete KYC verification for transactions over $3000',
          condition: JSON.stringify({ '>': [{ 'var': 'transaction.amount' }, 3000] }),
          action: 'REQUIRE_KYC_VERIFICATION',
          parameters: { verification_level: 'BASIC' },
          enabled: true
        }
      ],
      enforcement_level: 'BLOCKING',
      created_by: 'SYSTEM'
    });

    // AML Policy
    this.addCompliancePolicy({
      id: 'AML_POLICY_US',
      name: 'US AML Requirements',
      description: 'Anti-Money Laundering requirements for US jurisdiction',
      policy_type: 'AML',
      jurisdiction: 'US',
      effective_date: new Date('2024-01-01'),
      version: '1.0',
      rules: [
        {
          id: 'SAR_REPORTING_THRESHOLD',
          name: 'SAR Reporting Threshold',
          description: 'File SAR for suspicious transactions over $5000',
          condition: JSON.stringify({ 
            'and': [
              { '>': [{ 'var': 'transaction.amount' }, 5000] },
              { '==': [{ 'var': 'transaction.suspicious' }, true] }
            ]
          }),
          action: 'FILE_SAR',
          parameters: { report_type: 'SAR', deadline_days: 30 },
          enabled: true
        }
      ],
      enforcement_level: 'REPORTING',
      created_by: 'SYSTEM'
    });

    // GDPR Policy
    this.addCompliancePolicy({
      id: 'GDPR_POLICY_EU',
      name: 'GDPR Data Protection',
      description: 'General Data Protection Regulation compliance for EU users',
      policy_type: 'DATA_PROTECTION',
      jurisdiction: 'EU',
      effective_date: new Date('2024-01-01'),
      version: '1.0',
      rules: [
        {
          id: 'CONSENT_REQUIRED',
          name: 'Consent Required for Data Processing',
          description: 'Explicit consent required for processing personal data',
          condition: JSON.stringify({ '==': [{ 'var': 'user.jurisdiction' }, 'EU'] }),
          action: 'REQUIRE_CONSENT',
          parameters: { consent_type: 'EXPLICIT' },
          enabled: true
        }
      ],
      enforcement_level: 'BLOCKING',
      created_by: 'SYSTEM'
    });
  }

  /**
   * Initialize data retention policies
   */
  private initializeRetentionPolicies(): void {
    // Transaction data retention
    this.addRetentionPolicy({
      id: 'TRANSACTION_RETENTION',
      data_type: 'TRANSACTION_DATA',
      retention_period_days: 2555, // 7 years
      jurisdiction: 'US',
      legal_basis: 'Bank Secrecy Act requirements',
      deletion_method: 'SOFT_DELETE',
      exceptions: ['ONGOING_INVESTIGATION', 'LEGAL_HOLD']
    });

    // KYC data retention
    this.addRetentionPolicy({
      id: 'KYC_RETENTION',
      data_type: 'KYC_DATA',
      retention_period_days: 1825, // 5 years
      jurisdiction: 'US',
      legal_basis: 'Customer Due Diligence requirements',
      deletion_method: 'ANONYMIZE',
      exceptions: ['ACTIVE_ACCOUNT', 'REGULATORY_REQUEST']
    });

    // Personal data retention (GDPR)
    this.addRetentionPolicy({
      id: 'PERSONAL_DATA_GDPR',
      data_type: 'PERSONAL_DATA',
      retention_period_days: 1095, // 3 years
      jurisdiction: 'EU',
      legal_basis: 'Legitimate business interest',
      deletion_method: 'HARD_DELETE',
      exceptions: ['USER_CONSENT_EXTENDED', 'LEGAL_OBLIGATION']
    });
  }

  /**
   * Log audit trail entry
   */
  async logAuditTrail(entry: Omit<AuditTrailEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: AuditTrailEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...entry
    };

    this.auditTrail.set(auditEntry.id, auditEntry);

    // Log to system logger
    logger.info('Audit trail entry created', {
      auditId: auditEntry.id,
      action: auditEntry.action,
      resourceType: auditEntry.resource_type,
      resourceId: auditEntry.resource_id,
      userId: auditEntry.user_id,
      complianceRelevant: auditEntry.compliance_relevant
    });

    // Check for compliance violations
    if (auditEntry.compliance_relevant) {
      await this.checkComplianceViolations(auditEntry);
    }

    this.emit('auditTrailEntry', auditEntry);
  }

  /**
   * Check for compliance violations
   */
  private async checkComplianceViolations(auditEntry: AuditTrailEntry): Promise<void> {
    for (const policy of this.compliancePolicies.values()) {
      for (const rule of policy.rules) {
        if (!rule.enabled) continue;

        const violation = await this.evaluateComplianceRule(policy, rule, auditEntry);
        if (violation) {
          await this.recordComplianceViolation(violation);
        }
      }
    }
  }

  /**
   * Evaluate compliance rule
   */
  private async evaluateComplianceRule(
    policy: CompliancePolicy,
    rule: PolicyRule,
    auditEntry: AuditTrailEntry
  ): Promise<ComplianceViolation | null> {
    try {
      // This would typically use a JSON logic library to evaluate conditions
      // For now, we'll implement basic checks
      
      const context = {
        audit: auditEntry,
        user: { id: auditEntry.user_id },
        transaction: auditEntry.new_values
      };

      // Simulate rule evaluation
      const ruleViolated = await this.simulateRuleEvaluation(rule, context);

      if (ruleViolated) {
        return {
          id: crypto.randomUUID(),
          policy_id: policy.id,
          rule_id: rule.id,
          violation_type: rule.name,
          severity: this.determineSeverity(policy.enforcement_level),
          description: `Compliance violation: ${rule.description}`,
          user_id: auditEntry.user_id,
          detected_at: new Date(),
          status: 'OPEN',
          remediation_actions: []
        };
      }

      return null;

    } catch (error) {
      logger.error('Error evaluating compliance rule', {
        policyId: policy.id,
        ruleId: rule.id,
        error
      });
      return null;
    }
  }

  /**
   * Simulate rule evaluation
   */
  private async simulateRuleEvaluation(rule: PolicyRule, context: any): Promise<boolean> {
    // This is a simplified simulation
    // In a real implementation, you would use a proper JSON logic library
    
    if (rule.id === 'KYC_VERIFICATION_REQUIRED') {
      return context.transaction?.amount > 3000 && !context.user?.kyc_verified;
    }

    if (rule.id === 'SAR_REPORTING_THRESHOLD') {
      return context.transaction?.amount > 5000 && context.transaction?.suspicious;
    }

    return false;
  }

  /**
   * Determine severity from enforcement level
   */
  private determineSeverity(enforcementLevel: string): ComplianceViolation['severity'] {
    switch (enforcementLevel) {
      case 'BLOCKING':
        return 'CRITICAL';
      case 'REPORTING':
        return 'HIGH';
      case 'WARNING':
        return 'MEDIUM';
      default:
        return 'LOW';
    }
  }

  /**
   * Record compliance violation
   */
  private async recordComplianceViolation(violation: ComplianceViolation): Promise<void> {
    this.violations.set(violation.id, violation);

    logger.error('Compliance violation detected', {
      violationId: violation.id,
      policyId: violation.policy_id,
      ruleId: violation.rule_id,
      severity: violation.severity,
      userId: violation.user_id
    });

    this.emit('complianceViolation', violation);

    // Trigger automated remediation if configured
    await this.triggerAutomatedRemediation(violation);
  }

  /**
   * Trigger automated remediation
   */
  private async triggerAutomatedRemediation(violation: ComplianceViolation): Promise<void> {
    const policy = this.compliancePolicies.get(violation.policy_id);
    if (!policy) return;

    switch (policy.enforcement_level) {
      case 'BLOCKING':
        // Block the transaction or user action
        violation.remediation_actions.push('TRANSACTION_BLOCKED');
        break;
      
      case 'REPORTING':
        // Generate regulatory report
        await this.generateAutomaticReport(violation);
        violation.remediation_actions.push('REGULATORY_REPORT_GENERATED');
        break;
      
      case 'WARNING':
        // Send warning notification
        violation.remediation_actions.push('WARNING_NOTIFICATION_SENT');
        break;
    }
  }

  /**
   * Generate automatic regulatory report
   */
  private async generateAutomaticReport(violation: ComplianceViolation): Promise<void> {
    const policy = this.compliancePolicies.get(violation.policy_id);
    if (!policy) return;

    const rule = policy.rules.find(r => r.id === violation.rule_id);
    if (!rule || rule.action !== 'FILE_SAR') return;

    const reportId = crypto.randomUUID();
    const report: RegulatoryReport = {
      id: reportId,
      report_type: 'SAR',
      jurisdiction: policy.jurisdiction,
      reporting_period: {
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end_date: new Date()
      },
      generated_at: new Date(),
      generated_by: 'AUTOMATED_SYSTEM',
      status: 'DRAFT',
      data: {
        violation_id: violation.id,
        user_id: violation.user_id,
        transaction_id: violation.transaction_id,
        violation_description: violation.description,
        detection_date: violation.detected_at
      },
      regulatory_body: 'FinCEN',
      deadline: new Date(Date.now() + rule.parameters.deadline_days * 24 * 60 * 60 * 1000),
      auto_generated: true
    };

    this.regulatoryReports.set(reportId, report);

    logger.info('Automatic regulatory report generated', {
      reportId,
      reportType: report.report_type,
      violationId: violation.id
    });

    this.emit('regulatoryReportGenerated', report);
  }

  /**
   * Generate regulatory report
   */
  async generateRegulatoryReport(
    reportType: RegulatoryReport['report_type'],
    jurisdiction: string,
    periodStart: Date,
    periodEnd: Date,
    generatedBy: string
  ): Promise<RegulatoryReport> {
    const reportId = crypto.randomUUID();
    
    // Collect relevant data for the reporting period
    const reportData = await this.collectReportData(reportType, periodStart, periodEnd);
    
    const report: RegulatoryReport = {
      id: reportId,
      report_type: reportType,
      jurisdiction,
      reporting_period: {
        start_date: periodStart,
        end_date: periodEnd
      },
      generated_at: new Date(),
      generated_by: generatedBy,
      status: 'DRAFT',
      data: reportData,
      regulatory_body: this.getRegulatoryBody(reportType, jurisdiction),
      deadline: this.calculateReportingDeadline(reportType),
      auto_generated: false
    };

    this.regulatoryReports.set(reportId, report);

    // Generate report file
    const filePath = await this.generateReportFile(report);
    report.file_path = filePath;

    logger.info('Regulatory report generated', {
      reportId,
      reportType,
      jurisdiction,
      periodStart,
      periodEnd
    });

    this.emit('regulatoryReportGenerated', report);
    return report;
  }

  /**
   * Collect report data
   */
  private async collectReportData(
    reportType: RegulatoryReport['report_type'],
    periodStart: Date,
    periodEnd: Date
  ): Promise<any> {
    const auditEntries = Array.from(this.auditTrail.values())
      .filter(entry => 
        entry.timestamp >= periodStart && 
        entry.timestamp <= periodEnd &&
        entry.compliance_relevant
      );

    const violations = Array.from(this.violations.values())
      .filter(violation => 
        violation.detected_at >= periodStart && 
        violation.detected_at <= periodEnd
      );

    switch (reportType) {
      case 'SAR':
        return {
          suspicious_activities: violations.filter(v => v.severity === 'HIGH' || v.severity === 'CRITICAL'),
          total_suspicious_transactions: violations.length,
          reporting_period: { start: periodStart, end: periodEnd }
        };
      
      case 'CTR':
        return {
          large_transactions: auditEntries.filter(e => 
            e.action === 'TRANSACTION_CREATED' && 
            e.new_values?.amount > 10000
          ),
          total_large_transactions: auditEntries.length,
          reporting_period: { start: periodStart, end: periodEnd }
        };
      
      case 'GDPR':
        return {
          privacy_requests: Array.from(this.privacyRequests.values())
            .filter(r => r.submitted_at >= periodStart && r.submitted_at <= periodEnd),
          data_breaches: violations.filter(v => v.violation_type.includes('DATA_BREACH')),
          consent_records: auditEntries.filter(e => e.action.includes('CONSENT')),
          reporting_period: { start: periodStart, end: periodEnd }
        };
      
      default:
        return {
          audit_entries: auditEntries,
          violations: violations,
          reporting_period: { start: periodStart, end: periodEnd }
        };
    }
  }

  /**
   * Generate report file
   */
  private async generateReportFile(report: RegulatoryReport): Promise<string> {
    try {
      // Ensure reports directory exists
      await fs.mkdir(this.reportsDirectory, { recursive: true });

      const fileName = `${report.report_type}_${report.jurisdiction}_${report.id}.json`;
      const filePath = path.join(this.reportsDirectory, fileName);

      const reportContent = {
        report_metadata: {
          id: report.id,
          type: report.report_type,
          jurisdiction: report.jurisdiction,
          generated_at: report.generated_at,
          generated_by: report.generated_by,
          reporting_period: report.reporting_period
        },
        report_data: report.data
      };

      await fs.writeFile(filePath, JSON.stringify(reportContent, null, 2));

      logger.info('Report file generated', {
        reportId: report.id,
        filePath
      });

      return filePath;

    } catch (error) {
      logger.error('Failed to generate report file', {
        reportId: report.id,
        error
      });
      throw error;
    }
  }

  /**
   * Process privacy request
   */
  async processPrivacyRequest(
    userId: string,
    requestType: PrivacyRequest['request_type'],
    jurisdiction: PrivacyRequest['jurisdiction'],
    description: string
  ): Promise<PrivacyRequest> {
    const requestId = crypto.randomUUID();
    
    const request: PrivacyRequest = {
      id: requestId,
      user_id: userId,
      request_type: requestType,
      jurisdiction,
      submitted_at: new Date(),
      status: 'PENDING',
      deadline: this.calculatePrivacyRequestDeadline(jurisdiction),
      description,
      verification_method: 'EMAIL_VERIFICATION',
      verification_status: 'PENDING',
      processing_notes: []
    };

    this.privacyRequests.set(requestId, request);

    // Log audit trail
    await this.logAuditTrail({
      user_id: userId,
      action: 'PRIVACY_REQUEST_SUBMITTED',
      resource_type: 'USER',
      resource_id: userId,
      new_values: { request_type: requestType, jurisdiction },
      metadata: {},
      severity: 'INFO',
      compliance_relevant: true
    });

    logger.info('Privacy request submitted', {
      requestId,
      userId,
      requestType,
      jurisdiction
    });

    this.emit('privacyRequestSubmitted', request);
    return request;
  }

  /**
   * Add compliance policy
   */
  addCompliancePolicy(policy: Omit<CompliancePolicy, 'created_at' | 'updated_at'>): void {
    const fullPolicy: CompliancePolicy = {
      ...policy,
      created_at: new Date(),
      updated_at: new Date()
    } as CompliancePolicy;
    
    this.compliancePolicies.set(policy.id, fullPolicy);
    
    logger.info('Compliance policy added', {
      policyId: policy.id,
      policyName: policy.name,
      jurisdiction: policy.jurisdiction
    });
  }

  /**
   * Add retention policy
   */
  addRetentionPolicy(policy: Omit<DataRetentionPolicy, 'created_at' | 'updated_at'>): void {
    const fullPolicy: DataRetentionPolicy = {
      ...policy,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    this.retentionPolicies.set(policy.id, fullPolicy);
    
    logger.info('Data retention policy added', {
      policyId: policy.id,
      dataType: policy.data_type,
      retentionDays: policy.retention_period_days
    });
  }

  /**
   * Get audit trail entries
   */
  getAuditTrail(
    startDate?: Date,
    endDate?: Date,
    userId?: string,
    resourceType?: string
  ): AuditTrailEntry[] {
    let entries = Array.from(this.auditTrail.values());

    if (startDate) {
      entries = entries.filter(e => e.timestamp >= startDate);
    }

    if (endDate) {
      entries = entries.filter(e => e.timestamp <= endDate);
    }

    if (userId) {
      entries = entries.filter(e => e.user_id === userId);
    }

    if (resourceType) {
      entries = entries.filter(e => e.resource_type === resourceType);
    }

    return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get compliance violations
   */
  getComplianceViolations(status?: ComplianceViolation['status']): ComplianceViolation[] {
    const violations = Array.from(this.violations.values());
    
    if (status) {
      return violations.filter(v => v.status === status);
    }
    
    return violations;
  }

  /**
   * Get regulatory reports
   */
  getRegulatoryReports(status?: RegulatoryReport['status']): RegulatoryReport[] {
    const reports = Array.from(this.regulatoryReports.values());
    
    if (status) {
      return reports.filter(r => r.status === status);
    }
    
    return reports;
  }

  /**
   * Helper methods
   */
  private getRegulatoryBody(reportType: string, jurisdiction: string): string {
    const bodies = {
      'US': {
        'SAR': 'FinCEN',
        'CTR': 'FinCEN',
        'FBAR': 'FinCEN'
      },
      'EU': {
        'GDPR': 'Data Protection Authority'
      }
    };

    return bodies[jurisdiction]?.[reportType] || 'Regulatory Authority';
  }

  private calculateReportingDeadline(reportType: string): Date {
    const deadlines = {
      'SAR': 30, // 30 days
      'CTR': 15, // 15 days
      'GDPR': 72 // 72 hours for breach notification
    };

    const days = deadlines[reportType] || 30;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private calculatePrivacyRequestDeadline(jurisdiction: string): Date {
    const deadlines = {
      'GDPR': 30, // 30 days
      'CCPA': 45, // 45 days
      'PIPEDA': 30 // 30 days
    };

    const days = deadlines[jurisdiction] || 30;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}

export const complianceReporting = new ComplianceReportingService();
