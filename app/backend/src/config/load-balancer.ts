import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();

interface ServerInstance {
  id: string;
  host: string;
  port: number;
  weight: number;
  healthy: boolean;
  connections: number;
  lastHealthCheck: Date;
  responseTime: number;
}

interface LoadBalancerConfig {
  algorithm: 'round-robin' | 'least-connections' | 'weighted-round-robin' | 'ip-hash';
  healthCheck: {
    enabled: boolean;
    interval: number;
    timeout: number;
    path: string;
    expectedStatus: number;
  };
  sticky: {
    enabled: boolean;
    cookieName: string;
    ttl: number;
  };
  failover: {
    enabled: boolean;
    maxRetries: number;
    retryDelay: number;
  };
}

class LoadBalancerManager {
  private servers: ServerInstance[] = [];
  private config: LoadBalancerConfig;
  private currentIndex: number = 0;
  private stickySessions: Map<string, string> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.config = this.loadConfiguration();
    this.initializeServers();
    this.startHealthChecks();
  }

  private loadConfiguration(): LoadBalancerConfig {
    return {
      algorithm: (process.env.LB_ALGORITHM as any) || 'round-robin',
      healthCheck: {
        enabled: process.env.LB_HEALTH_CHECK_ENABLED !== 'false',
        interval: parseInt(process.env.LB_HEALTH_CHECK_INTERVAL || '30000'), // 30 seconds
        timeout: parseInt(process.env.LB_HEALTH_CHECK_TIMEOUT || '5000'), // 5 seconds
        path: process.env.LB_HEALTH_CHECK_PATH || '/health',
        expectedStatus: parseInt(process.env.LB_HEALTH_CHECK_STATUS || '200')
      },
      sticky: {
        enabled: process.env.LB_STICKY_SESSIONS === 'true',
        cookieName: process.env.LB_STICKY_COOKIE_NAME || 'lb-session',
        ttl: parseInt(process.env.LB_STICKY_TTL || '3600000') // 1 hour
      },
      failover: {
        enabled: process.env.LB_FAILOVER_ENABLED !== 'false',
        maxRetries: parseInt(process.env.LB_MAX_RETRIES || '3'),
        retryDelay: parseInt(process.env.LB_RETRY_DELAY || '1000') // 1 second
      }
    };
  }

  private initializeServers(): void {
    const serverList = process.env.LB_SERVERS || 'localhost:10000:1';
    
    this.servers = serverList.split(',').map((serverConfig, index) => {
      const [host, port, weight = '1'] = serverConfig.trim().split(':');
      
      return {
        id: `server-${index}`,
        host: host || 'localhost',
        port: parseInt(port) || 10000,
        weight: parseInt(weight) || 1,
        healthy: true,
        connections: 0,
        lastHealthCheck: new Date(),
        responseTime: 0
      };
    });

    console.log(`🔄 Initialized ${this.servers.length} server instances`);
    this.servers.forEach(server => {
      console.log(`  - ${server.id}: ${server.host}:${server.port} (weight: ${server.weight})`);
    });
  }

  private startHealthChecks(): void {
    if (!this.config.healthCheck.enabled) {
      console.log('⚠️ Health checks disabled');
      return;
    }

    console.log(`🏥 Starting health checks every ${this.config.healthCheck.interval}ms`);
    
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheck.interval);

    // Initial health check
    this.performHealthChecks();
  }

  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = this.servers.map(server => this.checkServerHealth(server));
    await Promise.allSettled(healthCheckPromises);
    
    const healthyServers = this.servers.filter(s => s.healthy).length;
    const totalServers = this.servers.length;
    
    if (healthyServers === 0) {
      console.error('❌ All servers are unhealthy!');
    } else if (healthyServers < totalServers) {
      console.warn(`⚠️ ${totalServers - healthyServers} servers are unhealthy`);
    }
  }

  private async checkServerHealth(server: ServerInstance): Promise<void> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.healthCheck.timeout);
      
      const response = await fetch(`http://${server.host}:${server.port}${this.config.healthCheck.path}`, {
        signal: controller.signal,
        method: 'GET',
        headers: { 'User-Agent': 'LoadBalancer-HealthCheck/1.0' }
      });
      
      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      const isHealthy = response.status === this.config.healthCheck.expectedStatus;
      
      if (server.healthy !== isHealthy) {
        console.log(`${isHealthy ? '✅' : '❌'} ${server.id} health changed: ${isHealthy ? 'healthy' : 'unhealthy'}`);
      }
      
      server.healthy = isHealthy;
      server.responseTime = responseTime;
      server.lastHealthCheck = new Date();
      
    } catch (error) {
      if (server.healthy) {
        console.log(`❌ ${server.id} became unhealthy: ${error}`);
      }
      
      server.healthy = false;
      server.responseTime = Date.now() - startTime;
      server.lastHealthCheck = new Date();
    }
  }

  getNextServer(req: Request): ServerInstance | null {
    const healthyServers = this.servers.filter(s => s.healthy);
    
    if (healthyServers.length === 0) {
      return null;
    }

    // Handle sticky sessions
    if (this.config.sticky.enabled) {
      const sessionId = this.getSessionId(req);
      if (sessionId && this.stickySessions.has(sessionId)) {
        const serverId = this.stickySessions.get(sessionId)!;
        const server = healthyServers.find(s => s.id === serverId);
        if (server) {
          return server;
        }
      }
    }

    let selectedServer: ServerInstance;

    switch (this.config.algorithm) {
      case 'round-robin':
        selectedServer = this.roundRobinSelection(healthyServers);
        break;
      case 'least-connections':
        selectedServer = this.leastConnectionsSelection(healthyServers);
        break;
      case 'weighted-round-robin':
        selectedServer = this.weightedRoundRobinSelection(healthyServers);
        break;
      case 'ip-hash':
        selectedServer = this.ipHashSelection(healthyServers, req);
        break;
      default:
        selectedServer = this.roundRobinSelection(healthyServers);
    }

    // Set sticky session if enabled
    if (this.config.sticky.enabled) {
      const sessionId = this.getSessionId(req) || this.generateSessionId();
      this.stickySession.set(sessionId, selectedServer.id);
      
      // Clean up expired sessions
      this.cleanupExpiredSessions();
    }

    return selectedServer;
  }

  private roundRobinSelection(servers: ServerInstance[]): ServerInstance {
    const server = servers[this.currentIndex % servers.length];
    this.currentIndex = (this.currentIndex + 1) % servers.length;
    return server;
  }

  private leastConnectionsSelection(servers: ServerInstance[]): ServerInstance {
    return servers.reduce((min, server) => 
      server.connections < min.connections ? server : min
    );
  }

  private weightedRoundRobinSelection(servers: ServerInstance[]): ServerInstance {
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

  private ipHashSelection(servers: ServerInstance[], req: Request): ServerInstance {
    const clientIP = this.getClientIP(req);
    const hash = this.hashString(clientIP);
    const index = hash % servers.length;
    return servers[index];
  }

  private getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           req.headers['x-real-ip'] as string ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           '127.0.0.1';
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

  private getSessionId(req: Request): string | null {
    return req.cookies?.[this.config.sticky.cookieName] || null;
  }

  private generateSessionId(): string {
    return `lb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];
    
    this.stickySession.forEach((serverId, sessionId) => {
      // This is simplified - in production, you'd track session timestamps
      if (Math.random() < 0.01) { // Randomly clean up 1% of sessions
        expiredSessions.push(sessionId);
      }
    });
    
    expiredSessions.forEach(sessionId => {
      this.stickySession.delete(sessionId);
    });
  }

  // Middleware for connection tracking
  connectionTrackingMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const server = this.getNextServer(req);
      
      if (!server) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'No healthy servers available',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Track connection
      server.connections++;
      req.headers['x-lb-server'] = server.id;
      req.headers['x-lb-server-host'] = `${server.host}:${server.port}`;

      // Clean up on response finish
      res.on('finish', () => {
        server.connections = Math.max(0, server.connections - 1);
      });

      next();
    };
  }

  // Get load balancer status
  getStatus() {
    const healthyServers = this.servers.filter(s => s.healthy);
    const totalConnections = this.servers.reduce((sum, s) => sum + s.connections, 0);
    
    return {
      algorithm: this.config.algorithm,
      totalServers: this.servers.length,
      healthyServers: healthyServers.length,
      totalConnections,
      stickySession: this.stickySession.size,
      servers: this.servers.map(server => ({
        id: server.id,
        host: server.host,
        port: server.port,
        healthy: server.healthy,
        connections: server.connections,
        responseTime: server.responseTime,
        lastHealthCheck: server.lastHealthCheck
      }))
    };
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down load balancer...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Wait for connections to drain
    const maxWait = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const totalConnections = this.servers.reduce((sum, s) => sum + s.connections, 0);
      if (totalConnections === 0) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('✅ Load balancer shutdown complete');
  }
}

// Singleton instance
let loadBalancerManager: LoadBalancerManager | null = null;

export function getLoadBalancerManager(): LoadBalancerManager {
  if (!loadBalancerManager) {
    loadBalancerManager = new LoadBalancerManager();
  }
  return loadBalancerManager;
}

export { LoadBalancerManager, LoadBalancerConfig, ServerInstance };