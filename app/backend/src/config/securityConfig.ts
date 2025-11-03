/**
 * Security Configuration
 * 
 * Centralized security configuration for the Web3 marketplace platform
 * covering authentication, authorization, encryption, and compliance settings.
 */

import { safeLogger } from '../utils/safeLogger';

export interface SecurityConfig {
  authentication: {
    jwtSecret: string;
    jwtExpirationTime: string;
    refreshTokenExpirationTime: string;
    maxLoginAttempts: number;
    lockoutDuration: number;
    sessionTimeout: number;
    requireMFA: boolean;
    allowedOrigins: string[];
  };
  
  encryption: {
    algorithm: string;
    keyLength: number;
    ivLength: number;
    tagLength: number;
    masterKeyRotationInterval: number;
    keyDerivationIterations: number;
  };
  
  rateLimiting: {
    windowMs: number;
    maxRequests: number;
    apiMaxRequests: number;
    authMaxAttempts: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
  };
  
  ddosProtection: {
    enabled: boolean;
    threshold: number;
    duration: number;
    whitelist: string[];
    blacklist: string[];
  };
  
  compliance: {
    gdpr: {
      enabled: boolean;
      dataRetentionPeriod: number;
      anonymizationDelay: number;
      consentRequired: boolean;
    };
    ccpa: {
      enabled: boolean;
      optOutEnabled: boolean;
      dataDisclosureRequired: boolean;
    };
    pci: {
      enabled: boolean;
      tokenizationRequired: boolean;
      auditLoggingRequired: boolean;
    };
  };
  
  audit: {
    enabled: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    retentionPeriod: number;
    immutableStorage: boolean;
    realTimeAlerting: boolean;
    complianceReporting: boolean;
  };
  
  vulnerability: {
    scanningEnabled: boolean;
    scanInterval: number;
    criticalThreshold: number;
    autoRemediation: boolean;
    notificationChannels: string[];
  };
  
  dataProtection: {
    encryptionAtRest: boolean;
    encryptionInTransit: boolean;
    piiDetection: boolean;
    dataClassification: boolean;
    accessLogging: boolean;
    dataLossPreventionEnabled: boolean;
  };
}

