// CRITICAL: Load environment variables FIRST before any other imports
// This must be a side-effect import at the very top to ensure env vars
// are available when other modules are loaded and instantiate their services
import 'dotenv/config';

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
  // process.exit(1); // CRITICAL: Disabled to prevent container restart loops and allow diagnosis of production crashes
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
// dotenv is loaded via 'import dotenv/config' at the top of this file

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
import { marketplaceCors, generalRateLimit } from './middleware/marketplaceSecurity';

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
import { liveChatSocketService } from './services/liveChatSocketService';
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

// Start blockchain event monitoring in the background without blocking startup
setTimeout(async () => {
  try {
    await blockchainEventService.startGlobalMonitoring();
    console.log('✅ Blockchain event monitoring started');
  } catch (err) {
    console.warn('⚠️ Blockchain event monitoring failed to start (this is OK if blockchain is temporarily unavailable):', err);
  }

  // Start cancellation scheduler
  try {
    const { cancellationSchedulerService } = await import('./services/cancellationSchedulerService');
    cancellationSchedulerService.start();
    console.log('✅ Cancellation scheduler started');
  } catch (err) {
    console.warn('⚠️ Cancellation scheduler failed to start:', err);
  }

  // Start tracking poller
  try {
    const { trackingPollerService } = await import('./services/trackingPollerService');
    trackingPollerService.start();
    console.log('✅ Tracking poller service started');
  } catch (err) {
    console.warn('⚠️ Tracking poller service failed to start:', err);
  }

  // Start order automation jobs
  try {
    const { initializeAutomationJobs } = await import('./jobs/orderAutomationJobs');
    initializeAutomationJobs();
    console.log('✅ Order automation jobs initialized');
  } catch (err) {
    console.warn('⚠️ Order automation jobs failed to start:', err);
  }
}, 2000); // Slight delay to allow other services to initialize first

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
// Optimize for Render deployment constraints
const isRenderFree = process.env.RENDER && !process.env.RENDER_PRO &&
  (!process.env.MEMORY_LIMIT || parseInt(process.env.MEMORY_LIMIT) < 1024) &&
  process.env.RENDER_SERVICE_TYPE !== 'pro';

// improved High Resource detection - checks for explicit flag OR high memory allocation (>= 2GB)
// 4GB RAM users should always be detected as High Resource (Pro)
const isHighResource = (
  process.env.RENDER_PRO === 'true' ||
  process.env.RENDER_SERVICE_TYPE === 'pro' ||
  process.env.RENDER_SERVICE_PLAN === 'pro' ||
  (process.env.MEMORY_LIMIT && parseInt(process.env.MEMORY_LIMIT) >= 2048)
) || false;

// Alias for backward compatibility
const isRenderPro = isHighResource;

const isRenderStandard = process.env.RENDER && (process.env.RENDER_SERVICE_TYPE === 'standard' || process.env.RENDER_SERVICE_PLAN === 'standard');
const isResourceConstrained = !isHighResource && (isRenderFree || (process.env.MEMORY_LIMIT && parseInt(process.env.MEMORY_LIMIT) < 1024 && !isRenderStandard)) &&
  process.env.FORCE_ENABLE_WEBSOCKETS !== 'true';

// More aggressive resource constraints for memory-critical environments
const isMemoryCritical = process.env.MEMORY_LIMIT && parseInt(process.env.MEMORY_LIMIT) < 512;
const isSevereResourceConstrained = !isHighResource && (isRenderFree || isMemoryCritical || (process.env.RENDER && !isRenderStandard));

// Debug Resource configuration
console.log('🚀 RESOURCE CONFIGURATION DEBUG:');
console.log('   MEMORY_LIMIT:', process.env.MEMORY_LIMIT, 'MB');
console.log('   isHighResource:', isHighResource);
console.log('   isResourceConstrained:', isResourceConstrained);
console.log('   isSevereResourceConstrained:', isSevereResourceConstrained);
console.log('   isRenderPro (Legacy):', isRenderPro);

