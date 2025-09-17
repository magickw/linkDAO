const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { Pool } = require('pg');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// PostgreSQL connection
let db = null;
let dbConnected = false;

async function initializeDatabase() {
  try {
    if (process.env.DATABASE_URL) {
      console.log('🔗 Connecting to PostgreSQL database...');
      db = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
      
      // Test connection
      const client = await db.connect();
      await client.query('SELECT NOW()');
      
      // Check if users table exists and its structure
      try {
        const tableInfo = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'users' 
          ORDER BY ordinal_position;
        `);
        console.log('📋 Users table columns:', tableInfo.rows.map(r => `${r.column_name}(${r.data_type})`).join(', '));
        
        // Check if listings table exists
        const listingsInfo = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'listings' 
          ORDER BY ordinal_position;
        `);
        console.log('📋 Listings table columns:', listingsInfo.rows.map(r => r.column_name).join(', '));
        
      } catch (schemaError) {
        console.log('📋 Schema check failed:', schemaError.message);
      }
      
      client.release();
      
      dbConnected = true;
      console.log('✅ Database connected successfully');
    } else {
      console.warn('⚠️  No DATABASE_URL provided. Running without database.');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('📝 Continuing without database - using in-memory storage');
    dbConnected = false;
  }
}

// In-memory nonce storage (in production, use Redis or database)
const nonceStorage = {};

// Helper function to generate random nonce
function generateNonce() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Helper function to create authentication message
function createAuthMessage(address, nonce) {
  return `Welcome to LinkDAO!

Please sign this message to authenticate your wallet.

Wallet: ${address}
Nonce: ${nonce}
Time: ${new Date().toISOString()}`;
}

// In-memory storage for sessions (in production, use Redis or database)
const sessionStorage = {};

// In-memory fallback storage
const memoryStorage = {
  users: [],
  listings: [],
  orders: []
};

// Helper function to execute database queries with fallback
async function executeQuery(query, params = [], fallbackOperation = null) {
  if (dbConnected && db) {
    try {
      const result = await db.query(query, params);
      return result;
    } catch (error) {
      console.error('Database query failed:', error.message);
      if (fallbackOperation) {
        console.log('Using memory fallback...');
        return fallbackOperation();
      }
      throw error;
    }
  } else {
    if (fallbackOperation) {
      return fallbackOperation();
    }
    throw new Error('Database not available and no fallback provided');
  }
}

// User management functions
async function createOrUpdateUser(walletAddress, handle = null, profileData = {}) {
  const query = `
    INSERT INTO users (wallet_address, handle, profile_cid, created_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (wallet_address) 
    DO UPDATE SET 
      handle = COALESCE($2, users.handle),
      profile_cid = COALESCE($3, users.profile_cid)
    RETURNING *;
  `;
  
  const fallback = () => {
    let user = memoryStorage.users.find(u => u.wallet_address === walletAddress);
    if (!user) {
      user = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        wallet_address: walletAddress,
        handle: handle,
        profile_cid: profileData.profileCid || null,
        created_at: new Date().toISOString()
      };
      memoryStorage.users.push(user);
    } else {
      // Update existing user
      if (handle) user.handle = handle;
      if (profileData.profileCid) user.profile_cid = profileData.profileCid;
    }
    return { rows: [user] };
  };
  
  return executeQuery(query, [
    walletAddress,
    handle,
    profileData.profileCid || null
  ], fallback);
}

async function getUserByAddress(walletAddress) {
  const query = 'SELECT * FROM users WHERE wallet_address = $1';
  
  const fallback = () => {
    const user = memoryStorage.users.find(u => u.wallet_address === walletAddress);
    return { rows: user ? [user] : [] };
  };
  
  return executeQuery(query, [walletAddress], fallback);
}

