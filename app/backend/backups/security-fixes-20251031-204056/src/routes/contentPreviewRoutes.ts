import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { contentPreviewController } from '../controllers/contentPreviewController';
import { csrfProtection } from '../middleware/csrfProtection';
import { authenticateToken } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrfProtection';
import rateLimit from 'express-rate-limit';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();

// Apply rate limiting to preview endpoints
const previewRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many preview requests, please try again later'
});

// Generate preview for URL
router.post('/generate', csrfProtection,  previewRateLimit, contentPreviewController.generatePreview);

// Get cached preview
router.get('/cache/:urlHash', contentPreviewController.getCachedPreview);

// Clear preview cache (admin only)
router.delete('/cache', csrfProtection,  authenticateToken, contentPreviewController.clearCache);

// Get cache statistics (admin only)
router.get('/cache/stats', authenticateToken, contentPreviewController.getCacheStats);

// Security scan endpoint
router.post('/security/scan', csrfProtection,  previewRateLimit, contentPreviewController.securityScan);

// Link preview endpoint
router.post('/link', csrfProtection,  previewRateLimit, contentPreviewController.generateLinkPreview);

// NFT preview endpoints
router.get('/nft/opensea/:contractAddress/:tokenId', previewRateLimit, contentPreviewController.getOpenseaNFT);
router.get('/nft/alchemy/:network/:contractAddress/:tokenId', previewRateLimit, contentPreviewController.getAlchemyNFT);

// Token preview endpoint
router.get('/token/:network/:contractAddress', previewRateLimit, contentPreviewController.getTokenInfo);

// Governance proposal preview endpoint
router.get('/governance/proposal/:proposalId', previewRateLimit, contentPreviewController.getProposalInfo);

export default router;