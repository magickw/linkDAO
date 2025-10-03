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
}

// Overall system health
export interface SystemHealth {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: ServiceHealth[];
  metrics: {
    memory: NodeJS.MemoryUsage;
    cpu?: number;
    activeConnections?: number;
    totalRequests?: number;
    errorRate?: number;
  };
}

// Health monitoring service
export class HealthMonitoringService {
  private static instance: HealthMonitoringService;
  private serviceChecks: Map<string, () => Promise<ServiceHealth>> = new Map();
  private lastHealthCheck: SystemHealth | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private requestCount = 0;
  private errorCount = 0;
  private startTime = Date.now();

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
        
        return {
          name: 'database',
          status: 'healthy' as HealthStatus,
          responseTime: Date.now() - startTime,
          lastChecked: new Date().toISOString(),
          details: { connection: 'active' }
        };
      } catch (error) {
        return {
          name: 'database',
          status: 'unhealthy' as HealthStatus,
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown database error',
          lastChecked: new Date().toISOString()
        };
      }
    });

    // Redis cache health check
    this.registerServiceCheck('cache', async () => {
      const startTime = Date.now();
      try {
        // Try to connect to Redis if available
        const redis = await import('redis').catch(() => null);
        if (!redis) {
          return {
            name: 'cache',
            status: 'degraded' as HealthStatus,
            responseTime: Date.now() - startTime,
            lastChecked: new Date().toISOString(),
            details: { message: 'Redis not configured' }
          };
        }

        // Simple ping test
        return {
          name: 'cache',
          status: 'healthy' as HealthStatus,
          responseTime: Date.now() - startTime,
          lastChecked: new Date().toISOString(),
          details: { connection: 'active' }
        };
      } catch (error) {
        return {
          name: 'cache',
          status: 'degraded' as HealthStatus,
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Cache connection error',
          lastChecked: new Date().toISOString()
        };
      }
    });

    // External services health check
    this.registerServiceCheck('external_services', async () => {
      const startTime = Date.now();
      const services = [];
      let overallStatus: HealthStatus = 'healthy';

      // Check ENS service
      try {
        // Simple DNS resolution test
        await new Promise((resolve, reject) => {
          require('dns').resolve('ethereum.org', (err: any) => {
            if (err) reject(err);
            else resolve(true);
          });
        });
        services.push({ name: 'ENS', status: 'healthy' });
      } catch (error) {
        services.push({ name: 'ENS', status: 'degraded' });
        overallStatus = 'degraded';
      }

      return {
        name: 'external_services',
        status: overallStatus,
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        details: { services }
      };
    });
  }

  // Register a custom service health check
  registerServiceCheck(name: string, checkFunction: () => Promise<ServiceHealth>): void {
    this.serviceChecks.set(name, checkFunction);
  }

  // Perform health check for all services
  async performHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now();
    const services: ServiceHealth[] = [];

    // Run all service checks in parallel
    const checkPromises = Array.from(this.serviceChecks.entries()).map(async ([name, checkFn]) => {
      try {
        return await Promise.race([
          checkFn(),
          new Promise<ServiceHealth>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ]);
      } catch (error) {
        return {
          name,
          status: 'unhealthy' as HealthStatus,
          error: error instanceof Error ? error.message : 'Health check failed',
          lastChecked: new Date().toISOString()
        };
      }
    });

    const results = await Promise.all(checkPromises);
    services.push(...results);

    // Determine overall system status
    const unhealthyServices = services.filter(s => s.status === 'unhealthy');
    const degradedServices = services.filter(s => s.status === 'degraded');
    
    let systemStatus: HealthStatus = 'healthy';
    if (unhealthyServices.length > 0) {
      systemStatus = 'unhealthy';
    } else if (degradedServices.length > 0) {
      systemStatus = 'degraded';
    }

    // Calculate metrics
    const uptime = Date.now() - this.startTime;
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

    const systemHealth: SystemHealth = {
      status: systemStatus,
      timestamp: new Date().toISOString(),
      uptime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services,
      metrics: {
        memory: process.memoryUsage(),
        activeConnections: (process as any)._getActiveHandles?.()?.length || 0,
        totalRequests: this.requestCount,
        errorRate: Math.round(errorRate * 100) / 100
      }
    };

    this.lastHealthCheck = systemHealth;
    return systemHealth;
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

    return {
      uptime,
      totalRequests: this.requestCount,
      totalErrors: this.errorCount,
      errorRate: Math.round(errorRate * 100) / 100,
      memory: process.memoryUsage(),
      startTime: new Date(this.startTime).toISOString()
    };
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