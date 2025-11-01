import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';

/**
 * AML Transaction Monitoring Service for LDAO Token Acquisition System
 * Monitors transactions for suspicious activity and regulatory compliance
 */

export interface Transaction {
  id: string;
  user_id: string;
  transaction_type: 'PURCHASE' | 'SALE' | 'TRANSFER' | 'STAKE' | 'UNSTAKE' | 'BRIDGE';
  amount: number;
  currency: string;
  timestamp: Date;
  source_address?: string;
  destination_address?: string;
  payment_method?: string;
  blockchain_hash?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'BLOCKED' | 'UNDER_REVIEW';
  metadata: {
    ip_address?: string;
    user_agent?: string;
    device_fingerprint?: string;
    geolocation?: {
      country: string;
      region: string;
      city: string;
    };
  };
}

export interface SuspiciousActivityReport {
  id: string;
  transaction_ids: string[];
  user_id: string;
  report_type: 'STRUCTURING' | 'UNUSUAL_PATTERN' | 'HIGH_RISK_JURISDICTION' | 'VELOCITY' | 'ROUND_DOLLAR' | 'SMURFING' | 'LAYERING';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  indicators: SuspiciousIndicator[];
  created_at: Date;
  status: 'OPEN' | 'UNDER_INVESTIGATION' | 'FILED' | 'CLOSED' | 'FALSE_POSITIVE';
  assigned_to?: string;
  filed_with_authorities?: boolean;
  filing_date?: Date;
  resolution_notes?: string;
}

export interface SuspiciousIndicator {
  indicator_type: string;
  description: string;
  risk_score: number;
  threshold_exceeded: boolean;
  supporting_data: any;
}

export interface MonitoringRule {
  id: string;
  name: string;
  description: string;
  rule_type: 'THRESHOLD' | 'PATTERN' | 'VELOCITY' | 'GEOGRAPHIC' | 'BEHAVIORAL';
  enabled: boolean;
  parameters: {
    threshold_amount?: number;
    time_window_hours?: number;
    transaction_count?: number;
    risk_countries?: string[];
    pattern_indicators?: string[];
  };
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  action: 'ALERT' | 'BLOCK' | 'REVIEW' | 'REPORT';
  created_at: Date;
  updated_at: Date;
}

export interface UserTransactionProfile {
  user_id: string;
  total_volume: number;
  transaction_count: number;
  average_transaction_size: number;
  first_transaction_date: Date;
  last_transaction_date: Date;
  preferred_currencies: string[];
  common_transaction_times: number[]; // Hours of day
  geographic_patterns: {
    countries: string[];
    suspicious_locations: string[];
  };
  velocity_metrics: {
    daily_volume: number;
    weekly_volume: number;
    monthly_volume: number;
  };
  risk_indicators: {
    structuring_score: number;
    velocity_score: number;
    pattern_score: number;
    geographic_score: number;
  };
}

export interface ComplianceReport {
  id: string;
  report_type: 'SAR' | 'CTR' | 'SUSPICIOUS_ACTIVITY' | 'REGULATORY_FILING';
  period_start: Date;
  period_end: Date;
  generated_at: Date;
  data: {
    total_transactions: number;
    total_volume: number;
    suspicious_reports: number;
    blocked_transactions: number;
    high_risk_users: number;
    regulatory_filings: number;
  };
  file_path?: string;
}

export class AMLTransactionMonitoringService extends EventEmitter {
  private transactions: Map<string, Transaction> = new Map();
  private suspiciousReports: Map<string, SuspiciousActivityReport> = new Map();
  private monitoringRules: Map<string, MonitoringRule> = new Map();
  private userProfiles: Map<string, UserTransactionProfile> = new Map();

  constructor() {
    super();
    this.initializeMonitoringRules();
  }

