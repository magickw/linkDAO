import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Pool } from 'pg';

export class StakingController {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Get available staking pools
   */
  async getStakingPools(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.db.query(`
        SELECT 
          id,
          name,
          lock_period,
          base_apr_rate,
          premium_bonus_rate,
          min_stake_amount,
          max_stake_amount,
          is_active,
          allows_auto_compound,
          early_withdrawal_penalty,
          created_at,
          updated_at
        FROM staking_tiers
        WHERE is_active = true
        ORDER BY base_apr_rate DESC
      `);

      const pools = result.rows.map(row => ({
        id: row.id.toString(),
        name: row.name,
        token: 'LDAO',
        apy: row.base_apr_rate / 100, // Convert basis points to percentage
        tvl: 0, // Would need to calculate from positions
        minStake: parseFloat(row.min_stake_amount) / 1e18, // Convert from wei
        lockPeriod: row.lock_period === 0 ? 'Flexible' : `${row.lock_period / 86400} days`,
        risk: row.lock_period === 0 ? 'low' : row.lock_period < 2592000 ? 'medium' : 'high',
        contractAddress: '0x0000000000000000000000000000000000000000', // Placeholder
        rewardsToken: 'LDAO',
        rewardRate: row.base_apr_rate / 10000 // Convert basis points to decimal
      }));

      res.json({
        success: true,
        data: pools
      });
    } catch (error) {
      console.error('Error getting staking pools:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get staking pools',
        error: error.message
      });
    }
  }

  /**
   * Get user staking information
   */
  async getUserStakingInfo(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;

      if (!address) {
        res.status(400).json({
          success: false,
          message: 'Wallet address is required'
        });
        return;
      }

      // Get user staking info
      const userInfoResult = await this.db.query(
        'SELECT * FROM user_staking_info WHERE wallet_address = $1',
        [address]
      );

      if (userInfoResult.rows.length === 0) {
        res.json({
          success: true,
          data: []
        });
        return;
      }

      const userInfo = userInfoResult.rows[0];

      // Get user staking positions
      const positionsResult = await this.db.query(
        `SELECT 
          sp.*,
          st.name as tier_name,
          st.lock_period as tier_lock_period
        FROM staking_positions sp
        JOIN staking_tiers st ON sp.tier_id = st.id
        WHERE sp.wallet_address = $1 AND sp.is_active = true`,
        [address]
      );

      const positions = positionsResult.rows.map(row => ({
        poolId: row.tier_id.toString(),
        stakedAmount: parseFloat(row.amount) / 1e18, // Convert from wei
        rewards: parseFloat(row.accumulated_rewards) / 1e18, // Convert from wei
        unlockTime: row.lock_period > 0 ? new Date(row.start_time).getTime() + (row.lock_period * 1000) : undefined,
        isActive: row.is_active
      }));

      res.json({
        success: true,
        data: positions
      });
    } catch (error) {
      console.error('Error getting user staking info:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user staking info',
        error: error.message
      });
    }
  }

  /**
   * Get pool APR
   */
  async getPoolAPR(req: Request, res: Response): Promise<void> {
    try {
      const { poolId } = req.params;

      const result = await this.db.query(
        'SELECT base_apr_rate FROM staking_tiers WHERE id = $1 AND is_active = true',
        [poolId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Pool not found'
        });
        return;
      }

      const apr = result.rows[0].base_apr_rate / 100; // Convert basis points to percentage

      res.json({
        success: true,
        data: {
          apr
        }
      });
    } catch (error) {
      console.error('Error getting pool APR:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get pool APR',
        error: error.message
      });
    }
  }

  /**
   * Get pool TVL
   */
  async getPoolTVL(req: Request, res: Response): Promise<void> {
    try {
      const { poolId } = req.params;

      const result = await this.db.query(
        `SELECT SUM(CAST(amount AS NUMERIC)) as total_staked 
         FROM staking_positions 
         WHERE tier_id = $1 AND is_active = true`,
        [poolId]
      );

      const tvl = result.rows[0]?.total_staked ? parseFloat(result.rows[0].total_staked) / 1e18 : 0;

      res.json({
        success: true,
        data: {
          tvl
        }
      });
    } catch (error) {
      console.error('Error getting pool TVL:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get pool TVL',
        error: error.message
      });
    }
  }
}