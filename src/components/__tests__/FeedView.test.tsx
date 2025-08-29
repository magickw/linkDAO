import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedView from '../FeedView';
import { useWeb3 } from '@/context/Web3Context';
import { useNavigation } from '@/context/NavigationContext';
import { useFeed, useCreatePost } from '@/hooks/usePosts';
import { useToast } from '@/context/ToastContext';

// Mock the hooks and contexts
jest.mock('@/context/Web3Context');
jest.mock('@/context/NavigationContext');
jest.mock('@/hooks/usePosts');
jest.mock('@/context/ToastContext');

const mockUseWeb3 = useWeb3 as jest.MockedFunction<typeof useWeb3>;
const mockUseNavigation = useNavigation as jest.MockedFunction<typeof useNavigation>;
const mockUseFeed = useFeed as jest.MockedFunction<typeof useFeed>;
const mockUseCreatePost = useCreatePost as jest.MockedFunction<typeof useCreatePost>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

describe('FeedView', () => {
  const mockAddToast = jest.fn();
  const mockOpenModal = jest.fn();
  const mockCloseModal = jest.fn();
  const mockCreatePost = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseWeb3.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    } as any);

    mockUseNavigation.mockReturnValue({
      navigationState: {
        activeView: 'feed',
        activeCommunity: undefined,
        sidebarCollapsed: false,
        rightSidebarVisible: true,
        modalState: {
          postCreation: false,
          communityJoin: false,
          userProfile: false,
        },
      },
      openModal: mockOpenModal,
      closeModal: mockCloseModal,
    } as any);

    mockUseFeed.mockReturnValue({
      feed: [],
      isLoading: false,
      error: null,
    });

    mockUseCreatePost.mockReturnValue({
      createPost: mockCreatePost,
      isLoading: false,
      error: null,
      success: false,
    });

    mockUseToast.mockReturnValue({
      addToast: mockAddToast,
    } as any);
  });

  it('renders feed view with header and filters', () => {
    render(<FeedView />);

    expect(screen.getByText('Social Feed')).toBeInTheDocument();
    expect(screen.getByText('All Posts')).toBeInTheDocument();
    expect(screen.getByText('Following')).toBeInTheDocument();
    expect(screen.getByText('Trending')).toBeInTheDocument();
  });

  it('shows post creation interface when connected', () => {
    render(<FeedView />);

    expect(screen.getByText("What's happening in Web3?")).toBeInTheDocument();
    expect(screen.getByText('Photo')).toBeInTheDocument();
    expect(screen.getByText('Poll')).toBeInTheDocument();
    expect(screen.getByText('NFT')).toBeInTheDocument();
  });

  it('opens post creation modal when clicking on post creation area', () => {
    render(<FeedView />);

    const postCreationArea = screen.getByText("What's happening in Web3?").closest('div');
    fireEvent.click(postCreationArea!);

    expect(mockOpenModal).toHaveBeenCalledWith('postCreation');
  });

  it('shows empty state when no posts are available', () => {
    render(<FeedView />);

    expect(screen.getByText('No posts yet')).toBeInTheDocument();
    expect(screen.getByText('Be the first to post something!')).toBeInTheDocument();
  });

  it('shows loading state when feed is loading', () => {
    mockUseFeed.mockReturnValue({
      feed: [],
      isLoading: true,
      error: null,
    });

    render(<FeedView />);

    expect(screen.getAllByText(/Loading/i)).toHaveLength(3); // 3 loading skeletons
  });

  it('shows error state when feed fails to load', () => {
    mockUseFeed.mockReturnValue({
      feed: [],
      isLoading: false,
      error: 'Failed to load feed',
    });

    render(<FeedView />);

    expect(screen.getByText('Error loading feed')).toBeInTheDocument();
    expect(screen.getByText('Failed to load feed')).toBeInTheDocument();
  });

  it('filters posts correctly when changing filter tabs', () => {
    const mockPosts = [
      {
        id: '1',
        author: '0x1234567890123456789012345678901234567890',
        parentId: null,
        contentCid: 'Test post 1',
        mediaCids: [],
        tags: ['defi'],
        createdAt: new Date(),
        onchainRef: '0x1234',
      },
      {
        id: '2',
        author: '0x2345678901234567890123456789012345678901',
        parentId: null,
        contentCid: 'Test post 2',
        mediaCids: [],
        tags: ['social'],
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        onchainRef: '0x2345',
      },
    ];

    mockUseFeed.mockReturnValue({
      feed: mockPosts,
      isLoading: false,
      error: null,
    });

    render(<FeedView />);

    // Initially should show all posts
    expect(screen.getByText('Test post 1')).toBeInTheDocument();
    expect(screen.getByText('Test post 2')).toBeInTheDocument();

    // Click on trending filter
    fireEvent.click(screen.getByText('Trending'));

    // Should only show the recent post with trending tags
    expect(screen.getByText('Test post 1')).toBeInTheDocument();
    expect(screen.queryByText('Test post 2')).not.toBeInTheDocument();
  });

  it('does not show post creation interface when not connected', () => {
    mockUseWeb3.mockReturnValue({
      address: undefined,
      isConnected: false,
    } as any);

    render(<FeedView />);

    expect(screen.queryByText("What's happening in Web3?")).not.toBeInTheDocument();
  });

  it('shows appropriate empty state message for different filters', () => {
    render(<FeedView />);

    // Click on following filter
    fireEvent.click(screen.getByText('Following'));
    expect(screen.getByText('No posts from people you follow')).toBeInTheDocument();

    // Click on trending filter
    fireEvent.click(screen.getByText('Trending'));
    expect(screen.getByText('No trending posts right now')).toBeInTheDocument();
  });
});