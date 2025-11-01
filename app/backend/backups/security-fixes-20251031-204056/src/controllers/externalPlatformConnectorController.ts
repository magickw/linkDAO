import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { externalPlatformConnectorService } from '../services/externalPlatformConnectorService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { z } from 'zod';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

// Validation schemas
const PlatformConfigSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  type: z.enum(['dao_platform', 'defi_protocol', 'nft_marketplace', 'wallet', 'blockchain_explorer']),
  apiKey: z.string().optional(),
  apiUrl: z.string().url(),
  isActive: z.boolean()
});

const SyncDAODataSchema = z.object({
  platformId: z.string(),
  communityId: z.string()
});

const GetDeFiDataSchema = z.object({
  protocolId: z.string()
});

const GetNFTDataSchema = z.object({
  marketplaceId: z.string(),
  collectionId: z.string()
});

const GetWalletDataSchema = z.object({
  walletAddress: z.string()
});

const ExecuteActionSchema = z.object({
  action: z.enum(['vote', 'delegate', 'propose', 'stake']),
  platformId: z.string(),
  params: z.record(z.any())
});

const TriggerSyncSchema = z.object({
  platformId: z.string()
});

export class ExternalPlatformConnectorController {
  
  /**
   * Get all platform configurations
   */
  async getPlatformConfigs(req: Request, res: Response): Promise<void> {
    try {
      const configs = await externalPlatformConnectorService.getPlatformConfigs();
      
      res.json({
        success: true,
        data: configs,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error retrieving platform configurations:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving platform configurations'
      });
    }
  }

  /**
   * Get a specific platform configuration
   */
  async getPlatformConfig(req: Request, res: Response): Promise<void> {
    try {
      const { platformId } = req.params;
      
      if (!platformId) {
        res.status(400).json({
          success: false,
          error: 'Platform ID is required'
        });
        return;
      }
      
      const config = await externalPlatformConnectorService.getPlatformConfig(platformId);
      
      if (!config) {
        res.status(404).json({
          success: false,
          error: 'Platform configuration not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: config,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error retrieving platform configuration:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving platform configuration'
      });
    }
  }

  /**
   * Update platform configuration
   */
  async updatePlatformConfig(req: Request, res: Response): Promise<void> {
    try {
      const { platformId } = req.params;
      
      if (!platformId) {
        res.status(400).json({
          success: false,
          error: 'Platform ID is required'
        });
        return;
      }
      
      const validatedInput = PlatformConfigSchema.parse(req.body);
      
      const updatedConfig = await externalPlatformConnectorService.updatePlatformConfig(
        platformId,
        validatedInput
      );
      
      if (!updatedConfig) {
        res.status(404).json({
          success: false,
          error: 'Platform configuration not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: updatedConfig,
        message: 'Platform configuration updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error updating platform configuration:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error updating platform configuration'
      });
    }
  }

  /**
   * Sync DAO data from external platform
   */
  async syncDAOData(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = SyncDAODataSchema.parse(req.body);
      
      const syncData = await externalPlatformConnectorService.syncDAOData(
        validatedInput.platformId,
        validatedInput.communityId
      );
      
      if (!syncData) {
        res.status(500).json({
          success: false,
          error: 'Failed to sync DAO data'
        });
        return;
      }
      
      res.json({
        success: true,
        data: syncData,
        message: 'DAO data synced successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error syncing DAO data:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error syncing DAO data'
      });
    }
  }

  /**
   * Get DeFi protocol data
   */
  async getDeFiProtocolData(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = GetDeFiDataSchema.parse(req.body);
      
      const defiData = await externalPlatformConnectorService.getDeFiProtocolData(
        validatedInput.protocolId
      );
      
      if (!defiData) {
        res.status(500).json({
          success: false,
          error: 'Failed to get DeFi protocol data'
        });
        return;
      }
      
      res.json({
        success: true,
        data: defiData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error getting DeFi protocol data:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error getting DeFi protocol data'
      });
    }
  }

  /**
   * Get NFT marketplace data
   */
  async getNFTMarketplaceData(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = GetNFTDataSchema.parse(req.body);
      
      const nftData = await externalPlatformConnectorService.getNFTMarketplaceData(
        validatedInput.marketplaceId,
        validatedInput.collectionId
      );
      
      if (!nftData) {
        res.status(500).json({
          success: false,
          error: 'Failed to get NFT marketplace data'
        });
        return;
      }
      
      res.json({
        success: true,
        data: nftData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error getting NFT marketplace data:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error getting NFT marketplace data'
      });
    }
  }

  /**
   * Get wallet data
   */
  async getWalletData(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = GetWalletDataSchema.parse(req.body);
      
      const walletData = await externalPlatformConnectorService.getWalletData(
        validatedInput.walletAddress
      );
      
      if (!walletData) {
        res.status(500).json({
          success: false,
          error: 'Failed to get wallet data'
        });
        return;
      }
      
      res.json({
        success: true,
        data: walletData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error getting wallet data:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error getting wallet data'
      });
    }
  }

  /**
   * Get blockchain explorer data
   */
  async getBlockchainExplorerData(req: Request, res: Response): Promise<void> {
    try {
      const { blockNumber } = req.query;
      
      const explorerData = await externalPlatformConnectorService.getBlockchainExplorerData(
        blockNumber ? parseInt(blockNumber as string, 10) : undefined
      );
      
      if (!explorerData) {
        res.status(500).json({
          success: false,
          error: 'Failed to get blockchain explorer data'
        });
        return;
      }
      
      res.json({
        success: true,
        data: explorerData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error getting blockchain explorer data:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error getting blockchain explorer data'
      });
    }
  }

  /**
   * Execute cross-platform action
   */
  async executeCrossPlatformAction(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = ExecuteActionSchema.parse(req.body);
      
      const result = await externalPlatformConnectorService.executeCrossPlatformAction(
        validatedInput.action,
        validatedInput.platformId,
        validatedInput.params
      );
      
      if (result.success) {
        res.json({
          success: true,
          data: result,
          message: `Cross-platform action ${validatedInput.action} executed successfully`,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to execute cross-platform action'
        });
      }

    } catch (error) {
      safeLogger.error('Error executing cross-platform action:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error executing cross-platform action'
      });
    }
  }

  /**
   * Get synchronization status for all platforms
   */
  async getSyncStatus(req: Request, res: Response): Promise<void> {
    try {
      const syncStatus = await externalPlatformConnectorService.getSyncStatus();
      
      res.json({
        success: true,
        data: syncStatus,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error getting sync status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error getting sync status'
      });
    }
  }

  /**
   * Trigger manual synchronization for a platform
   */
  async triggerManualSync(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = TriggerSyncSchema.parse(req.body);
      
      const success = await externalPlatformConnectorService.triggerManualSync(
        validatedInput.platformId
      );
      
      if (success) {
        res.json({
          success: true,
          message: 'Manual synchronization triggered successfully',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to trigger manual synchronization'
        });
      }

    } catch (error) {
      safeLogger.error('Error triggering manual sync:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error triggering manual synchronization'
      });
    }
  }

  /**
   * Health check endpoint for the external platform connector service
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus = {
        service: 'external-platform-connector',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        dependencies: {
          externalPlatformConnectorService: 'healthy',
          database: 'healthy'
        }
      };
      
      res.json({
        success: true,
        data: healthStatus
      });

    } catch (error) {
      safeLogger.error('Error in health check:', error);
      res.status(503).json({
        success: false,
        error: 'Service unhealthy',
        timestamp: new Date().toISOString()
      });
    }
  }
}

export const externalPlatformConnectorController = new ExternalPlatformConnectorController();