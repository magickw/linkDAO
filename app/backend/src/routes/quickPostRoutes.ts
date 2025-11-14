import express from 'express';
import { QuickPostController } from '../controllers/quickPostController';

const router = express.Router();
const quickPostController = new QuickPostController();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'QuickPost API is healthy',
    timestamp: new Date().toISOString()
  });
});

// QuickPost routes
router.post('/', quickPostController.createQuickPost.bind(quickPostController));
router.get('/', quickPostController.getAllQuickPosts.bind(quickPostController));
router.get('/feed', quickPostController.getQuickPostFeed.bind(quickPostController));
router.get('/author/:authorId', quickPostController.getQuickPostsByAuthor.bind(quickPostController));
router.get('/tag/:tag', quickPostController.getQuickPostsByTag.bind(quickPostController));
router.get('/:id', quickPostController.getQuickPostById.bind(quickPostController));
router.put('/:id', quickPostController.updateQuickPost.bind(quickPostController));
router.delete('/:id', quickPostController.deleteQuickPost.bind(quickPostController));

export default router;