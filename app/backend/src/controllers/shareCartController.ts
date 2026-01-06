import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { shareCartService } from '../services/shareCartService';
import { cartService } from '../services/cartService';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { safeLogger } from '../utils/safeLogger';

export class ShareCartController {
    /**
     * Create a shareable cart link
     * POST /api/cart/share
     */
    async createShareLink(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
                return;
            }

            // Get current cart
            const cart = await cartService.getOrCreateCart(req.user);

            // Create share link
            const { shareToken, expiresAt } = await shareCartService.shareCart(req.user, cart);

            successResponse(res, {
                shareToken,
                shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/cart/shared/${shareToken}`,
                expiresAt
            }, 201);
        } catch (error) {
            safeLogger.error('Error creating share link:', error);
            errorResponse(res, 'SHARE_ERROR', 'Failed to create share link', 500);
        }
    }

    /**
     * Get shared cart by token
     * GET /api/cart/shared/:token
     */
    async getSharedCart(req: Request, res: Response): Promise<void> {
        try {
            const { token } = req.params;

            if (!token) {
                errorResponse(res, 'INVALID_TOKEN', 'Share token is required', 400);
                return;
            }

            const sharedCart = await shareCartService.getSharedCart(token);

            if (!sharedCart) {
                errorResponse(res, 'NOT_FOUND', 'Shared cart not found or expired', 404);
                return;
            }

            successResponse(res, sharedCart);
        } catch (error) {
            safeLogger.error('Error getting shared cart:', error);
            errorResponse(res, 'SHARE_ERROR', 'Failed to get shared cart', 500);
        }
    }

    /**
     * Import shared cart to user's cart
     * POST /api/cart/import/:token
     */
    async importSharedCart(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
                return;
            }

            const { token } = req.params;

            if (!token) {
                errorResponse(res, 'INVALID_TOKEN', 'Share token is required', 400);
                return;
            }

            // Get shared cart
            const sharedCart = await shareCartService.getSharedCart(token);

            if (!sharedCart) {
                errorResponse(res, 'NOT_FOUND', 'Shared cart not found or expired', 404);
                return;
            }

            // Import items to user's cart
            const cartSnapshot = sharedCart.cartSnapshot;
            if (cartSnapshot.items && Array.isArray(cartSnapshot.items)) {
                for (const item of cartSnapshot.items) {
                    try {
                        await cartService.addItem(req.user, {
                            productId: item.productId,
                            quantity: item.quantity
                        });
                    } catch (error) {
                        safeLogger.error(`Failed to import item ${item.productId}:`, error);
                    }
                }
            }

            // Get updated cart
            const updatedCart = await cartService.getOrCreateCart(req.user);

            successResponse(res, updatedCart);
        } catch (error) {
            safeLogger.error('Error importing shared cart:', error);
            errorResponse(res, 'IMPORT_ERROR', 'Failed to import shared cart', 500);
        }
    }
}

export const shareCartController = new ShareCartController();
