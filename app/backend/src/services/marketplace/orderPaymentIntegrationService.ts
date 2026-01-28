import { DatabaseService } from './databaseService';
import { safeLogger } from '../../utils/safeLogger';
import { NotificationService } from '../notificationService';
import { PaymentValidationService } from './paymentValidationService';
import { EnhancedEscrowService } from '../enhancedEscrowService';
import { EnhancedFiatPaymentService } from './enhancedFiatPaymentService';
import { ReceiptService } from './receiptService';
import { emailService } from './emailService';
import { ReceiptStatus } from '../../types/receipt';
import { ethers } from 'ethers';
import { refundPaymentService, RefundResult } from './refundPaymentService';

export interface PaymentTransaction {
  id: string;
  orderId: string;
  paymentMethod: 'crypto' | 'fiat' | 'escrow';
  transactionHash?: string;
  paymentIntentId?: string;
  escrowId?: string;
  amount: string;
  currency: string;
  status: PaymentTransactionStatus;
  processingFee: string;
  platformFee: string;
  totalFees: string;
  receiptUrl?: string;
  receiptData?: any;
  failureReason?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  metadata?: any;
}

export enum PaymentTransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export interface PaymentReceipt {
  id: string;
  transactionId: string;
  orderId: string;
  receiptNumber: string;
  paymentMethod: string;
  amount: string;
  currency: string;
  fees: {
    processing: string;
    platform: string;
    gas?: string;
    total: string;
  };
  transactionDetails: {
    hash?: string;
    blockNumber?: number;
    confirmations?: number;
    paymentIntentId?: string;
    escrowAddress?: string;
  };
  timestamp: Date;
  receiptUrl: string;
  metadata?: any;
}

export interface OrderPaymentStatus {
  orderId: string;
  paymentMethod: 'crypto' | 'fiat' | 'escrow';
  paymentStatus: PaymentTransactionStatus;
  orderStatus: string;
  transactions: PaymentTransaction[];
  totalPaid: string;
  totalRefunded: string;
  outstandingAmount: string;
  lastPaymentAttempt?: Date;
  nextRetryAt?: Date;
  canRetry: boolean;
  canRefund: boolean;
  receipts: PaymentReceipt[];
}

export interface PaymentSyncResult {
  orderId: string;
  previousStatus: string;
  newStatus: string;
  paymentStatus: PaymentTransactionStatus;
  transactionHash?: string;
  confirmations?: number;
  updated: boolean;
  notifications: {
    buyer: boolean;
    seller: boolean;
  };
}

