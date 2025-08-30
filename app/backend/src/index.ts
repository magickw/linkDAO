import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { databaseService } from './services/databaseService';
import { redisService } from './services/redisService';
import { validateEnv } from './utils/envValidation';

// Import routes
import userProfileRoutes from './routes/userProfileRoutes';
import authRoutes from './routes/authRoutes';
import marketplaceRoutes from './routes/marketplaceRoutes';
import governanceRoutes from './routes/governanceRoutes';
import tipRoutes from './routes/tipRoutes';
import followRoutes from './routes/followRoutes';
import postRoutes from './routes/postRoutes';
import aiRoutes from './routes/aiRoutes';
import searchRoutes from './routes/searchRoutes';

// Load environment variables
dotenv.config();

// Validate environment configuration
const envConfig = validateEnv();

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://linkdao.vercel.app'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

app.use(helmet());
app.use(express.json());

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
  try {
    if (process.env.REDIS_URL && process.env.REDIS_URL !== 'redis://localhost:6379') {
      await redisService.testConnection();
      console.log('✅ Redis connection successful');
    } else {
      console.log('⚠️  Redis not configured, skipping...');
    }
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    console.log('⚠️  Continuing without Redis...');
  }
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
app.use('/api/governance', governanceRoutes);
app.use('/api/tips', tipRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/search', searchRoutes);

// Additional search-related routes
app.use('/api/trending', searchRoutes);
app.use('/api/recommendations', searchRoutes);
app.use('/api/hashtags', searchRoutes);

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