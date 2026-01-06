import { Router } from 'express';
import { savedForLaterController } from '../controllers/savedForLaterController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all saved items
router.get('/', savedForLaterController.getSavedItems.bind(savedForLaterController));

// Move saved item to cart
router.post('/:itemId/move-to-cart', savedForLaterController.moveToCart.bind(savedForLaterController));

// Remove saved item
router.delete('/:itemId', savedForLaterController.removeSavedItem.bind(savedForLaterController));

export default router;
