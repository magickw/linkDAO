import { ProfileService } from '../services/profileService';
import { PostService } from '../services/postService';
import { FollowService } from '../services/followService';

// Mock fetch globally
global.fetch = jest.fn();

describe('API Integration Tests', () => {
  const mockUserAddress = '0x1234567890123456789012345678901234567890';
  const mockProfile = {
    id: '1',
    address: mockUserAddress,
    handle: 'testuser',
    ens: 'testuser.eth',
    avatarCid: 'QmAvatar123',
    bioCid: 'QmBio123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockPost = {
    id: '1',
    author: mockUserAddress,
    content: 'This is a test post',
    tags: ['test', 'integration'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  describe('User Profile Flow', () => {
    it('should create, retrieve, update, and delete a profile', async () => {
      // Create profile
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProfile),
      });

      const profileInput = {
        address: mockUserAddress,
        handle: 'testuser',
        ens: 'testuser.eth',
        avatarCid: 'QmAvatar123',
        bioCid: 'QmBio123',
      };

      const createdProfile = await ProfileService.createProfile(profileInput);
      expect(createdProfile).toEqual(mockProfile);

      // Get profile by ID
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProfile),
      });

      const retrievedProfile = await ProfileService.getProfileById('1');
      expect(retrievedProfile).toEqual(mockProfile);

      // Get profile by address
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProfile),
      });

      const profileByAddress = await ProfileService.getProfileByAddress(mockUserAddress);
      expect(profileByAddress).toEqual(mockProfile);

      // Update profile
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          ...mockProfile,
          handle: 'updateduser',
          ens: 'updateduser.eth',
        }),
      });

      const updateData = {
        handle: 'updateduser',
        ens: 'updateduser.eth',
        avatarCid: 'QmUpdatedAvatar123',
        bioCid: 'QmUpdatedBio123',
      };

      const updatedProfile = await ProfileService.updateProfile('1', updateData);
      expect(updatedProfile.handle).toBe('updateduser');
      expect(updatedProfile.ens).toBe('updateduser.eth');
    });
  });

  describe('Post Creation and Retrieval Flow', () => {
    it('should create a post and retrieve it through various methods', async () => {
      // Create post
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockPost),
      });

      const postInput = {
        author: mockUserAddress,
        content: 'This is a test post',
        tags: ['test', 'integration'],
      };

      const createdPost = await PostService.createPost(postInput);
      expect(createdPost).toEqual(mockPost);

      // Get post by ID
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockPost),
      });

      const retrievedPost = await PostService.getPostById('1');
      expect(retrievedPost).toEqual(mockPost);

      // Get posts by author
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([mockPost]),
      });

      const postsByAuthor = await PostService.getPostsByAuthor(mockUserAddress);
      expect(postsByAuthor).toEqual([mockPost]);

      // Get posts by tag
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([mockPost]),
      });

      const postsByTag = await PostService.getPostsByTag('test');
      expect(postsByTag).toEqual([mockPost]);

      // Get all posts
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([mockPost]),
      });

      const allPosts = await PostService.getAllPosts();
      expect(allPosts).toEqual([mockPost]);
    });
  });

  describe('Follow System Flow', () => {
    it('should follow a user, check status, and retrieve followers/following', async () => {
      const followTarget = '0xabcdef1234567890abcdef1234567890abcdef12';

      // Follow user
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      const followResult = await FollowService.follow(mockUserAddress, followTarget);
      expect(followResult).toBe(true);

      // Check follow status
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(true),
      });

      const isFollowing = await FollowService.isFollowing(mockUserAddress, followTarget);
      expect(isFollowing).toBe(true);

      // Get followers
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([mockUserAddress]),
      });

      const followers = await FollowService.getFollowers(followTarget);
      expect(followers).toEqual([mockUserAddress]);

      // Get following
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([followTarget]),
      });

      const following = await FollowService.getFollowing(mockUserAddress);
      expect(following).toEqual([followTarget]);

      // Get follow count
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ followers: 1, following: 1 }),
      });

      const followCount = await FollowService.getFollowCount(mockUserAddress);
      expect(followCount).toEqual({ followers: 1, following: 1 });

      // Unfollow user
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      const unfollowResult = await FollowService.unfollow(mockUserAddress, followTarget);
      expect(unfollowResult).toBe(true);
    });
  });

  describe('User Feed Flow', () => {
    it('should retrieve user feed', async () => {
      // Get user feed
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([mockPost]),
      });

      const feed = await PostService.getFeed(mockUserAddress);
      expect(feed).toEqual([mockPost]);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Mock an API error
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({ error: 'Profile not found' }),
      });

      // Should return null for not found errors
      const profile = await ProfileService.getProfileById('nonexistent');
      expect(profile).toBeNull();

      // Mock a server error
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ error: 'Internal server error' }),
      });

      // Should throw an error for server errors
      await expect(PostService.getPostById('1')).rejects.toThrow(
        'Internal server error'
      );
    });
  });
});