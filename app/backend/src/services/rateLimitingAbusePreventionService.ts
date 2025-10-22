/**
 * Rate Limiting and Abuse Prevention Service
 * Implements comprehensive rate limiting and abuse prevention for document access
 */

import { EventEmitter } from 'events';

export interface RateLimitRule {
  ruleId: string;
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | '*';
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
  keyGenerator: 'ip' | 'user' | 'session' | 'custom';
  customKeyFunction?: string;
  isActive: boolean;
  priority: number;
}

export interface AbusePattern {
  patternId: string;
  name: string;
  description: string;
  detectionRules: DetectionRule[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'log' | 'throttle' | 'block' | 'captcha' | 'ban';
  isActive: boolean;
}

export interface DetectionRule {
  ruleType: 'frequency' | 'pattern' | 'anomaly' | 'behavioral';
  threshold: number;
  timeWindow: number;
  conditions: Record<string, any>;
}

export interface RateLimitViolation {
  violationId: string;
  ruleId: string;
  identifier: string;
  timestamp: Date;
  requestCount: number;
  windowStart: Date;
  windowEnd: Date;
  action: 'throttled' | 'blocked' | 'logged';
  metadata: Record<string, any>;
}

export interface AbuseIncident {
  incidentId: string;
  patternId: string;
  identifier: string;
  detectionTime: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: Record<string, any>;
  action: string;
  status: 'active' | 'resolved' | 'false_positive';
  resolutionTime?: Date;
}

class RateLimitingAbusePreventionService extends EventEmitter {
  private rateLimitRules: Map<string, RateLimitRule> = new Map();
  private abusePatterns: Map<string, AbusePattern> = new Map();
  private requestCounts: Map<string, Map<string, number>> = new Map();
  private violations: Map<string, RateLimitViolation> = new Map();
  private incidents: Map<string, AbuseIncident> = new Map();
  private blockedIdentifiers: Set<string> = new Set();
  private isInitialized = false;

  constructor() {
    super();
    this.setupDefaultRules();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadRateLimitRules();
      await this.loadAbusePatterns();
      this.startCleanupProcess();
      
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      console.error('Failed to initialize rate limiting service:', error);
      throw error;
    }
  }

  async checkRateLimit(
    identifier: string,
    endpoint: string,
    method: string,
    metadata?: Record<string, any>
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    const applicableRules = this.findApplicableRules(endpoint, method);
    
    for (const rule of applicableRules) {
      const key = this.generateKey(rule, identifier, metadata);
      const result = await this.checkRule(rule, key);
      
      if (!result.allowed) {
        await this.recordViolation(rule, identifier, result);
        return result;
      }
    }
    
    return { allowed: true, remaining: 999, resetTime: new Date(Date.now() + 3600000) };
  }

  private setupDefaultRules(): void {
    const defaultRules: Omit<RateLimitRule, 'ruleId'>[] = [
      {
        name: 'Document Access Rate Limit',
        description: 'Limit document access to prevent abuse',
        endpoint: '/api/documents/*',
        method: 'GET',
        windowMs: 60000, // 1 minute
        maxRequests: 100,
        skipSuccessfulRequests: false,
        skipFailedRequests: true,
        keyGenerator: 'ip',
        isActive: true,
        priority: 1
      }
    ];

    defaultRules.forEach(rule => {
      const ruleId = this.generateRuleId();
      this.rateLimitRules.set(ruleId, { ...rule, ruleId });
    });
  }

  private findApplicableRules(endpoint: string, method: string): RateLimitRule[] {
    return Array.from(this.rateLimitRules.values())
      .filter(rule => rule.isActive && this.matchesEndpoint(rule.endpoint, endpoint))
      .sort((a, b) => b.priority - a.priority);
  }

  private matchesEndpoint(pattern: string, endpoint: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(endpoint);
  }

  private generateKey(rule: RateLimitRule, identifier: string, metadata?: Record<string, any>): string {
    return `${rule.ruleId}:${identifier}`;
  }

  private async checkRule(rule: RateLimitRule, key: string): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    const now = Date.now();
    const windowStart = Math.floor(now / rule.windowMs) * rule.windowMs;
    const windowEnd = windowStart + rule.windowMs;
    
    if (!this.requestCounts.has(key)) {
      this.requestCounts.set(key, new Map());
    }
    
    const counts = this.requestCounts.get(key)!;
    const currentCount = counts.get(windowStart.toString()) || 0;
    
    if (currentCount >= rule.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(windowEnd)
      };
    }
    
    counts.set(windowStart.toString(), currentCount + 1);
    
    return {
      allowed: true,
      remaining: rule.maxRequests - currentCount - 1,
      resetTime: new Date(windowEnd)
    };
  }

  private async recordViolation(rule: RateLimitRule, identifier: string, result: any): Promise<void> {
    const violation: RateLimitViolation = {
      violationId: this.generateViolationId(),
      ruleId: rule.ruleId,
      identifier,
      timestamp: new Date(),
      requestCount: rule.maxRequests,
      windowStart: new Date(Date.now() - rule.windowMs),
      windowEnd: new Date(),
      action: 'throttled',
      metadata: {}
    };
    
    this.violations.set(violation.violationId, violation);
    this.emit('rateLimitViolation', violation);
  }

  private startCleanupProcess(): void {
    setInterval(() => {
      this.cleanupOldData();
    }, 300000); // 5 minutes
  }

  private cleanupOldData(): void {
    const cutoff = Date.now() - 3600000; // 1 hour ago
    
    for (const [key, counts] of this.requestCounts) {
      for (const [window] of counts) {
        if (parseInt(window) < cutoff) {
          counts.delete(window);
        }
      }
      if (counts.size === 0) {
        this.requestCounts.delete(key);
      }
    }
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateViolationId(): string {
    return `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadRateLimitRules(): Promise<void> {
    // Load from database
  }

  private async loadAbusePatterns(): Promise<void> {
    // Load from database
  }
}

export const rateLimitingAbusePreventionService = new RateLimitingAbusePreventionService();