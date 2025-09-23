const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { Pool } = require('pg');
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
      client.release();
      
      dbConnected = true;
      console.log('✅ Database connected successfully');
    } else {
      console.warn('⚠️  No DATABASE_URL provided. Running without database.');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    dbConnected = false;
  }
}

// In-memory storage for fallback
const memoryStorage = {
  users: [],
  listings: []
};

// Helper functions
async function createOrUpdateUser(walletAddress, handle = null, profileData = {}) {
  if (!dbConnected || !db) {
    // Fallback to memory storage
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
      if (handle) user.handle = handle;
      if (profileData.profileCid) user.profile_cid = profileData.profileCid;
    }
    return { rows: [user] };
  }
  
  
  const query = `
    INSERT INTO users (wallet_address, handle, profile_cid, created_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (wallet_address) 
    DO UPDATE SET 
      handle = COALESCE($2, users.handle),
      profile_cid = COALESCE($3, users.profile_cid)
    RETURNING *;
  `;
  
  return await db.query(query, [
    walletAddress,
    handle,
    profileData.profileCid || null
  ]);
}

async function getUserByAddress(walletAddress) {
  if (!dbConnected || !db) {
    // Fallback to memory storage
    const user = memoryStorage.users.find(u => u.wallet_address === walletAddress);
    return { rows: user ? [user] : [] };
  }
  
  const query = 'SELECT * FROM users WHERE wallet_address = $1';
  return await db.query(query, [walletAddress]);
}

