import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

// Health check status types
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

// Individual service health check result
export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  responseTime?: number;
  error?: string;
  details?: any;
  lastChecked: string;
  recoveryActions?: string[];
  impact?: 'low' | 'medium' | 'high' | 'critical';
  dependencies?: string[];
}

// Dependency status tracking
export interface DependencyStatus {
  name: string;
  status: HealthStatus;
  version?: string;
  endpoint?: string;
  lastChecked: string;
  responseTime?: number;
  error?: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  affectedServices: string[];
}

// Overall system health
export interface SystemHealth {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: ServiceHealth[];
  dependencies: DependencyStatus[];
  metrics: {
    memory: NodeJS.MemoryUsage;
    cpu?: NodeJS.CpuUsage;
    activeConnections?: number;
    totalRequests?: number;
    errorRate?: number;
    responseTime?: {
      avg: number;
      p95: number;
      p99: number;
    };
    throughput?: number;
  };
  alerts?: {
    active: number;
    critical: number;
    warnings: number;
  };
}

// Health monitoring service
export class HealthMonitoringService {
  private static instance: HealthMonitoringService;
  private serviceChecks: Map<string, () => Promise<ServiceHealth>> = new Map();
  private dependencyChecks: Map<string, () => Promise<DependencyStatus>> = new Map();
  private lastHealthCheck: SystemHealth | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private requestCount = 0;
  private errorCount = 0;
  private startTime = Date.now();
  private responseTimes: number[] = [];
  private activeAlerts: Map<string, { level: 'warning' | 'critical', message: string, timestamp: number }> = new Map();
  private maxResponseTimeHistory = 1000; // Keep last 1000 response times for percentile calculations

  private constructor() {
    this.registerDefaultChecks();
    this.startPeriodicHealthChecks();
  }

  static getInstance(): HealthMonitoringService {
    if (!HealthMonitoringService.instance) {
      HealthMonitoringService.instance = new HealthMonitoringService();
    }
    return HealthMonitoringService.instance;
  }

