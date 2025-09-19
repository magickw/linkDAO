import { Router } from 'express';
import { ensController } from '../controllers/ensController';

const router = Router();

// ENS validation endpoint
router.post('/validate', ensController.validateENS.bind(ensController));

// ENS ownership verification endpoint
router.post('/verify-ownership', ensController.verifyOwnership.bind(ensController));

// ENS availability check endpoint
router.get('/availability/:ensName', ensController.checkAvailability.bind(ensController));

// ENS suggestions endpoint
router.get('/suggestions/:baseName', ensController.getSuggestions.bind(ensController));

// ENS service status endpoint
router.get('/status', ensController.getServiceStatus.bind(ensController));

// ENS health check endpoint
router.get('/health', ensController.healthCheck.bind(ensController));

export default router;