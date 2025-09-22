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
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Database error'
      });
    });
});

app.put('/api/sellers/profile/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  const { displayName, storeName, bio, description, tier, verified } = req.body;
  const updatedAt = new Date().toISOString();
  
  db.run(
    'UPDATE sellers SET display_name = ?, store_name = ?, bio = ?, description = ?, tier = ?, verified = ?, updated_at = ? WHERE wallet_address = ?',
    [displayName, storeName, bio, description, tier, verified ? 1 : 0, updatedAt, walletAddress],
    function(err) {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Seller profile not found'
        });
      }
      
      // Return updated seller
      db.get('SELECT * FROM sellers WHERE wallet_address = ?', [walletAddress], (err, row) => {
        if (err || !row) {
          return res.status(500).json({
            success: false,
            message: 'Error retrieving updated seller'
          });
        }
        
        const seller = {
          id: row.id,
          walletAddress: row.wallet_address,
          displayName: row.display_name,
          storeName: row.store_name,
          bio: row.bio,
          description: row.description,
          tier: row.tier,
          verified: Boolean(row.verified),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
        
        res.json({
          success: true,
          data: seller
        });
      });
    }
  );
});

app.delete('/api/sellers/profile/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  
  db.run('DELETE FROM sellers WHERE wallet_address = ?', [walletAddress], function(err) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Database error'
      });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Seller profile not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Seller profile deleted'
    });
  });
});

// Listing CRUD routes
app.get('/api/listings', (req, res) => {
  db.all('SELECT * FROM listings ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Database error'
      });
    }
    
    const listings = rows.map(row => ({
      id: row.id,
      sellerWalletAddress: row.seller_wallet_address,
      title: row.title,
      description: row.description,
      price: row.price,
      quantity: row.quantity,
      category: row.category,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    res.json({
      success: true,
      data: listings
    });
  });
});

app.get('/api/listings/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM listings WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Database error'
      });
    }
    
    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }
    
    const listing = {
      id: row.id,
      sellerWalletAddress: row.seller_wallet_address,
      title: row.title,
      description: row.description,
      price: row.price,
      quantity: row.quantity,
      category: row.category,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    
    res.json({
      success: true,
      data: listing
    });
  });
});

app.post('/api/listings', (req, res) => {
  const { sellerWalletAddress, title, description, price, quantity, category } = req.body;
  
  if (!sellerWalletAddress || !title || !price) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: sellerWalletAddress, title, price'
    });
  }
  
  const listing = {
    id: `listing-${Date.now()}`,
    sellerWalletAddress,
    title,
    description: description || '',
    price: parseFloat(price),
    quantity: parseInt(quantity) || 1,
    category: category || 'general',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  db.run(
    'INSERT INTO listings (id, seller_wallet_address, title, description, price, quantity, category, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [listing.id, listing.sellerWalletAddress, listing.title, listing.description, listing.price, listing.quantity, listing.category, listing.status, listing.createdAt, listing.updatedAt],
    function(err) {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }
      
      res.status(201).json({
        success: true,
        data: listing
      });
    }
  );
});

app.put('/api/listings/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, price, quantity, category, status } = req.body;
  const updatedAt = new Date().toISOString();
  
  db.run(
    'UPDATE listings SET title = ?, description = ?, price = ?, quantity = ?, category = ?, status = ?, updated_at = ? WHERE id = ?',
    [title, description, price, quantity, category, status, updatedAt, id],
    function(err) {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Listing not found'
        });
      }
      
      // Return updated listing
      db.get('SELECT * FROM listings WHERE id = ?', [id], (err, row) => {
        if (err || !row) {
          return res.status(500).json({
            success: false,
            message: 'Error retrieving updated listing'
          });
        }
        
        const listing = {
          id: row.id,
          sellerWalletAddress: row.seller_wallet_address,
          title: row.title,
          description: row.description,
          price: row.price,
          quantity: row.quantity,
          category: row.category,
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
        
        res.json({
          success: true,
          data: listing
        });
      });
    }
  );
});

app.delete('/api/listings/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM listings WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Database error'
      });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Listing deleted'
    });
  });
});

// Profiles routes
app.get('/api/profiles', (req, res) => {
  const { address } = req.query;
  
  if (address) {
    // Return specific profile
    res.json({
      success: true,
      data: {
        address,
        username: `user_${address.slice(-6)}`,
        bio: 'Sample user bio',
        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`,
        joined: new Date(Date.now() - Math.random() * 31536000000).toISOString(),
        posts: Math.floor(Math.random() * 100),
        followers: Math.floor(Math.random() * 500)
      }
    });
  } else {
    // Return list of profiles
    const mockProfiles = Array.from({ length: 10 }, (_, i) => ({
      address: `0x${Math.random().toString(16).substr(2, 40)}`,
      username: `user_${i + 1}`,
      bio: `Sample bio for user ${i + 1}`,
      posts: Math.floor(Math.random() * 100),
      followers: Math.floor(Math.random() * 500)
    }));
    
    res.json({
      success: true,
      data: mockProfiles
    });
  }
});

// Catch-all route for undefined endpoints
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api/health',
      'GET /ping',
      'GET /api/auth/nonce/:address',
      'POST /api/auth/wallet',
      'GET /api/posts',
      'POST /api/posts',
      'GET /api/communities',
      'GET /api/profiles'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 LinkDAO Backend API running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for frontend: ${process.env.FRONTEND_URL || 'localhost:3000'}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 API endpoints: http://localhost:${PORT}/`);
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