// Database connection pool optimization for different environments
const dbConfig = productionConfig.database;
// Optimize connection pool sizes based on available resources
// Render Pro: 4GB RAM, 2 CPU - can handle significantly more connections
// Optimized database connection pool configuration
const maxConnections = isMemoryCritical ? 1 :
  (isRenderFree ? dbConfig.maxConnections :
    (isRenderPro ? 15 : // Reduced from 20 to 15 for better resource management
      (isRenderStandard ? 8 : // Reduced from 10 to 8
        (process.env.RENDER ? 3 : 15))));
const minConnections = isMemoryCritical ? 1 :
  (isRenderFree ? dbConfig.minConnections :
    (isRenderPro ? 3 : // Reduced from 5 to 3 for better resource management
      (isRenderStandard ? 2 : // Reduced from 3 to 2
        (process.env.RENDER ? 1 : 3))));

// Initialize optimized database pool
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: maxConnections,
  min: minConnections,
  // Optimized timeouts for better resource management
  idleTimeoutMillis: isRenderFree ? dbConfig.idleTimeoutMillis :
    (isRenderPro ? 45000 : // Reduced from 60000 to 45000
      (isRenderStandard ? 45000 : 45000)),
  connectionTimeoutMillis: isRenderFree ? dbConfig.connectionTimeoutMillis :
    (isRenderPro ? 3000 : // Reduced from 5000 to 3000
      (isRenderStandard ? 3000 : 2000)),
  // Add connection cleanup and resource management
  allowExitOnIdle: true,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  // Optimized statement timeouts for better resource management
  statement_timeout: isResourceConstrained ? 20000 : (isRenderPro ? 60000 : 45000),
  // Optimized query timeouts for better resource management
  query_timeout: isResourceConstrained ? 20000 : (isRenderPro ? 55000 : 40000),
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

// Add periodic connection pool health check (reduced frequency to decrease CPU usage)
if (process.env.RENDER || isResourceConstrained) {
  // Adaptive monitoring interval based on environment
  const poolMonitoringInterval = isRenderStandard ? 60000 : 120000; // 1-2 minutes

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
  }, poolMonitoringInterval);
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
import postManagementRoutes from './routes/postManagementRoutes';
import statusRoutes from './routes/statusRoutes';
import postShareRoutes from './routes/postShareRoutes';
import communityPostShareRoutes from './routes/communityPostShareRoutes';
import feedRoutes from './routes/feedRoutes';
import userRoutes from './routes/userRoutes';
import communityRoutes from './routes/communityRoutes';
import { commentRoutes } from './routes/commentRoutes';
import notificationRoutes from './routes/notificationRoutes';
import { userNotificationRoutes } from './routes/userNotificationRoutes';
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
import securityRoutes from './routes/security';
import emailRoutes from './routes/email';
import adminAnalyticsRoutes from './routes/adminAnalytics';
import searchRoutes from './routes/searchRoutes';
import x402ResourceRoutes from './routes/x402ResourceRoutes';
import { x402Middleware } from './middleware/x402Middleware';
import { StripePaymentService } from './services/stripePaymentService';
import { createFiatPaymentRoutes } from './routes/fiatPaymentRoutes';
import { createStripeConnectRoutes } from './routes/stripeConnectRoutes';
// Import reputation routes
import reputationRoutes from './routes/reputationRoutes';
import advancedReputationRoutes from './routes/advancedReputationRoutes';
// Import onboarding routes
import onboardingRoutes from './routes/onboardingRoutes';
// Import documentation routes
import { docsRoutes } from './routes/docsRoutes';
import trackingRoutes from './routes/trackingRoutes';
import hybridPaymentRoutes from './routes/hybridPaymentRoutes';
// Import buyer data management routes
import addressRoutes from './routes/addressRoutes';
import paymentMethodRoutes from './routes/paymentMethodRoutes';
import wishlistRoutes from './routes/wishlistRoutes';
import buyerProfileRoutes from './routes/buyerProfileRoutes';

// Import data deletion routes (GDPR/Platform compliance for Facebook, LinkedIn)
import dataDeletionRoutes from './routes/dataDeletionRoutes';

