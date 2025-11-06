import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Emergency CORS middleware to fix the multiple origins issue
 * This middleware ensures only ONE origin is returned in the Access-Control-Allow-Origin header
 */
export const emergencyCorsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.get('Origin');
  const referer = req.get('Referer');
  
  // List of allowed origins
  const allowedOrigins = [
    'https://www.linkdao.io',
    'https://linkdao.io',
    'https://linkdao.vercel.app',
    'https://api.linkdao.io',
    'https://linkdao-backend.onrender.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ];

  // Determine which origin to allow
  let allowedOrigin = '*';
  
  if (origin && allowedOrigins.includes(origin)) {
    allowedOrigin = origin;
  } else if (!origin && referer) {
    // Try to extract origin from referer
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      if (allowedOrigins.includes(refererOrigin)) {
        allowedOrigin = refererOrigin;
      }
    } catch (error) {
      // Invalid referer URL, use default
    }
  }

  // Set CORS headers - ONLY ONE ORIGIN VALUE
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', [
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
    'X-CSRF-Token',
    'x-csrf-token',
    'Cache-Control'
  ].join(', '));
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.header('Access-Control-Expose-Headers', [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ].join(', '));

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    logger.debug('CORS preflight request handled', {
      origin,
      allowedOrigin,
      method: req.method,
      path: req.path
    });
    res.status(200).end();
    return;
  }

  logger.debug('CORS headers set', {
    origin,
    allowedOrigin,
    method: req.method,
    path: req.path
  });

  next();
};

/**
 * Ultra-simple CORS middleware for emergency situations
 */
export const simpleCorsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.get('Origin') || 'https://www.linkdao.io';
  
  // Set minimal CORS headers
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
};
// Updated: 2025-11-06T23:46:34.293Z
