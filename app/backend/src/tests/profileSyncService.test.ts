import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock all external dependencies
jest.mock('../db/connection', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  }
}));

jest.mock('../services/sellerService', () => ({
  sellerService: {
    getSellerProfile: jest.fn(),
  }
}));

// Import after mocking
import { profileSyncService, ProfileChangeEvent } from '../services/profileSyncService';

describe('ProfileSyncService', () => {
  const mockWalletAddress = '0x1234567890123456789012345678901234567890';
  const mockChanges = {
    displayName: 'Test Seller',
    storeName: 'Test Store',
    bio: 'Updated bio',
  };

  beforeEach(() => {
    // Clear any existing event listeners
    profileSyncService.removeAllListeners();
    profileSyncService.setupEventListeners();
  });

  afterEach(() => {
    // Cleanup after each test
    profileSyncService.cleanup();
  });

  describe('Profile Change Synchronization', () => {
    it('should emit profile change events', (done) => {
      profileSyncService.once('profileChange', (event: ProfileChangeEvent) => {
        expect(event.walletAddress).toBe(mockWalletAddress);
        expect(event.changes).toEqual(mockChanges);
        expect(event.changeType).toBe('profile_update');
        expect(event.timestamp).toBeInstanceOf(Date);
        done();
      });

      profileSyncService.syncProfileChanges(
        mockWalletAddress,
        mockChanges,
        'profile_update'
      );
    });

    it('should handle different change types', async () => {
      const changeTypes = ['profile_update', 'image_update', 'ens_update', 'verification_update'] as const;
      
      for (const changeType of changeTypes) {
        const eventPromise = new Promise<ProfileChangeEvent>((resolve) => {
          profileSyncService.once('profileChange', resolve);
        });

        await profileSyncService.syncProfileChanges(
          mockWalletAddress,
          mockChanges,
          changeType
        );

        const event = await eventPromise;
        expect(event.changeType).toBe(changeType);
      }
    });

    it('should emit cache invalidation events', (done) => {
      profileSyncService.once('cacheInvalidated', (data) => {
        expect(data.walletAddress).toBe(mockWalletAddress);
        expect(data.timestamp).toBeInstanceOf(Date);
        done();
      });

      // Trigger cache invalidation by syncing changes
      profileSyncService.syncProfileChanges(
        mockWalletAddress,
        mockChanges,
        'profile_update'
      );
    });

    it('should emit broadcast events for real-time updates', (done) => {
      profileSyncService.once('profileBroadcast', (event: ProfileChangeEvent) => {
        expect(event.walletAddress).toBe(mockWalletAddress);
        expect(event.changes).toEqual(mockChanges);
        done();
      });

      profileSyncService.syncProfileChanges(
        mockWalletAddress,
        mockChanges,
        'profile_update'
      );
    });

    it('should emit search index update events for searchable fields', (done) => {
      const searchableChanges = {
        displayName: 'New Display Name',
        storeName: 'New Store Name',
        bio: 'New bio',
      };

      profileSyncService.once('searchIndexUpdate', (data) => {
        expect(data.walletAddress).toBe(mockWalletAddress);
        expect(data.changes).toEqual(searchableChanges);
        done();
      });

      profileSyncService.syncProfileChanges(
        mockWalletAddress,
        searchableChanges,
        'profile_update'
      );
    });

    it('should not emit search index update for non-searchable fields', (done) => {
      const nonSearchableChanges = {
        email: 'test@example.com',
        phone: '+1234567890',
      };

      // Set a timeout to ensure the event is not emitted
      const timeout = setTimeout(() => {
        done(); // Test passes if no event is emitted
      }, 100);

      profileSyncService.once('searchIndexUpdate', () => {
        clearTimeout(timeout);
        done(new Error('Search index update should not be emitted for non-searchable fields'));
      });

      profileSyncService.syncProfileChanges(
        mockWalletAddress,
        nonSearchableChanges,
        'profile_update'
      );
    });

    it('should create profile backups', (done) => {
      profileSyncService.once('profileBackup', (backup) => {
        expect(backup.walletAddress).toBe(mockWalletAddress);
        expect(backup.changes).toEqual(mockChanges);
        expect(backup.timestamp).toBeInstanceOf(Date);
        expect(backup.version).toBeGreaterThan(0);
        done();
      });

      profileSyncService.syncProfileChanges(
        mockWalletAddress,
        mockChanges,
        'profile_update'
      );
    });
  });

  describe('Cache Management', () => {
    it('should debounce cache invalidation', (done) => {
      let invalidationCount = 0;

      profileSyncService.on('cacheInvalidated', () => {
        invalidationCount++;
      });

      // Trigger multiple rapid changes
      profileSyncService.syncProfileChanges(mockWalletAddress, { displayName: 'Name 1' });
      profileSyncService.syncProfileChanges(mockWalletAddress, { displayName: 'Name 2' });
      profileSyncService.syncProfileChanges(mockWalletAddress, { displayName: 'Name 3' });

      // Check after debounce delay
      setTimeout(() => {
        expect(invalidationCount).toBe(1); // Should only invalidate once due to debouncing
        done();
      }, 1100); // Wait longer than debounce delay
    });
  });

  describe('Validation', () => {
    it('should return sync validation results', async () => {
      const validation = await profileSyncService.validateSync(mockWalletAddress);
      
      expect(validation).toHaveProperty('isInSync');
      expect(validation).toHaveProperty('discrepancies');
      expect(validation).toHaveProperty('lastSyncTime');
      expect(typeof validation.isInSync).toBe('boolean');
      expect(Array.isArray(validation.discrepancies)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle sync errors gracefully', async () => {
      // Mock an error condition by overriding a method
      const originalEmit = profileSyncService.emit.bind(profileSyncService);
      (profileSyncService as any).emit = jest.fn().mockImplementation(() => {
        throw new Error('Mock sync error');
      });

      await expect(
        profileSyncService.syncProfileChanges(mockWalletAddress, mockChanges)
      ).rejects.toThrow('Failed to synchronize profile changes');

      // Restore original emit
      (profileSyncService as any).emit = originalEmit;
    });
  });

  describe('Cleanup', () => {
    it('should cleanup pending operations', () => {
      // Trigger some operations
      profileSyncService.syncProfileChanges(mockWalletAddress, mockChanges);
      
      // Cleanup should not throw
      expect(() => {
        profileSyncService.cleanup();
      }).not.toThrow();
    });

    it('should remove all event listeners on cleanup', () => {
      // Add some listeners
      profileSyncService.on('profileChange', () => {});
      profileSyncService.on('cacheInvalidated', () => {});
      
      expect(profileSyncService.listenerCount('profileChange')).toBeGreaterThan(0);
      expect(profileSyncService.listenerCount('cacheInvalidated')).toBeGreaterThan(0);
      
      profileSyncService.cleanup();
      
      expect(profileSyncService.listenerCount('profileChange')).toBe(0);
      expect(profileSyncService.listenerCount('cacheInvalidated')).toBe(0);
    });
  });
});