import { Request, Response, NextFunction } from 'express';

/**
 * ULTRA EMERGENCY CORS FIX
 *
 * This middleware MUST be the FIRST middleware in the chain.
 * It clears any existing CORS headers and sets exactly ONE origin.
 *
 * The problem: Multiple CORS middleware were setting headers, resulting in:
 * Access-Control-Allow-Origin: https://www.linkdao.io,https://linkdao.io,https://linkdao.vercel.app
 *
 * CORS spec requires EXACTLY ONE origin value.
 */
export const ultraEmergencyCorsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestOrigin = req.get('Origin');

  // List of allowed origins
  const allowedOrigins = [
    'https://www.linkdao.io',
    'https://linkdao.io',
    'https://linkdao.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ];

  // Determine which single origin to allow
  let singleOrigin = '*'; // Fallback for requests without origin

  if (requestOrigin) {
    // If origin is in allowed list, use it
    if (allowedOrigins.includes(requestOrigin)) {
      singleOrigin = requestOrigin;
    }
    // Check for Vercel preview deployments
    else if (requestOrigin.includes('vercel.app') && requestOrigin.includes('linkdao')) {
      singleOrigin = requestOrigin;
    }
  }

  // CRITICAL: Remove any existing CORS headers before setting new ones
  res.removeHeader('Access-Control-Allow-Origin');
  res.removeHeader('Access-Control-Allow-Methods');
  res.removeHeader('Access-Control-Allow-Headers');
  res.removeHeader('Access-Control-Allow-Credentials');
  res.removeHeader('Access-Control-Max-Age');
  res.removeHeader('Access-Control-Expose-Headers');

  // Set CORS headers with EXACTLY ONE ORIGIN
  res.setHeader('Access-Control-Allow-Origin', singleOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID, X-Correlation-ID, X-Session-ID, X-Wallet-Address, X-Chain-ID, X-CSRF-Token, x-csrf-token, Cache-Control');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Access-Control-Expose-Headers', 'X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset');

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    console.log(`[ULTRA-EMERGENCY-CORS] Preflight for ${req.path} from ${requestOrigin} -> allowing ${singleOrigin}`);
    res.status(200).end();
    return;
  }

  console.log(`[ULTRA-EMERGENCY-CORS] Request ${req.method} ${req.path} from ${requestOrigin} -> allowing ${singleOrigin}`);

  // NUCLEAR OPTION: Force headers on response finish
  const originalEnd = res.end.bind(res);
  const originalSend = res.send ? res.send.bind(res) : null;
  const originalJson = res.json ? res.json.bind(res) : null;

  // Intercept ALL response methods to force correct CORS headers
  const forceCorrectCorsHeaders = () => {
    // Remove ALL existing CORS headers
    res.removeHeader('Access-Control-Allow-Origin');
    res.removeHeader('Access-Control-Allow-Methods');
    res.removeHeader('Access-Control-Allow-Headers');
    res.removeHeader('Access-Control-Allow-Credentials');
    res.removeHeader('Access-Control-Max-Age');
    res.removeHeader('Access-Control-Expose-Headers');

    // Set EXACTLY ONE ORIGIN
    res.setHeader('Access-Control-Allow-Origin', singleOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID, X-Correlation-ID, X-Session-ID, X-Wallet-Address, X-Chain-ID, X-CSRF-Token, x-csrf-token, Cache-Control');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Access-Control-Expose-Headers', 'X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset');

    console.log(`[ULTRA-EMERGENCY-CORS] FORCED headers on response for ${req.path}`);
  };

  // Override res.end
  res.end = function(...args: any[]) {
    forceCorrectCorsHeaders();
    return originalEnd.apply(this, args);
  };

  // Override res.send if it exists
  if (originalSend) {
    res.send = function(...args: any[]) {
      forceCorrectCorsHeaders();
      return originalSend.apply(this, args);
    };
  }

  // Override res.json if it exists
  if (originalJson) {
    res.json = function(...args: any[]) {
      forceCorrectCorsHeaders();
      return originalJson.apply(this, args);
    };
  }

  next();
};
