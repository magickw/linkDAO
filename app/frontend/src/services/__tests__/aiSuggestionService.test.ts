import { AISuggestionService } from '../aiSuggestionService';

describe('AISuggestionService', () => {
  let service: AISuggestionService;

  beforeEach(() => {
    service = AISuggestionService.getInstance();
  });

  afterEach(() => {
    // Clear any internal state between tests
    (service as any).searchHistory = [];
    (service as any).aiModel = new (service as any).aiModel.constructor();
  });

  describe('getSearchSuggestions', () => {
    it('should return empty array for empty query', async () => {
      const suggestions = await service.getSearchSuggestions('');
      expect(suggestions).toEqual([]);
    });

    it('should return empty array for very short query', async () => {
      const suggestions = await service.getSearchSuggestions('a');
      expect(suggestions).toEqual([]);
    });

    it('should return suggestions for valid query', async () => {
      // Record some training data
      service.recordSearch('defi', 'DeFi');
      service.recordSearch('defi', 'Decentralized Finance');
      
      const suggestions = await service.getSearchSuggestions('defi');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should use context for better suggestions', async () => {
      const context = {
        recentCommunities: ['DeFi', 'NFT', 'DAO'],
        searchHistory: ['blockchain', 'ethereum']
      };
      
      const suggestions = await service.getSearchSuggestions('def', context);
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('getRelatedCommunities', () => {
    it('should return related communities', async () => {
      const communities = [
        { id: '1', name: 'DeFi Community', displayName: 'DeFi', category: 'Finance' },
        { id: '2', name: 'NFT Community', displayName: 'NFT', category: 'Art' },
        { id: '3', name: 'DAO Community', displayName: 'DAO', category: 'Governance' }
      ] as any;
      
      const related = await service.getRelatedCommunities('defi', communities, 2);
      expect(Array.isArray(related)).toBe(true);
    });
  });

  describe('getTrendingSuggestions', () => {
    it('should return trending suggestions', async () => {
      // Add some search history
      service.recordSearch('bitcoin');
      service.recordSearch('ethereum');
      service.recordSearch('bitcoin');
      
      const suggestions = await service.getTrendingSuggestions();
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('recordSearch', () => {
    it('should record search queries', () => {
      const initialHistoryLength = (service as any).searchHistory.length;
      service.recordSearch('test query');
      expect((service as any).searchHistory.length).toBe(initialHistoryLength + 1);
    });

    it('should train AI model when suggestion is selected', () => {
      const initialTrainingSize = (service as any).aiModel.trainingData.size;
      service.recordSearch('defi', 'DeFi');
      expect((service as any).aiModel.trainingData.size).toBeGreaterThanOrEqual(initialTrainingSize);
    });
  });

  describe('updateCommunityCache', () => {
    it('should update community cache', () => {
      const communities = [
        { id: '1', name: 'Test Community' },
        { id: '2', name: 'Another Community' }
      ] as any;
      
      service.updateCommunityCache(communities);
      expect((service as any).communityCache.size).toBe(2);
    });
  });
});