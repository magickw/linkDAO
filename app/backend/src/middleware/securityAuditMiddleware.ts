/**
 * Security Audit Middleware
 * Automatically logs security events for various operations
 */

import { Request, Response, NextFunction } from 'express';
import { securityAuditLoggingService } from '../services/securityAuditLoggingService';

interface AuditableRequest extends Request {
  user?: {
    id: string;
    role?: string;
    email?: string;
  };
  sessionId?: string;
  auditContext?: {
    resource?: string;
    action?: string;
    skipAudit?: boolean;
  };
}

export interface SecurityAuditOptions {
  category?: 'authentication' | 'authorization' | 'data_access' | 'admin_action' | 'system_event' | 'security_event';
  eventType?: string;
  resource?: string;
  action?: string;
  skipSuccessEvents?: boolean;
  skipFailureEvents?: boolean;
  customRiskCalculator?: (req: AuditableRequest, res: Response) => number;
  complianceFlags?: string[];
}

/**
 * Middleware factory for creating security audit logging middleware
 */
export function createSecurityAuditMiddleware(options: SecurityAuditOptions = {}) {
  return async (req: AuditableRequest, res: Response, next: NextFunction) => {
    // Skip audit if explicitly requested
    if (req.auditContext?.skipAudit) {
      return next();
    }

    const startTime = Date.now();
    const originalSend = res.send;
    const originalJson = res.json;
    let responseBody: any;
    let responseSent = false;

    // Capture response data
    res.send = function(body: any) {
      if (!responseSent) {
        responseBody = body;
        responseSent = true;
        logSecurityEvent();
      }
      return originalSend.call(this, body);
    };

    res.json = function(body: any) {
      if (!responseSent) {
        responseBody = body;
        responseSent = true;
        logSecurityEvent();
      }
      return originalJson.call(this, body);
    };

    // Handle cases where response is not sent via send() or json()
    res.on('finish', () => {
      if (!responseSent) {
        responseSent = true;
        logSecurityEvent();
      }
    });

    async function logSecurityEvent() {
      try {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Determine event outcome
        const outcome = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 
                       res.statusCode >= 400 && res.statusCode < 500 ? 'failure' : 'partial';

        // Skip logging based on options
        if (options.skipSuccessEvents && outcome === 'success') return;
        if (options.skipFailureEvents && outcome === 'failure') return;

        // Extract audit information
        const category = options.category || determineCategory(req);
        const eventType = options.eventType || determineEventType(req);
        const resource = options.resource || req.auditContext?.resource || determineResource(req);
        const action = options.action || req.auditContext?.action || determineAction(req);
        
        // Get client information
        const ipAddress = getClientIpAddress(req);
        const userAgent = req.get('User-Agent');
        
        // Calculate risk score
        const riskScore = options.customRiskCalculator ? 
          options.customRiskCalculator(req, res) : 
          calculateDefaultRiskScore(req, res, outcome);

        // Prepare event details
        const details = {
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode: res.statusCode,
          duration,
          requestSize: req.get('content-length') ? parseInt(req.get('content-length')!) : 0,
          responseSize: responseBody ? JSON.stringify(responseBody).length : 0,
          query: req.query,
          params: req.params,
          headers: sanitizeHeaders(req.headers),
          timestamp: new Date().toISOString()
        };

        // Add error details for failed requests
        if (outcome === 'failure' && responseBody) {
          if (typeof responseBody === 'string') {
            try {
              const parsed = JSON.parse(responseBody);
              details.error = parsed.error || parsed.message;
            } catch {
              details.error = responseBody;
            }
          } else if (responseBody.error || responseBody.message) {
            details.error = responseBody.error || responseBody.message;
          }
        }

        // Determine compliance flags
        const complianceFlags = options.complianceFlags || determineComplianceFlags(req, category);

        // Log the security event
        await securityAuditLoggingService.logSecurityEvent({
          category,
          eventType,
          severity: determineSeverity(outcome, res.statusCode, riskScore),
          userId: req.user?.id,
          sessionId: req.sessionId || extractSessionId(req),
          ipAddress,
          userAgent,
          resource,
          action,
          outcome,
          details,
          riskScore,
          complianceFlags,
          correlationId: generateCorrelationId(req)
        });

      } catch (error) {
        console.error('Failed to log security audit event:', error);
        // Don't throw error to avoid breaking the request flow
      }
    }

    next();
  };
}

