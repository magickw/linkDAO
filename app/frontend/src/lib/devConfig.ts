// Development configuration to suppress non-critical warnings
export const setupDevEnvironment = () => {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
    return;
  }

  // Suppress WalletConnect/Reown warnings in development
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    
    // Suppress specific WalletConnect/Reown warnings
    const suppressedWarnings = [
      'Failed to fetch remote project configuration',
      'api.web3modal.org',
      'Reown Config',
      'getaddrinfo ENOTFOUND api.web3modal.org',
      'Using local/default values',
      'WalletConnect Core is already initialized',
      'Init() was called 2 times',
      'Unchecked runtime.lastError',
      'Cannot create item with duplicate id',
      'Cannot find menu item with id',
      'LastPass',
      'Add Item',
      'Add Password',
      'Add Address',
      'Add Payment Card',
      'Add other item',
      'Save all entered data',
      'Generate Secure Password',
      'separator',
      'Fill',
      'Edit',
      'Copy username',
      'Copy password'
    ];

    if (suppressedWarnings.some(warning => message.includes(warning))) {
      return; // Don't log these warnings
    }

    originalConsoleWarn.apply(console, args);
  };

  console.error = (...args: any[]) => {
    const message = args.join(' ');
    
    // Suppress specific network errors that are non-critical in development
    const suppressedErrors = [
      'fetch failed',
      'ENOTFOUND api.web3modal.org',
      'TypeError: fetch failed',
      'read ECONNRESET',
      'ECONNRESET',
      'Contract Treasury not found in registry or fallback',
      'filter not found',
      'eth_getFilterChanges',
      'Failed to create Mainnet provider',
      'unsupported protocol',
      'JsonRpcProvider failed to detect network and cannot start up',
      'Request failed, not caching error response',
      'Failed to parse payment requirements',
      'Failed to connect to x402 checkout endpoint',
      'Failed to get token info: Smart contract interaction failed',
      'MetaMask - RPC Error: Internal JSON-RPC error',
      'Rate limit exceeded for CoinGecko ETH',
      'No gas price API keys configured',
      'Payment method prioritization failed',
      'Request already pending, waiting for result',
      'Request failed with status 404',
      'Authentication failed (401)',
      'Request failed with status 403',
      'api.linkdao.io/api/products',
      'api.linkdao.io/api/user/addresses',
      'api.linkdao.io/api/user/payment-methods',
      'api.linkdao.io/api/x402/checkout'
    ];

    if (suppressedErrors.some(error => message.includes(error))) {
      // Log as info instead of error for these cases
      console.info('🔧 Development Info:', ...args);
      return;
    }

    originalConsoleError.apply(console, args);
  };

  // Add development info
  console.info('🚀 LinkDAO Development Mode Active');
  console.info('📡 WalletConnect warnings suppressed for better development experience');
};

// Auto-setup when imported
if (typeof window !== 'undefined') {
  setupDevEnvironment();
}