// LinkDAO Backend - Production Entry Point
// Updated to include marketplace seller endpoints
// Last updated: 2025-09-23

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

// Add missing seller profile GET endpoint that frontend expects
app.get('/marketplace/seller/profile/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const result = await getUserByAddress(walletAddress);

    if (result.rows.length === 0) {
      // Return default profile instead of 404
      const defaultProfile = {
        id: `seller_${Date.now()}`,
        walletAddress,
        tier: 'basic',
        displayName: '',
        storeName: '',
        bio: '',
        description: '',
        profilePicture: '',
        logo: '',
        email: '',
        emailVerified: false,
        phone: '',
        phoneVerified: false,
        kycStatus: 'none',
        payoutPreferences: {
          defaultCrypto: 'USDC',
          cryptoAddresses: { USDC: walletAddress, ETH: walletAddress },
          fiatEnabled: false
        },
        stats: {
          totalSales: 0,
          activeListings: 0,
          completedOrders: 0,
          averageRating: 0,
          totalReviews: 0,
          reputationScore: 100,
          joinDate: new Date().toISOString(),
          lastActive: new Date().toISOString()
        },
        badges: [],
        onboardingProgress: {
          profileSetup: false,
          verification: false,
          payoutSetup: false,
          firstListing: false,
          completed: false,
          currentStep: 1,
          totalSteps: 5
        },
        settings: {
          notifications: {
            orders: true,
            disputes: true,
            daoActivity: true,
            tips: true,
            marketing: false
          },
          privacy: {
            showEmail: false,
            showPhone: false,
            showStats: true
          },
          escrow: {
            defaultEnabled: true,
            minimumAmount: 10
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return res.json({
        success: true,
        data: defaultProfile
      });
    }

    const user = result.rows[0];
    let profileData = {};

    try {
      if (user.profile_cid) {
        profileData = JSON.parse(user.profile_cid);
      }
    } catch (e) {
      console.log('Failed to parse profile data for user:', user.wallet_address);
    }

    const sellerProfile = {
      id: user.id,
      walletAddress: user.wallet_address,
      tier: profileData.tier || 'basic',
      displayName: profileData.displayName || user.handle || '',
      storeName: profileData.storeName || '',
      bio: profileData.bio || '',
      description: profileData.description || '',
      profilePicture: profileData.profilePicture || '',
      logo: profileData.logo || '',
      email: profileData.email || '',
      emailVerified: profileData.emailVerified || false,
      phone: profileData.phone || '',
      phoneVerified: profileData.phoneVerified || false,
      kycStatus: profileData.kycStatus || 'none',
      payoutPreferences: profileData.payoutPreferences || {
        defaultCrypto: 'USDC',
        cryptoAddresses: { USDC: walletAddress, ETH: walletAddress },
        fiatEnabled: false
      },
      stats: profileData.stats || {
        totalSales: 0,
        activeListings: 0,
        completedOrders: 0,
        averageRating: 0,
        totalReviews: 0,
        reputationScore: 100,
        joinDate: user.created_at,
        lastActive: new Date().toISOString()
      },
      badges: profileData.badges || [],
      onboardingProgress: profileData.onboardingProgress || {
        profileSetup: true,
        verification: false,
        payoutSetup: false,
        firstListing: false,
        completed: false,
        currentStep: 2,
        totalSteps: 5
      },
      settings: profileData.settings || {
        notifications: {
          orders: true,
          disputes: true,
          daoActivity: true,
          tips: true,
          marketing: false
        },
        privacy: {
          showEmail: false,
          showPhone: false,
          showStats: true
        },
        escrow: {
          defaultEnabled: true,
          minimumAmount: 10
        }
      },
      createdAt: user.created_at,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: sellerProfile
    });
  } catch (error) {
    console.error('Error fetching seller profile:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add missing seller dashboard endpoint
app.get('/marketplace/seller/dashboard/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    // Mock dashboard data - in production, this would come from your database
    const dashboardStats = {
      sales: {
        today: Math.floor(Math.random() * 500),
        thisWeek: Math.floor(Math.random() * 2000),
        thisMonth: Math.floor(Math.random() * 8000),
        total: Math.floor(Math.random() * 50000)
      },
      orders: {
        pending: Math.floor(Math.random() * 10),
        processing: Math.floor(Math.random() * 5),
        shipped: Math.floor(Math.random() * 15),
        delivered: Math.floor(Math.random() * 100),
        disputed: Math.floor(Math.random() * 2)
      },
      listings: {
        active: Math.floor(Math.random() * 20),
        draft: Math.floor(Math.random() * 5),
        sold: Math.floor(Math.random() * 50),
        expired: Math.floor(Math.random() * 3)
      },
      balance: {
        crypto: {
          USDC: Math.floor(Math.random() * 1000),
          ETH: Math.random() * 2,
          BTC: Math.random() * 0.1
        },
        fiatEquivalent: Math.floor(Math.random() * 5000),
        pendingEscrow: Math.floor(Math.random() * 500),
        availableWithdraw: Math.floor(Math.random() * 2000)
      },
      reputation: {
        score: 85 + Math.floor(Math.random() * 15),
        trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)],
        recentReviews: Math.floor(Math.random() * 10),
        averageRating: 4.0 + Math.random()
      }
    };

    res.json({
      success: true,
      data: dashboardStats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add missing seller listings endpoint
app.get('/marketplace/seller/listings/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { status } = req.query;

    console.log(`Fetching listings for wallet: ${walletAddress}`);

    // Mock listings data - in production, this would come from your database
    const mockListings = [
      {
        id: 'listing_1',
        title: 'Sample Product 1',
        description: 'A great product for everyone',
        category: 'electronics',
        price: 99.99,
        currency: 'USDC',
        quantity: 10,
        condition: 'new',
        images: ['https://picsum.photos/400/300?random=1'],
        status: 'active',
        saleType: 'fixed',
        escrowEnabled: true,
        views: 45,
        favorites: 8,
        questions: 2,
        sellerWalletAddress: walletAddress,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
      }
    ];

    // Filter by status if provided
    const filteredListings = status ? mockListings.filter(listing => listing.status === status) : mockListings;

    console.log(`Returning ${filteredListings.length} listings`);

    res.json({
      success: true,
      data: filteredListings
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add missing seller notifications endpoint
app.get('/marketplace/seller/notifications/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    const notifications = [
      {
        id: 'notif_1',
        type: 'order',
        title: 'New Order Received',
        message: 'You have received a new order for "Sample Product"',
        read: false,
        priority: 'high',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 minutes ago
      },
      {
        id: 'notif_2',
        type: 'system',
        title: 'Profile Verification',
        message: 'Complete your profile verification to unlock more features',
        read: false,
        priority: 'medium',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 hours ago
      },
      {
        id: 'notif_3',
        type: 'tip',
        title: 'Seller Tip',
        message: 'Add more product images to increase your sales by up to 30%',
        read: true,
        priority: 'low',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 day ago
      }
    ];

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add verification endpoints (mock for now)
app.post('/marketplace/seller/verification/email', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email address is required'
    });
  }

  console.log(`Mock: Sending verification email to ${email}`);

  res.json({
    success: true,
    message: `Verification email sent to ${email}. Please check your inbox.`
  });
});

app.post('/marketplace/seller/verification/email/verify', (req, res) => {
  const { token, code } = req.body;

  if (!token && !code) {
    return res.status(400).json({
      success: false,
      error: 'Verification token or code is required'
    });
  }

  console.log(`Mock: Verifying email with token/code: ${token || code}`);

  res.json({
    success: true,
    message: 'Email verified successfully'
  });
});

app.post('/marketplace/seller/verification/phone', (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      error: 'Phone number is required'
    });
  }

  console.log(`Mock: Sending verification SMS to ${phone}`);

  res.json({
    success: true,
    message: `Verification code sent to ${phone}. Please check your SMS.`
  });
});

app.post('/marketplace/seller/verification/phone/verify', (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({
      success: false,
      error: 'Phone number and verification code are required'
    });
  }

  console.log(`Mock: Verifying phone ${phone} with code: ${code}`);

  res.json({
    success: true,
    message: 'Phone verified successfully'
  });
});

