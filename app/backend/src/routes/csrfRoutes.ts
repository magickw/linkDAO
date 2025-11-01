import { Router } from 'express';
import { getCSRFToken } from '../middleware/csrfProtection';

const router = Router();

// Endpoint to get CSRF token
router.get('/csrf-token', getCSRFToken);

export default router;
