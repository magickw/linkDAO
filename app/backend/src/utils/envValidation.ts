/**
 * Environment variable validation utility
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

export function validateEnv(): EnvConfig {
  const config: EnvConfig = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '10000', 10),
    JWT_SECRET: process.env.JWT_SECRET || 'linkdao_secret_key',
  };

  // Database configuration
  if (process.env.DATABASE_URL) {
    config.DATABASE_URL = process.env.DATABASE_URL;
  } else {
    config.POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
    config.POSTGRES_PORT = parseInt(process.env.POSTGRES_PORT || '5432', 10);
    config.POSTGRES_DB = process.env.POSTGRES_DB || 'linkdao';
    config.POSTGRES_USER = process.env.POSTGRES_USER || 'postgres';
    config.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'password';
  }

  // Validation warnings
  const warnings: string[] = [];
  const errors: string[] = [];

  if (config.JWT_SECRET === 'linkdao_secret_key' && config.NODE_ENV === 'production') {
    errors.push('JWT_SECRET must be set in production');
  }

  if (!config.DATABASE_URL && !config.POSTGRES_HOST) {
    warnings.push('No database configuration found');
  }

  if (config.NODE_ENV === 'production' && !process.env.DATABASE_URL && !process.env.POSTGRES_HOST) {
    warnings.push('Consider using DATABASE_URL in production');
  }

  // Log warnings
  if (warnings.length > 0) {
    safeLogger.warn('⚠️  Environment warnings:');
    warnings.forEach(warning => safeLogger.warn(`   - ${warning}`));
  }

  // Log errors
  if (errors.length > 0) {
    safeLogger.error('❌ Environment errors:');
    errors.forEach(error => safeLogger.error(`   - ${error}`));
    if (config.NODE_ENV === 'production') {
      throw new Error('Environment validation failed');
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

  return config;
}

export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

export function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}
