import express from 'express';
import { PromoCodeController } from '../controllers/promoCodeController';
import { csrfProtection } from '../middleware/csrfProtection';
import { validateRequest } from '../middleware/validation';

const router = express.Router();
const promoCodeController = new PromoCodeController();

// Verify a promo code
router.post('/verify',
    validateRequest({
        body: {
            code: { type: 'string', required: true },
            // sellerId, productId, price are also validated in logic
        }
    }),
    promoCodeController.verify
);

// Create a promo code (add auth middleware as needed in the main app or here)
router.post('/',
    promoCodeController.create
);

// List promo codes for a seller
router.get('/',
    validateRequest({
        query: {
            sellerId: { type: 'string', required: true }
        }
    }),
    promoCodeController.list
);

// Update a promo code
router.put('/:id',
    promoCodeController.update
);

// Delete a promo code
router.delete('/:id',
    promoCodeController.delete
);

export default router;
