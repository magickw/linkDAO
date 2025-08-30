import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { generalLimiter, apiLimiter, feedLimiter } from './middleware/rateLimiter';
import { databaseService } from './services/databaseService';
// import { redisService } from './services/redisService'; // Disabled to prevent blocking
import { validateEnv } from './utils/envValidation';

// Import routes
import userProfileRoutes from './routes/userProfileRoutes';
import authRoutes from './routes/authRoutes';
import marketplaceRoutes from './routes/marketplaceRoutes';
import productRoutes from './routes/productRoutes';
import governanceRoutes from './routes/governanceRoutes';
import tipRoutes from './routes/tipRoutes';
import followRoutes from './routes/followRoutes';
import postRoutes from './routes/postRoutes';
import aiRoutes from './routes/aiRoutes';
import searchRoutes from './routes/searchRoutes';
import orderRoutes from './routes/orderRoutes';
import disputeRoutes from './routes/disputeRoutes';
import reviewRoutes from './routes/reviewRoutes';
import contentIngestionRoutes from './routes/contentIngestionRoutes';
import reportRoutes from './routes/reportRoutes';
// import serviceRoutes from './routes/serviceRoutes';
// import projectManagementRoutes from './routes/projectManagementRoutes';

// Load environment variables
dotenv.config();

// Validate environment configuration
const envConfig = validateEnv();

const app = express();

// Enhanced CORS configuration with better error handling
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [
          'https://linkdao.vercel.app',
          'https://linkdao-frontend.vercel.app', // Add any additional frontend domains
          /^https:\/\/linkdao.*\.vercel\.app$/ // Allow preview deployments
        ] 
      : [
          'http://localhost:3000', 
          'http://localhost:3001',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001'
        ];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any allowed origin (including regex patterns)
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      // Don't throw error, just deny the request
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  preflightContinue: false
}));

app.use(helmet());
app.use(express.json());

// Apply rate limiting
app.use(generalLimiter);
app.use('/api', apiLimiter);

// Initialize services
async function initializeServices() {
  // Database connection test
  try {
    await databaseService.testConnection();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.log('⚠️  Starting server without database connection...');
    // Don't exit in production, allow server to start
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }

  // Redis connection test (optional)
  // Skip Redis connection entirely to prevent blocking server startup
  console.log('⚠️  Skipping Redis connection to prevent server blocking');
}

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'LinkDAO Backend API', 
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Simple ping endpoint
app.get('/ping', (req, res) => {
  res.json({ pong: true, timestamp: new Date().toISOString() });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    database: 'unknown'
  };

  try {
    await databaseService.testConnection();
    health.database = 'connected';
  } catch (error) {
    health.database = 'disconnected';
    health.status = 'degraded';
  }

  const statusCode = health.database === 'connected' ? 200 : 503;
  res.status(statusCode).json(health);
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', userProfileRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/products', productRoutes);
app.use('/api/governance', governanceRoutes);
app.use('/api/tips', tipRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', disputeRoutes);
app.use('/api', reviewRoutes);
app.use('/api/content', contentIngestionRoutes);
app.use('/api/reports', reportRoutes);
// app.use('/api/services', serviceRoutes);
// app.use('/api/project-management', projectManagementRoutes);

// Additional search-related routes
app.use('/api/trending', searchRoutes);
app.use('/api/recommendations', searchRoutes);
app.use('/api/hashtags', searchRoutes);

// Global error handler (must be after routes)
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);
  
  // CORS error
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Policy Violation',
      message: 'Origin not allowed by CORS policy'
    });
  }
  
  // Default error response
  return res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : error.message
  });
});

// 404 handler for unmatched routes
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Start server
async function startServer() {
  await initializeServices();
  
  app.listen(envConfig.PORT, () => {
    console.log(`🚀 Server running on port ${envConfig.PORT}`);
    console.log(`📊 Environment: ${envConfig.NODE_ENV}`);
    console.log(`🌐 Health check: http://localhost:${envConfig.PORT}/health`);
    console.log(`📡 API ready: http://localhost:${envConfig.PORT}/`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;