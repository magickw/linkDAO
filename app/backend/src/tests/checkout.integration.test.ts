import request from 'supertest';
import express from 'express';
import { describe, it, expect } from '@jest/globals';
import hybridPaymentRoutes from '../routes/hybridPaymentRoutes';

const app = express();
app.use(express.json());
app.use('/api/hybrid-payment', hybridPaymentRoutes);

describe('Checkout Integration Tests', () => {
  describe('POST /api/hybrid-payment/recommend-path', () => {
    it('should return payment recommendation with real market data', async () => {
      const requestBody = {
        amount: 100,
        currency: 'USD',
        buyerAddress: '0x1234567890123456789012345678901234567890',
        sellerAddress: '0x0987654321098765432109876543210987654321',
        preferredMethod: 'auto'
      };

      const response = await request(app)
        .post('/api/hybrid-payment/recommend-path')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('selectedPath');
      expect(response.body.data).toHaveProperty('fees');
      expect(response.body.data).toHaveProperty('marketContext');
      expect(response.body.data.marketContext).toHaveProperty('gasPrice');
      expect(response.body.data.marketContext).toHaveProperty('ethPrice');
    });

    it('should handle missing required fields', async () => {
      const requestBody = {
        amount: 100,
        currency: 'USD'
        // Missing buyerAddress and sellerAddress
      };

      const response = await request(app)
        .post('/api/hybrid-payment/recommend-path')
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });
  });

  describe('POST /api/hybrid-payment/checkout', () => {
    it('should process crypto checkout successfully', async () => {
      const requestBody = {
        orderId: 'order-test-123',
        listingId: 'listing-test-123',
        buyerAddress: '0x1234567890123456789012345678901234567890',
        sellerAddress: '0x0987654321098765432109876543210987654321',
        amount: 50,
        currency: 'USD',
        preferredMethod: 'crypto',
        paymentMethodDetails: {
          type: 'crypto',
          tokenAddress: '0xA0b86a33E6441c8C06DD2b7c94b7E6E8b8b8b8b8'
        }
      };

      // Mock auth middleware
      const mockAuth = (req: any, res: any, next: any) => {
        req.user = { address: '0x1234567890123456789012345678901234567890' };
        next();
      };

      app.use('/api/hybrid-payment/checkout', mockAuth);

      const response = await request(app)
        .post('/api/hybrid-payment/checkout')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('orderId');
      expect(response.body.data).toHaveProperty('paymentPath', 'crypto');
      expect(response.body.data).toHaveProperty('escrowType', 'smart_contract');
    });

    it('should process fiat checkout successfully', async () => {
      const requestBody = {
        orderId: 'order-test-456',
        listingId: 'listing-test-456',
        buyerAddress: '0x1234567890123456789012345678901234567890',
        sellerAddress: '0x0987654321098765432109876543210987654321',
        amount: 150,
        currency: 'USD',
        preferredMethod: 'fiat',
        paymentMethodDetails: {
          type: 'fiat_stripe'
        }
      };

      const response = await request(app)
        .post('/api/hybrid-payment/checkout')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('paymentPath', 'fiat');
      expect(response.body.data).toHaveProperty('escrowType', 'stripe_connect');
      expect(response.body.data).toHaveProperty('stripePaymentIntentId');
    });

    it('should handle insufficient inventory gracefully', async () => {
      const requestBody = {
        orderId: 'order-test-789',
        listingId: 'listing-sold-out',
        buyerAddress: '0x1234567890123456789012345678901234567890',
        sellerAddress: '0x0987654321098765432109876543210987654321',
        amount: 100,
        currency: 'USD'
      };

      const response = await request(app)
        .post('/api/hybrid-payment/checkout')
        .send(requestBody)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('inventory');
    });
  });

  describe('GET /api/hybrid-payment/orders/:orderId/status', () => {
    it('should return order status with progress tracking', async () => {
      const orderId = 'order-test-123';

      const response = await request(app)
        .get(`/api/hybrid-payment/orders/${orderId}/status`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('orderId', orderId);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('progress');
      expect(response.body.data).toHaveProperty('actions');
      expect(response.body.data).toHaveProperty('timeline');

      // Check progress structure
      expect(response.body.data.progress).toHaveProperty('step');
      expect(response.body.data.progress).toHaveProperty('totalSteps');
      expect(response.body.data.progress).toHaveProperty('currentStep');

      // Check actions structure
      expect(response.body.data.actions).toHaveProperty('canConfirmDelivery');
      expect(response.body.data.actions).toHaveProperty('canReleaseFunds');
      expect(response.body.data.actions).toHaveProperty('canDispute');
      expect(response.body.data.actions).toHaveProperty('canCancel');
    });

    it('should handle non-existent order', async () => {
      const orderId = 'non-existent-order';

      const response = await request(app)
        .get(`/api/hybrid-payment/orders/${orderId}/status`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Failed to get order status');
    });
  });

  describe('POST /api/hybrid-payment/orders/:orderId/fulfill', () => {
    it('should handle delivery confirmation', async () => {
      const orderId = 'order-test-123';
      const requestBody = {
        action: 'confirm_delivery',
        metadata: {
          trackingNumber: '1Z999AA10123456784',
          carrier: 'UPS',
          notes: 'Package shipped via UPS Ground'
        }
      };

      const response = await request(app)
        .post(`/api/hybrid-payment/orders/${orderId}/fulfill`)
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('confirm_delivery processed successfully');
    });

    it('should handle fund release', async () => {
      const orderId = 'order-test-123';
      const requestBody = {
        action: 'release_funds',
        metadata: {
          releasedBy: 'buyer',
          confirmationCode: 'ABC123'
        }
      };

      const response = await request(app)
        .post(`/api/hybrid-payment/orders/${orderId}/fulfill`)
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('release_funds processed successfully');
    });

    it('should handle dispute opening', async () => {
      const orderId = 'order-test-123';
      const requestBody = {
        action: 'dispute',
        metadata: {
          initiatorAddress: '0x1234567890123456789012345678901234567890',
          reason: 'Item not as described',
          evidence: ['photo1.jpg', 'photo2.jpg']
        }
      };

      const response = await request(app)
        .post(`/api/hybrid-payment/orders/${orderId}/fulfill`)
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('dispute processed successfully');
    });

    it('should reject invalid actions', async () => {
      const orderId = 'order-test-123';
      const requestBody = {
        action: 'invalid_action',
        metadata: {}
      };

      const response = await request(app)
        .post(`/api/hybrid-payment/orders/${orderId}/fulfill`)
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid action');
    });
  });

  describe('POST /api/hybrid-payment/orders/:orderId/capture-payment', () => {
    it('should capture Stripe payment successfully', async () => {
      const orderId = 'order-test-123';
      const requestBody = {
        paymentIntentId: 'pi_test_123'
      };

      const response = await request(app)
        .post(`/api/hybrid-payment/orders/${orderId}/capture-payment`)
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('captured', true);
      expect(response.body.data).toHaveProperty('amount');
      expect(response.body.data).toHaveProperty('currency');
    });

    it('should handle missing payment intent ID', async () => {
      const orderId = 'order-test-123';
      const requestBody = {};

      const response = await request(app)
        .post(`/api/hybrid-payment/orders/${orderId}/capture-payment`)
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Payment intent ID is required');
    });
  });

  describe('POST /api/hybrid-payment/orders/:orderId/refund-payment', () => {
    it('should process Stripe refund successfully', async () => {
      const orderId = 'order-test-123';
      const requestBody = {
        paymentIntentId: 'pi_test_123',
        reason: 'Customer requested refund'
      };

      const response = await request(app)
        .post(`/api/hybrid-payment/orders/${orderId}/refund-payment`)
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('refunded', true);
      expect(response.body.data).toHaveProperty('amount');
      expect(response.body.data).toHaveProperty('refundId');
    });
  });

  describe('POST /api/hybrid-payment/orders/:orderId/verify-transaction', () => {
    it('should verify crypto transaction successfully', async () => {
      const orderId = 'order-test-123';
      const requestBody = {
        transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
        escrowId: 'escrow-123'
      };

      const response = await request(app)
        .post(`/api/hybrid-payment/orders/${orderId}/verify-transaction`)
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('verified');
      expect(response.body.data).toHaveProperty('status');
    });

    it('should handle missing transaction details', async () => {
      const orderId = 'order-test-123';
      const requestBody = {
        transactionHash: '0x1234567890abcdef1234567890abcdef12345678'
        // Missing escrowId
      };

      const response = await request(app)
        .post(`/api/hybrid-payment/orders/${orderId}/verify-transaction`)
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('escrow ID are required');
    });
  });
});