/**
 * Load Balancing Service
 * Horizontal scaling support with intelligent load distribution
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

interface ServerInstance {
  id: string;
  host: string;
  port: number;
  weight: number;
  status: 'healthy' | 'unhealthy' | 'draining';
  currentConnections: number;
  maxConnections: number;
  responseTime: number;
  errorRate: number;
  lastHealthCheck: number;
  metadata: {
    region?: string;
    zone?: string;
    capacity?: number;
    version?: string;
  };
}

interface LoadBalancingStrategy {
  name: string;
  selectServer: (servers: ServerInstance[], request?: any) => ServerInstance | null;
}

interface HealthCheckConfig {
  interval: number;
  timeout: number;
  retries: number;
  endpoint: string;
  expectedStatus: number;
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

interface LoadBalancerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  serverMetrics: Map<string, {
    requests: number;
    errors: number;
    responseTime: number;
    lastUsed: number;
  }>;
}

interface AutoScalingConfig {
  enabled: boolean;
  minInstances: number;
  maxInstances: number;
  targetCpuUtilization: number;
  targetMemoryUtilization: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
  metrics: {
    cpuThreshold: number;
    memoryThreshold: number;
    responseTimeThreshold: number;
    errorRateThreshold: number;
  };
}

/**
 * Load Balancing Service with health checking and auto-scaling
 */
export class LoadBalancingService extends EventEmitter {
  private servers = new Map<string, ServerInstance>();
  private strategies = new Map<string, LoadBalancingStrategy>();
  private currentStrategy: string = 'round-robin';
  private healthCheckConfig: HealthCheckConfig;
  private circuitBreakers = new Map<string, {
    failures: number;
    lastFailure: number;
    state: 'closed' | 'open' | 'half-open';
  }>();
  private metrics: LoadBalancerMetrics;
  private autoScalingConfig: AutoScalingConfig;
  
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private roundRobinIndex = 0;
  private lastScaleAction = 0;

  constructor() {
    super();
    
    this.healthCheckConfig = {
      interval: 30000, // 30 seconds
      timeout: 5000,   // 5 seconds
      retries: 3,
      endpoint: '/health',
      expectedStatus: 200
    };

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      requestsPerSecond: 0,
      serverMetrics: new Map()
    };

    this.autoScalingConfig = {
      enabled: false,
      minInstances: 2,
      maxInstances: 10,
      targetCpuUtilization: 70,
      targetMemoryUtilization: 80,
      scaleUpCooldown: 300000,   // 5 minutes
      scaleDownCooldown: 600000, // 10 minutes
      metrics: {
        cpuThreshold: 80,
        memoryThreshold: 85,
        responseTimeThreshold: 1000,
        errorRateThreshold: 0.05
      }
    };

