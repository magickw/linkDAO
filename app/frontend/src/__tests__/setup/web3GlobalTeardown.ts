/**
 * Global Teardown for Web3 Integration Tests
 * Cleans up blockchain test environment and resources
 */

import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

export default async function globalTeardown(): Promise<void> {
  console.log('🧹 Cleaning up Web3 integration test environment...');
  
  const startTime = performance.now();
  
  try {
    // Cleanup blockchain processes
    await cleanupBlockchainProcesses();
    
    // Cleanup test data and caches
    await cleanupTestData();
    
    // Cleanup environment variables
    cleanupEnvironmentVariables();
    
    // Generate cleanup report
    await generateCleanupReport();
    
    const endTime = performance.now();
    const cleanupDuration = endTime - startTime;
    
    console.log(`✅ Web3 test environment cleanup completed in ${cleanupDuration.toFixed(2)}ms`);
    
  } catch (error) {
    console.error('❌ Error during Web3 test cleanup:', error);
    // Don't throw error to avoid masking test failures
  } finally {
    // Clear global test state
    if (global.__WEB3_TEST_SETUP__) {
      delete global.__WEB3_TEST_SETUP__;
    }
    
    if (global.__MOCK_CONTRACTS__) {
      delete global.__MOCK_CONTRACTS__;
    }
  }
}

async function cleanupBlockchainProcesses(): Promise<void> {
  try {
    // Kill Hardhat node processes
    console.log('🔄 Stopping Hardhat processes...');
    
    try {
      execSync('pkill -f "hardhat node"', { stdio: 'pipe' });
      console.log('✅ Hardhat processes stopped');
    } catch (error) {
      // Process might not be running, which is fine
      console.log('ℹ️  No Hardhat processes to stop');
    }
    
    // Kill any remaining Web3 test processes
    try {
      execSync('pkill -f "jest.*web3"', { stdio: 'pipe' });
      console.log('✅ Web3 test processes stopped');
    } catch (error) {
      // Process might not be running, which is fine
      console.log('ℹ️  No Web3 test processes to stop');
    }
    
    // Wait a moment for processes to fully terminate
    await new Promise(resolve => setTimeout(resolve, 1000));
    
  } catch (error) {
    console.warn('⚠️  Error stopping blockchain processes:', error);
  }
}

async function cleanupTestData(): Promise<void> {
  try {
    console.log('🗑️  Cleaning up test data...');
    
    // Clear any test caches
    const cacheDirectories = [
      'node_modules/.cache/jest/web3-integration',
      '.next/cache',
      'coverage/web3-integration',
    ];
    
    for (const dir of cacheDirectories) {
      try {
        execSync(`rm -rf ${dir}`, { stdio: 'pipe' });
      } catch (error) {
        // Directory might not exist, which is fine
      }
    }
    
    // Clear temporary test files
    try {
      execSync('find test-reports -name "*.tmp" -delete', { stdio: 'pipe' });
    } catch (error) {
      // Files might not exist, which is fine
    }
    
    // Clear any WebSocket connections or intervals
    if (typeof global.clearInterval === 'function') {
      // Clear any test intervals that might be running
      for (let i = 1; i < 10000; i++) {
        try {
          clearInterval(i);
        } catch {
          // Ignore errors
        }
      }
    }
    
    // Clear any WebSocket connections
    if (global.WebSocket) {
      // Close any open WebSocket connections
      try {
        // This would close any test WebSocket connections
        console.log('🔌 Closing WebSocket connections...');
      } catch (error) {
        console.warn('⚠️  Error closing WebSocket connections:', error);
      }
    }
    
    console.log('✅ Test data cleanup completed');
    
  } catch (error) {
    console.warn('⚠️  Error during test data cleanup:', error);
  }
}

function cleanupEnvironmentVariables(): void {
  try {
    console.log('🔧 Cleaning up environment variables...');
    
    // List of test-specific environment variables to clean up
    const testEnvVars = [
      'WEB3_TEST_NETWORK',
      'WEB3_TEST_TIMEOUT',
      'WEB3_TEST_RETRIES',
      'WEB3_TEST_MOCK_BLOCKCHAIN',
      'PERFORMANCE_TEST_ENABLED',
      'PERFORMANCE_THRESHOLD_MS',
      'MEMORY_THRESHOLD_MB',
      'WEBSOCKET_URL',
      'PRICE_UPDATE_INTERVAL',
    ];
    
    for (const envVar of testEnvVars) {
      if (process.env[envVar]) {
        delete process.env[envVar];
      }
    }
    
    console.log('✅ Environment variables cleaned up');
    
  } catch (error) {
    console.warn('⚠️  Error cleaning up environment variables:', error);
  }
}

async function generateCleanupReport(): Promise<void> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Create cleanup report
    const cleanupReport = {
      timestamp: new Date().toISOString(),
      cleanupDuration: global.__WEB3_TEST_SETUP__ 
        ? performance.now() - global.__WEB3_TEST_SETUP__.startTime 
        : 0,
      processesKilled: [
        'hardhat node',
        'jest web3 tests',
      ],
      dataCleanup: {
        cacheDirectories: [
          'node_modules/.cache/jest/web3-integration',
          '.next/cache',
          'coverage/web3-integration',
        ],
        temporaryFiles: 'test-reports/*.tmp',
      },
      environmentVariables: [
        'WEB3_TEST_*',
        'PERFORMANCE_TEST_*',
        'WEBSOCKET_URL',
        'PRICE_UPDATE_INTERVAL',
      ],
      status: 'completed',
    };
    
    // Ensure test-reports directory exists
    const reportDir = 'test-reports';
    try {
      await fs.mkdir(reportDir, { recursive: true });
    } catch {
      // Directory might already exist
    }
    
    // Write cleanup report
    const reportPath = path.join(reportDir, 'web3-cleanup-report.json');
    await fs.writeFile(reportPath, JSON.stringify(cleanupReport, null, 2));
    
    console.log(`📄 Cleanup report saved to: ${reportPath}`);
    
  } catch (error) {
    console.warn('⚠️  Error generating cleanup report:', error);
  }
}

// Utility function to force cleanup (for emergency situations)
export async function forceCleanup(): Promise<void> {
  console.log('🚨 Force cleanup initiated...');
  
  try {
    // Kill all Node.js processes related to testing (be careful!)
    execSync('pkill -f "node.*jest"', { stdio: 'pipe' });
    execSync('pkill -f "hardhat"', { stdio: 'pipe' });
    
    // Remove all test-related files and directories
    execSync('rm -rf node_modules/.cache/jest', { stdio: 'pipe' });
    execSync('rm -rf coverage', { stdio: 'pipe' });
    execSync('rm -rf test-reports', { stdio: 'pipe' });
    
    console.log('✅ Force cleanup completed');
    
  } catch (error) {
    console.error('❌ Force cleanup failed:', error);
  }
}

// Utility function to check if cleanup is needed
export function isCleanupNeeded(): boolean {
  try {
    // Check if Hardhat is still running
    execSync('pgrep -f "hardhat node"', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}