// Add Web3 Auth endpoints that the frontend expects
app.get('/api/auth/nonce/:address', (req, res) => {
  const { address } = req.params;

  if (!address) {
    return res.status(400).json({
      success: false,
      error: 'Wallet address is required'
    });
  }

  // Generate a simple nonce for testing
  const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const message = `Sign this message to authenticate with LinkDAO Marketplace.\n\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;

  console.log(`🔑 Generated nonce for ${address}: ${nonce}`);

  res.json({
    success: true,
    nonce,
    message
  });
});

app.post('/api/auth/wallet', async (req, res) => {
  const { address, signature, message, nonce } = req.body;

  console.log(`🔐 Wallet auth attempt for ${address}`);

  if (!address || !signature || !message || !nonce) {
    return res.status(400).json({
      success: false,
      error: 'Address, signature, message, and nonce are required'
    });
  }

  // Mock successful wallet authentication (in production, verify signature)
  const user = {
    id: `user_${Date.now()}`,
    address: address,
    handle: `user_${address.slice(-8)}`,
    ens: '',
    kycStatus: 'none',
    createdAt: new Date().toISOString()
  };

  const token = `jwt_${Date.now()}_${Math.random().toString(36).substring(2)}`;

  console.log(`✅ Wallet auth successful for ${address}`);

  res.json({
    success: true,
    token,
    user
  });
});

// Add missing feed endpoint
app.get('/api/posts/feed', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Feed endpoint - mock response'
  });
});

// Add missing reputation endpoint
app.get('/marketplace/reputation/:address', (req, res) => {
  const { address } = req.params;

  res.json({
    success: true,
    data: {
      address,
      score: 85 + Math.floor(Math.random() * 15),
      level: 'Trusted Seller',
      totalTransactions: Math.floor(Math.random() * 50),
      successRate: 95 + Math.floor(Math.random() * 5),
      badges: ['verified', 'fast-shipper']
    }
  });
});

// Add missing follow endpoints
// Follow endpoints
app.post('/api/follow/follow', async (req, res) => {
  try {
    const { follower, following } = req.body;
    
    if (!follower || !following) {
      return res.status(400).json({
        success: false,
        error: 'Both follower and following addresses are required'
      });
    }
    
    // In a real implementation, you would store this in a database
    // For now, we'll just return a success response
    console.log(`User ${follower} followed user ${following}`);
    
    res.json({
      success: true,
      message: 'Followed successfully'
    });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/follow/unfollow', async (req, res) => {
  try {
    const { follower, following } = req.body;
    
    if (!follower || !following) {
      return res.status(400).json({
        success: false,
        error: 'Both follower and following addresses are required'
      });
    }
    
    // In a real implementation, you would remove this from a database
    // For now, we'll just return a success response
    console.log(`User ${follower} unfollowed user ${following}`);
    
    res.json({
      success: true,
      message: 'Unfollowed successfully'
    });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/follow/followers/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }
    
    // In a real implementation, you would fetch this from a database
    // For now, we'll return mock data
    const followers = [
      '0x1234567890123456789012345678901234567890',
      '0xabcdef123456789012345678901234567890abcd'
    ];
    
    res.json(followers);
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/follow/following/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }
    
    // In a real implementation, you would fetch this from a database
    // For now, we'll return mock data
    const following = [
      '0x1234567890123456789012345678901234567890',
      '0xabcdef123456789012345678901234567890abcd'
    ];
    
    res.json(following);
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/follow/is-following/:follower/:following', async (req, res) => {
  try {
    const { follower, following } = req.params;
    
    if (!follower || !following) {
      return res.status(400).json({
        success: false,
        error: 'Both follower and following addresses are required'
      });
    }
    
    // In a real implementation, you would check this in a database
    // For now, we'll return mock data
    const isFollowing = follower === '0x1234567890123456789012345678901234567890';
    
    res.json(isFollowing);
  } catch (error) {
    console.error('Error checking follow status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/follow/count/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }
    
    // In a real implementation, you would fetch this from a database
    // For now, we'll return mock data
    const followCount = {
      followers: Math.floor(Math.random() * 1000),
      following: Math.floor(Math.random() * 500)
    };
    
    res.json(followCount);
  } catch (error) {
    console.error('Error fetching follow count:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
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
      'GET /marketplace/seller/profile/:walletAddress',
      'GET /marketplace/seller/onboarding/:walletAddress',
      'PUT /marketplace/seller/onboarding/:walletAddress/:stepId',
      'GET /marketplace/seller/dashboard/:walletAddress',
      'GET /marketplace/seller/listings/:walletAddress',
      'GET /marketplace/seller/notifications/:walletAddress',
      'POST /marketplace/seller/verification/email',
      'POST /marketplace/seller/verification/email/verify',
      'POST /marketplace/seller/verification/phone',
      'POST /marketplace/seller/verification/phone/verify',
      'GET /api/auth/nonce/:address',
      'POST /api/auth/wallet',
      'GET /api/posts/feed',
      'GET /marketplace/reputation/:address'
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
    console.log(`   GET  /                                                     - API info`);
    console.log(`   GET  /health                                               - Health check`);
    console.log(`   GET  /api/profiles/address/:address                        - User profile`);
    console.log(`   POST /marketplace/seller/profile                           - Create seller profile`);
    console.log(`   PUT  /marketplace/seller/profile/:walletAddress            - Update seller profile`);
    console.log(`   GET  /marketplace/seller/profile/:walletAddress            - Get seller profile`);
    console.log(`   GET  /marketplace/seller/onboarding/:walletAddress         - Get onboarding steps`);
    console.log(`   PUT  /marketplace/seller/onboarding/:walletAddress/:stepId - Update onboarding step`);
    console.log(`   GET  /marketplace/seller/dashboard/:walletAddress          - Get dashboard stats`);
    console.log(`   GET  /marketplace/seller/listings/:walletAddress           - Get seller listings`);
    console.log(`   GET  /marketplace/seller/notifications/:walletAddress      - Get notifications`);
    console.log(`   POST /marketplace/seller/verification/email                - Send email verification`);
    console.log(`   POST /marketplace/seller/verification/email/verify         - Verify email`);
    console.log(`   POST /marketplace/seller/verification/phone                - Send SMS verification`);
    console.log(`   POST /marketplace/seller/verification/phone/verify         - Verify phone`);
    console.log(`   GET  /api/auth/nonce/:address                              - Get auth nonce`);
    console.log(`   POST /api/auth/wallet                                      - Authenticate wallet`);
    console.log(`   GET  /api/posts/feed                                       - Social feed`);
    console.log(`   GET  /marketplace/reputation/:address                      - User reputation`);
    console.log(`\n✅ Server ready for requests\n`);
  });
});