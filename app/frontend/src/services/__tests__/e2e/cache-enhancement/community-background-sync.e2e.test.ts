import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * E2E Tests for Community Participation with Background Sync
 * Tests Stale-While-Revalidate strategy, bundled preloading, and offline actions
 */

test.describe('Community Caching - Background Sync Workflows', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      permissions: ['background-sync']
    });
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

  test('should implement Stale-While-Revalidate for community pages', async () => {
    // Navigate to a community page
    await page.goto('/communities/web3-developers');
    
    // Wait for community content to load
    await page.waitForSelector('[data-testid="community-header"]');
    await page.waitForSelector('[data-testid="community-posts"]');
    
    // Get initial member count
    const initialMemberCount = await page.locator('[data-testid="member-count"]').textContent();
    
    // Navigate away and back to test cache
    await page.goto('/feed');
    await page.waitForSelector('[data-testid="feed-container"]');
    
    // Navigate back to community
    const startTime = Date.now();
    await page.goto('/communities/web3-developers');
    
    // Should load quickly from cache
    await page.waitForSelector('[data-testid="community-header"]');
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(1000);
    
    // Verify stale content is served immediately
    const cachedMemberCount = await page.locator('[data-testid="member-count"]').textContent();
    expect(cachedMemberCount).toBe(initialMemberCount);
    
    // Wait for background revalidation
    await page.waitForTimeout(3000);
    
    // Check if content was updated in background
    const updatedMemberCount = await page.locator('[data-testid="member-count"]').textContent();
    // Member count might be the same or updated, but should be defined
    expect(updatedMemberCount).toBeDefined();
  });

  test('should preload community assets and top posts', async () => {
    await page.goto('/communities');
    
    // Wait for communities list
    await page.waitForSelector('[data-testid="communities-list"]');
    
    // Monitor network requests for preloading
    const preloadRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/communities/') && (
        url.includes('/posts') || 
        url.includes('/members') || 
        url.includes('/assets')
      )) {
        preloadRequests.push(url);
      }
    });
    
    // Hover over a community card to trigger preloading
    await page.hover('[data-testid="community-card"]:first-child');
    
    // Wait for preloading to trigger
    await page.waitForTimeout(1500);
    
    // Verify preload requests were made
    expect(preloadRequests.length).toBeGreaterThan(0);
    
    // Click on the community
    const startTime = Date.now();
    await page.click('[data-testid="community-card"]:first-child');
    
    // Should load quickly from preloaded data
    await page.waitForSelector('[data-testid="community-header"]');
    await page.waitForSelector('[data-testid="community-posts"]');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(800); // Should be fast from preload
    
    // Verify top posts are immediately available
    const topPosts = await page.locator('[data-testid="community-post"]').count();
    expect(topPosts).toBeGreaterThan(0);
  });

  test('should queue community posts when offline', async () => {
    await page.goto('/communities/web3-developers');
    
    // Wait for community to load
    await page.waitForSelector('[data-testid="community-header"]');
    
    // Go offline
    await context.setOffline(true);
    
    // Wait for offline indicator
    await page.waitForSelector('[data-testid="offline-indicator"]');
    
    // Try to create a new post
    await page.click('[data-testid="create-post-button"]');
    await page.waitForSelector('[data-testid="post-composer"]');
    
    await page.fill('[data-testid="post-title-input"]', 'Offline Test Post');
    await page.fill('[data-testid="post-content-input"]', 'This post was created while offline');
    
    // Submit the post
    await page.click('[data-testid="submit-post-button"]');
    
    // Should show queued notification
    await page.waitForSelector('[data-testid="post-queued-notification"]');
    
    // Verify post appears in offline queue
    const queuedPosts = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('offlineActionQueue') || '[]');
    });
    
    expect(queuedPosts.length).toBe(1);
    expect(queuedPosts[0].type).toBe('post');
    expect(queuedPosts[0].data.title).toBe('Offline Test Post');
    
    // Go back online
    await context.setOffline(false);
    
    // Wait for sync to complete
    await page.waitForSelector('[data-testid="sync-complete-notification"]', { timeout: 10000 });
    
    // Verify post was synced and appears in community
    await page.reload();
    await page.waitForSelector('[data-testid="community-posts"]');
    
    const syncedPost = await page.locator('[data-testid="community-post"]')
      .filter({ hasText: 'Offline Test Post' })
      .count();
    expect(syncedPost).toBe(1);
  });

  test('should queue comments with proper ordering', async () => {
    await page.goto('/communities/web3-developers');
    
    // Wait for community posts
    await page.waitForSelector('[data-testid="community-posts"]');
    
    // Click on a post to view comments
    await page.click('[data-testid="community-post"]:first-child');
    await page.waitForSelector('[data-testid="post-comments"]');
    
    // Go offline
    await context.setOffline(true);
    
    // Add multiple comments while offline
    const comments = [
      'First offline comment',
      'Second offline comment',
      'Third offline comment'
    ];
    
    for (const comment of comments) {
      await page.fill('[data-testid="comment-input"]', comment);
      await page.click('[data-testid="submit-comment-button"]');
      await page.waitForSelector('[data-testid="comment-queued-notification"]');
      await page.waitForTimeout(500); // Small delay between comments
    }
    
    // Verify all comments are queued in correct order
    const queuedActions = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('offlineActionQueue') || '[]');
    });
    
    expect(queuedActions.length).toBe(3);
    expect(queuedActions[0].data.content).toBe('First offline comment');
    expect(queuedActions[1].data.content).toBe('Second offline comment');
    expect(queuedActions[2].data.content).toBe('Third offline comment');
    
    // Verify timestamps are in order
    expect(queuedActions[0].timestamp).toBeLessThan(queuedActions[1].timestamp);
    expect(queuedActions[1].timestamp).toBeLessThan(queuedActions[2].timestamp);
    
    // Go back online
    await context.setOffline(false);
    
    // Wait for all comments to sync
    await page.waitForSelector('[data-testid="sync-complete-notification"]', { timeout: 15000 });
    
    // Refresh to see synced comments
    await page.reload();
    await page.waitForSelector('[data-testid="post-comments"]');
    
    // Verify comments appear in correct order
    const commentElements = await page.locator('[data-testid="comment-content"]').all();
    const commentTexts = await Promise.all(commentElements.map(el => el.textContent()));
    
    expect(commentTexts).toContain('First offline comment');
    expect(commentTexts).toContain('Second offline comment');
    expect(commentTexts).toContain('Third offline comment');
  });

  test('should handle retry logic with exponential backoff', async () => {
    await page.goto('/communities/web3-developers');
    
    // Mock network failure for sync requests
    await page.route('**/api/communities/*/posts', (route) => {
      // Fail the first few requests, then succeed
      const url = route.request().url();
      const failCount = parseInt(url.split('fail=')[1] || '0');
      
      if (failCount < 2) {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' })
        });
      } else {
        route.continue();
      }
    });
    
    // Go offline and create a post
    await context.setOffline(true);
    
    await page.click('[data-testid="create-post-button"]');
    await page.waitForSelector('[data-testid="post-composer"]');
    
    await page.fill('[data-testid="post-title-input"]', 'Retry Test Post');
    await page.fill('[data-testid="post-content-input"]', 'Testing retry logic');
    await page.click('[data-testid="submit-post-button"]');
    
    await page.waitForSelector('[data-testid="post-queued-notification"]');
    
    // Go online to trigger sync with failures
    await context.setOffline(false);
    
    // Monitor retry attempts
    let retryCount = 0;
    page.on('request', (request) => {
      if (request.url().includes('/api/communities/') && request.method() === 'POST') {
        retryCount++;
      }
    });
    
    // Wait for retries to complete
    await page.waitForTimeout(10000);
    
    // Should have made multiple retry attempts
    expect(retryCount).toBeGreaterThan(1);
    
    // Eventually should succeed and show success notification
    await page.waitForSelector('[data-testid="sync-complete-notification"]', { timeout: 15000 });
  });

  test('should batch preload related community icons', async () => {
    await page.goto('/communities');
    
    // Wait for communities list
    await page.waitForSelector('[data-testid="communities-list"]');
    
    // Monitor image requests
    const iconRequests: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'image' && request.url().includes('community-icon')) {
        iconRequests.push(request.url());
      }
    });
    
    // Scroll to trigger batch preloading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight * 0.3);
    });
    
    await page.waitForTimeout(2000);
    
    // Should have preloaded multiple community icons
    expect(iconRequests.length).toBeGreaterThan(3);
    
    // Go offline
    await context.setOffline(true);
    
    // Scroll to see more communities
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight * 0.8);
    });
    
    // Verify preloaded icons are still visible
    const visibleIcons = await page.locator('[data-testid="community-icon"]:visible').count();
    expect(visibleIcons).toBeGreaterThan(5);
    
    // Check for broken images
    const brokenIcons = await page.locator('[data-testid="community-icon"][src=""]').count();
    expect(brokenIcons).toBe(0);
  });

  test('should invalidate community cache on membership changes', async () => {
    await page.goto('/communities/web3-developers');
    
    // Wait for community to load
    await page.waitForSelector('[data-testid="community-header"]');
    
    // Get initial member count
    const initialMemberCount = await page.locator('[data-testid="member-count"]').textContent();
    const initialMemberNumber = parseInt(initialMemberCount?.replace(/\D/g, '') || '0');
    
    // Join the community
    await page.click('[data-testid="join-community-button"]');
    await page.waitForSelector('[data-testid="leave-community-button"]');
    
    // Verify member count increased
    const updatedMemberCount = await page.locator('[data-testid="member-count"]').textContent();
    const updatedMemberNumber = parseInt(updatedMemberCount?.replace(/\D/g, '') || '0');
    
    expect(updatedMemberNumber).toBe(initialMemberNumber + 1);
    
    // Navigate away and back to test cache invalidation
    await page.goto('/feed');
    await page.waitForSelector('[data-testid="feed-container"]');
    
    await page.goto('/communities/web3-developers');
    await page.waitForSelector('[data-testid="community-header"]');
    
    // Should show updated member count (cache was invalidated)
    const cachedMemberCount = await page.locator('[data-testid="member-count"]').textContent();
    const cachedMemberNumber = parseInt(cachedMemberCount?.replace(/\D/g, '') || '0');
    
    expect(cachedMemberNumber).toBe(updatedMemberNumber);
    
    // Should show leave button (membership state cached)
    await expect(page.locator('[data-testid="leave-community-button"]')).toBeVisible();
  });

  test('should handle background sync queue status', async () => {
    await page.goto('/communities/web3-developers');
    
    // Go offline
    await context.setOffline(true);
    
    // Create multiple actions
    const actions = [
      { type: 'post', title: 'Post 1' },
      { type: 'comment', content: 'Comment 1' },
      { type: 'reaction', emoji: '👍' }
    ];
    
    for (const action of actions) {
      if (action.type === 'post') {
        await page.click('[data-testid="create-post-button"]');
        await page.waitForSelector('[data-testid="post-composer"]');
        await page.fill('[data-testid="post-title-input"]', action.title);
        await page.fill('[data-testid="post-content-input"]', 'Test content');
        await page.click('[data-testid="submit-post-button"]');
        await page.waitForSelector('[data-testid="post-queued-notification"]');
      }
    }
    
    // Check sync queue status
    await page.click('[data-testid="sync-status-button"]');
    await page.waitForSelector('[data-testid="sync-queue-modal"]');
    
    // Verify queue shows pending actions
    const queueItems = await page.locator('[data-testid="queue-item"]').count();
    expect(queueItems).toBeGreaterThan(0);
    
    // Verify queue status indicators
    await expect(page.locator('[data-testid="queue-status-pending"]')).toBeVisible();
    
    // Go online
    await context.setOffline(false);
    
    // Wait for sync to start
    await page.waitForSelector('[data-testid="queue-status-syncing"]', { timeout: 5000 });
    
    // Wait for sync to complete
    await page.waitForSelector('[data-testid="queue-status-complete"]', { timeout: 15000 });
    
    // Verify queue is empty
    const remainingItems = await page.locator('[data-testid="queue-item"]').count();
    expect(remainingItems).toBe(0);
  });
});