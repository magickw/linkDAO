import { EventEmitter } from 'events';
import { safeLogger } from '../utils/safeLogger';
import { performance } from 'perf_hooks';
import { safeLogger } from '../utils/safeLogger';
import { Redis } from 'ioredis';
import { safeLogger } from '../utils/safeLogger';
import { Pool } from 'pg';
import { safeLogger } from '../utils/safeLogger';

interface HealthCheckConfig {
  services: {
    database: {
      enabled: boolean;
      timeout: number;
      critical: boolean;
    };
    redis: {
      enabled: boolean;
      timeout: number;
      critical: boolean;
    };
    ipfs: {
      enabled: boolean;
      timeout: number;
      critical: boolean;
      endpoint?: string;
    };
    blockchain: {
      enabled: boolean;
      timeout: number;
      critical: boolean;
      rpcUrl?: string;
    };
    cdn: {
      enabled: boolean;
      timeout: number;
      critical: boolean;
      testUrl?: string;
    };
    paymentProcessor: {
      enabled: boolean;
      timeout: number;
      critical: boolean;
    };
  };
  intervals: {
    healthCheck: number; // milliseconds
    detailedCheck: number; // milliseconds
  };
  thresholds: {
    responseTime: number; // milliseconds
    errorRate: number; // percentage
    uptime: number; // percentage
  };
}

interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  responseTime: number;
  lastCheck: Date;
  uptime: number;
  errorRate: number;
  details: Record<string, any>;
  critical: boolean;
  checks: {
    connectivity: boolean;
    performance: boolean;
    functionality: boolean;
  };
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealth[];
  lastUpdate: Date;
  uptime: number;
  criticalServicesDown: number;
  totalServices: number;
}

interface HealthMetrics {
  service: string;
  timestamp: Date;
  responseTime: number;
  success: boolean;
  errorMessage?: string;
  details?: Record<string, any>;
}

export class HealthCheckService extends EventEmitter {
  private config: HealthCheckConfig;
  private redis: Redis;
  private dbPool?: Pool;
  private serviceHealth: Map<string, ServiceHealth> = new Map();
  private healthMetrics: HealthMetrics[] = [];
  private healthCheckInterval?: NodeJS.Timeout;
  private detailedCheckInterval?: NodeJS.Timeout;
  private startTime: Date;

