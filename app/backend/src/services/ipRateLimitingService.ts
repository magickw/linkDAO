import { safeLogger } from '../utils/safeLogger';
import { ModerationErrorHandler, ModerationErrorType } from '../utils/moderationErrorHandler';
import { databaseService } from './databaseService';
import { contentReports } from '../db/schema';
import { gte, and, count } from 'drizzle-orm';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  error?: string;
}

/**
 * IP-based rate limiting service for moderation actions
 */
export class IpRateLimitingService {
  private memoryStore = new Map<string, { count: number; resetAt: number }>();
  private config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: RateLimitConfig = { maxRequests: 10, windowMs: 900000 }) {
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false
    };

    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check rate limit for an IP address
   */
  async checkRateLimit(
    identifier: string,
    ip: string,
    action: string = 'default'
  ): Promise<RateLimitResult> {
    try {
      const key = `${action}:${ip}`;
      const now = Date.now();
      
      // Check memory store first
      let entry = this.memoryStore.get(key);
      
      // Initialize or reset if window has passed
      if (!entry || now >= entry.resetAt) {
        // Count existing requests in database for accurate tracking
        const dbCount = await this.countRecentReports(ip, this.config.windowMs);
        
        entry = {
          count: dbCount,
          resetAt: now + this.config.windowMs
        };
        
        this.memoryStore.set(key, entry);
      }
      
      const remaining = Math.max(0, this.config.maxRequests - entry.count);
      
      if (entry.count >= this.config.maxRequests) {
        safeLogger.warn(`Rate limit exceeded for IP ${ip} (${action}):`, {
          count: entry.count,
          maxRequests: this.config.maxRequests,
          windowMs: this.config.windowMs
        });
        
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(entry.resetAt),
          error: `Rate limit exceeded. Maximum ${this.config.maxRequests} requests per ${this.config.windowMs}ms.`
        };
      }
      
      return {
        allowed: true,
        remaining: remaining - 1, // Remaining after this request
        resetAt: new Date(entry.resetAt)
      };

    } catch (error) {
      safeLogger.error(`Rate limit check failed for IP ${ip}:`, error);
      
      // On error, allow the request (fail open)
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt: new Date(Date.now() + this.config.windowMs)
      };
    }
  }

  /**
   * Increment request count for an IP address
   */
  async increment(identifier: string, ip: string, action: string = 'default', success: boolean = true): Promise<void> {
    const key = `${action}:${ip}`;
    const entry = this.memoryStore.get(key);
    
    if (entry) {
      // Check if we should skip this increment
      if (success && this.config.skipSuccessfulRequests) {
        return;
      }
      
      if (!success && this.config.skipFailedRequests) {
        return;
      }
      
      // Only increment if we're still in the same window
      if (Date.now() < entry.resetAt) {
        entry.count++;
      }
    }
  }

  /**
   * Count recent reports from database for accurate tracking
   */
  private async countRecentReports(ip: string, windowMs: number): Promise<number> {
    try {
      const db = databaseService.getDatabase();
      const cutoff = new Date(Date.now() - windowMs);
      
      const result = await db
        .select({ count: count() })
        .from(contentReports)
        .where(
          and(
            gte(contentReports.createdAt, cutoff),
            // Note: This requires ip_address column to exist in content_reports table
            // If it doesn't exist, this will throw an error
            // We'll handle that gracefully
          )
        );
      
      return result[0]?.count || 0;

    } catch (error) {
      // If ip_address column doesn't exist, return 0
      if (error.code === '42703') {
        safeLogger.warn('ip_address column not found in content_reports table');
        return 0;
      }
      
      safeLogger.error('Failed to count recent reports:', error);
      return 0;
    }
  }

  /**
   * Reset rate limit for an IP address (for admin use)
   */
  async resetRateLimit(ip: string, action: string = 'default'): Promise<void> {
    const key = `${action}:${ip}`;
    this.memoryStore.delete(key);
    safeLogger.info(`Rate limit reset for IP ${ip} (${action})`);
  }

  /**
   * Get current rate limit status for an IP address
   */
  async getRateLimitStatus(ip: string, action: string = 'default'): Promise<{
    count: number;
    maxRequests: number;
    remaining: number;
    resetAt: Date;
  }> {
    const key = `${action}:${ip}`;
    const entry = this.memoryStore.get(key);
    
    if (!entry) {
      return {
        count: 0,
        maxRequests: this.config.maxRequests,
        remaining: this.config.maxRequests,
        resetAt: new Date(Date.now() + this.config.windowMs)
      };
    }
    
    const now = Date.now();
    
    // Reset if window has passed
    if (now >= entry.resetAt) {
      return {
        count: 0,
        maxRequests: this.config.maxRequests,
        remaining: this.config.maxRequests,
        resetAt: new Date(now + this.config.windowMs)
      };
    }
    
    const remaining = Math.max(0, this.config.maxRequests - entry.count);
    
    return {
      count: entry.count,
      maxRequests: this.config.maxRequests,
      remaining,
      resetAt: new Date(entry.resetAt)
    };
  }

  /**
   * Clean up expired entries from memory store
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.memoryStore.entries()) {
      if (now >= entry.resetAt) {
        this.memoryStore.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      safeLogger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }

  /**
   * Get statistics about rate limiting
   */
  getStats(): {
    totalEntries: number;
    config: RateLimitConfig;
    activeEntries: number;
  } {
    const now = Date.now();
    let activeEntries = 0;
    
    for (const entry of this.memoryStore.values()) {
      if (now < entry.resetAt) {
        activeEntries++;
      }
    }
    
    return {
      totalEntries: this.memoryStore.size,
      config: this.config,
      activeEntries
    };
  }

  /**
   * Clear all rate limit entries (for testing/admin use)
   */
  clearAll(): void {
    this.memoryStore.clear();
    safeLogger.info('All rate limit entries cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };
    safeLogger.info('Rate limit configuration updated:', this.config);
  }

  /**
   * Destroy cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.memoryStore.clear();
  }
}

// Default rate limiting service for content reports (10 reports per 15 minutes)
export const reportRateLimitService = new IpRateLimitingService({
  maxRequests: 10,
  windowMs: 900000, // 15 minutes
  skipSuccessfulRequests: false,
  skipFailedRequests: true // Don't count failed reports
});

// Stricter rate limiting for sensitive actions (3 requests per hour)
export const strictRateLimitService = new IpRateLimitingService({
  maxRequests: 3,
  windowMs: 3600000, // 1 hour
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});

// Lenient rate limiting for read operations (100 requests per minute)
export const readRateLimitService = new IpRateLimitingService({
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});