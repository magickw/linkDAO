import { Request, Response, NextFunction } from 'express';

/**
 * CRITICAL DIAGNOSTIC MIDDLEWARE
 * This middleware runs IMMEDIATELY after CORS to catch all requests
 * It logs the exact flow and catches any middleware that consumes the request
 */
export const criticalDiagnosticMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Log EVERY request to track flow
  if (req.path.includes('repost') || req.path.includes('/posts')) {
    console.log(`\n[CRITICAL-DIAG] 🎯 REQUEST INTERCEPTED`);
    console.log(`[CRITICAL-DIAG] Method: ${req.method}`);
    console.log(`[CRITICAL-DIAG] Path: ${req.path}`);
    console.log(`[CRITICAL-DIAG] Full URL: ${req.originalUrl}`);
    console.log(`[CRITICAL-DIAG] Timestamp: ${new Date().toISOString()}`);

    // Wrap the response send to catch if it gets called
    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);

    let statusSet: number | null = null;

    res.status = function (code: number): any {
      statusSet = code;
      console.log(`[CRITICAL-DIAG] 📍 res.status(${code}) called`);
      return originalStatus(code);
    };

    res.send = function (data: any): any {
      console.log(`[CRITICAL-DIAG] 📤 res.send() called with status ${statusSet || res.statusCode}`);
      console.log(`[CRITICAL-DIAG] Response size: ${JSON.stringify(data).length} bytes`);
      if (typeof data === 'string') {
        console.log(`[CRITICAL-DIAG] Response preview: ${data.substring(0, 100)}`);
      } else if (typeof data === 'object') {
        console.log(`[CRITICAL-DIAG] Response: ${JSON.stringify(data).substring(0, 200)}`);
      }
      return originalSend(data);
    };

    res.json = function (data: any): any {
      console.log(`[CRITICAL-DIAG] 📤 res.json() called with status ${statusSet || res.statusCode}`);
      console.log(`[CRITICAL-DIAG] Response: ${JSON.stringify(data).substring(0, 200)}`);
      return originalJson(data);
    };

    console.log(`[CRITICAL-DIAG] ➡️ Calling next()\n`);
  }

  next();
};

/**
 * Post-router diagnostic middleware
 * This middleware runs after routing to verify handler was reached
 */
export const postRouteDiagnosticMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (req.path.includes('repost') || req.path.includes('/posts')) {
    console.log(`[CRITICAL-DIAG] 🔴 Handler did NOT consume the request`);
    console.log(`[CRITICAL-DIAG] Request is now at 404 handler`);
  }
  next();
};
