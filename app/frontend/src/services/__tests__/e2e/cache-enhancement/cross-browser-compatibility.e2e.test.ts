import { test, expect, Page, BrowserContext, Browser } from '@playwright/test';

/**
 * Cross-Browser Compatibility Tests for Service Worker Cache Enhancement
 * Tests functionality across Chrome, Firefox, Safari, and Edge
 */

test.describe('Cross-Browser Service Worker Compatibility', () => {
  
  test.describe('Chrome/Chromium Compatibility', () => {
    test('should support all Workbox features in Chrome', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Test service worker registration
      const swSupported = await page.evaluate(() => {
        return 'serviceWorker' in navigator;
      });
      expect(swSupported).toBe(true);
      
      // Test Cache API support
      const cacheSupported = await page.evaluate(() => {
        return 'caches' in window;
      });
      expect(cacheSupported).toBe(true);
      
      // Test IndexedDB support
      const idbSupported = await page.evaluate(() => {
        return 'indexedDB' in window;
      });
      expect(idbSupported).toBe(true);
      
      // Test Background Sync support
      const bgSyncSupported = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          return 'sync' in registration;
        }
        return false;
      });
      expect(bgSyncSupported).toBe(true);
      
      // Test Navigation Preload support
      const navPreloadSupported = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          return 'navigationPreload' in registration;
        }
        return false;
      });
      expect(navPreloadSupported).toBe(true);
      
      // Test Storage Estimation API
      const storageEstimateSupported = await page.evaluate(() => {
        return 'storage' in navigator && 'estimate' in navigator.storage;
      });
      expect(storageEstimateSupported).toBe(true);
      
      await context.close();
    });
    
    test('should handle Chrome-specific cache strategies', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Wait for service worker
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
      
      // Test Chrome's advanced caching features
      const chromeFeatures = await page.evaluate(async () => {
        const features = {
          persistentStorage: false,
          storageManager: false,
          broadcastChannel: false
        };
        
        // Test persistent storage
        if ('storage' in navigator && 'persist' in navigator.storage) {
          features.persistentStorage = true;
        }
        
        // Test storage manager
        if ('storage' in navigator && 'getDirectory' in navigator.storage) {
          features.storageManager = true;
        }
        
        // Test BroadcastChannel
        if ('BroadcastChannel' in window) {
          features.broadcastChannel = true;
        }
        
        return features;
      });
      
      expect(chromeFeatures.broadcastChannel).toBe(true);
      expect(chromeFeatures.persistentStorage).toBe(true);
      
      await context.close();
    });
  });
  
  test.describe('Firefox Compatibility', () => {
    test('should handle Firefox service worker limitations', async ({ browser }) => {
      // Skip if not Firefox
      if (browser.browserType().name() !== 'firefox') {
        test.skip();
      }
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Test basic service worker support
      const swSupported = await page.evaluate(() => {
        return 'serviceWorker' in navigator;
      });
      expect(swSupported).toBe(true);
      
      // Test Firefox-specific limitations
      const firefoxLimitations = await page.evaluate(async () => {
        const limitations = {
          navigationPreload: false,
          backgroundSync: false,
          persistentStorage: false
        };
        
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          
          // Navigation preload support
          limitations.navigationPreload = 'navigationPreload' in registration;
          
          // Background sync support
          limitations.backgroundSync = 'sync' in registration;
        }
        
        // Persistent storage
        if ('storage' in navigator && 'persist' in navigator.storage) {
          limitations.persistentStorage = true;
        }
        
        return limitations;
      });
      
      // Firefox may not support all features, so we test graceful degradation
      if (!firefoxLimitations.navigationPreload) {
        console.log('Firefox: Navigation preload not supported, testing fallback');
      }
      
      if (!firefoxLimitations.backgroundSync) {
        console.log('Firefox: Background sync not supported, testing fallback');
      }
      
      // Test that cache still works without advanced features
      await page.goto('/feed');
      await page.waitForSelector('[data-testid="feed-container"]');
      
      // Navigate away and back to test basic caching
      await page.goto('/');
      await page.goto('/feed');
      
      const startTime = Date.now();
      await page.waitForSelector('[data-testid="feed-container"]');
      const loadTime = Date.now() - startTime;
      
      // Should still load reasonably fast even without advanced features
      expect(loadTime).toBeLessThan(3000);
      
      await context.close();
    });
    
    test('should implement Firefox-specific workarounds', async ({ browser }) => {
      if (browser.browserType().name() !== 'firefox') {
        test.skip();
      }
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Test Firefox-specific cache implementation
      const firefoxWorkarounds = await page.evaluate(async () => {
        // Test if our Firefox workarounds are active
        const workarounds = {
          manualPreload: false,
          localStorageSync: false,
          polyfillBroadcast: false
        };
        
        // Check if manual preloading is implemented
        if (window.cacheService && window.cacheService.firefoxManualPreload) {
          workarounds.manualPreload = true;
        }
        
        // Check if localStorage is used for sync fallback
        if (localStorage.getItem('firefoxSyncFallback') !== null) {
          workarounds.localStorageSync = true;
        }
        
        // Check if BroadcastChannel polyfill is active
        if (window.BroadcastChannelPolyfill) {
          workarounds.polyfillBroadcast = true;
        }
        
        return workarounds;
      });
      
      // At least one workaround should be active in Firefox
      const hasWorkarounds = Object.values(firefoxWorkarounds).some(Boolean);
      expect(hasWorkarounds).toBe(true);
      
      await context.close();
    });
  });
  
  test.describe('Safari/WebKit Compatibility', () => {
    test('should handle Safari service worker restrictions', async ({ browser }) => {
      if (browser.browserType().name() !== 'webkit') {
        test.skip();
      }
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Test Safari service worker support
      const safariSupport = await page.evaluate(async () => {
        const support = {
          serviceWorker: 'serviceWorker' in navigator,
          cacheAPI: 'caches' in window,
          indexedDB: 'indexedDB' in window,
          backgroundSync: false,
          navigationPreload: false,
          broadcastChannel: 'BroadcastChannel' in window
        };
        
        if (support.serviceWorker) {
          try {
            const registration = await navigator.serviceWorker.ready;
            support.backgroundSync = 'sync' in registration;
            support.navigationPreload = 'navigationPreload' in registration;
          } catch (error) {
            console.log('Safari service worker limitations:', error);
          }
        }
        
        return support;
      });
      
      expect(safariSupport.serviceWorker).toBe(true);
      expect(safariSupport.cacheAPI).toBe(true);
      expect(safariSupport.indexedDB).toBe(true);
      
      // Safari may not support advanced features
      if (!safariSupport.backgroundSync) {
        console.log('Safari: Background sync not supported');
      }
      
      if (!safariSupport.navigationPreload) {
        console.log('Safari: Navigation preload not supported');
      }
      
      // Test that basic caching works in Safari
      await page.goto('/feed');
      await page.waitForSelector('[data-testid="feed-container"]');
      
      // Test offline functionality
      await context.setOffline(true);
      await page.reload();
      
      // Should show offline content
      await page.waitForSelector('[data-testid="offline-indicator"]', { timeout: 5000 });
      
      // Content should still be available
      const offlineContent = await page.locator('[data-testid="feed-container"]').count();
      expect(offlineContent).toBe(1);
      
      await context.close();
    });
    
    test('should implement Safari-specific optimizations', async ({ browser }) => {
      if (browser.browserType().name() !== 'webkit') {
        test.skip();
      }
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Test Safari-specific cache optimizations
      const safariOptimizations = await page.evaluate(async () => {
        const optimizations = {
          reducedCacheSize: false,
          simplifiedStrategies: false,
          memoryManagement: false
        };
        
        // Check if Safari-specific cache size limits are applied
        if (window.cacheService && window.cacheService.safariCacheLimits) {
          optimizations.reducedCacheSize = true;
        }
        
        // Check if simplified cache strategies are used
        if (window.cacheService && window.cacheService.safariSimplifiedStrategies) {
          optimizations.simplifiedStrategies = true;
        }
        
        // Check if memory management is enhanced for Safari
        if (window.cacheService && window.cacheService.safariMemoryManagement) {
          optimizations.memoryManagement = true;
        }
        
        return optimizations;
      });
      
      // At least one Safari optimization should be active
      const hasOptimizations = Object.values(safariOptimizations).some(Boolean);
      expect(hasOptimizations).toBe(true);
      
      await context.close();
    });
  });
  
  test.describe('Edge Compatibility', () => {
    test('should support Edge-specific features', async ({ browser }) => {
      if (browser.browserType().name() !== 'chromium' || !browser.version().includes('Edge')) {
        test.skip();
      }
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Test Edge service worker support (should be similar to Chrome)
      const edgeSupport = await page.evaluate(async () => {
        const support = {
          serviceWorker: 'serviceWorker' in navigator,
          cacheAPI: 'caches' in window,
          indexedDB: 'indexedDB' in window,
          backgroundSync: false,
          navigationPreload: false,
          storageEstimate: 'storage' in navigator && 'estimate' in navigator.storage
        };
        
        if (support.serviceWorker) {
          const registration = await navigator.serviceWorker.ready;
          support.backgroundSync = 'sync' in registration;
          support.navigationPreload = 'navigationPreload' in registration;
        }
        
        return support;
      });
      
      // Edge should support most modern features
      expect(edgeSupport.serviceWorker).toBe(true);
      expect(edgeSupport.cacheAPI).toBe(true);
      expect(edgeSupport.indexedDB).toBe(true);
      expect(edgeSupport.storageEstimate).toBe(true);
      
      await context.close();
    });
  });
  
  test.describe('Feature Detection and Fallbacks', () => {
    test('should detect browser capabilities and apply appropriate strategies', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Wait for service worker to initialize
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
      
      // Test feature detection
      const detectedFeatures = await page.evaluate(async () => {
        const features = {
          browserName: navigator.userAgent.includes('Firefox') ? 'firefox' : 
                      navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome') ? 'safari' :
                      navigator.userAgent.includes('Edge') ? 'edge' : 'chrome',
          serviceWorker: 'serviceWorker' in navigator,
          cacheAPI: 'caches' in window,
          indexedDB: 'indexedDB' in window,
          backgroundSync: false,
          navigationPreload: false,
          broadcastChannel: 'BroadcastChannel' in window,
          storageEstimate: 'storage' in navigator && 'estimate' in navigator.storage,
          persistentStorage: 'storage' in navigator && 'persist' in navigator.storage
        };
        
        if (features.serviceWorker) {
          try {
            const registration = await navigator.serviceWorker.ready;
            features.backgroundSync = 'sync' in registration;
            features.navigationPreload = 'navigationPreload' in registration;
          } catch (error) {
            console.log('Feature detection error:', error);
          }
        }
        
        return features;
      });
      
      // Verify that appropriate fallbacks are implemented
      const fallbacksImplemented = await page.evaluate((features) => {
        const fallbacks = {
          manualSync: false,
          polyfillBroadcast: false,
          memoryCache: false,
          simplifiedStrategies: false
        };
        
        // Check if manual sync is implemented when background sync is not available
        if (!features.backgroundSync && window.cacheService?.manualSyncFallback) {
          fallbacks.manualSync = true;
        }
        
        // Check if BroadcastChannel polyfill is used
        if (!features.broadcastChannel && window.BroadcastChannelPolyfill) {
          fallbacks.polyfillBroadcast = true;
        }
        
        // Check if memory cache fallback is implemented
        if (!features.cacheAPI && window.cacheService?.memoryCacheFallback) {
          fallbacks.memoryCache = true;
        }
        
        // Check if simplified strategies are used for limited browsers
        if (features.browserName === 'safari' && window.cacheService?.simplifiedStrategies) {
          fallbacks.simplifiedStrategies = true;
        }
        
        return fallbacks;
      }, detectedFeatures);
      
      console.log('Detected browser:', detectedFeatures.browserName);
      console.log('Available features:', detectedFeatures);
      console.log('Implemented fallbacks:', fallbacksImplemented);
      
      // At least basic features should be available
      expect(detectedFeatures.serviceWorker).toBe(true);
      expect(detectedFeatures.indexedDB).toBe(true);
      
      await context.close();
    });
    
    test('should gracefully degrade when features are unavailable', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      // Simulate feature unavailability
      await page.addInitScript(() => {
        // Mock missing BroadcastChannel
        delete window.BroadcastChannel;
        
        // Mock limited IndexedDB
        const originalIndexedDB = window.indexedDB;
        window.indexedDB = {
          ...originalIndexedDB,
          open: () => {
            throw new Error('IndexedDB not available');
          }
        };
      });
      
      await page.goto('/');
      
      // Should still function with degraded features
      const degradedFunctionality = await page.evaluate(async () => {
        const functionality = {
          basicCaching: false,
          offlineSupport: false,
          errorHandling: false
        };
        
        try {
          // Test basic caching without advanced features
          if ('caches' in window) {
            const cache = await caches.open('test-cache');
            functionality.basicCaching = true;
          }
        } catch (error) {
          console.log('Basic caching error:', error);
        }
        
        try {
          // Test offline support with fallbacks
          if (localStorage.getItem('offlineFallback') !== null) {
            functionality.offlineSupport = true;
          }
        } catch (error) {
          console.log('Offline support error:', error);
        }
        
        // Test error handling
        if (window.cacheService?.errorHandler) {
          functionality.errorHandling = true;
        }
        
        return functionality;
      });
      
      // Should maintain basic functionality
      expect(degradedFunctionality.basicCaching || degradedFunctionality.offlineSupport).toBe(true);
      
      await context.close();
    });
  });
  
  test.describe('Performance Across Browsers', () => {
    test('should maintain acceptable performance in all browsers', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Test cache performance
      const performanceMetrics = await page.evaluate(async () => {
        const metrics = {
          browserName: navigator.userAgent.includes('Firefox') ? 'firefox' : 
                      navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome') ? 'safari' :
                      navigator.userAgent.includes('Edge') ? 'edge' : 'chrome',
          cacheWriteTime: 0,
          cacheReadTime: 0,
          indexedDBWriteTime: 0,
          indexedDBReadTime: 0
        };
        
        // Test cache write performance
        const cacheWriteStart = performance.now();
        try {
          const cache = await caches.open('performance-test');
          await cache.put('/test', new Response('test data'));
          metrics.cacheWriteTime = performance.now() - cacheWriteStart;
        } catch (error) {
          console.log('Cache write error:', error);
        }
        
        // Test cache read performance
        const cacheReadStart = performance.now();
        try {
          const cache = await caches.open('performance-test');
          await cache.match('/test');
          metrics.cacheReadTime = performance.now() - cacheReadStart;
        } catch (error) {
          console.log('Cache read error:', error);
        }
        
        return metrics;
      });
      
      console.log(`${performanceMetrics.browserName} performance:`, performanceMetrics);
      
      // Cache operations should complete within reasonable time
      expect(performanceMetrics.cacheWriteTime).toBeLessThan(1000); // 1 second
      expect(performanceMetrics.cacheReadTime).toBeLessThan(500);   // 0.5 seconds
      
      await context.close();
    });
  });
  
  test.describe('Browser-Specific Optimizations', () => {
    test('should apply browser-specific cache configurations', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Wait for cache service to initialize
      await page.waitForFunction(() => window.cacheService !== undefined);
      
      const browserOptimizations = await page.evaluate(() => {
        const browserName = navigator.userAgent.includes('Firefox') ? 'firefox' : 
                           navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome') ? 'safari' :
                           navigator.userAgent.includes('Edge') ? 'edge' : 'chrome';
        
        const optimizations = {
          browserName,
          cacheSize: 0,
          maxEntries: 0,
          strategies: [],
          workarounds: []
        };
        
        if (window.cacheService) {
          // Get browser-specific configuration
          const config = window.cacheService.getBrowserConfig();
          
          optimizations.cacheSize = config.maxCacheSize || 0;
          optimizations.maxEntries = config.maxEntries || 0;
          optimizations.strategies = config.enabledStrategies || [];
          optimizations.workarounds = config.workarounds || [];
        }
        
        return optimizations;
      });
      
      console.log('Browser optimizations:', browserOptimizations);
      
      // Should have browser-specific configuration
      expect(browserOptimizations.cacheSize).toBeGreaterThan(0);
      expect(browserOptimizations.strategies.length).toBeGreaterThan(0);
      
      // Safari should have more conservative settings
      if (browserOptimizations.browserName === 'safari') {
        expect(browserOptimizations.cacheSize).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
        expect(browserOptimizations.workarounds.length).toBeGreaterThan(0);
      }
      
      // Chrome should have full feature set
      if (browserOptimizations.browserName === 'chrome') {
        expect(browserOptimizations.strategies).toContain('NetworkFirst');
        expect(browserOptimizations.strategies).toContain('CacheFirst');
        expect(browserOptimizations.strategies).toContain('StaleWhileRevalidate');
      }
      
      await context.close();
    });
  });
});