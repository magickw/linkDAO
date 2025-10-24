import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedPostCard from './EnhancedPostCard';

// Mock the context providers
jest.mock('@/context/Web3Context', () => ({
  useWeb3: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true
  })
}));

jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    addToast: jest.fn()
  })
}));

// Mock the visual polish components
jest.mock('@/components/VisualPolish', () => ({
  EnhancedPostCardGlass: ({ children, ...props }: any) => (
    <div data-testid="enhanced-post-card-glass" {...props}>
      {children}
    </div>
  ),
  RippleEffect: ({ children }: any) => <div>{children}</div>
}));

// Mock other components
jest.mock('@/components/InlinePreviews/InlinePreviewRenderer', () => {
  return function MockInlinePreviewRenderer() {
    return <div data-testid="inline-preview">Preview Content</div>;
  };
});

jest.mock('@/components/SocialProof/SocialProofIndicator', () => {
  return function MockSocialProofIndicator() {
    return <div data-testid="social-proof">Social Proof Content</div>;
  };
});

jest.mock('@/components/TrendingBadge/TrendingBadge', () => {
  return function MockTrendingBadge() {
    return <div data-testid="trending-badge">Trending Badge</div>;
  };
});

jest.mock('@/components/OptimizedImage', () => {
  return function MockOptimizedImage() {
    return <div data-testid="optimized-image">Image Content</div>;
  };
});

jest.mock('@/components/PostInteractionBar', () => {
  return function MockPostInteractionBar() {
    return <div data-testid="post-interaction-bar">Interaction Bar</div>;
  };
});

jest.mock('@/components/EnhancedCommentSystem', () => {
  return function MockEnhancedCommentSystem() {
    return <div data-testid="comment-system">Comment System</div>;
  };
});

// Mock the calculateTrendingLevel function
jest.mock('@/components/TrendingBadge/TrendingBadge', () => {
  const actual = jest.requireActual('@/components/TrendingBadge/TrendingBadge');
  return {
    ...actual,
    calculateTrendingLevel: jest.fn().mockReturnValue(null)
  };
});

