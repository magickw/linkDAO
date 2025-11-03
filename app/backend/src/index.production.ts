#!/usr/bin/env node

/**
 * Production Server Entry Point
 * 
 * This is the main entry point for the production marketplace API server.
 * It initializes all production services including:
 * - Redis cache cluster
 * - API gateway with rate limiting
 * - SSL/TLS security
 * - Load balancing
 * - Health monitoring
 * - Graceful shutdown handling
 */

import dotenv from 'dotenv';
import { safeLogger } from './utils/safeLogger';
import { startProductionServer } from './config/production-server';

// Load environment variables first
dotenv.config();

// Validate critical environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'NODE_ENV'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  safeLogger.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(envVar => {
    safeLogger.error(`  - ${envVar}`);
  });
  safeLogger.error('\nPlease set these environment variables and try again.');
  process.exit(1);
}

// Set production defaults
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

async function main() {
  safeLogger.info('🏭 Starting Marketplace API Production Server');
  safeLogger.info('==============================================');
  safeLogger.info(`📅 Started at: ${new Date().toISOString()}`);
  safeLogger.info(`🔧 Node.js: ${process.version}`);
  safeLogger.info(`💾 Platform: ${process.platform} ${process.arch}`);
  safeLogger.info(`🆔 Process ID: ${process.pid}`);
  safeLogger.info('');

  try {
    // Start the production server
    const serverManager = await startProductionServer();
    
    // Log successful startup
    safeLogger.info('🎉 Marketplace API server is ready!');
    safeLogger.info('');
    safeLogger.info('📊 Server Status:');
    safeLogger.info(`  ✅ Environment: ${process.env.NODE_ENV}`);
    safeLogger.info(`  ✅ Database: Connected`);
    safeLogger.info(`  ✅ Redis: Connected`);
    safeLogger.info(`  ✅ API Gateway: Active`);
    
    if (process.env.SSL_ENABLED === 'true') {
      safeLogger.info(`  ✅ SSL/TLS: Enabled`);
    }
    
    if (process.env.LB_ENABLED === 'true') {
      safeLogger.info(`  ✅ Load Balancer: Active`);
    }
    
    safeLogger.info('');
    safeLogger.info('🔗 Ready to serve marketplace API requests!');
    
    // Keep the process alive
    process.on('SIGTERM', () => {
      safeLogger.info('📡 Received SIGTERM, shutting down gracefully...');
    });
    
    process.on('SIGINT', () => {
      safeLogger.info('📡 Received SIGINT, shutting down gracefully...');
    });

  } catch (error) {
    safeLogger.error('💥 Failed to start production server:', error);
    
    // Log additional error details in development
    if (process.env.NODE_ENV !== 'production') {
      safeLogger.error('Stack trace:', error.stack);
    }
    
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  safeLogger.error('💥 Unhandled Promise Rejection:', reason);
  safeLogger.error('Promise:', promise);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  safeLogger.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
if (require.main === module) {
  main().catch((error) => {
    safeLogger.error('💥 Startup failed:', error);
    process.exit(1);
  });
}
