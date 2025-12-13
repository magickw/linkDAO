// Test script to verify community post routing
const { chromium } = require('playwright');

async function testCommunityPostRouting() {
  console.log('Testing community post routing...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Navigate to communities page
    await page.goto('http://localhost:3000/communities');
    await page.waitForLoadState('networkidle');
    console.log('✓ Communities page loaded');
    
    // Check if posts are displayed
    const posts = await page.$$('.community-post-card');
    if (posts.length > 0) {
      console.log(`✓ Found ${posts.length} posts on the communities page`);
      
      // Test clicking on a post title
      const firstPost = posts[0];
      const titleElement = await firstPost.$('h3');
      
      if (titleElement) {
        // Get the URL before click
        const currentUrl = page.url();
        
        // Click on the post title
        await titleElement.click();
        await page.waitForLoadState('networkidle');
        
        // Check if navigation happened
        const newUrl = page.url();
        if (newUrl !== currentUrl && newUrl.includes('/posts/')) {
          console.log(`✓ Successfully navigated to post: ${newUrl}`);
          
          // Verify the URL format
          const urlPattern = /\/communities\/[^\/]+\/posts\/[^\/]+/;
          if (urlPattern.test(newUrl)) {
            console.log('✓ Post URL format is correct');
          } else {
            console.log('✗ Post URL format is incorrect');
          }
        } else {
          console.log('✗ Navigation to post failed');
        }
      }
    } else {
      console.log('! No posts found on communities page');
    }
    
    // Test share button
    await page.goto('http://localhost:3000/communities');
    await page.waitForLoadState('networkidle');
    
    const shareButtons = await page.$$('button:has-text("Share")');
    if (shareButtons.length > 0) {
      console.log('✓ Share buttons found');
      
      // Click first share button
      await shareButtons[0].click();
      await page.waitForTimeout(500);
      
      // Check if share modal appears
      const shareModal = await page.$('[role="dialog"]');
      if (shareModal) {
        console.log('✓ Share modal opened successfully');
        
        // Check if URL is displayed in modal
        const urlElement = await shareModal.$('text=/http/');
        if (urlElement) {
          const urlText = await urlElement.textContent();
          if (urlText && urlText.includes('/communities/') && urlText.includes('/posts/')) {
            console.log(`✓ Share URL is correct: ${urlText}`);
          } else {
            console.log('✗ Share URL is incorrect');
          }
        }
        
        // Close modal
        const closeButton = await shareModal.$('button:has-text("Close")');
        if (closeButton) {
          await closeButton.click();
        }
      } else {
        console.log('✗ Share modal did not open');
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testCommunityPostRouting().then(() => {
  console.log('\nRouting test completed!');
}).catch(console.error);