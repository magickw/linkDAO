const express = require('express');
const cors = require('cors');
const compression = require('compression');
const SimpleCacheService = require('./services/simpleCacheService');
const escrowRoutes = require('./routes/escrowRoutes');

// Load environment variables
require('dotenv').config();

// Initialize cache service
const cacheService = new SimpleCacheService();

// In-memory storage for created listings
const createdListings = [];

const app = express();
const PORT = process.env.PORT || 10000;

// Enable compression to reduce memory usage
app.use(compression());

// Custom CORS middleware to handle multiple origins
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Get allowed origins from environment variable
    const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [];
    
    // Check if the origin is in our allowed list
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // For development, allow localhost origins
    if (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    
    // Block the request if the origin is not allowed
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // Cache preflight for 24 hours
};

app.use(cors(corsOptions));

// Limit JSON payload size to reduce memory usage
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Memory optimization: Disable x-powered-by header
app.disable('x-powered-by');

// Basic health and info routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Web3 Marketplace Backend API', 
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
  const memUsage = process.memoryUsage();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// Marketplace registration routes (essential for the deployment)
app.post('/marketplace/registration/seller', (req, res) => {
  const { businessName, email, businessType, description } = req.body;
  
  if (!businessName || !email) {
    return res.status(400).json({
      success: false,
      error: 'Business name and email are required'
    });
  }
  
  // Mock successful registration
  res.json({
    success: true,
    message: 'Seller registration successful',
    data: {
      id: `seller_${Date.now()}`,
      businessName,
      email,
      businessType: businessType || 'general',
      status: 'pending_verification',
      createdAt: new Date().toISOString()
    }
  });
});

app.post('/marketplace/registration/buyer', (req, res) => {
  const { firstName, lastName, email, preferences } = req.body;
  
  if (!firstName || !lastName || !email) {
    return res.status(400).json({
      success: false,
      error: 'First name, last name, and email are required'
    });
  }
  
  // Mock successful registration
  res.json({
    success: true,
    message: 'Buyer registration successful',
    data: {
      id: `buyer_${Date.now()}`,
      firstName,
      lastName,
      email,
      preferences: preferences || {},
      status: 'active',
      createdAt: new Date().toISOString()
    }
  });
});