describe('EnhancedPostCard', () => {
  const mockPost = {
    id: '1',
    title: 'Test Post',
    content: 'This is a test post content that is longer than 280 characters to test the read more functionality. '.repeat(10),
    author: '0x1234567890123456789012345678901234567890',
    authorProfile: {
      handle: 'testuser',
      verified: true,
      reputationTier: 'Expert',
      avatar: 'https://example.com/avatar.jpg'
    },
    createdAt: new Date(Date.now() - 3600000), // 1 hour ago
    updatedAt: new Date(),
    contentType: 'text',
    media: ['https://example.com/media.jpg'],
    previews: [
      {
        id: '1',
        type: 'link',
        url: 'https://example.com',
        data: {
          title: 'Example Link',
          description: 'This is an example link',
          image: 'https://example.com/image.jpg',
          siteName: 'Example Site'
        }
      }
    ],
    hashtags: ['test', 'web3'],
    mentions: [],
    reactions: [
      {
        type: 'hot',
        emoji: '🔥',
        label: 'Hot',
        totalStaked: 100,
        userStaked: 10,
        contributors: ['0x123'],
        rewardsEarned: 5
      }
    ],
    tips: [
      {
        amount: 50,
        token: 'ETH',
        from: '0x456',
        timestamp: new Date()
      }
    ],
    comments: 5,
    shares: 3,
    views: 100,
    engagementScore: 150,
    socialProof: {
      followedUsersWhoEngaged: [],
      totalEngagementFromFollowed: 0,
      communityLeadersWhoEngaged: [],
      verifiedUsersWhoEngaged: []
    },
    trendingStatus: null,
    communityName: 'test-community',
    communityId: 'test-community-id'
  };

  it('should render post title and content', () => {
    render(<EnhancedPostCard post={mockPost} />);
    
    expect(screen.getByText('Test Post')).toBeInTheDocument();
    expect(screen.getByText('This is a test post content that is longer than 280 characters to test the read more functionality. '.repeat(10).substring(0, 280) + '...')).toBeInTheDocument();
  });

  it('should render author information', () => {
    render(<EnhancedPostCard post={mockPost} />);
    
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument(); // Verified badge
  });

  it('should render community information when available', () => {
    render(<EnhancedPostCard post={mockPost} />);
    
    expect(screen.getByText('test-community')).toBeInTheDocument();
  });

  it('should render media when available', () => {
    render(<EnhancedPostCard post={mockPost} />);
    
    expect(screen.getByTestId('optimized-image')).toBeInTheDocument();
  });

  it('should render previews when available', () => {
    render(<EnhancedPostCard post={mockPost} showPreviews={true} />);
    
    expect(screen.getByTestId('inline-preview')).toBeInTheDocument();
  });

  it('should render hashtags when available', () => {
    render(<EnhancedPostCard post={mockPost} />);
    
    expect(screen.getByText('#test')).toBeInTheDocument();
    expect(screen.getByText('#web3')).toBeInTheDocument();
  });

  it('should render social proof when available and enabled', () => {
    render(<EnhancedPostCard post={mockPost} showSocialProof={true} />);
    
    expect(screen.getByTestId('social-proof')).toBeInTheDocument();
  });

  it('should not render social proof when disabled', () => {
    render(<EnhancedPostCard post={mockPost} showSocialProof={false} />);
    
    expect(screen.queryByTestId('social-proof')).not.toBeInTheDocument();
  });

  it('should render trending badge when trending and enabled', () => {
    const trendingPost = {
      ...mockPost,
      trendingStatus: 'hot'
    };
    
    render(<EnhancedPostCard post={trendingPost} showTrending={true} />);
    
    expect(screen.getByTestId('trending-badge')).toBeInTheDocument();
  });

  it('should not render trending badge when disabled', () => {
    const trendingPost = {
      ...mockPost,
      trendingStatus: 'hot'
    };
    
    render(<EnhancedPostCard post={trendingPost} showTrending={false} />);
    
    expect(screen.queryByTestId('trending-badge')).not.toBeInTheDocument();
  });

  it('should show "Read more" button for long content', () => {
    render(<EnhancedPostCard post={mockPost} />);
    
    expect(screen.getByText('Read more')).toBeInTheDocument();
  });

  it('should expand content when "Read more" is clicked', () => {
    render(<EnhancedPostCard post={mockPost} />);
    
    const readMoreButton = screen.getByText('Read more');
    fireEvent.click(readMoreButton);
    
    expect(screen.getByText(mockPost.content)).toBeInTheDocument();
    expect(screen.queryByText('Read more')).not.toBeInTheDocument();
  });

  it('should render interaction bar', () => {
    render(<EnhancedPostCard post={mockPost} />);
    
    expect(screen.getByTestId('post-interaction-bar')).toBeInTheDocument();
  });

  it('should render comment system when expanded', () => {
    render(<EnhancedPostCard post={mockPost} />);
    
    // Click read more to expand
    fireEvent.click(screen.getByText('Read more'));
    
    expect(screen.getByTestId('comment-system')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<EnhancedPostCard post={mockPost} />);
    
    const postCard = screen.getByRole('article');
    expect(postCard).toHaveAttribute('aria-label', 'Post by testuser titled Test Post');
    expect(postCard).toHaveAttribute('tabIndex', '0');
  });

  it('should handle keyboard events for accessibility', () => {
    render(<EnhancedPostCard post={mockPost} />);
    
    const postCard = screen.getByRole('article');
    
    // Test Enter key to expand
    fireEvent.keyDown(postCard, { key: 'Enter' });
    expect(screen.getByText(mockPost.content)).toBeInTheDocument();
    
    // Test Escape key to collapse
    fireEvent.keyDown(postCard, { key: 'Escape' });
    expect(screen.getByText('Read more')).toBeInTheDocument();
  });
});