import { renderHook, act, waitFor } from '@testing-library/react';
import { usePinnedPosts } from '../usePinnedPosts';
import { CommunityPostService } from '@/services/communityPostService';
import { CommunityPost } from '@/models/CommunityPost';

// Mock the CommunityPostService
jest.mock('@/services/communityPostService', () => ({
  CommunityPostService: {
    getPinnedPosts: jest.fn(),
    pinPost: jest.fn(),
    unpinPost: jest.fn(),
    reorderPinnedPosts: jest.fn(),
  },
}));

const mockCommunityPostService = CommunityPostService as any;

describe('usePinnedPosts', () => {
  const createMockPost = (id: string, sortOrder: number = 0): CommunityPost => ({
    id,
    author: 'test-user',
    communityId: 'community-1',
    contentCid: `Test post content ${id}`,
    mediaCids: [],
    tags: [],
    createdAt: new Date(),
    onchainRef: '',
    flair: undefined,
    isPinned: true,
    isLocked: false,
    upvotes: 10,
    downvotes: 2,
    comments: [],
    depth: 0,
    sortOrder,
  });

  const defaultOptions = {
    communityId: 'community-1',
    canModerate: true,
    onError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty state', () => {
      mockCommunityPostService.getPinnedPosts.mockResolvedValue([]);

      const { result } = renderHook(() => usePinnedPosts(defaultOptions));

      expect(result.current.pinnedPosts).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should fetch pinned posts on mount', async () => {
      const mockPosts = [createMockPost('post-1'), createMockPost('post-2')];
      mockCommunityPostService.getPinnedPosts.mockResolvedValue(mockPosts);

      const { result } = renderHook(() => usePinnedPosts(defaultOptions));

      await waitFor(() => {
        expect(result.current.pinnedPosts).toEqual(mockPosts);
      });

      expect(mockCommunityPostService.getPinnedPosts).toHaveBeenCalledWith('community-1');
    });

    it('should not fetch when communityId is empty', () => {
      const { result } = renderHook(() => 
        usePinnedPosts({ ...defaultOptions, communityId: '' })
      );

      expect(mockCommunityPostService.getPinnedPosts).not.toHaveBeenCalled();
      expect(result.current.pinnedPosts).toEqual([]);
    });
  });

  describe('Loading State', () => {
    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: CommunityPost[]) => void;
      const promise = new Promise<CommunityPost[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockCommunityPostService.getPinnedPosts.mockReturnValue(promise);

      const { result } = renderHook(() => usePinnedPosts(defaultOptions));

      expect(result.current.isLoading).toBe(true);

      act(() => {
        resolvePromise([]);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors', async () => {
      const error = new Error('Fetch failed');
      mockCommunityPostService.getPinnedPosts.mockRejectedValue(error);

      const { result } = renderHook(() => usePinnedPosts(defaultOptions));

      await waitFor(() => {
        expect(result.current.error).toBe('Fetch failed');
      });

      expect(defaultOptions.onError).toHaveBeenCalledWith(error);
    });

    it('should handle non-Error objects', async () => {
      mockCommunityPostService.getPinnedPosts.mockRejectedValue('String error');

      const { result } = renderHook(() => usePinnedPosts(defaultOptions));

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch pinned posts');
      });

      expect(defaultOptions.onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Pin Post', () => {
    it('should pin a post successfully', async () => {
      const existingPosts = [createMockPost('post-1', 0)];
      const newPost = createMockPost('post-2', 1);
      
      mockCommunityPostService.getPinnedPosts.mockResolvedValue(existingPosts);
      mockCommunityPostService.pinPost.mockResolvedValue(newPost);

      const { result } = renderHook(() => usePinnedPosts(defaultOptions));

      await waitFor(() => {
        expect(result.current.pinnedPosts).toEqual(existingPosts);
      });

      await act(async () => {
        await result.current.pinPost('post-2', 1);
      });

      expect(mockCommunityPostService.pinPost).toHaveBeenCalledWith('post-2', 1);
      expect(result.current.pinnedPosts).toHaveLength(2);
      expect(result.current.pinnedPosts.find(p => p.id === 'post-2')).toEqual(newPost);
    });

    it('should prevent pinning when not moderator', async () => {
      const { result } = renderHook(() => 
        usePinnedPosts({ ...defaultOptions, canModerate: false })
      );

      await expect(result.current.pinPost('post-1')).rejects.toThrow(
        'Insufficient permissions to pin posts'
      );

      expect(mockCommunityPostService.pinPost).not.toHaveBeenCalled();
    });

    it('should prevent pinning when 3 posts already pinned', async () => {
      const existingPosts = [
        createMockPost('post-1', 0),
        createMockPost('post-2', 1),
        createMockPost('post-3', 2),
      ];
      
      mockCommunityPostService.getPinnedPosts.mockResolvedValue(existingPosts);

      const { result } = renderHook(() => usePinnedPosts(defaultOptions));

      await waitFor(() => {
        expect(result.current.pinnedPosts).toEqual(existingPosts);
      });

      await expect(result.current.pinPost('post-4')).rejects.toThrow(
        'Maximum of 3 posts can be pinned. Please unpin a post first.'
      );

      expect(mockCommunityPostService.pinPost).not.toHaveBeenCalled();
    });

    it('should handle pin errors', async () => {
      const error = new Error('Pin failed');
      mockCommunityPostService.getPinnedPosts.mockResolvedValue([]);
      mockCommunityPostService.pinPost.mockRejectedValue(error);

      const { result } = renderHook(() => usePinnedPosts(defaultOptions));

      await waitFor(() => {
        expect(result.current.pinnedPosts).toEqual([]);
      });

      await expect(result.current.pinPost('post-1')).rejects.toThrow('Pin failed');

      expect(result.current.error).toBe('Pin failed');
      expect(defaultOptions.onError).toHaveBeenCalledWith(error);
    });
  });

  describe('Unpin Post', () => {
    it('should unpin a post successfully', async () => {
      const existingPosts = [createMockPost('post-1', 0), createMockPost('post-2', 1)];
      
      mockCommunityPostService.getPinnedPosts.mockResolvedValue(existingPosts);
      mockCommunityPostService.unpinPost.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePinnedPosts(defaultOptions));

      await waitFor(() => {
        expect(result.current.pinnedPosts).toEqual(existingPosts);
      });

      await act(async () => {
        await result.current.unpinPost('post-1');
      });

      expect(mockCommunityPostService.unpinPost).toHaveBeenCalledWith('post-1');
      expect(result.current.pinnedPosts).toHaveLength(1);
      expect(result.current.pinnedPosts.find(p => p.id === 'post-1')).toBeUndefined();
    });

    it('should prevent unpinning when not moderator', async () => {
      const { result } = renderHook(() => 
        usePinnedPosts({ ...defaultOptions, canModerate: false })
      );

      await expect(result.current.unpinPost('post-1')).rejects.toThrow(
        'Insufficient permissions to unpin posts'
      );

      expect(mockCommunityPostService.unpinPost).not.toHaveBeenCalled();
    });

    it('should handle unpin errors', async () => {
      const error = new Error('Unpin failed');
      const existingPosts = [createMockPost('post-1', 0)];
      
      mockCommunityPostService.getPinnedPosts.mockResolvedValue(existingPosts);
      mockCommunityPostService.unpinPost.mockRejectedValue(error);

      const { result } = renderHook(() => usePinnedPosts(defaultOptions));

      await waitFor(() => {
        expect(result.current.pinnedPosts).toEqual(existingPosts);
      });

      await expect(result.current.unpinPost('post-1')).rejects.toThrow('Unpin failed');

      expect(result.current.error).toBe('Unpin failed');
      expect(defaultOptions.onError).toHaveBeenCalledWith(error);
    });
  });

  describe('Reorder Posts', () => {
    it('should reorder posts successfully', async () => {
      const existingPosts = [createMockPost('post-1', 0), createMockPost('post-2', 1)];
      
      mockCommunityPostService.getPinnedPosts.mockResolvedValue(existingPosts);
      mockCommunityPostService.reorderPinnedPosts.mockResolvedValue(true);

      const { result } = renderHook(() => usePinnedPosts(defaultOptions));

      await waitFor(() => {
        expect(result.current.pinnedPosts).toEqual(existingPosts);
      });

      await act(async () => {
        await result.current.reorderPosts(['post-2', 'post-1']);
      });

      expect(mockCommunityPostService.reorderPinnedPosts).toHaveBeenCalledWith(
        'community-1',
        ['post-2', 'post-1']
      );
      
      // Check that posts are reordered optimistically
      expect(result.current.pinnedPosts[0].id).toBe('post-2');
      expect(result.current.pinnedPosts[1].id).toBe('post-1');
    });

    it('should prevent reordering when not moderator', async () => {
      const { result } = renderHook(() => 
        usePinnedPosts({ ...defaultOptions, canModerate: false })
      );

      await expect(result.current.reorderPosts(['post-1', 'post-2'])).rejects.toThrow(
        'Insufficient permissions to reorder posts'
      );

      expect(mockCommunityPostService.reorderPinnedPosts).not.toHaveBeenCalled();
    });

    it('should revert order on reorder error', async () => {
      const error = new Error('Reorder failed');
      const existingPosts = [createMockPost('post-1', 0), createMockPost('post-2', 1)];
      
      mockCommunityPostService.getPinnedPosts.mockResolvedValue(existingPosts);
      mockCommunityPostService.reorderPinnedPosts.mockRejectedValue(error);

      const { result } = renderHook(() => usePinnedPosts(defaultOptions));

      await waitFor(() => {
        expect(result.current.pinnedPosts).toEqual(existingPosts);
      });

      await expect(result.current.reorderPosts(['post-2', 'post-1'])).rejects.toThrow('Reorder failed');

      // Should revert to original order
      expect(result.current.pinnedPosts[0].id).toBe('post-1');
      expect(result.current.pinnedPosts[1].id).toBe('post-2');
      expect(result.current.error).toBe('Reorder failed');
      expect(defaultOptions.onError).toHaveBeenCalledWith(error);
    });
  });

  describe('Refresh Posts', () => {
    it('should refresh pinned posts', async () => {
      const initialPosts = [createMockPost('post-1', 0)];
      const refreshedPosts = [createMockPost('post-1', 0), createMockPost('post-2', 1)];
      
      mockCommunityPostService.getPinnedPosts
        .mockResolvedValueOnce(initialPosts)
        .mockResolvedValueOnce(refreshedPosts);

      const { result } = renderHook(() => usePinnedPosts(defaultOptions));

      await waitFor(() => {
        expect(result.current.pinnedPosts).toEqual(initialPosts);
      });

      await act(async () => {
        await result.current.refreshPinnedPosts();
      });

      expect(result.current.pinnedPosts).toEqual(refreshedPosts);
      expect(mockCommunityPostService.getPinnedPosts).toHaveBeenCalledTimes(2);
    });
  });
});