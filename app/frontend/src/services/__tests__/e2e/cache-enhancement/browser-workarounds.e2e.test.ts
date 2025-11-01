import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Browser-Specific Workarounds and Optimizations Tests
 * Tests fallback mechanisms and browser-specific implementations
 */

test.describe('Browser-Specific Workarounds', () => {
  
  test.describe('Firefox Workarounds', () => {
    test('should implement manual preloading when navigation preload is unavailable', async ({ browser }) => {
      if (browser.browserType().name() !== 'firefox') {
        test.skip();
      }
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Check if navigation preload is available
      const hasNavigationPreload = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          return 'navigationPreload' in registration;
        }
        return false;
      });
      
      if (!hasNavigationPreload) {
        // Test manual preloading implementation
        await page.goto('/feed');
        await page.waitForSelector('[data-testid="feed-container"]');
        
        // Trigger manual preloading
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight * 0.8);
        });
        
        // Monitor manual preload requests
        const preloadRequests: string[] = [];
        page.on('request', (request) => {
          if (request.headers()['x-manual-preload'] === 'true') {
            preloadRequests.push(request.url());
          }
        });
        
        await page.waitForTimeout(2000);
        
        // Should have made manual preload requests
        expect(preloadRequests.length).toBeGreaterThan(0);
        
        // Navigate to preloaded content
        await page.click('[data-testid="next-page-button"]');
        
        const startTime = Date.now();
        await page.waitForSelector('[data-testid="feed-container"]');
        const loadTime = Date.now() - startTime;
        
        // Should load quickly from manual preload
        expect(loadTime).toBeLessThan(1000);
      }
      
      await context.close();
    });
    
    test('should use localStorage fallback for background sync', async ({ browser }) => {
      if (browser.browserType().name() !== 'firefox') {
        test.skip();
      }
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Check if background sync is available
      const hasBackgroundSync = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          return 'sync' in registration;
        }
        return false;
      });
      
      if (!hasBackgroundSync) {
        // Test localStorage fallback for offline actions
        await page.goto('/communities/web3-developers');
        await page.waitForSelector('[data-testid="community-header"]');
        
        // Go offline
        await context.setOffline(true);
        
        // Create a post
        await page.click('[data-testid="create-post-button"]');
        await page.waitForSelector('[data-testid="post-composer"]');
        
        await page.fill('[data-testid="post-title-input"]', 'Firefox Fallback Test');
        await page.fill('[data-testid="post-content-input"]', 'Testing localStorage fallback');
        await page.click('[data-testid="submit-post-button"]');
        
        // Should use localStorage fallback
        const fallbackData = await page.evaluate(() => {
          return localStorage.getItem('firefoxSyncFallback');
        });
        
        expect(fallbackData).not.toBeNull();
        
        const parsedData = JSON.parse(fallbackData || '[]');
        expect(parsedData.length).toBeGreaterThan(0);
        expect(parsedData[0].data.title).toBe('Firefox Fallback Test');
        
        // Go online
        await context.setOffline(false);
        
        // Should process fallback queue
        await page.waitForTimeout(3000);
        
        const processedFallback = await page.evaluate(() => {
          return localStorage.getItem('firefoxSyncFallback');
        });
        
        // Queue should be cleared after processing
        expect(processedFallback).toBe('[]');
      }
      
      await context.close();
    });
    
    test('should implement BroadcastChannel polyfill', async ({ browser }) => {
      if (browser.browserType().name() !== 'firefox') {
        test.skip();
      }
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      // Mock missing BroadcastChannel
      await page.addInitScript(() => {
        delete window.BroadcastChannel;
      });
      
      await page.goto('/');
      
      // Should implement polyfill
      const hasPolyfill = await page.evaluate(() => {
        return window.BroadcastChannelPolyfill !== undefined;
      });
      
      expect(hasPolyfill).toBe(true);
      
      // Test polyfill functionality
      const polyfillWorks = await page.evaluate(() => {
        try {
          const channel = new window.BroadcastChannelPolyfill('test-channel');
          channel.postMessage({ test: 'data' });
          channel.close();
          return true;
        } catch (error) {
          return false;
        }
      });
      
      expect(polyfillWorks).toBe(true);
      
      await context.close();
    });
  });
  
  test.describe('Safari Workarounds', () => {
    test('should implement reduced cache sizes for Safari', async ({ browser }) => {
      if (browser.browserType().name() !== 'webkit') {
        test.skip();
      }
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Wait for cache service to initialize
      await page.waitForFunction(() => window.cacheService !== undefined);
      
      // Check Safari-specific cache limits
      const safariLimits = await page.evaluate(() => {
        if (window.cacheService && window.cacheService.getBrowserConfig) {
          const config = window.cacheService.getBrowserConfig();
          return {
            maxCacheSize: config.maxCacheSize,
            maxEntries: config.maxEntries,
            isSafariOptimized: config.safariOptimized
          };
        }
        return null;
      });
      
      expect(safariLimits).not.toBeNull();
      expect(safariLimits.isSafariOptimized).toBe(true);
      
      // Safari should have smaller cache limits
      expect(safariLimits.maxCacheSize).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
      expect(safariLimits.maxEntries).toBeLessThan(1000);
      
      await context.close();
    });
    
    test('should use simplified cache strategies in Safari', async ({ browser }) => {
      if (browser.browserType().name() !== 'webkit') {
        test.skip();
      }
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Test simplified strategies
      const safariStrategies = await page.evaluate(() => {
        if (window.cacheService && window.cacheService.getEnabledStrategies) {
          return window.cacheService.getEnabledStrategies();
        }
        return [];
      });
      
      // Safari should use fewer, simpler strategies
      expect(safariStrategies.length).toBeLessThanOrEqual(3);
      expect(safariStrategies).toContain('CacheFirst');
      
      // Test that complex strategies are disabled
      expect(safariStrategies).not.toContain('StaleWhileRevalidateWithBackgroundSync');
      
      await context.close();
    });
    
    test('should implement enhanced memory management for Safari', async ({ browser }) => {
      if (browser.browserType().name() !== 'webkit') {
        test.skip();
      }
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Test memory management features
      const memoryManagement = await page.evaluate(() => {
        const features = {
          aggressiveCleanup: false,
          memoryPressureHandling: false,
          reducedPreloading: false
        };
        
        if (window.cacheService) {
          features.aggressiveCleanup = window.cacheService.safariAggressiveCleanup || false;
          features.memoryPressureHandling = window.cacheService.memoryPressureHandler || false;
          features.reducedPreloading = window.cacheService.safariReducedPreloading || false;
        }
        
        return features;
      });
      
      // At least one memory management feature should be active
      const hasMemoryManagement = Object.values(memoryManagement).some(Boolean);
      expect(hasMemoryManagement).toBe(true);
      
      // Test memory pressure simulation
      await page.evaluate(() => {
        // Simulate memory pressure
        if (window.cacheService && window.cacheService.handleMemoryPressure) {
          window.cacheService.handleMemoryPressure();
        }
      });
      
      // Should trigger cleanup
      await page.waitForTimeout(1000);
      
      const cleanupTriggered = await page.evaluate(() => {
        return window.cacheService?.lastCleanupTime > Date.now() - 2000;
      });
      
      expect(cleanupTriggered).toBe(true);
      
      await context.close();
    });
    
    test('should handle Safari IndexedDB limitations', async ({ browser }) => {
      if (browser.browserType().name() !== 'webkit') {
        test.skip();
      }
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Test Safari IndexedDB workarounds
      const idbWorkarounds = await page.evaluate(async () => {
        const workarounds = {
          transactionRetry: false,
          quotaHandling: false,
          versionManagement: false
        };
        
        try {
          // Test transaction retry mechanism
          const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('SafariTestDB', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
              const db = (event.target as IDBOpenDBRequest).result;
              if (!db.objectStoreNames.contains('test')) {
                db.createObjectStore('test', { keyPath: 'id' });
              }
            };
          });
          
          // Test retry mechanism
          if (window.cacheService?.safariIDBRetry) {
            workarounds.transactionRetry = true;
          }
          
          // Test quota handling
          if (window.cacheService?.safariQuotaHandler) {
            workarounds.quotaHandling = true;
          }
          
          // Test version management
          if (window.cacheService?.safariVersionManager) {
            workarounds.versionManagement = true;
          }
          
          (db as IDBDatabase).close();
        } catch (error) {
          console.log('Safari IndexedDB test error:', error);
        }
        
        return workarounds;
      });
      
      // At least one workaround should be implemented
      const hasWorkarounds = Object.values(idbWorkarounds).some(Boolean);
      expect(hasWorkarounds).toBe(true);
      
      await context.close();
    });
  });
  
  test.describe('Edge Compatibility Optimizations', () => {
    test('should optimize for Edge-specific features', async ({ browser }) => {
      // Skip if not Edge (Edge uses Chromium engine but has specific optimizations)
      const isEdge = browser.browserType().name() === 'chromium' && 
                    (await browser.version()).includes('Edge');
      
      if (!isEdge) {
        test.skip();
      }
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Test Edge-specific optimizations
      const edgeOptimizations = await page.evaluate(() => {
        const optimizations = {
          enhancedSecurity: false,
          performanceOptimizations: false,
          compatibilityMode: false
        };
        
        if (window.cacheService) {
          optimizations.enhancedSecurity = window.cacheService.edgeSecurityMode || false;
          optimizations.performanceOptimizations = window.cacheService.edgePerformanceMode || false;
          optimizations.compatibilityMode = window.cacheService.edgeCompatibilityMode || false;
        }
        
        return optimizations;
      });
      
      // Edge should have specific optimizations
      const hasOptimizations = Object.values(edgeOptimizations).some(Boolean);
      expect(hasOptimizations).toBe(true);
      
      await context.close();
    });
  });
  
  test.describe('Universal Fallbacks', () => {
    test('should provide memory cache fallback when Cache API is unavailable', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      // Mock missing Cache API
      await page.addInitScript(() => {
        delete window.caches;
      });
      
      await page.goto('/');
      
      // Should implement memory cache fallback
      const hasMemoryFallback = await page.evaluate(() => {
        return window.cacheService?.memoryCacheFallback !== undefined;
      });
      
      expect(hasMemoryFallback).toBe(true);
      
      // Test memory cache functionality
      const memoryCacheWorks = await page.evaluate(async () => {
        try {
          if (window.cacheService?.memoryCacheFallback) {
            await window.cacheService.memoryCacheFallback.put('/test', 'test data');
            const result = await window.cacheService.memoryCacheFallback.get('/test');
            return result === 'test data';
          }
          return false;
        } catch (error) {
          return false;
        }
      });
      
      expect(memoryCacheWorks).toBe(true);
      
      await context.close();
    });
    
    test('should handle service worker registration failures gracefully', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      // Mock service worker registration failure
      await page.addInitScript(() => {
        if (navigator.serviceWorker) {
          navigator.serviceWorker.register = () => {
            return Promise.reject(new Error('Service Worker registration failed'));
          };
        }
      });
      
      await page.goto('/');
      
      // Should handle failure gracefully
      const fallbackActive = await page.evaluate(() => {
        return window.cacheService?.fallbackMode === true;
      });
      
      expect(fallbackActive).toBe(true);
      
      // Basic functionality should still work
      await page.goto('/feed');
      await page.waitForSelector('[data-testid="feed-container"]');
      
      // Should show fallback notification
      const fallbackNotification = await page.locator('[data-testid="fallback-mode-notification"]').count();
      expect(fallbackNotification).toBeGreaterThan(0);
      
      await context.close();
    });
    
    test('should implement progressive enhancement based on capabilities', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Test progressive enhancement
      const enhancementLevels = await page.evaluate(() => {
        const levels = {
          basic: false,      // Basic caching
          intermediate: false, // Advanced strategies
          advanced: false    // Full feature set
        };
        
        if (window.cacheService) {
          const capabilities = window.cacheService.getCapabilities();
          
          // Basic level: Cache API + IndexedDB
          if (capabilities.cacheAPI && capabilities.indexedDB) {
            levels.basic = true;
          }
          
          // Intermediate level: + Background Sync or BroadcastChannel
          if (levels.basic && (capabilities.backgroundSync || capabilities.broadcastChannel)) {
            levels.intermediate = true;
          }
          
          // Advanced level: + Navigation Preload + Storage Estimation
          if (levels.intermediate && capabilities.navigationPreload && capabilities.storageEstimate) {
            levels.advanced = true;
          }
        }
        
        return levels;
      });
      
      // Should have at least basic level
      expect(enhancementLevels.basic).toBe(true);
      
      // Test that appropriate features are enabled for each level
      const enabledFeatures = await page.evaluate(() => {
        return window.cacheService?.getEnabledFeatures() || [];
      });
      
      expect(enabledFeatures.length).toBeGreaterThan(0);
      
      // Basic features should always be enabled
      expect(enabledFeatures).toContain('basicCaching');
      
      if (enhancementLevels.intermediate) {
        expect(enabledFeatures).toContain('offlineSync');
      }
      
      if (enhancementLevels.advanced) {
        expect(enabledFeatures).toContain('predictivePreloading');
      }
      
      await context.close();
    });
  });
  
  test.describe('Error Handling and Recovery', () => {
    test('should recover from cache corruption', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Simulate cache corruption
      await page.evaluate(async () => {
        try {
          const cache = await caches.open('corrupted-cache');
          // Add invalid data to simulate corruption
          await cache.put('/corrupt', new Response('', { status: 0 }));
        } catch (error) {
          console.log('Cache corruption simulation error:', error);
        }
      });
      
      // Should detect and recover from corruption
      const recoveryTriggered = await page.evaluate(async () => {
        try {
          if (window.cacheService?.detectCorruption) {
            const isCorrupted = await window.cacheService.detectCorruption();
            if (isCorrupted && window.cacheService.recoverFromCorruption) {
              await window.cacheService.recoverFromCorruption();
              return true;
            }
          }
          return false;
        } catch (error) {
          return false;
        }
      });
      
      expect(recoveryTriggered).toBe(true);
      
      await context.close();
    });
    
    test('should handle quota exceeded errors', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Simulate quota exceeded error
      const quotaHandled = await page.evaluate(async () => {
        try {
          if (window.cacheService?.handleQuotaExceeded) {
            await window.cacheService.handleQuotaExceeded();
            return true;
          }
          return false;
        } catch (error) {
          return false;
        }
      });
      
      expect(quotaHandled).toBe(true);
      
      // Should show user notification
      const quotaNotification = await page.locator('[data-testid="quota-exceeded-notification"]').count();
      expect(quotaNotification).toBeGreaterThan(0);
      
      await context.close();
    });
  });
});