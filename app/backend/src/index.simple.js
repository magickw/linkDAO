const express = require('express');
const cors = require('cors');
const compression = require('compression');

// Load environment variables
require('dotenv').config();

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

// Essential marketplace endpoints
app.get('/marketplace/listings', (req, res) => {
  const { category, limit = 10, offset = 0 } = req.query;
  
  // Mock listings data
  const mockListings = Array.from({ length: Math.min(Number(limit), 10) }, (_, i) => ({
    id: `listing_${i + 1}`,
    title: `Sample Product ${i + 1}`,
    description: `This is a sample product description for item ${i + 1}`,
    price: (Math.random() * 100 + 10).toFixed(2),
    currency: 'USD',
    category: category || 'general',
    seller: {
      id: `seller_${i + 1}`,
      name: `Seller ${i + 1}`,
      rating: (Math.random() * 2 + 3).toFixed(1)
    },
    images: [`https://picsum.photos/300/300?random=${i + 1}`],
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
  }));
  
  res.json({
    success: true,
    data: mockListings,
    pagination: {
      limit: Number(limit),
      offset: Number(offset),
      total: 100,
      hasMore: Number(offset) + Number(limit) < 100
    }
  });
});

app.get('/marketplace/listings/:id', (req, res) => {
  const { id } = req.params;
  
  // Mock detailed listing
  res.json({
    success: true,
    data: {
      id,
      title: `Product ${id}`,
      description: `Detailed description for product ${id}`,
      price: (Math.random() * 100 + 10).toFixed(2),
      currency: 'USD',
      category: 'electronics',
      condition: 'new',
      seller: {
        id: 'seller_1',
        name: 'Sample Seller',
        rating: 4.5,
        totalSales: 150,
        memberSince: '2023-01-01'
      },
      images: [
        `https://picsum.photos/600/400?random=${id}1`,
        `https://picsum.photos/600/400?random=${id}2`
      ],
      specifications: {
        brand: 'Sample Brand',
        model: 'Model X',
        warranty: '1 year'
      },
      shipping: {
        free: true,
        estimatedDays: '3-5'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });
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

// Seller Profile Endpoints
app.get('/marketplace/seller/profile/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  
  // Mock seller profile
  res.json({
    success: true,
    data: {
      id: `seller_${walletAddress.slice(-8)}`,
      walletAddress,
      tier: 'basic',
      displayName: 'Sample Seller',
      storeName: 'Sample Store',
      bio: 'Welcome to my store!',
      description: 'We sell quality products with fast shipping.',
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
    }
  });
});

app.post('/marketplace/seller/profile', (req, res) => {
  const profileData = req.body;
  
  res.json({
    success: true,
    message: 'Seller profile created successfully',
    data: {
      id: `seller_${Date.now()}`,
      ...profileData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });
});

app.put('/marketplace/seller/profile/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  const updates = req.body;
  
  res.json({
    success: true,
    message: 'Seller profile updated successfully',
    data: {
      id: `seller_${walletAddress.slice(-8)}`,
      walletAddress,
      ...updates,
      updatedAt: new Date().toISOString()
    }
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
  
  const listings = [
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
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
    }
  ];
  
  const filteredListings = status ? listings.filter(listing => listing.status === status) : listings;
  
  res.json({
    success: true,
    data: filteredListings
  });
});

app.post('/marketplace/seller/listings', (req, res) => {
  const listingData = req.body;
  
  res.json({
    success: true,
    message: 'Listing created successfully',
    data: {
      id: `listing_${Date.now()}`,
      ...listingData,
      status: 'active',
      views: 0,
      favorites: 0,
      questions: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
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
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
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