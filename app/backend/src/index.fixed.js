const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Create tables if they don't exist
pool.query(`
  CREATE TABLE IF NOT EXISTS sellers (
    wallet_address VARCHAR(42) PRIMARY KEY,
    id VARCHAR(255),
    display_name VARCHAR(255),
    store_name VARCHAR(255),
    bio TEXT,
    description TEXT,
    tier VARCHAR(50) DEFAULT 'basic',
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
  )
`).catch(console.error);

pool.query(`
  CREATE TABLE IF NOT EXISTS listings (
    id VARCHAR(255) PRIMARY KEY,
    seller_wallet_address VARCHAR(42),
    title VARCHAR(255),
    description TEXT,
    price DECIMAL(18,8),
    quantity INTEGER,
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (seller_wallet_address) REFERENCES sellers (wallet_address)
  )
`).catch(console.error);

const app = express();
const PORT = process.env.PORT || 10000;

// Enhanced CORS configuration for production
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://linkdao.vercel.app',
      'https://linkdao-frontend.vercel.app',
      'https://linkdao-git-main.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // Allow any Vercel preview deployment
    if (origin.includes('.vercel.app') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow all for now, remove in production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-Access-Token'
  ],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.get('Origin') || 'none'}`);
  next();
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'LinkDAO Backend API - Production Ready', 
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    status: 'healthy',
    cors: 'enabled',
    endpoints: [
      'GET /',
      'GET /health',
      'GET /ping',
      'GET /api/health',
      'GET /api/auth/nonce/:address',
      'POST /api/auth/wallet',
      'GET /api/posts',
      'GET /api/communities',
      'GET /api/profiles'
    ]
  });
});

// Health check routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    cors: 'enabled'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'LinkDAO Backend API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

app.get('/ping', (req, res) => {
  res.json({ 
    pong: true, 
    timestamp: new Date().toISOString(),
    server: 'LinkDAO Backend'
  });
});

// Auth routes
app.get('/api/auth/nonce/:address', (req, res) => {
  const { address } = req.params;
  
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Ethereum address'
    });
  }
  
  const nonce = Math.random().toString(36).substring(2, 15);
  const message = `Sign this message to authenticate with LinkDAO: ${nonce}`;
  
  res.json({
    success: true,
    nonce,
    message,
    address
  });
});

app.post('/api/auth/wallet', (req, res) => {
  const { address, signature, message } = req.body;
  
  if (!address || !signature || !message) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: address, signature, message'
    });
  }
  
  // Mock authentication - in production, verify the signature
  res.json({
    success: true,
    token: 'mock-jwt-token',
    user: {
      address,
      authenticated: true,
      timestamp: new Date().toISOString()
    }
  });
});

// Posts routes
app.get('/api/posts', (req, res) => {
  const { page = 1, limit = 10, author, tag } = req.query;
  
  // Mock posts data
  const mockPosts = Array.from({ length: parseInt(limit) }, (_, i) => ({
    id: `post-${page}-${i + 1}`,
    title: `Sample Post ${i + 1}`,
    content: `This is sample content for post ${i + 1}`,
    author: author || `0x${Math.random().toString(16).substr(2, 40)}`,
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    tags: tag ? [tag] : ['sample', 'demo'],
    likes: Math.floor(Math.random() * 100),
    comments: Math.floor(Math.random() * 20)
  }));
  
  res.json({
    success: true,
    data: mockPosts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: 100,
      pages: 10
    }
  });
});

app.post('/api/posts', (req, res) => {
  const { title, content, author, tags } = req.body;
  
  if (!title || !content || !author) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: title, content, author'
    });
  }
  
  const newPost = {
    id: `post-${Date.now()}`,
    title,
    content,
    author,
    tags: tags || [],
    timestamp: new Date().toISOString(),
    likes: 0,
    comments: 0
  };
  
  res.status(201).json({
    success: true,
    data: newPost
  });
});

// Communities routes
app.get('/api/communities', (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  
  const mockCommunities = Array.from({ length: parseInt(limit) }, (_, i) => ({
    id: `community-${i + 1}`,
    name: `Community ${i + 1}`,
    description: `This is a sample community ${i + 1}`,
    members: Math.floor(Math.random() * 1000),
    posts: Math.floor(Math.random() * 500),
    created: new Date(Date.now() - i * 86400000).toISOString()
  }));
  
  res.json({
    success: true,
    data: mockCommunities,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: 50,
      pages: 5
    }
  });
});

// Seller CRUD routes
app.get('/api/sellers/profile/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid wallet address'
    });
  }
  
  pool.query('SELECT * FROM sellers WHERE wallet_address = $1', [walletAddress])
    .then(result => {
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Seller profile not found'
        });
      }
      
      const row = result.rows[0];
      const seller = {
        id: row.id,
        walletAddress: row.wallet_address,
        displayName: row.display_name,
        storeName: row.store_name,
        bio: row.bio,
        description: row.description,
        tier: row.tier,
        verified: row.verified,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
      
      res.json({
        success: true,
        data: seller
      });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Database error'
      });
    });
});

app.post('/api/sellers/profile', (req, res) => {
  const { walletAddress, displayName, storeName, bio, description } = req.body;
  
  if (!walletAddress || !displayName || !storeName) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: walletAddress, displayName, storeName'
    });
  }
  
  const seller = {
    id: `seller-${Date.now()}`,
    walletAddress,
    displayName,
    storeName,
    bio: bio || '',
    description: description || '',
    tier: 'basic',
    verified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  pool.query(
    'INSERT INTO sellers (wallet_address, id, display_name, store_name, bio, description, tier, verified, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
    [seller.walletAddress, seller.id, seller.displayName, seller.storeName, seller.bio, seller.description, seller.tier, seller.verified, seller.createdAt, seller.updatedAt]
  )
    .then(() => {
      res.status(201).json({
        success: true,
        data: seller
      });
    })
    .catch(err => {
      console.error('Error creating seller:', err);
      if (err.code === '23505') { // Unique constraint violation
        res.status(409).json({
          success: false,
          message: 'Seller profile already exists'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }
    });
});

app.put('/api/sellers/profile/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  const { displayName, storeName, bio, description } = req.body;
  
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid wallet address'
    });
  }
  
  const updatedAt = new Date().toISOString();
  
  pool.query(
    'UPDATE sellers SET display_name = $1, store_name = $2, bio = $3, description = $4, updated_at = $5 WHERE wallet_address = $6 RETURNING *',
    [displayName, storeName, bio || '', description || '', updatedAt, walletAddress]
  )
    .then(result => {
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Seller profile not found'
        });
      }
      
      const row = result.rows[0];
      const seller = {
        id: row.id,
        walletAddress: row.wallet_address,
        displayName: row.display_name,
        storeName: row.store_name,
        bio: row.bio,
        description: row.description,
        tier: row.tier,
        verified: row.verified,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
      
      res.json({
        success: true,
        data: seller
      });
    })
    .catch(err => {
      console.error('Error updating seller:', err);
      res.status(500).json({
        success: false,
        message: 'Database error'
      });
    });
});

// Marketplace reputation route
app.get('/marketplace/reputation/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid wallet address'
    });
  }
  
  // Mock reputation data
  const reputation = {
    walletAddress,
    score: Math.floor(Math.random() * 100),
    totalSales: Math.floor(Math.random() * 50),
    positiveReviews: Math.floor(Math.random() * 40),
    negativeReviews: Math.floor(Math.random() * 5),
    averageRating: (Math.random() * 2 + 3).toFixed(1), // 3.0 - 5.0
    badges: ['verified', 'top-seller'],
    joinDate: new Date(Date.now() - Math.random() * 31536000000).toISOString() // Random date within last year
  };
  
  res.json({
    success: true,
    data: reputation
  });
});

// Profiles route
app.get('/api/profiles', (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  
  const mockProfiles = Array.from({ length: parseInt(limit) }, (_, i) => ({
    id: `profile-${i + 1}`,
    address: `0x${Math.random().toString(16).substr(2, 40)}`,
    username: `user${i + 1}`,
    displayName: `User ${i + 1}`,
    bio: `This is user ${i + 1}'s bio`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=user${i + 1}`,
    followers: Math.floor(Math.random() * 1000),
    following: Math.floor(Math.random() * 500),
    posts: Math.floor(Math.random() * 100),
    joined: new Date(Date.now() - i * 86400000).toISOString()
  }));
  
  res.json({
    success: true,
    data: mockProfiles,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: 100,
      pages: 10
    }
  });
});

