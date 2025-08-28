import { FollowService } from '../src/services/followService';

describe('FollowService', () => {
  let followService: FollowService;

  beforeEach(() => {
    followService = new FollowService();
    
    // Clear any existing follows before each test
    // Access the private properties through type assertion
    (followService as any).follows = [];
  });

  describe('follow', () => {
    it('should successfully create a follow relationship', async () => {
      const follower = '0x1234567890123456789012345678901234567890';
      const following = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

      const result = await followService.follow(follower, following);

      expect(result).toBe(true);
    });

    it('should return false when trying to follow an already followed user', async () => {
      const follower = '0x1234567890123456789012345678901234567890';
      const following = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

      // First follow
      await followService.follow(follower, following);
      
      // Try to follow again
      const result = await followService.follow(follower, following);

      expect(result).toBe(false);
    });
  });

  describe('unfollow', () => {
    it('should successfully remove a follow relationship', async () => {
      const follower = '0x1234567890123456789012345678901234567890';
      const following = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

      // First follow
      await followService.follow(follower, following);
      
      // Then unfollow
      const result = await followService.unfollow(follower, following);

      expect(result).toBe(true);
    });

    it('should return false when trying to unfollow a user that is not being followed', async () => {
      const follower = '0x1234567890123456789012345678901234567890';
      const following = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

      const result = await followService.unfollow(follower, following);

      expect(result).toBe(false);
    });
  });

  describe('getFollowers', () => {
    it('should return all followers for a user', async () => {
      // Reset service for clean state
      followService = new FollowService();
      (followService as any).follows = [];
      
      const user1 = '0x1234567890123456789012345678901234567890';
      const user2 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const user3 = '0x1111111111111111111111111111111111111111';

      // User2 and User3 follow User1
      await followService.follow(user2, user1);
      await followService.follow(user3, user1);

      const followers = await followService.getFollowers(user1);

      expect(followers).toHaveLength(2);
      expect(followers.some(f => f.follower === user2)).toBe(true);
      expect(followers.some(f => f.follower === user3)).toBe(true);
    });

    it('should return an empty array when a user has no followers', async () => {
      const user = '0x1234567890123456789012345678901234567890';

      const followers = await followService.getFollowers(user);

      expect(followers).toHaveLength(0);
    });
  });

  describe('getFollowing', () => {
    it('should return all users that a user is following', async () => {
      // Reset service for clean state
      followService = new FollowService();
      (followService as any).follows = [];
      
      const user1 = '0x1234567890123456789012345678901234567890';
      const user2 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const user3 = '0x1111111111111111111111111111111111111111';

      // User1 follows User2 and User3
      await followService.follow(user1, user2);
      await followService.follow(user1, user3);

      const following = await followService.getFollowing(user1);

      expect(following).toHaveLength(2);
      expect(following.some(f => f.following === user2)).toBe(true);
      expect(following.some(f => f.following === user3)).toBe(true);
    });

    it('should return an empty array when a user is not following anyone', async () => {
      const user = '0x1234567890123456789012345678901234567890';

      const following = await followService.getFollowing(user);

      expect(following).toHaveLength(0);
    });
  });

  describe('isFollowing', () => {
    it('should return true when a user is following another user', async () => {
      const follower = '0x1234567890123456789012345678901234567890';
      const following = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

      await followService.follow(follower, following);

      const result = await followService.isFollowing(follower, following);

      expect(result).toBe(true);
    });

    it('should return false when a user is not following another user', async () => {
      const follower = '0x1234567890123456789012345678901234567890';
      const following = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

      const result = await followService.isFollowing(follower, following);

      expect(result).toBe(false);
    });
  });

  describe('getFollowCount', () => {
    it('should return correct follower and following counts', async () => {
      // Reset service for clean state
      followService = new FollowService();
      (followService as any).follows = [];
      
      const user1 = '0x1234567890123456789012345678901234567890';
      const user2 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const user3 = '0x1111111111111111111111111111111111111111';

      // User2 and User3 follow User1 (2 followers)
      await followService.follow(user2, user1);
      await followService.follow(user3, user1);

      // User1 follows User2 and User3 (2 following)
      await followService.follow(user1, user2);
      await followService.follow(user1, user3);

      const count = await followService.getFollowCount(user1);

      expect(count.followers).toBe(2);
      expect(count.following).toBe(2);
    });

    it('should return zero counts when a user has no followers or following', async () => {
      const user = '0x1234567890123456789012345678901234567890';

      const count = await followService.getFollowCount(user);

      expect(count.followers).toBe(0);
      expect(count.following).toBe(0);
    });
  });
});