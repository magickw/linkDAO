/**
 * Test script to verify batched wallet updates work correctly
 * Run this in the browser console
 */

// Test 1: Monitor state updates when wallet connects
function testStateUpdateBatching() {
  console.log('=== Testing State Update Batching ===');
  
  // Track state update calls
  const originalSetState = React.Component.prototype.setState;
  const stateUpdates = [];
  
  React.Component.prototype.setState = function(...args) {
    stateUpdates.push({
      component: this.constructor.name,
      timestamp: Date.now(),
      args: args
    });
    return originalSetState.apply(this, args);
  };
  
  console.log('Monitoring state updates for 5 seconds...');
  
  setTimeout(() => {
    console.log(`State updates detected: ${stateUpdates.length}`);
    stateUpdates.forEach((update, index) => {
      console.log(`${index + 1}. ${update.component} at ${new Date(update.timestamp).toLocaleTimeString()}`);
    });
    
    // Restore original setState
    React.Component.prototype.setState = originalSetState;
    
    // Check if updates were batched (close timestamps indicate batching)
    if (stateUpdates.length > 1) {
      const timeDiffs = [];
      for (let i = 1; i < stateUpdates.length; i++) {
        timeDiffs.push(stateUpdates[i].timestamp - stateUpdates[i-1].timestamp);
      }
      const avgTimeDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
      
      if (avgTimeDiff < 100) {
        console.log('✅ Updates appear to be batched (avg time difference:', avgTimeDiff.toFixed(2), 'ms)');
      } else {
        console.log('⚠️ Updates may not be properly batched (avg time difference:', avgTimeDiff.toFixed(2), 'ms)');
      }
    }
  }, 5000);
}

// Test 2: Check if navigation is blocked
function testNavigationBlocking() {
  console.log('\n=== Testing Navigation Blocking ===');
  
  const navigationStart = performance.now();
  let navigationCompleted = false;
  
  // Override pushState to detect navigation
  const originalPushState = history.pushState;
  history.pushState = function(...args) {
    const result = originalPushState.apply(this, args);
    navigationCompleted = true;
    const navigationEnd = performance.now();
    const navigationTime = navigationEnd - navigationStart;
    
    console.log(`Navigation completed in ${navigationTime.toFixed(2)}ms`);
    
    if (navigationTime > 1000) {
      console.log('⚠️ Navigation took longer than expected (>1s)');
    } else {
      console.log('✅ Navigation completed quickly');
    }
    
    return result;
  };
  
  // Simulate navigation after 1 second
  setTimeout(() => {
    console.log('Simulating navigation...');
    window.history.pushState({}, '', '/test-navigation');
  }, 1000);
  
  // Restore original pushState after 3 seconds
  setTimeout(() => {
    history.pushState = originalPushState;
    if (!navigationCompleted) {
      console.log('❌ Navigation appears to be blocked');
    }
  }, 3000);
}

// Test 3: Check for requestIdleCallback usage
function testRequestIdleCallback() {
  console.log('\n=== Testing RequestIdleCallback Usage ===');
  
  if ('requestIdleCallback' in window) {
    console.log('✅ requestIdleCallback is supported');
    
    // Test if it's being used
    let idleCallbackFired = false;
    window.requestIdleCallback(() => {
      idleCallbackFired = true;
      console.log('✅ requestIdleCallback fired successfully');
    }, { timeout: 1000 });
    
    setTimeout(() => {
      if (!idleCallbackFired) {
        console.log('⚠️ requestIdleCallback did not fire within 1 second');
      }
    }, 1100);
  } else {
    console.log('⚠️ requestIdleCallback is not supported (using setTimeout fallback)');
  }
}

// Test 4: Monitor WebSocket connection timing
function testWebSocketConnection() {
  console.log('\n=== Testing WebSocket Connection Timing ===');
  
  // Look for WebSocket connection logs
  const originalLog = console.log;
  const wsLogs = [];
  
  console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('WebSocket') || message.includes('ws')) {
      wsLogs.push({
        message: message,
        timestamp: Date.now()
      });
    }
    originalLog.apply(console, args);
  };
  
  setTimeout(() => {
    console.log = originalLog;
    
    if (wsLogs.length > 0) {
      console.log(`WebSocket logs detected: ${wsLogs.length}`);
      wsLogs.forEach((log, index) => {
        console.log(`${index + 1}. [${new Date(log.timestamp).toLocaleTimeString()}] ${log.message}`);
      });
    } else {
      console.log('No WebSocket logs detected');
    }
  }, 5000);
}

// Run all tests
function runAllTests() {
  console.log('🧪 Starting Batched Updates Tests\n');
  
  testStateUpdateBatching();
  testNavigationBlocking();
  testRequestIdleCallback();
  testWebSocketConnection();
  
  console.log('\n🏁 Tests completed');
  console.log('\n💡 Instructions:');
  console.log('1. Connect your wallet on the home page');
  console.log('2. Run these tests');
  console.log('3. Try navigating to different pages');
  console.log('4. Navigation should work without manual refresh');
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testBatchedUpdates = {
    runAllTests,
    testStateUpdateBatching,
    testNavigationBlocking,
    testRequestIdleCallback,
    testWebSocketConnection
  };
  
  // Auto-run tests if script is loaded directly
  if (window.location.pathname.includes('test-batched-updates')) {
    runAllTests();
  }
}