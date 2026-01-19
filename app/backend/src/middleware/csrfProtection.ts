/**
 * Enhanced CSRF Protection Middleware with Redis Storage
 * Implements secure CSRF protection with Redis-backed token storage
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ApiResponse } from '../utils/apiResponse';
import { RedisService } from '../services/redisService';
import { safeLogger } from '../utils/safeLogger';
import { isProduction, isDevelopment } from '../utils/envValidation';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_SECRET_LENGTH = 32;
const CSRF_TOKEN_TTL = 3600; // 1 hour
const MAX_TOKENS_PER_SESSION = 10;

interface CSRFSession {
  secret: string;
  tokens: string[];
  createdAt: number;
  lastUsed: number;
}

// Get Redis service instance
const redisService = RedisService.getInstance();

/**
 * Generate CSRF token with Redis storage
 */
export async function generateCSRFToken(sessionId: string): Promise<string> {
  const normalizedSessionId = sessionId.toLowerCase();
  safeLogger.debug(`[generateCSRFToken] Creating/retrieving session: ${normalizedSessionId}`);

  try {
    // Get existing session from Redis
    let session: CSRFSession | null = await redisService.get(`csrf:session:${normalizedSessionId}`);

    if (!session) {
      // Create new session
      session = {
        secret: crypto.randomBytes(CSRF_SECRET_LENGTH).toString('hex'),
        tokens: [],
        createdAt: Date.now(),
        lastUsed: Date.now()
      };
      safeLogger.debug(`[generateCSRFToken] Created new session for: ${normalizedSessionId}`);
    } else {
      safeLogger.debug(`[generateCSRFToken] Using existing session for: ${normalizedSessionId}`);
      session.lastUsed = Date.now();
    }

    // Generate new token
    const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
    const hash = crypto.createHmac('sha256', session.secret).update(token).digest('hex');

    // Add token hash to session
    session.tokens.push(hash);

    // Keep only last N tokens to prevent memory bloat
    if (session.tokens.length > MAX_TOKENS_PER_SESSION) {
      session.tokens = session.tokens.slice(-MAX_TOKENS_PER_SESSION);
      safeLogger.debug(`[generateCSRFToken] Cleaned up old tokens for session ${normalizedSessionId}`);
    }

    // Save session to Redis with TTL
    await redisService.set(`csrf:session:${normalizedSessionId}`, session, CSRF_TOKEN_TTL);

    safeLogger.debug(`[generateCSRFToken] Added token hash to session ${normalizedSessionId}`);

    return token;
  } catch (error) {
    safeLogger.error('[generateCSRFToken] Error generating CSRF token:', error);
    // Fallback to generating token without storage if Redis fails
    return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  }
}

/**
 * Verify CSRF token against Redis storage
 */
export async function verifyCSRFToken(sessionId: string, token: string): Promise<boolean> {
  const normalizedSessionId = sessionId.toLowerCase();
  safeLogger.debug(`[verifyCSRFToken] Looking for session: ${normalizedSessionId}`);

  try {
    const session: CSRFSession | null = await redisService.get(`csrf:session:${normalizedSessionId}`);

    if (!session) {
      safeLogger.warn(`[verifyCSRFToken] No session found for ID ${normalizedSessionId}`);
      return false;
    }

    const hash = crypto.createHmac('sha256', session.secret).update(token).digest('hex');
    const isValid = session.tokens.includes(hash);

    safeLogger.debug(`[verifyCSRFToken] Token verification - session: ${normalizedSessionId}, valid: ${isValid}`);

    if (!isValid) {
      safeLogger.warn(`[verifyCSRFToken] Invalid token for session ${normalizedSessionId}`);
    } else {
      // Update last used timestamp
      session.lastUsed = Date.now();
      await redisService.set(`csrf:session:${normalizedSessionId}`, session, CSRF_TOKEN_TTL);
    }

    return isValid;
  } catch (error) {
    safeLogger.error('[verifyCSRFToken] Error verifying CSRF token:', error);
    // In case of Redis failure, reject the token for security
    return false;
  }
}

/**
 * Delete CSRF session
 */
export async function deleteCSRFSession(sessionId: string): Promise<void> {
  const normalizedSessionId = sessionId.toLowerCase();
  try {
    await redisService.del(`csrf:session:${normalizedSessionId}`);
    safeLogger.debug(`[deleteCSRFSession] Deleted session: ${normalizedSessionId}`);
  } catch (error) {
    safeLogger.error('[deleteCSRFSession] Error deleting CSRF session:', error);
  }
}

