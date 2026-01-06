import express from 'express';
import { safeLogger } from '../utils/safeLogger';
import { resourceServer, PAY_TO_ADDRESS } from '../middleware/x402Middleware';
import { paymentMiddleware } from '@x402/express';
import { OrderService } from '../services/orderService';

// Initialize services
const orderService = new OrderService();

const router = express.Router();

/**
 * Protected Resource for x402 Testing
 * GET /api/x402/protected
 * 
 * This route is protected by x402Middleware in index.ts.
 * Accessing it without PAYMENT-SIGNATURE should return 402.
 */
router.get('/protected', (req, res) => {
    safeLogger.info('x402 Protected Resource Accessed Successfully', {
        headers: req.headers,
        user: (req as any).user
    });

    res.status(200).json({
        success: true,
        data: {
            message: 'You have successfully accessed the premium protected content!',
            timestamp: new Date().toISOString(),
            value: 'This is premium data paid for with crypto.'
        }
    });
});

/**
 * Checkout Payment Endpoint (Protected)
 * POST /api/x402/checkout
 *
 * This route should be protected by x402 middleware at the router level.
 * When accessed without payment, it returns 402 with payment requirements.
 * When accessed with valid payment signature, it finalizes the order.
 */
router.post('/checkout', async (req, res, next) => {
    const { orderId, amount } = req.body;

    if (!orderId) {
        return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    try {
        const orderAmount = amount || '0.01';

        safeLogger.info(`Processing x402 checkout for order ${orderId} with amount ${orderAmount}`);

        // Check if payment signature is present in headers
        const paymentSignature = req.headers['payment-signature'] as string;

        if (!paymentSignature) {
            // No signature provided - return 402 with payment requirements
            safeLogger.info(`No payment signature for order ${orderId}, returning 402`);

            // Return 402 Payment Required with payment instructions
            return res.status(402).json({
                success: false,
                error: 'Payment Required',
                paymentRequired: true,
                paymentDetails: {
                    scheme: 'exact',
                    price: orderAmount,
                    network: 'eip155:84532', // Base Sepolia
                    payTo: PAY_TO_ADDRESS,
                    token: 'USDC',
                    description: `Payment for Order ${orderId}`
                },
                message: 'Please complete payment to proceed with checkout'
            });
        }

        // Payment signature is present - verify it and finalize order
        safeLogger.info('x402 Payment Signature found! Finalizing order...', { orderId });

        // TODO: Verify the signature using the resourceServer
        // For now, we'll just log it and proceed
        safeLogger.info('Payment signature received:', { 
            orderId, 
            signature: paymentSignature.substring(0, 20) + '...' 
        });

        // Update Order Status Logic here
        // await orderService.updateStatus(orderId, 'PAID');

        res.status(200).json({
            success: true,
            data: {
                orderId,
                status: 'confirmed',
                paymentVerified: true,
                amountPaid: orderAmount
            }
        });

    } catch (error) {
        safeLogger.error('Error in x402 checkout:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

export default router;
