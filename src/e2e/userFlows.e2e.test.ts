import { ProfileService } from '../services/profileService';
import { PostService } from '../services/postService';
import { FollowService } from '../services/followService';

// Mock fetch globally
global.fetch = jest.fn();

describe('End-to-End User Flows', () => {
  const mockUserAddress = '0x1234567890123456789012345678901234567890';
  const mockUserProfile = {
    id: '1',
    address: mockUserAddress,
    handle: 'testuser',
    ens: 'testuser.eth',
    avatarCid: 'QmAvatar123',
    bioCid: 'QmBio123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockUserPost = {
    id: '1',
    author: mockUserAddress,
    content: 'Hello LinkDAO community!',
    tags: ['introduction', 'welcome'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockFollowTarget = '0xabcdef1234567890abcdef1234567890abcdef12';
  const mockFollowTargetProfile = {
    id: '2',
    address: mockFollowTarget,
    handle: 'followtarget',
    ens: 'followtarget.eth',
    avatarCid: 'QmAvatar456',
    bioCid: 'QmBio456',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockFollowTargetPost = {
    id: '2',
    author: mockFollowTarget,
    content: 'Welcome to LinkDAO!',
    tags: ['welcome', 'community'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  describe('New User Onboarding Flow', () => {
    it('should complete the full onboarding process', async () => {
      // Step 1: Connect wallet (mocked in UI)
      // Step 2: Create profile
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockUserProfile),
        });

      const profileInput = {
        address: mockUserAddress,
        handle: 'testuser',
        ens: 'testuser.eth',
        avatarCid: 'QmAvatar123',
        bioCid: 'QmBio123',
      };

      const createdProfile = await ProfileService.createProfile(profileInput);
      expect(createdProfile).toEqual(mockUserProfile);

      // Step 3: Create first post
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockUserPost),
        });

      const postInput = {
        author: mockUserAddress,
        content: 'Hello LinkDAO community!',
        tags: ['introduction', 'welcome'],
      };

      const createdPost = await PostService.createPost(postInput);
      expect(createdPost).toEqual(mockUserPost);

      // Step 4: View profile
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockUserProfile),
        });

      const profile = await ProfileService.getProfileByAddress(mockUserAddress);
      expect(profile).toEqual(mockUserProfile);

      // Step 5: View posts
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue([mockUserPost]),
        });

      const posts = await PostService.getPostsByAuthor(mockUserAddress);
      expect(posts).toEqual([mockUserPost]);
    });
  });

  describe('Social Interaction Flow', () => {
    it('should complete the social interaction process', async () => {
      // Step 1: Discover user to follow
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue([mockFollowTargetProfile]),
        });

      // In a real app, we would search or browse profiles
      // For this test, we'll just get the target profile directly
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockFollowTargetProfile),
        });

      const targetProfile = await ProfileService.getProfileByAddress(mockFollowTarget);
      expect(targetProfile).toEqual(mockFollowTargetProfile);

      // Step 2: Follow user
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ success: true }),
        });

      const followResult = await FollowService.follow(mockUserAddress, mockFollowTarget);
      expect(followResult).toBe(true);

      // Step 3: Check follow status
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(true),
        });

      const isFollowing = await FollowService.isFollowing(mockUserAddress, mockFollowTarget);
      expect(isFollowing).toBe(true);

      // Step 4: View target user's posts in feed
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue([mockFollowTargetPost, mockUserPost]),
        });

      const feed = await PostService.getFeed(mockUserAddress);
      expect(feed).toContainEqual(mockFollowTargetPost);
      expect(feed).toContainEqual(mockUserPost);

      // Step 5: Like/comment on a post (would be implemented in UI)
      // For now, we'll just verify we can retrieve the post
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockFollowTargetPost),
        });

      const post = await PostService.getPostById('2');
      expect(post).toEqual(mockFollowTargetPost);

      // Step 6: Unfollow user
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ success: true }),
        });

      const unfollowResult = await FollowService.unfollow(mockUserAddress, mockFollowTarget);
      expect(unfollowResult).toBe(true);
    });
  });

  describe('Content Creation and Discovery Flow', () => {
    it('should complete the content creation and discovery process', async () => {
      // Step 1: Create a new post with tags
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            ...mockUserPost,
            id: '3',
            content: 'Check out this amazing DeFi project!',
            tags: ['defi', 'ethereum', 'finance'],
          }),
        });

      const postInput = {
        author: mockUserAddress,
        content: 'Check out this amazing DeFi project!',
        tags: ['defi', 'ethereum', 'finance'],
      };

      const createdPost = await PostService.createPost(postInput);
      expect(createdPost.content).toBe('Check out this amazing DeFi project!');
      expect(createdPost.tags).toEqual(['defi', 'ethereum', 'finance']);

      // Step 2: Discover posts by tag
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue([createdPost]),
        });

      const defiPosts = await PostService.getPostsByTag('defi');
      expect(defiPosts).toHaveLength(1);
      expect(defiPosts[0].tags).toContain('defi');

      // Step 3: Update post
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            ...createdPost,
            content: 'Check out this amazing DeFi project! Updated with more details.',
            updatedAt: new Date().toISOString(),
          }),
        });

      const updateData = {
        content: 'Check out this amazing DeFi project! Updated with more details.',
      };

      const updatedPost = await PostService.updatePost('3', updateData);
      expect(updatedPost.content).toBe('Check out this amazing DeFi project! Updated with more details.');

      // Step 4: View all posts
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue([mockUserPost, mockFollowTargetPost, updatedPost]),
        });

      const allPosts = await PostService.getAllPosts();
      expect(allPosts).toHaveLength(3);
    });
  });

  describe('Profile Management Flow', () => {
    it('should complete the profile management process', async () => {
      // Step 1: View current profile
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockUserProfile),
        });

      const currentProfile = await ProfileService.getProfileByAddress(mockUserAddress);
      expect(currentProfile).toEqual(mockUserProfile);

      // Step 2: Update profile
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            ...mockUserProfile,
            handle: 'updateduser',
            ens: 'updateduser.eth',
            bioCid: 'QmUpdatedBio123',
            updatedAt: new Date().toISOString(),
          }),
        });

      const updateData = {
        handle: 'updateduser',
        ens: 'updateduser.eth',
        bioCid: 'QmUpdatedBio123',
      };

      const updatedProfile = await ProfileService.updateProfile('1', updateData);
      expect(updatedProfile.handle).toBe('updateduser');
      expect(updatedProfile.ens).toBe('updateduser.eth');

      // Step 3: Verify update
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(updatedProfile),
        });

      const verifiedProfile = await ProfileService.getProfileById('1');
      expect(verifiedProfile.handle).toBe('updateduser');
    });
  });

  describe('Error Recovery Flow', () => {
    it('should handle and recover from common errors', async () => {
      // Scenario: User tries to create a duplicate profile
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: jest.fn().mockResolvedValue({ error: 'Profile already exists' }),
        });

      const profileInput = {
        address: mockUserAddress,
        handle: 'testuser',
        ens: 'testuser.eth',
        avatarCid: 'QmAvatar123',
        bioCid: 'QmBio123',
      };

      await expect(ProfileService.createProfile(profileInput)).rejects.toThrow(
        'Profile already exists'
      );

      // Recovery: User retrieves their existing profile instead
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockUserProfile),
        });

      const existingProfile = await ProfileService.getProfileByAddress(mockUserAddress);
      expect(existingProfile).toEqual(mockUserProfile);

      // Scenario: User tries to access a non-existent post
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: jest.fn().mockResolvedValue({ error: 'Post not found' }),
        });

      const post = await PostService.getPostById('nonexistent');
      expect(post).toBeNull();

      // Recovery: User creates a new post instead
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            ...mockUserPost,
            id: '4',
            content: 'This is my new post after the error!',
          }),
        });

      const newPostInput = {
        author: mockUserAddress,
        content: 'This is my new post after the error!',
        tags: ['recovery', 'new'],
      };

      const newPost = await PostService.createPost(newPostInput);
      expect(newPost.content).toBe('This is my new post after the error!');
    });
  });
});