/**
 * Security Enhancements Configuration
 * 
 * Additional security layers to mitigate risks from vulnerable dependencies
 */

export interface SecurityEnhancementConfig {
  rateLimiting: {
    global: {
      windowMs: number;
      max: number;
    };
    auth: {
      windowMs: number;
      max: number;
    };
    api: {
      windowMs: number;
      max: number;
    };
  };
  inputValidation: {
    maxPayloadSize: string;
    allowedContentTypes: string[];
  };
  securityHeaders: {
    hsts: {
      maxAge: number;
      includeSubDomains: boolean;
      preload: boolean;
    };
    frameguard: {
      action: string;
    };
    referrerPolicy: string;
  };
  dependencyWhitelist: string[];
  dependencyBlacklist: string[];
}

export const securityEnhancementConfig: SecurityEnhancementConfig = {
  rateLimiting: {
    global: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5 // limit each IP to 5 authentication requests per windowMs
    },
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 API requests per windowMs
    }
  },
  inputValidation: {
    maxPayloadSize: '10mb',
    allowedContentTypes: [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data'
    ]
  },
  securityHeaders: {
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    frameguard: {
      action: 'deny'
    },
    referrerPolicy: 'no-referrer'
  },
  dependencyWhitelist: [
    // Known safe packages
    'express',
    'helmet',
    'cors',
    'bcrypt',
    'jsonwebtoken',
    'joi',
    'ethers',
    'drizzle-orm'
  ],
  dependencyBlacklist: [
    // Known vulnerable packages that should be avoided
    'moment', // Prefer dayjs
    'request', // Deprecated
    'left-pad', // Not needed with modern JS
    'flatmap-stream' // Malicious package
  ]
};

/**
 * Security middleware to add additional protection layers
 */
export const applySecurityEnhancements = (app: any) => {
  // Enhanced rate limiting
  app.use('/api/', (req: any, res: any, next: any) => {
    // This is a placeholder - actual implementation would use express-rate-limit
    next();
  });
  
  // Enhanced input validation
  app.use((req: any, res: any, next: any) => {
    // Sanitize inputs
    // This is a placeholder - actual implementation would use express-validator or similar
    next();
  });
  
  // Enhanced security headers
  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 
      `max-age=${securityEnhancementConfig.securityHeaders.hsts.maxAge}; ` +
      `${securityEnhancementConfig.securityHeaders.hsts.includeSubDomains ? 'includeSubDomains; ' : ''}` +
      `${securityEnhancementConfig.securityHeaders.hsts.preload ? 'preload' : ''}`);
    res.setHeader('Referrer-Policy', securityEnhancementConfig.securityHeaders.referrerPolicy);
    next();
  });
};