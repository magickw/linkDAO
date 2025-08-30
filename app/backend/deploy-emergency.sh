#!/bin/bash

echo "🚨 Emergency Deployment Script for LinkDAO Backend"
echo "This will deploy a minimal working version to fix the 503 errors"

# Create emergency build directory
mkdir -p dist

# Copy the minimal index.js directly to dist
cat > dist/index.js << 'EOF'
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// Very permissive CORS
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['*'],
  exposedHeaders: ['*']
}));

app.use(express.json());

// Basic routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'LinkDAO Backend API - Emergency Deployment', 
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
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mock API endpoints
app.get('/api/posts/feed', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Feed endpoint working - emergency deployment'
  });
});

app.get('/api/marketplace/listings', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Marketplace endpoint working - emergency deployment'
  });
});

// Catch all API routes
app.use('/api/*', (req, res) => {
  res.json({
    success: true,
    message: `API endpoint ${req.method} ${req.originalUrl} - emergency deployment`,
    data: null
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Emergency LinkDAO Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 API ready: http://localhost:${PORT}/`);
});

module.exports = app;
EOF

echo "✅ Emergency build created in dist/index.js"
echo "🚀 Ready for deployment!"
echo ""
echo "Next steps:"
echo "1. Commit and push this emergency fix"
echo "2. Redeploy on Render.com"
echo "3. Test the endpoints:"
echo "   - https://linkdao-backend.onrender.com/health"
echo "   - https://linkdao-backend.onrender.com/api/posts/feed"
echo "   - https://linkdao-backend.onrender.com/api/marketplace/listings"