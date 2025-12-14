import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ApiResponse } from '../utils/apiResponse';
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
// Using a global store to ensure it persists across requests
const csrfStore = new Map<string, CSRFSession>();

// Add cleanup function to prevent memory leaks
setInterval(() => {
  console.log(`[CSRF] Store cleanup - current size: ${csrfStore.size}`);
  // In a production environment, we'd use Redis with TTL
  // For now, we'll just log the size
}, 60000); // Every minute

/**
 * Generate CSRF token
 */
export function generateCSRFToken(sessionId: string): string {
  // Normalize session ID to lowercase to avoid case sensitivity issues
  const normalizedSessionId = sessionId.toLowerCase();
  console.log(`[generateCSRFToken] Creating/retrieving session: ${normalizedSessionId}`);
  let session = csrfStore.get(normalizedSessionId);
  
  if (!session) {
    session = {
      secret: crypto.randomBytes(CSRF_SECRET_LENGTH).toString('hex'),
      tokens: new Set()
    };
    csrfStore.set(normalizedSessionId, session);
    console.log(`[generateCSRFToken] Created new session for: ${normalizedSessionId}`);
  } else {
    console.log(`[generateCSRFToken] Using existing session for: ${normalizedSessionId}`);
  }
  
  const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  const hash = crypto.createHmac('sha256', session.secret).update(token).digest('hex');
  
  session.tokens.add(hash);
  console.log(`[generateCSRFToken] Added token hash to session ${normalizedSessionId}: ${hash}`);
  
  // Clean up old tokens (keep last 10)
  if (session.tokens.size > 10) {
    const tokensArray = Array.from(session.tokens);
    session.tokens = new Set(tokensArray.slice(-10));
    console.log(`[generateCSRFToken] Cleaned up old tokens for session ${normalizedSessionId}`);
  }
  
  return token;
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(sessionId: string, token: string): boolean {
  // Normalize session ID to lowercase to avoid case sensitivity issues
  const normalizedSessionId = sessionId.toLowerCase();
  console.log(`[verifyCSRFToken] Looking for session: ${normalizedSessionId}`);
  console.log(`[verifyCSRFToken] Available sessions: [${Array.from(csrfStore.keys()).join(', ')}]`);
  const session = csrfStore.get(normalizedSessionId);
  
  if (!session) {
    console.log(`[verifyCSRFToken] CSRF verification failed: No session found for ID ${normalizedSessionId}`);
    return false;
  }
  
  const hash = crypto.createHmac('sha256', session.secret).update(token).digest('hex');
  const isValid = session.tokens.has(hash);
  console.log(`[verifyCSRFToken] Token verification - session: ${normalizedSessionId}, token: ${token}, hash: ${hash}, valid: ${isValid}`);
  
  // If invalid, let's check what tokens we have for this session
  if (!isValid) {
    console.log(`[verifyCSRFToken] Tokens for session ${normalizedSessionId}: [${Array.from(session.tokens).join(', ')}]`);
  }
  
  return isValid;
}

/**
 * CSRF Protection Middleware
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip CSRF protection for WebSocket handshake requests
  if (req.path.startsWith('/socket.io/')) {
    return next();
  }
  
  // Check if user is authenticated via JWT or wallet signature
  const authHeader = req.headers.authorization;
  const hasWalletAuth = req.headers['x-wallet-address'] || (req as any).user?.walletAddress || (req as any).user?.address;  
  // If authenticated, skip CSRF validation but ensure proper headers are present for logging
  if (authHeader || hasWalletAuth) {
    console.log(`[csrfProtection] Authenticated request - skipping CSRF for ${req.method} ${req.path}`);
    return next();
  }
  
  // Skip CSRF for profile creation endpoint (users need to create profile before having a session)
  if (req.path === '/api/profiles' && req.method === 'POST') {
    return next();
  }
  
  console.log(`[csrfProtection] ${req.method} ${req.path}`);
  console.log(`[csrfProtection] Headers: ${JSON.stringify({
    'x-session-id': req.headers['x-session-id'],
    'x-csrf-token': req.headers['x-csrf-token']
  })}`);
  
  // In development mode, be more lenient with CSRF protection
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    // Allow requests without session/token for development
    const token = req.headers['x-csrf-token'] as string || req.body?._csrf;
    
    if (!token) {
      // Generate a temporary session and allow the request
      const tempSessionId = 'dev_session_' + Date.now();
      const tempToken = generateCSRFToken(tempSessionId);
      
      // Add the token to response headers for future use
      res.setHeader('X-CSRF-Token', tempToken);
      res.setHeader('X-Session-ID', tempSessionId);
      
      return next();
    }
  }
  
  // Get session ID (from cookie or header)
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;
  
  if (!sessionId) {
    console.log('[csrfProtection] No session ID in request');
    ApiResponse.unauthorized(res, 'CSRF validation failed: No session. Please authenticate first.');
    return;
  }
  
  // Normalize session ID to lowercase
  const normalizedSessionId = sessionId.toLowerCase();
  console.log(`[csrfProtection] Using normalized session ID: ${normalizedSessionId}`);
  
  // Get CSRF token from header or body
  const token = req.headers['x-csrf-token'] as string || req.body?._csrf;
  
  if (!token) {
    console.log('[csrfProtection] No CSRF token in request');
    ApiResponse.unauthorized(res, 'CSRF validation failed: No token provided');
    return;
  }
  
  console.log(`[csrfProtection] Verifying token for session: ${normalizedSessionId}`);
  // Verify token
  if (!verifyCSRFToken(normalizedSessionId, token)) {
    console.log('[csrfProtection] CSRF token verification failed');
    ApiResponse.unauthorized(res, 'CSRF validation failed: Invalid token');
    return;
  }
  
  console.log('[csrfProtection] CSRF validation successful');
  next();
}

/**
 * Endpoint to get CSRF token
 */
export function getCSRFToken(req: Request, res: Response): void {
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;
  
  if (!sessionId) {
    ApiResponse.badRequest(res, 'No session ID');
    return;
  }
  
  // Normalize session ID to lowercase
  const normalizedSessionId = sessionId.toLowerCase();
  console.log(`[getCSRFToken] Generating token for session: ${normalizedSessionId}`);
  const token = generateCSRFToken(normalizedSessionId);
  
  ApiResponse.success(res, { csrfToken: token });
}