// Essential marketplace endpoints with caching
app.get('/marketplace/listings', async (req, res) => {
  const { category, limit = 12, offset = 0, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  
  try {
    // Create cache key based on query parameters
    const cacheKey = `listings:${category || 'all'}:${limit}:${offset}:${search || ''}:${sortBy}:${sortOrder}`;
    
    // Try to get from cache first
    let cachedListings = await cacheService.get(cacheKey);
    
    if (cachedListings) {
      return res.json({
        success: true,
        data: cachedListings.data,
        pagination: cachedListings.pagination,
        cached: true
      });
    }

    // Enhanced mock products with realistic data
    const mockProducts = [
      {
        id: 'prod_001',
        title: 'Premium Wireless Headphones',
        description: 'High-quality noise-canceling wireless headphones with 30-hour battery life and premium sound quality.',
        price: '299.99',
        currency: 'USD',
        cryptoPrice: '0.0010',
        cryptoSymbol: 'ETH',
        category: 'electronics',
        listingType: 'FIXED_PRICE',
        // Hint for testnet; frontend ignores unknown fields safely
        testnetChainId: 84532,
        seller: {
          id: 'seller_001',
          name: 'TechGear Pro',
          rating: 4.8,
          reputation: 95,
          verified: true,
          daoApproved: true,
          walletAddress: '0x0a315B01BbD1F92E08CC755afFB3214ED1C46bB5'
        },
        trust: {
          verified: true,
          escrowProtected: true,
          onChainCertified: true,
          safetyScore: 98
        },
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop'],
        inventory: 15,
        isNFT: false,
        tags: ['electronics', 'audio', 'wireless', 'premium'],
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-20T14:22:00Z',
        views: 1247,
        favorites: 89
      },
      {
        id: 'prod_002',
        title: 'Rare Digital Art NFT Collection',
        description: 'Exclusive digital artwork from renowned crypto artist. Limited edition with utility benefits.',
        price: '6000.00',
        currency: 'USD',
        cryptoPrice: '2.5000',
        cryptoSymbol: 'ETH',
        category: 'nft',
        listingType: 'AUCTION',
        seller: {
          id: 'seller_002',
          name: 'CryptoArtist',
          rating: 4.9,
          reputation: 88,
          verified: true,
          daoApproved: true,
walletAddress: '0x0a315B01BbD1F92E08CC755afFB3214ED1C46bB5'
        },
        trust: {
          verified: true,
          escrowProtected: true,
          onChainCertified: true,
          safetyScore: 96
        },
        images: ['https://images.unsplash.com/photo-1634973357973-f2ed2657db3c?w=400&h=300&fit=crop'],
        inventory: 1,
        isNFT: true,
        tags: ['nft', 'art', 'digital', 'exclusive'],
        createdAt: '2024-01-18T16:45:00Z',
        updatedAt: '2024-01-22T09:15:00Z',
        views: 892,
        favorites: 156,
        auctionEndTime: '2024-02-01T18:00:00Z',
        highestBid: '2.1000',
        bidCount: 12
      },
      {
        id: 'prod_003',
        title: 'Vintage Mechanical Keyboard',
        description: 'Restored 1980s mechanical keyboard with Cherry MX switches. Perfect for collectors.',
        price: '450.00',
        currency: 'USD',
        cryptoPrice: '0.1875',
        cryptoSymbol: 'ETH',
        category: 'collectibles',
        listingType: 'FIXED_PRICE',
        seller: {
          id: 'seller_003',
          name: 'RetroTech Collector',
          rating: 4.6,
          reputation: 72,
          verified: true,
          daoApproved: false,
walletAddress: '0x0a315B01BbD1F92E08CC755afFB3214ED1C46bB5'
        },
        trust: {
          verified: true,
          escrowProtected: true,
          onChainCertified: false,
          safetyScore: 85
        },
        images: ['https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400&h=300&fit=crop'],
        inventory: 1,
        isNFT: false,
        tags: ['vintage', 'keyboard', 'mechanical', 'collectible'],
        createdAt: '2024-01-12T08:20:00Z',
        updatedAt: '2024-01-19T11:30:00Z',
        views: 543,
        favorites: 67
      },
      {
        id: 'prod_004',
        title: 'Smart Home Security Camera',
        description: '4K wireless security camera with AI detection, night vision, and cloud storage.',
        price: '189.99',
        currency: 'USD',
        cryptoPrice: '0.0790',
        cryptoSymbol: 'ETH',
        category: 'electronics',
        listingType: 'AUCTION',
        seller: {
          id: 'seller_004',
          name: 'SmartHome Solutions',
          rating: 4.7,
          reputation: 91,
          verified: true,
          daoApproved: true,
walletAddress: '0x0a315B01BbD1F92E08CC755afFB3214ED1C46bB5'
        },
        trust: {
          verified: true,
          escrowProtected: true,
          onChainCertified: true,
          safetyScore: 93
        },
        images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'],
        inventory: 8,
        isNFT: false,
        tags: ['security', 'camera', 'smart-home', '4k'],
        createdAt: '2024-01-20T13:15:00Z',
        updatedAt: '2024-01-23T16:45:00Z',
        views: 756,
        favorites: 94,
        auctionEndTime: '2024-01-30T20:00:00Z',
        highestBid: '0.0650',
        bidCount: 7
      },
      {
        id: 'prod_005',
        title: 'Handcrafted Leather Wallet',
        description: 'Premium handcrafted leather wallet with RFID protection and minimalist design.',
        price: '89.99',
        currency: 'USD',
        cryptoPrice: '0.0375',
        cryptoSymbol: 'ETH',
        category: 'fashion',
        listingType: 'FIXED_PRICE',
        seller: {
          id: 'seller_005',
          name: 'Artisan Leather Co',
          rating: 4.9,
          reputation: 78,
          verified: false,
          daoApproved: false,
walletAddress: '0x0a315B01BbD1F92E08CC755afFB3214ED1C46bB5'
        },
        trust: {
          verified: false,
          escrowProtected: true,
          onChainCertified: false,
          safetyScore: 76
        },
        images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop'],
        inventory: 25,
        isNFT: false,
        tags: ['leather', 'wallet', 'handcrafted', 'rfid'],
        createdAt: '2024-01-10T09:30:00Z',
        updatedAt: '2024-01-21T12:00:00Z',
        views: 432,
        favorites: 38
      },
      {
        id: 'prod_006',
        title: 'Gaming Metaverse Land NFT',
        description: 'Prime virtual real estate in popular metaverse game. Includes building rights.',
        price: '12480.00',
        currency: 'USD',
        cryptoPrice: '5.2000',
        cryptoSymbol: 'ETH',
        category: 'nft',
        listingType: 'AUCTION',
        seller: {
          id: 'seller_006',
          name: 'MetaLand Ventures',
          rating: 4.5,
          reputation: 84,
          verified: true,
          daoApproved: true,
walletAddress: '0x0a315B01BbD1F92E08CC755afFB3214ED1C46bB5'
        },
        trust: {
          verified: true,
          escrowProtected: true,
          onChainCertified: true,
          safetyScore: 91
        },
        images: ['https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=300&fit=crop'],
        inventory: 1,
        isNFT: true,
        tags: ['nft', 'metaverse', 'land', 'gaming'],
        createdAt: '2024-01-22T14:20:00Z',
        updatedAt: '2024-01-24T10:15:00Z',
        views: 1156,
        favorites: 203,
        auctionEndTime: '2024-02-05T15:30:00Z',
        highestBid: '4.8000',
        bidCount: 18
      },
      {
        id: 'prod_007',
        title: 'Professional Drone with 4K Camera',
        description: 'High-end professional drone with 4K camera, 45-minute flight time, and obstacle avoidance.',
        price: '1299.99',
        currency: 'USD',
        cryptoPrice: '0.5416',
        cryptoSymbol: 'ETH',
        category: 'electronics',
        listingType: 'FIXED_PRICE',
        seller: {
          id: 'seller_007',
          name: 'AerialTech Pro',
          rating: 4.8,
          reputation: 96,
          verified: true,
          daoApproved: true,
walletAddress: '0x0a315B01BbD1F92E08CC755afFB3214ED1C46bB5'
        },
        trust: {
          verified: true,
          escrowProtected: true,
          onChainCertified: true,
          safetyScore: 97
        },
        images: ['https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&h=300&fit=crop'],
        inventory: 5,
        isNFT: false,
        tags: ['drone', '4k', 'professional', 'camera'],
        createdAt: '2024-01-16T11:45:00Z',
        updatedAt: '2024-01-25T08:30:00Z',
        views: 987,
        favorites: 142
      },
      {
        id: 'prod_008',
        title: 'Rare Pokemon Trading Card',
        description: 'Mint condition Charizard holographic card from Base Set. PSA graded 10.',
        price: '15000.00',
        currency: 'USD',
        cryptoPrice: '6.2500',
        cryptoSymbol: 'ETH',
        category: 'collectibles',
        listingType: 'AUCTION',
        seller: {
          id: 'seller_008',
          name: 'CardMaster Collectibles',
          rating: 4.9,
          reputation: 89,
          verified: true,
          daoApproved: false,
walletAddress: '0x0a315B01BbD1F92E08CC755afFB3214ED1C46bB5'
        },
        trust: {
          verified: true,
          escrowProtected: true,
          onChainCertified: false,
          safetyScore: 88
        },
        images: ['https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=300&fit=crop'],
        inventory: 1,
        isNFT: false,
        tags: ['pokemon', 'trading-card', 'charizard', 'collectible'],
        createdAt: '2024-01-08T15:00:00Z',
        updatedAt: '2024-01-26T13:20:00Z',
        views: 2341,
        favorites: 387,
        auctionEndTime: '2024-02-10T19:00:00Z',
        highestBid: '5.8000',
        bidCount: 24
      }
    ];

    // Apply category filter
    let filteredListings = mockProducts;
    if (category && category !== 'all') {
      filteredListings = mockProducts.filter(product => product.category === category);
    }

    // Apply search filter
    if (search) {
      filteredListings = filteredListings.filter(listing => 
        listing.title.toLowerCase().includes(search.toLowerCase()) ||
        listing.description.toLowerCase().includes(search.toLowerCase()) ||
        listing.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
      );
    }

    // Apply sorting
    filteredListings.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'price':
          aValue = parseFloat(a.price);
          bValue = parseFloat(b.price);
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'rating':
          aValue = parseFloat(a.seller.rating);
          bValue = parseFloat(b.seller.rating);
          break;
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
      }
      
      if (sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    // Apply pagination
    const startIndex = Number(offset);
    const endIndex = startIndex + Number(limit);
    const paginatedListings = filteredListings.slice(startIndex, endIndex);

    const responseData = {
      data: paginatedListings,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: filteredListings.length,
        hasMore: endIndex < filteredListings.length
      }
    };

    // Cache the results for 5 minutes
    await cacheService.set(cacheKey, responseData, 300);

    res.json({
      success: true,
      ...responseData,
      cached: false
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch listings'
    });
  }
});

