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

// Import enhanced error handling and logging
import { 
  enhancedErrorHandler, 
  EnhancedAppError, 
  ErrorFactory,
  asyncHandler 
} from './middleware/enhancedErrorHandler';
import { 
  enhancedRequestLoggingMiddleware,
  databaseQueryTrackingMiddleware,
  cacheOperationTrackingMiddleware,
  businessContextMiddleware,
  RequestLoggingHelpers
} from './middleware/enhancedRequestLogging';
import { 
  enhancedRateLimitingService,
  enhancedGeneralRateLimit,
  enhancedAuthRateLimit,
  enhancedApiRateLimit
} from './middleware/enhancedRateLimiting';
import { errorLoggingService } from './services/errorLoggingService';
import { comprehensiveMonitoringService } from './services/comprehensiveMonitoringService';
import { metricsTrackingMiddleware } from './middleware/metricsMiddleware';
import { marketplaceSecurity, generalRateLimit } from './middleware/marketplaceSecurity';

// Import performance optimization middleware
import PerformanceOptimizationIntegration from './middleware/performanceOptimizationIntegration';
import { Pool } from 'pg';

// Import services
import { initializeWebSocket, shutdownWebSocket } from './services/webSocketService';
import { initializeAdminWebSocket, shutdownAdminWebSocket } from './services/adminWebSocketService';
import { initializeSellerWebSocket, shutdownSellerWebSocket } from './services/sellerWebSocketService';

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

// Initialize database pool for performance optimization
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize performance optimization
const performanceOptimizer = new PerformanceOptimizationIntegration(dbPool, {
  enableCaching: true,
  enableCompression: true,
  enableDatabaseOptimization: true,
  enableConnectionPooling: true,
  enableIndexOptimization: true,
  enableMetrics: true,
  enableAutoOptimization: process.env.NODE_ENV === 'production'
});

// Performance optimizer will be set after routes are imported

// Core middleware stack (order matters!)
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(ddosProtection);
app.use(requestFingerprinting);

// Request tracking and monitoring
app.use(metricsTrackingMiddleware);
app.use(healthCheckExclusionMiddleware);
app.use(enhancedRequestLoggingMiddleware);
app.use(databaseQueryTrackingMiddleware);
app.use(cacheOperationTrackingMiddleware);
app.use(performanceMonitoringMiddleware);
app.use(requestSizeMonitoringMiddleware);

// Enhanced rate limiting with abuse prevention
app.use(enhancedApiRateLimit);

// Performance optimization middleware (should be early in the chain)
app.use(performanceOptimizer.optimize());

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

// API documentation routes
import apiDocsRoutes from './routes/apiDocsRoutes';
app.use('/api/docs', apiDocsRoutes);

// System monitoring routes
import systemMonitoringRoutes from './routes/systemMonitoringRoutes';
app.use('/api/monitoring', systemMonitoringRoutes);

// ===== BACKEND API INTEGRATION ROUTES =====
// Import marketplace API routes (from backend-api-integration spec)
import marketplaceApiRoutes from './routes/marketplaceRoutes';
import authApiRoutes from './routes/authRoutes';
import cartApiRoutes from './routes/cartRoutes';
import sellerApiRoutes from './routes/sellerRoutes';
import automatedTierUpgradeRoutes from './routes/automatedTierUpgradeRoutes';
import sellerSecurityRoutes from './routes/sellerSecurityRoutes';

// Marketplace API health check
app.get('/api/marketplace/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Marketplace API',
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        listings: '/api/marketplace/listings',
        sellers: '/api/marketplace/sellers',
        search: '/api/marketplace/search'
      }
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId
    }
  });
});

// API v1 routes with proper prefixes and middleware ordering
app.use('/api/v1/marketplace', marketplaceApiRoutes);
app.use('/api/v1/auth', authApiRoutes);
app.use('/api/v1/cart', cartApiRoutes);
app.use('/api/v1/sellers', sellerApiRoutes);
app.use('/api/v1/marketplace/seller/tier', automatedTierUpgradeRoutes);
app.use('/api/v1/seller/security', sellerSecurityRoutes);

// Backward compatibility routes (without version prefix)
app.use('/api/marketplace', marketplaceApiRoutes);
app.use('/api/auth', authApiRoutes);
app.use('/api/cart', cartApiRoutes);
app.use('/api/sellers', sellerApiRoutes);
app.use('/api/marketplace/seller/tier', automatedTierUpgradeRoutes);
app.use('/api/seller/security', sellerSecurityRoutes);

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

// Import view tracking routes
import viewRoutes from './routes/viewRoutes';

// Import bookmark routes
import bookmarkRoutes from './routes/bookmarkRoutes';

// Import share routes
import shareRoutes from './routes/shareRoutes';

// Import follow routes
import followRoutes from './routes/followRoutes';

// Import community routes
import communityRoutes from './routes/communityRoutes';

// Import messaging routes
import messagingRoutes from './routes/messagingRoutes';

// Import notification preferences routes
import notificationPreferencesRoutes from './routes/notificationPreferencesRoutes';
import mobileRoutes from './routes/mobileRoutes';

// Import security routes
import securityRoutes from './routes/securityRoutes';

// Use post routes
app.use('/api/posts', postRoutes);

// Use feed routes
app.use('/api/feed', feedRoutes);

// Use view tracking routes
app.use('/api/views', viewRoutes);

// Use bookmark routes
app.use('/api/bookmarks', bookmarkRoutes);

// Use share routes
app.use('/api/shares', shareRoutes);

