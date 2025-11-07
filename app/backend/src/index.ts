// CRITICAL: Register error handlers FIRST before any imports
process.on('uncaughtException', (error) => {
  // Bypass ALL logging systems - write directly to stdout
  const errorDetails = {
    timestamp: new Date().toISOString(),
    type: 'UNCAUGHT_EXCEPTION',
    message: error.message,
    name: error.name,
    code: (error as any).code,
    stack: error.stack,
    errno: (error as any).errno,
    syscall: (error as any).syscall,
    address: (error as any).address,
    port: (error as any).port
  };

  process.stdout.write('\n=== UNCAUGHT EXCEPTION (RAW OUTPUT) ===\n');
  process.stdout.write(JSON.stringify(errorDetails, null, 2));
  process.stdout.write('\n=====================================\n\n');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  const rejectionDetails = {
    timestamp: new Date().toISOString(),
    type: 'UNHANDLED_REJECTION',
    reason: reason instanceof Error ? {
      message: reason.message,
      name: reason.name,
      stack: reason.stack,
      code: (reason as any).code
    } : String(reason)
  };

  process.stdout.write('\n=== UNHANDLED REJECTION (RAW OUTPUT) ===\n');
  process.stdout.write(JSON.stringify(rejectionDetails, null, 2));
  process.stdout.write('\n======================================\n\n');
  // Don't exit on unhandled rejection, just log it
});

import express from 'express';
import { createServer } from 'http';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import security configuration and middleware
import { validateSecurityConfig } from './config/securityConfig';
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
import { emergencyCorsMiddleware, simpleCorsMiddleware } from './middleware/emergencyCorsMiddleware';
// Import enhanced CORS middleware with dynamic validation and monitoring
import { 
  enhancedCorsMiddleware, 
  getEnvironmentCorsMiddleware,
  developmentCorsMiddleware,
  productionCorsMiddleware
} from './middleware/corsMiddleware';
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

// Enhanced CORS middleware is already imported as a function

// Import services
import { initializeWebSocketFix, shutdownWebSocketFix } from './services/websocketConnectionFix';
import { initializeWebSocket, shutdownWebSocket } from './services/webSocketService';
import { initializeAdminWebSocket, shutdownAdminWebSocket } from './services/adminWebSocketService';
import { initializeSellerWebSocket, shutdownSellerWebSocket } from './services/sellerWebSocketService';
import { memoryMonitoringService } from './services/memoryMonitoringService';

// Import production configuration
import { productionConfig } from './config/productionConfig';

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
const PORT = parseInt(process.env.PORT || '10000', 10);

// Enable trust proxy for proper IP detection behind load balancers/proxies
app.set('trust proxy', 1);

// Optimize for Render deployment constraints
const isRenderFree = process.env.RENDER && !process.env.RENDER_PRO;
const isRenderPro = process.env.RENDER && process.env.RENDER_PRO;
const isRenderStandard = process.env.RENDER && process.env.RENDER_SERVICE_TYPE === 'standard';
const isResourceConstrained = isRenderFree || (process.env.MEMORY_LIMIT && parseInt(process.env.MEMORY_LIMIT) < 1024);

// Database connection pool optimization for different environments
const dbConfig = productionConfig.database;
// Increase connection pool sizes for Render Standard (2GB RAM)
const maxConnections = isRenderFree ? dbConfig.maxConnections : 
                     (isRenderPro ? 5 : 
                     (isRenderStandard ? 15 : 
                     (process.env.RENDER ? 3 : 20)));
const minConnections = isRenderFree ? dbConfig.minConnections : 
                      (isRenderPro ? 2 : 
                      (isRenderStandard ? 5 : 
                      (process.env.RENDER ? 1 : 5)));

