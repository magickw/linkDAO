import { unifiedSellerAPIClient, SellerAPIError, SellerErrorType } from '../unifiedSellerAPIClient';

// Mock fetch globally
global.fetch = jest.fn();

describe('UnifiedSellerAPIClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API Endpoint Standardization', () => {
    it('should use standardized endpoint pattern for profile operations', async () => {
      const mockProfile = { walletAddress: '0x123', displayName: 'Test Seller' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockProfile }),
      });

      await unifiedSellerAPIClient.getProfile('0x123');

      expect(fetch).toHaveBeenCalledWith(
        '/api/marketplace/seller/0x123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }),
        })
      );
    });

    it('should use standardized endpoint pattern for onboarding operations', async () => {
      const mockSteps = [{ id: 'step1', title: 'Step 1', completed: false }];
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockSteps }),
      });

      await unifiedSellerAPIClient.getOnboardingSteps('0x123');

      expect(fetch).toHaveBeenCalledWith(
        '/api/marketplace/seller/onboarding/0x123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }),
        })
      );
    });

    it('should use standardized endpoint pattern for dashboard operations', async () => {
      const mockStats = { sales: { total: 100 } };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockStats }),
      });

      await unifiedSellerAPIClient.getDashboardStats('0x123');

      expect(fetch).toHaveBeenCalledWith(
        '/api/marketplace/seller/dashboard/0x123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }),
        })
      );
    });

    it('should use standardized endpoint pattern for listings operations', async () => {
      const mockListings = [{ id: '1', title: 'Test Listing' }];
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockListings }),
      });

      await unifiedSellerAPIClient.getListings('0x123');

      expect(fetch).toHaveBeenCalledWith(
        '/api/marketplace/seller/listings/0x123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors gracefully for profile requests', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      const result = await unifiedSellerAPIClient.getProfile('0x123');
      expect(result).toBeNull();
    });

    it('should throw SellerAPIError for other HTTP errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server Error',
      });

      await expect(unifiedSellerAPIClient.getDashboardStats('0x123')).rejects.toThrow(SellerAPIError);
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Network error'));

      await expect(unifiedSellerAPIClient.getProfile('0x123')).rejects.toThrow(SellerAPIError);
    });

    it('should handle backend error responses', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, message: 'Backend error' }),
      });

      await expect(unifiedSellerAPIClient.getDashboardStats('0x123')).rejects.toThrow(SellerAPIError);
    });
  });

  describe('Request Methods', () => {
    it('should handle POST requests correctly', async () => {
      const mockProfile = { walletAddress: '0x123', displayName: 'New Seller' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockProfile }),
      });

      const profileData = { displayName: 'New Seller' };
      await unifiedSellerAPIClient.createProfile(profileData);

      expect(fetch).toHaveBeenCalledWith(
        '/api/marketplace/seller/profile',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(profileData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }),
        })
      );
    });

    it('should handle PUT requests correctly', async () => {
      const mockProfile = { walletAddress: '0x123', displayName: 'Updated Seller' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockProfile }),
      });

      const updates = { displayName: 'Updated Seller' };
      await unifiedSellerAPIClient.updateProfile('0x123', updates);

      expect(fetch).toHaveBeenCalledWith(
        '/api/marketplace/seller/0x123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }),
        })
      );
    });

    it('should handle FormData requests correctly', async () => {
      const mockResponse = { profile: { displayName: 'Updated' } };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const updates = { displayName: 'Updated', profileImage: file };
      
      await unifiedSellerAPIClient.updateProfileEnhanced('0x123', updates);

      expect(fetch).toHaveBeenCalledWith(
        '/api/marketplace/seller/0x123/enhanced',
        expect.objectContaining({
          method: 'PUT',
          body: expect.any(FormData),
          headers: expect.objectContaining({
            'Accept': 'application/json',
          }),
        })
      );
    });
  });

  describe('Response Handling', () => {
    it('should handle successful responses with data', async () => {
      const mockProfile = { walletAddress: '0x123', displayName: 'Test Seller' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockProfile }),
      });

      const result = await unifiedSellerAPIClient.getProfile('0x123');
      expect(result).toEqual(mockProfile);
    });

    it('should handle successful responses without success flag', async () => {
      const mockProfile = { walletAddress: '0x123', displayName: 'Test Seller' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      });

      const result = await unifiedSellerAPIClient.getProfile('0x123');
      expect(result).toEqual(mockProfile);
    });
  });
});