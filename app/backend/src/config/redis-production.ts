import Redis, { RedisOptions, Cluster } from 'ioredis';
import { safeLogger } from '../utils/safeLogger';
import dotenv from 'dotenv';

dotenv.config();

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  keepAlive: number;
  family: number;
  keyPrefix?: string;
}

interface RedisClusterConfig {
  nodes: Array<{ host: string; port: number }>;
  options: {
    password?: string;
    redisOptions: RedisOptions;
    enableOfflineQueue: boolean;
    retryDelayOnFailover: number;
    maxRetriesPerRequest: number;
  };
}

class RedisProductionManager {
  private client: Redis | Cluster | null = null;
  private isCluster: boolean = false;

  constructor() {
    this.isCluster = this.shouldUseCluster();
  }

  private shouldUseCluster(): boolean {
    return !!(process.env.REDIS_CLUSTER_NODES || process.env.REDIS_CLUSTER_URL);
  }

  private getStandaloneConfig(): RedisConfig {
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL;
    
    if (redisUrl) {
      // Parse Redis URL
      const url = new URL(redisUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password || undefined,
        db: parseInt(url.pathname.slice(1)) || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4,
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'marketplace:'
      };
    }

    // Fallback to individual environment variables
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4,
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'marketplace:'
    };
  }

  private getClusterConfig(): RedisClusterConfig {
    let nodes: Array<{ host: string; port: number }> = [];

    if (process.env.REDIS_CLUSTER_NODES) {
      // Parse comma-separated list of nodes: "host1:port1,host2:port2"
      nodes = process.env.REDIS_CLUSTER_NODES.split(',').map(node => {
        const [host, port] = node.trim().split(':');
        return { host, port: parseInt(port) || 6379 };
      });
    } else if (process.env.REDIS_CLUSTER_URL) {
      // Parse cluster URL
      const url = new URL(process.env.REDIS_CLUSTER_URL);
      nodes = [{ host: url.hostname, port: parseInt(url.port) || 6379 }];
    }

    return {
      nodes,
      options: {
        password: process.env.REDIS_PASSWORD || undefined,
        redisOptions: {
          password: process.env.REDIS_PASSWORD || undefined,
          keyPrefix: process.env.REDIS_KEY_PREFIX || 'marketplace:',
          lazyConnect: true,
          keepAlive: 30000,
          family: 4
        },
        enableOfflineQueue: false,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      }
    };
  }

  async connect(): Promise<Redis | Cluster> {
    if (this.client) {
      return this.client;
    }

    try {
      if (this.isCluster) {
        safeLogger.info('🔗 Connecting to Redis Cluster...');
        const config = this.getClusterConfig();
        this.client = new Redis.Cluster(config.nodes, config.options);
        
        this.client.on('connect', () => {
          safeLogger.info('✅ Redis Cluster connected');
        });
        
        this.client.on('error', (error) => {
          safeLogger.error('❌ Redis Cluster error:', error);
        });
        
        this.client.on('node error', (error, node) => {
          safeLogger.error(`❌ Redis Cluster node error (${node.host}:${node.port}):`, error);
        });

      } else {
        safeLogger.info('🔗 Connecting to Redis standalone...');
        const config = this.getStandaloneConfig();
        this.client = new Redis(config);
        
        this.client.on('connect', () => {
          safeLogger.info('✅ Redis connected');
        });
        
        this.client.on('error', (error) => {
          safeLogger.error('❌ Redis error:', error);
        });
        
        this.client.on('reconnecting', () => {
          safeLogger.info('🔄 Redis reconnecting...');
        });
      }

      // Test connection
      await this.client.ping();
      safeLogger.info('🏓 Redis ping successful');

      return this.client;

    } catch (error) {
      safeLogger.error('💥 Redis connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      safeLogger.info('👋 Redis disconnected');
    }
  }

  getClient(): Redis | Cluster | null {
    return this.client;
  }

  async healthCheck(): Promise<{ status: string; latency?: number; error?: string }> {
    if (!this.client) {
      return { status: 'disconnected', error: 'No Redis connection' };
    }

    try {
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;
      
      return { status: 'healthy', latency };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  async getInfo(): Promise<any> {
    if (!this.client) {
      throw new Error('Redis not connected');
    }

    try {
      const info = await this.client.info();
      const memory = await this.client.info('memory');
      const stats = await this.client.info('stats');
      
      return {
        server: this.parseRedisInfo(info),
        memory: this.parseRedisInfo(memory),
        stats: this.parseRedisInfo(stats),
        isCluster: this.isCluster
      };
    } catch (error) {
      throw new Error(`Failed to get Redis info: ${error}`);
    }
  }

  private parseRedisInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    
    info.split('\r\n').forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = value;
        }
      }
    });
    
    return result;
  }

  async flushCache(pattern?: string): Promise<number> {
    if (!this.client) {
      throw new Error('Redis not connected');
    }

    try {
      if (pattern) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          return await this.client.del(...keys);
        }
        return 0;
      } else {
        await this.client.flushdb();
        return 1; // Success indicator
      }
    } catch (error) {
      throw new Error(`Failed to flush cache: ${error}`);
    }
  }
}

// Singleton instance
let redisManager: RedisProductionManager | null = null;

export function getRedisManager(): RedisProductionManager {
  if (!redisManager) {
    redisManager = new RedisProductionManager();
  }
  return redisManager;
}

export async function initializeRedis(): Promise<Redis | Cluster> {
  const manager = getRedisManager();
  return await manager.connect();
}

export async function closeRedis(): Promise<void> {
  if (redisManager) {
    await redisManager.disconnect();
    redisManager = null;
  }
}

export { RedisProductionManager };
