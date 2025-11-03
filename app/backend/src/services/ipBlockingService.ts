/**
 * IP Blocking Service
 * Manages IP-based and user-based blocking mechanisms for abuse prevention
 */

import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';
import Redis from 'ioredis';
import { securityConfig } from '../config/securityConfig';

export interface BlockEntry {
  id: string;
  ip?: string;
  userId?: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  blockedAt: Date;
  expiresAt?: Date;
  permanent: boolean;
  blockedBy: string;
  metadata: Record<string, any>;
}

export interface BlockRule {
  id: string;
  name: string;
  pattern: string;
  type: 'ip' | 'cidr' | 'country' | 'asn' | 'user_agent';
  action: 'block' | 'throttle' | 'captcha';
  duration?: number;
  reason: string;
  active: boolean;
  createdAt: Date;
}

export interface GeoLocation {
  country: string;
  region: string;
  city: string;
  asn: number;
  organization: string;
}

export class IPBlockingService {
  private static redis: Redis;
  private static blockedIPs: Set<string> = new Set();
  private static blockedUsers: Set<string> = new Set();
  private static blockRules: Map<string, BlockRule> = new Map();

  // Default blocked countries (can be configured)
  private static readonly DEFAULT_BLOCKED_COUNTRIES = [
    // Add countries based on your security requirements
    // Example: 'CN', 'RU', 'KP'
  ];

  // Known malicious IP ranges (simplified examples)
  private static readonly MALICIOUS_IP_RANGES = [
    '10.0.0.0/8',     // Private networks (shouldn't access public APIs)
    '172.16.0.0/12',  // Private networks
    '192.168.0.0/16', // Private networks
    '127.0.0.0/8',    // Loopback
    '169.254.0.0/16', // Link-local
    '224.0.0.0/4',    // Multicast
    '240.0.0.0/4'     // Reserved
  ];

