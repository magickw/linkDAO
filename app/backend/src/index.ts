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
  rateLimitWithCache,
  cachingMiddleware
} from './middleware/cachingMiddleware';
import { ultimateCorsMiddleware } from './middleware/ultimateCors';
// import { ultraEmergencyCorsMiddleware } from './middleware/ultraEmergencyCors';
// import { corsMiddleware } from './middleware/corsMiddleware';
// import { emergencyCorsMiddleware, simpleCorsMiddleware } from './middleware/emergencyCorsMiddleware';
import { globalErrorHandler, notFoundHandler, asyncHandler } from './middleware/globalErrorHandler';

// Create a simple middleware to handle missing endpoints
import type { Request, Response, NextFunction } from 'express';
const missingEndpoints = (req: Request, res: Response, next: NextFunction) => {
  // For API routes, return JSON response
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: 'API endpoint not found',
      data: null
    });
  }
  // For other routes, pass to next middleware (likely the 404 handler)
  next();
};

import { securityHeaders } from './middleware/securityEnhancementsMiddleware';

// Helmet middleware for security headers (imported from securityEnhancementsMiddleware)
// For backward compatibility, we'll create an alias
const helmetMiddleware = securityHeaders;

import { metricsTrackingMiddleware } from './middleware/metricsMiddleware';
import { marketplaceSecurity, generalRateLimit } from './middleware/marketplaceSecurity';

// Import security middleware from securityMiddleware.ts
import {
  ddosProtection,
  requestFingerprinting,
  inputValidation,
  threatDetection,
  securityAuditLogging,
  fileUploadSecurity
} from './middleware/securityMiddleware';

// Import security enhancements middleware from securityEnhancementsMiddleware.ts
import {
  hideServerInfo,
  securityLogger,
  requestSizeLimits,
  csrfProtection,
  validateContentType
} from './middleware/securityEnhancementsMiddleware';

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
import { comprehensiveMonitoringService } from './services/comprehensiveMonitoringService';
import { blockchainEventService } from './services/blockchainEventService';

// Import request logging middleware
import {
  healthCheckExclusionMiddleware,
  errorCorrelationMiddleware,
  performanceMonitoringMiddleware,
  requestSizeMonitoringMiddleware
} from './middleware/requestLogging';

// Import enhanced request logging middleware
import {
  enhancedRequestLoggingMiddleware,
  databaseQueryTrackingMiddleware,
  cacheOperationTrackingMiddleware
} from './middleware/enhancedRequestLogging';

// Import enhanced error handler
import { enhancedErrorHandler } from './middleware/enhancedErrorHandler';

// Import production configuration
import { productionConfig } from './config/productionConfig';

// Use dynamic imports to avoid circular dependencies
let cacheService: any = null;
let cacheWarmingService: any = null;

