import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedLeftSidebar } from '../EnhancedLeftSidebar';
import { CommunityIconList } from '../CommunityIconList';
import { MultiSelectFilters } from '../MultiSelectFilters';
import { QuickNavigationPanel } from '../QuickNavigationPanel';
import { EnhancedCommunityData, FilterOption } from '../../../../types/communityEnhancements';

// Mock data
const mockCommunities: EnhancedCommunityData[] = [
  {
    id: '1',
    name: 'DeFi Community',
    description: 'Decentralized Finance discussions',
    memberCount: 1500,
    icon: 'https://example.com/icon1.png',
    brandColors: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      accent: '#60A5FA'
    },
    userMembership: {
      isJoined: true,
      joinDate: new Date('2023-01-01'),
      reputation: 150,
      tokenBalance: 1000,
      role: 'member'
    },
    activityMetrics: {
      postsToday: 25,
      activeMembers: 300,
      trendingScore: 0.8,
      engagementRate: 0.75
    },
    governance: {
      activeProposals: 3,
      userVotingPower: 100,
      participationRate: 0.6,
      nextDeadline: new Date('2024-01-01')
    }
  },
  {
    id: '2',
    name: 'NFT Collectors',
    description: 'NFT trading and collecting',
    memberCount: 800,
    icon: 'https://example.com/icon2.png',
    brandColors: {
      primary: '#8B5CF6',
      secondary: '#7C3AED',
      accent: '#A78BFA'
    },
    userMembership: {
      isJoined: false,
      joinDate: new Date('2023-06-01'),
      reputation: 50,
      tokenBalance: 0,
      role: 'member'
    },
    activityMetrics: {
      postsToday: 12,
      activeMembers: 150,
      trendingScore: 0.6,
      engagementRate: 0.5
    },
    governance: {
      activeProposals: 1,
      userVotingPower: 0,
      participationRate: 0.4
    }
  }
];

const mockFilters: FilterOption[] = [
  {
    id: 'hot',
    label: 'Hot',
    icon: '🔥',
    color: '#EF4444',
    combinableWith: ['new', 'top']
  },
  {
    id: 'new',
    label: 'New',
    icon: '⭐',
    color: '#10B981',
    combinableWith: ['hot', 'top']
  },
  {
    id: 'top',
    label: 'Top',
    icon: '📈',
    color: '#8B5CF6',
    combinableWith: ['hot', 'new']
  }
];

describe('EnhancedLeftSidebar', () => {
  const defaultProps = {
    communities: mockCommunities,
    selectedCommunity: '1',
    availableFilters: mockFilters,
    selectedFilters: ['hot'],
    onCommunitySelect: jest.fn(),
    onFiltersChange: jest.fn(),
    onQuickAction: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all sidebar components', () => {
    render(<EnhancedLeftSidebar {...defaultProps} />);
    
    expect(screen.getByText('Quick Access')).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Communities')).toBeInTheDocument();
  });

  it('displays communities with correct information', () => {
    render(<EnhancedLeftSidebar {...defaultProps} />);
    
    expect(screen.getByText('DeFi Community')).toBeInTheDocument();
    expect(screen.getByText('NFT Collectors')).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument(); // Member count
  });

  it('handles community selection', () => {
    render(<EnhancedLeftSidebar {...defaultProps} />);
    
    fireEvent.click(screen.getByText('NFT Collectors'));
    expect(defaultProps.onCommunitySelect).toHaveBeenCalledWith('2');
  });

  it('handles filter changes', () => {
    render(<EnhancedLeftSidebar {...defaultProps} />);
    
    // Click to expand filters
    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);
    
    // Select a new filter
    const newFilter = screen.getByText('New');
    fireEvent.click(newFilter);
    
    expect(defaultProps.onFiltersChange).toHaveBeenCalled();
  });

  it('handles quick actions', () => {
    render(<EnhancedLeftSidebar {...defaultProps} />);
    
    const createPostButton = screen.getByText('Create Post');
    fireEvent.click(createPostButton);
    
    expect(defaultProps.onQuickAction).toHaveBeenCalledWith('create-post');
  });
});

describe('CommunityIconList', () => {
  const props = {
    communities: mockCommunities,
    selectedCommunity: '1',
    onCommunitySelect: jest.fn(),
    showBadges: true
  };

  it('renders community list with icons and badges', () => {
    render(<CommunityIconList {...props} />);
    
    expect(screen.getByText('DeFi Community')).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument();
    expect(screen.getByText('1K')).toBeInTheDocument(); // Token balance badge
  });

  it('filters communities based on search', async () => {
    render(<CommunityIconList {...props} />);
    
    const searchInput = screen.getByPlaceholderText('Search communities...');
    fireEvent.change(searchInput, { target: { value: 'DeFi' } });
    
    await waitFor(() => {
      expect(screen.getByText('DeFi Community')).toBeInTheDocument();
      expect(screen.queryByText('NFT Collectors')).not.toBeInTheDocument();
    });
  });
});

describe('MultiSelectFilters', () => {
  const props = {
    availableFilters: mockFilters,
    selectedFilters: ['hot'],
    onFiltersChange: jest.fn(),
    allowCombinations: true
  };

  it('renders filter options', () => {
    render(<MultiSelectFilters {...props} />);
    
    // Expand filters
    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);
    
    expect(screen.getByText('Hot')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Top')).toBeInTheDocument();
  });

  it('shows selected filters', () => {
    render(<MultiSelectFilters {...props} />);
    
    expect(screen.getByText('1')).toBeInTheDocument(); // Badge count
  });

  it('allows filter combination', () => {
    render(<MultiSelectFilters {...props} />);
    
    // Expand filters
    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);
    
    // Click on New filter
    const newFilter = screen.getByText('New');
    fireEvent.click(newFilter);
    
    expect(props.onFiltersChange).toHaveBeenCalledWith(['hot', 'new']);
  });
});

describe('QuickNavigationPanel', () => {
  const props = {
    communities: mockCommunities,
    onCommunitySelect: jest.fn(),
    onQuickAction: jest.fn()
  };

  it('renders quick action buttons', () => {
    render(<QuickNavigationPanel {...props} />);
    
    expect(screen.getByText('Create Post')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Bookmarks')).toBeInTheDocument();
    expect(screen.getByText('Activity Feed')).toBeInTheDocument();
  });

  it('handles quick action clicks', () => {
    render(<QuickNavigationPanel {...props} />);
    
    fireEvent.click(screen.getByText('Create Post'));
    expect(props.onQuickAction).toHaveBeenCalledWith('create-post');
  });

  it('shows keyboard shortcuts help', () => {
    render(<QuickNavigationPanel {...props} />);
    
    const shortcutsToggle = screen.getByText('Keyboard Shortcuts');
    fireEvent.click(shortcutsToggle);
    
    expect(screen.getByText('Navigate')).toBeInTheDocument();
    expect(screen.getByText('↑↓ arrows')).toBeInTheDocument();
  });
});