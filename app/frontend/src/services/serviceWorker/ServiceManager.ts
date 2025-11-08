/**
 * Service Initialization and Management
 */

import WebSocketManager from '../websocket/WebSocketManager';
import { HealthCheckService, ServiceWorkerConfig } from './ServiceWorkerConfig';

export class ServiceManager {
  private static instance: ServiceManager;
  private webSocketManager: WebSocketManager | null = null;
  private healthCheckService: HealthCheckService;
  
  private constructor() {
    this.healthCheckService = HealthCheckService.getInstance();
    this.initializeServices();
  }

  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  private async initializeServices(): Promise<void> {
    // Start health checks
    this.healthCheckService.startHealthCheck();

    // Listen for endpoint changes
    this.healthCheckService.on('endpointSwitch', this.handleEndpointSwitch.bind(this));
    this.healthCheckService.on('endpointUnhealthy', this.handleEndpointUnhealthy.bind(this));

    // Initialize WebSocket with first available endpoint
    const wsEndpoint = this.healthCheckService.getCurrentEndpoint('websocket');
    if (wsEndpoint) {
      this.initializeWebSocket(wsEndpoint);
    }

    // Register or update service worker
    await this.registerServiceWorker();
  }

  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                this.handleServiceWorkerActivation();
              }
            });
          }
        });

        console.log('Service Worker registered successfully');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        // Continue without service worker
      }
    }
  }

  private initializeWebSocket(endpoint: string): void {
    const wsConfig = {
      url: endpoint,
      fallbackUrls: ServiceWorkerConfig.ENDPOINTS.websocket.filter(url => url !== endpoint),
      options: {
        reconnectAttempts: 10,
        reconnectInterval: 1000,
        heartbeatInterval: 30000,
        responseTimeout: 5000
      }
    };

    this.webSocketManager = WebSocketManager.getInstance(wsConfig);
    
    // Listen for WebSocket state changes
    this.webSocketManager.on('stateChange', this.handleWebSocketStateChange.bind(this));
  }

  private handleEndpointSwitch(data: { service: string; oldEndpoint: string; newEndpoint: string }): void {
    console.log(`Switching ${data.service} endpoint from ${data.oldEndpoint} to ${data.newEndpoint}`);
    
    if (data.service === 'websocket' && this.webSocketManager) {
      // Reinitialize WebSocket with new endpoint
      this.initializeWebSocket(data.newEndpoint);
    }
  }

  private handleEndpointUnhealthy(data: { service: string; endpoint: string; failures: number }): void {
    console.warn(`${data.service} endpoint ${data.endpoint} is unhealthy. Failures: ${data.failures}`);
  }

  private handleWebSocketStateChange(state: string): void {
    console.log(`WebSocket state changed to: ${state}`);
    
    if (state === 'FAILED') {
      // WebSocket connection failed completely, update health check service
      this.healthCheckService.on('endpointHealthy', (data: { service: string; endpoint: string }) => {
        if (data.service === 'websocket') {
          this.initializeWebSocket(data.endpoint);
        }
      });
    }
  }

  private handleServiceWorkerActivation(): void {
    // Clear old caches
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!Object.values(ServiceWorkerConfig.CACHE_NAMES).includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    });
  }

  public getWebSocketManager(): WebSocketManager | null {
    return this.webSocketManager;
  }

  public getHealthCheckService(): HealthCheckService {
    return this.healthCheckService;
  }

  public async checkServiceHealth(): Promise<{
    websocket: boolean;
    api: boolean;
    serviceWorker: boolean;
  }> {
    const wsHealth = this.webSocketManager?.getState() === 'CONNECTED';
    const apiHealth = this.healthCheckService.getEndpointHealth('api').isHealthy;
    const swHealth = !!(await navigator.serviceWorker?.ready);

    return {
      websocket: wsHealth,
      api: apiHealth,
      serviceWorker: swHealth
    };
  }
}

export default ServiceManager;