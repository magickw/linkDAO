import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

interface ServerInstance {
  id: string;
  host: string;
  port: number;
  weight: number;
  currentConnections: number;
  maxConnections: number;
  healthy: boolean;
  lastHealthCheck: Date;
  responseTime: number;
  cpuUsage: number;
  memoryUsage: number;
  region?: string;
}

interface LoadBalancerConfig {
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
}

interface ScalingMetrics {
  timestamp: Date;
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  cpuUtilization: number;
  memoryUtilization: number;
  activeConnections: number;
}

export class LoadBalancingService extends EventEmitter {
  private servers: Map<string, ServerInstance> = new Map();
  private config: LoadBalancerConfig;
  private currentIndex = 0;
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsHistory: ScalingMetrics[] = [];
  private lastScaleAction?: Date;

  constructor(config: LoadBalancerConfig) {
    super();
    this.config = config;
    this.startHealthChecks();
  }

  // Add server instance
  addServer(server: Omit<ServerInstance, 'currentConnections' | 'healthy' | 'lastHealthCheck' | 'responseTime' | 'cpuUsage' | 'memoryUsage'>): void {
    const instance: ServerInstance = {
      ...server,
      currentConnections: 0,
      healthy: true,
      lastHealthCheck: new Date(),
      responseTime: 0,
      cpuUsage: 0,
      memoryUsage: 0,
    };

    this.servers.set(server.id, instance);
    this.emit('serverAdded', instance);
  }

  // Remove server instance
  removeServer(serverId: string): void {
    const server = this.servers.get(serverId);
    if (server) {
      this.servers.delete(serverId);
      this.emit('serverRemoved', server);
    }
  }

  // Get next server based on load balancing algorithm
  getNextServer(clientIp?: string, region?: string): ServerInstance | null {
    const healthyServers = Array.from(this.servers.values()).filter(s => s.healthy);
    
    if (healthyServers.length === 0) {
      return null;
    }

    switch (this.config.algorithm) {
      case 'round-robin':
        return this.roundRobin(healthyServers);
      
      case 'weighted-round-robin':
        return this.weightedRoundRobin(healthyServers);
      
      case 'least-connections':
        return this.leastConnections(healthyServers);
      
      case 'ip-hash':
        return this.ipHash(healthyServers, clientIp || '');
      
      case 'geographic':
        return this.geographic(healthyServers, region);
      
      default:
        return this.roundRobin(healthyServers);
    }
  }

  // Load balancing algorithms
  private roundRobin(servers: ServerInstance[]): ServerInstance {
    const server = servers[this.currentIndex % servers.length];
    this.currentIndex++;
    return server;
  }

  private weightedRoundRobin(servers: ServerInstance[]): ServerInstance {
    const totalWeight = servers.reduce((sum, server) => sum + server.weight, 0);
    let randomWeight = Math.random() * totalWeight;
    
    for (const server of servers) {
      randomWeight -= server.weight;
      if (randomWeight <= 0) {
        return server;
      }
    }
    
    return servers[0]; // Fallback
  }

  private leastConnections(servers: ServerInstance[]): ServerInstance {
    return servers.reduce((min, server) => 
      server.currentConnections < min.currentConnections ? server : min
    );
  }

  private ipHash(servers: ServerInstance[], clientIp: string): ServerInstance {
    const hash = this.hashString(clientIp);
    const index = hash % servers.length;
    return servers[index];
  }

