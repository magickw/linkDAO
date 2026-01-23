import { Router } from 'express';
import { DexController } from '../controllers/dexController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();
const dexController = new DexController();

// Validation schemas for the custom validation middleware
const quoteSchema = {
    body: {
        tokenInAddress: { type: 'string', required: true, pattern: '^0x[a-fA-F0-9]{40}$' },
        tokenOutAddress: { type: 'string', required: true, pattern: '^0x[a-fA-F0-9]{40}$' },
        amountIn: { type: 'string', required: true },
        chainId: { type: 'number', optional: true },
        slippageTolerance: { type: 'number', optional: true }
    }
};

const buildTxSchema = {
    body: {
        tokenInAddress: { type: 'string', required: true, pattern: '^0x[a-fA-F0-9]{40}$' },
        tokenOutAddress: { type: 'string', required: true, pattern: '^0x[a-fA-F0-9]{40}$' },
        amountIn: { type: 'string', required: true },
        recipient: { type: 'string', required: true, pattern: '^0x[a-fA-F0-9]{40}$' },
        chainId: { type: 'number', optional: true },
        slippageTolerance: { type: 'number', optional: true }
    }
};

// Routes
router.post(
    '/quote',
    authenticateToken,
    validateRequest(quoteSchema),
    (req, res) => dexController.getQuote(req, res)
);

router.post(
    '/build-tx',
    authenticateToken,
    validateRequest(buildTxSchema),
    (req, res) => dexController.buildTransaction(req, res)
);

router.get(
    '/popular-tokens',
    authenticateToken,
    (req, res) => dexController.getPopularTokens(req, res)
);

export default router;
