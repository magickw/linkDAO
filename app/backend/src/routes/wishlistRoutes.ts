import { Router } from 'express';
import { WishlistService } from '../services/wishlistService';
import { asyncHandler } from '../utils/asyncHandler';
import { authMiddleware } from '../middleware/authMiddleware';
import { notificationService } from '../services/notificationService';
import { DatabaseService } from '../services/databaseService';
import { UserProfileService } from '../services/userProfileService';

const router = Router();
const databaseService = new DatabaseService();
const userProfileService = new UserProfileService();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/user/wishlists
 * Get all wishlists for the current user
 */
router.get('/', asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const wishlists = await WishlistService.getUserWishlists(userId);

    res.json({
        success: true,
        data: wishlists
    });
}));

/**
 * GET /api/user/wishlists/:id
 * Get a specific wishlist by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const wishlistId = req.params.id;

    const wishlist = await WishlistService.getWishlistById(wishlistId, userId);

    if (!wishlist) {
        return res.status(404).json({
            success: false,
            error: 'Wishlist not found'
        });
    }

    res.json({
        success: true,
        data: wishlist
    });
}));

/**
 * GET /api/user/wishlists/:id/items
 * Get all items in a wishlist
 */
router.get('/:id/items', asyncHandler(async (req, res) => {
    const wishlistId = req.params.id;

    const items = await WishlistService.getWishlistItems(wishlistId);

    res.json({
        success: true,
        data: items
    });
}));

/**
 * POST /api/user/wishlists
 * Create a new wishlist
 */
router.post('/', asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { name, description, isPublic } = req.body;

    const wishlist = await WishlistService.createWishlist({
        userId,
        name,
        description,
        isPublic
    });

    res.status(201).json({
        success: true,
        data: wishlist,
        message: 'Wishlist created successfully'
    });
}));

/**
 * PUT /api/user/wishlists/:id
 * Update a wishlist
 */
router.put('/:id', asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const wishlistId = req.params.id;

    const wishlist = await WishlistService.updateWishlist(wishlistId, userId, req.body);

    if (!wishlist) {
        return res.status(404).json({
            success: false,
            error: 'Wishlist not found'
        });
    }

    res.json({
        success: true,
        data: wishlist,
        message: 'Wishlist updated successfully'
    });
}));

/**
 * DELETE /api/user/wishlists/:id
 * Delete a wishlist
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const wishlistId = req.params.id;

    const success = await WishlistService.deleteWishlist(wishlistId, userId);

    if (!success) {
        return res.status(404).json({
            success: false,
            error: 'Wishlist not found'
        });
    }

    res.json({
        success: true,
        message: 'Wishlist deleted successfully'
    });
}));

/**
 * POST /api/user/wishlists/:id/items
 * Add an item to a wishlist
 */
router.post('/:id/items', asyncHandler(async (req, res) => {
    const wishlistId = req.params.id;
    const { productId, quantity, priority, notes, priceAtAdd, priceAlertThreshold } = req.body;

    const item = await WishlistService.addItemToWishlist({
        wishlistId,
        productId,
        quantity,
        priority,
        notes,
        priceAtAdd,
        priceAlertThreshold
    });

    // Notify the seller that someone favorited their product
    try {
        const product = await databaseService.getProductById(productId);
        if (product && product.sellerId) {
            // Get seller's wallet address
            const sellerProfile = await userProfileService.getProfileById(product.sellerId);
            if (sellerProfile && sellerProfile.walletAddress) {
                await notificationService.sendSellerNotification({
                    sellerId: sellerProfile.walletAddress,
                    type: 'PRODUCT_FAVORITED',
                    message: `Your product "${product.title}" was favorited`,
                    data: { productId }
                });
            }
        }
    } catch (notifyError) {
        // Don't fail the request if notification fails
        console.error('Failed to send favorite notification to seller:', notifyError);
    }

    res.status(201).json({
        success: true,
        data: item,
        message: 'Item added to wishlist'
    });
}));

/**
 * PUT /api/user/wishlists/:id/items/:itemId
 * Update a wishlist item
 */
router.put('/:id/items/:itemId', asyncHandler(async (req, res) => {
    const wishlistId = req.params.id;
    const itemId = req.params.itemId;

    const item = await WishlistService.updateWishlistItem(itemId, wishlistId, req.body);

    if (!item) {
        return res.status(404).json({
            success: false,
            error: 'Wishlist item not found'
        });
    }

    res.json({
        success: true,
        data: item,
        message: 'Wishlist item updated successfully'
    });
}));

/**
 * DELETE /api/user/wishlists/:id/items/:productId
 * Remove an item from a wishlist
 */
router.delete('/:id/items/:productId', asyncHandler(async (req, res) => {
    const wishlistId = req.params.id;
    const productId = req.params.productId;

    const success = await WishlistService.removeItemFromWishlist(wishlistId, productId);

    if (!success) {
        return res.status(404).json({
            success: false,
            error: 'Wishlist item not found'
        });
    }

    res.json({
        success: true,
        message: 'Item removed from wishlist'
    });
}));

/**
 * GET /api/user/wishlists/check/:productId
 * Check if a product is in any wishlist
 */
router.get('/check/:productId', asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const productId = req.params.productId;

    const inWishlist = await WishlistService.isProductInWishlist(userId, productId);

    res.json({
        success: true,
        data: { inWishlist }
    });
}));

export default router;
