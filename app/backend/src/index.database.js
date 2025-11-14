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

// Clean up expired nonces every 5 minutes
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [address, data] of Object.entries(nonceStorage)) {
    if (now > data.expires) {
      delete nonceStorage[address];
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired nonces`);
  }
}, 5 * 60 * 1000); // Every 5 minutes

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
    listingData.token_address || listingData.tokenAddress || '0x0000000000000000000000000000000000000000', // Default token address
    listingData.price,
    listingData.quantity || 1,
    listingData.item_type || listingData.itemType || 'PHYSICAL',
    listingData.listing_type || listingData.listingType || 'FIXED_PRICE',
    listingData.metadata_uri || listingData.metadataURI || ''
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
  
  const result = await executeQuery(query, [sellerAddress], fallback);
  
  // Transform database format to match frontend MarketplaceListing interface
  const transformedRows = result.rows.map(listing => {
    // Parse metadata to extract enhanced information
    let parsedMetadata = {};
    try {
      if (listing.metadata_uri) {
        const firstParse = JSON.parse(listing.metadata_uri);
        // Check if this is a nested JSON string (from our enhanced form)
        if (typeof firstParse.description === 'string' && firstParse.description.startsWith('{')) {
          const secondParse = JSON.parse(firstParse.description);
          parsedMetadata = { ...firstParse, ...secondParse };
        } else {
          parsedMetadata = firstParse;
        }
      }
    } catch (e) {
      // If parsing fails, use the raw metadata_uri as title
      parsedMetadata = { title: listing.metadata_uri || 'Untitled' };
    }

    return {
      id: listing.id,
      sellerWalletAddress: listing.seller_address || sellerAddress,
      tokenAddress: listing.token_address || '0x0000000000000000000000000000000000000000',
      price: listing.price.toString(),
      quantity: listing.quantity || 1,
      itemType: listing.item_type || 'PHYSICAL',
      listingType: listing.listing_type || 'FIXED_PRICE',
      status: listing.status ? listing.status.toUpperCase() : 'ACTIVE',
      startTime: listing.start_time || listing.created_at,
      endTime: listing.end_time || null,
      highestBid: listing.highest_bid ? listing.highest_bid.toString() : null,
      highestBidderWalletAddress: listing.highest_bidder || null,
      metadataURI: parsedMetadata.title || listing.metadata_uri || '',
      isEscrowed: listing.is_escrowed || false,
      nftStandard: listing.nft_standard || null,
      tokenId: listing.token_id || null,
      createdAt: listing.created_at,
      updatedAt: listing.updated_at,
      enhancedData: {
        title: parsedMetadata.title || null,
        description: parsedMetadata.description || null,
        images: parsedMetadata.images || [],
        category: parsedMetadata.category || listing.item_type?.toLowerCase(),
        tags: parsedMetadata.tags || [],
        condition: parsedMetadata.condition || 'new',
        escrowEnabled: parsedMetadata.escrowEnabled || false,
        views: listing.views || 0,
        favorites: listing.favorites || 0
      }
    };
  });
  
  return { rows: transformedRows };
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
    
    // Store nonce temporarily (expires in 30 minutes)
    nonceStorage[address] = {
      nonce,
      timestamp: Date.now(),
      expires: Date.now() + 30 * 60 * 1000 // 30 minutes
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
    const { walletAddress, signature, message, nonce } = req.body;
    
    if (!walletAddress || !signature || !message || !nonce) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address, signature, message, and nonce are required'
      });
    }
    
    // Verify nonce
    const storedNonce = nonceStorage[walletAddress];
    console.log('Checking nonce for address:', walletAddress);
    console.log('Stored nonce:', storedNonce);
    console.log('Received nonce:', nonce);
    console.log('Current time:', Date.now());
    console.log('Nonce expires:', storedNonce ? storedNonce.expires : 'N/A');
    
    if (!storedNonce) {
      console.log('No nonce stored for address:', walletAddress);
      return res.status(400).json({
        success: false,
        error: 'No nonce found. Please request a new nonce.'
      });
    }
    
    if (storedNonce.nonce !== nonce) {
      console.log('Nonce mismatch. Stored:', storedNonce.nonce, 'Received:', nonce);
      return res.status(400).json({
        success: false,
        error: 'Invalid nonce. Please request a new nonce.'
      });
    }
    
    if (Date.now() > storedNonce.expires) {
      console.log('Nonce expired. Current time:', Date.now(), 'Expires:', storedNonce.expires);
      // Clean up expired nonce
      delete nonceStorage[walletAddress];
      return res.status(400).json({
        success: false,
        error: 'Nonce expired. Please request a new nonce.'
      });
    }
    
    // Clean up used nonce
    delete nonceStorage[walletAddress];
    
    // For now, we'll skip signature verification and just create/get the user
    // In production, you would verify the signature using ethers.js or similar
    console.log('Authenticating wallet:', walletAddress);
    
    // Get or create user
    let userResult = await getUserByAddress(walletAddress);
    
    if (userResult.rows.length === 0) {
      // Create new user
      userResult = await createOrUpdateUser(walletAddress, null, {});
    }
    
    const user = userResult.rows[0];
    
    // Generate simple session token (in production, use JWT)
    const token = `token_${walletAddress}_${Date.now()}`;
    sessionStorage[token] = {
      address: walletAddress,
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
        role: user.role || 'user',
        permissions: user.permissions || [],
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
        role: user.role || 'user',
        permissions: user.permissions || [],
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

app.put('/api/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Update the profile and return the result
    const updatedUser = await updateUserProfile(id, updateData);
    
    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to update user profile with all fields
async function updateUserProfile(userId, updateData) {
  // First get the current user to preserve existing values
  const userQuery = 'SELECT * FROM users WHERE id = $1';
  const userResult = await executeQuery(userQuery, [userId], null);
  
  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }
  
  const user = userResult.rows[0];
  
  // Try to parse existing profile data
  let profileData = {};
  if (user.profile_cid) {
    try {
      profileData = JSON.parse(user.profile_cid);
    } catch (e) {
      console.log('Failed to parse existing profile data for user:', user.wallet_address);
    }
  }
  
  // Merge updated fields with existing data
  const mergedProfileData = {
    ...profileData,
    ens: ('ens' in updateData) ? updateData.ens : profileData.ens,
    avatarCid: ('avatarCid' in updateData) ? updateData.avatarCid : profileData.avatarCid,
    bioCid: ('bioCid' in updateData) ? updateData.bioCid : 
            ('bio' in updateData) ? updateData.bio : 
            profileData.bioCid || profileData.bio,
    email: ('email' in updateData) ? updateData.email : profileData.email,
    // Billing Address fields
    billingFirstName: ('billingFirstName' in updateData) ? updateData.billingFirstName : profileData.billingFirstName,
    billingLastName: ('billingLastName' in updateData) ? updateData.billingLastName : profileData.billingLastName,
    billingCompany: ('billingCompany' in updateData) ? updateData.billingCompany : profileData.billingCompany,
    billingAddress1: ('billingAddress1' in updateData) ? updateData.billingAddress1 : profileData.billingAddress1,
    billingAddress2: ('billingAddress2' in updateData) ? updateData.billingAddress2 : profileData.billingAddress2,
    billingCity: ('billingCity' in updateData) ? updateData.billingCity : profileData.billingCity,
    billingState: ('billingState' in updateData) ? updateData.billingState : profileData.billingState,
    billingZipCode: ('billingZipCode' in updateData) ? updateData.billingZipCode : profileData.billingZipCode,
    billingCountry: ('billingCountry' in updateData) ? updateData.billingCountry : profileData.billingCountry,
    billingPhone: ('billingPhone' in updateData) ? updateData.billingPhone : profileData.billingPhone,
    // Shipping Address fields
    shippingFirstName: ('shippingFirstName' in updateData) ? updateData.shippingFirstName : profileData.shippingFirstName,
    shippingLastName: ('shippingLastName' in updateData) ? updateData.shippingLastName : profileData.shippingLastName,
    shippingCompany: ('shippingCompany' in updateData) ? updateData.shippingCompany : profileData.shippingCompany,
    shippingAddress1: ('shippingAddress1' in updateData) ? updateData.shippingAddress1 : profileData.shippingAddress1,
    shippingAddress2: ('shippingAddress2' in updateData) ? updateData.shippingAddress2 : profileData.shippingAddress2,
    shippingCity: ('shippingCity' in updateData) ? updateData.shippingCity : profileData.shippingCity,
    shippingState: ('shippingState' in updateData) ? updateData.shippingState : profileData.shippingState,
    shippingZipCode: ('shippingZipCode' in updateData) ? updateData.shippingZipCode : profileData.shippingZipCode,
    shippingCountry: ('shippingCountry' in updateData) ? updateData.shippingCountry : profileData.shippingCountry,
    shippingPhone: ('shippingPhone' in updateData) ? updateData.shippingPhone : profileData.shippingPhone
  };

  // Update the user profile - handle is allowed to be updated but wallet address is immutable
  const updateQuery = `
    UPDATE users 
    SET handle = COALESCE($1, handle),
        profile_cid = $2,
        updated_at = NOW()
    WHERE id = $3
    RETURNING *
  `;
  
  const result = await executeQuery(updateQuery, [
    updateData.handle || user.handle,
    JSON.stringify(mergedProfileData),
    userId
  ], null);
  
  return result.rows[0];
}

// Update the profile update endpoint by ID to handle all profile fields
app.put('/api/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Update the profile and return the result
    const updatedUser = await updateUserProfile(id, updateData);
    
    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add PUT endpoint for updating profile by wallet address
app.put('/api/profiles/address/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const updateData = req.body;
    
    // Validate Ethereum address format
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address'
      });
    }
    
    // First, get the current user by address
    const userResult = await getUserByAddress(address);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    const userId = user.id;
    
    // Update the profile and return the result
    const updatedUser = await updateUserProfile(userId, updateData);
    
    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile by address:', error);
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

// Posts routes
app.get('/api/posts/feed', async (req, res) => {
  try {
    const { forUser } = req.query;
    
    if (!forUser || typeof forUser !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'forUser parameter is required'
      });
    }
    
    // Get user ID from address
    const userResult = await getUserByAddress(forUser);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    const userId = user.id;
    
    // Get the list of users that this user follows
    const followingQuery = 'SELECT * FROM follows WHERE follower_id = $1';
    const followingResult = await executeQuery(followingQuery, [userId], null);
    const followingIds = followingResult.rows.map(f => f.following_id);
    
    // Include the user's own posts
    followingIds.push(userId);
    
    // Get posts from followed users (including self)
    const placeholders = followingIds.map((_, i) => `${i + 1}`).join(', ');
    const postsQuery = `
      SELECT * FROM posts 
      WHERE author_id IN (${placeholders})
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const postsResult = await executeQuery(postsQuery, followingIds, null);
    
    // Format posts
    const posts = postsResult.rows.map(dbPost => ({
      id: dbPost.id.toString(),
      author: dbPost.author_id,
      parentId: dbPost.parent_id ? dbPost.parent_id.toString() : null,
      title: dbPost.title,
      contentCid: dbPost.content_cid,
      mediaCids: dbPost.media_cids ? JSON.parse(dbPost.media_cids) : [],
      tags: dbPost.tags ? JSON.parse(dbPost.tags) : [],
      dao: dbPost.dao,
      createdAt: new Date(dbPost.created_at),
      
    }));
    
    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Error getting feed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const { content, author, type = 'text', visibility = 'public', tags, media, parentId, onchainRef } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }
    
    if (!author) {
      return res.status(400).json({
        success: false,
        error: 'Author is required'
      });
    }
    
    // Create user if they don't exist
    await createOrUpdateUser(author);
    
    // Get user ID
    const userResult = await getUserByAddress(author);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const userId = userResult.rows[0].id;
    
    // Insert post
    const insertQuery = `
      INSERT INTO posts (author_id, content_cid, parent_id, media_cids, tags, staked_value, reputation_score, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;
    
    const result = await executeQuery(insertQuery, [
      userId,
      content,
      parentId || null,
      media ? JSON.stringify(media) : '[]',
      tags ? JSON.stringify(tags) : '[]',
      '0',  // staked_value
      0,    // reputation_score
    ], null);
    
    const newPost = result.rows[0];
    
    res.status(201).json({
      success: true,
      data: {
        id: newPost.id.toString(),
        author: newPost.author_id,
        parentId: newPost.parent_id ? newPost.parent_id.toString() : null,
        contentCid: newPost.content_cid,
        mediaCids: newPost.media_cids ? JSON.parse(newPost.media_cids) : [],
        tags: newPost.tags ? JSON.parse(newPost.tags) : [],
        createdAt: new Date(newPost.created_at),
        
      }
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const postsQuery = `
      SELECT * FROM posts 
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const postsResult = await executeQuery(postsQuery, [parseInt(limit), parseInt(offset)], null);
    
    const posts = postsResult.rows.map(dbPost => ({
      id: dbPost.id.toString(),
      author: dbPost.author_id,
      parentId: dbPost.parent_id ? dbPost.parent_id.toString() : null,
      title: dbPost.title,
      contentCid: dbPost.content_cid,
      mediaCids: dbPost.media_cids ? JSON.parse(dbPost.media_cids) : [],
      tags: dbPost.tags ? JSON.parse(dbPost.tags) : [],
      dao: dbPost.dao,
      createdAt: new Date(dbPost.created_at),
      
    }));
    
    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Error getting posts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const postQuery = 'SELECT * FROM posts WHERE id = $1';
    const postResult = await executeQuery(postQuery, [id], null);
    
    if (postResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
    
    const dbPost = postResult.rows[0];
    
    res.json({
      success: true,
      data: {
        id: dbPost.id.toString(),
        author: dbPost.author_id,
        parentId: dbPost.parent_id ? dbPost.parent_id.toString() : null,
        title: dbPost.title,
        contentCid: dbPost.content_cid,
        mediaCids: dbPost.media_cids ? JSON.parse(dbPost.media_cids) : [],
        tags: dbPost.tags ? JSON.parse(dbPost.tags) : [],
        dao: dbPost.dao,
        createdAt: new Date(dbPost.created_at),
        
      }
    });
  } catch (error) {
    console.error('Error getting post:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/posts/author/:author', async (req, res) => {
  try {
    const { author } = req.params;
    
    // Get user by address
    const userResult = await getUserByAddress(author);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const userId = userResult.rows[0].id;
    
    const postsQuery = `
      SELECT * FROM posts 
      WHERE author_id = $1
      ORDER BY created_at DESC
    `;
    const postsResult = await executeQuery(postsQuery, [userId], null);
    
    const posts = postsResult.rows.map(dbPost => ({
      id: dbPost.id.toString(),
      author: dbPost.author_id,
      parentId: dbPost.parent_id ? dbPost.parent_id.toString() : null,
      title: dbPost.title,
      contentCid: dbPost.content_cid,
      mediaCids: dbPost.media_cids ? JSON.parse(dbPost.media_cids) : [],
      tags: dbPost.tags ? JSON.parse(dbPost.tags) : [],
      dao: dbPost.dao,
      createdAt: new Date(dbPost.created_at),
      
    }));
    
    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Error getting posts by author:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.put('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, tags, media, dao } = req.body;
    
    // First get the post to ensure it exists
    const getQuery = 'SELECT * FROM posts WHERE id = $1';
    const getResult = await executeQuery(getQuery, [id], null);
    
    if (getResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
    
    // Update post
    const updateQuery = `
      UPDATE posts 
      SET title = COALESCE($1, title),
          content_cid = COALESCE($2, content_cid),
          tags = COALESCE($3, tags),
          media_cids = COALESCE($4, media_cids),
          dao = COALESCE($5, dao),
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;
    
    const result = await executeQuery(updateQuery, [
      title,
      content,
      tags ? JSON.stringify(tags) : null,
      media ? JSON.stringify(media) : null,
      dao,
      id
    ], null);
    
    const updatedPost = result.rows[0];
    
    res.json({
      success: true,
      data: {
        id: updatedPost.id.toString(),
        author: updatedPost.author_id,
        parentId: updatedPost.parent_id ? updatedPost.parent_id.toString() : null,
        title: updatedPost.title,
        contentCid: updatedPost.content_cid,
        mediaCids: updatedPost.media_cids ? JSON.parse(updatedPost.media_cids) : [],
        tags: updatedPost.tags ? JSON.parse(updatedPost.tags) : [],
        dao: updatedPost.dao,
        createdAt: new Date(updatedPost.created_at),
        
      }
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleteQuery = 'DELETE FROM posts WHERE id = $1 RETURNING id';
    const result = await executeQuery(deleteQuery, [id], null);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting post:', error);
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
    console.log('📦 Fetching marketplace listings...');
    
    // Use a LEFT JOIN to get wallet addresses but still include listings without users
    const query = dbConnected 
      ? 'SELECT l.*, u.wallet_address as seller_wallet_address FROM listings l LEFT JOIN users u ON l.seller_id = u.id WHERE l.status = $1 ORDER BY l.created_at DESC LIMIT 50'
      : null;
    
    const fallback = () => {
      const listings = memoryStorage.listings.filter(l => l.status === 'ACTIVE').slice(0, 50);
      return { rows: listings };
    };
    
    const result = await executeQuery(query, ['ACTIVE'], fallback);
    
    console.log(`📦 Found ${result.rows.length} marketplace listings`);
    
    // Transform the results to match the expected format
    const transformedListings = result.rows.map(listing => {
      let enhancedData = {};
      
      try {
        if (listing.metadata_uri) {
          const firstParse = JSON.parse(listing.metadata_uri);
          // Check if this is a nested JSON string (from our enhanced form)
          if (typeof firstParse.description === 'string' && firstParse.description.startsWith('{')) {
            const secondParse = JSON.parse(firstParse.description);
            enhancedData = { ...firstParse, ...secondParse };
          } else {
            enhancedData = firstParse;
          }
        }
      } catch (e) {
        console.log(`Failed to parse metadata for listing ${listing.id}:`, e.message);
        enhancedData = { title: listing.metadata_uri || 'Untitled' };
      }
      
      return {
        id: listing.id,
        sellerWalletAddress: listing.seller_wallet_address || 'Unknown',
        tokenAddress: listing.token_address || '0x0000000000000000000000000000000000000000',
        price: listing.price || '0',
        quantity: listing.quantity || 1,
        itemType: listing.item_type || 'DIGITAL',
        listingType: listing.listing_type || 'FIXED_PRICE',
        status: listing.status || 'ACTIVE',
        startTime: listing.start_time || listing.created_at || new Date().toISOString(),
        endTime: listing.end_time || null,
        highestBid: listing.highest_bid || null,
        highestBidderWalletAddress: listing.highest_bidder || null,
        metadataURI: enhancedData.title || listing.metadata_uri || 'Untitled',
        isEscrowed: listing.is_escrowed || false,
        nftStandard: listing.nft_standard || null,
        tokenId: listing.token_id || null,
        createdAt: listing.created_at || new Date().toISOString(),
        updatedAt: listing.updated_at || new Date().toISOString(),
        enhancedData: {
          title: enhancedData.title || 'Untitled',
          description: enhancedData.description || '',
          images: enhancedData.images || [],
          category: enhancedData.category || 'general',
          tags: enhancedData.tags || [],
          condition: enhancedData.condition || 'new',
          escrowEnabled: enhancedData.escrowEnabled || false,
          views: 0,
          favorites: 0
        }
      };
    });
    
    res.json({
      success: true,
      data: transformedListings
    });
  } catch (error) {
    console.error('Error fetching marketplace listings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add API path for frontend compatibility
app.get('/api/marketplace/listings', async (req, res) => {
  try {
    console.log('📦 API endpoint called, forwarding to main marketplace listings...');
    
    // Use the same logic as the main endpoint but in memory storage for now
    const fallback = () => {
      const listings = memoryStorage.listings.filter(l => l.status === 'ACTIVE').slice(0, 50);
      return { rows: listings };
    };
    
    const result = fallback();
    
    console.log(`📦 API endpoint found ${result.rows.length} listings from memory`);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching API marketplace listings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Seller listings endpoint to match frontend expectations
app.get('/marketplace/seller/listings/:address', async (req, res) => {
  try {
    const listingData = req.body;
    
    // Handle both seller-specific and marketplace-generic data formats
    const isMarketplaceFormat = listingData.tokenAddress && listingData.metadataURI && !listingData.title;
    
    let sellerWalletAddress, title, description, price, currency, quantity, condition, images, tags, escrowEnabled, shippingFree, shippingCost, estimatedDays, category, tokenAddress, itemType, listingType, metadataURI;
    
    if (isMarketplaceFormat) {
      // Handle MarketplaceService.createListing format (CreateListingInput)
      ({ sellerWalletAddress, tokenAddress, price, quantity, itemType, listingType, metadataURI } = listingData);
      
      // Extract basic info from metadataURI for compatibility
      title = 'Marketplace Listing';
      description = metadataURI || '';
      currency = 'ETH';
      condition = 'new';
      category = itemType ? itemType.toLowerCase() : 'general';
      images = [];
      tags = [];
      escrowEnabled = false;
      shippingFree = false;
      shippingCost = 0;
      estimatedDays = '3-5';
      
      console.log(`📦 Creating marketplace listing for seller ${sellerWalletAddress}:`, {
        itemType,
        listingType,
        price,
        quantity
      });
    } else {
      // Handle SellerService.createListing format (seller-specific)
      ({ sellerWalletAddress, title, description, price, currency, quantity, condition, images, tags, escrowEnabled, shippingFree, shippingCost, estimatedDays, category } = listingData);
      
      // Set defaults for marketplace fields
      tokenAddress = '0x0000000000000000000000000000000000000000';
      itemType = category || 'PHYSICAL';
      listingType = 'FIXED_PRICE';
      metadataURI = description || '';
      
      console.log(`📦 Creating seller listing for seller ${sellerWalletAddress}:`, {
        title,
        price,
        currency,
        quantity,
        imageCount: images ? images.length : 0
      });
    }
    
    if (!sellerWalletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Seller wallet address is required'
      });
    }
    
    // Create or get user first
    let userResult = await getUserByAddress(sellerWalletAddress);
    if (userResult.rows.length === 0) {
      userResult = await createOrUpdateUser(sellerWalletAddress, '', {});
    }
    
    const userId = userResult.rows[0].id;
    
    // Create the listing with enhanced data
    const enhancedListingData = {
      seller_id: userId,
      token_address: tokenAddress || '0x0000000000000000000000000000000000000000',
      price: price ? price.toString() : '0',
      quantity: quantity || 1,
      item_type: itemType || category || 'PHYSICAL',
      listing_type: listingType || 'FIXED_PRICE',
      status: 'ACTIVE',
      metadata_uri: JSON.stringify({
        title: title || 'Marketplace Listing',
        description: description || metadataURI || '',
        currency: currency || 'ETH',
        condition: condition || 'new',
        images: images || [],
        tags: tags || [],
        escrowEnabled: escrowEnabled || false,
        shippingFree: shippingFree || false,
        shippingCost: shippingCost || 0,
        estimatedDays: estimatedDays || '3-5',
        category: category || itemType?.toLowerCase() || 'general',
        // Include original marketplace data if available
        originalMarketplaceData: isMarketplaceFormat ? {
          tokenAddress,
          itemType,
          listingType,
          metadataURI
        } : null
      }),
      is_escrowed: escrowEnabled || false
    };
    
    const result = await createListing(sellerWalletAddress, enhancedListingData);
    
    // Return appropriate response format based on input format
    let responseData;
    if (isMarketplaceFormat) {
      // Return MarketplaceListing format for marketplace service
      responseData = {
        id: result.rows[0].id.toString(),
        sellerWalletAddress,
        tokenAddress: tokenAddress || '0x0000000000000000000000000000000000000000',
        price: price ? price.toString() : '0',
        quantity: quantity || 1,
        itemType: itemType || 'PHYSICAL',
        listingType: listingType || 'FIXED_PRICE',
        status: 'ACTIVE',
        startTime: new Date().toISOString(),
        endTime: null,
        highestBid: null,
        highestBidderWalletAddress: null,
        metadataURI: metadataURI || '',
        isEscrowed: false,
        nftStandard: listingData.nftStandard || null,
        tokenId: listingData.tokenId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      // Return SellerListing format for seller service
      responseData = {
        id: result.rows[0].id,
        sellerWalletAddress,
        title: title || 'Untitled Listing',
        description: description || '',
        price: price || 0,
        currency: currency || 'ETH',
        quantity: quantity || 1,
        condition: condition || 'new',
        images: images || [],
        tags: tags || [],
        escrowEnabled: escrowEnabled || false,
        shippingFree: shippingFree || false,
        shippingCost: shippingCost || 0,
        estimatedDays: estimatedDays || '3-5',
        category: category || 'general',
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      };
    }
    
    console.log(`✅ Listing created successfully with ID: ${result.rows[0].id}`);
    
    res.status(201).json({
      success: true,
      message: 'Listing created successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error creating seller listing:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Seller profile endpoints
app.get('/marketplace/seller/profile/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const result = await getUserByAddress(walletAddress);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Seller profile not found'
      });
    }
    
    const user = result.rows[0];
    
    // Transform user data to seller profile format
    const sellerProfile = {
      id: user.id,
      walletAddress: user.wallet_address,
      displayName: user.handle || '',
      storeName: user.handle || '',
      bio: '',
      description: '',
      profilePicture: '',
      logo: '',
      createdAt: user.created_at,
      updatedAt: user.created_at
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
  try {
    console.log('🚀 Starting Web3 Marketplace Backend...');
    console.log('📊 Environment:', process.env.NODE_ENV || 'development');
    console.log('🔌 Port:', PORT);
    console.log('🗄️ Database URL:', process.env.DATABASE_URL ? 'configured' : 'not configured');
    
    await initializeDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Web3 Marketplace Backend with Database running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database: ${dbConnected ? 'PostgreSQL connected' : 'In-memory fallback'}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`📡 API ready: http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer().catch(console.error);