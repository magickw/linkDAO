import { Request, Response } from 'express';
import { promoCodeService } from '../services/promoCodeService';
import { safeLogger } from '../utils/safeLogger';

export class PromoCodeController {

    /**
     * Verify a promo code
     * POST /api/marketplace/promo-codes/verify
     * Body: { code, sellerId, productId, price }
     */
    async verify(req: Request, res: Response) {
        try {
            const { code, sellerId, productId, price } = req.body;

            if (!code) {
                return res.status(400).json({
                    success: false,
                    error: 'Promo code is required'
                });
            }

            const result = await promoCodeService.verifyPromoCode({
                code,
                sellerId,
                productId,
                orderAmount: parseFloat(price) || 0
            });

            return res.json({
                success: true,
                data: result
            });

        } catch (error) {
            safeLogger.error('Error in PromoCodeController.verify:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * Create a promo code (Admin/Seller)
     * POST /api/marketplace/promo-codes
     */
    async create(req: Request, res: Response) {
        try {
            const {
                code,
                sellerId,
                productId,
                discountType,
                discountValue,
                minOrderAmount,
                maxDiscountAmount,
                startDate,
                endDate,
                usageLimit
            } = req.body;

            // Basic validation
            if (!code || !sellerId || !discountType || !discountValue) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields'
                });
            }

            const promoCode = await promoCodeService.createPromoCode({
                code,
                sellerId,
                productId,
                discountType,
                discountValue,
                minOrderAmount,
                maxDiscountAmount,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                usageLimit
            });

            return res.json({
                success: true,
                data: promoCode
            });

        } catch (error: any) {
            safeLogger.error('Error creating promo code:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Failed to create promo code'
            });
        }
    }

    /**
     * Get all promo codes for a seller
     * GET /api/marketplace/promo-codes?sellerId=...
     */
    async list(req: Request, res: Response) {
        try {
            const { sellerId } = req.query;

            if (!sellerId || typeof sellerId !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: 'Seller ID is required'
                });
            }

            const codes = await promoCodeService.getPromoCodes(sellerId);

            return res.json({
                success: true,
                data: codes
            });

        } catch (error) {
            safeLogger.error('Error listing promo codes:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
}
