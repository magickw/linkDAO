#!/usr/bin/env node

/**
 * Standalone Production Server (Pure JavaScript)
 * 
 * This is a minimal production server that doesn't require TypeScript compilation.
 * Use this as a fallback when TypeScript compilation fails due to memory constraints.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚀 Starting LinkDAO Backend (Standalone Mode)');
console.log(`📊 Node.js version: ${process.version}`);
console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`📊 Port: ${PORT}`);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration - FIXED to use single origin value
app.use((req, res, next) => {
  const requestOrigin = req.get('Origin');

  // List of allowed origins
  const allowedOrigins = [
    'https://www.linkdao.io',
    'https://linkdao.io',
    'https://linkdao.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ];

  // Determine which single origin to allow
  let singleOrigin = '*';

  if (requestOrigin) {
    if (allowedOrigins.includes(requestOrigin)) {
      singleOrigin = requestOrigin;
    } else if (requestOrigin.includes('vercel.app') && requestOrigin.includes('linkdao')) {
      singleOrigin = requestOrigin;
    }
  }

  // Set CORS headers with SINGLE origin value
  res.setHeader('Access-Control-Allow-Origin', singleOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID, X-Correlation-ID, X-Session-ID, X-Wallet-Address, X-Chain-ID, X-CSRF-Token, x-csrf-token, Cache-Control');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
});

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    mode: 'standalone'
  });
});

// Emergency health endpoint (minimal)
app.get('/emergency-health', (req, res) => {
  res.json({ status: 'ok' });
});

// Basic API routes
app.get('/', (req, res) => {
  res.json({
    message: 'LinkDAO Backend API',
    version: process.env.npm_package_version || '1.0.0',
    mode: 'standalone',
    timestamp: new Date().toISOString()
  });
});

// Basic user endpoint
app.get('/api/users/me', (req, res) => {
  res.json({
    message: 'User endpoint - standalone mode',
    user: null
  });
});

// Basic marketplace endpoint
app.get('/api/marketplace/products', (req, res) => {
  res.json({
    message: 'Marketplace endpoint - standalone mode',
    products: []
  });
});

// Basic communities endpoint
app.get('/api/communities', (req, res) => {
  res.json({
    message: 'Communities endpoint - standalone mode',
    communities: []
  });
});

// Catch-all for API routes
app.use('/api/*', (req, res) => {
  res.status(503).json({
    error: 'Service temporarily unavailable',
    message: 'Backend is running in standalone mode with limited functionality',
    mode: 'standalone'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('💥 Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    mode: 'standalone'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl,
    mode: 'standalone'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📡 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📡 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`⚠️  Running in standalone mode with limited functionality`);
});

module.exports = app;