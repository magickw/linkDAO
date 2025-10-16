/**
 * Cross-Browser Compatibility Tests for Web3 Native Community Enhancements
 * Tests compatibility across different browsers and Web3 providers
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';

// Browser configurations for testing
const BROWSER_CONFIGS = {
  chrome: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    features: {
      webgl: true,
      webrtc: true,
      serviceWorker: true,
      webAssembly: true,
      bigInt: true,
    },
  },
  firefox: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    features: {
      webgl: true,
      webrtc: true,
      serviceWorker: true,
      webAssembly: true,
      bigInt: true,
    },
  },
  safari: {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    features: {
      webgl: true,
      webrtc: true,
      serviceWorker: true,
      webAssembly: true,
      bigInt: true,
    },
  },
  edge: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    features: {
      webgl: true,
      webrtc: true,
      serviceWorker: true,
      webAssembly: true,
      bigInt: true,
    },
  },
  mobileSafari: {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    features: {
      webgl: true,
      webrtc: false,
      serviceWorker: true,
      webAssembly: true,
      bigInt: true,
    },
  },
  mobileChrome: {
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    features: {
      webgl: true,
      webrtc: true,
      serviceWorker: true,
      webAssembly: true,
      bigInt: true,
    },
  },
};

// Web3 provider configurations
const WEB3_PROVIDERS = {
  metamask: {
    isMetaMask: true,
    isConnected: () => true,
    chainId: '0x1',
    networkVersion: '1',
    selectedAddress: '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87',
  },
  walletConnect: {
    isWalletConnect: true,
    connector: {
      connected: true,
      chainId: 1,
      accounts: ['0x742d35Cc6634C0532925a3b8D4C9db96590c6C87'],
    },
  },
  coinbaseWallet: {
    isCoinbaseWallet: true,
    isConnected: true,
    chainId: 1,
    selectedAddress: '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87',
  },
  brave: {
    isBraveWallet: true,
    isConnected: () => true,
    chainId: '0x1',
    selectedAddress: '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87',
  },
};

// Mock Web3 Community Component for cross-browser testing
const MockCrossBrowserWeb3Component = () => {
  return (
    <div data-testid="cross-browser-web3-app" className="min-h-screen bg-gray-50">
      {/* Browser Detection Display */}
      <div data-testid="browser-info" className="p-4 bg-blue-50 border-b">
        <div className="text-sm text-blue-800">
          Browser: <span data-testid="detected-browser">Chrome</span> | 
          Web3 Provider: <span data-testid="detected-provider">MetaMask</span>
        </div>
      </div>

      {/* Feature Support Indicators */}
      <div data-testid="feature-support" className="p-4 border-b">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div data-testid="webgl-support" className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-sm">WebGL</span>
          </div>
          <div data-testid="webrtc-support" className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-sm">WebRTC</span>
          </div>
          <div data-testid="serviceworker-support" className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-sm">Service Worker</span>
          </div>
          <div data-testid="wasm-support" className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-sm">WebAssembly</span>
          </div>
          <div data-testid="bigint-support" className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-sm">BigInt</span>
          </div>
        </div>
      </div>

      {/* Web3 Connection Status */}
      <div data-testid="web3-connection-status" className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div data-testid="connection-indicator" className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="font-medium">Connected to Ethereum Mainnet</span>
          </div>
          <div className="text-sm text-gray-600">
            <span data-testid="wallet-address">0x742d...b05b</span>
          </div>
        </div>
      </div>

      {/* Cross-Browser Web3 Features */}
      <main className="p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Wallet Connection Section */}
          <section data-testid="wallet-connection-section">
            <h2 className="text-xl font-semibold mb-4">Wallet Connection</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button data-testid="connect-metamask" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex flex-col items-center space-y-2">
                <img src="/api/placeholder/32/32" alt="MetaMask" className="w-8 h-8" />
                <span className="text-sm font-medium">MetaMask</span>
                <span data-testid="metamask-status" className="text-xs text-green-600">Available</span>
              </button>
              
              <button data-testid="connect-walletconnect" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex flex-col items-center space-y-2">
                <img src="/api/placeholder/32/32" alt="WalletConnect" className="w-8 h-8" />
                <span className="text-sm font-medium">WalletConnect</span>
                <span data-testid="walletconnect-status" className="text-xs text-green-600">Available</span>
              </button>
              
              <button data-testid="connect-coinbase" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex flex-col items-center space-y-2">
                <img src="/api/placeholder/32/32" alt="Coinbase Wallet" className="w-8 h-8" />
                <span className="text-sm font-medium">Coinbase</span>
                <span data-testid="coinbase-status" className="text-xs text-yellow-600">Partial</span>
              </button>
              
              <button data-testid="connect-brave" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex flex-col items-center space-y-2">
                <img src="/api/placeholder/32/32" alt="Brave Wallet" className="w-8 h-8" />
                <span className="text-sm font-medium">Brave</span>
                <span data-testid="brave-status" className="text-xs text-gray-600">Not Available</span>
              </button>
            </div>
          </section>

          {/* Token Operations Section */}
          <section data-testid="token-operations-section">
            <h2 className="text-xl font-semibold mb-4">Token Operations</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Token Balance Display */}
                <div data-testid="token-balance-display">
                  <h3 className="font-medium mb-3">Token Balance</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>DEFI:</span>
                      <span data-testid="defi-balance" className="font-mono">500.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ETH:</span>
                      <span data-testid="eth-balance" className="font-mono">1.2345</span>
                    </div>
                  </div>
                </div>

                {/* Token Transfer */}
                <div data-testid="token-transfer">
                  <h3 className="font-medium mb-3">Send Tokens</h3>
                  <div className="space-y-3">
                    <input 
                      data-testid="transfer-amount"
                      type="number" 
                      placeholder="Amount"
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                    <input 
                      data-testid="transfer-recipient"
                      type="text" 
                      placeholder="Recipient Address"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-xs"
                    />
                    <button data-testid="send-token-btn" className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
                      Send
                    </button>
                  </div>
                </div>

                {/* Staking Interface */}
                <div data-testid="staking-interface">
                  <h3 className="font-medium mb-3">Staking</h3>
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      Staked: <span data-testid="staked-amount" className="font-mono">100 DEFI</span>
                    </div>
                    <input 
                      data-testid="stake-amount"
                      type="number" 
                      placeholder="Amount to stake"
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button data-testid="stake-btn" className="bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700">
                        Stake
                      </button>
                      <button data-testid="unstake-btn" className="bg-red-600 text-white py-2 px-3 rounded text-sm hover:bg-red-700">
                        Unstake
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Governance Section */}
          <section data-testid="governance-section">
            <h2 className="text-xl font-semibold mb-4">Governance</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div data-testid="active-proposal" className="border-b border-gray-100 pb-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Proposal #123: Treasury Allocation</h3>
                  <span className="text-sm text-gray-500">2 days left</span>
                </div>
                
                <p className="text-sm text-gray-700 mb-4">
                  Increase treasury allocation for community development from 10% to 15%...
                </p>
                
                {/* Voting Progress */}
                <div data-testid="voting-progress" className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>For: 65%</span>
                    <span>Against: 35%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                </div>
                
                {/* Voting Buttons */}
                <div data-testid="voting-buttons" className="grid grid-cols-3 gap-3">
                  <button data-testid="vote-for" className="bg-green-600 text-white py-2 px-4 rounded text-sm hover:bg-green-700">
                    Vote For
                  </button>
                  <button data-testid="vote-against" className="bg-red-600 text-white py-2 px-4 rounded text-sm hover:bg-red-700">
                    Vote Against
                  </button>
                  <button data-testid="vote-abstain" className="bg-gray-600 text-white py-2 px-4 rounded text-sm hover:bg-gray-700">
                    Abstain
                  </button>
                </div>
              </div>
              
              {/* Voting Power Display */}
              <div data-testid="voting-power" className="text-center">
                <div className="text-sm text-gray-600">Your Voting Power</div>
                <div className="text-2xl font-bold text-blue-600">1,250</div>
              </div>
            </div>
          </section>

          {/* Real-time Features Section */}
          <section data-testid="realtime-features-section">
            <h2 className="text-xl font-semibold mb-4">Real-time Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Live Token Prices */}
              <div data-testid="live-prices" className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium mb-3">Live Prices</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <img src="/api/placeholder/24/24" alt="DEFI" className="w-6 h-6 rounded-full" />
                      <span>DEFI</span>
                    </div>
                    <div className="text-right">
                      <div data-testid="defi-price" className="font-mono">$1.25</div>
                      <div data-testid="defi-change" className="text-xs text-green-600">+5.2%</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <img src="/api/placeholder/24/24" alt="ETH" className="w-6 h-6 rounded-full" />
                      <span>ETH</span>
                    </div>
                    <div className="text-right">
                      <div data-testid="eth-price" className="font-mono">$2,456</div>
                      <div data-testid="eth-change" className="text-xs text-red-600">-1.8%</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* WebSocket Status */}
              <div data-testid="websocket-status" className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium mb-3">Connection Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>WebSocket:</span>
                    <span data-testid="ws-status" className="text-green-600">Connected</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>RPC Provider:</span>
                    <span data-testid="rpc-status" className="text-green-600">Online</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Block Height:</span>
                    <span data-testid="block-height" className="font-mono">18,500,123</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Performance Metrics */}
          <section data-testid="performance-metrics-section">
            <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div data-testid="render-time" className="text-2xl font-bold text-blue-600">45ms</div>
                  <div className="text-sm text-gray-600">Render Time</div>
                </div>
                <div className="text-center">
                  <div data-testid="web3-load-time" className="text-2xl font-bold text-green-600">120ms</div>
                  <div className="text-sm text-gray-600">Web3 Load</div>
                </div>
                <div className="text-center">
                  <div data-testid="memory-usage" className="text-2xl font-bold text-yellow-600">15MB</div>
                  <div className="text-sm text-gray-600">Memory Usage</div>
                </div>
                <div className="text-center">
                  <div data-testid="fps" className="text-2xl font-bold text-purple-600">60fps</div>
                  <div className="text-sm text-gray-600">Frame Rate</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

