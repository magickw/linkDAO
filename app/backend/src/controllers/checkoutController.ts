/// <reference path="../types/express.d.ts" />
import { Response } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { apiResponse } from '../utils/apiResponse';
import { cartService } from '../services/cartService';
import { OrderService } from '../services/orderService';
import { StripePaymentService } from '../services/stripePaymentService';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

interface CartItem {
    id: string;
    cartId: string;
    productId: string;
    quantity: number;
    priceAtTime: string;
    currency: string;
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
    product?: {
        id: string;
        title: string;
        description?: string;
        priceAmount: string;
        priceCurrency: string;
        images?: string[];
        sellerId: string;
        status: string;
    };
}

interface CheckoutSession {
    sessionId: string;
    orderId: string;
    items: CartItem[];
    totals: {
        subtotal: number;
        shipping: number;
        tax: number;
        platformFee: number;
        total: number;
    };
    paymentMethod?: 'crypto' | 'fiat' | 'x402';
    expiresAt: Date;
}

interface ShippingAddress {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
}

interface PaymentDetails {
    walletAddress?: string;
    tokenSymbol?: string;
    networkId?: number;
    cardToken?: string;
    billingAddress?: ShippingAddress;
    saveCard?: boolean;
}

export class CheckoutController {
    /**
     * Create a new checkout session
     * POST /api/checkout/session
     */
    async createSession(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { items, userAddress } = req.body;

            // Validate items
            if (!items || !Array.isArray(items) || items.length === 0) {
                res.status(400).json(apiResponse.error('Cart items are required', 400));
                return;
            }

            // Get user address from auth or request body
            const buyerAddress = req.user?.address || userAddress;

            // Calculate totals
            const subtotal = items.reduce((sum: number, item: CartItem) => sum + (parseFloat(item.priceAtTime) * item.quantity), 0);
            const shipping = this.calculateShipping(items);
            const tax = this.calculateTax(subtotal, shipping);
            const platformFee = subtotal * 0.025; // 2.5% platform fee
            const total = subtotal + shipping + tax + platformFee;

            // Create session
            const sessionId = uuidv4();
            const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

            const session: CheckoutSession = {
                sessionId,
                orderId,
                items,
                totals: {
                    subtotal,
                    shipping,
                    tax,
                    platformFee,
                    total
                },
                expiresAt
            };

            // Store session (in-memory for now, should use Redis in production)
            // For now, we'll just return it and let frontend manage it
            safeLogger.info(`Checkout session created: ${sessionId} for user: ${buyerAddress || 'guest'}`);

            res.status(201).json(apiResponse.success(session, 'Checkout session created successfully'));
        } catch (error) {
            safeLogger.error('Error creating checkout session:', error);
            res.status(500).json(apiResponse.error('Failed to create checkout session'));
        }
    }

    /**
     * Get checkout session details
     * GET /api/checkout/session/:sessionId
     */
    async getSession(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { sessionId } = req.params;

            // In production, retrieve from Redis/database
            // For now, return a mock response indicating session would be retrieved
            safeLogger.info(`Retrieving checkout session: ${sessionId}`);

            res.status(200).json(apiResponse.success(
                { message: 'Session retrieval not yet implemented - sessions are managed client-side' },
                'Session endpoint ready'
            ));
        } catch (error) {
            safeLogger.error('Error getting checkout session:', error);
            res.status(500).json(apiResponse.error('Failed to retrieve checkout session'));
        }
    }

    /**
     * Process checkout and create order
     * POST /api/checkout/process
     */
    async processCheckout(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json(apiResponse.error('Authentication required', 401));
                return;
            }

            const { sessionId, paymentMethod, paymentDetails, shippingAddress } = req.body;

            // Validate required fields
            if (!sessionId || !paymentMethod || !paymentDetails || !shippingAddress) {
                res.status(400).json(apiResponse.error('Missing required fields', 400));
                return;
            }

            // Validate payment method
            if (!['crypto', 'fiat'].includes(paymentMethod)) {
                res.status(400).json(apiResponse.error('Invalid payment method', 400));
                return;
            }

            // Get cart items
            const cart = await cartService.getOrCreateCart(req.user);

            if (!cart.items || cart.items.length === 0) {
                res.status(400).json(apiResponse.error('Cart is empty', 400));
                return;
            }

            // Calculate totals
            const subtotal = cart.items.reduce((sum, item) => sum + (parseFloat(item.product?.priceAmount || item.priceAtTime) * item.quantity), 0);
            const shipping = this.calculateShipping(cart.items);
            const tax = this.calculateTax(subtotal, shipping);
            const platformFee = subtotal * 0.025;
            const total = subtotal + shipping + tax + platformFee;

            safeLogger.info(`Processing checkout for user ${req.user.address}, total: ${total}, method: ${paymentMethod}`);

            // Initialize order service
            const orderServiceInstance = new OrderService();

            // Create order
            const order = await orderServiceInstance.createOrder({
                listingId: cart.items[0].productId, // Simplified - assumes single item
                buyerAddress: req.user.address,
                sellerAddress: cart.items[0].product?.sellerId || '', // Simplified - assumes single seller
                amount: total.toString(),
                paymentToken: 'USDC', // Default payment token
                shippingAddress: {
                    name: shippingAddress.fullName,
                    street: shippingAddress.addressLine1,
                    city: shippingAddress.city,
                    state: shippingAddress.state,
                    postalCode: shippingAddress.postalCode,
                    country: shippingAddress.country
                }
            });

            // Initialize payment service
            const stripePaymentServiceInstance = new StripePaymentService({
                secretKey: process.env.STRIPE_SECRET_KEY || '',
                publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
                webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
                apiVersion: '2023-10-16'
            });

            // Process payment based on method
            let paymentResult;
            if (paymentMethod === 'fiat') {
                // Process Stripe payment
                paymentResult = await stripePaymentServiceInstance.processPayment({
                    amount: Math.round(total * 100), // Convert to cents
                    paymentMethod: 'fiat',
                    userAddress: req.user.address
                });
            } else {
                // Crypto payment - return instructions for frontend to complete
                paymentResult = {
                    requiresAction: true,
                    nextAction: 'wallet_signature',
                    escrowAddress: process.env.ESCROW_CONTRACT_ADDRESS_ETH,
                    amount: total,
                    token: paymentDetails.tokenSymbol || 'USDC'
                };
            }

            // Clear cart after successful order creation
            await cartService.clearCart(req.user);

            safeLogger.info(`Order created successfully: ${order.id}`);

            res.status(201).json(apiResponse.success({
                success: true,
                orderId: order.id,
                paymentPath: paymentMethod,
                status: 'pending',
                paymentResult,
                nextSteps: this.generateNextSteps(paymentMethod, paymentResult),
                estimatedCompletionTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            }, 'Checkout processed successfully'));

        } catch (error) {
            safeLogger.error('Error processing checkout:', error);
            res.status(500).json(apiResponse.error(
                error instanceof Error ? error.message : 'Failed to process checkout'
            ));
        }
    }

    /**
     * Validate checkout data
     * POST /api/checkout/validate
     */
    async validateCheckout(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { shippingAddress, paymentDetails } = req.body;
            const errors: Array<{ field: string; message: string }> = [];

            // Validate shipping address
            if (shippingAddress) {
                if (!shippingAddress.fullName || shippingAddress.fullName.trim().length === 0) {
                    errors.push({ field: 'fullName', message: 'Full name is required' });
                }
                if (!shippingAddress.addressLine1 || shippingAddress.addressLine1.trim().length === 0) {
                    errors.push({ field: 'addressLine1', message: 'Address is required' });
                }
                if (!shippingAddress.city || shippingAddress.city.trim().length === 0) {
                    errors.push({ field: 'city', message: 'City is required' });
                }
                if (!shippingAddress.state || shippingAddress.state.trim().length === 0) {
                    errors.push({ field: 'state', message: 'State is required' });
                }
                if (!shippingAddress.postalCode || shippingAddress.postalCode.trim().length === 0) {
                    errors.push({ field: 'postalCode', message: 'Postal code is required' });
                }
                if (!shippingAddress.country || shippingAddress.country.trim().length === 0) {
                    errors.push({ field: 'country', message: 'Country is required' });
                }

                // Validate postal code format (basic validation)
                if (shippingAddress.postalCode && !/^[0-9]{5}(-[0-9]{4})?$/.test(shippingAddress.postalCode)) {
                    if (shippingAddress.country === 'US') {
                        errors.push({ field: 'postalCode', message: 'Invalid US postal code format' });
                    }
                }
            }

            // Validate payment details
            if (paymentDetails) {
                if (paymentDetails.walletAddress) {
                    // Validate Ethereum address format
                    if (!/^0x[a-fA-F0-9]{40}$/.test(paymentDetails.walletAddress)) {
                        errors.push({ field: 'walletAddress', message: 'Invalid wallet address format' });
                    }
                }
            }

            const isValid = errors.length === 0;

            res.status(200).json(apiResponse.success({
                valid: isValid,
                errors: isValid ? [] : errors
            }, isValid ? 'Validation passed' : 'Validation failed'));

        } catch (error) {
            safeLogger.error('Error validating checkout:', error);
            res.status(500).json(apiResponse.error('Failed to validate checkout data'));
        }
    }

    /**
     * Apply discount code
     * POST /api/checkout/discount
     */
    async applyDiscount(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { sessionId, code } = req.body;

            if (!code || code.trim().length === 0) {
                res.status(400).json(apiResponse.error('Discount code is required', 400));
                return;
            }

            // For now, return a mock response
            // In production, query discount_codes table
            const mockDiscounts: Record<string, any> = {
                'WELCOME10': { type: 'percentage', value: 10, description: '10% off your first order' },
                'SAVE20': { type: 'percentage', value: 20, description: '20% off' },
                'FLAT50': { type: 'fixed', value: 50, description: '$50 off' }
            };

            const discount = mockDiscounts[code.toUpperCase()];

            if (discount) {
                safeLogger.info(`Discount code applied: ${code} for session: ${sessionId}`);
                res.status(200).json(apiResponse.success({
                    valid: true,
                    discount
                }, 'Discount code applied successfully'));
            } else {
                res.status(200).json(apiResponse.success({
                    valid: false,
                    error: 'Invalid or expired discount code'
                }, 'Invalid discount code'));
            }

        } catch (error) {
            safeLogger.error('Error applying discount:', error);
            res.status(500).json(apiResponse.error('Failed to apply discount code'));
        }
    }

    // Helper methods

    private calculateShipping(items: CartItem[]): number {
        // Simple shipping calculation
        const totalWeight = items.reduce((sum, item) => sum + item.quantity, 0);
        return totalWeight * 5; // $5 per item
    }

    private calculateTax(subtotal: number, shipping: number): number {
        // Simple tax calculation (8% sales tax)
        return (subtotal + shipping) * 0.08;
    }

    private generateNextSteps(paymentMethod: string, paymentResult: any): string[] {
        if (paymentMethod === 'crypto') {
            return [
                'Connect your wallet',
                'Approve the transaction',
                'Wait for blockchain confirmation',
                'Order will be processed once payment is confirmed'
            ];
        } else {
            if (paymentResult.requiresAction) {
                return [
                    'Complete payment authentication',
                    'Wait for payment confirmation',
                    'Order will be processed automatically'
                ];
            }
            return [
                'Payment processed successfully',
                'Seller will be notified',
                'Track your order status'
            ];
        }
    }
}

export const checkoutController = new CheckoutController();
