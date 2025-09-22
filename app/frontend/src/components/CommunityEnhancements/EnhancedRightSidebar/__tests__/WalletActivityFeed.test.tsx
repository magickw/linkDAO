import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WalletActivityFeed } from '../WalletActivityFeed';
import { WalletActivity } from '../../../../types/communityEnhancements';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock the hooks and components
jest.mock('../../../../hooks/useCommunityWebSocket', () => ({
  useCommunityWebSocket: () => ({ isConnected: true })
}));

jest.mock('../../SharedComponents/MicroInteractionLayer', () => ({
  MicroInteractionLayer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

const mockActivities: WalletActivity[] = [
  {
    id: '1',
    type: 'tip_received',
    amount: 100,
    token: 'LDAO',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    description: 'Received tip for helpful comment',
    relatedUser: 'alice.eth',
    celebratory: true
  },
  {
    id: '2',
    type: 'badge_earned',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    description: 'Earned "Community Helper" badge',
    celebratory: true
  },
  {
    id: '3',
    type: 'transaction',
    amount: 50,
    token: 'ETH',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    description: 'Staked tokens in governance pool',
    celebratory: false
  },
  {
    id: '4',
    type: 'reward_claimed',
    amount: 200,
    token: 'LDAO',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    description: 'Claimed weekly participation rewards',
    celebratory: true
  }
];

const defaultProps = {
  activities: mockActivities,
  maxItems: 10,
  showRealTimeUpdates: true,
  onActivityClick: jest.fn(),
  communityId: 'test-community'
};

describe('WalletActivityFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders wallet activity feed with activities', () => {
    render(<WalletActivityFeed {...defaultProps} />);
    
    expect(screen.getByText('Wallet Activity')).toBeInTheDocument();
    expect(screen.getByText('Received tip for helpful comment')).toBeInTheDocument();
    expect(screen.getByText('Earned "Community Helper" badge')).toBeInTheDocument();
  });

  it('displays activities in chronological order (newest first)', () => {
    render(<WalletActivityFeed {...defaultProps} />);
    
    const activities = screen.getAllByText(/ago|Just now/);
    expect(activities[0]).toHaveTextContent('5m ago'); // Most recent
    expect(activities[1]).toHaveTextContent('2h ago');
    expect(activities[2]).toHaveTextContent('1d ago');
    expect(activities[3]).toHaveTextContent('3d ago'); // Oldest
  });

  it('shows correct icons for different activity types', () => {
    render(<WalletActivityFeed {...defaultProps} />);
    
    // Check for different activity type containers
    const tipIcon = document.querySelector('.bg-green-100');
    const badgeIcon = document.querySelector('.bg-yellow-100');
    const transactionIcon = document.querySelector('.bg-blue-100');
    const rewardIcon = document.querySelector('.bg-purple-100');
    
    expect(tipIcon).toBeInTheDocument();
    expect(badgeIcon).toBeInTheDocument();
    expect(transactionIcon).toBeInTheDocument();
    expect(rewardIcon).toBeInTheDocument();
  });

  it('displays amounts and tokens correctly', () => {
    render(<WalletActivityFeed {...defaultProps} />);
    
    expect(screen.getByText('+100 LDAO')).toBeInTheDocument();
    expect(screen.getByText('+50 ETH')).toBeInTheDocument();
    expect(screen.getByText('+200 LDAO')).toBeInTheDocument();
  });

  it('shows related user information', () => {
    render(<WalletActivityFeed {...defaultProps} />);
    
    expect(screen.getByText('from @alice.eth')).toBeInTheDocument();
  });

  it('handles activity item clicks', () => {
    const mockOnActivityClick = jest.fn();
    render(<WalletActivityFeed {...defaultProps} onActivityClick={mockOnActivityClick} />);
    
    const firstActivity = screen.getByText('Received tip for helpful comment').closest('div');
    fireEvent.click(firstActivity!);
    
    expect(mockOnActivityClick).toHaveBeenCalledWith(mockActivities[0]);
  });

  it('filters activities by type', () => {
    render(<WalletActivityFeed {...defaultProps} />);
    
    // Click on Tips filter
    const tipsFilter = screen.getByText('Tips');
    fireEvent.click(tipsFilter);
    
    // Should only show tip activities
    expect(screen.getByText('Received tip for helpful comment')).toBeInTheDocument();
    expect(screen.queryByText('Earned "Community Helper" badge')).not.toBeInTheDocument();
  });

  it('searches activities by description', () => {
    render(<WalletActivityFeed {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search activities...');
    fireEvent.change(searchInput, { target: { value: 'badge' } });
    
    expect(screen.getByText('Earned "Community Helper" badge')).toBeInTheDocument();
    expect(screen.queryByText('Received tip for helpful comment')).not.toBeInTheDocument();
  });

  it('searches activities by related user', () => {
    render(<WalletActivityFeed {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search activities...');
    fireEvent.change(searchInput, { target: { value: 'alice' } });
    
    expect(screen.getByText('Received tip for helpful comment')).toBeInTheDocument();
    expect(screen.queryByText('Earned "Community Helper" badge')).not.toBeInTheDocument();
  });

  it('respects maxItems limit', () => {
    render(<WalletActivityFeed {...defaultProps} maxItems={2} />);
    
    // Should only show 2 most recent activities
    expect(screen.getByText('Received tip for helpful comment')).toBeInTheDocument();
    expect(screen.getByText('Earned "Community Helper" badge')).toBeInTheDocument();
    expect(screen.queryByText('Staked tokens in governance pool')).not.toBeInTheDocument();
  });

  it('shows "View All Activity" button when there are more items', () => {
    render(<WalletActivityFeed {...defaultProps} maxItems={2} />);
    
    expect(screen.getByText('View All Activity →')).toBeInTheDocument();
  });

  it('renders empty state when no activities', () => {
    render(<WalletActivityFeed {...defaultProps} activities={[]} />);
    
    expect(screen.getByText('No wallet activity yet')).toBeInTheDocument();
  });

  it('shows "no activities match filters" when filtered results are empty', () => {
    render(<WalletActivityFeed {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search activities...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    expect(screen.getByText('No activities match your filters')).toBeInTheDocument();
  });

  it('shows connection status indicator', () => {
    render(<WalletActivityFeed {...defaultProps} />);
    
    const connectionIndicator = document.querySelector('.bg-green-500.animate-pulse');
    expect(connectionIndicator).toBeInTheDocument();
  });

  it('handles real-time updates', () => {
    const { rerender } = render(<WalletActivityFeed {...defaultProps} />);
    
    // Add new activity
    const newActivity: WalletActivity = {
      id: '5',
      type: 'tip_received',
      amount: 25,
      token: 'LDAO',
      timestamp: new Date(),
      description: 'New tip received',
      celebratory: true
    };

    rerender(<WalletActivityFeed {...defaultProps} activities={[newActivity, ...mockActivities]} />);
    
    expect(screen.getByText('New tip received')).toBeInTheDocument();
  });

  it('formats time correctly', () => {
    const recentActivity: WalletActivity = {
      id: '6',
      type: 'tip_received',
      timestamp: new Date(Date.now() - 30 * 1000), // 30 seconds ago
      description: 'Very recent tip',
      celebratory: false
    };

    render(<WalletActivityFeed {...defaultProps} activities={[recentActivity]} />);
    
    expect(screen.getByText('Just now')).toBeInTheDocument();
  });

  it('handles multiple filter selections', () => {
    render(<WalletActivityFeed {...defaultProps} />);
    
    // Select Tips and Badges filters
    fireEvent.click(screen.getByText('Tips'));
    fireEvent.click(screen.getByText('Badges'));
    
    expect(screen.getByText('Received tip for helpful comment')).toBeInTheDocument();
    expect(screen.getByText('Earned "Community Helper" badge')).toBeInTheDocument();
    expect(screen.queryByText('Staked tokens in governance pool')).not.toBeInTheDocument();
  });

  it('clears filters when clicked again', () => {
    render(<WalletActivityFeed {...defaultProps} />);
    
    // Click Tips filter twice
    const tipsFilter = screen.getByText('Tips');
    fireEvent.click(tipsFilter);
    fireEvent.click(tipsFilter);
    
    // Should show all activities again
    expect(screen.getByText('Received tip for helpful comment')).toBeInTheDocument();
    expect(screen.getByText('Earned "Community Helper" badge')).toBeInTheDocument();
  });

  it('shows celebratory styling for celebratory activities', () => {
    render(<WalletActivityFeed {...defaultProps} />);
    
    const celebratoryActivity = screen.getByText('Received tip for helpful comment').closest('div');
    expect(celebratoryActivity).toHaveClass('ring-2', 'ring-yellow-400');
  });

  it('disables real-time updates when showRealTimeUpdates is false', () => {
    render(<WalletActivityFeed {...defaultProps} showRealTimeUpdates={false} />);
    
    const connectionIndicator = document.querySelector('.bg-green-500.animate-pulse');
    expect(connectionIndicator).not.toBeInTheDocument();
  });
});