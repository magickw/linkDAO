import request from 'supertest';
import express from 'express';
import { OrderPaymentIntegrationController } from '../controllers/orderPaymentIntegrationController';
import { OrderPaymentIntegrationService, PaymentTransactionStatus } from '../services/orderPaymentIntegrationService';
import orderPaymentIntegrationRoutes from '../routes/orderPaymentIntegrationRoutes';

// Mock the service
jest.mock('../services/orderPaymentIntegrationService');

describe('OrderPaymentIntegrationController', () => {
  let app: express.Application;
  let mockService: jest.Mocked<OrderPaymentIntegrationService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    app.use('/api/orders', orderPaymentIntegrationRoutes);

    mockService = new OrderPaymentIntegrationService() as jest.Mocked<OrderPaymentIntegrationService>;
  });

  describe('POST /api/orders/:orderId/payment-transactions', () => {
    it('should create payment transaction successfully', async () => {
      const orderId = '123';
      const requestBody = {
        paymentMethod: 'crypto',
        amount: '100.00',
        currency: 'USDC',
        paymentDetails: {
          transactionHash: '0x123...',
          tokenAddress: '0xA0b86a33E6441c8C06DD2b7c94b7E6E8b8b8b8b8',
          tokenSymbol: 'USDC'
        }
      };

      const mockTransaction = {
        id: 'txn_123_1',
        orderId,
        paymentMethod: 'crypto',
        amount: '100.00',
        currency: 'USDC',
        status: PaymentTransactionStatus.PENDING,
        transactionHash: '0x123...',
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        processingFee: '0.50',
        platformFee: '0.50',
        totalFees: '1.00'
      };

      mockService.createPaymentTransaction = jest.fn().mockResolvedValue(mockTransaction);

      const response = await request(app)
        .post(`/api/orders/${orderId}/payment-transactions`)
        .send(requestBody)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction).toEqual(mockTransaction);
      expect(response.body.data.message).toBe('Payment transaction created successfully');

      expect(mockService.createPaymentTransaction).toHaveBeenCalledWith(
        orderId,
        requestBody.paymentMethod,
        requestBody.amount,
        requestBody.currency,
        requestBody.paymentDetails
      );
    });

    it('should return 400 for missing required fields', async () => {
      const orderId = '123';
      const requestBody = {
        paymentMethod: 'crypto',
        // Missing amount and currency
        paymentDetails: {}
      };

      const response = await request(app)
        .post(`/api/orders/${orderId}/payment-transactions`)
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Payment method, amount, and currency are required');
    });

    it('should return 400 for invalid payment method', async () => {
      const orderId = '123';
      const requestBody = {
        paymentMethod: 'invalid',
        amount: '100.00',
        currency: 'USDC'
      };

      const response = await request(app)
        .post(`/api/orders/${orderId}/payment-transactions`)
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid payment method. Must be crypto, fiat, or escrow');
    });

    it('should handle service errors', async () => {
      const orderId = '123';
      const requestBody = {
        paymentMethod: 'crypto',
        amount: '100.00',
        currency: 'USDC'
      };

      mockService.createPaymentTransaction = jest.fn().mockRejectedValue(
        new Error('Service error')
      );

      const response = await request(app)
        .post(`/api/orders/${orderId}/payment-transactions`)
        .send(requestBody)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Service error');
    });
  });

  describe('PUT /api/orders/payment-transactions/:transactionId/status', () => {
    it('should update payment transaction status successfully', async () => {
      const transactionId = 'txn_123_1';
      const requestBody = {
        status: PaymentTransactionStatus.CONFIRMED,
        details: {
          transactionHash: '0x456...',
          blockNumber: 12345,
          confirmations: 6
        }
      };

      const mockSyncResult = {
        orderId: '123',
        previousStatus: PaymentTransactionStatus.PENDING,
        newStatus: PaymentTransactionStatus.CONFIRMED,
        paymentStatus: PaymentTransactionStatus.CONFIRMED,
        transactionHash: '0x456...',
        confirmations: 6,
        updated: true,
        notifications: { buyer: true, seller: true }
      };

      mockService.updatePaymentTransactionStatus = jest.fn().mockResolvedValue(mockSyncResult);

      const response = await request(app)
        .put(`/api/orders/payment-transactions/${transactionId}/status`)
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.syncResult).toEqual(mockSyncResult);
      expect(response.body.data.message).toBe('Payment transaction status updated successfully');

      expect(mockService.updatePaymentTransactionStatus).toHaveBeenCalledWith(
        transactionId,
        requestBody.status,
        requestBody.details
      );
    });

    it('should return 400 for invalid status', async () => {
      const transactionId = 'txn_123_1';
      const requestBody = {
        status: 'invalid_status',
        details: {}
      };

      const response = await request(app)
        .put(`/api/orders/payment-transactions/${transactionId}/status`)
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid payment transaction status');
    });
  });

  describe('GET /api/orders/:orderId/payment-status', () => {
    it('should get order payment status successfully', async () => {
      const orderId = '123';
      const mockPaymentStatus = {
        orderId,
        paymentMethod: 'crypto' as const,
        paymentStatus: PaymentTransactionStatus.COMPLETED,
        orderStatus: 'processing',
        transactions: [
          {
            id: 'txn_123_1',
            orderId,
            paymentMethod: 'crypto' as const,
            amount: '100.00',
            currency: 'USDC',
            status: PaymentTransactionStatus.COMPLETED,
            createdAt: new Date(),
            updatedAt: new Date(),
            retryCount: 0,
            processingFee: '0.50',
            platformFee: '0.50',
            totalFees: '1.00'
          }
        ],
        totalPaid: '100.00',
        totalRefunded: '0.00',
        outstandingAmount: '0.00',
        canRetry: false,
        canRefund: true,
        receipts: []
      };

      mockService.getOrderPaymentStatus = jest.fn().mockResolvedValue(mockPaymentStatus);

      const response = await request(app)
        .get(`/api/orders/${orderId}/payment-status`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentStatus).toEqual(mockPaymentStatus);
      expect(response.body.data.message).toBe('Order payment status retrieved successfully');

      expect(mockService.getOrderPaymentStatus).toHaveBeenCalledWith(orderId);
    });

    it('should return 404 for non-existent order', async () => {
      const orderId = '999';

      mockService.getOrderPaymentStatus = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/orders/${orderId}/payment-status`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Order not found');
    });
  });

  describe('POST /api/orders/payment/monitor-blockchain', () => {
    it('should start blockchain transaction monitoring successfully', async () => {
      const requestBody = {
        transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        orderId: '123'
      };

      mockService.monitorBlockchainTransaction = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/orders/payment/monitor-blockchain')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Blockchain transaction monitoring started');
      expect(response.body.data.transactionHash).toBe(requestBody.transactionHash);
      expect(response.body.data.orderId).toBe(requestBody.orderId);

      expect(mockService.monitorBlockchainTransaction).toHaveBeenCalledWith(
        requestBody.transactionHash,
        requestBody.orderId
      );
    });

    it('should return 400 for missing required fields', async () => {
      const requestBody = {
        transactionHash: '0x123...'
        // Missing orderId
      };

      const response = await request(app)
        .post('/api/orders/payment/monitor-blockchain')
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Transaction hash and order ID are required');
    });

    it('should return 400 for invalid transaction hash format', async () => {
      const requestBody = {
        transactionHash: 'invalid_hash',
        orderId: '123'
      };

      const response = await request(app)
        .post('/api/orders/payment/monitor-blockchain')
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid transaction hash format');
    });
  });

  describe('POST /api/orders/payment-transactions/:transactionId/receipt', () => {
    it('should generate payment receipt successfully', async () => {
      const transactionId = 'txn_123_1';
      const mockReceipt = {
        id: 'receipt_123_1',
        transactionId,
        orderId: '123',
        receiptNumber: 'RCP-123-ABC',
        paymentMethod: 'crypto',
        amount: '100.00',
        currency: 'USDC',
        fees: {
          processing: '0.50',
          platform: '0.50',
          total: '1.00'
        },
        transactionDetails: {
          hash: '0x123...',
          blockNumber: 12345
        },
        timestamp: new Date(),
        receiptUrl: 'http://localhost:3000/receipts/RCP-123-ABC'
      };

      mockService.generatePaymentReceipt = jest.fn().mockResolvedValue(mockReceipt);

      const response = await request(app)
        .post(`/api/orders/payment-transactions/${transactionId}/receipt`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.receipt).toEqual(mockReceipt);
      expect(response.body.data.message).toBe('Payment receipt generated successfully');

      expect(mockService.generatePaymentReceipt).toHaveBeenCalledWith(transactionId);
    });
  });

  describe('POST /api/orders/:orderId/payment/retry', () => {
    it('should retry payment successfully', async () => {
      const orderId = '123';
      const requestBody = {
        paymentMethod: 'fiat'
      };

      const mockRetryTransaction = {
        id: 'txn_123_2',
        orderId,
        paymentMethod: 'fiat' as const,
        amount: '100.00',
        currency: 'USD',
        status: PaymentTransactionStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        retryCount: 0,
        processingFee: '2.90',
        platformFee: '0.50',
        totalFees: '3.40',
        metadata: {
          isRetry: true,
          originalTransactionId: 'txn_123_1',
          retryAttempt: 2
        }
      };

      mockService.retryPayment = jest.fn().mockResolvedValue(mockRetryTransaction);

      const response = await request(app)
        .post(`/api/orders/${orderId}/payment/retry`)
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction).toEqual(mockRetryTransaction);
      expect(response.body.data.message).toBe('Payment retry initiated successfully');

      expect(mockService.retryPayment).toHaveBeenCalledWith(orderId, requestBody.paymentMethod);
    });

    it('should return 400 for invalid payment method', async () => {
      const orderId = '123';
      const requestBody = {
        paymentMethod: 'invalid'
      };

      const response = await request(app)
        .post(`/api/orders/${orderId}/payment/retry`)
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid payment method. Must be crypto, fiat, or escrow');
    });
  });

  describe('POST /api/orders/:orderId/payment/refund', () => {
    it('should process refund successfully', async () => {
      const orderId = '123';
      const requestBody = {
        amount: '50.00',
        reason: 'Customer request'
      };

      const mockRefundResult = {
        success: true,
        refundTransactionId: 'txn_123_refund'
      };

      mockService.processRefund = jest.fn().mockResolvedValue(mockRefundResult);

      const response = await request(app)
        .post(`/api/orders/${orderId}/payment/refund`)
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.refundResult).toEqual(mockRefundResult);
      expect(response.body.data.message).toBe('Refund processed successfully');

      expect(mockService.processRefund).toHaveBeenCalledWith(
        orderId,
        requestBody.amount,
        requestBody.reason
      );
    });

    it('should return 400 for invalid refund amount', async () => {
      const orderId = '123';
      const requestBody = {
        amount: 'invalid_amount',
        reason: 'Customer request'
      };

      const response = await request(app)
        .post(`/api/orders/${orderId}/payment/refund`)
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid refund amount');
    });

    it('should return 400 for failed refund processing', async () => {
      const orderId = '123';
      const requestBody = {
        amount: '50.00',
        reason: 'Customer request'
      };

      const mockRefundResult = {
        success: false
      };

      mockService.processRefund = jest.fn().mockResolvedValue(mockRefundResult);

      const response = await request(app)
        .post(`/api/orders/${orderId}/payment/refund`)
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Refund processing failed');
    });
  });

  describe('GET /api/orders/:orderId/payment-transactions', () => {
    it('should get order payment transactions successfully', async () => {
      const orderId = '123';
      const mockPaymentStatus = {
        orderId,
        paymentMethod: 'crypto' as const,
        paymentStatus: PaymentTransactionStatus.COMPLETED,
        orderStatus: 'processing',
        transactions: [
          {
            id: 'txn_123_1',
            orderId,
            paymentMethod: 'crypto' as const,
            amount: '100.00',
            currency: 'USDC',
            status: PaymentTransactionStatus.COMPLETED,
            createdAt: new Date(),
            updatedAt: new Date(),
            retryCount: 0,
            processingFee: '0.50',
            platformFee: '0.50',
            totalFees: '1.00'
          }
        ],
        totalPaid: '100.00',
        totalRefunded: '0.00',
        outstandingAmount: '0.00',
        canRetry: false,
        canRefund: true,
        receipts: []
      };

      mockService.getOrderPaymentStatus = jest.fn().mockResolvedValue(mockPaymentStatus);

      const response = await request(app)
        .get(`/api/orders/${orderId}/payment-transactions`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toEqual(mockPaymentStatus.transactions);
      expect(response.body.data.totalTransactions).toBe(1);
      expect(response.body.data.totalPaid).toBe('100.00');
      expect(response.body.data.totalRefunded).toBe('0.00');
      expect(response.body.data.outstandingAmount).toBe('0.00');
      expect(response.body.data.message).toBe('Payment transactions retrieved successfully');
    });
  });

  describe('GET /api/orders/:orderId/payment-receipts', () => {
    it('should get order payment receipts successfully', async () => {
      const orderId = '123';
      const mockReceipts = [
        {
          id: 'receipt_123_1',
          transactionId: 'txn_123_1',
          orderId,
          receiptNumber: 'RCP-123-ABC',
          paymentMethod: 'crypto',
          amount: '100.00',
          currency: 'USDC',
          fees: {
            processing: '0.50',
            platform: '0.50',
            total: '1.00'
          },
          transactionDetails: {
            hash: '0x123...'
          },
          timestamp: new Date(),
          receiptUrl: 'http://localhost:3000/receipts/RCP-123-ABC'
        }
      ];

      const mockPaymentStatus = {
        orderId,
        paymentMethod: 'crypto' as const,
        paymentStatus: PaymentTransactionStatus.COMPLETED,
        orderStatus: 'processing',
        transactions: [],
        totalPaid: '100.00',
        totalRefunded: '0.00',
        outstandingAmount: '0.00',
        canRetry: false,
        canRefund: true,
        receipts: mockReceipts
      };

      mockService.getOrderPaymentStatus = jest.fn().mockResolvedValue(mockPaymentStatus);

      const response = await request(app)
        .get(`/api/orders/${orderId}/payment-receipts`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.receipts).toEqual(mockReceipts);
      expect(response.body.data.totalReceipts).toBe(1);
      expect(response.body.data.message).toBe('Payment receipts retrieved successfully');
    });
  });

  describe('POST /api/orders/payment/webhook', () => {
    it('should handle Stripe webhook successfully', async () => {
      const requestBody = {
        provider: 'stripe',
        eventType: 'payment_intent.succeeded',
        data: {
          id: 'pi_123...',
          metadata: {
            orderId: '123'
          },
          amount: 10000,
          currency: 'usd'
        }
      };

      const response = await request(app)
        .post('/api/orders/payment/webhook')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Webhook processed successfully');
    });

    it('should handle blockchain webhook successfully', async () => {
      const requestBody = {
        provider: 'blockchain',
        eventType: 'transaction.confirmed',
        data: {
          transactionHash: '0x123...',
          orderId: '123',
          blockNumber: 12345,
          confirmations: 6
        }
      };

      const response = await request(app)
        .post('/api/orders/payment/webhook')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Webhook processed successfully');
    });

    it('should handle unknown provider gracefully', async () => {
      const requestBody = {
        provider: 'unknown',
        eventType: 'some.event',
        data: {}
      };

      const response = await request(app)
        .post('/api/orders/payment/webhook')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Webhook processed successfully');
    });
  });
});
