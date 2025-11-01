import express from 'express';
import { safeLogger } from '../utils/safeLogger';
import { createServer } from 'http';
import { safeLogger } from '../utils/safeLogger';
import dotenv from 'dotenv';
import { safeLogger } from '../utils/safeLogger';
import './types';

// Load environment variables
dotenv.config();

// Import security configuration and middleware
import { validateSecurityConfig } from './config/securityConfig';
import { safeLogger } from '../utils/safeLogger';
import {
  helmetMiddleware,
  ddosProtection,
  requestFingerprinting,
  inputValidation,
  threatDetection,
  securityAuditLogging,
  fileUploadSecurity,
  apiRateLimit,
} from './middleware/securityMiddleware';
// Import proper CORS middleware with environment-aware configuration
import { corsMiddleware } from './middleware/corsMiddleware';
import { safeLogger } from '../utils/safeLogger';

// Import new marketplace infrastructure
import { 
  requestLoggingMiddleware, 
  performanceMonitoringMiddleware,
  requestSizeMonitoringMiddleware,
  errorCorrelationMiddleware,
  healthCheckExclusionMiddleware
} from './middleware/requestLogging';
import { globalErrorHandler, notFoundHandler } from './middleware/globalErrorHandler';
import { safeLogger } from '../utils/safeLogger';

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
import { safeLogger } from '../utils/safeLogger';
import { comprehensiveMonitoringService } from './services/comprehensiveMonitoringService';
import { safeLogger } from '../utils/safeLogger';
import { metricsTrackingMiddleware } from './middleware/metricsMiddleware';
import { safeLogger } from '../utils/safeLogger';
import { marketplaceSecurity, generalRateLimit } from './middleware/marketplaceSecurity';
import { safeLogger } from '../utils/safeLogger';

// Import performance optimization middleware
import PerformanceOptimizationIntegration from './middleware/performanceOptimizationIntegration';
import { safeLogger } from '../utils/safeLogger';
import { Pool } from 'pg';
import { safeLogger } from '../utils/safeLogger';

// Import services
import { initializeWebSocket, shutdownWebSocket } from './services/webSocketService';
import { safeLogger } from '../utils/safeLogger';
import { initializeAdminWebSocket, shutdownAdminWebSocket } from './services/adminWebSocketService';
import { safeLogger } from '../utils/safeLogger';
import { initializeSellerWebSocket, shutdownSellerWebSocket } from './services/sellerWebSocketService';
import { safeLogger } from '../utils/safeLogger';

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
      safeLogger.error('Failed to import cacheService:', error);
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
      safeLogger.error('Failed to import cacheWarmingService:', error);
    }
  }
  
  return { cacheService, cacheWarmingService };
}

