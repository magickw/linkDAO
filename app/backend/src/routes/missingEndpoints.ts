import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Fallback handler for missing marketplace endpoints
 * Returns helpful error messages instead of generic 404s
 */

// Cart endpoint fallback
router.all('/cart*', (req: Request, res: Response) => {
  res.status(503).json({
    success: false,
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Cart service is temporarily unavailable',
      fallback: 'localStorage',
      suggestion: 'Your cart is stored locally in your browser'
    }
  });
});

// Marketplace categories fallback (only for when categories service is down)
router.all('/marketplace/categories*', (req: Request, res: Response) => {
  res.status(503).json({
    success: false,
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Categories service is temporarily unavailable',
      fallback: 'default',
      suggestion: 'Using default categories'
    }
  });
});

// Communities POST fallback
router.post('/communities', (req: Request, res: Response) => {
  res.status(401).json({
    success: false,
    error: {
      code: 'AUTHENTICATION_REQUIRED',
      message: 'You must be authenticated to create a community',
      suggestion: 'Please connect your wallet first'
    }
  });
});

// Profiles POST fallback
router.post('/api/profiles', (req: Request, res: Response) => {
  res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: 'Profile creation is restricted',
      suggestion: 'Profiles are created automatically when you connect your wallet'
    }
  });
});

export default router;
