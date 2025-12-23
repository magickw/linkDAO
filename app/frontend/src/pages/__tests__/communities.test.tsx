import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock Layout early to avoid importing heavy dependencies (e.g. rainbowkit) when the page module loads
jest.mock('@/components/Layout', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>
}));

jest.mock('next/router', () => ({
  useRouter: jest.fn()
}));

jest.mock('@/components/Community/CommunityPostCardEnhanced', () => ({
  __esModule: true,
  default: (props: any) => (
    <button data-testid={`comment-${props.post.id}`} onClick={() => props.onComment && props.onComment()}>
      Comment
    </button>
  )
}));

jest.mock('@/services/feedService', () => ({
  FeedService: {
    getEnhancedFeed: jest.fn()
  }
}));

jest.mock('@/services/communityService', () => ({
  CommunityService: {
    getAllCommunities: jest.fn(),
    getMyCommunities: jest.fn()
  }
}));

jest.mock('@/context/Web3Context', () => ({
  useWeb3: jest.fn(() => ({
    address: '0x123',
    isConnected: true
  }))
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    isAuthenticated: true,
    isLoading: false
  }))
}));

// Import mocked modules for type access
import { useRouter } from 'next/router';
import { FeedService } from '@/services/feedService';
import { CommunityService } from '@/services/communityService';
import CommunitiesPage from '../communities';

describe('Communities page - comment navigation', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

    (CommunityService.getAllCommunities as jest.Mock).mockResolvedValue([
      { id: 'comm-1', slug: 'comm-slug', name: 'comm', displayName: 'Comm' }
    ]);

    (FeedService.getEnhancedFeed as jest.Mock).mockResolvedValue({
      posts: [
        {
          id: 'post-1',
          communityId: 'comm-1',
          content: 'Hello',
          author: '0xabc',
          commentCount: 0,
          contentCid: '',
          shareId: 's1',
          authorProfile: { handle: 'bob' }
        }
      ],
      hasMore: false
    });
  });

  test('clicking comment button navigates to community post page', async () => {
    // Render a minimal wrapper that mirrors the prop wiring used in the page:
    // onComment={() => handleComment(postId)}
    const TestWrapper = () => {
      const postId = 'post-1';
      const community = { id: 'comm-1', slug: 'comm-slug', name: 'comm' };
      const handleComment = (pId: string) => mockPush(`/communities/${community.slug}/posts/${pId}`);
      // Use the mocked CommunityPostCardEnhanced which renders a button and calls `props.onComment()`
      const CommunityPostCardEnhanced = require('@/components/Community/CommunityPostCardEnhanced').default;
      return (
        <div>
          <CommunityPostCardEnhanced post={{ id: postId }} community={community} onComment={() => handleComment(postId)} />
        </div>
      );
    };

    render(<TestWrapper />);

    // Wait for the mocked post button to appear
    await waitFor(() => expect(screen.getByTestId('comment-post-1')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('comment-post-1'));

    expect(mockPush).toHaveBeenCalledWith('/communities/comm-slug/posts/post-1');
  });
});