  // Register default health checks
  private registerDefaultChecks(): void {
    // Database health check
    this.registerServiceCheck('database', async () => {
      const startTime = Date.now();
      try {
        // Try to import and use database connection
        const { db } = await import('../db/connection');
        await db.execute('SELECT 1');
        
        // Additional database health checks
        const connectionCount = await this.getDatabaseConnectionCount();
        const slowQueries = await this.getSlowQueryCount();
        
        let status: HealthStatus = 'healthy';
        const details: any = { 
          connection: 'active',
          connectionCount,
          slowQueries
        };
        
        // Check for degraded performance
        if (connectionCount > 80 || slowQueries > 5) {
          status = 'degraded';
          details.warnings = [];
          if (connectionCount > 80) details.warnings.push('High connection count');
          if (slowQueries > 5) details.warnings.push('Slow queries detected');
        }
        
        const impact: 'low' | 'medium' | 'high' | 'critical' = status === 'degraded' ? 'high' : 'low';
        
        return {
          name: 'database',
          status,
          responseTime: Date.now() - startTime,
          lastChecked: new Date().toISOString(),
          details,
          impact,
          recoveryActions: status !== 'healthy' ? [
            'Check database connection pool',
            'Review slow query log',
            'Monitor database resource usage',
            'Consider connection pool tuning'
          ] : [],
          dependencies: ['postgresql']
        };
      } catch (error) {
        return {
          name: 'database',
          status: 'unhealthy' as HealthStatus,
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown database error',
          lastChecked: new Date().toISOString(),
          impact: 'critical',
          recoveryActions: [
            'Check database server status',
            'Verify connection string',
            'Check network connectivity',
            'Review database logs',
            'Restart database connection pool'
          ],
          dependencies: ['postgresql']
        };
      }
    });

    // Redis cache health check
    this.registerServiceCheck('cache', async () => {
      const startTime = Date.now();
      try {
        // Try to use the cache service
        const { cacheService } = await import('./cacheService');
        const healthCheck = await cacheService.healthCheck();
        
        if (!healthCheck.connected) {
          return {
            name: 'cache',
            status: 'degraded' as HealthStatus,
            responseTime: Date.now() - startTime,
            lastChecked: new Date().toISOString(),
            error: 'Redis connection failed',
            details: { 
              connected: false,
              message: 'Cache service unavailable - using fallback'
            },
            impact: 'medium',
            recoveryActions: [
              'Check Redis server status',
              'Verify Redis connection string',
              'Check network connectivity to Redis',
              'Review Redis logs',
              'Restart Redis service if needed'
            ],
            dependencies: ['redis']
          };
        }

        // Check cache performance metrics
        const stats = await cacheService.getStats();
        let status: HealthStatus = 'healthy';
        const details: any = {
          connected: true,
          latency: healthCheck.latency,
          memoryUsage: healthCheck.memoryUsage,
          keyCount: healthCheck.keyCount,
          hitRate: stats.hitRate,
          avgResponseTime: stats.avgResponseTime
        };

        // Check for performance issues
        if (healthCheck.latency > 100 || stats.hitRate < 0.5) {
          status = 'degraded';
          details.warnings = [];
          if (healthCheck.latency > 100) details.warnings.push('High cache latency');
          if (stats.hitRate < 0.5) details.warnings.push('Low cache hit rate');
        }

        return {
          name: 'cache',
          status,
          responseTime: Date.now() - startTime,
          lastChecked: new Date().toISOString(),
          details,
          impact: status === 'degraded' ? 'medium' : 'low',
          recoveryActions: status !== 'healthy' ? [
            'Monitor cache hit rates',
            'Review cache TTL settings',
            'Check Redis memory usage',
            'Consider cache warming strategies'
          ] : [],
          dependencies: ['redis']
        };
      } catch (error) {
        return {
          name: 'cache',
          status: 'degraded' as HealthStatus,
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Cache connection error',
          lastChecked: new Date().toISOString(),
          details: { message: 'Cache service error - using fallback' },
          impact: 'medium',
          recoveryActions: [
            'Check cache service configuration',
            'Verify Redis availability',
            'Review cache service logs',
            'Restart cache service'
          ],
          dependencies: ['redis']
        };
      }
    });

    // External services health check
    this.registerServiceCheck('external_services', async () => {
      const startTime = Date.now();
      const services = [];
      let overallStatus: HealthStatus = 'healthy';
      const failedServices = [];

      // Check ENS service
      try {
        await new Promise((resolve, reject) => {
          require('dns').resolve('ethereum.org', (err: any) => {
            if (err) reject(err);
            else resolve(true);
          });
        });
        services.push({ name: 'ENS', status: 'healthy', responseTime: Date.now() - startTime });
      } catch (error) {
        services.push({ name: 'ENS', status: 'degraded', error: 'DNS resolution failed' });
        failedServices.push('ENS');
        overallStatus = 'degraded';
      }

      // Check blockchain RPC endpoints
      try {
        const response = await fetch('https://cloudflare-eth.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 1
          }),
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          services.push({ name: 'Ethereum_RPC', status: 'healthy', responseTime: Date.now() - startTime });
        } else {
          services.push({ name: 'Ethereum_RPC', status: 'degraded', error: `HTTP ${response.status}` });
          failedServices.push('Ethereum_RPC');
          overallStatus = 'degraded';
        }
      } catch (error) {
        services.push({ name: 'Ethereum_RPC', status: 'unhealthy', error: 'Connection failed' });
        failedServices.push('Ethereum_RPC');
        overallStatus = failedServices.length > 1 ? 'unhealthy' : 'degraded';
      }

      // Check IPFS gateway
      try {
        const response = await fetch('https://ipfs.io/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/readme', {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          services.push({ name: 'IPFS_Gateway', status: 'healthy', responseTime: Date.now() - startTime });
        } else {
          services.push({ name: 'IPFS_Gateway', status: 'degraded', error: `HTTP ${response.status}` });
          failedServices.push('IPFS_Gateway');
          if (overallStatus === 'healthy') overallStatus = 'degraded';
        }
      } catch (error) {
        services.push({ name: 'IPFS_Gateway', status: 'degraded', error: 'Connection timeout' });
        failedServices.push('IPFS_Gateway');
        if (overallStatus === 'healthy') overallStatus = 'degraded';
      }

      return {
        name: 'external_services',
        status: overallStatus,
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        details: { 
          services,
          failedServices,
          totalServices: services.length,
          healthyServices: services.filter(s => s.status === 'healthy').length
        },
        impact: overallStatus === 'unhealthy' ? 'high' : overallStatus === 'degraded' ? 'medium' : 'low',
        recoveryActions: failedServices.length > 0 ? [
          'Check external service status pages',
          'Verify network connectivity',
          'Consider fallback service endpoints',
          'Review API rate limits and quotas',
          'Check service authentication credentials'
        ] : [],
        dependencies: ['ethereum-rpc', 'ipfs-gateway', 'dns']
      };
    });

