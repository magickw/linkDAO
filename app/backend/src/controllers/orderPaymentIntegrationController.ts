import { Request, Response } from 'express';
import { OrderPaymentIntegrationService, PaymentTransactionStatus } from '../services/orderPaymentIntegrationService';

export class OrderPaymentIntegrationController {
  private orderPaymentIntegrationService: OrderPaymentIntegrationService;

  constructor() {
    this.orderPaymentIntegrationService = new OrderPaymentIntegrationService();
  }

  /**
   * Create payment transaction for an order
   */
  async createPaymentTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const {
        paymentMethod,
        amount,
        currency,
        paymentDetails
      } = req.body;

      // Validate required fields
      if (!paymentMethod || !amount || !currency) {
        res.status(400).json({
          success: false,
          error: 'Payment method, amount, and currency are required'
        });
        return;
      }

      // Validate payment method
      if (!['crypto', 'fiat', 'escrow'].includes(paymentMethod)) {
        res.status(400).json({
          success: false,
          error: 'Invalid payment method. Must be crypto, fiat, or escrow'
        });
        return;
      }

      const transaction = await this.orderPaymentIntegrationService.createPaymentTransaction(
        orderId,
        paymentMethod,
        amount,
        currency,
        paymentDetails || {}
      );

      res.status(201).json({
        success: true,
        data: {
          transaction,
          message: 'Payment transaction created successfully'
        }
      });

    } catch (error) {
      console.error('Error creating payment transaction:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment transaction'
      });
    }
  }

  /**
   * Update payment transaction status
   */
  async updatePaymentTransactionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;
      const { status, details } = req.body;

      // Validate status
      if (!Object.values(PaymentTransactionStatus).includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Invalid payment transaction status'
        });
        return;
      }

      const syncResult = await this.orderPaymentIntegrationService.updatePaymentTransactionStatus(
        transactionId,
        status,
        details
      );

      res.status(200).json({
        success: true,
        data: {
          syncResult,
          message: 'Payment transaction status updated successfully'
        }
      });

    } catch (error) {
      console.error('Error updating payment transaction status:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update payment transaction status'
      });
    }
  }

  /**
   * Get order payment status
   */
  async getOrderPaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      const paymentStatus = await this.orderPaymentIntegrationService.getOrderPaymentStatus(orderId);

      if (!paymentStatus) {
        res.status(404).json({
          success: false,
          error: 'Order not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          paymentStatus,
          message: 'Order payment status retrieved successfully'
        }
      });

    } catch (error) {
      console.error('Error getting order payment status:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get order payment status'
      });
    }
  }

  /**
   * Monitor blockchain transaction
   */
  async monitorBlockchainTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { transactionHash, orderId } = req.body;

      if (!transactionHash || !orderId) {
        res.status(400).json({
          success: false,
          error: 'Transaction hash and order ID are required'
        });
        return;
      }

      // Validate transaction hash format
      if (!/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
        res.status(400).json({
          success: false,
          error: 'Invalid transaction hash format'
        });
        return;
      }

      // Start monitoring (async operation)
      this.orderPaymentIntegrationService.monitorBlockchainTransaction(transactionHash, orderId);

      res.status(200).json({
        success: true,
        data: {
          message: 'Blockchain transaction monitoring started',
          transactionHash,
          orderId
        }
      });

    } catch (error) {
      console.error('Error starting blockchain transaction monitoring:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start blockchain transaction monitoring'
      });
    }
  }

  /**
   * Generate payment receipt
   */
  async generatePaymentReceipt(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;

      const receipt = await this.orderPaymentIntegrationService.generatePaymentReceipt(transactionId);

      res.status(200).json({
        success: true,
        data: {
          receipt,
          message: 'Payment receipt generated successfully'
        }
      });

    } catch (error) {
      console.error('Error generating payment receipt:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate payment receipt'
      });
    }
  }

  /**
   * Retry failed payment
   */
  async retryPayment(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { paymentMethod } = req.body;

      // Validate payment method if provided
      if (paymentMethod && !['crypto', 'fiat', 'escrow'].includes(paymentMethod)) {
        res.status(400).json({
          success: false,
          error: 'Invalid payment method. Must be crypto, fiat, or escrow'
        });
        return;
      }

      const retryTransaction = await this.orderPaymentIntegrationService.retryPayment(
        orderId,
        paymentMethod
      );

      res.status(200).json({
        success: true,
        data: {
          transaction: retryTransaction,
          message: 'Payment retry initiated successfully'
        }
      });

    } catch (error) {
      console.error('Error retrying payment:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retry payment'
      });
    }
  }

  /**
   * Process refund
   */
  async processRefund(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { amount, reason } = req.body;

      // Validate amount if provided
      if (amount && (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)) {
        res.status(400).json({
          success: false,
          error: 'Invalid refund amount'
        });
        return;
      }

      const refundResult = await this.orderPaymentIntegrationService.processRefund(
        orderId,
        amount,
        reason
      );

      if (!refundResult.success) {
        res.status(400).json({
          success: false,
          error: 'Refund processing failed'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          refundResult,
          message: 'Refund processed successfully'
        }
      });

    } catch (error) {
      console.error('Error processing refund:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process refund'
      });
    }
  }

  /**
   * Sync order with payment status (manual trigger)
   */
  async syncOrderWithPaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { paymentStatus, paymentDetails } = req.body;

      // Validate payment status
      if (!Object.values(PaymentTransactionStatus).includes(paymentStatus)) {
        res.status(400).json({
          success: false,
          error: 'Invalid payment status'
        });
        return;
      }

      const syncResult = await this.orderPaymentIntegrationService.syncOrderWithPaymentStatus(
        orderId,
        paymentStatus,
        paymentDetails
      );

      res.status(200).json({
        success: true,
        data: {
          syncResult,
          message: 'Order synchronized with payment status successfully'
        }
      });

    } catch (error) {
      console.error('Error syncing order with payment status:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync order with payment status'
      });
    }
  }

  /**
   * Get payment transactions for an order
   */
  async getOrderPaymentTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      const paymentStatus = await this.orderPaymentIntegrationService.getOrderPaymentStatus(orderId);

      if (!paymentStatus) {
        res.status(404).json({
          success: false,
          error: 'Order not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          transactions: paymentStatus.transactions,
          totalTransactions: paymentStatus.transactions.length,
          totalPaid: paymentStatus.totalPaid,
          totalRefunded: paymentStatus.totalRefunded,
          outstandingAmount: paymentStatus.outstandingAmount,
          message: 'Payment transactions retrieved successfully'
        }
      });

    } catch (error) {
      console.error('Error getting order payment transactions:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment transactions'
      });
    }
  }

  /**
   * Get payment receipts for an order
   */
  async getOrderPaymentReceipts(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      const paymentStatus = await this.orderPaymentIntegrationService.getOrderPaymentStatus(orderId);

      if (!paymentStatus) {
        res.status(404).json({
          success: false,
          error: 'Order not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          receipts: paymentStatus.receipts,
          totalReceipts: paymentStatus.receipts.length,
          message: 'Payment receipts retrieved successfully'
        }
      });

    } catch (error) {
      console.error('Error getting order payment receipts:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment receipts'
      });
    }
  }

  /**
   * Webhook handler for payment status updates
   */
  async handlePaymentWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { provider, eventType, data } = req.body;

      console.log(`📨 Received payment webhook from ${provider}: ${eventType}`);

      // Handle different payment providers
      switch (provider) {
        case 'stripe':
          await this.handleStripeWebhook(eventType, data);
          break;
        case 'blockchain':
          await this.handleBlockchainWebhook(eventType, data);
          break;
        default:
          console.warn(`Unknown payment provider: ${provider}`);
      }

      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully'
      });

    } catch (error) {
      console.error('Error handling payment webhook:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process webhook'
      });
    }
  }

  // Private helper methods

  private async handleStripeWebhook(eventType: string, data: any): Promise<void> {
    try {
      switch (eventType) {
        case 'payment_intent.succeeded':
          if (data.metadata?.orderId) {
            await this.updatePaymentFromStripeEvent(data.metadata.orderId, 'completed', data);
          }
          break;
        case 'payment_intent.payment_failed':
          if (data.metadata?.orderId) {
            await this.updatePaymentFromStripeEvent(data.metadata.orderId, 'failed', data);
          }
          break;
        case 'charge.dispute.created':
          if (data.metadata?.orderId) {
            await this.updatePaymentFromStripeEvent(data.metadata.orderId, 'disputed', data);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling Stripe webhook:', error);
    }
  }

  private async handleBlockchainWebhook(eventType: string, data: any): Promise<void> {
    try {
      switch (eventType) {
        case 'transaction.confirmed':
          if (data.orderId) {
            await this.updatePaymentFromBlockchainEvent(data.orderId, 'confirmed', data);
          }
          break;
        case 'transaction.failed':
          if (data.orderId) {
            await this.updatePaymentFromBlockchainEvent(data.orderId, 'failed', data);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling blockchain webhook:', error);
    }
  }

  private async updatePaymentFromStripeEvent(orderId: string, status: string, data: any): Promise<void> {
    try {
      const paymentStatus = status === 'completed' ? PaymentTransactionStatus.COMPLETED :
                           status === 'failed' ? PaymentTransactionStatus.FAILED :
                           PaymentTransactionStatus.PROCESSING;

      await this.orderPaymentIntegrationService.syncOrderWithPaymentStatus(
        orderId,
        paymentStatus,
        { stripeEvent: data }
      );
    } catch (error) {
      console.error('Error updating payment from Stripe event:', error);
    }
  }

  private async updatePaymentFromBlockchainEvent(orderId: string, status: string, data: any): Promise<void> {
    try {
      const paymentStatus = status === 'confirmed' ? PaymentTransactionStatus.CONFIRMED :
                           status === 'failed' ? PaymentTransactionStatus.FAILED :
                           PaymentTransactionStatus.PROCESSING;

      await this.orderPaymentIntegrationService.syncOrderWithPaymentStatus(
        orderId,
        paymentStatus,
        { blockchainEvent: data }
      );
    } catch (error) {
      console.error('Error updating payment from blockchain event:', error);
    }
  }
}