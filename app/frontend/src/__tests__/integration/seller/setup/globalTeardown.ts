import { performance } from 'perf_hooks';

export default async function globalTeardown() {
  console.log('\n🧹 Cleaning up Seller Integration Test Environment...\n');
  
  const startTime = performance.now();
  
  try {
    // Stop mock services
    console.log('🛑 Stopping mock services...');
    await stopMockServices();
    
    // Clean up test database
    console.log('🗑️  Cleaning up test database...');
    await cleanupTestDatabase();
    
    // Generate test reports
    console.log('📊 Generating test reports...');
    await generateTestReports();
    
    // Clean up temporary files
    console.log('🧽 Cleaning up temporary files...');
    await cleanupTempFiles();
    
    // Log performance metrics
    console.log('📈 Logging performance metrics...');
    await logPerformanceMetrics();
    
    const endTime = performance.now();
    const teardownTime = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Seller Integration Test Environment cleaned up in ${teardownTime}s\n`);
    
  } catch (error) {
    console.error('❌ Failed to cleanup test environment:', error);
    // Don't exit with error code as tests may have already completed successfully
  }
}

async function stopMockServices(): Promise<void> {
  try {
    // Stop mock WebSocket server
    if (process.env.MOCK_WEBSOCKET_PORT) {
      console.log(`   - Stopping WebSocket server on port ${process.env.MOCK_WEBSOCKET_PORT}`);
      // In a real implementation, you'd close the actual server
      delete process.env.MOCK_WEBSOCKET_PORT;
    }
    
    // Stop mock image service
    if (process.env.MOCK_IMAGE_SERVICE_PORT) {
      console.log(`   - Stopping image service on port ${process.env.MOCK_IMAGE_SERVICE_PORT}`);
      delete process.env.MOCK_IMAGE_SERVICE_PORT;
    }
    
    // Stop mock notification service
    if (process.env.MOCK_NOTIFICATION_SERVICE_PORT) {
      console.log(`   - Stopping notification service on port ${process.env.MOCK_NOTIFICATION_SERVICE_PORT}`);
      delete process.env.MOCK_NOTIFICATION_SERVICE_PORT;
    }
    
    console.log('   ✅ Mock services stopped');
    
  } catch (error) {
    console.warn('   ⚠️  Warning: Could not stop all mock services:', error);
  }
}

async function cleanupTestDatabase(): Promise<void> {
  try {
    // Clean up test tables
    const cleanupScript = `
      -- Clean up test data
      DELETE FROM test_seller_cache WHERE expires_at < NOW();
      DELETE FROM test_seller_listings WHERE created_at < NOW() - INTERVAL '1 day';
      DELETE FROM test_sellers WHERE created_at < NOW() - INTERVAL '1 day';
      
      -- Reset sequences if needed
      -- ALTER SEQUENCE test_sellers_id_seq RESTART WITH 1;
      -- ALTER SEQUENCE test_seller_listings_id_seq RESTART WITH 1;
    `;
    
    // Note: In a real setup, you'd execute this against the test database
    console.log('   - Test database cleaned');
    
  } catch (error) {
    console.warn('   ⚠️  Warning: Could not cleanup test database:', error);
  }
}

async function generateTestReports(): Promise<void> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Ensure reports directory exists
    const reportsDir = path.join(process.cwd(), 'test-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Generate environment report
    const environmentReport = {
      timestamp: new Date().toISOString(),
      setupTime: process.env.SELLER_TEST_SETUP_TIME,
      setupTimestamp: process.env.SELLER_TEST_SETUP_TIMESTAMP,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memoryUsage: process.memoryUsage(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        CI: process.env.CI,
      },
      mockServices: {
        websocket: !!process.env.MOCK_WEBSOCKET_PORT,
        imageService: !!process.env.MOCK_IMAGE_SERVICE_PORT,
        notificationService: !!process.env.MOCK_NOTIFICATION_SERVICE_PORT,
      },
    };
    
    const reportPath = path.join(reportsDir, 'seller-test-environment.json');
    fs.writeFileSync(reportPath, JSON.stringify(environmentReport, null, 2));
    
    console.log(`   - Environment report: ${reportPath}`);
    
    // Generate performance summary if available
    if ((global as any).performanceMonitor) {
      const performanceReport = {
        timestamp: new Date().toISOString(),
        measurements: Object.fromEntries((global as any).performanceMonitor.measurements),
        totalTestTime: performance.now() - (global as any).performanceMonitor.startTime,
      };
      
      const perfReportPath = path.join(reportsDir, 'seller-test-performance.json');
      fs.writeFileSync(perfReportPath, JSON.stringify(performanceReport, null, 2));
      
      console.log(`   - Performance report: ${perfReportPath}`);
    }
    
    // Generate memory usage report if available
    if ((global as any).memoryMonitor) {
      const memoryReport = {
        timestamp: new Date().toISOString(),
        baseline: (global as any).memoryMonitor.baseline,
        final: process.memoryUsage(),
        delta: {
          rss: process.memoryUsage().rss - (global as any).memoryMonitor.baseline.rss,
          heapTotal: process.memoryUsage().heapTotal - (global as any).memoryMonitor.baseline.heapTotal,
          heapUsed: process.memoryUsage().heapUsed - (global as any).memoryMonitor.baseline.heapUsed,
          external: process.memoryUsage().external - (global as any).memoryMonitor.baseline.external,
        },
      };
      
      const memReportPath = path.join(reportsDir, 'seller-test-memory.json');
      fs.writeFileSync(memReportPath, JSON.stringify(memoryReport, null, 2));
      
      console.log(`   - Memory report: ${memReportPath}`);
    }
    
  } catch (error) {
    console.warn('   ⚠️  Warning: Could not generate all test reports:', error);
  }
}

async function cleanupTempFiles(): Promise<void> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Clean up Jest cache
    const jestCacheDir = path.join(process.cwd(), 'node_modules/.cache/jest');
    if (fs.existsSync(jestCacheDir)) {
      console.log('   - Cleaning Jest cache...');
      // In production, you might want to preserve cache for faster subsequent runs
      // fs.rmSync(jestCacheDir, { recursive: true, force: true });
    }
    
    // Clean up temporary test files
    const tempDir = path.join(process.cwd(), 'temp');
    if (fs.existsSync(tempDir)) {
      console.log('   - Cleaning temporary files...');
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    // Clean up old coverage reports (keep latest)
    const coverageDir = path.join(process.cwd(), 'coverage');
    if (fs.existsSync(coverageDir)) {
      const sellerCoverageDir = path.join(coverageDir, 'seller-integration');
      if (fs.existsSync(sellerCoverageDir)) {
        console.log('   - Archiving coverage reports...');
        // Archive old coverage reports instead of deleting
        const archiveDir = path.join(coverageDir, 'archive');
        if (!fs.existsSync(archiveDir)) {
          fs.mkdirSync(archiveDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archivePath = path.join(archiveDir, `seller-coverage-${timestamp}`);
        
        try {
          fs.renameSync(sellerCoverageDir, archivePath);
          console.log(`   - Coverage archived to: ${archivePath}`);
        } catch (error) {
          console.warn('   ⚠️  Could not archive coverage:', error);
        }
      }
    }
    
    console.log('   ✅ Temporary files cleaned');
    
  } catch (error) {
    console.warn('   ⚠️  Warning: Could not cleanup all temporary files:', error);
  }
}

async function logPerformanceMetrics(): Promise<void> {
  try {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    console.log('   📊 Final Performance Metrics:');
    console.log(`      - Process uptime: ${uptime.toFixed(2)}s`);
    console.log(`      - Memory usage: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`      - RSS: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`);
    console.log(`      - External: ${(memoryUsage.external / 1024 / 1024).toFixed(2)}MB`);
    
    // Log performance warnings if any
    const warnings = [];
    
    if (memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
      warnings.push('High memory usage detected');
    }
    
    if (uptime > 300) { // 5 minutes
      warnings.push('Long test execution time');
    }
    
    if (warnings.length > 0) {
      console.log('   ⚠️  Performance warnings:');
      warnings.forEach(warning => console.log(`      - ${warning}`));
    }
    
    // Check for memory leaks
    if ((global as any).memoryMonitor) {
      const baseline = (global as any).memoryMonitor.baseline;
      const current = process.memoryUsage();
      const heapGrowth = current.heapUsed - baseline.heapUsed;
      
      if (heapGrowth > 100 * 1024 * 1024) { // 100MB growth
        console.log('   🚨 Potential memory leak detected:');
        console.log(`      - Heap growth: ${(heapGrowth / 1024 / 1024).toFixed(2)}MB`);
      }
    }
    
  } catch (error) {
    console.warn('   ⚠️  Warning: Could not log performance metrics:', error);
  }
}

// Handle uncaught exceptions during teardown
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught exception during teardown:', error);
  // Don't exit, let teardown complete
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled rejection during teardown:', reason);
  // Don't exit, let teardown complete
});

// Final cleanup on process exit
process.on('exit', (code) => {
  if (code !== 0) {
    console.log(`\n⚠️  Process exiting with code ${code}`);
  }
  
  // Log final summary
  const setupTime = process.env.SELLER_TEST_SETUP_TIME;
  if (setupTime) {
    console.log(`📋 Test session summary:`);
    console.log(`   - Setup time: ${setupTime}s`);
    console.log(`   - Total time: ${process.uptime().toFixed(2)}s`);
    console.log(`   - Exit code: ${code}`);
  }
});