export const securityConfig: SecurityConfig = {
  authentication: {
    jwtSecret: process.env.JWT_SECRET || '', // Will be validated in validateSecurityConfig
    jwtExpirationTime: process.env.JWT_EXPIRATION || '24h',
    refreshTokenExpirationTime: process.env.REFRESH_TOKEN_EXPIRATION || '7d',
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000'), // 15 minutes
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000'), // 1 hour
    requireMFA: process.env.REQUIRE_MFA === 'true',
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,https://linkdao.io,https://www.linkdao.io').split(','),
  },
  
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32, // 256 bits
    ivLength: 16, // 128 bits
    tagLength: 16, // 128 bits
    masterKeyRotationInterval: parseInt(process.env.KEY_ROTATION_INTERVAL || '2592000000'), // 30 days
    keyDerivationIterations: parseInt(process.env.KEY_DERIVATION_ITERATIONS || '100000'),
  },
  
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '1000'),
    apiMaxRequests: parseInt(process.env.API_RATE_LIMIT_MAX || '500'),
    authMaxAttempts: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10'),
    skipSuccessfulRequests: process.env.SKIP_SUCCESSFUL_REQUESTS === 'true',
    skipFailedRequests: process.env.SKIP_FAILED_REQUESTS === 'false',
  },
  
  ddosProtection: {
    enabled: process.env.DDOS_PROTECTION_ENABLED !== 'false',
    threshold: parseInt(process.env.DDOS_THRESHOLD || '100'),
    duration: parseInt(process.env.DDOS_DURATION || '600000'), // 10 minutes
    whitelist: (process.env.DDOS_WHITELIST || '').split(',').filter(Boolean),
    blacklist: (process.env.DDOS_BLACKLIST || '').split(',').filter(Boolean),
  },
  
  compliance: {
    gdpr: {
      enabled: process.env.GDPR_ENABLED !== 'false',
      dataRetentionPeriod: parseInt(process.env.GDPR_RETENTION_PERIOD || '2555'), // 7 years in days
      anonymizationDelay: parseInt(process.env.GDPR_ANONYMIZATION_DELAY || '30'), // 30 days
      consentRequired: process.env.GDPR_CONSENT_REQUIRED !== 'false',
    },
    ccpa: {
      enabled: process.env.CCPA_ENABLED === 'true',
      optOutEnabled: process.env.CCPA_OPT_OUT_ENABLED !== 'false',
      dataDisclosureRequired: process.env.CCPA_DISCLOSURE_REQUIRED !== 'false',
    },
    pci: {
      enabled: process.env.PCI_ENABLED === 'true',
      tokenizationRequired: process.env.PCI_TOKENIZATION_REQUIRED !== 'false',
      auditLoggingRequired: process.env.PCI_AUDIT_LOGGING_REQUIRED !== 'false',
    },
  },
  
  audit: {
    enabled: process.env.AUDIT_ENABLED !== 'false',
    logLevel: (process.env.AUDIT_LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',
    retentionPeriod: parseInt(process.env.AUDIT_RETENTION_PERIOD || '2555'), // 7 years
    immutableStorage: process.env.AUDIT_IMMUTABLE_STORAGE !== 'false',
    realTimeAlerting: process.env.AUDIT_REAL_TIME_ALERTING !== 'false',
    complianceReporting: process.env.AUDIT_COMPLIANCE_REPORTING !== 'false',
  },
  
  vulnerability: {
    scanningEnabled: process.env.VULNERABILITY_SCANNING_ENABLED !== 'false',
    scanInterval: parseInt(process.env.VULNERABILITY_SCAN_INTERVAL || '86400000'), // 24 hours
    criticalThreshold: parseInt(process.env.VULNERABILITY_CRITICAL_THRESHOLD || '7'), // CVSS 7.0+
    autoRemediation: process.env.VULNERABILITY_AUTO_REMEDIATION === 'true',
    notificationChannels: (process.env.VULNERABILITY_NOTIFICATION_CHANNELS || 'email,slack').split(','),
  },
  
  dataProtection: {
    encryptionAtRest: process.env.ENCRYPTION_AT_REST !== 'false',
    encryptionInTransit: process.env.ENCRYPTION_IN_TRANSIT !== 'false',
    piiDetection: process.env.PII_DETECTION_ENABLED !== 'false',
    dataClassification: process.env.DATA_CLASSIFICATION_ENABLED !== 'false',
    accessLogging: process.env.ACCESS_LOGGING_ENABLED !== 'false',
    dataLossPreventionEnabled: process.env.DLP_ENABLED !== 'false',
  },
};

export const validateSecurityConfig = (): void => {
  // Skip validation in development mode
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'development') {
    console.warn('⚠️  Running in development mode - skipping security configuration validation');
    return;
  }

  const requiredEnvVars = [
    'JWT_SECRET',
    'MASTER_ENCRYPTION_KEY',
    'TOKEN_SECRET',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required security environment variables: ${missingVars.join(', ')}`);
  }

  // Validate JWT secret strength - now required to be at least 32 characters
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET is required and must be at least 32 characters long for security');
  }

  // Validate master encryption key
  if (process.env.MASTER_ENCRYPTION_KEY && process.env.MASTER_ENCRYPTION_KEY.length < 64) {
    throw new Error('MASTER_ENCRYPTION_KEY must be at least 64 characters (32 bytes hex)');
  }

  // Validate token secret
  if (process.env.TOKEN_SECRET && process.env.TOKEN_SECRET.length < 32) {
    throw new Error('TOKEN_SECRET must be at least 32 characters');
  }

  safeLogger.info('✅ Security configuration validated successfully');
};

export default securityConfig;
