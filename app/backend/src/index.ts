import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import userProfileRoutes from './routes/userProfileRoutes';
import postRoutes from './routes/postRoutes';
import followRoutes from './routes/followRoutes';
import aiRoutes from './routes/aiRoutes';
import { IndexerService } from './services/indexerService';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'LinkDAO Backend API' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/profiles', userProfileRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/ai', aiRoutes);

// Start indexer service
const indexer = new IndexerService(
  process.env.RPC_URL || 'http://localhost:8545',
  process.env.PROFILE_REGISTRY_ADDRESS || '0x1234567890123456789012345678901234567890',
  process.env.FOLLOW_MODULE_ADDRESS || '0x2345678901245678901234567890123456789012',
  process.env.PAYMENT_ROUTER_ADDRESS || '0x3456789012345678901234567890123456789012',
  process.env.GOVERNANCE_ADDRESS || '0x4567890123456789012345678901234567890123'
);

indexer.start().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await indexer.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await indexer.stop();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`LinkDAO backend server running on port ${PORT}`);
});

export default app;