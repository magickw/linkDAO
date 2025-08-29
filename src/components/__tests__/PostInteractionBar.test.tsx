import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Web3Context } from '@/context/Web3Context';
import { ToastContext } from '@/context/ToastContext';
import PostInteractionBar from '../PostInteractionBar';

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

const mockPost = {
  id: 'test-post-id',
  title: 'Test Post Title',
  contentCid: 'This is a test post content.',
  author: '0x9876543210987654321098765432109876543210',
  dao: 'test-dao',
  commentCount: 5,
  stakedValue: 100
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

describe('PostInteractionBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all interaction buttons', () => {
    renderWithProviders(
      <PostInteractionBar
        post={mockPost}
        postType="feed"
      />
    );

    expect(screen.getByText('5 Comments')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
    expect(screen.getByText('Tip')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('100 $LNK staked')).toBeInTheDocument();
  });

  it('handles comment button click', () => {
    const mockOnComment = jest.fn();
    
    renderWithProviders(
      <PostInteractionBar
        post={mockPost}
        postType="feed"
        onComment={mockOnComment}
      />
    );

    const commentButton = screen.getByText('5 Comments');
    fireEvent.click(commentButton);

    expect(mockOnComment).toHaveBeenCalled();
  });

  it('opens share modal when share button is clicked', async () => {
    renderWithProviders(
      <PostInteractionBar
        post={mockPost}
        postType="feed"
      />
    );

    const shareButton = screen.getByText('Share');
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(screen.getByText('Share Post')).toBeInTheDocument();
    });
  });

  it('shows tip input for feed posts', async () => {
    renderWithProviders(
      <PostInteractionBar
        post={mockPost}
        postType="feed"
      />
    );

    const tipButton = screen.getByText('Tip');
    fireEvent.click(tipButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Amount')).toBeInTheDocument();
    });
  });

  it('handles quick tip submission', async () => {
    const mockOnTip = jest.fn().mockResolvedValue(undefined);
    
    renderWithProviders(
      <PostInteractionBar
        post={mockPost}
        postType="feed"
        onTip={mockOnTip}
      />
    );

    const tipButton = screen.getByText('Tip');
    fireEvent.click(tipButton);

    await waitFor(() => {
      const amountInput = screen.getByPlaceholderText('Amount');
      fireEvent.change(amountInput, { target: { value: '5' } });
    });

    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockOnTip).toHaveBeenCalledWith('test-post-id', '5', 'USDC');
    });
  });

  it('prevents self-tipping', async () => {
    const selfPost = { ...mockPost, author: mockWeb3Context.address };
    
    renderWithProviders(
      <PostInteractionBar
        post={selfPost}
        postType="feed"
      />
    );

    const tipButton = screen.getByText('Tip');
    fireEvent.click(tipButton);

    await waitFor(() => {
      const amountInput = screen.getByPlaceholderText('Amount');
      fireEvent.change(amountInput, { target: { value: '5' } });
    });

    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);

    expect(mockToastContext.addToast).toHaveBeenCalledWith(
      'You cannot tip yourself',
      'error'
    );
  });

  it('handles save post action', () => {
    renderWithProviders(
      <PostInteractionBar
        post={mockPost}
        postType="feed"
      />
    );

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    expect(mockToastContext.addToast).toHaveBeenCalledWith(
      'Post saved to your collection!',
      'success'
    );
  });

  it('requires wallet connection for interactions', () => {
    const disconnectedContext = { ...mockWeb3Context, isConnected: false, address: null };
    
    render(
      <Web3Context.Provider value={disconnectedContext}>
        <ToastContext.Provider value={mockToastContext}>
          <PostInteractionBar
            post={mockPost}
            postType="feed"
          />
        </ToastContext.Provider>
      </Web3Context.Provider>
    );

    const commentButton = screen.getByText('5 Comments');
    fireEvent.click(commentButton);

    expect(mockToastContext.addToast).toHaveBeenCalledWith(
      'Please connect your wallet to comment',
      'error'
    );
  });

  it('shows community tip button for community posts with membership', () => {
    const userMembership = { userId: 'user1', communityId: 'community1', role: 'member' };
    
    renderWithProviders(
      <PostInteractionBar
        post={{ ...mockPost, communityId: 'community1' }}
        postType="community"
        userMembership={userMembership}
      />
    );

    // Should show the community tip button instead of regular tip
    expect(screen.getByText('Tip')).toBeInTheDocument();
  });

  it('requires community membership for community interactions', () => {
    renderWithProviders(
      <PostInteractionBar
        post={{ ...mockPost, communityId: 'community1' }}
        postType="community"
      />
    );

    const commentButton = screen.getByText('5 Comments');
    fireEvent.click(commentButton);

    expect(mockToastContext.addToast).toHaveBeenCalledWith(
      'You must join the community to comment',
      'error'
    );
  });
});