#!/usr/bin/env node

/**
 * Test navigation functionality with wallet connection simulation
 * This test verifies that navigation is not blocked when wallet is connected
 */

const puppeteer = require('puppeteer');

async function testNavigationWithWallet() {
  console.log('🧪 Testing navigation with wallet connection...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging from the browser
    page.on('console', msg => {
      console.log('Browser console:', msg.text());
    });
    
    // Navigate to home page
    console.log('📍 Navigating to home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    // Wait for page to load
    await page.waitForSelector('body', { timeout: 10000 });
    console.log('✅ Home page loaded');
    
    // Simulate wallet connection by setting up the required state
    console.log('🔗 Simulating wallet connection...');
    await page.evaluate(() => {
      // Simulate wallet connection state
      window.localStorage.setItem('walletConnected', 'true');
      window.localStorage.setItem('walletAddress', '0x1234567890123456789012345678901234567890');
      
      // Trigger wallet connection event
      window.dispatchEvent(new CustomEvent('walletConnected', {
        detail: { address: '0x1234567890123456789012345678901234567890' }
      }));
    });
    
    // Wait for wallet connection to process
    await page.waitForTimeout(1000);
    console.log('✅ Wallet connection simulated');
    
    // Test navigation to communities page
    console.log('🧭 Testing navigation to communities page...');
    const navigationStart = Date.now();
    
    // Click on communities link
    const communitiesLink = await page.$('a[href="/communities"]');
    if (communitiesLink) {
      await communitiesLink.click();
      
      // Wait for navigation with timeout
      try {
        await page.waitForFunction(
          () => window.location.pathname.includes('/communities'),
          { timeout: 5000 }
        );
        
        const navigationTime = Date.now() - navigationStart;
        console.log(`✅ Navigation to communities completed in ${navigationTime}ms`);
        
        // Navigate back to home
        console.log('🏠 Navigating back to home...');
        const homeLink = await page.$('a[href="/"]');
        if (homeLink) {
          await homeLink.click();
          await page.waitForFunction(
            () => window.location.pathname === '/',
            { timeout: 5000 }
          );
          console.log('✅ Navigation back to home completed');
        }
        
        // Test navigation to governance page
        console.log('🏛️ Testing navigation to governance page...');
        const governanceLink = await page.$('a[href="/governance"]');
        if (governanceLink) {
          await governanceLink.click();
          await page.waitForFunction(
            () => window.location.pathname.includes('/governance'),
            { timeout: 5000 }
          );
          console.log('✅ Navigation to governance completed');
        }
        
      } catch (error) {
        console.error('❌ Navigation failed or timed out:', error.message);
        return false;
      }
    } else {
      console.error('❌ Communities link not found');
      return false;
    }
    
    console.log('✅ All navigation tests passed with wallet connected');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
testNavigationWithWallet().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});