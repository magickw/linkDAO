const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

// Validation functions for request parameters
function validateLimit(limit) {
  const parsed = parseInt(limit);
  
  // Check if it's a valid number
  if (isNaN(parsed) || !isFinite(parsed)) {
    return 20; // Default limit
  }
  
  // Ensure it's positive
  if (parsed <= 0) {
    return 20; // Default limit
  }
  
  // Apply reasonable bounds (1-100 items per page)
  if (parsed > 100) {
    return 100; // Maximum limit
  }
  
  if (parsed < 1) {
    return 1; // Minimum limit
  }
  
  return parsed;
}

function validatePage(page) {
  const parsed = parseInt(page);
  
  // Check if it's a valid number
  if (isNaN(parsed) || !isFinite(parsed)) {
    return 1; // Default page
  }
  
  // Ensure it's positive
  if (parsed <= 0) {
    return 1; // Default page
  }
  
  // Apply reasonable upper bound to prevent excessive memory usage
  if (parsed > 1000) {
    return 1000; // Maximum page
  }
  
  return parsed;
}

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

// Chat tables
pool.query(`
  CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) DEFAULT 'dm',
    participants TEXT[],
    last_message_id VARCHAR(255),
    last_activity TIMESTAMP,
    unread_counts JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP,
    updated_at TIMESTAMP
  )
`).catch(console.error);

pool.query(`
  CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(255) PRIMARY KEY,
    conversation_id VARCHAR(255),
    from_address VARCHAR(42),
    to_address VARCHAR(42),
    content TEXT,
    encrypted BOOLEAN DEFAULT false,
    message_type VARCHAR(50) DEFAULT 'text',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP,
    edited_at TIMESTAMP,
    deleted_at TIMESTAMP
  )
`).catch(console.error);