  /**
   * Initialize IP blocking service
   */
  static initialize(): void {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_BLOCKING_DB || '3'),
        lazyConnect: true
      });

      // Load existing blocks from Redis
      this.loadBlockedEntries();

      safeLogger.info('IP blocking service initialized');
    } catch (error) {
      safeLogger.error('Failed to initialize IP blocking service:', error);
    }
  }

  /**
   * Middleware to check if IP or user is blocked
   */
  static blockingMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const ip = req.ip;
        const userId = (req as any).user?.id;

        // Check IP blocking
        const ipBlocked = await this.isIPBlocked(ip);
        if (ipBlocked) {
          const blockInfo = await this.getBlockInfo('ip', ip);
          res.status(403).json({
            success: false,
            error: 'Access denied',
            code: 'IP_BLOCKED',
            reason: blockInfo?.reason || 'IP address is blocked',
            blockedAt: blockInfo?.blockedAt,
            expiresAt: blockInfo?.expiresAt,
            contactSupport: true
          });
          return;
        }

        // Check user blocking
        if (userId) {
          const userBlocked = await this.isUserBlocked(userId);
          if (userBlocked) {
            const blockInfo = await this.getBlockInfo('user', userId);
            res.status(403).json({
              success: false,
              error: 'Account suspended',
              code: 'USER_BLOCKED',
              reason: blockInfo?.reason || 'User account is suspended',
              blockedAt: blockInfo?.blockedAt,
              expiresAt: blockInfo?.expiresAt,
              contactSupport: true
            });
            return;
          }
        }

        // Check against block rules
        const ruleViolation = await this.checkBlockRules(req);
        if (ruleViolation) {
          switch (ruleViolation.action) {
            case 'block':
              res.status(403).json({
                success: false,
                error: 'Access denied by security rule',
                code: 'RULE_BLOCKED',
                reason: ruleViolation.reason
              });
              return;
            case 'throttle':
              // Add throttling headers
              res.set('X-RateLimit-Limit', '10');
              res.set('X-RateLimit-Remaining', '0');
              res.set('X-RateLimit-Reset', new Date(Date.now() + 60000).toISOString());
              break;
            case 'captcha':
              res.status(429).json({
                success: false,
                error: 'CAPTCHA verification required',
                code: 'CAPTCHA_REQUIRED',
                reason: ruleViolation.reason
              });
              return;
          }
        }

        next();
      } catch (error) {
        safeLogger.error('Error in blocking middleware:', error);
        // Fail open - allow request if blocking service is down
        next();
      }
    };
  }

  /**
   * Block an IP address
   */
  static async blockIP(
    ip: string,
    reason: string,
    duration?: number,
    severity: BlockEntry['severity'] = 'medium',
    blockedBy: string = 'system'
  ): Promise<string> {
    try {
      const blockId = `ip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = duration ? new Date(Date.now() + duration) : undefined;

      const blockEntry: BlockEntry = {
        id: blockId,
        ip,
        reason,
        severity,
        blockedAt: new Date(),
        expiresAt,
        permanent: !duration,
        blockedBy,
        metadata: {
          userAgent: '',
          location: await this.getIPLocation(ip)
        }
      };

      // Store in Redis
      const key = `blocked_ip:${ip}`;
      await this.redis.setex(
        key,
        duration ? Math.ceil(duration / 1000) : 86400 * 365, // 1 year for permanent
        JSON.stringify(blockEntry)
      );

      // Add to memory cache
      this.blockedIPs.add(ip);

      // Log the block
      await this.logBlockAction('block_ip', blockEntry);

      safeLogger.warn(`IP blocked: ${ip} - ${reason}`);
      return blockId;
    } catch (error) {
      safeLogger.error('Error blocking IP:', error);
      throw error;
    }
  }

  /**
   * Block a user
   */
  static async blockUser(
    userId: string,
    reason: string,
    duration?: number,
    severity: BlockEntry['severity'] = 'medium',
    blockedBy: string = 'system'
  ): Promise<string> {
    try {
      const blockId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = duration ? new Date(Date.now() + duration) : undefined;

      const blockEntry: BlockEntry = {
        id: blockId,
        userId,
        reason,
        severity,
        blockedAt: new Date(),
        expiresAt,
        permanent: !duration,
        blockedBy,
        metadata: {}
      };

      // Store in Redis
      const key = `blocked_user:${userId}`;
      await this.redis.setex(
        key,
        duration ? Math.ceil(duration / 1000) : 86400 * 365, // 1 year for permanent
        JSON.stringify(blockEntry)
      );

      // Add to memory cache
      this.blockedUsers.add(userId);

      // Log the block
      await this.logBlockAction('block_user', blockEntry);

      safeLogger.warn(`User blocked: ${userId} - ${reason}`);
      return blockId;
    } catch (error) {
      safeLogger.error('Error blocking user:', error);
      throw error;
    }
  }

  /**
   * Unblock an IP address
   */
  static async unblockIP(ip: string): Promise<boolean> {
    try {
      const key = `blocked_ip:${ip}`;
      const result = await this.redis.del(key);
      
      // Remove from memory cache
      this.blockedIPs.delete(ip);

      // Log the unblock
      await this.logBlockAction('unblock_ip', { ip, reason: 'Manual unblock' });

      safeLogger.info(`IP unblocked: ${ip}`);
      return result > 0;
    } catch (error) {
      safeLogger.error('Error unblocking IP:', error);
      return false;
    }
  }

  /**
   * Unblock a user
   */
  static async unblockUser(userId: string): Promise<boolean> {
    try {
      const key = `blocked_user:${userId}`;
      const result = await this.redis.del(key);
      
      // Remove from memory cache
      this.blockedUsers.delete(userId);

      // Log the unblock
      await this.logBlockAction('unblock_user', { userId, reason: 'Manual unblock' });

      safeLogger.info(`User unblocked: ${userId}`);
      return result > 0;
    } catch (error) {
      safeLogger.error('Error unblocking user:', error);
      return false;
    }
  }

  /**
   * Check if IP is blocked
   */
  static async isIPBlocked(ip: string): Promise<boolean> {
    try {
      // Check memory cache first
      if (this.blockedIPs.has(ip)) return true;

      // Check Redis
      const key = `blocked_ip:${ip}`;
      const blockData = await this.redis.get(key);
      
      if (blockData) {
        const block: BlockEntry = JSON.parse(blockData);
        
        // Check if block has expired
        if (block.expiresAt && new Date() > new Date(block.expiresAt)) {
          await this.unblockIP(ip);
          return false;
        }
        
        // Add to memory cache
        this.blockedIPs.add(ip);
        return true;
      }

      // Check against IP ranges
      if (this.isIPInMaliciousRange(ip)) {
        await this.blockIP(ip, 'Malicious IP range', undefined, 'high', 'auto');
        return true;
      }

      return false;
    } catch (error) {
      safeLogger.error('Error checking IP block status:', error);
      return false;
    }
  }

  /**
   * Check if user is blocked
   */
  static async isUserBlocked(userId: string): Promise<boolean> {
    try {
      // Check memory cache first
      if (this.blockedUsers.has(userId)) return true;

      // Check Redis
      const key = `blocked_user:${userId}`;
      const blockData = await this.redis.get(key);
      
      if (blockData) {
        const block: BlockEntry = JSON.parse(blockData);
        
        // Check if block has expired
        if (block.expiresAt && new Date() > new Date(block.expiresAt)) {
          await this.unblockUser(userId);
          return false;
        }
        
        // Add to memory cache
        this.blockedUsers.add(userId);
        return true;
      }

      return false;
    } catch (error) {
      safeLogger.error('Error checking user block status:', error);
      return false;
    }
  }

  /**
   * Get block information
   */
  static async getBlockInfo(type: 'ip' | 'user', identifier: string): Promise<BlockEntry | null> {
    try {
      const key = `blocked_${type}:${identifier}`;
      const blockData = await this.redis.get(key);
      
      if (blockData) {
        return JSON.parse(blockData);
      }
      
      return null;
    } catch (error) {
      safeLogger.error('Error getting block info:', error);
      return null;
    }
  }

  /**
   * Add a block rule
   */
  static addBlockRule(rule: Omit<BlockRule, 'id' | 'createdAt'>): string {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const blockRule: BlockRule = {
      ...rule,
      id: ruleId,
      createdAt: new Date()
    };

    this.blockRules.set(ruleId, blockRule);
    safeLogger.info(`Block rule added: ${rule.name}`);
    return ruleId;
  }

  /**
   * Remove a block rule
   */
  static removeBlockRule(ruleId: string): boolean {
    const removed = this.blockRules.delete(ruleId);
    if (removed) {
      safeLogger.info(`Block rule removed: ${ruleId}`);
    }
    return removed;
  }

  /**
   * Check request against block rules
   */
  private static async checkBlockRules(req: Request): Promise<BlockRule | null> {
    const ip = req.ip;
    const userAgent = req.get('User-Agent') || '';
    const location = await this.getIPLocation(ip);

    for (const rule of this.blockRules.values()) {
      if (!rule.active) continue;

      let matches = false;

      switch (rule.type) {
        case 'ip':
          matches = ip === rule.pattern;
          break;
        case 'cidr':
          matches = this.isIPInCIDR(ip, rule.pattern);
          break;
        case 'country':
          matches = location?.country === rule.pattern;
          break;
        case 'asn':
          matches = location?.asn === parseInt(rule.pattern);
          break;
        case 'user_agent':
          matches = new RegExp(rule.pattern, 'i').test(userAgent);
          break;
      }

      if (matches) {
        return rule;
      }
    }

    return null;
  }

  /**
   * Check if IP is in malicious range
   */
  private static isIPInMaliciousRange(ip: string): boolean {
    for (const range of this.MALICIOUS_IP_RANGES) {
      if (this.isIPInCIDR(ip, range)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if IP is in CIDR range
   */
  private static isIPInCIDR(ip: string, cidr: string): boolean {
    try {
      const [network, prefixLength] = cidr.split('/');
      const prefix = parseInt(prefixLength);
      
      const ipNum = this.ipToNumber(ip);
      const networkNum = this.ipToNumber(network);
      const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0;
      
      return (ipNum & mask) === (networkNum & mask);
    } catch (error) {
      return false;
    }
  }

  /**
   * Convert IP address to number
   */
  private static ipToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  /**
   * Get IP geolocation (mock implementation)
   */
  private static async getIPLocation(ip: string): Promise<GeoLocation | null> {
    try {
      // In production, integrate with a GeoIP service like MaxMind, IPinfo, etc.
      // This is a mock implementation
      return {
        country: 'US',
        region: 'CA',
        city: 'San Francisco',
        asn: 15169,
        organization: 'Google LLC'
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Load blocked entries from Redis
   */
  private static async loadBlockedEntries(): Promise<void> {
    try {
      // Load blocked IPs
      const ipKeys = await this.redis.keys('blocked_ip:*');
      for (const key of ipKeys) {
        const ip = key.replace('blocked_ip:', '');
        this.blockedIPs.add(ip);
      }

      // Load blocked users
      const userKeys = await this.redis.keys('blocked_user:*');
      for (const key of userKeys) {
        const userId = key.replace('blocked_user:', '');
        this.blockedUsers.add(userId);
      }

      safeLogger.info(`Loaded ${this.blockedIPs.size} blocked IPs and ${this.blockedUsers.size} blocked users`);
    } catch (error) {
      safeLogger.error('Error loading blocked entries:', error);
    }
  }

  /**
   * Log block action
   */
  private static async logBlockAction(action: string, data: any): Promise<void> {
    try {
      const logEntry = {
        action,
        data,
        timestamp: new Date().toISOString()
      };

      await this.redis.lpush('block_log', JSON.stringify(logEntry));
      await this.redis.ltrim('block_log', 0, 999); // Keep last 1000 entries
    } catch (error) {
      safeLogger.error('Error logging block action:', error);
    }
  }

  /**
   * Get blocking statistics
   */
  static async getBlockingStats(): Promise<{
    blockedIPs: number;
    blockedUsers: number;
    activeRules: number;
    recentBlocks: any[];
  }> {
    try {
      const recentLogs = await this.redis.lrange('block_log', 0, 19);
      const recentBlocks = recentLogs.map(log => JSON.parse(log));

      return {
        blockedIPs: this.blockedIPs.size,
        blockedUsers: this.blockedUsers.size,
        activeRules: Array.from(this.blockRules.values()).filter(rule => rule.active).length,
        recentBlocks
      };
    } catch (error) {
      safeLogger.error('Error getting blocking stats:', error);
      return {
        blockedIPs: 0,
        blockedUsers: 0,
        activeRules: 0,
        recentBlocks: []
      };
    }
  }

  /**
   * Clean up expired blocks
   */
  static async cleanup(): Promise<number> {
    try {
      let cleaned = 0;
      
      // Clean up expired IP blocks
      for (const ip of this.blockedIPs) {
        const blockInfo = await this.getBlockInfo('ip', ip);
        if (blockInfo?.expiresAt && new Date() > new Date(blockInfo.expiresAt)) {
          await this.unblockIP(ip);
          cleaned++;
        }
      }

      // Clean up expired user blocks
      for (const userId of this.blockedUsers) {
        const blockInfo = await this.getBlockInfo('user', userId);
        if (blockInfo?.expiresAt && new Date() > new Date(blockInfo.expiresAt)) {
          await this.unblockUser(userId);
          cleaned++;
        }
      }

      return cleaned;
    } catch (error) {
      safeLogger.error('Error during blocking cleanup:', error);
      return 0;
    }
  }
}

export default IPBlockingService;
