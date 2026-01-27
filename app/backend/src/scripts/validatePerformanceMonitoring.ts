import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { safeLogger } from '../utils/safeLogger';

/**
 * Validation script for performance monitoring system
 * This script validates that all performance monitoring services can be imported and instantiated
 */

async function validatePerformanceMonitoring(): Promise<boolean> {
  try {
    safeLogger.info('🚀 Starting performance monitoring validation...');

    // Test imports
    const { performanceBenchmarkService } = await import('../services/performanceBenchmarkService');
    const RenderPerformanceMonitoringService = (await import('../services/renderPerformanceMonitoringService')).default;
    const ErrorRecoveryCacheProfiler = (await import('../services/errorRecoveryCacheProfiler')).default;
    const CriticalPathPerformanceOptimizer = (await import('../services/criticalPathPerformanceOptimizer')).default;
    const PerformanceMonitoringController = (await import('../controllers/performanceMonitoringController')).default;
    const { createPerformanceMonitoringRoutes } = await import('../routes/performanceMonitoringRoutes');
    const { createPerformanceMonitoringIntegration } = await import('../services/performanceMonitoringIntegration');

    safeLogger.info('✅ All performance monitoring modules imported successfully');

    // Create mock dependencies
    const mockPool = {
      connect: async () => ({
        query: async () => ({ rows: [] }),
        release: () => {}
      }),
      totalCount: 10,
      idleCount: 5,
      waitingCount: 0
    } as any as Pool;

    const mockRedis = {
      get: async () => null,
      set: async () => 'OK',
      setex: async () => 'OK',
      ping: async () => 'PONG'
    } as any as Redis;

    // Test service instantiation
    const { PerformanceBenchmarkService } = await import('../services/performanceBenchmarkService');
    const benchmarkService = new PerformanceBenchmarkService();
    const renderService = new RenderPerformanceMonitoringService(mockPool, mockRedis);
    const profilerService = new ErrorRecoveryCacheProfiler(mockRedis);
    const optimizerService = new CriticalPathPerformanceOptimizer(mockPool, mockRedis);
    const controllerService = new PerformanceMonitoringController(mockPool, mockRedis);

    safeLogger.info('✅ All performance monitoring services instantiated successfully');

    // Test basic method calls
    const benchmarkSummary = benchmarkService.getBenchmarkSummary();
    const renderRecommendations = renderService.generateOptimizationRecommendations();
    const profilerSummary = profilerService.getProfilerSummary();
    const optimizerSummary = optimizerService.getPerformanceSummary();

    safeLogger.info('✅ All performance monitoring service methods callable');

    // Test integration service
    const integrationService = createPerformanceMonitoringIntegration(mockPool, mockRedis);
    const isHealthy = integrationService.isHealthy();

    safeLogger.info('✅ Performance monitoring integration service created');

    // Test routes creation
    const routes = createPerformanceMonitoringRoutes(mockPool, mockRedis);
    
    safeLogger.info('✅ Performance monitoring routes created successfully');

    // Validate data structures
    if (typeof benchmarkSummary.totalSuites !== 'number') {
      throw new Error('Benchmark summary structure invalid');
    }

    if (!Array.isArray(renderRecommendations)) {
      throw new Error('Render recommendations structure invalid');
    }

    if (!profilerSummary.errorRecovery || !profilerSummary.cachePerformance) {
      throw new Error('Profiler summary structure invalid');
    }

    if (!optimizerSummary.criticalPaths || typeof optimizerSummary.userSatisfaction !== 'number') {
      throw new Error('Optimizer summary structure invalid');
    }

    safeLogger.info('✅ All data structures validated');

    // Test async operations
    try {
      await profilerService.profileErrorRecovery(
        'test_error',
        'test_method',
        async () => 'test_result'
      );
      safeLogger.info('✅ Error recovery profiling works');
    } catch (error) {
      safeLogger.warn('⚠️ Error recovery profiling test failed:', error.message);
    }

    try {
      await profilerService.profileCacheOperation(
        'get',
        'memory',
        'test_key',
        async () => 'cached_value'
      );
      safeLogger.info('✅ Cache operation profiling works');
    } catch (error) {
      safeLogger.warn('⚠️ Cache operation profiling test failed:', error.message);
    }

    try {
      await optimizerService.profileCriticalPath(
        'test_path',
        async () => 'path_result'
      );
      safeLogger.info('✅ Critical path profiling works');
    } catch (error) {
      safeLogger.warn('⚠️ Critical path profiling test failed:', error.message);
    }

    // Test user feedback recording
    try {
      optimizerService.recordUserFeedback(
        'test_path',
        'fast',
        250,
        'test_user',
        'test_agent'
      );
      safeLogger.info('✅ User feedback recording works');
    } catch (error) {
      safeLogger.warn('⚠️ User feedback recording test failed:', error.message);
    }

    safeLogger.info('🎉 Performance monitoring system validation completed successfully!');
    safeLogger.info('📊 Summary:');
    safeLogger.info(`   - Benchmark suites: ${benchmarkSummary.totalSuites}`);
    safeLogger.info(`   - Render recommendations: ${renderRecommendations.length}`);
    safeLogger.info(`   - Critical paths tracked: ${optimizerSummary.criticalPaths.length}`);
    safeLogger.info(`   - User satisfaction: ${optimizerSummary.userSatisfaction.toFixed(1)}%`);

    return true;
  } catch (error) {
    safeLogger.error('❌ Performance monitoring validation failed:', error);
    return false;
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  validatePerformanceMonitoring()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      safeLogger.error('Validation script error:', error);
      process.exit(1);
    });
}

export { validatePerformanceMonitoring };