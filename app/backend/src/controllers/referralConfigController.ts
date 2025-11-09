import { Request, Response } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { referralConfigService } from '../services/referralConfigService';
import { z } from 'zod';

// Validation schemas
const updateConfigSchema = z.object({
  configValue: z.union([z.string(), z.number(), z.boolean(), z.record(z.any())])
});

const getSettingsSchema = z.object({
  includeInactive: z.boolean().optional().default(false)
});

export class ReferralConfigController {
  /**
   * Get all referral configuration
   */
  async getAllConfig(req: Request, res: Response) {
    try {
      const config = await referralConfigService.getAllConfig();
      
      res.json({
        success: true,
        data: {
          config
        }
      });
    } catch (error) {
      safeLogger.error('Error getting referral config:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get referral program settings
   */
  async getProgramSettings(req: Request, res: Response) {
    try {
      const settings = await referralConfigService.getProgramSettings();
      
      res.json({
        success: true,
        data: {
          settings
        }
      });
    } catch (error) {
      safeLogger.error('Error getting referral program settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update a configuration value
   */
  async updateConfig(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const { configValue } = updateConfigSchema.parse(req.body);

      if (!key) {
        return res.status(400).json({ error: 'Config key is required' });
      }

      const success = await referralConfigService.updateConfigValue(key, configValue);

      if (!success) {
        return res.status(404).json({ error: 'Config key not found' });
      }

      // Clear cache for this key
      referralConfigService.clearCache(key);

      res.json({
        success: true,
        message: 'Configuration updated successfully'
      });
    } catch (error) {
      safeLogger.error('Error updating referral config:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: error.errors
        });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get referral program status
   */
  async getProgramStatus(req: Request, res: Response) {
    try {
      const isActive = await referralConfigService.isProgramActive();
      const codeLength = await referralConfigService.getReferralCodeLength();
      const milestoneRewards = await referralConfigService.getMilestoneRewards();

      res.json({
        success: true,
        data: {
          isActive,
          codeLength,
          milestoneRewards
        }
      });
    } catch (error) {
      safeLogger.error('Error getting referral program status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const referralConfigController = new ReferralConfigController();