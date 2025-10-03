import express from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import our new infrastructure
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
import { successResponse, errorResponse } from './utils/apiResponse';
import { AppError } from './middleware/errorHandler';

// Import health routes
import healthRoutes from './routes/healthRoutes';

const app = express();
const PORT = process.env.PORT || 10000;

// Core middleware stack (order matters!)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request tracking and monitoring
app.use(metricsTrackingMiddleware);
app.use(healthCheckExclusionMiddleware);
app.use(performanceMonitoringMiddleware);
app.use(requestSizeMonitoringMiddleware);

// Rate limiting
app.use(generalRateLimit);

// Health and monitoring routes (before other routes)
app.use('/', healthRoutes);

// Basic API info route
app.get('/', (req, res) => {
  successResponse(res, {
    message: 'LinkDAO Marketplace API - Core Infrastructure', 
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    status: 'healthy',
    endpoints: {
      health: '/health',
      ping: '/ping',
      status: '/status',
      api: '/api/*'
    }
  });
});

// Test marketplace endpoints
app.get('/api/marketplace/seller/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  
  // Return null for missing profiles (as per requirements)
  if (walletAddress === 'missing') {
    return successResponse(res, null);
  }
  
  // Return mock seller profile
  successResponse(res, {
    walletAddress,
    displayName: 'Test Seller',
    ensHandle: 'testseller.eth',
    storeDescription: 'A test marketplace seller',
    isVerified: true,
    createdAt: new Date().toISOString()
  });
});

app.get('/marketplace/listings', (req, res) => {
  const { limit = 10, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  
  // Return mock listings
  successResponse(res, [
    {
      id: '1',
      title: 'Test Product 1',
      description: 'A test marketplace product',
      price: '0.1',
      currency: 'ETH',
      sellerAddress: '0x123...',
      images: ['https://example.com/image1.jpg'],
      createdAt: new Date().toISOString()
    }
  ], 200, {
    pagination: {
      page: Math.floor(Number(offset) / Number(limit)) + 1,
      limit: Number(limit),
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }
  });
});

app.get('/marketplace/reputation/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  
  // Return mock reputation data
  successResponse(res, {
    walletAddress,
    score: 4.5,
    totalTransactions: 25,
    positiveReviews: 23,
    negativeReviews: 2,
    lastUpdated: new Date().toISOString()
  });
});

// Test error handling
app.get('/api/test/error', (req, res, next) => {
  const error = new AppError('Test error for demonstration', 400, 'TEST_ERROR');
  next(error);
});

// Error handling middleware (must be last)
app.use(errorCorrelationMiddleware);
app.use(globalErrorHandler);
app.use('*', notFoundHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 LinkDAO Marketplace API (Core Infrastructure) running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 API ready: http://localhost:${PORT}/`);
});

export default app;