/**
 * Enhanced Environment Variable Validation Utility
 * Validates all critical security secrets and configuration
 */

import { safeLogger } from './safeLogger';

export interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  JWT_SECRET: string;
  DATABASE_URL?: string;
  POSTGRES_HOST?: string;
  POSTGRES_PORT?: number;
  POSTGRES_DB?: string;
  POSTGRES_USER?: string;
  POSTGRES_PASSWORD?: string;
}

// Minimum secret lengths for security
const MIN_SECRET_LENGTH = 32;
const MIN_JWT_SECRET_LENGTH = 64;

// List of weak/default secrets that should never be used in production
const WEAK_SECRETS = [
  'linkdao_secret_key',
  'development-secret-key-change-in-production',
  'your_secret_here',
  'change_me',
  'secret',
  'password',
  '123456',
];

/**
 * Validate that a secret is strong enough for production use
 */
function validateSecretStrength(secretName: string, secret: string | undefined, minLength: number = MIN_SECRET_LENGTH): string[] {
  const errors: string[] = [];

  if (!secret || secret.trim() === '') {
    errors.push(`${secretName} is not set`);
    return errors;
  }

  if (secret.length < minLength) {
    errors.push(`${secretName} is too short (minimum ${minLength} characters)`);
  }

  // Check for weak/default secrets
  const lowerSecret = secret.toLowerCase();
  for (const weakSecret of WEAK_SECRETS) {
    if (lowerSecret.includes(weakSecret.toLowerCase())) {
      errors.push(`${secretName} contains a weak/default value`);
      break;
    }
  }

  return errors;
}

/**
 * Validate all required environment variables
 */
