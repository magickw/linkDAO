import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mocks to keep the page light-weight
jest.mock('framer-motion', () => ({
  motion: {
    div: (props: any) => <div {...props} />,
    span: (props: any) => <span {...props} />
  }
}));

jest.mock('@/components/Layout', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>
}));

jest.mock('@/components/VisualPolish/VisualPolishIntegration', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>
}));

// Mock the actual CommunityPostCardEnhanced to expose the onComment prop as a button
jest.mock('@/components/Community/CommunityPostCardEnhanced', () => ({
  __esModule: true,
  default: (props: any) => (
    <button data-testid={`comment-${props.post?.id || 'unknown'}`} onClick={() => props.onComment && props.onComment(props.post?.id)}>
      Comment
    </button>
  )
}));

// Mock mobile components (wrapper used in page) to simply render children
jest.mock('@/components/Mobile/Web3', () => ({
  __esModule: true,
  CollapsibleWeb3Sidebar: (props: any) => <div>{props.children}</div>,
  CompactWeb3PostCard: (props: any) => <div>{props.children}</div>,
  Web3SwipeGestureHandler: ({ children }: any) => <div>{children}</div>,
  MobileWeb3DataDisplay: (props: any) => <div />
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

// Mock router
jest.mock('next/router', () => ({
  useRouter: jest.fn()
}));

import { useRouter } from 'next/router';
import { FeedService } from '@/services/feedService';
import { CommunityService } from '@/services/communityService';
import CommunitiesPage from '../communities';

describe('Communities page integration', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

    (CommunityService.getAllCommunities as jest.Mock).mockResolvedValue([
      { id: 'comm-1', slug: 'comm-slug', name: 'comm', displayName: 'Comm' }
    ]);

    (CommunityService.getMyCommunities as jest.Mock).mockResolvedValue({ communities: [], pagination: null });

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
          isQuickPost: false,
          authorProfile: { handle: 'bob' }
        }
      ],
      hasMore: false
    });
  });

  test('clicking comment triggers navigation to community post', async () => {
    render(<CommunitiesPage />);

    await waitFor(() => expect(screen.getByTestId('comment-post-1')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('comment-post-1'));

    expect(mockPush).toHaveBeenCalledWith('/communities/comm-slug/posts/post-1');
  });
});
