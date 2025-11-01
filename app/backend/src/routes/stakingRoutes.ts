import { Router } from 'express';
import { param, query } from 'express-validator';
import { StakingController } from '../controllers/stakingController';
import { Pool } from 'pg';

// This would be injected in a real implementation
const db = new Pool({
  connectionString: process.env.DATABASE_URL
});

const router = Router();
const stakingController = new StakingController(db);

// Validation middleware
const addressValidation = [
  param('address')
    .isEthereumAddress()
    .withMessage('Invalid wallet address')
];

const poolIdValidation = [
  param('poolId')
    .isInt({ min: 1 })
    .withMessage('Invalid pool ID')
];

// Routes

/**
 * @route GET /api/staking/pools
 * @desc Get available staking pools
 * @access Public
 */
router.get('/pools', async (req, res) => {
  await stakingController.getStakingPools(req, res);
});

/**
 * @route GET /api/staking/user/:address
 * @desc Get user staking information
 * @access Public
 */
router.get('/user/:address', addressValidation, async (req, res) => {
  await stakingController.getUserStakingInfo(req, res);
});

/**
 * @route GET /api/staking/pool/:poolId/apr
 * @desc Get pool APR
 * @access Public
 */
router.get('/pool/:poolId/apr', poolIdValidation, async (req, res) => {
  await stakingController.getPoolAPR(req, res);
});

/**
 * @route GET /api/staking/pool/:poolId/tvl
 * @desc Get pool TVL
 * @access Public
 */
router.get('/pool/:poolId/tvl', poolIdValidation, async (req, res) => {
  await stakingController.getPoolTVL(req, res);
});

export default router;
