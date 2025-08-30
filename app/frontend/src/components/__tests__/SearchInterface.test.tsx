import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SearchInterface from '../SearchInterface';
import { SearchService } from '@/services/searchService';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';

// Mock Next.js router
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    query: {},
    pathname: '/search'
  })
}));

// Mock dependencies
jest.mock('@/services/searchService');
jest.mock('@/context/Web3Context');
jest.mock('@/context/ToastContext');



const mockWeb3 = {
  address: '0x123',
  isConnected: true
};

const mockToast = {
  addToast: jest.fn()
};

describe('SearchInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    mockReplace.mockClear();
    (useWeb3 as jest.Mock).mockReturnValue(mockWeb3);
    (useToast as jest.Mock).mockReturnValue(mockToast);
  });

  it('should render search input and tabs', () => {
    render(<SearchInterface />);

    expect(screen.getByPlaceholderText(/search posts, communities, users/i)).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Posts')).toBeInTheDocument();
    expect(screen.getByText('Communities')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('should handle search input changes', async () => {
    const mockSuggestions = {
      posts: ['test post'],
      communities: ['test-community'],
      users: ['test-user'],
      hashtags: ['test']
    };

    (SearchService.getSearchSuggestions as jest.Mock).mockResolvedValue(mockSuggestions);

    render(<SearchInterface />);

    const searchInput = screen.getByPlaceholderText(/search posts, communities, users/i);
    fireEvent.change(searchInput, { target: { value: 'test' } });

    expect(searchInput).toHaveValue('test');

    // Wait for debounced suggestions
    await waitFor(() => {
      expect(SearchService.getSearchSuggestions).toHaveBeenCalledWith('test', 'all', 5);
    }, { timeout: 500 });
  });

  it('should perform search on enter key', async () => {
    const mockResults = {
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
      communities: [],
      users: [],
      hashtags: [],
      totalResults: 1,
      hasMore: false
    };

    (SearchService.search as jest.Mock).mockResolvedValue(mockResults);

    render(<SearchInterface />);

    const searchInput = screen.getByPlaceholderText(/search posts, communities, users/i);
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    await waitFor(() => {
      expect(SearchService.search).toHaveBeenCalledWith(
        'test query',
        expect.any(Object),
        20,
        0
      );
    });
  });

  it('should switch between tabs', async () => {
    render(<SearchInterface />);

    const postsTab = screen.getByText('Posts');
    fireEvent.click(postsTab);

    expect(postsTab.closest('button')).toHaveClass('bg-primary-100');
  });

  it('should display search results', async () => {
    const mockResults = {
      posts: [
        {
          id: '1',
          content: 'Test post content',
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
          description: 'A test community',
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
      users: [],
      hashtags: [],
      totalResults: 2,
      hasMore: false
    };

    (SearchService.search as jest.Mock).mockResolvedValue(mockResults);

    render(<SearchInterface initialQuery="test" />);

    await waitFor(() => {
      expect(screen.getByText('Found 2 results for "test"')).toBeInTheDocument();
      expect(screen.getByText('Posts')).toBeInTheDocument();
      expect(screen.getByText('Communities')).toBeInTheDocument();
      expect(screen.getByText('Test Community')).toBeInTheDocument();
    });
  });

  it('should handle search suggestions selection', async () => {
    const mockSuggestions = {
      posts: [],
      communities: ['defi-community'],
      users: [],
      hashtags: ['defi']
    };

    (SearchService.getSearchSuggestions as jest.Mock).mockResolvedValue(mockSuggestions);
    (SearchService.search as jest.Mock).mockResolvedValue({
      posts: [],
      communities: [],
      users: [],
      hashtags: [],
      totalResults: 0,
      hasMore: false
    });

    render(<SearchInterface />);

    const searchInput = screen.getByPlaceholderText(/search posts, communities, users/i);
    fireEvent.change(searchInput, { target: { value: 'defi' } });

    await waitFor(() => {
      expect(screen.getByText('#defi')).toBeInTheDocument();
      expect(screen.getByText('r/defi-community')).toBeInTheDocument();
    });

    // Click on hashtag suggestion
    fireEvent.click(screen.getByText('#defi'));

    await waitFor(() => {
      expect(SearchService.search).toHaveBeenCalledWith(
        '#defi',
        expect.any(Object),
        20,
        0
      );
    });
  });

  it('should handle filter changes', async () => {
    (SearchService.search as jest.Mock).mockResolvedValue({
      posts: [],
      communities: [],
      users: [],
      hashtags: [],
      totalResults: 0,
      hasMore: false
    });

    render(<SearchInterface initialQuery="test" />);

    const timeRangeFilter = screen.getByDisplayValue('All Time');
    fireEvent.change(timeRangeFilter, { target: { value: 'day' } });

    await waitFor(() => {
      expect(SearchService.search).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ timeRange: 'day' }),
        20,
        0
      );
    });
  });

  it('should handle load more functionality', async () => {
    const mockResults = {
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
      communities: [],
      users: [],
      hashtags: [],
      totalResults: 10,
      hasMore: true
    };

    (SearchService.search as jest.Mock).mockResolvedValue(mockResults);

    render(<SearchInterface initialQuery="test" />);

    await waitFor(() => {
      expect(screen.getByText('Load More')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Load More'));

    await waitFor(() => {
      expect(SearchService.search).toHaveBeenCalledWith(
        'test',
        expect.any(Object),
        20,
        20 // Second page
      );
    });
  });

  it('should handle empty search results', async () => {
    const mockResults = {
      posts: [],
      communities: [],
      users: [],
      hashtags: [],
      totalResults: 0,
      hasMore: false
    };

    (SearchService.search as jest.Mock).mockResolvedValue(mockResults);

    render(<SearchInterface initialQuery="nonexistent" />);

    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(screen.getByText(/No results found for "nonexistent"/)).toBeInTheDocument();
    });
  });

  it('should handle search errors', async () => {
    (SearchService.search as jest.Mock).mockRejectedValue(new Error('Search failed'));

    render(<SearchInterface />);

    const searchInput = screen.getByPlaceholderText(/search posts, communities, users/i);
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    await waitFor(() => {
      expect(mockToast.addToast).toHaveBeenCalledWith('Search failed', 'error');
    });
  });

  it('should call onResultSelect when provided', async () => {
    const mockOnResultSelect = jest.fn();
    const mockResults = {
      posts: [],
      communities: [
        {
          id: 'community-1',
          name: 'test-community',
          displayName: 'Test Community',
          description: 'A test community',
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
      users: [],
      hashtags: [],
      totalResults: 1,
      hasMore: false
    };

    (SearchService.search as jest.Mock).mockResolvedValue(mockResults);

    render(<SearchInterface initialQuery="test" onResultSelect={mockOnResultSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Test Community')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Test Community'));

    expect(mockOnResultSelect).toHaveBeenCalledWith('community', 'community-1');
  });
});