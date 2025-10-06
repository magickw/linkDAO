import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedPostCard } from '@/components/Feed/EnhancedPostCard';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import testUtils from '../../setup/testSetup';

// Mock dependencies
jest.mock('@/context/Web3Context');
jest.mock('@/context/ToastContext');
jest.mock('@/components/OptimizedImage', () => {
  return function MockOptimizedImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} data-testid="optimized-image" />;
  };
});

const mockUseWeb3 = useWeb3 as jest.MockedFunction<typeof useWeb3>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const mockWeb3Context = {
  address: '0x1234567890123456789012345678901234567890',
  isConnected: true,
  connect: jest.fn(),
  disconnect: jest.fn(),
  switchNetwork: jest.fn()
};

const mockToastContext = {
  addToast: jest.fn(),
  removeToast: jest.fn(),
  toasts: []
};

const mockPost = testUtils.createMockPost({
  id: 'test-post-1',
  author: '0x1234567890123456789012345678901234567890',
  contentCid: 'bafybeicg6vkh5j5n5z4y4vzgq3v3z4vzgq3v3z4vzgq3v3z4vzgq3v3z4',
  mediaCids: ['bafybeicmedia1'],
  tags: ['defi', 'trending'],
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  reactions: [
    {
      type: '🔥',
      users: [
        {
          address: '0xuser1',
          username: 'alice',
          avatar: '/avatars/alice.png',
          amount: 5,
          timestamp: new Date()
        }
      ],
      totalAmount: 5,
      tokenType: 'LDAO'
    }
  ],
  tips: [
    {
      from: '0xuser2',
      amount: 10,
      tokenType: 'USDC',
      message: 'Great post!',
      timestamp: new Date()
    }
  ],
  comments: 12,
  shares: 3,
  views: 156,
  engagementScore: 750,
  trendingStatus: 'hot',
  socialProof: {
    followedUsersWhoEngaged: [
      {
        id: '0xuser1',
        address: '0xuser1',
        username: 'alice',
        displayName: 'Alice Cooper',
        avatar: '/avatars/alice.png',
        verified: true,
        reputation: 850
      }
    ],
    totalEngagementFromFollowed: 1,
    communityLeadersWhoEngaged: [],
    verifiedUsersWhoEngaged: []
  },
  previews: [
    {
      type: 'link',
      url: 'https://example.com',
      data: {
        title: 'Example Link',
        description: 'This is an example link preview',
        image: 'https://example.com/image.jpg',
        siteName: 'Example Site'
      }
    }
  ]
});

