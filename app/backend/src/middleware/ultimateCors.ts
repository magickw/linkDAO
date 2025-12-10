import { Request, Response, NextFunction } from 'express';

/**
 * ULTIMATE CORS FIX - Last Resort
 *
 * This middleware uses the lowest-level HTTP APIs to force correct CORS headers.
 * It bypasses Express's header management entirely and writes directly to the HTTP response.
 *
 * This is the nuclear option when all other middleware fails due to:
 * - Environment variables being set incorrectly
 * - Other middleware interfering
 * - Proxy/CDN layers
 */
export const ultimateCorsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestOrigin = req.get('Origin');

  // List of allowed origins
  const allowedOrigins = [
    'https://www.linkdao.io',
    'https://linkdao.io',
    'https://api.linkdao.io', // Add api.linkdao.io as an allowed origin
    'https://linkdao.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ];

  // Determine which single origin to allow
  let singleOrigin = '*';

  if (requestOrigin) {
    if (allowedOrigins.includes(requestOrigin)) {
      singleOrigin = requestOrigin;
    } else if (requestOrigin.includes('vercel.app') && requestOrigin.includes('linkdao')) {
      singleOrigin = requestOrigin;
    }
  }

  // Handle preflight requests IMMEDIATELY
  if (req.method === 'OPTIONS') {
    // Use writeHead to bypass ALL Express header management
    res.writeHead(200, {
      'Access-Control-Allow-Origin': singleOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID, X-Correlation-ID, X-Session-ID, X-Wallet-Address, X-Chain-ID, X-CSRF-Token, x-csrf-token, Cache-Control',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Expose-Headers': 'X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset',
      'Content-Length': '0'
    });
    res.end();
    console.log(`[ULTIMATE-CORS] OPTIONS handled for ${req.path} - origin: ${singleOrigin}`);
    return;
  }

  // For all other requests, intercept the response at the LOWEST level
  const originalWriteHead = res.writeHead.bind(res);

  // Override writeHead to force CORS headers
  res.writeHead = function(statusCode: number, statusMessage?: any, headers?: any): any {
    let finalHeaders: any = {};

    // Handle overloaded signatures
    if (typeof statusMessage === 'object') {
      finalHeaders = statusMessage;
    } else if (typeof headers === 'object') {
      finalHeaders = headers;
    }

    // FORCE correct CORS headers, overriding ANY existing values
    finalHeaders['Access-Control-Allow-Origin'] = singleOrigin;
    finalHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD';
    finalHeaders['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID, X-Correlation-ID, X-Session-ID, X-Wallet-Address, X-Chain-ID, X-CSRF-Token, x-csrf-token, Cache-Control';
    finalHeaders['Access-Control-Allow-Credentials'] = 'true';
    finalHeaders['Access-Control-Max-Age'] = '86400';
    finalHeaders['Access-Control-Expose-Headers'] = 'X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset';

    console.log(`[ULTIMATE-CORS] writeHead called for ${req.path} - forcing origin: ${singleOrigin}`);

    // Call original writeHead with our forced headers
    if (typeof statusMessage === 'string') {
      return originalWriteHead(statusCode, statusMessage, finalHeaders);
    } else {
      return originalWriteHead(statusCode, finalHeaders);
    }
  };

  next();
};
