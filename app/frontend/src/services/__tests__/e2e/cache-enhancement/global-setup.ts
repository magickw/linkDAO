import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Service Worker Cache Enhancement E2E tests
 * Prepares test environment and ensures service worker registration
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up Service Worker Cache Enhancement E2E tests...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to the application
    await page.goto(config.projects[0].use.baseURL || 'http://localhost:3000');
    
    // Wait for service worker registration
    await page.waitForFunction(() => {
      return 'serviceWorker' in navigator;
    });
    
    // Register enhanced service worker
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw-enhanced.js');
          console.log('Service Worker registered:', registration);
          
          // Wait for service worker to be active
          if (registration.installing) {
            await new Promise((resolve) => {
              registration.installing!.addEventListener('statechange', () => {
                if (registration.installing!.state === 'activated') {
                  resolve(undefined);
                }
              });
            });
          }
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      }
    });
    
    // Initialize cache metadata database
    await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('CacheMetadataDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          if (!db.objectStoreNames.contains('metadata')) {
            const store = db.createObjectStore('metadata', { keyPath: 'url' });
            store.createIndex('tags', 'tags', { multiEntry: true });
            store.createIndex('timestamp', 'timestamp');
            store.createIndex('lastAccessed', 'lastAccessed');
          }
        };
      });
    });
    
    // Clear any existing cache data for clean test environment
    await page.evaluate(async () => {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
    });
    
    console.log('✅ Service Worker Cache Enhancement E2E setup complete');
    
  } catch (error) {
    console.error('❌ Failed to setup Service Worker Cache Enhancement E2E tests:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;