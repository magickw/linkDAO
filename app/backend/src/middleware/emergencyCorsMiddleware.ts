import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

/**
 * Emergency CORS middleware to fix immediate 403 errors
 * This is a temporary fix to allow all origins while we debug the main CORS issue
 */

const emergencyCorsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Log the origin for debugging
    console.log('CORS Request from origin:', origin || 'no-origin');
    
    // Allow all origins temporarily to fix immediate issues
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Request-ID',
    'X-Correlation-ID',
    'X-Session-ID',
    'X-Wallet-Address',
    'X-Chain-ID',
    'X-API-Key',
    'X-Client-Version',
    'X-CSRF-Token',
    'x-csrf-token',
    'csrf-token',
    'Cache-Control'
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset',
    'RateLimit-Policy',
    'X-Total-Count'
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 200
};

export const emergencyCorsMiddleware = cors(emergencyCorsConfig);

/**
 * Additional middleware to handle preflight requests
 */
export const emergencyPreflightHandler = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, X-CSRF-Token, x-csrf-token');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
  } else {
    next();
  }
};

/**
 * Emergency CORS headers middleware
 */
export const emergencyCorsHeaders = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, X-CSRF-Token, x-csrf-token');
  
  next();
};