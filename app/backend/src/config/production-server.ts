import express from 'express';
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
    console.log('🚀 Initializing Production Server...');
    console.log(`📊 Environment: ${this.config.environment}`);
    console.log(`🏠 Host: ${this.config.host}`);
    console.log(`🔌 HTTP Port: ${this.config.port}`);

    try {
      // Initialize Redis connection
      console.log('1️⃣ Initializing Redis...');
      await initializeRedis();

      // Setup API Gateway middleware
      console.log('2️⃣ Setting up API Gateway...');
      this.gatewayManager.setupMiddleware();
      this.gatewayManager.setupHealthChecks();

      // Setup load balancer if enabled
      if (process.env.LB_ENABLED === 'true') {
        console.log('3️⃣ Setting up Load Balancer...');
        const loadBalancer = getLoadBalancerManager();
        this.app.use(loadBalancer.connectionTrackingMiddleware());
      }

      // Setup application routes
      console.log('4️⃣ Setting up application routes...');
      await this.setupRoutes();

      // Setup error handling (must be last)
      console.log('5️⃣ Setting up error handling...');
      this.gatewayManager.setupErrorHandling();

      // Setup graceful shutdown handlers
      this.setupGracefulShutdown();

      console.log('✅ Production server initialization complete');

    } catch (error) {
      console.error('💥 Failed to initialize production server:', error);
      throw error;
    }
  }

  private async setupRoutes(): Promise<void> {
    // Setup monitoring integration first
    console.log('4️⃣a Setting up monitoring integration...');
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

      console.log('✅ Application routes configured');

    } catch (error) {
      console.warn('⚠️ Some routes could not be loaded:', error);
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

      console.log('🎉 Production server started successfully!');
      this.logServerInfo();

    } catch (error) {
      console.error('💥 Failed to start production server:', error);
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
        console.log(`🌐 HTTP server listening on ${this.config.host}:${this.config.port}`);
        resolve();
      });
    });
  }

  private async startHTTPSServer(): Promise<void> {
    const securityManager = getSecurityManager();
    const sslOptions = securityManager.getSSLOptions();

    if (!sslOptions) {
      console.warn('⚠️ SSL enabled but no valid certificates found');
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
        console.log(`🔒 HTTPS server listening on ${this.config.host}:${this.config.sslPort}`);
        resolve();
      });
    });
  }

  private logServerInfo(): void {
    console.log('\n📋 Server Information:');
    console.log('======================');
    console.log(`Environment: ${this.config.environment}`);
    console.log(`HTTP URL: http://${this.config.host}:${this.config.port}`);
    
    if (this.httpsServer) {
      console.log(`HTTPS URL: https://${this.config.host}:${this.config.sslPort}`);
    }
    
    console.log(`Process ID: ${process.pid}`);
    console.log(`Node.js Version: ${process.version}`);
    console.log(`Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);
    
    // Load balancer info
    if (process.env.LB_ENABLED === 'true') {
      const loadBalancer = getLoadBalancerManager();
      const status = loadBalancer.getStatus();
      console.log(`Load Balancer: ${status.algorithm} (${status.healthyServers}/${status.totalServers} healthy)`);
    }
    
    console.log('\n🔗 Available Endpoints:');
    console.log('  GET  /health - Basic health check');
    console.log('  GET  /health/detailed - Detailed health check');
    console.log('  GET  /api/marketplace/seller/{walletAddress} - Get seller profile');
    console.log('  POST /api/marketplace/seller/profile - Create/update seller profile');
    console.log('  GET  /marketplace/listings - Get marketplace listings');
    console.log('  POST /api/auth/wallet - Authenticate wallet');
    console.log('  GET  /marketplace/reputation/{walletAddress} - Get reputation');
    console.log('');
  }

  private setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, () => {
        console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);
        this.gracefulShutdown();
      });
    });

    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      this.gracefulShutdown(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown(1);
    });
  }

  private async gracefulShutdown(exitCode: number = 0): Promise<void> {
    if (this.isShuttingDown) {
      console.log('⚠️ Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    console.log('🛑 Starting graceful shutdown...');

    const shutdownTimeout = setTimeout(() => {
      console.error('⏰ Graceful shutdown timeout, forcing exit');
      process.exit(1);
    }, this.config.gracefulShutdownTimeout);

    try {
      // Stop accepting new connections
      if (this.httpServer) {
        console.log('1️⃣ Closing HTTP server...');
        await this.closeServer(this.httpServer);
      }

      if (this.httpsServer) {
        console.log('2️⃣ Closing HTTPS server...');
        await this.closeServer(this.httpsServer);
      }

      // Close load balancer
      if (process.env.LB_ENABLED === 'true') {
        console.log('3️⃣ Shutting down load balancer...');
        const loadBalancer = getLoadBalancerManager();
        await loadBalancer.shutdown();
      }

      // Close monitoring services
      console.log('4️⃣ Shutting down monitoring services...');
      try {
        const { getMonitoringIntegrationService } = await import('../monitoring/monitoring-integration');
        const monitoringService = getMonitoringIntegrationService();
        await monitoringService.shutdown();
      } catch (error) {
        console.warn('⚠️ Error shutting down monitoring services:', error);
      }

      // Close Redis connection
      console.log('5️⃣ Closing Redis connection...');
      await closeRedis();

      // Clear shutdown timeout
      clearTimeout(shutdownTimeout);

      console.log('✅ Graceful shutdown completed');
      process.exit(exitCode);

    } catch (error) {
      console.error('💥 Error during graceful shutdown:', error);
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