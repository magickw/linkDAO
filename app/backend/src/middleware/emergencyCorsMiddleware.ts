import { Request, Response, NextFunction } from 'express';
import cors from 'cors';

/**
 * Emergency CORS middleware for debugging connection issues
 * This is ultra-permissive and should only be used temporarily
 */

export const emergencyCorsHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Set ultra-permissive CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Expose-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  
  // Add additional headers for debugging
  res.header('X-Debug-CORS', 'emergency-mode');
  res.header('X-Backend-Status', 'available');
  
  next();
};

export const emergencyPreflightHandler = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'OPTIONS') {
    console.log(`[EMERGENCY CORS] Preflight request from ${req.get('Origin')} for ${req.get('Access-Control-Request-Method')}`);
    
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Max-Age', '86400');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    res.status(200).end();
    return;
  }
  
  next();
};

export const emergencyCorsMiddleware = cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['*'],
  exposedHeaders: ['*'],
  preflightContinue: false,
  optionsSuccessStatus: 200
});

/**
 * Log CORS requests for debugging
 */
export const corsDebugLogger = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.get('Origin');
  const method = req.method;
  const path = req.path;
  
  if (origin) {
    console.log(`[CORS DEBUG] ${method} ${path} from ${origin}`);
  }
  
  next();
};