// Initialize optimized database pool
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: maxConnections,
  min: minConnections,
  // Increase timeouts for better performance with more resources
  idleTimeoutMillis: isRenderFree ? dbConfig.idleTimeoutMillis : 
                    (isRenderPro ? 30000 : 
                    (isRenderStandard ? 60000 : 60000)),
  connectionTimeoutMillis: isRenderFree ? dbConfig.connectionTimeoutMillis : 
                          (isRenderPro ? 3000 : 
                          (isRenderStandard ? 5000 : 2000)),
  // Add connection cleanup and resource management
  allowExitOnIdle: true,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  // Relax statement timeouts for better performance with more resources
  statement_timeout: isResourceConstrained ? 30000 : 90000,
  // Relax query timeouts for better performance with more resources
  query_timeout: isResourceConstrained ? 25000 : 85000,
});

// Add database pool event handlers for monitoring and cleanup
dbPool.on('connect', (client) => {
  console.log(`📊 Database connection established (active: ${dbPool.totalCount}/${maxConnections})`);
});

dbPool.on('error', (err, client) => {
  console.error('❌ Database pool error:', err);
  
  // Force garbage collection on database errors in constrained environments
  if (isResourceConstrained && global.gc) {
    setTimeout(() => global.gc && global.gc(), 1000);
  }
});

dbPool.on('remove', (client) => {
  console.log(`📊 Database connection removed (active: ${dbPool.totalCount}/${maxConnections})`);
});

// Add periodic connection pool health check
if (process.env.RENDER || isResourceConstrained) {
  setInterval(() => {
    const poolStats = {
      total: dbPool.totalCount,
      idle: dbPool.idleCount,
      waiting: dbPool.waitingCount,
      max: maxConnections
    };
    
    // Log pool stats if there are issues
    if (poolStats.waiting > 0 || poolStats.total > maxConnections * 0.8) {
      console.warn(`⚠️ Database pool status:`, poolStats);
    }
    
    // Force cleanup if pool is at capacity
    if (poolStats.total >= maxConnections && poolStats.idle === 0) {
      console.warn('🚨 Database pool at capacity - forcing cleanup');
      if (global.gc) {
        global.gc();
      }
    }
  }, isRenderStandard ? 30000 : 60000); // Check more frequently for Standard tier
}

// Initialize memory monitoring service
if (process.env.RENDER || isResourceConstrained) {
  const tierName = isRenderFree ? 'Free' : (isRenderPro ? 'Pro' : (isRenderStandard ? 'Standard' : 'Standard'));
  console.log(`🚀 Running on Render ${tierName} Tier - Memory optimizations enabled`);
  
  // Start memory monitoring with adaptive intervals
  const monitoringInterval = isRenderFree ? 30000 : 
                            (isRenderPro ? 45000 : 
                            (isRenderStandard ? 40000 : 60000));
  memoryMonitoringService.startMonitoring(monitoringInterval);
  
  // Log initial memory stats
  const initialStats = memoryMonitoringService.getMemoryStats();
  console.log(`📊 Initial memory: ${initialStats.heapUsed}MB heap / ${initialStats.rss}MB RSS`);
  
  // Add process memory limit monitoring if specified
  if (process.env.MEMORY_LIMIT) {
    const memoryLimitMB = parseInt(process.env.MEMORY_LIMIT);
    console.log(`📏 Process memory limit: ${memoryLimitMB}MB`);
  }
}

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

// Enhanced CORS Configuration with Dynamic Origin Validation
// Use environment-appropriate CORS middleware with comprehensive logging and monitoring
const corsMiddlewareToUse = process.env.EMERGENCY_CORS === 'true' ? 
  emergencyCorsMiddleware : 
  getEnvironmentCorsMiddleware();

// Apply CORS middleware only once
app.use(corsMiddlewareToUse);

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
// Emergency: Use permissive CORS temporarily
// app.use(emergencyRateLimit); // Commented out to fix build

// Performance optimization middleware (should be early in the chain)
app.use(performanceOptimizer.optimize());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing
app.use(cookieParser());

// Static files
app.use('/static', express.static('src/public'));

// Security middleware
app.use(inputValidation);
app.use(threatDetection);
app.use(securityAuditLogging);
app.use(fileUploadSecurity);

// Import health routes
import emergencyHealthRoutes from './routes/emergencyHealthRoutes';
import healthRoutes from './routes/healthRoutes';

