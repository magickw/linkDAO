import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { body, query, param } from 'express-validator';
import { csrfProtection } from '../middleware/csrfProtection';
import { AdvancedTradingController } from '../controllers/advancedTradingController';
import { csrfProtection } from '../middleware/csrfProtection';
import { authMiddleware } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();
const advancedTradingController = new AdvancedTradingController();

// Validation middleware
const limitOrderValidation = [
  body('tokenInAddress').isEthereumAddress().withMessage('Invalid token in address'),
  body('tokenInSymbol').isString().withMessage('Token in symbol is required'),
  body('tokenInDecimals').isInt({ min: 0, max: 18 }).withMessage('Invalid token in decimals'),
  body('tokenInName').isString().withMessage('Token in name is required'),
  body('tokenOutAddress').isEthereumAddress().withMessage('Invalid token out address'),
  body('tokenOutSymbol').isString().withMessage('Token out symbol is required'),
  body('tokenOutDecimals').isInt({ min: 0, max: 18 }).withMessage('Invalid token out decimals'),
  body('tokenOutName').isString().withMessage('Token out name is required'),
  body('amountIn').isNumeric().withMessage('Amount in must be a number'),
  body('targetPrice').isNumeric().withMessage('Target price must be a number'),
  body('slippageTolerance').optional().isFloat({ min: 0.1, max: 50 }).withMessage('Invalid slippage tolerance'),
  body('chainId').optional().isInt({ min: 1 }).withMessage('Invalid chain ID'),
  body('expirationHours').optional().isInt({ min: 1, max: 168 }).withMessage('Expiration must be between 1-168 hours')
];

const priceAlertValidation = [
  body('tokenInAddress').isEthereumAddress().withMessage('Invalid token in address'),
  body('tokenInSymbol').isString().withMessage('Token in symbol is required'),
  body('tokenInDecimals').isInt({ min: 0, max: 18 }).withMessage('Invalid token in decimals'),
  body('tokenInName').isString().withMessage('Token in name is required'),
  body('tokenOutAddress').isEthereumAddress().withMessage('Invalid token out address'),
  body('tokenOutSymbol').isString().withMessage('Token out symbol is required'),
  body('tokenOutDecimals').isInt({ min: 0, max: 18 }).withMessage('Invalid token out decimals'),
  body('tokenOutName').isString().withMessage('Token out name is required'),
  body('targetPrice').isNumeric().withMessage('Target price must be a number'),
  body('condition').isIn(['above', 'below']).withMessage('Condition must be above or below'),
  body('chainId').optional().isInt({ min: 1 }).withMessage('Invalid chain ID')
];

// Limit Order Routes

/**
 * @route POST /api/advanced-trading/limit-orders
 * @desc Create a limit order
 * @access Private
 */
router.post('/limit-orders', csrfProtection,  authMiddleware, limitOrderValidation, async (req, res) => {
  await advancedTradingController.createLimitOrder(req, res);
});

/**
 * @route DELETE /api/advanced-trading/limit-orders/:orderId
 * @desc Cancel a limit order
 * @access Private
 */
router.delete('/limit-orders/:orderId', csrfProtection,  authMiddleware, [
  param('orderId').isString().withMessage('Order ID is required')
], async (req, res) => {
  await advancedTradingController.cancelLimitOrder(req, res);
});

/**
 * @route GET /api/advanced-trading/limit-orders
 * @desc Get user's limit orders
 * @access Private
 */
router.get('/limit-orders', authMiddleware, [
  query('status').optional().isIn(['pending', 'filled', 'cancelled', 'expired']).withMessage('Invalid status')
], async (req, res) => {
  await advancedTradingController.getUserLimitOrders(req, res);
});

// Price Alert Routes

/**
 * @route POST /api/advanced-trading/price-alerts
 * @desc Create a price alert
 * @access Private
 */
router.post('/price-alerts', csrfProtection,  authMiddleware, priceAlertValidation, async (req, res) => {
  await advancedTradingController.createPriceAlert(req, res);
});

/**
 * @route DELETE /api/advanced-trading/price-alerts/:alertId
 * @desc Remove a price alert
 * @access Private
 */
router.delete('/price-alerts/:alertId', csrfProtection,  authMiddleware, [
  param('alertId').isString().withMessage('Alert ID is required')
], async (req, res) => {
  await advancedTradingController.removePriceAlert(req, res);
});

/**
 * @route GET /api/advanced-trading/price-alerts
 * @desc Get user's price alerts
 * @access Private
 */
router.get('/price-alerts', authMiddleware, [
  query('isActive').optional().isBoolean().withMessage('isActive must be boolean')
], async (req, res) => {
  await advancedTradingController.getUserPriceAlerts(req, res);
});

// Portfolio Routes

/**
 * @route POST /api/advanced-trading/portfolio/update
 * @desc Update user's portfolio
 * @access Private
 */
router.post('/portfolio/update', csrfProtection,  authMiddleware, [
  body('walletAddress').isEthereumAddress().withMessage('Valid wallet address is required'),
  body('chainId').optional().isInt({ min: 1 }).withMessage('Invalid chain ID')
], async (req, res) => {
  await advancedTradingController.updatePortfolio(req, res);
});

/**
 * @route GET /api/advanced-trading/portfolio
 * @desc Get user's portfolio
 * @access Private
 */
router.get('/portfolio', authMiddleware, async (req, res) => {
  await advancedTradingController.getUserPortfolio(req, res);
});

// Trading History Routes

/**
 * @route GET /api/advanced-trading/history
 * @desc Get user's trading history
 * @access Private
 */
router.get('/history', authMiddleware, [
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1-1000')
], async (req, res) => {
  await advancedTradingController.getTradingHistory(req, res);
});

/**
 * @route GET /api/advanced-trading/tax-report/:year
 * @desc Generate tax report for a specific year
 * @access Private
 */
router.get('/tax-report/:year', authMiddleware, [
  param('year').isInt({ min: 2020, max: 2030 }).withMessage('Valid year is required')
], async (req, res) => {
  await advancedTradingController.generateTaxReport(req, res);
});

// Analytics Routes

/**
 * @route GET /api/advanced-trading/analytics
 * @desc Get performance analytics
 * @access Private
 */
router.get('/analytics', authMiddleware, [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1-365')
], async (req, res) => {
  await advancedTradingController.getPerformanceAnalytics(req, res);
});

export default router;