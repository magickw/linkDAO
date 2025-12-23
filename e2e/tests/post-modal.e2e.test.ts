import { test, expect } from '@playwright/test';

const mockPostResponse = (shareId: string, canonical = `/u/testuser/posts/${shareId}`) => ({
  success: true,
  data: {
    post: {
      id: `post-${shareId}`,
      shareId,
      author: '0x1234567890abcdef',
      authorProfile: { handle: 'testuser', displayName: 'Test User' },
      content: `This is a mocked post for ${shareId}`
    },
    canonicalUrl: canonical
  }
});

test.describe('Post modal URL behavior', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept the short-share fetch used by the app when resolving share IDs
    await page.route('**/p/*', (route) => {
      const url = new URL(route.request().url());
      const parts = url.pathname.split('/');
      const shareId = parts[parts.length - 1];
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPostResponse(shareId))
      });
    });
  });

  test('visiting /p/:shareId updates to canonical url (replaceState) and shows post', async ({ page }) => {
    // Start from app root
    await page.goto('/p/abc123');

    // Expect the post page/modal header to be visible
    await expect(page.locator('h2', { hasText: 'Post' })).toBeVisible();

    // After fetching, page should replace URL with canonical url
    await expect(page).toHaveURL(/\/u\/testuser\/posts\/abc123$/);

    // The post content from the mocked response should be visible
    await expect(page.locator('text=This is a mocked post for abc123')).toBeVisible();
  });

  test('opening modal via ?post= share query opens modal, canonicalizes, and Back closes it', async ({ page }) => {
    await page.goto('/?post=xyz789');

    // The Post modal (header) should become visible
    await expect(page.locator('h2', { hasText: 'Post' })).toBeVisible();

    // The URL should have been replaced with canonical while keeping the modal open
    await expect(page).toHaveURL(/\/u\/testuser\/posts\/xyz789$/);

    // Simulate pressing browser Back (should close the modal)
    await page.goBack();

    // Wait a short moment for any popstate handlers to run
    await page.waitForTimeout(250);

    // Modal header should no longer be visible
    await expect(page.locator('h2', { hasText: 'Post' })).toHaveCount(0);

    // And the URL should be back to the feed root (or at least not canonical post path)
    expect(page.url()).not.toMatch(/\/u\/testuser\/posts\/xyz789$/);
  });
});
