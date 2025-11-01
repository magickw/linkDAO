import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { externalPlatformConnectorController } from '../controllers/externalPlatformConnectorController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Health check endpoint (no admin required)
router.get('/health', externalPlatformConnectorController.healthCheck);

// Admin-only routes for external platform connectors
router.use(adminAuthMiddleware);

// Apply rate limiting for external platform operations
const externalPlatformRateLimit = rateLimitingMiddleware({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 requests per minute per user
  message: 'Too many external platform requests'
});

router.use(externalPlatformRateLimit);

/**
 * @route GET /api/external-platform/configs
 * @desc Get all platform configurations
 * @access Admin
 */
router.get('/configs', externalPlatformConnectorController.getPlatformConfigs);

/**
 * @route GET /api/external-platform/configs/:platformId
 * @desc Get a specific platform configuration
 * @access Admin
 * @param platformId - ID of the platform configuration to retrieve
 */
router.get('/configs/:platformId', externalPlatformConnectorController.getPlatformConfig);

/**
 * @route PUT /api/external-platform/configs/:platformId
 * @desc Update platform configuration
 * @access Admin
 * @param platformId - ID of the platform configuration to update
 * @body PlatformConfigSchema
 */
router.put('/configs/:platformId', csrfProtection,  externalPlatformConnectorController.updatePlatformConfig);

/**
 * @route POST /api/external-platform/sync-dao
 * @desc Sync DAO data from external platform
 * @access Admin
 * @body SyncDAODataSchema
 */
router.post('/sync-dao', csrfProtection,  externalPlatformConnectorController.syncDAOData);

/**
 * @route POST /api/external-platform/defi-data
 * @desc Get DeFi protocol data
 * @access Admin
 * @body GetDeFiDataSchema
 */
router.post('/defi-data', csrfProtection,  externalPlatformConnectorController.getDeFiProtocolData);

/**
 * @route POST /api/external-platform/nft-data
 * @desc Get NFT marketplace data
 * @access Admin
 * @body GetNFTDataSchema
 */
router.post('/nft-data', csrfProtection,  externalPlatformConnectorController.getNFTMarketplaceData);

/**
 * @route POST /api/external-platform/wallet-data
 * @desc Get wallet data
 * @access Admin
 * @body GetWalletDataSchema
 */
router.post('/wallet-data', csrfProtection,  externalPlatformConnectorController.getWalletData);

/**
 * @route GET /api/external-platform/explorer-data
 * @desc Get blockchain explorer data
 * @access Admin
 * @query blockNumber - Optional block number to get data for
 */
router.get('/explorer-data', externalPlatformConnectorController.getBlockchainExplorerData);

/**
 * @route POST /api/external-platform/execute-action
 * @desc Execute cross-platform action
 * @access Admin
 * @body ExecuteActionSchema
 */
router.post('/execute-action', csrfProtection,  externalPlatformConnectorController.executeCrossPlatformAction);

/**
 * @route GET /api/external-platform/sync-status
 * @desc Get synchronization status for all platforms
 * @access Admin
 */
router.get('/sync-status', externalPlatformConnectorController.getSyncStatus);

/**
 * @route POST /api/external-platform/trigger-sync
 * @desc Trigger manual synchronization for a platform
 * @access Admin
 * @body TriggerSyncSchema
 */
router.post('/trigger-sync', csrfProtection,  externalPlatformConnectorController.triggerManualSync);

export default router;
