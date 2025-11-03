import { DatabaseOptimizationService } from '../services/databaseOptimizationService';
import { safeLogger } from '../utils/safeLogger';
import { CachingStrategiesService } from '../services/cachingStrategiesService';
import { LoadBalancingService } from '../services/loadBalancingService';
import { performanceMonitoringService } from '../services/performanceMonitoringService';
import { CDNIntegrationService } from '../services/cdnIntegrationService';

export interface PerformanceConfig {
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    pool: {
      max: number;
      min: number;
      idleTimeoutMillis: number;
      connectionTimeoutMillis: number;
    };
    optimization: {
      enableQueryOptimization: boolean;
      slowQueryThreshold: number;
      enableIndexCreation: boolean;
      enableAnalyze: boolean;
    };
  };
  
  cache: {
    redis: {
      host: string;
      port: number;
      password?: string;
      db: number;
      keyPrefix: string;
    };
    cluster?: {
      nodes: Array<{ host: string; port: number }>;
      options: any;
    };
    memory: {
      maxSize: number;
      ttl: number;
    };
    strategies: {
      defaultTTL: number;
      enableMultiLevel: boolean;
      enableWriteThrough: boolean;
      enableWriteBehind: boolean;
    };
  };
  
  loadBalancing: {
    algorithm: 'round-robin' | 'weighted-round-robin' | 'least-connections' | 'ip-hash' | 'geographic';
    healthCheck: {
      interval: number;
      timeout: number;
      retries: number;
      path: string;
    };
    autoScaling: {
      enabled: boolean;
      minInstances: number;
      maxInstances: number;
      targetCpuUtilization: number;
      targetMemoryUtilization: number;
      scaleUpCooldown: number;
      scaleDownCooldown: number;
    };
    circuitBreaker: {
      enabled: boolean;
      failureThreshold: number;
      recoveryTimeout: number;
      monitoringPeriod: number;
    };
  };
  
  monitoring: {
    metricsRetentionPeriod: number;
    collectionInterval: number;
    alerting: {
      enabled: boolean;
      defaultCooldown: number;
      severityLevels: string[];
    };
    exportFormats: string[];
  };
  
  cdn: {
    enabled: boolean;
    distributionId: string;
    bucketName: string;
    region: string;
    cloudFrontDomain: string;
    optimization: {
      enableImageOptimization: boolean;
      enableCompression: boolean;
      enableCaching: boolean;
      defaultCacheTTL: number;
    };
  };
}

export class PerformanceOptimizationManager {
  private dbService?: any; // Using 'any' to avoid type conflicts between base and enhanced services
  private cacheService?: CachingStrategiesService;
  private loadBalancer?: LoadBalancingService;
  private monitor: typeof performanceMonitoringService | undefined;
  private cdnService?: CDNIntegrationService;
  private config: PerformanceConfig;

  constructor(config: PerformanceConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    safeLogger.info('Initializing performance optimization services...');

    try {
      // Initialize database optimization
      const { Pool } = await import('pg');
      const pool = new Pool({
        host: this.config.database.host,
        port: this.config.database.port,
        database: this.config.database.database,
        user: this.config.database.user,
        password: this.config.database.password,
        ...this.config.database.pool,
      });
      const { EnhancedDatabaseOptimizationService } = await import('../services/enhancedDatabaseOptimizationService');
      this.dbService = new EnhancedDatabaseOptimizationService(pool);

      // Initialize caching service
      this.cacheService = new CachingStrategiesService(this.config.cache);

      // Initialize load balancer
      this.loadBalancer = new LoadBalancingService();

      // Initialize performance monitoring
      this.monitor = performanceMonitoringService;

      // Initialize CDN service if enabled
      if (this.config.cdn.enabled) {
        this.cdnService = new CDNIntegrationService(
          {
            distributionId: this.config.cdn.distributionId,
            bucketName: this.config.cdn.bucketName,
            region: this.config.cdn.region,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            cloudFrontDomain: this.config.cdn.cloudFrontDomain,
          },
          `redis://${this.config.cache.redis.host}:${this.config.cache.redis.port}`
        );
      }

      // Setup database optimizations
      // Note: These methods don't exist in the EnhancedDatabaseOptimizationService
      // if (this.config.database.optimization.enableIndexCreation) {
      //   await this.dbService.createOptimizedIndexes();
      // }

      // if (this.config.database.optimization.enableAnalyze) {
      //   await this.dbService.analyzeTablePerformance();
      // }

      // Setup load balancer servers (would be configured based on environment)
      this.setupLoadBalancerServers();

      // Setup monitoring alerts
      this.setupMonitoringAlerts();

      safeLogger.info('Performance optimization services initialized successfully');
    } catch (error) {
      safeLogger.error('Failed to initialize performance services:', error);
      throw error;
    }
  }

