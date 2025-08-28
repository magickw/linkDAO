import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import userProfileRoutes from './routes/userProfileRoutes';
import postRoutes from './routes/postRoutes';
import followRoutes from './routes/followRoutes';
import aiRoutes from './routes/aiRoutes';
import authRoutes from './routes/authRoutes';
import marketplaceRoutes from './routes/marketplaceRoutes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { IndexerService } from './services/indexerService';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn(`Warning: Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Create Express app
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3002;

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Store connected users
const connectedUsers = new Map<string, string>(); // socketId -> userAddress

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Register user with their address
  socket.on('register', (address: string) => {
    connectedUsers.set(socket.id, address);
    console.log(`User ${address} registered with socket ${socket.id}`);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    connectedUsers.delete(socket.id);
    console.log('User disconnected:', socket.id);
  });
});

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
app.use('/api/auth', authRoutes);
app.use('/api/profiles', userProfileRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/marketplace', marketplaceRoutes);

// WebSocket endpoint info
app.get('/ws', (req, res) => {
  res.json({ 
    message: 'WebSocket server is running', 
    endpoint: `ws://localhost:${PORT}` 
  });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

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
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await indexer.stop();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`LinkDAO backend server running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});

// Export io for use in other modules
export { io, connectedUsers };
export default app;