/**
 * Enhanced CSRF Protection Middleware
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

  // Skip CSRF protection for proxy routes (they handle their own security)
  if (req.path.startsWith('/api/proxy')) {
    return next();
  }

  // Check if user is authenticated via JWT
  const authHeader = req.headers.authorization;
  const hasJWTAuth = authHeader && authHeader.startsWith('Bearer ');

  // For authenticated requests with JWT, implement double-submit cookie pattern
  if (hasJWTAuth) {
    const csrfCookie = req.cookies?.['csrf-token'];
    const csrfHeader = req.headers['x-csrf-token'] as string;

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      safeLogger.warn(`[csrfProtection] Double-submit cookie validation failed for ${req.method} ${req.path}`);
      ApiResponse.unauthorized(res, 'CSRF validation failed: Token mismatch');
      return;
    }

    safeLogger.debug(`[csrfProtection] Authenticated request passed double-submit validation for ${req.method} ${req.path}`);
    return next();
  }

  // Skip CSRF for profile creation endpoint (users need to create profile before having a session)
  if (req.path === '/api/profiles' && req.method === 'POST') {
    return next();
  }

  safeLogger.debug(`[csrfProtection] ${req.method} ${req.path}`);

  // Development mode handling - only allow from localhost
  if (isDevelopment()) {
    const clientIP = req.ip || req.socket.remoteAddress;
    const isLocalhost = clientIP === '127.0.0.1' || clientIP === '::1' || clientIP === '::ffff:127.0.0.1';

    if (!isLocalhost) {
      safeLogger.warn(`[csrfProtection] Development mode: Rejecting non-localhost request from ${clientIP}`);
      ApiResponse.unauthorized(res, 'CSRF validation required');
      return;
    }

    const token = req.headers['x-csrf-token'] as string || req.body?._csrf;
    if (!token) {
      // Generate temporary token for development
      const tempSessionId = `dev_session_${Date.now()}`;
      const tempToken = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');

      res.setHeader('X-CSRF-Token', tempToken);
      res.setHeader('X-Session-ID', tempSessionId);

      safeLogger.debug('[csrfProtection] Development mode: Generated temporary CSRF token');
      return next();
    }
  }

  // Get session ID (from cookie or header)
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;

  if (!sessionId) {
    safeLogger.warn('[csrfProtection] No session ID in request');
    ApiResponse.unauthorized(res, 'CSRF validation failed: No session. Please authenticate first.');
    return;
  }

  // Get CSRF token from header or body
  const token = req.headers['x-csrf-token'] as string || req.body?._csrf;

  if (!token) {
    safeLogger.warn('[csrfProtection] No CSRF token in request');
    ApiResponse.unauthorized(res, 'CSRF validation failed: No token provided');
    return;
  }

  // Verify token asynchronously
  verifyCSRFToken(sessionId, token)
    .then(isValid => {
      if (!isValid) {
        safeLogger.warn('[csrfProtection] CSRF token verification failed');
        ApiResponse.unauthorized(res, 'CSRF validation failed: Invalid token');
        return;
      }

      safeLogger.debug('[csrfProtection] CSRF validation successful');
      next();
    })
    .catch(error => {
      safeLogger.error('[csrfProtection] Error during CSRF verification:', error);
      res.status(500).json({
        success: false,
        error: 'CSRF validation error',
        message: 'An error occurred during CSRF validation'
      });
    });
}

/**
 * Endpoint to get CSRF token
 */
export async function getCSRFToken(req: Request, res: Response): Promise<void> {
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] as string;

  if (!sessionId) {
    ApiResponse.badRequest(res, 'No session ID');
    return;
  }

  try {
    const token = await generateCSRFToken(sessionId);

    // Set CSRF token as httpOnly cookie for double-submit pattern
    res.cookie('csrf-token', token, {
      httpOnly: true,
      secure: isProduction(),
      sameSite: 'strict',
      maxAge: CSRF_TOKEN_TTL * 1000
    });

    ApiResponse.success(res, { csrfToken: token });
  } catch (error) {
    safeLogger.error('[getCSRFToken] Error generating CSRF token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate CSRF token',
      message: 'An error occurred while generating CSRF token'
    });
  }
}

/**
 * Middleware to set CSRF cookie for authenticated requests
 */
export async function setCSRFCookie(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const hasJWTAuth = authHeader && authHeader.startsWith('Bearer ');

  if (hasJWTAuth && !req.cookies?.['csrf-token']) {
    // Generate CSRF token for double-submit pattern
    const csrfToken = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');

    res.cookie('csrf-token', csrfToken, {
      httpOnly: true,
      secure: isProduction(),
      sameSite: 'strict',
      maxAge: CSRF_TOKEN_TTL * 1000
    });

    safeLogger.debug('[setCSRFCookie] Set CSRF cookie for authenticated request');
  }

  next();
}
