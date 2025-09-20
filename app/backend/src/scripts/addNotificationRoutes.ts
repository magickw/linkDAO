import express from 'express';
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
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

app.listen(PORT, () => {
  console.log(`HTTP server running on port ${PORT}`);
  console.log(`WebSocket server will run on port ${WS_PORT}`);
  console.log('Available endpoints:');
  console.log(`  GET  /health - Health check`);
  console.log(`  GET  /api/notifications/stats - Service statistics`);
  console.log(`  POST /api/notifications/mention - Send mention notification`);
  console.log(`  POST /api/notifications/tip - Send tip notification`);
  console.log(`  POST /api/notifications/governance - Send governance notification`);
  console.log(`  POST /api/notifications/community - Send community notification`);
  console.log(`  POST /api/notifications/reaction - Send reaction notification`);
  console.log(`  POST /api/notifications/comment - Notify new comment`);
  console.log(`  POST /api/notifications/reaction-update - Notify reaction update`);
  console.log(`  POST /api/notifications/batch - Send batch notifications`);
  console.log(`  POST /api/notifications/broadcast - Broadcast to all users`);
  console.log(`  POST /api/notifications/test/:type - Send test notification`);
});

export default app;