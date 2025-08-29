import Redis from 'redis';
import dotenv from 'dotenv';

dotenv.config();

export class RedisService {
  private client: Redis.RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.client = Redis.createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 60000,
      }
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      console.log('Redis Client Ready');
      this.isConnected = true;
    });

    this.client.on('end', () => {
      console.log('Redis Client Disconnected');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  // Session Management
  async setSession(sessionId: string, data: any, ttl: number = 3600): Promise<void> {
    await this.ensureConnected();
    await this.client.setEx(`session:${sessionId}`, ttl, JSON.stringify(data));
  }

  async getSession(sessionId: string): Promise<any | null> {
    await this.ensureConnected();
    const data = await this.client.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.ensureConnected();
    await this.client.del(`session:${sessionId}`);
  }

  async extendSession(sessionId: string, ttl: number = 3600): Promise<void> {
    await this.ensureConnected();
    await this.client.expire(`session:${sessionId}`, ttl);
  }

  // Caching for frequently accessed data
  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.ensureConnected();
    const serializedValue = JSON.stringify(value);
    
    if (ttl) {
      await this.client.setEx(key, ttl, serializedValue);
    } else {
      await this.client.set(key, serializedValue);
    }
  }

  async get(key: string): Promise<any | null> {
    await this.ensureConnected();
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async del(key: string): Promise<void> {
    await this.ensureConnected();
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    await this.ensureConnected();
    const result = await this.client.exists(key);
    return result === 1;
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
  async checkRateLimit(key: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number }> {
    await this.ensureConnected();
    
    const current = await this.client.incr(key);
    
    if (current === 1) {
      await this.client.expire(key, window);
    }
    
    const remaining = Math.max(0, limit - current);
    const allowed = current <= limit;
    
    return { allowed, remaining };
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
    if (!this.isConnected) {
      await this.connect();
    }
  }

  async flushAll(): Promise<void> {
    await this.ensureConnected();
    await this.client.flushAll();
  }

  async ping(): Promise<string> {
    await this.ensureConnected();
    return await this.client.ping();
  }

  getClient(): Redis.RedisClientType {
    return this.client;
  }
}

// Singleton instance
export const redisService = new RedisService();