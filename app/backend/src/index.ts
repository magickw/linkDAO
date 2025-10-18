import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import './types';

// Load environment variables
dotenv.config();

// Import security configuration and middleware
import { validateSecurityConfig } from './config/securityConfig';
import {
  corsMiddleware,
  helmetMiddleware,
  ddosProtection,
  requestFingerprinting,
  inputValidation,
  threatDetection,
  securityAuditLogging,
  fileUploadSecurity,
  apiRateLimit,
} from './middleware/securityMiddleware';

// Import new marketplace infrastructure
import { 
  requestLoggingMiddleware, 
  performanceMonitoringMiddleware,
  requestSizeMonitoringMiddleware,
  errorCorrelationMiddleware,
  healthCheckExclusionMiddleware
} from './middleware/requestLogging';
import { globalErrorHandler, notFoundHandler } from './middleware/globalErrorHandler';
import { metricsTrackingMiddleware } from './middleware/metricsMiddleware';
import { marketplaceSecurity, generalRateLimit } from './middleware/marketplaceSecurity';

// Import services
import { initializeWebSocket, shutdownWebSocket } from './services/webSocketService';
import { initializeAdminWebSocket, shutdownAdminWebSocket } from './services/adminWebSocketService';

// Use dynamic imports to avoid circular dependencies
let cacheService: any = null;
let cacheWarmingService: any = null;

async function initializeServices() {
  if (!cacheService) {
    try {
      // Explicitly import the JavaScript version
      const cacheModule: any = await import('./services/cacheService.js');
      if (cacheModule.default) {
        // If it's a class, we need to create an instance
        if (typeof cacheModule.default === 'function') {
          cacheService = new cacheModule.default();
        } else {
          cacheService = cacheModule.default;
        }
      }
    } catch (error) {
      console.error('Failed to import cacheService:', error);
    }
  }
  
  if (!cacheWarmingService) {
    try {
      const warmingModule: any = await import('./services/cacheWarmingService');
      if (warmingModule.cacheWarmingService) {
        cacheWarmingService = warmingModule.cacheWarmingService;
      } else if (warmingModule.default) {
        // If it's a class, we need to create an instance
        if (typeof warmingModule.default === 'function') {
          cacheWarmingService = new warmingModule.default();
        } else {
          cacheWarmingService = warmingModule.default;
        }
      }
    } catch (error) {
      console.error('Failed to import cacheWarmingService:', error);
    }
  }
  
  return { cacheService, cacheWarmingService };
}

// Validate security configuration on startup
try {
  validateSecurityConfig();
} catch (error) {
  console.error('Security configuration validation failed:', error);
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 10000;

// Core middleware stack (order matters!)
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(ddosProtection);
app.use(requestFingerprinting);

// Request tracking and monitoring
app.use(metricsTrackingMiddleware);
app.use(healthCheckExclusionMiddleware);
app.use(performanceMonitoringMiddleware);
app.use(requestSizeMonitoringMiddleware);

// Rate limiting
app.use(generalRateLimit);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/static', express.static('src/public'));

// Security middleware
app.use(inputValidation);
app.use(threatDetection);
app.use(securityAuditLogging);
app.use(fileUploadSecurity);

// Import health routes
import healthRoutes from './routes/healthRoutes';

// Health and monitoring routes (before other routes)
app.use('/', healthRoutes);

// Basic API info route
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    data: {
      message: 'LinkDAO Marketplace API', 
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      status: 'healthy',
      endpoints: {
        health: '/health',
        ping: '/ping',
        status: '/status',
        api: '/api/*'
      }
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId
    }
  });
});

// Import post routes
import postRoutes from './routes/postRoutes';

// Import feed routes
import feedRoutes from './routes/feedRoutes';

// Import community routes  
import communityRoutes from './routes/communityRoutes';

// Import messaging routes
import messagingRoutes from './routes/messagingRoutes';

// Import security routes
import securityRoutes from './routes/securityRoutes';

// Use post routes
app.use('/api/posts', postRoutes);

// Use feed routes
app.use('/api/feed', feedRoutes);

// Use community routes
app.use('/api/communities', communityRoutes);

// Use messaging routes
app.use('/api/messaging', messagingRoutes);

// Import proxy routes
import proxyRoutes from './routes/proxyRoutes';

// Proxy routes (should be after specific API routes)
app.use('/', proxyRoutes);

