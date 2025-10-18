import { Router } from 'express';
import { 
  aiEvidenceAnalysisController, 
  uploadEvidence, 
  uploadMultipleEvidence 
} from '../controllers/aiEvidenceAnalysisController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route POST /api/ai-evidence-analysis/analyze-file
 * @desc Analyze uploaded evidence file using AI
 * @access Private (Admin/Moderator)
 */
router.post(
  '/analyze-file',
  adminAuthMiddleware,
  uploadEvidence,
  aiEvidenceAnalysisController.analyzeEvidenceFile.bind(aiEvidenceAnalysisController)
);

/**
 * @route POST /api/ai-evidence-analysis/analyze-text
 * @desc Analyze text evidence using NLP
 * @access Private (Admin/Moderator)
 */
router.post(
  '/analyze-text',
  adminAuthMiddleware,
  aiEvidenceAnalysisController.analyzeTextEvidence.bind(aiEvidenceAnalysisController)
);

/**
 * @route POST /api/ai-evidence-analysis/batch-analyze
 * @desc Batch analyze multiple evidence items
 * @access Private (Admin/Moderator)
 */
router.post(
  '/batch-analyze',
  adminAuthMiddleware,
  aiEvidenceAnalysisController.batchAnalyzeEvidence.bind(aiEvidenceAnalysisController)
);

/**
 * @route GET /api/ai-evidence-analysis/results/:evidenceId
 * @desc Get analysis results for specific evidence
 * @access Private (Admin/Moderator)
 */
router.get(
  '/results/:evidenceId',
  adminAuthMiddleware,
  aiEvidenceAnalysisController.getAnalysisResults.bind(aiEvidenceAnalysisController)
);

/**
 * @route POST /api/ai-evidence-analysis/compare-authenticity
 * @desc Compare authenticity between multiple evidence items
 * @access Private (Admin/Moderator)
 */
router.post(
  '/compare-authenticity',
  adminAuthMiddleware,
  aiEvidenceAnalysisController.compareEvidenceAuthenticity.bind(aiEvidenceAnalysisController)
);

/**
 * @route GET /api/ai-evidence-analysis/manipulation-detection/:evidenceId
 * @desc Get detailed manipulation detection results
 * @access Private (Admin/Moderator)
 */
router.get(
  '/manipulation-detection/:evidenceId',
  adminAuthMiddleware,
  aiEvidenceAnalysisController.getManipulationDetection.bind(aiEvidenceAnalysisController)
);

export default router;