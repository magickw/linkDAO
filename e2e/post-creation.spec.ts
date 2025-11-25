import { test, expect } from '@playwright/test';

test.describe('Post Creation Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the home page
        await page.goto('http://localhost:3000');

        // Wait for the page to load
        await page.waitForLoadState('networkidle');
    });

    test('should successfully create a quick post', async ({ page }) => {
        // Mock wallet connection (if needed)
        // This assumes the user is already authenticated

        // Find the post creation textarea
        const postTextarea = page.locator('textarea[placeholder*="What\'s on your mind"]').first();
        await expect(postTextarea).toBeVisible();

        // Type content into the textarea
        const testContent = `E2E Test Post - ${Date.now()}`;
        await postTextarea.fill(testContent);

        // Find and click the post button
        const postButton = page.locator('button:has-text("Post")').first();
        await expect(postButton).toBeEnabled();
        await postButton.click();

        // Wait for the post to be created (look for success indicator)
        // This could be a toast notification or the post appearing in the feed
        await page.waitForTimeout(2000); // Give time for the post to be created

        // Verify the post appears in the feed
        const newPost = page.locator(`text=${testContent}`).first();
        await expect(newPost).toBeVisible({ timeout: 10000 });
    });

    test('should show error when creating post without content', async ({ page }) => {
        // Find the post creation textarea
        const postTextarea = page.locator('textarea[placeholder*="What\'s on your mind"]').first();
        await expect(postTextarea).toBeVisible();

        // Leave textarea empty and try to post
        const postButton = page.locator('button:has-text("Post")').first();

        // The button should be disabled when there's no content
        await expect(postButton).toBeDisabled();
    });

    test('should handle network errors gracefully', async ({ page }) => {
        // Intercept the API call and simulate a network error
        await page.route('**/api/quick-posts', route => {
            route.abort('failed');
        });

        // Try to create a post
        const postTextarea = page.locator('textarea[placeholder*="What\'s on your mind"]').first();
        await postTextarea.fill('Test post that will fail');

        const postButton = page.locator('button:has-text("Post")').first();
        await postButton.click();

        // Wait for error message
        const errorMessage = page.locator('text=/error|failed|unavailable/i').first();
        await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });

    test('should fetch CSRF token before creating post', async ({ page }) => {
        let csrfTokenFetched = false;
        let postCreated = false;

        // Monitor network requests
        page.on('request', request => {
            if (request.url().includes('/csrf-token')) {
                csrfTokenFetched = true;
            }
            if (request.url().includes('/api/quick-posts') && request.method() === 'POST') {
                postCreated = true;
            }
        });

        // Create a post
        const postTextarea = page.locator('textarea[placeholder*="What\'s on your mind"]').first();
        await postTextarea.fill('Test post for CSRF verification');

        const postButton = page.locator('button:has-text("Post")').first();
        await postButton.click();

        // Wait for the requests to complete
        await page.waitForTimeout(3000);

        // Verify CSRF token was fetched
        expect(csrfTokenFetched).toBe(true);
    });

    test('should send authorId in post creation request', async ({ page }) => {
        let requestBody: any = null;

        // Intercept the POST request to capture the body
        await page.route('**/api/quick-posts', async route => {
            const request = route.request();
            if (request.method() === 'POST') {
                requestBody = JSON.parse(request.postData() || '{}');
            }
            await route.continue();
        });

        // Create a post
        const postTextarea = page.locator('textarea[placeholder*="What\'s on your mind"]').first();
        await postTextarea.fill('Test post for authorId verification');

        const postButton = page.locator('button:has-text("Post")').first();
        await postButton.click();

        // Wait for the request to complete
        await page.waitForTimeout(3000);

        // Verify the request body contains authorId
        expect(requestBody).not.toBeNull();
        expect(requestBody).toHaveProperty('authorId');
        expect(requestBody.authorId).toBeTruthy();
        expect(requestBody).not.toHaveProperty('author');
    });

    test('should display newly created post in feed', async ({ page }) => {
        const testContent = `E2E Test - Verify Display - ${Date.now()}`;

        // Create a post
        const postTextarea = page.locator('textarea[placeholder*="What\'s on your mind"]').first();
        await postTextarea.fill(testContent);

        const postButton = page.locator('button:has-text("Post")').first();
        await postButton.click();

        // Wait for the post to appear in the feed
        await page.waitForTimeout(2000);

        // Verify the post is visible
        const newPost = page.locator(`text=${testContent}`).first();
        await expect(newPost).toBeVisible({ timeout: 10000 });

        // Verify post has author information
        const postCard = newPost.locator('..').locator('..'); // Navigate up to post card
        await expect(postCard).toBeVisible();
    });

    test('should clear textarea after successful post creation', async ({ page }) => {
        const testContent = 'Test post to verify textarea clearing';

        // Create a post
        const postTextarea = page.locator('textarea[placeholder*="What\'s on your mind"]').first();
        await postTextarea.fill(testContent);

        const postButton = page.locator('button:has-text("Post")').first();
        await postButton.click();

        // Wait for the post to be created
        await page.waitForTimeout(2000);

        // Verify textarea is cleared
        await expect(postTextarea).toHaveValue('');
    });
});

test.describe('Post Creation API Integration', () => {
    test('should handle 400 error when authorId is missing', async ({ page }) => {
        // Intercept and modify the request to remove authorId
        await page.route('**/api/quick-posts', async route => {
            const request = route.request();
            if (request.method() === 'POST') {
                const body = JSON.parse(request.postData() || '{}');
                delete body.authorId;

                await route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: false,
                        error: 'Author ID is required'
                    })
                });
            } else {
                await route.continue();
            }
        });

        // Try to create a post
        const postTextarea = page.locator('textarea[placeholder*="What\'s on your mind"]').first();
        await postTextarea.fill('Test post');

        const postButton = page.locator('button:has-text("Post")').first();
        await postButton.click();

        // Verify error message is displayed
        const errorMessage = page.locator('text=/Author ID is required|error/i').first();
        await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });

    test('should handle 401 unauthorized error', async ({ page }) => {
        // Intercept and return 401
        await page.route('**/api/quick-posts', async route => {
            if (route.request().method() === 'POST') {
                await route.fulfill({
                    status: 401,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: false,
                        error: 'Unauthorized to create quick post'
                    })
                });
            } else {
                await route.continue();
            }
        });

        // Try to create a post
        const postTextarea = page.locator('textarea[placeholder*="What\'s on your mind"]').first();
        await postTextarea.fill('Test post');

        const postButton = page.locator('button:has-text("Post")').first();
        await postButton.click();

        // Verify error message is displayed
        const errorMessage = page.locator('text=/Unauthorized|error/i').first();
        await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });
});