// Health and monitoring routes (before other routes)
app.use('/', healthRoutes);

// Emergency routes for service availability
app.use('/', emergencyHealthRoutes);

// Emergency routes for service availability
app.use('/', emergencyHealthRoutes);

// API documentation routes
import apiDocsRoutes from './routes/apiDocsRoutes';
app.use('/api/docs', apiDocsRoutes);

// System monitoring routes
import systemMonitoringRoutes from './routes/systemMonitoringRoutes';
app.use('/api/monitoring', systemMonitoringRoutes);

// Performance monitoring routes
import { createPerformanceMonitoringRoutes } from './routes/performanceMonitoringRoutes';
import { Redis } from 'ioredis';

// Create Redis instance for performance monitoring
const performanceRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

const performanceMonitoringRoutes = createPerformanceMonitoringRoutes(dbPool, performanceRedis);
app.use('/api/performance', performanceMonitoringRoutes);

// ===== BACKEND API INTEGRATION ROUTES =====
// Import marketplace API routes (from backend-api-integration spec)
import marketplaceApiRoutes from './routes/marketplaceRoutes';
import authApiRoutes from './routes/authRoutes';
import cartApiRoutes from './routes/cartRoutes';
import sellerApiRoutes from './routes/sellerRoutes';
import automatedTierUpgradeRoutes from './routes/automatedTierUpgradeRoutes';
import sellerSecurityRoutes from './routes/sellerSecurityRoutes';
import sellerPerformanceRoutes from './routes/sellerPerformanceRoutes';

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

// CORS monitoring endpoint for debugging and administration
app.get('/api/cors/status', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        emergencyMode: process.env.EMERGENCY_CORS === 'true',
        currentOrigin: req.get('Origin') || null,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get CORS status',
        details: error.message
      }
    });
  }
});

// Enhanced health check with memory and resource information
app.get('/health/detailed', (req, res) => {
  try {
    const memoryStats = memoryMonitoringService.getMemoryStats();
    const uptime = process.uptime();
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptime),
        human: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
      },
      memory: {
        heapUsed: `${memoryStats.heapUsed}MB`,
        heapTotal: `${memoryStats.heapTotal}MB`,
        rss: `${memoryStats.rss}MB`,
        external: `${memoryStats.external}MB`,
        thresholds: {
          warning: `${memoryStats.thresholds.warning}MB`,
          critical: `${memoryStats.thresholds.critical}MB`,
          gc: `${memoryStats.thresholds.gc}MB`
        }
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        render: !!process.env.RENDER,
        renderPro: !!process.env.RENDER_PRO,
        resourceConstrained: isResourceConstrained
      },
      database: {
        connected: !!dbPool,
        totalConnections: dbPool?.totalCount || 0,
        idleConnections: dbPool?.idleCount || 0,
        waitingConnections: dbPool?.waitingCount || 0,
        maxConnections: maxConnections
      },
      services: {
        webSocket: !isResourceConstrained && !process.env.DISABLE_WEBSOCKETS,
        monitoring: !isResourceConstrained && !process.env.DISABLE_MONITORING,
        memoryMonitoring: true
      }
    };

    res.json({
      success: true,
      data: healthData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Health check failed',
        details: error.message
      }
    });
  }
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
// NOTE: OLD auth routes disabled - using new AuthenticationService routes at line 774
// app.use('/api/auth', authApiRoutes);
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

// CSRF token routes are now handled by csrfRoutes to ensure proper token generation and verification
// app.get('/api/csrf-token', (req, res) => {
//   const crypto = require('crypto');
//   const csrfToken = crypto.randomBytes(32).toString('hex');
//   
//   res.json({
//     success: true,
//     data: {
//       csrfToken,
//       expiresIn: 3600 // 1 hour
//     }
//   });
// });

// Import session routes
import sessionRoutes from './routes/sessionRoutes';

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
// DISABLED: Heavy routes that load massive dependencies (~200MB)
// These load Firebase Admin SDK and other heavy packages
import notificationPreferencesRoutes from './routes/notificationPreferencesRoutes';
import mobileRoutes from './routes/mobileRoutes';

