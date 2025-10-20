import { unifiedSellerAPIClient } from '../../../../services/unifiedSellerAPIClient';
import { sellerService } from '../../../../services/sellerService';

// Mock fetch globally
global.fetch = jest.fn();

describe('Seller API Integration with Unified Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API Endpoint Standardization', () => {
    it('should use standardized endpoints for all seller operations', async () => {
      // Mock successful responses
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { walletAddress: '0x123', displayName: 'Test' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [{ id: 'step1', title: 'Step 1' }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { sales: { total: 100 } } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        });

      // Test all major seller operations use unified API client
      await unifiedSellerAPIClient.getProfile('0x123');
      await unifiedSellerAPIClient.getOnboardingSteps('0x123');
      await unifiedSellerAPIClient.getDashboardStats('0x123');
      await unifiedSellerAPIClient.getNotifications('0x123');
      await unifiedSellerAPIClient.getListings('0x123');

      // Verify all calls use the standardized base pattern
      expect(fetch).toHaveBeenCalledWith('/api/marketplace/seller/0x123', expect.any(Object));
      expect(fetch).toHaveBeenCalledWith('/api/marketplace/seller/onboarding/0x123', expect.any(Object));
      expect(fetch).toHaveBeenCalledWith('/api/marketplace/seller/dashboard/0x123', expect.any(Object));
      expect(fetch).toHaveBeenCalledWith('/api/marketplace/seller/notifications/0x123', expect.any(Object));
      expect(fetch).toHaveBeenCalledWith('/api/marketplace/seller/listings/0x123', expect.any(Object));
    });

    it('should use consistent headers across all requests', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });

      await unifiedSellerAPIClient.getProfile('0x123');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }),
        })
      );
    });
  });

  describe('Seller Service Integration', () => {
    it('should use unified API client for profile operations', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { walletAddress: '0x123', displayName: 'Test' } }),
      });

      const profile = await sellerService.getSellerProfile('0x123');

      expect(profile).toBeTruthy();
      expect(fetch).toHaveBeenCalledWith('/api/marketplace/seller/0x123', expect.any(Object));
    });

    it('should use unified API client for onboarding operations', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [{ id: 'step1', title: 'Step 1' }] }),
      });

      const steps = await sellerService.getOnboardingSteps('0x123');

      expect(steps).toBeTruthy();
      expect(Array.isArray(steps)).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/api/marketplace/seller/onboarding/0x123', expect.any(Object));
    });

    it('should use unified API client for dashboard operations', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { sales: { total: 100 } } }),
      });

      const stats = await sellerService.getDashboardStats('0x123');

      expect(stats).toBeTruthy();
      expect(fetch).toHaveBeenCalledWith('/api/marketplace/seller/dashboard/0x123', expect.any(Object));
    });

    it('should use unified API client for listings operations', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      const listings = await sellerService.getListings('0x123');

      expect(Array.isArray(listings)).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/api/marketplace/seller/listings/0x123', expect.any(Object));
    });
  });

  describe('Error Handling Consistency', () => {
    it('should handle 404 errors consistently across all operations', async () => {
      // Clear cache to ensure fresh requests
      sellerService.clearProfileCache();
      
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      // Profile operations should return null for 404
      const profile = await sellerService.getSellerProfile('0x404');
      expect(profile).toBeNull();

      // Other operations should return default values or empty arrays
      const steps = await sellerService.getOnboardingSteps('0x404');
      expect(Array.isArray(steps)).toBe(true);

      const stats = await sellerService.getDashboardStats('0x404');
      expect(stats).toBeTruthy();

      const notifications = await sellerService.getNotifications('0x404');
      expect(Array.isArray(notifications)).toBe(true);

      const listings = await sellerService.getListings('0x404');
      expect(Array.isArray(listings)).toBe(true);
    });

    it('should handle network errors consistently', async () => {
      // Clear cache to ensure fresh requests
      sellerService.clearProfileCache();
      
      (fetch as jest.Mock).mockRejectedValue(new TypeError('Network error'));

      // All operations should handle network errors gracefully
      const profile = await sellerService.getSellerProfile('0xnetwork');
      expect(profile).toBeNull();

      const steps = await sellerService.getOnboardingSteps('0xnetwork');
      expect(Array.isArray(steps)).toBe(true);

      const stats = await sellerService.getDashboardStats('0xnetwork');
      expect(stats).toBeTruthy();

      const notifications = await sellerService.getNotifications('0xnetwork');
      expect(Array.isArray(notifications)).toBe(true);

      const listings = await sellerService.getListings('0xnetwork');
      expect(Array.isArray(listings)).toBe(true);
    });
  });
});