// Validate security configuration on startup
try {
  validateSecurityConfig();
} catch (error) {
  safeLogger.error('Security configuration validation failed:', error);
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 10000;

// Reduce database pool size for memory-constrained environments
const maxConnections = process.env.RENDER ? 3 : 20; // Render free tier gets minimal pool
const minConnections = process.env.RENDER ? 1 : 5;

// Initialize database pool for performance optimization
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: maxConnections,
  min: minConnections,
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

// Import security enhancements
import { 
  securityHeaders, 
  csrfProtection,
  requestSizeLimits, 
  validateContentType, 
  hideServerInfo, 
  securityLogger 
} from './middleware/securityEnhancementsMiddleware';

// Core middleware stack (order matters!)
app.use(securityHeaders);
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(ddosProtection);
app.use(requestFingerprinting);
app.use(hideServerInfo);
app.use(requestSizeLimits);
app.use(csrfProtection);
app.use(validateContentType);
app.use(securityLogger);

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
import { safeLogger } from '../utils/safeLogger';

// Health and monitoring routes (before other routes)
app.use('/', healthRoutes);

// API documentation routes
import apiDocsRoutes from './routes/apiDocsRoutes';
import { safeLogger } from '../utils/safeLogger';
app.use('/api/docs', apiDocsRoutes);

// System monitoring routes
import systemMonitoringRoutes from './routes/systemMonitoringRoutes';
import { safeLogger } from '../utils/safeLogger';
app.use('/api/monitoring', systemMonitoringRoutes);

// ===== BACKEND API INTEGRATION ROUTES =====
// Import marketplace API routes (from backend-api-integration spec)
import marketplaceApiRoutes from './routes/marketplaceRoutes';
import { safeLogger } from '../utils/safeLogger';
import authApiRoutes from './routes/authRoutes';
import { safeLogger } from '../utils/safeLogger';
import cartApiRoutes from './routes/cartRoutes';
import { safeLogger } from '../utils/safeLogger';
import sellerApiRoutes from './routes/sellerRoutes';
import { safeLogger } from '../utils/safeLogger';
import automatedTierUpgradeRoutes from './routes/automatedTierUpgradeRoutes';
import { safeLogger } from '../utils/safeLogger';
import sellerSecurityRoutes from './routes/sellerSecurityRoutes';
import { safeLogger } from '../utils/safeLogger';
import sellerPerformanceRoutes from './routes/sellerPerformanceRoutes';
import { safeLogger } from '../utils/safeLogger';

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
import { safeLogger } from '../utils/safeLogger';

// Import feed routes
import feedRoutes from './routes/feedRoutes';
import { safeLogger } from '../utils/safeLogger';

// Import view tracking routes
import viewRoutes from './routes/viewRoutes';
import { safeLogger } from '../utils/safeLogger';

// Import bookmark routes
import bookmarkRoutes from './routes/bookmarkRoutes';
import { safeLogger } from '../utils/safeLogger';

// Import share routes
import shareRoutes from './routes/shareRoutes';
import { safeLogger } from '../utils/safeLogger';

// Import follow routes
import followRoutes from './routes/followRoutes';
import { safeLogger } from '../utils/safeLogger';

// Import community routes
import communityRoutes from './routes/communityRoutes';
import { safeLogger } from '../utils/safeLogger';

// Import messaging routes
import messagingRoutes from './routes/messagingRoutes';
import { safeLogger } from '../utils/safeLogger';

// Import notification preferences routes
// DISABLED: Heavy routes that load massive dependencies (~200MB)
// These load Firebase Admin SDK and other heavy packages
// import notificationPreferencesRoutes from './routes/notificationPreferencesRoutes';
// import mobileRoutes from './routes/mobileRoutes';

// Import security routes
import securityRoutes from './routes/securityRoutes';
import { safeLogger } from '../utils/safeLogger';

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

// Community treasury routes
import communityTreasuryRoutes from './routes/communityTreasuryRoutes';
import { safeLogger } from '../utils/safeLogger';
app.use('/api/communities', communityTreasuryRoutes);

// Community comment voting routes
import communityCommentRoutes from './routes/communityCommentRoutes';
import { safeLogger } from '../utils/safeLogger';
app.use('/api/communities', communityCommentRoutes);

// Use messaging routes
app.use('/api/messaging', messagingRoutes);

// Use notification preferences routes
// DISABLED: Heavy routes (saves ~200MB memory)
// app.use('/api/notification-preferences', notificationPreferencesRoutes);
// app.use('/api/mobile', mobileRoutes);

// Import proxy routes
import proxyRoutes from './routes/proxyRoutes';
import { safeLogger } from '../utils/safeLogger';

// Proxy routes (should be after specific API routes)
app.use('/', proxyRoutes);

// Import security routes
import marketplaceVerificationRoutes from './routes/marketplaceVerificationRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import link safety routes
import linkSafetyRoutes from './routes/linkSafetyRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import admin routes
import adminRoutes from './routes/adminRoutes';
import { safeLogger } from '../utils/safeLogger';
import adminDashboardRoutes from './routes/adminDashboardRoutes';
import { safeLogger } from '../utils/safeLogger';
import adminAIRoutes from './routes/admin/ai';
import { safeLogger } from '../utils/safeLogger';
import { systemHealthMonitoringRoutes } from './routes/systemHealthMonitoringRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import workflow automation routes
import workflowAutomationRoutes from './routes/workflowAutomationRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import analytics routes
import analyticsRoutes from './routes/analyticsRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import marketplace registration routes
import marketplaceRegistrationRoutes from './routes/marketplaceRegistrationRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import dispute resolution routes
import disputeRouter from './routes/disputeRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import gas fee sponsorship routes
import { gasFeeSponsorshipRouter } from './routes/gasFeeSponsorshipRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import DAO shipping partners routes
import { daoShippingPartnersRouter } from './routes/daoShippingPartnersRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import advanced analytics routes
import { advancedAnalyticsRouter } from './routes/advancedAnalyticsRoutes';
import { safeLogger } from '../utils/safeLogger';

// Import marketplace seller routes
import marketplaceSellerRoutes from './routes/marketplaceSellerRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import seller profile API routes
import sellerProfileRoutes from './routes/sellerProfileRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import seller dashboard routes
import sellerDashboardRoutes from './routes/sellerDashboardRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import seller order routes
import sellerOrderRoutes from './routes/sellerOrderRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import seller listing routes
import sellerListingRoutes from './routes/sellerListingRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import seller image upload routes
import sellerImageUploadRoutes from './routes/sellerImageUploadRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import unified seller image routes
import { sellerImageRoutes } from './routes/sellerImageRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import seller verification routes
import sellerVerificationRoutes from './routes/sellerVerificationRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import ENS validation routes
import ensValidationRoutes from './routes/ensValidationRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import user profile API routes
import userProfileRoutes from './routes/userProfileRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import marketplace listings routes
import marketplaceListingsRoutes from './routes/marketplaceListingsRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import listing routes
import listingRoutes from './routes/listingRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import order creation routes
import orderCreationRoutes from './routes/orderCreationRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import token reaction routes
import tokenReactionRoutes from './routes/tokenReactionRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import enhanced search routes
import enhancedSearchRoutes from './routes/enhancedSearchRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import content preview routes
import contentPreviewRoutes from './routes/contentPreviewRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import enhanced user routes
import enhancedUserRoutes from './routes/enhancedUserRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import governance routes
import governanceRoutes from './routes/governanceRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import engagement analytics routes
import engagementAnalyticsRoutes from './routes/engagementAnalyticsRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import authentication routes
import { createDefaultAuthRoutes } from './routes/authenticationRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import poll routes
import pollRoutes from './routes/pollRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import cache routes
import cacheRoutes from './routes/cacheRoutes';
import { safeLogger } from '../utils/safeLogger';

// Import marketplace search routes
import marketplaceSearchRoutes from './routes/marketplaceSearchRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import price oracle routes
import priceOracleRoutes from './routes/priceOracleRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import reputation routes
import { reputationRoutes } from './routes/reputationRoutes';
import { safeLogger } from '../utils/safeLogger';
// Import monitoring routes
import monitoringRoutes from './routes/monitoringRoutes';
import { safeLogger } from '../utils/safeLogger';

// Import performance routes
import performanceRoutes, { setPerformanceOptimizer } from './routes/performanceRoutes';
import { safeLogger } from '../utils/safeLogger';

// Import transaction routes
import transactionRoutes from './routes/transactionRoutes';
import { safeLogger } from '../utils/safeLogger';

// Import order management routes
import orderManagementRoutes from './routes/orderManagementRoutes';
import { safeLogger } from '../utils/safeLogger';

// Import seller analytics routes
import sellerAnalyticsRoutes from './routes/sellerAnalyticsRoutes';
import { safeLogger } from '../utils/safeLogger';

// Import member behavior routes
import memberBehaviorRoutes from './routes/memberBehaviorRoutes';
import { safeLogger } from '../utils/safeLogger';

// Import content performance routes
import contentPerformanceRoutes from './routes/contentPerformanceRoutes';
import { safeLogger } from '../utils/safeLogger';

// Import DEX trading routes
import dexTradingRoutes from './routes/dexTradingRoutes';
import { safeLogger } from '../utils/safeLogger';
import stakingRoutes from './routes/stakingRoutes';
import { safeLogger } from '../utils/safeLogger';

// DEX trading routes
app.use('/api/dex', dexTradingRoutes);

// Staking routes
app.use('/api/staking', stakingRoutes);

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

// Admin AI routes
app.use('/api/admin/ai', adminAIRoutes);

// System health monitoring routes
app.use('/api/admin/system-health', systemHealthMonitoringRoutes);

// Workflow automation routes
app.use('/api/admin/workflows', workflowAutomationRoutes);

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

// Seller verification routes
app.use('/api/marketplace', sellerVerificationRoutes);

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

// Support ticketing routes
import { supportTicketingRoutes } from './routes/supportTicketingRoutes';
import { safeLogger } from '../utils/safeLogger';
app.use('/api/support', supportTicketingRoutes);

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
import { safeLogger } from '../utils/safeLogger';

// Import order event handler routes
import orderEventHandlerRoutes from './routes/orderEventHandlerRoutes';
import { safeLogger } from '../utils/safeLogger';

// Import x402 payment routes
import x402PaymentRoutes from './routes/x402PaymentRoutes';
import { safeLogger } from '../utils/safeLogger';

// Order event handler routes
app.use('/api/order-events', orderEventHandlerRoutes);

// x402 payment routes
app.use('/api/x402', x402PaymentRoutes);

// Marketplace messaging routes
import marketplaceMessagingRoutes from './routes/marketplaceMessagingRoutes';
import { safeLogger } from '../utils/safeLogger';
app.use('/api/marketplace/messaging', marketplaceMessagingRoutes);

// Report builder routes
import reportBuilderRoutes from './routes/reportBuilderRoutes';
import { safeLogger } from '../utils/safeLogger';
app.use('/api/admin/report-builder', reportBuilderRoutes);

// Report scheduler routes
import reportSchedulerRoutes from './routes/reportSchedulerRoutes';
import { safeLogger } from '../utils/safeLogger';
app.use('/api/admin/report-scheduler', reportSchedulerRoutes);

// Report export routes
import reportExportRoutes from './routes/reportExportRoutes';
import { safeLogger } from '../utils/safeLogger';
app.use('/api/admin/report-export', reportExportRoutes);

// Report template library routes
import reportTemplateLibraryRoutes from './routes/reportTemplateLibraryRoutes';
import { safeLogger } from '../utils/safeLogger';
app.use('/api/admin/report-library', reportTemplateLibraryRoutes);

// Marketplace fallback endpoint is now handled by marketplaceListingsRoutes

// Error handling middleware (must be last)
app.use(errorCorrelationMiddleware);
app.use(enhancedErrorHandler); // Use enhanced error handler as primary
app.use(globalErrorHandler); // Keep as fallback
app.use(notFoundHandler);

// Catch all API routes (should be just before error handlers)
app.use('/api/*', (req, res) => {
  res.json({
    success: true,
    message: `API endpoint ${req.method} ${req.originalUrl} - fixed version`,
    data: null
  });
});

safeLogger.info('📝 All routes and middleware registered successfully');
safeLogger.info(`📡 Attempting to start server on port ${PORT}...`);

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
  safeLogger.info(`🚀 LinkDAO Backend with Enhanced Social Platform running on port ${PORT}`);
  safeLogger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  safeLogger.info(`🌐 Health check: http://localhost:${PORT}/health`);
  safeLogger.info(`📡 API ready: http://localhost:${PORT}/`);

  // Initialize services asynchronously without blocking
  setImmediate(() => {
    initializeServices().then(({ cacheService, cacheWarmingService }) => {
    // MEMORY OPTIMIZATION: Disable WebSocket on Render free tier
    if (!process.env.RENDER) {
      try {
        const webSocketService = initializeWebSocket(httpServer);
        safeLogger.info('✅ WebSocket service initialized');
        safeLogger.info(`🔌 WebSocket ready for real-time updates`);
      } catch (error) {
        safeLogger.warn('⚠️ WebSocket service initialization failed:', error);
      }
    } else {
      safeLogger.info('⚠️ WebSocket disabled on Render to save memory');
    }

    // DISABLED: Admin WebSocket service (saves ~30MB memory)
    // try {
    //   const adminWebSocketService = initializeAdminWebSocket(httpServer);
    //   safeLogger.info('✅ Admin WebSocket service initialized');
    //   safeLogger.info(`🔧 Admin real-time dashboard ready`);
    // } catch (error) {
    //   safeLogger.warn('⚠️ Admin WebSocket service initialization failed:', error);
    // }
    safeLogger.info('⚠️ Admin WebSocket disabled to save memory');

    // DISABLED: Seller WebSocket service (saves ~30MB memory)
    // try {
    //   const sellerWebSocketService = initializeSellerWebSocket();
    //   safeLogger.info('✅ Seller WebSocket service initialized');
    //   safeLogger.info(`🛒 Seller real-time updates ready`);
    // } catch (error) {
    //   safeLogger.warn('⚠️ Seller WebSocket service initialization failed:', error);
    // }
    safeLogger.info('⚠️ Seller WebSocket disabled to save memory');
    
    // Initialize cache service
    try {
      // Check if cacheService has connect method or if it's already connected
      if (cacheService) {
        if (typeof cacheService.connect === 'function') {
          cacheService.connect().then(() => {
            safeLogger.info('✅ Cache service initialized via connect method');
          }).catch((error: any) => {
            safeLogger.warn('⚠️ Cache service connection failed:', error);
          });
        } else if (cacheService.isConnected) {
          safeLogger.info('✅ Cache service already connected');
        } else {
          safeLogger.info('⚠️ Cache service available but not connected');
        }
      } else {
        safeLogger.info('⚠️ Cache service not available');
      }

      // DISABLED: Cache warming (saves ~30MB memory)
      // setTimeout(() => {
      //   try {
      //     cacheWarmingService.performQuickWarmup().then(() => {
      //       safeLogger.info('✅ Initial cache warming completed');
      //     }).catch((error: any) => {
      //       safeLogger.warn('⚠️ Initial cache warming failed:', error);
      //     });
      //   } catch (error) {
      //     safeLogger.warn('⚠️ Initial cache warming failed:', error);
      //   }
      // }, 5000); // Wait 5 seconds after server start
      safeLogger.info('⚠️ Cache warming disabled to save memory');

    } catch (error) {
      safeLogger.warn('⚠️ Cache service initialization failed:', error);
      safeLogger.info('📝 Server will continue without caching');
    }

    // DISABLED: Comprehensive monitoring (saves ~50MB memory)
    // try {
    //   comprehensiveMonitoringService.startMonitoring(60000); // Monitor every minute
    //   safeLogger.info('✅ Comprehensive monitoring service started');
    //   safeLogger.info('📊 System health monitoring active');
    // } catch (error) {
    //   safeLogger.warn('⚠️ Monitoring service initialization failed:', error);
    // }
    safeLogger.info('⚠️ Comprehensive monitoring disabled to save memory');


    // MEMORY OPTIMIZATION: Disable order event listener on Render
    if (!process.env.RENDER) {
      try {
        orderEventListenerService.startListening();
        safeLogger.info('✅ Order event listener started');
        safeLogger.info('🔄 Listening for order events to trigger messaging automation');
      } catch (error) {
        safeLogger.warn('⚠️ Order event listener failed to start:', error);
      }
    } else {
      safeLogger.info('⚠️ Order event listener disabled on Render to save memory');
    }
  }).catch((error) => {
    safeLogger.error('Failed to initialize services:', error);
    safeLogger.info('📝 Server will continue without some services');
  });
  }); // End setImmediate
});

// Add error handler for listen failures
httpServer.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    safeLogger.error(`❌ Port ${PORT} is already in use`);
  } else {
    safeLogger.error('❌ Server error:', error);
  }
  process.exit(1);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  safeLogger.info(`\n${signal} received. Starting graceful shutdown...`);
  
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
      safeLogger.info('HTTP server closed');
      process.exit(0);
    });
  } catch (error) {
    safeLogger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
  
  // Force close after 10 seconds
  setTimeout(() => {
    safeLogger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  safeLogger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - log and continue
});

process.on('uncaughtException', (error) => {
  safeLogger.error('Uncaught Exception:', error);
  // For uncaught exceptions, we should gracefully shutdown
  gracefulShutdown('uncaughtException');
});

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;