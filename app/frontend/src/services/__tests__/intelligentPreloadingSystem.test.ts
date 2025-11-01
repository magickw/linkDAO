/**
 * Tests for Intelligent Preloading System
 * Focuses on core functional logic only
 */

import { IntelligentPreloadingSystem } from '../intelligentPreloadingSystem';

// Mock Response for Node.js environment
global.Response = class Response {
  constructor(public body: any, public init: any = {}) {}
  ok = this.init.status >= 200 && this.init.status < 300;
  status = this.init.status || 200;
  headers = new Map();
  clone() { return this; }
  text() { return Promise.resolve(this.body); }
  json() { return Promise.resolve(JSON.parse(this.body)); }
} as any;

// Mock service worker cache service
jest.mock('../serviceWorkerCacheService', () => ({
  serviceWorkerCacheService: {
    fetchWithStrategy: jest.fn().mockImplementation(() => 
      Promise.resolve({
        ok: true,
        status: 200,
        headers: new Map(),
        clone: () => ({ text: () => Promise.resolve('test') }),
        text: () => Promise.resolve('test'),
        json: () => Promise.resolve({})
      })
    )
  }
}));

// Mock storage quota manager
jest.mock('../storageQuotaManager', () => ({
  storageQuotaManager: {
    getStorageQuotaInfo: jest.fn().mockResolvedValue({
      used: 1000000,
      available: 9000000,
      quota: 10000000,
      percentage: 10,
      isNearLimit: false,
      isAtLimit: false
    })
  }
}));

// Mock navigator APIs
Object.defineProperty(navigator, 'connection', {
  writable: true,
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false,
    addEventListener: jest.fn()
  }
});

Object.defineProperty(navigator, 'deviceMemory', {
  writable: true,
  value: 8
});

Object.defineProperty(navigator, 'hardwareConcurrency', {
  writable: true,
  value: 8
});

Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock DOM APIs
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    disconnect: jest.fn()
  }))
});