// Import security routes
import securityRoutes from './routes/securityRoutes';

// Use session routes
app.use('/api', sessionRoutes);

// Use CSRF routes
// app.use('/api', csrfRoutes); // TEMPORARILY DISABLED to avoid duplicate usage

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

// Alias for backward compatibility (frontend uses /api/follow in some places)
app.use('/api/follow', followRoutes);

// Use community routes
app.use('/api/communities', communityRoutes);

// Community treasury routes
import communityTreasuryRoutes from './routes/communityTreasuryRoutes';
app.use('/api/communities', communityTreasuryRoutes);

// Community comment voting routes
import communityCommentRoutes from './routes/communityCommentRoutes';
app.use('/api/communities', communityCommentRoutes);

// Use messaging routes
app.use('/api/messaging', messagingRoutes);

// Use notification preferences routes
// DISABLED: Heavy routes (saves ~200MB memory)
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
import adminAIRoutes from './routes/admin/ai';
import { systemHealthMonitoringRoutes } from './routes/systemHealthMonitoringRoutes';
// Import workflow automation routes
import workflowAutomationRoutes from './routes/workflowAutomationRoutes';
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
// Import seller verification routes
import sellerVerificationRoutes from './routes/sellerVerificationRoutes';
// Import ENS validation routes
import ensValidationRoutes from './routes/ensValidationRoutes';
// Import user profile API routes
import userProfileRoutes from './routes/userProfileRoutes';
// Import marketplace listings routes
import marketplaceListingsRoutes from './routes/marketplaceListingsRoutes';
// Import database schema
import { users } from './db/schema';
import { eq, sql } from 'drizzle-orm';
// Import database service
import { db } from './db/index';
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

// Import CSRF routes
import csrfRoutes from './routes/csrfRoutes';

// Import tip routes
import tipRoutes from './routes/tipRoutes';

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

// Import seller analytics routes
import sellerAnalyticsRoutes from './routes/sellerAnalyticsRoutes';

// Import member behavior routes
import memberBehaviorRoutes from './routes/memberBehaviorRoutes';

// Import content performance routes
import contentPerformanceRoutes from './routes/contentPerformanceRoutes';

// TEMPORARILY DISABLED: These routes cause crashes during module loading
// TODO: Fix and re-enable after identifying the root cause
import dexTradingRoutes from './routes/dexTradingRoutes';
import stakingRoutes from './routes/stakingRoutes';
import { ldaoPostLaunchMonitoringRoutes } from './routes/ldaoPostLaunchMonitoringRoutes';

app.use('/api/dex', dexTradingRoutes);
app.use('/api/staking', stakingRoutes);
app.use('/api/ldao/monitoring', ldaoPostLaunchMonitoringRoutes);

process.stdout.write('✅ DEX, Staking, and LDAO monitoring routes enabled\n');

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

