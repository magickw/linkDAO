import { TokenInfo, StakingInfo, OnChainProof, Proposal, VoteChoice } from '@/types/web3Post';
import { GovernanceData, UserVote } from '@/types/governance';

/**
 * Mock data factory for Web3 integration testing
 * Provides consistent mock data for all Web3 components
 */

export const createMockTokenInfo = (overrides: Partial<TokenInfo> = {}): TokenInfo => ({
  address: '0x1234567890123456789012345678901234567890',
  symbol: 'LNK',
  decimals: 18,
  name: 'LinkDAO Token',
  logoUrl: 'https://example.com/token-logo.png',
  priceUSD: 1.25,
  priceChange24h: 5.67,
  ...overrides,
});

export const createMockStakingInfo = (overrides: Partial<StakingInfo> = {}): StakingInfo => ({
  totalStaked: 150.75,
  stakerCount: 12,
  stakingTier: 'gold',
  userStake: 25.5,
  ...overrides,
});

export const createMockOnChainProof = (overrides: Partial<OnChainProof> = {}): OnChainProof => ({
  transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  blockNumber: 18500000,
  contractAddress: '0x1234567890123456789012345678901234567890',
  verified: true,
  proofType: 'governance_vote',
  ...overrides,
});

export const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: 'proposal-123',
  title: 'Increase Community Treasury Allocation',
  description: 'Proposal to increase the community treasury allocation from 10% to 15%',
  proposer: '0x9876543210987654321098765432109876543210',
  status: 'active',
  votingPower: {
    for: 1500,
    against: 500,
    abstain: 100,
  },
  startTime: new Date('2024-01-01'),
  endTime: new Date('2024-01-15'),
  onChainId: 'prop-123',
  contractAddress: '0x1111222233334444555566667777888899990000',
  ...overrides,
});

export const createMockGovernanceData = (overrides: Partial<GovernanceData> = {}): GovernanceData => ({
  activeProposals: [createMockProposal()],
  userVotingPower: 100,
  expiringVotes: [],
  governanceToken: createMockTokenInfo({ symbol: 'GOV' }),
  ...overrides,
});

export const createMockUserVote = (overrides: Partial<UserVote> = {}): UserVote => ({
  proposalId: 'proposal-123',
  choice: 'for',
  votingPower: 100,
  timestamp: new Date(),
  transactionHash: '0xabc123def456',
  ...overrides,
});

export const createMockWeb3User = (overrides: any = {}) => ({
  address: '0x1234567890123456789012345678901234567890',
  ensName: 'testuser.eth',
  avatar: 'https://example.com/avatar.jpg',
  isConnected: true,
  chainId: 1,
  balance: '100.0',
  ...overrides,
});

export const createMockCommunityWithWeb3Data = (overrides: any = {}) => ({
  id: 'community-123',
  name: 'DeFi Builders',
  description: 'A community for DeFi developers and enthusiasts',
  avatar: 'https://example.com/community-avatar.jpg',
  memberCount: 1250,
  isActive: true,
  userRole: 'member',
  tokenRequirement: {
    token: createMockTokenInfo(),
    minimumAmount: 10,
  },
  userTokenBalance: 50,
  governanceNotifications: 2,
  governanceToken: createMockTokenInfo({ symbol: 'DFB' }),
  treasuryBalance: {
    tokens: [
      { ...createMockTokenInfo(), balance: 10000 },
      { ...createMockTokenInfo({ symbol: 'ETH', name: 'Ethereum' }), balance: 25.5 },
    ],
    totalValueUSD: 125000,
  },
  stakingRequirements: {
    minimumStake: 5,
    stakingToken: 'LNK',
    benefits: ['Voting rights', 'Exclusive content', 'Priority support'],
  },
  onChainData: {
    contractAddress: '0x9999888877776666555544443333222211110000',
    chainId: 1,
    governanceContract: '0x1111222233334444555566667777888899990000',
  },
  ...overrides,
});

export const createMockPostWithWeb3Data = (overrides: any = {}) => ({
  id: 'post-123',
  author: '0x1234567890123456789012345678901234567890',
  contentCid: 'bafybeicg6vkh5j5n5z4y4vzgq3v3z4vzgq3v3z4vzgq3v3z4vzgq3v3z4',
  mediaCids: [],
  tags: ['defi', 'governance'],
  createdAt: new Date(),
  updatedAt: new Date(),
  reactions: [],
  tips: [],
  comments: 15,
  shares: 8,
  views: 250,
  engagementScore: 85,
  stakingInfo: createMockStakingInfo(),
  postType: 'governance',
  onChainProof: createMockOnChainProof(),
  tokenActivity: [
    {
      id: 'activity-1',
      type: 'tip',
      amount: 5.5,
      token: createMockTokenInfo(),
      fromAddress: '0x9876543210987654321098765432109876543210',
      toAddress: '0x1234567890123456789012345678901234567890',
      timestamp: new Date(),
      transactionHash: '0xdef456abc789',
      relatedPostId: 'post-123',
    },
  ],
  ...overrides,
});

