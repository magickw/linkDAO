/**
 * Data Minimization Service
 * Implements data minimization strategies for user interaction tracking
 */

import { EventEmitter } from 'events';
import { safeLogger } from '../utils/safeLogger';

export interface DataMinimizationRule {
  ruleId: string;
  name: string;
  description: string;
  dataType: string;
  minimizationStrategy: 'anonymize' | 'pseudonymize' | 'aggregate' | 'filter' | 'hash' | 'truncate';
  retentionPeriod: number; // days
  triggerConditions: string[];
  allowedFields: string[];
  blockedFields: string[];
  transformationRules: TransformationRule[];
  isActive: boolean;
  priority: number;
}

export interface TransformationRule {
  field: string;
  transformation: 'hash' | 'mask' | 'truncate' | 'generalize' | 'remove' | 'encrypt';
  parameters?: Record<string, any>;
}

export interface MinimizedData {
  originalId: string;
  minimizedId: string;
  dataType: string;
  originalData: Record<string, any>;
  minimizedData: Record<string, any>;
  appliedRules: string[];
  minimizationDate: Date;
  retentionExpiry: Date;
  isReversible: boolean;
  privacyLevel: 'low' | 'medium' | 'high' | 'maximum';
}

export interface UserInteractionEvent {
  eventId: string;
  userId?: string;
  sessionId: string;
  eventType: string;
  timestamp: Date;
  data: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  consentLevel: 'none' | 'functional' | 'analytics' | 'marketing' | 'all';
  minimizationRequired: boolean;
}

export interface AggregationRule {
  ruleId: string;
  name: string;
  dataType: string;
  aggregationLevel: 'hourly' | 'daily' | 'weekly' | 'monthly';
  metrics: string[];
  dimensions: string[];
  retentionPeriod: number;
  isActive: boolean;
}

export interface PrivacyBudget {
  userId: string;
  dataType: string;
  totalQueries: number;
  remainingBudget: number;
  budgetPeriod: 'daily' | 'weekly' | 'monthly';
  lastReset: Date;
  isExhausted: boolean;
}