    // Register dependency checks
    this.registerDependencyCheck('postgresql', async () => {
      const startTime = Date.now();
      try {
        const { db } = await import('../db/connection');
        await db.execute('SELECT version()');
        
        return {
          name: 'postgresql',
          status: 'healthy' as HealthStatus,
          responseTime: Date.now() - startTime,
          lastChecked: new Date().toISOString(),
          impact: 'critical',
          affectedServices: ['database', 'authentication', 'marketplace_listings', 'seller_profiles']
        };
      } catch (error) {
        return {
          name: 'postgresql',
          status: 'unhealthy' as HealthStatus,
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'PostgreSQL connection failed',
          lastChecked: new Date().toISOString(),
          impact: 'critical',
          affectedServices: ['database', 'authentication', 'marketplace_listings', 'seller_profiles']
        };
      }
    });

    this.registerDependencyCheck('redis', async () => {
      const startTime = Date.now();
      try {
        const { cacheService } = await import('./cacheService');
        const healthCheck = await cacheService.healthCheck();
        
        return {
          name: 'redis',
          status: healthCheck.connected ? 'healthy' as HealthStatus : 'degraded' as HealthStatus,
          responseTime: Date.now() - startTime,
          lastChecked: new Date().toISOString(),
          impact: 'medium',
          affectedServices: ['cache', 'session_management', 'rate_limiting']
        };
      } catch (error) {
        return {
          name: 'redis',
          status: 'degraded' as HealthStatus,
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Redis connection failed',
          lastChecked: new Date().toISOString(),
          impact: 'medium',
          affectedServices: ['cache', 'session_management', 'rate_limiting']
        };
      }
    });
  }

  // Register a custom service health check
  registerServiceCheck(name: string, checkFunction: () => Promise<ServiceHealth>): void {
    this.serviceChecks.set(name, checkFunction);
  }

  // Register a custom dependency check
  registerDependencyCheck(name: string, checkFunction: () => Promise<DependencyStatus>): void {
    this.dependencyChecks.set(name, checkFunction);
  }

  // Helper methods for database health checks
  private async getDatabaseConnectionCount(): Promise<number> {
    try {
      const { db } = await import('../db/connection');
      const result = await db.execute('SELECT count(*) as count FROM pg_stat_activity WHERE state = \'active\'');
      return (result as any)[0]?.count || 0;
    } catch (error) {
      return 0;
    }
  }

  private async getSlowQueryCount(): Promise<number> {
    try {
      const { db } = await import('../db/connection');
      // Check for queries running longer than 5 seconds
      const result = await db.execute(`
        SELECT count(*) as count 
        FROM pg_stat_activity 
        WHERE state = 'active' 
        AND query_start < now() - interval '5 seconds'
        AND query NOT LIKE '%pg_stat_activity%'
      `);
      return (result as any)[0]?.count || 0;
    } catch (error) {
      return 0;
    }
  }

  // Alert management
  addAlert(key: string, level: 'warning' | 'critical', message: string): void {
    this.activeAlerts.set(key, {
      level,
      message,
      timestamp: Date.now()
    });

    // Log the alert
    if (level === 'critical') {
      logger.error(`Critical Alert: ${message}`, { alertKey: key });
    } else {
      logger.warn(`Warning Alert: ${message}`, { alertKey: key });
    }
  }

  removeAlert(key: string): void {
    this.activeAlerts.delete(key);
  }

  clearExpiredAlerts(): void {
    const now = Date.now();
    const alertTimeout = 30 * 60 * 1000; // 30 minutes
    
    for (const [key, alert] of this.activeAlerts.entries()) {
      if (now - alert.timestamp > alertTimeout) {
        this.activeAlerts.delete(key);
      }
    }
  }

  // Response time tracking
  recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);
    
    // Keep only the last N response times
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes.shift();
    }
  }

  private calculatePercentile(percentile: number): number {
    if (this.responseTimes.length === 0) return 0;
    
    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private calculateAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;
    return this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
  }

  // Perform health check for all services
  async performHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now();
    const services: ServiceHealth[] = [];
    const dependencies: DependencyStatus[] = [];

    // Clear expired alerts
    this.clearExpiredAlerts();

    // Run all service checks in parallel
    const serviceCheckPromises = Array.from(this.serviceChecks.entries()).map(async ([name, checkFn]) => {
      try {
        return await Promise.race([
          checkFn(),
          new Promise<ServiceHealth>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 10000)
          )
        ]);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Health check failed';
        
        // Add alert for failed service
        this.addAlert(`service_${name}`, 'critical', `Service ${name} health check failed: ${errorMessage}`);
        
        return {
          name,
          status: 'unhealthy' as HealthStatus,
          error: errorMessage,
          lastChecked: new Date().toISOString(),
          impact: 'high' as 'low' | 'medium' | 'high' | 'critical',
          recoveryActions: [
            `Check ${name} service logs`,
            `Restart ${name} service`,
            'Review service configuration',
            'Check system resources'
          ]
        };
      }
    });

    // Run all dependency checks in parallel
    const dependencyCheckPromises = Array.from(this.dependencyChecks.entries()).map(async ([name, checkFn]) => {
      try {
        return await Promise.race([
          checkFn(),
          new Promise<DependencyStatus>((_, reject) => 
            setTimeout(() => reject(new Error('Dependency check timeout')), 10000)
          )
        ]);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Dependency check failed';
        
        // Add alert for failed dependency
        this.addAlert(`dependency_${name}`, 'critical', `Dependency ${name} check failed: ${errorMessage}`);
        
        return {
          name,
          status: 'unhealthy' as HealthStatus,
          error: errorMessage,
          lastChecked: new Date().toISOString(),
          impact: 'critical' as 'low' | 'medium' | 'high' | 'critical',
          affectedServices: []
        };
      }
    });

    const [serviceResults, dependencyResults] = await Promise.all([
      Promise.all(serviceCheckPromises),
      Promise.all(dependencyCheckPromises)
    ]);

    services.push(...serviceResults);
    dependencies.push(...dependencyResults);

    // Determine overall system status
    const unhealthyServices = services.filter(s => s.status === 'unhealthy');
    const degradedServices = services.filter(s => s.status === 'degraded');
    const unhealthyDependencies = dependencies.filter(d => d.status === 'unhealthy');
    const degradedDependencies = dependencies.filter(d => d.status === 'degraded');
    
    let systemStatus: HealthStatus = 'healthy';
    
    // Critical dependencies or services make the system unhealthy
    if (unhealthyServices.length > 0 || unhealthyDependencies.some(d => d.impact === 'critical')) {
      systemStatus = 'unhealthy';
    } else if (degradedServices.length > 0 || degradedDependencies.length > 0 || unhealthyDependencies.length > 0) {
      systemStatus = 'degraded';
    }

    // Calculate enhanced metrics
    const uptime = Date.now() - this.startTime;
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
    const throughput = this.requestCount / (uptime / 1000); // requests per second
    
    // CPU usage calculation
    const cpuUsage = process.cpuUsage();

    // Alert counts
    const criticalAlerts = Array.from(this.activeAlerts.values()).filter(a => a.level === 'critical').length;
    const warningAlerts = Array.from(this.activeAlerts.values()).filter(a => a.level === 'warning').length;

    const systemHealth: SystemHealth = {
      status: systemStatus,
      timestamp: new Date().toISOString(),
      uptime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services,
      dependencies,
      metrics: {
        memory: process.memoryUsage(),
        cpu: cpuUsage,
        activeConnections: (process as any)._getActiveHandles?.()?.length || 0,
        totalRequests: this.requestCount,
        errorRate: Math.round(errorRate * 100) / 100,
        responseTime: {
          avg: Math.round(this.calculateAverageResponseTime() * 100) / 100,
          p95: Math.round(this.calculatePercentile(95) * 100) / 100,
          p99: Math.round(this.calculatePercentile(99) * 100) / 100
        },
        throughput: Math.round(throughput * 100) / 100
      },
      alerts: {
        active: this.activeAlerts.size,
        critical: criticalAlerts,
        warnings: warningAlerts
      }
    };

    // Add system-level alerts based on metrics
    this.checkSystemAlerts(systemHealth);

    this.lastHealthCheck = systemHealth;
    return systemHealth;
  }

  // Check for system-level alerts
  private checkSystemAlerts(health: SystemHealth): void {
    const memory = health.metrics.memory;
    const memoryUsagePercent = (memory.heapUsed / memory.heapTotal) * 100;
    
    // Memory usage alerts
    if (memoryUsagePercent > 90) {
      this.addAlert('high_memory_usage', 'critical', `Memory usage at ${memoryUsagePercent.toFixed(1)}%`);
    } else if (memoryUsagePercent > 80) {
      this.addAlert('high_memory_usage', 'warning', `Memory usage at ${memoryUsagePercent.toFixed(1)}%`);
    } else {
      this.removeAlert('high_memory_usage');
    }

    // Error rate alerts
    if (health.metrics.errorRate > 10) {
      this.addAlert('high_error_rate', 'critical', `Error rate at ${health.metrics.errorRate}%`);
    } else if (health.metrics.errorRate > 5) {
      this.addAlert('high_error_rate', 'warning', `Error rate at ${health.metrics.errorRate}%`);
    } else {
      this.removeAlert('high_error_rate');
    }

    // Response time alerts
    if (health.metrics.responseTime.p95 > 5000) {
      this.addAlert('slow_response_time', 'critical', `95th percentile response time: ${health.metrics.responseTime.p95}ms`);
    } else if (health.metrics.responseTime.p95 > 2000) {
      this.addAlert('slow_response_time', 'warning', `95th percentile response time: ${health.metrics.responseTime.p95}ms`);
    } else {
      this.removeAlert('slow_response_time');
    }
  }

  // Get cached health status
  getCachedHealth(): SystemHealth | null {
    return this.lastHealthCheck;
  }

  // Start periodic health checks
  private startPeriodicHealthChecks(): void {
    // Skip in test environment
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    
    // Run health check every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Periodic health check failed', error);
      }
    }, 30000);
  }

  // Stop periodic health checks
  stopPeriodicHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  // Cleanup method for tests
  cleanup(): void {
    this.stopPeriodicHealthChecks();
  }

  // Increment request counter
  incrementRequestCount(): void {
    this.requestCount++;
  }

  // Increment error counter
  incrementErrorCount(): void {
    this.errorCount++;
  }

  // Get system metrics
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
    const throughput = this.requestCount / (uptime / 1000);

    return {
      uptime,
      totalRequests: this.requestCount,
      totalErrors: this.errorCount,
      errorRate: Math.round(errorRate * 100) / 100,
      throughput: Math.round(throughput * 100) / 100,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      responseTime: {
        avg: Math.round(this.calculateAverageResponseTime() * 100) / 100,
        p95: Math.round(this.calculatePercentile(95) * 100) / 100,
        p99: Math.round(this.calculatePercentile(99) * 100) / 100,
        samples: this.responseTimes.length
      },
      alerts: {
        active: this.activeAlerts.size,
        critical: Array.from(this.activeAlerts.values()).filter(a => a.level === 'critical').length,
        warnings: Array.from(this.activeAlerts.values()).filter(a => a.level === 'warning').length
      },
      startTime: new Date(this.startTime).toISOString()
    };
  }

  // Get detailed service information with impact assessment
  async getServiceDetails(serviceName: string): Promise<ServiceHealth | null> {
    const health = await this.performHealthCheck();
    return health.services.find(s => s.name === serviceName) || null;
  }

  // Get dependency impact assessment
  async getDependencyImpact(): Promise<{
    dependency: string;
    status: HealthStatus;
    affectedServices: string[];
    impact: 'low' | 'medium' | 'high' | 'critical';
    recoveryActions: string[];
  }[]> {
    const health = await this.performHealthCheck();
    
    return health.dependencies.map(dep => ({
      dependency: dep.name,
      status: dep.status,
      affectedServices: dep.affectedServices,
      impact: dep.impact,
      recoveryActions: this.getRecoveryActions(dep.name, dep.status)
    }));
  }

  // Get recovery actions for a specific dependency
  private getRecoveryActions(dependencyName: string, status: HealthStatus): string[] {
    const baseActions: Record<string, string[]> = {
      postgresql: [
        'Check PostgreSQL server status',
        'Verify database connection parameters',
        'Review PostgreSQL logs for errors',
        'Check disk space and memory usage',
        'Restart PostgreSQL service if needed',
        'Verify network connectivity to database server'
      ],
      redis: [
        'Check Redis server status',
        'Verify Redis connection parameters',
        'Review Redis logs for errors',
        'Check Redis memory usage',
        'Restart Redis service if needed',
        'Clear Redis cache if corrupted'
      ],
      'ethereum-rpc': [
        'Check Ethereum RPC endpoint status',
        'Verify API keys and authentication',
        'Switch to backup RPC endpoint',
        'Check rate limiting status',
        'Review network connectivity'
      ],
      'ipfs-gateway': [
        'Check IPFS gateway status',
        'Switch to alternative IPFS gateway',
        'Verify IPFS node connectivity',
        'Check for gateway rate limiting'
      ]
    };

    const actions = baseActions[dependencyName] || [
      `Check ${dependencyName} service status`,
      `Review ${dependencyName} configuration`,
      `Restart ${dependencyName} service`,
      'Check system resources and connectivity'
    ];

    if (status === 'unhealthy') {
      return [
        'IMMEDIATE ACTION REQUIRED',
        ...actions,
        'Escalate to on-call engineer if issue persists'
      ];
    } else if (status === 'degraded') {
      return [
        'Monitor closely',
        ...actions.slice(0, 3), // First 3 actions for degraded state
        'Consider preventive maintenance'
      ];
    }

    return actions;
  }

  // Get active alerts
  getActiveAlerts(): Array<{
    key: string;
    level: 'warning' | 'critical';
    message: string;
    timestamp: string;
    age: number;
  }> {
    const now = Date.now();
    return Array.from(this.activeAlerts.entries()).map(([key, alert]) => ({
      key,
      level: alert.level,
      message: alert.message,
      timestamp: new Date(alert.timestamp).toISOString(),
      age: now - alert.timestamp
    }));
  }

  // Get service start time
  getStartTime(): number {
    return this.startTime;
  }

  // Get uptime in milliseconds
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  // Health check endpoint handler
  async handleHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.performHealthCheck();
      
      if (health.status === 'healthy') {
        successResponse(res, health, 200);
      } else if (health.status === 'degraded') {
        successResponse(res, health, 200); // Still return 200 for degraded
      } else {
        // Return 503 for unhealthy status
        res.status(503).json({
          success: false,
          data: health,
          error: {
            code: 'SYSTEM_UNHEALTHY',
            message: 'System is currently unhealthy'
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: res.locals.requestId
          }
        });
      }
    } catch (error) {
      logger.error('Health check endpoint error', error);
      errorResponse(res, 'HEALTH_CHECK_ERROR', 'Health check failed', 500);
    }
  }

  // Simple ping endpoint handler
  handlePing(req: Request, res: Response): void {
    successResponse(res, {
      pong: true,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime
    });
  }

  // Detailed status endpoint handler
  async handleStatus(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.performHealthCheck();
      const metrics = this.getMetrics();
      
      successResponse(res, {
        ...health,
        detailedMetrics: metrics
      });
    } catch (error) {
      logger.error('Status endpoint error', error);
      errorResponse(res, 'STATUS_CHECK_ERROR', 'Status check failed', 500);
    }
  }
}

// Export singleton instance
export const healthMonitoringService = HealthMonitoringService.getInstance();