// Add the missing endpoint that matches the frontend expectation
app.get('/api/profiles/address/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address'
      });
    }
    
    // Convert address to lowercase for consistent querying
    const normalizedAddress = address.toLowerCase();

    // Check if database connection is available
    if (!db) {
      console.error('Database connection not available');
      return res.status(503).json({
        success: false,
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Database service temporarily unavailable',
          details: {
            userFriendlyMessage: 'We are experiencing technical difficulties. Please try again later.',
            suggestions: ['Try again in a few moments', 'Contact support if the issue persists'],
            requestId: req.headers['x-request-id'] || 'unknown',
            timestamp: new Date().toISOString()
          }
        }
      });
    }

    console.log('Querying database for address:', normalizedAddress);
    // Query the database (case-insensitive)
    let result;
    try {
      result = await db.select().from(users).where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`).limit(1);
      console.log('Database query result:', result);
    } catch (queryError) {
      console.error('Database query error:', queryError);
      throw queryError;
    }
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Transform the user data to match the frontend UserProfile interface
    const user = result[0];
    let profileData: any = {};

    try {
      if (user.profileCid) {
        profileData = JSON.parse(user.profileCid);
      }
    } catch (e) {
      console.log('Failed to parse profile data for user:', user.walletAddress);
    }
    
    const profile = {
      id: user.id,
      walletAddress: user.walletAddress,
      handle: user.handle || '',
      ens: profileData.ens || '',
      avatarCid: profileData.avatarCid || profileData.profilePicture || '',
      bioCid: profileData.bioCid || profileData.bio || '',
      email: profileData.email || '',
      billingFirstName: profileData.billingFirstName || '',
      billingLastName: profileData.billingLastName || '',
      billingCompany: profileData.billingCompany || '',
      billingAddress1: profileData.billingAddress1 || '',
      billingAddress2: profileData.billingAddress2 || '',
      billingCity: profileData.billingCity || '',
      billingState: profileData.billingState || '',
      billingZipCode: profileData.billingZipCode || '',
      billingCountry: profileData.billingCountry || '',
      billingPhone: profileData.billingPhone || '',
      shippingFirstName: profileData.shippingFirstName || '',
      shippingLastName: profileData.shippingLastName || '',
      shippingCompany: profileData.shippingCompany || '',
      shippingAddress1: profileData.shippingAddress1 || '',
      shippingAddress2: profileData.shippingAddress2 || '',
      shippingCity: profileData.shippingCity || '',
      shippingState: profileData.shippingState || '',
      shippingZipCode: profileData.shippingZipCode || '',
      shippingCountry: profileData.shippingCountry || '',
      shippingPhone: profileData.shippingPhone || '',
      createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
      updatedAt: user.updatedAt ? new Date(user.updatedAt) : (user.createdAt ? new Date(user.createdAt) : new Date())
    };
    
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error fetching profile by address:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
        details: {
          userFriendlyMessage: 'An unexpected error occurred. Please try again.',
          suggestions: [],
          requestId: req.headers['x-request-id'] || 'unknown',
          timestamp: new Date().toISOString(),
          technicalDetails: {
            originalMessage: error.message,
            errorType: error.constructor.name,
            stack: error.stack
          }
        }
      }
    });
  }
});

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

// Tip routes
app.use('/api/tips', tipRoutes);

// Support ticketing routes
import { supportTicketingRoutes } from './routes/supportTicketingRoutes';
app.use('/api/support', supportTicketingRoutes);

// Cache management routes
app.use('/api/cache', cacheRoutes);

// CSRF token routes
app.use('/api', csrfRoutes);

// Import order event listener service
import { orderEventListenerService } from './services/orderEventListenerService';

// Import order event handler routes
import orderEventHandlerRoutes from './routes/orderEventHandlerRoutes';

// Import x402 payment routes
let x402PaymentRoutes: any = null;
try {
  x402PaymentRoutes = require('./routes/x402PaymentRoutes').default;
} catch (error) {
  console.warn('x402 payment routes not available:', error);
}

// Import receipt routes
import receiptRoutes from './routes/receiptRoutes';

// Order event handler routes
app.use('/api/order-events', orderEventHandlerRoutes);

// x402 payment routes
if (x402PaymentRoutes) {
  app.use('/api/x402', x402PaymentRoutes);
}

// Receipt routes
app.use('/api', receiptRoutes);

// Marketplace search routes
app.use('/api/marketplace/search', marketplaceSearchRoutes);

// Price oracle routes
app.use('/api/price-oracle', priceOracleRoutes);

// Reputation routes
app.use('/marketplace/reputation', reputationRoutes);

// Add API reputation routes for frontend compatibility
app.use('/api/reputation', reputationRoutes);

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

// Socket.io fallback route (WebSockets may be disabled on resource-constrained environments)
app.all('/socket.io/*', (req, res) => {
  res.status(503).json({
    success: false,
    error: 'WebSocket service temporarily unavailable',
    message: 'Real-time features are disabled on this server configuration. Please try again later or use polling mode.',
    code: 'WEBSOCKET_DISABLED'
  });
});

// Communities fallback route (redirect to API endpoint)
app.all('/communities*', (req, res) => {
  const apiPath = `/api${req.path}`;
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Did you mean ${apiPath}? Community endpoints require the /api prefix.`,
    suggestion: apiPath
  });
});

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

