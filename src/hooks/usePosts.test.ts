import { renderHook, act } from '@testing-library/react';
import { useFeed, useCreatePost, usePostsByAuthor } from './usePosts';

// Mock the PostService
jest.mock('@/services/postService', () => ({
  PostService: {
    getFeed: jest.fn(),
    createPost: jest.fn(),
    getPostsByAuthor: jest.fn(),
  },
}));

describe('usePosts', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockPost = {
    id: '1',
    author: mockAddress,
    content: 'This is a test post',
    tags: ['test'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockPosts = [mockPost];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useFeed', () => {
    it('should fetch user feed', async () => {
      const mockGetFeed = require('@/services/postService').PostService.getFeed;
      mockGetFeed.mockResolvedValue(mockPosts);
      
      const { result } = renderHook(() => useFeed(mockAddress));
      
      // Wait for the effect to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(mockGetFeed).toHaveBeenCalledWith(mockAddress);
      expect(result.current.feed).toEqual(mockPosts);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle errors when fetching feed', async () => {
      const mockGetFeed = require('@/services/postService').PostService.getFeed;
      mockGetFeed.mockRejectedValue(new Error('Failed to fetch feed'));
      
      const { result } = renderHook(() => useFeed(mockAddress));
      
      // Wait for the effect to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.feed).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch feed');
    });
  });

  describe('useCreatePost', () => {
    it('should create a new post', async () => {
      const mockCreatePost = require('@/services/postService').PostService.createPost;
      mockCreatePost.mockResolvedValue(mockPost);
      
      const { result } = renderHook(() => useCreatePost());
      
      await act(async () => {
        await result.current.createPost({
          author: mockAddress,
          content: 'This is a test post',
          tags: ['test'],
        });
      });
      
      expect(mockCreatePost).toHaveBeenCalled();
      expect(result.current.post).toEqual(mockPost);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.success).toBe(true);
    });

    it('should handle errors when creating post', async () => {
      const mockCreatePost = require('@/services/postService').PostService.createPost;
      mockCreatePost.mockRejectedValue(new Error('Failed to create post'));
      
      const { result } = renderHook(() => useCreatePost());
      
      await act(async () => {
        try {
          await result.current.createPost({
            author: mockAddress,
            content: 'This is a test post',
            tags: ['test'],
          });
        } catch (error) {
          // Expected error
        }
      });
      
      expect(result.current.isLoading).toBe(false);
      expect(result.current.success).toBe(false);
      expect(result.current.error).toBe('Failed to create post');
    });
  });

  describe('usePostsByAuthor', () => {
    it('should fetch posts by author', async () => {
      const mockGetPostsByAuthor = require('@/services/postService').PostService.getPostsByAuthor;
      mockGetPostsByAuthor.mockResolvedValue(mockPosts);
      
      const { result } = renderHook(() => usePostsByAuthor(mockAddress));
      
      // Wait for the effect to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(mockGetPostsByAuthor).toHaveBeenCalledWith(mockAddress);
      expect(result.current.posts).toEqual(mockPosts);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle errors when fetching posts by author', async () => {
      const mockGetPostsByAuthor = require('@/services/postService').PostService.getPostsByAuthor;
      mockGetPostsByAuthor.mockRejectedValue(new Error('Failed to fetch posts'));
      
      const { result } = renderHook(() => usePostsByAuthor(mockAddress));
      
      // Wait for the effect to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.posts).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch posts');
    });
  });
});