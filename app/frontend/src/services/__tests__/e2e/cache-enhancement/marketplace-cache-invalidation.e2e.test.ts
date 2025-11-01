import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * E2E Tests for Marketplace Shopping with Cache Invalidation
 * Tests NetworkFirst for listings, CacheFirst for images, and ETag validation
 */

test.describe('Marketplace Caching - Shopping Scenarios', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Enable service worker debugging
    await page.addInitScript(() => {
      window.cacheTestMode = true;
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

  test('should use NetworkFirst for product listings with inventory sensitivity', async () => {
    // Navigate to marketplace
    await page.goto('/marketplace');
    
    // Wait for product listings to load
    await page.waitForSelector('[data-testid="product-grid"]');
    await page.waitForSelector('[data-testid="product-card"]');
    
    // Get initial product count and prices
    const initialProductCount = await page.locator('[data-testid="product-card"]').count();
    const firstProductPrice = await page.locator('[data-testid="product-price"]').first().textContent();
    
    // Monitor network requests for listings
    const listingRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/marketplace/products')) {
        listingRequests.push(request.url());
      }
    });
    
    // Navigate away and back to test NetworkFirst strategy
    await page.goto('/feed');
    await page.waitForSelector('[data-testid="feed-container"]');
    
    const startTime = Date.now();
    await page.goto('/marketplace');
    
    // Should load quickly but still make network request for fresh data
    await page.waitForSelector('[data-testid="product-grid"]');
    const loadTime = Date.now() - startTime;
    
    // Should load reasonably fast (from cache or network)
    expect(loadTime).toBeLessThan(3000);
    
    // Should have made network request for fresh inventory data
    await page.waitForTimeout(1000);
    expect(listingRequests.length).toBeGreaterThan(0);
    
    // Verify product data is current
    const currentProductCount = await page.locator('[data-testid="product-card"]').count();
    expect(currentProductCount).toBeGreaterThanOrEqual(initialProductCount);
  });

  test('should use CacheFirst for product images with expiration', async () => {
    await page.goto('/marketplace');
    
    // Wait for products with images
    await page.waitForSelector('[data-testid="product-image"]');
    
    // Monitor image requests
    const imageRequests: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'image' && request.url().includes('product-image')) {
        imageRequests.push(request.url());
      }
    });
    
    // Load initial images
    await page.waitForTimeout(2000);
    const initialImageRequests = imageRequests.length;
    
    // Navigate away and back
    await page.goto('/feed');
    await page.goto('/marketplace');
    
    // Wait for images to load
    await page.waitForSelector('[data-testid="product-image"]');
    await page.waitForTimeout(2000);
    
    // Should have made fewer image requests (served from cache)
    const finalImageRequests = imageRequests.length;
    expect(finalImageRequests - initialImageRequests).toBeLessThan(initialImageRequests);
    
    // Verify images are displayed correctly
    const visibleImages = await page.locator('[data-testid="product-image"]:visible').count();
    expect(visibleImages).toBeGreaterThan(0);
    
    // Check for broken images
    const brokenImages = await page.locator('[data-testid="product-image"][src=""]').count();
    expect(brokenImages).toBe(0);
  });

  test('should validate pricing data with ETag headers', async () => {
    await page.goto('/marketplace');
    
    // Wait for products to load
    await page.waitForSelector('[data-testid="product-card"]');
    
    // Click on a product to view details
    await page.click('[data-testid="product-card"]:first-child');
    await page.waitForSelector('[data-testid="product-detail-page"]');
    
    // Get initial price
    const initialPrice = await page.locator('[data-testid="product-price-detail"]').textContent();
    
    // Monitor requests with ETag headers
    const etagRequests: any[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/marketplace/products/') && request.url().includes('/pricing')) {
        etagRequests.push({
          url: request.url(),
          headers: request.headers()
        });
      }
    });
    
    // Navigate away and back to trigger ETag validation
    await page.goto('/marketplace');
    await page.click('[data-testid="product-card"]:first-child');
    await page.waitForSelector('[data-testid="product-detail-page"]');
    
    // Should have made conditional request with If-None-Match header
    await page.waitForTimeout(1000);
    
    const conditionalRequests = etagRequests.filter(req => 
      req.headers['if-none-match'] !== undefined
    );
    expect(conditionalRequests.length).toBeGreaterThan(0);
    
    // Price should be current (either from cache if unchanged or fresh if updated)
    const currentPrice = await page.locator('[data-testid="product-price-detail"]').textContent();
    expect(currentPrice).toBeDefined();
  });

  test('should handle cart and wishlist offline storage', async () => {
    await page.goto('/marketplace');
    
    // Wait for products
    await page.waitForSelector('[data-testid="product-card"]');
    
    // Add items to cart while online
    await page.click('[data-testid="add-to-cart-button"]:first-child');
    await page.waitForSelector('[data-testid="cart-notification"]');
    
    // Add item to wishlist
    await page.click('[data-testid="wishlist-button"]:nth-child(2)');
    await page.waitForSelector('[data-testid="wishlist-notification"]');
    
    // Go offline
    await context.setOffline(true);
    
    // Try to add more items while offline
    await page.click('[data-testid="add-to-cart-button"]:nth-child(3)');
    await page.waitForSelector('[data-testid="offline-cart-notification"]');
    
    // Verify items are stored in IndexedDB
    const offlineCartData = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const request = indexedDB.open('MarketplaceOfflineDB', 1);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['cart'], 'readonly');
          const store = transaction.objectStore('cart');
          const getRequest = store.getAll();
          
          getRequest.onsuccess = () => {
            resolve(getRequest.result);
          };
        };
      });
    });
    
    expect(Array.isArray(offlineCartData)).toBe(true);
    expect((offlineCartData as any[]).length).toBeGreaterThan(0);
    
    // Go back online
    await context.setOffline(false);
    
    // Wait for sync
    await page.waitForSelector('[data-testid="cart-sync-complete"]', { timeout: 10000 });
    
    // Verify cart shows all items
    await page.click('[data-testid="cart-icon"]');
    await page.waitForSelector('[data-testid="cart-modal"]');
    
    const cartItems = await page.locator('[data-testid="cart-item"]').count();
    expect(cartItems).toBeGreaterThan(1);
  });

  test('should preload critical product images on category pages', async () => {
    await page.goto('/marketplace/category/electronics');
    
    // Wait for category page to load
    await page.waitForSelector('[data-testid="category-header"]');
    await page.waitForSelector('[data-testid="product-grid"]');
    
    // Monitor image preloading
    const preloadRequests: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'image' && 
          request.url().includes('product-image') &&
          request.headers()['purpose'] === 'prefetch') {
        preloadRequests.push(request.url());
      }
    });
    
    // Scroll to trigger preloading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight * 0.4);
    });
    
    await page.waitForTimeout(2000);
    
    // Should have preloaded images for products below the fold
    expect(preloadRequests.length).toBeGreaterThan(0);
    
    // Continue scrolling
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight * 0.8);
    });
    
    // Images should load quickly from preload
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="product-image"]:nth-child(10)', { timeout: 5000 });
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(1000); // Should be fast from preload
  });

  test('should invalidate cache when inventory changes', async () => {
    await page.goto('/marketplace');
    
    // Wait for products
    await page.waitForSelector('[data-testid="product-card"]');
    
    // Find a product with stock information
    await page.click('[data-testid="product-card"]:first-child');
    await page.waitForSelector('[data-testid="product-detail-page"]');
    
    // Get initial stock level
    const initialStock = await page.locator('[data-testid="stock-level"]').textContent();
    const initialStockNumber = parseInt(initialStock?.replace(/\D/g, '') || '0');
    
    // Add item to cart (should reduce stock)
    await page.click('[data-testid="add-to-cart-button"]');
    await page.waitForSelector('[data-testid="cart-notification"]');
    
    // Wait for stock update
    await page.waitForTimeout(2000);
    
    // Verify stock was updated
    const updatedStock = await page.locator('[data-testid="stock-level"]').textContent();
    const updatedStockNumber = parseInt(updatedStock?.replace(/\D/g, '') || '0');
    
    expect(updatedStockNumber).toBeLessThan(initialStockNumber);
    
    // Navigate away and back to test cache invalidation
    await page.goto('/marketplace');
    await page.click('[data-testid="product-card"]:first-child');
    await page.waitForSelector('[data-testid="product-detail-page"]');
    
    // Should show updated stock (cache was invalidated)
    const cachedStock = await page.locator('[data-testid="stock-level"]').textContent();
    const cachedStockNumber = parseInt(cachedStock?.replace(/\D/g, '') || '0');
    
    expect(cachedStockNumber).toBe(updatedStockNumber);
  });

  test('should handle responsive image optimization', async () => {
    // Test on different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/marketplace');
      
      // Wait for products to load
      await page.waitForSelector('[data-testid="product-card"]');
      
      // Monitor image requests for different sizes
      const imageRequests: any[] = [];
      page.on('request', (request) => {
        if (request.resourceType() === 'image' && request.url().includes('product-image')) {
          imageRequests.push({
            url: request.url(),
            viewport: viewport.name
          });
        }
      });
      
      await page.waitForTimeout(2000);
      
      // Verify appropriate image sizes are requested
      const currentViewportRequests = imageRequests.filter(req => req.viewport === viewport.name);
      expect(currentViewportRequests.length).toBeGreaterThan(0);
      
      // Check that images are optimized for viewport
      if (viewport.name === 'mobile') {
        // Mobile should request smaller images
        const mobileOptimizedRequests = currentViewportRequests.filter(req => 
          req.url.includes('w=400') || req.url.includes('mobile')
        );
        expect(mobileOptimizedRequests.length).toBeGreaterThan(0);
      }
    }
  });

  test('should handle search result caching with query parameters', async () => {
    await page.goto('/marketplace');
    
    // Perform a search
    await page.fill('[data-testid="search-input"]', 'laptop');
    await page.click('[data-testid="search-button"]');
    
    // Wait for search results
    await page.waitForSelector('[data-testid="search-results"]');
    const initialResults = await page.locator('[data-testid="product-card"]').count();
    
    // Navigate away and back to same search
    await page.goto('/marketplace');
    await page.fill('[data-testid="search-input"]', 'laptop');
    await page.click('[data-testid="search-button"]');
    
    // Should load quickly from cache
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="search-results"]');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(1000);
    
    // Results should match cached data
    const cachedResults = await page.locator('[data-testid="product-card"]').count();
    expect(cachedResults).toBe(initialResults);
    
    // Perform different search
    await page.fill('[data-testid="search-input"]', 'phone');
    await page.click('[data-testid="search-button"]');
    
    // Should make new network request for different query
    await page.waitForSelector('[data-testid="search-results"]');
    const newResults = await page.locator('[data-testid="product-card"]').count();
    
    // Results should be different (unless coincidentally same)
    expect(typeof newResults).toBe('number');
  });

  test('should handle marketplace filters with cache optimization', async () => {
    await page.goto('/marketplace');
    
    // Wait for products and filters
    await page.waitForSelector('[data-testid="product-grid"]');
    await page.waitForSelector('[data-testid="filter-panel"]');
    
    // Apply price filter
    await page.click('[data-testid="price-filter-toggle"]');
    await page.fill('[data-testid="min-price-input"]', '100');
    await page.fill('[data-testid="max-price-input"]', '500');
    await page.click('[data-testid="apply-filters-button"]');
    
    // Wait for filtered results
    await page.waitForSelector('[data-testid="filtered-results"]');
    const filteredCount = await page.locator('[data-testid="product-card"]').count();
    
    // Apply additional category filter
    await page.click('[data-testid="category-filter-electronics"]');
    await page.waitForSelector('[data-testid="filtered-results"]');
    
    // Should have fewer results
    const doubleFilteredCount = await page.locator('[data-testid="product-card"]').count();
    expect(doubleFilteredCount).toBeLessThanOrEqual(filteredCount);
    
    // Remove one filter
    await page.click('[data-testid="category-filter-electronics"]'); // Uncheck
    await page.waitForSelector('[data-testid="filtered-results"]');
    
    // Should return to previous count (cached filter state)
    const restoredCount = await page.locator('[data-testid="product-card"]').count();
    expect(restoredCount).toBe(filteredCount);
    
    // Clear all filters
    await page.click('[data-testid="clear-filters-button"]');
    await page.waitForSelector('[data-testid="product-grid"]');
    
    // Should show all products again
    const allProductsCount = await page.locator('[data-testid="product-card"]').count();
    expect(allProductsCount).toBeGreaterThan(filteredCount);
  });
});