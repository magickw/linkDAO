// Mock Intelligent Cache Hook for testing
export const useIntelligentCache = () => ({
  cacheWithStrategy: jest.fn().mockResolvedValue(null),
  invalidateByTags: jest.fn().mockResolvedValue(undefined),
  predictivePreload: jest.fn().mockResolvedValue(undefined)
});