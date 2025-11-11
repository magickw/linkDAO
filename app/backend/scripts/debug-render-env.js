#!/usr/bin/env node

/**
 * Debug Render Environment Variables
 * This script outputs all Render-related environment variables
 * to help diagnose deployment configuration issues.
 */

console.log('🔍 Render Environment Debug Information');
console.log('=====================================');

// Check Render-specific environment variables
const renderVars = [
  'RENDER',
  'RENDER_SERVICE_TYPE',
  'RENDER_SERVICE_PLAN',
  'RENDER_PRO',
  'MEMORY_LIMIT',
  'NODE_OPTIONS',
  'NODE_ENV',
  'PORT'
];

console.log('\nRender Environment Variables:');
renderVars.forEach(varName => {
  const value = process.env[varName];
  if (value !== undefined) {
    console.log(`  ${varName}: ${value}`);
  } else {
    console.log(`  ${varName}: NOT SET`);
  }
});

// Check if we're on Render
const isRender = process.env.RENDER === 'true';
const serviceType = process.env.RENDER_SERVICE_TYPE;
const isPro = process.env.RENDER_PRO === 'true';

console.log('\nRender Service Detection:');
console.log(`  Is Render: ${isRender}`);
console.log(`  Service Type: ${serviceType || 'NOT SET'}`);
console.log(`  Is Pro: ${isPro}`);

// Memory information
console.log('\nMemory Configuration:');
console.log(`  Memory Limit: ${process.env.MEMORY_LIMIT || 'NOT SET'} MB`);
console.log(`  Node Options: ${process.env.NODE_OPTIONS || 'NOT SET'}`);

// Check Node.js memory settings
console.log('\nNode.js Memory Settings:');
const nodeOptions = process.env.NODE_OPTIONS || '';
if (nodeOptions.includes('--max-old-space-size')) {
  const match = nodeOptions.match(/--max-old-space-size=(\d+)/);
  if (match) {
    console.log(`  Heap Size Limit: ${match[1]} MB`);
  }
}
if (nodeOptions.includes('--expose-gc')) {
  console.log('  Garbage Collection: Exposed');
}

console.log('\n📊 Current Memory Usage:');
const usage = process.memoryUsage();
console.log(`  RSS: ${Math.round(usage.rss / 1024 / 1024)} MB`);
console.log(`  Heap Total: ${Math.round(usage.heapTotal / 1024 / 1024)} MB`);
console.log(`  Heap Used: ${Math.round(usage.heapUsed / 1024 / 1024)} MB`);

console.log('\n✅ Render environment debug complete!');