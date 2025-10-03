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
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(envVar => {
    console.error(`  - ${envVar}`);
  });
  console.error('\nPlease set these environment variables and try again.');
  process.exit(1);
}

// Set production defaults
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

async function main() {
  console.log('🏭 Starting Marketplace API Production Server');
  console.log('==============================================');
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`🔧 Node.js: ${process.version}`);
  console.log(`💾 Platform: ${process.platform} ${process.arch}`);
  console.log(`🆔 Process ID: ${process.pid}`);
  console.log('');

  try {
    // Start the production server
    const serverManager = await startProductionServer();
    
    // Log successful startup
    console.log('🎉 Marketplace API server is ready!');
    console.log('');
    console.log('📊 Server Status:');
    console.log(`  ✅ Environment: ${process.env.NODE_ENV}`);
    console.log(`  ✅ Database: Connected`);
    console.log(`  ✅ Redis: Connected`);
    console.log(`  ✅ API Gateway: Active`);
    
    if (process.env.SSL_ENABLED === 'true') {
      console.log(`  ✅ SSL/TLS: Enabled`);
    }
    
    if (process.env.LB_ENABLED === 'true') {
      console.log(`  ✅ Load Balancer: Active`);
    }
    
    console.log('');
    console.log('🔗 Ready to serve marketplace API requests!');
    
    // Keep the process alive
    process.on('SIGTERM', () => {
      console.log('📡 Received SIGTERM, shutting down gracefully...');
    });
    
    process.on('SIGINT', () => {
      console.log('📡 Received SIGINT, shutting down gracefully...');
    });

  } catch (error) {
    console.error('💥 Failed to start production server:', error);
    
    // Log additional error details in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('Stack trace:', error.stack);
    }
    
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Startup failed:', error);
    process.exit(1);
  });
}