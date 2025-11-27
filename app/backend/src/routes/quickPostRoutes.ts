import express from 'express';
import { QuickPostController } from '../controllers/quickPostController';
import { authMiddleware } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';

const router = express.Router();

// Lazy initialization to prevent constructor issues during module loading
let quickPostController: QuickPostController;

try {
  quickPostController = new QuickPostController();
} catch (error) {
  console.error('Failed to initialize QuickPostController:', error);
  // Create a fallback controller with basic methods
  quickPostController = {
    createQuickPost: async (req: any, res: any) => {
      return res.status(500).json({
        success: false,
        error: 'QuickPostController initialization failed',
        message: 'Service temporarily unavailable'
      });
    },
    getQuickPost: async (req: any, res: any) => {
      return res.status(500).json({
        success: false,
        error: 'QuickPostController initialization failed',
        message: 'Service temporarily unavailable'
      });
    },
    getAllQuickPosts: async (req: any, res: any) => {
      return res.status(500).json({
        success: false,
        error: 'QuickPostController initialization failed',
        message: 'Service temporarily unavailable'
      });
    },
    getQuickPostFeed: async (req: any, res: any) => {
      return res.status(500).json({
        success: false,
        error: 'QuickPostController initialization failed',
        message: 'Service temporarily unavailable'
      });
    },
    getQuickPostsByAuthor: async (req: any, res: any) => {
      return res.status(500).json({
        success: false,
        error: 'QuickPostController initialization failed',
        message: 'Service temporarily unavailable'
      });
    },
    getQuickPostsByTag: async (req: any, res: any) => {
      return res.status(500).json({
        success: false,
        error: 'QuickPostController initialization failed',
        message: 'Service temporarily unavailable'
      });
    },
    updateQuickPost: async (req: any, res: any) => {
      return res.status(500).json({
        success: false,
        error: 'QuickPostController initialization failed',
        message: 'Service temporarily unavailable'
      });
    },
    deleteQuickPost: async (req: any, res: any) => {
      return res.status(500).json({
        success: false,
        error: 'QuickPostController initialization failed',
        message: 'Service temporarily unavailable'
      });
    },
    getCsrfToken: async (req: any, res: any) => {
      return res.status(500).json({
        success: false,
        error: 'QuickPostController initialization failed',
        message: 'Service temporarily unavailable'
      });
    }
  } as any;
}

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'QuickPost API is healthy',
    timestamp: new Date().toISOString(),
    controllerStatus: quickPostController ? 'initialized' : 'failed'
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

// QuickPost routes with safe binding
router.post('/', authMiddleware, csrfProtection, safeBind(quickPostController.createQuickPost, quickPostController));
router.get('/', safeBind(quickPostController.getAllQuickPosts, quickPostController));
router.get('/feed', safeBind(quickPostController.getQuickPostFeed, quickPostController));
router.get('/csrf-token', safeBind(quickPostController.getCsrfToken, quickPostController));
router.get('/author/:authorId', safeBind(quickPostController.getQuickPostsByAuthor, quickPostController));
router.get('/tag/:tag', safeBind(quickPostController.getQuickPostsByTag, quickPostController));
router.get('/:id', safeBind(quickPostController.getQuickPost, quickPostController));
router.put('/:id', authMiddleware, csrfProtection, safeBind(quickPostController.updateQuickPost, quickPostController));
router.delete('/:id', authMiddleware, csrfProtection, safeBind(quickPostController.deleteQuickPost, quickPostController));

export default router;