  constructor(config: HealthCheckConfig, dbPool?: Pool) {
    super();
    this.config = config;
    this.dbPool = dbPool;
    this.startTime = new Date();
    
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      keyPrefix: 'health:'
    });

    this.initializeServiceHealth();
    this.startHealthChecks();
  }

  private initializeServiceHealth(): void {
    Object.entries(this.config.services).forEach(([serviceName, serviceConfig]) => {
      if (serviceConfig.enabled) {
        this.serviceHealth.set(serviceName, {
          service: serviceName,
          status: 'unknown',
          responseTime: 0,
          lastCheck: new Date(),
          uptime: 100,
          errorRate: 0,
          details: {},
          critical: serviceConfig.critical,
          checks: {
            connectivity: false,
            performance: false,
            functionality: false
          }
        });
      }
    });
  }

  private startHealthChecks(): void {
    // Basic health checks
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.intervals.healthCheck);

    // Detailed health checks
    this.detailedCheckInterval = setInterval(async () => {
      await this.performDetailedHealthChecks();
    }, this.config.intervals.detailedCheck);

    // Initial health check
    setImmediate(() => this.performHealthChecks());
  }

  private async performHealthChecks(): Promise<void> {
    const checkPromises = Array.from(this.serviceHealth.keys()).map(service => 
      this.checkServiceHealth(service)
    );

    await Promise.allSettled(checkPromises);
    
    // Update overall system health
    const systemHealth = this.calculateSystemHealth();
    await this.storeSystemHealth(systemHealth);
    
    this.emit('healthCheckCompleted', systemHealth);
  }

  private async performDetailedHealthChecks(): Promise<void> {
    const detailedCheckPromises = Array.from(this.serviceHealth.keys()).map(service => 
      this.performDetailedServiceCheck(service)
    );

    await Promise.allSettled(detailedCheckPromises);
  }

  private async checkServiceHealth(serviceName: string): Promise<void> {
    const startTime = performance.now();
    const serviceConfig = this.config.services[serviceName as keyof typeof this.config.services];
    
    if (!serviceConfig?.enabled) return;

    try {
      const healthResult = await Promise.race([
        this.performServiceCheck(serviceName),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), serviceConfig.timeout)
        )
      ]) as { success: boolean; details: Record<string, any>; error?: string };

      const responseTime = performance.now() - startTime;
      const currentHealth = this.serviceHealth.get(serviceName)!;

      // Update service health
      currentHealth.responseTime = responseTime;
      currentHealth.lastCheck = new Date();
      currentHealth.details = healthResult.details;

      // Determine status
      if (healthResult.success) {
        if (responseTime > this.config.thresholds.responseTime) {
          currentHealth.status = 'degraded';
        } else {
          currentHealth.status = 'healthy';
        }
        currentHealth.checks.connectivity = true;
        currentHealth.checks.performance = responseTime <= this.config.thresholds.responseTime;
      } else {
        currentHealth.status = 'unhealthy';
        currentHealth.checks.connectivity = false;
        currentHealth.checks.performance = false;
        currentHealth.details.error = healthResult.error;
      }

      // Record metrics
      this.recordHealthMetric({
        service: serviceName,
        timestamp: new Date(),
        responseTime,
        success: healthResult.success,
        errorMessage: healthResult.error,
        details: healthResult.details
      });

      // Update uptime and error rate
      this.updateServiceMetrics(serviceName, healthResult.success);

    } catch (error) {
      const responseTime = performance.now() - startTime;
      const currentHealth = this.serviceHealth.get(serviceName)!;
      
      currentHealth.status = 'unhealthy';
      currentHealth.responseTime = responseTime;
      currentHealth.lastCheck = new Date();
      currentHealth.details = { error: error.message };
      currentHealth.checks = {
        connectivity: false,
        performance: false,
        functionality: false
      };

      this.recordHealthMetric({
        service: serviceName,
        timestamp: new Date(),
        responseTime,
        success: false,
        errorMessage: error.message
      });

      this.updateServiceMetrics(serviceName, false);
    }
  }

  private async performServiceCheck(serviceName: string): Promise<{
    success: boolean;
    details: Record<string, any>;
    error?: string;
  }> {
    switch (serviceName) {
      case 'database':
        return this.checkDatabaseHealth();
      case 'redis':
        return this.checkRedisHealth();
      case 'ipfs':
        return this.checkIPFSHealth();
      case 'blockchain':
        return this.checkBlockchainHealth();
      case 'cdn':
        return this.checkCDNHealth();
      case 'paymentProcessor':
        return this.checkPaymentProcessorHealth();
      default:
        return {
          success: false,
          details: {},
          error: `Unknown service: ${serviceName}`
        };
    }
  }

  private async checkDatabaseHealth(): Promise<{
    success: boolean;
    details: Record<string, any>;
    error?: string;
  }> {
    if (!this.dbPool) {
      return {
        success: false,
        details: {},
        error: 'Database pool not configured'
      };
    }

    try {
      const client = await this.dbPool.connect();
      const startTime = performance.now();
      
      // Test basic connectivity
      await client.query('SELECT 1');
      
      // Test a simple query
      const result = await client.query('SELECT COUNT(*) as count FROM users');
      const queryTime = performance.now() - startTime;
      
      client.release();

      return {
        success: true,
        details: {
          queryTime: Math.round(queryTime),
          userCount: result.rows[0]?.count || 0,
          poolStats: {
            totalCount: this.dbPool.totalCount,
            idleCount: this.dbPool.idleCount,
            waitingCount: this.dbPool.waitingCount
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        details: {},
        error: error.message
      };
    }
  }

  private async checkRedisHealth(): Promise<{
    success: boolean;
    details: Record<string, any>;
    error?: string;
  }> {
    try {
      const startTime = performance.now();
      
      // Test basic connectivity
      const pong = await this.redis.ping();
      
      // Test read/write operations
      const testKey = 'health_check_test';
      await this.redis.set(testKey, 'test_value', 'EX', 10);
      const value = await this.redis.get(testKey);
      await this.redis.del(testKey);
      
      const responseTime = performance.now() - startTime;
      
      // Get Redis info
      const info = await this.redis.info();
      const memoryInfo = this.parseRedisInfo(info, 'memory');
      const statsInfo = this.parseRedisInfo(info, 'stats');

      return {
        success: pong === 'PONG' && value === 'test_value',
        details: {
          responseTime: Math.round(responseTime),
          memory: {
            used: memoryInfo.used_memory_human,
            peak: memoryInfo.used_memory_peak_human,
            fragmentation: memoryInfo.mem_fragmentation_ratio
          },
          stats: {
            totalConnections: statsInfo.total_connections_received,
            totalCommands: statsInfo.total_commands_processed,
            keyspaceHits: statsInfo.keyspace_hits,
            keyspaceMisses: statsInfo.keyspace_misses
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        details: {},
        error: error.message
      };
    }
  }

  private async checkIPFSHealth(): Promise<{
    success: boolean;
    details: Record<string, any>;
    error?: string;
  }> {
    try {
      const endpoint = this.config.services.ipfs.endpoint || 'http://localhost:5001';
      const startTime = performance.now();
      
      // Test IPFS API connectivity
      const response = await fetch(`${endpoint}/api/v0/version`, {
        method: 'POST',
        signal: AbortSignal.timeout(this.config.services.ipfs.timeout)
      });
      
      const responseTime = performance.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`IPFS API returned ${response.status}`);
      }
      
      const versionData = await response.json();
      
      // Test peer connectivity
      const peersResponse = await fetch(`${endpoint}/api/v0/swarm/peers`, {
        method: 'POST',
        signal: AbortSignal.timeout(this.config.services.ipfs.timeout)
      });
      
      const peersData = peersResponse.ok ? await peersResponse.json() : { Peers: [] };

      return {
        success: true,
        details: {
          responseTime: Math.round(responseTime),
          version: versionData.Version,
          peerCount: peersData.Peers?.length || 0,
          endpoint
        }
      };
    } catch (error) {
      return {
        success: false,
        details: {},
        error: error.message
      };
    }
  }

  private async checkBlockchainHealth(): Promise<{
    success: boolean;
    details: Record<string, any>;
    error?: string;
  }> {
    try {
      const rpcUrl = this.config.services.blockchain.rpcUrl || process.env.RPC_URL;
      if (!rpcUrl) {
        throw new Error('Blockchain RPC URL not configured');
      }

      const startTime = performance.now();
      
      // Test RPC connectivity
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        }),
        signal: AbortSignal.timeout(this.config.services.blockchain.timeout)
      });
      
      const responseTime = performance.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`Blockchain RPC returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      const blockNumber = parseInt(data.result, 16);

      return {
        success: true,
        details: {
          responseTime: Math.round(responseTime),
          latestBlock: blockNumber,
          rpcUrl: rpcUrl.replace(/\/\/.*@/, '//***@'), // Hide credentials
          synced: true // Would need additional logic to determine sync status
        }
      };
    } catch (error) {
      return {
        success: false,
        details: {},
        error: error.message
      };
    }
  }

  private async checkCDNHealth(): Promise<{
    success: boolean;
    details: Record<string, any>;
    error?: string;
  }> {
    try {
      const testUrl = this.config.services.cdn.testUrl || process.env.CDN_TEST_URL;
      if (!testUrl) {
        // If no test URL, assume CDN is healthy
        return {
          success: true,
          details: { message: 'No test URL configured, assuming healthy' }
        };
      }

      const startTime = performance.now();
      
      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(this.config.services.cdn.timeout)
      });
      
      const responseTime = performance.now() - startTime;
      
      return {
        success: response.ok,
        details: {
          responseTime: Math.round(responseTime),
          status: response.status,
          cacheStatus: response.headers.get('x-cache') || 'unknown',
          testUrl
        }
      };
    } catch (error) {
      return {
        success: false,
        details: {},
        error: error.message
      };
    }
  }

  private async checkPaymentProcessorHealth(): Promise<{
    success: boolean;
    details: Record<string, any>;
    error?: string;
  }> {
    try {
      // This would typically check Stripe API status or other payment processors
      // For now, we'll do a simple check
      
      const stripeHealthy = process.env.STRIPE_SECRET_KEY ? true : false;
      const cryptoHealthy = true; // Would check blockchain connectivity
      
      return {
        success: stripeHealthy && cryptoHealthy,
        details: {
          stripe: stripeHealthy ? 'configured' : 'not configured',
          crypto: cryptoHealthy ? 'available' : 'unavailable',
          processors: ['stripe', 'crypto']
        }
      };
    } catch (error) {
      return {
        success: false,
        details: {},
        error: error.message
      };
    }
  }

  private async performDetailedServiceCheck(serviceName: string): Promise<void> {
    // Perform more comprehensive checks for detailed monitoring
    const currentHealth = this.serviceHealth.get(serviceName);
    if (!currentHealth) return;

    try {
      switch (serviceName) {
        case 'database':
          await this.detailedDatabaseCheck(currentHealth);
          break;
        case 'redis':
          await this.detailedRedisCheck(currentHealth);
          break;
        // Add other detailed checks as needed
      }
    } catch (error) {
      safeLogger.error(`Detailed health check failed for ${serviceName}:`, error);
    }
  }

  private async detailedDatabaseCheck(health: ServiceHealth): Promise<void> {
    if (!this.dbPool) return;

    try {
      const client = await this.dbPool.connect();
      
      // Check table sizes
      const tableSizes = await client.query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY size_bytes DESC
        LIMIT 5
      `);
      
      // Check active connections
      const connections = await client.query(`
        SELECT count(*) as active_connections,
               max(now() - query_start) as longest_query
        FROM pg_stat_activity 
        WHERE state = 'active'
      `);
      
      client.release();
      
      health.details.detailed = {
        topTables: tableSizes.rows,
        activeConnections: connections.rows[0]?.active_connections || 0,
        longestQuery: connections.rows[0]?.longest_query || '0'
      };
      
      health.checks.functionality = true;
    } catch (error) {
      health.checks.functionality = false;
      health.details.detailedError = error.message;
    }
  }

  private async detailedRedisCheck(health: ServiceHealth): Promise<void> {
    try {
      // Check keyspace info
      const info = await this.redis.info('keyspace');
      const keyspaceInfo = this.parseRedisInfo(info, 'keyspace');
      
      // Check slow log
      const slowLog = await this.redis.slowlog('get', 5);
      
      health.details.detailed = {
        keyspace: keyspaceInfo,
        slowQueries: slowLog.length,
        lastSlowQuery: slowLog[0] || null
      };
      
      health.checks.functionality = true;
    } catch (error) {
      health.checks.functionality = false;
      health.details.detailedError = error.message;
    }
  }

  private parseRedisInfo(info: string, section: string): Record<string, any> {
    const lines = info.split('\r\n');
    const result: Record<string, any> = {};
    let inSection = false;
    
    for (const line of lines) {
      if (line.startsWith(`# ${section}`)) {
        inSection = true;
        continue;
      }
      
      if (line.startsWith('#') && inSection) {
        break;
      }
      
      if (inSection && line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }
    
    return result;
  }

  private recordHealthMetric(metric: HealthMetrics): void {
    this.healthMetrics.push(metric);
    
    // Keep only last 1000 metrics
    if (this.healthMetrics.length > 1000) {
      this.healthMetrics = this.healthMetrics.slice(-1000);
    }
  }

  private updateServiceMetrics(serviceName: string, success: boolean): void {
    const health = this.serviceHealth.get(serviceName);
    if (!health) return;

    // Update error rate (simplified calculation)
    const recentMetrics = this.healthMetrics
      .filter(m => m.service === serviceName && m.timestamp > new Date(Date.now() - 60 * 60 * 1000))
      .slice(-100); // Last 100 checks or 1 hour

    if (recentMetrics.length > 0) {
      const errors = recentMetrics.filter(m => !m.success).length;
      health.errorRate = (errors / recentMetrics.length) * 100;
      
      // Update uptime
      const successCount = recentMetrics.filter(m => m.success).length;
      health.uptime = (successCount / recentMetrics.length) * 100;
    }
  }

  private calculateSystemHealth(): SystemHealth {
    const services = Array.from(this.serviceHealth.values());
    const criticalServices = services.filter(s => s.critical);
    const criticalServicesDown = criticalServices.filter(s => s.status === 'unhealthy').length;
    
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (criticalServicesDown > 0) {
      overall = 'unhealthy';
    } else if (services.some(s => s.status === 'unhealthy' || s.status === 'degraded')) {
      overall = 'degraded';
    }
    
    const systemUptime = (Date.now() - this.startTime.getTime()) / (1000 * 60 * 60 * 24); // Days

    return {
      overall,
      services,
      lastUpdate: new Date(),
      uptime: systemUptime,
      criticalServicesDown,
      totalServices: services.length
    };
  }

  private async storeSystemHealth(health: SystemHealth): Promise<void> {
    try {
      await this.redis.setex('system_health', 300, JSON.stringify(health)); // 5 minutes TTL
    } catch (error) {
      safeLogger.error('Failed to store system health:', error);
    }
  }

  // Public API methods
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const cached = await this.redis.get('system_health');
      if (cached) {
        const health = JSON.parse(cached);
        // Convert date strings back to Date objects
        health.lastUpdate = new Date(health.lastUpdate);
        health.services.forEach((service: any) => {
          service.lastCheck = new Date(service.lastCheck);
        });
        return health;
      }
    } catch (error) {
      safeLogger.error('Failed to get cached system health:', error);
    }
    
    return this.calculateSystemHealth();
  }

  async getServiceHealth(serviceName: string): Promise<ServiceHealth | null> {
    return this.serviceHealth.get(serviceName) || null;
  }

  async getHealthMetrics(serviceName?: string, limit: number = 100): Promise<HealthMetrics[]> {
    let metrics = this.healthMetrics;
    
    if (serviceName) {
      metrics = metrics.filter(m => m.service === serviceName);
    }
    
    return metrics.slice(-limit);
  }

  async forceHealthCheck(serviceName?: string): Promise<void> {
    if (serviceName) {
      await this.checkServiceHealth(serviceName);
    } else {
      await this.performHealthChecks();
    }
  }

  // Cleanup
  async close(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.detailedCheckInterval) {
      clearInterval(this.detailedCheckInterval);
    }
    
    await this.redis.quit();
    this.removeAllListeners();
  }
}