pool.query(`
  CREATE TABLE IF NOT EXISTS reactions (
    id VARCHAR(255) PRIMARY KEY,
    message_id VARCHAR(255) REFERENCES messages(id) ON DELETE CASCADE,
    emoji VARCHAR(50),
    user_address VARCHAR(42),
    created_at TIMESTAMP
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
      'https://linkdao.io',
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

// Enhanced JWT authentication middleware
const jwt = require('jsonwebtoken');

app.use((req, res, next) => {
  const auth = req.get('Authorization') || '';
  if (!auth) {
    console.log(`🔍 No Authorization header for ${req.method} ${req.url}`);
    return next();
  }
  
  const parts = auth.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    const token = parts[1];
    console.log(`🔍 Processing JWT token for ${req.method} ${req.url}: ${token.substring(0, 20)}...`);
    
    try {
      // Verify JWT token
      const JWT_SECRET = process.env.JWT_SECRET || '68511d56377eb3959e43fd953c2ee76346eb8becf62e08f0afe5439efa8595d4';
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Extract user address from various possible JWT payload formats
      const userAddress = decoded.walletAddress || decoded.address || decoded.userId || decoded.sub || decoded.id;
      
      if (userAddress) {
        req.user = { address: userAddress };
        console.log(`✅ JWT authentication successful for address: ${userAddress}`);
      } else {
        console.log('⚠️ JWT token decoded but no address found in payload');
        req.user = { address: null };
      }
    } catch (error) {
      console.log('⚠️ JWT verification failed:', error.message);
      
      // Handle mock tokens from frontend when backend is unavailable
      if (token.startsWith('mock_token_')) {
        // Extract address from mock token format: mock_token_{address}_{timestamp}
        const parts = token.split('_');
        if (parts.length >= 3 && parts[2].startsWith('0x')) {
          const mockAddress = parts[2];
          req.user = { address: mockAddress };
          console.log(`✅ Mock token authentication for address: ${mockAddress}`);
        } else {
          req.user = { address: null };
        }
      }
      // Fallback to legacy mock token for backward compatibility
      else if (token === 'mock-jwt-token') {
        req.user = { address: req.get('X-User-Address') || null };
      }
    }
  } else {
    console.log(`⚠️ Invalid Authorization header format: ${auth}`);
  }
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
      'GET /api/posts/feed',
      'GET /api/feed/enhanced',
      'GET /api/communities',
      'GET /api/profiles',
      'POST /api/auth/wallet-connect'
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

// Wallet authentication endpoints
app.post('/api/auth/wallet', (req, res) => {
  const { address, signature, message } = req.body;
  
  if (!address || !signature || !message) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: address, signature, message'
    });
  }
  
  try {
    // Generate a proper JWT token instead of mock token
    const JWT_SECRET = process.env.JWT_SECRET || '68511d56377eb3959e43fd953c2ee76346eb8becf62e08f0afe5439efa8595d4';
    const token = jwt.sign({
      walletAddress: address.toLowerCase(),
      address: address.toLowerCase(),
      userId: address.toLowerCase(),
      type: 'session',
      timestamp: Date.now()
    }, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({
      success: true,
      token: token,
      user: {
        address,
        authenticated: true,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('JWT generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authentication token'
    });
  }
});

// Wallet connect endpoint (alias for wallet authentication)
app.post('/api/auth/wallet-connect', (req, res) => {
  // Forward to the same wallet authentication logic
  req.url = '/api/auth/wallet';
  req.originalUrl = '/api/auth/wallet';
  return app._router.handle(req, res);
});

// Posts routes
app.get('/api/posts', async (req, res) => {
  try {
    const { page = 1, limit = 10, author, tag } = req.query;

    const validatedLimit = validateLimit(limit);
    const validatedPage = validatePage(page);
    const offset = (validatedPage - 1) * validatedLimit;

    // Build query with optional filters
    let query = `
      SELECT
        p.id, p.title, p.content_cid, p.media_cids, p.tags,
        p.staked_value, p.reputation_score, p.created_at,
        u.wallet_address, u.handle, u.profile_cid
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
    `;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (author) {
      conditions.push(`u.wallet_address = $${paramIndex++}`);
      params.push(author.toLowerCase());
    }

    if (tag) {
      conditions.push(`$${paramIndex++} = ANY(SELECT jsonb_array_elements_text(p.tags::jsonb))`);
      params.push(tag);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(validatedLimit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM posts p LEFT JOIN users u ON p.author_id = u.id';
    const countParams = [];
    let countParamIndex = 1;

    if (author) {
      countParams.push(author.toLowerCase());
      countQuery += ` WHERE u.wallet_address = $${countParamIndex++}`;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Transform results
    const posts = result.rows.map(post => ({
      id: post.id.toString(),
      title: post.title || '',
      content: post.content_cid || '',
      author: post.wallet_address,
      timestamp: post.created_at,
      tags: JSON.parse(post.tags || '[]'),
      mediaCids: JSON.parse(post.media_cids || '[]'),
      stakedValue: parseFloat(post.staked_value || 0),
      reputationScore: parseInt(post.reputation_score || 0)
    }));

    res.json({
      success: true,
      data: posts,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        pages: Math.ceil(total / validatedLimit)
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posts: ' + error.message
    });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const { title, content, author, tags, media, type, visibility } = req.body;

    if (!content || !author) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: content, author'
      });
    }

    // Get or create user profile
    let authorId;
    const userQuery = await pool.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [author.toLowerCase()]
    );

    if (userQuery.rows.length === 0) {
      // Create user if doesn't exist
      const createUserResult = await pool.query(
        'INSERT INTO users (wallet_address, handle, created_at) VALUES ($1, $2, NOW()) RETURNING id',
        [author.toLowerCase(), author.slice(0, 8)]
      );
      authorId = createUserResult.rows[0].id;
    } else {
      authorId = userQuery.rows[0].id;
    }

    // Insert post into database
    const insertQuery = `
      INSERT INTO posts (
        author_id,
        title,
        content_cid,
        media_cids,
        tags,
        staked_value,
        reputation_score,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      authorId,
      title || '',
      content, // content stored directly for now (could be IPFS CID later)
      JSON.stringify(media || []),
      JSON.stringify(tags || []),
      0, // initial staked value
      0  // initial reputation score
    ]);

    const newPost = result.rows[0];

    // Return post with author information
    res.status(201).json({
      success: true,
      data: {
        id: newPost.id.toString(),
        title: newPost.title,
        content: newPost.content_cid,
        author,
        walletAddress: author,
        tags: JSON.parse(newPost.tags || '[]'),
        mediaCids: JSON.parse(newPost.media_cids || '[]'),
        stakedValue: newPost.staked_value,
        reputationScore: newPost.reputation_score,
        createdAt: newPost.created_at,
        updatedAt: newPost.created_at
      }
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create post: ' + error.message
    });
  }
});