  private geographic(servers: ServerInstance[], region?: string): ServerInstance {
    if (!region) {
      return this.leastConnections(servers);
    }

    const regionalServers = servers.filter(s => s.region === region);
    if (regionalServers.length > 0) {
      return this.leastConnections(regionalServers);
    }

    return this.leastConnections(servers);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Connection tracking
  incrementConnections(serverId: string): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.currentConnections++;
      this.emit('connectionIncremented', server);
    }
  }

  decrementConnections(serverId: string): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.currentConnections = Math.max(0, server.currentConnections - 1);
      this.emit('connectionDecremented', server);
    }
  }

  // Health checking
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(
      () => this.performHealthChecks(),
      this.config.healthCheck.interval
    );
  }

  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.servers.values()).map(server =>
      this.checkServerHealth(server)
    );

    await Promise.allSettled(healthCheckPromises);
  }

  private async checkServerHealth(server: ServerInstance): Promise<void> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`http://${server.host}:${server.port}${this.config.healthCheck.path}`, {
        method: 'GET',
        timeout: this.config.healthCheck.timeout,
      });

      const responseTime = performance.now() - startTime;
      const wasHealthy = server.healthy;
      
      server.healthy = response.ok;
      server.responseTime = responseTime;
      server.lastHealthCheck = new Date();

      // Get server metrics if available
      if (response.ok) {
        try {
          const metrics = await response.json();
          server.cpuUsage = metrics.cpu || 0;
          server.memoryUsage = metrics.memory || 0;
        } catch (error) {
          // Metrics not available, continue
        }
      }

      if (!wasHealthy && server.healthy) {
        this.emit('serverHealthy', server);
      } else if (wasHealthy && !server.healthy) {
        this.emit('serverUnhealthy', server);
      }

    } catch (error) {
      const wasHealthy = server.healthy;
      server.healthy = false;
      server.lastHealthCheck = new Date();
      
      if (wasHealthy) {
        this.emit('serverUnhealthy', server);
      }
    }
  }

  // Auto-scaling functionality
  async evaluateScaling(): Promise<void> {
    if (!this.config.autoScaling.enabled) {
      return;
    }

    const metrics = this.calculateCurrentMetrics();
    this.metricsHistory.push(metrics);

    // Keep only last 10 minutes of metrics
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    this.metricsHistory = this.metricsHistory.filter(m => m.timestamp > tenMinutesAgo);

    const shouldScale = this.shouldScale(metrics);
    
    if (shouldScale.scaleUp) {
      await this.scaleUp();
    } else if (shouldScale.scaleDown) {
      await this.scaleDown();
    }
  }

  private calculateCurrentMetrics(): ScalingMetrics {
    const servers = Array.from(this.servers.values()).filter(s => s.healthy);
    
    const totalConnections = servers.reduce((sum, s) => sum + s.currentConnections, 0);
    const avgResponseTime = servers.length > 0 
      ? servers.reduce((sum, s) => sum + s.responseTime, 0) / servers.length 
      : 0;
    const avgCpuUsage = servers.length > 0
      ? servers.reduce((sum, s) => sum + s.cpuUsage, 0) / servers.length
      : 0;
    const avgMemoryUsage = servers.length > 0
      ? servers.reduce((sum, s) => sum + s.memoryUsage, 0) / servers.length
      : 0;

    return {
      timestamp: new Date(),
      totalRequests: totalConnections, // Simplified
      averageResponseTime: avgResponseTime,
      errorRate: 0, // Would need to track this separately
      cpuUtilization: avgCpuUsage,
      memoryUtilization: avgMemoryUsage,
      activeConnections: totalConnections,
    };
  }

  private shouldScale(currentMetrics: ScalingMetrics): { scaleUp: boolean; scaleDown: boolean } {
    const now = new Date();
    const cooldownPeriod = this.lastScaleAction 
      ? now.getTime() - this.lastScaleAction.getTime()
      : Infinity;

    const scaleUpCooldown = this.config.autoScaling.scaleUpCooldown;
    const scaleDownCooldown = this.config.autoScaling.scaleDownCooldown;

    // Check if we're in cooldown period
    if (cooldownPeriod < Math.min(scaleUpCooldown, scaleDownCooldown)) {
      return { scaleUp: false, scaleDown: false };
    }

    const healthyServers = Array.from(this.servers.values()).filter(s => s.healthy);
    const currentInstances = healthyServers.length;

    // Scale up conditions
    const shouldScaleUp = (
      currentInstances < this.config.autoScaling.maxInstances &&
      (currentMetrics.cpuUtilization > this.config.autoScaling.targetCpuUtilization ||
       currentMetrics.memoryUtilization > this.config.autoScaling.targetMemoryUtilization) &&
      cooldownPeriod >= scaleUpCooldown
    );

    // Scale down conditions
    const shouldScaleDown = (
      currentInstances > this.config.autoScaling.minInstances &&
      currentMetrics.cpuUtilization < this.config.autoScaling.targetCpuUtilization * 0.5 &&
      currentMetrics.memoryUtilization < this.config.autoScaling.targetMemoryUtilization * 0.5 &&
      cooldownPeriod >= scaleDownCooldown
    );

    return { scaleUp: shouldScaleUp, scaleDown: shouldScaleDown };
  }

  private async scaleUp(): Promise<void> {
    try {
      // This would integrate with cloud provider APIs (AWS, GCP, Azure)
      // For now, emit event for external handling
      this.emit('scaleUp', {
        currentInstances: this.servers.size,
        targetInstances: this.servers.size + 1,
      });

      this.lastScaleAction = new Date();
      console.log('Scaling up: Adding new server instance');
    } catch (error) {
      console.error('Error scaling up:', error);
      this.emit('scalingError', { action: 'scaleUp', error });
    }
  }

  private async scaleDown(): Promise<void> {
    try {
      // Find server with least connections to remove
      const healthyServers = Array.from(this.servers.values()).filter(s => s.healthy);
      const serverToRemove = healthyServers.reduce((min, server) =>
        server.currentConnections < min.currentConnections ? server : min
      );

      if (serverToRemove && serverToRemove.currentConnections === 0) {
        this.emit('scaleDown', {
          currentInstances: this.servers.size,
          targetInstances: this.servers.size - 1,
          serverToRemove: serverToRemove.id,
        });

        this.lastScaleAction = new Date();
        console.log(`Scaling down: Removing server ${serverToRemove.id}`);
      }
    } catch (error) {
      console.error('Error scaling down:', error);
      this.emit('scalingError', { action: 'scaleDown', error });
    }
  }

  // Monitoring and statistics
  getServerStats(): Array<ServerInstance & { utilizationScore: number }> {
    return Array.from(this.servers.values()).map(server => ({
      ...server,
      utilizationScore: this.calculateUtilizationScore(server),
    }));
  }

  private calculateUtilizationScore(server: ServerInstance): number {
    const connectionRatio = server.currentConnections / server.maxConnections;
    const cpuRatio = server.cpuUsage / 100;
    const memoryRatio = server.memoryUsage / 100;
    
    return (connectionRatio + cpuRatio + memoryRatio) / 3;
  }

  getLoadBalancerStats(): {
    totalServers: number;
    healthyServers: number;
    totalConnections: number;
    averageResponseTime: number;
    algorithm: string;
  } {
    const servers = Array.from(this.servers.values());
    const healthyServers = servers.filter(s => s.healthy);
    
    return {
      totalServers: servers.length,
      healthyServers: healthyServers.length,
      totalConnections: servers.reduce((sum, s) => sum + s.currentConnections, 0),
      averageResponseTime: healthyServers.length > 0
        ? healthyServers.reduce((sum, s) => sum + s.responseTime, 0) / healthyServers.length
        : 0,
      algorithm: this.config.algorithm,
    };
  }

  getMetricsHistory(): ScalingMetrics[] {
    return [...this.metricsHistory];
  }

  // Circuit breaker functionality
  private circuitBreakers = new Map<string, CircuitBreaker>();

  getCircuitBreaker(serverId: string): CircuitBreaker {
    if (!this.circuitBreakers.has(serverId)) {
      this.circuitBreakers.set(serverId, new CircuitBreaker({
        failureThreshold: 5,
        recoveryTimeout: 60000,
        monitoringPeriod: 10000,
      }));
    }
    return this.circuitBreakers.get(serverId)!;
  }

  // Cleanup
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.removeAllListeners();
  }
}

// Circuit breaker implementation
class CircuitBreaker extends EventEmitter {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime?: Date;
  private config: {
    failureThreshold: number;
    recoveryTimeout: number;
    monitoringPeriod: number;
  };

  constructor(config: { failureThreshold: number; recoveryTimeout: number; monitoringPeriod: number }) {
    super();
    this.config = config;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
        this.emit('halfOpen');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.emit('closed');
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.emit('opened');
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    
    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.config.recoveryTimeout;
  }

  getState(): string {
    return this.state;
  }

  getStats(): { state: string; failureCount: number; lastFailureTime?: Date } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}