"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
process.on('uncaughtException', (error) => {
    const errorDetails = {
        timestamp: new Date().toISOString(),
        type: 'UNCAUGHT_EXCEPTION',
        message: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack,
        errno: error.errno,
        syscall: error.syscall,
        address: error.address,
        port: error.port
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
            code: reason.code
        } : String(reason)
    };
    process.stdout.write('\n=== UNHANDLED REJECTION (RAW OUTPUT) ===\n');
    process.stdout.write(JSON.stringify(rejectionDetails, null, 2));
    process.stdout.write('\n======================================\n\n');
});
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const securityConfig_1 = require("./config/securityConfig");
const securityMiddleware_1 = require("./middleware/securityMiddleware");
const corsMiddleware_1 = require("./middleware/corsMiddleware");
const requestLogging_1 = require("./middleware/requestLogging");
const globalErrorHandler_1 = require("./middleware/globalErrorHandler");
const enhancedErrorHandler_1 = require("./middleware/enhancedErrorHandler");
const enhancedRequestLogging_1 = require("./middleware/enhancedRequestLogging");
const enhancedRateLimiting_1 = require("./middleware/enhancedRateLimiting");
const comprehensiveMonitoringService_1 = require("./services/comprehensiveMonitoringService");
const metricsMiddleware_1 = require("./middleware/metricsMiddleware");
const performanceOptimizationIntegration_1 = __importDefault(require("./middleware/performanceOptimizationIntegration"));
const pg_1 = require("pg");
const webSocketService_1 = require("./services/webSocketService");
const adminWebSocketService_1 = require("./services/adminWebSocketService");
const sellerWebSocketService_1 = require("./services/sellerWebSocketService");
let cacheService = null;
let cacheWarmingService = null;
async function initializeServices() {
    if (!cacheService) {
        try {
            const cacheModule = await Promise.resolve().then(() => __importStar(require('./services/cacheService.js')));
            if (cacheModule.default) {
                if (typeof cacheModule.default === 'function') {
                    cacheService = new cacheModule.default();
                }
                else {
                    cacheService = cacheModule.default;
                }
            }
        }
        catch (error) {
            console.error('Failed to import cacheService:', error);
        }
    }
    if (!cacheWarmingService) {
        try {
            const warmingModule = await Promise.resolve().then(() => __importStar(require('./services/cacheWarmingService')));
            if (warmingModule.cacheWarmingService) {
                cacheWarmingService = warmingModule.cacheWarmingService;
            }
            else if (warmingModule.default) {
                if (typeof warmingModule.default === 'function') {
                    cacheWarmingService = new warmingModule.default();
                }
                else {
                    cacheWarmingService = warmingModule.default;
                }
            }
        }
        catch (error) {
            console.error('Failed to import cacheWarmingService:', error);
        }
    }
    return { cacheService, cacheWarmingService };
}
try {
    (0, securityConfig_1.validateSecurityConfig)();
}
catch (error) {
    console.error('Security configuration validation failed:', error);
    process.exit(1);
}
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const PORT = parseInt(process.env.PORT || '10000', 10);
const maxConnections = process.env.RENDER ? 3 : 20;
const minConnections = process.env.RENDER ? 1 : 5;
const dbPool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    max: maxConnections,
    min: minConnections,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
