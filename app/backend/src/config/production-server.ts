import express from 'express';
import { safeLogger } from '../utils/safeLogger';
import https from 'https';
import http from 'http';
import { APIGatewayManager } from './api-gateway';
import { getSecurityManager } from './ssl-security';
import { initializeRedis, closeRedis } from './redis-production';
import { getLoadBalancerManager } from './load-balancer';
import dotenv from 'dotenv';

dotenv.config();

interface ProductionServerConfig {
  port: number;
  sslPort: number;
  host: string;
  environment: string;
  gracefulShutdownTimeout: number;
  cluster: {
    enabled: boolean;
    workers: number;
  };
}

class ProductionServerManager {
  private app: express.Application;
  private httpServer: http.Server | null = null;
  private httpsServer: https.Server | null = null;
  private config: ProductionServerConfig;
  private gatewayManager: APIGatewayManager;
  private isShuttingDown: boolean = false;

  constructor() {
    this.app = express();
    this.config = this.loadConfiguration();
    this.gatewayManager = new APIGatewayManager(this.app);
  }

  private loadConfiguration(): ProductionServerConfig {
    return {
      port: parseInt(process.env.PORT || '10000'),
      sslPort: parseInt(process.env.SSL_PORT || '443'),
      host: process.env.HOST || '0.0.0.0',
      environment: process.env.NODE_ENV || 'production',
      gracefulShutdownTimeout: parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT || '30000'),
      cluster: {
        enabled: process.env.CLUSTER_ENABLED === 'true',
        workers: parseInt(process.env.CLUSTER_WORKERS || '0') || require('os').cpus().length
      }
    };
  }

  async initialize(): Promise<void> {
    safeLogger.info('🚀 Initializing Production Server...');
    safeLogger.info(`📊 Environment: ${this.config.environment}`);
    safeLogger.info(`🏠 Host: ${this.config.host}`);
    safeLogger.info(`🔌 HTTP Port: ${this.config.port}`);

    try {
      // Initialize Redis connection
      safeLogger.info('1️⃣ Initializing Redis...');
      await initializeRedis();

      // Setup API Gateway middleware
      safeLogger.info('2️⃣ Setting up API Gateway...');
      this.gatewayManager.setupMiddleware();
      this.gatewayManager.setupHealthChecks();

      // Setup load balancer if enabled
      if (process.env.LB_ENABLED === 'true') {
        safeLogger.info('3️⃣ Setting up Load Balancer...');
        const loadBalancer = getLoadBalancerManager();
        this.app.use(loadBalancer.connectionTrackingMiddleware());
      }

      // Setup application routes
      safeLogger.info('4️⃣ Setting up application routes...');
      await this.setupRoutes();

      // Setup error handling (must be last)
      safeLogger.info('5️⃣ Setting up error handling...');
      this.gatewayManager.setupErrorHandling();

      // Setup graceful shutdown handlers
      this.setupGracefulShutdown();

      safeLogger.info('✅ Production server initialization complete');

    } catch (error) {
      safeLogger.error('💥 Failed to initialize production server:', error);
      throw error;
    }
  }

  private async setupRoutes(): Promise<void> {
    // Setup monitoring integration first
    safeLogger.info('4️⃣a Setting up monitoring integration...');
    const { getMonitoringIntegrationService } = await import('../monitoring/monitoring-integration');
    const monitoringService = getMonitoringIntegrationService();
    
    // Setup monitoring middleware
    monitoringService.setupMiddleware(this.app);
    
    // Setup monitoring routes
    monitoringService.setupMonitoringRoutes(this.app);
    
    // Import and setup your application routes here
    // This is where you'd import your actual API routes
    
    // Example route imports (adjust based on your actual route structure)
    try {
      // Health check routes are already set up by gatewayManager
      
      // Import marketplace API routes
      const { default: sellerRoutes } = await import('../routes/sellerProfileRoutes');
      const { default: listingRoutes } = await import('../routes/marketplaceListingsRoutes');
      const { default: authRoutes } = await import('../routes/authenticationRoutes');
      const { default: reputationRoutes } = await import('../routes/reputationRoutes');
      const { default: healthRoutes } = await import('../routes/healthRoutes');

      // Mount routes
      this.app.use('/api/marketplace/seller', sellerRoutes);
      this.app.use('/api/marketplace/listings', listingRoutes);
      this.app.use('/marketplace/listings', listingRoutes); // Alternative path
      this.app.use('/api/auth', authRoutes);
      this.app.use('/marketplace/reputation', reputationRoutes);
      this.app.use('/health', healthRoutes);

      safeLogger.info('✅ Application routes configured');

    } catch (error) {
      safeLogger.warn('⚠️ Some routes could not be loaded:', error);
      // Continue with basic health check functionality
    }
  }

  async start(): Promise<void> {
    try {
      // Start HTTP server
      await this.startHTTPServer();

      // Start HTTPS server if SSL is enabled
      const securityManager = getSecurityManager();
      if (securityManager.isSSLEnabled()) {
        await this.startHTTPSServer();
      }

      safeLogger.info('🎉 Production server started successfully!');
      this.logServerInfo();

    } catch (error) {
      safeLogger.error('💥 Failed to start production server:', error);
      throw error;
    }
  }

  private async startHTTPServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer(this.app);

      this.httpServer.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${this.config.port} is already in use`));
        } else {
          reject(error);
        }
      });

      this.httpServer.listen(this.config.port, this.config.host, () => {
        safeLogger.info(`🌐 HTTP server listening on ${this.config.host}:${this.config.port}`);
        resolve();
      });
    });
  }

  private async startHTTPSServer(): Promise<void> {
    const securityManager = getSecurityManager();
    const sslOptions = securityManager.getSSLOptions();

    if (!sslOptions) {
      safeLogger.warn('⚠️ SSL enabled but no valid certificates found');
      return;
    }

    return new Promise((resolve, reject) => {
      this.httpsServer = https.createServer(sslOptions, this.app);

      this.httpsServer.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`SSL port ${this.config.sslPort} is already in use`));
        } else {
          reject(error);
        }
      });

      this.httpsServer.listen(this.config.sslPort, this.config.host, () => {
        safeLogger.info(`🔒 HTTPS server listening on ${this.config.host}:${this.config.sslPort}`);
        resolve();
      });
    });
  }

  private logServerInfo(): void {
    safeLogger.info('\n📋 Server Information:');
    safeLogger.info('======================');
    safeLogger.info(`Environment: ${this.config.environment}`);
    safeLogger.info(`HTTP URL: http://${this.config.host}:${this.config.port}`);
    
    if (this.httpsServer) {
      safeLogger.info(`HTTPS URL: https://${this.config.host}:${this.config.sslPort}`);
    }
    
    safeLogger.info(`Process ID: ${process.pid}`);
    safeLogger.info(`Node.js Version: ${process.version}`);
    safeLogger.info(`Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);
    
    // Load balancer info
    if (process.env.LB_ENABLED === 'true') {
      const loadBalancer = getLoadBalancerManager();
      const status = loadBalancer.getStatus();
      safeLogger.info(`Load Balancer: ${status.algorithm} (${status.healthyServers}/${status.totalServers} healthy)`);
    }
    
    safeLogger.info('\n🔗 Available Endpoints:');
    safeLogger.info('  GET  /health - Basic health check');
    safeLogger.info('  GET  /health/detailed - Detailed health check');
    safeLogger.info('  GET  /api/marketplace/seller/{walletAddress} - Get seller profile');
    safeLogger.info('  POST /api/marketplace/seller/profile - Create/update seller profile');
    safeLogger.info('  GET  /marketplace/listings - Get marketplace listings');
    safeLogger.info('  POST /api/auth/wallet - Authenticate wallet');
    safeLogger.info('  GET  /marketplace/reputation/{walletAddress} - Get reputation');
    safeLogger.info('');
  }

  private setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, () => {
        safeLogger.info(`\n🛑 Received ${signal}, starting graceful shutdown...`);
        this.gracefulShutdown();
      });
    });

    process.on('uncaughtException', (error) => {
      safeLogger.error('💥 Uncaught Exception:', error);
      this.gracefulShutdown(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      safeLogger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown(1);
    });
  }

  private async gracefulShutdown(exitCode: number = 0): Promise<void> {
    if (this.isShuttingDown) {
      safeLogger.info('⚠️ Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    safeLogger.info('🛑 Starting graceful shutdown...');

    const shutdownTimeout = setTimeout(() => {
      safeLogger.error('⏰ Graceful shutdown timeout, forcing exit');
      process.exit(1);
    }, this.config.gracefulShutdownTimeout);

    try {
      // Stop accepting new connections
      if (this.httpServer) {
        safeLogger.info('1️⃣ Closing HTTP server...');
        await this.closeServer(this.httpServer);
      }

      if (this.httpsServer) {
        safeLogger.info('2️⃣ Closing HTTPS server...');
        await this.closeServer(this.httpsServer);
      }

      // Close load balancer
      if (process.env.LB_ENABLED === 'true') {
        safeLogger.info('3️⃣ Shutting down load balancer...');
        const loadBalancer = getLoadBalancerManager();
        await loadBalancer.shutdown();
      }

      // Close monitoring services
      safeLogger.info('4️⃣ Shutting down monitoring services...');
      try {
        const { getMonitoringIntegrationService } = await import('../monitoring/monitoring-integration');
        const monitoringService = getMonitoringIntegrationService();
        await monitoringService.shutdown();
      } catch (error) {
        safeLogger.warn('⚠️ Error shutting down monitoring services:', error);
      }

      // Close Redis connection
      safeLogger.info('5️⃣ Closing Redis connection...');
      await closeRedis();

      // Clear shutdown timeout
      clearTimeout(shutdownTimeout);

      safeLogger.info('✅ Graceful shutdown completed');
      process.exit(exitCode);

    } catch (error) {
      safeLogger.error('💥 Error during graceful shutdown:', error);
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  }

  private closeServer(server: http.Server | https.Server): Promise<void> {
    return new Promise((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  }

  getApp(): express.Application {
    return this.app;
  }

  getConfig(): ProductionServerConfig {
    return this.config;
  }

  isRunning(): boolean {
    return !this.isShuttingDown && (
      (this.httpServer && this.httpServer.listening) ||
      (this.httpsServer && this.httpsServer.listening)
    );
  }
}

// Export singleton instance
let productionServerManager: ProductionServerManager | null = null;

export function getProductionServerManager(): ProductionServerManager {
  if (!productionServerManager) {
    productionServerManager = new ProductionServerManager();
  }
  return productionServerManager;
}

export async function startProductionServer(): Promise<ProductionServerManager> {
  const serverManager = getProductionServerManager();
  await serverManager.initialize();
  await serverManager.start();
  return serverManager;
}

export { ProductionServerManager, ProductionServerConfig };