// Import Gem Purchase Routes
import gemPurchaseRoutes from './routes/gemPurchaseRoutes';

// Mount Gem Purchase Routes
app.use('/api/gems', gemPurchaseRoutes);

// Data deletion routes (required by Facebook and LinkedIn for OAuth apps)
app.use('/api/data-deletion', dataDeletionRoutes);

// Reputation routes
app.use('/marketplace/reputation', reputationRoutes);

// Register hybrid payment routes
app.use('/api/hybrid-payment', hybridPaymentRoutes);

// Register x402 protected routes
// Note: The x402 middleware is applied within the x402ResourceRoutes itself
// to handle the dynamic payment requirements for each checkout
app.use('/api/x402', x402ResourceRoutes);

// Add API reputation routes for frontend compatibility
app.use('/api/reputation', reputationRoutes);

// Add aligned reputation routes for better frontend compatibility
import { alignedReputationRoutes } from './routes/alignedReputationRoutes';
app.use('/api/reputation', alignedReputationRoutes);

// Advanced reputation routes
app.use('/api/reputation/advanced', advancedReputationRoutes);

// Enhanced community reporting routes
import enhancedCommunityReportingRoutes from './routes/enhancedCommunityReportingRoutes';
app.use('/api/community-reporting', enhancedCommunityReportingRoutes);

// Register routes with enhanced error handling
console.log('Registering /p routes');
app.use('/api/p', postShareRoutes); // Short share URLs for timeline posts
console.log('Registering /cp routes');
app.use('/api/cp', communityPostShareRoutes); // Short share URLs for community posts
console.log('Finished registering share routes');


// Post Management routes (Must be before generic post routes)
// Handles /api/posts/communities/:id/pinned-posts and /api/posts/:id/pin
app.use('/api/posts', postManagementRoutes);

