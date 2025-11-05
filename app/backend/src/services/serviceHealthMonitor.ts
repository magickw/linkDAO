import { safeLogger } from '../utils/safeLogger';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  responseTime: number;
  errorCount: number;
  consecutiveFailures: number;
  uptime: number;
  lastError?: string;
}

interface HealthCheckConfig {
  name: string;
  checkFunction: () => Promise<boolean>;
  interval: number; // milliseconds
  timeout: number; // milliseconds
  retryAttempts: number;
  criticalService: boolean;
}

export class ServiceHealthMonitor {
  private services: Map<string, ServiceHealth> = new Map();
  private healthChecks: Map<string, HealthCheckConfig> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private startTime: Date = new Date();

  constructor() {
    this.initializeDefaultServices();
  }

  private initializeDefaultServices() {
    // Database health check
    this.registerService({
      name: 'database',
      checkFunction: this.checkDatabase.bind(this),
      interval: 30000, // 30 seconds
      timeout: 5000,   // 5 seconds
      retryAttempts: 3,
      criticalService: true
    });

    // External API health checks
    this.registerService({
      name: 'coingecko',
      checkFunction: this.checkCoinGecko.bind(this),
      interval: 60000, // 1 minute
      timeout: 10000,  // 10 seconds
      retryAttempts: 2,
      criticalService: false
    });

    this.registerService({
      name: 'ipapi',
      checkFunction: this.checkIPAPI.bind(this),
      interval: 60000, // 1 minute
      timeout: 10000,  // 10 seconds
      retryAttempts: 2,
      criticalService: false
    });

    // Internal service health checks
    this.registerService({
      name: 'feed_service',
      checkFunction: this.checkFeedService.bind(this),
      interval: 30000, // 30 seconds
      timeout: 5000,   // 5 seconds
      retryAttempts: 2,
      criticalService: true
    });

    this.registerService({
      name: 'community_service',
      checkFunction: this.checkCommunityService.bind(this),
      interval: 30000, // 30 seconds
      timeout: 5000,   // 5 seconds
      retryAttempts: 2,
      criticalService: true
    });
  }

  public registerService(config: HealthCheckConfig) {
    this.healthChecks.set(config.name, config);
    
    // Initialize service health
    this.services.set(config.name, {
      name: config.name,
      status: 'unknown',
      lastCheck: new Date(),
      responseTime: 0,
      errorCount: 0,
      consecutiveFailures: 0,
      uptime: 0
    });

    // Create circuit breaker
    this.circuitBreakers.set(config.name, new CircuitBreaker({
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitorTimeout: 30000    // 30 seconds
    }));

    // Start health check interval
    this.startHealthCheck(config.name);
  }

  private startHealthCheck(serviceName: string) {
    const config = this.healthChecks.get(serviceName);
    if (!config) return;

    const interval = setInterval(async () => {
      await this.performHealthCheck(serviceName);
    }, config.interval);

    this.intervals.set(serviceName, interval);

    // Perform initial check
    setImmediate(() => this.performHealthCheck(serviceName));
  }

