import { CommunityMembershipService } from '../communityMembershipService';
import { CommunityMembership, CreateCommunityMembershipInput } from '../../models/CommunityMembership';

// Mock fetch globally
global.fetch = jest.fn();

describe('CommunityMembershipService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('joinCommunity', () => {
    it('should join a community successfully', async () => {
      const mockMembership: CommunityMembership = {
        id: '1',
        userId: '0x123',
        communityId: '1',
        role: 'member',
        joinedAt: new Date(),
        reputation: 0,
        contributions: 0,
        isActive: true,
        lastActivityAt: new Date()
      };

      const joinInput: CreateCommunityMembershipInput = {
        userId: '0x123',
        communityId: '1'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMembership,
      });

      const result = await CommunityMembershipService.joinCommunity(joinInput);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/communities/1/members',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(joinInput),
        })
      );
      expect(result).toEqual(mockMembership);
    });
  });

  describe('leaveCommunity', () => {
    it('should leave a community successfully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await CommunityMembershipService.leaveCommunity('1', '0x123');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/communities/1/members/0x123',
        expect.objectContaining({
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
      expect(result).toBe(true);
    });

    it('should return false for non-existent membership', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Membership not found' }),
      });

      const result = await CommunityMembershipService.leaveCommunity('1', '0x123');

      expect(result).toBe(false);
    });
  });

  describe('getMembership', () => {
    it('should get membership information', async () => {
      const mockMembership: CommunityMembership = {
        id: '1',
        userId: '0x123',
        communityId: '1',
        role: 'member',
        joinedAt: new Date(),
        reputation: 100,
        contributions: 5,
        isActive: true,
        lastActivityAt: new Date()
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMembership,
      });

      const result = await CommunityMembershipService.getMembership('1', '0x123');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/communities/1/members/0x123',
        expect.objectContaining({
          method: 'GET',
        })
      );
      expect(result).toEqual(mockMembership);
    });

    it('should return null for non-existent membership', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Membership not found' }),
      });

      const result = await CommunityMembershipService.getMembership('1', '0x123');

      expect(result).toBeNull();
    });
  });

  describe('isMember', () => {
    it('should return true for active member', async () => {
      const mockMembership: CommunityMembership = {
        id: '1',
        userId: '0x123',
        communityId: '1',
        role: 'member',
        joinedAt: new Date(),
        reputation: 100,
        contributions: 5,
        isActive: true,
        lastActivityAt: new Date()
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMembership,
      });

      const result = await CommunityMembershipService.isMember('1', '0x123');

      expect(result).toBe(true);
    });

    it('should return false for inactive member', async () => {
      const mockMembership: CommunityMembership = {
        id: '1',
        userId: '0x123',
        communityId: '1',
        role: 'member',
        joinedAt: new Date(),
        reputation: 100,
        contributions: 5,
        isActive: false,
        lastActivityAt: new Date()
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMembership,
      });

      const result = await CommunityMembershipService.isMember('1', '0x123');

      expect(result).toBe(false);
    });

    it('should return false for non-existent membership', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Membership not found' }),
      });

      const result = await CommunityMembershipService.isMember('1', '0x123');

      expect(result).toBe(false);
    });
  });

  describe('isModerator', () => {
    it('should return true for moderator', async () => {
      const mockMembership: CommunityMembership = {
        id: '1',
        userId: '0x123',
        communityId: '1',
        role: 'moderator',
        joinedAt: new Date(),
        reputation: 500,
        contributions: 25,
        isActive: true,
        lastActivityAt: new Date()
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMembership,
      });

      const result = await CommunityMembershipService.isModerator('1', '0x123');

      expect(result).toBe(true);
    });

    it('should return true for admin', async () => {
      const mockMembership: CommunityMembership = {
        id: '1',
        userId: '0x123',
        communityId: '1',
        role: 'admin',
        joinedAt: new Date(),
        reputation: 1000,
        contributions: 50,
        isActive: true,
        lastActivityAt: new Date()
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMembership,
      });

      const result = await CommunityMembershipService.isModerator('1', '0x123');

      expect(result).toBe(true);
    });

    it('should return false for regular member', async () => {
      const mockMembership: CommunityMembership = {
        id: '1',
        userId: '0x123',
        communityId: '1',
        role: 'member',
        joinedAt: new Date(),
        reputation: 100,
        contributions: 5,
        isActive: true,
        lastActivityAt: new Date()
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMembership,
      });

      const result = await CommunityMembershipService.isModerator('1', '0x123');

      expect(result).toBe(false);
    });
  });
});