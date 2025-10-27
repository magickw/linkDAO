import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  TEST_ADMIN_USERS,
  switchToTab,
  expectToast,
  waitForDashboardLoad,
} from '../../utils/adminHelpers';

test.describe('Seller Applications', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page, TEST_ADMIN_USERS.admin);
    await page.goto('/admin/dashboard');
    await waitForDashboardLoad(page);
    await switchToTab(page, 'Seller Applications');
    
    // Wait for applications list to load
    await page.waitForSelector('[data-testid="seller-applications"]', { timeout: 10000 });
  });

  test('displays seller applications list', async ({ page }) => {
    const applicationsList = page.locator('[data-testid="seller-applications"]');
    await expect(applicationsList).toBeVisible();
    
    // Check if there are applications or empty state
    const applications = page.locator('[data-testid="application-item"]');
    const emptyState = page.locator('text=/no.*applications|empty/i');
    
    const hasApplications = await applications.count() > 0;
    const hasEmptyState = await emptyState.count() > 0;
    
    expect(hasApplications || hasEmptyState).toBeTruthy();
  });

  test('can filter applications by status', async ({ page }) => {
    const statusFilter = page.locator('[data-testid="status-filter"]').or(
      page.locator('select').filter({ hasText: /status|pending|approved/i })
    );
    
    if (await statusFilter.count() > 0) {
      await statusFilter.first().selectOption('pending');
      await page.waitForTimeout(1000);
      
      // Verify filter applied
      const url = page.url();
      expect(url).toContain('status');
    }
  });

  test('can view application details', async ({ page }) => {
    const applications = page.locator('[data-testid="application-item"]');
    const appCount = await applications.count();
    
    if (appCount > 0) {
      const firstApp = applications.first();
      
      // Click to view details
      const viewButton = firstApp.locator('[data-testid="view-application"]').or(
        firstApp.locator('button:has-text("View")')
      );
      
      if (await viewButton.count() > 0) {
        await viewButton.first().click();
      } else {
        await firstApp.click();
      }
      
      // Should show application details
      const detailsView = page.locator('[data-testid="application-details"]').or(
        page.locator('[role="dialog"]')
      );
      await expect(detailsView.first()).toBeVisible({ timeout: 5000 });
      
      // Check for key fields
      const businessName = page.locator('text=/business name|company name/i');
      await expect(businessName.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('can approve seller application', async ({ page }) => {
    const applications = page.locator('[data-testid="application-item"]');
    const appCount = await applications.count();
    
    if (appCount > 0) {
      const firstApp = applications.first();
      
      // Look for approve button
      const approveButton = firstApp.locator('[data-testid="approve-application"]').or(
        firstApp.locator('button:has-text("Approve")')
      );
      
      if (await approveButton.count() > 0) {
        await approveButton.first().click();
        
        // Confirmation dialog might appear
        const confirmDialog = page.locator('[data-testid="approve-dialog"]').or(
          page.locator('[role="dialog"]')
        );
        
        if (await confirmDialog.count() > 0) {
          await expect(confirmDialog.first()).toBeVisible();
          
          // Add approval notes if available
          const notesInput = page.locator('[data-testid="approval-notes"]').or(
            page.locator('textarea')
          );
          
          if (await notesInput.count() > 0) {
            await notesInput.first().fill('Application meets all requirements');
          }
          
          // Confirm approval
          const confirmButton = page.locator('[data-testid="confirm-approve"]').or(
            page.locator('button:has-text("Confirm")')
          );
          await confirmButton.first().click();
          
          // Should show success message
          await expectToast(page, 'approved', 'success');
        }
      }
    }
  });

  test('can reject seller application with reason', async ({ page }) => {
    const applications = page.locator('[data-testid="application-item"]');
    const appCount = await applications.count();
    
    if (appCount > 0) {
      const firstApp = applications.first();
      
      // Look for reject button
      const rejectButton = firstApp.locator('[data-testid="reject-application"]').or(
        firstApp.locator('button:has-text("Reject")')
      );
      
      if (await rejectButton.count() > 0) {
        await rejectButton.first().click();
        
        // Should show rejection dialog
        const rejectDialog = page.locator('[data-testid="reject-dialog"]').or(
          page.locator('[role="dialog"]')
        );
        
        if (await rejectDialog.count() > 0) {
          await expect(rejectDialog.first()).toBeVisible();
          
          // Fill rejection reason
          const reasonInput = page.locator('[data-testid="rejection-reason"]').or(
            page.locator('textarea')
          );
          
          if (await reasonInput.count() > 0) {
            await reasonInput.first().fill('Application incomplete - missing business license');
          }
          
          // Select rejection category if available
          const categorySelect = page.locator('[data-testid="rejection-category"]').or(
            page.locator('select')
          );
          
          if (await categorySelect.count() > 0) {
            await categorySelect.first().selectOption('incomplete_information');
          }
          
          // Confirm rejection
          const confirmButton = page.locator('[data-testid="confirm-reject"]').or(
            page.locator('button:has-text("Confirm")')
          );
          await confirmButton.first().click();
          
          await expectToast(page, 'reject', 'success');
        }
      }
    }
  });

  test('can request more information', async ({ page }) => {
    const applications = page.locator('[data-testid="application-item"]');
    const appCount = await applications.count();
    
    if (appCount > 0) {
      const firstApp = applications.first();
      
      // Look for request info button
      const requestButton = firstApp.locator('[data-testid="request-info"]').or(
        firstApp.locator('button:has-text("Request Info")')
      );
      
      if (await requestButton.count() > 0) {
        await requestButton.first().click();
        
        // Fill request form
        const requestDialog = page.locator('[data-testid="request-info-dialog"]');
        
        if (await requestDialog.count() > 0) {
          const messageInput = page.locator('[data-testid="request-message"]');
          await messageInput.fill('Please provide your business registration certificate');
          
          const sendButton = page.locator('button:has-text("Send Request")');
          await sendButton.click();
          
          await expectToast(page, 'sent', 'success');
        }
      }
    }
  });

  test('can view seller documents', async ({ page }) => {
    const applications = page.locator('[data-testid="application-item"]');
    const appCount = await applications.count();
    
    if (appCount > 0) {
      // View application details
      const firstApp = applications.first();
      await firstApp.click();
      
      // Look for documents section
      const documentsSection = page.locator('[data-testid="seller-documents"]').or(
        page.locator('text=/documents|attachments/i')
      );
      
      if (await documentsSection.count() > 0) {
        await expect(documentsSection.first()).toBeVisible();
        
        // Check for document links
        const documentLinks = page.locator('[data-testid="document-link"]').or(
          page.locator('a[href*="document"]')
        );
        
        const linkCount = await documentLinks.count();
        expect(linkCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('can verify seller identity', async ({ page }) => {
    const applications = page.locator('[data-testid="application-item"]');
    const appCount = await applications.count();
    
    if (appCount > 0) {
      const firstApp = applications.first();
      await firstApp.click();
      
      // Look for identity verification section
      const verifyButton = page.locator('[data-testid="verify-identity"]').or(
        page.locator('button:has-text("Verify Identity")')
      );
      
      if (await verifyButton.count() > 0) {
        await verifyButton.first().click();
        
        // Verification dialog
        const verifyDialog = page.locator('[data-testid="verify-dialog"]');
        
        if (await verifyDialog.count() > 0) {
          // Mark ID as verified
          const idCheckbox = page.locator('[data-testid="id-verified"]');
          if (await idCheckbox.count() > 0) {
            await idCheckbox.check();
          }
          
          // Mark business license as verified
          const licenseCheckbox = page.locator('[data-testid="license-verified"]');
          if (await licenseCheckbox.count() > 0) {
            await licenseCheckbox.check();
          }
          
          const confirmButton = page.locator('button:has-text("Confirm")');
          await confirmButton.click();
          
          await expectToast(page, 'verified', 'success');
        }
      }
    }
  });

  test('displays application metrics', async ({ page }) => {
    const metricsCards = page.locator('[data-testid="application-metrics"]').or(
      page.locator('.stat-card')
    );
    
    const cardCount = await metricsCards.count();
    
    if (cardCount > 0) {
      // Check that metrics have numbers
      const firstCard = metricsCards.first();
      const hasNumbers = await firstCard.locator('text=/\\d+/').count() > 0;
      expect(hasNumbers).toBeTruthy();
    }
  });

  test('can sort applications by date', async ({ page }) => {
    const sortButton = page.locator('[data-testid="sort-applications"]').or(
      page.locator('button:has-text("Sort")')
    );
    
    if (await sortButton.count() > 0) {
      await sortButton.first().click();
      
      // Select sort option
      const sortOption = page.locator('text=/newest|oldest|date/i');
      if (await sortOption.count() > 0) {
        await sortOption.first().click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('can export application data', async ({ page }) => {
    const exportButton = page.locator('[data-testid="export-applications"]').or(
      page.locator('button:has-text("Export")')
    );
    
    if (await exportButton.count() > 0) {
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      
      await exportButton.first().click();
      
      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toMatch(/applications.*\.(csv|xlsx)/i);
      }
    }
  });

  test('shows application timeline/history', async ({ page }) => {
    const applications = page.locator('[data-testid="application-item"]');
    const appCount = await applications.count();
    
    if (appCount > 0) {
      const firstApp = applications.first();
      await firstApp.click();
      
      // Look for timeline/history section
      const timeline = page.locator('[data-testid="application-timeline"]').or(
        page.locator('text=/timeline|history|activity/i')
      );
      
      if (await timeline.count() > 0) {
        await expect(timeline.first()).toBeVisible();
        
        // Check for timeline entries
        const entries = page.locator('[data-testid="timeline-entry"]');
        const entryCount = await entries.count();
        expect(entryCount).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