// Import security routes
import marketplaceVerificationRoutes from './routes/marketplaceVerificationRoutes';
// Import link safety routes
import linkSafetyRoutes from './routes/linkSafetyRoutes';
// Import admin routes
import adminRoutes from './routes/adminRoutes';
import adminDashboardRoutes from './routes/adminDashboardRoutes';
import { systemHealthMonitoringRoutes } from './routes/systemHealthMonitoringRoutes';
// Import analytics routes
import analyticsRoutes from './routes/analyticsRoutes';
// Import marketplace registration routes
import marketplaceRegistrationRoutes from './routes/marketplaceRegistrationRoutes';
// Import dispute resolution routes
import disputeRouter from './routes/disputeRoutes';
// Import gas fee sponsorship routes
import { gasFeeSponsorshipRouter } from './routes/gasFeeSponsorshipRoutes';
// Import DAO shipping partners routes
import { daoShippingPartnersRouter } from './routes/daoShippingPartnersRoutes';
// Import advanced analytics routes
import { advancedAnalyticsRouter } from './routes/advancedAnalyticsRoutes';
// Import seller routes
import sellerRoutes from './routes/sellerRoutes';
// Import marketplace seller routes
import marketplaceSellerRoutes from './routes/marketplaceSellerRoutes';
// Import seller profile API routes
import sellerProfileRoutes from './routes/sellerProfileRoutes';
// Import user profile API routes
import userProfileRoutes from './routes/userProfileRoutes';
// Import marketplace listings routes
import marketplaceListingsRoutes from './routes/marketplaceListingsRoutes';
// Import listing routes
import listingRoutes from './routes/listingRoutes';
// Import order creation routes
import orderCreationRoutes from './routes/orderCreationRoutes';
// Import token reaction routes
import tokenReactionRoutes from './routes/tokenReactionRoutes';
// Import enhanced search routes
import enhancedSearchRoutes from './routes/enhancedSearchRoutes';
// Import content preview routes
import contentPreviewRoutes from './routes/contentPreviewRoutes';
// Import enhanced user routes
import enhancedUserRoutes from './routes/enhancedUserRoutes';
// Import governance routes
import governanceRoutes from './routes/governanceRoutes';
// Import engagement analytics routes
import engagementAnalyticsRoutes from './routes/engagementAnalyticsRoutes';
// Import authentication routes
import { createDefaultAuthRoutes } from './routes/authenticationRoutes';
// Import poll routes
import pollRoutes from './routes/pollRoutes';
// Import cache routes
import cacheRoutes from './routes/cacheRoutes';
// Import marketplace search routes
import marketplaceSearchRoutes from './routes/marketplaceSearchRoutes';
// Import price oracle routes
import priceOracleRoutes from './routes/priceOracleRoutes';
// Import reputation routes
import { reputationRoutes } from './routes/reputationRoutes';
// Import monitoring routes
import monitoringRoutes from './routes/monitoringRoutes';

// Import transaction routes
import transactionRoutes from './routes/transactionRoutes';

// Import order management routes
import orderManagementRoutes from './routes/orderManagementRoutes';

// Import seller performance routes
import sellerPerformanceRoutes from './routes/sellerPerformanceRoutes';

// Authentication routes
app.use('/api/auth', createDefaultAuthRoutes());

// Security routes
app.use('/api/security', securityRoutes);

// Marketplace verification routes
app.use('/api/marketplace/verification', marketplaceVerificationRoutes);