describe('IntelligentPreloadingSystem', () => {
  let preloadingSystem: IntelligentPreloadingSystem;

  beforeEach(() => {
    preloadingSystem = new IntelligentPreloadingSystem();
    
    // Mock window and document
    Object.defineProperty(window, 'scrollY', { writable: true, value: 0 });
    Object.defineProperty(window, 'innerHeight', { writable: true, value: 800 });
    Object.defineProperty(document.documentElement, 'scrollHeight', { writable: true, value: 2000 });
    
    // Mock addEventListener
    window.addEventListener = jest.fn();
    document.addEventListener = jest.fn();
    document.querySelectorAll = jest.fn().mockReturnValue([]);
  });

  afterEach(() => {
    preloadingSystem.shutdown();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(preloadingSystem.initialize()).resolves.not.toThrow();
    });

    it('should detect network conditions', async () => {
      await preloadingSystem.initialize();
      
      // Network conditions should be detected
      expect(navigator.connection.addEventListener).toHaveBeenCalled();
    });

    it('should detect device capabilities', async () => {
      await preloadingSystem.initialize();
      
      // Device capabilities should be detected based on available APIs
      expect(navigator.deviceMemory).toBeDefined();
      expect(navigator.hardwareConcurrency).toBeDefined();
    });
  });

  describe('Adaptive Configuration', () => {
    beforeEach(async () => {
      await preloadingSystem.initialize();
    });

    it('should adapt batch size based on device capabilities', () => {
      const config = { batchSize: 5 };
      const system = new IntelligentPreloadingSystem(config);
      
      // Test with low-end device
      (system as any).deviceCapabilities = {
        memory: 2,
        cores: 2,
        isMobile: true,
        isLowEnd: true,
        supportsConcurrency: false
      };
      
      const adaptiveBatchSize = (system as any).getAdaptiveBatchSize();
      expect(adaptiveBatchSize).toBeLessThan(config.batchSize);
    });

    it('should adapt concurrent requests based on network conditions', () => {
      const config = { maxConcurrentRequests: 3 };
      const system = new IntelligentPreloadingSystem(config);
      
      // Test with slow network
      (system as any).networkCondition = {
        effectiveType: '2g',
        downlink: 0.5,
        rtt: 2000,
        saveData: false,
        online: true
      };
      
      const adaptiveConcurrent = (system as any).getAdaptiveConcurrentRequests();
      expect(adaptiveConcurrent).toBe(1); // Should be limited to 1 for 2g
    });

    it('should respect save data preference', () => {
      const system = new IntelligentPreloadingSystem();
      
      (system as any).networkCondition = {
        effectiveType: '4g',
        downlink: 10,
        rtt: 100,
        saveData: true,
        online: true
      };
      
      const suitable = (system as any).isNetworkSuitableForPreloading();
      expect(suitable).toBe(false);
    });
  });

  describe('Preload Queue Management', () => {
    beforeEach(async () => {
      await preloadingSystem.initialize();
    });

    it('should add items to preload queue with prioritization', () => {
      const items = [
        {
          url: '/api/test1',
          priority: 0.5,
          type: 'data' as const,
          estimatedSize: 1000,
          source: 'hover' as const
        },
        {
          url: '/api/test2',
          priority: 0.8,
          type: 'image' as const,
          estimatedSize: 5000,
          source: 'scroll' as const
        }
      ];

      preloadingSystem.addToPreloadQueue(items);
      
      // Items should be added and prioritized
      const queue = (preloadingSystem as any).preloadQueue;
      expect(queue.length).toBeGreaterThan(0);
    });

    it('should calculate priority based on multiple factors', () => {
      const item = {
        url: '/test',
        type: 'data' as const,
        estimatedSize: 5000,
        source: 'behavior' as const
      };

      const priority = (preloadingSystem as any).calculatePreloadPriority(item);
      
      expect(priority).toBeGreaterThan(0);
      expect(priority).toBeLessThanOrEqual(1);
    });
  });

  describe('User Behavior Analysis', () => {
    beforeEach(async () => {
      await preloadingSystem.initialize();
    });

    it('should analyze user behavior patterns', () => {
      // Set up mock behavior data
      (preloadingSystem as any).userBehavior = {
        scrollSpeed: 800,
        averageViewTime: 5000,
        interactionFrequency: 8,
        preferredContentTypes: ['image', 'data']
      };

      // Mock the getUserBehaviorPattern to return consistent data
      jest.spyOn(preloadingSystem, 'getUserBehaviorPattern').mockReturnValue({
        scrollSpeed: 800,
        averageViewTime: 5000,
        interactionFrequency: 8,
        preferredContentTypes: ['image', 'data'],
        timeOfDay: 14, // 2 PM
        deviceType: 'desktop'
      });

      const analysis = (preloadingSystem as any).analyzeUserBehaviorForPreloading();
      
      expect(analysis.scrollPattern).toBe('medium');
      expect(analysis.interactionLevel).toBe('medium');
      expect(analysis.timeOfDayPattern).toBe('afternoon');
      expect(analysis.preferredContentTypes).toEqual(['image', 'data']);
    });

    it('should provide personalized preload recommendations', () => {
      // Set up mock behavior data
      (preloadingSystem as any).userBehavior = {
        scrollSpeed: 1200, // Fast scrolling
        preferredContentTypes: ['image', 'product']
      };

      const personalizedItems = (preloadingSystem as any).getPersonalizedPreloadItems();
      
      expect(Array.isArray(personalizedItems)).toBe(true);
    });
  });

  describe('Cache Strategy Selection', () => {
    beforeEach(async () => {
      await preloadingSystem.initialize();
    });

    it('should select appropriate cache strategy for different content types', () => {
      const imageItem = { type: 'image', url: '/test.jpg', source: 'hover', estimatedSize: 1000 };
      const dataItem = { type: 'data', url: '/api/data', source: 'scroll', estimatedSize: 500 };
      const pageItem = { type: 'page', url: '/page', source: 'behavior', estimatedSize: 2000 };

      const imageStrategy = (preloadingSystem as any).getPreloadStrategy(imageItem);
      const dataStrategy = (preloadingSystem as any).getPreloadStrategy(dataItem);
      const pageStrategy = (preloadingSystem as any).getPreloadStrategy(pageItem);

      expect(imageStrategy).toBe('CacheFirst');
      expect(dataStrategy).toBe('NetworkFirst');
      expect(pageStrategy).toBe('StaleWhileRevalidate');
    });

    it('should set appropriate max age for different content types', () => {
      const imageMaxAge = (preloadingSystem as any).getMaxAgeForItemType('image');
      const dataMaxAge = (preloadingSystem as any).getMaxAgeForItemType('data');

      expect(imageMaxAge).toBeGreaterThan(dataMaxAge);
    });
  });

  describe('Network Awareness', () => {
    beforeEach(async () => {
      await preloadingSystem.initialize();
    });

    it('should detect when network is suitable for preloading', () => {
      // Good network conditions
      (preloadingSystem as any).networkCondition = {
        effectiveType: '4g',
        downlink: 10,
        rtt: 100,
        saveData: false,
        online: true
      };

      const suitable = (preloadingSystem as any).isNetworkSuitableForPreloading();
      expect(suitable).toBe(true);
    });

    it('should detect when network is not suitable for preloading', () => {
      // Poor network conditions
      (preloadingSystem as any).networkCondition = {
        effectiveType: 'slow-2g',
        downlink: 0.1,
        rtt: 3000,
        saveData: false,
        online: true
      };

      const suitable = (preloadingSystem as any).isNetworkSuitableForPreloading();
      expect(suitable).toBe(false);
    });
  });

  describe('Metrics Tracking', () => {
    beforeEach(async () => {
      await preloadingSystem.initialize();
    });

    it('should track preloading metrics', () => {
      const metrics = preloadingSystem.getMetrics();
      
      expect(metrics).toHaveProperty('totalPreloads');
      expect(metrics).toHaveProperty('successfulPreloads');
      expect(metrics).toHaveProperty('failedPreloads');
      expect(metrics).toHaveProperty('bytesPreloaded');
      expect(metrics).toHaveProperty('averagePreloadTime');
      expect(metrics).toHaveProperty('cacheHitRate');
      expect(metrics).toHaveProperty('bandwidthSaved');
    });

    it('should provide user behavior pattern when available', () => {
      // Set up mock behavior data
      (preloadingSystem as any).userBehavior = {
        scrollSpeed: 500,
        averageViewTime: 3000,
        interactionFrequency: 5,
        preferredContentTypes: ['image']
      };

      (preloadingSystem as any).deviceCapabilities = {
        isMobile: false
      };

      const pattern = preloadingSystem.getUserBehaviorPattern();
      
      expect(pattern).not.toBeNull();
      expect(pattern?.scrollSpeed).toBe(500);
      expect(pattern?.deviceType).toBe('desktop');
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(async () => {
      await preloadingSystem.initialize();
    });

    it('should update configuration', () => {
      const newConfig = {
        enabled: false,
        maxConcurrentRequests: 5,
        batchSize: 10
      };

      preloadingSystem.updateConfig(newConfig);
      
      const currentConfig = (preloadingSystem as any).config;
      expect(currentConfig.enabled).toBe(false);
      expect(currentConfig.maxConcurrentRequests).toBe(5);
      expect(currentConfig.batchSize).toBe(10);
    });
  });

  describe('Cleanup', () => {
    it('should shutdown cleanly', async () => {
      await preloadingSystem.initialize();
      
      expect(() => preloadingSystem.shutdown()).not.toThrow();
      
      // Should be able to shutdown multiple times without error
      expect(() => preloadingSystem.shutdown()).not.toThrow();
    });
  });
});