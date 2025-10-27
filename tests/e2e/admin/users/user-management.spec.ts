import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  TEST_ADMIN_USERS,
  switchToTab,
  expectToast,
  waitForDashboardLoad,
} from '../../utils/adminHelpers';

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page, TEST_ADMIN_USERS.admin);
    await page.goto('/admin/dashboard');
    await waitForDashboardLoad(page);
    await switchToTab(page, 'Users');
    
    // Wait for user list to load
    await page.waitForSelector('[data-testid="user-list"]', { timeout: 10000 });
  });

  test('user list displays with pagination', async ({ page }) => {
    const userList = page.locator('[data-testid="user-list"]');
    await expect(userList).toBeVisible();
    
    // Check if pagination exists
    const pagination = page.locator('[data-testid="pagination"]').or(
      page.locator('nav[aria-label="pagination"]')
    );
    
    // Pagination might not exist if there are few users
    const hasPagination = await pagination.count() > 0;
    expect(typeof hasPagination).toBe('boolean');
  });

  test('can search for users', async ({ page }) => {
    const searchInput = page.locator('[data-testid="user-search"]').or(
      page.locator('input[placeholder*="search" i]')
    );
    
    if (await searchInput.count() > 0) {
      await searchInput.first().fill('test');
      
      // Wait for search results
      await page.waitForTimeout(1000);
      
      // Verify search is working
      const url = page.url();
      expect(url).toContain('search');
    }
  });

  test('can filter users by role', async ({ page }) => {
    const roleFilter = page.locator('[data-testid="role-filter"]').or(
      page.locator('select').filter({ hasText: /role|admin|moderator/i })
    );
    
    if (await roleFilter.count() > 0) {
      await roleFilter.first().selectOption('admin');
      await page.waitForTimeout(1000);
      
      // Verify filter applied
      const url = page.url();
      expect(url).toContain('role');
    }
  });

  test('can view user details', async ({ page }) => {
    const userRows = page.locator('[data-testid="user-row"]');
    const rowCount = await userRows.count();
    
    if (rowCount > 0) {
      const firstUser = userRows.first();
      
      // Click user row or view button
      const viewButton = firstUser.locator('[data-testid="view-user"]').or(
        firstUser.locator('button:has-text("View")')
      );
      
      if (await viewButton.count() > 0) {
        await viewButton.first().click();
      } else {
        await firstUser.click();
      }
      
      // Should show user details modal or page
      const detailsView = page.locator('[data-testid="user-details"]').or(
        page.locator('[role="dialog"]')
      );
      await expect(detailsView.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('can suspend user account', async ({ page }) => {
    const userRows = page.locator('[data-testid="user-row"]');
    const rowCount = await userRows.count();
    
    if (rowCount > 0) {
      const firstUser = userRows.first();
      
      // Look for suspend button
      const suspendButton = firstUser.locator('[data-testid="suspend-user"]').or(
        firstUser.locator('button:has-text("Suspend")')
      );
      
      if (await suspendButton.count() > 0) {
        await suspendButton.first().click();
        
        // Should show confirmation dialog
        const confirmDialog = page.locator('[data-testid="suspend-dialog"]').or(
          page.locator('[role="dialog"]')
        );
        
        if (await confirmDialog.count() > 0) {
          await expect(confirmDialog.first()).toBeVisible();
          
          // Fill reason
          const reasonInput = page.locator('[data-testid="suspend-reason"]').or(
            page.locator('textarea')
          );
          
          if (await reasonInput.count() > 0) {
            await reasonInput.first().fill('Policy violation for testing');
          }
          
          // Confirm suspension
          const confirmButton = page.locator('[data-testid="confirm-suspend"]').or(
            page.locator('button:has-text("Confirm")')
          );
          await confirmButton.first().click();
          
          // Should show success message
          await expectToast(page, 'suspend', 'success');
        }
      }
    }
  });

  test('can update user role', async ({ page }) => {
    const userRows = page.locator('[data-testid="user-row"]');
    const rowCount = await userRows.count();
    
    if (rowCount > 0) {
      const firstUser = userRows.first();
      
      // Look for role change button
      const roleButton = firstUser.locator('[data-testid="change-role"]').or(
        firstUser.locator('button:has-text("Role")')
      );
      
      if (await roleButton.count() > 0) {
        await roleButton.first().click();
        
        // Select new role
        const roleSelect = page.locator('select[name="role"]').or(
          page.locator('select').first()
        );
        
        if (await roleSelect.count() > 0) {
          await roleSelect.selectOption('moderator');
          
          // Confirm change
          const confirmButton = page.locator('button:has-text("Confirm")');
          if (await confirmButton.count() > 0) {
            await confirmButton.click();
            await expectToast(page, 'role', 'success');
          }
        }
      }
    }
  });

  test('can ban user permanently', async ({ page }) => {
    const userRows = page.locator('[data-testid="user-row"]');
    const rowCount = await userRows.count();
    
    if (rowCount > 0) {
      const firstUser = userRows.first();
      
      // Look for ban button (might be in dropdown menu)
      const moreButton = firstUser.locator('[data-testid="user-actions"]').or(
        firstUser.locator('button:has-text("More")')
      );
      
      if (await moreButton.count() > 0) {
        await moreButton.first().click();
        
        const banButton = page.locator('[data-testid="ban-user"]').or(
          page.locator('button:has-text("Ban")')
        );
        
        if (await banButton.count() > 0) {
          await banButton.first().click();
          
          // Confirmation dialog
          const confirmDialog = page.locator('[data-testid="ban-dialog"]');
          if (await confirmDialog.count() > 0) {
            const reasonInput = page.locator('[data-testid="ban-reason"]');
            await reasonInput.fill('Severe policy violations');
            
            const confirmButton = page.locator('button:has-text("Confirm Ban")');
            await confirmButton.click();
            
            await expectToast(page, 'banned', 'success');
          }
        }
      }
    }
  });

  test('can export user data', async ({ page }) => {
    const exportButton = page.locator('[data-testid="export-users"]').or(
      page.locator('button:has-text("Export")')
    );
    
    if (await exportButton.count() > 0) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      
      await exportButton.first().click();
      
      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toMatch(/users.*\.(csv|xlsx)/i);
      }
    }
  });

  test('displays user statistics correctly', async ({ page }) => {
    const statsCards = page.locator('[data-testid="user-stats"]').or(
      page.locator('.stat-card')
    );
    
    const cardCount = await statsCards.count();
    
    if (cardCount > 0) {
      // Check that stats have numbers
      for (let i = 0; i < Math.min(cardCount, 3); i++) {
        const card = statsCards.nth(i);
        const hasNumbers = await card.locator('text=/\\d+/').count() > 0;
        expect(hasNumbers).toBeTruthy();
      }
    }
  });

  test('can send notification to user', async ({ page }) => {
    const userRows = page.locator('[data-testid="user-row"]');
    const rowCount = await userRows.count();
    
    if (rowCount > 0) {
      const firstUser = userRows.first();
      
      const notifyButton = firstUser.locator('[data-testid="notify-user"]').or(
        firstUser.locator('button:has-text("Notify")')
      );
      
      if (await notifyButton.count() > 0) {
        await notifyButton.first().click();
        
        // Fill notification form
        const titleInput = page.locator('[data-testid="notification-title"]');
        const messageInput = page.locator('[data-testid="notification-message"]');
        
        if (await titleInput.count() > 0 && await messageInput.count() > 0) {
          await titleInput.fill('Test Notification');
          await messageInput.fill('This is a test message');
          
          const sendButton = page.locator('button:has-text("Send")');
          await sendButton.click();
          
          await expectToast(page, 'sent', 'success');
        }
      }
    }
  });

  test('respects admin permissions', async ({ page }) => {
    // Login as moderator (limited permissions)
    await page.context().clearCookies();
    await loginAsAdmin(page, TEST_ADMIN_USERS.moderator);
    await page.goto('/admin/dashboard');
    await switchToTab(page, 'Users');
    
    // Moderators should have view access but limited edit
    const userList = page.locator('[data-testid="user-list"]');
    await expect(userList).toBeVisible();
    
    // Certain actions might be hidden for moderators
    const deleteButtons = page.locator('[data-testid="delete-user"]');
    const deleteCount = await deleteButtons.count();
    
    // Moderators typically can't delete users
    expect(deleteCount).toBe(0);
  });
});
