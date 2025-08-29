import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Web3Context } from '@/context/Web3Context';
import { ToastContext } from '@/context/ToastContext';
import EnhancedReactionSystem from '../EnhancedReactionSystem';

// Mock contexts
const mockWeb3Context = {
  address: '0x1234567890123456789012345678901234567890',
  isConnected: true,
  connect: jest.fn(),
  disconnect: jest.fn(),
  chainId: 1,
  isLoading: false
};

const mockToastContext = {
  addToast: jest.fn(),
  removeToast: jest.fn(),
  toasts: []
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Web3Context.Provider value={mockWeb3Context}>
      <ToastContext.Provider value={mockToastContext}>
        {component}
      </ToastContext.Provider>
    </Web3Context.Provider>
  );
};

describe('EnhancedReactionSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders feed reactions correctly', () => {
    renderWithProviders(
      <EnhancedReactionSystem
        postId="test-post"
        postType="feed"
      />
    );

    // Should show add reaction button
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders community reactions correctly', () => {
    renderWithProviders(
      <EnhancedReactionSystem
        postId="test-post"
        postType="community"
      />
    );

    // Should show add reaction button
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows reaction picker when add button is clicked', async () => {
    renderWithProviders(
      <EnhancedReactionSystem
        postId="test-post"
        postType="feed"
      />
    );

    const addButton = screen.getByRole('button');
    fireEvent.click(addButton);

    // Should show reaction picker
    await waitFor(() => {
      expect(screen.getByText('Like')).toBeInTheDocument();
    });
  });

  it('handles simple reactions for feed posts', async () => {
    const mockOnReaction = jest.fn().mockResolvedValue(undefined);
    
    renderWithProviders(
      <EnhancedReactionSystem
        postId="test-post"
        postType="feed"
        onReaction={mockOnReaction}
      />
    );

    const addButton = screen.getByRole('button');
    fireEvent.click(addButton);

    await waitFor(() => {
      const likeButton = screen.getByText('Like');
      fireEvent.click(likeButton);
    });

    expect(mockOnReaction).toHaveBeenCalledWith('test-post', 'like');
  });

  it('shows staking modal for community reactions', async () => {
    renderWithProviders(
      <EnhancedReactionSystem
        postId="test-post"
        postType="community"
      />
    );

    const addButton = screen.getByRole('button');
    fireEvent.click(addButton);

    await waitFor(() => {
      const hotButton = screen.getByText('Hot Take');
      fireEvent.click(hotButton);
    });

    // Should show staking modal
    await waitFor(() => {
      expect(screen.getByText('Stake on Reaction')).toBeInTheDocument();
    });
  });

  it('requires wallet connection for reactions', async () => {
    const disconnectedContext = { ...mockWeb3Context, isConnected: false, address: null };
    
    render(
      <Web3Context.Provider value={disconnectedContext}>
        <ToastContext.Provider value={mockToastContext}>
          <EnhancedReactionSystem
            postId="test-post"
            postType="feed"
          />
        </ToastContext.Provider>
      </Web3Context.Provider>
    );

    const addButton = screen.getByRole('button');
    fireEvent.click(addButton);

    await waitFor(() => {
      const likeButton = screen.getByText('Like');
      fireEvent.click(likeButton);
    });

    expect(mockToastContext.addToast).toHaveBeenCalledWith(
      'Please connect your wallet to react',
      'error'
    );
  });

  it('displays existing reactions', () => {
    const initialReactions = [
      {
        type: 'like' as const,
        emoji: '👍',
        label: 'Like',
        totalStaked: 0,
        userStaked: 0,
        contributors: [],
        rewardsEarned: 0,
        count: 5
      }
    ];

    renderWithProviders(
      <EnhancedReactionSystem
        postId="test-post"
        postType="feed"
        initialReactions={initialReactions}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });
});