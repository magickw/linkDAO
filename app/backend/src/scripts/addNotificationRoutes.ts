import express from 'express';
import { safeLogger } from '../utils/safeLogger';
import cors from 'cors';
import realTimeNotificationRoutes from '../routes/realTimeNotificationRoutes';

// This script demonstrates how to integrate the real-time notification routes
// into your existing Express application

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Add the real-time notification routes
app.use('/api/notifications', realTimeNotificationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'real-time-notifications'
  });
});

// Error handling middleware
app.use((error: any, req: any, res: any, next: any) => {
  safeLogger.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

app.listen(PORT, () => {
  safeLogger.info(`HTTP server running on port ${PORT}`);
  safeLogger.info(`WebSocket server will run on port ${WS_PORT}`);
  safeLogger.info('Available endpoints:');
  safeLogger.info(`  GET  /health - Health check`);
  safeLogger.info(`  GET  /api/notifications/stats - Service statistics`);
  safeLogger.info(`  POST /api/notifications/mention - Send mention notification`);
  safeLogger.info(`  POST /api/notifications/tip - Send tip notification`);
  safeLogger.info(`  POST /api/notifications/governance - Send governance notification`);
  safeLogger.info(`  POST /api/notifications/community - Send community notification`);
  safeLogger.info(`  POST /api/notifications/reaction - Send reaction notification`);
  safeLogger.info(`  POST /api/notifications/comment - Notify new comment`);
  safeLogger.info(`  POST /api/notifications/reaction-update - Notify reaction update`);
  safeLogger.info(`  POST /api/notifications/batch - Send batch notifications`);
  safeLogger.info(`  POST /api/notifications/broadcast - Broadcast to all users`);
  safeLogger.info(`  POST /api/notifications/test/:type - Send test notification`);
});

export default app;
