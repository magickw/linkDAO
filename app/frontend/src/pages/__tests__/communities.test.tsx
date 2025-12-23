import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
    // Render the real Communities page so it consumes our mocked services
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <CommunitiesPage />
      </QueryClientProvider>
    );

    // The page uses our mocked CommunityPostCardEnhanced which renders a button with data-testid `comment-<postId>`
    const commentButton = await screen.findByTestId('comment-post-1');

    fireEvent.click(commentButton);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/communities/comm-slug/posts/post-1'));
  });
});
