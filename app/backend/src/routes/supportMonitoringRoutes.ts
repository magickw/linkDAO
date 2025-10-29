import { Router } from 'express';
import { supportMonitoring } from '../services/supportMonitoringService';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/metrics', authMiddleware, (req: any, res: any) => {
  if (!req.user.isStaff) {
    return res.status(403).json({ success: false, message: 'Staff only' });
  }
  
  res.json({
    success: true,
    data: supportMonitoring.getMetrics()
  });
});

router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;
