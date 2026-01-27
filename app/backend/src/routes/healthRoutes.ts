import { Router, Request, Response } from 'express';
import { getWebSocketService } from '../services/webSocketService';

const router = Router();

// Basic health check - mounted at /api/health so this becomes /api/health
router.get('/', async (req: Request, res: Response) => {
  try {
    const memoryUsage = process.memoryUsage();
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024)
      },
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.status(200).json({
      success: true,
      data: healthData,
      message: 'System is healthy'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'System health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// WebSocket connectivity test - becomes /api/health/websocket
router.get('/websocket', (req: Request, res: Response) => {
  try {
    const webSocketService = getWebSocketService();
    
    if (!webSocketService) {
      return res.status(503).json({
        success: false,
        error: 'WebSocket service not initialized',
        message: 'WebSocket service is not available'
      });
    }
    
    const stats = webSocketService.getStats();
    const response = {
      status: 'healthy',
      websocket: {
        initialized: true,
        connectedClients: stats.connectedUsers,
        activeUsers: stats.activeUsers,
        totalSubscriptions: stats.totalSubscriptions,
        rooms: stats.rooms,
        queuedMessages: stats.queuedMessages,
        resourceConstraints: stats.resourceConstraints
      }
    };
    
    res.status(200).json({
      success: true,
      data: response,
      message: 'WebSocket service is healthy'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'WebSocket health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Detailed health check with external services - becomes /api/health/detailed
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const memoryUsage = process.memoryUsage();
    const webSocketService = getWebSocketService();
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      },
      environment: process.env.NODE_ENV || 'development',
      websocket: webSocketService ? {
        enabled: true,
        stats: webSocketService.getStats()
      } : {
        enabled: false,
        reason: 'Service not initialized'
      }
    };
    
    res.status(200).json({
      success: true,
      data: healthData,
      message: 'Detailed system health check completed'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Detailed health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