  /**
   * Initialize default monitoring rules
   */
  private initializeMonitoringRules(): void {
    // Large transaction threshold rule
    this.addMonitoringRule({
      id: 'LARGE_TRANSACTION',
      name: 'Large Transaction Monitoring',
      description: 'Monitor transactions above $10,000',
      rule_type: 'THRESHOLD',
      enabled: true,
      parameters: {
        threshold_amount: 10000
      },
      severity: 'HIGH',
      action: 'REVIEW'
    });

    // Structuring detection rule
    this.addMonitoringRule({
      id: 'STRUCTURING_DETECTION',
      name: 'Structuring Detection',
      description: 'Detect multiple transactions just below reporting thresholds',
      rule_type: 'PATTERN',
      enabled: true,
      parameters: {
        threshold_amount: 9500,
        time_window_hours: 24,
        transaction_count: 3
      },
      severity: 'CRITICAL',
      action: 'REPORT'
    });

    // High velocity rule
    this.addMonitoringRule({
      id: 'HIGH_VELOCITY',
      name: 'High Velocity Transactions',
      description: 'Monitor rapid succession of transactions',
      rule_type: 'VELOCITY',
      enabled: true,
      parameters: {
        transaction_count: 10,
        time_window_hours: 1
      },
      severity: 'MEDIUM',
      action: 'ALERT'
    });

    // High-risk jurisdiction rule
    this.addMonitoringRule({
      id: 'HIGH_RISK_JURISDICTION',
      name: 'High Risk Jurisdiction',
      description: 'Monitor transactions from high-risk countries',
      rule_type: 'GEOGRAPHIC',
      enabled: true,
      parameters: {
        risk_countries: ['XX', 'YY', 'ZZ'] // Placeholder country codes
      },
      severity: 'HIGH',
      action: 'REVIEW'
    });

    // Round dollar amounts rule
    this.addMonitoringRule({
      id: 'ROUND_DOLLAR_AMOUNTS',
      name: 'Round Dollar Amounts',
      description: 'Monitor transactions with round dollar amounts',
      rule_type: 'PATTERN',
      enabled: true,
      parameters: {
        pattern_indicators: ['ROUND_AMOUNT']
      },
      severity: 'LOW',
      action: 'ALERT'
    });
  }

  /**
   * Process new transaction
   */
  async processTransaction(transaction: Transaction): Promise<void> {
    this.transactions.set(transaction.id, transaction);

    logger.info('Processing transaction for AML monitoring', {
      transactionId: transaction.id,
      userId: transaction.user_id,
      amount: transaction.amount,
      type: transaction.transaction_type
    });

    // Update user transaction profile
    await this.updateUserProfile(transaction);

    // Run monitoring rules
    const alerts = await this.runMonitoringRules(transaction);

    // Process any alerts generated
    for (const alert of alerts) {
      await this.processAlert(alert, transaction);
    }

    this.emit('transactionProcessed', transaction);
  }

  /**
   * Update user transaction profile
   */
  private async updateUserProfile(transaction: Transaction): Promise<void> {
    let profile = this.userProfiles.get(transaction.user_id);
    
    if (!profile) {
      profile = {
        user_id: transaction.user_id,
        total_volume: 0,
        transaction_count: 0,
        average_transaction_size: 0,
        first_transaction_date: transaction.timestamp,
        last_transaction_date: transaction.timestamp,
        preferred_currencies: [],
        common_transaction_times: [],
        geographic_patterns: {
          countries: [],
          suspicious_locations: []
        },
        velocity_metrics: {
          daily_volume: 0,
          weekly_volume: 0,
          monthly_volume: 0
        },
        risk_indicators: {
          structuring_score: 0,
          velocity_score: 0,
          pattern_score: 0,
          geographic_score: 0
        }
      };
    }

    // Update basic metrics
    profile.total_volume += transaction.amount;
    profile.transaction_count += 1;
    profile.average_transaction_size = profile.total_volume / profile.transaction_count;
    profile.last_transaction_date = transaction.timestamp;

    // Update currency preferences
    if (!profile.preferred_currencies.includes(transaction.currency)) {
      profile.preferred_currencies.push(transaction.currency);
    }

    // Update time patterns
    const hour = transaction.timestamp.getHours();
    if (!profile.common_transaction_times.includes(hour)) {
      profile.common_transaction_times.push(hour);
    }

    // Update geographic patterns
    if (transaction.metadata.geolocation) {
      const country = transaction.metadata.geolocation.country;
      if (!profile.geographic_patterns.countries.includes(country)) {
        profile.geographic_patterns.countries.push(country);
      }
    }

    // Update velocity metrics
    await this.updateVelocityMetrics(profile, transaction);

    // Update risk indicators
    await this.updateRiskIndicators(profile);

    this.userProfiles.set(transaction.user_id, profile);
  }

