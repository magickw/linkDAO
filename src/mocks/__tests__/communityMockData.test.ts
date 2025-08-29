import {
  mockCommunities,
  mockMemberships,
  mockCommunityPosts,
  MockCommunityService,
  createMockCommunity,
  createMockMembership,
  createMockCommunityPost
} from '../communityMockData';

describe('Community Mock Data', () => {
  describe('mockCommunities', () => {
    it('should contain valid community data', () => {
      expect(mockCommunities).toHaveLength(3);
      
      const firstCommunity = mockCommunities[0];
      expect(firstCommunity).toHaveProperty('id');
      expect(firstCommunity).toHaveProperty('name');
      expect(firstCommunity).toHaveProperty('displayName');
      expect(firstCommunity).toHaveProperty('description');
      expect(firstCommunity).toHaveProperty('memberCount');
      expect(firstCommunity).toHaveProperty('settings');
      expect(firstCommunity.settings).toHaveProperty('allowedPostTypes');
      expect(firstCommunity.settings).toHaveProperty('requireApproval');
      expect(firstCommunity.settings).toHaveProperty('minimumReputation');
      expect(firstCommunity.settings).toHaveProperty('stakingRequirements');
    });

    it('should have unique community names', () => {
      const names = mockCommunities.map(c => c.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('mockMemberships', () => {
    it('should contain valid membership data', () => {
      expect(mockMemberships).toHaveLength(3);
      
      const firstMembership = mockMemberships[0];
      expect(firstMembership).toHaveProperty('id');
      expect(firstMembership).toHaveProperty('userId');
      expect(firstMembership).toHaveProperty('communityId');
      expect(firstMembership).toHaveProperty('role');
      expect(firstMembership).toHaveProperty('joinedAt');
      expect(firstMembership).toHaveProperty('reputation');
      expect(firstMembership).toHaveProperty('contributions');
      expect(firstMembership).toHaveProperty('isActive');
    });

    it('should reference existing communities', () => {
      const communityIds = mockCommunities.map(c => c.id);
      mockMemberships.forEach(membership => {
        expect(communityIds).toContain(membership.communityId);
      });
    });
  });

  describe('mockCommunityPosts', () => {
    it('should contain valid community post data', () => {
      expect(mockCommunityPosts).toHaveLength(3);
      
      const firstPost = mockCommunityPosts[0];
      expect(firstPost).toHaveProperty('id');
      expect(firstPost).toHaveProperty('author');
      expect(firstPost).toHaveProperty('communityId');
      expect(firstPost).toHaveProperty('upvotes');
      expect(firstPost).toHaveProperty('downvotes');
      expect(firstPost).toHaveProperty('comments');
      expect(firstPost).toHaveProperty('isPinned');
      expect(firstPost).toHaveProperty('isLocked');
      expect(firstPost).toHaveProperty('depth');
    });

    it('should reference existing communities', () => {
      const communityIds = mockCommunities.map(c => c.id);
      mockCommunityPosts.forEach(post => {
        expect(communityIds).toContain(post.communityId);
      });
    });
  });

  describe('MockCommunityService', () => {
    it('should return all communities', async () => {
      const communities = await MockCommunityService.getAllCommunities();
      expect(communities).toEqual(mockCommunities);
    });

    it('should return community by ID', async () => {
      const community = await MockCommunityService.getCommunityById('1');
      expect(community).toEqual(mockCommunities[0]);
    });

    it('should return null for non-existent community', async () => {
      const community = await MockCommunityService.getCommunityById('999');
      expect(community).toBeNull();
    });

    it('should return user memberships', async () => {
      const memberships = await MockCommunityService.getUserMemberships('0x1234...5678');
      expect(memberships).toHaveLength(3);
      expect(memberships.every(m => m.userId === '0x1234...5678')).toBe(true);
    });

    it('should return community posts', async () => {
      const posts = await MockCommunityService.getCommunityPosts('1');
      expect(posts).toHaveLength(1);
      expect(posts[0].communityId).toBe('1');
    });

    it('should join community', async () => {
      const initialMembershipCount = mockMemberships.length;
      const initialMemberCount = mockCommunities[0].memberCount;
      
      const membership = await MockCommunityService.joinCommunity('1', '0xnewuser');
      
      expect(membership.userId).toBe('0xnewuser');
      expect(membership.communityId).toBe('1');
      expect(membership.role).toBe('member');
      expect(mockMemberships).toHaveLength(initialMembershipCount + 1);
      expect(mockCommunities[0].memberCount).toBe(initialMemberCount + 1);
    });

    it('should leave community', async () => {
      // First join a community
      await MockCommunityService.joinCommunity('2', '0xtestuser');
      const initialMembershipCount = mockMemberships.length;
      const initialMemberCount = mockCommunities[1].memberCount;
      
      const result = await MockCommunityService.leaveCommunity('2', '0xtestuser');
      
      expect(result).toBe(true);
      expect(mockMemberships).toHaveLength(initialMembershipCount - 1);
      expect(mockCommunities[1].memberCount).toBe(initialMemberCount - 1);
    });
  });

  describe('Helper functions', () => {
    it('should create mock community with defaults', () => {
      const community = createMockCommunity();
      
      expect(community).toHaveProperty('id');
      expect(community.name).toBe('test-community');
      expect(community.displayName).toBe('Test Community');
      expect(community.isPublic).toBe(true);
      expect(community.settings.requireApproval).toBe(false);
    });

    it('should create mock community with overrides', () => {
      const community = createMockCommunity({
        name: 'custom-community',
        displayName: 'Custom Community',
        isPublic: false
      });
      
      expect(community.name).toBe('custom-community');
      expect(community.displayName).toBe('Custom Community');
      expect(community.isPublic).toBe(false);
    });

    it('should create mock membership with defaults', () => {
      const membership = createMockMembership();
      
      expect(membership).toHaveProperty('id');
      expect(membership.userId).toBe('0xtest...user');
      expect(membership.communityId).toBe('1');
      expect(membership.role).toBe('member');
      expect(membership.isActive).toBe(true);
    });

    it('should create mock community post with defaults', () => {
      const post = createMockCommunityPost();
      
      expect(post).toHaveProperty('id');
      expect(post.author).toBe('0xtest...user');
      expect(post.communityId).toBe('1');
      expect(post.isPinned).toBe(false);
      expect(post.isLocked).toBe(false);
      expect(post.upvotes).toBe(0);
      expect(post.downvotes).toBe(0);
      expect(post.depth).toBe(0);
    });
  });
});