  private async performHealthCheck(serviceName: string) {
    const config = this.healthChecks.get(serviceName);
    const service = this.services.get(serviceName);
    
    if (!config || !service) return;

    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      // Use circuit breaker
      const circuitBreaker = this.circuitBreakers.get(serviceName)!;
      
      if (circuitBreaker.isOpen()) {
        throw new Error('Circuit breaker is open');
      }

      // Perform health check with timeout
      const checkPromise = config.checkFunction();
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), config.timeout);
      });

      success = await Promise.race([checkPromise, timeoutPromise]);
      
      if (success) {
        circuitBreaker.recordSuccess();
      } else {
        circuitBreaker.recordFailure();
      }

    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
      this.circuitBreakers.get(serviceName)!.recordFailure();
    }

    const responseTime = Date.now() - startTime;

    // Update service health
    service.lastCheck = new Date();
    service.responseTime = responseTime;
    service.lastError = error;

    if (success) {
      service.consecutiveFailures = 0;
      service.status = responseTime > 5000 ? 'degraded' : 'healthy';
    } else {
      service.errorCount++;
      service.consecutiveFailures++;
      service.status = service.consecutiveFailures >= 3 ? 'unhealthy' : 'degraded';
    }

    // Calculate uptime
    const totalTime = Date.now() - this.startTime.getTime();
    const healthyTime = totalTime - (service.errorCount * config.interval);
    service.uptime = Math.max(0, (healthyTime / totalTime) * 100);

    // Log critical service failures
    if (!success && config.criticalService) {
      safeLogger.error(`Critical service ${serviceName} health check failed:`, {
        error,
        responseTime,
        consecutiveFailures: service.consecutiveFailures,
        status: service.status
      });
    }

    // Emit health change events
    this.emitHealthChangeEvent(serviceName, service);
  }

  private emitHealthChangeEvent(serviceName: string, health: ServiceHealth) {
    // In a real implementation, you might emit events to WebSocket clients
    // or trigger alerts for critical services
    if (health.status === 'unhealthy' && health.consecutiveFailures === 3) {
      safeLogger.warn(`Service ${serviceName} marked as unhealthy after 3 consecutive failures`);
    }
  }

  // Health check implementations
  private async checkDatabase(): Promise<boolean> {
    try {
      // Simple database connectivity check
      const { db } = await import('../db/index');
      await db.execute('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkCoinGecko(): Promise<boolean> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/ping', {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async checkIPAPI(): Promise<boolean> {
    try {
      const response = await fetch('https://ipapi.co/json/', {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async checkFeedService(): Promise<boolean> {
    try {
      // Check if feed service can handle basic operations
      const { feedService } = await import('./feedService');
      // This is a lightweight check - just verify the service exists and is responsive
      return typeof feedService.getTrendingPosts === 'function';
    } catch (error) {
      return false;
    }
  }

  private async checkCommunityService(): Promise<boolean> {
    try {
      // Check if community service can handle basic operations
      const { communityService } = await import('./communityService');
      return typeof communityService.getTrendingCommunities === 'function';
    } catch (error) {
      return false;
    }
  }

  // Public methods
  public getServiceHealth(serviceName: string): ServiceHealth | null {
    return this.services.get(serviceName) || null;
  }

  public getAllServicesHealth(): ServiceHealth[] {
    return Array.from(this.services.values());
  }

  public getOverallHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    healthyServices: number;
    totalServices: number;
    criticalServicesDown: number;
  } {
    const services = Array.from(this.services.values());
    const healthyServices = services.filter(s => s.status === 'healthy').length;
    const criticalServices = Array.from(this.healthChecks.values()).filter(c => c.criticalService);
    const criticalServicesDown = criticalServices.filter(c => {
      const health = this.services.get(c.name);
      return health?.status === 'unhealthy';
    }).length;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (criticalServicesDown > 0) {
      status = 'unhealthy';
    } else if (healthyServices < services.length * 0.8) {
      status = 'degraded';
    }

    return {
      status,
      healthyServices,
      totalServices: services.length,
      criticalServicesDown
    };
  }

  public isServiceHealthy(serviceName: string): boolean {
    const health = this.services.get(serviceName);
    return health?.status === 'healthy' || health?.status === 'degraded';
  }

  public getCircuitBreakerStatus(serviceName: string): {
    isOpen: boolean;
    failureCount: number;
    lastFailureTime?: Date;
  } | null {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (!circuitBreaker) return null;

    return {
      isOpen: circuitBreaker.isOpen(),
      failureCount: circuitBreaker.getFailureCount(),
      lastFailureTime: circuitBreaker.getLastFailureTime()
    };
  }

  public shutdown() {
    // Clear all intervals
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    
    this.intervals.clear();
    this.services.clear();
    this.healthChecks.clear();
    this.circuitBreakers.clear();
  }
}

// Circuit Breaker implementation
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime?: Date;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private config: {
    failureThreshold: number;
    recoveryTimeout: number;
    monitorTimeout: number;
  };

  constructor(config: { failureThreshold: number; recoveryTimeout: number; monitorTimeout: number }) {
    this.config = config;
  }

  public recordSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  public recordFailure() {
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  public isOpen(): boolean {
    if (this.state === 'closed') {
      return false;
    }

    if (this.state === 'open') {
      // Check if we should transition to half-open
      if (this.lastFailureTime && 
          Date.now() - this.lastFailureTime.getTime() > this.config.recoveryTimeout) {
        this.state = 'half-open';
        return false;
      }
      return true;
    }

    // half-open state
    return false;
  }

  public getFailureCount(): number {
    return this.failureCount;
  }

  public getLastFailureTime(): Date | undefined {
    return this.lastFailureTime;
  }
}

// Export singleton instance
export const serviceHealthMonitor = new ServiceHealthMonitor();
export default serviceHealthMonitor;