export const createMockTokenActivity = (overrides: any = {}) => ({
  id: 'activity-1',
  type: 'tip',
  amount: 10.5,
  token: createMockTokenInfo(),
  fromAddress: '0x9876543210987654321098765432109876543210',
  toAddress: '0x1234567890123456789012345678901234567890',
  timestamp: new Date(),
  transactionHash: '0xabc123def456',
  relatedPostId: 'post-123',
  ...overrides,
});

export const createMockWalletActivity = (overrides: any = {}) => ({
  id: 'wallet-activity-1',
  type: 'send',
  token: createMockTokenInfo(),
  amount: 25.0,
  toAddress: '0x9876543210987654321098765432109876543210',
  timestamp: new Date(),
  transactionHash: '0x123abc456def',
  status: 'confirmed',
  gasUsed: '21000',
  gasFee: '0.005',
  ...overrides,
});

export const createMockSuggestedCommunity = (overrides: any = {}) => ({
  ...createMockCommunityWithWeb3Data(),
  mutualMembers: 15,
  recentActivity: {
    postsToday: 8,
    activeMembers: 45,
    totalEngagement: 320,
  },
  trendingTopics: ['#defi', '#governance', '#nft'],
  treasuryBalance: 75000,
  ...overrides,
});

// Mock Web3 service responses
export const mockWeb3ServiceResponses = {
  getTokenPrice: jest.fn(() => Promise.resolve({
    price: 1.25,
    change24h: 5.67,
    volume24h: 1000000,
    marketCap: 50000000,
    lastUpdated: new Date(),
  })),
  
  estimateGasFee: jest.fn(() => Promise.resolve({
    gasPrice: '20',
    gasLimit: '21000',
    totalCost: '0.42',
  })),
  
  stakeTokens: jest.fn(() => Promise.resolve({
    txHash: '0xabc123def456',
    blockNumber: 18500001,
  })),
  
  submitVote: jest.fn(() => Promise.resolve({
    txHash: '0xdef456abc789',
    blockNumber: 18500002,
  })),
  
  getVotingPower: jest.fn(() => Promise.resolve(100)),
  
  verifyOnChainProof: jest.fn(() => Promise.resolve(true)),
};

// Mock WebSocket for real-time updates
export const createMockWebSocket = () => ({
  readyState: 1, // OPEN
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  onopen: null,
  onclose: null,
  onmessage: null,
  onerror: null,
});

// Mock blockchain data
export const mockBlockchainData = {
  currentBlock: 18500000,
  gasPrice: '20000000000', // 20 gwei
  chainId: 1,
  networkName: 'Ethereum Mainnet',
};

// Test utilities for Web3 components
export const web3TestUtils = {
  // Simulate wallet connection
  connectWallet: () => ({
    address: '0x1234567890123456789012345678901234567890',
    chainId: 1,
    isConnected: true,
  }),
  
  // Simulate wallet disconnection
  disconnectWallet: () => ({
    address: null,
    chainId: null,
    isConnected: false,
  }),
  
  // Simulate network switch
  switchNetwork: (chainId: number) => ({
    chainId,
    networkName: chainId === 1 ? 'Ethereum Mainnet' : 'Polygon',
  }),
  
  // Simulate transaction
  simulateTransaction: (type: string) => ({
    hash: `0x${Math.random().toString(16).substr(2, 64)}`,
    blockNumber: mockBlockchainData.currentBlock + 1,
    gasUsed: '21000',
    status: 'success',
    type,
  }),
  
  // Format addresses for display
  formatAddress: (address: string) => 
    `${address.slice(0, 6)}...${address.slice(-4)}`,
  
  // Format token amounts
  formatTokenAmount: (amount: number, decimals: number = 18) =>
    (amount / Math.pow(10, decimals)).toFixed(4),
};

// Export all mock data for easy importing
export const mockData = {
  token: createMockTokenInfo(),
  stakingInfo: createMockStakingInfo(),
  onChainProof: createMockOnChainProof(),
  proposal: createMockProposal(),
  governanceData: createMockGovernanceData(),
  userVote: createMockUserVote(),
  web3User: createMockWeb3User(),
  community: createMockCommunityWithWeb3Data(),
  post: createMockPostWithWeb3Data(),
  tokenActivity: createMockTokenActivity(),
  walletActivity: createMockWalletActivity(),
  suggestedCommunity: createMockSuggestedCommunity(),
};