// Link safety routes
app.use('/api/link-safety', linkSafetyRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Admin dashboard routes
app.use('/api/admin/dashboard', adminDashboardRoutes);

// System health monitoring routes
app.use('/api/admin/system-health', systemHealthMonitoringRoutes);

// Analytics routes
app.use('/api/analytics', analyticsRoutes);

// Marketplace registration routes
app.use('/api/marketplace/registration', marketplaceRegistrationRoutes);

// Dispute resolution routes
app.use('/api/marketplace/disputes', disputeRouter);

// Gas fee sponsorship routes
app.use('/api/gas-sponsorship', gasFeeSponsorshipRouter);

// DAO shipping partners routes
app.use('/api/shipping', daoShippingPartnersRouter);

// Advanced analytics routes
app.use('/api/analytics', advancedAnalyticsRouter);

// Seller routes
app.use('/api/sellers', sellerRoutes);

// Listing routes
app.use('/api/listings', listingRoutes);

// Order creation routes
app.use('/api/orders', orderCreationRoutes);

// Marketplace seller routes
app.use('/api/marketplace', marketplaceSellerRoutes);

// Seller profile API routes
app.use('/api/marketplace', sellerProfileRoutes);

// User profile API routes
app.use('/api/profiles', userProfileRoutes);

// Marketplace listings routes
app.use('/api/marketplace', marketplaceListingsRoutes);

// Token reaction routes
app.use('/api/reactions', tokenReactionRoutes);

// Enhanced search routes
app.use('/api/search', enhancedSearchRoutes);

// Content preview routes
app.use('/api/preview', contentPreviewRoutes);

// Enhanced user routes
app.use('/api/users', enhancedUserRoutes);

// Governance routes
app.use('/api/governance', governanceRoutes);

// Engagement analytics routes
app.use('/api/analytics', engagementAnalyticsRoutes);

// Poll routes
app.use('/api/polls', pollRoutes);

// Cache management routes
app.use('/api/cache', cacheRoutes);

// Marketplace search routes
app.use('/api/marketplace/search', marketplaceSearchRoutes);

// Price oracle routes
app.use('/api/price-oracle', priceOracleRoutes);

// Reputation routes
app.use('/marketplace/reputation', reputationRoutes);

// Monitoring and alerting routes
app.use('/api/monitoring', monitoringRoutes);

// Transaction routes
app.use('/api/transactions', transactionRoutes);

// Order management routes
app.use('/api/order-management', orderManagementRoutes);

// Seller performance routes
app.use('/api/seller-performance', sellerPerformanceRoutes);

// Report builder routes
import reportBuilderRoutes from './routes/reportBuilderRoutes';
app.use('/api/admin/report-builder', reportBuilderRoutes);

// Report scheduler routes
import reportSchedulerRoutes from './routes/reportSchedulerRoutes';
app.use('/api/admin/report-scheduler', reportSchedulerRoutes);

// Report export routes
import reportExportRoutes from './routes/reportExportRoutes';
app.use('/api/admin/report-export', reportExportRoutes);

// Report template library routes
import reportTemplateLibraryRoutes from './routes/reportTemplateLibraryRoutes';
app.use('/api/admin/report-library', reportTemplateLibraryRoutes);

// Marketplace fallback endpoint is now handled by marketplaceListingsRoutes

// Catch all API routes
app.use('/api/*', (req, res) => {
  res.json({
    success: true,
    message: `API endpoint ${req.method} ${req.originalUrl} - fixed version`,
    data: null
  });
});

// Error handling middleware (must be last)
app.use(errorCorrelationMiddleware);
app.use(globalErrorHandler);
app.use(notFoundHandler);

// Start server
httpServer.listen(PORT, async () => {
  console.log(`🚀 LinkDAO Backend with Enhanced Social Platform running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 API ready: http://localhost:${PORT}/`);
  
  // Initialize services
  const { cacheService, cacheWarmingService } = await initializeServices();
  
  // Initialize WebSocket service
  try {
    const webSocketService = initializeWebSocket(httpServer);
    console.log('✅ WebSocket service initialized');
    console.log(`🔌 WebSocket ready for real-time updates`);
  } catch (error) {
    console.warn('⚠️ WebSocket service initialization failed:', error);
  }

  // Initialize Admin WebSocket service
  try {
    const adminWebSocketService = initializeAdminWebSocket(httpServer);
    console.log('✅ Admin WebSocket service initialized');
    console.log(`🔧 Admin real-time dashboard ready`);
  } catch (error) {
    console.warn('⚠️ Admin WebSocket service initialization failed:', error);
  }
  
  // Initialize cache service
  try {
    // Check if cacheService has connect method or if it's already connected
    if (cacheService) {
      if (typeof cacheService.connect === 'function') {
        await cacheService.connect();
        console.log('✅ Cache service initialized via connect method');
      } else if (cacheService.isConnected) {
        console.log('✅ Cache service already connected');
      } else {
        console.log('⚠️ Cache service available but not connected');
      }
    } else {
      console.log('⚠️ Cache service not available');
    }
    
    // Trigger initial cache warming
    setTimeout(async () => {
      try {
        await cacheWarmingService.performQuickWarmup();
        console.log('✅ Initial cache warming completed');
      } catch (error) {
        console.warn('⚠️ Initial cache warming failed:', error);
      }
    }, 5000); // Wait 5 seconds after server start
    
  } catch (error) {
    console.warn('⚠️ Cache service initialization failed:', error);
    console.log('📝 Server will continue without caching');
  }
});

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Close WebSocket service
  shutdownWebSocket();
  
  // Close Admin WebSocket service
  shutdownAdminWebSocket();
  
  // Close HTTP server
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;