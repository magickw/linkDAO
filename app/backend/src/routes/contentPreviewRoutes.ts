import { Router } from 'express';
import { contentPreviewController } from '../controllers/contentPreviewController';
import { auth } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply rate limiting to preview endpoints
const previewRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many preview requests, please try again later'
});

// Generate preview for URL
router.post('/generate', previewRateLimit, contentPreviewController.generatePreview);

// Get cached preview
router.get('/cache/:urlHash', contentPreviewController.getCachedPreview);

// Clear preview cache (admin only)
router.delete('/cache', auth, contentPreviewController.clearCache);

// Get cache statistics (admin only)
router.get('/cache/stats', auth, contentPreviewController.getCacheStats);

// Security scan endpoint
router.post('/security/scan', previewRateLimit, contentPreviewController.securityScan);

// Link preview endpoint
router.post('/link', previewRateLimit, contentPreviewController.generateLinkPreview);

// NFT preview endpoints
router.get('/nft/opensea/:contractAddress/:tokenId', previewRateLimit, contentPreviewController.getOpenseaNFT);
router.get('/nft/alchemy/:network/:contractAddress/:tokenId', previewRateLimit, contentPreviewController.getAlchemyNFT);

// Token preview endpoint
router.get('/token/:network/:contractAddress', previewRateLimit, contentPreviewController.getTokenInfo);

// Governance proposal preview endpoint
router.get('/governance/proposal/:proposalId', previewRateLimit, contentPreviewController.getProposalInfo);

export default router;