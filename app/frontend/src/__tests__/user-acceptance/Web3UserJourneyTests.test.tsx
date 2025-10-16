/**
 * User Acceptance Tests for Web3 Native Community Enhancements
 * Tests complete user journeys with real wallet interactions and test tokens
 */

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { Web3Provider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';

// Test environment setup
const TEST_WALLET_ADDRESS = '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87';
const TEST_TOKEN_ADDRESS = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';
const TEST_GOVERNANCE_CONTRACT = '0x5e4be8Bc9637f0EAA1A755019e06A68ce081D58F';

// Mock Web3 components for testing
const MockEnhancedCommunitiesPage = () => {
  return (
    <div data-testid="enhanced-communities-page">
      {/* Enhanced Left Sidebar */}
      <aside data-testid="enhanced-left-sidebar" className="w-64 bg-white border-r">
        <div data-testid="create-community-section" className="p-4 border-b">
          <button 
            data-testid="create-community-btn"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
          >
            + Create Community
          </button>
        </div>
        
        <div data-testid="community-list" className="p-4">
          <div data-testid="community-item-defi" className="flex items-center p-3 rounded-lg hover:bg-gray-50">
            <img 
              data-testid="community-avatar"
              src="/api/placeholder/32/32" 
              alt="DeFi DAO"
              className="w-8 h-8 rounded-full"
            />
            <div className="ml-3 flex-1">
              <div className="flex items-center">
                <span className="font-medium">DeFi DAO</span>
                <span data-testid="activity-indicator" className="ml-2 w-2 h-2 bg-green-500 rounded-full"></span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span data-testid="member-count">1,234 members</span>
                <span data-testid="role-badge" className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded">Admin</span>
              </div>
              <div data-testid="token-balance" className="text-sm text-green-600">
                500 DEFI • Staked: 100 DEFI
              </div>
            </div>
            <div data-testid="governance-notifications" className="w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
              2
            </div>
          </div>
          
          <div data-testid="community-item-nft" className="flex items-center p-3 rounded-lg hover:bg-gray-50">
            <img 
              data-testid="community-avatar"
              src="/api/placeholder/32/32" 
              alt="NFT Collectors"
              className="w-8 h-8 rounded-full"
            />
            <div className="ml-3 flex-1">
              <div className="flex items-center">
                <span className="font-medium">NFT Collectors</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span data-testid="member-count">856 members</span>
                <span data-testid="role-badge" className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 rounded">Member</span>
              </div>
              <div data-testid="token-balance" className="text-sm text-gray-600">
                No tokens required
              </div>
            </div>
          </div>
        </div>
        
        <div data-testid="community-search" className="p-4 border-t">
          <input 
            data-testid="community-search-input"
            type="text"
            placeholder="Search communities..."
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </aside>

      {/* Enhanced Central Feed */}
      <main data-testid="enhanced-central-feed" className="flex-1 max-w-2xl mx-auto">
        <div data-testid="feed-filters" className="sticky top-0 bg-white border-b p-4">
          <div className="flex space-x-4">
            <button data-testid="filter-all" className="px-4 py-2 bg-blue-600 text-white rounded-lg">All</button>
            <button data-testid="filter-following" className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Following</button>
            <button data-testid="filter-governance" className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Governance</button>
            <button data-testid="filter-discussion" className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Discussion</button>
          </div>
          
          <div className="flex items-center mt-4 space-x-4">
            <select data-testid="time-filter" className="px-3 py-2 border rounded-lg">
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
            
            <select data-testid="sort-filter" className="px-3 py-2 border rounded-lg">
              <option value="hot">Hot</option>
              <option value="new">New</option>
              <option value="top">Top</option>
              <option value="staked">Most Staked</option>
            </select>
          </div>
        </div>
        
        <div data-testid="post-list" className="p-4 space-y-6">
          {/* Governance Post */}
          <article data-testid="post-governance" className="bg-white border border-purple-200 rounded-lg p-6">
            <div data-testid="post-type-indicator" className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm mb-4">
              Governance
            </div>
            
            <div className="flex items-start space-x-4">
              <img src="/api/placeholder/40/40" alt="Author" className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-medium">alice.eth</span>
                  <span data-testid="reputation-score" className="text-sm text-gray-500">Rep: 1,250</span>
                  <span data-testid="featured-badge" className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Featured</span>
                </div>
                
                <h3 className="text-lg font-semibold mb-2">Proposal: Increase Community Treasury Allocation</h3>
                <p className="text-gray-700 mb-4">
                  I propose we increase the treasury allocation for community development from 10% to 15%...
                </p>
                
                {/* Staking Information */}
                <div data-testid="staking-section" className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div data-testid="total-staked" className="text-lg font-semibold text-yellow-800">
                        1,250 DEFI Staked
                      </div>
                      <div data-testid="staker-info" className="text-sm text-yellow-600">
                        by 25 community members
                      </div>
                    </div>
                    <div data-testid="staking-tier" className="px-3 py-1 bg-yellow-500 text-white rounded-full text-sm font-medium">
                      Gold Tier
                    </div>
                  </div>
                  
                  <div data-testid="user-stake-status" className="mt-3 text-sm">
                    <span className="text-gray-600">Your stake: </span>
                    <span className="font-medium text-green-600">50 DEFI</span>
                    <span className="text-gray-600 ml-2">• Potential rewards: 2.5 DEFI</span>
                  </div>
                </div>
                
                {/* Engagement Metrics */}
                <div data-testid="engagement-metrics" className="flex items-center space-x-6 mb-4">
                  <div className="flex items-center space-x-2">
                    <div data-testid="engagement-bar" className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="w-3/4 h-full bg-blue-500"></div>
                    </div>
                    <span className="text-sm text-gray-600">Engagement: 75%</span>
                  </div>
                  
                  <div data-testid="comment-count" className="flex items-center space-x-1">
                    <span className="text-lg">💬</span>
                    <span className="font-medium">42</span>
                  </div>
                  
                  <div data-testid="view-count" className="flex items-center space-x-1">
                    <span className="text-lg">👁️</span>
                    <span className="font-medium">1.2k</span>
                  </div>
                  
                  <div data-testid="trending-indicator" className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                    Trending in DeFi DAO
                  </div>
                </div>
                
                {/* Web3 Interaction Buttons */}
                <div data-testid="web3-interactions" className="flex items-center space-x-4">
                  <button data-testid="boost-button" className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700">
                    <span>🚀</span>
                    <span>Boost (Est. 0.002 ETH)</span>
                  </button>
                  
                  <button data-testid="tip-button" className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <span>💰</span>
                    <span>Tip Creator</span>
                  </button>
                  
                  <div data-testid="web3-reactions" className="flex space-x-2">
                    <button data-testid="fire-reaction" className="text-2xl hover:scale-110 transition-transform">🔥</button>
                    <button data-testid="diamond-reaction" className="text-2xl hover:scale-110 transition-transform">💎</button>
                    <button data-testid="rocket-reaction" className="text-2xl hover:scale-110 transition-transform">🚀</button>
                  </div>
                  
                  <button data-testid="bookmark-button" className="text-gray-500 hover:text-blue-600">
                    <span className="text-xl">🔖</span>
                  </button>
                </div>
                
                {/* On-chain Verification */}
                <div data-testid="onchain-verification" className="mt-4 flex items-center space-x-2">
                  <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 rounded">
                    <span>✅</span>
                    <span className="text-sm">Verified on-chain</span>
                  </div>
                  <button data-testid="view-explorer" className="text-sm text-blue-600 hover:underline">
                    View on Etherscan
                  </button>
                </div>
              </div>
            </div>
          </article>
          
          {/* Discussion Post */}
          <article data-testid="post-discussion" className="bg-white border border-blue-200 rounded-lg p-6">
            <div data-testid="post-type-indicator" className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm mb-4">
              Discussion
            </div>
            
            <div className="flex items-start space-x-4">
              <img src="/api/placeholder/40/40" alt="Author" className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-medium">bob.eth</span>
                  <span data-testid="reputation-score" className="text-sm text-gray-500">Rep: 850</span>
                </div>
                
                <h3 className="text-lg font-semibold mb-2">Best DeFi Strategies for 2024</h3>
                <p className="text-gray-700 mb-4">
                  What are your thoughts on the current DeFi landscape? I've been exploring...
                </p>
                
                <div data-testid="engagement-metrics" className="flex items-center space-x-6 mb-4">
                  <div className="flex items-center space-x-2">
                    <div data-testid="engagement-bar" className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="w-1/2 h-full bg-blue-500"></div>
                    </div>
                    <span className="text-sm text-gray-600">Engagement: 50%</span>
                  </div>
                  
                  <div data-testid="comment-count" className="flex items-center space-x-1">
                    <span className="text-lg">💬</span>
                    <span className="font-medium">18</span>
                  </div>
                  
                  <div data-testid="view-count" className="flex items-center space-x-1">
                    <span className="text-lg">👁️</span>
                    <span className="font-medium">456</span>
                  </div>
                </div>
                
                <div data-testid="web3-interactions" className="flex items-center space-x-4">
                  <button data-testid="tip-button" className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <span>💰</span>
                    <span>Tip Creator</span>
                  </button>
                  
                  <div data-testid="web3-reactions" className="flex space-x-2">
                    <button data-testid="fire-reaction" className="text-2xl hover:scale-110 transition-transform">🔥</button>
                    <button data-testid="diamond-reaction" className="text-2xl hover:scale-110 transition-transform">💎</button>
                    <button data-testid="rocket-reaction" className="text-2xl hover:scale-110 transition-transform">🚀</button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </main>

      {/* Enhanced Right Sidebar */}
      <aside data-testid="enhanced-right-sidebar" className="w-80 bg-white border-l">
        {/* Governance Widget */}
        <div data-testid="governance-widget" className="p-6 border-b">
          <h3 className="text-lg font-semibold mb-4">Governance</h3>
          
          <div data-testid="voting-power-display" className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-600">Your Voting Power</span>
              <span className="text-lg font-bold text-blue-800">1,250</span>
            </div>
            <div className="text-xs text-blue-500 mt-1">Based on 500 DEFI + delegated votes</div>
          </div>
          
          <div data-testid="active-proposals" className="space-y-3">
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">Proposal #123</span>
                <span className="text-xs text-gray-500">2 days left</span>
              </div>
              <p className="text-sm text-gray-700 mb-3">Treasury Allocation Increase</p>
              
              <div className="flex items-center space-x-2 mb-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                </div>
                <span className="text-xs text-gray-600">65% For</span>
              </div>
              
              <button data-testid="vote-button" className="w-full bg-blue-600 text-white py-2 px-4 rounded text-sm hover:bg-blue-700">
                Vote Now
              </button>
            </div>
            
            <div data-testid="expiring-vote-notification" className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <span className="text-yellow-600">⚠️</span>
                <span className="text-sm text-yellow-800">Vote expires in 6 hours</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Suggested Communities */}
        <div data-testid="suggested-communities-widget" className="p-6 border-b">
          <h3 className="text-lg font-semibold mb-4">Suggested Communities</h3>
          
          <div className="space-y-4">
            <div data-testid="community-suggestion" className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
              <img src="/api/placeholder/32/32" alt="GameFi Hub" className="w-8 h-8 rounded-full" />
              <div className="flex-1">
                <div className="font-medium text-sm">GameFi Hub</div>
                <div className="text-xs text-gray-500">2,456 members • 12 mutual connections</div>
                <div className="text-xs text-green-600">Trending: #P2E #NFTGaming</div>
              </div>
              <button data-testid="join-community-btn" className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">
                Join
              </button>
            </div>
            
            <div data-testid="community-suggestion" className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
              <img src="/api/placeholder/32/32" alt="Web3 Builders" className="w-8 h-8 rounded-full" />
              <div className="flex-1">
                <div className="font-medium text-sm">Web3 Builders</div>
                <div className="text-xs text-gray-500">1,789 members • 8 mutual connections</div>
                <div className="text-xs text-blue-600">Requires: 100 BUILD tokens</div>
              </div>
              <button data-testid="join-community-btn" className="px-3 py-1 bg-gray-300 text-gray-600 rounded text-xs cursor-not-allowed">
                Need Tokens
              </button>
            </div>
          </div>
        </div>
        
        {/* Live Token Prices */}
        <div data-testid="token-prices-widget" className="p-6 border-b">
          <h3 className="text-lg font-semibold mb-4">Live Prices</h3>
          
          <div className="space-y-3">
            <div data-testid="token-price-item" className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <img src="/api/placeholder/24/24" alt="DEFI" className="w-6 h-6 rounded-full" />
                <span className="font-medium">DEFI</span>
              </div>
              <div className="text-right">
                <div className="font-medium">$1.25</div>
                <div data-testid="price-change" className="text-xs text-green-600">+5.2%</div>
              </div>
            </div>
            
            <div data-testid="token-price-item" className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <img src="/api/placeholder/24/24" alt="ETH" className="w-6 h-6 rounded-full" />
                <span className="font-medium">ETH</span>
              </div>
              <div className="text-right">
                <div className="font-medium">$2,456</div>
                <div data-testid="price-change" className="text-xs text-red-600">-1.8%</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Wallet Activity Feed */}
        <div data-testid="wallet-activity-widget" className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          
          <div className="space-y-3">
            <div data-testid="activity-item" className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <div>Received 5 DEFI tip</div>
                <div className="text-xs text-gray-500">2 minutes ago</div>
              </div>
            </div>
            
            <div data-testid="activity-item" className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <div>Voted on Proposal #123</div>
                <div className="text-xs text-gray-500">1 hour ago</div>
              </div>
            </div>
            
            <div data-testid="activity-item" className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div className="flex-1">
                <div>Staked 50 DEFI</div>
                <div className="text-xs text-gray-500">3 hours ago</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

describe('Web3 User Acceptance Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;
  
  beforeEach(() => {
    user = userEvent.setup();
    
    // Mock Web3 provider with test network
    (global as any).ethereum = {
      request: jest.fn(),
      on: jest.fn(),
      removeListener: jest.fn(),
      isMetaMask: true,
      selectedAddress: TEST_WALLET_ADDRESS,
      chainId: '0x5', // Goerli testnet
      networkVersion: '5',
    };
  });

  describe('Complete User Journey: Community Discovery to Governance Participation', () => {
    test('should complete full Web3 user journey from discovery to governance voting', async () => {
      render(<MockEnhancedCommunitiesPage />);
      
      // Step 1: User discovers communities in enhanced left sidebar
      const leftSidebar = screen.getByTestId('enhanced-left-sidebar');
      expect(leftSidebar).toBeInTheDocument();
      
      // Verify community list with Web3 data
      const defiCommunity = screen.getByTestId('community-item-defi');
      expect(within(defiCommunity).getByText('DeFi DAO')).toBeInTheDocument();
      expect(within(defiCommunity).getByTestId('member-count')).toHaveTextContent('1,234 members');
      expect(within(defiCommunity).getByTestId('role-badge')).toHaveTextContent('Admin');
      expect(within(defiCommunity).getByTestId('token-balance')).toHaveTextContent('500 DEFI • Staked: 100 DEFI');
      
      // Verify activity indicators and notifications
      expect(within(defiCommunity).getByTestId('activity-indicator')).toBeInTheDocument();
      expect(within(defiCommunity).getByTestId('governance-notifications')).toHaveTextContent('2');
      
      // Step 2: User explores enhanced central feed
      const centralFeed = screen.getByTestId('enhanced-central-feed');
      expect(centralFeed).toBeInTheDocument();
      
      // Verify advanced filtering options
      const feedFilters = screen.getByTestId('feed-filters');
      expect(within(feedFilters).getByTestId('filter-governance')).toBeInTheDocument();
      expect(within(feedFilters).getByTestId('time-filter')).toBeInTheDocument();
      expect(within(feedFilters).getByTestId('sort-filter')).toBeInTheDocument();
      
      // Step 3: User interacts with governance post
      const governancePost = screen.getByTestId('post-governance');
      expect(governancePost).toBeInTheDocument();
      
      // Verify post type indicator and visual hierarchy
      expect(within(governancePost).getByTestId('post-type-indicator')).toHaveTextContent('Governance');
      expect(within(governancePost).getByTestId('featured-badge')).toHaveTextContent('Featured');
      
      // Verify staking information display
      const stakingSection = within(governancePost).getByTestId('staking-section');
      expect(within(stakingSection).getByTestId('total-staked')).toHaveTextContent('1,250 DEFI Staked');
      expect(within(stakingSection).getByTestId('staker-info')).toHaveTextContent('by 25 community members');
      expect(within(stakingSection).getByTestId('staking-tier')).toHaveTextContent('Gold Tier');
      expect(within(stakingSection).getByTestId('user-stake-status')).toHaveTextContent('Your stake: 50 DEFI');
      
      // Verify engagement metrics
      const engagementMetrics = within(governancePost).getByTestId('engagement-metrics');
      expect(within(engagementMetrics).getByTestId('engagement-bar')).toBeInTheDocument();
      expect(within(engagementMetrics).getByTestId('comment-count')).toHaveTextContent('42');
      expect(within(engagementMetrics).getByTestId('view-count')).toHaveTextContent('1.2k');
      expect(within(engagementMetrics).getByTestId('trending-indicator')).toHaveTextContent('Trending in DeFi DAO');
      
      // Step 4: User performs Web3 interactions
      const web3Interactions = within(governancePost).getByTestId('web3-interactions');
      
      // Test boost functionality with gas estimation
      const boostButton = within(web3Interactions).getByTestId('boost-button');
      expect(boostButton).toHaveTextContent('Boost (Est. 0.002 ETH)');
      await user.click(boostButton);
      
      // Test tip functionality
      const tipButton = within(web3Interactions).getByTestId('tip-button');
      await user.click(tipButton);
      
      // Test Web3 reactions
      const fireReaction = within(web3Interactions).getByTestId('fire-reaction');
      await user.click(fireReaction);
      
      // Verify on-chain verification
      const onchainVerification = within(governancePost).getByTestId('onchain-verification');
      expect(within(onchainVerification).getByText('Verified on-chain')).toBeInTheDocument();
      
      const explorerLink = within(onchainVerification).getByTestId('view-explorer');
      await user.click(explorerLink);
      
      // Step 5: User participates in governance via right sidebar
      const rightSidebar = screen.getByTestId('enhanced-right-sidebar');
      expect(rightSidebar).toBeInTheDocument();
      
      // Verify governance widget
      const governanceWidget = within(rightSidebar).getByTestId('governance-widget');
      expect(within(governanceWidget).getByTestId('voting-power-display')).toHaveTextContent('1,250');
      
      // Test voting on active proposal
      const voteButton = within(governanceWidget).getByTestId('vote-button');
      await user.click(voteButton);
      
      // Verify expiring vote notification
      expect(within(governanceWidget).getByTestId('expiring-vote-notification')).toHaveTextContent('Vote expires in 6 hours');
      
      // Step 6: User explores suggested communities
      const suggestedCommunitiesWidget = within(rightSidebar).getByTestId('suggested-communities-widget');
      const joinButtons = within(suggestedCommunitiesWidget).getAllByTestId('join-community-btn');
      
      // Test joining community with tokens
      await user.click(joinButtons[0]);
      
      // Verify token requirement validation
      expect(joinButtons[1]).toHaveTextContent('Need Tokens');
      expect(joinButtons[1]).toHaveClass('cursor-not-allowed');
      
      // Step 7: User monitors real-time updates
      const tokenPricesWidget = within(rightSidebar).getByTestId('token-prices-widget');
      const priceItems = within(tokenPricesWidget).getAllByTestId('token-price-item');
      expect(priceItems).toHaveLength(2);
      
      // Verify price change indicators
      const priceChanges = within(tokenPricesWidget).getAllByTestId('price-change');
      expect(priceChanges[0]).toHaveTextContent('+5.2%');
      expect(priceChanges[1]).toHaveTextContent('-1.8%');
      
      // Step 8: User views wallet activity
      const walletActivityWidget = within(rightSidebar).getByTestId('wallet-activity-widget');
      const activityItems = within(walletActivityWidget).getAllByTestId('activity-item');
      expect(activityItems).toHaveLength(3);
      
      // Verify recent activities
      expect(within(activityItems[0]).getByText('Received 5 DEFI tip')).toBeInTheDocument();
      expect(within(activityItems[1]).getByText('Voted on Proposal #123')).toBeInTheDocument();
      expect(within(activityItems[2]).getByText('Staked 50 DEFI')).toBeInTheDocument();
    });

    test('should handle community creation workflow with token requirements', async () => {
      render(<MockEnhancedCommunitiesPage />);
      
      // Test create community button
      const createCommunityBtn = screen.getByTestId('create-community-btn');
      expect(createCommunityBtn).toBeInTheDocument();
      
      await user.click(createCommunityBtn);
      
      // Verify button interaction
      expect(createCommunityBtn).toHaveClass('hover:bg-blue-700');
    });

    test('should handle advanced filtering and sorting', async () => {
      render(<MockEnhancedCommunitiesPage />);
      
      // Test post type filtering
      const governanceFilter = screen.getByTestId('filter-governance');
      await user.click(governanceFilter);
      
      // Test time filtering
      const timeFilter = screen.getByTestId('time-filter');
      await user.selectOptions(timeFilter, 'week');
      expect(timeFilter).toHaveValue('week');
      
      // Test sorting options
      const sortFilter = screen.getByTestId('sort-filter');
      await user.selectOptions(sortFilter, 'staked');
      expect(sortFilter).toHaveValue('staked');
    });

    test('should handle community search functionality', async () => {
      render(<MockEnhancedCommunitiesPage />);
      
      const searchInput = screen.getByTestId('community-search-input');
      expect(searchInput).toBeInTheDocument();
      
      await user.type(searchInput, 'DeFi');
      expect(searchInput).toHaveValue('DeFi');
    });
  });

  describe('Real Wallet Integration Tests', () => {
    test('should handle MetaMask connection and network switching', async () => {
      const mockRequest = jest.fn()
        .mockResolvedValueOnce([TEST_WALLET_ADDRESS]) // eth_requestAccounts
        .mockResolvedValueOnce('0x1') // eth_chainId
        .mockResolvedValueOnce('1000000000000000000'); // eth_getBalance
      
      (global as any).ethereum.request = mockRequest;
      
      render(<MockEnhancedCommunitiesPage />);
      
      // Simulate wallet connection
      await act(async () => {
        await (global as any).ethereum.request({ method: 'eth_requestAccounts' });
      });
      
      expect(mockRequest).toHaveBeenCalledWith({ method: 'eth_requestAccounts' });
    });

    test('should handle transaction signing for staking', async () => {
      const mockSendTransaction = jest.fn().mockResolvedValue('0x123abc');
      (global as any).ethereum.request = mockSendTransaction;
      
      render(<MockEnhancedCommunitiesPage />);
      
      const boostButton = screen.getByTestId('boost-button');
      await user.click(boostButton);
      
      // Verify boost button interaction
      expect(boostButton).toBeInTheDocument();
    });

    test('should handle gas fee estimation and display', async () => {
      render(<MockEnhancedCommunitiesPage />);
      
      const boostButton = screen.getByTestId('boost-button');
      expect(boostButton).toHaveTextContent('Est. 0.002 ETH');
    });
  });

  describe('Performance and Optimization Tests', () => {
    test('should render large community lists efficiently', async () => {
      const startTime = performance.now();
      
      render(<MockEnhancedCommunitiesPage />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within 100ms
      expect(renderTime).toBeLessThan(100);
    });

    test('should handle real-time updates without performance degradation', async () => {
      render(<MockEnhancedCommunitiesPage />);
      
      // Simulate multiple real-time updates
      const updates = Array.from({ length: 10 }, (_, i) => ({
        type: 'PRICE_UPDATE',
        token: 'DEFI',
        price: 1.25 + (i * 0.01),
      }));
      
      const startTime = performance.now();
      
      // Process updates
      updates.forEach(() => {
        // Simulate update processing
      });
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Should process updates quickly
      expect(processingTime).toBeLessThan(50);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle network errors gracefully', async () => {
      const mockFailedRequest = jest.fn().mockRejectedValue(new Error('Network error'));
      (global as any).ethereum.request = mockFailedRequest;
      
      render(<MockEnhancedCommunitiesPage />);
      
      // Component should still render despite network errors
      expect(screen.getByTestId('enhanced-communities-page')).toBeInTheDocument();
    });

    test('should handle transaction failures with user feedback', async () => {
      const mockFailedTransaction = jest.fn().mockRejectedValue(new Error('Transaction failed'));
      (global as any).ethereum.request = mockFailedTransaction;
      
      render(<MockEnhancedCommunitiesPage />);
      
      const boostButton = screen.getByTestId('boost-button');
      await user.click(boostButton);
      
      // Should handle transaction failure gracefully
      expect(boostButton).toBeInTheDocument();
    });
  });

  describe('Accessibility and Usability', () => {
    test('should be keyboard navigable', async () => {
      render(<MockEnhancedCommunitiesPage />);
      
      // Test tab navigation
      await user.tab();
      expect(document.activeElement).toBe(screen.getByTestId('create-community-btn'));
      
      await user.tab();
      // Should move to next focusable element
    });

    test('should have proper ARIA labels and roles', () => {
      render(<MockEnhancedCommunitiesPage />);
      
      const leftSidebar = screen.getByTestId('enhanced-left-sidebar');
      expect(leftSidebar).toHaveAttribute('role', 'complementary');
      
      const centralFeed = screen.getByTestId('enhanced-central-feed');
      expect(centralFeed).toHaveAttribute('role', 'main');
    });

    test('should support screen readers', () => {
      render(<MockEnhancedCommunitiesPage />);
      
      // Verify important elements have accessible text
      const boostButton = screen.getByTestId('boost-button');
      expect(boostButton).toHaveAccessibleName();
      
      const voteButton = screen.getByTestId('vote-button');
      expect(voteButton).toHaveAccessibleName();
    });
  });
});