app.get('/marketplace/listings/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Try to get from cache first
    const cacheKey = `listing:${id}`;
    let cachedListing = await cacheService.get(cacheKey);
    
    if (cachedListing) {
      return res.json({
        success: true,
        data: cachedListing,
        cached: true
      });
    }

    // Mock detailed listing with enhanced data
    const listingData = {
      id,
      title: `Product ${id}`,
      description: `Detailed description for product ${id}. This is a high-quality item with excellent features and reliable performance.`,
      price: (Math.random() * 100 + 10).toFixed(2),
      currency: 'USD',
      cryptoPrice: (Math.random() * 0.1 + 0.01).toFixed(4),
      cryptoSymbol: 'ETH',
      category: 'electronics',
      condition: 'new',
      listingType: Math.random() > 0.7 ? 'AUCTION' : 'FIXED_PRICE',
      seller: {
        id: 'seller_1',
        name: 'Sample Seller',
        rating: 4.5,
        reputation: 85,
        totalSales: 150,
        memberSince: '2023-01-01',
        verified: true,
        daoApproved: Math.random() > 0.5,
walletAddress: '0x0a315B01BbD1F92E08CC755afFB3214ED1C46bB5'
      },
      trust: {
        verified: true,
        escrowProtected: true,
        onChainCertified: true,
        safetyScore: 95
      },
      images: [
        `https://picsum.photos/600/400?random=${id}1`,
        `https://picsum.photos/600/400?random=${id}2`,
        `https://picsum.photos/600/400?random=${id}3`
      ],
      specifications: {
        brand: 'Sample Brand',
        model: 'Model X',
        warranty: '1 year',
        dimensions: '10 x 8 x 2 inches',
        weight: '2.5 lbs'
      },
      shipping: {
        free: true,
        cost: '0',
        estimatedDays: '3-5',
        regions: ['US', 'CA', 'EU'],
        expedited: true
      },
      inventory: Math.floor(Math.random() * 20) + 1,
      isNFT: Math.random() > 0.8,
      tags: ['electronics', 'gadget', 'popular'],
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      views: Math.floor(Math.random() * 1000),
      favorites: Math.floor(Math.random() * 50)
    };

    // Add auction-specific data if it's an auction
    if (listingData.listingType === 'AUCTION') {
      listingData.auctionEndTime = new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
      listingData.highestBid = (parseFloat(listingData.cryptoPrice) * 0.8).toFixed(4);
      listingData.bidCount = Math.floor(Math.random() * 10);
    }

    // Cache the listing for 10 minutes
    await cacheService.set(cacheKey, listingData, 600);

    res.json({
      success: true,
      data: listingData,
      cached: false
    });
  } catch (error) {
    console.error('Error fetching listing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch listing details'
    });
  }
});

