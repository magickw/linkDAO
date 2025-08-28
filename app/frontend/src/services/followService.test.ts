import { FollowService } from './followService';

// Mock fetch globally
global.fetch = jest.fn();

describe('FollowService', () => {
  const mockFollower = '0x1234567890123456789012345678901234567890';
  const mockFollowing = '0xabcdef1234567890abcdef1234567890abcdef12';

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  describe('follow', () => {
    it('should follow a user successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      const result = await FollowService.follow(mockFollower, mockFollowing);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/follow/follow',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ follower: mockFollower, following: mockFollowing }),
        }
      );
      expect(result).toBe(true);
    });

    it('should throw an error when follow fails', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'Failed to follow user' }),
      });

      await expect(FollowService.follow(mockFollower, mockFollowing)).rejects.toThrow(
        'Failed to follow user'
      );
    });
  });

  describe('unfollow', () => {
    it('should unfollow a user successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      const result = await FollowService.unfollow(mockFollower, mockFollowing);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/follow/unfollow',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ follower: mockFollower, following: mockFollowing }),
        }
      );
      expect(result).toBe(true);
    });

    it('should throw an error when unfollow fails', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'Failed to unfollow user' }),
      });

      await expect(FollowService.unfollow(mockFollower, mockFollowing)).rejects.toThrow(
        'Failed to unfollow user'
      );
    });
  });

  describe('getFollowers', () => {
    it('should get followers successfully', async () => {
      const mockFollowers = [mockFollowing, '0xanotheraddress'];
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockFollowers),
      });

      const result = await FollowService.getFollowers(mockFollower);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/follow/followers/0x1234567890123456789012345678901234567890',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      expect(result).toEqual(mockFollowers);
    });

    it('should throw an error when getting followers fails', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'Failed to fetch followers' }),
      });

      await expect(FollowService.getFollowers(mockFollower)).rejects.toThrow(
        'Failed to fetch followers'
      );
    });
  });

  describe('getFollowing', () => {
    it('should get following successfully', async () => {
      const mockFollowingList = [mockFollowing, '0xanotheraddress'];
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockFollowingList),
      });

      const result = await FollowService.getFollowing(mockFollower);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/follow/following/0x1234567890123456789012345678901234567890',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      expect(result).toEqual(mockFollowingList);
    });

    it('should throw an error when getting following fails', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'Failed to fetch following' }),
      });

      await expect(FollowService.getFollowing(mockFollower)).rejects.toThrow(
        'Failed to fetch following'
      );
    });
  });

  describe('isFollowing', () => {
    it('should check follow status successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(true),
      });

      const result = await FollowService.isFollowing(mockFollower, mockFollowing);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/follow/is-following/0x1234567890123456789012345678901234567890/0xabcdef1234567890abcdef1234567890abcdef12',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      expect(result).toBe(true);
    });

    it('should throw an error when checking follow status fails', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'Failed to check follow status' }),
      });

      await expect(
        FollowService.isFollowing(mockFollower, mockFollowing)
      ).rejects.toThrow('Failed to check follow status');
    });
  });

  describe('getFollowCount', () => {
    it('should get follow count successfully', async () => {
      const mockCount = { followers: 10, following: 5 };
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockCount),
      });

      const result = await FollowService.getFollowCount(mockFollower);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/follow/count/0x1234567890123456789012345678901234567890',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      expect(result).toEqual(mockCount);
    });

    it('should throw an error when getting follow count fails', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'Failed to fetch follow count' }),
      });

      await expect(FollowService.getFollowCount(mockFollower)).rejects.toThrow(
        'Failed to fetch follow count'
      );
    });
  });
});