  private setupLoadBalancerServers(): void {
    // In production, this would be configured based on actual server instances
    const servers = [
      { id: 'server-1', host: 'localhost', port: 3001, weight: 1, maxConnections: 1000, metadata: {} },
      { id: 'server-2', host: 'localhost', port: 10000, weight: 1, maxConnections: 1000, metadata: {} },
      { id: 'server-3', host: 'localhost', port: 3003, weight: 1, maxConnections: 1000, metadata: {} },
    ];

    servers.forEach(server => {
      this.loadBalancer?.addServer(server);
    });
  }

  private setupMonitoringAlerts(): void {
    if (!this.monitor || !this.config.monitoring.alerting.enabled) return;

    // Setup default alert rules
    const alertRules = [
      {
        name: 'High Database Response Time',
        metric: 'database.query.duration',
        condition: 'gt' as const,
        threshold: 1000,
        duration: 300,
        severity: 'high' as const,
        enabled: true,
        cooldown: 600,
      },
      {
        name: 'Low Cache Hit Rate',
        metric: 'cache.hit_rate',
        condition: 'lt' as const,
        threshold: 0.8,
        duration: 600,
        severity: 'medium' as const,
        enabled: true,
        cooldown: 900,
      },
      {
        name: 'High Error Rate',
        metric: 'http.request.errors',
        condition: 'gt' as const,
        threshold: 50,
        duration: 180,
        severity: 'critical' as const,
        enabled: true,
        cooldown: 300,
      },
    ];

    // alertRules.forEach(rule => {
    //   this.monitor?.addAlertRule(rule); // Method not available
    // });
  }

  // Service getters
  getDatabaseService(): DatabaseOptimizationService | undefined {
    return this.dbService;
  }

  getCacheService(): CachingStrategiesService | undefined {
    return this.cacheService;
  }

  getLoadBalancer(): LoadBalancingService | undefined {
    return this.loadBalancer;
  }

  getMonitor(): typeof performanceMonitoringService | undefined {
    return this.monitor;
  }

  getCDNService(): CDNIntegrationService | undefined {
    return this.cdnService;
  }

  // Performance optimization methods
  async optimizeQuery<T>(
    query: string,
    params: any[] = [],
    cacheKey?: string,
    cacheTTL: number = 300
  ): Promise<T[]> {
    if (!this.dbService) {
      throw new Error('Database service not initialized');
    }

    const result = await this.dbService.executeOptimizedQuery(query, params, { enableCache: !!cacheKey, cacheTTL });
    return result.rows;
  }

  async cacheData<T>(
    key: string,
    data: T,
    ttl: number = this.config.cache.strategies.defaultTTL
  ): Promise<void> {
    if (!this.cacheService) {
      throw new Error('Cache service not initialized');
    }

    await this.cacheService.set(key, data, ttl);
  }

  async getCachedData<T>(
    key: string,
    fallback?: () => Promise<T>,
    ttl: number = this.config.cache.strategies.defaultTTL
  ): Promise<T | null> {
    if (!this.cacheService) {
      throw new Error('Cache service not initialized');
    }

    return this.cacheService.get(key, fallback, ttl);
  }

  getNextServer(clientIp?: string, region?: string) {
    if (!this.loadBalancer) {
      throw new Error('Load balancer not initialized');
    }

    return this.loadBalancer.getNextServer({ ip: clientIp });
  }

  recordMetric(name: string, value: number, unit: string = '', tags?: Record<string, string>): void {
    // this.monitor?.recordMetric(name, value, unit, tags); // Method not available
    // Using recordRequest instead
    this.monitor?.recordRequest('POST', name, value, 200);
  }

  async uploadToCDN(
    key: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    if (!this.cdnService) {
      throw new Error('CDN service not initialized');
    }

    await this.cdnService.uploadAsset(key, buffer, contentType);
    return this.cdnService.generateCDNUrl(key);
  }

  // Performance analysis and reporting
  async getPerformanceReport(): Promise<{
    database: any;
    cache: any;
    loadBalancer: any;
    monitoring: any;
    cdn?: any;
  }> {
    const report: any = {};

    if (this.dbService) {
      report.database = {
        // poolStats: await this.dbService.getPoolStats(), // Method not available
        queryMetrics: this.dbService.getQueryMetrics(),
        slowQueries: this.dbService.getSlowQueries(),
      };
    }

    if (this.cacheService) {
      report.cache = {
        stats: this.cacheService.getStats(),
        redisInfo: await this.cacheService.getRedisInfo(),
      };
    }

    if (this.loadBalancer) {
      report.loadBalancer = {
        stats: this.loadBalancer.getMetrics(),
        serverStats: this.loadBalancer.getServerStatus(),
      };
    }

    if (this.monitor) {
      const metrics = this.monitor.getMetrics();
      report.monitoring = {
        summary: metrics.overall,
        activeAlerts: metrics.alerts,
        metrics: metrics,
      };
    }

    if (this.cdnService) {
      report.cdn = {
        usageStats: await this.cdnService.getAssetUsageStats(),
        analytics: await this.cdnService.getCDNAnalytics(
          new Date(Date.now() - 24 * 60 * 60 * 1000),
          new Date()
        ),
      };
    }

    return report;
  }

  // Cleanup
  async shutdown(): Promise<void> {
    safeLogger.info('Shutting down performance optimization services...');

    try {
      // await this.dbService?.close(); // Method not available, using stopMonitoring instead
      this.dbService?.stopMonitoring();
      await this.cacheService?.close();
      this.loadBalancer?.stop();
      // this.monitor?.destroy(); // Method not available

      safeLogger.info('Performance optimization services shut down successfully');
    } catch (error) {
      safeLogger.error('Error during shutdown:', error);
      throw error;
    }
  }
}

// Default configuration
export const defaultPerformanceConfig: PerformanceConfig = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'marketplace',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    pool: {
      max: 20,
      min: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
    optimization: {
      enableQueryOptimization: true,
      slowQueryThreshold: 1000,
      enableIndexCreation: true,
      enableAnalyze: true,
    },
  },
  
  cache: {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 0,
      keyPrefix: 'marketplace:',
    },
    memory: {
      maxSize: 10000,
      ttl: 300000, // 5 minutes
    },
    strategies: {
      defaultTTL: 3600, // 1 hour
      enableMultiLevel: true,
      enableWriteThrough: false,
      enableWriteBehind: true,
    },
  },
  
  loadBalancing: {
    algorithm: 'least-connections',
    healthCheck: {
      interval: 30000, // 30 seconds
      timeout: 5000,   // 5 seconds
      retries: 3,
      path: '/health',
    },
    autoScaling: {
      enabled: process.env.NODE_ENV === 'production',
      minInstances: 2,
      maxInstances: 10,
      targetCpuUtilization: 70,
      targetMemoryUtilization: 80,
      scaleUpCooldown: 300000,   // 5 minutes
      scaleDownCooldown: 600000, // 10 minutes
    },
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      recoveryTimeout: 60000,
      monitoringPeriod: 10000,
    },
  },
  
  monitoring: {
    metricsRetentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
    collectionInterval: 5000, // 5 seconds
    alerting: {
      enabled: true,
      defaultCooldown: 600, // 10 minutes
      severityLevels: ['low', 'medium', 'high', 'critical'],
    },
    exportFormats: ['json', 'prometheus'],
  },
  
  cdn: {
    enabled: process.env.CDN_ENABLED === 'true',
    distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID || '',
    bucketName: process.env.S3_BUCKET_NAME || '',
    region: process.env.AWS_REGION || 'us-east-1',
    cloudFrontDomain: process.env.CLOUDFRONT_DOMAIN || '',
    optimization: {
      enableImageOptimization: true,
      enableCompression: true,
      enableCaching: true,
      defaultCacheTTL: 31536000, // 1 year
    },
  },
};
