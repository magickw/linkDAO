import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Performance Benchmarks and Regression Testing
 * Tests cache performance metrics and validates optimization effectiveness
 */

test.describe('Cache Performance Benchmarks', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Enable performance monitoring
    await page.addInitScript(() => {
      window.performanceTestMode = true;
      window.performanceMetrics = [];
    });
    
    await page.goto('/');
    
    // Wait for service worker to be ready
    await page.waitForFunction(() => {
      return navigator.serviceWorker.controller !== null;
    });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should benchmark cache write performance', async () => {
    await page.goto('/');
    
    // Benchmark cache write operations
    const writePerformance = await page.evaluate(async () => {
      const metrics = {
        cacheAPIWrites: [],
        indexedDBWrites: [],
        averageCacheWrite: 0,
        averageIndexedDBWrite: 0
      };
      
      // Test Cache API write performance
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        try {
          const cache = await caches.open('performance-test');
          await cache.put(`/test-${i}`, new Response(`test data ${i}`));
          const endTime = performance.now();
          metrics.cacheAPIWrites.push(endTime - startTime);
        } catch (error) {
          console.log('Cache write error:', error);
        }
      }
      
      // Test IndexedDB write performance
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        try {
          await new Promise((resolve, reject) => {
            const request = indexedDB.open('PerformanceTestDB', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result;
              const transaction = db.transaction(['test'], 'readwrite');
              const store = transaction.objectStore('test');
              const putRequest = store.put({ id: i, data: `test data ${i}` });
              
              putRequest.onsuccess = () => {
                const endTime = performance.now();
                metrics.indexedDBWrites.push(endTime - startTime);
                db.close();
                resolve(undefined);
              };
              putRequest.onerror = () => reject(putRequest.error);
            };
            request.onupgradeneeded = (event) => {
              const db = (event.target as IDBOpenDBRequest).result;
              if (!db.objectStoreNames.contains('test')) {
                db.createObjectStore('test', { keyPath: 'id' });
              }
            };
          });
        } catch (error) {
          console.log('IndexedDB write error:', error);
        }
      }
      
      // Calculate averages
      metrics.averageCacheWrite = metrics.cacheAPIWrites.reduce((a, b) => a + b, 0) / metrics.cacheAPIWrites.length;
      metrics.averageIndexedDBWrite = metrics.indexedDBWrites.reduce((a, b) => a + b, 0) / metrics.indexedDBWrites.length;
      
      return metrics;
    });
    
    console.log('Write Performance:', writePerformance);
    
    // Cache writes should be reasonably fast
    expect(writePerformance.averageCacheWrite).toBeLessThan(100); // Less than 100ms
    expect(writePerformance.averageIndexedDBWrite).toBeLessThan(50); // Less than 50ms
    
    // Should have consistent performance (low variance)
    const cacheVariance = writePerformance.cacheAPIWrites.reduce((acc, time) => {
      return acc + Math.pow(time - writePerformance.averageCacheWrite, 2);
    }, 0) / writePerformance.cacheAPIWrites.length;
    
    expect(Math.sqrt(cacheVariance)).toBeLessThan(50); // Standard deviation < 50ms
  });

  test('should benchmark cache read performance', async () => {
    await page.goto('/');
    
    // Pre-populate cache with test data
    await page.evaluate(async () => {
      const cache = await caches.open('performance-test');
      for (let i = 0; i < 20; i++) {
        await cache.put(`/read-test-${i}`, new Response(`read test data ${i}`));
      }
      
      // Pre-populate IndexedDB
      await new Promise((resolve, reject) => {
        const request = indexedDB.open('ReadPerformanceTestDB', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['test'], 'readwrite');
          const store = transaction.objectStore('test');
          
          let completed = 0;
          for (let i = 0; i < 20; i++) {
            const putRequest = store.put({ id: i, data: `read test data ${i}` });
            putRequest.onsuccess = () => {
              completed++;
              if (completed === 20) {
                db.close();
                resolve(undefined);
              }
            };
          }
        };
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('test')) {
            db.createObjectStore('test', { keyPath: 'id' });
          }
        };
      });
    });
    
    // Benchmark cache read operations
    const readPerformance = await page.evaluate(async () => {
      const metrics = {
        cacheAPIReads: [],
        indexedDBReads: [],
        averageCacheRead: 0,
        averageIndexedDBRead: 0,
        cacheHitRate: 0,
        indexedDBHitRate: 0
      };
      
      let cacheHits = 0;
      let indexedDBHits = 0;
      
      // Test Cache API read performance
      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        try {
          const cache = await caches.open('performance-test');
          const response = await cache.match(`/read-test-${i}`);
          const endTime = performance.now();
          
          if (response) {
            cacheHits++;
          }
          
          metrics.cacheAPIReads.push(endTime - startTime);
        } catch (error) {
          console.log('Cache read error:', error);
        }
      }
      
      // Test IndexedDB read performance
      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        try {
          const result = await new Promise((resolve, reject) => {
            const request = indexedDB.open('ReadPerformanceTestDB', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result;
              const transaction = db.transaction(['test'], 'readonly');
              const store = transaction.objectStore('test');
              const getRequest = store.get(i);
              
              getRequest.onsuccess = () => {
                const endTime = performance.now();
                metrics.indexedDBReads.push(endTime - startTime);
                db.close();
                resolve(getRequest.result);
              };
              getRequest.onerror = () => reject(getRequest.error);
            };
          });
          
          if (result) {
            indexedDBHits++;
          }
        } catch (error) {
          console.log('IndexedDB read error:', error);
        }
      }
      
      // Calculate metrics
      metrics.averageCacheRead = metrics.cacheAPIReads.reduce((a, b) => a + b, 0) / metrics.cacheAPIReads.length;
      metrics.averageIndexedDBRead = metrics.indexedDBReads.reduce((a, b) => a + b, 0) / metrics.indexedDBReads.length;
      metrics.cacheHitRate = (cacheHits / 20) * 100;
      metrics.indexedDBHitRate = (indexedDBHits / 20) * 100;
      
      return metrics;
    });
    
    console.log('Read Performance:', readPerformance);
    
    // Cache reads should be very fast
    expect(readPerformance.averageCacheRead).toBeLessThan(10); // Less than 10ms
    expect(readPerformance.averageIndexedDBRead).toBeLessThan(20); // Less than 20ms
    
    // Hit rates should be high
    expect(readPerformance.cacheHitRate).toBeGreaterThan(90); // > 90%
    expect(readPerformance.indexedDBHitRate).toBeGreaterThan(90); // > 90%
  });

  test('should benchmark network vs cache performance', async () => {
    await page.goto('/feed');
    
    // Wait for initial load
    await page.waitForSelector('[data-testid="feed-container"]');
    
    // Benchmark network request
    const networkPerformance = await page.evaluate(async () => {
      const startTime = performance.now();
      try {
        const response = await fetch('/api/feed?page=1');
        await response.json();
        return performance.now() - startTime;
      } catch (error) {
        console.log('Network request error:', error);
        return 0;
      }
    });
    
    // Navigate away and back to test cache
    await page.goto('/');
    
    const cachePerformance = await page.evaluate(async () => {
      const startTime = performance.now();
      try {
        const cache = await caches.open('feed-cache-v1');
        const response = await cache.match('/api/feed?page=1');
        if (response) {
          await response.json();
        }
        return performance.now() - startTime;
      } catch (error) {
        console.log('Cache request error:', error);
        return 0;
      }
    });
    
    console.log('Network vs Cache Performance:', {
      network: networkPerformance,
      cache: cachePerformance,
      improvement: networkPerformance / cachePerformance
    });
    
    // Cache should be significantly faster than network
    expect(cachePerformance).toBeLessThan(networkPerformance);
    expect(networkPerformance / cachePerformance).toBeGreaterThan(2); // At least 2x faster
  });

  test('should benchmark preloading effectiveness', async () => {
    await page.goto('/feed');
    
    // Wait for feed to load
    await page.waitForSelector('[data-testid="feed-container"]');
    
    // Trigger preloading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight * 0.8);
    });
    
    // Wait for preloading to complete
    await page.waitForTimeout(2000);
    
    // Measure preload effectiveness
    const preloadMetrics = await page.evaluate(async () => {
      const metrics = {
        preloadedResources: 0,
        preloadHitRate: 0,
        preloadBandwidthSaved: 0
      };
      
      // Check preloaded resources
      const preloadEntries = performance.getEntriesByType('resource')
        .filter((entry: any) => entry.name.includes('preload') || entry.transferSize === 0);
      
      metrics.preloadedResources = preloadEntries.length;
      
      // Calculate hit rate (resources served from preload cache)
      const totalResources = performance.getEntriesByType('resource').length;
      metrics.preloadHitRate = (preloadEntries.length / totalResources) * 100;
      
      // Estimate bandwidth saved
      metrics.preloadBandwidthSaved = preloadEntries.reduce((total: number, entry: any) => {
        return total + (entry.decodedBodySize || 0);
      }, 0);
      
      return metrics;
    });
    
    console.log('Preload Metrics:', preloadMetrics);
    
    // Should have preloaded some resources
    expect(preloadMetrics.preloadedResources).toBeGreaterThan(0);
    
    // Should have reasonable hit rate
    expect(preloadMetrics.preloadHitRate).toBeGreaterThan(10); // > 10%
    
    // Navigate to next page to test preload effectiveness
    const startTime = Date.now();
    await page.click('[data-testid="next-page-button"]');
    await page.waitForSelector('[data-testid="feed-container"]');
    const loadTime = Date.now() - startTime;
    
    // Should load quickly from preload
    expect(loadTime).toBeLessThan(1000);
  });

  test('should benchmark storage quota efficiency', async () => {
    await page.goto('/');
    
    // Fill cache with test data
    await page.evaluate(async () => {
      const cache = await caches.open('quota-test');
      const testData = 'x'.repeat(1024); // 1KB of data
      
      for (let i = 0; i < 100; i++) {
        await cache.put(`/quota-test-${i}`, new Response(testData));
      }
    });
    
    // Measure storage efficiency
    const storageMetrics = await page.evaluate(async () => {
      const metrics = {
        totalUsage: 0,
        totalQuota: 0,
        usagePercentage: 0,
        cacheEfficiency: 0,
        compressionRatio: 0
      };
      
      try {
        // Get storage estimate
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          metrics.totalUsage = estimate.usage || 0;
          metrics.totalQuota = estimate.quota || 0;
          metrics.usagePercentage = (metrics.totalUsage / metrics.totalQuota) * 100;
        }
        
        // Calculate cache efficiency
        const cache = await caches.open('quota-test');
        const keys = await cache.keys();
        const responses = await Promise.all(keys.map(key => cache.match(key)));
        
        let totalCacheSize = 0;
        let totalOriginalSize = 0;
        
        for (const response of responses) {
          if (response) {
            const text = await response.text();
            totalOriginalSize += text.length;
            totalCacheSize += new Blob([text]).size;
          }
        }
        
        metrics.cacheEfficiency = totalCacheSize > 0 ? (totalOriginalSize / totalCacheSize) : 0;
        metrics.compressionRatio = totalOriginalSize > 0 ? (totalCacheSize / totalOriginalSize) : 1;
        
      } catch (error) {
        console.log('Storage metrics error:', error);
      }
      
      return metrics;
    });
    
    console.log('Storage Metrics:', storageMetrics);
    
    // Should use storage efficiently
    expect(storageMetrics.usagePercentage).toBeLessThan(50); // Less than 50% of quota
    expect(storageMetrics.cacheEfficiency).toBeGreaterThan(0.8); // > 80% efficiency
  });

  test('should benchmark cleanup performance', async () => {
    await page.goto('/');
    
    // Create cache entries to clean up
    await page.evaluate(async () => {
      const cache = await caches.open('cleanup-test');
      const oldTimestamp = Date.now() - 86400000; // 24 hours ago
      
      for (let i = 0; i < 50; i++) {
        const response = new Response(`old data ${i}`, {
          headers: {
            'date': new Date(oldTimestamp).toUTCString(),
            'cache-control': 'max-age=3600' // 1 hour
          }
        });
        await cache.put(`/old-${i}`, response);
      }
      
      // Add some fresh entries
      for (let i = 0; i < 20; i++) {
        const response = new Response(`fresh data ${i}`);
        await cache.put(`/fresh-${i}`, response);
      }
    });
    
    // Benchmark cleanup operation
    const cleanupMetrics = await page.evaluate(async () => {
      const metrics = {
        cleanupTime: 0,
        entriesRemoved: 0,
        entriesRemaining: 0,
        cleanupEfficiency: 0
      };
      
      try {
        const cache = await caches.open('cleanup-test');
        const initialKeys = await cache.keys();
        const initialCount = initialKeys.length;
        
        const startTime = performance.now();
        
        // Perform cleanup (remove expired entries)
        const expiredKeys = [];
        for (const key of initialKeys) {
          const response = await cache.match(key);
          if (response) {
            const dateHeader = response.headers.get('date');
            const cacheControl = response.headers.get('cache-control');
            
            if (dateHeader && cacheControl) {
              const date = new Date(dateHeader);
              const maxAge = parseInt(cacheControl.split('max-age=')[1] || '0') * 1000;
              
              if (Date.now() - date.getTime() > maxAge) {
                expiredKeys.push(key);
              }
            }
          }
        }
        
        // Remove expired entries
        await Promise.all(expiredKeys.map(key => cache.delete(key)));
        
        const endTime = performance.now();
        const finalKeys = await cache.keys();
        
        metrics.cleanupTime = endTime - startTime;
        metrics.entriesRemoved = initialCount - finalKeys.length;
        metrics.entriesRemaining = finalKeys.length;
        metrics.cleanupEfficiency = (metrics.entriesRemoved / initialCount) * 100;
        
      } catch (error) {
        console.log('Cleanup benchmark error:', error);
      }
      
      return metrics;
    });
    
    console.log('Cleanup Metrics:', cleanupMetrics);
    
    // Cleanup should be reasonably fast
    expect(cleanupMetrics.cleanupTime).toBeLessThan(1000); // Less than 1 second
    
    // Should remove expired entries
    expect(cleanupMetrics.entriesRemoved).toBeGreaterThan(0);
    
    // Should have good efficiency
    expect(cleanupMetrics.cleanupEfficiency).toBeGreaterThan(50); // > 50%
  });

  test('should benchmark background sync performance', async () => {
    await page.goto('/communities/web3-developers');
    
    // Wait for community to load
    await page.waitForSelector('[data-testid="community-header"]');
    
    // Go offline and create actions
    await context.setOffline(true);
    
    const syncMetrics = await page.evaluate(async () => {
      const metrics = {
        queueTime: 0,
        syncTime: 0,
        actionsQueued: 0,
        actionsProcessed: 0,
        syncEfficiency: 0
      };
      
      const startQueueTime = performance.now();
      
      // Queue multiple actions
      const actions = [];
      for (let i = 0; i < 10; i++) {
        actions.push({
          type: 'comment',
          data: { content: `Test comment ${i}` },
          timestamp: Date.now() + i
        });
      }
      
      // Simulate queuing actions
      localStorage.setItem('offlineActionQueue', JSON.stringify(actions));
      
      const endQueueTime = performance.now();
      metrics.queueTime = endQueueTime - startQueueTime;
      metrics.actionsQueued = actions.length;
      
      return metrics;
    });
    
    // Go online to trigger sync
    await context.setOffline(false);
    
    // Measure sync performance
    const syncTime = Date.now();
    
    // Wait for sync to complete
    await page.waitForSelector('[data-testid="sync-complete-notification"]', { timeout: 10000 });
    
    const finalSyncMetrics = await page.evaluate((initialMetrics) => {
      const metrics = { ...initialMetrics };
      
      // Check remaining queue
      const remainingQueue = JSON.parse(localStorage.getItem('offlineActionQueue') || '[]');
      metrics.actionsProcessed = metrics.actionsQueued - remainingQueue.length;
      metrics.syncEfficiency = (metrics.actionsProcessed / metrics.actionsQueued) * 100;
      
      return metrics;
    }, syncMetrics);
    
    finalSyncMetrics.syncTime = Date.now() - syncTime;
    
    console.log('Background Sync Metrics:', finalSyncMetrics);
    
    // Queuing should be very fast
    expect(finalSyncMetrics.queueTime).toBeLessThan(100); // Less than 100ms
    
    // Sync should complete in reasonable time
    expect(finalSyncMetrics.syncTime).toBeLessThan(10000); // Less than 10 seconds
    
    // Should process all actions
    expect(finalSyncMetrics.syncEfficiency).toBeGreaterThan(90); // > 90%
  });

  test('should create performance regression baseline', async () => {
    await page.goto('/');
    
    // Run comprehensive performance test
    const performanceBaseline = await page.evaluate(async () => {
      const baseline = {
        timestamp: Date.now(),
        browser: navigator.userAgent,
        cacheWrite: 0,
        cacheRead: 0,
        networkVsCache: 0,
        preloadEffectiveness: 0,
        storageEfficiency: 0,
        cleanupPerformance: 0,
        overallScore: 0
      };
      
      try {
        // Cache write test
        const writeStart = performance.now();
        const cache = await caches.open('baseline-test');
        await cache.put('/baseline', new Response('baseline data'));
        baseline.cacheWrite = performance.now() - writeStart;
        
        // Cache read test
        const readStart = performance.now();
        await cache.match('/baseline');
        baseline.cacheRead = performance.now() - readStart;
        
        // Network vs cache comparison
        const networkStart = performance.now();
        await fetch('/api/health');
        const networkTime = performance.now() - networkStart;
        
        const cacheStart = performance.now();
        await cache.match('/api/health');
        const cacheTime = performance.now() - cacheStart;
        
        baseline.networkVsCache = networkTime / Math.max(cacheTime, 1);
        
        // Storage efficiency
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          baseline.storageEfficiency = ((estimate.quota || 0) - (estimate.usage || 0)) / (estimate.quota || 1);
        }
        
        // Calculate overall score
        baseline.overallScore = (
          (100 - Math.min(baseline.cacheWrite, 100)) * 0.2 +
          (100 - Math.min(baseline.cacheRead, 100)) * 0.2 +
          Math.min(baseline.networkVsCache * 10, 100) * 0.3 +
          baseline.storageEfficiency * 100 * 0.3
        );
        
      } catch (error) {
        console.log('Performance baseline error:', error);
      }
      
      return baseline;
    });
    
    console.log('Performance Baseline:', performanceBaseline);
    
    // Store baseline for regression testing
    await page.evaluate((baseline) => {
      localStorage.setItem('performanceBaseline', JSON.stringify(baseline));
    }, performanceBaseline);
    
    // Baseline should meet minimum performance criteria
    expect(performanceBaseline.cacheWrite).toBeLessThan(100);
    expect(performanceBaseline.cacheRead).toBeLessThan(50);
    expect(performanceBaseline.networkVsCache).toBeGreaterThan(1);
    expect(performanceBaseline.overallScore).toBeGreaterThan(50);
    
    // Save baseline to file for CI/CD regression testing
    const baselineData = {
      ...performanceBaseline,
      testSuite: 'service-worker-cache-enhancement',
      version: '1.0.0'
    };
    
    // In a real implementation, this would be saved to a file
    console.log('Baseline saved for regression testing:', baselineData);
  });
});