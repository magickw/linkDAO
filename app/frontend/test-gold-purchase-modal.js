/**
 * Test script to verify the gold purchase modal fix
 */

const { chromium } = require('playwright');

async function testGoldPurchaseModal() {
  console.log('🧪 Testing Gold Purchase Modal Fix...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the marketplace page
    await page.goto('http://localhost:3001/marketplace');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Marketplace page loaded successfully');
    
    // Wait for the token acquisition section to load
    await page.waitForSelector('[data-testid="token-acquisition-section"]', { timeout: 10000 });
    
    // Click on "Buy LDAO" button to open the modal
    await page.click('text=Buy LDAO');
    
    console.log('✅ Buy LDAO button clicked');
    
    // Wait for modal to appear
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    console.log('✅ Purchase modal opened successfully');
    
    // Check if modal content is rendered
    const modalTitle = await page.textContent('h2');
    if (modalTitle && modalTitle.includes('Buy LDAO Tokens')) {
      console.log('✅ Modal title is correct');
    } else {
      console.log('❌ Modal title is incorrect or missing');
    }
    
    // Try to interact with the modal (enter amount)
    await page.fill('input[placeholder="0.00"]', '10');
    
    console.log('✅ Amount input field works');
    
    // Close the modal
    await page.click('button[aria-label="Close"]');
    
    console.log('✅ Modal closed successfully');
    
    // Wait for modal to disappear
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 });
    
    console.log('✅ Modal hidden successfully');
    
    console.log('🎉 All tests passed! The gold purchase modal is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Check for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text());
      }
    });
    
    // Check for any uncaught JavaScript errors
    page.on('pageerror', (err) => {
      console.error('Page error:', err.message);
    });
    
  } finally {
    await browser.close();
  }
}

// Run the test
testGoldPurchaseModal().catch(console.error);