import { Request, Response, NextFunction } from 'express';

/**
 * Diagnostic middleware SPECIFICALLY for the /api/posts/repost endpoint
 * This runs BEFORE authMiddleware to trace the exact flow
 */
export const repostDiagnosticMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'POST' && req.path === '/repost') {
    const timestamp = new Date().toISOString();
    const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    🔍 REPOST DIAGNOSTIC MIDDLEWARE 🔍                      ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');
    console.log(`[${timestamp}] Request ID: ${requestId}`);
    console.log(`Method: ${req.method}`);
    console.log(`Path: ${req.path}`);
    console.log(`Full URL: ${req.originalUrl}`);
    console.log(`Headers present:`, {
      authorization: !!req.headers.authorization,
      contentType: req.headers['content-type'],
      origin: req.headers.origin,
      userAgent: req.headers['user-agent']?.substring(0, 50)
    });
    console.log(`Query params:`, req.query);
    console.log(`Body size: ${JSON.stringify(req.body).length} bytes`);
    console.log(`Body preview:`, JSON.stringify(req.body).substring(0, 200));
    console.log(`Remote IP: ${req.ip}`);
    console.log(`Request ID stored in context: ${requestId}`);

    // Store the request ID on req object for later middleware to access
    (req as any).repostRequestId = requestId;

    // Store original send to intercept the response
    const originalSend = res.send.bind(res);
    res.send = function(data: any) {
      console.log(`\n[${timestamp}] 📤 Response being sent`);
      console.log(`Response status: ${res.statusCode}`);
      console.log(`Response headers:`, res.getHeaders());
      if (typeof data === 'string') {
        console.log(`Response body preview: ${data.substring(0, 200)}`);
      } else if (typeof data === 'object') {
        console.log(`Response body preview:`, JSON.stringify(data).substring(0, 200));
      }
      console.log('╔════════════════════════════════════════════════════════════════════════════╗\n');
      return originalSend(data);
    };

    // Track when next() is called
    console.log(`[${timestamp}] ➡️  Calling next() to pass to authMiddleware...\n`);
  }

  next();
};

/**
 * Post-auth diagnostic middleware
 * This runs AFTER authMiddleware to verify user was authenticated
 */
export const repostPostAuthDiagnosticMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'POST' && req.path === '/repost') {
    const timestamp = new Date().toISOString();
    const requestId = (req as any).repostRequestId || 'UNKNOWN';

    console.log(`[${timestamp}] ✅ AFTER AUTH MIDDLEWARE [Request ID: ${requestId}]`);
    console.log(`User authenticated: ${!!req.user}`);
    if (req.user) {
      console.log(`User details:`, {
        userId: (req.user as any).userId || (req.user as any).id,
        walletAddress: (req.user as any).walletAddress,
        email: (req.user as any).email
      });
    } else {
      console.log(`⚠️  NO USER FOUND - Request should have been rejected by authMiddleware!`);
    }
    console.log(`Request continuing to controller...\n`);
  }

  next();
};
