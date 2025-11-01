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

// General routes
router.post('/', csrfProtection,  createPostLimiter, postController.createPost);
router.put('/:id', csrfProtection,  postController.updatePost);
router.delete('/:id', csrfProtection,  postController.deletePost);
router.get('/', postController.getAllPosts);

export default router;