// User authentication endpoints (simplified)
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }
  
  // Mock successful login
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: 'user_123',
        email,
        name: 'Sample User',
        role: 'buyer'
      },
      token: 'mock_jwt_token_' + Date.now()
    }
  });
});

app.post('/auth/register', (req, res) => {
  const { email, password, name, role = 'buyer' } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      error: 'Email, password, and name are required'
    });
  }
  
  // Mock successful registration
  res.json({
    success: true,
    message: 'Registration successful',
    data: {
      user: {
        id: `user_${Date.now()}`,
        email,
        name,
        role,
        createdAt: new Date().toISOString()
      },
      token: 'mock_jwt_token_' + Date.now()
    }
  });
});

// Web3 Wallet Authentication Endpoints
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

app.post('/api/auth/wallet', (req, res) => {
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

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }
  
  // Mock user data based on token
  const user = {
    id: 'user_123',
    address: '0x1234567890123456789012345678901234567890',
    handle: 'test_user',
    ens: '',
    kycStatus: 'none',
    createdAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    user
  });
});

// Orders endpoint
app.get('/orders', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Orders endpoint - mock response'
  });
});

app.post('/orders', (req, res) => {
  const { listingId, quantity = 1 } = req.body;
  
  if (!listingId) {
    return res.status(400).json({
      success: false,
      error: 'Listing ID is required'
    });
  }
  
  res.json({
    success: true,
    message: 'Order created successfully',
    data: {
      id: `order_${Date.now()}`,
      listingId,
      quantity,
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  });
});

// Analytics endpoint (lightweight)
app.get('/analytics/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      totalListings: 1250,
      totalUsers: 3400,
      totalOrders: 890,
      revenue: 45600.50,
      topCategories: [
        { name: 'Electronics', count: 450 },
        { name: 'Fashion', count: 320 },
        { name: 'Home & Garden', count: 280 }
      ],
      recentActivity: [
        { type: 'new_listing', count: 15, timestamp: new Date().toISOString() },
        { type: 'new_order', count: 8, timestamp: new Date().toISOString() },
        { type: 'new_user', count: 12, timestamp: new Date().toISOString() }
      ]
    }
  });
});

