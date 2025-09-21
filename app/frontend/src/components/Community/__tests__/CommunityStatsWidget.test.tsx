import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CommunityStatsWidget } from '../CommunityStatsWidget';
import { Community, CommunityStats } from '../../../types/community';

// Mock data
const mockCommunity: Community = {
  id: 'test-community',
  name: 'test-community',
  displayName: 'Test Community',
  description: 'A test community',
  rules: [],
  memberCount: 1500,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  category: 'technology',
  tags: ['test', 'community'],
  isPublic: true,
  moderators: [],
  settings: {
    allowedPostTypes: [],
    requireApproval: false,
    minimumReputation: 0,
    stakingRequirements: []
  }
};

const mockStats: CommunityStats = {
  memberCount: 1500,
  onlineCount: 150,
  postsThisWeek: 45,
  activeDiscussions: 12,
  growthRate: 5.2,
  createdAt: new Date('2023-01-01')
};

const mockStatsLowActivity: CommunityStats = {
  memberCount: 1000,
  onlineCount: 10,
  postsThisWeek: 5,
  activeDiscussions: 2,
  growthRate: -2.1,
  createdAt: new Date('2023-01-01')
};

describe('CommunityStatsWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders widget header correctly', () => {
      render(<CommunityStatsWidget community={mockCommunity} stats={mockStats} />);
      
      expect(screen.getByText('Community Stats')).toBeInTheDocument();
    });

    it('displays member count and online count', () => {
      render(<CommunityStatsWidget community={mockCommunity} stats={mockStats} />);
      
      expect(screen.getByText('1.5K')).toBeInTheDocument(); // formatted member count
      expect(screen.getByText('150')).toBeInTheDocument(); // online count
      expect(screen.getByText('Total Members')).toBeInTheDocument();
      expect(screen.getByText('Online Now')).toBeInTheDocument();
    });

    it('displays weekly activity metrics', () => {
      render(<CommunityStatsWidget community={mockCommunity} stats={mockStats} />);
      
      expect(screen.getByText('45')).toBeInTheDocument(); // posts this week
      expect(screen.getByText('12')).toBeInTheDocument(); // active discussions
      expect(screen.getByText('Posts This Week')).toBeInTheDocument();
      expect(screen.getByText('Active Discussions')).toBeInTheDocument();
    });

    it('displays growth rate when available', () => {
      render(<CommunityStatsWidget community={mockCommunity} stats={mockStats} />);
      
      expect(screen.getByText('+5.2%')).toBeInTheDocument();
      expect(screen.getByText('Growth This Month')).toBeInTheDocument();
    });

    it('displays negative growth rate correctly', () => {
      render(<CommunityStatsWidget community={mockCommunity} stats={mockStatsLowActivity} />);
      
      expect(screen.getByText('-2.1%')).toBeInTheDocument();
    });
  });

  describe('Number Formatting', () => {
    it('formats large numbers correctly', () => {
      const largeStats: CommunityStats = {
        ...mockStats,
        memberCount: 1500000,
        onlineCount: 25000,
        postsThisWeek: 1200
      };

      render(<CommunityStatsWidget community={mockCommunity} stats={largeStats} />);
      
      expect(screen.getByText('1.5M')).toBeInTheDocument(); // 1.5 million
      expect(screen.getByText('25.0K')).toBeInTheDocument(); // 25 thousand
      expect(screen.getByText('1,200')).toBeInTheDocument(); // 1200 with comma
    });

    it('handles small numbers correctly', () => {
      const smallStats: CommunityStats = {
        ...mockStats,
        memberCount: 50,
        onlineCount: 5,
        postsThisWeek: 3
      };

      render(<CommunityStatsWidget community={mockCommunity} stats={smallStats} />);
      
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Activity Level Calculation', () => {
    it('shows "Very Active" for high online percentage', () => {
      const highActivityStats: CommunityStats = {
        ...mockStats,
        memberCount: 1000,
        onlineCount: 150 // 15%
      };

      render(<CommunityStatsWidget community={mockCommunity} stats={highActivityStats} />);
      
      expect(screen.getByText('Very Active')).toBeInTheDocument();
      expect(screen.getByText('15.0% of members online')).toBeInTheDocument();
    });

    it('shows "Active" for moderate online percentage', () => {
      const moderateActivityStats: CommunityStats = {
        ...mockStats,
        memberCount: 1000,
        onlineCount: 70 // 7%
      };

      render(<CommunityStatsWidget community={mockCommunity} stats={moderateActivityStats} />);
      
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('7.0% of members online')).toBeInTheDocument();
    });

    it('shows "Moderate" for low-moderate online percentage', () => {
      const lowModerateActivityStats: CommunityStats = {
        ...mockStats,
        memberCount: 1000,
        onlineCount: 30 // 3%
      };

      render(<CommunityStatsWidget community={mockCommunity} stats={lowModerateActivityStats} />);
      
      expect(screen.getByText('Moderate')).toBeInTheDocument();
      expect(screen.getByText('3.0% of members online')).toBeInTheDocument();
    });

    it('shows "Quiet" for very low online percentage', () => {
      render(<CommunityStatsWidget community={mockCommunity} stats={mockStatsLowActivity} />);
      
      expect(screen.getByText('Quiet')).toBeInTheDocument();
      expect(screen.getByText('1.0% of members online')).toBeInTheDocument();
    });
  });

  describe('Fallback States', () => {
    it('displays fallback when no stats provided', () => {
      render(<CommunityStatsWidget community={mockCommunity} />);
      
      expect(screen.getByText('Statistics unavailable')).toBeInTheDocument();
      expect(screen.getByText('Community statistics will appear here when available')).toBeInTheDocument();
    });

    it('displays N/A for undefined values', () => {
      const incompleteStats: Partial<CommunityStats> = {
        memberCount: undefined,
        onlineCount: undefined,
        postsThisWeek: 10,
        activeDiscussions: undefined
      };

      render(<CommunityStatsWidget community={mockCommunity} stats={incompleteStats as CommunityStats} />);
      
      expect(screen.getAllByText('N/A')).toHaveLength(3); // member count, online count, active discussions
      expect(screen.getByText('10')).toBeInTheDocument(); // posts this week should still show
    });

    it('shows unknown activity level when data unavailable', () => {
      const incompleteStats: Partial<CommunityStats> = {
        memberCount: undefined,
        onlineCount: undefined,
        postsThisWeek: 10,
        activeDiscussions: 5
      };

      render(<CommunityStatsWidget community={mockCommunity} stats={incompleteStats as CommunityStats} />);
      
      expect(screen.getByText('Unknown')).toBeInTheDocument();
      expect(screen.getByText('Activity level unavailable')).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('renders refresh button when onRefresh provided', () => {
      const mockRefresh = jest.fn();
      render(<CommunityStatsWidget community={mockCommunity} stats={mockStats} onRefresh={mockRefresh} />);
      
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    it('calls onRefresh when refresh button clicked', async () => {
      const mockRefresh = jest.fn().mockResolvedValue(undefined);
      render(<CommunityStatsWidget community={mockCommunity} stats={mockStats} onRefresh={mockRefresh} />);
      
      fireEvent.click(screen.getByText('Refresh'));
      
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('shows loading state during refresh', async () => {
      const mockRefresh = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<CommunityStatsWidget community={mockCommunity} stats={mockStats} onRefresh={mockRefresh} />);
      
      fireEvent.click(screen.getByText('Refresh'));
      
      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByText('Refreshing...')).not.toBeInTheDocument();
      });
    });

    it('shows last updated time after successful refresh', async () => {
      const mockRefresh = jest.fn().mockResolvedValue(undefined);
      render(<CommunityStatsWidget community={mockCommunity} stats={mockStats} onRefresh={mockRefresh} />);
      
      fireEvent.click(screen.getByText('Refresh'));
      
      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
      });
    });

    it('handles refresh errors gracefully', async () => {
      const mockRefresh = jest.fn().mockRejectedValue(new Error('Network error'));
      render(<CommunityStatsWidget community={mockCommunity} stats={mockStats} onRefresh={mockRefresh} />);
      
      fireEvent.click(screen.getByText('Refresh'));
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('allows retry after error', async () => {
      const mockRefresh = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);
      
      render(<CommunityStatsWidget community={mockCommunity} stats={mockStats} onRefresh={mockRefresh} />);
      
      // First call fails
      fireEvent.click(screen.getByText('Refresh'));
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
      
      // Retry succeeds
      fireEvent.click(screen.getByText('Try Again'));
      
      await waitFor(() => {
        expect(screen.queryByText('Network error')).not.toBeInTheDocument();
      });
      
      expect(mockRefresh).toHaveBeenCalledTimes(2);
    });
  });

  describe('Auto-refresh', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('auto-refreshes at specified interval', async () => {
      const mockRefresh = jest.fn().mockResolvedValue(undefined);
      render(
        <CommunityStatsWidget 
          community={mockCommunity} 
          stats={mockStats} 
          onRefresh={mockRefresh}
          refreshInterval={5000}
        />
      );
      
      expect(mockRefresh).not.toHaveBeenCalled();
      
      // Fast-forward 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalledTimes(1);
      });
      
      // Fast-forward another 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalledTimes(2);
      });
    });

    it('does not auto-refresh when interval is 0', () => {
      const mockRefresh = jest.fn().mockResolvedValue(undefined);
      render(
        <CommunityStatsWidget 
          community={mockCommunity} 
          stats={mockStats} 
          onRefresh={mockRefresh}
          refreshInterval={0}
        />
      );
      
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('cleans up interval on unmount', () => {
      const mockRefresh = jest.fn().mockResolvedValue(undefined);
      const { unmount } = render(
        <CommunityStatsWidget 
          community={mockCommunity} 
          stats={mockStats} 
          onRefresh={mockRefresh}
          refreshInterval={5000}
        />
      );
      
      unmount();
      
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      expect(mockRefresh).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      const mockRefresh = jest.fn();
      render(<CommunityStatsWidget community={mockCommunity} stats={mockStats} onRefresh={mockRefresh} />);
      
      expect(screen.getByLabelText('Refresh statistics')).toBeInTheDocument();
    });

    it('disables refresh button during loading', async () => {
      const mockRefresh = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<CommunityStatsWidget community={mockCommunity} stats={mockStats} onRefresh={mockRefresh} />);
      
      const refreshButton = screen.getByLabelText('Refresh statistics');
      fireEvent.click(refreshButton);
      
      expect(refreshButton).toBeDisabled();
      
      await waitFor(() => {
        expect(refreshButton).not.toBeDisabled();
      });
    });
  });

  describe('Fallback Load Button', () => {
    it('shows load button when no stats and onRefresh provided', () => {
      const mockRefresh = jest.fn();
      render(<CommunityStatsWidget community={mockCommunity} onRefresh={mockRefresh} />);
      
      expect(screen.getByText('Load Statistics')).toBeInTheDocument();
    });

    it('calls onRefresh when load button clicked', () => {
      const mockRefresh = jest.fn().mockResolvedValue(undefined);
      render(<CommunityStatsWidget community={mockCommunity} onRefresh={mockRefresh} />);
      
      fireEvent.click(screen.getByText('Load Statistics'));
      
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });
});