import { Request } from 'express';
import { logger } from '../utils/logger';

export interface RateLimitRule {
  id: string;
  name: string;
  pattern: string; // Route pattern to match
  method?: string; // HTTP method (optional)
  windowMs: number;
  maxRequests: number;
  userTier?: 'FREE' | 'PREMIUM' | 'ENTERPRISE';
  skipConditions?: string[]; // Conditions to skip rate limiting
  customMessage?: string;
  enabled: boolean;
  priority: number; // Higher priority rules are checked first
}

export class RateLimitConfigService {
  private static instance: RateLimitConfigService;
  private rules: RateLimitRule[] = [];

  public static getInstance(): RateLimitConfigService {
    if (!RateLimitConfigService.instance) {
      RateLimitConfigService.instance = new RateLimitConfigService();
    }
    return RateLimitConfigService.instance;
  }

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Initialize default rate limiting rules
   */
  private initializeDefaultRules(): void {
    this.rules = [
      // Authentication endpoints - most restrictive
      {
        id: 'auth_wallet',
        name: 'Wallet Authentication',
        pattern: '/api/auth/wallet',
        method: 'POST',
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 5,
        customMessage: 'Too many authentication attempts. Please wait before trying again.',
        enabled: true,
        priority: 100
      },
      {
        id: 'auth_refresh',
        name: 'Token Refresh',
        pattern: '/api/auth/refresh',
        method: 'POST',
        windowMs: 60 * 1000,
        maxRequests: 10,
        enabled: true,
        priority: 95
      },

      // Profile management endpoints
      {
        id: 'seller_profile_update',
        name: 'Seller Profile Updates',
        pattern: '/api/marketplace/seller/profile',
        method: 'POST',
        windowMs: 60 * 1000,
        maxRequests: 3,
        customMessage: 'Too many profile updates. Please wait before making changes.',
        enabled: true,
        priority: 90
      },

      // Marketplace listing endpoints
      {
        id: 'listing_creation',
        name: 'Listing Creation',
        pattern: '/marketplace/listings',
        method: 'POST',
        windowMs: 60 * 1000,
        maxRequests: 2,
        customMessage: 'Too many listings created. Please wait before creating another.',
        enabled: true,
        priority: 85
      },
      {
        id: 'listing_queries',
        name: 'Listing Queries',
        pattern: '/marketplace/listings',
        method: 'GET',
        windowMs: 60 * 1000,
        maxRequests: 100,
        enabled: true,
        priority: 50
      },

      // Reputation endpoints
      {
        id: 'reputation_updates',
        name: 'Reputation Updates',
        pattern: '/marketplace/reputation/*',
        method: 'POST',
        windowMs: 60 * 1000,
        maxRequests: 5,
        enabled: true,
        priority: 80
      },
      {
        id: 'reputation_queries',
        name: 'Reputation Queries',
        pattern: '/marketplace/reputation/*',
        method: 'GET',
        windowMs: 60 * 1000,
        maxRequests: 50,
        enabled: true,
        priority: 40
      },

      // File upload endpoints
      {
        id: 'file_uploads',
        name: 'File Uploads',
        pattern: '/api/upload/*',
        windowMs: 60 * 1000,
        maxRequests: 10,
        customMessage: 'Too many file uploads. Please wait before uploading more files.',
        enabled: true,
        priority: 75
      },

      // Search endpoints - higher limits for read operations
      {
        id: 'search_queries',
        name: 'Search Queries',
        pattern: '/api/search/*',
        method: 'GET',
        windowMs: 60 * 1000,
        maxRequests: 200,
        skipConditions: ['successful_response'],
        enabled: true,
        priority: 30
      },

      // Health check endpoints - very high limits
      {
        id: 'health_checks',
        name: 'Health Checks',
        pattern: '/health*',
        windowMs: 60 * 1000,
        maxRequests: 1000,
        enabled: true,
        priority: 10
      },

      // General API endpoints - default rate limit
      {
        id: 'general_api',
        name: 'General API',
        pattern: '/api/*',
        windowMs: 60 * 1000,
        maxRequests: 100,
        enabled: true,
        priority: 1
      }
    ];

    logger.info(`Initialized ${this.rules.length} rate limiting rules`);
  }

  /**
   * Find the most specific rate limit rule for a request
   */
  public findMatchingRule(req: Request): RateLimitRule | null {
    const path = req.path;
    const method = req.method;

    // Sort rules by priority (highest first)
    const sortedRules = this.rules
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (this.matchesPattern(path, rule.pattern)) {
        // Check method if specified
        if (rule.method && rule.method !== method) {
          continue;
        }
        
        // Check user tier if specified
        if (rule.userTier) {
          const userTier = (req as any).userTier;
          if (userTier !== rule.userTier) {
            continue;
          }
        }

        return rule;
      }
    }