// In-memory storage for seller profiles
const sellerProfiles = new Map();

// Helper function to get default profile
function getDefaultSellerProfile(walletAddress) {
  return {
    id: `seller_${walletAddress.slice(-8)}`,
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
      profileSetup: true,
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
}

// Seller Profile Endpoints
app.get('/marketplace/seller/profile/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  
  // Check if we have stored profile data, otherwise return default
  let profileData = sellerProfiles.get(walletAddress);
  if (!profileData) {
    profileData = getDefaultSellerProfile(walletAddress);
  }
  
  res.json({
    success: true,
    data: profileData
  });
});

app.post('/marketplace/seller/profile', (req, res) => {
  const profileData = req.body;
  const walletAddress = profileData.walletAddress;
  
  if (!walletAddress) {
    return res.status(400).json({
      success: false,
      error: 'Wallet address is required'
    });
  }
  
  // Create new profile
  const newProfile = {
    id: `seller_${Date.now()}`,
    ...getDefaultSellerProfile(walletAddress),
    ...profileData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Store the new profile
  sellerProfiles.set(walletAddress, newProfile);
  
  console.log(`New profile created for ${walletAddress}:`, newProfile);
  
  res.json({
    success: true,
    message: 'Seller profile created successfully',
    data: newProfile
  });
});

app.put('/marketplace/seller/profile/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  const updates = req.body;
  
  // Get existing profile or create default
  let existingProfile = sellerProfiles.get(walletAddress);
  if (!existingProfile) {
    existingProfile = getDefaultSellerProfile(walletAddress);
  }
  
  // Merge updates with existing profile
  const updatedProfile = {
    ...existingProfile,
    ...updates,
    walletAddress, // Ensure wallet address is preserved
    updatedAt: new Date().toISOString()
  };
  
  // Store the updated profile
  sellerProfiles.set(walletAddress, updatedProfile);
  
  console.log(`Profile updated for ${walletAddress}:`, updatedProfile);
  
  res.json({
    success: true,
    message: 'Seller profile updated successfully',
    data: updatedProfile
  });
});

// Seller Onboarding Endpoints
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
  
  res.json({
    success: true,
    message: `Onboarding step ${stepId} updated successfully`,
    data
  });
});

// Seller Dashboard Endpoints
app.get('/marketplace/seller/dashboard/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  
  res.json({
    success: true,
    data: {
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
    }
  });
});

// Seller Notifications
app.get('/marketplace/seller/notifications/:walletAddress', (req, res) => {
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
});

app.put('/marketplace/seller/notifications/:notificationId/read', (req, res) => {
  const { notificationId } = req.params;
  
  res.json({
    success: true,
    message: 'Notification marked as read'
  });
});