describe('EnhancedPostCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWeb3.mockReturnValue(mockWeb3Context);
    mockUseToast.mockReturnValue(mockToastContext);
  });

  describe('Basic Rendering', () => {
    it('should render post content and metadata', () => {
      render(<EnhancedPostCard post={mockPost} />);
      
      expect(screen.getByText(/Content from IPFS:/)).toBeInTheDocument();
      expect(screen.getByText(/2h ago/)).toBeInTheDocument();
      expect(screen.getByText('156 views')).toBeInTheDocument();
      expect(screen.getByText('Score: 750')).toBeInTheDocument();
    });

    it('should display author information', () => {
      render(<EnhancedPostCard post={mockPost} />);
      
      expect(screen.getByText('12...7890')).toBeInTheDocument(); // Truncated address
      expect(screen.getByRole('link', { name: /12...7890/ })).toHaveAttribute(
        'href',
        `/profile/${mockPost.author}`
      );
    });

    it('should show media when available', () => {
      render(<EnhancedPostCard post={mockPost} />);
      
      expect(screen.getByTestId('optimized-image')).toBeInTheDocument();
      expect(screen.getByTestId('optimized-image')).toHaveAttribute(
        'src',
        'https://ipfs.io/ipfs/bafybeicmedia1'
      );
    });

    it('should display hashtags as clickable links', () => {
      render(<EnhancedPostCard post={mockPost} />);
      
      expect(screen.getByRole('link', { name: '#defi' })).toHaveAttribute(
        'href',
        '/hashtag/defi'
      );
      expect(screen.getByRole('link', { name: '#trending' })).toHaveAttribute(
        'href',
        '/hashtag/trending'
      );
    });
  });

  describe('Trending Badge', () => {
    it('should show trending badge when showTrending is true', () => {
      render(<EnhancedPostCard post={mockPost} showTrending={true} />);
      
      expect(screen.getByTestId('trending-badge')).toBeInTheDocument();
    });

    it('should not show trending badge when showTrending is false', () => {
      render(<EnhancedPostCard post={mockPost} showTrending={false} />);
      
      expect(screen.queryByTestId('trending-badge')).not.toBeInTheDocument();
    });

    it('should not show trending badge when post is not trending', () => {
      const nonTrendingPost = { ...mockPost, trendingStatus: undefined };
      render(<EnhancedPostCard post={nonTrendingPost} showTrending={true} />);
      
      expect(screen.queryByTestId('trending-badge')).not.toBeInTheDocument();
    });
  });

  describe('Social Proof', () => {
    it('should show social proof when showSocialProof is true', () => {
      render(<EnhancedPostCard post={mockPost} showSocialProof={true} />);
      
      expect(screen.getByTestId('social-proof-indicator')).toBeInTheDocument();
    });

    it('should not show social proof when showSocialProof is false', () => {
      render(<EnhancedPostCard post={mockPost} showSocialProof={false} />);
      
      expect(screen.queryByTestId('social-proof-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Content Previews', () => {
    it('should show inline previews when showPreviews is true', () => {
      render(<EnhancedPostCard post={mockPost} showPreviews={true} />);
      
      expect(screen.getByTestId('inline-preview-renderer')).toBeInTheDocument();
      expect(screen.getByText('Example Link')).toBeInTheDocument();
    });

    it('should not show previews when showPreviews is false', () => {
      render(<EnhancedPostCard post={mockPost} showPreviews={false} />);
      
      expect(screen.queryByTestId('inline-preview-renderer')).not.toBeInTheDocument();
    });

    it('should show "Show more previews" button when there are multiple previews', () => {
      const postWithMultiplePreviews = {
        ...mockPost,
        previews: [
          ...mockPost.previews,
          {
            type: 'link',
            url: 'https://example2.com',
            data: {
              title: 'Second Link',
              description: 'Another preview',
              image: 'https://example2.com/image.jpg'
            }
          },
          {
            type: 'link',
            url: 'https://example3.com',
            data: {
              title: 'Third Link',
              description: 'Yet another preview',
              image: 'https://example3.com/image.jpg'
            }
          }
        ]
      };
      
      render(<EnhancedPostCard post={postWithMultiplePreviews} showPreviews={true} />);
      
      expect(screen.getByText(/show 1 more preview/i)).toBeInTheDocument();
    });
  });

  describe('Token Reactions', () => {
    it('should display token reaction system', () => {
      render(<EnhancedPostCard post={mockPost} />);
      
      expect(screen.getByTestId('token-reaction-system')).toBeInTheDocument();
    });

    it('should handle reaction clicks', async () => {
      const mockOnReaction = jest.fn();
      render(<EnhancedPostCard post={mockPost} onReaction={mockOnReaction} />);
      
      const reactionButton = screen.getByRole('button', { name: /🔥/ });
      await userEvent.click(reactionButton);
      
      expect(mockOnReaction).toHaveBeenCalledWith(
        mockPost.id,
        '🔥',
        expect.any(Number)
      );
    });
  });

  describe('Interaction Buttons', () => {
    it('should show comment count and handle comment clicks', async () => {
      render(<EnhancedPostCard post={mockPost} />);
      
      const commentButton = screen.getByRole('button', { name: /12/ });
      expect(commentButton).toBeInTheDocument();
      
      await userEvent.click(commentButton);
      // Should expand comments or trigger onExpand callback
    });

    it('should show tip button and handle tip clicks', async () => {
      render(<EnhancedPostCard post={mockPost} />);
      
      const tipButton = screen.getByRole('button', { name: /tip/i });
      expect(tipButton).toBeInTheDocument();
      
      await userEvent.click(tipButton);
      
      expect(screen.getByTestId('tip-modal')).toBeInTheDocument();
    });

    it('should disable tip button when wallet is not connected', () => {
      mockUseWeb3.mockReturnValue({ ...mockWeb3Context, isConnected: false });
      
      render(<EnhancedPostCard post={mockPost} />);
      
      const tipButton = screen.getByRole('button', { name: /tip/i });
      expect(tipButton).toBeDisabled();
    });

    it('should show share button and handle share clicks', async () => {
      render(<EnhancedPostCard post={mockPost} />);
      
      const shareButton = screen.getByRole('button', { name: /share/i });
      expect(shareButton).toBeInTheDocument();
      
      await userEvent.click(shareButton);
      
      expect(screen.getByTestId('share-modal')).toBeInTheDocument();
    });
  });

  describe('Bookmark Functionality', () => {
    it('should show bookmark button', () => {
      render(<EnhancedPostCard post={mockPost} />);
      
      expect(screen.getByRole('button', { name: /bookmark/i })).toBeInTheDocument();
    });

    it('should toggle bookmark state when clicked', async () => {
      render(<EnhancedPostCard post={mockPost} />);
      
      const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
      await userEvent.click(bookmarkButton);
      
      expect(mockToastContext.addToast).toHaveBeenCalledWith(
        'Added to bookmarks',
        'success'
      );
    });

    it('should show different styles for bookmarked posts', () => {
      const bookmarkedPost = { ...mockPost, isBookmarked: true };
      render(<EnhancedPostCard post={bookmarkedPost} />);
      
      const bookmarkButton = screen.getByRole('button', { name: /remove bookmark/i });
      expect(bookmarkButton).toHaveClass('text-yellow-500');
    });
  });

  describe('Tip Modal', () => {
    it('should open tip modal when tip button is clicked', async () => {
      render(<EnhancedPostCard post={mockPost} />);
      
      const tipButton = screen.getByRole('button', { name: /tip/i });
      await userEvent.click(tipButton);
      
      expect(screen.getByText('Send Tip')).toBeInTheDocument();
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    });

    it('should handle tip submission', async () => {
      const mockOnTip = jest.fn();
      render(<EnhancedPostCard post={mockPost} onTip={mockOnTip} />);
      
      const tipButton = screen.getByRole('button', { name: /tip/i });
      await userEvent.click(tipButton);
      
      const amountInput = screen.getByLabelText(/amount/i);
      const messageInput = screen.getByLabelText(/message/i);
      const submitButton = screen.getByRole('button', { name: /tip.*usdc/i });
      
      await userEvent.type(amountInput, '5');
      await userEvent.type(messageInput, 'Great content!');
      await userEvent.click(submitButton);
      
      expect(mockOnTip).toHaveBeenCalledWith(
        mockPost.id,
        '5',
        'USDC',
        'Great content!'
      );
    });

    it('should close tip modal when cancel is clicked', async () => {
      render(<EnhancedPostCard post={mockPost} />);
      
      const tipButton = screen.getByRole('button', { name: /tip/i });
      await userEvent.click(tipButton);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);
      
      expect(screen.queryByText('Send Tip')).not.toBeInTheDocument();
    });
  });

  describe('Share Modal', () => {
    it('should open share modal when share button is clicked', async () => {
      render(<EnhancedPostCard post={mockPost} />);
      
      const shareButton = screen.getByRole('button', { name: /share/i });
      await userEvent.click(shareButton);
      
      expect(screen.getByText('Share Post')).toBeInTheDocument();
      expect(screen.getByText('Send as Direct Message')).toBeInTheDocument();
      expect(screen.getByText('Share to Community')).toBeInTheDocument();
      expect(screen.getByText('Copy Link')).toBeInTheDocument();
    });

    it('should handle direct message sharing', async () => {
      const mockOnShare = jest.fn();
      render(<EnhancedPostCard post={mockPost} onShare={mockOnShare} />);
      
      const shareButton = screen.getByRole('button', { name: /share/i });
      await userEvent.click(shareButton);
      
      const dmButton = screen.getByText('Send as Direct Message');
      await userEvent.click(dmButton);
      
      expect(mockOnShare).toHaveBeenCalledWith(mockPost.id, 'dm');
    });

    it('should handle copy link functionality', async () => {
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined)
        }
      });
      
      const mockOnShare = jest.fn();
      render(<EnhancedPostCard post={mockPost} onShare={mockOnShare} />);
      
      const shareButton = screen.getByRole('button', { name: /share/i });
      await userEvent.click(shareButton);
      
      const copyButton = screen.getByText('Copy Link');
      await userEvent.click(copyButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        `${window.location.origin}/post/${mockPost.id}`
      );
      expect(mockOnShare).toHaveBeenCalledWith(mockPost.id, 'external');
    });
  });

  describe('Error Handling', () => {
    it('should show error fallback when post card fails to render', () => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create a component that will throw an error
      const ErrorThrowingComponent = () => {
        throw new Error('Test error');
      };
      
      render(
        <EnhancedPostCard 
          post={mockPost}
          customComponent={ErrorThrowingComponent}
        />
      );
      
      expect(screen.getByText(/failed to load post/i)).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('should render efficiently with large engagement data', async () => {
      const postWithLargeEngagement = {
        ...mockPost,
        reactions: Array.from({ length: 100 }, (_, i) => ({
          type: '🔥',
          users: Array.from({ length: 50 }, (_, j) => ({
            address: `0xuser${i}-${j}`,
            username: `user${i}-${j}`,
            avatar: `/avatars/user${i}-${j}.png`,
            amount: Math.floor(Math.random() * 10) + 1,
            timestamp: new Date()
          })),
          totalAmount: 250,
          tokenType: 'LDAO'
        }))
      };
      
      const startTime = performance.now();
      render(<EnhancedPostCard post={postWithLargeEngagement} />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should render within 100ms
    });

    it('should lazy load media content', () => {
      render(<EnhancedPostCard post={mockPost} />);
      
      const image = screen.getByTestId('optimized-image');
      expect(image).toHaveAttribute('loading', 'lazy');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<EnhancedPostCard post={mockPost} />);
      
      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /bookmark/i })).toHaveAttribute(
        'aria-label',
        expect.stringMatching(/bookmark/i)
      );
    });

    it('should support keyboard navigation', async () => {
      render(<EnhancedPostCard post={mockPost} />);
      
      const article = screen.getByRole('article');
      article.focus();
      
      fireEvent.keyDown(article, { key: 'Enter' });
      // Should trigger expand or focus first interactive element
    });

    it('should announce engagement updates to screen readers', async () => {
      render(<EnhancedPostCard post={mockPost} />);
      
      const reactionButton = screen.getByRole('button', { name: /🔥/ });
      await userEvent.click(reactionButton);
      
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Visual Hierarchy', () => {
    it('should apply trending styles for trending posts', () => {
      render(<EnhancedPostCard post={mockPost} />);
      
      const postCard = screen.getByRole('article');
      expect(postCard).toHaveClass('ring-1', 'ring-primary-400');
    });

    it('should apply different styles based on engagement level', () => {
      const highEngagementPost = { ...mockPost, engagementScore: 1500 };
      render(<EnhancedPostCard post={highEngagementPost} />);
      
      const postCard = screen.getByRole('article');
      expect(postCard).toHaveClass('shadow-lg');
    });

    it('should show category-specific border colors', () => {
      render(<EnhancedPostCard post={mockPost} />);
      
      const postCard = screen.getByRole('article');
      expect(postCard).toHaveClass('border-l-4', 'border-l-purple-500'); // Media post
    });
  });
});