// Use follow routes
app.use('/api/follows', followRoutes);

// Use community routes
app.use('/api/communities', communityRoutes);

// Use messaging routes
app.use('/api/messaging', messagingRoutes);

// Use notification preferences routes
app.use('/api/notification-preferences', notificationPreferencesRoutes);
app.use('/api/mobile', mobileRoutes);

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

// Import marketplace seller routes
import marketplaceSellerRoutes from './routes/marketplaceSellerRoutes';
// Import seller profile API routes
import sellerProfileRoutes from './routes/sellerProfileRoutes';
// Import seller dashboard routes
import sellerDashboardRoutes from './routes/sellerDashboardRoutes';
// Import seller order routes
import sellerOrderRoutes from './routes/sellerOrderRoutes';
// Import seller listing routes
import sellerListingRoutes from './routes/sellerListingRoutes';
// Import seller image upload routes
import sellerImageUploadRoutes from './routes/sellerImageUploadRoutes';
// Import unified seller image routes
import { sellerImageRoutes } from './routes/sellerImageRoutes';
// Import ENS validation routes
import ensValidationRoutes from './routes/ensValidationRoutes';
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

// Import performance routes
import performanceRoutes, { setPerformanceOptimizer } from './routes/performanceRoutes';

// Import transaction routes
import transactionRoutes from './routes/transactionRoutes';

// Import order management routes
import orderManagementRoutes from './routes/orderManagementRoutes';

// Import seller performance routes
import sellerPerformanceRoutes from './routes/sellerPerformanceRoutes';

// Import seller analytics routes
import sellerAnalyticsRoutes from './routes/sellerAnalyticsRoutes';

// Import member behavior routes
import memberBehaviorRoutes from './routes/memberBehaviorRoutes';

// Import content performance routes
import contentPerformanceRoutes from './routes/contentPerformanceRoutes';

// Legacy authentication routes
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



// Listing routes
app.use('/api/listings', listingRoutes);

// Order creation routes
app.use('/api/orders', orderCreationRoutes);

// Marketplace seller routes
app.use('/api/marketplace', marketplaceSellerRoutes);

// Seller profile API routes
app.use('/api/marketplace', sellerProfileRoutes);

// Seller dashboard routes
app.use('/api/marketplace', sellerDashboardRoutes);

// Seller order routes
app.use('/api/marketplace', sellerOrderRoutes);

// Seller listing routes
app.use('/api/marketplace', sellerListingRoutes);

// Seller image upload routes (legacy)
app.use('/api/marketplace', sellerImageUploadRoutes);

// Unified seller image routes
app.use('/api/marketplace/seller/images', sellerImageRoutes);

// ENS validation routes
app.use('/api/marketplace', ensValidationRoutes);

// User profile API routes
app.use('/api/profiles', userProfileRoutes);

// Marketplace listings routes (legacy support)
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

// Performance optimization routes
setPerformanceOptimizer(performanceOptimizer);
app.use('/api/performance', performanceRoutes);

// Transaction routes
app.use('/api/transactions', transactionRoutes);

// Order management routes
app.use('/api/order-management', orderManagementRoutes);

// Seller performance routes
app.use('/api/seller-performance', sellerPerformanceRoutes);

// Seller analytics routes
app.use('/api/seller-analytics', sellerAnalyticsRoutes);

// Use member behavior routes
app.use('/api/member-behavior', memberBehaviorRoutes);

// Use content performance routes
app.use('/api/content-performance', contentPerformanceRoutes);

// Import order event listener service
import { orderEventListenerService } from './services/orderEventListenerService';

// Import order event handler routes
import orderEventHandlerRoutes from './routes/orderEventHandlerRoutes';

// Order event handler routes
app.use('/api/order-events', orderEventHandlerRoutes);

// Marketplace messaging routes
import marketplaceMessagingRoutes from './routes/marketplaceMessagingRoutes';
app.use('/api/marketplace/messaging', marketplaceMessagingRoutes);

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
app.use(enhancedErrorHandler); // Use enhanced error handler as primary
app.use(globalErrorHandler); // Keep as fallback
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

  // Initialize Seller WebSocket service
  try {
    const sellerWebSocketService = initializeSellerWebSocket();
    console.log('✅ Seller WebSocket service initialized');
    console.log(`🛒 Seller real-time updates ready`);
  } catch (error) {
    console.warn('⚠️ Seller WebSocket service initialization failed:', error);
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

  // Start comprehensive monitoring
  try {
    comprehensiveMonitoringService.startMonitoring(60000); // Monitor every minute
    console.log('✅ Comprehensive monitoring service started');
    console.log('📊 System health monitoring active');
  } catch (error) {
    console.warn('⚠️ Monitoring service initialization failed:', error);
  }

  // Start order event listener
  try {
    orderEventListenerService.startListening();
    console.log('✅ Order event listener started');
    console.log('🔄 Listening for order events to trigger messaging automation');
  } catch (error) {
    console.warn('⚠️ Order event listener failed to start:', error);
  }
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  try {
    // Close WebSocket service
    shutdownWebSocket();
    
    // Close Admin WebSocket service
    shutdownAdminWebSocket();
    
    // Close Seller WebSocket service
    shutdownSellerWebSocket();
    
    // Stop monitoring service
    comprehensiveMonitoringService.stopMonitoring();
    
    // Stop performance optimizer
    performanceOptimizer.stop();
    
    // Close database pool
    await dbPool.end();
    
    // Close HTTP server
    httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
  
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