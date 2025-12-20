/**
 * Test script to verify wallet connection state persistence
 * Run this in the browser console after connecting a wallet
 */

// Test 1: Check if wagmi storage is configured correctly
function testWagmiStorage() {
  console.log('=== Testing Wagmi Storage Configuration ===');
  
  // Check if wagmi storage exists in localStorage
  const wagmiStorage = localStorage.getItem('linkdao-wallet-storage');
  if (wagmiStorage) {
    console.log('✅ Wagmi storage found in localStorage');
    try {
      const parsed = JSON.parse(wagmiStorage);
      console.log('✅ Wagmi storage is valid JSON');
      console.log('Storage keys:', Object.keys(parsed.state));
    } catch (e) {
      console.error('❌ Wagmi storage is not valid JSON:', e);
    }
  } else {
    console.log('⚠️ No wagmi storage found (wallet may not be connected)');
  }
}

// Test 2: Check if Web3Context persistence is working
function testWeb3ContextPersistence() {
  console.log('\n=== Testing Web3Context Persistence ===');
  
  const connected = localStorage.getItem('linkdao_wallet_connected');
  const address = localStorage.getItem('linkdao_wallet_address');
  const connector = localStorage.getItem('linkdao_wallet_connector');
  
  if (connected === 'true' && address && connector) {
    console.log('✅ Web3Context persistence data found');
    console.log('Connected:', connected);
    console.log('Address:', address.substring(0, 6) + '...' + address.substring(address.length - 4));
    console.log('Connector:', connector);
  } else {
    console.log('⚠️ Web3Context persistence data not found or incomplete');
  }
}

// Test 3: Simulate page reload by checking if data persists
function testPersistenceAcrossReload() {
  console.log('\n=== Testing Persistence Across Reload ===');
  
  // Save current state
  const beforeReload = {
    wagmiStorage: localStorage.getItem('linkdao-wallet-storage'),
    connected: localStorage.getItem('linkdao_wallet_connected'),
    address: localStorage.getItem('linkdao_wallet_address'),
    connector: localStorage.getItem('linkdao_wallet_connector')
  };
  
  console.log('Data before reload check:');
  console.log('- Wagmi storage exists:', !!beforeReload.wagmiStorage);
  console.log('- Connected flag:', beforeReload.connected);
  console.log('- Address exists:', !!beforeReload.address);
  console.log('- Connector exists:', !!beforeReload.connector);
  
  // Check if all required data is present
  const isComplete = beforeReload.wagmiStorage && 
                     beforeReload.connected === 'true' && 
                     beforeReload.address && 
                     beforeReload.connector;
  
  if (isComplete) {
    console.log('✅ All persistence data is present - should survive page reload');
  } else {
    console.log('⚠️ Some persistence data is missing - may not survive reload');
  }
}

// Test 4: Check if wallet connection is active in the current session
function testCurrentWalletState() {
  console.log('\n=== Testing Current Wallet State ===');
  
  // Try to access wagmi account state (if available)
  if (typeof window !== 'undefined' && window.ethereum) {
    window.ethereum.request({ method: 'eth_accounts' })
      .then(accounts => {
        if (accounts.length > 0) {
          console.log('✅ Wallet is connected in current session');
          console.log('Connected account:', accounts[0].substring(0, 6) + '...' + accounts[0].substring(accounts[0].length - 4));
        } else {
          console.log('⚠️ No accounts connected in current session');
        }
      })
      .catch(error => {
        console.error('❌ Error checking wallet state:', error);
      });
  } else {
    console.log('⚠️ No wallet provider detected');
  }
}

// Run all tests
function runAllTests() {
  console.log('🧪 Starting Wallet Persistence Tests\n');
  
  testWagmiStorage();
  testWeb3ContextPersistence();
  testPersistenceAcrossReload();
  testCurrentWalletState();
  
  console.log('\n🏁 Tests completed');
  console.log('\n💡 Instructions:');
  console.log('1. Connect your wallet in the app');
  console.log('2. Run these tests in the console');
  console.log('3. Navigate to a different page');
  console.log('4. Run tests again to verify persistence');
  console.log('5. Refresh the page and run tests once more');
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testWalletPersistence = {
    runAllTests,
    testWagmiStorage,
    testWeb3ContextPersistence,
    testPersistenceAcrossReload,
    testCurrentWalletState
  };
  
  // Auto-run tests if script is loaded directly
  if (window.location.pathname.includes('test-wallet-persistence')) {
    runAllTests();
  }
}