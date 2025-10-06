// Mock Service Worker Cache Service for testing
export const serviceWorkerCacheService = {
  cacheWithStrategy: jest.fn().mockResolvedValue(null),
  invalidateByTags: jest.fn().mockResolvedValue(undefined),
  predictivePreload: jest.fn().mockResolvedValue(undefined)
};