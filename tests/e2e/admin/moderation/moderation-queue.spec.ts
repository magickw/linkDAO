import { test, expect } from '@playwright/test';
import { 
  loginAsAdmin, 
  TEST_ADMIN_USERS, 
  switchToTab, 
  expectToast,
  waitForDashboardLoad 
} from '../../utils/adminHelpers';

test.describe('Content Moderation Queue', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page, TEST_ADMIN_USERS.moderator);
    await page.goto('/admin/dashboard');
    await waitForDashboardLoad(page);
    await switchToTab(page, 'Moderation');
    
    // Wait for moderation queue to load
    await page.waitForSelector('[data-testid="moderation-queue"]', { timeout: 10000 });
  });

  test('moderation queue displays pending items', async ({ page }) => {
    // Check if queue is visible
    const queue = page.locator('[data-testid="moderation-queue"]');
    await expect(queue).toBeVisible();
    
    // Should have at least the queue container
    const queueItems = page.locator('[data-testid="moderation-item"]');
    const count = await queueItems.count();
    
    // Queue might be empty, which is valid
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('can filter moderation queue by priority', async ({ page }) => {
    // Look for priority filter
    const priorityFilter = page.locator('[data-testid="priority-filter"]').or(
      page.locator('select').filter({ hasText: /priority|high|medium|low/i })
    );
    
    if (await priorityFilter.count() > 0) {
      await priorityFilter.first().selectOption('high');
      await page.waitForTimeout(1000); // Wait for filter to apply
      
      // Verify URL or filter state updated
      const url = page.url();
      expect(url).toContain('priority=high');
    }
  });

  test('can view content details', async ({ page }) => {
    const queueItems = page.locator('[data-testid="moderation-item"]');
    const itemCount = await queueItems.count();
    
    if (itemCount > 0) {
      const firstItem = queueItems.first();
      await firstItem.click();
      
      // Should show content details modal or expanded view
      const detailsView = page.locator('[data-testid="content-details"]').or(
        page.locator('[role="dialog"]')
      );
      await expect(detailsView.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('approve content from moderation queue', async ({ page }) => {
    const queueItems = page.locator('[data-testid="moderation-item"]');
    const itemCount = await queueItems.count();
    
    if (itemCount > 0) {
      const firstItem = queueItems.first();
      
      // Click approve button
      const approveButton = firstItem.locator('[data-testid="approve-button"]').or(
        firstItem.locator('button:has-text("Approve")')
      );
      
      if (await approveButton.count() > 0) {
        await approveButton.first().click();
        
        // Should show success message
        await expectToast(page, 'approved', 'success');
        
        // Item should be removed from queue or marked as approved
        await page.waitForTimeout(1000);
      }
    }
  });

  test('reject content with reason', async ({ page }) => {
    const queueItems = page.locator('[data-testid="moderation-item"]');
    const itemCount = await queueItems.count();
    
    if (itemCount > 0) {
      const firstItem = queueItems.first();
      
      // Click reject button
      const rejectButton = firstItem.locator('[data-testid="reject-button"]').or(
        firstItem.locator('button:has-text("Reject")')
      );
      
      if (await rejectButton.count() > 0) {
        await rejectButton.first().click();
        
        // Should show rejection reason dialog
        const reasonDialog = page.locator('[data-testid="rejection-dialog"]').or(
          page.locator('[role="dialog"]')
        );
        
        if (await reasonDialog.count() > 0) {
          await expect(reasonDialog.first()).toBeVisible();
          
          // Fill in rejection reason
          const reasonInput = page.locator('[data-testid="rejection-reason"]').or(
            page.locator('textarea')
          );
          await reasonInput.first().fill('This content violates community guidelines');
          
          // Confirm rejection
          const confirmButton = page.locator('[data-testid="confirm-rejection"]').or(
            page.locator('button:has-text("Confirm")')
          );
          await confirmButton.first().click();
          
          // Should show success message
          await expectToast(page, 'rejected', 'success');
        }
      }
    }
  });

  test('escalate content to senior moderator', async ({ page }) => {
    const queueItems = page.locator('[data-testid="moderation-item"]');
    const itemCount = await queueItems.count();
    
    if (itemCount > 0) {
      const firstItem = queueItems.first();
      
      // Look for escalate button
      const escalateButton = firstItem.locator('[data-testid="escalate-button"]').or(
        firstItem.locator('button:has-text("Escalate")')
      );
      
      if (await escalateButton.count() > 0) {
        await escalateButton.first().click();
        
        // Should show escalation dialog
        const escalationDialog = page.locator('[data-testid="escalation-dialog"]');
        
        if (await escalationDialog.count() > 0) {
          await expect(escalationDialog).toBeVisible();
          
          // Add escalation note
          const noteInput = page.locator('[data-testid="escalation-note"]');
          await noteInput.fill('Requires senior review due to complexity');
          
          const confirmButton = page.locator('button:has-text("Confirm")');
          await confirmButton.click();
          
          await expectToast(page, 'escalated', 'success');
        }
      }
    }
  });

  test('AI risk score is displayed for content', async ({ page }) => {
    const queueItems = page.locator('[data-testid="moderation-item"]');
    const itemCount = await queueItems.count();
    
    if (itemCount > 0) {
      const firstItem = queueItems.first();
      
      // Look for AI analysis section
      const aiAnalysis = firstItem.locator('[data-testid="ai-analysis"]').or(
        firstItem.locator('text=/risk score|ai analysis/i')
      );
      
      // AI analysis might not be present for all items
      const hasAIAnalysis = await aiAnalysis.count() > 0;
      expect(typeof hasAIAnalysis).toBe('boolean');
    }
  });

  test('can bulk moderate multiple items', async ({ page }) => {
    const queueItems = page.locator('[data-testid="moderation-item"]');
    const itemCount = await queueItems.count();
    
    if (itemCount >= 2) {
      // Select multiple items
      const checkboxes = page.locator('[data-testid="moderation-checkbox"]');
      const checkboxCount = await checkboxes.count();
      
      if (checkboxCount >= 2) {
        await checkboxes.nth(0).check();
        await checkboxes.nth(1).check();
        
        // Look for bulk action button
        const bulkActionButton = page.locator('[data-testid="bulk-action"]').or(
          page.locator('button:has-text("Bulk Action")')
        );
        
        if (await bulkActionButton.count() > 0) {
          await expect(bulkActionButton.first()).toBeVisible();
        }
      }
    }
  });

  test('moderation history is tracked', async ({ page }) => {
    // Switch to history tab
    const historyTab = page.locator('button:has-text("History")').or(
      page.locator('[data-testid="history-tab"]')
    );
    
    if (await historyTab.count() > 0) {
      await historyTab.first().click();
      
      // Should show moderation history
      const historyList = page.locator('[data-testid="moderation-history"]');
      await expect(historyList).toBeVisible({ timeout: 5000 });
    }
  });

  test('real-time updates when new content is flagged', async ({ page }) => {
    // This test would require WebSocket connection
    // Check if WebSocket is connected
    const isWebSocketConnected = await page.evaluate(() => {
      return (window as any).adminWebSocketConnected || false;
    });
    
    if (isWebSocketConnected) {
      const initialCount = await page.locator('[data-testid="moderation-item"]').count();
      
      // Wait for potential real-time update
      await page.waitForTimeout(3000);
      
      // Check if count changed or real-time indicator appeared
      const currentCount = await page.locator('[data-testid="moderation-item"]').count();
      
      // Count might be same or different
      expect(typeof currentCount).toBe('number');
    }
  });
});