class DataMinimizationService extends EventEmitter {
  private minimizationRules: Map<string, DataMinimizationRule> = new Map();
  private aggregationRules: Map<string, AggregationRule> = new Map();
  private minimizedDataStore: Map<string, MinimizedData> = new Map();
  private privacyBudgets: Map<string, PrivacyBudget> = new Map();
  private isInitialized = false;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.setupDefaultRules();
  }

  /**
   * Initialize data minimization service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load existing rules and data
      await this.loadMinimizationRules();
      await this.loadAggregationRules();
      await this.loadMinimizedData();
      
      // Start cleanup processes
      this.startCleanupProcesses();
      
      this.isInitialized = true;
      this.emit('initialized');
      
    } catch (error) {
      safeLogger.error('Failed to initialize data minimization service:', error);
      throw error;
    }
  }

  /**
   * Process user interaction with data minimization
   */
  async processUserInteraction(event: UserInteractionEvent): Promise<MinimizedData | null> {
    // Check if minimization is required
    if (!event.minimizationRequired) {
      return null;
    }

    // Find applicable rules
    const applicableRules = this.findApplicableRules(event.eventType, event.data);
    if (applicableRules.length === 0) {
      return null;
    }

    // Apply minimization rules
    const minimizedData = await this.applyMinimizationRules(event, applicableRules);
    
    // Store minimized data
    this.minimizedDataStore.set(minimizedData.minimizedId, minimizedData);
    await this.persistMinimizedData(minimizedData);
    
    // Update privacy budget
    if (event.userId) {
      await this.updatePrivacyBudget(event.userId, event.eventType);
    }
    
    this.emit('dataMinimized', minimizedData);
    
    return minimizedData;
  }

  /**
   * Anonymize user data
   */
  async anonymizeData(data: Record<string, any>, dataType: string): Promise<Record<string, any>> {
    const rule = Array.from(this.minimizationRules.values())
      .find(r => r.dataType === dataType && r.minimizationStrategy === 'anonymize');
    
    if (!rule) {
      throw new Error(`No anonymization rule found for data type: ${dataType}`);
    }

    return this.applyTransformations(data, rule.transformationRules);
  }

  /**
   * Pseudonymize user data
   */
  async pseudonymizeData(data: Record<string, any>, dataType: string): Promise<Record<string, any>> {
    const rule = Array.from(this.minimizationRules.values())
      .find(r => r.dataType === dataType && r.minimizationStrategy === 'pseudonymize');
    
    if (!rule) {
      throw new Error(`No pseudonymization rule found for data type: ${dataType}`);
    }

    const pseudonymizedData = { ...data };
    
    // Generate pseudonym for user identifiers
    if (pseudonymizedData.userId) {
      pseudonymizedData.userId = this.generatePseudonym(pseudonymizedData.userId);
    }
    
    if (pseudonymizedData.email) {
      pseudonymizedData.email = this.generatePseudonym(pseudonymizedData.email);
    }

    return this.applyTransformations(pseudonymizedData, rule.transformationRules);
  }

  /**
   * Aggregate data for privacy protection
   */
  async aggregateData(events: UserInteractionEvent[], aggregationRuleId: string): Promise<Record<string, any>> {
    const rule = this.aggregationRules.get(aggregationRuleId);
    if (!rule) {
      throw new Error(`Aggregation rule not found: ${aggregationRuleId}`);
    }

    const aggregatedData: Record<string, any> = {};
    
    // Group events by dimensions
    const groupedEvents = this.groupEventsByDimensions(events, rule.dimensions);
    
    // Calculate metrics for each group
    for (const [groupKey, groupEvents] of groupedEvents) {
      const groupMetrics: Record<string, any> = {};
      
      for (const metric of rule.metrics) {
        groupMetrics[metric] = this.calculateMetric(groupEvents, metric);
      }
      
      aggregatedData[groupKey] = groupMetrics;
    }
    
    // Apply differential privacy if needed
    const noisyData = this.addDifferentialPrivacyNoise(aggregatedData);
    
    this.emit('dataAggregated', { rule: rule.name, data: noisyData });
    
    return noisyData;
  }

  /**
   * Filter sensitive data fields
   */
  filterSensitiveData(data: Record<string, any>, dataType: string): Record<string, any> {
    const rule = Array.from(this.minimizationRules.values())
      .find(r => r.dataType === dataType && r.minimizationStrategy === 'filter');
    
    if (!rule) {
      return data;
    }

    const filteredData: Record<string, any> = {};
    
    // Only include allowed fields
    for (const field of rule.allowedFields) {
      if (data[field] !== undefined) {
        filteredData[field] = data[field];
      }
    }
    
    // Remove blocked fields
    for (const field of rule.blockedFields) {
      delete filteredData[field];
    }
    
    return filteredData;
  }

  /**
   * Hash sensitive identifiers
   */
  hashSensitiveIdentifiers(data: Record<string, any>): Record<string, any> {
    const hashedData = { ...data };
    
    const sensitiveFields = ['email', 'phone', 'ssn', 'creditCard', 'ipAddress'];
    
    for (const field of sensitiveFields) {
      if (hashedData[field]) {
        hashedData[field] = this.hashValue(hashedData[field]);
      }
    }
    
    return hashedData;
  }

  /**
   * Check privacy budget
   */
  async checkPrivacyBudget(userId: string, dataType: string): Promise<boolean> {
    const budgetKey = `${userId}_${dataType}`;
    const budget = this.privacyBudgets.get(budgetKey);
    
    if (!budget) {
      // Create new budget
      const newBudget: PrivacyBudget = {
        userId,
        dataType,
        totalQueries: 0,
        remainingBudget: 100, // Default budget
        budgetPeriod: 'daily',
        lastReset: new Date(),
        isExhausted: false
      };
      
      this.privacyBudgets.set(budgetKey, newBudget);
      return true;
    }
    
    // Check if budget needs reset
    if (this.shouldResetBudget(budget)) {
      budget.remainingBudget = 100;
      budget.totalQueries = 0;
      budget.lastReset = new Date();
      budget.isExhausted = false;
    }
    
    return !budget.isExhausted && budget.remainingBudget > 0;
  }

  /**
   * Create minimization rule
   */
  async createMinimizationRule(rule: Omit<DataMinimizationRule, 'ruleId'>): Promise<string> {
    const ruleId = this.generateRuleId();
    const newRule: DataMinimizationRule = {
      ...rule,
      ruleId
    };
    
    this.minimizationRules.set(ruleId, newRule);
    await this.persistMinimizationRule(newRule);
    
    this.emit('ruleCreated', newRule);
    
    return ruleId;
  }

  /**
   * Update minimization rule
   */
  async updateMinimizationRule(ruleId: string, updates: Partial<DataMinimizationRule>): Promise<void> {
    const rule = this.minimizationRules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }
    
    const updatedRule = { ...rule, ...updates };
    this.minimizationRules.set(ruleId, updatedRule);
    await this.persistMinimizationRule(updatedRule);
    
    this.emit('ruleUpdated', updatedRule);
  }

  /**
   * Get minimization statistics
   */
  getMinimizationStatistics(): any {
    const stats = {
      totalRules: this.minimizationRules.size,
      activeRules: Array.from(this.minimizationRules.values()).filter(r => r.isActive).length,
      totalMinimizedRecords: this.minimizedDataStore.size,
      privacyBudgets: this.privacyBudgets.size,
      dataTypeBreakdown: this.getDataTypeBreakdown(),
      strategyBreakdown: this.getStrategyBreakdown()
    };
    
    return stats;
  }

  /**
   * Apply minimization rules to event data
   */
  private async applyMinimizationRules(
    event: UserInteractionEvent,
    rules: DataMinimizationRule[]
  ): Promise<MinimizedData> {
    let minimizedData = { ...event.data };
    const appliedRules: string[] = [];
    
    // Sort rules by priority
    const sortedRules = rules.sort((a, b) => b.priority - a.priority);
    
    for (const rule of sortedRules) {
      switch (rule.minimizationStrategy) {
        case 'anonymize':
          minimizedData = await this.anonymizeData(minimizedData, rule.dataType);
          break;
        case 'pseudonymize':
          minimizedData = await this.pseudonymizeData(minimizedData, rule.dataType);
          break;
        case 'filter':
          minimizedData = this.filterSensitiveData(minimizedData, rule.dataType);
          break;
        case 'hash':
          minimizedData = this.hashSensitiveIdentifiers(minimizedData);
          break;
        case 'truncate':
          minimizedData = this.truncateData(minimizedData, rule);
          break;
        case 'aggregate':
          // Aggregation is handled separately
          break;
      }
      
      appliedRules.push(rule.ruleId);
    }
    
    const result: MinimizedData = {
      originalId: event.eventId,
      minimizedId: this.generateMinimizedId(),
      dataType: event.eventType,
      originalData: event.data,
      minimizedData,
      appliedRules,
      minimizationDate: new Date(),
      retentionExpiry: this.calculateRetentionExpiry(rules),
      isReversible: this.checkReversibility(rules),
      privacyLevel: this.calculatePrivacyLevel(rules)
    };
    
    return result;
  }

  /**
   * Apply transformation rules to data
   */
  private applyTransformations(data: Record<string, any>, transformations: TransformationRule[]): Record<string, any> {
    const transformedData = { ...data };
    
    for (const transformation of transformations) {
      const value = transformedData[transformation.field];
      if (value === undefined) continue;
      
      switch (transformation.transformation) {
        case 'hash':
          transformedData[transformation.field] = this.hashValue(value);
          break;
        case 'mask':
          transformedData[transformation.field] = this.maskValue(value, transformation.parameters);
          break;
        case 'truncate':
          transformedData[transformation.field] = this.truncateValue(value, transformation.parameters);
          break;
        case 'generalize':
          transformedData[transformation.field] = this.generalizeValue(value, transformation.parameters);
          break;
        case 'remove':
          delete transformedData[transformation.field];
          break;
        case 'encrypt':
          transformedData[transformation.field] = this.encryptValue(value);
          break;
      }
    }
    
    return transformedData;
  }

  /**
   * Find applicable minimization rules
   */
  private findApplicableRules(eventType: string, data: Record<string, any>): DataMinimizationRule[] {
    return Array.from(this.minimizationRules.values()).filter(rule => {
      if (!rule.isActive) return false;
      if (rule.dataType !== eventType && rule.dataType !== '*') return false;
      
      // Check trigger conditions
      return rule.triggerConditions.every(condition => {
        return this.evaluateCondition(condition, data);
      });
    });
  }

  /**
   * Setup default minimization rules
   */
  private setupDefaultRules(): void {
    const defaultRules: Omit<DataMinimizationRule, 'ruleId'>[] = [
      {
        name: 'User Interaction Anonymization',
        description: 'Anonymize user interactions after 30 days',
        dataType: 'user_interaction',
        minimizationStrategy: 'anonymize',
        retentionPeriod: 30,
        triggerConditions: ['age > 30'],
        allowedFields: ['action', 'timestamp', 'page'],
        blockedFields: ['userId', 'email', 'ipAddress'],
        transformationRules: [
          { field: 'userId', transformation: 'remove' },
          { field: 'ipAddress', transformation: 'hash' }
        ],
        isActive: true,
        priority: 1
      },
      {
        name: 'Analytics Data Pseudonymization',
        description: 'Pseudonymize analytics data immediately',
        dataType: 'analytics',
        minimizationStrategy: 'pseudonymize',
        retentionPeriod: 365,
        triggerConditions: [],
        allowedFields: ['event', 'properties', 'timestamp'],
        blockedFields: ['email', 'phone'],
        transformationRules: [
          { field: 'userId', transformation: 'hash' },
          { field: 'sessionId', transformation: 'hash' }
        ],
        isActive: true,
        priority: 2
      },
      {
        name: 'Error Log Filtering',
        description: 'Filter sensitive data from error logs',
        dataType: 'error_log',
        minimizationStrategy: 'filter',
        retentionPeriod: 90,
        triggerConditions: [],
        allowedFields: ['error', 'stack', 'timestamp', 'level'],
        blockedFields: ['password', 'token', 'apiKey'],
        transformationRules: [],
        isActive: true,
        priority: 3
      }
    ];

    defaultRules.forEach(rule => {
      const ruleId = this.generateRuleId();
      this.minimizationRules.set(ruleId, { ...rule, ruleId });
    });
  }

  /**
   * Start cleanup processes
   */
  private startCleanupProcesses(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpiredData();
      await this.resetExpiredBudgets();
    }, 60 * 60 * 1000);
  }

  /**
   * Cleanup expired minimized data
   */
  private async cleanupExpiredData(): Promise<void> {
    const now = new Date();
    const expiredData: string[] = [];
    
    for (const [id, data] of this.minimizedDataStore) {
      if (data.retentionExpiry < now) {
        expiredData.push(id);
      }
    }
    
    for (const id of expiredData) {
      this.minimizedDataStore.delete(id);
      await this.deleteMinimizedData(id);
    }
    
    if (expiredData.length > 0) {
      this.emit('expiredDataCleaned', { count: expiredData.length });
    }
  }

  // Helper methods
  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMinimizedId(): string {
    return `min_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePseudonym(value: string): string {
    return this.hashValue(`pseudonym_${value}`);
  }

  private hashValue(value: string): string {
    // Simple hash implementation - use proper crypto in production
    return Buffer.from(value).toString('base64');
  }

  private maskValue(value: string, params?: Record<string, any>): string {
    const maskChar = params?.maskChar || '*';
    const visibleChars = params?.visibleChars || 2;
    
    if (value.length <= visibleChars * 2) {
      return maskChar.repeat(value.length);
    }
    
    return value.substring(0, visibleChars) + 
           maskChar.repeat(value.length - visibleChars * 2) + 
           value.substring(value.length - visibleChars);
  }

  private truncateValue(value: string, params?: Record<string, any>): string {
    const maxLength = params?.maxLength || 10;
    return value.length > maxLength ? value.substring(0, maxLength) : value;
  }

  private generalizeValue(value: any, params?: Record<string, any>): any {
    // Implementation depends on data type and generalization strategy
    return value;
  }

  private encryptValue(value: string): string {
    // Simple encryption - use proper crypto in production
    return Buffer.from(value).toString('base64');
  }

  private evaluateCondition(condition: string, data: Record<string, any>): boolean {
    // Simple condition evaluation - implement proper parser in production
    return true;
  }

  private truncateData(data: Record<string, any>, rule: DataMinimizationRule): Record<string, any> {
    // Implementation for data truncation
    return data;
  }

  private calculateRetentionExpiry(rules: DataMinimizationRule[]): Date {
    const maxRetention = Math.max(...rules.map(r => r.retentionPeriod));
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + maxRetention);
    return expiry;
  }

  private checkReversibility(rules: DataMinimizationRule[]): boolean {
    return rules.some(r => r.minimizationStrategy === 'pseudonymize' || r.minimizationStrategy === 'encrypt');
  }

  private calculatePrivacyLevel(rules: DataMinimizationRule[]): 'low' | 'medium' | 'high' | 'maximum' {
    const strategies = rules.map(r => r.minimizationStrategy);
    
    if (strategies.includes('anonymize')) return 'maximum';
    if (strategies.includes('hash')) return 'high';
    if (strategies.includes('pseudonymize')) return 'medium';
    return 'low';
  }

  private groupEventsByDimensions(events: UserInteractionEvent[], dimensions: string[]): Map<string, UserInteractionEvent[]> {
    const groups = new Map<string, UserInteractionEvent[]>();
    
    for (const event of events) {
      const key = dimensions.map(dim => event.data[dim] || 'unknown').join('_');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(event);
    }
    
    return groups;
  }

  private calculateMetric(events: UserInteractionEvent[], metric: string): number {
    switch (metric) {
      case 'count':
        return events.length;
      case 'unique_users':
        return new Set(events.map(e => e.userId).filter(Boolean)).size;
      default:
        return 0;
    }
  }

  private addDifferentialPrivacyNoise(data: Record<string, any>): Record<string, any> {
    // Add Laplace noise for differential privacy
    const noisyData = { ...data };
    
    for (const [key, value] of Object.entries(noisyData)) {
      if (typeof value === 'number') {
        noisyData[key] = value + this.generateLaplaceNoise();
      }
    }
    
    return noisyData;
  }

  private generateLaplaceNoise(): number {
    // Simple Laplace noise generation
    const u = Math.random() - 0.5;
    return Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  private shouldResetBudget(budget: PrivacyBudget): boolean {
    const now = new Date();
    const timeDiff = now.getTime() - budget.lastReset.getTime();
    
    switch (budget.budgetPeriod) {
      case 'daily':
        return timeDiff > 24 * 60 * 60 * 1000;
      case 'weekly':
        return timeDiff > 7 * 24 * 60 * 60 * 1000;
      case 'monthly':
        return timeDiff > 30 * 24 * 60 * 60 * 1000;
      default:
        return false;
    }
  }

  private async updatePrivacyBudget(userId: string, dataType: string): Promise<void> {
    const budgetKey = `${userId}_${dataType}`;
    const budget = this.privacyBudgets.get(budgetKey);
    
    if (budget) {
      budget.totalQueries++;
      budget.remainingBudget = Math.max(0, budget.remainingBudget - 1);
      budget.isExhausted = budget.remainingBudget === 0;
    }
  }

  private async resetExpiredBudgets(): Promise<void> {
    for (const budget of this.privacyBudgets.values()) {
      if (this.shouldResetBudget(budget)) {
        budget.remainingBudget = 100;
        budget.totalQueries = 0;
        budget.lastReset = new Date();
        budget.isExhausted = false;
      }
    }
  }

  private getDataTypeBreakdown(): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    for (const data of this.minimizedDataStore.values()) {
      breakdown[data.dataType] = (breakdown[data.dataType] || 0) + 1;
    }
    
    return breakdown;
  }

  private getStrategyBreakdown(): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    for (const rule of this.minimizationRules.values()) {
      breakdown[rule.minimizationStrategy] = (breakdown[rule.minimizationStrategy] || 0) + 1;
    }
    
    return breakdown;
  }

  // Placeholder methods for persistence
  private async loadMinimizationRules(): Promise<void> {
    // Load from database
  }

  private async loadAggregationRules(): Promise<void> {
    // Load from database
  }

  private async loadMinimizedData(): Promise<void> {
    // Load from database
  }

  private async persistMinimizationRule(rule: DataMinimizationRule): Promise<void> {
    // Persist to database
  }

  private async persistMinimizedData(data: MinimizedData): Promise<void> {
    // Persist to database
  }

  private async deleteMinimizedData(id: string): Promise<void> {
    // Delete from database
  }
}

export const dataMinimizationService = new DataMinimizationService();
