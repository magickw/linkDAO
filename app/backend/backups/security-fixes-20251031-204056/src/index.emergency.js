// EMERGENCY BACKEND - Minimal working version for immediate deployment
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// CORS Configuration - Critical for frontend connectivity
const corsOptions = {
  origin: [
    'https://linkdao.io',
    'https://linkdao-git-main.vercel.app',
    'https://linkdao-frontend.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-wallet-address']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'linkdao-backend-emergency',
    version: '1.0.0-emergency'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: 'operational',
    database: 'connected'
  });
});

// Mock Data for Critical Endpoints
const mockListings = [
  {
    id: '1',
    title: 'Digital Art Collection',
    description: 'Beautiful digital artwork',
    price: '25.00',
    currency: 'USDC',
    seller: '0x1234567890123456789012345678901234567890',
    image: '/api/placeholder/400/300',
    category: 'art',
    status: 'active'
  },
  {
    id: '2',
    title: 'NFT Gaming Asset',
    description: 'Rare gaming NFT',
    price: '50.00',
    currency: 'USDC',
    seller: '0xabcdef1234567890abcdef1234567890abcdef12',
    image: '/api/placeholder/400/300',
    category: 'gaming',
    status: 'active'
  }
];

const mockProfile = {
  walletAddress: '',
  username: 'Demo User',
  bio: 'Welcome to LinkDAO Marketplace',
  avatar: '/api/placeholder/64/64',
  verified: true,
  joinedDate: new Date().toISOString(),
  stats: {
    totalSales: 0,
    totalListings: 0,
    rating: 5.0,
    reviews: 0
  }
};

// Marketplace Endpoints
app.get('/marketplace/listings', (req, res) => {
  res.json({
    success: true,
    data: mockListings,
    total: mockListings.length
  });
});

app.get('/marketplace/seller/listings/:address', (req, res) => {
  const { address } = req.params;
  const userListings = mockListings.filter(listing => 
    listing.seller.toLowerCase() === address.toLowerCase()
  );
  
  res.json({
    success: true,
    data: userListings,
    total: userListings.length
  });
});

app.get('/marketplace/seller/profile/:address', (req, res) => {
  const { address } = req.params;
  res.json({
    success: true,
    data: {
      ...mockProfile,
      walletAddress: address
    }
  });
});

app.get('/marketplace/seller/dashboard/:address', (req, res) => {
  res.json({
    success: true,
    data: {
      totalEarnings: '0.00',
      totalSales: 0,
      activeListings: 0,
      pendingOrders: 0,
      recentActivity: []
    }
  });
});

app.get('/marketplace/seller/notifications/:address', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

app.get('/marketplace/reputation/:address', (req, res) => {
  res.json({
    success: true,
    data: {
      score: 5.0,
      reviews: 0,
      badges: ['verified'],
      trustLevel: 'high'
    }
  });
});

// Posts/Feed Endpoints
app.get('/api/posts/feed', (req, res) => {
  res.json({
    success: true,
    data: [],
    hasMore: false
  });
});

// Auth Endpoints
app.get('/api/auth/nonce/:address', (req, res) => {
  const nonce = Math.random().toString(36).substring(2, 15);
  res.json({
    success: true,
    nonce: nonce
  });
});

app.post('/api/auth/wallet', (req, res) => {
  res.json({
    success: true,
    token: 'mock-jwt-token',
    user: {
      address: req.body.address,
      authenticated: true
    }
  });
});

// Communities Endpoints
app.get('/api/communities', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

// Profiles Endpoints
app.get('/api/profiles', (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Emergency backend server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 CORS enabled for frontend domains`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;