async function initializeServices() {
  // Initialize cache service if not already done
  if (!cacheService) {
    try {
      // Explicitly import the TypeScript version
      const cacheModule: any = await import('./services/cacheService');
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

  // Initialize Redis service singleton to ensure it's connected
  try {
    const { redisService } = await import('./services/redisService');
    // Connect Redis service singleton during startup
    await redisService.connect();
    console.log('✅ Redis service singleton connected');
  } catch (error) {
    console.warn('⚠️ Redis service singleton connection failed:', error);
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

// Start blockchain event monitoring
blockchainEventService.startGlobalMonitoring().catch(err => {
  console.error('Failed to start blockchain event monitoring:', err);
});

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
const isRenderStandard = process.env.RENDER && (process.env.RENDER_SERVICE_TYPE === 'standard' || process.env.RENDER_SERVICE_PLAN === 'standard');
const isResourceConstrained = isRenderFree || (process.env.MEMORY_LIMIT && parseInt(process.env.MEMORY_LIMIT) < 1024 && !isRenderStandard);

// More aggressive resource constraints for memory-critical environments
const isMemoryCritical = process.env.MEMORY_LIMIT && parseInt(process.env.MEMORY_LIMIT) < 512;
const isSevereResourceConstrained = isRenderFree || isMemoryCritical || (process.env.RENDER && !isRenderStandard);

// Debug Render configuration
console.log('🔍 RENDER ENVIRONMENT DEBUG:');
console.log('   RENDER:', process.env.RENDER);
console.log('   RENDER_SERVICE_TYPE:', process.env.RENDER_SERVICE_TYPE);
console.log('   RENDER_SERVICE_PLAN:', process.env.RENDER_SERVICE_PLAN);
console.log('   RENDER_PRO:', process.env.RENDER_PRO);
console.log('   MEMORY_LIMIT:', process.env.MEMORY_LIMIT);
console.log('   isRenderFree:', isRenderFree);
console.log('   isRenderPro:', isRenderPro);
console.log('   isRenderStandard:', isRenderStandard);
console.log('   isResourceConstrained:', isResourceConstrained);
console.log('   isMemoryCritical:', isMemoryCritical);
console.log('   isSevereResourceConstrained:', isSevereResourceConstrained);

// Database connection pool optimization for different environments
const dbConfig = productionConfig.database;
// Optimize connection pool sizes based on available resources
// Render Pro: 4GB RAM, 2 CPU - can handle significantly more connections
const maxConnections = isMemoryCritical ? 1 :
  (isRenderFree ? dbConfig.maxConnections :
    (isRenderPro ? 20 : // Increased from 5 to 20 for Pro plan
      (isRenderStandard ? 10 :
        (process.env.RENDER ? 3 : 20))));
const minConnections = isMemoryCritical ? 1 :
  (isRenderFree ? dbConfig.minConnections :
    (isRenderPro ? 5 : // Increased from 2 to 5 for Pro plan
      (isRenderStandard ? 3 :
        (process.env.RENDER ? 1 : 5))));

// Initialize optimized database pool
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: maxConnections,
  min: minConnections,
  // Increase timeouts for better performance with more resources
  // Render Pro can handle longer-running queries
  idleTimeoutMillis: isRenderFree ? dbConfig.idleTimeoutMillis :
    (isRenderPro ? 60000 : // Increased from 30000 to 60000
      (isRenderStandard ? 60000 : 60000)),
  connectionTimeoutMillis: isRenderFree ? dbConfig.connectionTimeoutMillis :
    (isRenderPro ? 5000 : // Increased from 3000 to 5000
      (isRenderStandard ? 5000 : 2000)),
  // Add connection cleanup and resource management
  allowExitOnIdle: true,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  // Relax statement timeouts for better performance with more resources
  // Render Pro can handle much longer queries
  statement_timeout: isResourceConstrained ? 30000 : (isRenderPro ? 120000 : 90000),
  // Relax query timeouts for better performance with more resources
  query_timeout: isResourceConstrained ? 25000 : (isRenderPro ? 115000 : 85000),
});

// Add database pool event handlers for monitoring and cleanup
dbPool.on('connect', (client) => {
  console.log(`📊 Database connection established (active: ${dbPool.totalCount}/${maxConnections})`);
});

dbPool.on('error', (err, client) => {
  console.error('❌ Database pool error:', err);

  // Record the error in our monitoring system
  // Note: We're using the connection pool monitor from the db module
  // This requires importing it here
  try {
    const { getMonitor } = require('./db/connectionPoolMonitor');
    const monitor = getMonitor();
    if (monitor) {
      monitor.recordError(err);
    }
  } catch (monitorError) {
    console.warn('Failed to record error in connection pool monitor:', monitorError);
  }

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

// Initialize memory monitoring service - can be disabled via env var
const enableMemoryMonitoring = process.env.ENABLE_MEMORY_MONITORING !== 'false';

if ((process.env.RENDER || isResourceConstrained) && enableMemoryMonitoring) {
  const tierName = isRenderFree ? 'Free' : (isRenderPro ? 'Pro' : (isRenderStandard ? 'Standard' : 'Standard'));
  console.log(`🚀 Running on Render ${tierName} Tier - Memory optimizations enabled`);

  // Start memory monitoring with optimized intervals based on plan
  // Render Pro has more resources, so we can monitor less frequently
  const monitoringInterval = isMemoryCritical ? 60000 : // Every 60 seconds for critical
    (isRenderFree ? 120000 :  // Every 2 minutes for free
      (isRenderPro ? 300000 :  // Every 5 minutes for Pro (increased from 3min)
        (isRenderStandard ? 120000 : 300000))); // Every 2-5 minutes

  memoryMonitoringService.startMonitoring(monitoringInterval);

  // Log initial memory stats
  const initialStats = memoryMonitoringService.getMemoryStats();
  console.log(`📊 Initial memory: ${initialStats.heapUsed}MB heap / ${initialStats.rss}MB RSS`);
  console.log(`⏱️  Memory monitoring interval: ${monitoringInterval / 1000}s`);

  // Add process memory limit monitoring if specified
  if (process.env.MEMORY_LIMIT) {
    const memoryLimitMB = parseInt(process.env.MEMORY_LIMIT);
    console.log(`📏 Process memory limit: ${memoryLimitMB}MB`);
  }

  // The memoryMonitoringService handles all memory monitoring and GC operations
  // No additional monitoring needed here
} else {
  console.log('⚠️ Memory monitoring disabled via ENABLE_MEMORY_MONITORING=false');
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

// Get CSRF token function
import { getCSRFToken } from './middleware/csrfProtection';

// Core middleware stack (order matters!)
// ULTIMATE CORS FIX - Uses res.writeHead() at lowest HTTP level
// This CANNOT be overridden by any other middleware or environment variables
app.use(ultimateCorsMiddleware);

app.use(securityHeaders);
app.use(helmetMiddleware);

// OLD CORS CONFIGURATION - All disabled
// app.use(ultraEmergencyCorsMiddleware);
// const corsMiddlewareToUse = process.env.EMERGENCY_CORS === 'false' ?
//   getEnvironmentCorsMiddleware() :
//   emergencyCorsMiddleware;
// app.use(corsMiddlewareToUse);

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

// Import routes
import postRoutes from './routes/postRoutes';
import quickPostRoutes from './routes/quickPostRoutes';
import feedRoutes from './routes/feedRoutes';
import userRoutes from './routes/userRoutes';
import communityRoutes from './routes/communityRoutes';
import { commentRoutes } from './routes/commentRoutes';
import notificationRoutes from './routes/realTimeNotificationRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import healthRoutes from './routes/healthRoutes';
import metricsRoutes from './routes/metricsRoutes';
import sessionRoutes from './routes/sessionRoutes';
import viewRoutes from './routes/viewRoutes';
import bookmarkRoutes from './routes/bookmarkRoutes';
import shareRoutes from './routes/shareRoutes';
import followRoutes from './routes/followRoutes';
import blockRoutes from './routes/blockRoutes';
import messagingRoutes from './routes/messagingRoutes';
import notificationPreferencesRoutes from './routes/notificationPreferencesRoutes';
import enhancedFiatPaymentRoutes from './routes/enhancedFiatPaymentRoutes';
import mobileRoutes from './routes/mobileRoutes';
import securityRoutes from './routes/securityRoutes';
import searchRoutes from './routes/searchRoutes';
// Import reputation routes
import reputationRoutes from './routes/reputationRoutes';
import advancedReputationRoutes from './routes/advancedReputationRoutes';
// Import onboarding routes
import onboardingRoutes from './routes/onboardingRoutes';
// Import API documentation routes
import apiDocsRoutes from './routes/apiDocsRoutes';
import trackingRoutes from './routes/trackingRoutes';

// Reputation routes
app.use('/marketplace/reputation', reputationRoutes);

// Add API reputation routes for frontend compatibility
app.use('/api/reputation', reputationRoutes);

// Advanced reputation routes
app.use('/api/reputation/advanced', advancedReputationRoutes);

// Enhanced community reporting routes
import enhancedCommunityReportingRoutes from './routes/enhancedCommunityReportingRoutes';
app.use('/api/community-reporting', enhancedCommunityReportingRoutes);

// Register routes with enhanced error handling
app.use('/api/posts', postRoutes);
app.use('/api/quick-posts', quickPostRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/users', userRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/track', trackingRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/metrics', metricsRoutes);
// API documentation routes
app.use('/api/docs', apiDocsRoutes);
// Onboarding routes for user preferences
app.use('/api/onboarding', onboardingRoutes);
// Enhanced fiat payment routes
app.use('/api/enhanced-fiat-payment', enhancedFiatPaymentRoutes);
// Backward compatibility alias without /api prefix (for service worker or cached requests)
app.use('/enhanced-fiat-payment', enhancedFiatPaymentRoutes);

// Add root-level health endpoint for frontend compatibility
app.get('/health', async (req, res) => {
  // Prevent caching of health check responses
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  // Get Redis status
  let redisStatus: any = { enabled: false, connected: false };
  try {
    const { redisService } = await import('./services/redisService');
    // Test Redis connection to ensure current status
    const testResult = await redisService.testConnection();
    redisStatus = {
      ...redisService.getRedisStatus(),
      testResult
    };
  } catch (error) {
    // Redis service not available
    console.warn('Redis service not available for health check:', error.message);
  }

  // Get database status
  let databaseStatus: any = { enabled: false, connected: false };
  try {
    // Test database connection
    if (dbPool) {
      const startTime = Date.now();
      const result = await dbPool.query('SELECT 1');
      const queryTime = Date.now() - startTime;

      databaseStatus = {
        enabled: true,
        connected: true,
        queryTime: queryTime,
        pool: {
          total: dbPool.totalCount,
          idle: dbPool.idleCount,
          waiting: dbPool.waitingCount
        }
      };
    }
  } catch (error) {
    // Database not available
    console.warn('Database not available for health check:', error.message);
    databaseStatus = {
      enabled: true,
      connected: false,
      error: error.message
    } as any;
  }

  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    },
    redis: redisStatus,
    database: databaseStatus
  });
});

// Add Redis-specific health check endpoint
app.get('/health/redis', async (req, res) => {
  try {
    const { redisService } = await import('./services/redisService');
    const status = redisService.getRedisStatus();
    const testResult = await redisService.testConnection();

    res.status(200).json({
      success: true,
      status: 'Redis health check completed',
      redis: {
        ...status,
        testResult
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'Redis health check failed',
      error: {
        message: error.message,
        name: error.name
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Add database-specific health check endpoint
app.get('/health/database', async (req, res) => {
  try {
    // Test database connection
    if (dbPool) {
      const startTime = Date.now();
      const result = await dbPool.query('SELECT 1');
      const queryTime = Date.now() - startTime;

      res.status(200).json({
        success: true,
        status: 'Database health check completed',
        database: {
          connected: true,
          queryTime: queryTime,
          pool: {
            total: dbPool.totalCount,
            idle: dbPool.idleCount,
            waiting: dbPool.waitingCount,
            max: dbPool.options.max
          }
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        success: false,
        status: 'Database not configured',
        error: {
          message: 'Database connection pool not initialized'
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'Database health check failed',
      error: {
        message: error.message,
        name: error.name,
        code: (error as any).code
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Use session routes
app.use('/api', sessionRoutes);

// Use CSRF routes
// app.use('/api', csrfRoutes); // TEMPORARILY DISABLED to avoid duplicate usage

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

// Use block routes
app.use('/api/block', blockRoutes);

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

// Add redirect routes for legacy/alternative chat endpoints that frontend might be trying to access
// Remove conflicting chat route registrations to prevent 404/500 errors
// app.use('/api/chat', messagingRoutes);
app.use('/api/messages', messagingRoutes);
app.use('/api/conversations', messagingRoutes);

// Use the compatibility chat routes instead for better frontend compatibility
import compatChatRoutes from './routes/compatibilityChat';
app.use('/', compatChatRoutes);

// Import user profile API routes
import userProfileRoutes from './routes/userProfileRoutes';

// DISABLED: Heavy routes (saves ~200MB memory)
app.use('/api/notification-preferences', notificationPreferencesRoutes);
app.use('/api/mobile', mobileRoutes);

// User profile API routes
app.use('/api/profiles', userProfileRoutes);
// Backward compatibility alias for user profiles (legacy path)
app.use('/users/profile', userProfileRoutes);

// Import proxy routes
import proxyRoutes from './routes/proxyRoutes';

// Import storage routes
import { storageRoutes } from './routes/storageRoutes';

// Storage routes for self-hosted storage
app.use('/api/storage', storageRoutes);

// Root route for health checks
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'LinkDAO Marketplace API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Proxy routes (should be after specific API routes)
app.use('/', proxyRoutes);

// Import security routes
import marketplaceVerificationRoutes from './routes/marketplaceVerificationRoutes';
// Import link safety routes
import linkSafetyRoutes from './routes/linkSafetyRoutes';
// Import auth middleware for admin routes
import { authMiddleware } from './middleware/authMiddleware';
// Import admin routes
import adminRoutes from './routes/adminRoutes';
import adminDashboardRoutes from './routes/adminDashboardRoutes';
import adminAIRoutes from './routes/admin/ai';
import { systemHealthMonitoringRoutes } from './routes/systemHealthMonitoringRoutes';
// Import charity routes
import charityRoutes from './routes/charityRoutes';
// Import workflow automation routes
import workflowAutomationRoutes from './routes/workflowAutomationRoutes';
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
// Import marketplace listings routes
import marketplaceListingsRoutes from './routes/marketplaceListingsRoutes';
// Import marketplace routes
import marketplaceRoutes from './routes/marketplaceRoutes';
// Import cart routes
import cartRoutes from './routes/cartRoutes';
// Import checkout routes
import checkoutRoutes from './routes/checkoutRoutes';
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

// Import seller performance routes
import sellerPerformanceRoutes from './routes/sellerPerformanceRoutes';

// Import member behavior routes
import memberBehaviorRoutes from './routes/memberBehaviorRoutes';

// Import content performance routes
import contentPerformanceRoutes from './routes/contentPerformanceRoutes';

// Import LDAO benefits routes
import ldaoBenefitsRoutes from './routes/ldaoBenefitsRoutes';

// Import DEX, staking, and LDAO monitoring routes
import dexTradingRoutes from './routes/dexTradingRoutes';
import stakingRoutes from './routes/stakingRoutes';
import { ldaoPostLaunchMonitoringRoutes } from './routes/ldaoPostLaunchMonitoringRoutes';

// Import customer experience routes
import customerExperienceRoutes from './routes/customerExperienceRoutes';

// Import communication manager routes
import communicationManagerRoutes from './routes/communicationManagerRoutes';

// Register DEX, staking, and LDAO monitoring routes
app.use('/api/dex', dexTradingRoutes);
app.use('/api/staking', stakingRoutes);
app.use('/api/ldao/monitoring', ldaoPostLaunchMonitoringRoutes);

process.stdout.write('✅ DEX, Staking, and LDAO monitoring routes enabled\n');

// Use LDAO benefits routes
app.use('/api/ldao', ldaoBenefitsRoutes);

// Legacy authentication routes
// app.use('/api/auth', createDefaultAuthRoutes());
// Use the enhanced auth routes instead
app.use('/api/auth', require('./routes/authRoutes').default);
// Security routes
app.use('/api/security', securityRoutes);

// Return and refund routes
// import returnRoutes from './routes/returnRoutes';
// app.use('/api/returns', returnRoutes);

// Marketplace verification routes
app.use('/api/marketplace/verification', marketplaceVerificationRoutes);

// Link safety routes
app.use('/api/link-safety', linkSafetyRoutes);

// Admin routes - Apply authMiddleware first to populate req.user
app.use('/api/admin', authMiddleware, adminRoutes);

// Admin dashboard routes
app.use('/api/admin/dashboard', authMiddleware, adminDashboardRoutes);

// Admin AI routes
app.use('/api/admin/ai', authMiddleware, adminAIRoutes);

// System health monitoring routes
app.use('/api/admin/system-health', authMiddleware, systemHealthMonitoringRoutes);

// Charity routes
app.use('/api/admin', authMiddleware, charityRoutes);

// Workflow automation routes
app.use('/api/admin/workflows', authMiddleware, workflowAutomationRoutes);

// Analytics routes
app.use('/api/analytics', analyticsRoutes);

// Customer experience routes
app.use('/api/customer-experience', customerExperienceRoutes);

// Communication management routes
app.use('/api/communication', communicationManagerRoutes);

// Security audit routes
app.use('/api/security-audit', require('./routes/securityAuditRoutes').default);

// Data export routes
app.use('/api/data-export', require('./routes/dataExportRoutes').default);

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
// NOTE: Seller Profile routes are now handled by sellerProfileRoutes to avoid conflicts
// app.use('/api/marketplace', marketplaceSellerRoutes);

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

// Profile routes are handled by userProfileRoutes.ts
// This duplicate definition has been removed to prevent conflicts

// Marketplace listings routes (legacy support)
app.use('/api/marketplace', marketplaceListingsRoutes);
// Register main marketplace routes at different path to avoid conflicts
app.use('/api/v1/marketplace', marketplaceRoutes);
app.use('/api/marketplace', marketplaceRoutes);

// Cart routes
app.use('/api/v1/cart', cartRoutes);
app.use('/api/cart', cartRoutes);

// Checkout routes
app.use('/api/checkout', checkoutRoutes);

// Token reaction routes
app.use('/api/reactions', tokenReactionRoutes);

// Enhanced search routes (should be just before error handlers)
app.use('/api/search', searchRoutes);
app.use('/api/search/enhanced', enhancedSearchRoutes);

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

// Add root-level CSRF token endpoint for frontend compatibility
// This delegates to the proper CSRF middleware to ensure consistent format
app.get('/csrf-token', getCSRFToken);

// Import order event listener service
import { orderEventListenerService } from './services/orderEventListenerService';

// Import order event handler routes
import orderEventHandlerRoutes from './routes/orderEventHandlerRoutes';

// Import x402 payment routes
import x402PaymentRoutes from './routes/x402PaymentRoutes';

// Import receipt routes
import receiptRoutes from './routes/receiptRoutes';

// Import return routes
import returnRoutes from './routes/returnRoutes';

// Order event handler routes
app.use('/api/order-events', orderEventHandlerRoutes);

// Return and refund routes
app.use('/api/marketplace', returnRoutes);

// x402 payment routes
app.use('/api/x402', x402PaymentRoutes);

// Receipt routes
app.use('/api', receiptRoutes);

// Marketplace search routes
app.use('/api/marketplace/search', marketplaceSearchRoutes);

// Price oracle routes
app.use('/api/price-oracle', priceOracleRoutes);

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

// Referral routes
import referralRoutes from './routes/referralRoutes';
app.use('/api/referrals', referralRoutes);
app.use('/api/referral', referralRoutes); // Also support singular form for compatibility

// Report builder routes
import reportBuilderRoutes from './routes/reportBuilderRoutes';
app.use('/api/admin/report-builder', authMiddleware, reportBuilderRoutes);

// Report scheduler routes
import reportSchedulerRoutes from './routes/reportSchedulerRoutes';
app.use('/api/admin/report-scheduler', authMiddleware, reportSchedulerRoutes);

// Report export routes
import reportExportRoutes from './routes/reportExportRoutes';
app.use('/api/admin/report-export', authMiddleware, reportExportRoutes);

// Report template library routes
import reportTemplateLibraryRoutes from './routes/reportTemplateLibraryRoutes';
app.use('/api/admin/report-library', authMiddleware, reportTemplateLibraryRoutes);

// IPFS routes
import { ipfsRoutes } from './routes/ipfsRoutes';
app.use('/api/ipfs', ipfsRoutes);

// Newsletter routes
import newsletterRoutes from './routes/newsletterRoutes';
app.use('/api/newsletter', newsletterRoutes);

// Marketplace fallback endpoint is now handled by marketplaceListingsRoutes

// Socket.io fallback route (WebSockets may be disabled on resource-constrained environments)
// NOTE: Only handle this if Socket.IO is not initialized
// Socket.IO will handle its own /socket.io/* routes when enabled
app.all('/socket.io/*', (req, res) => {
  // Check if WebSockets should be enabled
  // Render Pro has sufficient resources for WebSockets
  const webSocketsEnabled = process.env.ENABLE_WEBSOCKETS === 'true' ||
    isRenderPro ||
    (process.env.RENDER_SERVICE_TYPE === 'standard' || process.env.RENDER_SERVICE_TYPE === 'pro');

  if (!webSocketsEnabled) {
    // WebSockets disabled - return 503
    return res.status(503).json({
      success: false,
      error: 'WebSocket service temporarily unavailable',
      message: 'Real-time features are disabled on this server configuration.',
      code: 'WEBSOCKET_DISABLED',
      fallback: 'polling'
    });
  }

  // If WebSockets are enabled, Socket.IO should be handling this route
  // This code should not be reached - if it is, Socket.IO failed to initialize
  res.status(500).json({
    success: false,
    error: 'Socket.IO service error',
    message: 'Socket.IO failed to initialize properly. Contact support.',
    code: 'SOCKETIO_INIT_FAILED'
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

// Redirect for cart endpoint (frontend might be requesting /cart instead of /api/cart)
app.get('/cart', (req, res) => {
  res.redirect(301, '/api/cart');
});

// Use missing endpoints for better fallbacks (after all specific routes, before error handlers)
app.use('/api', missingEndpoints);
app.use('/', missingEndpoints);

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
httpServer.listen(PORT, () => {
  console.log(`🚀 LinkDAO Backend with Enhanced Social Platform running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`MakeRange Health check: http://localhost:${PORT}/health`);
  console.log(`📡 API ready: http://localhost:${PORT}/`);

  // Initialize services asynchronously without blocking
  setImmediate(() => {
    initializeServices().then(async ({ cacheService, cacheWarmingService }) => {
      // Initialize performance monitoring integration (disabled for now - requires Redis)
      // try {
      //   const { createPerformanceMonitoringIntegration } = await import('./services/performanceMonitoringIntegration');
      //   const performanceMonitoring = createPerformanceMonitoringIntegration(dbPool, null);
      //   await performanceMonitoring.initialize();
      //   console.log('✅ Performance monitoring integration initialized');
      // } catch (error: any) {
      //   console.warn('⚠️ Performance monitoring initialization failed:', error.message);
      // }

      // WebSocket services - enabled on Render Pro and non-constrained environments
      // Render Pro (4GB RAM, 2 CPU) can easily handle WebSocket connections
      const enableWebSockets = (isRenderPro || (!isSevereResourceConstrained || isRenderStandard)) && !process.env.DISABLE_WEBSOCKETS;

      if (enableWebSockets) {
        try {
          const webSocketService = initializeWebSocket(httpServer, productionConfig.webSocket);
          console.log('✅ WebSocket service initialized');
          console.log(`🔌 WebSocket ready for real-time updates`);
          console.log(`📊 WebSocket config: maxConnections=${productionConfig.webSocket.maxConnections}, memoryThreshold=${productionConfig.webSocket.memoryThreshold}MB`);
        } catch (error) {
          console.warn('⚠️ WebSocket service initialization failed:', error);
        }
      } else {
        const reason = isRenderFree ? 'Render free tier' :
          isMemoryCritical ? 'memory critical (<512MB)' : // More specific reason
            isResourceConstrained ? 'resource constraints' :
              'manual disable';
        console.log(`⚠️ WebSocket service disabled (${reason}) to conserve memory`);
      }

      // Admin WebSocket service - enabled on Render Pro and non-constrained environments
      if (enableWebSockets && (isRenderPro || !isSevereResourceConstrained)) {
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

      // Seller WebSocket service - enabled on Render Pro and non-constrained environments
      if (enableWebSockets && (isRenderPro || !isSevereResourceConstrained)) {
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

      // Comprehensive monitoring - enabled on Render Pro and non-constrained environments
      // Can also be disabled via ENABLE_COMPREHENSIVE_MONITORING=false
      const enableComprehensiveMonitoring = process.env.ENABLE_COMPREHENSIVE_MONITORING !== 'false';
      const enableMonitoring = (isRenderPro || !isSevereResourceConstrained) && !process.env.DISABLE_MONITORING && enableComprehensiveMonitoring;

      if (enableMonitoring) {
        try {
          // Use longer intervals to reduce overhead
          const monitoringInterval = isRenderPro ? 300000 : 180000; // 5min for Pro, 3min for others (increased from 2min/1min)
          comprehensiveMonitoringService.startMonitoring(monitoringInterval);
          console.log('✅ Comprehensive monitoring service started');
          console.log(`📊 System health monitoring active (${monitoringInterval / 1000}s intervals)`);
        } catch (error) {
          console.warn('⚠️ Monitoring service initialization failed:', error);
        }
      } else {
        const reason = isRenderFree ? 'Render free tier' :
          isMemoryCritical ? 'memory critical (<512MB)' :
            isResourceConstrained ? 'resource constraints' :
              !enableComprehensiveMonitoring ? 'disabled via env var' :
                'manual disable';
        console.log(`⚠️ Comprehensive monitoring disabled (${reason}) to save memory`);
      }

      // Order event listener - enabled on Render Pro and non-constrained environments
      // Can also be disabled via ENABLE_BACKGROUND_SERVICES=false
      const enableBackgroundServices = process.env.ENABLE_BACKGROUND_SERVICES !== 'false';

      if (enableMonitoring && (isRenderPro || !isSevereResourceConstrained) && enableBackgroundServices) {
        try {
          orderEventListenerService.startListening();
          console.log('✅ Order event listener started');
          console.log('🔄 Listening for order events to trigger messaging automation');
        } catch (error) {
          console.warn('⚠️ Order event listener failed to start:', error);
        }
      } else {
        console.log('⚠️ Order event listener disabled to save resources');
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

  const shutdownTimeout = isResourceConstrained ? 5000 : (isRenderPro ? 15000 : 10000); // Longer timeout for Pro
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