    return null;
  }

  /**
   * Check if a path matches a pattern (supports wildcards)
   */
  private matchesPattern(path: string, pattern: string): boolean {
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*') // Replace * with .*
      .replace(/\?/g, '.') // Replace ? with .
      .replace(/\//g, '\\/'); // Escape forward slashes

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(path);
  }

  /**
   * Add a new rate limiting rule
   */
  public addRule(rule: RateLimitRule): void {
    // Check if rule with same ID already exists
    const existingIndex = this.rules.findIndex(r => r.id === rule.id);
    
    if (existingIndex >= 0) {
      this.rules[existingIndex] = rule;
      logger.info(`Updated rate limiting rule: ${rule.id}`);
    } else {
      this.rules.push(rule);
      logger.info(`Added new rate limiting rule: ${rule.id}`);
    }
  }

  /**
   * Remove a rate limiting rule
   */
  public removeRule(ruleId: string): boolean {
    const initialLength = this.rules.length;
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
    
    const removed = this.rules.length < initialLength;
    if (removed) {
      logger.info(`Removed rate limiting rule: ${ruleId}`);
    }
    
    return removed;
  }

  /**
   * Enable or disable a rule
   */
  public toggleRule(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      logger.info(`${enabled ? 'Enabled' : 'Disabled'} rate limiting rule: ${ruleId}`);
      return true;
    }
    return false;
  }

  /**
   * Get all rules
   */
  public getAllRules(): RateLimitRule[] {
    return [...this.rules];
  }

  /**
   * Get rules by pattern
   */
  public getRulesByPattern(pattern: string): RateLimitRule[] {
    return this.rules.filter(rule => rule.pattern === pattern);
  }

  /**
   * Update rule configuration
   */
  public updateRule(ruleId: string, updates: Partial<RateLimitRule>): boolean {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      Object.assign(rule, updates);
      logger.info(`Updated rate limiting rule: ${ruleId}`, updates);
      return true;
    }
    return false;
  }

  /**
   * Get rate limit configuration for user tier
   */
  public getTierConfiguration(tier: 'FREE' | 'PREMIUM' | 'ENTERPRISE'): {
    windowMs: number;
    maxRequests: number;
    multiplier: number;
  } {
    const configurations = {
      FREE: {
        windowMs: 60 * 1000,
        maxRequests: 50,
        multiplier: 1
      },
      PREMIUM: {
        windowMs: 60 * 1000,
        maxRequests: 200,
        multiplier: 4
      },
      ENTERPRISE: {
        windowMs: 60 * 1000,
        maxRequests: 1000,
        multiplier: 20
      }
    };

    return configurations[tier] || configurations.FREE;
  }

  /**
   * Apply tier-based rate limit adjustments
   */
  public applyTierAdjustments(rule: RateLimitRule, userTier: string): RateLimitRule {
    if (!userTier || userTier === 'FREE') {
      return rule;
    }

    const tierConfig = this.getTierConfiguration(userTier as any);
    const adjustedRule = { ...rule };

    // Apply multiplier to max requests
    adjustedRule.maxRequests = Math.floor(rule.maxRequests * tierConfig.multiplier);

    return adjustedRule;
  }

  /**
   * Check if request should skip rate limiting based on conditions
   */
  public shouldSkipRateLimit(req: Request, rule: RateLimitRule): boolean {
    if (!rule.skipConditions || rule.skipConditions.length === 0) {
      return false;
    }

    for (const condition of rule.skipConditions) {
      switch (condition) {
        case 'successful_response':
          // This would be checked after the response
          return false;
        case 'authenticated_user':
          return !!(req as any).walletAddress;
        case 'premium_user':
          return (req as any).userTier === 'PREMIUM' || (req as any).userTier === 'ENTERPRISE';
        case 'internal_request':
          return req.get('X-Internal-Request') === 'true';
        case 'health_check':
          return req.path.startsWith('/health');
        default:
          return false;
      }
    }

    return false;
  }

  /**
   * Get rate limiting statistics
   */
  public getStatistics(): {
    totalRules: number;
    enabledRules: number;
    rulesByPriority: Array<{ priority: number; count: number }>;
    rulesByPattern: Array<{ pattern: string; count: number }>;
  } {
    const enabledRules = this.rules.filter(r => r.enabled);
    
    const priorityGroups = this.rules.reduce((acc, rule) => {
      const priority = Math.floor(rule.priority / 10) * 10; // Group by tens
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const patternGroups = this.rules.reduce((acc, rule) => {
      const basePattern = rule.pattern.split('*')[0]; // Get base pattern
      acc[basePattern] = (acc[basePattern] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRules: this.rules.length,
      enabledRules: enabledRules.length,
      rulesByPriority: Object.entries(priorityGroups).map(([priority, count]) => ({
        priority: parseInt(priority),
        count
      })),
      rulesByPattern: Object.entries(patternGroups).map(([pattern, count]) => ({
        pattern,
        count
      }))
    };
  }
}

export const rateLimitConfigService = RateLimitConfigService.getInstance();
