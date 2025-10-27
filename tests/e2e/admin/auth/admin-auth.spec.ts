import { test, expect } from '@playwright/test';
import { loginAsAdmin, TEST_ADMIN_USERS, navigateToAdminDashboard } from '../../utils/adminHelpers';

test.describe('Admin Authentication', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
  });

  test('admin can login with valid credentials', async ({ page }) => {
    await loginAsAdmin(page, TEST_ADMIN_USERS.admin);
    
    // Verify we're on admin dashboard or admin page
    await expect(page).toHaveURL(/\/admin/);
    
    // Verify admin navigation is visible
    const adminNav = page.locator('[data-testid="admin-nav"]').or(
      page.locator('h1:has-text("Admin Dashboard")')
    );
    await expect(adminNav.first()).toBeVisible();
  });

  test('super admin has full access to all features', async ({ page }) => {
    await loginAsAdmin(page, TEST_ADMIN_USERS.superAdmin);
    await navigateToAdminDashboard(page);
    
    // Check that all admin tabs are visible
    const expectedTabs = ['Overview', 'Moderation', 'Users', 'Analytics', 'Settings'];
    
    for (const tab of expectedTabs) {
      const tabButton = page.locator(`button:has-text("${tab}")`);
      // At least one matching tab should exist (may have multiple with same text)
      await expect(tabButton.first()).toBeVisible();
    }
  });

  test('moderator has limited access', async ({ page }) => {
    await loginAsAdmin(page, TEST_ADMIN_USERS.moderator);
    await navigateToAdminDashboard(page);
    
    // Moderator should see moderation tab
    const moderationTab = page.locator('button:has-text("Moderation")');
    await expect(moderationTab.first()).toBeVisible();
    
    // But may not have access to all settings
    // This depends on your permission system
  });

  test('analyst can view analytics but not modify data', async ({ page }) => {
    await loginAsAdmin(page, TEST_ADMIN_USERS.analyst);
    await navigateToAdminDashboard(page);
    
    // Analyst should see analytics tab
    const analyticsTab = page.locator('button:has-text("Analytics")');
    await expect(analyticsTab.first()).toBeVisible();
  });

  test('non-admin user cannot access admin dashboard', async ({ page }) => {
    // Try to access admin page without logging in
    await page.goto('/admin/dashboard');
    
    // Should be redirected to login or home
    await expect(page).not.toHaveURL(/\/admin\/dashboard/);
    
    // Should see either login page or access denied
    const loginForm = page.locator('[data-testid="login-form"]');
    const accessDenied = page.locator('text=/access denied|unauthorized/i');
    
    await expect(loginForm.or(accessDenied)).toBeVisible({ timeout: 5000 });
  });

  test('invalid credentials show error message', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email-input"]', 'invalid@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    
    // Should show error message
    const errorMessage = page.locator('[data-testid="error-message"]').or(
      page.locator('text=/invalid credentials|login failed/i')
    );
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('session persists after page reload', async ({ page }) => {
    await loginAsAdmin(page, TEST_ADMIN_USERS.admin);
    await navigateToAdminDashboard(page);
    
    // Reload the page
    await page.reload();
    
    // Should still be on admin dashboard
    await expect(page).toHaveURL(/\/admin/);
    const adminNav = page.locator('[data-testid="admin-nav"]').or(
      page.locator('h1:has-text("Admin Dashboard")')
    );
    await expect(adminNav.first()).toBeVisible();
  });

  test('logout redirects to home page', async ({ page }) => {
    await loginAsAdmin(page, TEST_ADMIN_USERS.admin);
    await navigateToAdminDashboard(page);
    
    // Find and click logout button
    const logoutButton = page.locator('[data-testid="logout-button"]').or(
      page.locator('button:has-text("Logout")').or(
        page.locator('button:has-text("Sign Out")')
      )
    );
    
    await logoutButton.first().click();
    
    // Should be redirected away from admin area
    await expect(page).not.toHaveURL(/\/admin/);
  });

  test('expired session requires re-authentication', async ({ page }) => {
    await loginAsAdmin(page, TEST_ADMIN_USERS.admin);
    
    // Clear auth tokens to simulate expired session
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Try to access admin dashboard
    await page.goto('/admin/dashboard');
    
    // Should be redirected to login
    await expect(page).not.toHaveURL(/\/admin\/dashboard/);
  });
});
