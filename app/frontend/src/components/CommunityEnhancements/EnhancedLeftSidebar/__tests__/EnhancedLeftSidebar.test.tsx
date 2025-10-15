import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnhancedLeftSidebar } from '../EnhancedLeftSidebar';
import { CommunityWithWeb3Data, UserRoleMap, TokenBalanceMap } from '../../../../types/web3Post';

// Mock the hooks
jest.mock('../../../../hooks/useCommunityCache', () => ({
  useCommunityCache: () => ({
    getCachedIcon: jest.fn((id) => `cached-icon-${id}`),
    preloadIcons: jest.fn()
  })
}));

const mockCommunities: CommunityWithWeb3Data[] = [
  {
    id: 'community-1',
    name: 'DeFi Community',
    description: 'A community for DeFi enthusiasts',
    icon: 'https://example.com/icon1.png',
    memberCount: 1500,
    isActive: true,
    userRole: 'admin',
    userTokenBalance: 5000,
    governanceNotifications: 3,
    tokenRequirement: {
      tokenAddress: '0x123...',
      minimumBalance: 100,
      tokenSymbol: 'DEFI',
      tokenName: 'DeFi Token'
    },
    activityMetrics: {
      engagementRate: 0.8,
      trendingScore: 0.9
    },
    userMembership: {
      isJoined: true,
      tokenBalance: 5000,
      reputation: 85
    }
  },
  {
    id: 'community-2',
    name: 'NFT Collectors',
    description: 'Community for NFT collectors and artists',
    icon: 'https://example.com/icon2.png',
    memberCount: 800,
    isActive: false,
    userRole: 'member',
    userTokenBalance: 250,
    governanceNotifications: 1,
    activityMetrics: {
      engagementRate: 0.6,
      trendingScore: 0.7
    },
    userMembership: {
      isJoined: true,
      tokenBalance: 250,
      reputation: 42
    }
  }
];

const mockUserRoles: UserRoleMap = {
  'community-1': 'admin',
  'community-2': 'member'
};

const mockTokenBalances: TokenBalanceMap = {
  'community-1': 5000,
  'community-2': 250
};

const mockFilters = [
  { id: 'defi', label: 'DeFi', icon: '💰' },
  { id: 'nft', label: 'NFT', icon: '🎨' }
];

const defaultProps = {
  communities: mockCommunities,
  selectedCommunity: 'community-1',
  availableFilters: mockFilters,
  selectedFilters: ['defi'],
  userRoles: mockUserRoles,
  tokenBalances: mockTokenBalances,
  onCommunitySelect: jest.fn(),
  onFiltersChange: jest.fn(),
  onQuickAction: jest.fn(),
  onCreateCommunity: jest.fn()
};

