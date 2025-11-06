#!/usr/bin/env node

/**
 * MEMORY MONITORING SCRIPT
 * Continuously monitors memory usage and provides alerts
 */

const { execSync } = require('child_process');

console.log('🔍 Starting Memory Monitor...');

let alertCount = 0;
let criticalCount = 0;

function getMemoryStats() {
  const usage = process.memoryUsage();
  return {
    heapUsed: usage.heapUsed / 1024 / 1024,
    heapTotal: usage.heapTotal / 1024 / 1024,
    rss: usage.rss / 1024 / 1024,
    external: usage.external / 1024 / 1024,
    arrayBuffers: usage.arrayBuffers / 1024 / 1024
  };
}

function getSystemMemory() {
  try {
    // Get system memory info (macOS/Linux)
    const free = execSync('free -m 2>/dev/null || vm_stat | head -4', { encoding: 'utf8' });
    return free;
  } catch (error) {
    return 'System memory info not available';
  }
}

function checkProcesses() {
  try {
    // Check for Node.js processes
    const processes = execSync('ps aux | grep node | grep -v grep', { encoding: 'utf8' });
    return processes.split('\n').filter(line => line.trim()).length;
  } catch (error) {
    return 0;
  }
}

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + 'MB';
}

function logMemoryStatus() {
  const stats = getMemoryStats();
  const percent = (stats.heapUsed / stats.heapTotal) * 100;
  const timestamp = new Date().toISOString();
  
  // Color coding
  let status = '✅ NORMAL';
  let color = '\x1b[32m'; // Green
  
  if (percent > 95) {
    status = '🚨 CRITICAL';
    color = '\x1b[31m'; // Red
    criticalCount++;
  } else if (percent > 85) {
    status = '⚠️ HIGH';
    color = '\x1b[33m'; // Yellow
    alertCount++;
  } else if (percent > 70) {
    status = '📊 MODERATE';
    color = '\x1b[36m'; // Cyan
  }
  
  console.log(`${color}[${timestamp}] ${status}\x1b[0m`);
  console.log(`  Heap: ${formatBytes(stats.heapUsed * 1024 * 1024)}/${formatBytes(stats.heapTotal * 1024 * 1024)} (${percent.toFixed(1)}%)`);
  console.log(`  RSS: ${formatBytes(stats.rss * 1024 * 1024)}`);
  console.log(`  External: ${formatBytes(stats.external * 1024 * 1024)}`);
  console.log(`  ArrayBuffers: ${formatBytes(stats.arrayBuffers * 1024 * 1024)}`);
  
  // Show process count
  const processCount = checkProcesses();
  if (processCount > 0) {
    console.log(`  Node Processes: ${processCount}`);
  }
  
  // Critical memory actions
  if (percent > 95) {
    console.log('  🚨 CRITICAL ACTION: Running garbage collection...');
    if (global.gc) {
      global.gc();
    }
    
    if (criticalCount > 5) {
      console.log('  🚨 RECOMMENDATION: Immediate restart required!');
      console.log('  Run: NODE_OPTIONS="--max-old-space-size=512" npm start');
    }
  }
  
  console.log(''); // Empty line for readability
}

function showSummary() {
  console.log('\n📊 MEMORY MONITORING SUMMARY');
  console.log(`Total alerts: ${alertCount}`);
  console.log(`Critical alerts: ${criticalCount}`);
  
  if (criticalCount > 0) {
    console.log('\n🚨 CRITICAL MEMORY ISSUES DETECTED');
    console.log('Immediate actions required:');
    console.log('1. Restart with memory limits: NODE_OPTIONS="--max-old-space-size=512"');
    console.log('2. Apply emergency config: cp .env.emergency .env');
    console.log('3. Check for memory leaks in application code');
  } else if (alertCount > 0) {
    console.log('\n⚠️ HIGH MEMORY USAGE DETECTED');
    console.log('Recommended actions:');
    console.log('1. Monitor application for memory leaks');
    console.log('2. Consider reducing connection pool sizes');
    console.log('3. Enable garbage collection: --expose-gc');
  } else {
    console.log('\n✅ Memory usage is within normal ranges');
  }
}

// Initial system info
console.log('System Information:');
console.log(getSystemMemory());
console.log('');

// Start monitoring
const interval = setInterval(logMemoryStatus, 10000); // Every 10 seconds

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nStopping memory monitor...');
  clearInterval(interval);
  showSummary();
  process.exit(0);
});

process.on('SIGTERM', () => {
  clearInterval(interval);
  showSummary();
  process.exit(0);
});

console.log('Memory monitoring started. Press Ctrl+C to stop.\n');
logMemoryStatus(); // Initial reading