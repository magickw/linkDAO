import express from 'express';
import { trackingController } from '../controllers/trackingController';
import { authenticateToken } from '../middleware/auth'; // Assuming this exists, or use optional auth

const router = express.Router();

// Generic tracking endpoint - open to public but can use auth token if present
// We use a wrapper to make auth optional but extract user if available
const optionalAuth = (req: any, res: any, next: any) => {
    // Check for auth header but don't enforce it
    // logic depends on specific auth middleware implementation
    // For now, we'll assume the controller handles missing user gracefully
    // If you have a specific optionalAuth middleware, use that.
    // Otherwise, we can just use the controller directly and it checks req.user
    next();
};

// If you have a real optional auth middleware, import and use it.
// For now, I'll assume the standard auth middleware populates req.user if token is valid
// and we might want to use it for authenticated tracking.
// But for public tracking (e.g. landing page), we shouldn't block.

router.post('/', trackingController.track);
router.post('/wallet', trackingController.trackWallet);
router.get('/dashboard', trackingController.getDashboardData);

export default router;
