import { Page, expect } from '@playwright/test';

export interface AdminUser {
  email: string;
  password: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'analyst';
}

export const TEST_ADMIN_USERS = {
  superAdmin: {
    email: 'superadmin@linkdao.test',
    password: 'SuperAdmin123!',
    role: 'super_admin' as const,
  },
  admin: {
    email: 'admin@linkdao.test',
    password: 'Admin123!',
    role: 'admin' as const,
  },
  moderator: {
    email: 'moderator@linkdao.test',
    password: 'Moderator123!',
    role: 'moderator' as const,
  },
  analyst: {
    email: 'analyst@linkdao.test',
    password: 'Analyst123!',
    role: 'analyst' as const,
  },
};

/**
 * Login as admin user
 */
export async function loginAsAdmin(page: Page, user: AdminUser = TEST_ADMIN_USERS.admin) {
  await page.goto('/login');
  
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.click('[data-testid="login-button"]');
  
  // Wait for redirect to admin dashboard or home
  await page.waitForURL(/\/(admin\/dashboard|admin|home)/, { timeout: 10000 });
  
  // Verify admin navigation is visible
  const adminNav = page.locator('[data-testid="admin-nav"]').or(page.locator('text=Admin Dashboard'));
  await expect(adminNav.first()).toBeVisible({ timeout: 5000 });
}

/**
 * Navigate to admin dashboard
 */
export async function navigateToAdminDashboard(page: Page) {
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/admin/);
}

/**
 * Wait for dashboard to load
 */
export async function waitForDashboardLoad(page: Page) {
  await page.waitForSelector('[data-testid="stats-grid"]', { timeout: 10000 });
  
  // Wait for loading states to complete
  await page.waitForFunction(() => {
    const loadingSpinners = document.querySelectorAll('.animate-pulse, [data-loading="true"]');
    return loadingSpinners.length === 0;
  }, { timeout: 15000 });
}

/**
 * Switch to a specific admin tab
 */
export async function switchToTab(page: Page, tabName: string) {
  const tabButton = page.locator(`button:has-text("${tabName}")`).first();
  await tabButton.click();
  await page.waitForTimeout(500); // Wait for tab content to render
}

/**
 * Verify toast notification appears
 */
export async function expectToast(page: Page, message: string, type: 'success' | 'error' | 'warning' = 'success') {
  const toast = page.locator(`[data-testid="${type}-toast"]`).or(
    page.locator('.toast').filter({ hasText: message })
  );
  await expect(toast.first()).toBeVisible({ timeout: 5000 });
}

/**
 * Wait for API request to complete
 */
export async function waitForApiRequest(page: Page, urlPattern: string | RegExp) {
  return await page.waitForResponse(
    response => {
      const url = response.url();
      const matches = typeof urlPattern === 'string' 
        ? url.includes(urlPattern)
        : urlPattern.test(url);
      return matches && response.status() === 200;
    },
    { timeout: 10000 }
  );
}

/**
 * Setup test data for admin tests
 */
export async function setupTestData(page: Page) {
  // This can be expanded to seed test database with specific data
  // For now, just verify we can access the API
  const response = await page.request.get('/api/admin/health');
  expect(response.ok()).toBeTruthy();
}

/**
 * Cleanup test data after tests
 */
export async function cleanupTestData(page: Page) {
  // Cleanup logic if needed
  // For now, just a placeholder
}

/**
 * Take screenshot on failure
 */
export async function captureScreenshotOnFailure(page: Page, testName: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ 
    path: `test-results/screenshots/${testName}-${timestamp}.png`,
    fullPage: true 
  });
}

/**
 * Get WebSocket connection status
 */
export async function getWebSocketStatus(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return (window as any).adminWebSocketConnected || false;
  });
}

/**
 * Wait for real-time update
 */
export async function waitForRealtimeUpdate(page: Page, timeout: number = 10000) {
  await page.waitForFunction(
    () => {
      const updateIndicator = document.querySelector('[data-realtime-update="true"]');
      return updateIndicator !== null;
    },
    { timeout }
  );
}
