import { Router } from 'express';
import { CustomScamDetectionController } from '../controllers/customScamDetectionController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const controller = new CustomScamDetectionController();

/**
 * @route POST /api/scam-detection/analyze
 * @desc Analyze content for scam patterns
 * @access Private
 */
router.post('/analyze', authMiddleware, async (req, res) => {
  await controller.analyzeContent(req, res);
});

/**
 * @route POST /api/scam-detection/batch-analyze
 * @desc Batch analyze multiple content items for scam patterns
 * @access Private
 */
router.post('/batch-analyze', authMiddleware, async (req, res) => {
  await controller.batchAnalyze(req, res);
});

/**
 * @route GET /api/scam-detection/statistics
 * @desc Get scam detection statistics
 * @access Private
 */
router.get('/statistics', authMiddleware, async (req, res) => {
  await controller.getStatistics(req, res);
});

/**
 * @route GET /api/scam-detection/health
 * @desc Health check for scam detection service
 * @access Public
 */
router.get('/health', async (req, res) => {
  await controller.healthCheck(req, res);
});

export default router;