/**
 * Specific middleware for authentication events
 */
export function authenticationAuditMiddleware() {
  return createSecurityAuditMiddleware({
    category: 'authentication',
    eventType: 'authentication_attempt',
    resource: 'authentication_system',
    complianceFlags: ['GDPR', 'SOX']
  });
}

/**
 * Specific middleware for data access events
 */
export function dataAccessAuditMiddleware(resource?: string) {
  return createSecurityAuditMiddleware({
    category: 'data_access',
    eventType: 'data_access',
    resource: resource || 'data_system',
    complianceFlags: ['GDPR', 'HIPAA']
  });
}

/**
 * Specific middleware for admin actions
 */
export function adminActionAuditMiddleware() {
  return createSecurityAuditMiddleware({
    category: 'admin_action',
    eventType: 'administrative_action',
    resource: 'admin_system',
    complianceFlags: ['SOX', 'ISO27001'],
    customRiskCalculator: (req, res) => {
      // Admin actions have higher base risk
      let risk = 5.0;
      
      // Increase risk for destructive actions
      if (req.method === 'DELETE') risk += 2.0;
      if (req.originalUrl?.includes('delete')) risk += 1.5;
      if (req.originalUrl?.includes('admin')) risk += 1.0;
      
      // Increase risk for failures
      if (res.statusCode >= 400) risk += 2.0;
      
      return Math.min(risk, 10.0);
    }
  });
}

/**
 * Middleware for API endpoints that handle sensitive data
 */
export function sensitiveDataAuditMiddleware(dataType: string) {
  return createSecurityAuditMiddleware({
    category: 'data_access',
    eventType: 'sensitive_data_access',
    resource: `sensitive_data_${dataType}`,
    complianceFlags: ['GDPR', 'HIPAA', 'PCI_DSS'],
    customRiskCalculator: (req, res) => {
      let risk = 4.0; // Base risk for sensitive data
      
      // Increase risk based on data type
      const highRiskTypes = ['payment', 'medical', 'personal', 'financial'];
      if (highRiskTypes.some(type => dataType.toLowerCase().includes(type))) {
        risk += 2.0;
      }
      
      // Increase risk for bulk operations
      if (req.query.limit && parseInt(req.query.limit as string) > 100) {
        risk += 1.0;
      }
      
      // Increase risk for export operations
      if (req.originalUrl?.includes('export') || req.query.format) {
        risk += 1.5;
      }
      
      return Math.min(risk, 10.0);
    }
  });
}

// Helper functions

function determineCategory(req: AuditableRequest): SecurityAuditOptions['category'] {
  const url = req.originalUrl || req.url;
  
  if (url.includes('/auth') || url.includes('/login') || url.includes('/logout')) {
    return 'authentication';
  }
  if (url.includes('/admin')) {
    return 'admin_action';
  }
  if (req.method === 'GET' && (url.includes('/api/') || url.includes('/data/'))) {
    return 'data_access';
  }
  
  return 'system_event';
}

function determineEventType(req: AuditableRequest): string {
  const url = req.originalUrl || req.url;
  const method = req.method.toLowerCase();
  
  if (url.includes('/login')) return 'user_login';
  if (url.includes('/logout')) return 'user_logout';
  if (url.includes('/register')) return 'user_registration';
  if (url.includes('/password')) return 'password_change';
  
  return `${method}_request`;
}

function determineResource(req: AuditableRequest): string {
  const url = req.originalUrl || req.url;
  
  // Extract resource from URL path
  const pathParts = url.split('/').filter(part => part && !part.match(/^\d+$/));
  
  if (pathParts.length >= 2) {
    return pathParts.slice(1, 3).join('_'); // e.g., /api/users -> api_users
  }
  
  return 'unknown_resource';
}

