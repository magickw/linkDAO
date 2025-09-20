import { test, expect } from '@playwright/test';

// End-to-end tests for complete user journeys in the enhanced social dashboard
test.describe('Enhanced Social Dashboard User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Web3 wallet connection
    await page.addInitScript(() => {
      (window as any).ethereum = {
        request: async (args: any) => {
          if (args.method === 'eth_requestAccounts') {
            return ['0x1234567890abcdef1234567890abcdef12345678'];
          }
          if (args.method === 'eth_getBalance') {
            return '0x1bc16d674ec80000'; // 2 ETH
          }
          return null;
        },
        on: () => {},
        removeListener: () => {},
        isMetaMask: true,
        selectedAddress: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: '0x1',
      };
    });

    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Wait for initial load
    await page.waitForSelector('[data-testid="dashboard-layout"]');
  });

  test('Complete content creation and interaction journey', async ({ page }) => {
    // Step 1: Create a text post
    await page.click('[data-testid="post-composer-trigger"]');
    await page.fill('[data-testid="post-content-input"]', 'This is my first enhanced post! #web3 #social @testuser');
    await page.click('[data-testid="submit-post-button"]');
    
    // Wait for post to be created
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('text=Post created successfully')).toBeVisible();

    // Step 2: Verify post appears in feed
    await expect(page.locator('[data-testid^="post-card-"]').first()).toContainText('This is my first enhanced post!');
    
    // Step 3: React to the post with token reaction
    const postCard = page.locator('[data-testid^="post-card-"]').first();
    await postCard.locator('[data-testid="reaction-button-🔥"]').click();
    
    // Confirm reaction in modal
    await expect(page.locator('[data-testid="reaction-stake-modal"]')).toBeVisible();
    await page.click('[data-testid="confirm-reaction-button"]');
    
    // Wait for reaction to complete
    await expect(page.locator('[data-testid="reaction-success"]')).toBeVisible();
    
    // Step 4: Verify reaction count updated
    await expect(postCard.locator('[data-testid="reaction-count-🔥"]')).toContainText('1');

    // Step 5: View reaction details
    await postCard.locator('[data-testid="reaction-count-🔥"]').click();
    await expect(page.locator('[data-testid="reactor-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="reactor-list"]')).toContainText('0x1234...5678');
    
    // Close modal
    await page.click('[data-testid="close-modal-button"]');
  });

  test('Media upload and preview journey', async ({ page }) => {
    // Step 1: Open post composer
    await page.click('[data-testid="post-composer-trigger"]');
    
    // Step 2: Switch to media tab
    await page.click('[data-testid="content-type-tab-media"]');
    
    // Step 3: Upload image
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles({
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    });
    
    // Step 4: Wait for upload progress
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="media-preview"]')).toBeVisible();
    
    // Step 5: Add caption
    await page.fill('[data-testid="media-caption-input"]', 'Beautiful sunset photo! 🌅');
    
    // Step 6: Submit post
    await page.click('[data-testid="submit-post-button"]');
    
    // Step 7: Verify media post in feed
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    const mediaPost = page.locator('[data-testid^="post-card-"]').first();
    await expect(mediaPost.locator('[data-testid="media-preview"]')).toBeVisible();
    await expect(mediaPost).toContainText('Beautiful sunset photo! 🌅');
  });

  test('Poll creation and voting journey', async ({ page }) => {
    // Step 1: Create poll
    await page.click('[data-testid="post-composer-trigger"]');
    await page.click('[data-testid="content-type-tab-poll"]');
    
    // Step 2: Fill poll details
    await page.fill('[data-testid="poll-question-input"]', 'What is the best Web3 social feature?');
    await page.fill('[data-testid="poll-option-0"]', 'Token reactions');
    await page.fill('[data-testid="poll-option-1"]', 'NFT integration');
    
    // Add third option
    await page.click('[data-testid="add-poll-option"]');
    await page.fill('[data-testid="poll-option-2"]', 'Governance voting');
    
    // Enable token weighting
    await page.check('[data-testid="token-weighting-checkbox"]');
    
    // Step 3: Submit poll
    await page.click('[data-testid="submit-post-button"]');
    
    // Step 4: Verify poll in feed
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    const pollPost = page.locator('[data-testid^="post-card-"]').first();
    await expect(pollPost).toContainText('What is the best Web3 social feature?');
    await expect(pollPost.locator('[data-testid="poll-option"]')).toHaveCount(3);
    
    // Step 5: Vote on poll
    await pollPost.locator('[data-testid="poll-option-0"]').click();
    await expect(page.locator('[data-testid="vote-confirmation-modal"]')).toBeVisible();
    await page.click('[data-testid="confirm-vote-button"]');
    
    // Step 6: Verify vote recorded
    await expect(pollPost.locator('[data-testid="poll-results"]')).toBeVisible();
    await expect(pollPost.locator('[data-testid="user-vote-indicator"]')).toBeVisible();
  });

  test('Navigation and filtering journey', async ({ page }) => {
    // Step 1: Use quick filters
    await page.click('[data-testid="quick-filter-my-posts"]');
    await expect(page.locator('[data-testid="feed-title"]')).toContainText('My Posts');
    
    // Step 2: Switch to tipped posts
    await page.click('[data-testid="quick-filter-tipped-posts"]');
    await expect(page.locator('[data-testid="feed-title"]')).toContainText('Tipped Posts');
    
    // Step 3: Navigate to community
    await page.click('[data-testid="community-link-web3-builders"]');
    await expect(page.locator('[data-testid="community-header"]')).toContainText('Web3 Builders');
    
    // Step 4: Use feed sorting
    await page.click('[data-testid="feed-sort-hot"]');
    await expect(page.locator('[data-testid="feed-sort-active"]')).toContainText('Hot');
    
    // Step 5: Switch to trending
    await page.click('[data-testid="feed-sort-trending"]');
    await expect(page.locator('[data-testid="trending-indicator"]').first()).toBeVisible();
  });

  test('Wallet integration journey', async ({ page }) => {
    // Step 1: Check wallet dashboard
    const walletDashboard = page.locator('[data-testid="wallet-dashboard"]');
    await expect(walletDashboard).toBeVisible();
    await expect(walletDashboard).toContainText('2.00 ETH');
    
    // Step 2: View transaction history
    await page.click('[data-testid="transaction-mini-feed"]');
    await expect(page.locator('[data-testid="transaction-item"]').first()).toBeVisible();
    
    // Step 3: Open portfolio modal
    await page.click('[data-testid="portfolio-modal-trigger"]');
    await expect(page.locator('[data-testid="portfolio-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="portfolio-chart"]')).toBeVisible();
    
    // Step 4: Use quick send
    await page.click('[data-testid="quick-send-button"]');
    await expect(page.locator('[data-testid="send-modal"]')).toBeVisible();
    await page.fill('[data-testid="send-address-input"]', '0xabcdef1234567890abcdef1234567890abcdef12');
    await page.fill('[data-testid="send-amount-input"]', '0.1');
    
    // Cancel send for test
    await page.click('[data-testid="cancel-send-button"]');
  });

  test('Real-time notifications journey', async ({ page }) => {
    // Step 1: Check notification indicator
    await expect(page.locator('[data-testid="notification-indicator"]')).toBeVisible();
    
    // Step 2: Open notifications panel
    await page.click('[data-testid="notifications-trigger"]');
    await expect(page.locator('[data-testid="notifications-panel"]')).toBeVisible();
    
    // Step 3: Filter notifications by type
    await page.click('[data-testid="notification-filter-mentions"]');
    await expect(page.locator('[data-testid="notification-item-mention"]').first()).toBeVisible();
    
    // Step 4: Mark notification as read
    await page.click('[data-testid="notification-item"]').first();
    await expect(page.locator('[data-testid="notification-item"]').first()).toHaveClass(/read/);
    
    // Step 5: Clear all notifications
    await page.click('[data-testid="clear-all-notifications"]');
    await expect(page.locator('[data-testid="no-notifications"]')).toBeVisible();
  });

  test('Search and discovery journey', async ({ page }) => {
    // Step 1: Use global search
    await page.fill('[data-testid="global-search-input"]', 'web3');
    await page.press('[data-testid="global-search-input"]', 'Enter');
    
    // Step 2: View search results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-result-post"]').first()).toBeVisible();
    
    // Step 3: Filter by content type
    await page.click('[data-testid="search-filter-users"]');
    await expect(page.locator('[data-testid="search-result-user"]').first()).toBeVisible();
    
    // Step 4: Follow user from search
    await page.click('[data-testid="follow-user-button"]').first();
    await expect(page.locator('[data-testid="follow-success"]')).toBeVisible();
    
    // Step 5: Discover trending hashtags
    await page.click('[data-testid="trending-hashtags-widget"]');
    await expect(page.locator('[data-testid="hashtag-item"]').first()).toBeVisible();
    
    // Step 6: Click trending hashtag
    await page.click('[data-testid="hashtag-item"]').first();
    await expect(page.locator('[data-testid="hashtag-feed"]')).toBeVisible();
  });

  test('Reputation and badges journey', async ({ page }) => {
    // Step 1: View user profile
    await page.click('[data-testid="user-profile-card"]');
    await expect(page.locator('[data-testid="user-profile-modal"]')).toBeVisible();
    
    // Step 2: Check reputation score
    await expect(page.locator('[data-testid="reputation-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="reputation-level"]')).toContainText('Level');
    
    // Step 3: View badges
    const badgeCollection = page.locator('[data-testid="badge-collection"]');
    await expect(badgeCollection).toBeVisible();
    await expect(badgeCollection.locator('[data-testid="badge-item"]').first()).toBeVisible();
    
    // Step 4: Hover over badge for tooltip
    await page.hover('[data-testid="badge-item"]').first();
    await expect(page.locator('[data-testid="badge-tooltip"]')).toBeVisible();
    
    // Step 5: View reputation breakdown
    await page.click('[data-testid="reputation-breakdown-button"]');
    await expect(page.locator('[data-testid="reputation-breakdown"]')).toBeVisible();
    await expect(page.locator('[data-testid="reputation-category"]')).toHaveCount(5);
  });

  test('Performance optimization journey', async ({ page }) => {
    // Step 1: Test virtual scrolling with large feed
    await page.goto('/dashboard?feed=large');
    
    // Step 2: Scroll through large dataset
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(100);
    }
    
    // Step 3: Verify smooth scrolling performance
    const performanceMetrics = await page.evaluate(() => {
      return {
        scrollTop: document.documentElement.scrollTop,
        renderedItems: document.querySelectorAll('[data-testid^="post-card-"]').length,
      };
    });
    
    expect(performanceMetrics.scrollTop).toBeGreaterThan(0);
    expect(performanceMetrics.renderedItems).toBeLessThan(50); // Virtual scrolling should limit rendered items
    
    // Step 4: Test image lazy loading
    await page.goto('/dashboard?media=true');
    const images = page.locator('[data-testid="lazy-image"]');
    await expect(images.first()).toHaveAttribute('loading', 'lazy');
    
    // Step 5: Test offline functionality
    await page.context().setOffline(true);
    await page.reload();
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Try to create post offline
    await page.click('[data-testid="post-composer-trigger"]');
    await page.fill('[data-testid="post-content-input"]', 'Offline post');
    await page.click('[data-testid="submit-post-button"]');
    
    // Should queue for later
    await expect(page.locator('[data-testid="offline-queue-indicator"]')).toBeVisible();
    
    // Go back online
    await page.context().setOffline(false);
    await page.waitForTimeout(1000);
    
    // Should sync queued actions
    await expect(page.locator('[data-testid="sync-success"]')).toBeVisible();
  });

  test('Accessibility compliance journey', async ({ page }) => {
    // Step 1: Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Navigate through interface with keyboard
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    }
    
    // Step 2: Test screen reader compatibility
    const postCard = page.locator('[data-testid^="post-card-"]').first();
    await expect(postCard).toHaveAttribute('role', 'article');
    await expect(postCard).toHaveAttribute('aria-label');
    
    // Step 3: Test high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('[data-testid="dashboard-layout"]')).toHaveClass(/dark-theme/);
    
    // Step 4: Test reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const animatedElement = page.locator('[data-testid="animated-element"]').first();
    await expect(animatedElement).toHaveClass(/reduced-motion/);
    
    // Step 5: Test focus management in modals
    await page.click('[data-testid="post-composer-trigger"]');
    const modal = page.locator('[data-testid="post-composer-modal"]');
    await expect(modal).toBeVisible();
    
    // Focus should be trapped in modal
    await page.keyboard.press('Tab');
    const focusedInModal = page.locator('[data-testid="post-composer-modal"] :focus');
    await expect(focusedInModal).toBeVisible();
  });

  test('Error handling and recovery journey', async ({ page }) => {
    // Step 1: Test network error handling
    await page.route('**/api/posts', route => route.abort());
    
    await page.click('[data-testid="post-composer-trigger"]');
    await page.fill('[data-testid="post-content-input"]', 'Test post');
    await page.click('[data-testid="submit-post-button"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Step 2: Test retry mechanism
    await page.unroute('**/api/posts');
    await page.click('[data-testid="retry-button"]');
    
    // Should succeed on retry
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Step 3: Test validation errors
    await page.click('[data-testid="post-composer-trigger"]');
    await page.fill('[data-testid="post-content-input"]', ''); // Empty content
    await page.click('[data-testid="submit-post-button"]');
    
    // Should show validation error
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    
    // Step 4: Test graceful degradation
    await page.addInitScript(() => {
      // Disable Web3 wallet
      delete (window as any).ethereum;
    });
    
    await page.reload();
    
    // Should show fallback UI
    await expect(page.locator('[data-testid="wallet-connect-prompt"]')).toBeVisible();
    await expect(page.locator('[data-testid="limited-functionality-notice"]')).toBeVisible();
  });
});