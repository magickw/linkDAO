import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { cartController } from '../controllers/cartController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validation';

const router = express.Router();

// All cart routes require authentication
router.use(authMiddleware);

/**
 * @route GET /api/cart
 * @desc Get user's cart
 * @access Private
 */
router.get('/', cartController.getCart.bind(cartController));

/**
 * @route POST /api/cart/items
 * @desc Add item to cart
 * @access Private
 * @body { productId: string, quantity: number }
 */
router.post('/items', csrfProtection, 
  validateRequest({
    body: {
      productId: { type: 'string', required: true },
      quantity: { type: 'number', required: true, min: 1 }
    }
  }),
  cartController.addItem.bind(cartController)
);

/**
 * @route PUT /api/cart/items/:id
 * @desc Update cart item quantity
 * @access Private
 * @params { id: string }
 * @body { quantity: number }
 */
router.put('/items/:id', csrfProtection, 
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      quantity: { type: 'number', required: true, min: 1 }
    }
  }),
  cartController.updateItem.bind(cartController)
);

/**
 * @route DELETE /api/cart/items/:id
 * @desc Remove item from cart
 * @access Private
 * @params { id: string }
 */
router.delete('/items/:id', csrfProtection, 
  validateRequest({
    params: {
      id: { type: 'string', required: true }
    }
  }),
  cartController.removeItem.bind(cartController)
);

/**
 * @route DELETE /api/cart
 * @desc Clear cart
 * @access Private
 */
router.delete('/', csrfProtection,  cartController.clearCart.bind(cartController));

/**
 * @route POST /api/cart/sync
 * @desc Sync cart with local storage data
 * @access Private
 * @body { items: Array<{ productId: string, quantity: number }> }
 */
router.post('/sync', csrfProtection, 
  validateRequest({
    body: {
      items: { type: 'array', required: true }
    }
  }),
  cartController.syncCart.bind(cartController)
);

export default router;
