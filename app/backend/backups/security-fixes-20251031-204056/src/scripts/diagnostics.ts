#!/usr/bin/env node

import dotenv from 'dotenv';
import { safeLogger } from '../utils/safeLogger';
import { databaseService } from '../services/databaseService';
import { safeLogger } from '../utils/safeLogger';
import { validateEnv } from '../utils/envValidation';
import { safeLogger } from '../utils/safeLogger';

// Load environment variables
dotenv.config();

async function runDiagnostics() {
  safeLogger.info('🔍 Running LinkDAO Backend Diagnostics...\n');

  // Environment check
  safeLogger.info('📋 Environment Variables:');
  safeLogger.info(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  safeLogger.info(`PORT: ${process.env.PORT || 'not set'}`);
  safeLogger.info(`DATABASE_URL: ${process.env.DATABASE_URL ? 'set' : 'not set'}`);
  safeLogger.info(`REDIS_URL: ${process.env.REDIS_URL ? 'set' : 'not set'}`);
  safeLogger.info('');

  // Validate environment
  try {
    const envConfig = validateEnv();
    safeLogger.info('✅ Environment validation passed');
    safeLogger.info(`Validated PORT: ${envConfig.PORT}`);
    safeLogger.info(`Validated NODE_ENV: ${envConfig.NODE_ENV}`);
  } catch (error) {
    safeLogger.error('❌ Environment validation failed:', error);
    return;
  }

  // Database connection test
  safeLogger.info('\n🗄️  Database Connection Test:');
  try {
    await databaseService.testConnection();
    safeLogger.info('✅ Database connection successful');
  } catch (error) {
    safeLogger.error('❌ Database connection failed:', error);
    safeLogger.info('💡 Possible solutions:');
    safeLogger.info('   - Check DATABASE_URL environment variable');
    safeLogger.info('   - Verify database server is running');
    safeLogger.info('   - Check network connectivity');
    safeLogger.info('   - Verify database credentials');
  }

  // Memory usage
  safeLogger.info('\n💾 Memory Usage:');
  const memUsage = process.memoryUsage();
  safeLogger.info(`RSS: ${Math.round(memUsage.rss / 1024 / 1024)} MB`);
  safeLogger.info(`Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`);
  safeLogger.info(`Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`);
  safeLogger.info(`External: ${Math.round(memUsage.external / 1024 / 1024)} MB`);

  // System info
  safeLogger.info('\n🖥️  System Information:');
  safeLogger.info(`Node.js Version: ${process.version}`);
  safeLogger.info(`Platform: ${process.platform}`);
  safeLogger.info(`Architecture: ${process.arch}`);
  safeLogger.info(`Uptime: ${Math.round(process.uptime())} seconds`);

  // Network test (if in production)
  if (process.env.NODE_ENV === 'production') {
    safeLogger.info('\n🌐 Network Connectivity Test:');
    try {
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        timeout: 5000
      });
      if (response.ok) {
        safeLogger.info('✅ External network connectivity working');
      } else {
        safeLogger.info(`⚠️  External network test returned: ${response.status}`);
      }
    } catch (error) {
      safeLogger.error('❌ External network connectivity failed:', error);
    }
  }

  safeLogger.info('\n🏁 Diagnostics completed');
}

// Run diagnostics if called directly
if (require.main === module) {
  runDiagnostics()
    .then(() => process.exit(0))
    .catch((error) => {
      safeLogger.error('Diagnostics failed:', error);
      process.exit(1);
    });
}

export { runDiagnostics };