import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Web3Context } from '@/context/Web3Context';
import { ToastContext } from '@/context/ToastContext';
import SharePostModal from '../SharePostModal';

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
  contentCid: 'This is a test post content that should be displayed in the share modal.',
  author: '0x1234567890123456789012345678901234567890',
  dao: 'test-dao'
};

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined)
  }
});

// Mock window.open
global.open = jest.fn();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Web3Context.Provider value={mockWeb3Context}>
      <ToastContext.Provider value={mockToastContext}>
        {component}
      </ToastContext.Provider>
    </Web3Context.Provider>
  );
};

describe('SharePostModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    renderWithProviders(
      <SharePostModal
        isOpen={true}
        onClose={jest.fn()}
        post={mockPost}
        postType="feed"
      />
    );

    expect(screen.getByText('Share Post')).toBeInTheDocument();
    expect(screen.getByText('Test Post Title')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithProviders(
      <SharePostModal
        isOpen={false}
        onClose={jest.fn()}
        post={mockPost}
        postType="feed"
      />
    );

    expect(screen.queryByText('Share Post')).not.toBeInTheDocument();
  });

  it('displays post preview correctly', () => {
    renderWithProviders(
      <SharePostModal
        isOpen={true}
        onClose={jest.fn()}
        post={mockPost}
        postType="feed"
      />
    );

    expect(screen.getByText('Test Post Title')).toBeInTheDocument();
    expect(screen.getByText(/This is a test post content/)).toBeInTheDocument();
    expect(screen.getByText('/dao/test-dao')).toBeInTheDocument();
  });

  it('shows share options', () => {
    renderWithProviders(
      <SharePostModal
        isOpen={true}
        onClose={jest.fn()}
        post={mockPost}
        postType="feed"
      />
    );

    expect(screen.getByText('Share to Timeline')).toBeInTheDocument();
    expect(screen.getByText('Twitter')).toBeInTheDocument();
    expect(screen.getByText('Telegram')).toBeInTheDocument();
    expect(screen.getByText('Discord')).toBeInTheDocument();
    expect(screen.getByText('Reddit')).toBeInTheDocument();
    expect(screen.getByText('Copy Link')).toBeInTheDocument();
  });

  it('handles copy link action', async () => {
    renderWithProviders(
      <SharePostModal
        isOpen={true}
        onClose={jest.fn()}
        post={mockPost}
        postType="feed"
      />
    );

    const copyButton = screen.getByText('Copy Link');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('/post/test-post-id')
      );
    });

    expect(mockToastContext.addToast).toHaveBeenCalledWith(
      'Link copied to clipboard!',
      'success'
    );
  });

  it('handles external share actions', async () => {
    renderWithProviders(
      <SharePostModal
        isOpen={true}
        onClose={jest.fn()}
        post={mockPost}
        postType="feed"
      />
    );

    const twitterButton = screen.getByText('Twitter');
    fireEvent.click(twitterButton);

    expect(global.open).toHaveBeenCalledWith(
      expect.stringContaining('twitter.com/intent/tweet'),
      '_blank'
    );
  });

  it('shows timeline share form when selected', async () => {
    renderWithProviders(
      <SharePostModal
        isOpen={true}
        onClose={jest.fn()}
        post={mockPost}
        postType="feed"
      />
    );

    const timelineButton = screen.getByText('Share to Timeline');
    fireEvent.click(timelineButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('What do you think about this post?')).toBeInTheDocument();
    });
  });

  it('handles timeline sharing with message', async () => {
    const mockOnShare = jest.fn().mockResolvedValue(undefined);
    
    renderWithProviders(
      <SharePostModal
        isOpen={true}
        onClose={jest.fn()}
        post={mockPost}
        postType="feed"
        onShare={mockOnShare}
      />
    );

    const timelineButton = screen.getByText('Share to Timeline');
    fireEvent.click(timelineButton);

    await waitFor(() => {
      const messageInput = screen.getByPlaceholderText('What do you think about this post?');
      fireEvent.change(messageInput, { target: { value: 'Great post!' } });
    });

    const shareButton = screen.getByText('Share to Timeline');
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(mockOnShare).toHaveBeenCalledWith('test-post-id', 'timeline', 'Great post!');
    });
  });

  it('requires wallet connection for timeline sharing', async () => {
    const disconnectedContext = { ...mockWeb3Context, isConnected: false, address: null };
    
    render(
      <Web3Context.Provider value={disconnectedContext}>
        <ToastContext.Provider value={mockToastContext}>
          <SharePostModal
            isOpen={true}
            onClose={jest.fn()}
            post={mockPost}
            postType="feed"
          />
        </ToastContext.Provider>
      </Web3Context.Provider>
    );

    const timelineButton = screen.getByText('Share to Timeline');
    fireEvent.click(timelineButton);

    expect(mockToastContext.addToast).toHaveBeenCalledWith(
      'Please connect your wallet to share to timeline',
      'error'
    );
  });

  it('closes modal when close button is clicked', () => {
    const mockOnClose = jest.fn();
    
    renderWithProviders(
      <SharePostModal
        isOpen={true}
        onClose={mockOnClose}
        post={mockPost}
        postType="feed"
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});