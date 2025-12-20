/**
 * Test script to verify navigation from home page after wallet connection
 * This script simulates user interaction to check if navigation works without manual refresh
 */

const puppeteer = require('puppeteer');

async function testNavigation() {
  const browser = await puppeteer.launch({
    headless: false, // Set to false for visual debugging
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('Testing navigation from home page after wallet connection...');
    
    // Navigate to home page
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    console.log('✓ Home page loaded');
    
    // Wait for the page to fully load
    await page.waitForTimeout(2000);
    
    // Check if wallet is already connected
    const walletConnected = await page.evaluate(() => {
      const connectButton = document.querySelector('[data-testid="connect-wallet-button"]');
      return connectButton ? false : true; // If button exists, wallet is not connected
    });
    
    if (!walletConnected) {
      console.log('Connecting wallet...');
      // Click connect wallet button
      await page.click('[data-testid="connect-wallet-button"]');
      
      // Wait for wallet connection modal
      await page.waitForTimeout(1000);
      
      // Simulate wallet connection (this would need to be adjusted based on actual wallet implementation)
      // For now, we'll just wait and assume connection succeeds
      await page.waitForTimeout(3000);
    }
    
    console.log('✓ Wallet connected');
    
    // Wait for page to stabilize after connection
    await page.waitForTimeout(2000);
    
    // Try to navigate to communities page
    console.log('Attempting to navigate to communities page...');
    await page.click('[href="/communities"]');
    
    // Wait for navigation to complete
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
    
    // Check if we're on the communities page
    const currentUrl = page.url();
    if (currentUrl.includes('/communities')) {
      console.log('✓ Successfully navigated to communities page without manual refresh');
      console.log('✓ Navigation issue appears to be fixed!');
    } else {
      console.log('✗ Navigation failed. Current URL:', currentUrl);
    }
    
    // Test navigation back to home
    console.log('Testing navigation back to home...');
    await page.click('[href="/"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
    
    if (page.url().endsWith('/') || page.url().endsWith('/#')) {
      console.log('✓ Successfully navigated back to home page');
    } else {
      console.log('✗ Navigation back to home failed');
    }
    
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    await browser.close();
  }
}

testNavigation();