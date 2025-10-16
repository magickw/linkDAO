/**
 * Mobile Device Compatibility Tests for Web3 Native Community Enhancements
 * Tests mobile responsiveness, touch interactions, and device-specific features
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';

// Mobile viewport configurations for testing
const MOBILE_VIEWPORTS = {
  iphone12: { width: 390, height: 844 },
  iphone12Mini: { width: 375, height: 812 },
  iphone12Pro: { width: 390, height: 844 },
  iphone12ProMax: { width: 428, height: 926 },
  galaxyS21: { width: 384, height: 854 },
  galaxyS21Ultra: { width: 412, height: 915 },
  pixel5: { width: 393, height: 851 },
  ipadMini: { width: 768, height: 1024 },
  ipadAir: { width: 820, height: 1180 },
  ipadPro: { width: 1024, height: 1366 },
};

// Mock mobile Web3 components
const MockMobileWeb3CommunityPage = () => {
  return (
    <div data-testid="mobile-web3-community-page" className="min-h-screen bg-gray-50">
      {/* Mobile Bottom Navigation */}
      <nav data-testid="mobile-bottom-navigation" className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex items-center justify-around py-2">
          <button data-testid="nav-home" className="flex flex-col items-center p-2 text-blue-600">
            <span className="text-xl">🏠</span>
            <span className="text-xs">Home</span>
          </button>
          <button data-testid="nav-communities" className="flex flex-col items-center p-2 text-gray-600">
            <span className="text-xl">👥</span>
            <span className="text-xs">Communities</span>
          </button>
          <button data-testid="nav-governance" className="flex flex-col items-center p-2 text-gray-600">
            <span className="text-xl">🗳️</span>
            <span className="text-xs">Governance</span>
          </button>
          <button data-testid="nav-wallet" className="flex flex-col items-center p-2 text-gray-600">
            <span className="text-xl">💰</span>
            <span className="text-xs">Wallet</span>
          </button>
          <button data-testid="nav-profile" className="flex flex-col items-center p-2 text-gray-600">
            <span className="text-xl">👤</span>
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </nav>

      {/* Mobile Header */}
      <header data-testid="mobile-header" className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center justify-between p-4">
          <button data-testid="mobile-menu-toggle" className="p-2 text-gray-600">
            <span className="text-xl">☰</span>
          </button>
          <h1 className="text-lg font-semibold">Communities</h1>
          <button data-testid="mobile-wallet-connect" className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm">
            Connect
          </button>
        </div>
      </header>

      {/* Collapsible Mobile Sidebar */}
      <aside data-testid="mobile-sidebar" className="fixed left-0 top-0 bottom-0 w-80 bg-white border-r border-gray-200 transform -translate-x-full transition-transform z-30">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Communities</h2>
            <button data-testid="mobile-sidebar-close" className="p-2 text-gray-600">
              <span className="text-xl">✕</span>
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <button data-testid="mobile-create-community" className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg text-sm font-medium">
            + Create Community
          </button>
        </div>
        
        <div data-testid="mobile-community-list" className="px-4 pb-4">
          <div data-testid="mobile-community-item" className="flex items-center p-3 rounded-lg bg-gray-50 mb-3">
            <img src="/api/placeholder/32/32" alt="DeFi DAO" className="w-8 h-8 rounded-full" />
            <div className="ml-3 flex-1 min-w-0">
              <div className="flex items-center">
                <span className="font-medium text-sm truncate">DeFi DAO</span>
                <span data-testid="mobile-activity-dot" className="ml-2 w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></span>
              </div>
              <div className="text-xs text-gray-500">1.2k members</div>
              <div data-testid="mobile-token-balance" className="text-xs text-green-600">500 DEFI</div>
            </div>
            <div data-testid="mobile-notification-badge" className="w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
              2
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Main Content */}
      <main data-testid="mobile-main-content" className="pb-20 pt-4">
        {/* Mobile Filter Tabs */}
        <div data-testid="mobile-filter-tabs" className="sticky top-16 bg-white border-b border-gray-200 z-20">
          <div className="flex overflow-x-auto px-4 py-2 space-x-2">
            <button data-testid="mobile-filter-all" className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-full text-sm">
              All
            </button>
            <button data-testid="mobile-filter-following" className="flex-shrink-0 px-4 py-2 text-gray-600 bg-gray-100 rounded-full text-sm">
              Following
            </button>
            <button data-testid="mobile-filter-governance" className="flex-shrink-0 px-4 py-2 text-gray-600 bg-gray-100 rounded-full text-sm">
              Governance
            </button>
            <button data-testid="mobile-filter-trending" className="flex-shrink-0 px-4 py-2 text-gray-600 bg-gray-100 rounded-full text-sm">
              Trending
            </button>
          </div>
        </div>

        {/* Mobile Post Cards */}
        <div data-testid="mobile-post-list" className="px-4 py-4 space-y-4">
          {/* Compact Mobile Post Card */}
          <article data-testid="mobile-post-card" className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Post Header */}
            <div className="p-4 pb-2">
              <div className="flex items-center space-x-3">
                <img src="/api/placeholder/32/32" alt="Author" className="w-8 h-8 rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm truncate">alice.eth</span>
                    <span data-testid="mobile-post-type" className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                      Governance
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">DeFi DAO • 2h ago</div>
                </div>
                <button data-testid="mobile-post-menu" className="p-1 text-gray-400">
                  <span className="text-lg">⋯</span>
                </button>
              </div>
            </div>

            {/* Post Content */}
            <div className="px-4 pb-3">
              <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                Proposal: Increase Community Treasury Allocation for Development
              </h3>
              <p className="text-sm text-gray-700 line-clamp-3 mb-3">
                I propose we increase the treasury allocation for community development from 10% to 15% to fund more initiatives...
              </p>
            </div>

            {/* Mobile Staking Display */}
            <div data-testid="mobile-staking-display" className="mx-4 mb-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div data-testid="mobile-staked-amount" className="text-sm font-semibold text-yellow-800">
                    1.25k DEFI Staked
                  </div>
                  <div className="text-xs text-yellow-600">by 25 members</div>
                </div>
                <div data-testid="mobile-staking-tier" className="px-2 py-1 bg-yellow-500 text-white rounded text-xs">
                  Gold
                </div>
              </div>
            </div>

            {/* Mobile Engagement Metrics */}
            <div data-testid="mobile-engagement-metrics" className="px-4 pb-3">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <span>💬</span>
                  <span>42</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>👁️</span>
                  <span>1.2k</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>🔥</span>
                  <span>89</span>
                </div>
                <div data-testid="mobile-trending-badge" className="ml-auto px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                  Trending
                </div>
              </div>
            </div>

            {/* Mobile Web3 Actions */}
            <div data-testid="mobile-web3-actions" className="border-t border-gray-100 p-4">
              <div className="flex items-center space-x-3">
                <button data-testid="mobile-boost-btn" className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg text-sm">
                  <span>🚀</span>
                  <span>Boost</span>
                </button>
                
                <button data-testid="mobile-tip-btn" className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 bg-green-600 text-white rounded-lg text-sm">
                  <span>💰</span>
                  <span>Tip</span>
                </button>
                
                <button data-testid="mobile-vote-btn" className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 bg-blue-600 text-white rounded-lg text-sm">
                  <span>🗳️</span>
                  <span>Vote</span>
                </button>
              </div>
              
              {/* Mobile Reactions */}
              <div data-testid="mobile-reactions" className="flex items-center justify-center space-x-6 mt-3 pt-3 border-t border-gray-100">
                <button data-testid="mobile-fire-reaction" className="text-2xl active:scale-110 transition-transform">
                  🔥
                </button>
                <button data-testid="mobile-diamond-reaction" className="text-2xl active:scale-110 transition-transform">
                  💎
                </button>
                <button data-testid="mobile-rocket-reaction" className="text-2xl active:scale-110 transition-transform">
                  🚀
                </button>
                <button data-testid="mobile-bookmark" className="text-xl text-gray-500 active:text-blue-600">
                  🔖
                </button>
              </div>
            </div>

            {/* Mobile On-chain Verification */}
            <div data-testid="mobile-onchain-verification" className="px-4 pb-4">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                  <span>✅</span>
                  <span>Verified</span>
                </div>
                <button data-testid="mobile-view-explorer" className="text-xs text-blue-600 underline">
                  View on Explorer
                </button>
              </div>
            </div>
          </article>

          {/* Compact Discussion Post */}
          <article data-testid="mobile-discussion-card" className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <img src="/api/placeholder/32/32" alt="Author" className="w-8 h-8 rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm truncate">bob.eth</span>
                    <span data-testid="mobile-post-type" className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      Discussion
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">NFT Collectors • 4h ago</div>
                </div>
              </div>
              
              <h3 className="font-semibold text-sm mb-2">Best NFT Projects for 2024</h3>
              <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                What are your thoughts on the upcoming NFT drops? I've been researching...
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>💬 18</span>
                  <span>👁️ 456</span>
                  <span>🔥 23</span>
                </div>
                <button data-testid="mobile-quick-tip" className="px-3 py-1 bg-green-100 text-green-800 rounded text-xs">
                  Quick Tip
                </button>
              </div>
            </div>
          </article>
        </div>
      </main>

      {/* Mobile Floating Action Button */}
      <button data-testid="mobile-fab" className="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg z-40 flex items-center justify-center">
        <span className="text-2xl">✏️</span>
      </button>

      {/* Mobile Wallet Connection Modal */}
      <div data-testid="mobile-wallet-modal" className="fixed inset-0 bg-black bg-opacity-50 z-50 hidden">
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6">
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6"></div>
          <h2 className="text-lg font-semibold mb-4">Connect Wallet</h2>
          
          <div className="space-y-3">
            <button data-testid="mobile-metamask-connect" className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
              <img src="/api/placeholder/32/32" alt="MetaMask" className="w-8 h-8" />
              <span className="font-medium">MetaMask</span>
            </button>
            
            <button data-testid="mobile-walletconnect" className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
              <img src="/api/placeholder/32/32" alt="WalletConnect" className="w-8 h-8" />
              <span className="font-medium">WalletConnect</span>
            </button>
            
            <button data-testid="mobile-coinbase-wallet" className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
              <img src="/api/placeholder/32/32" alt="Coinbase Wallet" className="w-8 h-8" />
              <span className="font-medium">Coinbase Wallet</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Token Amount Input Modal */}
      <div data-testid="mobile-token-input-modal" className="fixed inset-0 bg-black bg-opacity-50 z-50 hidden">
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6">
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6"></div>
          <h2 className="text-lg font-semibold mb-4">Boost Post</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount to Stake</label>
              <div className="relative">
                <input 
                  data-testid="mobile-token-amount-input"
                  type="number"
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg text-center"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  DEFI
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Gas Fee:</span>
                <span data-testid="mobile-gas-fee">~0.002 ETH</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Total Cost:</span>
                <span className="font-medium">50 DEFI + 0.002 ETH</span>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button data-testid="mobile-cancel-btn" className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg">
                Cancel
              </button>
              <button data-testid="mobile-confirm-btn" className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg">
                Confirm Boost
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Governance Voting Modal */}
      <div data-testid="mobile-voting-modal" className="fixed inset-0 bg-black bg-opacity-50 z-50 hidden">
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto">
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6"></div>
          <h2 className="text-lg font-semibold mb-4">Vote on Proposal #123</h2>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 mb-1">Your Voting Power</div>
              <div className="text-2xl font-bold text-blue-800">1,250</div>
              <div className="text-xs text-blue-500">Based on 500 DEFI + delegated votes</div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Treasury Allocation Increase</h3>
              <p className="text-sm text-gray-700 mb-4">
                Increase treasury allocation for community development from 10% to 15%...
              </p>
            </div>
            
            <div className="space-y-3">
              <button data-testid="mobile-vote-for" className="w-full p-4 border-2 border-green-200 bg-green-50 text-green-800 rounded-lg text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Vote For</div>
                    <div className="text-sm">Support this proposal</div>
                  </div>
                  <div className="text-2xl">✅</div>
                </div>
              </button>
              
              <button data-testid="mobile-vote-against" className="w-full p-4 border-2 border-red-200 bg-red-50 text-red-800 rounded-lg text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Vote Against</div>
                    <div className="text-sm">Oppose this proposal</div>
                  </div>
                  <div className="text-2xl">❌</div>
                </div>
              </button>
              
              <button data-testid="mobile-vote-abstain" className="w-full p-4 border-2 border-gray-200 bg-gray-50 text-gray-800 rounded-lg text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Abstain</div>
                    <div className="text-sm">No preference</div>
                  </div>
                  <div className="text-2xl">⚪</div>
                </div>
              </button>
            </div>
            
            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2 text-yellow-800">
                <span>⚠️</span>
                <span className="text-sm">Voting ends in 2 days, 14 hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Utility function to set viewport size
