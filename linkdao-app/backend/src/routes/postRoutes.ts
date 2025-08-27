import express from 'express';
import { PostController } from '../controllers/postController';

const router = express.Router();
const postController = new PostController();

router.post('/', postController.createPost);
router.get('/:id', postController.getPostById);
router.get('/author/:author', postController.getPostsByAuthor);
router.get('/tag/:tag', postController.getPostsByTag);
router.put('/:id', postController.updatePost);
router.delete('/:id', postController.deletePost);
router.get('/', postController.getAllPosts);
router.get('/feed', postController.getFeed);

export default router;