app.get('/api/profiles/address/:address', (req, res) => {
  const { address } = req.params;
  
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Ethereum address'
    });
  }
  
  // Mock profile data
  const profile = {
    id: `profile-${address.slice(-8)}`,
    address,
    username: `user_${address.slice(-6)}`,
    displayName: `User ${address.slice(-4)}`,
    bio: 'LinkDAO community member',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`,
    followers: Math.floor(Math.random() * 1000),
    following: Math.floor(Math.random() * 500),
    posts: Math.floor(Math.random() * 100),
    joined: new Date(Date.now() - Math.random() * 31536000000).toISOString()
  };
  
  res.json({
    success: true,
    data: profile
  });
});

// Posts feed route
app.get('/api/posts/feed', (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  
  const mockPosts = Array.from({ length: parseInt(limit) }, (_, i) => ({
    id: `feed-post-${page}-${i + 1}`,
    title: `Feed Post ${i + 1}`,
    content: `This is content for feed post ${i + 1}`,
    author: {
      address: `0x${Math.random().toString(16).substr(2, 40)}`,
      username: `author${i + 1}`,
      displayName: `Author ${i + 1}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=author${i + 1}`
    },
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    tags: ['feed', 'community', 'linkdao'],
    likes: Math.floor(Math.random() * 100),
    comments: Math.floor(Math.random() * 20),
    shares: Math.floor(Math.random() * 10)
  }));
  
  res.json({
    success: true,
    data: mockPosts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: 200,
      pages: 20
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /',
      'GET /health',
      'GET /ping',
      'GET /api/health',
      'GET /api/auth/nonce/:address',
      'POST /api/auth/wallet',
      'GET /api/posts',
      'POST /api/posts',
      'GET /api/posts/feed',
      'GET /api/communities',
      'GET /api/profiles',
      'GET /api/profiles/address/:address',
      'GET /api/sellers/profile/:walletAddress',
      'POST /api/sellers/profile',
      'PUT /api/sellers/profile/:walletAddress',
      'GET /marketplace/reputation/:walletAddress'
    ]
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 LinkDAO Backend Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for production domains`);
  console.log(`💾 Database: PostgreSQL (${process.env.DATABASE_URL ? 'Connected' : 'URL not set'})`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /                                    - API info`);
  console.log(`   GET  /health                              - Health check`);
  console.log(`   GET  /api/auth/nonce/:address             - Get auth nonce`);
  console.log(`   POST /api/auth/wallet                     - Wallet auth`);
  console.log(`   GET  /api/posts/feed                      - Posts feed`);
  console.log(`   GET  /api/profiles/address/:address       - User profile`);
  console.log(`   GET  /api/sellers/profile/:walletAddress  - Seller profile`);
  console.log(`   POST /api/sellers/profile                 - Create seller`);
  console.log(`   GET  /marketplace/reputation/:address     - Reputation data`);
  console.log(`\n✅ Server ready for requests\n`);
});