// Middleware
app.use(compression());
app.use(cors({
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
      callback(null, true); // Allow all for now
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'LinkDAO Backend API - Production Ready', 
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    status: 'healthy',
    database: dbConnected ? 'connected' : 'disconnected'
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

app.get('/ping', (req, res) => {
  res.json({ 
    pong: true, 
    timestamp: new Date().toISOString(),
    server: 'LinkDAO Backend'
  });
});

// Profile routes - Fixed to match frontend expectations
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

// Add the missing endpoint that matches the frontend expectation
app.get('/api/profiles/address/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address'
      });
    }
    
    const result = await getUserByAddress(address);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Transform the user data to match the frontend UserProfile interface
    const user = result.rows[0];
    let profileData = {};
    
    try {
      if (user.profile_cid) {
        profileData = JSON.parse(user.profile_cid);
      }
    } catch (e) {
      console.log('Failed to parse profile data for user:', user.wallet_address);
    }
    
    const profile = {
      id: user.id,
      walletAddress: user.wallet_address,
      handle: user.handle || '',
      ens: profileData.ens || '',
      avatarCid: profileData.avatarCid || profileData.profilePicture || '',
      bioCid: profileData.bioCid || profileData.bio || '',
      email: profileData.email || '',
      billingFirstName: profileData.billingFirstName || '',
      billingLastName: profileData.billingLastName || '',
      billingCompany: profileData.billingCompany || '',
      billingAddress1: profileData.billingAddress1 || '',
      billingAddress2: profileData.billingAddress2 || '',
      billingCity: profileData.billingCity || '',
      billingState: profileData.billingState || '',
      billingZipCode: profileData.billingZipCode || '',
      billingCountry: profileData.billingCountry || '',
      billingPhone: profileData.billingPhone || '',
      shippingFirstName: profileData.shippingFirstName || '',
      shippingLastName: profileData.shippingLastName || '',
      shippingCompany: profileData.shippingCompany || '',
      shippingAddress1: profileData.shippingAddress1 || '',
      shippingAddress2: profileData.shippingAddress2 || '',
      shippingCity: profileData.shippingCity || '',
      shippingState: profileData.shippingState || '',
      shippingZipCode: profileData.shippingZipCode || '',
      shippingCountry: profileData.shippingCountry || '',
      shippingPhone: profileData.shippingPhone || '',
      createdAt: new Date(user.created_at),
      updatedAt: new Date(user.created_at)
    };
    
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error fetching profile by address:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add marketplace seller endpoints
// Seller profile endpoints
app.post('/marketplace/seller/profile', async (req, res) => {
  try {
    const profileData = req.body;
    const { walletAddress, displayName, storeName, bio, description, profilePicture, logo } = profileData;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }
    
    // Create or update user with seller profile data
    const result = await createOrUpdateUser(walletAddress, displayName || storeName, {
      profileCid: JSON.stringify({
        displayName,
        storeName,
        bio,
        description,
        profilePicture,
        logo
      })
    });
    
    const user = result.rows[0];
    const newProfile = {
      id: user.id,
      walletAddress: user.wallet_address,
      displayName: displayName || '',
      storeName: storeName || '',
      bio: bio || '',
      description: description || '',
      profilePicture: profilePicture || '',
      logo: logo || '',
      createdAt: user.created_at,
      updatedAt: new Date().toISOString()
    };
    
    console.log(`Seller profile created/updated for ${walletAddress}:`, newProfile);
    
    res.json({
      success: true,
      message: 'Seller profile created successfully',
      data: newProfile
    });
  } catch (error) {
    console.error('Error creating seller profile:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.put('/marketplace/seller/profile/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const updateData = req.body;
    const { displayName, storeName, bio, description, profilePicture, logo } = updateData;
    
    // Update user with new seller profile data
    const result = await createOrUpdateUser(walletAddress, displayName || storeName, {
      profileCid: JSON.stringify({
        displayName,
        storeName,
        bio,
        description,
        profilePicture,
        logo
      })
    });
    
    const user = result.rows[0];
    const updatedProfile = {
      id: user.id,
      walletAddress: user.wallet_address,
      displayName: displayName || '',
      storeName: storeName || '',
      bio: bio || '',
      description: description || '',
      profilePicture: profilePicture || '',
      logo: logo || '',
      createdAt: user.created_at,
      updatedAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      message: 'Seller profile updated successfully',
      data: updatedProfile
    });
  } catch (error) {
    console.error('Error updating seller profile:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Seller onboarding endpoints
app.get('/marketplace/seller/onboarding/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  
  res.json({
    success: true,
    data: [
      {
        id: 'wallet-connect',
        title: 'Connect Wallet',
        description: 'Connect your Web3 wallet to get started',
        component: 'WalletConnect',
        required: true,
        completed: true
      },
      {
        id: 'profile-setup',
        title: 'Profile Setup',
        description: 'Set up your seller profile and store information',
        component: 'ProfileSetup',
        required: true,
        completed: false
      },
      {
        id: 'verification',
        title: 'Verification',
        description: 'Verify your email and phone for enhanced features',
        component: 'Verification',
        required: false,
        completed: false
      },
      {
        id: 'payout-setup',
        title: 'Payout Setup',
        description: 'Configure your payment preferences',
        component: 'PayoutSetup',
        required: true,
        completed: false
      },
      {
        id: 'first-listing',
        title: 'Create First Listing',
        description: 'Create your first product listing',
        component: 'FirstListing',
        required: true,
        completed: false
      }
    ]
  });
});

app.put('/marketplace/seller/onboarding/:walletAddress/:stepId', (req, res) => {
  const { walletAddress, stepId } = req.params;
  const data = req.body;
  
  console.log(`Onboarding step ${stepId} updated for ${walletAddress}:`, data);
  
  res.json({
    success: true,
    message: `Onboarding step ${stepId} updated successfully`,
    data
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
      'GET /api/profiles/address/:address',
      'POST /marketplace/seller/profile',
      'PUT /marketplace/seller/profile/:walletAddress',
      'GET /marketplace/seller/onboarding/:walletAddress',
      'PUT /marketplace/seller/onboarding/:walletAddress/:stepId'
    ]
  });
});

// Initialize database and start server
initializeDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 LinkDAO Backend Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 CORS enabled for production domains`);
    console.log(`💾 Database: PostgreSQL (${dbConnected ? 'Connected' : 'Not connected'})`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    console.log(`\n📋 Available endpoints:`);
    console.log(`   GET  /                                    - API info`);
    console.log(`   GET  /health                              - Health check`);
    console.log(`   GET  /api/profiles/address/:address       - User profile`);
    console.log(`   POST /marketplace/seller/profile          - Create seller profile`);
    console.log(`   PUT  /marketplace/seller/profile/:walletAddress - Update seller profile`);
    console.log(`   GET  /marketplace/seller/onboarding/:walletAddress - Get onboarding steps`);
    console.log(`   PUT  /marketplace/seller/onboarding/:walletAddress/:stepId - Update onboarding step`);
    console.log(`\n✅ Server ready for requests\n`);
  });
});