import { Router } from 'express';
import { AddressService } from '../services/addressService';
import { asyncHandler } from '../utils/asyncHandler';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/user/addresses
 * Get all addresses for the current user
 * Query params: type (optional) - 'shipping' | 'billing' | 'both'
 */
router.get('/', asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const addressType = req.query.type as 'shipping' | 'billing' | 'both' | undefined;

    const addresses = await AddressService.getUserAddresses(userId, addressType);

    res.json({
        success: true,
        data: addresses
    });
}));

/**
 * GET /api/user/addresses/:id
 * Get a specific address by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const addressId = req.params.id;

    const address = await AddressService.getAddressById(addressId, userId);

    if (!address) {
        return res.status(404).json({
            success: false,
            error: 'Address not found'
        });
    }

    res.json({
        success: true,
        data: address
    });
}));

/**
 * POST /api/user/addresses
 * Create a new address
 */
router.post('/', asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const address = await AddressService.createAddress({
        userId,
        ...req.body
    });

    res.status(201).json({
        success: true,
        data: address,
        message: 'Address created successfully'
    });
}));

/**
 * PUT /api/user/addresses/:id
 * Update an existing address
 */
router.put('/:id', asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const addressId = req.params.id;

    const address = await AddressService.updateAddress(addressId, userId, req.body);

    if (!address) {
        return res.status(404).json({
            success: false,
            error: 'Address not found'
        });
    }

    res.json({
        success: true,
        data: address,
        message: 'Address updated successfully'
    });
}));

/**
 * DELETE /api/user/addresses/:id
 * Delete an address
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const addressId = req.params.id;

    const success = await AddressService.deleteAddress(addressId, userId);

    if (!success) {
        return res.status(404).json({
            success: false,
            error: 'Address not found'
        });
    }

    res.json({
        success: true,
        message: 'Address deleted successfully'
    });
}));

/**
 * POST /api/user/addresses/:id/set-default
 * Set an address as default
 */
router.post('/:id/set-default', asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const addressId = req.params.id;

    const address = await AddressService.setDefaultAddress(addressId, userId);

    if (!address) {
        return res.status(404).json({
            success: false,
            error: 'Address not found'
        });
    }

    res.json({
        success: true,
        data: address,
        message: 'Default address updated successfully'
    });
}));

/**
 * POST /api/user/addresses/:id/verify
 * Verify an address
 */
router.post('/:id/verify', asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const addressId = req.params.id;

    const address = await AddressService.verifyAddress(addressId, userId);

    if (!address) {
        return res.status(404).json({
            success: false,
            error: 'Address not found'
        });
    }

    res.json({
        success: true,
        data: address,
        message: 'Address verified successfully'
    });
}));

export default router;
