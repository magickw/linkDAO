#!/usr/bin/env node

/**
 * Validate 2GB RAM Configuration
 * Checks that all settings are appropriate for Render Standard plan
 */

console.log('🔍 Validating 2GB RAM Configuration...\n');

// Check Node.js memory settings
const nodeOptions = process.env.NODE_OPTIONS || '';
console.log('Node.js Configuration:');
console.log(`  NODE_OPTIONS: ${nodeOptions || 'Not set'}`);

if (nodeOptions.includes('--max-old-space-size=1536')) {
  console.log('  ✅ Memory limit: 1536MB (appropriate for 2GB)');
} else if (nodeOptions.includes('--max-old-space-size=512')) {
  console.log('  ⚠️  Memory limit: 512MB (too conservative for 2GB)');
} else {
  console.log('  ❌ Memory limit: Not set or incorrect');
}

if (nodeOptions.includes('--expose-gc')) {
  console.log('  ✅ Garbage collection: Enabled');
} else {
  console.log('  ⚠️  Garbage collection: Not enabled');
}

// Check environment variables
console.log('\nEnvironment Configuration:');
const dbPoolMax = process.env.DB_POOL_MAX || 'Not set';
const redisMaxMemory = process.env.REDIS_MAX_MEMORY || 'Not set';
const disableAnalytics = process.env.DISABLE_ANALYTICS || 'false';

console.log(`  DB_POOL_MAX: ${dbPoolMax}`);
if (parseInt(dbPoolMax) >= 15) {
  console.log('  ✅ Database connections: Appropriate for 2GB');
} else if (parseInt(dbPoolMax) >= 5) {
  console.log('  ⚠️  Database connections: Conservative but acceptable');
} else {
  console.log('  ❌ Database connections: Too low for 2GB');
}

console.log(`  REDIS_MAX_MEMORY: ${redisMaxMemory}`);
if (redisMaxMemory.includes('256mb') || redisMaxMemory.includes('192mb')) {
  console.log('  ✅ Redis memory: Appropriate for 2GB');
} else if (redisMaxMemory.includes('128mb')) {
  console.log('  ⚠️  Redis memory: Conservative but acceptable');
} else {
  console.log('  ❌ Redis memory: Too low for 2GB');
}

console.log(`  DISABLE_ANALYTICS: ${disableAnalytics}`);
if (disableAnalytics === 'false') {
  console.log('  ✅ Analytics: Enabled (good for 2GB)');
} else {
  console.log('  ⚠️  Analytics: Disabled (unnecessary with 2GB)');
}

// Check current memory usage
console.log('\nCurrent Memory Status:');
const usage = process.memoryUsage();
const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
const rssMB = Math.round(usage.rss / 1024 / 1024);

console.log(`  Heap Used: ${heapUsedMB}MB`);
console.log(`  Heap Total: ${heapTotalMB}MB`);
console.log(`  RSS: ${rssMB}MB`);

if (rssMB < 500) {
  console.log('  ✅ Memory usage: Low (good headroom)');
} else if (rssMB < 1000) {
  console.log('  ✅ Memory usage: Moderate (acceptable)');
} else if (rssMB < 1500) {
  console.log('  ⚠️  Memory usage: High (monitor closely)');
} else {
  console.log('  ❌ Memory usage: Critical (investigate)');
}

// Recommendations
console.log('\n📋 Recommendations:');

if (!nodeOptions.includes('1536')) {
  console.log('  • Set NODE_OPTIONS="--max-old-space-size=1536 --expose-gc"');
}

if (parseInt(dbPoolMax) < 15) {
  console.log('  • Increase DB_POOL_MAX to 15-20 for better performance');
}

if (!redisMaxMemory.includes('256mb') && !redisMaxMemory.includes('192mb')) {
  console.log('  • Increase REDIS_MAX_MEMORY to 192mb-256mb');
}

if (disableAnalytics === 'true') {
  console.log('  • Enable analytics (DISABLE_ANALYTICS=false) with 2GB RAM');
}

console.log('\n🎯 For optimal 2GB configuration, run:');
console.log('   ./scripts/start-production-2gb.sh');

console.log('\n✅ Configuration validation complete!');