const performanceOptimizer = new performanceOptimizationIntegration_1.default(dbPool, {
    enableCaching: true,
    enableCompression: true,
    enableDatabaseOptimization: true,
    enableConnectionPooling: true,
    enableIndexOptimization: true,
    enableMetrics: true,
    enableAutoOptimization: process.env.NODE_ENV === 'production'
});
const securityEnhancementsMiddleware_1 = require("./middleware/securityEnhancementsMiddleware");
app.use(securityEnhancementsMiddleware_1.securityHeaders);
app.use(securityMiddleware_1.helmetMiddleware);
app.use(corsMiddleware_1.corsMiddleware);
app.use(securityMiddleware_1.ddosProtection);
app.use(securityMiddleware_1.requestFingerprinting);
app.use(securityEnhancementsMiddleware_1.hideServerInfo);
app.use(securityEnhancementsMiddleware_1.requestSizeLimits);
app.use(securityEnhancementsMiddleware_1.csrfProtection);
app.use(securityEnhancementsMiddleware_1.validateContentType);
app.use(securityEnhancementsMiddleware_1.securityLogger);
app.use(metricsMiddleware_1.metricsTrackingMiddleware);
app.use(requestLogging_1.healthCheckExclusionMiddleware);
app.use(enhancedRequestLogging_1.enhancedRequestLoggingMiddleware);
app.use(enhancedRequestLogging_1.databaseQueryTrackingMiddleware);
app.use(enhancedRequestLogging_1.cacheOperationTrackingMiddleware);
app.use(requestLogging_1.performanceMonitoringMiddleware);
app.use(requestLogging_1.requestSizeMonitoringMiddleware);
app.use(enhancedRateLimiting_1.enhancedApiRateLimit);
app.use(performanceOptimizer.optimize());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use('/static', express_1.default.static('src/public'));
app.use(securityMiddleware_1.inputValidation);
app.use(securityMiddleware_1.threatDetection);
app.use(securityMiddleware_1.securityAuditLogging);
app.use(securityMiddleware_1.fileUploadSecurity);
const healthRoutes_1 = __importDefault(require("./routes/healthRoutes"));
app.use('/', healthRoutes_1.default);
const apiDocsRoutes_1 = __importDefault(require("./routes/apiDocsRoutes"));
app.use('/api/docs', apiDocsRoutes_1.default);
const systemMonitoringRoutes_1 = __importDefault(require("./routes/systemMonitoringRoutes"));
app.use('/api/monitoring', systemMonitoringRoutes_1.default);
const marketplaceRoutes_1 = __importDefault(require("./routes/marketplaceRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const cartRoutes_1 = __importDefault(require("./routes/cartRoutes"));
const sellerRoutes_1 = __importDefault(require("./routes/sellerRoutes"));
const automatedTierUpgradeRoutes_1 = __importDefault(require("./routes/automatedTierUpgradeRoutes"));
const sellerSecurityRoutes_1 = __importDefault(require("./routes/sellerSecurityRoutes"));
const sellerPerformanceRoutes_1 = __importDefault(require("./routes/sellerPerformanceRoutes"));
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
app.use('/api/v1/marketplace', marketplaceRoutes_1.default);
app.use('/api/v1/auth', authRoutes_1.default);
app.use('/api/v1/cart', cartRoutes_1.default);
app.use('/api/v1/sellers', sellerRoutes_1.default);
app.use('/api/v1/marketplace/seller/tier', automatedTierUpgradeRoutes_1.default);
app.use('/api/v1/seller/security', sellerSecurityRoutes_1.default);
app.use('/api/marketplace', marketplaceRoutes_1.default);
app.use('/api/auth', authRoutes_1.default);
app.use('/api/cart', cartRoutes_1.default);
app.use('/api/sellers', sellerRoutes_1.default);
app.use('/api/marketplace/seller/tier', automatedTierUpgradeRoutes_1.default);
app.use('/api/seller/security', sellerSecurityRoutes_1.default);
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
const postRoutes_1 = __importDefault(require("./routes/postRoutes"));
const feedRoutes_1 = __importDefault(require("./routes/feedRoutes"));
const viewRoutes_1 = __importDefault(require("./routes/viewRoutes"));
const bookmarkRoutes_1 = __importDefault(require("./routes/bookmarkRoutes"));
const shareRoutes_1 = __importDefault(require("./routes/shareRoutes"));
const followRoutes_1 = __importDefault(require("./routes/followRoutes"));
const communityRoutes_1 = __importDefault(require("./routes/communityRoutes"));
const messagingRoutes_1 = __importDefault(require("./routes/messagingRoutes"));
const securityRoutes_1 = __importDefault(require("./routes/securityRoutes"));
app.use('/api/posts', postRoutes_1.default);
app.use('/api/feed', feedRoutes_1.default);
app.use('/api/views', viewRoutes_1.default);
app.use('/api/bookmarks', bookmarkRoutes_1.default);
app.use('/api/shares', shareRoutes_1.default);
app.use('/api/follows', followRoutes_1.default);
app.use('/api/follow', followRoutes_1.default);
app.use('/api/communities', communityRoutes_1.default);
const communityTreasuryRoutes_1 = __importDefault(require("./routes/communityTreasuryRoutes"));
app.use('/api/communities', communityTreasuryRoutes_1.default);
const communityCommentRoutes_1 = __importDefault(require("./routes/communityCommentRoutes"));
app.use('/api/communities', communityCommentRoutes_1.default);
app.use('/api/messaging', messagingRoutes_1.default);
const proxyRoutes_1 = __importDefault(require("./routes/proxyRoutes"));
app.use('/', proxyRoutes_1.default);
const marketplaceVerificationRoutes_1 = __importDefault(require("./routes/marketplaceVerificationRoutes"));
const linkSafetyRoutes_1 = __importDefault(require("./routes/linkSafetyRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const adminDashboardRoutes_1 = __importDefault(require("./routes/adminDashboardRoutes"));
const ai_1 = __importDefault(require("./routes/admin/ai"));
const systemHealthMonitoringRoutes_1 = require("./routes/systemHealthMonitoringRoutes");
const workflowAutomationRoutes_1 = __importDefault(require("./routes/workflowAutomationRoutes"));
const analyticsRoutes_1 = __importDefault(require("./routes/analyticsRoutes"));
const marketplaceRegistrationRoutes_1 = __importDefault(require("./routes/marketplaceRegistrationRoutes"));
const disputeRoutes_1 = __importDefault(require("./routes/disputeRoutes"));
const gasFeeSponsorshipRoutes_1 = require("./routes/gasFeeSponsorshipRoutes");
const daoShippingPartnersRoutes_1 = require("./routes/daoShippingPartnersRoutes");
const advancedAnalyticsRoutes_1 = require("./routes/advancedAnalyticsRoutes");
const marketplaceSellerRoutes_1 = __importDefault(require("./routes/marketplaceSellerRoutes"));
const sellerProfileRoutes_1 = __importDefault(require("./routes/sellerProfileRoutes"));
const sellerDashboardRoutes_1 = __importDefault(require("./routes/sellerDashboardRoutes"));
const sellerOrderRoutes_1 = __importDefault(require("./routes/sellerOrderRoutes"));
const sellerListingRoutes_1 = __importDefault(require("./routes/sellerListingRoutes"));
const sellerImageUploadRoutes_1 = __importDefault(require("./routes/sellerImageUploadRoutes"));
const sellerImageRoutes_1 = require("./routes/sellerImageRoutes");
const sellerVerificationRoutes_1 = __importDefault(require("./routes/sellerVerificationRoutes"));
const ensValidationRoutes_1 = __importDefault(require("./routes/ensValidationRoutes"));
const userProfileRoutes_1 = __importDefault(require("./routes/userProfileRoutes"));
const marketplaceListingsRoutes_1 = __importDefault(require("./routes/marketplaceListingsRoutes"));
const listingRoutes_1 = __importDefault(require("./routes/listingRoutes"));
const orderCreationRoutes_1 = __importDefault(require("./routes/orderCreationRoutes"));
const tokenReactionRoutes_1 = __importDefault(require("./routes/tokenReactionRoutes"));
const enhancedSearchRoutes_1 = __importDefault(require("./routes/enhancedSearchRoutes"));
const contentPreviewRoutes_1 = __importDefault(require("./routes/contentPreviewRoutes"));
const enhancedUserRoutes_1 = __importDefault(require("./routes/enhancedUserRoutes"));
const governanceRoutes_1 = __importDefault(require("./routes/governanceRoutes"));
const engagementAnalyticsRoutes_1 = __importDefault(require("./routes/engagementAnalyticsRoutes"));
const authenticationRoutes_1 = require("./routes/authenticationRoutes");
const pollRoutes_1 = __importDefault(require("./routes/pollRoutes"));
const cacheRoutes_1 = __importDefault(require("./routes/cacheRoutes"));
const marketplaceSearchRoutes_1 = __importDefault(require("./routes/marketplaceSearchRoutes"));
const priceOracleRoutes_1 = __importDefault(require("./routes/priceOracleRoutes"));
const reputationRoutes_1 = require("./routes/reputationRoutes");
const monitoringRoutes_1 = __importDefault(require("./routes/monitoringRoutes"));
const performanceRoutes_1 = __importStar(require("./routes/performanceRoutes"));
const transactionRoutes_1 = __importDefault(require("./routes/transactionRoutes"));
const orderManagementRoutes_1 = __importDefault(require("./routes/orderManagementRoutes"));
const sellerAnalyticsRoutes_1 = __importDefault(require("./routes/sellerAnalyticsRoutes"));
const memberBehaviorRoutes_1 = __importDefault(require("./routes/memberBehaviorRoutes"));
const contentPerformanceRoutes_1 = __importDefault(require("./routes/contentPerformanceRoutes"));
process.stdout.write('⚠️  DEX, Staking, and LDAO monitoring routes temporarily disabled\n');
app.use('/api/auth', (0, authenticationRoutes_1.createDefaultAuthRoutes)());
app.use('/api/security', securityRoutes_1.default);
app.use('/api/marketplace/verification', marketplaceVerificationRoutes_1.default);
app.use('/api/link-safety', linkSafetyRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/admin/dashboard', adminDashboardRoutes_1.default);
app.use('/api/admin/ai', ai_1.default);
app.use('/api/admin/system-health', systemHealthMonitoringRoutes_1.systemHealthMonitoringRoutes);
app.use('/api/admin/workflows', workflowAutomationRoutes_1.default);
app.use('/api/analytics', analyticsRoutes_1.default);
app.use('/api/marketplace/registration', marketplaceRegistrationRoutes_1.default);
app.use('/api/marketplace/disputes', disputeRoutes_1.default);
app.use('/api/gas-sponsorship', gasFeeSponsorshipRoutes_1.gasFeeSponsorshipRouter);
app.use('/api/shipping', daoShippingPartnersRoutes_1.daoShippingPartnersRouter);
app.use('/api/analytics', advancedAnalyticsRoutes_1.advancedAnalyticsRouter);
app.use('/api/listings', listingRoutes_1.default);
app.use('/api/orders', orderCreationRoutes_1.default);
app.use('/api/marketplace', marketplaceSellerRoutes_1.default);
app.use('/api/marketplace', sellerProfileRoutes_1.default);
app.use('/api/marketplace', sellerDashboardRoutes_1.default);
app.use('/api/marketplace', sellerOrderRoutes_1.default);
app.use('/api/marketplace', sellerListingRoutes_1.default);
app.use('/api/marketplace', sellerImageUploadRoutes_1.default);
app.use('/api/marketplace/seller/images', sellerImageRoutes_1.sellerImageRoutes);
app.use('/api/marketplace', sellerVerificationRoutes_1.default);
app.use('/api/marketplace', ensValidationRoutes_1.default);
app.use('/api/profiles', userProfileRoutes_1.default);
app.use('/api/marketplace', marketplaceListingsRoutes_1.default);
app.use('/api/reactions', tokenReactionRoutes_1.default);
app.use('/api/search', enhancedSearchRoutes_1.default);
app.use('/api/preview', contentPreviewRoutes_1.default);
app.use('/api/users', enhancedUserRoutes_1.default);
app.use('/api/governance', governanceRoutes_1.default);
app.use('/api/analytics', engagementAnalyticsRoutes_1.default);
app.use('/api/polls', pollRoutes_1.default);
const supportTicketingRoutes_1 = require("./routes/supportTicketingRoutes");
app.use('/api/support', supportTicketingRoutes_1.supportTicketingRoutes);
app.use('/api/cache', cacheRoutes_1.default);
const orderEventListenerService_1 = require("./services/orderEventListenerService");
const orderEventHandlerRoutes_1 = __importDefault(require("./routes/orderEventHandlerRoutes"));
const x402PaymentRoutes_1 = __importDefault(require("./routes/x402PaymentRoutes"));
const receiptRoutes_1 = __importDefault(require("./routes/receiptRoutes"));
app.use('/api/order-events', orderEventHandlerRoutes_1.default);
app.use('/api/x402', x402PaymentRoutes_1.default);
app.use('/api', receiptRoutes_1.default);
app.use('/api/marketplace/search', marketplaceSearchRoutes_1.default);
app.use('/api/price-oracle', priceOracleRoutes_1.default);
app.use('/marketplace/reputation', reputationRoutes_1.reputationRoutes);
app.use('/api/monitoring', monitoringRoutes_1.default);
(0, performanceRoutes_1.setPerformanceOptimizer)(performanceOptimizer);
app.use('/api/performance', performanceRoutes_1.default);
app.use('/api/transactions', transactionRoutes_1.default);
app.use('/api/order-management', orderManagementRoutes_1.default);
app.use('/api/seller-performance', sellerPerformanceRoutes_1.default);
app.use('/api/seller-analytics', sellerAnalyticsRoutes_1.default);
app.use('/api/member-behavior', memberBehaviorRoutes_1.default);
app.use('/api/content-performance', contentPerformanceRoutes_1.default);
const marketplaceMessagingRoutes_1 = __importDefault(require("./routes/marketplaceMessagingRoutes"));
app.use('/api/marketplace/messaging', marketplaceMessagingRoutes_1.default);
const reportBuilderRoutes_1 = __importDefault(require("./routes/reportBuilderRoutes"));
app.use('/api/admin/report-builder', reportBuilderRoutes_1.default);
const reportSchedulerRoutes_1 = __importDefault(require("./routes/reportSchedulerRoutes"));
app.use('/api/admin/report-scheduler', reportSchedulerRoutes_1.default);
const reportExportRoutes_1 = __importDefault(require("./routes/reportExportRoutes"));
app.use('/api/admin/report-export', reportExportRoutes_1.default);
const reportTemplateLibraryRoutes_1 = __importDefault(require("./routes/reportTemplateLibraryRoutes"));
app.use('/api/admin/report-library', reportTemplateLibraryRoutes_1.default);
app.use(requestLogging_1.errorCorrelationMiddleware);
app.use(enhancedErrorHandler_1.enhancedErrorHandler);
app.use(globalErrorHandler_1.globalErrorHandler);
app.use(globalErrorHandler_1.notFoundHandler);
app.use('/api/*', (req, res) => {
    res.json({
        success: true,
        message: `API endpoint ${req.method} ${req.originalUrl} - fixed version`,
        data: null
    });
});
process.stdout.write('📝 All routes and middleware registered successfully\n');
process.stdout.write(`📡 Attempting to start server on port ${PORT}...\n`);
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 LinkDAO Backend with Enhanced Social Platform running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log(`📡 API ready: http://localhost:${PORT}/`);
    setImmediate(() => {
        initializeServices().then(({ cacheService, cacheWarmingService }) => {
            try {
                const webSocketService = (0, webSocketService_1.initializeWebSocket)(httpServer);
                console.log('✅ WebSocket service initialized');
                console.log(`🔌 WebSocket ready for real-time updates`);
            }
            catch (error) {
                console.warn('⚠️ WebSocket service initialization failed:', error);
            }
            try {
                const adminWebSocketService = (0, adminWebSocketService_1.initializeAdminWebSocket)(httpServer);
                console.log('✅ Admin WebSocket service initialized');
                console.log(`🔧 Admin real-time dashboard ready`);
            }
            catch (error) {
                console.warn('⚠️ Admin WebSocket service initialization failed:', error);
            }
            try {
                const sellerWebSocketService = (0, sellerWebSocketService_1.initializeSellerWebSocket)();
                console.log('✅ Seller WebSocket service initialized');
                console.log(`🛒 Seller real-time updates ready`);
            }
            catch (error) {
                console.warn('⚠️ Seller WebSocket service initialization failed:', error);
            }
            try {
                if (cacheService) {
                    if (typeof cacheService.connect === 'function') {
                        cacheService.connect().then(() => {
                            console.log('✅ Cache service initialized via connect method');
                        }).catch((error) => {
                            console.warn('⚠️ Cache service connection failed:', error);
                        });
                    }
                    else if (cacheService.isConnected) {
                        console.log('✅ Cache service already connected');
                    }
                    else {
                        console.log('⚠️ Cache service available but not connected');
                    }
                }
                else {
                    console.log('⚠️ Cache service not available');
                }
                setTimeout(() => {
                    try {
                        if (cacheWarmingService && typeof cacheWarmingService.performQuickWarmup === 'function') {
                            cacheWarmingService.performQuickWarmup().then(() => {
                                console.log('✅ Initial cache warming completed');
                            }).catch((error) => {
                                console.warn('⚠️ Initial cache warming failed:', error);
                            });
                        }
                    }
                    catch (error) {
                        console.warn('⚠️ Initial cache warming failed:', error);
                    }
                }, 5000);
            }
            catch (error) {
                console.warn('⚠️ Cache service initialization failed:', error);
                console.log('📝 Server will continue without caching');
            }
            try {
                comprehensiveMonitoringService_1.comprehensiveMonitoringService.startMonitoring(60000);
                console.log('✅ Comprehensive monitoring service started');
                console.log('📊 System health monitoring active');
            }
            catch (error) {
                console.warn('⚠️ Monitoring service initialization failed:', error);
            }
            try {
                orderEventListenerService_1.orderEventListenerService.startListening();
                console.log('✅ Order event listener started');
                console.log('🔄 Listening for order events to trigger messaging automation');
            }
            catch (error) {
                console.warn('⚠️ Order event listener failed to start:', error);
            }
        }).catch((error) => {
            console.error('Failed to initialize services:', error);
            console.log('📝 Server will continue without some services');
        });
    });
});
httpServer.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
    }
    else {
        console.error('❌ Server error:', error);
    }
    process.exit(1);
});
const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    try {
        (0, webSocketService_1.shutdownWebSocket)();
        (0, adminWebSocketService_1.shutdownAdminWebSocket)();
        (0, sellerWebSocketService_1.shutdownSellerWebSocket)();
        comprehensiveMonitoringService_1.comprehensiveMonitoringService.stopMonitoring();
        performanceOptimizer.stop();
        await dbPool.end();
        httpServer.close(() => {
            console.log('HTTP server closed');
            process.exit(0);
        });
    }
    catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
exports.default = app;
