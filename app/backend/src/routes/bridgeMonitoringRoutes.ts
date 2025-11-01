import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { BridgeMonitoringController } from '../controllers/bridgeMonitoringController';
import { BridgeMonitoringService } from '../services/bridgeMonitoringService';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

// Initialize bridge monitoring service with chain configurations
const chainConfigs = [
  {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key',
    bridgeAddress: process.env.ETHEREUM_BRIDGE_ADDRESS || '0x0000000000000000000000000000000000000000',
    validatorAddress: process.env.ETHEREUM_VALIDATOR_ADDRESS || '0x0000000000000000000000000000000000000000',
    startBlock: parseInt(process.env.ETHEREUM_START_BLOCK || '0'),
    isActive: process.env.ETHEREUM_BRIDGE_ACTIVE === 'true'
  },
  {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/your-api-key',
    bridgeAddress: process.env.POLYGON_BRIDGE_ADDRESS || '0x0000000000000000000000000000000000000000',
    validatorAddress: process.env.POLYGON_VALIDATOR_ADDRESS || '0x0000000000000000000000000000000000000000',
    startBlock: parseInt(process.env.POLYGON_START_BLOCK || '0'),
    isActive: process.env.POLYGON_BRIDGE_ACTIVE === 'true'
  },
  {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb-mainnet.g.alchemy.com/v2/your-api-key',
    bridgeAddress: process.env.ARBITRUM_BRIDGE_ADDRESS || '0x0000000000000000000000000000000000000000',
    validatorAddress: process.env.ARBITRUM_VALIDATOR_ADDRESS || '0x0000000000000000000000000000000000000000',
    startBlock: parseInt(process.env.ARBITRUM_START_BLOCK || '0'),
    isActive: process.env.ARBITRUM_BRIDGE_ACTIVE === 'true'
  }
];

const bridgeMonitoringService = new BridgeMonitoringService(chainConfigs);
const bridgeMonitoringController = new BridgeMonitoringController(bridgeMonitoringService);

const router = Router();

// Public routes (read-only access to bridge data)
router.get('/transactions', bridgeMonitoringController.getBridgeTransactions);
router.get('/transactions/:nonce', bridgeMonitoringController.getBridgeTransaction);
router.get('/transactions/:transactionId/events', bridgeMonitoringController.getBridgeEvents);
router.get('/metrics', bridgeMonitoringController.getBridgeMetrics);
router.get('/statistics', bridgeMonitoringController.getBridgeStatistics);
router.get('/health', bridgeMonitoringController.getBridgeHealth);
router.get('/chains/:chainId/status', bridgeMonitoringController.getChainStatus);

// Protected routes (require authentication)
router.get('/validators/:validatorAddress/performance', authMiddleware, bridgeMonitoringController.getValidatorPerformance);
router.get('/alerts', authMiddleware, bridgeMonitoringController.getBridgeAlerts);

// Admin routes (require admin authentication)
router.post('/monitoring/start', csrfProtection,  adminAuthMiddleware, bridgeMonitoringController.startMonitoring);
router.post('/monitoring/stop', csrfProtection,  adminAuthMiddleware, bridgeMonitoringController.stopMonitoring);
router.post('/alerts', csrfProtection,  adminAuthMiddleware, bridgeMonitoringController.createBridgeAlert);
router.patch('/alerts/:alertId/resolve', csrfProtection,  adminAuthMiddleware, bridgeMonitoringController.resolveBridgeAlert);

// WebSocket endpoint for real-time updates (if needed)
// This would be implemented separately with Socket.IO

export default router;
