/**
 * Extension Error Suppression Test
 * This script can be run in the browser console to test extension error handling
 */

console.log('🧪 Testing Extension Error Suppression');

// Test 1: Simulate the exact error you encountered
try {
  const error = new Error('TypeError: Error in invocation of runtime.sendMessage(optional string extensionId, any message, optional object options, optional function callback): chrome.runtime.sendMessage() called from a webpage must specify an Extension ID (string) for its first argument.');
  error.stack = 'at Bt\n    chrome-extension://opfgelmcmbiajamepnmloijbpoleiama/inpage.js (1:1012806)\n<unknown>\n    chrome-extension://opfgelmcmbiajamepnmloijbpoleiama/inpage.js (1:1013562)';
  
  // This should be suppressed
  window.dispatchEvent(new ErrorEvent('error', {
    message: error.message,
    filename: 'chrome-extension://opfgelmcmbiajamepnmloijbpoleiama/inpage.js',
    error: error
  }));
  
  console.log('✅ Test 1: Runtime sendMessage error dispatched (should be suppressed)');
} catch (e) {
  console.log('❌ Test 1 failed:', e);
}

// Test 2: Simulate a regular application error that should NOT be suppressed
try {
  window.dispatchEvent(new ErrorEvent('error', {
    message: 'This is a regular application error',
    filename: '/components/MyComponent.tsx',
    error: new Error('This is a regular application error')
  }));
  
  console.log('✅ Test 2: Regular error dispatched (should NOT be suppressed)');
} catch (e) {
  console.log('❌ Test 2 failed:', e);
}

// Test 3: Test promise rejection suppression
try {
  const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
    promise: Promise.reject('chrome.runtime.sendMessage error'),
    reason: 'chrome.runtime.sendMessage() called from a webpage must specify an Extension ID'
  });
  
  window.dispatchEvent(rejectionEvent);
  console.log('✅ Test 3: Extension promise rejection dispatched (should be suppressed)');
} catch (e) {
  console.log('❌ Test 3 failed:', e);
}

// Test 4: Check if debug mode is enabled
if (window.__DEBUG_EXTENSION_ERRORS__) {
  console.log('🐛 Debug mode is enabled - suppressed errors will be logged with details');
} else {
  console.log('🔇 Debug mode is disabled - suppressed errors will be silent');
}

console.log('\n📊 Extension Error Suppression Test Complete');
console.log('Check the console for any \"🔇 Extension Error Suppressed\" messages.');
console.log('If you see detailed suppression logs, the system is working correctly.');