async function createListing(sellerAddress, listingData) {
  // First ensure user exists
  await createOrUpdateUser(sellerAddress);
  
  const query = `
    INSERT INTO listings (
      seller_id, token_address, price, quantity, item_type, listing_type, 
      metadata_uri, status, created_at, updated_at
    )
    SELECT 
      u.id, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW()
    FROM users u 
    WHERE u.wallet_address = $1
    RETURNING *;
  `;
  
  const fallback = () => {
    const listing = {
      id: `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      seller_address: sellerAddress,
      title: listingData.title,
      description: listingData.description,
      price: listingData.price,
      currency: listingData.currency || 'USD',
      crypto_price: listingData.cryptoPrice,
      crypto_symbol: listingData.cryptoSymbol || 'ETH',
      category: listingData.category,
      listing_type: listingData.listingType || 'FIXED_PRICE',
      metadata_uri: listingData.metadataURI,
      quantity: listingData.quantity || 1,
      item_type: listingData.itemType || 'PHYSICAL',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    memoryStorage.listings.push(listing);
    return { rows: [listing] };
  };
  
  return executeQuery(query, [
    sellerAddress,
    listingData.tokenAddress || '0x0000000000000000000000000000000000000000', // Default token address
    listingData.price,
    listingData.quantity || 1,
    listingData.itemType || 'PHYSICAL',
    listingData.listingType || 'FIXED_PRICE',
    listingData.metadataURI
  ], fallback);
}

async function getListingsBySeller(sellerAddress) {
  const query = `
    SELECT l.*, u.wallet_address as seller_address
    FROM listings l
    JOIN users u ON l.seller_id = u.id
    WHERE u.wallet_address = $1
    ORDER BY l.created_at DESC;
  `;
  
  const fallback = () => {
    const listings = memoryStorage.listings.filter(l => l.seller_address === sellerAddress);
    return { rows: listings };
  };
  
  return executeQuery(query, [sellerAddress], fallback);
}

// Initialize middleware
app.use(compression());
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Web3 Marketplace Backend with Database', 
    version: '1.0.0',
    database: dbConnected ? 'PostgreSQL connected' : 'In-memory fallback',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Authentication routes
app.get('/api/auth/nonce/:address', (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }
    
    const nonce = generateNonce();
    const message = createAuthMessage(address, nonce);
    
    // Store nonce temporarily (expires in 5 minutes)
    nonceStorage[address] = {
      nonce,
      timestamp: Date.now(),
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    };
    
    res.json({
      success: true,
      nonce,
      message
    });
  } catch (error) {
    console.error('Error generating nonce:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/auth/wallet', async (req, res) => {
  try {
    const { address, signature, message, nonce } = req.body;
    
    if (!address || !signature || !message || !nonce) {
      return res.status(400).json({
        success: false,
        error: 'Address, signature, message, and nonce are required'
      });
    }
    
    // Verify nonce
    const storedNonce = nonceStorage[address];
    if (!storedNonce || storedNonce.nonce !== nonce || Date.now() > storedNonce.expires) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired nonce'
      });
    }
    
    // Clean up used nonce
    delete nonceStorage[address];
    
    // For now, we'll skip signature verification and just create/get the user
    // In production, you would verify the signature using ethers.js or similar
    console.log('Authenticating wallet:', address);
    
    // Get or create user
    let userResult = await getUserByAddress(address);
    if (userResult.rows.length === 0) {
      // Create new user
      userResult = await createOrUpdateUser(address, null, {});
    }
    
    const user = userResult.rows[0];
    
    // Generate simple session token (in production, use JWT)
    const token = `token_${address}_${Date.now()}`;
    sessionStorage[token] = {
      address,
      userId: user.id,
      createdAt: Date.now()
    };
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        address: user.wallet_address,
        handle: user.handle || '',
        ens: user.ens || '',
        email: '',
        kycStatus: 'none',
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Error authenticating wallet:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/auth/user', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !sessionStorage[token]) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    const session = sessionStorage[token];
    const userResult = await getUserByAddress(session.address);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    
    res.json({
      success: true,
      user: {
        id: user.id,
        address: user.wallet_address,
        handle: user.handle || '',
        ens: user.ens || '',
        email: '',
        kycStatus: 'none',
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// User profile routes
app.post('/api/profiles', async (req, res) => {
  try {
    const { walletAddress, handle, profileCid } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }
    
    const result = await createOrUpdateUser(walletAddress, handle, {
      profileCid
    });
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating/updating profile:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/profiles/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const result = await getUserByAddress(address);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Marketplace listing routes
app.post('/api/marketplace/listings', async (req, res) => {
  try {
    const { sellerWalletAddress, ...listingData } = req.body;
    
    if (!sellerWalletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Seller wallet address is required'
      });
    }
    
    const result = await createListing(sellerWalletAddress, listingData);
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating listing:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/marketplace/listings/seller/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const result = await getListingsBySeller(address);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching seller listings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generic marketplace endpoints for compatibility
app.get('/marketplace/listings', async (req, res) => {
  try {
    const query = dbConnected 
      ? 'SELECT l.*, u.wallet_address as seller_address FROM listings l JOIN users u ON l.seller_id = u.id WHERE l.status = $1 ORDER BY l.created_at DESC LIMIT 50'
      : null;
    
    const fallback = () => {
      const listings = memoryStorage.listings.filter(l => l.status === 'ACTIVE').slice(0, 50);
      return { rows: listings };
    };
    
    const result = await executeQuery(query, ['ACTIVE'], fallback);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Initialize database and start server
async function startServer() {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`🚀 Web3 Marketplace Backend with Database running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: ${dbConnected ? 'PostgreSQL connected' : 'In-memory fallback'}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log(`📡 API ready: http://localhost:${PORT}/`);
  });
}

startServer().catch(console.error);