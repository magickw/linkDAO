import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { PostController } from '../controllers/postController';
import { feedLimiter, createPostLimiter } from '../middleware/rateLimiter';

const router = express.Router();
const postController = new PostController();

// Specific routes first (more specific routes before general ones)
router.get('/feed', feedLimiter, postController.getFeed);
router.get('/author/:author', postController.getPostsByAuthor);
router.get('/tag/:tag', postController.getPostsByTag);
router.get('/:id', postController.getPostById);

// General routes - conditionally apply CSRF protection and rate limiting
const isDevelopment = process.env.NODE_ENV === 'development';

const csrfMiddleware = isDevelopment ? 
  (req: any, res: any, next: any) => next() : // Skip CSRF in development
  csrfProtection; // Use CSRF in production

const rateLimitMiddleware = isDevelopment ?
  (req: any, res: any, next: any) => next() : // Skip rate limiting in development
  createPostLimiter; // Use rate limiting in production

router.post('/', csrfMiddleware, rateLimitMiddleware, postController.createPost);
router.put('/:id', csrfMiddleware, postController.updatePost);
router.delete('/:id', csrfMiddleware, postController.deletePost);
router.get('/', postController.getAllPosts);

// Add a simple test endpoint for connection verification
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Post API is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

export default router;
