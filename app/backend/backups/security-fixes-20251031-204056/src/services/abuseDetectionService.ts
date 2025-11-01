/**
 * Abuse Detection Service
 * Automated abuse detection and reporting system with pattern recognition
 */

import { Request } from 'express';
import { safeLogger } from '../utils/safeLogger';
import Redis from 'ioredis';
import { safeLogger } from '../utils/safeLogger';

export interface AbusePattern {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: number;
  windowMs: number;
  actions: AbuseAction[];
}

export interface AbuseAction {
  type: 'warn' | 'throttle' | 'block' | 'report' | 'captcha';
  duration?: number;
  parameters?: Record<string, any>;
}

export interface AbuseEvent {
  id: string;
  userId?: string;
  ip: string;
  userAgent: string;
  pattern: string;
  severity: string;
  timestamp: Date;
  metadata: Record<string, any>;
  resolved: boolean;
}

export interface SuspiciousActivity {
  type: string;
  score: number;
  indicators: string[];
  metadata: Record<string, any>;
}

export class AbuseDetectionService {
  private static redis: Redis;
  private static patterns: Map<string, AbusePattern> = new Map();

  // Predefined abuse patterns
  private static readonly DEFAULT_PATTERNS: AbusePattern[] = [
    {
      id: 'rapid_requests',
      name: 'Rapid API Requests',
      description: 'Unusually high number of API requests in short time',
      severity: 'medium',
      threshold: 100,
      windowMs: 60 * 1000, // 1 minute
      actions: [
        { type: 'throttle', duration: 300000 }, // 5 minutes
        { type: 'captcha' }
      ]
    },
    {
      id: 'spam_posting',
      name: 'Spam Posting',
      description: 'Multiple similar posts in short time',
      severity: 'high',
      threshold: 5,
      windowMs: 10 * 60 * 1000, // 10 minutes
      actions: [
        { type: 'block', duration: 3600000 }, // 1 hour
        { type: 'report' }
      ]
    },
    {
      id: 'account_enumeration',
      name: 'Account Enumeration',
      description: 'Attempting to discover valid user accounts',
      severity: 'high',
      threshold: 20,
      windowMs: 5 * 60 * 1000, // 5 minutes
      actions: [
        { type: 'block', duration: 1800000 }, // 30 minutes
        { type: 'report' }
      ]
    },
    {
      id: 'brute_force_login',
      name: 'Brute Force Login',
      description: 'Multiple failed login attempts',
      severity: 'critical',
      threshold: 10,
      windowMs: 15 * 60 * 1000, // 15 minutes
      actions: [
        { type: 'block', duration: 3600000 }, // 1 hour
        { type: 'captcha' },
        { type: 'report' }
      ]
    },
    {
      id: 'content_scraping',
      name: 'Content Scraping',
      description: 'Systematic content access patterns',
      severity: 'medium',
      threshold: 200,
      windowMs: 60 * 60 * 1000, // 1 hour
      actions: [
        { type: 'throttle', duration: 1800000 }, // 30 minutes
        { type: 'captcha' }
      ]
    },
    {
      id: 'mass_following',
      name: 'Mass Following',
      description: 'Following many users in short time',
      severity: 'medium',
      threshold: 50,
      windowMs: 60 * 60 * 1000, // 1 hour
      actions: [
        { type: 'throttle', duration: 3600000 }, // 1 hour
        { type: 'warn' }
      ]
    },
    {
      id: 'suspicious_registration',
      name: 'Suspicious Registration',
      description: 'Multiple registrations from same IP/pattern',
      severity: 'high',
      threshold: 5,
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      actions: [
        { type: 'block', duration: 86400000 }, // 24 hours
        { type: 'captcha' },
        { type: 'report' }
      ]
    }
  ];

  /**
   * Initialize abuse detection service
   */
  static initialize(): void {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_ABUSE_DB || '2'),
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      // Load default patterns
      this.DEFAULT_PATTERNS.forEach(pattern => {
        this.patterns.set(pattern.id, pattern);
      });

