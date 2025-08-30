import express from 'express';
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
router.post('/', createPostLimiter, postController.createPost);
router.put('/:id', postController.updatePost);
router.delete('/:id', postController.deletePost);
router.get('/', postController.getAllPosts);

export default router;