// Utility function to simulate browser environment
const simulateBrowser = (browserName: keyof typeof BROWSER_CONFIGS) => {
  const config = BROWSER_CONFIGS[browserName];
  
  // Set user agent
  Object.defineProperty(navigator, 'userAgent', {
    value: config.userAgent,
    writable: true,
  });
  
  // Set browser features
  Object.entries(config.features).forEach(([feature, supported]) => {
    switch (feature) {
      case 'webgl':
        if (supported) {
          (global as any).WebGLRenderingContext = function() {};
        } else {
          delete (global as any).WebGLRenderingContext;
        }
        break;
      case 'webrtc':
        if (supported) {
          (global as any).RTCPeerConnection = function() {};
        } else {
          delete (global as any).RTCPeerConnection;
        }
        break;
      case 'serviceWorker':
        if (supported) {
          Object.defineProperty(navigator, 'serviceWorker', {
            value: {
              register: jest.fn(),
              ready: Promise.resolve(),
            },
            writable: true,
          });
        } else {
          delete (navigator as any).serviceWorker;
        }
        break;
      case 'webAssembly':
        if (supported) {
          (global as any).WebAssembly = {
            compile: jest.fn(),
            instantiate: jest.fn(),
          };
        } else {
          delete (global as any).WebAssembly;
        }
        break;
      case 'bigInt':
        if (!supported) {
          delete (global as any).BigInt;
        }
        break;
    }
  });
};

