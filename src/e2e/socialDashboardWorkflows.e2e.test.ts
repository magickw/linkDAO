import { ProfileService } from '../services/profileService';
import { PostService } from '../services/postService';
import { CommunityService } from '../services/communityService';
import { FollowService } from '../services/followService';

// Mock fetch globally
global.fetch = jest.fn();

describe('Social Dashboard E2E Workflows', () => {
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

  const mockCommunity = {
    id: 'ethereum-builders',
    name: 'ethereum-builders',
    displayName: 'Ethereum Builders',
    description: 'A community for Ethereum developers and builders',
    category: 'Technology',
    memberCount: 1240,
    isPublic: true,
    moderators: [mockUserAddress],
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  describe('Complete Dashboard Onboarding Workflow', () => {
    it('should complete full dashboard setup and first interactions', async () => {
      // Step 1: User connects wallet and creates profile
      (fetch as jest.Mock).mockResolvedValueOnce({
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

      // Step 2: User lands on dashboard and sees empty feed
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([]),
      });

      const initialFeed = await PostService.getFeed(mockUserAddress);
      expect(initialFeed).toEqual([]);

      // Step 3: User creates their first post
      const firstPost = {
        id: '1',
        author: mockUserAddress,
        content: 'Hello LinkDAO! Excited to be here! 🚀',
        tags: ['introduction', 'welcome'],
        createdAt: new Date().toISOString(),
        reactions: { likes: 0, shares: 0, comments: 0 },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(firstPost),
      });

      const postInput = {
        author: mockUserAddress,
        content: 'Hello LinkDAO! Excited to be here! 🚀',
        tags: ['introduction', 'welcome'],
      };

      const createdPost = await PostService.createPost(postInput);
      expect(createdPost).toEqual(firstPost);

      // Step 4: User discovers and joins their first community
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([mockCommunity]),
      });

      const availableCommunities = await CommunityService.getPublicCommunities();
      expect(availableCommunities).toContainEqual(mockCommunity);

      // Step 5: User joins the community
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      const joinResult = await CommunityService.joinCommunity(mockUserAddress, 'ethereum-builders');
      expect(joinResult).toBe(true);

      // Step 6: User creates their first community post
      const communityPost = {
        id: '2',
        author: mockUserAddress,
        content: 'What are the best resources for learning Solidity?',
        communityId: 'ethereum-builders',
        upvotes: 0,
        downvotes: 0,
        comments: [],
        createdAt: new Date().toISOString(),
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(communityPost),
      });

      const communityPostInput = {
        author: mockUserAddress,
        content: 'What are the best resources for learning Solidity?',
        communityId: 'ethereum-builders',
      };

      const createdCommunityPost = await PostService.createCommunityPost(communityPostInput);
      expect(createdCommunityPost).toEqual(communityPost);
    });
  });

  describe('Social Interaction and Community Engagement Workflow', () => {
    it('should complete comprehensive social interaction flow', async () => {
      // Step 1: User discovers other users through community
      const otherUser = {
        id: '2',
        address: '0x2345678901234567890123456789012345678901',
        handle: 'ethdev',
        ens: 'ethdev.eth',
        avatarCid: 'QmAvatar456',
        bioCid: 'QmBio456',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([otherUser]),
      });

      const communityMembers = await CommunityService.getCommunityMembers('ethereum-builders');
      expect(communityMembers).toContainEqual(otherUser);

      // Step 2: User follows the other user
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      const followResult = await FollowService.follow(mockUserAddress, otherUser.address);
      expect(followResult).toBe(true);

      // Step 3: User sees other user's posts in their feed
      const otherUserPost = {
        id: '3',
        author: otherUser.address,
        content: 'Just deployed my first smart contract! 🎉',
        tags: ['achievement', 'smartcontract'],
        createdAt: new Date().toISOString(),
        reactions: { likes: 5, shares: 2, comments: 1 },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([otherUserPost]),
      });

      const updatedFeed = await PostService.getFeed(mockUserAddress);
      expect(updatedFeed).toContainEqual(otherUserPost);

      // Step 4: User interacts with the post (like and comment)
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      const likeResult = await PostService.likePost('3', mockUserAddress);
      expect(likeResult).toBe(true);

      const comment = {
        id: '1',
        postId: '3',
        author: mockUserAddress,
        content: 'Congratulations! What does it do?',
        createdAt: new Date().toISOString(),
        reactions: { likes: 0 },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(comment),
      });

      const commentInput = {
        postId: '3',
        author: mockUserAddress,
        content: 'Congratulations! What does it do?',
      };

      const createdComment = await PostService.createComment(commentInput);
      expect(createdComment).toEqual(comment);

      // Step 5: User participates in community discussion
      const discussionPost = {
        id: '4',
        author: mockUserAddress,
        content: 'Has anyone tried the new EIP-4844? Thoughts on blob transactions?',
        communityId: 'ethereum-builders',
        upvotes: 0,
        downvotes: 0,
        comments: [],
        createdAt: new Date().toISOString(),
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(discussionPost),
      });

      const discussionInput = {
        author: mockUserAddress,
        content: 'Has anyone tried the new EIP-4844? Thoughts on blob transactions?',
        communityId: 'ethereum-builders',
      };

      const createdDiscussion = await PostService.createCommunityPost(discussionInput);
      expect(createdDiscussion).toEqual(discussionPost);

      // Step 6: Other users engage with the discussion
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      const upvoteResult = await PostService.upvotePost('4', otherUser.address);
      expect(upvoteResult).toBe(true);
    });
  });

  describe('Community Management Workflow', () => {
    it('should complete community creation and management flow', async () => {
      // Step 1: User creates a new community
      const newCommunity = {
        id: 'defi-innovators',
        name: 'defi-innovators',
        displayName: 'DeFi Innovators',
        description: 'Exploring the future of decentralized finance',
        category: 'Finance',
        memberCount: 1,
        isPublic: true,
        moderators: [mockUserAddress],
        createdAt: new Date().toISOString(),
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(newCommunity),
      });

      const communityInput = {
        name: 'defi-innovators',
        displayName: 'DeFi Innovators',
        description: 'Exploring the future of decentralized finance',
        category: 'Finance',
        isPublic: true,
        creator: mockUserAddress,
      };

      const createdCommunity = await CommunityService.createCommunity(communityInput);
      expect(createdCommunity).toEqual(newCommunity);

      // Step 2: User sets up community rules and settings
      const communitySettings = {
        allowedPostTypes: ['text', 'image', 'link'],
        requireApproval: true,
        minimumReputation: 10,
        rules: [
          'Be respectful to all members',
          'No spam or promotional content',
          'Stay on topic - DeFi discussions only',
        ],
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      const settingsResult = await CommunityService.updateCommunitySettings(
        'defi-innovators',
        communitySettings
      );
      expect(settingsResult).toBe(true);

      // Step 3: Other users discover and join the community
      const newMember = {
        id: '3',
        address: '0x3456789012345678901234567890123456789012',
        handle: 'defitrader',
        ens: 'defitrader.eth',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      const memberJoinResult = await CommunityService.joinCommunity(
        newMember.address,
        'defi-innovators'
      );
      expect(memberJoinResult).toBe(true);

      // Step 4: New member creates a post that needs approval
      const pendingPost = {
        id: '5',
        author: newMember.address,
        content: 'What are your thoughts on the latest Uniswap v4 features?',
        communityId: 'defi-innovators',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(pendingPost),
      });

      const pendingPostInput = {
        author: newMember.address,
        content: 'What are your thoughts on the latest Uniswap v4 features?',
        communityId: 'defi-innovators',
      };

      const createdPendingPost = await PostService.createCommunityPost(pendingPostInput);
      expect(createdPendingPost).toEqual(pendingPost);

      // Step 5: Moderator (user) reviews and approves the post
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([pendingPost]),
      });

      const pendingPosts = await CommunityService.getPendingPosts('defi-innovators');
      expect(pendingPosts).toContainEqual(pendingPost);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      const approvalResult = await CommunityService.approvePost('5', mockUserAddress);
      expect(approvalResult).toBe(true);

      // Step 6: Community grows and user adds another moderator
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      const moderatorResult = await CommunityService.addModerator(
        'defi-innovators',
        newMember.address,
        mockUserAddress
      );
      expect(moderatorResult).toBe(true);
    });
  });

  describe('Content Discovery and Engagement Workflow', () => {
    it('should complete content discovery and engagement flow', async () => {
      // Step 1: User searches for content by tags
      const taggedPosts = [
        {
          id: '6',
          author: '0x4567890123456789012345678901234567890123',
          content: 'Deep dive into Layer 2 scaling solutions',
          tags: ['layer2', 'scaling', 'ethereum'],
          createdAt: new Date().toISOString(),
          reactions: { likes: 15, shares: 8, comments: 5 },
        },
        {
          id: '7',
          author: '0x5678901234567890123456789012345678901234',
          content: 'Optimism vs Arbitrum: A comprehensive comparison',
          tags: ['layer2', 'optimism', 'arbitrum'],
          createdAt: new Date().toISOString(),
          reactions: { likes: 22, shares: 12, comments: 8 },
        },
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(taggedPosts),
      });

      const searchResults = await PostService.getPostsByTag('layer2');
      expect(searchResults).toEqual(taggedPosts);

      // Step 2: User discovers trending content
      const trendingPosts = [
        {
          id: '8',
          author: '0x6789012345678901234567890123456789012345',
          content: 'Breaking: Major DeFi protocol announces new tokenomics',
          tags: ['defi', 'tokenomics', 'breaking'],
          createdAt: new Date().toISOString(),
          reactions: { likes: 45, shares: 25, comments: 18 },
          trendingScore: 95,
        },
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(trendingPosts),
      });

      const trending = await PostService.getTrendingPosts();
      expect(trending).toEqual(trendingPosts);

      // Step 3: User engages with trending content
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      const shareResult = await PostService.sharePost('8', mockUserAddress);
      expect(shareResult).toBe(true);

      // Step 4: User creates content with media attachments
      const mediaPost = {
        id: '9',
        author: mockUserAddress,
        content: 'Check out this amazing DeFi dashboard I built!',
        tags: ['defi', 'dashboard', 'project'],
        mediaCids: ['QmImage123', 'QmVideo456'],
        createdAt: new Date().toISOString(),
        reactions: { likes: 0, shares: 0, comments: 0 },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mediaPost),
      });

      const mediaPostInput = {
        author: mockUserAddress,
        content: 'Check out this amazing DeFi dashboard I built!',
        tags: ['defi', 'dashboard', 'project'],
        mediaCids: ['QmImage123', 'QmVideo456'],
      };

      const createdMediaPost = await PostService.createPost(mediaPostInput);
      expect(createdMediaPost).toEqual(mediaPost);

      // Step 5: User's content gets discovered and engaged with
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      const engagementResult = await PostService.likePost('9', '0x7890123456789012345678901234567890123456');
      expect(engagementResult).toBe(true);

      // Step 6: User builds reputation through quality content
      const userStats = {
        postsCount: 5,
        likesReceived: 67,
        sharesReceived: 23,
        commentsReceived: 15,
        reputation: 145,
        followersCount: 12,
        followingCount: 8,
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(userStats),
      });

      const stats = await ProfileService.getUserStats(mockUserAddress);
      expect(stats).toEqual(userStats);
    });
  });

  describe('Error Recovery and Edge Cases Workflow', () => {
    it('should handle various error scenarios gracefully', async () => {
      // Scenario 1: Network connectivity issues
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const feedResult = await PostService.getFeed(mockUserAddress);
      expect(feedResult).toBeNull();

      // Recovery: Retry with cached data
      const cachedPosts = [
        {
          id: 'cached-1',
          author: mockUserAddress,
          content: 'Cached post content',
          tags: ['cached'],
          createdAt: new Date().toISOString(),
          reactions: { likes: 1, shares: 0, comments: 0 },
        },
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(cachedPosts),
      });

      const recoveredFeed = await PostService.getFeed(mockUserAddress);
      expect(recoveredFeed).toEqual(cachedPosts);

      // Scenario 2: Community access denied
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: jest.fn().mockResolvedValue({ error: 'Access denied' }),
      });

      const restrictedCommunity = await CommunityService.getCommunityPosts('private-community');
      expect(restrictedCommunity).toBeNull();

      // Scenario 3: Post creation with invalid content
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({ error: 'Content too long' }),
      });

      const invalidPostInput = {
        author: mockUserAddress,
        content: 'A'.repeat(1000), // Too long
        tags: ['test'],
      };

      await expect(PostService.createPost(invalidPostInput)).rejects.toThrow('Content too long');

      // Recovery: User edits and resubmits
      const validPostInput = {
        author: mockUserAddress,
        content: 'This is a properly sized post',
        tags: ['test'],
      };

      const validPost = {
        id: '10',
        ...validPostInput,
        createdAt: new Date().toISOString(),
        reactions: { likes: 0, shares: 0, comments: 0 },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(validPost),
      });

      const recoveredPost = await PostService.createPost(validPostInput);
      expect(recoveredPost).toEqual(validPost);

      // Scenario 4: Wallet disconnection during interaction
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({ error: 'Wallet not connected' }),
      });

      const disconnectedResult = await PostService.likePost('10', mockUserAddress);
      expect(disconnectedResult).toBe(false);

      // Recovery: User reconnects wallet and retries
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      const reconnectedResult = await PostService.likePost('10', mockUserAddress);
      expect(reconnectedResult).toBe(true);
    });
  });
});