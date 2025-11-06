/**
 * Performance Monitoring System Tests
 * Simple validation tests for the performance monitoring services
 */

// Simple test to verify services can be imported
const testPerformanceMonitoringServices = () => {
  try {
    // Test imports
    const PerformanceBenchmarkService = require('../services/performanceBenchmarkService').default;
    const RenderPerformanceMonitoringService = require('../services/renderPerformanceMonitoringService').default;
    const ErrorRecoveryCacheProfiler = require('../services/errorRecoveryCacheProfiler').default;
    const CriticalPathPerformanceOptimizer = require('../services/criticalPathPerformanceOptimizer').default;
    
    console.log('✅ All performance monitoring services imported successfully');
    
    // Mock dependencies for basic instantiation test
    const mockPool = {
      connect: () => Promise.resolve({
        query: () => Promise.resolve({ rows: [] }),
        release: () => {}
      }),
      totalCount: 10,
      idleCount: 5,
      waitingCount: 0
    };

    const mockRedis = {
      get: () => Promise.resolve(null),
      set: () => Promise.resolve('OK'),
      setex: () => Promise.resolve('OK'),
      ping: () => Promise.resolve('PONG')
    };
    
    // Test basic instantiation
    const benchmarkService = new PerformanceBenchmarkService(mockPool, mockRedis);
    const renderService = new RenderPerformanceMonitoringService(mockPool, mockRedis);
    const profilerService = new ErrorRecoveryCacheProfiler(mockRedis);
    const optimizerService = new CriticalPathPerformanceOptimizer(mockPool, mockRedis);
    
    console.log('✅ All performance monitoring services instantiated successfully');
    
    // Test basic method calls
    const benchmarkSummary = benchmarkService.getBenchmarkSummary();
    const renderRecommendations = renderService.generateOptimizationRecommendations();
    const profilerSummary = profilerService.getProfilerSummary();
    const optimizerSummary = optimizerService.getPerformanceSummary();
    
    console.log('✅ All performance monitoring service methods callable');
    console.log('📊 Performance monitoring system validation complete');
    
    return true;
  } catch (error) {
    console.error('❌ Performance monitoring system validation failed:', error);
    return false;
  }
};

// Export for potential use in other tests
module.exports = { testPerformanceMonitoringServices };

// Run the validation test
if (require.main === module) {
  testPerformanceMonitoringServices();
}