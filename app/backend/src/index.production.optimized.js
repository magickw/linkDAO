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
// ADMIN ROUTES
// ============================================================================

// Simple admin stats endpoint
app.get('/api/admin/stats', (req, res) => {
  // Mock data - in a real implementation, this would fetch from the database
  res.json({
    success: true,
    data: {
      pendingModerations: 5,
      pendingSellerApplications: 3,
      openDisputes: 2,
      suspendedUsers: 1,
      totalUsers: 1250,
      totalSellers: 87,
      recentActions: [
        {
          adminHandle: "admin1",
          action: "approved seller application",
          reason: "Verified business documents",
          timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
          adminHandle: "admin2",
          action: "resolved dispute",
          reason: "Buyer received item as described",
          timestamp: new Date(Date.now() - 7200000).toISOString()
        }
      ]
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// Admin dashboard metrics endpoint
app.get('/api/admin/dashboard/metrics', (req, res) => {
  // Mock data - in a real implementation, this would fetch from analytics service
  res.json({
    success: true,
    data: {
      totalAlerts: 24,
      activeAlerts: 3,
      resolvedAlerts: 156,
      averageResponseTime: 120,
      systemHealth: 95
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// Admin dashboard status endpoint
app.get('/api/admin/dashboard/status', (req, res) => {
  res.json({
    success: true,
    data: {
      status: "operational",
      lastChecked: new Date().toISOString(),
      components: []
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// Admin dashboard historical metrics endpoint
app.get('/api/admin/dashboard/historical', (req, res) => {
  // Mock data - in a real implementation, this would fetch from analytics service
  const now = new Date();
  const timeSeries = [];
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    timeSeries.push({
      date: date.toISOString().split('T')[0],
      sales: Math.floor(Math.random() * 10000),
      orders: Math.floor(Math.random() * 100),
      gmv: Math.floor(Math.random() * 15000)
    });
  }
  
  res.json({
    success: true,
    data: {
      timeSeries: timeSeries,
      metrics: {
        totalRevenue: timeSeries.reduce((sum, day) => sum + day.sales, 0),
        totalOrders: timeSeries.reduce((sum, day) => sum + day.orders, 0)
      }
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// Moderation queue endpoint
app.get('/api/admin/moderation', (req, res) => {
  // Mock data - in a real implementation, this would fetch from the database
  const items = [
    {
      id: 1,
      contentId: "post_123",
      contentType: "post",
      userId: "user_456",
      status: "pending",
      riskScore: 0.85,
      decision: null,
      reasonCode: null,
      confidence: 0.92,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 2,
      contentId: "listing_789",
      contentType: "listing",
      userId: "user_101",
      status: "pending",
      riskScore: 0.72,
      decision: null,
      reasonCode: null,
      confidence: 0.88,
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString()
    }
  ];
  
  res.json({
    success: true,
    data: {
      items: items,
      total: items.length,
      page: 1,
      totalPages: 1
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// Assign moderation item endpoint
app.post('/api/admin/moderation/:itemId/assign', (req, res) => {
  const { itemId } = req.params;
  const { assigneeId } = req.body;
  
  // Mock implementation - in a real implementation, this would update the database
  res.json({
    success: true,
    data: {
      message: `Item ${itemId} assigned to ${assigneeId}`
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// Resolve moderation item endpoint
app.post('/api/admin/moderation/:itemId/resolve', (req, res) => {
  const { itemId } = req.params;
  const { action, reason, details } = req.body;
  
  // Mock implementation - in a real implementation, this would update the database
  res.json({
    success: true,
    data: {
      message: `Item ${itemId} resolved with action: ${action}`
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// Seller applications endpoint
app.get('/api/admin/sellers/applications', (req, res) => {
  // Mock data - in a real implementation, this would fetch from the database
  const applications = [
    {
      id: "user_123",
      legalName: "Acme Corporation",
      email: "contact@acme.com",
      country: "US",
      kycVerified: false,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      currentTier: "unverified",
      reputationScore: 0,
      totalVolume: "0"
    },
    {
      id: "user_456",
      legalName: "Global Traders LLC",
      email: "info@globaltraders.com",
      country: "UK",
      kycVerified: true,
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      currentTier: "standard",
      reputationScore: 85,
      totalVolume: "12500"
    }
  ];
  
  res.json({
    success: true,
    data: {
      applications: applications,
      total: applications.length,
      page: 1,
      totalPages: 1
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// Get specific seller application endpoint
app.get('/api/admin/sellers/applications/:applicationId', (req, res) => {
  const { applicationId } = req.params;
  
  // Mock data - in a real implementation, this would fetch from the database
  const application = {
    id: applicationId,
    legalName: "Acme Corporation",
    email: "contact@acme.com",
    country: "US",
    shippingAddress: {
      street: "123 Main St",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "US"
    },
    billingAddress: {
      street: "123 Main St",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "US"
    },
    kycVerified: false,
    kycVerificationDate: null,
    kycProvider: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    currentTier: "unverified",
    reputationScore: 0,
    totalVolume: "0",
    successfulTransactions: 0,
    disputeRate: "0"
  };
  
  res.json({
    success: true,
    data: application,
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// Review seller application endpoint
app.post('/api/admin/sellers/applications/:applicationId/review', (req, res) => {
  const { applicationId } = req.params;
  const { status, notes, rejectionReason, requiredInfo } = req.body;
  
  // Mock implementation - in a real implementation, this would update the database
  res.json({
    success: true,
    data: {
      message: `Application ${applicationId} reviewed with status: ${status}`
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// Disputes endpoint
app.get('/api/admin/disputes', (req, res) => {
  // Mock data - in a real implementation, this would fetch from the database
  const disputes = [
    {
      id: 1,
      escrowId: 101,
      reporterId: "user_123",
      reason: "Product not received",
      status: "open",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      resolvedAt: null,
      resolution: null,
      evidence: []
    },
    {
      id: 2,
      escrowId: 102,
      reporterId: "user_456",
      reason: "Product not as described",
      status: "in_review",
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      resolvedAt: null,
      resolution: null,
      evidence: []
    }
  ];
  
  res.json({
    success: true,
    data: {
      disputes: disputes,
      total: disputes.length,
      page: 1,
      totalPages: 1
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// Get specific dispute endpoint
app.get('/api/admin/disputes/:disputeId', (req, res) => {
  const { disputeId } = req.params;
  
  // Mock data - in a real implementation, this would fetch from the database
  const dispute = {
    id: parseInt(disputeId),
    escrowId: 101,
    reporterId: "user_123",
    reason: "Product not received",
    status: "open",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    resolvedAt: null,
    resolution: null,
    evidence: [
      {
        id: 1,
        disputeId: parseInt(disputeId),
        submitterId: "user_123",
        evidenceType: "screenshot",
        ipfsHash: "Qm...",
        description: "Screenshot of order confirmation",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        verified: true
      }
    ],
    votes: []
  };
  
  res.json({
    success: true,
    data: dispute,
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// Assign dispute endpoint
app.post('/api/admin/disputes/:disputeId/assign', (req, res) => {
  const { disputeId } = req.params;
  const { assigneeId } = req.body;
  
  // Mock implementation - in a real implementation, this would update the database
  res.json({
    success: true,
    data: {
      message: `Dispute ${disputeId} assigned to ${assigneeId}`
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// Resolve dispute endpoint
app.post('/api/admin/disputes/:disputeId/resolve', (req, res) => {
  const { disputeId } = req.params;
  const { outcome, refundAmount, reasoning, adminNotes } = req.body;
  
  // Mock implementation - in a real implementation, this would update the database
  res.json({
    success: true,
    data: {
      message: `Dispute ${disputeId} resolved with outcome: ${outcome}`
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
});

// Add dispute note endpoint
app.post('/api/admin/disputes/:disputeId/notes', (req, res) => {
  const { disputeId } = req.params;
  const { note } = req.body;
  
  // Mock implementation - in a real implementation, this would update the database
  res.json({
    success: true,
    data: {
      message: `Note added to dispute ${disputeId}`
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
