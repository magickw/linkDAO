import express from 'express';
import { PostController } from '../controllers/postController';
import { authMiddleware } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';

const router = express.Router();
const postController = new PostController();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Post API is healthy',
    timestamp: new Date().toISOString()
  });
});

// Routes
// Routes
// CRITICAL: specific routes must come before parameterized routes
console.log('Registering /api/posts/repost route');
router.post('/repost', authMiddleware, postController.repostPost.bind(postController));
router.post('/unrepost', authMiddleware, postController.unrepostPost.bind(postController));

router.post('/', postController.createPost.bind(postController));
router.get('/', postController.getAllPosts.bind(postController));
router.get('/feed', postController.getFeed.bind(postController));
router.get('/author/:author', postController.getPostsByAuthor.bind(postController));
router.get('/tag/:tag', postController.getPostsByTag.bind(postController));
router.get('/community/:communityId', postController.getPostsByCommunity.bind(postController));
router.get('/share/:shareId', postController.getPostByShareId.bind(postController));
router.post('/:id/view', postController.viewPost.bind(postController));
router.get('/:id', postController.getPostById.bind(postController));
router.put('/:id', authMiddleware, csrfProtection, postController.updatePost.bind(postController));
router.delete('/:id', authMiddleware, csrfProtection, postController.deletePost.bind(postController));

export default router;