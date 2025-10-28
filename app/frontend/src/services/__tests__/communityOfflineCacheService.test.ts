import { CommunityOfflineCacheService } from '../communityOfflineCacheService';

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn().mockReturnValue({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      transaction: jest.fn().mockReturnValue({
        objectStore: jest.fn().mockReturnValue({
          createIndex: jest.fn(),
          put: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
          get: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
          getAll: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
          delete: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
          index: jest.fn().mockReturnValue({
            getAll: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
            openKeyCursor: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
            count: jest.fn().mockReturnValue({ onsuccess: null, onerror: null })
          })
        })
      })
    }
  })
};

describe('CommunityOfflineCacheService', () => {
  let service: CommunityOfflineCacheService;

  beforeAll(() => {
    // Mock global indexedDB
    (global as any).indexedDB = mockIndexedDB;
  });

  beforeEach(() => {
    service = CommunityOfflineCacheService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be able to create an instance', () => {
    expect(service).toBeInstanceOf(CommunityOfflineCacheService);
  });

  it('should generate unique IDs', () => {
    const id1 = (service as any).generateId();
    const id2 = (service as any).generateId();
    
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toEqual(id2);
  });

  it('should report online status correctly', () => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true
    });
    
    expect(service.isOnlineStatus()).toBe(true);
  });
});