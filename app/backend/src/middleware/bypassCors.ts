import { Request, Response, NextFunction } from 'express';

/**
 * Bypass CORS middleware - allows all origins
 * TEMPORARY FIX for production deployment
 * NOTE: This middleware is NOT used in the application to avoid CORS conflicts.
 */
/*
export const bypassCorsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Set permissive CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Expose-Headers', '*');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
};
*/