      safeLogger.info('Abuse detection service initialized');
    } catch (error) {
      safeLogger.error('Failed to initialize abuse detection service:', error);
    }
  }

  /**
   * Analyze request for suspicious activity
   */
  static async analyzeRequest(req: Request, action: string): Promise<SuspiciousActivity[]> {
    const activities: SuspiciousActivity[] = [];
    const ip = req.ip;
    const userAgent = req.get('User-Agent') || '';
    const userId = (req as any).user?.id;

    try {
      // Check for rapid requests
      const rapidRequestActivity = await this.checkRapidRequests(ip, userAgent);
      if (rapidRequestActivity) activities.push(rapidRequestActivity);

      // Check for bot-like behavior
      const botActivity = await this.checkBotBehavior(req);
      if (botActivity) activities.push(botActivity);

      // Check for suspicious user agent
      const userAgentActivity = this.checkSuspiciousUserAgent(userAgent);
      if (userAgentActivity) activities.push(userAgentActivity);

      // Check for geographic anomalies
      const geoActivity = await this.checkGeographicAnomalies(ip, userId);
      if (geoActivity) activities.push(geoActivity);

      // Action-specific checks
      switch (action) {
        case 'login':
          const loginActivity = await this.checkLoginPatterns(ip, userId);
          if (loginActivity) activities.push(loginActivity);
          break;
        case 'register':
          const registerActivity = await this.checkRegistrationPatterns(ip);
          if (registerActivity) activities.push(registerActivity);
          break;
        case 'post':
          const postActivity = await this.checkPostingPatterns(userId, req.body);
          if (postActivity) activities.push(postActivity);
          break;
        case 'follow':
          const followActivity = await this.checkFollowingPatterns(userId);
          if (followActivity) activities.push(followActivity);
          break;
      }

      return activities;
    } catch (error) {
      safeLogger.error('Error analyzing request for abuse:', error);
      return [];
    }
  }

  /**
   * Check for rapid requests pattern
   */
  private static async checkRapidRequests(ip: string, userAgent: string): Promise<SuspiciousActivity | null> {
    try {
      const key = `rapid_requests:${ip}`;
      const count = await this.redis.incr(key);
      
      if (count === 1) {
        await this.redis.expire(key, 60); // 1 minute window
      }

      if (count > 100) { // More than 100 requests per minute
        return {
          type: 'rapid_requests',
          score: Math.min(count / 10, 100),
          indicators: [
            `${count} requests in 1 minute`,
            `IP: ${ip}`,
            `User-Agent: ${userAgent}`
          ],
          metadata: { count, ip, userAgent }
        };
      }

      return null;
    } catch (error) {
      safeLogger.error('Error checking rapid requests:', error);
      return null;
    }
  }

  /**
   * Check for bot-like behavior
   */
  private static async checkBotBehavior(req: Request): Promise<SuspiciousActivity | null> {
    const indicators: string[] = [];
    let score = 0;

    // Check for missing common headers
    if (!req.get('Accept-Language')) {
      indicators.push('Missing Accept-Language header');
      score += 20;
    }

    if (!req.get('Accept-Encoding')) {
      indicators.push('Missing Accept-Encoding header');
      score += 15;
    }

    // Check for suspicious header patterns
    const userAgent = req.get('User-Agent') || '';
    if (userAgent.length < 10) {
      indicators.push('Unusually short User-Agent');
      score += 25;
    }

    // Check for automated tool signatures
    const botSignatures = [
      'curl', 'wget', 'python', 'requests', 'scrapy', 'bot', 'crawler',
      'spider', 'scraper', 'automation', 'headless'
    ];

    for (const signature of botSignatures) {
      if (userAgent.toLowerCase().includes(signature)) {
        indicators.push(`Bot signature detected: ${signature}`);
        score += 30;
        break;
      }
    }

    // Check request timing patterns
    const ip = req.ip;
    const timingKey = `timing:${ip}`;
    const now = Date.now();
    
    try {
      const lastRequest = await this.redis.get(timingKey);
      if (lastRequest) {
        const timeDiff = now - parseInt(lastRequest);
        if (timeDiff < 100) { // Less than 100ms between requests
          indicators.push('Extremely fast request timing');
          score += 40;
        }
      }
      await this.redis.setex(timingKey, 60, now.toString());
    } catch (error) {
      // Ignore timing check errors
    }

    if (score >= 50) {
      return {
        type: 'bot_behavior',
        score,
        indicators,
        metadata: { userAgent, ip: req.ip }
      };
    }

    return null;
  }

  /**
   * Check for suspicious user agent
   */
  private static checkSuspiciousUserAgent(userAgent: string): SuspiciousActivity | null {
    const indicators: string[] = [];
    let score = 0;

    // Empty or very short user agent
    if (!userAgent || userAgent.length < 10) {
      indicators.push('Empty or very short user agent');
      score += 30;
    }

    // Known malicious patterns
    const maliciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /masscan/i,
      /zap/i,
      /burp/i,
      /acunetix/i,
      /nessus/i
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(userAgent)) {
        indicators.push(`Malicious tool detected: ${pattern.source}`);
        score += 100;
        break;
      }
    }

    // Suspicious version patterns
    if (/Mozilla\/[0-9]+\.[0-9]+$/.test(userAgent)) {
      indicators.push('Incomplete Mozilla version string');
      score += 20;
    }

    if (score >= 30) {
      return {
        type: 'suspicious_user_agent',
        score,
        indicators,
        metadata: { userAgent }
      };
    }

    return null;
  }

  /**
   * Check for geographic anomalies
   */
  private static async checkGeographicAnomalies(ip: string, userId?: string): Promise<SuspiciousActivity | null> {
    if (!userId) return null;

    try {
      // This would integrate with a GeoIP service
      // For now, we'll do basic checks
      const locationKey = `location:${userId}`;
      const currentLocation = await this.redis.get(locationKey);
      
      if (currentLocation) {
        // In a real implementation, you'd compare geographic locations
        // and flag rapid location changes as suspicious
        const locationData = JSON.parse(currentLocation);
        const timeDiff = Date.now() - locationData.timestamp;
        
        // If location changed within 1 hour (impossible travel)
        if (timeDiff < 3600000 && locationData.ip !== ip) {
          return {
            type: 'geographic_anomaly',
            score: 70,
            indicators: [
              'Impossible travel detected',
              `Previous IP: ${locationData.ip}`,
              `Current IP: ${ip}`,
              `Time difference: ${Math.round(timeDiff / 1000)}s`
            ],
            metadata: { previousIp: locationData.ip, currentIp: ip, timeDiff }
          };
        }
      }

      // Store current location
      await this.redis.setex(locationKey, 86400, JSON.stringify({
        ip,
        timestamp: Date.now()
      }));

      return null;
    } catch (error) {
      safeLogger.error('Error checking geographic anomalies:', error);
      return null;
    }
  }

  /**
   * Check login patterns
   */
  private static async checkLoginPatterns(ip: string, userId?: string): Promise<SuspiciousActivity | null> {
    try {
      const failedKey = `failed_login:${ip}`;
      const failedCount = await this.redis.get(failedKey);
      
      if (failedCount && parseInt(failedCount) >= 5) {
        return {
          type: 'brute_force_login',
          score: Math.min(parseInt(failedCount) * 10, 100),
          indicators: [
            `${failedCount} failed login attempts`,
            `IP: ${ip}`
          ],
          metadata: { failedCount: parseInt(failedCount), ip }
        };
      }

      return null;
    } catch (error) {
      safeLogger.error('Error checking login patterns:', error);
      return null;
    }
  }

  /**
   * Check registration patterns
   */
  private static async checkRegistrationPatterns(ip: string): Promise<SuspiciousActivity | null> {
    try {
      const regKey = `registrations:${ip}`;
      const count = await this.redis.incr(regKey);
      
      if (count === 1) {
        await this.redis.expire(regKey, 86400); // 24 hours
      }

      if (count > 3) {
        return {
          type: 'suspicious_registration',
          score: count * 20,
          indicators: [
            `${count} registrations from same IP in 24h`,
            `IP: ${ip}`
          ],
          metadata: { count, ip }
        };
      }

      return null;
    } catch (error) {
      safeLogger.error('Error checking registration patterns:', error);
      return null;
    }
  }

  /**
   * Check posting patterns
   */
  private static async checkPostingPatterns(userId?: string, content?: any): Promise<SuspiciousActivity | null> {
    if (!userId) return null;

    try {
      const postKey = `posts:${userId}`;
      const count = await this.redis.incr(postKey);
      
      if (count === 1) {
        await this.redis.expire(postKey, 3600); // 1 hour
      }

      const indicators: string[] = [];
      let score = 0;

      // Check for rapid posting
      if (count > 10) {
        indicators.push(`${count} posts in 1 hour`);
        score += count * 5;
      }

      // Check for duplicate content
      if (content && content.text) {
        const contentHash = this.hashContent(content.text);
        const duplicateKey = `content:${contentHash}`;
        const duplicateCount = await this.redis.incr(duplicateKey);
        
        if (duplicateCount === 1) {
          await this.redis.expire(duplicateKey, 86400); // 24 hours
        }

        if (duplicateCount > 1) {
          indicators.push('Duplicate content detected');
          score += 30;
        }
      }

      if (score >= 30) {
        return {
          type: 'spam_posting',
          score,
          indicators,
          metadata: { userId, postCount: count }
        };
      }

      return null;
    } catch (error) {
      safeLogger.error('Error checking posting patterns:', error);
      return null;
    }
  }

  /**
   * Check following patterns
   */
  private static async checkFollowingPatterns(userId?: string): Promise<SuspiciousActivity | null> {
    if (!userId) return null;

    try {
      const followKey = `follows:${userId}`;
      const count = await this.redis.incr(followKey);
      
      if (count === 1) {
        await this.redis.expire(followKey, 3600); // 1 hour
      }

      if (count > 20) {
        return {
          type: 'mass_following',
          score: count * 3,
          indicators: [
            `${count} follows in 1 hour`,
            `User ID: ${userId}`
          ],
          metadata: { userId, followCount: count }
        };
      }

      return null;
    } catch (error) {
      safeLogger.error('Error checking following patterns:', error);
      return null;
    }
  }

  /**
   * Record abuse event
   */
  static async recordAbuseEvent(event: Omit<AbuseEvent, 'id' | 'timestamp'>): Promise<string> {
    try {
      const eventId = `abuse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const abuseEvent: AbuseEvent = {
        ...event,
        id: eventId,
        timestamp: new Date()
      };

      await this.redis.setex(
        `abuse_event:${eventId}`,
        86400 * 7, // Keep for 7 days
        JSON.stringify(abuseEvent)
      );

      // Add to abuse log
      await this.redis.lpush('abuse_log', JSON.stringify(abuseEvent));
      await this.redis.ltrim('abuse_log', 0, 999); // Keep last 1000 events

      safeLogger.warn('Abuse event recorded:', abuseEvent);
      return eventId;
    } catch (error) {
      safeLogger.error('Error recording abuse event:', error);
      return '';
    }
  }

  /**
   * Get abuse statistics
   */
  static async getAbuseStats(): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    topAbusiveIPs: Array<{ ip: string; count: number }>;
    recentEvents: AbuseEvent[];
  }> {
    try {
      const events = await this.redis.lrange('abuse_log', 0, 99);
      const parsedEvents = events.map(event => JSON.parse(event));
      
      const eventsByType: Record<string, number> = {};
      const ipCounts: Record<string, number> = {};
      
      parsedEvents.forEach(event => {
        eventsByType[event.pattern] = (eventsByType[event.pattern] || 0) + 1;
        ipCounts[event.ip] = (ipCounts[event.ip] || 0) + 1;
      });
      
      const topAbusiveIPs = Object.entries(ipCounts)
        .map(([ip, count]) => ({ ip, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalEvents: parsedEvents.length,
        eventsByType,
        topAbusiveIPs,
        recentEvents: parsedEvents.slice(0, 20)
      };
    } catch (error) {
      safeLogger.error('Error getting abuse stats:', error);
      return {
        totalEvents: 0,
        eventsByType: {},
        topAbusiveIPs: [],
        recentEvents: []
      };
    }
  }

  /**
   * Hash content for duplicate detection
   */
  private static hashContent(content: string): string {
    // Simple hash function for content deduplication
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Clean up old abuse data
   */
  static async cleanup(): Promise<number> {
    try {
      const keys = await this.redis.keys('abuse_event:*');
      let cleaned = 0;
      
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) {
          await this.redis.expire(key, 86400 * 7); // 7 days
          cleaned++;
        }
      }
      
      return cleaned;
    } catch (error) {
      safeLogger.error('Error during abuse data cleanup:', error);
      return 0;
    }
  }
}

export default AbuseDetectionService;