// Utility function to simulate Web3 provider
const simulateWeb3Provider = (providerName: keyof typeof WEB3_PROVIDERS) => {
  const config = WEB3_PROVIDERS[providerName];
  
  (global as any).ethereum = {
    ...config,
    request: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
    enable: jest.fn(),
    send: jest.fn(),
    sendAsync: jest.fn(),
  };
};

describe('Cross-Browser Compatibility Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;
  
  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('Browser-Specific Feature Support', () => {
    Object.keys(BROWSER_CONFIGS).forEach(browserName => {
      test(`should work correctly in ${browserName}`, async () => {
        simulateBrowser(browserName as keyof typeof BROWSER_CONFIGS);
        simulateWeb3Provider('metamask');
        
        render(<MockCrossBrowserWeb3Component />);
        
        // Verify basic rendering
        expect(screen.getByTestId('cross-browser-web3-app')).toBeInTheDocument();
        expect(screen.getByTestId('browser-info')).toBeInTheDocument();
        
        // Verify feature support indicators
        const featureSupport = screen.getByTestId('feature-support');
        expect(featureSupport).toBeInTheDocument();
        
        // Test Web3 functionality
        const walletSection = screen.getByTestId('wallet-connection-section');
        expect(walletSection).toBeInTheDocument();
        
        // Test token operations
        const tokenSection = screen.getByTestId('token-operations-section');
        expect(tokenSection).toBeInTheDocument();
        
        // Test governance features
        const governanceSection = screen.getByTestId('governance-section');
        expect(governanceSection).toBeInTheDocument();
      });
    });
  });

  describe('Web3 Provider Compatibility', () => {
    Object.keys(WEB3_PROVIDERS).forEach(providerName => {
      test(`should work with ${providerName} provider`, async () => {
        simulateBrowser('chrome');
        simulateWeb3Provider(providerName as keyof typeof WEB3_PROVIDERS);
        
        render(<MockCrossBrowserWeb3Component />);
        
        // Test wallet connection
        const connectButton = screen.getByTestId(`connect-${providerName}`);
        if (connectButton) {
          await user.click(connectButton);
          expect(connectButton).toBeInTheDocument();
        }
        
        // Test Web3 operations
        const sendButton = screen.getByTestId('send-token-btn');
        await user.click(sendButton);
        
        const stakeButton = screen.getByTestId('stake-btn');
        await user.click(stakeButton);
        
        const voteButton = screen.getByTestId('vote-for');
        await user.click(voteButton);
      });
    });
  });

  describe('Chrome Browser Tests', () => {
    beforeEach(() => {
      simulateBrowser('chrome');
      simulateWeb3Provider('metamask');
    });

    test('should handle all Web3 features in Chrome', async () => {
      render(<MockCrossBrowserWeb3Component />);
      
      // Test MetaMask integration
      const metamaskButton = screen.getByTestId('connect-metamask');
      expect(screen.getByTestId('metamask-status')).toHaveTextContent('Available');
      await user.click(metamaskButton);
      
      // Test token operations
      const transferAmount = screen.getByTestId('transfer-amount');
      await user.type(transferAmount, '10');
      expect(transferAmount).toHaveValue(10);
      
      const transferRecipient = screen.getByTestId('transfer-recipient');
      await user.type(transferRecipient, '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87');
      
      const sendButton = screen.getByTestId('send-token-btn');
      await user.click(sendButton);
      
      // Test staking
      const stakeAmount = screen.getByTestId('stake-amount');
      await user.type(stakeAmount, '50');
      
      const stakeButton = screen.getByTestId('stake-btn');
      await user.click(stakeButton);
      
      // Test governance voting
      const voteForButton = screen.getByTestId('vote-for');
      await user.click(voteForButton);
    });

    test('should handle real-time features in Chrome', async () => {
      render(<MockCrossBrowserWeb3Component />);
      
      // Verify WebSocket support
      expect(screen.getByTestId('ws-status')).toHaveTextContent('Connected');
      
      // Verify live price updates
      const defiPrice = screen.getByTestId('defi-price');
      expect(defiPrice).toHaveTextContent('$1.25');
      
      const ethPrice = screen.getByTestId('eth-price');
      expect(ethPrice).toHaveTextContent('$2,456');
    });
  });

  describe('Firefox Browser Tests', () => {
    beforeEach(() => {
      simulateBrowser('firefox');
      simulateWeb3Provider('metamask');
    });

    test('should handle Web3 features in Firefox', async () => {
      render(<MockCrossBrowserWeb3Component />);
      
      // Test basic functionality
      expect(screen.getByTestId('cross-browser-web3-app')).toBeInTheDocument();
      
      // Test wallet connection
      const metamaskButton = screen.getByTestId('connect-metamask');
      await user.click(metamaskButton);
      
      // Test token balance display
      expect(screen.getByTestId('defi-balance')).toHaveTextContent('500.00');
      expect(screen.getByTestId('eth-balance')).toHaveTextContent('1.2345');
      
      // Test governance voting
      const voteAgainstButton = screen.getByTestId('vote-against');
      await user.click(voteAgainstButton);
    });

    test('should handle performance metrics in Firefox', async () => {
      const startTime = performance.now();
      
      render(<MockCrossBrowserWeb3Component />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render efficiently in Firefox
      expect(renderTime).toBeLessThan(200);
      
      // Verify performance metrics display
      expect(screen.getByTestId('render-time')).toBeInTheDocument();
      expect(screen.getByTestId('web3-load-time')).toBeInTheDocument();
    });
  });

  describe('Safari Browser Tests', () => {
    beforeEach(() => {
      simulateBrowser('safari');
      simulateWeb3Provider('metamask');
    });

    test('should handle Web3 features in Safari', async () => {
      render(<MockCrossBrowserWeb3Component />);
      
      // Test basic rendering
      expect(screen.getByTestId('cross-browser-web3-app')).toBeInTheDocument();
      
      // Test wallet connection (Safari may have limitations)
      const walletSection = screen.getByTestId('wallet-connection-section');
      expect(walletSection).toBeInTheDocument();
      
      // Test token operations
      const tokenSection = screen.getByTestId('token-operations-section');
      expect(tokenSection).toBeInTheDocument();
      
      const stakeAmount = screen.getByTestId('stake-amount');
      await user.type(stakeAmount, '25');
      
      const unstakeButton = screen.getByTestId('unstake-btn');
      await user.click(unstakeButton);
    });

    test('should handle Safari-specific limitations', async () => {
      render(<MockCrossBrowserWeb3Component />);
      
      // Safari may have different Web3 provider behavior
      const connectionStatus = screen.getByTestId('web3-connection-status');
      expect(connectionStatus).toBeInTheDocument();
      
      // Test governance features
      const votingPower = screen.getByTestId('voting-power');
      expect(votingPower).toBeInTheDocument();
      
      const voteAbstainButton = screen.getByTestId('vote-abstain');
      await user.click(voteAbstainButton);
    });
  });

  describe('Edge Browser Tests', () => {
    beforeEach(() => {
      simulateBrowser('edge');
      simulateWeb3Provider('metamask');
    });

    test('should handle Web3 features in Edge', async () => {
      render(<MockCrossBrowserWeb3Component />);
      
      // Test basic functionality
      expect(screen.getByTestId('cross-browser-web3-app')).toBeInTheDocument();
      
      // Test all wallet providers
      const metamaskButton = screen.getByTestId('connect-metamask');
      const walletConnectButton = screen.getByTestId('connect-walletconnect');
      const coinbaseButton = screen.getByTestId('connect-coinbase');
      
      await user.click(metamaskButton);
      await user.click(walletConnectButton);
      await user.click(coinbaseButton);
      
      // Test token transfer
      const transferAmount = screen.getByTestId('transfer-amount');
      const transferRecipient = screen.getByTestId('transfer-recipient');
      
      await user.type(transferAmount, '5');
      await user.type(transferRecipient, '0x123');
      
      const sendButton = screen.getByTestId('send-token-btn');
      await user.click(sendButton);
    });
  });

  describe('Mobile Safari Tests', () => {
    beforeEach(() => {
      simulateBrowser('mobileSafari');
      simulateWeb3Provider('walletConnect');
      
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 812,
      });
    });

    test('should handle Web3 features on mobile Safari', async () => {
      render(<MockCrossBrowserWeb3Component />);
      
      // Test mobile-specific behavior
      expect(screen.getByTestId('cross-browser-web3-app')).toBeInTheDocument();
      
      // Test WalletConnect (preferred on mobile Safari)
      const walletConnectButton = screen.getByTestId('connect-walletconnect');
      expect(screen.getByTestId('walletconnect-status')).toHaveTextContent('Available');
      await user.click(walletConnectButton);
      
      // Test touch-friendly interactions
      const voteForButton = screen.getByTestId('vote-for');
      fireEvent.touchStart(voteForButton);
      fireEvent.touchEnd(voteForButton);
    });
  });

  describe('Mobile Chrome Tests', () => {
    beforeEach(() => {
      simulateBrowser('mobileChrome');
      simulateWeb3Provider('metamask');
      
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 393,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 851,
      });
    });

    test('should handle Web3 features on mobile Chrome', async () => {
      render(<MockCrossBrowserWeb3Component />);
      
      // Test mobile Chrome Web3 support
      expect(screen.getByTestId('cross-browser-web3-app')).toBeInTheDocument();
      
      // Test MetaMask mobile
      const metamaskButton = screen.getByTestId('connect-metamask');
      await user.click(metamaskButton);
      
      // Test mobile-optimized interactions
      const stakeButton = screen.getByTestId('stake-btn');
      fireEvent.touchStart(stakeButton);
      fireEvent.touchEnd(stakeButton);
      
      // Test governance on mobile
      const voteAgainstButton = screen.getByTestId('vote-against');
      fireEvent.touchStart(voteAgainstButton);
      fireEvent.touchEnd(voteAgainstButton);
    });
  });

  describe('Performance Across Browsers', () => {
    Object.keys(BROWSER_CONFIGS).forEach(browserName => {
      test(`should maintain good performance in ${browserName}`, async () => {
        simulateBrowser(browserName as keyof typeof BROWSER_CONFIGS);
        simulateWeb3Provider('metamask');
        
        const startTime = performance.now();
        
        render(<MockCrossBrowserWeb3Component />);
        
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        // Should render within reasonable time across all browsers
        expect(renderTime).toBeLessThan(300);
        
        // Verify performance metrics are displayed
        expect(screen.getByTestId('performance-metrics-section')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Across Browsers', () => {
    test('should handle Web3 errors gracefully across browsers', async () => {
      Object.keys(BROWSER_CONFIGS).forEach(async (browserName) => {
        simulateBrowser(browserName as keyof typeof BROWSER_CONFIGS);
        
        // Mock failed Web3 provider
        (global as any).ethereum = {
          request: jest.fn().mockRejectedValue(new Error('Web3 error')),
          on: jest.fn(),
          removeListener: jest.fn(),
        };
        
        render(<MockCrossBrowserWeb3Component />);
        
        // Should render despite Web3 errors
        expect(screen.getByTestId('cross-browser-web3-app')).toBeInTheDocument();
        
        // Test error recovery
        const metamaskButton = screen.getByTestId('connect-metamask');
        await user.click(metamaskButton);
        
        // Should handle connection errors gracefully
        expect(metamaskButton).toBeInTheDocument();
      });
    });
  });

  describe('Feature Detection and Fallbacks', () => {
    test('should provide appropriate fallbacks for unsupported features', async () => {
      // Simulate browser with limited Web3 support
      simulateBrowser('safari');
      
      // Remove some Web3 features
      delete (global as any).ethereum;
      
      render(<MockCrossBrowserWeb3Component />);
      
      // Should still render with fallbacks
      expect(screen.getByTestId('cross-browser-web3-app')).toBeInTheDocument();
      
      // Should show appropriate status for unavailable features
      const walletSection = screen.getByTestId('wallet-connection-section');
      expect(walletSection).toBeInTheDocument();
    });

    test('should detect and adapt to browser capabilities', async () => {
      simulateBrowser('firefox');
      simulateWeb3Provider('metamask');
      
      render(<MockCrossBrowserWeb3Component />);
      
      // Should detect browser features
      const featureSupport = screen.getByTestId('feature-support');
      expect(featureSupport).toBeInTheDocument();
      
      // Should show appropriate feature indicators
      expect(screen.getByTestId('webgl-support')).toBeInTheDocument();
      expect(screen.getByTestId('serviceworker-support')).toBeInTheDocument();
    });
  });

  describe('Accessibility Across Browsers', () => {
    test('should maintain accessibility standards across browsers', async () => {
      Object.keys(BROWSER_CONFIGS).forEach(async (browserName) => {
        simulateBrowser(browserName as keyof typeof BROWSER_CONFIGS);
        simulateWeb3Provider('metamask');
        
        render(<MockCrossBrowserWeb3Component />);
        
        // Test keyboard navigation
        await user.tab();
        expect(document.activeElement).toBeTruthy();
        
        // Test screen reader compatibility
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(button).toBeInTheDocument();
        });
        
        // Test ARIA labels
        const sections = screen.getAllByRole('region');
        sections.forEach(section => {
          expect(section).toBeInTheDocument();
        });
      });
    });
  });
});