import express from 'express';
import { StatusController } from '../controllers/statusController';
import { authMiddleware } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';

const router = express.Router();

// Lazy initialization to prevent constructor issues during module loading
let statusController: StatusController;

try {
  statusController = new StatusController();
} catch (error) {
  console.error('Failed to initialize StatusController:', error);
  // Create a fallback controller with basic methods
  statusController = {
    createStatus: async (req: any, res: any) => {
      return res.status(500).json({
        success: false,
        error: 'StatusController initialization failed',
        message: 'Service temporarily unavailable'
      });
    },
    getStatus: async (req: any, res: any) => {
      return res.status(500).json({
        success: false,
        error: 'StatusController initialization failed',
        message: 'Service temporarily unavailable'
      });
    },
    getAllStatuses: async (req: any, res: any) => {
      return res.status(500).json({
        success: false,
        error: 'StatusController initialization failed',
        message: 'Service temporarily unavailable'
      });
    },
    getStatusFeed: async (req: any, res: any) => {
      return res.status(500).json({
        success: false,
        error: 'StatusController initialization failed',
        message: 'Service temporarily unavailable'
      });
    },
    getStatusesByAuthor: async (req: any, res: any) => {
      return res.status(500).json({
        success: false,
        error: 'StatusController initialization failed',
        message: 'Service temporarily unavailable'
      });
    },
    getStatusesByTag: async (req: any, res: any) => {
      return res.status(500).json({
        success: false,
        error: 'StatusController initialization failed',
        message: 'Service temporarily unavailable'
      });
    },
    updateStatus: async (req: any, res: any) => {
      return res.status(500).json({
        success: false,
        error: 'StatusController initialization failed',
        message: 'Service temporarily unavailable'
      });
    },
    deleteStatus: async (req: any, res: any) => {
      return res.status(500).json({
        success: false,
        error: 'StatusController initialization failed',
        message: 'Service temporarily unavailable'
      });
    },
    getCsrfToken: async (req: any, res: any) => {
      return res.status(500).json({
        success: false,
        error: 'StatusController initialization failed',
        message: 'Service temporarily unavailable'
      });
    }
  } as any;
}

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Status API is healthy',
    timestamp: new Date().toISOString(),
    controllerStatus: statusController ? 'initialized' : 'failed'
  });
});

// Helper function to safely bind methods
function safeBind(method: any, context: any) {
  if (typeof method === 'function') {
    return method.bind(context);
  }
  return async (req: any, res: any) => {
    return res.status(500).json({
      success: false,
      error: 'Method not available',
      message: 'The requested method is not available'
    });
  };
}

// Status routes with safe binding
router.post('/', authMiddleware, csrfProtection, safeBind(statusController.createStatus, statusController));
router.get('/', safeBind(statusController.getAllStatuses, statusController));
router.get('/feed', safeBind(statusController.getStatusFeed, statusController));
router.get('/csrf-token', safeBind(statusController.getCsrfToken, statusController));
router.get('/author/:authorId', safeBind(statusController.getStatusesByAuthor, statusController));
router.get('/tag/:tag', safeBind(statusController.getStatusesByTag, statusController));
router.get('/share/:shareId', safeBind(statusController.getStatusByShareId, statusController));
router.post('/:id/view', safeBind(statusController.viewStatus, statusController));
router.get('/:id', safeBind(statusController.getStatus, statusController));
router.put('/:id', authMiddleware, csrfProtection, safeBind(statusController.updateStatus, statusController));
router.delete('/:id', authMiddleware, csrfProtection, safeBind(statusController.deleteStatus, statusController));

router.post('/:id/react', authMiddleware, csrfProtection, safeBind(statusController.addStatusReaction, statusController));

export default router;