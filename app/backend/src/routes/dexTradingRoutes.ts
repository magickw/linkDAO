import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { body, query, param } from 'express-validator';
import { DEXTradingController } from '../controllers/dexTradingController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const dexTradingController = new DEXTradingController();

// Validation middleware
const swapQuoteValidation = [
  body('tokenInAddress')
    .isEthereumAddress()
    .withMessage('Invalid token in address'),
  body('tokenOutAddress')
    .isEthereumAddress()
    .withMessage('Invalid token out address'),
  body('amountIn')
    .isNumeric()
    .withMessage('Amount in must be a number')
    .custom((value) => {
      if (parseFloat(value) <= 0) {
        throw new Error('Amount in must be greater than 0');
      }
      return true;
    }),
  body('slippageTolerance')
    .optional()
    .isFloat({ min: 0.1, max: 50 })
    .withMessage('Slippage tolerance must be between 0.1% and 50%'),
  body('recipient')
    .optional()
    .isEthereumAddress()
    .withMessage('Invalid recipient address')
];

const tokenPriceValidation = [
  query('tokenInAddress')
    .isEthereumAddress()
    .withMessage('Invalid token in address'),
  query('tokenOutAddress')
    .isEthereumAddress()
    .withMessage('Invalid token out address'),
  query('amountIn')
    .optional()
    .isNumeric()
    .withMessage('Amount in must be a number')
];

const liquidityValidation = [
  query('tokenA')
    .isEthereumAddress()
    .withMessage('Invalid token A address'),
  query('tokenB')
    .isEthereumAddress()
    .withMessage('Invalid token B address'),
  query('fee')
    .optional()
    .isInt({ min: 100, max: 10000 })
    .withMessage('Fee must be between 100 and 10000')
];

const tokenValidation = [
  param('tokenAddress')
    .isEthereumAddress()
    .withMessage('Invalid token address')
];

// Routes

/**
 * @route POST /api/dex/quote
 * @desc Get swap quote for token pair
 * @access Private
 */
router.post('/quote', csrfProtection,  authMiddleware, swapQuoteValidation, async (req, res) => {
  await dexTradingController.getSwapQuote(req, res);
});

/**
 * @route GET /api/dex/price
 * @desc Get real-time price for token pair
 * @access Public
 */
router.get('/price', tokenPriceValidation, async (req, res) => {
  await dexTradingController.getTokenPrice(req, res);
});

/**
 * @route GET /api/dex/liquidity
 * @desc Get liquidity information for token pair
 * @access Public
 */
router.get('/liquidity', liquidityValidation, async (req, res) => {
  await dexTradingController.getLiquidityInfo(req, res);
});

/**
 * @route POST /api/dex/liquidity/monitor
 * @desc Monitor multiple liquidity pools
 * @access Private
 */
router.post('/liquidity/monitor', csrfProtection,  authMiddleware, [
  body('tokenPairs')
    .isArray({ min: 1 })
    .withMessage('Token pairs must be a non-empty array'),
  body('tokenPairs.*.tokenA')
    .isEthereumAddress()
    .withMessage('Invalid token A address'),
  body('tokenPairs.*.tokenB')
    .isEthereumAddress()
    .withMessage('Invalid token B address'),
  body('tokenPairs.*.fee')
    .isInt({ min: 100, max: 10000 })
    .withMessage('Fee must be between 100 and 10000')
], async (req, res) => {
  await dexTradingController.monitorLiquidityPools(req, res);
});

/**
 * @route POST /api/dex/gas-estimate
 * @desc Get gas estimate for swap
 * @access Private
 */
router.post('/gas-estimate', csrfProtection,  authMiddleware, [
  body('tokenInAddress')
    .isEthereumAddress()
    .withMessage('Invalid token in address'),
  body('tokenOutAddress')
    .isEthereumAddress()
    .withMessage('Invalid token out address'),
  body('amountIn')
    .isNumeric()
    .withMessage('Amount in must be a number')
], async (req, res) => {
  await dexTradingController.getGasEstimate(req, res);
});

/**
 * @route POST /api/dex/alternatives
 * @desc Get alternative DEX routes
 * @access Private
 */
router.post('/alternatives', csrfProtection,  authMiddleware, swapQuoteValidation, async (req, res) => {
  await dexTradingController.getAlternativeRoutes(req, res);
});

/**
 * @route GET /api/dex/validate/:tokenAddress
 * @desc Validate token address and get token info
 * @access Public
 */
router.get('/validate/:tokenAddress', tokenValidation, async (req, res) => {
  await dexTradingController.validateToken(req, res);
});

/**
 * @route POST /api/dex/switch-network
 * @desc Switch to a different blockchain network
 * @access Private
 */
router.post('/switch-network', csrfProtection,  authMiddleware, [
  body('chainId')
    .isInt({ min: 1 })
    .withMessage('Valid chain ID is required')
], async (req, res) => {
  await dexTradingController.switchNetwork(req, res);
});

/**
 * @route GET /api/dex/networks
 * @desc Get all supported blockchain networks
 * @access Public
 */
router.get('/networks', async (req, res) => {
  await dexTradingController.getSupportedNetworks(req, res);
});

/**
 * @route POST /api/dex/compare-chains
 * @desc Compare prices across multiple chains
 * @access Private
 */
router.post('/compare-chains', csrfProtection,  authMiddleware, [
  body('tokenInAddress')
    .isEthereumAddress()
    .withMessage('Invalid token in address'),
  body('tokenOutAddress')
    .isEthereumAddress()
    .withMessage('Invalid token out address'),
  body('amountIn')
    .isNumeric()
    .withMessage('Amount in must be a number'),
  body('chainIds')
    .optional()
    .isArray()
    .withMessage('Chain IDs must be an array')
], async (req, res) => {
  await dexTradingController.compareChainPrices(req, res);
});

/**
 * @route POST /api/dex/cross-chain-quote
 * @desc Get cross-chain swap quote
 * @access Private
 */
router.post('/cross-chain-quote', csrfProtection,  authMiddleware, [
  body('sourceChain')
    .isInt({ min: 1 })
    .withMessage('Valid source chain ID is required'),
  body('targetChain')
    .isInt({ min: 1 })
    .withMessage('Valid target chain ID is required'),
  body('tokenInAddress')
    .isEthereumAddress()
    .withMessage('Invalid token in address'),
  body('tokenOutAddress')
    .isEthereumAddress()
    .withMessage('Invalid token out address'),
  body('amountIn')
    .isNumeric()
    .withMessage('Amount in must be a number')
], async (req, res) => {
  await dexTradingController.getCrossChainQuote(req, res);
});

/**
 * @route GET /api/dex/gas-fees
 * @desc Get network-specific gas fees
 * @access Public
 */
router.get('/gas-fees', [
  query('chainId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Chain ID must be a valid integer')
], async (req, res) => {
  await dexTradingController.getNetworkGasFees(req, res);
});

/**
 * @route POST /api/dex/best-chain
 * @desc Get best chain for a specific swap
 * @access Private
 */
router.post('/best-chain', csrfProtection,  authMiddleware, [
  body('tokenInAddress')
    .isEthereumAddress()
    .withMessage('Invalid token in address'),
  body('tokenOutAddress')
    .isEthereumAddress()
    .withMessage('Invalid token out address'),
  body('amountIn')
    .isNumeric()
    .withMessage('Amount in must be a number')
], async (req, res) => {
  await dexTradingController.getBestChainForSwap(req, res);
});

export default router;
