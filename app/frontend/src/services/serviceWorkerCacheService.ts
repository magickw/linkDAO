// Mock Service Worker Cache Service for testing
export const serviceWorkerCacheService = {
  cacheWithStrategy: jest.fn().mockResolvedValue(null),
  invalidateByTags: jest.fn().mockResolvedValue(undefined),
  predictivePreload: jest.fn().mockResolvedValue(undefined),
  initialize: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined),
  cachePreviewContent: jest.fn().mockResolvedValue(undefined),
  cacheResources: jest.fn().mockResolvedValue(undefined),
  getCacheStats: jest.fn().mockReturnValue({ size: 0, entries: 0 }),
  checkStorageQuota: jest.fn().mockResolvedValue({ used: 0, available: 1000000 }),
  warmCache: jest.fn().mockResolvedValue(undefined),
  clearAllCaches: jest.fn().mockResolvedValue(undefined)
};