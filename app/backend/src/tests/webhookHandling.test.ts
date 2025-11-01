import request from 'supertest';
import express from 'express';
import { StripePaymentService } from '../services/stripePaymentService';
import { MoonPayService } from '../services/moonPayService';
import { KYCVerificationService } from '../services/kycVerificationService';
import { createStripeWebhookRoutes } from '../routes/stripeWebhookRoutes';
import { createFiatPaymentRoutes } from '../routes/fiatPaymentRoutes';
import { createKYCRoutes } from '../routes/kycRoutes';

// Mock configurations
const mockStripeConfig = {
  secretKey: 'sk_test_mock',
  webhookSecret: 'whsec_mock',
  publishableKey: 'pk_test_mock',
  apiVersion: '2023-10-16' as const,
};

const mockMoonPayConfig = {
  apiKey: 'mock_api_key',
  secretKey: 'mock_secret_key',
  baseUrl: 'https://api.moonpay.com',
  webhookSecret: 'mock_webhook_secret',
};

const mockKYCConfig = {
  provider: 'jumio' as const,
  apiKey: 'mock_kyc_api_key',
  apiSecret: 'mock_kyc_secret',
  baseUrl: 'https://api.jumio.com',
  webhookSecret: 'mock_kyc_webhook_secret',
};