export class OrderPaymentIntegrationService {
  private databaseService: DatabaseService;
  private notificationService: NotificationService;
  private paymentValidationService: PaymentValidationService;
  private enhancedEscrowService: EnhancedEscrowService;
  private enhancedFiatPaymentService: EnhancedFiatPaymentService;
  private receiptService: ReceiptService;
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.databaseService = new DatabaseService();
    this.notificationService = new NotificationService();
    this.paymentValidationService = new PaymentValidationService();
    this.enhancedEscrowService = new EnhancedEscrowService(
      process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
      process.env.ENHANCED_ESCROW_CONTRACT_ADDRESS || '',
      process.env.MARKETPLACE_CONTRACT_ADDRESS || ''
    );
    this.enhancedFiatPaymentService = new EnhancedFiatPaymentService();
    this.receiptService = new ReceiptService();
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com');
  }

  /**
   * Get user email from user profile
   */
  private async getUserEmail(userAddress: string): Promise<string | null> {
    try {
      const user = await this.databaseService.getUserByAddress(userAddress);
      return user?.email || null;
    } catch (error) {
      safeLogger.error('Error getting user email:', error);
      return null;
    }
  }

  /**
   * Create payment transaction record for an order
   */
  async createPaymentTransaction(
    orderId: string,
    paymentMethod: 'crypto' | 'fiat' | 'escrow',
    amount: string,
    currency: string,
    paymentDetails: {
      transactionHash?: string;
      paymentIntentId?: string;
      escrowId?: string;
      tokenAddress?: string;
      tokenSymbol?: string;
      fees?: {
        processing: string;
        platform: string;
        gas?: string;
        total: string;
      };
      metadata?: any;
    }
  ): Promise<PaymentTransaction> {
    try {
      safeLogger.info(`💳 Creating payment transaction for order ${orderId}`);

      // Generate unique transaction ID
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Calculate fees if not provided
      const fees = paymentDetails.fees || await this.calculatePaymentFees(paymentMethod, amount, currency);

      // Create payment transaction record
      const transaction: PaymentTransaction = {
        id: transactionId,
        orderId,
        paymentMethod,
        transactionHash: paymentDetails.transactionHash,
        paymentIntentId: paymentDetails.paymentIntentId,
        escrowId: paymentDetails.escrowId,
        amount,
        currency,
        status: PaymentTransactionStatus.PENDING,
        processingFee: fees.processing,
        platformFee: fees.platform,
        totalFees: fees.total,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: paymentDetails.metadata
      };

      // Store in database
      await this.storePaymentTransaction(transaction);

      // Update order with payment method and transaction reference
      await this.updateOrderPaymentInfo(orderId, {
        paymentMethod,
        paymentTransactionId: transactionId,
        paymentStatus: PaymentTransactionStatus.PENDING,
        paymentDetails: JSON.stringify(paymentDetails)
      });

      safeLogger.info(`✅ Payment transaction ${transactionId} created for order ${orderId}`);
      return transaction;

    } catch (error) {
      safeLogger.error('Error creating payment transaction:', error);
      throw error;
    }
  }

  /**
   * Update payment transaction status and sync with order
   */
  async updatePaymentTransactionStatus(
    transactionId: string,
    status: PaymentTransactionStatus,
    details?: {
      transactionHash?: string;
      blockNumber?: number;
      confirmations?: number;
      failureReason?: string;
      receiptData?: any;
      metadata?: any;
    }
  ): Promise<PaymentSyncResult> {
    try {
      safeLogger.info(`🔄 Updating payment transaction ${transactionId} to status ${status}`);

      // Get current transaction
      const transaction = await this.getPaymentTransaction(transactionId);
      if (!transaction) {
        throw new Error('Payment transaction not found');
      }

      const previousStatus = transaction.status;

      // Update transaction
      const updatedTransaction: Partial<PaymentTransaction> = {
        status,
        updatedAt: new Date(),
        transactionHash: details?.transactionHash || transaction.transactionHash,
        failureReason: details?.failureReason,
        receiptData: details?.receiptData,
        metadata: { ...transaction.metadata, ...details?.metadata }
      };

      if (status === PaymentTransactionStatus.CONFIRMED || status === PaymentTransactionStatus.COMPLETED) {
        updatedTransaction.confirmedAt = new Date();
      }

      await this.updateStoredPaymentTransaction(transactionId, updatedTransaction);

      // Sync order status based on payment status
      const syncResult = await this.syncOrderWithPaymentStatus(transaction.orderId, status, details);

      // Generate receipt if payment is completed
      if (status === PaymentTransactionStatus.COMPLETED) {
        await this.generatePaymentReceipt(transactionId);
      }

      safeLogger.info(`✅ Payment transaction ${transactionId} updated: ${previousStatus} -> ${status}`);

      return {
        orderId: transaction.orderId,
        previousStatus: previousStatus,
        newStatus: status,
        paymentStatus: status,
        transactionHash: details?.transactionHash,
        confirmations: details?.confirmations,
        updated: true,
        notifications: syncResult.notifications
      };

    } catch (error) {
      safeLogger.error('Error updating payment transaction status:', error);
      throw error;
    }
  }

  /**
   * Sync order status with payment status
   */
  async syncOrderWithPaymentStatus(
    orderId: string,
    paymentStatus: PaymentTransactionStatus,
    paymentDetails?: any
  ): Promise<{ notifications: { buyer: boolean; seller: boolean } }> {
    try {
      safeLogger.info(`🔄 Syncing order ${orderId} with payment status ${paymentStatus}`);

      const order = await this.databaseService.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      let newOrderStatus = order.status;
      const notifications = { buyer: false, seller: false };

      // Map payment status to order status
      switch (paymentStatus) {
        case PaymentTransactionStatus.PENDING:
          newOrderStatus = 'payment_pending';
          break;
        case PaymentTransactionStatus.PROCESSING:
          newOrderStatus = 'payment_processing';
          break;
        case PaymentTransactionStatus.CONFIRMED:
          newOrderStatus = 'paid';
          break;
        case PaymentTransactionStatus.COMPLETED:
          newOrderStatus = 'processing'; // Ready for seller to process
          break;
        case PaymentTransactionStatus.FAILED:
          newOrderStatus = 'payment_failed';
          break;
        case PaymentTransactionStatus.CANCELLED:
          newOrderStatus = 'cancelled';
          break;
        case PaymentTransactionStatus.REFUNDED:
          newOrderStatus = 'refunded';
          break;
      }

      // Update order status if changed
      if (newOrderStatus !== order.status) {
        await this.databaseService.updateOrder(orderId, {
          status: newOrderStatus,
          paymentConfirmationHash: paymentDetails?.transactionHash
        });

        // Create order tracking event
        await this.createOrderTrackingEvent(orderId, newOrderStatus, `Payment status: ${paymentStatus}`, paymentDetails);

        // Send notifications based on new status
        notifications.buyer = await this.sendBuyerNotification(orderId, newOrderStatus, paymentStatus);
        notifications.seller = await this.sendSellerNotification(orderId, newOrderStatus, paymentStatus);

        safeLogger.info(`📋 Order ${orderId} status updated: ${order.status} -> ${newOrderStatus}`);
      }

      return { notifications };

    } catch (error) {
      safeLogger.error('Error syncing order with payment status:', error);
      return { notifications: { buyer: false, seller: false } };
    }
  }

  /**
   * Get comprehensive order payment status
   */
  async getOrderPaymentStatus(orderId: string): Promise<OrderPaymentStatus | null> {
    try {
      const order = await this.databaseService.getOrderById(orderId);
      if (!order) {
        return null;
      }

      // Get all payment transactions for this order
      const transactions = await this.getPaymentTransactionsByOrderId(orderId);

      // Get all receipts for this order
      const receipts = await this.getPaymentReceiptsByOrderId(orderId);

      // Calculate totals
      const totalPaid = transactions
        .filter(t => t.status === PaymentTransactionStatus.COMPLETED)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)
        .toString();

      const totalRefunded = transactions
        .filter(t => t.status === PaymentTransactionStatus.REFUNDED)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)
        .toString();

      const orderAmount = parseFloat(order.totalAmount || order.amount);
      const outstandingAmount = Math.max(0, orderAmount - parseFloat(totalPaid) + parseFloat(totalRefunded)).toString();

      // Determine current payment status
      const latestTransaction = transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      const paymentStatus = latestTransaction?.status || PaymentTransactionStatus.PENDING;

      // Determine retry and refund capabilities
      const canRetry = paymentStatus === PaymentTransactionStatus.FAILED && parseFloat(outstandingAmount) > 0;
      const canRefund = parseFloat(totalPaid) > 0 && !['refunded', 'cancelled'].includes(order.status);

      return {
        orderId,
        paymentMethod: order.paymentMethod as 'crypto' | 'fiat' | 'escrow',
        paymentStatus,
        orderStatus: order.status,
        transactions,
        totalPaid,
        totalRefunded,
        outstandingAmount,
        lastPaymentAttempt: latestTransaction?.createdAt,
        nextRetryAt: canRetry ? new Date(Date.now() + 5 * 60 * 1000) : undefined, // 5 minutes
        canRetry,
        canRefund,
        receipts
      };

    } catch (error) {
      safeLogger.error('Error getting order payment status:', error);
      return null;
    }
  }

  /**
   * Monitor blockchain transactions for crypto payments
   */
  async monitorBlockchainTransaction(transactionHash: string, orderId: string): Promise<void> {
    try {
      safeLogger.info(`👀 Monitoring blockchain transaction ${transactionHash} for order ${orderId}`);

      const checkTransaction = async () => {
        try {
          const receipt = await this.provider.getTransactionReceipt(transactionHash);

          if (receipt) {
            const status = receipt.status === 1 ? PaymentTransactionStatus.CONFIRMED : PaymentTransactionStatus.FAILED;

            // Find the payment transaction
            const transactions = await this.getPaymentTransactionsByOrderId(orderId);
            const transaction = transactions.find(t => t.transactionHash === transactionHash);

            if (transaction) {
              await this.updatePaymentTransactionStatus(transaction.id, status, {
                blockNumber: receipt.blockNumber,
                confirmations: await this.provider.getBlockNumber() - receipt.blockNumber,
                transactionHash,
                receiptData: {
                  gasUsed: receipt.gasUsed.toString(),
                  gasPrice: receipt.gasPrice?.toString() || '0',
                  logs: receipt.logs.length
                }
              });
            }

            safeLogger.info(`✅ Transaction ${transactionHash} confirmed with status: ${status}`);
          } else {
            // Transaction not yet mined, check again later
            setTimeout(checkTransaction, 30000); // Check every 30 seconds
          }
        } catch (error) {
          safeLogger.error('Error checking transaction:', error);
          setTimeout(checkTransaction, 60000); // Retry in 1 minute on error
        }
      };

      // Start monitoring
      checkTransaction();

    } catch (error) {
      safeLogger.error('Error starting blockchain transaction monitoring:', error);
    }
  }

  /**
   * Generate payment receipt
   */
  async generatePaymentReceipt(transactionId: string): Promise<any> {
    try {
      const transaction = await this.getPaymentTransaction(transactionId);
      if (!transaction) {
        throw new Error('Payment transaction not found');
      }

      // Get order details for receipt generation
      const order = await this.databaseService.getOrderById(transaction.orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Get order items for receipt (mock data since we don't have getOrderItems method)
      const orderItems = [{
        id: 1,
        title: `Order #${transaction.orderId}`,
        quantity: 1,
        unitPrice: transaction.amount,
        totalPrice: transaction.amount
      }];

      // Format items for receipt
      const receiptItems = orderItems.map(item => ({
        id: item.id.toString(),
        name: item.title || `Order #${transaction.orderId}`,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || transaction.amount,
        totalPrice: item.totalPrice || transaction.amount
      }));

      // Generate marketplace receipt
      const receipt = await this.receiptService.generateMarketplaceReceipt({
        orderId: transaction.orderId,
        transactionId: transaction.id,
        buyerAddress: order.buyerAddress || '',
        amount: transaction.amount,
        currency: transaction.currency,
        paymentMethod: transaction.paymentMethod,
        transactionHash: transaction.transactionHash,
        status: ReceiptStatus.COMPLETED,
        items: receiptItems,
        fees: {
          processing: transaction.processingFee,
          platform: transaction.platformFee,
          gas: transaction.metadata?.gasFee,
          total: transaction.totalFees
        },
        sellerAddress: order.sellerAddress,
        sellerName: order.sellerName,
        createdAt: new Date(),
        completedAt: new Date(),
        metadata: transaction.metadata
      });

      // Update transaction with receipt URL
      await this.updateStoredPaymentTransaction(transactionId, {
        receiptUrl: receipt.downloadUrl
      });

      // Send receipt email
      const userEmail = await this.getUserEmail(order.buyerAddress || '');
      if (userEmail) {
        await emailService.sendMarketplaceReceiptEmail(userEmail, {
          orderId: transaction.orderId,
          transactionId: transaction.id,
          items: receiptItems,
          subtotal: parseFloat(transaction.amount),
          shipping: 0,
          tax: 0,
          platformFee: parseFloat(transaction.platformFee || '0'),
          total: parseFloat(transaction.amount) + parseFloat(transaction.platformFee || '0'),
          paymentMethod: transaction.paymentMethod,
          network: transaction.metadata?.network,
          transactionHash: transaction.transactionHash,
          sellerName: order.sellerName || 'Unknown Seller',
          shippingAddress: order.shippingAddress,
          timestamp: new Date()
        });
        safeLogger.info(`Receipt email sent to ${userEmail} for order ${transaction.orderId}`);
      } else {
        safeLogger.warn(`No email found for user ${order.buyerAddress}, skipping receipt email`);
      }

      safeLogger.info(`🧾 Payment receipt ${receipt.receiptNumber} generated for transaction ${transactionId}`);
      return receipt;

    } catch (error) {
      safeLogger.error('Error generating payment receipt:', error);
      throw error;
    }
  }

  /**
   * Retry failed payment
   */
  async retryPayment(orderId: string, paymentMethod?: 'crypto' | 'fiat' | 'escrow'): Promise<PaymentTransaction> {
    try {
      safeLogger.info(`🔄 Retrying payment for order ${orderId}`);

      const orderPaymentStatus = await this.getOrderPaymentStatus(orderId);
      if (!orderPaymentStatus) {
        throw new Error('Order not found');
      }

      if (!orderPaymentStatus.canRetry) {
        throw new Error('Payment cannot be retried');
      }

      const order = await this.databaseService.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Use provided payment method or fall back to original
      const retryPaymentMethod = paymentMethod || orderPaymentStatus.paymentMethod;

      // Create new payment transaction for retry
      const retryTransaction = await this.createPaymentTransaction(
        orderId,
        retryPaymentMethod,
        orderPaymentStatus.outstandingAmount,
        order.currency || 'USD',
        {
          metadata: {
            isRetry: true,
            originalTransactionId: orderPaymentStatus.transactions[0]?.id,
            retryAttempt: orderPaymentStatus.transactions.length + 1
          }
        }
      );

      safeLogger.info(`🔄 Payment retry transaction ${retryTransaction.id} created for order ${orderId}`);
      return retryTransaction;

    } catch (error) {
      safeLogger.error('Error retrying payment:', error);
      throw error;
    }
  }

  /**
   * Process refund for completed payment
   */
  async processRefund(
    orderId: string,
    amount?: string,
    reason?: string
  ): Promise<{ success: boolean; refundTransactionId?: string; error?: string }> {
    try {
      safeLogger.info(`💰 Processing refund for order ${orderId}`);

      const orderPaymentStatus = await this.getOrderPaymentStatus(orderId);
      if (!orderPaymentStatus) {
        throw new Error('Order not found');
      }

      if (!orderPaymentStatus.canRefund) {
        throw new Error('Order cannot be refunded');
      }

      const refundAmount = amount || orderPaymentStatus.totalPaid;
      const completedTransactions = orderPaymentStatus.transactions.filter(
        t => t.status === PaymentTransactionStatus.COMPLETED
      );

      if (completedTransactions.length === 0) {
        throw new Error('No completed payments to refund');
      }

      // Process refund based on payment method
      const originalTransaction = completedTransactions[0];
      let refundResult: RefundResult;

      switch (originalTransaction.paymentMethod) {
        case 'crypto':
        case 'escrow':
          // Get buyer address for crypto refund
          const order = await this.databaseService.getOrderById(orderId);
          if (!order || !order.buyerAddress) {
            throw new Error('Buyer address not found for crypto refund');
          }

          // Process actual blockchain refund
          refundResult = await refundPaymentService.processBlockchainRefund(
            order.buyerAddress,
            refundAmount,
            originalTransaction.metadata?.tokenAddress
          );
          break;

        case 'fiat':
          if (originalTransaction.paymentIntentId) {
            // Process actual Stripe refund
            refundResult = await refundPaymentService.processStripeRefund(
              originalTransaction.paymentIntentId,
              parseFloat(refundAmount),
              reason
            );
          } else if (originalTransaction.metadata?.paypalCaptureId) {
            // Process actual PayPal refund
            refundResult = await refundPaymentService.processPayPalRefund(
              originalTransaction.metadata.paypalCaptureId,
              parseFloat(refundAmount),
              originalTransaction.currency,
              reason
            );
          } else {
            throw new Error('No fiat payment identifier found for refund');
          }
          break;

        default:
          throw new Error(`Unsupported payment method for refund: ${originalTransaction.paymentMethod}`);
      }

      // Check if refund was successful
      if (!refundResult.success) {
        safeLogger.error(`Refund failed for order ${orderId}: ${refundResult.error}`);
        return {
          success: false,
          error: refundResult.error || 'Refund processing failed'
        };
      }

      // Create refund transaction record
      const refundTransaction = await this.createPaymentTransaction(
        orderId,
        originalTransaction.paymentMethod,
        `-${refundAmount}`, // Negative amount for refund
        originalTransaction.currency,
        {
          transactionHash: refundResult.transactionHash,
          paymentIntentId: refundResult.refundId,
          escrowId: originalTransaction.escrowId,
          metadata: {
            isRefund: true,
            originalTransactionId: originalTransaction.id,
            refundReason: reason,
            provider: refundResult.provider,
            retryCount: refundResult.retryCount
          }
        }
      );

      // Update refund transaction status
      await this.updatePaymentTransactionStatus(
        refundTransaction.id,
        PaymentTransactionStatus.REFUNDED,
        {
          transactionHash: refundResult.transactionHash,
          receiptData: {
            refundId: refundResult.refundId,
            transactionHash: refundResult.transactionHash,
            provider: refundResult.provider
          }
        }
      );

      safeLogger.info(`✅ Refund processed for order ${orderId}: ${refundAmount} ${originalTransaction.currency}`);
      return { success: true, refundTransactionId: refundTransaction.id };

    } catch (error: any) {
      safeLogger.error('Error processing refund:', error);
      return { success: false, error: error.message };
    }
  }

  // Private helper methods

  private async calculatePaymentFees(
    paymentMethod: 'crypto' | 'fiat' | 'escrow',
    amount: string,
    currency: string
  ): Promise<{ processing: string; platform: string; gas?: string; total: string }> {
    const amountNum = parseFloat(amount);
    let processingFee = 0;
    let platformFee = amountNum * 0.005; // 0.5% platform fee
    let gasFee = 0;

    switch (paymentMethod) {
      case 'crypto':
        gasFee = 0.01; // Estimated gas fee
        break;
      case 'fiat':
        processingFee = amountNum * 0.029 + 0.30; // Stripe fees
        break;
      case 'escrow':
        processingFee = amountNum * 0.01; // 1% escrow fee
        gasFee = 0.02; // Higher gas for escrow operations
        break;
    }

    const total = processingFee + platformFee + gasFee;

    return {
      processing: processingFee.toFixed(8),
      platform: platformFee.toFixed(8),
      gas: gasFee > 0 ? gasFee.toFixed(8) : undefined,
      total: total.toFixed(8)
    };
  }

  private async storePaymentTransaction(transaction: PaymentTransaction): Promise<void> {
    // Store in database - implementation depends on your database schema
    await this.databaseService.createPaymentTransaction({
      id: transaction.id,
      orderId: transaction.orderId,
      paymentMethod: transaction.paymentMethod,
      transactionHash: transaction.transactionHash,
      paymentIntentId: transaction.paymentIntentId,
      escrowId: transaction.escrowId,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      processingFee: transaction.processingFee,
      platformFee: transaction.platformFee,
      totalFees: transaction.totalFees,
      receiptUrl: transaction.receiptUrl,
      receiptData: JSON.stringify(transaction.receiptData),
      failureReason: transaction.failureReason,
      retryCount: String(transaction.retryCount),
      metadata: JSON.stringify(transaction.metadata)
    });
  }

  private async updateStoredPaymentTransaction(
    transactionId: string,
    updates: Partial<PaymentTransaction>
  ): Promise<void> {
    await this.databaseService.updatePaymentTransaction(transactionId, {
      ...updates,
      updatedAt: new Date(),
      receiptData: updates.receiptData ? JSON.stringify(updates.receiptData) : undefined,
      metadata: updates.metadata ? JSON.stringify(updates.metadata) : undefined
    });
  }

  private async getPaymentTransaction(transactionId: string): Promise<PaymentTransaction | null> {
    const dbTransaction = await this.databaseService.getPaymentTransactionById(transactionId);
    if (!dbTransaction) return null;

    return {
      id: dbTransaction.id,
      orderId: dbTransaction.orderId.toString(),
      paymentMethod: dbTransaction.paymentMethod as 'crypto' | 'fiat' | 'escrow',
      transactionHash: dbTransaction.transactionHash,
      paymentIntentId: dbTransaction.paymentIntentId,
      escrowId: dbTransaction.escrowId,
      amount: dbTransaction.amount,
      currency: dbTransaction.currency,
      status: dbTransaction.status as PaymentTransactionStatus,
      processingFee: dbTransaction.processingFee,
      platformFee: dbTransaction.platformFee,
      totalFees: dbTransaction.totalFees,
      receiptUrl: dbTransaction.receiptUrl,
      receiptData: dbTransaction.receiptData ? JSON.parse(dbTransaction.receiptData) : undefined,
      failureReason: dbTransaction.failureReason,
      retryCount: dbTransaction.retryCount,
      createdAt: dbTransaction.createdAt,
      updatedAt: dbTransaction.updatedAt,
      confirmedAt: dbTransaction.confirmedAt,
      metadata: dbTransaction.metadata ? JSON.parse(dbTransaction.metadata) : undefined
    };
  }

  private async getPaymentTransactionsByOrderId(orderId: string): Promise<PaymentTransaction[]> {
    const dbTransactions = await this.databaseService.getPaymentTransactionsByOrderId(orderId);
    return dbTransactions.map(dbTransaction => ({
      id: dbTransaction.id,
      orderId: dbTransaction.orderId.toString(),
      paymentMethod: dbTransaction.paymentMethod as 'crypto' | 'fiat' | 'escrow',
      transactionHash: dbTransaction.transactionHash,
      paymentIntentId: dbTransaction.paymentIntentId,
      escrowId: dbTransaction.escrowId,
      amount: dbTransaction.amount,
      currency: dbTransaction.currency,
      status: dbTransaction.status as PaymentTransactionStatus,
      processingFee: dbTransaction.processingFee,
      platformFee: dbTransaction.platformFee,
      totalFees: dbTransaction.totalFees,
      receiptUrl: dbTransaction.receiptUrl,
      receiptData: dbTransaction.receiptData ? JSON.parse(dbTransaction.receiptData) : undefined,
      failureReason: dbTransaction.failureReason,
      retryCount: dbTransaction.retryCount,
      createdAt: dbTransaction.createdAt,
      updatedAt: dbTransaction.updatedAt,
      confirmedAt: dbTransaction.confirmedAt,
      metadata: dbTransaction.metadata ? JSON.parse(dbTransaction.metadata) : undefined
    }));
  }

  private async updateOrderPaymentInfo(orderId: string, paymentInfo: any): Promise<void> {
    await this.databaseService.updateOrder(orderId, {
      paymentMethod: paymentInfo.paymentMethod,
      paymentDetails: paymentInfo.paymentDetails,
      paymentConfirmationHash: paymentInfo.transactionHash
    });
  }

  private async createOrderTrackingEvent(
    orderId: string,
    status: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    await this.databaseService.createOrderEvent(orderId, status, message, JSON.stringify(metadata));
  }

  private async sendBuyerNotification(
    orderId: string,
    orderStatus: string,
    paymentStatus: PaymentTransactionStatus
  ): Promise<boolean> {
    try {
      const order = await this.databaseService.getOrderById(orderId);
      if (!order) return false;

      const notificationType = this.getNotificationTypeForStatus(orderStatus, paymentStatus, 'buyer');
      if (!notificationType) return false;

      await this.notificationService.sendOrderNotification(
        order.buyerAddress || '',
        notificationType,
        orderId,
        { orderStatus, paymentStatus }
      );

      return true;
    } catch (error) {
      safeLogger.error('Error sending buyer notification:', error);
      return false;
    }
  }

  private async sendSellerNotification(
    orderId: string,
    orderStatus: string,
    paymentStatus: PaymentTransactionStatus
  ): Promise<boolean> {
    try {
      const order = await this.databaseService.getOrderById(orderId);
      if (!order) return false;

      const notificationType = this.getNotificationTypeForStatus(orderStatus, paymentStatus, 'seller');
      if (!notificationType) return false;

      await this.notificationService.sendOrderNotification(
        order.sellerAddress || '',
        notificationType,
        orderId,
        { orderStatus, paymentStatus }
      );

      return true;
    } catch (error) {
      safeLogger.error('Error sending seller notification:', error);
      return false;
    }
  }

  private getNotificationTypeForStatus(
    orderStatus: string,
    paymentStatus: PaymentTransactionStatus,
    recipient: 'buyer' | 'seller'
  ): string | null {
    const statusMap: { [key: string]: { buyer?: string; seller?: string } } = {
      'payment_pending': { buyer: 'PAYMENT_PENDING' },
      'payment_processing': { buyer: 'PAYMENT_PROCESSING' },
      'paid': { buyer: 'PAYMENT_CONFIRMED', seller: 'PAYMENT_RECEIVED' },
      'processing': { buyer: 'ORDER_PROCESSING', seller: 'ORDER_READY_TO_PROCESS' },
      'payment_failed': { buyer: 'PAYMENT_FAILED' },
      'cancelled': { buyer: 'ORDER_CANCELLED', seller: 'ORDER_CANCELLED' },
      'refunded': { buyer: 'PAYMENT_REFUNDED', seller: 'PAYMENT_REFUNDED' }
    };

    return statusMap[orderStatus]?.[recipient] || null;
  }

  private async storePaymentReceipt(receipt: PaymentReceipt): Promise<void> {
    await this.databaseService.createPaymentReceipt({
      id: receipt.id,
      transactionId: receipt.transactionId,
      orderId: receipt.orderId,
      receiptNumber: receipt.receiptNumber,
      paymentMethod: receipt.paymentMethod,
      amount: receipt.amount,
      currency: receipt.currency,
      fees: JSON.stringify(receipt.fees),
      transactionDetails: JSON.stringify(receipt.transactionDetails),
      receiptUrl: receipt.receiptUrl,
      metadata: JSON.stringify(receipt.metadata)
    });
  }

  private async getPaymentReceiptsByOrderId(orderId: string): Promise<PaymentReceipt[]> {
    const dbReceipts = await this.databaseService.getPaymentReceiptsByOrderId(orderId);
    return dbReceipts.map(dbReceipt => ({
      id: dbReceipt.id,
      transactionId: dbReceipt.transactionId,
      orderId: dbReceipt.orderId.toString(),
      receiptNumber: dbReceipt.receiptNumber,
      paymentMethod: dbReceipt.paymentMethod,
      amount: dbReceipt.amount,
      currency: dbReceipt.currency,
      fees: JSON.parse(dbReceipt.fees),
      transactionDetails: JSON.parse(dbReceipt.transactionDetails),
      timestamp: dbReceipt.createdAt,
      receiptUrl: dbReceipt.receiptUrl,
      metadata: dbReceipt.metadata ? JSON.parse(dbReceipt.metadata) : undefined
    }));
  }

  private async generateReceiptUrl(receiptNumber: string): Promise<string> {
    // Generate URL for receipt access - could be a PDF generator or web page
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/receipts/${receiptNumber}`;
  }
}
