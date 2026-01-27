import * as Redis from 'redis';
import { safeLogger } from '../../utils/safeLogger';
import dotenv from 'dotenv';

dotenv.config();

export class RedisService {
  private client: Redis.RedisClientType | null = null;
  private isConnected: boolean = false;
  private useRedis: boolean = true; // Flag to enable/disable Redis functionality
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10; // Increased for cloud deployments where initial connections can be flaky
  private reconnectDelay: number = 1000; // Start with 1 second delay
  private maxReconnectDelay: number = 5000; // Cap at 5 seconds instead of 30
  private connectionPromise: Promise<void> | null = null;
  private static instance: RedisService | null = null;

  // Singleton pattern to ensure only one instance
  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  private constructor() {
    // Check if Redis is disabled or if we're in a memory-critical environment
    const isMemoryCritical = process.env.MEMORY_LIMIT && parseInt(process.env.MEMORY_LIMIT) < 512;
    const isEmergencyMode = process.env.EMERGENCY_MODE === 'true';
    
    // Default to enabled unless explicitly disabled
    const redisEnabled = process.env.REDIS_ENABLED;
    if (redisEnabled === 'false' || redisEnabled === '0' || isMemoryCritical || isEmergencyMode) {
      this.useRedis = false;
      if (isMemoryCritical) {
        safeLogger.warn('Redis functionality is disabled due to memory-critical environment (<512MB)');
      } else if (isEmergencyMode) {
        safeLogger.warn('Redis functionality is disabled due to emergency mode');
      } else {
        safeLogger.warn('Redis functionality is disabled via REDIS_ENABLED environment variable');
      }
      return;
    }

    let redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    // Handle placeholder values
    if (redisUrl === 'your_redis_url' || redisUrl === 'redis://your_redis_url') {
      redisUrl = 'redis://localhost:6379';
    }
    
    safeLogger.info('🔗 Attempting Redis connection to:', redisUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    // For Redis Cloud services that require SSL but use redis:// URL, 
    // we need to change the URL scheme to rediss://
    // Check if this looks like a Redis Cloud/managed service that typically requires SSL
    const isManagedService = /redis.*\.com|redis.*\.io|redis.*\.net|cache\.windows\.net|redis.*\.amazonaws\.com/.test(redisUrl);
    const isRedisCloud = /redis.*\.cloud\.redislabs\.com|.*\.amazonaws\.com|.*\.redis\.com|.*\.ec2\.cloud\.redislabs\.com/.test(redisUrl);
    
    let adjustedRedisUrl = redisUrl;
    if (isManagedService && redisUrl.startsWith('redis://')) {
      adjustedRedisUrl = redisUrl.replace('redis://', 'rediss://');
      safeLogger.info('Detected managed Redis service, switching to SSL connection:', {
        originalUrl: redisUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
        adjustedUrl: adjustedRedisUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
      });
    }
    
    // Parse the URL to extract host, port, password, etc.
    const url = new URL(adjustedRedisUrl);
    
    const options: any = {
      socket: {
        host: url.hostname,
        port: parseInt(url.port) || (adjustedRedisUrl.startsWith('rediss://') ? 6380 : 6379),
        connectTimeout: 15000, // Increased timeout to 15 seconds for cloud deployments
      },
      username: url.username || undefined,
      password: url.password || undefined
    };
    
    // For Redis Cloud specifically, we need additional SSL options
    if (isRedisCloud || adjustedRedisUrl.startsWith('rediss://')) {
      options.socket.tls = {
        rejectUnauthorized: false, // Redis Cloud sometimes has certificate issues
        // Add other SSL options as needed for Redis Cloud
        servername: url.hostname // Important for SNI with Redis Cloud
      };
    }
    
    this.client = Redis.createClient(options);
    
    this.client.on('error', (err) => {
      safeLogger.error('Redis Client Error (non-fatal):', {
        error: {
          name: err.name,
          message: err.message,
          code: (err as any).code,
          errno: (err as any).errno,
          syscall: (err as any).syscall,
          address: (err as any).address,
          port: (err as any).port
        },
        redisUrl: redisUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
      });
    });
    
    this.client.on('reconnecting', (delay) => {
      safeLogger.info(`Redis reconnection attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}, next attempt in ${delay}ms`);
    });
    
    this.client.on('error', (err) => {
      this.reconnectAttempts++;
      safeLogger.error('Redis Client Error:', {
        error: {
          name: err.name,
          message: err.message,
          code: (err as any).code,
          errno: (err as any).errno,
          syscall: (err as any).syscall,
          address: (err as any).address,
          port: (err as any).port,
          stack: err.stack
        },
        reconnectAttempts: this.reconnectAttempts,
        maxReconnectAttempts: this.maxReconnectAttempts,
        useRedis: this.useRedis,
        isConnected: this.isConnected,
        redisUrl: redisUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
      });
      this.isConnected = false;
      
      // If connection fails repeatedly, disable Redis functionality
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.useRedis = false;
        safeLogger.warn('Redis functionality has been disabled due to persistent connection errors', {
          reconnectAttempts: this.reconnectAttempts,
          maxReconnectAttempts: this.maxReconnectAttempts,
          redisUrl: redisUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
        });
      }
    });

    this.client.on('connect', () => {
      safeLogger.info('Redis Client Connected');
      this.isConnected = true;
      this.reconnectAttempts = 0; // Reset on successful connection
    });

    this.client.on('ready', () => {
      safeLogger.info('Redis Client Ready');
      this.isConnected = true;
      this.reconnectAttempts = 0; // Reset on successful connection
    });

    this.client.on('end', () => {
      safeLogger.info('Redis Client Disconnected');
      this.isConnected = false;
      
      // If we're disconnected and tried to reconnect too many times, disable Redis
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.useRedis = false;
        safeLogger.warn('Redis functionality has been disabled due to disconnection');
      }
    });
  }

  async connect(): Promise<void> {
    // Return immediately if Redis is disabled
    if (!this.useRedis) {
      safeLogger.info('Redis is disabled, skipping connection attempt');
      return;
    }

    // Return immediately if already connected
    if (this.isConnected) {
      return;
    }

    // If a connection attempt is already in progress, wait for it
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Create a new connection promise
    this.connectionPromise = this.doConnect();
    
    try {
      await this.connectionPromise;
    } finally {
      // Clear the connection promise after completion
      this.connectionPromise = null;
    }
  }

  private async doConnect(): Promise<void> {
    if (!this.useRedis || !this.client) {
      safeLogger.info('Redis is disabled or client not available, skipping connection attempt');
      return;
    }

    if (this.isConnected) {
      return;
    }

    try {
      safeLogger.info('Attempting to connect to Redis...', {
        redisUrl: (process.env.REDIS_URL || 'redis://localhost:6379').replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
      });
      await this.client.connect();
      safeLogger.info('Successfully connected to Redis');
    } catch (error) {
      safeLogger.error('Failed to connect to Redis (graceful degradation enabled):', {
        error: {
          name: error.name,
          message: error.message,
          code: (error as any).code,
          errno: (error as any).errno,
          syscall: (error as any).syscall,
          address: (error as any).address,
          port: (error as any).port
        },
        redisUrl: (process.env.REDIS_URL || 'redis://localhost:6379').replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
      });
      this.useRedis = false; // Disable Redis on connection failure
      // Do NOT throw - gracefully degrade instead of failing requests
      // The caller should check useRedis/isConnected before proceeding
    }
  }

  async disconnect(): Promise<void> {
    if (this.useRedis && this.isConnected) {
      await this.client.disconnect();
    }
  }

  // Session Management
  async setSession(sessionId: string, data: any, ttl: number = 3600): Promise<void> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, session not saved:', sessionId);
      return;
    }
    
    await this.ensureConnected();
    await this.client.setEx(`session:${sessionId}`, ttl, JSON.stringify(data));
  }

  async getSession(sessionId: string): Promise<any | null> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, returning null for session:', sessionId);
      return null;
    }
    
    await this.ensureConnected();
    const data = await this.client.get(`session:${sessionId}`);
    return data && typeof data === 'string' ? JSON.parse(data) : null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, session not deleted:', sessionId);
      return;
    }
    
    await this.ensureConnected();
    await this.client.del(`session:${sessionId}`);
  }

  async extendSession(sessionId: string, ttl: number = 3600): Promise<void> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, session not extended:', sessionId);
      return;
    }
    
    await this.ensureConnected();
    await this.client.expire(`session:${sessionId}`, ttl);
  }

  // Caching for frequently accessed data
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, data not cached:', key);
      return;
    }
    
    await this.ensureConnected();
    const serializedValue = JSON.stringify(value);
    
    if (ttl) {
      await this.client.setEx(key, ttl, serializedValue);
    } else {
      await this.client.set(key, serializedValue);
    }
  }

  async get(key: string): Promise<any | null> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, returning null for key:', key);
      return null;
    }
    
    await this.ensureConnected();
    const data = await this.client.get(key);
    return data && typeof data === 'string' ? JSON.parse(data) : null;
  }

  async del(key: string): Promise<void> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, key not deleted:', key);
      return;
    }
    
    await this.ensureConnected();
    await this.client.del(key);
  }

  async expire(key: string, ttl: number): Promise<void> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, TTL not set for key:', key);
      return;
    }
    
    await this.ensureConnected();
    await this.client.expire(key, ttl);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, returning false for exists check:', key);
      return false;
    }
    
    await this.ensureConnected();
    const result = await this.client.exists(key);
    return result === 1;
  }

  async publish(channel: string, message: string): Promise<void> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, skipping publish to channel:', channel);
      return;
    }
    
    await this.ensureConnected();
    await this.client.publish(channel, message);
  }

  async ttl(key: string): Promise<number> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, returning -1 for TTL check:', key);
      return -1;
    }
    
    await this.ensureConnected();
    return await this.client.ttl(key);
  }

  async incr(key: string): Promise<number> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, increment not performed:', key);
      return 0; // Return 0 if Redis is disabled
    }
    
    await this.ensureConnected();
    return await this.client.incr(key);
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, returning empty array for keys pattern:', pattern);
      return [];
    }
    
    await this.ensureConnected();
    return await this.client.keys(pattern);
  }

  async setex(key: string, ttl: number, value: string): Promise<void> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, data not cached (setex):', key);
      return;
    }
    
    await this.ensureConnected();
    await this.client.setEx(key, ttl, value);
  }

  // Cache patterns for marketplace data
  async cacheUserProfile(address: string, profile: any, ttl: number = 1800): Promise<void> {
    await this.set(`user:profile:${address}`, profile, ttl);
  }

  async getCachedUserProfile(address: string): Promise<any | null> {
    return await this.get(`user:profile:${address}`);
  }

  async cacheProductListing(listingId: string, listing: any, ttl: number = 900): Promise<void> {
    await this.set(`listing:${listingId}`, listing, ttl);
  }

  async getCachedProductListing(listingId: string): Promise<any | null> {
    return await this.get(`listing:${listingId}`);
  }

  async invalidateProductListing(listingId: string): Promise<void> {
    await this.del(`listing:${listingId}`);
  }

  // Rate limiting
  async checkRateLimit(key: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, rate limit check bypassed for key:', key);
      return { allowed: true, remaining: limit, resetTime: Date.now() + (window * 1000) }; // Allow all if Redis disabled
    }
    
    await this.ensureConnected();
    
    const current = await this.client.incr(key);
    
    if (current === 1) {
      await this.client.expire(key, window);
    }
    
    const remaining = Math.max(0, limit - current);
    const allowed = current <= limit;
    const resetTime = Date.now() + (window * 1000);
    
    return { allowed, remaining, resetTime };
  }

  // Marketplace-specific caching
  async cacheActiveListings(listings: any[], ttl: number = 300): Promise<void> {
    await this.set('marketplace:active_listings', listings, ttl);
  }

  async getCachedActiveListings(): Promise<any[] | null> {
    return await this.get('marketplace:active_listings');
  }

  async cacheUserReputation(address: string, reputation: any, ttl: number = 1800): Promise<void> {
    await this.set(`reputation:${address}`, reputation, ttl);
  }

  async getCachedUserReputation(address: string): Promise<any | null> {
    return await this.get(`reputation:${address}`);
  }

  async invalidateUserReputation(address: string): Promise<void> {
    await this.del(`reputation:${address}`);
  }

  // Search result caching
  async cacheSearchResults(query: string, results: any[], ttl: number = 600): Promise<void> {
    const searchKey = `search:${Buffer.from(query).toString('base64')}`;
    await this.set(searchKey, results, ttl);
  }

  async getCachedSearchResults(query: string): Promise<any[] | null> {
    const searchKey = `search:${Buffer.from(query).toString('base64')}`;
    return await this.get(searchKey);
  }

  // Utility methods
  private async ensureConnected(): Promise<void> {
    if (this.useRedis && !this.isConnected) {
      await this.connect();
    }
  }

  async flushAll(): Promise<void> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, flushAll operation skipped');
      return;
    }
    
    await this.ensureConnected();
    await this.client.flushAll();
  }

  async ping(): Promise<string> {
    if (!this.useRedis) {
      safeLogger.warn('Redis is disabled, ping returning simulated success');
      return 'PONG';
    }
    
    await this.ensureConnected();
    return await this.client.ping();
  }

  async testConnection(): Promise<{ connected: boolean; enabled: boolean; error?: any }> {
    try {
      if (!this.useRedis) {
        safeLogger.info('Redis is disabled, connection test returning disabled status');
        return { connected: false, enabled: false };
      }
      
      // Use existing connection if available, rather than creating a new one each time
      if (this.isConnected && this.client) {
        // Just ping the existing connection
        await this.client.ping();
        safeLogger.info('Redis connection test successful');
        return { connected: true, enabled: true };
      } else {
        // If not connected, try to connect
        await this.connect();
        if (this.isConnected && this.client) {
          await this.client.ping();
          safeLogger.info('Redis connection test successful');
          return { connected: true, enabled: true };
        } else {
          safeLogger.warn('Redis connection test failed - unable to establish connection');
          return { connected: false, enabled: true };
        }
      }
    } catch (error) {
      safeLogger.error("Redis connection test failed:", {
        error: {
          name: error.name,
          message: error.message,
          code: (error as any).code,
          errno: (error as any).errno,
          syscall: (error as any).syscall,
          address: (error as any).address,
          port: (error as any).port
        }
      });
      // Don't disable Redis on a single test failure
      return { connected: false, enabled: this.useRedis, error };
    }
  }

  getClient(): Redis.RedisClientType | null {
    if (!this.useRedis) {
      return null;
    }
    return this.client;
  }
  
  isRedisEnabled(): boolean {
    return this.useRedis;
  }
  
  getRedisStatus(): { enabled: boolean; connected: boolean; reconnectAttempts: number; maxReconnectAttempts: number } {
    return {
      enabled: this.useRedis,
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

// Singleton instance
export const redisService = RedisService.getInstance();
