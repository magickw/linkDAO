#!/usr/bin/env node

/**
 * Optimized Production Server Entry Point
 * 
 * Memory-optimized production server that avoids ts-node overhead
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

// Health check endpoint
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

// Import and use actual routes
try {
  // Import route files
  const healthRoutes = require('./routes/healthRoutes');
  const postRoutes = require('./routes/postRoutes');
  const marketplaceListingsRoutes = require('./routes/marketplaceListingsRoutes');
  const sellerProfileRoutes = require('./routes/sellerProfileRoutes');
  const { reputationRoutes } = require('./routes/reputationRoutes');
  const { createDefaultAuthRoutes } = require('./routes/authenticationRoutes');

  // Mount routes
  app.use('/', healthRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/marketplace', marketplaceListingsRoutes);
  app.use('/api/marketplace', sellerProfileRoutes);
  app.use('/marketplace/reputation', reputationRoutes);
  app.use('/api/auth', createDefaultAuthRoutes());

  console.log('✅ Routes loaded successfully');
} catch (error) {
  console.warn('⚠️ Failed to load some routes:', error.message);
  console.warn('Using fallback stub endpoints');

  // Fallback stub endpoints if routes fail to load
  app.get('/api/marketplace/listings', (req, res) => {
    res.json({ listings: [], total: 0, page: 1, limit: 20 });
  });

  app.get('/api/marketplace/seller/:address', (req, res) => {
    res.json({ address: req.params.address, profile: null, listings: [], reputation: 0 });
  });

  app.get('/api/posts/feed', (req, res) => {
    res.json({ posts: [], hasMore: false, nextCursor: null });
  });

  app.get('/api/profiles/address/:address', (req, res) => {
    res.status(404).json({ error: 'Profile not found', address: req.params.address });
  });
}

// Catch-all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
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
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

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
  if (heapUsedMB > 800) {
    console.warn(`⚠️ High memory usage: ${heapUsedMB}MB`);
    logMemoryUsage();
  }
  
  // Force garbage collection if available and memory is high
  if (global.gc && heapUsedMB > 900) {
    console.log('🧹 Running garbage collection...');
    global.gc();
  }
}, 30000); // Check every 30 seconds

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  
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