import { Router } from 'express';
import { OrderPaymentIntegrationController } from '../controllers/orderPaymentIntegrationController';

const router = Router();
const orderPaymentIntegrationController = new OrderPaymentIntegrationController();

/**
 * @route POST /api/orders/:orderId/payment-transactions
 * @desc Create payment transaction for an order
 * @access Private
 */
router.post(
  '/:orderId/payment-transactions',
  orderPaymentIntegrationController.createPaymentTransaction.bind(orderPaymentIntegrationController)
);

/**
 * @route PUT /api/orders/payment-transactions/:transactionId/status
 * @desc Update payment transaction status
 * @access Private
 */
router.put(
  '/payment-transactions/:transactionId/status',
  orderPaymentIntegrationController.updatePaymentTransactionStatus.bind(orderPaymentIntegrationController)
);

/**
 * @route GET /api/orders/:orderId/payment-status
 * @desc Get comprehensive order payment status
 * @access Private
 */
router.get(
  '/:orderId/payment-status',
  orderPaymentIntegrationController.getOrderPaymentStatus.bind(orderPaymentIntegrationController)
);

/**
 * @route GET /api/orders/:orderId/payment-transactions
 * @desc Get all payment transactions for an order
 * @access Private
 */
router.get(
  '/:orderId/payment-transactions',
  orderPaymentIntegrationController.getOrderPaymentTransactions.bind(orderPaymentIntegrationController)
);

/**
 * @route GET /api/orders/:orderId/payment-receipts
 * @desc Get all payment receipts for an order
 * @access Private
 */
router.get(
  '/:orderId/payment-receipts',
  orderPaymentIntegrationController.getOrderPaymentReceipts.bind(orderPaymentIntegrationController)
);

/**
 * @route POST /api/orders/payment-transactions/:transactionId/receipt
 * @desc Generate payment receipt for a transaction
 * @access Private
 */
router.post(
  '/payment-transactions/:transactionId/receipt',
  orderPaymentIntegrationController.generatePaymentReceipt.bind(orderPaymentIntegrationController)
);

/**
 * @route POST /api/orders/:orderId/payment/retry
 * @desc Retry failed payment for an order
 * @access Private
 */
router.post(
  '/:orderId/payment/retry',
  orderPaymentIntegrationController.retryPayment.bind(orderPaymentIntegrationController)
);

/**
 * @route POST /api/orders/:orderId/payment/refund
 * @desc Process refund for an order
 * @access Private
 */
router.post(
  '/:orderId/payment/refund',
  orderPaymentIntegrationController.processRefund.bind(orderPaymentIntegrationController)
);

/**
 * @route POST /api/orders/:orderId/payment/sync
 * @desc Manually sync order with payment status
 * @access Private
 */
router.post(
  '/:orderId/payment/sync',
  orderPaymentIntegrationController.syncOrderWithPaymentStatus.bind(orderPaymentIntegrationController)
);

/**
 * @route POST /api/orders/payment/monitor-blockchain
 * @desc Start monitoring blockchain transaction
 * @access Private
 */
router.post(
  '/payment/monitor-blockchain',
  orderPaymentIntegrationController.monitorBlockchainTransaction.bind(orderPaymentIntegrationController)
);

/**
 * @route POST /api/orders/payment/webhook
 * @desc Handle payment webhooks from various providers
 * @access Public (with proper validation)
 */
router.post(
  '/payment/webhook',
  orderPaymentIntegrationController.handlePaymentWebhook.bind(orderPaymentIntegrationController)
);

export default router;