  /**
   * Update velocity metrics
   */
  private async updateVelocityMetrics(
    profile: UserTransactionProfile,
    transaction: Transaction
  ): Promise<void> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate daily volume
    const dailyTransactions = Array.from(this.transactions.values())
      .filter(t => t.user_id === profile.user_id && t.timestamp >= oneDayAgo);
    profile.velocity_metrics.daily_volume = dailyTransactions
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate weekly volume
    const weeklyTransactions = Array.from(this.transactions.values())
      .filter(t => t.user_id === profile.user_id && t.timestamp >= oneWeekAgo);
    profile.velocity_metrics.weekly_volume = weeklyTransactions
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate monthly volume
    const monthlyTransactions = Array.from(this.transactions.values())
      .filter(t => t.user_id === profile.user_id && t.timestamp >= oneMonthAgo);
    profile.velocity_metrics.monthly_volume = monthlyTransactions
      .reduce((sum, t) => sum + t.amount, 0);
  }

  /**
   * Update risk indicators
   */
  private async updateRiskIndicators(profile: UserTransactionProfile): Promise<void> {
    // Structuring score
    profile.risk_indicators.structuring_score = await this.calculateStructuringScore(profile);

    // Velocity score
    profile.risk_indicators.velocity_score = await this.calculateVelocityScore(profile);

    // Pattern score
    profile.risk_indicators.pattern_score = await this.calculatePatternScore(profile);

    // Geographic score
    profile.risk_indicators.geographic_score = await this.calculateGeographicScore(profile);
  }

  /**
   * Calculate structuring score
   */
  private async calculateStructuringScore(profile: UserTransactionProfile): Promise<number> {
    const userTransactions = Array.from(this.transactions.values())
      .filter(t => t.user_id === profile.user_id);

    // Look for patterns of transactions just below $10,000
    const nearThresholdTransactions = userTransactions
      .filter(t => t.amount >= 9000 && t.amount < 10000);

    if (nearThresholdTransactions.length >= 3) {
      return Math.min(nearThresholdTransactions.length * 20, 100);
    }

    return 0;
  }

  /**
   * Calculate velocity score
   */
  private async calculateVelocityScore(profile: UserTransactionProfile): Promise<number> {
    const dailyThreshold = 50000; // $50,000 daily threshold
    const weeklyThreshold = 200000; // $200,000 weekly threshold

    let score = 0;

    if (profile.velocity_metrics.daily_volume > dailyThreshold) {
      score += 30;
    }

    if (profile.velocity_metrics.weekly_volume > weeklyThreshold) {
      score += 40;
    }

    if (profile.transaction_count > 100) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate pattern score
   */
  private async calculatePatternScore(profile: UserTransactionProfile): Promise<number> {
    const userTransactions = Array.from(this.transactions.values())
      .filter(t => t.user_id === profile.user_id);

    let score = 0;

    // Check for round dollar amounts
    const roundAmountTransactions = userTransactions
      .filter(t => t.amount % 1000 === 0);
    
    if (roundAmountTransactions.length > userTransactions.length * 0.5) {
      score += 25;
    }

    // Check for unusual timing patterns
    const nightTransactions = userTransactions
      .filter(t => {
        const hour = t.timestamp.getHours();
        return hour >= 22 || hour <= 6;
      });

    if (nightTransactions.length > userTransactions.length * 0.3) {
      score += 15;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate geographic score
   */
  private async calculateGeographicScore(profile: UserTransactionProfile): Promise<number> {
    const highRiskCountries = ['XX', 'YY', 'ZZ']; // Placeholder
    let score = 0;

    for (const country of profile.geographic_patterns.countries) {
      if (highRiskCountries.includes(country)) {
        score += 30;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Run monitoring rules against transaction
   */
  private async runMonitoringRules(transaction: Transaction): Promise<any[]> {
    const alerts: any[] = [];

    for (const rule of this.monitoringRules.values()) {
      if (!rule.enabled) continue;

      const alert = await this.evaluateRule(rule, transaction);
      if (alert) {
        alerts.push(alert);
      }
    }

    return alerts;
  }

  /**
   * Evaluate monitoring rule
   */
  private async evaluateRule(rule: MonitoringRule, transaction: Transaction): Promise<any | null> {
    switch (rule.rule_type) {
      case 'THRESHOLD':
        return this.evaluateThresholdRule(rule, transaction);
      
      case 'PATTERN':
        return this.evaluatePatternRule(rule, transaction);
      
      case 'VELOCITY':
        return this.evaluateVelocityRule(rule, transaction);
      
      case 'GEOGRAPHIC':
        return this.evaluateGeographicRule(rule, transaction);
      
      case 'BEHAVIORAL':
        return this.evaluateBehavioralRule(rule, transaction);
      
      default:
        return null;
    }
  }

  /**
   * Evaluate threshold rule
   */
  private async evaluateThresholdRule(rule: MonitoringRule, transaction: Transaction): Promise<any | null> {
    if (rule.parameters.threshold_amount && transaction.amount >= rule.parameters.threshold_amount) {
      return {
        rule_id: rule.id,
        rule_name: rule.name,
        severity: rule.severity,
        action: rule.action,
        description: `Transaction amount ${transaction.amount} exceeds threshold ${rule.parameters.threshold_amount}`,
        indicators: [{
          indicator_type: 'LARGE_AMOUNT',
          description: `Amount: ${transaction.amount}`,
          risk_score: 50,
          threshold_exceeded: true,
          supporting_data: { amount: transaction.amount, threshold: rule.parameters.threshold_amount }
        }]
      };
    }
    return null;
  }

  /**
   * Evaluate pattern rule
   */
  private async evaluatePatternRule(rule: MonitoringRule, transaction: Transaction): Promise<any | null> {
    if (rule.id === 'STRUCTURING_DETECTION') {
      return this.evaluateStructuringPattern(rule, transaction);
    }

    if (rule.id === 'ROUND_DOLLAR_AMOUNTS') {
      if (transaction.amount % 1000 === 0) {
        return {
          rule_id: rule.id,
          rule_name: rule.name,
          severity: rule.severity,
          action: rule.action,
          description: `Round dollar amount detected: ${transaction.amount}`,
          indicators: [{
            indicator_type: 'ROUND_AMOUNT',
            description: `Amount: ${transaction.amount}`,
            risk_score: 20,
            threshold_exceeded: false,
            supporting_data: { amount: transaction.amount }
          }]
        };
      }
    }

    return null;
  }

  /**
   * Evaluate structuring pattern
   */
  private async evaluateStructuringPattern(rule: MonitoringRule, transaction: Transaction): Promise<any | null> {
    if (!rule.parameters.threshold_amount || !rule.parameters.time_window_hours || !rule.parameters.transaction_count) {
      return null;
    }

    const timeWindow = rule.parameters.time_window_hours * 60 * 60 * 1000;
    const windowStart = new Date(transaction.timestamp.getTime() - timeWindow);

    const recentTransactions = Array.from(this.transactions.values())
      .filter(t => 
        t.user_id === transaction.user_id &&
        t.timestamp >= windowStart &&
        t.timestamp <= transaction.timestamp &&
        t.amount >= rule.parameters.threshold_amount! * 0.9 &&
        t.amount < rule.parameters.threshold_amount!
      );

    if (recentTransactions.length >= rule.parameters.transaction_count) {
      return {
        rule_id: rule.id,
        rule_name: rule.name,
        severity: rule.severity,
        action: rule.action,
        description: `Potential structuring detected: ${recentTransactions.length} transactions near threshold`,
        indicators: [{
          indicator_type: 'STRUCTURING_PATTERN',
          description: `${recentTransactions.length} transactions in ${rule.parameters.time_window_hours} hours`,
          risk_score: 80,
          threshold_exceeded: true,
          supporting_data: { 
            transaction_count: recentTransactions.length,
            time_window: rule.parameters.time_window_hours,
            amounts: recentTransactions.map(t => t.amount)
          }
        }]
      };
    }

    return null;
  }

  /**
   * Evaluate velocity rule
   */
  private async evaluateVelocityRule(rule: MonitoringRule, transaction: Transaction): Promise<any | null> {
    if (!rule.parameters.transaction_count || !rule.parameters.time_window_hours) {
      return null;
    }

    const timeWindow = rule.parameters.time_window_hours * 60 * 60 * 1000;
    const windowStart = new Date(transaction.timestamp.getTime() - timeWindow);

    const recentTransactions = Array.from(this.transactions.values())
      .filter(t => 
        t.user_id === transaction.user_id &&
        t.timestamp >= windowStart &&
        t.timestamp <= transaction.timestamp
      );

    if (recentTransactions.length >= rule.parameters.transaction_count) {
      return {
        rule_id: rule.id,
        rule_name: rule.name,
        severity: rule.severity,
        action: rule.action,
        description: `High velocity detected: ${recentTransactions.length} transactions in ${rule.parameters.time_window_hours} hours`,
        indicators: [{
          indicator_type: 'HIGH_VELOCITY',
          description: `${recentTransactions.length} transactions in ${rule.parameters.time_window_hours} hours`,
          risk_score: 60,
          threshold_exceeded: true,
          supporting_data: { 
            transaction_count: recentTransactions.length,
            time_window: rule.parameters.time_window_hours
          }
        }]
      };
    }

    return null;
  }

  /**
   * Evaluate geographic rule
   */
  private async evaluateGeographicRule(rule: MonitoringRule, transaction: Transaction): Promise<any | null> {
    if (!rule.parameters.risk_countries || !transaction.metadata.geolocation) {
      return null;
    }

    const country = transaction.metadata.geolocation.country;
    if (rule.parameters.risk_countries.includes(country)) {
      return {
        rule_id: rule.id,
        rule_name: rule.name,
        severity: rule.severity,
        action: rule.action,
        description: `Transaction from high-risk jurisdiction: ${country}`,
        indicators: [{
          indicator_type: 'HIGH_RISK_JURISDICTION',
          description: `Country: ${country}`,
          risk_score: 40,
          threshold_exceeded: true,
          supporting_data: { country }
        }]
      };
    }

    return null;
  }

  /**
   * Evaluate behavioral rule
   */
  private async evaluateBehavioralRule(rule: MonitoringRule, transaction: Transaction): Promise<any | null> {
    // Implement behavioral analysis
    return null;
  }

  /**
   * Process alert
   */
  private async processAlert(alert: any, transaction: Transaction): Promise<void> {
    logger.warn('AML alert generated', {
      ruleId: alert.rule_id,
      ruleName: alert.rule_name,
      severity: alert.severity,
      transactionId: transaction.id,
      userId: transaction.user_id
    });

    switch (alert.action) {
      case 'BLOCK':
        await this.blockTransaction(transaction);
        break;
      
      case 'REVIEW':
        await this.flagForReview(transaction, alert);
        break;
      
      case 'REPORT':
        await this.createSuspiciousActivityReport(transaction, alert);
        break;
      
      case 'ALERT':
        // Just log the alert
        break;
    }

    this.emit('amlAlert', { alert, transaction });
  }

  /**
   * Block transaction
   */
  private async blockTransaction(transaction: Transaction): Promise<void> {
    transaction.status = 'BLOCKED';
    
    logger.error('Transaction blocked by AML system', {
      transactionId: transaction.id,
      userId: transaction.user_id,
      amount: transaction.amount
    });

    this.emit('transactionBlocked', transaction);
  }

  /**
   * Flag transaction for review
   */
  private async flagForReview(transaction: Transaction, alert: any): Promise<void> {
    transaction.status = 'UNDER_REVIEW';
    
    logger.warn('Transaction flagged for manual review', {
      transactionId: transaction.id,
      userId: transaction.user_id,
      reason: alert.description
    });

    this.emit('transactionFlagged', { transaction, alert });
  }

  /**
   * Create suspicious activity report
   */
  private async createSuspiciousActivityReport(transaction: Transaction, alert: any): Promise<void> {
    const reportId = crypto.randomUUID();
    
    const report: SuspiciousActivityReport = {
      id: reportId,
      transaction_ids: [transaction.id],
      user_id: transaction.user_id,
      report_type: this.getReportType(alert.rule_id),
      severity: alert.severity,
      description: alert.description,
      indicators: alert.indicators,
      created_at: new Date(),
      status: 'OPEN'
    };

    this.suspiciousReports.set(reportId, report);

    logger.error('Suspicious Activity Report created', {
      reportId,
      userId: transaction.user_id,
      reportType: report.report_type,
      severity: report.severity
    });

    this.emit('suspiciousActivityReported', report);
  }

  /**
   * Get report type from rule ID
   */
  private getReportType(ruleId: string): SuspiciousActivityReport['report_type'] {
    switch (ruleId) {
      case 'STRUCTURING_DETECTION':
        return 'STRUCTURING';
      case 'HIGH_VELOCITY':
        return 'VELOCITY';
      case 'HIGH_RISK_JURISDICTION':
        return 'HIGH_RISK_JURISDICTION';
      case 'ROUND_DOLLAR_AMOUNTS':
        return 'ROUND_DOLLAR';
      default:
        return 'UNUSUAL_PATTERN';
    }
  }

  /**
   * Add monitoring rule
   */
  addMonitoringRule(rule: Omit<MonitoringRule, 'created_at' | 'updated_at'>): void {
    const fullRule: MonitoringRule = {
      ...rule,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    this.monitoringRules.set(rule.id, fullRule);
    
    logger.info('Monitoring rule added', {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.rule_type
    });
  }

  /**
   * Get suspicious activity reports
   */
  getSuspiciousActivityReports(status?: SuspiciousActivityReport['status']): SuspiciousActivityReport[] {
    const reports = Array.from(this.suspiciousReports.values());
    
    if (status) {
      return reports.filter(r => r.status === status);
    }
    
    return reports;
  }

  /**
   * Get user transaction profile
   */
  getUserTransactionProfile(userId: string): UserTransactionProfile | null {
    return this.userProfiles.get(userId) || null;
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    reportType: ComplianceReport['report_type'],
    periodStart: Date,
    periodEnd: Date
  ): Promise<ComplianceReport> {
    const reportId = crypto.randomUUID();
    
    const periodTransactions = Array.from(this.transactions.values())
      .filter(t => t.timestamp >= periodStart && t.timestamp <= periodEnd);

    const periodReports = Array.from(this.suspiciousReports.values())
      .filter(r => r.created_at >= periodStart && r.created_at <= periodEnd);

    const report: ComplianceReport = {
      id: reportId,
      report_type: reportType,
      period_start: periodStart,
      period_end: periodEnd,
      generated_at: new Date(),
      data: {
        total_transactions: periodTransactions.length,
        total_volume: periodTransactions.reduce((sum, t) => sum + t.amount, 0),
        suspicious_reports: periodReports.length,
        blocked_transactions: periodTransactions.filter(t => t.status === 'BLOCKED').length,
        high_risk_users: Array.from(this.userProfiles.values())
          .filter(p => p.risk_indicators.structuring_score > 50).length,
        regulatory_filings: periodReports.filter(r => r.filed_with_authorities).length
      }
    };

    logger.info('Compliance report generated', {
      reportId,
      reportType,
      periodStart,
      periodEnd,
      totalTransactions: report.data.total_transactions
    });

    return report;
  }
}

export const amlTransactionMonitoring = new AMLTransactionMonitoringService();