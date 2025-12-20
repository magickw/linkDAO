/**
 * Simple test to verify navigation works after wallet connection
 * Run this in the browser console after connecting a wallet
 */

console.log('🧪 Starting Navigation Test\n');

// Test 1: Check if page loads without errors
setTimeout(() => {
  console.log('✅ Page loaded successfully');
  
  // Test 2: Check if wallet connection state is properly detected
  const walletConnected = !!document.querySelector('[data-testid="wallet-connected"]');
  console.log(`Wallet connection detected: ${walletConnected}`);
  
  // Test 3: Test navigation by simulating a click
  const navLinks = document.querySelectorAll('a[href^="/"]');
  if (navLinks.length > 0) {
    console.log(`Found ${navLinks.length} navigation links`);
    
    // Test clicking the first navigation link
    const firstLink = navLinks[0];
    console.log(`Testing navigation to: ${firstLink.href}`);
    
    // Monitor for navigation completion
    const originalPushState = history.pushState;
    let navigationCompleted = false;
    
    history.pushState = function(...args) {
      navigationCompleted = true;
      const result = originalPushState.apply(this, args);
      console.log('✅ Navigation completed successfully');
      
      // Restore original
      setTimeout(() => {
        history.pushState = originalPushState;
      }, 100);
      
      return result;
    };
    
    // Simulate click after 1 second
    setTimeout(() => {
      firstLink.click();
      
      // Check if navigation completed after 2 seconds
      setTimeout(() => {
        if (navigationCompleted) {
          console.log('✅ Navigation test passed');
        } else {
          console.log('⚠️ Navigation may still be blocked');
        }
      }, 2000);
    }, 1000);
  } else {
    console.log('⚠️ No navigation links found');
  }
}, 2000);

// Test 4: Monitor for any unhandled errors
window.addEventListener('error', (event) => {
  console.error('❌ Unhandled error:', event.error.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason);
});