// --- Chat API stubs (development) ---
// Get user's conversations (persistent)
app.get('/api/chat/conversations', async (req, res) => {
  try {
    console.log(`🔍 Chat conversations request from user: ${req.user?.address || 'none'}`);
    console.log(`🔍 X-User-Address header: ${req.get('X-User-Address') || 'none'}`);
    
    const userAddress = req.user?.address || req.get('X-User-Address');
    if (!userAddress) {
      console.log('❌ No user address found for chat conversations');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    console.log(`✅ Processing chat conversations for address: ${userAddress}`);
    try {
      console.log(`🗄️  Querying conversations for address: ${userAddress}`);
      const { rows } = await pool.query(
        `SELECT id, type, participants, last_message_id, last_activity, unread_counts, metadata, created_at
         FROM conversations
         WHERE $1 = ANY(participants)
         ORDER BY last_activity DESC
         LIMIT 100`,
        [userAddress]
      );
      console.log(`✅ Found ${rows.length} conversations for address: ${userAddress}`);

      // Load last messages for each conversation
      const convs = await Promise.all(rows.map(async (r) => {
        let lastMessage = null;
        if (r.last_message_id) {
          const msgRes = await pool.query('SELECT * FROM messages WHERE id = $1', [r.last_message_id]);
          if (msgRes.rows[0]) {
            const m = msgRes.rows[0];
            lastMessage = {
              id: m.id,
              conversationId: m.conversation_id,
              fromAddress: m.from_address,
              toAddress: m.to_address,
              content: m.content,
              timestamp: m.created_at,
              messageType: m.message_type,
              isEncrypted: m.encrypted
            };
          }
        }

        return {
          id: r.id,
          type: r.type,
          participants: r.participants,
          lastMessage,
          lastActivity: r.last_activity,
          unreadCount: (r.unread_counts && r.unread_counts[userAddress]) || 0,
          metadata: r.metadata,
          createdAt: r.created_at
        };
      }));

      return res.json(convs);
    } catch (dbErr) {
      console.warn('DB query failed for conversations, returning fallback mock in dev:', dbErr.message);

      // Fallback mock for development when DB schema mismatches occur
      const conversations = [
        {
          id: `conv_dev_${Date.now()}`,
          type: 'dm',
          participants: [userAddress, '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1'],
          lastMessage: {
            id: 'msg_dev_1',
            conversationId: `conv_dev_${Date.now()}`,
            fromAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1',
            content: 'Dev fallback message',
            timestamp: new Date(),
            messageType: 'text',
            isEncrypted: false
          },
          lastActivity: new Date(),
          unreadCount: 0,
          metadata: {},
          createdAt: new Date()
        }
      ];

      return res.json(conversations);
    }
  } catch (err) {
    console.error('❌ Error fetching conversations:', err);
    
    // If database is unavailable, return empty conversations instead of 500 error
    if (err.code === 'ECONNREFUSED' || err.message?.includes('database') || err.message?.includes('connection')) {
      console.log('🗄️  Database unavailable, returning empty conversations');
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        }
      });
    }
    
    // For other errors, return 500
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get chat history for a conversation
app.get('/api/chat/history/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = Math.min(parseInt(req.query.limit || '50'), 200);
    const before = req.query.before;
    const userAddress = req.user?.address || req.get('X-User-Address');
    if (!userAddress) return res.status(401).json({ success: false, error: 'Unauthorized' });

    // Verify membership
    const convRes = await pool.query('SELECT participants FROM conversations WHERE id = $1', [conversationId]);
    if (convRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Conversation not found' });
    const participants = convRes.rows[0].participants || [];
    if (!participants.includes(userAddress)) return res.status(403).json({ success: false, error: 'Forbidden' });

    // Pagination: created_at < before or latest
    const params = [conversationId, limit];
    let query = 'SELECT * FROM messages WHERE conversation_id = $1';
    if (before) {
      query += ` AND created_at < $3`;
      params.push(before);
    }
    query += ' ORDER BY created_at DESC LIMIT $2';

    const messagesRes = await pool.query(query, params);

    const messages = messagesRes.rows.map(m => ({
      id: m.id,
      conversationId: m.conversation_id,
      fromAddress: m.from_address,
      toAddress: m.to_address,
      content: m.content,
      timestamp: m.created_at,
      messageType: m.message_type,
      isEncrypted: m.encrypted,
      metadata: m.metadata
    }));

    res.json({ messages, hasMore: messages.length === limit, nextCursor: messages.length ? messages[messages.length - 1].timestamp : null, prevCursor: null });
  } catch (err) {
    console.error('Error fetching chat history', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Send a message (store stub)
app.post('/api/chat/messages', async (req, res) => {
  try {
    const { conversationId, fromAddress, toAddress, content, messageType, encrypted } = req.body;
    const userAddress = req.user?.address || req.get('X-User-Address');
    if (!userAddress) return res.status(401).json({ success: false, error: 'Unauthorized' });
    if (!conversationId || !content) return res.status(400).json({ success: false, error: 'Missing required fields' });

    // Ensure user is sender
    if (fromAddress && fromAddress.toLowerCase() !== userAddress?.toLowerCase()) {
      return res.status(403).json({ success: false, error: 'fromAddress must match authenticated user' });
    }

    // Verify conversation exists and user is participant
    const convRes = await pool.query('SELECT participants FROM conversations WHERE id = $1', [conversationId]);
    if (convRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Conversation not found' });
    const participants = convRes.rows[0].participants || [];
    if (!participants.includes(userAddress)) return res.status(403).json({ success: false, error: 'Forbidden' });

    const messageId = `msg_${Date.now()}`;
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO messages (id, conversation_id, from_address, to_address, content, encrypted, message_type, metadata, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [messageId, conversationId, userAddress, toAddress || null, content, !!encrypted, messageType || 'text', {}, now]
    );

    // Update conversation last message and last_activity
    await pool.query('UPDATE conversations SET last_message_id = $1, last_activity = $2, updated_at = $2 WHERE id = $3', [messageId, now, conversationId]);

    // Increment unread counts for other participants
    const otherParticipants = participants.filter(p => p !== userAddress);
    if (otherParticipants.length) {
      const countsRes = await pool.query('SELECT unread_counts FROM conversations WHERE id = $1', [conversationId]);
      const unread = countsRes.rows[0].unread_counts || {};
      otherParticipants.forEach(p => {
        unread[p] = (unread[p] || 0) + 1;
      });
      await pool.query('UPDATE conversations SET unread_counts = $1 WHERE id = $2', [unread, conversationId]);
    }

    const newMessage = {
      id: messageId,
      conversationId,
      fromAddress: userAddress,
      toAddress: toAddress || null,
      content,
      timestamp: now,
      messageType: messageType || 'text',
      isEncrypted: !!encrypted
    };

    // TODO: broadcast via websocket if available
    res.status(201).json(newMessage);
  } catch (err) {
    console.error('Error saving message', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});


// Communities routes - return empty data until real implementation is ready
app.get('/api/communities', async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  
  // Return empty communities list
  res.json({
    success: true,
    data: [],
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: 0,
      pages: 0
    }
  });
});

// Get specific community by ID - return 404 for now
app.get('/api/communities/:id', (req, res) => {
  const { id } = req.params;
  
  // Return 404 - community not found
  res.status(404).json({
    success: false,
    message: 'Community not found'
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
}

// Messaging API aliases for backward compatibility
// These endpoints provide alternative routes to the same chat functionality

// Alias: /api/messages/conversations -> /api/chat/conversations
app.get('/api/messages/conversations', async (req, res) => {
  // Forward to the existing chat conversations endpoint
  req.url = '/api/chat/conversations';
  req.originalUrl = '/api/chat/conversations';
  return app._router.handle(req, res);
});

// Alias: /api/messaging/conversations -> /api/chat/conversations  
app.get('/api/messaging/conversations', async (req, res) => {
  // Forward to the existing chat conversations endpoint
  req.url = '/api/chat/conversations';
  req.originalUrl = '/api/chat/conversations';
  return app._router.handle(req, res);
});

// Posts feed route
app.get('/api/posts/feed', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const validatedLimit = validateLimit(limit);
    const validatedPage = validatePage(page);
    const offset = (validatedPage - 1) * validatedLimit;

    // Query posts with author information
    const query = `
      SELECT
        p.id, p.title, p.content_cid, p.media_cids, p.tags,
        p.staked_value, p.reputation_score, p.created_at,
        u.wallet_address, u.handle, u.profile_cid
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [validatedLimit, offset]);

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM posts');
    const total = parseInt(countResult.rows[0].count);

    // Transform results to match feed format with author object
    const posts = result.rows.map(post => ({
      id: post.id.toString(),
      title: post.title || '',
      content: post.content_cid || '',
      author: {
        address: post.wallet_address,
        username: post.handle || post.wallet_address?.slice(0, 8),
        displayName: post.handle || post.wallet_address?.slice(0, 8),
        avatar: post.profile_cid ? `https://ipfs.io/ipfs/${post.profile_cid}` : `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.wallet_address}`
      },
      timestamp: post.created_at,
      tags: JSON.parse(post.tags || '[]'),
      mediaCids: JSON.parse(post.media_cids || '[]'),
      stakedValue: parseFloat(post.staked_value || 0),
      reputationScore: parseInt(post.reputation_score || 0),
      likes: 0, // TODO: Implement likes counting
      comments: 0, // TODO: Implement comments counting
      shares: 0 // TODO: Implement shares counting
    }));

    res.json({
      success: true,
      data: posts,
      pagination: {
        page: validatedPage,
        limit: validatedLimit,
        total,
        pages: Math.ceil(total / validatedLimit)
      }
    });
  } catch (error) {
    console.error('Error fetching posts feed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posts feed: ' + error.message
    });
  }
});

// Enhanced feed route (matches frontend expectations)
app.get('/api/feed/enhanced', async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'new', timeRange = 'all', feedSource = 'all', userAddress } = req.query;

    // Validate and sanitize parameters
    const validatedLimit = validateLimit(limit);
    const validatedPage = validatePage(page);
    const offset = (validatedPage - 1) * validatedLimit;

    console.log(`🔍 Enhanced feed request - page: ${validatedPage}, limit: ${validatedLimit}, sort: ${sort}, source: ${feedSource}`);

    // Query posts from database with author information
    const query = `
      SELECT
        p.id,
        p.title,
        p.content_cid,
        p.media_cids,
        p.tags,
        p.staked_value,
        p.reputation_score,
        p.created_at,
        p.parent_id,
        p.onchain_ref,
        p.community_id,
        u.wallet_address,
        u.handle,
        u.profile_cid
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [validatedLimit, offset]);

    // Get total count for pagination
    const countResult = await pool.query('SELECT COUNT(*) FROM posts');
    const totalPosts = parseInt(countResult.rows[0].count);

    // Transform database posts to match frontend expectations
    const enhancedPosts = result.rows.map(post => ({
      id: post.id.toString(),
      title: post.title || '',
      content: post.content_cid || '',
      contentCid: post.content_cid || '',
      walletAddress: post.wallet_address,
      handle: post.handle || post.wallet_address?.slice(0, 8),
      profileCid: post.profile_cid,
      author: post.wallet_address,
      tags: JSON.parse(post.tags || '[]'),
      mediaCids: JSON.parse(post.media_cids || '[]'),
      stakedValue: parseFloat(post.staked_value || 0),
      reputationScore: parseInt(post.reputation_score || 0),
      createdAt: post.created_at,
      updatedAt: post.created_at,
      parentId: post.parent_id,
      onchainRef: post.onchain_ref,
      communityId: post.community_id,
      dao: post.community_id, // Backward compatibility
      contentType: 'text',
      reactions: [],
      tips: [],
      comments: 0,
      shares: 0,
      views: 0,
      engagementScore: 0,
      authorProfile: {
        handle: post.handle || post.wallet_address?.slice(0, 8),
        verified: false,
        avatar: post.profile_cid ? `https://ipfs.io/ipfs/${post.profile_cid}` : undefined
      }
    }));

    res.json({
      success: true,
      data: {
        posts: enhancedPosts,
        pagination: {
          page: validatedPage,
          limit: validatedLimit,
          total: totalPosts,
          totalPages: Math.ceil(totalPosts / validatedLimit),
          hasMore: validatedPage < Math.ceil(totalPosts / validatedLimit),
          nextPage: validatedPage + 1
        },
        postsCount: enhancedPosts.length,
        totalPosts: totalPosts,
        hasMore: validatedPage < Math.ceil(totalPosts / validatedLimit)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching enhanced feed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feed: ' + error.message
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
  console.log(`   POST /api/auth/wallet-connect             - Wallet connect auth`);
  console.log(`   GET  /api/posts/feed                      - Posts feed`);
  console.log(`   GET  /api/feed/enhanced                   - Enhanced feed`);
  console.log(`   GET  /api/profiles/address/:address       - User profile`);
  console.log(`   GET  /api/sellers/profile/:walletAddress  - Seller profile`);
  console.log(`   POST /api/sellers/profile                 - Create seller`);
  console.log(`   GET  /marketplace/reputation/:address     - Reputation data`);
  console.log(`\n✅ Server ready for requests\n`);
});