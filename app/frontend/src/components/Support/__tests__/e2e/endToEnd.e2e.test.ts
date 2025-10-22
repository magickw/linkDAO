import { test, expect, Page } from '@playwright/test';

/**
 * End-to-End Testing for Complete User Journeys
 * Tests realistic user scenarios from start to finish
 */

test.describe('End-to-End User Journeys', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Enable performance monitoring
    await page.addInitScript(() => {
      window.performance.mark('test-start');
    });
    
    await page.goto('/support');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Complete New User Onboarding Journey', () => {
    test('new user discovers, reads, and follows complete onboarding flow', async () => {
      // Step 1: User arrives at support page
      await expect(page).toHaveTitle(/Support Documentation/);
      await expect(page.locator('h1')).toContainText('Support Documentation');
      
      // Step 2: User sees getting started prominently
      await expect(page.locator('text=Getting Started')).toBeVisible();
      await expect(page.locator('text=Getting Started (2)')).toBeVisible();
      
      // Step 3: User clicks on beginner's guide
      await page.locator('text=Beginner\'s Guide to LDAO').click();
      
      // Step 4: Document opens with full content
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('text=Step 1: Setting up your wallet')).toBeVisible();
      
      // Step 5: User reads through sections using table of contents
      await page.locator('text=Step 2: Acquiring LDAO tokens').click();
      await page.waitForTimeout(500);
      
      // Step 6: User follows "Next" recommendation to security guide
      await page.locator('text=Next: Security Best Practices').click();
      
      // Step 7: Security guide opens
      await expect(page.locator('text=Wallet Security')).toBeVisible();
      await expect(page.locator('text=Platform Safety')).toBeVisible();
      
      // Step 8: User accesses FAQ for quick questions
      await page.locator('text=Quick FAQ').click();
      await expect(page.locator('text=What is LDAO?')).toBeVisible();
      
      // Step 9: User provides feedback
      await page.locator('button:has-text("Yes, helpful")').click();
      await expect(page.locator('text=Thank you for your feedback!')).toBeVisible();
      
      // Verify complete journey was tracked
      const journeyComplete = await page.evaluate(() => {
        return window.localStorage.getItem('user-journey-complete') === 'true';
      });
      expect(journeyComplete).toBe(true);
    });

    test('user completes onboarding with mobile device', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Mobile onboarding flow
      await expect(page.locator('[data-testid="mobile-layout"]')).toBeVisible();
      
      // Open mobile menu
      await page.locator('[aria-label="Menu"]').click();
      await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
      
      // Navigate to getting started
      await page.locator('text=Getting Started').click();
      await page.locator('text=Beginner\'s Guide to LDAO').click();
      
      // Mobile document viewer
      await expect(page.locator('[data-testid="mobile-document-viewer"]')).toBeVisible();
      
      // Swipe navigation (simulate touch)
      await page.touchscreen.tap(200, 400);
      await page.touchscreen.tap(300, 400);
      
      // Complete mobile onboarding
      await page.locator('button:has-text("Mark as Complete")').click();
      await expect(page.locator('text=Onboarding Complete!')).toBeVisible();
    });
  });

  test.describe('Problem-Solving User Journey', () => {
    test('user with transaction problem finds solution through search and escalation', async () => {
      // Step 1: User has specific problem
      const problemQuery = 'transaction failed pending';
      
      // Step 2: User searches for solution
      await page.locator('input[placeholder*="Search"]').fill(problemQuery);
      await page.keyboard.press('Enter');
      
      // Step 3: Search returns relevant results
      await expect(page.locator('text=Troubleshooting Guide')).toBeVisible();
      
      // Step 4: User opens troubleshooting guide
      await page.locator('text=Troubleshooting Guide').click();
      await expect(page.locator('text=Transaction Problems')).toBeVisible();
      
      // Step 5: User finds specific section
      await page.locator('text=Transaction Problems').click();
      await expect(page.locator('text=When transactions fail or are pending')).toBeVisible();
      
      // Step 6: User tries suggested solutions
      await page.locator('text=Check network status').click();
      await page.waitForTimeout(1000);
      
      // Step 7: Solution doesn't work, user needs more help
      await page.locator('text=Still need help?').scrollIntoViewIfNeeded();
      await expect(page.locator('text=Still need help?')).toBeVisible();
      
      // Step 8: User starts live chat
      await page.locator('button:has-text("Start Live Chat")').click();
      
      // Step 9: Chat opens with context
      await expect(page.locator('[data-testid="chat-widget"]')).toBeVisible();
      
      // Step 10: Chat is pre-populated with context
      const chatContext = await page.locator('[data-testid="chat-context"]').textContent();
      expect(chatContext).toContain('troubleshooting');
      expect(chatContext).toContain('transaction');
      
      // Step 11: User can send message
      await page.locator('[data-testid="chat-input"]').fill('I tried the steps but my transaction is still pending');
      await page.locator('button:has-text("Send")').click();
      
      // Verify escalation was successful
      await expect(page.locator('text=Support agent will respond shortly')).toBeVisible();
    });

    test('user creates support ticket for complex issue', async () => {
      // Step 1: User accesses support ticket creation
      await page.locator('button:has-text("Create Support Ticket")').click();
      
      // Step 2: Support ticket form opens
      await expect(page.locator('[role="dialog"][aria-label*="Support Ticket"]')).toBeVisible();
      
      // Step 3: User fills out detailed form
      await page.locator('input[name="subject"]').fill('Complex DeFi integration issue');
      await page.locator('textarea[name="description"]').fill(`
        I'm trying to integrate with a DeFi protocol but encountering issues:
        1. Transaction reverts with "insufficient allowance"
        2. Followed all documentation steps
        3. Checked contract addresses multiple times
        4. Gas fees seem correct
        
        Need technical assistance to resolve this.
      `);
      
      // Step 4: Select priority and category
      await page.locator('select[name="priority"]').selectOption('high');
      await page.locator('select[name="category"]').selectOption('technical');
      
      // Step 5: Attach relevant information
      await page.locator('input[type="file"]').setInputFiles('./test-files/transaction-log.txt');
      
      // Step 6: Submit ticket
      await page.locator('button:has-text("Submit Ticket")').click();
      
      // Step 7: Confirmation and ticket number
      await expect(page.locator('text=Ticket created successfully')).toBeVisible();
      const ticketNumber = await page.locator('[data-testid="ticket-number"]').textContent();
      expect(ticketNumber).toMatch(/LDAO-\d{6}/);
      
      // Step 8: User receives follow-up instructions
      await expect(page.locator('text=You will receive updates via email')).toBeVisible();
      await expect(page.locator('text=Expected response time: 4-6 hours')).toBeVisible();
    });
  });

  test.describe('Multi-Language User Journey', () => {
    test('non-English user accesses documentation in their language', async () => {
      // Step 1: User changes language
      await page.locator('button:has-text("Language")').click();
      await page.locator('text=Español').click();
      
      // Step 2: Interface updates to Spanish
      await expect(page.locator('text=Documentación de Soporte')).toBeVisible();
      await expect(page.locator('text=Empezando')).toBeVisible();
      
      // Step 3: User searches in Spanish
      await page.locator('input[placeholder*="Buscar"]').fill('seguridad');
      
      // Step 4: Spanish results are returned
      await expect(page.locator('text=Mejores Prácticas de Seguridad')).toBeVisible();
      
      // Step 5: User opens Spanish document
      await page.locator('text=Mejores Prácticas de Seguridad').click();
      
      // Step 6: Document content is in Spanish
      await expect(page.locator('text=Seguridad de la Billetera')).toBeVisible();
      
      // Step 7: User can switch back to English
      await page.locator('button:has-text("Idioma")').click();
      await page.locator('text=English').click();
      
      // Step 8: Interface returns to English
      await expect(page.locator('text=Support Documentation')).toBeVisible();
    });

    test('user with RTL language (Arabic) has proper layout', async () => {
      // Step 1: Switch to Arabic
      await page.locator('button:has-text("Language")').click();
      await page.locator('text=العربية').click();
      
      // Step 2: Layout switches to RTL
      const bodyDir = await page.locator('body').getAttribute('dir');
      expect(bodyDir).toBe('rtl');
      
      // Step 3: Text alignment is correct
      const mainContent = page.locator('[role="main"]');
      const textAlign = await mainContent.evaluate(el => 
        window.getComputedStyle(el).textAlign
      );
      expect(textAlign).toBe('right');
      
      // Step 4: Navigation works in RTL
      await page.locator('text=البدء').click();
      await expect(page.locator('text=دليل المبتدئين')).toBeVisible();
    });
  });

  test.describe('Accessibility User Journey', () => {
    test('screen reader user completes full documentation workflow', async () => {
      // Step 1: User navigates by landmarks
      await page.keyboard.press('Alt+Shift+R'); // Navigate to regions
      
      // Step 2: User finds main content
      await expect(page.locator('[role="main"]')).toBeFocused();
      
      // Step 3: User navigates by headings
      await page.keyboard.press('h'); // Next heading
      await page.keyboard.press('h'); // Next heading
      
      // Step 4: User accesses search by shortcut
      await page.keyboard.press('Control+k');
      await expect(page.locator('input[placeholder*="Search"]')).toBeFocused();
      
      // Step 5: User performs search
      await page.keyboard.type('wallet setup');
      await page.keyboard.press('Enter');
      
      // Step 6: Results are announced
      const announcement = await page.locator('[role="status"]').textContent();
      expect(announcement).toContain('found');
      
      // Step 7: User navigates to first result
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      
      // Step 8: Document opens with focus management
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      const focusedElement = await page.locator(':focus').first();
      await expect(focusedElement).toHaveAttribute('aria-label', 'Close document');
      
      // Step 9: User navigates document structure
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Step 10: User can close and return to list
      await page.keyboard.press('Escape');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });

    test('keyboard-only user completes support ticket creation', async () => {
      // Step 1: Navigate to support ticket creation
      await page.keyboard.press('Tab'); // Search
      await page.keyboard.press('Tab'); // Category
      await page.keyboard.press('Tab'); // Sort
      await page.keyboard.press('Tab'); // Support ticket button
      await page.keyboard.press('Enter');
      
      // Step 2: Form opens with proper focus
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('input[name="subject"]')).toBeFocused();
      
      // Step 3: Fill form using keyboard only
      await page.keyboard.type('Keyboard navigation issue');
      await page.keyboard.press('Tab');
      await page.keyboard.type('Having trouble with keyboard navigation in the marketplace section.');
      
      // Step 4: Navigate to priority dropdown
      await page.keyboard.press('Tab');
      await page.keyboard.press('Space');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      
      // Step 5: Submit form
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      
      // Step 6: Success message with proper focus
      await expect(page.locator('text=Ticket created successfully')).toBeVisible();
      const successButton = page.locator('button:has-text("View Ticket")');
      await expect(successButton).toBeFocused();
    });
  });

  test.describe('Performance Under Load Journey', () => {
    test('user experience remains smooth with high concurrent usage', async () => {
      // Simulate multiple concurrent users
      const concurrentPages = await Promise.all(
        Array.from({ length: 5 }, async () => {
          const context = await page.context().browser()?.newContext();
          const newPage = await context?.newPage();
          await newPage?.goto('/support');
          return newPage;
        })
      );
      
      // All pages should load successfully
      for (const concurrentPage of concurrentPages) {
        if (concurrentPage) {
          await expect(concurrentPage.locator('text=Beginner\'s Guide to LDAO')).toBeVisible();
        }
      }
      
      // Search should remain fast across all instances
      const searchPromises = concurrentPages.map(async (concurrentPage, index) => {
        if (concurrentPage) {
          const startTime = Date.now();
          await concurrentPage.locator('input[placeholder*="Search"]').fill(`query${index}`);
          await concurrentPage.waitForTimeout(500);
          return Date.now() - startTime;
        }
        return 0;
      });
      
      const searchTimes = await Promise.all(searchPromises);
      const avgSearchTime = searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length;
      expect(avgSearchTime).toBeLessThan(1000);
      
      // Clean up
      await Promise.all(concurrentPages.map(p => p?.close()));
    });

    test('user can access cached content during network issues', async () => {
      // Step 1: Load content normally
      await expect(page.locator('text=Beginner\'s Guide to LDAO')).toBeVisible();
      
      // Step 2: Open a document to cache it
      await page.locator('text=Beginner\'s Guide to LDAO').click();
      await expect(page.locator('text=Step 1: Setting up your wallet')).toBeVisible();
      await page.locator('[aria-label="Close"]').click();
      
      // Step 3: Simulate network issues
      await page.context().setOffline(true);
      
      // Step 4: User can still access cached content
      await page.reload();
      await expect(page.locator('text=Beginner\'s Guide to LDAO')).toBeVisible();
      
      // Step 5: Cached document opens
      await page.locator('text=Beginner\'s Guide to LDAO').click();
      await expect(page.locator('text=Step 1: Setting up your wallet')).toBeVisible();
      
      // Step 6: Offline indicator is shown
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      
      // Step 7: Network restoration works
      await page.context().setOffline(false);
      await page.waitForTimeout(1000);
      await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
    });
  });

  test.describe('Error Recovery Journey', () => {
    test('user recovers from various error scenarios', async () => {
      // Scenario 1: Network error during initial load
      await page.route('/api/support/documents', route => route.abort('failed'));
      await page.reload();
      
      await expect(page.locator('text=Error loading documents')).toBeVisible();
      await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
      
      // User retries successfully
      await page.unroute('/api/support/documents');
      await page.locator('button:has-text("Try Again")').click();
      await expect(page.locator('text=Beginner\'s Guide to LDAO')).toBeVisible();
      
      // Scenario 2: Search service error
      await page.route('/api/support/search*', route => route.abort('failed'));
      await page.locator('input[placeholder*="Search"]').fill('test query');
      
      await expect(page.locator('text=Search temporarily unavailable')).toBeVisible();
      await expect(page.locator('text=Browse categories instead')).toBeVisible();
      
      // User uses alternative navigation
      await page.locator('text=Browse categories instead').click();
      await expect(page.locator('text=Getting Started')).toBeVisible();
      
      // Scenario 3: Document loading error
      await page.route('/api/support/documents/beginners-guide', route => route.abort('failed'));
      await page.locator('text=Beginner\'s Guide to LDAO').click();
      
      await expect(page.locator('text=Unable to load document')).toBeVisible();
      await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
      
      // User successfully retries
      await page.unroute('/api/support/documents/beginners-guide');
      await page.locator('button:has-text("Try Again")').click();
      await expect(page.locator('text=Step 1: Setting up your wallet')).toBeVisible();
    });
  });

  test.describe('Complete User Satisfaction Journey', () => {
    test('user completes full journey and provides comprehensive feedback', async () => {
      // Step 1: User completes onboarding
      await page.locator('text=Beginner\'s Guide to LDAO').click();
      await page.locator('text=Step 2: Acquiring LDAO tokens').click();
      await page.locator('text=Step 3: Using the platform').click();
      
      // Step 2: User marks sections as helpful
      await page.locator('button:has-text("Mark as Complete")').click();
      
      // Step 3: User accesses security guide
      await page.locator('text=Next: Security Best Practices').click();
      await page.locator('text=Wallet Security').click();
      await page.locator('button:has-text("Yes, helpful")').click();
      
      // Step 4: User provides detailed feedback
      await page.locator('button:has-text("Provide Detailed Feedback")').click();
      
      await page.locator('textarea[name="feedback"]').fill(`
        The documentation is very comprehensive and well-organized. 
        The step-by-step approach in the beginner's guide was particularly helpful.
        Suggestions for improvement:
        1. Add more visual examples
        2. Include video tutorials
        3. Expand troubleshooting section
      `);
      
      await page.locator('select[name="rating"]').selectOption('5');
      await page.locator('button:has-text("Submit Feedback")').click();
      
      // Step 5: User receives satisfaction survey
      await expect(page.locator('text=Thank you for your feedback!')).toBeVisible();
      await expect(page.locator('text=Would you recommend our documentation?')).toBeVisible();
      
      await page.locator('button:has-text("Yes, definitely")').click();
      
      // Step 6: User journey completion is tracked
      const journeyData = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('user-journey-data') || '{}');
      });
      
      expect(journeyData.completed).toBe(true);
      expect(journeyData.satisfaction).toBe(5);
      expect(journeyData.documentsViewed).toContain('beginners-guide');
      expect(journeyData.documentsViewed).toContain('security-guide');
    });
  });
});