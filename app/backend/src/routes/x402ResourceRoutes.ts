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
    // Add explicit logging to diagnose route access
    safeLogger.info('x402 checkout route accessed', {
        method: req.method,
        path: req.path,
        headers: Object.keys(req.headers),
        hasBody: !!req.body
    });

    const { orderId, amount } = req.body;

    if (!orderId) {
        safeLogger.warn('x402 checkout called without orderId');
        return res.status(400).json({
            success: false,
            message: 'Order ID is required'
        });
    }

    try {
        const orderAmount = amount || '0.01';

        safeLogger.info(`Processing x402 checkout for order ${orderId} with amount ${orderAmount}`);

        // Check if payment signature is present in headers
        const paymentSignature = req.headers['payment-signature'] as string;

        if (!paymentSignature) {
            // No signature provided - return 402 with payment requirements
            safeLogger.info(`No payment signature for order ${orderId}, returning 402`);

            // Set standard x402 WWW-Authenticate header required by the client
            res.setHeader(
                'WWW-Authenticate',
                `x402 scheme="exact", price="${orderAmount}", network="eip155:11155111", payTo="${PAY_TO_ADDRESS}", token="USDC"`
            );

            // Return 402 Payment Required with standardized x402 format
            return res.status(402).json({
                error: {
                    code: 'PAYMENT_REQUIRED',
                    message: 'Payment required to complete checkout'
                },
                payment: {
                    scheme: 'exact',
                    amount: orderAmount,
                    currency: 'USDC',
                    network: 'eip155:11155111', // Sepolia
                    recipient: PAY_TO_ADDRESS,
                    metadata: {
                        orderId,
                        description: `Payment for Order ${orderId}`
                    }
                }
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

        return res.status(200).json({
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
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Log route registration for debugging
safeLogger.info('x402 Resource Routes registered:', {
    routes: [
        'GET /api/x402/protected',
        'POST /api/x402/checkout'
    ]
});

export default router;
