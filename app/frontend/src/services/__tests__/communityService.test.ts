import { CommunityService } from '../communityService';
import { Community, CreateCommunityInput } from '../../models/Community';

// Mock fetch globally
global.fetch = jest.fn();

describe('CommunityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCommunity', () => {
    it('should create a community successfully', async () => {
      const mockCommunity: Community = {
        id: '1',
        name: 'test-community',
        displayName: 'Test Community',
        description: 'A test community',
        rules: ['Be nice'],
        memberCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'Test',
        tags: ['test'],
        isPublic: true,
        moderators: [],
        settings: {
          allowedPostTypes: [],
          requireApproval: false,
          minimumReputation: 0,
          stakingRequirements: []
        }
      };

      const createInput: CreateCommunityInput = {
        name: 'test-community',
        displayName: 'Test Community',
        description: 'A test community',
        category: 'Test'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCommunity,
      });

      const result = await CommunityService.createCommunity(createInput);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:10000/api/communities',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(createInput),
        })
      );
      expect(result).toEqual(mockCommunity);
    });

    it('should handle creation errors', async () => {
      const createInput: CreateCommunityInput = {
        name: 'test-community',
        displayName: 'Test Community',
        description: 'A test community',
        category: 'Test'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Community name already exists' }),
      });

      await expect(CommunityService.createCommunity(createInput)).rejects.toThrow(
        'Community name already exists'
      );
    });
  });

  describe('getCommunityById', () => {
    it('should fetch a community by ID', async () => {
      const mockCommunity: Community = {
        id: '1',
        name: 'test-community',
        displayName: 'Test Community',
        description: 'A test community',
        rules: ['Be nice'],
        memberCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'Test',
        tags: ['test'],
        isPublic: true,
        moderators: [],
        settings: {
          allowedPostTypes: [],
          requireApproval: false,
          minimumReputation: 0,
          stakingRequirements: []
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCommunity,
      });

      const result = await CommunityService.getCommunityById('1');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:10000/api/communities/1',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
      expect(result).toEqual(mockCommunity);
    });

    it('should return null for non-existent community', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Community not found' }),
      });

      const result = await CommunityService.getCommunityById('999');

      expect(result).toBeNull();
    });
  });

  describe('getAllCommunities', () => {
    it('should fetch all communities', async () => {
      const mockCommunities: Community[] = [
        {
          id: '1',
          name: 'community-1',
          displayName: 'Community 1',
          description: 'First community',
          rules: [],
          memberCount: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: 'Test',
          tags: [],
          isPublic: true,
          moderators: [],
          settings: {
            allowedPostTypes: [],
            requireApproval: false,
            minimumReputation: 0,
            stakingRequirements: []
          }
        }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCommunities,
      });

      const result = await CommunityService.getAllCommunities();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:10000/api/communities',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
      expect(result).toEqual(mockCommunities);
    });

    it('should handle query parameters', async () => {
      const mockCommunities: Community[] = [];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCommunities,
      });

      await CommunityService.getAllCommunities({
        category: 'DeFi',
        tags: ['defi', 'yield'],
        isPublic: true,
        limit: 10,
        offset: 0
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:10000/api/communities?'),
        expect.objectContaining({
          method: 'GET',
        })
      );
      
      // Check that the URL contains the expected parameters
      const callArgs = (fetch as jest.Mock).mock.calls[0];
      const url = callArgs[0];
      expect(url).toContain('category=DeFi');
      expect(url).toContain('tags=defi%2Cyield');
      expect(url).toContain('isPublic=true');
      expect(url).toContain('limit=10');
    });
  });

  describe('searchCommunities', () => {
    it('should search communities by query', async () => {
      const mockCommunities: Community[] = [];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCommunities,
      });

      await CommunityService.searchCommunities('defi', 5);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:10000/api/communities/search?q=defi&limit=5',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });
});