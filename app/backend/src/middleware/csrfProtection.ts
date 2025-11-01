import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 */

const CSRF_TOKEN_LENGTH = 32;
const CSRF_SECRET_LENGTH = 32;

interface CSRFSession {
  secret: string;
  tokens: Set<string>;
}

// Store CSRF secrets per session (in production, use Redis or similar)
const csrfStore = new Map<string, CSRFSession>();

/**
 * Generate CSRF token
 */
export function generateCSRFToken(sessionId: string): string {
  let session = csrfStore.get(sessionId);
  
  if (!session) {
    session = {
      secret: crypto.randomBytes(CSRF_SECRET_LENGTH).toString('hex'),
      tokens: new Set()
    };
    csrfStore.set(sessionId, session);
  }
  
  const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  const hash = crypto.createHmac('sha256', session.secret).update(token).digest('hex');
  
  session.tokens.add(hash);
  
  // Clean up old tokens (keep last 10)
  if (session.tokens.size > 10) {
    const tokensArray = Array.from(session.tokens);
    session.tokens = new Set(tokensArray.slice(-10));
  }
  
  return token;
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(sessionId: string, token: string): boolean {
  const session = csrfStore.get(sessionId);
  
  if (!session) {
    return false;
  }
  
  const hash = crypto.createHmac('sha256', session.secret).update(token).digest('hex');
  return session.tokens.has(hash);
}

/**
 * CSRF Protection Middleware
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Get session ID (from cookie or header)
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;
  
  if (!sessionId) {
    res.status(403).json({
      success: false,
      message: 'CSRF validation failed: No session'
    });
    return;
  }
  
  // Get CSRF token from header or body
  const token = req.headers['x-csrf-token'] as string || req.body?._csrf;
  
  if (!token) {
    res.status(403).json({
      success: false,
      message: 'CSRF validation failed: No token'
    });
    return;
  }
  
  // Verify token
  if (!verifyCSRFToken(sessionId, token)) {
    res.status(403).json({
      success: false,
      message: 'CSRF validation failed: Invalid token'
    });
    return;
  }
  
  next();
}

/**
 * Endpoint to get CSRF token
 */
export function getCSRFToken(req: Request, res: Response): void {
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;
  
  if (!sessionId) {
    res.status(400).json({
      success: false,
      message: 'No session ID'
    });
    return;
  }
  
  const token = generateCSRFToken(sessionId);
  
  res.json({
    success: true,
    data: { csrfToken: token }
  });
}