// Seller Orders
app.get('/marketplace/seller/orders/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  const { status } = req.query;
  
  const orders = [
    {
      id: 'order_1',
      listingId: 'listing_1',
      listingTitle: 'Sample Product 1',
      buyerAddress: '0x1234...5678',
      buyerName: 'John Doe',
      quantity: 1,
      totalAmount: 99.99,
      currency: 'USDC',
      status: 'pending',
      escrowStatus: 'locked',
      paymentMethod: 'crypto',
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
    },
    {
      id: 'order_2',
      listingId: 'listing_2',
      listingTitle: 'Sample Product 2',
      buyerAddress: '0x8765...4321',
      quantity: 2,
      totalAmount: 149.98,
      currency: 'USDC',
      status: 'shipped',
      escrowStatus: 'locked',
      paymentMethod: 'crypto',
      trackingNumber: 'TRK123456789',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
    }
  ];
  
  const filteredOrders = status ? orders.filter(order => order.status === status) : orders;
  
  res.json({
    success: true,
    data: filteredOrders
  });
});

app.put('/marketplace/seller/orders/:orderId/status', (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  
  res.json({
    success: true,
    message: `Order ${orderId} status updated to ${status}`
  });
});

// Seller Listings
app.get('/marketplace/seller/listings/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  const { status } = req.query;
  
  console.log(`Fetching listings for wallet: ${walletAddress}`);
  console.log(`Total created listings in memory: ${createdListings.length}`);
  
  // Static mock listings
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
      sellerWalletAddress: walletAddress, // Assign to requested wallet
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
    }
  ];
  
  // Filter created listings by wallet address
  const userCreatedListings = createdListings.filter(listing => {
    console.log(`Checking listing ${listing.id} with seller: ${listing.sellerWalletAddress}`);
    return listing.sellerWalletAddress === walletAddress;
  });
  
  console.log(`Found ${userCreatedListings.length} created listings for ${walletAddress}`);
  
  // Combine mock and created listings
  const allListings = [...mockListings, ...userCreatedListings];
  
  // Filter by status if provided
  const filteredListings = status ? allListings.filter(listing => listing.status === status) : allListings;
  
  console.log(`Returning ${filteredListings.length} total listings`);
  
  res.json({
    success: true,
    data: filteredListings
  });
});

app.post('/marketplace/seller/listings', (req, res) => {
  const listingData = req.body;
  
  const newListing = {
    id: `listing_${Date.now()}`,
    ...listingData,
    status: 'active',
    views: 0,
    favorites: 0,
    questions: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Store the listing in memory
  createdListings.push(newListing);
  
  res.json({
    success: true,
    message: 'Listing created successfully',
    data: newListing
  });
});

// Seller Verification
app.post('/marketplace/seller/verification/email', (req, res) => {
  const { email } = req.body;
  
  res.json({
    success: true,
    message: `Verification email sent to ${email}`
  });
});

app.post('/marketplace/seller/verification/email/verify', (req, res) => {
  const { token } = req.body;
  
  res.json({
    success: true,
    message: 'Email verified successfully'
  });
});

app.post('/marketplace/seller/verification/phone', (req, res) => {
  const { phone } = req.body;
  
  res.json({
    success: true,
    message: `Verification code sent to ${phone}`
  });
});

app.post('/marketplace/seller/verification/phone/verify', (req, res) => {
  const { phone, code } = req.body;
  
  res.json({
    success: true,
    message: 'Phone verified successfully'
  });
});

// Mount escrow routes
app.use('/api/escrow', escrowRoutes);

// Cache statistics endpoint
app.get('/api/cache/stats', async (req, res) => {
  try {
    const stats = await cacheService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics'
    });
  }
});

// Cache warming endpoint
app.post('/api/cache/warm', async (req, res) => {
  try {
    await cacheService.warmCache();
    res.json({
      success: true,
      message: 'Cache warming initiated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to warm cache'
    });
  }
});

// Catch-all for API routes
app.use('/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    message: `${req.method} ${req.originalUrl} is not implemented`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Error:', error.message);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    error: 'Internal Server Error',
    message: isDevelopment ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for non-API routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await cacheService.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await cacheService.close();
  process.exit(0);
});

// Memory monitoring
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    if (heapUsedMB > 400) { // Warn if using more than 400MB
      console.warn(`⚠️  High memory usage: ${heapUsedMB}MB`);
    }
  }, 30000); // Check every 30 seconds
}

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Web3 Marketplace Backend (Render Optimized) running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 API ready: http://localhost:${PORT}/`);
  
  // Log initial memory usage
  const memUsage = process.memoryUsage();
  console.log(`💾 Initial memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
});

module.exports = app;