import express from 'express';
import { safeLogger } from '../utils/safeLogger';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';
import compatChatRoutes from './routes/compatibilityChat';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Enable compression to reduce memory usage
app.use(compression());

// Optimized CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // Cache preflight for 24 hours
}));

// Limit JSON payload size to reduce memory usage
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Memory optimization: Disable x-powered-by header
app.disable('x-powered-by');

// Basic health and info routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Web3 Marketplace Backend API', 
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
});

app.get('/ping', (req, res) => {
  res.json({ pong: true, timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// Marketplace registration routes (essential for the deployment)
app.post('/api/marketplace/registration/seller', (req, res) => {
  const { businessName, email, businessType, description } = req.body;
  
  if (!businessName || !email) {
    return res.status(400).json({
      success: false,
      error: 'Business name and email are required'
    });
  }
  
  // Mock successful registration
  res.json({
    success: true,
    message: 'Seller registration successful',
    data: {
      id: `seller_${Date.now()}`,
      businessName,
      email,
      businessType: businessType || 'general',
      status: 'pending_verification',
      createdAt: new Date().toISOString()
    }
  });
});

app.post('/api/marketplace/registration/buyer', (req, res) => {
  const { firstName, lastName, email, preferences } = req.body;
  
  if (!firstName || !lastName || !email) {
    return res.status(400).json({
      success: false,
      error: 'First name, last name, and email are required'
    });
  }
  
  // Mock successful registration
  res.json({
    success: true,
    message: 'Buyer registration successful',
    data: {
      id: `buyer_${Date.now()}`,
      firstName,
      lastName,
      email,
      preferences: preferences || {},
      status: 'active',
      createdAt: new Date().toISOString()
    }
  });
});

// Essential marketplace endpoints
app.get('/api/marketplace/listings', (req, res) => {
  const { category, limit = 10, offset = 0 } = req.query;
  
  // Mock listings data
  const mockListings = Array.from({ length: Math.min(Number(limit), 10) }, (_, i) => ({
    id: `listing_${i + 1}`,
    title: `Sample Product ${i + 1}`,
    description: `This is a sample product description for item ${i + 1}`,
    price: (Math.random() * 100 + 10).toFixed(2),
    currency: 'USD',
    category: category || 'general',
    seller: {
      id: `seller_${i + 1}`,
      name: `Seller ${i + 1}`,
      rating: (Math.random() * 2 + 3).toFixed(1)
    },
    images: [`https://picsum.photos/300/300?random=${i + 1}`],
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
  }));
  
  res.json({
    success: true,
    data: mockListings,
    pagination: {
      limit: Number(limit),
      offset: Number(offset),
      total: 100,
      hasMore: Number(offset) + Number(limit) < 100
    }
  });
});

app.get('/api/marketplace/listings/:id', (req, res) => {
  const { id } = req.params;
  
  // Mock detailed listing
  res.json({
    success: true,
    data: {
      id,
      title: `Product ${id}`,
      description: `Detailed description for product ${id}`,
      price: (Math.random() * 100 + 10).toFixed(2),
      currency: 'USD',
      category: 'electronics',
      condition: 'new',
      seller: {
        id: 'seller_1',
        name: 'Sample Seller',
        rating: 4.5,
        totalSales: 150,
        memberSince: '2023-01-01'
      },
      images: [
        `https://picsum.photos/600/400?random=${id}1`,
        `https://picsum.photos/600/400?random=${id}2`
      ],
      specifications: {
        brand: 'Sample Brand',
        model: 'Model X',
        warranty: '1 year'
      },
      shipping: {
        free: true,
        estimatedDays: '3-5'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });
});

// Mount compatibility chat routes BEFORE the catch-all so these endpoints resolve
app.use(compatChatRoutes);

// User authentication endpoints (simplified)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }
  
  // Mock successful login
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: 'user_123',
        email,
        name: 'Sample User',
        role: 'buyer'
      },
      token: 'mock_jwt_token_' + Date.now()
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name, role = 'buyer' } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      error: 'Email, password, and name are required'
    });
  }
  
  // Mock successful registration
  res.json({
    success: true,
    message: 'Registration successful',
    data: {
      user: {
        id: `user_${Date.now()}`,
        email,
        name,
        role,
        createdAt: new Date().toISOString()
      },
      token: 'mock_jwt_token_' + Date.now()
    }
  });
});

// Orders endpoint
app.get('/api/orders', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Orders endpoint - mock response'
  });
});

app.post('/api/orders', (req, res) => {
  const { listingId, quantity = 1 } = req.body;
  
  if (!listingId) {
    return res.status(400).json({
      success: false,
      error: 'Listing ID is required'
    });
  }
  
  res.json({
    success: true,
    message: 'Order created successfully',
    data: {
      id: `order_${Date.now()}`,
      listingId,
      quantity,
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  });
});

// Analytics endpoint (lightweight)
app.get('/api/analytics/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      totalListings: 1250,
      totalUsers: 3400,
      totalOrders: 890,
      revenue: 45600.50,
      topCategories: [
        { name: 'Electronics', count: 450 },
        { name: 'Fashion', count: 320 },
        { name: 'Home & Garden', count: 280 }
      ],
      recentActivity: [
        { type: 'new_listing', count: 15, timestamp: new Date().toISOString() },
        { type: 'new_order', count: 8, timestamp: new Date().toISOString() },
        { type: 'new_user', count: 12, timestamp: new Date().toISOString() }
      ]
    }
  });
});

// Catch-all for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    message: `${req.method} ${req.originalUrl} is not implemented`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  safeLogger.error('Error:', error.message);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    error: 'Internal Server Error',
    message: isDevelopment ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for non-API routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  safeLogger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  safeLogger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Memory monitoring
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    if (heapUsedMB > 400) { // Warn if using more than 400MB
      safeLogger.warn(`⚠️  High memory usage: ${heapUsedMB}MB`);
    }
  }, 30000); // Check every 30 seconds
}

// Start server
const server = app.listen(PORT, () => {
  safeLogger.info(`🚀 Web3 Marketplace Backend (Render Optimized) running on port ${PORT}`);
  safeLogger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  safeLogger.info(`🌐 Health check: http://localhost:${PORT}/health`);
  safeLogger.info(`📡 API ready: http://localhost:${PORT}/`);
  
  // Log initial memory usage
  const memUsage = process.memoryUsage();
  safeLogger.info(`💾 Initial memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
});

export default app;
