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
      'Using local/default values'
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
      'TypeError: fetch failed'
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