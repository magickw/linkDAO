import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Cross-Browser Compatibility Tests for Support Documentation
 * Tests core functionality across different browsers and devices
 */

// Test data
const testDocuments = [
  { title: "Beginner's Guide to LDAO", category: 'getting-started' },
  { title: "Security Best Practices", category: 'security' },
  { title: "Troubleshooting Guide", category: 'troubleshooting' },
  { title: "Quick FAQ", category: 'getting-started' }
];

test.describe('Cross-Browser Support Documentation Tests', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Navigate to support documentation page
    await page.goto('/support');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.describe('Core Functionality', () => {
    test('should load and display documents in all browsers', async () => {
      // Check page title
      await expect(page).toHaveTitle(/Support Documentation/);
      
      // Check main heading
      await expect(page.locator('h1')).toContainText('Support Documentation');
      
      // Check that documents are loaded
      for (const doc of testDocuments) {
        await expect(page.locator(`text=${doc.title}`)).toBeVisible();
      }
      
      // Check category filters
      await expect(page.locator('text=Getting Started')).toBeVisible();
      await expect(page.locator('text=Security')).toBeVisible();
      await expect(page.locator('text=Troubleshooting')).toBeVisible();
    });

    test('should support search functionality across browsers', async () => {
      // Find search input
      const searchInput = page.locator('input[placeholder*="Search"]');
      await expect(searchInput).toBeVisible();
      
      // Perform search
      await searchInput.fill('wallet');
      await searchInput.press('Enter');
      
      // Wait for search results
      await page.waitForTimeout(500);
      
      // Check search results
      await expect(page.locator('text=Beginner\'s Guide to LDAO')).toBeVisible();
      
      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(500);
      
      // Check all documents are visible again
      for (const doc of testDocuments) {
        await expect(page.locator(`text=${doc.title}`)).toBeVisible();
      }
    });

    test('should open and display document content', async () => {
      // Click on first document
      await page.locator('text=Beginner\'s Guide to LDAO').click();
      
      // Wait for modal to open
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      
      // Check document content
      await expect(page.locator('text=Step 1: Setting up your wallet')).toBeVisible();
      await expect(page.locator('text=Step 2: Acquiring LDAO tokens')).toBeVisible();
      
      // Check table of contents
      await expect(page.locator('text=Introduction')).toBeVisible();
      
      // Close modal
      await page.locator('[aria-label="Close"]').click();
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });

    test('should filter documents by category', async () => {
      // Click on Security category
      await page.locator('text=Security').click();
      
      // Wait for filtering
      await page.waitForTimeout(500);
      
      // Check only security documents are visible
      await expect(page.locator('text=Security Best Practices')).toBeVisible();
      await expect(page.locator('text=Beginner\'s Guide to LDAO')).not.toBeVisible();
      
      // Click "All Categories" to reset
      await page.locator('text=All Categories').click();
      await page.waitForTimeout(500);
      
      // Check all documents are visible again
      for (const doc of testDocuments) {
        await expect(page.locator(`text=${doc.title}`)).toBeVisible();
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check mobile layout
      await expect(page.locator('[data-testid="mobile-layout"]')).toBeVisible();
      
      // Check mobile menu
      const menuButton = page.locator('[aria-label="Menu"]');
      await expect(menuButton).toBeVisible();
      
      // Open mobile menu
      await menuButton.click();
      await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
      
      // Check mobile search
      const mobileSearch = page.locator('[data-testid="mobile-search"] input');
      await expect(mobileSearch).toBeVisible();
      
      // Test mobile search
      await mobileSearch.fill('security');
      await page.waitForTimeout(500);
      await expect(page.locator('text=Security Best Practices')).toBeVisible();
    });

    test('should work on tablet devices', async () => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Check tablet layout adapts properly
      await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();
      
      // Check that all functionality works
      await page.locator('input[placeholder*="Search"]').fill('troubleshooting');
      await page.waitForTimeout(500);
      await expect(page.locator('text=Troubleshooting Guide')).toBeVisible();
    });

    test('should work on large desktop screens', async () => {
      // Set large desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Check desktop layout
      await expect(page.locator('[data-testid="desktop-layout"]')).toBeVisible();
      
      // Check sidebar is visible
      await expect(page.locator('[data-testid="sidebar-filters"]')).toBeVisible();
      
      // Check all documents are visible in grid
      for (const doc of testDocuments) {
        await expect(page.locator(`text=${doc.title}`)).toBeVisible();
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should support keyboard navigation', async () => {
      // Tab to search input
      await page.keyboard.press('Tab');
      await expect(page.locator('input[placeholder*="Search"]')).toBeFocused();
      
      // Tab to category filter
      await page.keyboard.press('Tab');
      await expect(page.locator('button:has-text("Category")')).toBeFocused();
      
      // Tab to first document
      await page.keyboard.press('Tab');
      await expect(page.locator('text=Beginner\'s Guide to LDAO')).toBeFocused();
      
      // Press Enter to open document
      await page.keyboard.press('Enter');
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      
      // Press Escape to close
      await page.keyboard.press('Escape');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });

    test('should support keyboard shortcuts', async () => {
      // Test search shortcut (Ctrl+K)
      await page.keyboard.press('Control+k');
      await expect(page.locator('input[placeholder*="Search"]')).toBeFocused();
      
      // Test escape to clear focus
      await page.keyboard.press('Escape');
      await expect(page.locator('input[placeholder*="Search"]')).not.toBeFocused();
    });
  });

  test.describe('Performance Across Browsers', () => {
    test('should load within performance budget', async () => {
      const startTime = Date.now();
      
      // Navigate to page
      await page.goto('/support');
      
      // Wait for content to load
      await page.waitForSelector('text=Beginner\'s Guide to LDAO');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds (allowing for browser differences)
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle large document sets efficiently', async () => {
      // Mock large document set
      await page.route('/api/support/documents', route => {
        const largeDocumentSet = Array.from({ length: 100 }, (_, i) => ({
          id: `doc-${i}`,
          title: `Document ${i}`,
          category: 'testing',
          difficulty: 'beginner',
          readTime: 5,
          lastUpdated: new Date().toISOString(),
          popularity: Math.floor(Math.random() * 100)
        }));
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ documents: largeDocumentSet })
        });
      });
      
      await page.reload();
      
      // Should still load efficiently
      await page.waitForSelector('text=Document 0', { timeout: 5000 });
      
      // Search should still be fast
      const searchStart = Date.now();
      await page.locator('input[placeholder*="Search"]').fill('Document 50');
      await page.waitForSelector('text=Document 50');
      const searchTime = Date.now() - searchStart;
      
      expect(searchTime).toBeLessThan(1000);
    });
  });

  test.describe('Browser-Specific Features', () => {
    test('should work with browser back/forward buttons', async () => {
      // Open a document
      await page.locator('text=Beginner\'s Guide to LDAO').click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      
      // Use browser back button
      await page.goBack();
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
      
      // Use browser forward button
      await page.goForward();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
    });

    test('should handle browser zoom levels', async () => {
      // Test different zoom levels
      const zoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
      
      for (const zoom of zoomLevels) {
        await page.evaluate((zoomLevel) => {
          document.body.style.zoom = zoomLevel.toString();
        }, zoom);
        
        // Check that content is still accessible
        await expect(page.locator('text=Beginner\'s Guide to LDAO')).toBeVisible();
        await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
      }
      
      // Reset zoom
      await page.evaluate(() => {
        document.body.style.zoom = '1';
      });
    });

    test('should work with browser print functionality', async () => {
      // Open a document
      await page.locator('text=Beginner\'s Guide to LDAO').click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      
      // Check print styles are applied
      const printStyles = await page.evaluate(() => {
        const printStyleSheets = Array.from(document.styleSheets).filter(sheet => {
          try {
            return sheet.media.mediaText.includes('print');
          } catch {
            return false;
          }
        });
        return printStyleSheets.length > 0;
      });
      
      expect(printStyles).toBe(true);
    });
  });

  test.describe('Error Handling Across Browsers', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate network error
      await page.route('/api/support/documents', route => {
        route.abort('failed');
      });
      
      await page.reload();
      
      // Check error message is displayed
      await expect(page.locator('text=Error loading documents')).toBeVisible();
      
      // Check retry button is available
      await expect(page.locator('button:has-text("Retry")')).toBeVisible();
      
      // Remove network error and retry
      await page.unroute('/api/support/documents');
      await page.locator('button:has-text("Retry")').click();
      
      // Check documents load successfully
      await expect(page.locator('text=Beginner\'s Guide to LDAO')).toBeVisible();
    });

    test('should handle JavaScript errors gracefully', async () => {
      // Inject a JavaScript error
      await page.addInitScript(() => {
        window.addEventListener('error', (event) => {
          console.log('Caught error:', event.error);
        });
      });
      
      // Trigger an error condition
      await page.evaluate(() => {
        // Simulate a component error
        throw new Error('Test error');
      });
      
      // Check that the page still functions
      await expect(page.locator('text=Beginner\'s Guide to LDAO')).toBeVisible();
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    });
  });

  test.describe('Accessibility Across Browsers', () => {
    test('should maintain accessibility in all browsers', async () => {
      // Check ARIA labels
      await expect(page.locator('input[aria-label*="Search"]')).toBeVisible();
      
      // Check landmarks
      await expect(page.locator('[role="main"]')).toBeVisible();
      await expect(page.locator('[role="navigation"]')).toBeVisible();
      
      // Check heading structure
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      expect(headings.length).toBeGreaterThan(0);
      
      // Check focus management
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus').first();
      await expect(focusedElement).toBeVisible();
    });

    test('should work with screen reader simulation', async () => {
      // Simulate screen reader by checking text content
      const pageText = await page.textContent('body');
      
      // Check that important content is accessible to screen readers
      expect(pageText).toContain('Support Documentation');
      expect(pageText).toContain('Beginner\'s Guide to LDAO');
      expect(pageText).toContain('Search documentation');
      
      // Check for proper announcements
      await page.locator('input[placeholder*="Search"]').fill('security');
      await page.waitForTimeout(500);
      
      // Check that results are announced
      const announcement = await page.locator('[role="status"]').textContent();
      expect(announcement).toContain('found');
    });
  });

  test.describe('Browser Storage and Caching', () => {
    test('should persist user preferences across sessions', async () => {
      // Set a preference (e.g., language)
      await page.locator('button:has-text("Language")').click();
      await page.locator('text=Español').click();
      
      // Reload page
      await page.reload();
      
      // Check preference is persisted
      await expect(page.locator('text=Documentación de Soporte')).toBeVisible();
    });

    test('should cache documents for offline access', async () => {
      // Load documents first
      await page.waitForSelector('text=Beginner\'s Guide to LDAO');
      
      // Simulate offline mode
      await page.context().setOffline(true);
      
      // Check that cached content is still available
      await page.reload();
      await expect(page.locator('text=Beginner\'s Guide to LDAO')).toBeVisible();
      
      // Restore online mode
      await page.context().setOffline(false);
    });
  });
});

