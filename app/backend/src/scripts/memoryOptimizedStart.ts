#!/usr/bin/env node
/**
 * Memory-Optimized Start Script
 * 
 * This script starts the application with memory optimization flags
 * and proper resource allocation for constrained environments.
 */

import { spawn } from 'child_process';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Detect environment
const isRender = !!process.env.RENDER;
const isRenderFree = isRender && !process.env.RENDER_PRO;
const isRenderStandard = isRender && process.env.RENDER_SERVICE_TYPE === 'standard';
const memoryLimit = process.env.MEMORY_LIMIT ? parseInt(process.env.MEMORY_LIMIT) : null;

console.log('🚀 Memory-Optimized Application Start Script');
console.log('============================================');
console.log(`Environment: ${isRender ? 'Render' : 'Local'}`);
console.log(`Render Tier: ${isRenderFree ? 'Free' : isRenderStandard ? 'Standard' : 'Pro'}`);
console.log(`Memory Limit: ${memoryLimit || 'Not set'} MB`);

// Determine optimization settings based on environment
let nodeArgs: string[] = [];
let envVars: Record<string, string> = { ...process.env };

if (isRenderFree || (memoryLimit && memoryLimit < 512)) {
  console.log('🔧 Applying memory-critical optimizations...');
  
  // Node.js flags for memory-constrained environments
  nodeArgs = [
    '--max-old-space-size=384', // Limit heap to 384MB
    '--gc-interval=100', // More frequent garbage collection
    '--expose-gc', // Expose garbage collection
    '--no-compilation-cache', // Disable compilation cache to save memory
    '--max-semi-space-size=8', // Reduce semi-space size
  ];
  
  // Environment variables for memory optimization
  envVars = {
    ...envVars,
    NODE_OPTIONS: '--max-old-space-size=384 --gc-interval=100 --expose-gc --no-compilation-cache --max-semi-space-size=8',
    REDIS_ENABLED: 'false', // Disable Redis in memory-critical environments
    DISABLE_WEBSOCKETS: 'true', // Disable WebSockets to save memory
    DISABLE_MONITORING: 'true', // Disable monitoring services
    MEMORY_LIMIT: memoryLimit?.toString() || '384', // Set memory limit
  };
} else if (isRenderStandard || (memoryLimit && memoryLimit < 1024)) {
  console.log('🔧 Applying memory-constrained optimizations...');
  
  // Node.js flags for memory-constrained environments
  nodeArgs = [
    '--max-old-space-size=768', // Limit heap to 768MB
    '--gc-interval=200', // More frequent garbage collection
    '--expose-gc', // Expose garbage collection
  ];
  
  // Environment variables for memory optimization
  envVars = {
    ...envVars,
    NODE_OPTIONS: '--max-old-space-size=768 --gc-interval=200 --expose-gc',
    MEMORY_LIMIT: memoryLimit?.toString() || '768', // Set memory limit
  };
} else {
  console.log('🔧 Applying standard optimizations...');
  
  // Standard Node.js flags
  nodeArgs = [
    '--expose-gc', // Expose garbage collection
  ];
  
  // Environment variables
  envVars = {
    ...envVars,
    NODE_OPTIONS: '--expose-gc',
  };
}

// Write environment variables to a file for debugging
const envDebugFile = join(__dirname, '..', '..', '.env.debug');
const envContent = Object.entries(envVars)
  .filter(([key]) => key !== 'PATH' && key !== 'HOME' && key !== 'USER') // Filter out system variables
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');

writeFileSync(envDebugFile, envContent);
console.log(`📝 Environment variables written to: ${envDebugFile}`);

// Start the application
const appPath = join(__dirname, '..', 'index.ts');
console.log(`🚀 Starting application with args: node ${nodeArgs.join(' ')} ${appPath}`);

const child = spawn('node', [...nodeArgs, appPath], {
  env: envVars,
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`🏁 Application exited with code ${code}`);
  process.exit(code || 0);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  child.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  child.kill('SIGINT');
});