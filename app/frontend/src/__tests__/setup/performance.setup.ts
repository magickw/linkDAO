/**
 * Performance Testing Setup
 * 
 * This file sets up performance monitoring and utilities for feed system tests
 */

// Mock performance APIs for Node.js environment
if (typeof performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    mark: jest.fn(),
    measure: jest.fn(),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => [])
  } as any;
}

// Mock memory API for memory testing
if (!(performance as any).memory) {
  (performance as any).memory = {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB baseline
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB total
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB limit
  };
}

// Mock PerformanceObserver for performance monitoring
if (typeof PerformanceObserver === 'undefined') {
  global.PerformanceObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
    takeRecords: jest.fn(() => [])
  }));
}

// Performance testing utilities
global.performanceUtils = {
  // Measure render time
  measureRenderTime: async (renderFn: () => void): Promise<number> => {
    const start = performance.now();
    renderFn();
    // Wait for next tick to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 0));
    return performance.now() - start;
  },

  // Measure memory usage
  measureMemoryUsage: (): number => {
    return (performance as any).memory?.usedJSHeapSize || 0;
  },

  // Simulate memory pressure
  simulateMemoryPressure: (sizeMB: number): void => {
    const currentMemory = (performance as any).memory?.usedJSHeapSize || 0;
    (performance as any).memory.usedJSHeapSize = currentMemory + (sizeMB * 1024 * 1024);
  },

  // Reset memory simulation
  resetMemorySimulation: (): void => {
    (performance as any).memory.usedJSHeapSize = 50 * 1024 * 1024; // Reset to baseline
  },

  // Create performance benchmark
  createBenchmark: (name: string, targetTime: number) => {
    return {
      name,
      targetTime,
      measure: async (fn: () => Promise<void> | void): Promise<boolean> => {
        const start = performance.now();
        await fn();
        const duration = performance.now() - start;
        const passed = duration <= targetTime;
        
        console.log(`Benchmark ${name}: ${duration.toFixed(2)}ms (target: ${targetTime}ms) ${passed ? '✅' : '❌'}`);
        
        return passed;
      }
    };
  },

  // Monitor long tasks
  monitorLongTasks: (): { stop: () => any[] } => {
    const longTasks: any[] = [];
    
    if (typeof PerformanceObserver !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            longTasks.push({
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime
            });
          }
        }
      });

      try {
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Longtask API not supported in test environment
      }

      return {
        stop: () => {
          observer.disconnect();
          return longTasks;
        }
      };
    }

    return {
      stop: () => longTasks
    };
  }
};

// Custom Jest matchers for performance testing
expect.extend({
  toCompleteWithin(received: Promise<any> | (() => any), maxTime: number) {
    const start = performance.now();
    
    return Promise.resolve(typeof received === 'function' ? received() : received)
      .then(() => {
        const duration = performance.now() - start;
        const pass = duration <= maxTime;
        
        if (pass) {
          return {
            message: () => `expected operation to take longer than ${maxTime}ms but completed in ${duration.toFixed(2)}ms`,
            pass: true
          };
        } else {
          return {
            message: () => `expected operation to complete within ${maxTime}ms but took ${duration.toFixed(2)}ms`,
            pass: false
          };
        }
      })
      .catch((error) => {
        return {
          message: () => `operation failed: ${error.message}`,
          pass: false
        };
      });
  },

  toUseMemoryWithin(received: () => any, maxMemoryMB: number) {
    const initialMemory = global.performanceUtils.measureMemoryUsage();
    
    received();
    
    const finalMemory = global.performanceUtils.measureMemoryUsage();
    const memoryUsedMB = (finalMemory - initialMemory) / (1024 * 1024);
    const pass = memoryUsedMB <= maxMemoryMB;
    
    if (pass) {
      return {
        message: () => `expected operation to use more than ${maxMemoryMB}MB but used ${memoryUsedMB.toFixed(2)}MB`,
        pass: true
      };
    } else {
      return {
        message: () => `expected operation to use less than ${maxMemoryMB}MB but used ${memoryUsedMB.toFixed(2)}MB`,
        pass: false
      };
    }
  },

  toHaveNoLongTasks(received: () => any) {
    const monitor = global.performanceUtils.monitorLongTasks();
    
    received();
    
    const longTasks = monitor.stop();
    const pass = longTasks.length === 0;
    
    if (pass) {
      return {
        message: () => `expected operation to have long tasks but found none`,
        pass: true
      };
    } else {
      return {
        message: () => `expected operation to have no long tasks but found ${longTasks.length}: ${longTasks.map(t => `${t.name} (${t.duration.toFixed(2)}ms)`).join(', ')}`,
        pass: false
      };
    }
  }
});

// Declare global types for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toCompleteWithin(maxTime: number): Promise<R>;
      toUseMemoryWithin(maxMemoryMB: number): R;
      toHaveNoLongTasks(): R;
    }
  }

  var performanceUtils: {
    measureRenderTime: (renderFn: () => void) => Promise<number>;
    measureMemoryUsage: () => number;
    simulateMemoryPressure: (sizeMB: number) => void;
    resetMemorySimulation: () => void;
    createBenchmark: (name: string, targetTime: number) => {
      name: string;
      targetTime: number;
      measure: (fn: () => Promise<void> | void) => Promise<boolean>;
    };
    monitorLongTasks: () => { stop: () => any[] };
  };
}

// Setup performance monitoring for each test
beforeEach(() => {
  // Reset performance state
  global.performanceUtils.resetMemorySimulation();
  
  // Clear performance marks and measures
  if (performance.clearMarks) {
    performance.clearMarks();
  }
  if (performance.clearMeasures) {
    performance.clearMeasures();
  }
  
  // Mark test start for performance measurement
  if (performance.mark) {
    performance.mark('test-start');
  }
});

afterEach(() => {
  // Mark test end
  if (performance.mark) {
    performance.mark('test-end');
  }
  
  // Measure test duration
  if (performance.measure) {
    try {
      performance.measure('test-duration', 'test-start', 'test-end');
    } catch (e) {
      // Marks might not exist in some test environments
    }
  }
  
  // Reset memory simulation
  global.performanceUtils.resetMemorySimulation();
});

// Global test timeout for performance tests
jest.setTimeout(120000); // 2 minutes for performance tests

export {};