// Browser-specific test configurations
test.describe('Browser-Specific Tests', () => {
  test.describe('Chrome-specific features', () => {
    test.skip(({ browserName }) => browserName !== 'chromium');
    
    test('should work with Chrome extensions', async () => {
      // Test would check compatibility with common Chrome extensions
      // This is a placeholder for extension compatibility testing
      await expect(page.locator('text=Beginner\'s Guide to LDAO')).toBeVisible();
    });
  });

  test.describe('Firefox-specific features', () => {
    test.skip(({ browserName }) => browserName !== 'firefox');
    
    test('should work with Firefox reader mode', async () => {
      // Open a document
      await page.locator('text=Beginner\'s Guide to LDAO').click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      
      // Check that content is structured for reader mode
      const articleContent = await page.locator('article').count();
      expect(articleContent).toBeGreaterThan(0);
    });
  });

  test.describe('Safari-specific features', () => {
    test.skip(({ browserName }) => browserName !== 'webkit');
    
    test('should work with Safari privacy features', async () => {
      // Test with strict privacy settings
      await page.context().addCookies([]);
      
      // Check that functionality still works without cookies
      await expect(page.locator('text=Beginner\'s Guide to LDAO')).toBeVisible();
      
      // Test search functionality
      await page.locator('input[placeholder*="Search"]').fill('security');
      await page.waitForTimeout(500);
      await expect(page.locator('text=Security Best Practices')).toBeVisible();
    });
  });
});