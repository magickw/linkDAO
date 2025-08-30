import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TrendingContent from '../TrendingContent';
import { SearchService } from '@/services/searchService';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    query: {},
    pathname: '/trending'
  })
}));

// Mock dependencies
jest.mock('@/services/searchService');

describe('TrendingContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
  });

  it('should render trending content sections', async () => {
    const mockTrendingData = {
      posts: [
        {
          id: '1',
          content: 'Trending post about DeFi',
          author: '0x123',
          createdAt: new Date().toISOString(),
          tags: ['defi'],
          reactions: []
        }
      ],
      communities: [
        {
          id: '1',
          name: 'defi-community',
          displayName: 'DeFi Community',
          description: 'A trending DeFi community',
          memberCount: 1000,
          createdAt: new Date().toISOString(),
          category: 'Finance',
          tags: ['defi'],
          isPublic: true,
          moderators: [],
          settings: {
            allowedPostTypes: [],
            requireApproval: false,
            minimumReputation: 0,
            stakingRequirements: []
          }
        }
      ],
      hashtags: ['defi', 'nft'],
      topics: ['blockchain', 'web3']
    };

    const mockHashtags = [
      { tag: 'defi', count: 1000, growth: 15 },
      { tag: 'nft', count: 800, growth: 10 }
    ];

    (SearchService.getTrendingContent as jest.Mock).mockResolvedValue(mockTrendingData);
    (SearchService.getTrendingHashtags as jest.Mock).mockResolvedValue(mockHashtags);

    render(<TrendingContent />);

    await waitFor(() => {
      expect(screen.getByText('🔥 Trending Now')).toBeInTheDocument();
      expect(screen.getByText('Trending Hashtags')).toBeInTheDocument();
      expect(screen.getByText('Trending Communities')).toBeInTheDocument();
      expect(screen.getByText('Trending Topics')).toBeInTheDocument();
      expect(screen.getByText('Trending Posts')).toBeInTheDocument();
    });
  });

  it('should display trending hashtags with growth indicators', async () => {
    const mockHashtags = [
      { tag: 'defi', count: 1000, growth: 15 },
      { tag: 'nft', count: 800, growth: 10 },
      { tag: 'web3', count: 1200, growth: 25 }
    ];

    (SearchService.getTrendingContent as jest.Mock).mockResolvedValue({
      posts: [],
      communities: [],
      hashtags: [],
      topics: []
    });
    (SearchService.getTrendingHashtags as jest.Mock).mockResolvedValue(mockHashtags);

    render(<TrendingContent />);

    await waitFor(() => {
      expect(screen.getByText('#defi')).toBeInTheDocument();
      expect(screen.getByText('#nft')).toBeInTheDocument();
      expect(screen.getByText('#web3')).toBeInTheDocument();
      expect(screen.getByText('1,000 posts')).toBeInTheDocument();
      expect(screen.getByText('15%')).toBeInTheDocument();
    });
  });

  it('should handle time range changes', async () => {
    const mockTrendingData = {
      posts: [],
      communities: [],
      hashtags: [],
      topics: []
    };

    (SearchService.getTrendingContent as jest.Mock).mockResolvedValue(mockTrendingData);
    (SearchService.getTrendingHashtags as jest.Mock).mockResolvedValue([]);

    render(<TrendingContent />);

    const timeRangeSelect = screen.getByDisplayValue('Past Day');
    fireEvent.change(timeRangeSelect, { target: { value: 'week' } });

    await waitFor(() => {
      expect(SearchService.getTrendingContent).toHaveBeenCalledWith('week', 10);
      expect(SearchService.getTrendingHashtags).toHaveBeenCalledWith('week', 10);
    });
  });

  it('should handle hashtag clicks', async () => {
    const mockOnItemClick = jest.fn();
    const mockHashtags = [
      { tag: 'defi', count: 1000, growth: 15 }
    ];

    (SearchService.getTrendingContent as jest.Mock).mockResolvedValue({
      posts: [],
      communities: [],
      hashtags: [],
      topics: []
    });
    (SearchService.getTrendingHashtags as jest.Mock).mockResolvedValue(mockHashtags);

    render(<TrendingContent onItemClick={mockOnItemClick} />);

    await waitFor(() => {
      expect(screen.getByText('#defi')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('#defi'));

    expect(mockOnItemClick).toHaveBeenCalledWith('hashtag', mockHashtags[0]);
  });

  it('should handle community clicks', async () => {
    const mockOnItemClick = jest.fn();
    const mockCommunity = {
      id: '1',
      name: 'defi-community',
      displayName: 'DeFi Community',
      description: 'A trending DeFi community',
      memberCount: 1000,
      createdAt: new Date().toISOString(),
      category: 'Finance',
      tags: ['defi'],
      isPublic: true,
      moderators: [],
      settings: {
        allowedPostTypes: [],
        requireApproval: false,
        minimumReputation: 0,
        stakingRequirements: []
      }
    };

    (SearchService.getTrendingContent as jest.Mock).mockResolvedValue({
      posts: [],
      communities: [mockCommunity],
      hashtags: [],
      topics: []
    });
    (SearchService.getTrendingHashtags as jest.Mock).mockResolvedValue([]);

    render(<TrendingContent onItemClick={mockOnItemClick} />);

    await waitFor(() => {
      expect(screen.getByText('DeFi Community')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('DeFi Community'));

    expect(mockOnItemClick).toHaveBeenCalledWith('community', mockCommunity);
  });

  it('should handle topic clicks', async () => {
    const mockOnItemClick = jest.fn();

    (SearchService.getTrendingContent as jest.Mock).mockResolvedValue({
      posts: [],
      communities: [],
      hashtags: [],
      topics: ['blockchain', 'web3']
    });
    (SearchService.getTrendingHashtags as jest.Mock).mockResolvedValue([]);

    render(<TrendingContent onItemClick={mockOnItemClick} />);

    await waitFor(() => {
      expect(screen.getByText('blockchain')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('blockchain'));

    expect(mockOnItemClick).toHaveBeenCalledWith('topic', 'blockchain');
  });

  it('should show loading state', () => {
    (SearchService.getTrendingContent as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    (SearchService.getTrendingHashtags as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<TrendingContent />);

    // Should show loading skeleton
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should handle errors gracefully', async () => {
    (SearchService.getTrendingContent as jest.Mock).mockRejectedValue(
      new Error('Failed to load trending content')
    );
    (SearchService.getTrendingHashtags as jest.Mock).mockRejectedValue(
      new Error('Failed to load hashtags')
    );

    render(<TrendingContent />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load trending content')).toBeInTheDocument();
    });
  });

  it('should show empty state when no trending content', async () => {
    (SearchService.getTrendingContent as jest.Mock).mockResolvedValue(null);
    (SearchService.getTrendingHashtags as jest.Mock).mockResolvedValue([]);

    render(<TrendingContent />);

    await waitFor(() => {
      expect(screen.getByText('No trending content')).toBeInTheDocument();
    });
  });

  it('should respect show/hide props for different sections', async () => {
    const mockTrendingData = {
      posts: [
        {
          id: '1',
          content: 'Test post',
          author: '0x123',
          createdAt: new Date().toISOString(),
          tags: ['test'],
          reactions: []
        }
      ],
      communities: [
        {
          id: '1',
          name: 'test-community',
          displayName: 'Test Community',
          description: 'Test',
          memberCount: 100,
          createdAt: new Date().toISOString(),
          category: 'Test',
          tags: ['test'],
          isPublic: true,
          moderators: [],
          settings: {
            allowedPostTypes: [],
            requireApproval: false,
            minimumReputation: 0,
            stakingRequirements: []
          }
        }
      ],
      hashtags: ['test'],
      topics: ['testing']
    };

    (SearchService.getTrendingContent as jest.Mock).mockResolvedValue(mockTrendingData);
    (SearchService.getTrendingHashtags as jest.Mock).mockResolvedValue([
      { tag: 'test', count: 100, growth: 5 }
    ]);

    render(
      <TrendingContent 
        showPosts={false}
        showCommunities={false}
        showHashtags={true}
        showTopics={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Trending Hashtags')).toBeInTheDocument();
      expect(screen.queryByText('Trending Posts')).not.toBeInTheDocument();
      expect(screen.queryByText('Trending Communities')).not.toBeInTheDocument();
      expect(screen.queryByText('Trending Topics')).not.toBeInTheDocument();
    });
  });

  it('should use default navigation when no onItemClick provided', async () => {
    const mockHashtags = [
      { tag: 'defi', count: 1000, growth: 15 }
    ];

    (SearchService.getTrendingContent as jest.Mock).mockResolvedValue({
      posts: [],
      communities: [],
      hashtags: [],
      topics: []
    });
    (SearchService.getTrendingHashtags as jest.Mock).mockResolvedValue(mockHashtags);

    render(<TrendingContent />);

    await waitFor(() => {
      expect(screen.getByText('#defi')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('#defi'));

    expect(mockPush).toHaveBeenCalledWith('/hashtags/defi');
  });
});