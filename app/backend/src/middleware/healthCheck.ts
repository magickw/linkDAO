import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  environment: string;
  services: {
    database: 'connected' | 'disconnected' | 'unknown';
    redis: 'connected' | 'disconnected' | 'unknown';
  };
  version: string;
}

export class HealthCheckService {
  private static instance: HealthCheckService;
  private healthStatus: HealthStatus;

  private constructor() {
    this.healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'unknown',
        redis: 'unknown'
      },
      version: '1.0.0'
    };
  }

  public static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  public updateDatabaseStatus(status: 'connected' | 'disconnected'): void {
    this.healthStatus.services.database = status;
    this.updateOverallStatus();
  }

  public updateRedisStatus(status: 'connected' | 'disconnected'): void {
    this.healthStatus.services.redis = status;
    this.updateOverallStatus();
  }

  private updateOverallStatus(): void {
    const { database, redis } = this.healthStatus.services;
    
    if (database === 'connected') {
      this.healthStatus.status = 'healthy';
    } else if (database === 'disconnected') {
      this.healthStatus.status = 'degraded';
    } else {
      this.healthStatus.status = 'unhealthy';
    }

    this.healthStatus.timestamp = new Date().toISOString();
    this.healthStatus.uptime = process.uptime();
    this.healthStatus.memory = process.memoryUsage();
  }

  public getHealthStatus(): HealthStatus {
    this.updateOverallStatus();
    return { ...this.healthStatus };
  }

  public isHealthy(): boolean {
    return this.healthStatus.status === 'healthy';
  }
}

// Middleware to check if server is healthy before processing requests
export const healthCheckMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const healthService = HealthCheckService.getInstance();
  
  // Skip health check for health endpoint itself
  if (req.path === '/health' || req.path === '/ping' || req.path === '/') {
    return next();
  }

  // If server is unhealthy, return 503
  if (!healthService.isHealthy()) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Server is currently unhealthy',
      health: healthService.getHealthStatus()
    });
  }

  next();
};

// Enhanced health check endpoint handler
export const healthCheckHandler = async (req: Request, res: Response) => {
  const healthService = HealthCheckService.getInstance();
  const health = healthService.getHealthStatus();
  
  const statusCode = health.status === 'healthy' ? 200 : 
                    health.status === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json(health);
};

// Graceful shutdown handler
export const gracefulShutdown = (signal: string) => {
  safeLogger.info(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  // Update health status to unhealthy
  const healthService = HealthCheckService.getInstance();
  healthService.updateDatabaseStatus('disconnected');
  healthService.updateRedisStatus('disconnected');
  
  // Give some time for ongoing requests to complete
  setTimeout(() => {
    safeLogger.info('✅ Graceful shutdown completed');
    process.exit(0);
  }, 5000);
};

// Setup graceful shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