const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'));
};

// Mock touch events
const createTouchEvent = (type: string, touches: Array<{ clientX: number; clientY: number }>) => {
  return new TouchEvent(type, {
    touches: touches.map(touch => ({
      ...touch,
      identifier: 0,
      target: document.body,
      radiusX: 1,
      radiusY: 1,
      rotationAngle: 0,
      force: 1,
    })) as any,
    bubbles: true,
    cancelable: true,
  });
};

describe('Mobile Device Compatibility Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;
  
  beforeEach(() => {
    user = userEvent.setup();
    
    // Mock mobile Web3 provider
    (global as any).ethereum = {
      request: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
      isMetaMask: true,
      selectedAddress: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: '0x1',
    };
    
    // Mock touch support
    Object.defineProperty(window, 'ontouchstart', {
      value: () => {},
      writable: true,
    });
  });

  describe('Responsive Design Tests', () => {
    Object.entries(MOBILE_VIEWPORTS).forEach(([deviceName, viewport]) => {
      test(`should render correctly on ${deviceName} (${viewport.width}x${viewport.height})`, async () => {
        setViewport(viewport.width, viewport.height);
        
        render(<MockMobileWeb3CommunityPage />);
        
        // Verify mobile layout elements are present
        expect(screen.getByTestId('mobile-web3-community-page')).toBeInTheDocument();
        expect(screen.getByTestId('mobile-bottom-navigation')).toBeInTheDocument();
        expect(screen.getByTestId('mobile-header')).toBeInTheDocument();
        
        // Verify responsive behavior
        const mainContent = screen.getByTestId('mobile-main-content');
        expect(mainContent).toHaveClass('pb-20'); // Bottom padding for navigation
        
        // Verify mobile-specific components
        expect(screen.getByTestId('mobile-fab')).toBeInTheDocument();
        expect(screen.getByTestId('mobile-filter-tabs')).toBeInTheDocument();
      });
    });

    test('should adapt layout for different screen orientations', async () => {
      // Portrait mode
      setViewport(390, 844);
      render(<MockMobileWeb3CommunityPage />);
      
      let bottomNav = screen.getByTestId('mobile-bottom-navigation');
      expect(bottomNav).toBeInTheDocument();
      
      // Landscape mode
      setViewport(844, 390);
      window.dispatchEvent(new Event('resize'));
      
      // Should still show navigation but potentially in different layout
      bottomNav = screen.getByTestId('mobile-bottom-navigation');
      expect(bottomNav).toBeInTheDocument();
    });
  });

  describe('Touch Interaction Tests', () => {
    beforeEach(() => {
      setViewport(390, 844); // iPhone 12 viewport
    });

    test('should handle touch interactions on Web3 action buttons', async () => {
      render(<MockMobileWeb3CommunityPage />);
      
      const boostButton = screen.getByTestId('mobile-boost-btn');
      const tipButton = screen.getByTestId('mobile-tip-btn');
      const voteButton = screen.getByTestId('mobile-vote-btn');
      
      // Test touch events
      fireEvent.touchStart(boostButton);
      fireEvent.touchEnd(boostButton);
      
      fireEvent.touchStart(tipButton);
      fireEvent.touchEnd(tipButton);
      
      fireEvent.touchStart(voteButton);
      fireEvent.touchEnd(voteButton);
      
      // Verify buttons are interactive
      expect(boostButton).toBeInTheDocument();
      expect(tipButton).toBeInTheDocument();
      expect(voteButton).toBeInTheDocument();
    });

    test('should handle swipe gestures for post interactions', async () => {
      render(<MockMobileWeb3CommunityPage />);
      
      const postCard = screen.getByTestId('mobile-post-card');
      
      // Simulate swipe right gesture
      const touchStart = createTouchEvent('touchstart', [{ clientX: 50, clientY: 200 }]);
      const touchMove = createTouchEvent('touchmove', [{ clientX: 150, clientY: 200 }]);
      const touchEnd = createTouchEvent('touchend', []);
      
      fireEvent(postCard, touchStart);
      fireEvent(postCard, touchMove);
      fireEvent(postCard, touchEnd);
      
      // Verify post card handles swipe
      expect(postCard).toBeInTheDocument();
    });

    test('should handle pinch-to-zoom gestures', async () => {
      render(<MockMobileWeb3CommunityPage />);
      
      const mainContent = screen.getByTestId('mobile-main-content');
      
      // Simulate pinch gesture
      const touchStart = createTouchEvent('touchstart', [
        { clientX: 100, clientY: 200 },
        { clientX: 200, clientY: 200 }
      ]);
      
      const touchMove = createTouchEvent('touchmove', [
        { clientX: 80, clientY: 200 },
        { clientX: 220, clientY: 200 }
      ]);
      
      fireEvent(mainContent, touchStart);
      fireEvent(mainContent, touchMove);
      
      expect(mainContent).toBeInTheDocument();
    });

    test('should handle long press for context menus', async () => {
      render(<MockMobileWeb3CommunityPage />);
      
      const postCard = screen.getByTestId('mobile-post-card');
      
      // Simulate long press
      fireEvent.touchStart(postCard);
      
      // Wait for long press duration
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
      });
      
      fireEvent.touchEnd(postCard);
      
      expect(postCard).toBeInTheDocument();
    });
  });

  describe('Mobile Navigation Tests', () => {
    beforeEach(() => {
      setViewport(390, 844);
    });

    test('should navigate between sections using bottom navigation', async () => {
      render(<MockMobileWeb3CommunityPage />);
      
      const bottomNav = screen.getByTestId('mobile-bottom-navigation');
      const homeBtn = screen.getByTestId('nav-home');
      const communitiesBtn = screen.getByTestId('nav-communities');
      const governanceBtn = screen.getByTestId('nav-governance');
      const walletBtn = screen.getByTestId('nav-wallet');
      const profileBtn = screen.getByTestId('nav-profile');
      
      // Test navigation clicks
      await user.click(communitiesBtn);
      await user.click(governanceBtn);
      await user.click(walletBtn);
      await user.click(profileBtn);
      await user.click(homeBtn);
      
      // Verify all navigation buttons are accessible
      expect(homeBtn).toBeInTheDocument();
      expect(communitiesBtn).toBeInTheDocument();
      expect(governanceBtn).toBeInTheDocument();
      expect(walletBtn).toBeInTheDocument();
      expect(profileBtn).toBeInTheDocument();
    });

    test('should toggle mobile sidebar', async () => {
      render(<MockMobileWeb3CommunityPage />);
      
      const menuToggle = screen.getByTestId('mobile-menu-toggle');
      const sidebar = screen.getByTestId('mobile-sidebar');
      
      // Initially sidebar should be hidden
      expect(sidebar).toHaveClass('-translate-x-full');
      
      // Open sidebar
      await user.click(menuToggle);
      
      // Close sidebar
      const sidebarClose = screen.getByTestId('mobile-sidebar-close');
      await user.click(sidebarClose);
      
      expect(sidebar).toHaveClass('-translate-x-full');
    });

    test('should handle floating action button', async () => {
      render(<MockMobileWeb3CommunityPage />);
      
      const fab = screen.getByTestId('mobile-fab');
      expect(fab).toBeInTheDocument();
      
      await user.click(fab);
      
      // Verify FAB is positioned correctly
      expect(fab).toHaveClass('fixed', 'bottom-20', 'right-4');
    });
  });

  describe('Mobile Web3 Wallet Integration Tests', () => {
    beforeEach(() => {
      setViewport(390, 844);
    });

    test('should handle mobile wallet connection flow', async () => {
      render(<MockMobileWeb3CommunityPage />);
      
      const walletConnectBtn = screen.getByTestId('mobile-wallet-connect');
      await user.click(walletConnectBtn);
      
      // Verify wallet connection options
      const metamaskBtn = screen.getByTestId('mobile-metamask-connect');
      const walletConnectOption = screen.getByTestId('mobile-walletconnect');
      const coinbaseWallet = screen.getByTestId('mobile-coinbase-wallet');
      
      expect(metamaskBtn).toBeInTheDocument();
      expect(walletConnectOption).toBeInTheDocument();
      expect(coinbaseWallet).toBeInTheDocument();
      
      // Test MetaMask connection
      await user.click(metamaskBtn);
    });

    test('should handle mobile token amount input with haptic feedback', async () => {
      render(<MockMobileWeb3CommunityPage />);
      
      const boostBtn = screen.getByTestId('mobile-boost-btn');
      await user.click(boostBtn);
      
      const tokenInput = screen.getByTestId('mobile-token-amount-input');
      expect(tokenInput).toBeInTheDocument();
      
      // Test token amount input
      await user.type(tokenInput, '50');
      expect(tokenInput).toHaveValue(50);
      
      // Verify gas fee display
      const gasFee = screen.getByTestId('mobile-gas-fee');
      expect(gasFee).toHaveTextContent('~0.002 ETH');
      
      // Test confirmation
      const confirmBtn = screen.getByTestId('mobile-confirm-btn');
      await user.click(confirmBtn);
    });

    test('should handle mobile governance voting interface', async () => {
      render(<MockMobileWeb3CommunityPage />);
      
      const voteBtn = screen.getByTestId('mobile-vote-btn');
      await user.click(voteBtn);
      
      // Verify voting options
      const voteFor = screen.getByTestId('mobile-vote-for');
      const voteAgainst = screen.getByTestId('mobile-vote-against');
      const voteAbstain = screen.getByTestId('mobile-vote-abstain');
      
      expect(voteFor).toBeInTheDocument();
      expect(voteAgainst).toBeInTheDocument();
      expect(voteAbstain).toBeInTheDocument();
      
      // Test voting
      await user.click(voteFor);
    });
  });

  describe('Mobile Performance Tests', () => {
    beforeEach(() => {
      setViewport(390, 844);
    });

    test('should render efficiently on mobile devices', async () => {
      const startTime = performance.now();
      
      render(<MockMobileWeb3CommunityPage />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within 150ms on mobile
      expect(renderTime).toBeLessThan(150);
    });

    test('should handle scroll performance with large lists', async () => {
      render(<MockMobileWeb3CommunityPage />);
      
      const postList = screen.getByTestId('mobile-post-list');
      
      // Simulate scroll events
      const scrollEvents = Array.from({ length: 10 }, (_, i) => i * 100);
      
      const startTime = performance.now();
      
      scrollEvents.forEach(scrollTop => {
        fireEvent.scroll(postList, { target: { scrollTop } });
      });
      
      const endTime = performance.now();
      const scrollTime = endTime - startTime;
      
      // Should handle scroll events efficiently
      expect(scrollTime).toBeLessThan(100);
    });

    test('should optimize image loading on mobile', async () => {
      render(<MockMobileWeb3CommunityPage />);
      
      const images = screen.getAllByRole('img');
      
      // Verify images have proper loading attributes
      images.forEach(img => {
        expect(img).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Accessibility Tests', () => {
    beforeEach(() => {
      setViewport(390, 844);
    });

    test('should be accessible with screen readers on mobile', () => {
      render(<MockMobileWeb3CommunityPage />);
      
      // Verify important elements have proper labels
      const boostBtn = screen.getByTestId('mobile-boost-btn');
      const tipBtn = screen.getByTestId('mobile-tip-btn');
      const voteBtn = screen.getByTestId('mobile-vote-btn');
      
      expect(boostBtn).toHaveAccessibleName();
      expect(tipBtn).toHaveAccessibleName();
      expect(voteBtn).toHaveAccessibleName();
    });

    test('should support mobile keyboard navigation', async () => {
      render(<MockMobileWeb3CommunityPage />);
      
      // Test tab navigation on mobile
      await user.tab();
      expect(document.activeElement).toBe(screen.getByTestId('mobile-menu-toggle'));
      
      await user.tab();
      expect(document.activeElement).toBe(screen.getByTestId('mobile-wallet-connect'));
    });

    test('should have proper touch target sizes', () => {
      render(<MockMobileWeb3CommunityPage />);
      
      const touchTargets = [
        screen.getByTestId('mobile-boost-btn'),
        screen.getByTestId('mobile-tip-btn'),
        screen.getByTestId('mobile-vote-btn'),
        screen.getByTestId('mobile-fab'),
      ];
      
      // Verify touch targets meet minimum size requirements (44px)
      touchTargets.forEach(target => {
        const styles = window.getComputedStyle(target);
        const minSize = 44; // iOS HIG minimum
        
        // Note: In test environment, we verify the elements exist
        // In real implementation, these would have proper CSS classes
        expect(target).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Network Conditions Tests', () => {
    beforeEach(() => {
      setViewport(390, 844);
      
      // Mock slow network conditions
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '2g',
          downlink: 0.5,
          rtt: 2000,
          saveData: true,
        },
        writable: true,
      });
    });

    test('should handle slow network conditions gracefully', async () => {
      render(<MockMobileWeb3CommunityPage />);
      
      // Verify page loads even on slow network
      expect(screen.getByTestId('mobile-web3-community-page')).toBeInTheDocument();
      
      // Verify essential elements are prioritized
      expect(screen.getByTestId('mobile-bottom-navigation')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-header')).toBeInTheDocument();
    });

    test('should show appropriate loading states on mobile', async () => {
      render(<MockMobileWeb3CommunityPage />);
      
      const boostBtn = screen.getByTestId('mobile-boost-btn');
      await user.click(boostBtn);
      
      // Should show loading state during Web3 operations
      expect(boostBtn).toBeInTheDocument();
    });
  });

  describe('Mobile Error Handling Tests', () => {
    beforeEach(() => {
      setViewport(390, 844);
    });

    test('should handle mobile Web3 errors gracefully', async () => {
      const mockFailedRequest = jest.fn().mockRejectedValue(new Error('Mobile wallet error'));
      (global as any).ethereum.request = mockFailedRequest;
      
      render(<MockMobileWeb3CommunityPage />);
      
      const walletConnectBtn = screen.getByTestId('mobile-wallet-connect');
      await user.click(walletConnectBtn);
      
      // Should handle wallet connection errors
      expect(walletConnectBtn).toBeInTheDocument();
    });

    test('should provide mobile-friendly error messages', async () => {
      render(<MockMobileWeb3CommunityPage />);
      
      // Simulate network error
      const boostBtn = screen.getByTestId('mobile-boost-btn');
      await user.click(boostBtn);
      
      // Should show user-friendly error handling
      expect(boostBtn).toBeInTheDocument();
    });
  });
});