export function validateEnv(): EnvConfig {
  const config: EnvConfig = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '10000', 10),
    JWT_SECRET: process.env.JWT_SECRET || '',
  };

  // Database configuration
  if (process.env.DATABASE_URL) {
    config.DATABASE_URL = process.env.DATABASE_URL;
  } else {
    config.POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
    config.POSTGRES_PORT = parseInt(process.env.POSTGRES_PORT || '5432', 10);
    config.POSTGRES_DB = process.env.POSTGRES_DB || 'linkdao';
    config.POSTGRES_USER = process.env.POSTGRES_USER || 'postgres';
    config.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || '';
  }

  const warnings: string[] = [];
  const errors: string[] = [];
  const isProduction = config.NODE_ENV === 'production';

  // Critical secrets validation
  const criticalSecrets = [
    { name: 'JWT_SECRET', value: process.env.JWT_SECRET, minLength: MIN_JWT_SECRET_LENGTH },
    { name: 'API_SECRET', value: process.env.API_SECRET, minLength: MIN_SECRET_LENGTH },
    { name: 'CSRF_SECRET', value: process.env.CSRF_SECRET, minLength: MIN_SECRET_LENGTH },
    { name: 'SESSION_SECRET', value: process.env.SESSION_SECRET, minLength: MIN_SECRET_LENGTH },
    { name: 'MASTER_ENCRYPTION_KEY', value: process.env.MASTER_ENCRYPTION_KEY, minLength: MIN_SECRET_LENGTH },
    { name: 'TOKEN_SECRET', value: process.env.TOKEN_SECRET, minLength: MIN_SECRET_LENGTH },
  ];

  for (const { name, value, minLength } of criticalSecrets) {
    const secretErrors = validateSecretStrength(name, value, minLength);
    if (isProduction) {
      errors.push(...secretErrors);
    } else if (secretErrors.length > 0) {
      warnings.push(...secretErrors.map(e => `${e} (development mode)`));
    }
  }

  // Database validation
  if (!config.DATABASE_URL && !config.POSTGRES_HOST) {
    if (isProduction) {
      errors.push('No database configuration found');
    } else {
      warnings.push('No database configuration found');
    }
  }

  // Database password validation
  if (!config.DATABASE_URL && config.POSTGRES_PASSWORD) {
    const dbPasswordErrors = validateSecretStrength('POSTGRES_PASSWORD', config.POSTGRES_PASSWORD);
    if (isProduction) {
      errors.push(...dbPasswordErrors);
    } else if (dbPasswordErrors.length > 0) {
      warnings.push(...dbPasswordErrors.map(e => `${e} (development mode)`));
    }
  }

  // Redis validation
  if (process.env.REDIS_ENABLED === 'true' || isProduction) {
    if (!process.env.REDIS_URL) {
      if (isProduction) {
        errors.push('REDIS_URL is required in production');
      } else {
        warnings.push('REDIS_URL is not set');
      }
    }
  }

  // Third-party service validation (warnings only)
  const optionalServices = [
    'OPENAI_API_KEY',
    'PINATA_JWT',
    'STRIPE_SECRET_KEY',
    'CLOUDINARY_API_SECRET',
    'RESEND_API_KEY',
  ];

  for (const service of optionalServices) {
    if (!process.env[service]) {
      warnings.push(`${service} is not set (optional service may not work)`);
    }
  }

  // Blockchain configuration
  if (!process.env.RPC_URL && !process.env.WEB3_PROVIDER_URL) {
    warnings.push('No blockchain RPC URL configured');
  }

  // Log warnings
  if (warnings.length > 0) {
    safeLogger.warn('⚠️  Environment warnings:');
    warnings.forEach(warning => safeLogger.warn(`   - ${warning}`));
  }

  // Log errors and fail in production
  if (errors.length > 0) {
    safeLogger.error('❌ Environment validation errors:');
    errors.forEach(error => safeLogger.error(`   - ${error}`));

    if (isProduction) {
      safeLogger.error('\n🚨 CRITICAL: Application cannot start with invalid configuration in production');
      safeLogger.error('Please set all required environment variables and use strong secrets.');
      safeLogger.error('See .env.example for required variables.\n');
      throw new Error('Environment validation failed - missing or weak secrets in production');
    } else {
      safeLogger.warn('\n⚠️  Development mode: Continuing despite validation errors');
      safeLogger.warn('These errors would prevent startup in production!\n');
    }
  }

  // Log configuration (without sensitive data)
  safeLogger.info('🔧 Environment configuration:');
  safeLogger.info(`   - NODE_ENV: ${config.NODE_ENV}`);
  safeLogger.info(`   - PORT: ${config.PORT}`);
  safeLogger.info(`   - JWT_SECRET: ${config.JWT_SECRET ? '[SET]' : '[NOT SET]'}`);
  safeLogger.info(`   - DATABASE_URL: ${config.DATABASE_URL ? '[SET]' : '[NOT SET]'}`);

  if (!config.DATABASE_URL) {
    safeLogger.info(`   - POSTGRES_HOST: ${config.POSTGRES_HOST}`);
    safeLogger.info(`   - POSTGRES_PORT: ${config.POSTGRES_PORT}`);
    safeLogger.info(`   - POSTGRES_DB: ${config.POSTGRES_DB}`);
    safeLogger.info(`   - POSTGRES_USER: ${config.POSTGRES_USER}`);
    safeLogger.info(`   - POSTGRES_PASSWORD: ${config.POSTGRES_PASSWORD ? '[SET]' : '[NOT SET]'}`);
  }

  safeLogger.info(`   - REDIS_ENABLED: ${process.env.REDIS_ENABLED || 'false'}`);
  safeLogger.info(`   - REDIS_URL: ${process.env.REDIS_URL ? '[SET]' : '[NOT SET]'}`);

  if (isProduction && errors.length === 0) {
    safeLogger.info('✅ All critical environment variables validated successfully');
  }

  return config;
}

/**
 * Get a required environment variable or throw an error
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get an optional environment variable with a default value
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * Validate that a secret meets minimum security requirements
 * Throws an error if validation fails in production
 */
export function validateSecret(name: string, secret: string | undefined, minLength: number = MIN_SECRET_LENGTH): void {
  const errors = validateSecretStrength(name, secret, minLength);

  if (errors.length > 0 && isProduction()) {
    throw new Error(`Secret validation failed for ${name}: ${errors.join(', ')}`);
  }
}
