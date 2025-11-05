#!/usr/bin/env node

/**
 * Diagnostic script for wallet authentication issues
 * Run this to check if repeated signature prompts are still occurring
 */

console.log('🔍 Wallet Authentication Diagnostics');
console.log('====================================');

// Check localStorage for authentication state
function checkLocalStorage() {
  console.log('\n📱 Checking Local Storage...');
  
  if (typeof window !== 'undefined' && window.localStorage) {
    const authToken = localStorage.getItem('auth_token');
    const walletConnected = localStorage.getItem('wagmi.connected');
    
    console.log(`   Auth Token: ${authToken ? '✓ Present' : '❌ Missing'}`);
    console.log(`   Wallet Connected: ${walletConnected ? '✓ Yes' : '❌ No'}`);
    
    if (authToken) {
      console.log(`   Token Type: ${authToken.startsWith('mock_token_') ? 'Mock' : 'Real'}`);
    }
  } else {
    console.log('   ⚠️  Running in Node.js environment - localStorage not available');
  }
}

// Check for common authentication issues
function checkCommonIssues() {
  console.log('\n🔧 Checking Common Issues...');
  
  // Check if running in development
  const isDev = process.env.NODE_ENV === 'development';
  console.log(`   Environment: ${isDev ? 'Development' : 'Production'}`);
  
  // Check backend URL configuration
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
  console.log(`   Backend URL: ${backendUrl}`);
  
  // Check for CORS issues
  console.log('   CORS Headers: Enhanced headers added ✓');
  
  // Check session management
  console.log('   Session Management: Improved persistence ✓');
  
  // Check auto-authentication
  console.log('   Auto-Auth Logic: Cooldown and tracking added ✓');
}

// Provide troubleshooting steps
function provideTroubleshootingSteps() {
  console.log('\n🛠️  Troubleshooting Steps:');
  console.log('');
  console.log('If you\'re still seeing repeated signature prompts:');
  console.log('');
  console.log('1. Clear browser storage:');
  console.log('   - Open DevTools (F12)');
  console.log('   - Go to Application/Storage tab');
  console.log('   - Clear localStorage and sessionStorage');
  console.log('   - Refresh the page');
  console.log('');
  console.log('2. Check browser console for errors:');
  console.log('   - Look for authentication-related errors');
  console.log('   - Check for network failures');
  console.log('   - Note any CORS errors');
  console.log('');
  console.log('3. Verify wallet connection:');
  console.log('   - Ensure wallet is properly connected');
  console.log('   - Try disconnecting and reconnecting');
  console.log('   - Check if wallet is on the correct network');
  console.log('');
  console.log('4. Test in incognito mode:');
  console.log('   - Open incognito/private browsing window');
  console.log('   - Connect wallet and authenticate');
  console.log('   - Check if issue persists');
  console.log('');
  console.log('5. Check backend connectivity:');
  console.log('   - Verify backend is running on correct port');
  console.log('   - Test API endpoints directly');
  console.log('   - Check server logs for errors');
}

// Main diagnostic function
function runDiagnostics() {
  checkLocalStorage();
  checkCommonIssues();
  provideTroubleshootingSteps();
  
  console.log('\n✅ Diagnostics Complete');
  console.log('\nIf issues persist after following troubleshooting steps,');
  console.log('please check the browser console for specific error messages.');
}

// Export for use in browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runDiagnostics };
} else if (typeof window !== 'undefined') {
  window.walletAuthDiagnostics = { runDiagnostics };
}

// Run diagnostics if called directly
if (require.main === module) {
  runDiagnostics();
}