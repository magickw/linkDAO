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
      'JsonRpcProvider failed to detect network',
      'Request failed, not caching error response',
      // WebSocket errors
      'WebSocket connection to',
      'WebSocket connection failed',
      'WebSocket connection timeout',
      'WebSocket is closed before the connection is established',
      'transport close',
      'websocket error',
      'Socket.IO error',
      'Socket.IO disconnected',
      // Backend 503 errors (service unavailable)
      'Failed to load resource: the server responded with a status of 503',
      'api.linkdao.io/api/communities/my-communities',
      'api.linkdao.io/health',
      'api.linkdao.io/api/products',
      'api.linkdao.io/communities/',
      // Backend 404 errors (not found)
      'Failed to load resource: the server responded with a status of 404',
      '/_next/data/',
      '/blog.json',
      // Backend 400 errors (bad request - often from expired filters)
      'Failed to load resource: the server responded with a status of 400',
      '@app/contracts/artifacts/contracts/BurnToDonate.sol/BurnToDonate.dbg.json',
      'filter not found',
      'eth_getFilterChanges',
      // Proxy errors
      'Failed to create Mainnet provider: Error: server response 405',
      '/api/proxy/rpc?target=',
      // ENS resolution errors
      'Failed to resolve ENS name',
      'Resolution failed',
      // Network offline errors
      '[UnifiedMessaging] Network offline',
      // Reconnection errors
      'WebSocket reconnecting',
      'WebSocket reconnection failed',
      'Switching to polling mode',
      // Service worker cache errors
      'Cache first strategy failed',
      'Cache operation failed',
      // Request pending warnings
      'Request already pending, waiting for result',
      'coingecko_prices_ethereum',
      // DEX discovery status
      'DEX discovery is disabled',
      // Polling fallback messages
      'Starting polling fallback mode',
      'Stopped polling fallback mode'
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