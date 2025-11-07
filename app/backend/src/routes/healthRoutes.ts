import { Router, Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { healthMonitoringService } from '../services/healthMonitoringService';
import { getWebSocketService } from '../services/webSocketService';

const router = Router();

// Basic health check
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthData = await healthMonitoringService.getSystemHealth();
    res.status(200).json(successResponse(healthData, 'System is healthy'));
  } catch (error) {
    res.status(503).json(errorResponse('System health check failed', error));
  }
});

// WebSocket connectivity test
router.get('/health/websocket', (req: Request, res: Response) => {
  try {
    const webSocketService = getWebSocketService();
    
    if (!webSocketService) {
      return res.status(503).json(errorResponse('WebSocket service not initialized'));
    }
    
    const stats = webSocketService.getStats();
    const response = {
      status: 'healthy',
      websocket: {
        initialized: true,
        connectedClients: stats.connectedUsers,
        maxConnections: stats.maxConnections,
        isResourceConstrained: stats.isResourceConstrained,
        features: {
          heartbeat: stats.features.heartbeat,
          compression: stats.features.compression,
          realTimeUpdates: stats.features.realTimeUpdates
        }
      }
    };
    
    res.status(200).json(successResponse(response, 'WebSocket service is healthy'));
  } catch (error) {
    res.status(503).json(errorResponse('WebSocket health check failed', error));
  }
});

// Detailed health check with external services
router.get('/health/detailed', async (req: Request, res: Response) => {
  try {
    const healthData = await healthMonitoringService.getDetailedHealth();
    res.status(200).json(successResponse(healthData, 'Detailed system health check completed'));
  } catch (error) {
    res.status(503).json(errorResponse('Detailed health check failed', error));
  }
});

export default router;
