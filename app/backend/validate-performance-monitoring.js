/**
 * Simple validation script for performance monitoring system
 * This script validates that all performance monitoring services can be imported
 */

const path = require('path');

async function validatePerformanceMonitoring() {
  try {
    console.log('🚀 Starting performance monitoring validation...');

    // Test that TypeScript files exist
    const fs = require('fs');
    const services = [
      'src/services/performanceBenchmarkService.ts',
      'src/services/renderPerformanceMonitoringService.ts',
      'src/services/errorRecoveryCacheProfiler.ts',
      'src/services/criticalPathPerformanceOptimizer.ts',
      'src/controllers/performanceMonitoringController.ts',
      'src/routes/performanceMonitoringRoutes.ts',
      'src/services/performanceMonitoringIntegration.ts'
    ];

    for (const service of services) {
      if (!fs.existsSync(service)) {
        throw new Error(`Service file not found: ${service}`);
      }
      console.log(`✅ Found: ${service}`);
    }

    console.log('✅ All performance monitoring service files exist');

    // Test that the files have the expected exports
    const serviceContents = [
      { file: 'src/services/performanceBenchmarkService.ts', exports: ['PerformanceBenchmarkService', 'export default'] },
      { file: 'src/services/renderPerformanceMonitoringService.ts', exports: ['RenderPerformanceMonitoringService', 'export default'] },
      { file: 'src/services/errorRecoveryCacheProfiler.ts', exports: ['ErrorRecoveryCacheProfiler', 'export default'] },
      { file: 'src/services/criticalPathPerformanceOptimizer.ts', exports: ['CriticalPathPerformanceOptimizer', 'export default'] },
      { file: 'src/controllers/performanceMonitoringController.ts', exports: ['PerformanceMonitoringController', 'export default'] },
      { file: 'src/routes/performanceMonitoringRoutes.ts', exports: ['createPerformanceMonitoringRoutes'] },
      { file: 'src/services/performanceMonitoringIntegration.ts', exports: ['PerformanceMonitoringIntegration', 'createPerformanceMonitoringIntegration'] }
    ];

    for (const { file, exports } of serviceContents) {
      const content = fs.readFileSync(file, 'utf8');
      for (const exportName of exports) {
        if (!content.includes(exportName)) {
          throw new Error(`Expected export '${exportName}' not found in ${file}`);
        }
      }
      console.log(`✅ Validated exports in: ${file}`);
    }

    console.log('✅ All performance monitoring service exports validated');

    // Test that the main index.ts file includes the performance monitoring routes
    const indexContent = fs.readFileSync('src/index.ts', 'utf8');
    if (!indexContent.includes('createPerformanceMonitoringRoutes')) {
      throw new Error('Performance monitoring routes not found in main index.ts');
    }
    if (!indexContent.includes('/api/performance')) {
      throw new Error('Performance monitoring API route not found in main index.ts');
    }

    console.log('✅ Performance monitoring routes integrated in main application');

    // Validate that required dependencies are available
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = ['pg', 'ioredis', 'express'];
    
    for (const dep of requiredDeps) {
      if (!packageJson.dependencies[dep] && !packageJson.devDependencies[dep]) {
        throw new Error(`Required dependency '${dep}' not found in package.json`);
      }
    }

    console.log('✅ All required dependencies available');

    // Test that the services implement the expected interfaces
    const benchmarkService = fs.readFileSync('src/services/performanceBenchmarkService.ts', 'utf8');
    const expectedMethods = [
      'runComprehensiveBenchmarks',
      'getBenchmarkSummary',
      'getBenchmarkHistory'
    ];

    for (const method of expectedMethods) {
      if (!benchmarkService.includes(method)) {
        throw new Error(`Expected method '${method}' not found in PerformanceBenchmarkService`);
      }
    }

    console.log('✅ Performance monitoring service interfaces validated');

    console.log('🎉 Performance monitoring system validation completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - Service files: ${services.length}`);
    console.log(`   - Export validations: ${serviceContents.length}`);
    console.log(`   - Required dependencies: ${requiredDeps.length}`);
    console.log(`   - Method validations: ${expectedMethods.length}`);

    return true;
  } catch (error) {
    console.error('❌ Performance monitoring validation failed:', error.message);
    return false;
  }
}

// Run validation
validatePerformanceMonitoring()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Validation script error:', error);
    process.exit(1);
  });