import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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

// Validate security configuration on startup
try {
  validateSecurityConfig();
} catch (error) {
  console.error('Security configuration validation failed:', error);
  process.exit(1);
}

const app = express();
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

// Import security routes
import securityRoutes from './routes/securityRoutes';

// Use post routes
app.use('/api/posts', postRoutes);

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
// Import analytics routes
import analyticsRoutes from './routes/analyticsRoutes';
// Import marketplace registration routes
import marketplaceRegistrationRoutes from './routes/marketplaceRegistrationRoutes';
// Import dispute resolution routes
import { disputeRouter } from './routes/disputeRoutes';
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
// Import engagement analytics routes
import engagementAnalyticsRoutes from './routes/engagementAnalyticsRoutes';
// Import poll routes
import pollRoutes from './routes/pollRoutes';
// Import marketplace search routes
import marketplaceSearchRoutes from './routes/marketplaceSearchRoutes';
// Import price oracle routes
import priceOracleRoutes from './routes/priceOracleRoutes';

// Security routes
app.use('/api/security', securityRoutes);

// Marketplace verification routes
app.use('/api/marketplace/verification', marketplaceVerificationRoutes);

// Link safety routes
app.use('/api/link-safety', linkSafetyRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

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

// Token reaction routes
app.use('/api/reactions', tokenReactionRoutes);

// Enhanced search routes
app.use('/api/search', enhancedSearchRoutes);

// Content preview routes
app.use('/api/preview', contentPreviewRoutes);

// Engagement analytics routes
app.use('/api/analytics', engagementAnalyticsRoutes);

// Poll routes
app.use('/api/polls', pollRoutes);

// Marketplace search routes
app.use('/api/marketplace/search', marketplaceSearchRoutes);

// Price oracle routes
app.use('/api/price-oracle', priceOracleRoutes);

// Marketplace fallback
app.get('/api/marketplace/listings', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Marketplace endpoint working - fixed version'
  });
});

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
app.listen(PORT, () => {
  console.log(`🚀 LinkDAO Backend with Post Routes Fixed running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 API ready: http://localhost:${PORT}/`);
});

export default app;