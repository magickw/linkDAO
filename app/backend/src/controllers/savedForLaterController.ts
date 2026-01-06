import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { savedForLaterService } from '../services/savedForLaterService';
import { cartService, Cart } from './cartService';
import { AuthenticatedUser } from '../middleware/authMiddleware';
import { Request, Response } from 'express';

export class SavedForLaterController {
    /**
     * GET /api/saved-for-later
     * Get all saved items for the authenticated user
     */
    async getSavedItems(req: Request & { user: AuthenticatedUser }, res: Response): Promise<void> {
        try {
            const items = await savedForLaterService.getSavedItems(req.user);

            res.json({
                success: true,
                data: items,
            });
        } catch (error: any) {
            safeLogger.error('[SavedForLaterController] Error getting saved items:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: error.message || 'Failed to get saved items',
                },
            });
        }
    }

    /**
     * POST /api/cart/save-for-later/:itemId
     * Save a cart item for later
     */
    async saveCartItemForLater(req: Request & { user: AuthenticatedUser }, res: Response): Promise<void> {
        try {
            const { itemId } = req.params;
            const { notes } = req.body;

            // Get the cart item details
            const cart = await cartService.getOrCreateCart(req.user);
            const cartItem = cart.items.find((item) => item.id === itemId);

            if (!cartItem) {
                res.status(404).json({
                    success: false,
                    error: {
                        message: 'Cart item not found',
                    },
                });
                return;
            }

            // Save the item
            const savedItem = await savedForLaterService.saveForLater(
                req.user,
                cartItem.productId,
                cartItem.quantity,
                notes
            );

            // Remove from cart
            await cartService.removeItem(req.user, itemId);

            res.json({
                success: true,
                data: savedItem,
            });
        } catch (error: any) {
            safeLogger.error('[SavedForLaterController] Error saving cart item for later:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: error.message || 'Failed to save item for later',
                },
            });
        }
    }

    /**
     * POST /api/saved-for-later/:itemId/move-to-cart
     * Move a saved item back to cart
     */
    async moveToCart(req: Request & { user: AuthenticatedUser }, res: Response): Promise<void> {
        try {
            const { itemId } = req.params;

            // Get the saved item
            const savedItem = await savedForLaterService.getSavedItem(req.user, itemId);

            if (!savedItem.product) {
                res.status(404).json({
                    success: false,
                    error: {
                        message: 'Product not found',
                    },
                });
                return;
            }

            // Add to cart
            await cartService.addItem(req.user, {
                productId: savedItem.productId,
                quantity: savedItem.quantity,
            });

            // Remove from saved items
            await savedForLaterService.removeSavedItem(req.user, itemId);

            // Get updated cart
            const cart = await cartService.getOrCreateCart(req.user);

            res.json({
                success: true,
                data: cart,
            });
        } catch (error: any) {
            safeLogger.error('[SavedForLaterController] Error moving item to cart:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: error.message || 'Failed to move item to cart',
                },
            });
        }
    }

    /**
     * DELETE /api/saved-for-later/:itemId
     * Remove a saved item
     */
    async removeSavedItem(req: Request & { user: AuthenticatedUser }, res: Response): Promise<void> {
        try {
            const { itemId } = req.params;

            await savedForLaterService.removeSavedItem(req.user, itemId);

            res.json({
                success: true,
                message: 'Item removed from saved for later',
            });
        } catch (error: any) {
            safeLogger.error('[SavedForLaterController] Error removing saved item:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: error.message || 'Failed to remove saved item',
                },
            });
        }
    }
}

export const savedForLaterController = new SavedForLaterController();
