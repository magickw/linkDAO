import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AICommunityRecommendations from '../AICommunityRecommendations';

// Mock wagmi useAccount hook
jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true
  })
}));

// Mock useMobileOptimization hook
jest.mock('../../../hooks/useMobileOptimization', () => ({
  useMobileOptimization: () => ({
    isMobile: false,
    touchTargetClasses: 'min-w-[44px] min-h-[44px] flex items-center justify-center'
  })
}));

// Mock analyticsService
jest.mock('../../../services/analyticsService', () => ({
  analyticsService: {
    trackUserEvent: jest.fn()
  }
}));

describe('AICommunityRecommendations', () => {
  const mockJoinedCommunities = ['community-1', 'community-2'];
  const mockAllCommunities = [
    {
      id: 'community-1',
      name: 'Community 1',
      displayName: 'Community One',
      description: 'First community',
      memberCount: 100,
      category: 'Technology'
    },
    {
      id: 'community-2',
      name: 'Community 2',
      displayName: 'Community Two',
      description: 'Second community',
      memberCount: 200,
      category: 'Science'
    },
    {
      id: 'community-3',
      name: 'Community 3',
      displayName: 'Community Three',
      description: 'Third community',
      memberCount: 300,
      category: 'Arts'
    }
  ];
  const mockOnJoinCommunity = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render the component with recommendations', async () => {
    render(
      <AICommunityRecommendations
        joinedCommunities={mockJoinedCommunities}
        allCommunities={mockAllCommunities}
        onJoinCommunity={mockOnJoinCommunity}
      />
    );
    
    // Wait for loading to complete
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.getByText('AI Recommendations')).toBeInTheDocument();
      expect(screen.getByText('Community Three')).toBeInTheDocument();
      expect(screen.getByText('300 members')).toBeInTheDocument();
    });
  });

  it('should not render when user has no joined communities', () => {
    render(
      <AICommunityRecommendations
        joinedCommunities={[]}
        allCommunities={mockAllCommunities}
        onJoinCommunity={mockOnJoinCommunity}
      />
    );
    
    expect(screen.queryByText('AI Recommendations')).not.toBeInTheDocument();
  });

  it('should call onJoinCommunity when Join button is clicked', async () => {
    render(
      <AICommunityRecommendations
        joinedCommunities={mockJoinedCommunities}
        allCommunities={mockAllCommunities}
        onJoinCommunity={mockOnJoinCommunity}
      />
    );
    
    // Wait for loading to complete
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      const joinButton = screen.getByText('Join');
      fireEvent.click(joinButton);
      
      expect(mockOnJoinCommunity).toHaveBeenCalledWith('community-3');
    });
  });

  it('should display error message when recommendations fail to load', async () => {
    // Mock implementation that throws an error
    jest.spyOn(global.Math, 'random').mockImplementation(() => 0.5);
    
    render(
      <AICommunityRecommendations
        joinedCommunities={mockJoinedCommunities}
        allCommunities={[]}
        onJoinCommunity={mockOnJoinCommunity}
      />
    );
    
    // Wait for loading to complete
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load recommendations')).toBeInTheDocument();
    });
    
    // Restore the original implementation
    jest.spyOn(global.Math, 'random').mockRestore();
  });

  it('should show loading state while fetching recommendations', () => {
    render(
      <AICommunityRecommendations
        joinedCommunities={mockJoinedCommunities}
        allCommunities={mockAllCommunities}
        onJoinCommunity={mockOnJoinCommunity}
      />
    );
    
    expect(screen.getByText('Finding communities for you...')).toBeInTheDocument();
  });
});