    this.initializeStrategies();
    this.startHealthChecking();
    this.startMetricsCollection();
  }

  /**
   * Initialize load balancing strategies
   */
  private initializeStrategies(): void {
    // Round Robin Strategy
    this.strategies.set('round-robin', {
      name: 'Round Robin',
      selectServer: (servers) => {
        const healthyServers = servers.filter(s => s.status === 'healthy');
        if (healthyServers.length === 0) return null;
        
        const server = healthyServers[this.roundRobinIndex % healthyServers.length];
        this.roundRobinIndex++;
        return server;
      }
    });

    // Weighted Round Robin Strategy
    this.strategies.set('weighted-round-robin', {
      name: 'Weighted Round Robin',
      selectServer: (servers) => {
        const healthyServers = servers.filter(s => s.status === 'healthy');
        if (healthyServers.length === 0) return null;

        // Create weighted list
        const weightedServers: ServerInstance[] = [];
        healthyServers.forEach(server => {
          for (let i = 0; i < server.weight; i++) {
            weightedServers.push(server);
          }
        });

        if (weightedServers.length === 0) return null;
        
        const server = weightedServers[this.roundRobinIndex % weightedServers.length];
        this.roundRobinIndex++;
        return server;
      }
    });

    // Least Connections Strategy
    this.strategies.set('least-connections', {
      name: 'Least Connections',
      selectServer: (servers) => {
        const healthyServers = servers.filter(s => s.status === 'healthy');
        if (healthyServers.length === 0) return null;

        return healthyServers.reduce((least, current) => 
          current.currentConnections < least.currentConnections ? current : least
        );
      }
    });

    // Least Response Time Strategy
    this.strategies.set('least-response-time', {
      name: 'Least Response Time',
      selectServer: (servers) => {
        const healthyServers = servers.filter(s => s.status === 'healthy');
        if (healthyServers.length === 0) return null;

        return healthyServers.reduce((fastest, current) => 
          current.responseTime < fastest.responseTime ? current : fastest
        );
      }
    });

    // IP Hash Strategy (for session affinity)
    this.strategies.set('ip-hash', {
      name: 'IP Hash',
      selectServer: (servers, request) => {
        const healthyServers = servers.filter(s => s.status === 'healthy');
        if (healthyServers.length === 0) return null;

        const clientIp = request?.ip || request?.connection?.remoteAddress || '127.0.0.1';
        const hash = this.hashString(clientIp);
        const index = hash % healthyServers.length;
        
        return healthyServers[index];
      }
    });

    // Resource-based Strategy
    this.strategies.set('resource-based', {
      name: 'Resource Based',
      selectServer: (servers) => {
        const healthyServers = servers.filter(s => s.status === 'healthy');
        if (healthyServers.length === 0) return null;

        // Score based on multiple factors
        return healthyServers.reduce((best, current) => {
          const currentScore = this.calculateResourceScore(current);
          const bestScore = this.calculateResourceScore(best);
          return currentScore > bestScore ? current : best;
        });
      }
    });
  }

  /**
   * Calculate resource-based score for server selection
   */
  private calculateResourceScore(server: ServerInstance): number {
    const connectionUtilization = server.currentConnections / server.maxConnections;
    const responseTimeFactor = Math.max(0, 1 - (server.responseTime / 1000)); // Normalize to 1 second
    const errorRateFactor = Math.max(0, 1 - server.errorRate);
    
    // Weighted score (lower utilization and response time = higher score)
    return (
      (1 - connectionUtilization) * 0.4 +
      responseTimeFactor * 0.3 +
      errorRateFactor * 0.2 +
      (server.weight / 10) * 0.1
    );
  }

  /**
   * Hash string for consistent hashing
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Add server to load balancer
   */
  addServer(server: Omit<ServerInstance, 'status' | 'currentConnections' | 'responseTime' | 'errorRate' | 'lastHealthCheck'>): void {
    const fullServer: ServerInstance = {
      ...server,
      status: 'healthy',
      currentConnections: 0,
      responseTime: 0,
      errorRate: 0,
      lastHealthCheck: Date.now()
    };

    this.servers.set(server.id, fullServer);
    this.metrics.serverMetrics.set(server.id, {
      requests: 0,
      errors: 0,
      responseTime: 0,
      lastUsed: 0
    });

    this.emit('serverAdded', fullServer);
  }

  /**
   * Remove server from load balancer
   */
  removeServer(serverId: string): void {
    const server = this.servers.get(serverId);
    if (server) {
      // Mark as draining first
      server.status = 'draining';
      
      // Remove after connections drain (simplified)
      setTimeout(() => {
        this.servers.delete(serverId);
        this.metrics.serverMetrics.delete(serverId);
        this.emit('serverRemoved', { serverId });
      }, 30000); // 30 seconds to drain
    }
  }

  /**
   * Get next server based on current strategy
   */
  getNextServer(request?: any): ServerInstance | null {
    const strategy = this.strategies.get(this.currentStrategy);
    if (!strategy) {
      throw new Error(`Unknown load balancing strategy: ${this.currentStrategy}`);
    }

    const servers = Array.from(this.servers.values());
    const availableServers = servers.filter(server => 
      server.status === 'healthy' && 
      this.isCircuitBreakerClosed(server.id)
    );

    if (availableServers.length === 0) {
      this.emit('noServersAvailable');
      return null;
    }

    const selectedServer = strategy.selectServer(availableServers, request);
    
    if (selectedServer) {
      selectedServer.currentConnections++;
      this.updateServerMetrics(selectedServer.id, 'request');
    }

    return selectedServer;
  }

  /**
   * Release server connection
   */
  releaseServer(serverId: string, responseTime: number, success: boolean): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.currentConnections = Math.max(0, server.currentConnections - 1);
      
      // Update response time (exponential moving average)
      server.responseTime = server.responseTime * 0.9 + responseTime * 0.1;
      
      // Update error rate
      const serverMetrics = this.metrics.serverMetrics.get(serverId);
      if (serverMetrics) {
        serverMetrics.responseTime = responseTime;
        serverMetrics.lastUsed = Date.now();
        
        if (success) {
          this.metrics.successfulRequests++;
        } else {
          this.metrics.failedRequests++;
          serverMetrics.errors++;
          this.handleServerError(serverId);
        }
      }
      
      this.updateCircuitBreaker(serverId, success);
    }
  }

  /**
   * Handle server error for circuit breaker
   */
  private handleServerError(serverId: string): void {
    let circuitBreaker = this.circuitBreakers.get(serverId);
    
    if (!circuitBreaker) {
      circuitBreaker = {
        failures: 0,
        lastFailure: 0,
        state: 'closed'
      };
      this.circuitBreakers.set(serverId, circuitBreaker);
    }

    circuitBreaker.failures++;
    circuitBreaker.lastFailure = Date.now();

    // Open circuit breaker if failure threshold exceeded
    if (circuitBreaker.failures >= 5 && circuitBreaker.state === 'closed') {
      circuitBreaker.state = 'open';
      this.emit('circuitBreakerOpened', { serverId });
      
      // Try to recover after timeout
      setTimeout(() => {
        const cb = this.circuitBreakers.get(serverId);
        if (cb && cb.state === 'open') {
          cb.state = 'half-open';
          this.emit('circuitBreakerHalfOpen', { serverId });
        }
      }, 60000); // 1 minute recovery timeout
    }
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(serverId: string, success: boolean): void {
    const circuitBreaker = this.circuitBreakers.get(serverId);
    if (!circuitBreaker) return;

    if (success) {
      if (circuitBreaker.state === 'half-open') {
        // Close circuit breaker on successful request
        circuitBreaker.state = 'closed';
        circuitBreaker.failures = 0;
        this.emit('circuitBreakerClosed', { serverId });
      } else if (circuitBreaker.state === 'closed') {
        // Reduce failure count on success
        circuitBreaker.failures = Math.max(0, circuitBreaker.failures - 1);
      }
    }
  }

  /**
   * Check if circuit breaker is closed (server available)
   */
  private isCircuitBreakerClosed(serverId: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(serverId);
    return !circuitBreaker || circuitBreaker.state === 'closed' || circuitBreaker.state === 'half-open';
  }

  /**
   * Start health checking
   */
  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.healthCheckConfig.interval);
  }

  /**
   * Perform health checks on all servers
   */
  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.servers.values()).map(server => 
      this.checkServerHealth(server)
    );

    await Promise.allSettled(healthCheckPromises);
  }

  /**
   * Check individual server health
   */
  private async checkServerHealth(server: ServerInstance): Promise<void> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`http://${server.host}:${server.port}${this.healthCheckConfig.endpoint}`, {
        method: 'GET',
        timeout: this.healthCheckConfig.timeout
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      if (response.status === this.healthCheckConfig.expectedStatus) {
        if (server.status === 'unhealthy') {
          server.status = 'healthy';
          this.emit('serverRecovered', server);
        }
        
        // Update response time
        server.responseTime = server.responseTime * 0.8 + responseTime * 0.2;
        server.lastHealthCheck = Date.now();
      } else {
        this.markServerUnhealthy(server, `Health check failed: HTTP ${response.status}`);
      }

    } catch (error) {
      this.markServerUnhealthy(server, `Health check failed: ${error}`);
    }
  }

  /**
   * Mark server as unhealthy
   */
  private markServerUnhealthy(server: ServerInstance, reason: string): void {
    if (server.status === 'healthy') {
      server.status = 'unhealthy';
      this.emit('serverUnhealthy', { server, reason });
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
      this.checkAutoScaling();
    }, 60000); // Every minute
  }

  /**
   * Update load balancer metrics
   */
  private updateMetrics(): void {
    this.metrics.totalRequests = this.metrics.successfulRequests + this.metrics.failedRequests;
    
    // Calculate requests per second (simplified)
    const totalRequests = Array.from(this.metrics.serverMetrics.values())
      .reduce((sum, metrics) => sum + metrics.requests, 0);
    this.metrics.requestsPerSecond = totalRequests / 60; // Per minute / 60

    // Calculate average response time
    const serverResponseTimes = Array.from(this.metrics.serverMetrics.values())
      .map(metrics => metrics.responseTime)
      .filter(time => time > 0);
    
    this.metrics.averageResponseTime = serverResponseTimes.length > 0 ?
      serverResponseTimes.reduce((sum, time) => sum + time, 0) / serverResponseTimes.length : 0;

    this.emit('metricsUpdated', this.metrics);
  }

  /**
   * Update server-specific metrics
   */
  private updateServerMetrics(serverId: string, type: 'request' | 'error'): void {
    const serverMetrics = this.metrics.serverMetrics.get(serverId);
    if (serverMetrics) {
      if (type === 'request') {
        serverMetrics.requests++;
      } else if (type === 'error') {
        serverMetrics.errors++;
      }
    }
  }

  /**
   * Check auto-scaling conditions
   */
  private checkAutoScaling(): void {
    if (!this.autoScalingConfig.enabled) return;

    const now = Date.now();
    const healthyServers = Array.from(this.servers.values()).filter(s => s.status === 'healthy');
    
    // Check if we need to scale up
    const shouldScaleUp = this.shouldScaleUp(healthyServers);
    const shouldScaleDown = this.shouldScaleDown(healthyServers);

    if (shouldScaleUp && (now - this.lastScaleAction) > this.autoScalingConfig.scaleUpCooldown) {
      this.scaleUp();
      this.lastScaleAction = now;
    } else if (shouldScaleDown && (now - this.lastScaleAction) > this.autoScalingConfig.scaleDownCooldown) {
      this.scaleDown();
      this.lastScaleAction = now;
    }
  }

  /**
   * Check if should scale up
   */
  private shouldScaleUp(healthyServers: ServerInstance[]): boolean {
    if (healthyServers.length >= this.autoScalingConfig.maxInstances) return false;

    // Check various metrics
    const avgResponseTime = this.metrics.averageResponseTime;
    const errorRate = this.metrics.totalRequests > 0 ? 
      this.metrics.failedRequests / this.metrics.totalRequests : 0;

    const avgConnectionUtilization = healthyServers.length > 0 ?
      healthyServers.reduce((sum, server) => sum + (server.currentConnections / server.maxConnections), 0) / healthyServers.length : 0;

    return (
      avgResponseTime > this.autoScalingConfig.metrics.responseTimeThreshold ||
      errorRate > this.autoScalingConfig.metrics.errorRateThreshold ||
      avgConnectionUtilization > 0.8
    );
  }

  /**
   * Check if should scale down
   */
  private shouldScaleDown(healthyServers: ServerInstance[]): boolean {
    if (healthyServers.length <= this.autoScalingConfig.minInstances) return false;

    const avgConnectionUtilization = healthyServers.length > 0 ?
      healthyServers.reduce((sum, server) => sum + (server.currentConnections / server.maxConnections), 0) / healthyServers.length : 0;

    return avgConnectionUtilization < 0.3 && this.metrics.averageResponseTime < 200;
  }

  /**
   * Scale up (add new server instance)
   */
  private scaleUp(): void {
    this.emit('scaleUpRequested', {
      currentInstances: this.servers.size,
      targetInstances: this.servers.size + 1
    });
    
    // In a real implementation, this would trigger cloud provider APIs
    // to launch new instances
  }

  /**
   * Scale down (remove server instance)
   */
  private scaleDown(): void {
    const healthyServers = Array.from(this.servers.values()).filter(s => s.status === 'healthy');
    
    if (healthyServers.length > this.autoScalingConfig.minInstances) {
      // Find server with least connections to remove
      const serverToRemove = healthyServers.reduce((least, current) => 
        current.currentConnections < least.currentConnections ? current : least
      );

      this.emit('scaleDownRequested', {
        currentInstances: this.servers.size,
        targetInstances: this.servers.size - 1,
        serverToRemove: serverToRemove.id
      });

      // Mark for removal
      this.removeServer(serverToRemove.id);
    }
  }

  /**
   * Set load balancing strategy
   */
  setStrategy(strategyName: string): void {
    if (!this.strategies.has(strategyName)) {
      throw new Error(`Unknown strategy: ${strategyName}`);
    }
    
    this.currentStrategy = strategyName;
    this.emit('strategyChanged', { strategy: strategyName });
  }

  /**
   * Get current metrics
   */
  getMetrics(): LoadBalancerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get server status
   */
  getServerStatus(): ServerInstance[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get available strategies
   */
  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Update auto-scaling configuration
   */
  updateAutoScalingConfig(config: Partial<AutoScalingConfig>): void {
    this.autoScalingConfig = { ...this.autoScalingConfig, ...config };
    this.emit('autoScalingConfigUpdated', this.autoScalingConfig);
  }

  /**
   * Stop load balancer
   */
  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    this.emit('stopped');
  }
}

// Export singleton instance
export const loadBalancingService = new LoadBalancingService();
export default LoadBalancingService;