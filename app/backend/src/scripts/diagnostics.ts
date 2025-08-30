#!/usr/bin/env node

import dotenv from 'dotenv';
import { databaseService } from '../services/databaseService';
import { validateEnv } from '../utils/envValidation';

// Load environment variables
dotenv.config();

async function runDiagnostics() {
  console.log('🔍 Running LinkDAO Backend Diagnostics...\n');

  // Environment check
  console.log('📋 Environment Variables:');
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`PORT: ${process.env.PORT || 'not set'}`);
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'set' : 'not set'}`);
  console.log(`REDIS_URL: ${process.env.REDIS_URL ? 'set' : 'not set'}`);
  console.log('');

  // Validate environment
  try {
    const envConfig = validateEnv();
    console.log('✅ Environment validation passed');
    console.log(`Validated PORT: ${envConfig.PORT}`);
    console.log(`Validated NODE_ENV: ${envConfig.NODE_ENV}`);
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    return;
  }

  // Database connection test
  console.log('\n🗄️  Database Connection Test:');
  try {
    await databaseService.testConnection();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.log('💡 Possible solutions:');
    console.log('   - Check DATABASE_URL environment variable');
    console.log('   - Verify database server is running');
    console.log('   - Check network connectivity');
    console.log('   - Verify database credentials');
  }

  // Memory usage
  console.log('\n💾 Memory Usage:');
  const memUsage = process.memoryUsage();
  console.log(`RSS: ${Math.round(memUsage.rss / 1024 / 1024)} MB`);
  console.log(`Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`);
  console.log(`Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`);
  console.log(`External: ${Math.round(memUsage.external / 1024 / 1024)} MB`);

  // System info
  console.log('\n🖥️  System Information:');
  console.log(`Node.js Version: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Architecture: ${process.arch}`);
  console.log(`Uptime: ${Math.round(process.uptime())} seconds`);

  // Network test (if in production)
  if (process.env.NODE_ENV === 'production') {
    console.log('\n🌐 Network Connectivity Test:');
    try {
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        timeout: 5000
      });
      if (response.ok) {
        console.log('✅ External network connectivity working');
      } else {
        console.log(`⚠️  External network test returned: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ External network connectivity failed:', error);
    }
  }

  console.log('\n🏁 Diagnostics completed');
}

// Run diagnostics if called directly
if (require.main === module) {
  runDiagnostics()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Diagnostics failed:', error);
      process.exit(1);
    });
}

export { runDiagnostics };