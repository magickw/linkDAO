import { renderHook, act } from '@testing-library/react';
import { useFollow, useFollowStatus, useFollowers, useFollowing, useFollowCount } from './useFollow';

// Mock the FollowService
jest.mock('@/services/followService', () => ({
  FollowService: {
    follow: jest.fn(),
    unfollow: jest.fn(),
    getFollowers: jest.fn(),
    getFollowing: jest.fn(),
    isFollowing: jest.fn(),
    getFollowCount: jest.fn(),
  },
}));

describe('useFollow', () => {
  const mockFollower = '0x1234567890123456789012345678901234567890';
  const mockFollowing = '0xabcdef1234567890abcdef1234567890abcdef12';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useFollow', () => {
    it('should call FollowService.follow when follow is called', async () => {
      const mockFollow = require('@/services/followService').FollowService.follow;
      mockFollow.mockResolvedValue(true);
      
      const { result } = renderHook(() => useFollow());
      
      await act(async () => {
        await result.current.follow(mockFollower, mockFollowing);
      });
      
      expect(mockFollow).toHaveBeenCalledWith(mockFollower, mockFollowing);
      expect(result.current.isLoading).toBe(false);
    });

    it('should call FollowService.unfollow when unfollow is called', async () => {
      const mockUnfollow = require('@/services/followService').FollowService.unfollow;
      mockUnfollow.mockResolvedValue(true);
      
      const { result } = renderHook(() => useFollow());
      
      await act(async () => {
        await result.current.unfollow(mockFollower, mockFollowing);
      });
      
      expect(mockUnfollow).toHaveBeenCalledWith(mockFollower, mockFollowing);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle errors when follow fails', async () => {
      const mockFollow = require('@/services/followService').FollowService.follow;
      mockFollow.mockRejectedValue(new Error('Follow failed'));
      
      const { result } = renderHook(() => useFollow());
      
      await act(async () => {
        try {
          await result.current.follow(mockFollower, mockFollowing);
        } catch (error) {
          // Expected error
        }
      });
      
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Follow failed');
    });
  });

  describe('useFollowStatus', () => {
    it('should return follow status', async () => {
      const mockIsFollowing = require('@/services/followService').FollowService.isFollowing;
      mockIsFollowing.mockResolvedValue(true);
      
      const { result } = renderHook(() => useFollowStatus(mockFollower, mockFollowing));
      
      // Wait for the effect to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(mockIsFollowing).toHaveBeenCalledWith(mockFollower, mockFollowing);
      expect(result.current.isFollowing).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('useFollowers', () => {
    it('should return followers list', async () => {
      const mockFollowers = [mockFollowing, '0xanotheraddress'];
      const mockGetFollowers = require('@/services/followService').FollowService.getFollowers;
      mockGetFollowers.mockResolvedValue(mockFollowers);
      
      const { result } = renderHook(() => useFollowers(mockFollower));
      
      // Wait for the effect to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(mockGetFollowers).toHaveBeenCalledWith(mockFollower);
      expect(result.current.followers).toEqual(mockFollowers);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('useFollowing', () => {
    it('should return following list', async () => {
      const mockFollowingList = [mockFollowing, '0xanotheraddress'];
      const mockGetFollowing = require('@/services/followService').FollowService.getFollowing;
      mockGetFollowing.mockResolvedValue(mockFollowingList);
      
      const { result } = renderHook(() => useFollowing(mockFollower));
      
      // Wait for the effect to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(mockGetFollowing).toHaveBeenCalledWith(mockFollower);
      expect(result.current.following).toEqual(mockFollowingList);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('useFollowCount', () => {
    it('should return follow counts', async () => {
      const mockCount = { followers: 10, following: 5 };
      const mockGetFollowCount = require('@/services/followService').FollowService.getFollowCount;
      mockGetFollowCount.mockResolvedValue(mockCount);
      
      const { result } = renderHook(() => useFollowCount(mockFollower));
      
      // Wait for the effect to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(mockGetFollowCount).toHaveBeenCalledWith(mockFollower);
      expect(result.current.followCount).toEqual(mockCount);
      expect(result.current.isLoading).toBe(false);
    });
  });
});