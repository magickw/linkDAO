import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * E2E Tests for Feed Browsing with Offline/Online Transitions
 * Tests NetworkFirst strategy, predictive preloading, and tag-based invalidation
 */

test.describe('Feed Caching - Offline/Online Transitions', () => {
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

  test('should load feed content online and serve from cache offline', async () => {
    // Navigate to feed page
    await page.goto('/feed');
    
    // Wait for feed content to load
    await page.waitForSelector('[data-testid="feed-container"]');
    await page.waitForSelector('[data-testid="post-card"]');
    
    // Verify feed posts are visible
    const posts = await page.locator('[data-testid="post-card"]').count();
    expect(posts).toBeGreaterThan(0);
    
    // Get initial post content for comparison
    const firstPostContent = await page.locator('[data-testid="post-card"]').first().textContent();
    
    // Go offline
    await context.setOffline(true);
    
    // Refresh the page to test offline functionality
    await page.reload();
    
    // Wait for offline indicator
    await page.waitForSelector('[data-testid="offline-indicator"]', { timeout: 5000 });
    
    // Verify feed content is still available from cache
    await page.waitForSelector('[data-testid="feed-container"]');
    const cachedPosts = await page.locator('[data-testid="post-card"]').count();
    expect(cachedPosts).toBeGreaterThan(0);
    
    // Verify content matches what was cached
    const cachedFirstPostContent = await page.locator('[data-testid="post-card"]').first().textContent();
    expect(cachedFirstPostContent).toBe(firstPostContent);
    
    // Go back online
    await context.setOffline(false);
    
    // Wait for online indicator
    await page.waitForSelector('[data-testid="online-indicator"]', { timeout: 5000 });
    
    // Verify fresh content loads
    await page.waitForTimeout(2000); // Allow time for background refresh
    const onlinePosts = await page.locator('[data-testid="post-card"]').count();
    expect(onlinePosts).toBeGreaterThanOrEqual(cachedPosts);
  });

  test('should implement NetworkFirst strategy with background refresh', async () => {
    // Navigate to feed
    await page.goto('/feed');
    
    // Monitor network requests
    const networkRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/feed')) {
        networkRequests.push(request.url());
      }
    });
    
    // Wait for initial load
    await page.waitForSelector('[data-testid="feed-container"]');
    
    // Verify network request was made
    expect(networkRequests.length).toBeGreaterThan(0);
    
    // Simulate slow network by going offline briefly then online
    await context.setOffline(true);
    await page.waitForTimeout(100);
    await context.setOffline(false);
    
    // Refresh page to test NetworkFirst with timeout
    await page.reload();
    
    // Should serve from cache quickly while network request is in progress
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="feed-container"]');
    const loadTime = Date.now() - startTime;
    
    // Should load from cache quickly (under 1 second)
    expect(loadTime).toBeLessThan(1000);
  });

  test('should perform predictive preloading for next page URLs', async () => {
    await page.goto('/feed');
    
    // Wait for feed to load
    await page.waitForSelector('[data-testid="feed-container"]');
    
    // Scroll to trigger predictive preloading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight * 0.8);
    });
    
    // Wait for preloading to trigger
    await page.waitForTimeout(1000);
    
    // Check if preload requests were made
    const preloadRequests = await page.evaluate(() => {
      return window.performance.getEntriesByType('resource')
        .filter((entry: any) => entry.name.includes('/api/feed') && entry.name.includes('page=2'))
        .length;
    });
    
    expect(preloadRequests).toBeGreaterThan(0);
    
    // Navigate to next page
    await page.click('[data-testid="next-page-button"]');
    
    // Should load quickly from preloaded cache
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="feed-container"]');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(500); // Should be very fast from preload
  });

  test('should invalidate cache when new content is posted', async () => {
    await page.goto('/feed');
    
    // Wait for initial feed load
    await page.waitForSelector('[data-testid="feed-container"]');
    const initialPostCount = await page.locator('[data-testid="post-card"]').count();
    
    // Open post composer
    await page.click('[data-testid="compose-post-button"]');
    await page.waitForSelector('[data-testid="post-composer"]');
    
    // Create a new post
    await page.fill('[data-testid="post-content-input"]', 'Test post for cache invalidation');
    await page.click('[data-testid="publish-post-button"]');
    
    // Wait for post to be published and cache to be invalidated
    await page.waitForSelector('[data-testid="post-published-notification"]');
    
    // Verify cache invalidation by checking for updated content
    await page.waitForTimeout(1000); // Allow time for cache invalidation
    
    const updatedPostCount = await page.locator('[data-testid="post-card"]').count();
    expect(updatedPostCount).toBeGreaterThan(initialPostCount);
    
    // Verify the new post appears in the feed
    const newPostExists = await page.locator('[data-testid="post-card"]')
      .filter({ hasText: 'Test post for cache invalidation' })
      .count();
    expect(newPostExists).toBe(1);
  });

  test('should handle BroadcastChannel notifications for content updates', async () => {
    // Open two tabs to test BroadcastChannel
    const page2 = await context.newPage();
    
    await page.goto('/feed');
    await page2.goto('/feed');
    
    // Wait for both pages to load
    await page.waitForSelector('[data-testid="feed-container"]');
    await page2.waitForSelector('[data-testid="feed-container"]');
    
    // Post new content in first tab
    await page.click('[data-testid="compose-post-button"]');
    await page.waitForSelector('[data-testid="post-composer"]');
    await page.fill('[data-testid="post-content-input"]', 'BroadcastChannel test post');
    await page.click('[data-testid="publish-post-button"]');
    
    // Wait for post to be published
    await page.waitForSelector('[data-testid="post-published-notification"]');
    
    // Check if second tab receives update notification
    await page2.waitForSelector('[data-testid="new-content-notification"]', { timeout: 5000 });
    
    // Click refresh button in notification
    await page2.click('[data-testid="refresh-feed-button"]');
    
    // Verify new content appears in second tab
    const newPostInSecondTab = await page2.locator('[data-testid="post-card"]')
      .filter({ hasText: 'BroadcastChannel test post' })
      .count();
    expect(newPostInSecondTab).toBe(1);
    
    await page2.close();
  });

  test('should maintain feed state during network interruptions', async () => {
    await page.goto('/feed');
    
    // Wait for feed to load and scroll to load more content
    await page.waitForSelector('[data-testid="feed-container"]');
    
    // Scroll to load multiple pages
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(1000);
    }
    
    const totalPostsLoaded = await page.locator('[data-testid="post-card"]').count();
    expect(totalPostsLoaded).toBeGreaterThan(5);
    
    // Go offline
    await context.setOffline(true);
    
    // Scroll up and down to test cached content availability
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    
    // Verify all cached content is still available
    const cachedPosts = await page.locator('[data-testid="post-card"]').count();
    expect(cachedPosts).toBe(totalPostsLoaded);
    
    // Try to load more content while offline
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight + 1000);
    });
    
    // Should show offline message for new content
    await page.waitForSelector('[data-testid="offline-load-more-message"]', { timeout: 3000 });
    
    // Go back online
    await context.setOffline(false);
    
    // Should be able to load more content
    await page.waitForTimeout(2000);
    const onlinePostsAfterReconnect = await page.locator('[data-testid="post-card"]').count();
    expect(onlinePostsAfterReconnect).toBeGreaterThanOrEqual(totalPostsLoaded);
  });

  test('should handle media thumbnail preloading', async () => {
    await page.goto('/feed');
    
    // Wait for feed with media content
    await page.waitForSelector('[data-testid="feed-container"]');
    await page.waitForSelector('[data-testid="post-media-thumbnail"]');
    
    // Monitor image loading
    const imageRequests: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'image') {
        imageRequests.push(request.url());
      }
    });
    
    // Scroll to trigger thumbnail preloading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight * 0.5);
    });
    
    await page.waitForTimeout(2000);
    
    // Verify thumbnail images were preloaded
    expect(imageRequests.length).toBeGreaterThan(0);
    
    // Go offline
    await context.setOffline(true);
    
    // Scroll to see more thumbnails
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight * 0.8);
    });
    
    // Verify cached thumbnails are still visible
    const visibleThumbnails = await page.locator('[data-testid="post-media-thumbnail"]:visible').count();
    expect(visibleThumbnails).toBeGreaterThan(0);
    
    // Check that images load from cache (no broken images)
    const brokenImages = await page.locator('[data-testid="post-media-thumbnail"][src=""]').count();
    expect(brokenImages).toBe(0);
  });
});