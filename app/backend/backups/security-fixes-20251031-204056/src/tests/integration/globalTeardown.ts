/**
 * Global Teardown for Integration Tests
 * 
 * Cleans up the test environment after running integration tests.
 * This includes database cleanup, cache clearing, and temporary file removal.
 */

import { execSync } from 'child_process';
import { safeLogger } from '../utils/safeLogger';
import path from 'path';
import { safeLogger } from '../utils/safeLogger';
import fs from 'fs';
import { safeLogger } from '../utils/safeLogger';

export default async function globalTeardown(): Promise<void> {
  safeLogger.info('🧹 Cleaning up integration test environment...');
  
  try {
    // Database cleanup
    await cleanupTestDatabase();
    
    // Cache cleanup
    await cleanupTestCache();
    
    // File system cleanup
    await cleanupTestFiles();
    
    // Process cleanup
    await cleanupProcesses();
    
    safeLogger.info('✅ Integration test environment cleaned up');
  } catch (error) {
    safeLogger.warn('⚠️  Cleanup warning:', error);
    // Don't throw errors during cleanup to avoid masking test failures
  }
}

async function cleanupTestDatabase(): Promise<void> {
  safeLogger.info('📊 Cleaning up test database...');
  
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (databaseUrl && databaseUrl.includes('sqlite') && !databaseUrl.includes(':memory:')) {
      // Remove SQLite file if it exists
      const dbPath = databaseUrl.replace('sqlite:', '');
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        safeLogger.info('✅ Test database file removed');
      }
    } else if (databaseUrl && !databaseUrl.includes(':memory:')) {
      // For other databases, run cleanup script
      try {
        const backendDir = path.join(__dirname, '../../../..');
        execSync('npm run db:test:cleanup', {
          cwd: backendDir,
          stdio: 'pipe',
          env: { ...process.env },
          timeout: 10000
        });
        safeLogger.info('✅ Test database cleaned up');
      } catch (cleanupError) {
        safeLogger.warn('⚠️  Database cleanup script failed:', cleanupError);
      }
    }
    
    // Clear global test data
    if (global.__TEST_DATA__) {
      delete global.__TEST_DATA__;
    }
    
  } catch (error) {
    safeLogger.warn('⚠️  Database cleanup failed:', error);
  }
}

async function cleanupTestCache(): Promise<void> {
  safeLogger.info('🗄️  Cleaning up test cache...');
  
  try {
    // Clear Redis test database if used
    if (process.env.REDIS_URL && process.env.REDIS_URL.includes('localhost')) {
      try {
        execSync('redis-cli -n 15 FLUSHDB', {
          stdio: 'pipe',
          timeout: 5000
        });
        safeLogger.info('✅ Redis test cache cleared');
      } catch (redisError) {
        safeLogger.warn('⚠️  Redis cleanup failed (may not be running):', redisError);
      }
    }
    
    // Clear memory cache
    if (global.__CACHE__) {
      delete global.__CACHE__;
    }
    
  } catch (error) {
    safeLogger.warn('⚠️  Cache cleanup failed:', error);
  }
}

async function cleanupTestFiles(): Promise<void> {
  safeLogger.info('📁 Cleaning up test files...');
  
  try {
    const filesToCleanup = [
      // Temporary test files
      path.join(__dirname, '../../../.test-cache'),
      path.join(__dirname, '../../../test-database.db'),
      path.join(__dirname, '../../../test-database.db-journal'),
      
      // Log files
      path.join(__dirname, '../../../logs/test'),
      
      // Coverage files (keep reports but clean temp files)
      path.join(__dirname, '../../../coverage/.nyc_output'),
      path.join(__dirname, '../../../.nyc_output')
    ];
    
    for (const filePath of filesToCleanup) {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
      }
    }
    
    // Clean up old test reports (keep last 5)
    await cleanupOldTestReports();
    
    safeLogger.info('✅ Test files cleaned up');
  } catch (error) {
    safeLogger.warn('⚠️  File cleanup failed:', error);
  }
}

async function cleanupOldTestReports(): Promise<void> {
  try {
    const reportsDir = path.join(__dirname, '../../../test-reports');
    
    if (fs.existsSync(reportsDir)) {
      const files = fs.readdirSync(reportsDir)
        .filter(file => file.startsWith('integration-test-report-'))
        .map(file => ({
          name: file,
          path: path.join(reportsDir, file),
          mtime: fs.statSync(path.join(reportsDir, file)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      
      // Keep only the 5 most recent reports
      const filesToDelete = files.slice(5);
      
      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
      }
      
      if (filesToDelete.length > 0) {
        safeLogger.info(`✅ Cleaned up ${filesToDelete.length} old test reports`);
      }
    }
  } catch (error) {
    safeLogger.warn('⚠️  Test report cleanup failed:', error);
  }
}

async function cleanupProcesses(): Promise<void> {
  safeLogger.info('🔄 Cleaning up test processes...');
  
  try {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Clear any remaining timers
    if (global.__TEST_TIMERS__) {
      global.__TEST_TIMERS__.forEach((timer: NodeJS.Timeout) => {
        clearTimeout(timer);
      });
      delete global.__TEST_TIMERS__;
    }
    
    // Clear any remaining intervals
    if (global.__TEST_INTERVALS__) {
      global.__TEST_INTERVALS__.forEach((interval: NodeJS.Timeout) => {
        clearInterval(interval);
      });
      delete global.__TEST_INTERVALS__;
    }
    
    // Close any open handles
    if (global.__TEST_HANDLES__) {
      global.__TEST_HANDLES__.forEach((handle: any) => {
        if (handle && typeof handle.close === 'function') {
          handle.close();
        }
      });
      delete global.__TEST_HANDLES__;
    }
    
    safeLogger.info('✅ Test processes cleaned up');
  } catch (error) {
    safeLogger.warn('⚠️  Process cleanup failed:', error);
  }
}

// Extend global types for cleanup tracking
declare global {
  var __TEST_DATA__: any;
  var __CACHE__: any;
  var __TEST_TIMERS__: NodeJS.Timeout[];
  var __TEST_INTERVALS__: NodeJS.Timeout[];
  var __TEST_HANDLES__: any[];
  var gc: (() => void) | undefined;
}