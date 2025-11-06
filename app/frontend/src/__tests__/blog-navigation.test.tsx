import { test, expect } from '@playwright/test';

test('blog navigation works correctly', async ({ page }) => {
  // Navigate to the home page
  await page.goto('http://localhost:3000');
  
  // Check if the Blog link is in the header navigation
  const blogLink = page.locator('header nav a:has-text("Blog")');
  await expect(blogLink).toBeVisible();
  
  // Click on the Blog link
  await blogLink.click();
  
  // Verify we're on the blog index page
  await expect(page).toHaveURL('http://localhost:3000/blog');
  await expect(page.locator('h1:has-text("LinkDAO Blog")')).toBeVisible();
  
  // Check if blog posts are displayed
  const blogPosts = page.locator('article');
  const postCount = await blogPosts.count();
  expect(postCount).toBeGreaterThan(0);
  
  // Click on the first blog post
  const firstPost = blogPosts.first();
  const postTitle = await firstPost.locator('h3 a').textContent();
  await firstPost.locator('h3 a').click();
  
  // Verify we're on the blog post page
  await expect(page).not.toHaveURL('http://localhost:3000/blog');
  await expect(page.locator('h1')).toContainText(postTitle || '');
  
  // Check if breadcrumb navigation works
  const blogBreadcrumb = page.locator('nav a:has-text("Blog")');
  await expect(blogBreadcrumb).toBeVisible();
  
  // Click on the blog breadcrumb to go back to the blog index
  await blogBreadcrumb.click();
  await expect(page).toHaveURL('http://localhost:3000/blog');
});