import { chromium, FullConfig } from '@playwright/test';

/**
 * Global teardown for Service Worker Cache Enhancement E2E tests
 * Cleans up test environment and cache data
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up Service Worker Cache Enhancement E2E tests...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to the application
    await page.goto(config.projects[0].use.baseURL || 'http://localhost:3000');
    
    // Clean up all cache data
    await page.evaluate(async () => {
      // Clear Cache API
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Clear IndexedDB
      const databases = ['CacheMetadataDB', 'OfflineActionQueueDB'];
      for (const dbName of databases) {
        try {
          const deleteRequest = indexedDB.deleteDatabase(dbName);
          await new Promise((resolve, reject) => {
            deleteRequest.onsuccess = () => resolve(undefined);
            deleteRequest.onerror = () => reject(deleteRequest.error);
          });
        } catch (error) {
          console.warn(`Failed to delete database ${dbName}:`, error);
        }
      }
      
      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.unregister()));
      }
    });
    
    // Clear local storage and session storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    console.log('✅ Service Worker Cache Enhancement E2E cleanup complete');
    
  } catch (error) {
    console.error('❌ Failed to cleanup Service Worker Cache Enhancement E2E tests:', error);
    // Don't throw error in teardown to avoid masking test failures
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalTeardown;