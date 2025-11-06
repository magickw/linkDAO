#!/usr/bin/env node

/**
 * EMERGENCY MEMORY FIX SCRIPT
 * This script addresses the critical memory issue in production
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚨 EMERGENCY MEMORY FIX STARTING...');

// 1. IMMEDIATE MEMORY REDUCTION
function immediateMemoryFix() {
  console.log('1. Applying immediate memory fixes...');
  
  // Force garbage collection if available
  if (global.gc) {
    console.log('   - Running garbage collection...');
    global.gc();
  }
  
  // Clear Node.js require cache (except core modules)
  const beforeCount = Object.keys(require.cache).length;
  for (const id in require.cache) {
    // Only clear non-essential modules
    if (!id.includes('node_modules/express') && 
        !id.includes('node_modules/pg') && 
        !id.includes('node_modules/redis') &&
        !id.includes('/middleware/') &&
        !id.includes('/routes/')) {
      delete require.cache[id];
    }
  }
  const afterCount = Object.keys(require.cache).length;
  console.log(`   - Cleared ${beforeCount - afterCount} modules from cache`);
}

// 2. OPTIMIZE ENVIRONMENT VARIABLES
function optimizeEnvironment() {
  console.log('2. Optimizing environment variables...');
  
  const envOptimizations = {
    // Node.js memory optimizations
    'NODE_OPTIONS': '--max-old-space-size=512 --gc-interval=100',
    
    // Database connection limits
    'DB_POOL_MAX': '10',
    'DB_POOL_MIN': '2',
    'DB_IDLE_TIMEOUT': '5000',
    
    // Redis optimizations
    'REDIS_MAX_MEMORY': '128mb',
    'REDIS_MAX_MEMORY_POLICY': 'allkeys-lru',
    
    // Disable non-essential features
    'DISABLE_ANALYTICS': 'true',
    'DISABLE_BACKGROUND_JOBS': 'true',
    'DISABLE_REAL_TIME_UPDATES': 'true',
    
    // Enable compression
    'ENABLE_COMPRESSION': 'true',
    'COMPRESSION_LEVEL': '6'
  };
  
  // Write optimized .env
  const envPath = path.join(__dirname, '../.env.emergency');
  const envContent = Object.entries(envOptimizations)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync(envPath, envContent);
  console.log('   - Created emergency environment configuration');
}

// 3. CREATE MEMORY-OPTIMIZED INDEX FILE
function createOptimizedIndex() {
  console.log('3. Creating memory-optimized index...');
  
  const optimizedIndex = `
// EMERGENCY MEMORY-OPTIMIZED INDEX
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');

const app = express();

// Essential middleware only
app.use(helmet());
app.use(compression({ level: 6 }));
app.use(express.json({ limit: '1mb' }));

// Memory monitoring
const memoryMonitor = setInterval(() => {
  const usage = process.memoryUsage();
  const heapUsedMB = usage.heapUsed / 1024 / 1024;
  const heapTotalMB = usage.heapTotal / 1024 / 1024;
  const percent = (heapUsedMB / heapTotalMB) * 100;
  
  if (percent > 90) {
    console.error(\`🚨 CRITICAL MEMORY: \${percent.toFixed(1)}%\`);
    if (global.gc) global.gc();
  }
}, 5000);

// Essential health check only
app.get('/health', (req, res) => {
  const usage = process.memoryUsage();
  res.json({
    status: 'ok',
    memory: {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024)
    },
    uptime: process.uptime()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  clearInterval(memoryMonitor);
  process.exit(0);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(\`🚀 Emergency server running on port \${PORT}\`);
  console.log(\`Memory: \${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\`);
});
`;

  fs.writeFileSync(path.join(__dirname, '../src/index.emergency.js'), optimizedIndex);
  console.log('   - Created emergency index file');
}

// 4. CREATE RESTART SCRIPT
function createRestartScript() {
  console.log('4. Creating restart script...');
  
  const restartScript = `#!/bin/bash
echo "🚨 EMERGENCY RESTART SEQUENCE"

# Kill existing processes
pkill -f "node.*index"
sleep 2

# Clear system cache if possible
sync
echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || echo "Cannot clear system cache (requires root)"

# Start with memory optimizations
export NODE_OPTIONS="--max-old-space-size=512 --gc-interval=100"
export NODE_ENV=production

# Use emergency configuration
if [ -f ".env.emergency" ]; then
  export $(cat .env.emergency | xargs)
fi

# Start emergency server
echo "Starting emergency server..."
node src/index.emergency.js &

echo "Emergency restart complete"
`;

  const scriptPath = path.join(__dirname, 'emergency-restart.sh');
  fs.writeFileSync(scriptPath, restartScript);
  fs.chmodSync(scriptPath, '755');
  console.log('   - Created emergency restart script');
}

// 5. APPLY FIXES
function main() {
  try {
    immediateMemoryFix();
    optimizeEnvironment();
    createOptimizedIndex();
    createRestartScript();
    
    console.log('\n✅ EMERGENCY MEMORY FIXES APPLIED');
    console.log('\nNext steps:');
    console.log('1. Run: ./scripts/emergency-restart.sh');
    console.log('2. Monitor: curl http://localhost:3001/health');
    console.log('3. Check memory usage with: ps aux | grep node');
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error.message);
    process.exit(1);
  }
}

main();