const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 10000;

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id']
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Messaging endpoints
app.get('/api/chat/conversations', (req, res) => {
  res.json({ success: true, data: [] });
});

app.get('/api/conversations', (req, res) => {
  res.json({ success: true, data: [] });
});

app.get('/api/messages/conversations', (req, res) => {
  res.json({ success: true, data: [] });
});

app.get('/api/messaging/conversations', (req, res) => {
  res.json({ success: true, data: [] });
});

// Marketplace endpoints
app.get('/marketplace/listings', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'prod_001',
        title: 'Sample Product 1',
        price: '0.1',
        currency: 'ETH',
        image: '/placeholder-product.jpg',
        seller: '0x1234...5678'
      }
    ]
  });
});

app.get('/api/marketplace/categories', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: 'Electronics', slug: 'electronics' },
      { id: 2, name: 'Fashion', slug: 'fashion' },
      { id: 3, name: 'Home & Garden', slug: 'home-garden' }
    ]
  });
});

// Socket.io fallback
app.all('/socket.io/*', (req, res) => {
  res.status(503).json({
    success: false,
    error: 'WebSocket service temporarily unavailable'
  });
});

// Catch all API routes
app.use('/api/*', (req, res) => {
  res.json({
    success: true,
    message: `API endpoint ${req.method} ${req.originalUrl} - development server`,
    data: null
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Simple LinkDAO Backend running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 API ready: http://localhost:${PORT}/api`);
});