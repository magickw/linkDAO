#!/usr/bin/env node

/**
 * Optimized Production Server Entry Point
 *
 * Memory-optimized production server with inline route implementations
 * Avoids ts-node overhead and minimizes memory footprint for Render free tier
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Memory monitoring
function logMemoryUsage() {
  const used = process.memoryUsage();
  console.log('Memory Usage:');
  for (let key in used) {
    console.log(`${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
  }
}

// Log initial memory usage
console.log('🚀 Starting optimized production server...');
logMemoryUsage();

const app = express();
const PORT = process.env.PORT || 10000;

// Basic middleware (memory efficient)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(compression({
  level: 6, // Balanced compression
  threshold: 1024 // Only compress files > 1KB
}));

// CORS configuration - handle multiple origins properly
const allowedOrigins = (process.env.FRONTEND_URL || '*').split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Allow all origins if configured with '*'
    if (allowedOrigins.includes('*')) return callback(null, true);

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Rate limiting (memory efficient)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing (with limits)
app.use(express.json({
  limit: '10mb',
  strict: true
}));

app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));

// ============================================================================
// HEALTH & MONITORING ROUTES
// ============================================================================

app.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    },
    env: process.env.NODE_ENV || 'production'
  });
});

app.get('/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'LinkDAO Marketplace API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      timestamp: new Date().toISOString(),
      status: 'healthy'
    }
  });
});

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

app.get('/api/auth/nonce/:address', (req, res) => {
  const { address } = req.params;

  // Generate a simple nonce
  const nonce = `Sign this message to authenticate with LinkDAO: ${Date.now()}-${Math.random().toString(36).substring(7)}`;

  res.json({
    success: true,
    data: {
      nonce,
      address,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

app.post('/api/auth/verify', (req, res) => {
  const { address, signature, message } = req.body;

  // For now, accept all signatures (add proper verification later)
  res.json({
    success: true,
    data: {
      token: `mock-jwt-token-${address}`,
      address,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// ============================================================================
// MARKETPLACE LISTING ROUTES
// ============================================================================

app.get('/marketplace/listings', (req, res) => {
  const { limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  res.json({
    success: true,
    data: {
      listings: [],
      pagination: {
        total: 0,
        page: 1,
        limit: parseInt(limit),
        hasMore: false
      }
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

app.get('/api/marketplace/listings', (req, res) => {
  const { limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  res.json({
    success: true,
    data: {
      listings: [],
      pagination: {
        total: 0,
        page: 1,
        limit: parseInt(limit),
        hasMore: false
      }
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// ============================================================================
// SELLER PROFILE ROUTES
// ============================================================================

app.get('/api/marketplace/seller/:address', (req, res) => {
  const { address } = req.params;

  res.json({
    success: true,
    data: {
      address,
      profile: null,
      isOnboarded: false,
      createdAt: new Date().toISOString()
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

app.post('/api/marketplace/seller/profile', (req, res) => {
  const { walletAddress, businessName, description } = req.body;

  if (!walletAddress) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_WALLET_ADDRESS',
        message: 'Wallet address is required'
      }
    });
  }

  res.json({
    success: true,
    data: {
      walletAddress,
      businessName: businessName || 'Unnamed Business',
      description: description || '',
      isOnboarded: true,
      createdAt: new Date().toISOString()
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

app.get('/api/marketplace/seller/onboarding/:address/:stepId?', (req, res) => {
  const { address, stepId } = req.params;

  res.json({
    success: true,
    data: {
      address,
      currentStep: stepId || 'business-info',
      steps: [
        { id: 'business-info', completed: false, required: true },
        { id: 'verification', completed: false, required: true },
        { id: 'payment-setup', completed: false, required: false }
      ],
      completedSteps: [],
      isComplete: false
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// Dashboard stats endpoint
app.get('/marketplace/seller/dashboard/:address', (req, res) => {
  const { address } = req.params;

  res.json({
    success: true,
    data: {
      address,
      stats: {
        totalListings: 0,
        activeListings: 0,
        totalSales: 0,
        totalRevenue: '0',
        pendingOrders: 0,
        completedOrders: 0,
        averageRating: 0,
        totalReviews: 0
      },
      recentActivity: [],
      recentOrders: []
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// Seller listings endpoint
app.get('/marketplace/seller/listings/:address', (req, res) => {
  const { address } = req.params;
  const { status, limit = 20, offset = 0 } = req.query;

  res.json({
    success: true,
    data: {
      listings: [],
      total: 0,
      hasMore: false
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// Seller notifications endpoint
app.get('/marketplace/seller/notifications/:address', (req, res) => {
  const { address } = req.params;
  const { unreadOnly = false, limit = 20 } = req.query;

  res.json({
    success: true,
    data: {
      notifications: [],
      unreadCount: 0,
      total: 0
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// ============================================================================
// REPUTATION ROUTES
// ============================================================================

app.get('/marketplace/reputation/:address', (req, res) => {
  const { address } = req.params;

  res.json({
    success: true,
    data: {
      address,
      score: 0,
      level: 'New',
      totalTransactions: 0,
      successfulTransactions: 0,
      disputes: 0,
      rating: 0,
      reviews: []
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

app.get('/api/marketplace/reputation/:address', (req, res) => {
  const { address } = req.params;

  res.json({
    success: true,
    data: {
      address,
      score: 0,
      level: 'New',
      totalTransactions: 0,
      successfulTransactions: 0,
      disputes: 0,
      rating: 0,
      reviews: []
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// ============================================================================
// POSTS/FEED ROUTES
// ============================================================================

app.get('/api/posts/feed', (req, res) => {
  const { limit = 20, cursor } = req.query;

  res.json({
    success: true,
    data: {
      posts: [],
      hasMore: false,
      nextCursor: null
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// ============================================================================
// PROFILE ROUTES
// ============================================================================

app.get('/api/profiles/address/:address', (req, res) => {
  const { address } = req.params;

  res.json({
    success: true,
    data: {
      address,
      username: null,
      bio: null,
      avatar: null,
      createdAt: new Date().toISOString(),
      isNew: true
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// ============================================================================
// CATCH-ALL & ERROR HANDLING
// ============================================================================

// Catch-all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: 'Endpoint not found',
      path: req.originalUrl,
      method: req.method
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);

  // Log memory usage on errors
  if (error.code === 'ENOMEM' || error.message.includes('memory')) {
    console.error('🚨 Memory error detected!');
    logMemoryUsage();
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// ============================================================================
// SERVER STARTUP & MONITORING
// ============================================================================

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📡 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📡 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Memory monitoring interval
setInterval(() => {
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

  // Log if memory usage is high
  if (heapUsedMB > 400) {
    console.warn(`⚠️ High memory usage: ${heapUsedMB}MB`);
    logMemoryUsage();
  }

  // Force garbage collection if available and memory is high
  if (global.gc && heapUsedMB > 450) {
    console.log('🧹 Running garbage collection...');
    global.gc();
  }
}, 30000); // Check every 30 seconds

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 CORS origins: ${allowedOrigins.join(', ')}`);

  // Log memory usage after startup
  setTimeout(() => {
    console.log('📊 Post-startup memory usage:');
    logMemoryUsage();
  }, 5000);
});

// Handle server errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  switch (error.code) {
    case 'EACCES':
      console.error(`❌ ${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`❌ ${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

module.exports = app;
