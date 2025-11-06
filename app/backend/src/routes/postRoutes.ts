import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { PostController } from '../controllers/postController';
import { createPostRateLimit } from '../middleware/rateLimitingMiddleware';

const router = express.Router();
const postController = new PostController();

// Add a simple test endpoint for connection verification FIRST
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Post API is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Add a diagnostic endpoint to test fallback service directly
router.get('/diagnostic', async (req, res) => {
  try {
    const { FallbackPostService } = require('../services/fallbackPostService');
    const fallbackService = new FallbackPostService();
    
    // Test creating a post with fallback service
    const testPost = await fallbackService.createPost({
      author: '0xtest',
      content: 'Diagnostic test post'
    });
    
    const allPosts = await fallbackService.getAllPosts();
    
    res.json({
      success: true,
      message: 'Fallback service works',
      testPost: testPost,
      totalPosts: allPosts.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Specific routes first (more specific routes before general ones)
router.get('/feed', postController.getFeed.bind(postController));
router.get('/author/:author', postController.getPostsByAuthor.bind(postController));
router.get('/tag/:tag', postController.getPostsByTag.bind(postController));
router.get('/:id', postController.getPostById.bind(postController));

// General routes - conditionally apply CSRF protection and rate limiting
const isDevelopment = process.env.NODE_ENV === 'development';

const csrfMiddleware = isDevelopment ? 
  (req: any, res: any, next: any) => next() : // Skip CSRF in development
  csrfProtection; // Use CSRF in production

const rateLimitMiddleware = isDevelopment ?
  (req: any, res: any, next: any) => next() : // Skip rate limiting in development
  createPostRateLimit; // Use rate limiting in production

router.post('/', csrfMiddleware, rateLimitMiddleware, postController.createPost.bind(postController));
router.put('/:id', csrfMiddleware, postController.updatePost.bind(postController));
router.delete('/:id', csrfMiddleware, postController.deletePost.bind(postController));
router.get('/', postController.getAllPosts.bind(postController));

export default router;