process.stdout.write('📝 All routes and middleware registered successfully\n');
process.stdout.write(`📡 Attempting to start server on port ${PORT}...\n`);

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 LinkDAO Backend with Enhanced Social Platform running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 API ready: http://localhost:${PORT}/`);

  // Initialize services asynchronously without blocking
  setImmediate(() => {
    initializeServices().then(async ({ cacheService, cacheWarmingService }) => {
    // Initialize performance monitoring integration
    try {
      const { createPerformanceMonitoringIntegration } = await import('./services/performanceMonitoringIntegration');
      const performanceMonitoring = createPerformanceMonitoringIntegration(dbPool, performanceRedis);
      await performanceMonitoring.initialize();
      console.log('✅ Performance monitoring integration initialized');
    } catch (error: any) {
      console.warn('⚠️ Performance monitoring initialization failed:', error.message);
    }

    // WebSocket services - disabled on resource-constrained environments
    const enableWebSockets = !isResourceConstrained && !process.env.DISABLE_WEBSOCKETS;
    
    if (enableWebSockets) {
      try {
        const webSocketService = initializeWebSocket(httpServer, productionConfig.webSocket);
        console.log('✅ WebSocket service initialized');
        console.log(`🔌 WebSocket ready for real-time updates`);
      } catch (error) {
        console.warn('⚠️ WebSocket service initialization failed:', error);
      }
    } else {
      const reason = isRenderFree ? 'Render free tier' : 
                    isResourceConstrained ? 'resource constraints' : 
                    'manual disable';
      console.log(`⚠️ WebSocket service disabled (${reason}) to conserve memory`);
    }

    // Admin WebSocket service - only on non-constrained environments
    if (enableWebSockets && !isRenderFree) {
      try {
        const adminWebSocketService = initializeAdminWebSocket(httpServer);
        console.log('✅ Admin WebSocket service initialized');
        console.log(`🔧 Admin real-time dashboard ready`);
      } catch (error) {
        console.warn('⚠️ Admin WebSocket service initialization failed:', error);
      }
    } else {
      console.log('⚠️ Admin WebSocket service disabled for resource optimization');
    }

    // Seller WebSocket service - only on non-constrained environments
    if (enableWebSockets && !isRenderFree) {
      try {
        const sellerWebSocketService = initializeSellerWebSocket();
        console.log('✅ Seller WebSocket service initialized');
        console.log(`🛒 Seller real-time updates ready`);
      } catch (error) {
        console.warn('⚠️ Seller WebSocket service initialization failed:', error);
      }
    } else {
      console.log('⚠️ Seller WebSocket service disabled for resource optimization');
    }
    
    // Initialize cache service
    try {
      // Check if cacheService has connect method or if it's already connected
      if (cacheService) {
        if (typeof cacheService.connect === 'function') {
          cacheService.connect().then(() => {
            console.log('✅ Cache service initialized via connect method');
          }).catch((error: any) => {
            console.warn('⚠️ Cache service connection failed:', error);
          });
        } else if (cacheService.isConnected) {
          console.log('✅ Cache service already connected');
        } else {
          console.log('⚠️ Cache service available but not connected');
        }
      } else {
        console.log('⚠️ Cache service not available');
      }

      // Cache warming
      setTimeout(() => {
        try {
          if (cacheWarmingService && typeof cacheWarmingService.performQuickWarmup === 'function') {
            cacheWarmingService.performQuickWarmup().then(() => {
              console.log('✅ Initial cache warming completed');
            }).catch((error: any) => {
              console.warn('⚠️ Initial cache warming failed:', error);
            });
          }
        } catch (error) {
          console.warn('⚠️ Initial cache warming failed:', error);
        }
      }, 5000);

    } catch (error) {
      console.warn('⚠️ Cache service initialization failed:', error);
      console.log('📝 Server will continue without caching');
    }

    // Comprehensive monitoring - disabled on resource-constrained environments
    const enableMonitoring = !isResourceConstrained && !process.env.DISABLE_MONITORING;
    
    if (enableMonitoring) {
      try {
        // Use longer intervals on Render Pro to reduce overhead
        const monitoringInterval = isRenderPro ? 120000 : 60000; // 2min for Pro, 1min for others
        comprehensiveMonitoringService.startMonitoring(monitoringInterval);
        console.log('✅ Comprehensive monitoring service started');
        console.log(`📊 System health monitoring active (${monitoringInterval/1000}s intervals)`);
      } catch (error) {
        console.warn('⚠️ Monitoring service initialization failed:', error);
      }
    } else {
      const reason = isRenderFree ? 'Render free tier' : 
                    isResourceConstrained ? 'resource constraints' : 
                    'manual disable';
      console.log(`⚠️ Comprehensive monitoring disabled (${reason}) to save memory`);
    }

    // Order event listener - disabled on resource-constrained environments
    if (enableMonitoring && !isRenderFree) {
      try {
        orderEventListenerService.startListening();
        console.log('✅ Order event listener started');
        console.log('🔄 Listening for order events to trigger messaging automation');
      } catch (error) {
        console.warn('⚠️ Order event listener failed to start:', error);
      }
    } else {
      console.log('⚠️ Order event listener disabled for resource optimization');
    }
  }).catch((error) => {
    console.error('Failed to initialize services:', error);
    console.log('📝 Server will continue without some services');
  });
  }); // End setImmediate
});