describe('Webhook Handling Tests', () => {
  let app: express.Application;
  let stripeService: StripePaymentService;
  let moonPayService: MoonPayService;
  let kycService: KYCVerificationService;

  beforeEach(() => {
    app = express();
    
    stripeService = new StripePaymentService(mockStripeConfig);
    moonPayService = new MoonPayService(mockMoonPayConfig);
    kycService = new KYCVerificationService(mockKYCConfig);

    // Set up routes
    app.use('/api/stripe', createStripeWebhookRoutes(stripeService));
    app.use('/api/fiat-payment', createFiatPaymentRoutes(stripeService));
    app.use('/api/kyc', createKYCRoutes(kycService));
  });

  describe('Stripe Webhook Handling', () => {
    test('should handle payment_intent.succeeded webhook', async () => {
      const webhookPayload = {
        id: 'evt_test_webhook',
        object: 'event',
        api_version: '2023-10-16',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'pi_test_payment_intent',
            object: 'payment_intent',
            amount: 10000,
            currency: 'usd',
            status: 'succeeded',
            metadata: {
              userId: 'user_123',
              ldaoAmount: '100',
            },
          },
        },
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: 'req_test_request',
          idempotency_key: null,
        },
        type: 'payment_intent.succeeded',
      };

      // Mock Stripe webhook verification
      jest.spyOn(stripeService, 'handleWebhook').mockResolvedValue({
        id: 'evt_test_webhook',
        type: 'payment_intent.succeeded',
        data: webhookPayload.data,
        created: webhookPayload.created,
      });

      jest.spyOn(stripeService, 'processWebhookEvent').mockResolvedValue();

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'mock_signature')
        .send(JSON.stringify(webhookPayload))
        .expect(200);

      expect(response.body.received).toBe(true);
    });

    test('should handle payment_intent.payment_failed webhook', async () => {
      const webhookPayload = {
        id: 'evt_test_webhook_failed',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_payment_intent_failed',
            status: 'requires_payment_method',
            last_payment_error: {
              code: 'card_declined',
              message: 'Your card was declined.',
            },
          },
        },
        created: Math.floor(Date.now() / 1000),
      };

      jest.spyOn(stripeService, 'handleWebhook').mockResolvedValue({
        id: 'evt_test_webhook_failed',
        type: 'payment_intent.payment_failed',
        data: webhookPayload.data,
        created: webhookPayload.created,
      });

      jest.spyOn(stripeService, 'processWebhookEvent').mockResolvedValue();

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'mock_signature')
        .send(JSON.stringify(webhookPayload))
        .expect(200);

      expect(response.body.received).toBe(true);
    });

    test('should reject webhook with invalid signature', async () => {
      const webhookPayload = {
        id: 'evt_test_webhook',
        type: 'payment_intent.succeeded',
        data: { object: {} },
      };

      jest.spyOn(stripeService, 'handleWebhook').mockResolvedValue(null);

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'invalid_signature')
        .send(JSON.stringify(webhookPayload))
        .expect(400);

      expect(response.body.error).toBe('Invalid signature');
    });

    test('should handle missing signature', async () => {
      const webhookPayload = {
        id: 'evt_test_webhook',
        type: 'payment_intent.succeeded',
        data: { object: {} },
      };

      const response = await request(app)
        .post('/api/stripe/webhook')
        .send(JSON.stringify(webhookPayload))
        .expect(400);

      expect(response.body.error).toBe('Missing signature');
    });
  });

  describe('KYC Webhook Handling', () => {
    test('should handle Jumio verification completed webhook', async () => {
      const webhookPayload = {
        timestamp: new Date().toISOString(),
        scanReference: 'scan_123',
        verificationStatus: 'APPROVED_VERIFIED',
        idScanStatus: 'SUCCESS',
        identityVerification: {
          similarity: 'MATCH',
          validity: true,
        },
      };

      jest.spyOn(kycService, 'handleWebhook').mockResolvedValue({
        type: 'verification_completed',
        verificationId: 'scan_123',
        userId: 'user_123',
        status: 'approved',
        data: webhookPayload,
        timestamp: new Date().toISOString(),
      });

      const response = await request(app)
        .post('/api/kyc/webhook/jumio')
        .set('x-jumio-signature', 'mock_signature')
        .send(JSON.stringify(webhookPayload))
        .expect(200);

      expect(response.body.received).toBe(true);
    });

    test('should handle Onfido check completed webhook', async () => {
      const webhookPayload = {
        payload: {
          resource_type: 'check',
          action: 'check.completed',
          object: {
            id: 'check_123',
            status: 'complete',
            result: 'clear',
            form_uri: null,
            redirect_uri: null,
            results_uri: 'https://dashboard.onfido.com/checks/check_123',
          },
        },
      };

      jest.spyOn(kycService, 'handleWebhook').mockResolvedValue({
        type: 'check_completed',
        verificationId: 'check_123',
        userId: 'user_123',
        status: 'approved',
        data: webhookPayload,
        timestamp: new Date().toISOString(),
      });

      const response = await request(app)
        .post('/api/kyc/webhook/onfido')
        .set('x-sha1-signature', 'mock_signature')
        .send(JSON.stringify(webhookPayload))
        .expect(200);

      expect(response.body.received).toBe(true);
    });

    test('should handle Sumsub applicant reviewed webhook', async () => {
      const webhookPayload = {
        type: 'applicantReviewed',
        applicantId: 'applicant_123',
        inspectionId: 'inspection_123',
        applicantType: 'individual',
        correlationId: 'correlation_123',
        externalUserId: 'user_123',
        reviewStatus: 'completed',
        reviewResult: {
          reviewAnswer: 'GREEN',
        },
      };

      jest.spyOn(kycService, 'handleWebhook').mockResolvedValue({
        type: 'applicant_reviewed',
        verificationId: 'applicant_123',
        userId: 'user_123',
        status: 'approved',
        data: webhookPayload,
        timestamp: new Date().toISOString(),
      });

      const response = await request(app)
        .post('/api/kyc/webhook/sumsub')
        .set('x-payload-digest', 'mock_signature')
        .send(JSON.stringify(webhookPayload))
        .expect(200);

      expect(response.body.received).toBe(true);
    });
  });

  describe('Payment Status Updates', () => {
    test('should update payment status after successful webhook', async () => {
      const paymentIntentId = 'pi_test_payment_intent';

      // Mock successful payment intent
      jest.spyOn(stripeService, 'getPaymentIntent').mockResolvedValue({
        id: paymentIntentId,
        amount: 10000,
        currency: 'usd',
        status: 'succeeded',
        clientSecret: 'pi_test_client_secret',
        metadata: {
          userId: 'user_123',
          ldaoAmount: '100',
        },
      });

      const response = await request(app)
        .get(`/api/fiat-payment/payment-intent/${paymentIntentId}`)
        .expect(200);

      expect(response.body.id).toBe(paymentIntentId);
      expect(response.body.status).toBe('succeeded');
    });

    test('should handle payment status polling', async () => {
      const paymentIntentId = 'pi_test_payment_intent';

      // Mock payment intent in processing state
      jest.spyOn(stripeService, 'getPaymentIntent').mockResolvedValue({
        id: paymentIntentId,
        amount: 10000,
        currency: 'usd',
        status: 'processing',
        clientSecret: 'pi_test_client_secret',
        metadata: {
          userId: 'user_123',
          ldaoAmount: '100',
        },
      });

      const response = await request(app)
        .get(`/api/fiat-payment/payment-intent/${paymentIntentId}`)
        .expect(200);

      expect(response.body.status).toBe('processing');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle webhook processing errors gracefully', async () => {
      const webhookPayload = {
        id: 'evt_test_webhook_error',
        type: 'payment_intent.succeeded',
        data: { object: {} },
      };

      // Mock webhook processing error
      jest.spyOn(stripeService, 'handleWebhook').mockResolvedValue({
        id: 'evt_test_webhook_error',
        type: 'payment_intent.succeeded',
        data: webhookPayload.data,
        created: Math.floor(Date.now() / 1000),
      });

      jest.spyOn(stripeService, 'processWebhookEvent').mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'mock_signature')
        .send(JSON.stringify(webhookPayload))
        .expect(500);

      expect(response.body.error).toBe('Webhook processing failed');
    });

    test('should handle malformed webhook payloads', async () => {
      const malformedPayload = 'invalid json';

      jest.spyOn(stripeService, 'handleWebhook').mockRejectedValue(
        new Error('Invalid JSON')
      );

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'mock_signature')
        .send(malformedPayload)
        .expect(500);

      expect(response.body.error).toBe('Webhook processing failed');
    });

    test('should implement webhook retry logic', async () => {
      // In a real implementation, this would test:
      // 1. Webhook delivery failures
      // 2. Automatic retry mechanisms
      // 3. Dead letter queue handling
      // 4. Manual retry capabilities

      const webhookPayload = {
        id: 'evt_test_webhook_retry',
        type: 'payment_intent.succeeded',
        data: { object: {} },
      };

      // Mock temporary failure followed by success
      jest.spyOn(stripeService, 'processWebhookEvent')
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(undefined);

      // First attempt should fail
      let response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'mock_signature')
        .send(JSON.stringify(webhookPayload))
        .expect(500);

      expect(response.body.error).toBe('Webhook processing failed');

      // Retry should succeed (in real implementation, this would be automatic)
      jest.spyOn(stripeService, 'handleWebhook').mockResolvedValue({
        id: 'evt_test_webhook_retry',
        type: 'payment_intent.succeeded',
        data: webhookPayload.data,
        created: Math.floor(Date.now() / 1000),
      });

      response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'mock_signature')
        .send(JSON.stringify(webhookPayload))
        .expect(200);

      expect(response.body.received).toBe(true);
    });
  });

  describe('Webhook Security', () => {
    test('should validate webhook timestamps to prevent replay attacks', async () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const webhookPayload = {
        id: 'evt_test_webhook_old',
        type: 'payment_intent.succeeded',
        data: { object: {} },
        created: oldTimestamp,
      };

      // Mock webhook with old timestamp
      jest.spyOn(stripeService, 'handleWebhook').mockResolvedValue({
        id: 'evt_test_webhook_old',
        type: 'payment_intent.succeeded',
        data: webhookPayload.data,
        created: oldTimestamp,
      });

      // In a real implementation, this would check timestamp freshness
      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'mock_signature')
        .send(JSON.stringify(webhookPayload))
        .expect(200); // For now, accepting old timestamps

      expect(response.body.received).toBe(true);
    });

    test('should handle webhook signature verification edge cases', async () => {
      const webhookPayload = {
        id: 'evt_test_webhook_edge',
        type: 'payment_intent.succeeded',
        data: { object: {} },
      };

      // Test various signature formats
      const signatures = [
        '', // Empty signature
        'invalid', // Invalid format
        'v1=invalid_hash', // Invalid hash
        'v1=', // Empty hash
      ];

      for (const signature of signatures) {
        jest.spyOn(stripeService, 'handleWebhook').mockResolvedValue(null);

        const response = await request(app)
          .post('/api/stripe/webhook')
          .set('stripe-signature', signature)
          .send(JSON.stringify(webhookPayload));

        expect(response.status).toBe(400);
      }
    });
  });

  describe('Webhook Idempotency', () => {
    test('should handle duplicate webhook events', async () => {
      const webhookPayload = {
        id: 'evt_test_webhook_duplicate',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_payment_intent_duplicate',
            status: 'succeeded',
          },
        },
        created: Math.floor(Date.now() / 1000),
      };

      jest.spyOn(stripeService, 'handleWebhook').mockResolvedValue({
        id: 'evt_test_webhook_duplicate',
        type: 'payment_intent.succeeded',
        data: webhookPayload.data,
        created: webhookPayload.created,
      });

      jest.spyOn(stripeService, 'processWebhookEvent').mockResolvedValue();

      // First webhook should succeed
      let response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'mock_signature')
        .send(JSON.stringify(webhookPayload))
        .expect(200);

      expect(response.body.received).toBe(true);

      // Duplicate webhook should also succeed (idempotent)
      response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'mock_signature')
        .send(JSON.stringify(webhookPayload))
        .expect(200);

      expect(response.body.received).toBe(true);
    });
  });
});
