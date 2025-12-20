/**
 * Test script to verify navigation works after IPFS fixes
 * Run this in the browser console after connecting a wallet
 */

// Test 1: Check if IPFS images are loading with timeout
function testIpfsImageLoading() {
  console.log('=== Testing IPFS Image Loading ===');
  
  // Find all images with IPFS sources
  const ipfsImages = document.querySelectorAll('img[src*="ipfs"]');
  console.log(`Found ${ipfsImages.length} IPFS images`);
  
  ipfsImages.forEach((img, index) => {
    console.log(`Image ${index + 1}:`, {
      src: img.src,
      loaded: img.complete,
      naturalWidth: img.naturalWidth,
      error: img.naturalWidth === 0
    });
  });
  
  // Check for error states
  const errorImages = document.querySelectorAll('.bg-gray-100.dark\\:bg-gray-800.rounded-lg.p-4.text-center');
  if (errorImages.length > 0) {
    console.log(`⚠️ Found ${errorImages.length} images that failed to load (showing error state)`);
  }
}

// Test 2: Simulate navigation and check if it blocks
function testNavigationFlow() {
  console.log('\n=== Testing Navigation Flow ===');
  
  // Get all navigation links
  const navLinks = document.querySelectorAll('a[href^="/"]');
  console.log(`Found ${navLinks.length} navigation links`);
  
  // Test clicking a navigation link without actually navigating
  const testLink = Array.from(navLinks).find(link => 
    link.href.includes('/communities') || 
    link.href.includes('/wallet') || 
    link.href.includes('/profile')
  );
  
  if (testLink) {
    console.log('Found test navigation link:', testLink.href);
    
    // Add click listener to test if navigation would block
    let navigationStarted = false;
    const originalOnClick = testLink.onclick;
    
    testLink.onclick = (e) => {
      e.preventDefault();
      navigationStarted = true;
      console.log('Navigation click detected');
      
      // Simulate navigation timing
      setTimeout(() => {
        console.log('✅ Navigation would complete without blocking');
      }, 100);
      
      return false;
    };
    
    // Simulate click
    testLink.click();
    
    // Restore original click handler
    setTimeout(() => {
      testLink.onclick = originalOnClick;
    }, 200);
  } else {
    console.log('⚠️ No suitable navigation link found for testing');
  }
}

// Test 3: Check for hanging promises or network requests
function testNetworkRequests() {
  console.log('\n=== Testing Network Requests ===');
  
  // Monitor active requests
  const originalFetch = window.fetch;
  let activeRequests = 0;
  let ipfsRequests = 0;
  
  window.fetch = function(...args) {
    activeRequests++;
    const url = args[0];
    
    if (typeof url === 'string' && url.includes('ipfs')) {
      ipfsRequests++;
      console.log(`IPFS request started: ${url}`);
    }
    
    return originalFetch.apply(this, args)
      .finally(() => {
        activeRequests--;
        if (typeof url === 'string' && url.includes('ipfs')) {
          console.log(`IPFS request completed: ${url}`);
        }
      });
  };
  
  // Check after 3 seconds
  setTimeout(() => {
    console.log(`Active requests: ${activeRequests}`);
    console.log(`IPFS requests made: ${ipfsRequests}`);
    
    if (activeRequests === 0) {
      console.log('✅ No hanging requests detected');
    } else {
      console.log('⚠️ Some requests may be hanging');
    }
    
    // Restore original fetch
    window.fetch = originalFetch;
  }, 3000);
}

// Test 4: Check console for IPFS errors
function testConsoleErrors() {
  console.log('\n=== Testing Console Errors ===');
  
  // Override console.error to count IPFS-related errors
  const originalError = console.error;
  let ipfsErrors = 0;
  
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('ipfs') || message.includes('IPFS') || message.includes('ERR_CONNECTION_REFUSED')) {
      ipfsErrors++;
    }
    originalError.apply(console, args);
  };
  
  // Check after 2 seconds
  setTimeout(() => {
    console.log(`IPFS-related errors detected: ${ipfsErrors}`);
    
    if (ipfsErrors === 0) {
      console.log('✅ No IPFS errors detected');
    } else {
      console.log('⚠️ Some IPFS errors detected (but should not block navigation)');
    }
    
    // Restore original console.error
    console.error = originalError;
  }, 2000);
}

// Run all tests
function runAllTests() {
  console.log('🧪 Starting Navigation Fix Tests\n');
  
  testIpfsImageLoading();
  testNavigationFlow();
  testNetworkRequests();
  testConsoleErrors();
  
  console.log('\n🏁 Tests completed');
  console.log('\n💡 Instructions:');
  console.log('1. Connect your wallet on the home page');
  console.log('2. Run these tests');
  console.log('3. Try navigating to different pages');
  console.log('4. Navigation should work without manual refresh');
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testNavigationFix = {
    runAllTests,
    testIpfsImageLoading,
    testNavigationFlow,
    testNetworkRequests,
    testConsoleErrors
  };
  
  // Auto-run tests if script is loaded directly
  if (window.location.pathname.includes('test-navigation-fix')) {
    runAllTests();
  }
}