// Add error handler for listen failures
httpServer.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

// Enhanced graceful shutdown with proper resource cleanup
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  const shutdownTimeout = isResourceConstrained ? 5000 : 10000; // Shorter timeout for constrained environments
  let shutdownTimer: NodeJS.Timeout;
  
  try {
    // Set force shutdown timer
    shutdownTimer = setTimeout(() => {
      console.error(`Could not close connections in time (${shutdownTimeout}ms), forcefully shutting down`);
      process.exit(1);
    }, shutdownTimeout);
    
    console.log('🔌 Closing WebSocket services...');
    
    // Close WebSocket services with timeout
    try {
      shutdownWebSocket();
      shutdownAdminWebSocket();
      shutdownSellerWebSocket();
      console.log('✅ WebSocket services closed');
    } catch (error) {
      console.warn('⚠️ Error closing WebSocket services:', error);
    }
    
    console.log('📊 Stopping monitoring services...');
    
    // Stop memory monitoring service
    try {
      memoryMonitoringService.stopMonitoring();
      console.log('✅ Memory monitoring service stopped');
    } catch (error) {
      console.warn('⚠️ Error stopping memory monitoring service:', error);
    }
    
    // Stop comprehensive monitoring service
    try {
      comprehensiveMonitoringService.stopMonitoring();
      console.log('✅ Comprehensive monitoring service stopped');
    } catch (error) {
      console.warn('⚠️ Error stopping comprehensive monitoring service:', error);
    }
    
    console.log('⚡ Stopping performance optimizer...');
    
    // Stop performance optimizer
    try {
      performanceOptimizer.stop();
      console.log('✅ Performance optimizer stopped');
    } catch (error) {
      console.warn('⚠️ Error stopping performance optimizer:', error);
    }
    
    console.log('🗄️ Closing database connections...');
    
    // Close database pool with timeout
    try {
      await Promise.race([
        dbPool.end(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database close timeout')), 3000)
        )
      ]);
      console.log('✅ Database pool closed');
    } catch (error) {
      console.warn('⚠️ Error closing database pool:', error);
    }
    
    console.log('🌐 Closing HTTP server...');
    
    // Close HTTP server
    httpServer.close(() => {
      console.log('✅ HTTP server closed');
      clearTimeout(shutdownTimer);
      
      // Final memory cleanup
      if (global.gc) {
        console.log('🗑️ Final garbage collection...');
        global.gc();
      }
      
      console.log('🎯 Graceful shutdown completed');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    clearTimeout(shutdownTimer!);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;


// Deployment trigger: 2025-11-06T23:46:34.293Z
// Post creation fix: 2025-11-07T00:17:31.299Z