function determineAction(req: AuditableRequest): string {
  const method = req.method.toLowerCase();
  const url = req.originalUrl || req.url;
  
  // Map HTTP methods to actions
  const methodActions: Record<string, string> = {
    get: 'read',
    post: 'create',
    put: 'update',
    patch: 'update',
    delete: 'delete'
  };
  
  let action = methodActions[method] || method;
  
  // Refine action based on URL patterns
  if (url.includes('/search')) action = 'search';
  if (url.includes('/export')) action = 'export';
  if (url.includes('/import')) action = 'import';
  if (url.includes('/download')) action = 'download';
  if (url.includes('/upload')) action = 'upload';
  
  return action;
}

function calculateDefaultRiskScore(req: AuditableRequest, res: Response, outcome: string): number {
  let risk = 1.0; // Base risk
  
  // Method-based risk
  const methodRisk: Record<string, number> = {
    GET: 1.0,
    POST: 2.0,
    PUT: 2.5,
    PATCH: 2.0,
    DELETE: 3.0
  };
  risk += methodRisk[req.method] || 1.0;
  
  // Status code-based risk
  if (res.statusCode >= 400) risk += 2.0;
  if (res.statusCode >= 500) risk += 1.0;
  
  // Outcome-based risk
  if (outcome === 'failure') risk += 1.5;
  
  // URL-based risk
  const url = req.originalUrl || req.url;
  if (url.includes('/admin')) risk += 2.0;
  if (url.includes('/delete')) risk += 1.5;
  if (url.includes('/sensitive')) risk += 1.0;
  
  // Time-based risk (off-hours access)
  const hour = new Date().getHours();
  if (hour < 6 || hour > 22) risk += 0.5;
  
  return Math.min(Math.round(risk * 10) / 10, 10.0);
}

function determineSeverity(outcome: string, statusCode: number, riskScore: number): 'info' | 'warning' | 'error' | 'critical' {
  if (riskScore >= 8.0 || statusCode >= 500) return 'critical';
  if (riskScore >= 6.0 || statusCode >= 400) return 'error';
  if (riskScore >= 4.0 || outcome === 'failure') return 'warning';
  return 'info';
}

function determineComplianceFlags(req: AuditableRequest, category: SecurityAuditOptions['category']): string[] {
  const flags: string[] = [];
  const url = req.originalUrl || req.url;
  
  // GDPR applies to personal data access
  if (category === 'data_access' || url.includes('/user') || url.includes('/profile')) {
    flags.push('GDPR');
  }
  
  // SOX applies to financial and admin operations
  if (category === 'admin_action' || url.includes('/financial') || url.includes('/audit')) {
    flags.push('SOX');
  }
  
  // HIPAA applies to health data
  if (url.includes('/health') || url.includes('/medical')) {
    flags.push('HIPAA');
  }
  
  // PCI DSS applies to payment data
  if (url.includes('/payment') || url.includes('/card') || url.includes('/billing')) {
    flags.push('PCI_DSS');
  }
  
  // ISO27001 applies to security operations
  if (url.includes('/security') || url.includes('/auth') || category === 'security_event') {
    flags.push('ISO27001');
  }
  
  return flags;
}

function getClientIpAddress(req: Request): string {
  return (
    req.ip ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection as any)?.socket?.remoteAddress ||
    req.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    req.get('X-Real-IP') ||
    'unknown'
  );
}

function extractSessionId(req: Request): string | undefined {
  // Try to extract session ID from various sources
  return (
    req.sessionID ||
    req.get('X-Session-ID') ||
    req.cookies?.sessionId ||
    req.cookies?.['connect.sid']
  );
}

function generateCorrelationId(req: Request): string {
  // Use existing correlation ID or generate new one
  return (
    req.get('X-Correlation-ID') ||
    req.get('X-Request-ID') ||
    `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
}

function sanitizeHeaders(headers: any): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
  
  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = String(value);
    }
  }
  
  return sanitized;
}

// Export individual middleware functions
export {
  createSecurityAuditMiddleware as securityAuditMiddleware,
  authenticationAuditMiddleware,
  dataAccessAuditMiddleware,
  adminActionAuditMiddleware,
  sensitiveDataAuditMiddleware
};