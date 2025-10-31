// Simple test script to check wallet connection
console.log('Testing wallet connection...');

// Check if MetaMask is installed
if (typeof window.ethereum !== 'undefined') {
  console.log('MetaMask is installed!');
  
  // Check if it's specifically MetaMask
  if (window.ethereum.isMetaMask) {
    console.log('MetaMask is the injected provider');
  } else {
    console.log('Another wallet is injected');
  }
  
  // Try to get accounts (this will trigger connection prompt)
  window.ethereum.request({ method: 'eth_accounts' })
    .then(accounts => {
      if (accounts.length > 0) {
        console.log('Connected account:', accounts[0]);
      } else {
        console.log('No accounts connected');
      }
    })
    .catch(error => {
      console.error('Error getting accounts:', error);
    });
} else {
  console.log('MetaMask is not installed');
}