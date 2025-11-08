/**
 * Service Worker Config and Health Check Manager
 */

export const ServiceWorkerConfig = {
  // Cache names with versioning
  CACHE_NAMES: {
    static: 'linkdao-static-v1',
    dynamic: 'linkdao-dynamic-v1',
    api: 'linkdao-api-v1',
    offline: 'linkdao-offline-v1'
  },

  // API endpoints and their fallbacks
  ENDPOINTS: {
    api: [
      'https://api.linkdao.io',
      'https://api-backup.linkdao.io',
      'https://api-fallback.linkdao.io'
    ],
    websocket: [
      'wss://api.linkdao.io/socket.io',
      'wss://ws.linkdao.io/socket.io',
      'wss://realtime.linkdao.io/socket.io'
    ]
  },

  // Health check configuration
  HEALTH_CHECK: {
    interval: 30000, // 30 seconds
    timeout: 5000,   // 5 seconds
    endpoints: ['/health', '/api/health', '/api/status'],
    maxFailures: 3
  },

  // Circuit breaker settings
  CIRCUIT_BREAKER: {
    failureThreshold: 5,
    resetTimeout: 60000,
    halfOpenTimeout: 30000
  },

  // Cache settings
  CACHE_SETTINGS: {
    staticMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    dynamicMaxAge: 60 * 60 * 1000,         // 1 hour
    apiMaxAge: 5 * 60 * 1000               // 5 minutes
  }
};

/**
 * Health Check Service
 * Monitors API and WebSocket endpoint health
 */
export class HealthCheckService {
  private static instance: HealthCheckService;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private endpointFailures: Map<string, number> = new Map();
  private currentEndpoints: Map<string, string> = new Map();
  
  private constructor() {
    // Initialize with primary endpoints
    Object.entries(ServiceWorkerConfig.ENDPOINTS).forEach(([service, endpoints]) => {
      this.currentEndpoints.set(service, endpoints[0]);
    });
  }

  static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  public startHealthCheck(): void {
    if (this.healthCheckInterval) {
      return;
    }

    this.healthCheckInterval = setInterval(
      () => this.checkEndpointHealth(),
      ServiceWorkerConfig.HEALTH_CHECK.interval
    );
  }

  public stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private async checkEndpointHealth(): Promise<void> {
    for (const [service, endpoints] of Object.entries(ServiceWorkerConfig.ENDPOINTS)) {
      const currentEndpoint = this.currentEndpoints.get(service) || endpoints[0];
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          ServiceWorkerConfig.HEALTH_CHECK.timeout
        );

        const response = await fetch(`${currentEndpoint}/health`, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Health check failed: ${response.status}`);
        }

        // Reset failures on successful health check
        this.endpointFailures.set(service, 0);
        this.emit('endpointHealthy', { service, endpoint: currentEndpoint });

      } catch (error) {
        this.handleEndpointFailure(service, currentEndpoint, endpoints);
      }
    }
  }

  private handleEndpointFailure(
    service: string,
    currentEndpoint: string,
    availableEndpoints: string[]
  ): void {
    const failures = (this.endpointFailures.get(service) || 0) + 1;
    this.endpointFailures.set(service, failures);

    if (failures >= ServiceWorkerConfig.HEALTH_CHECK.maxFailures) {
      // Switch to next endpoint
      const currentIndex = availableEndpoints.indexOf(currentEndpoint);
      const nextIndex = (currentIndex + 1) % availableEndpoints.length;
      const nextEndpoint = availableEndpoints[nextIndex];

      this.currentEndpoints.set(service, nextEndpoint);
      this.endpointFailures.set(service, 0);

      this.emit('endpointSwitch', {
        service,
        oldEndpoint: currentEndpoint,
        newEndpoint: nextEndpoint
      });
    }

    this.emit('endpointUnhealthy', {
      service,
      endpoint: currentEndpoint,
      failures
    });
  }

  private listeners: { [key: string]: Function[] } = {};

  public on(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners[event] || [];
    callbacks.forEach(callback => callback(data));
  }

  public getCurrentEndpoint(service: string): string | undefined {
    return this.currentEndpoints.get(service);
  }

  public getEndpointHealth(service: string): {
    endpoint: string;
    failures: number;
    isHealthy: boolean;
  } {
    const endpoint = this.currentEndpoints.get(service) || '';
    const failures = this.endpointFailures.get(service) || 0;
    return {
      endpoint,
      failures,
      isHealthy: failures < ServiceWorkerConfig.HEALTH_CHECK.maxFailures
    };
  }
}

export default {
  ServiceWorkerConfig,
  HealthCheckService
};