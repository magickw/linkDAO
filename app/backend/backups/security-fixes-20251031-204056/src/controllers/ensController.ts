import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { ensService } from '../services/ensService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

export class ENSController {
  /**
   * Validate an ENS handle
   */
  async validateENS(req: Request, res: Response) {
    try {
      const { ensName } = req.body;

      if (!ensName) {
        return res.status(400).json({
          success: false,
          error: 'ENS name is required'
        });
      }

      const result = await ensService.validateENSHandleWithFallback(ensName);

      return res.json({
        success: result.isValid,
        data: result.isValid ? { address: result.address } : null,
        error: result.error
      });
    } catch (error) {
      safeLogger.error('ENS validation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error during ENS validation'
      });
    }
  }

  /**
   * Verify ENS ownership
   */
  async verifyOwnership(req: Request, res: Response) {
    try {
      const { ensName, walletAddress } = req.body;

      if (!ensName || !walletAddress) {
        return res.status(400).json({
          success: false,
          error: 'ENS name and wallet address are required'
        });
      }

      const result = await ensService.verifyENSOwnership(ensName, walletAddress);

      return res.json({
        success: result.isOwner,
        data: {
          isOwner: result.isOwner,
          actualOwner: result.actualOwner
        },
        error: result.error
      });
    } catch (error) {
      safeLogger.error('ENS ownership verification error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error during ownership verification'
      });
    }
  }

  /**
   * Check ENS availability
   */
  async checkAvailability(req: Request, res: Response) {
    try {
      const { ensName } = req.params;

      if (!ensName) {
        return res.status(400).json({
          success: false,
          error: 'ENS name is required'
        });
      }

      const result = await ensService.isENSHandleAvailable(ensName);

      return res.json({
        success: true,
        data: {
          isAvailable: result.isAvailable,
          isRegistered: result.isRegistered
        },
        error: result.error
      });
    } catch (error) {
      safeLogger.error('ENS availability check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error during availability check'
      });
    }
  }

  /**
   * Get ENS suggestions
   */
  async getSuggestions(req: Request, res: Response) {
    try {
      const { baseName } = req.params;

      if (!baseName) {
        return res.status(400).json({
          success: false,
          error: 'Base name is required'
        });
      }

      const suggestions = await ensService.suggestENSAlternatives(baseName);

      return res.json({
        success: true,
        data: { suggestions }
      });
    } catch (error) {
      safeLogger.error('ENS suggestions error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error while generating suggestions'
      });
    }
  }

  /**
   * Get ENS service status
   */
  async getServiceStatus(req: Request, res: Response) {
    try {
      const status = await ensService.getServiceStatus();

      return res.json({
        success: true,
        data: status
      });
    } catch (error) {
      safeLogger.error('ENS service status error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error while checking service status'
      });
    }
  }

  /**
   * Perform health check
   */
  async healthCheck(req: Request, res: Response) {
    try {
      const health = await ensService.healthCheck();

      return res.json({
        success: health.status === 'healthy',
        data: health
      });
    } catch (error) {
      safeLogger.error('ENS health check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error during health check'
      });
    }
  }
}

export const ensController = new ENSController();