app.use('/api/posts', postRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/users', userRoutes);
// Buyer data management routes
app.use('/api/user/addresses', addressRoutes);
app.use('/api/user/payment-methods', paymentMethodRoutes);
app.use('/api/user/wishlists', wishlistRoutes);
app.use('/api/user/buyer-profile', buyerProfileRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/user-notifications', userNotificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/track', trackingRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/metrics', metricsRoutes);
// API documentation routes
app.use('/api/docs', docsRoutes);
// Onboarding routes for user preferences
app.use('/api/onboarding', onboardingRoutes);

// Announcement routes
import announcementRoutes from './routes/announcementRoutes';
app.use('/api', announcementRoutes);
// Enhanced fiat payment routes
app.use('/api/enhanced-fiat-payment', enhancedFiatPaymentRoutes);
// Backward compatibility alias without /api prefix (for service worker or cached requests)
app.use('/enhanced-fiat-payment', enhancedFiatPaymentRoutes);

// Stripe payment routes (for checkout flow)
const stripePaymentService = new StripePaymentService({
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  apiVersion: '2023-10-16'
});
app.use('/api/stripe', createFiatPaymentRoutes(stripePaymentService));
app.use('/api/stripe/connect', createStripeConnectRoutes(stripePaymentService));

// Add root-level health endpoint for frontend compatibility
app.get('/health', async (req, res) => {
  // Prevent caching of health check responses
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  // Get Redis status without forcing a new connection test
  let redisStatus: any = { enabled: false, connected: false };
  try {
    const { redisService } = await import('./services/redisService');
    // Use existing connection status rather than forcing a test
    redisStatus = redisService.getRedisStatus();
  } catch (error) {
    // Redis service not available
    console.warn('Redis service not available for health check:', error.message);
  }

  // Get database status
  let databaseStatus: any = { enabled: false, connected: false };
  try {
    // Test database connection
    if (db) {
      const startTime = Date.now();
      const result = await db.execute(sql`SELECT 1 as test`);
      const queryTime = Date.now() - startTime;

      databaseStatus = {
        enabled: true,
        connected: true,
        latency: queryTime,
        rows: result.length
      };
    }
  } catch (error) {
    databaseStatus = {
      enabled: true,
      connected: false,
      error: error instanceof Error ? error.message : 'Database connection failed'
    };
  }

  res.json({
    status: 'ok',
    service: 'marketplace-api',
    environment: process.env.NODE_ENV || 'development',
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
    // Only perform actual test if connection is not established or if forced
    const forceTest = req.query.force === 'true';
    let testResult;

    if (forceTest || !status.connected) {
      testResult = await redisService.testConnection();
    } else {
      testResult = { connected: status.connected, enabled: status.enabled };
    }

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

// AI Chat Routes
import aiChatRoutes from './routes/aiChatRoutes';
app.use('/api/ai-chat', aiChatRoutes);

// DEX Swap Routes
import dexRoutes from './routes/dexRoutes';
app.use('/api/dex', dexRoutes);

// Add redirect routes for legacy/alternative chat endpoints that frontend might be trying to access
// Remove conflicting chat route registrations to prevent 404/500 errors
// app.use('/api/chat', messagingRoutes);
// Conflicting route registrations removed. Use /api/messaging/* exclusively.
// app.use('/api/messages', messagingRoutes);
// app.use('/api/conversations', messagingRoutes);

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

// Test route for debugging (moved to earlier position)
app.get('/test-route', (req, res) => {
  res.json({ success: true, message: 'Test route is working' });
});

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
// Import advanced analytics routes
import { advancedAnalyticsRouter } from './routes/advancedAnalyticsRoutes';

// Import seller routes (general)
import sellerRoutes from './routes/sellerRoutes';

// Import seller workflow routes
import sellerWorkflowRoutes from './routes/sellerWorkflowRoutes';

// Import shipping routes
import shippingRoutes from './routes/shippingRoutes';

// Import marketplace seller routes
// ALREADY REGISTERED AT /api/sellers
app.use('/api/sellers/workflow', sellerWorkflowRoutes);
// Import seller profile API routes
import sellerProfileRoutes from './routes/sellerProfileRoutes';
// Import seller dashboard routes
import sellerDashboardRoutes from './routes/sellerDashboardRoutes';
// Import seller order routes
import sellerOrderRoutes from './routes/sellerOrderRoutes';
// Import seller listing routes
import sellerListingRoutes from './routes/sellerListingRoutes';
// Import unified seller image routes
import { sellerImageRoutes } from './routes/sellerImageRoutes';
// Import seller verification routes
import sellerVerificationRoutes from './routes/sellerVerificationRoutes';
// Import ENS validation routes
import ensValidationRoutes from './routes/ensValidationRoutes';
// Import marketplace listings routes
import marketplaceListingsRoutes from './routes/marketplaceListingsRoutes';
// Import IPFS proxy routes
import ipfsProxyRoutes from './routes/ipfsProxyRoutes';
import rpcProxyRoutes from './routes/rpcProxyRoutes';
// Import marketplace routes
import marketplaceRoutes from './routes/marketplaceRoutes';
// Import cart routes
import cartRoutes from './routes/cartRoutes';
// Import checkout routes
import checkoutRoutes from './routes/checkoutRoutes';
// Import promo code routes
import promoCodeRoutes from './routes/promoCodeRoutes';
// Import database schema
import { users } from './db/schema';
import { eq, sql } from 'drizzle-orm';
// Import database service
import { db } from './db/index';
// Import listing routes
import listingRoutes from './routes/listingRoutes';
// Import order routes
import orderRoutes from './routes/orderRoutes';
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

// Import fulfillment enhancement routes
import fulfillmentMetricsRoutes from './routes/fulfillmentMetricsRoutes';
import orderAutomationRoutes from './routes/orderAutomationRoutes';
import shippingIntegrationRoutes from './routes/shippingIntegrationRoutes';
import fulfillmentDashboardRoutes from './routes/fulfillmentDashboardRoutes';

// Import leaderboard and treasury routes
import leaderboardRoutes from './routes/leaderboardRoutes';
import treasuryRoutes from './routes/treasuryRoutes';


// Import monthly update routes
import monthlyUpdateRoutes from './routes/monthlyUpdateRoutes';
// Import verification routes
import verificationRoutes from './routes/verificationRoutes';

// Register DEX, staking, and LDAO monitoring routes
app.use('/api/dex', dexTradingRoutes);
app.use('/api/staking', stakingRoutes);
app.use('/api/ldao/monitoring', ldaoPostLaunchMonitoringRoutes);

process.stdout.write('✅ DEX, Staking, and LDAO monitoring routes enabled\n');

// Use LDAO benefits routes
app.use('/api/ldao', ldaoBenefitsRoutes);

// Leaderboard and treasury routes
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/treasury', treasuryRoutes);


app.use('/api', monthlyUpdateRoutes);
app.use('/api/verification', verificationRoutes);
process.stdout.write('✅ Leaderboard, Treasury, Post Management, Announcement, and Monthly Update routes enabled\n');

// Legacy authentication routes
// app.use('/api/auth', createDefaultAuthRoutes());
// Use the enhanced auth routes instead
// Security routes
app.use('/api/security', securityRoutes);
app.use('/api/email', emailRoutes);

// Return and refund routes
// import returnRoutes from './routes/returnRoutes';
// app.use('/api/returns', returnRoutes);

// Import enhanced escrow routes
import enhancedEscrowRoutes from './routes/enhancedEscrowRoutes';
app.use('/api/enhanced-escrow', enhancedEscrowRoutes);

// Import marketplace verification routes
app.use('/api/marketplace/verification', marketplaceVerificationRoutes);

// Link safety routes
app.use('/api/link-safety', linkSafetyRoutes);

// Admin routes - Apply authMiddleware first to populate req.user
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/admin', adminAnalyticsRoutes); // Email analytics endpoint

// Admin dashboard routes
app.use('/api/admin/dashboard', authMiddleware, adminDashboardRoutes);

// Admin AI routes
app.use('/api/admin/ai', authMiddleware, adminAIRoutes);

// System health monitoring routes
app.use('/api/admin/system-health', authMiddleware, systemHealthMonitoringRoutes);

// Charity routes are now handled in adminRoutes.ts

// Workflow automation routes
app.use('/api/admin/workflows', workflowAutomationRoutes);

// Analytics routes
app.use('/api/analytics', analyticsRoutes);

// Customer experience routes
app.use('/api/customer-experience', customerExperienceRoutes);

// Communication management routes
app.use('/api/communication', communicationManagerRoutes);

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

// Order routes
app.use('/api/orders', orderRoutes);

// =============================================================================
// MARKETPLACE ROUTES - Optimized Order (Most Specific → Most Generic)
// =============================================================================
// Route resolution order matters! More specific paths MUST come before generic ones.
// This prevents route conflicts and improves performance.

// 1. MOST SPECIFIC SELLER ROUTES (seller dashboard & management)
// -------------------------------------------------------------------------
app.use('/api/marketplace/seller/dashboard', sellerDashboardRoutes);
app.use('/api/marketplace/seller/orders', sellerOrderRoutes);

// Shipping Routes
app.use('/api/shipping', shippingRoutes);
app.use('/api/marketplace/seller/listings', sellerListingRoutes);
app.use('/api/marketplace/seller/images', sellerImageRoutes);
app.use('/api/marketplace/seller/verification', sellerVerificationRoutes);

// 2. MARKETPLACE-SPECIFIC FEATURES (specific paths)
// -------------------------------------------------------------------------
app.use('/api/marketplace/search', marketplaceSearchRoutes);
app.use('/api/marketplace/listings', marketplaceListingsRoutes);
app.use('/api/marketplace/ens', ensValidationRoutes);
app.use('/api/marketplace/promo-codes', promoCodeRoutes);

// 3. PRODUCT VARIANTS (specific pattern matching)
// -------------------------------------------------------------------------
// NOTE: productVariantRoutes is excluded from tsconfig - commenting out to prevent runtime errors
// const productVariantRoutes = require('./routes/productVariantRoutes').default;
// app.use('/api/marketplace/products', productVariantRoutes);

// 4. SEPARATE SELLER NAMESPACE (alternative API path)
// -------------------------------------------------------------------------
app.use('/api/sellers', sellerRoutes);

// Register product routes
import productRoutes from './routes/productRoutes';
app.use('/api/products', productRoutes);

// 5. CATCH-ALL MARKETPLACE ROUTES (MUST BE LAST)
// -------------------------------------------------------------------------
// Seller profiles - handles /seller/:walletAddress pattern
// Frontend expects: GET /api/marketplace/seller/:walletAddress
app.use('/api/marketplace', sellerProfileRoutes);

// Generic marketplace routes - handles all other /api/marketplace/* patterns
// This should be LAST to avoid conflicts with specific routes above
app.use('/api/marketplace', marketplaceRoutes);

// NOTE: marketplaceSellerRoutes has been removed to prevent route conflicts
// All seller routes are now properly handled by the dedicated route files above

// Profile routes are handled by userProfileRoutes.ts
// This duplicate definition has been removed to prevent conflicts

// Cart routes
app.use('/api/v1/cart', cartRoutes);
app.use('/api/cart', cartRoutes);

// Saved for later routes
import savedForLaterRoutes from './routes/savedForLaterRoutes';
app.use('/api/saved-for-later', savedForLaterRoutes);

// Checkout routes
app.use('/api/checkout', checkoutRoutes);



// Gem webhook routes
import gemWebhookRoutes from './routes/gemWebhookRoutes';
app.use('/api/gems/webhooks', gemWebhookRoutes);

// PayPal webhook routes for chargebacks/disputes
import { createPayPalWebhookRoutes } from './routes/paypalWebhookRoutes';
app.use('/api/paypal', createPayPalWebhookRoutes());

// Token reaction routes
app.use('/api/reactions', tokenReactionRoutes);

// Enhanced search routes (should be just before error handlers)
app.use('/api/search', searchRoutes);
app.use('/api/search/enhanced', enhancedSearchRoutes);

// Content preview routes
app.use('/api/preview', contentPreviewRoutes);

// Enhanced user routes
app.use('/api/users', enhancedUserRoutes);

// Avatar routes - Handles avatar fetching and uploading
import avatarRoutes from './routes/avatarRoutes';
app.use('/api/avatars', avatarRoutes);

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

// Import cron jobs
import { initializeAllCronJobs, stopAllCronJobs } from './cron';

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
app.use('/api/marketplace/seller/returns', returnRoutes);

// IPFS proxy routes (for serving IPFS content without CORS issues)
// Mount IPFS proxy routes under /api/proxy to avoid conflict with /api/ipfs routes
app.use('/api/proxy', ipfsProxyRoutes);

// Generic RPC proxy routes (for avoiding CORS issues with blockchain nodes)
app.use('/api/proxy', rpcProxyRoutes);

// x402 payment routes (using separate path to avoid conflict with x402ResourceRoutes)
app.use('/api/x402-payments', x402PaymentRoutes);

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

// Fulfillment enhancement routes
app.use('/api/seller/metrics', fulfillmentMetricsRoutes);
app.use('/api', orderAutomationRoutes);
app.use('/api/shipping', shippingIntegrationRoutes);
app.use('/api/seller/fulfillment', fulfillmentDashboardRoutes);

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

// Social Media OAuth routes for Twitter, Facebook, LinkedIn integration
import socialMediaOAuthRoutes from './routes/socialMediaOAuthRoutes';
app.use('/api/social-media', socialMediaOAuthRoutes);

// Security audit routes
import securityAuditRoutes from './routes/securityAuditRoutes';
app.use('/api/security-audit', securityAuditRoutes);

// Auth routes
import authRoutes from './routes/authRoutes';
app.use('/api/auth', authRoutes);

// Data export routes
import dataExportRoutes from './routes/dataExportRoutes';
app.use('/api/data-export', dataExportRoutes);

// Marketplace fallback endpoint is now handled by marketplaceListingsRoutes

// Socket.io fallback route (WebSockets may be disabled on resource-constrained environments)
// NOTE: Only handle this if Socket.IO is not initialized
// Socket.IO will handle its own /socket.io/* routes when enabled
// Track whether Socket.IO has initialized
let socketIOInitialized = false;

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

  // If WebSockets are enabled but Socket.IO hasn't initialized yet (startup race condition)
  // Return 503 (Service Unavailable) instead of 500 to indicate temporary unavailability
  if (!socketIOInitialized) {
    return res.status(503).json({
      success: false,
      error: 'WebSocket service starting',
      message: 'Socket.IO is initializing. Please retry in a moment.',
      code: 'SOCKETIO_STARTING',
      retryAfter: 2
    });
  }

  // If Socket.IO is initialized but this route is still hit, something is wrong
  res.status(500).json({
    success: false,
    error: 'Socket.IO service error',
    message: 'Socket.IO failed to handle request. Contact support.',
    code: 'SOCKETIO_ROUTING_ERROR'
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
// BUT: Only apply to API routes to avoid interfering with share URL routes
app.use('/api', missingEndpoints);

process.stdout.write('📝 All routes and middleware registered successfully\n');
process.stdout.write(`📡 Attempting to start server on port ${PORT}...\n`);

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 LinkDAO Backend with Enhanced Social Platform running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`MakeRange Health check: http://localhost:${PORT}/health`);
  console.log(`📡 API ready: http://localhost:${PORT}/`);

  // Initialize services asynchronously without blocking
  setImmediate(async () => {
    // Handle blockchain service separately to avoid blocking other services
    try {
      await blockchainEventService.startGlobalMonitoring();
      console.log('✅ Blockchain event monitoring started');
    } catch (err) {
      console.warn('⚠️ Blockchain event monitoring failed to start (this is OK if blockchain is temporarily unavailable):', err);
    }

    // Start escrow scheduler service for auto-refunds and seller releases
    try {
      const { escrowSchedulerService } = await import('./services/escrowSchedulerService');
      escrowSchedulerService.start();
      console.log('✅ Escrow scheduler service started (auto-refunds and seller releases)');
    } catch (err) {
      console.warn('⚠️ Escrow scheduler service failed to start:', err);
    }

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

      // WebSocket services - enabled on High Resource (Pro) and non-constrained environments
      // Render Pro (4GB RAM, 2 CPU) can easily handle WebSocket connections
      // FORCE ENABLE for stability unless explicitly disabled
      const forceEnableWebSockets = process.env.FORCE_ENABLE_WEBSOCKETS !== 'false';
      const enableWebSockets = !process.env.DISABLE_WEBSOCKETS && (forceEnableWebSockets || isHighResource || (!isSevereResourceConstrained || isRenderStandard));

      if (enableWebSockets) {
        try {
          // CRITICAL FIX: Initialize main WebSocket service FIRST
          // This creates the single shared Socket.IO instance that all other services will use
          const webSocketService = initializeWebSocket(httpServer, productionConfig.webSocket);
          socketIOInitialized = true; // Mark Socket.IO as initialized to prevent fallback route 500 errors
          console.log('✅ WebSocket service initialized (shared Socket.IO instance created)');
          console.log(`🔌 WebSocket ready for real-time updates (High Performance Mode: ${isHighResource ? 'Active' : 'Standard'})`);
          console.log(`📊 WebSocket config: maxConnections=${productionConfig.webSocket.maxConnections}, memoryThreshold=${productionConfig.webSocket.memoryThreshold}MB`);

          // Admin WebSocket service - uses the shared Socket.IO instance via namespaces
          if (isHighResource || !isSevereResourceConstrained) {
            try {
              // DO NOT pass httpServer - this would create a duplicate Socket.IO instance
              // AdminWebSocketService should get the shared instance via getWebSocketService()
              const adminWebSocketService = initializeAdminWebSocket(httpServer);
              console.log('✅ Admin WebSocket service initialized (using shared Socket.IO instance)');
              console.log(`🔧 Admin real-time dashboard ready`);
            } catch (error) {
              console.warn('⚠️ Admin WebSocket service initialization failed:', error);
            }
          } else {
            console.log('⚠️ Admin WebSocket service disabled for resource optimization');
          }

          // Seller WebSocket service - uses the shared Socket.IO instance
          if (isHighResource || !isSevereResourceConstrained) {
            try {
              const sellerWebSocketService = initializeSellerWebSocket();
              console.log('✅ Seller WebSocket service initialized (using shared Socket.IO instance)');
              console.log(`🛒 Seller real-time updates ready`);
            } catch (error) {
              console.warn('⚠️ Seller WebSocket service initialization failed:', error);
            }
          } else {
            console.log('⚠️ Seller WebSocket service disabled for resource optimization');
          }

          // Live Chat Socket service - uses the shared Socket.IO instance
          if (isHighResource || !isSevereResourceConstrained) {
            try {
              // Get the shared Socket.IO instance using the proper method
              const sharedIo = webSocketService.getSocketIOServer();
              if (sharedIo) {
                liveChatSocketService.initialize(sharedIo);
                console.log('✅ Live Chat Socket service initialized (using shared Socket.IO instance)');
                console.log(`💬 Live chat support ready`);
              } else {
                console.warn('⚠️ Live Chat Socket service: shared Socket.IO instance not available');
              }
            } catch (error) {
              console.warn('⚠️ Live Chat Socket service initialization failed:', error);
            }
          } else {
            console.log('⚠️ Live Chat Socket service disabled for resource optimization');
          }
        } catch (error) {
          console.warn('⚠️ WebSocket service initialization failed:', error);
        }
      } else {
        const reason = isRenderFree ? 'Render free tier' :
          isMemoryCritical ? 'memory critical (<512MB)' :
            isResourceConstrained ? 'resource constraints' :
              'manual disable';
        console.log(`⚠️ WebSocket service disabled (${reason}) to conserve memory`);
        console.log(`ℹ️  To force enable, set FORCE_ENABLE_WEBSOCKETS=true`);
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

      // Comprehensive monitoring - enabled on High Resource (Pro) and non-constrained environments
      const enableComprehensiveMonitoring = process.env.ENABLE_COMPREHENSIVE_MONITORING !== 'false';
      const enableMonitoring = (isHighResource || !isSevereResourceConstrained) && !process.env.DISABLE_MONITORING && enableComprehensiveMonitoring;

      if (enableMonitoring) {
        try {
          // Use longer intervals to reduce overhead
          const monitoringInterval = isHighResource ? 300000 : 180000; // 5min for Pro, 3min for others
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

      // Order event listener - enabled on High Resource (Pro) and non-constrained environments
      const enableBackgroundServices = process.env.ENABLE_BACKGROUND_SERVICES !== 'false';

      if (enableMonitoring && (isHighResource || !isSevereResourceConstrained) && enableBackgroundServices) {
        try {
          orderEventListenerService.startListening();
          console.log('✅ Order event listener started');
          console.log('🔄 Listening for order events to trigger messaging automation');
        } catch (error) {
          console.warn('⚠️ Order event listener failed to start:', error);
        }

        // Initialize cron jobs for background processing
        try {
          initializeAllCronJobs();
          console.log('✅ Cron jobs initialized');
          console.log('⏰ Seller notification queue processor running (every minute)');
        } catch (error) {
          console.warn('⚠️ Cron jobs failed to initialize:', error);
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

    // Stop blockchain event monitoring service
    try {
      blockchainEventService.stopAllMonitoring();
      console.log('✅ Blockchain event monitoring service stopped');
    } catch (error) {
      console.warn('⚠️ Error stopping blockchain event monitoring service:', error);
    }

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

    // Stop cron jobs
    console.log('⏰ Stopping cron jobs...');
    try {
      stopAllCronJobs();
      console.log('✅ Cron jobs stopped');
    } catch (error) {
      console.warn('⚠️ Error stopping cron jobs:', error);
    }

    try {
      const { trackingPollerService } = await import('./services/trackingPollerService');
      trackingPollerService.stop();
      console.log('✅ Tracking poller service stopped');
    } catch (error) {
      console.warn('⚠️ Error stopping tracking poller service:', error);
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
console.log('Force redeploy timestamp: Wed Jan 21 17:33:13 PST 2026');