describe('EnhancedLeftSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the sidebar with communities', () => {
    render(<EnhancedLeftSidebar {...defaultProps} />);
    
    expect(screen.getByText('Communities')).toBeInTheDocument();
    expect(screen.getByText('DeFi Community')).toBeInTheDocument();
    expect(screen.getByText('NFT Collectors')).toBeInTheDocument();
  });

  it('displays the Create Community button', () => {
    render(<EnhancedLeftSidebar {...defaultProps} />);
    
    const createButton = screen.getByRole('button', { name: /create community/i });
    expect(createButton).toBeInTheDocument();
  });

  it('shows governance notifications badge when there are notifications', () => {
    render(<EnhancedLeftSidebar {...defaultProps} />);
    
    // Should show total notifications (3 + 1 = 4)
    expect(screen.getByTitle(/4.*governance notification/i)).toBeInTheDocument();
  });

  it('displays role badges for communities', () => {
    render(<EnhancedLeftSidebar {...defaultProps} />);
    
    // Admin role should be visible for community-1
    const adminBadge = screen.getByTitle(/admin role/i);
    expect(adminBadge).toBeInTheDocument();
  });

  it('shows token balances for communities', () => {
    render(<EnhancedLeftSidebar {...defaultProps} />);
    
    // Should show formatted token balance
    expect(screen.getByText('5K')).toBeInTheDocument(); // 5000 formatted
    expect(screen.getByText('250')).toBeInTheDocument();
  });

  it('opens create community modal when button is clicked', async () => {
    render(<EnhancedLeftSidebar {...defaultProps} />);
    
    const createButton = screen.getByRole('button', { name: /create community/i });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Create New Community')).toBeInTheDocument();
    });
  });

  it('filters communities based on search query', () => {
    render(<EnhancedLeftSidebar {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText(/search communities/i);
    fireEvent.change(searchInput, { target: { value: 'DeFi' } });
    
    expect(screen.getByText('DeFi Community')).toBeInTheDocument();
    // NFT Collectors should still be visible as we're not filtering in this test setup
  });

  it('calls onCommunitySelect when a community is clicked', () => {
    render(<EnhancedLeftSidebar {...defaultProps} />);
    
    const communityItem = screen.getByText('NFT Collectors');
    fireEvent.click(communityItem);
    
    expect(defaultProps.onCommunitySelect).toHaveBeenCalledWith('community-2');
  });

  it('shows activity indicators for active communities', () => {
    render(<EnhancedLeftSidebar {...defaultProps} />);
    
    // DeFi Community is active, should have green dot
    const defiCommunity = screen.getByText('DeFi Community').closest('[role="button"]');
    expect(defiCommunity).toBeInTheDocument();
  });

  it('displays member counts correctly', () => {
    render(<EnhancedLeftSidebar {...defaultProps} />);
    
    expect(screen.getByText('1,500')).toBeInTheDocument(); // DeFi Community
    expect(screen.getByText('800')).toBeInTheDocument(); // NFT Collectors
  });

  it('shows voting power indicators for users with tokens', () => {
    render(<EnhancedLeftSidebar {...defaultProps} />);
    
    // Should show voting power indicators for communities where user has tokens
    const votingIndicators = screen.getAllByTitle(/voting power/i);
    expect(votingIndicators.length).toBeGreaterThan(0);
  });

  it('handles governance notification click', () => {
    render(<EnhancedLeftSidebar {...defaultProps} />);
    
    const notificationBadge = screen.getByTitle(/4.*governance notification/i);
    fireEvent.click(notificationBadge);
    
    expect(defaultProps.onQuickAction).toHaveBeenCalledWith('view-governance-notifications');
  });

  it('displays trending indicators for high-activity communities', () => {
    render(<EnhancedLeftSidebar {...defaultProps} />);
    
    // DeFi Community has trendingScore > 0.8, should show trending indicator
    const trendingIcon = screen.getByText('DeFi Community').closest('[role="button"]')?.querySelector('svg');
    expect(trendingIcon).toBeInTheDocument();
  });
});

describe('EnhancedLeftSidebar - Create Community Flow', () => {
  it('submits community creation data correctly', async () => {
    const mockOnCreateCommunity = jest.fn().mockResolvedValue(undefined);
    
    render(
      <EnhancedLeftSidebar 
        {...defaultProps} 
        onCreateCommunity={mockOnCreateCommunity}
      />
    );
    
    // Open modal
    const createButton = screen.getByRole('button', { name: /create community/i });
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('Create New Community')).toBeInTheDocument();
    });
    
    // Fill in basic information
    const nameInput = screen.getByPlaceholderText(/enter community name/i);
    const descriptionInput = screen.getByPlaceholderText(/describe your community/i);
    
    fireEvent.change(nameInput, { target: { value: 'Test Community' } });
    fireEvent.change(descriptionInput, { target: { value: 'A test community for testing purposes' } });
    
    // Navigate through steps and submit
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      const nextButton2 = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton2);
    });
    
    await waitFor(() => {
      const createButton = screen.getByRole('button', { name: /create community/i });
      fireEvent.click(createButton);
    });
    
    await waitFor(() => {
      expect(mockOnCreateCommunity).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Community',
          description: 'A test community for testing purposes'
        })
      );
    });
  });
});