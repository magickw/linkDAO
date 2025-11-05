import { Router } from 'express';
import { Request, Response } from 'express';
import crypto from 'crypto';

const router = Router();

// Simple in-memory session store (in production, use Redis)
const sessions = new Map<string, { id: string; createdAt: Date; lastUsed: Date }>();

/**
 * Create a new session
 * POST /api/session
 */
router.post('/session', (req: Request, res: Response) => {
  try {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    
    sessions.set(sessionId, {
      id: sessionId,
      createdAt: now,
      lastUsed: now
    });

    // Set session cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      success: true,
      data: {
        sessionId,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create session'
    });
  }
});

/**
 * Get current session info
 * GET /api/session
 */
router.get('/session', (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;
    
    if (!sessionId) {
      return res.status(404).json({
        success: false,
        error: 'No session found'
      });
    }

    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Update last used time
    session.lastUsed = new Date();

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        createdAt: session.createdAt.toISOString(),
        lastUsed: session.lastUsed.toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session'
    });
  }
});

/**
 * Delete session (logout)
 * DELETE /api/session
 */
router.delete('/session', (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;
    
    if (sessionId) {
      sessions.delete(sessionId);
      res.clearCookie('sessionId');
    }

    res.json({
      success: true,
      message: 'Session deleted'
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete session'
    });
  }
});

// Clean up expired sessions (run periodically)
setInterval(() => {
  const now = new Date();
  const expiredThreshold = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [sessionId, session] of sessions.entries()) {
    if (now.getTime() - session.lastUsed.getTime() > expiredThreshold) {
      sessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour

export default router;