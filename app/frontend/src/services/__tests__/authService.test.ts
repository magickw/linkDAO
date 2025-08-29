import { authService } from '../authService';

// Mock wagmi
jest.mock('@wagmi/core', () => ({
  signMessage: jest.fn().mockResolvedValue('0xmocksignature')
}));

// Mock fetch
global.fetch = jest.fn();

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Reset authService token
    (authService as any).token = null;
  });

  describe('getNonce', () => {
    it('should fetch nonce for address', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const mockResponse = {
        success: true,
        nonce: 'test-nonce-123',
        message: 'Sign this message to authenticate'
      };

      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(mockResponse)
      });

      const result = await authService.getNonce(address);

      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:3001/api/auth/nonce/${address}`
      );
      expect(result.nonce).toBe(mockResponse.nonce);
      expect(result.message).toBe(mockResponse.message);
    });

    it('should throw error on failed nonce request', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const mockResponse = {
        success: false,
        error: 'Failed to generate nonce'
      };

      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(mockResponse)
      });

      await expect(authService.getNonce(address)).rejects.toThrow('Failed to generate nonce');
    });
  });

  describe('authenticateWallet', () => {
    it('should authenticate wallet successfully', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      
      // Mock getNonce
      const mockNonceResponse = {
        nonce: 'test-nonce-123',
        message: 'Sign this message to authenticate'
      };
      
      // Mock authentication response
      const mockAuthResponse = {
        success: true,
        token: 'jwt-token-123',
        user: {
          id: 'user-123',
          address,
          handle: 'testuser',
          kycStatus: 'none'
        }
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, ...mockNonceResponse })
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockAuthResponse)
        });

      const result = await authService.authenticateWallet(address);

      expect(result.success).toBe(true);
      expect(result.token).toBe(mockAuthResponse.token);
      expect(result.user?.address).toBe(address);
      expect(authService.getToken()).toBe(mockAuthResponse.token);
    });

    it('should handle authentication failure', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      
      const mockNonceResponse = {
        nonce: 'test-nonce-123',
        message: 'Sign this message to authenticate'
      };
      
      const mockAuthResponse = {
        success: false,
        error: 'Invalid signature'
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: true, ...mockNonceResponse })
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve(mockAuthResponse)
        });

      const result = await authService.authenticateWallet(address);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid signature');
      expect(authService.getToken()).toBeNull();
    });
  });

  describe('register', () => {
    it('should register user successfully', async () => {
      const userData = {
        address: '0x1234567890123456789012345678901234567890',
        handle: 'testuser',
        email: 'test@example.com'
      };

      const mockResponse = {
        success: true,
        token: 'jwt-token-123',
        user: {
          id: 'user-123',
          ...userData,
          kycStatus: 'none'
        }
      };

      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(mockResponse)
      });

      const result = await authService.register(userData);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/register',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        })
      );
      expect(result.success).toBe(true);
      expect(authService.getToken()).toBe(mockResponse.token);
    });

    it('should handle registration failure', async () => {
      const userData = {
        address: '0x1234567890123456789012345678901234567890',
        handle: 'testuser'
      };

      const mockResponse = {
        success: false,
        error: 'Handle already taken'
      };

      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(mockResponse)
      });

      const result = await authService.register(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Handle already taken');
      expect(authService.getToken()).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        address: '0x1234567890123456789012345678901234567890',
        handle: 'testuser',
        kycStatus: 'basic'
      };

      const mockResponse = {
        success: true,
        user: mockUser
      };

      // Set token
      (authService as any).token = 'jwt-token-123';

      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(mockResponse)
      });

      const result = await authService.getCurrentUser();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/me',
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer jwt-token-123' }
        })
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when not authenticated', async () => {
      const result = await authService.getCurrentUser();
      expect(result).toBeNull();
    });

    it('should clear token on 401 response', async () => {
      (authService as any).token = 'invalid-token';

      (fetch as jest.Mock).mockResolvedValue({
        status: 401,
        json: () => Promise.resolve({ success: false, error: 'Unauthorized' })
      });

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
      expect(authService.getToken()).toBeNull();
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences', async () => {
      const preferences = {
        notifications: { email: true, push: false }
      };

      const mockResponse = {
        success: true,
        preferences
      };

      (authService as any).token = 'jwt-token-123';

      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(mockResponse)
      });

      const result = await authService.updatePreferences(preferences);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/preferences',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer jwt-token-123'
          },
          body: JSON.stringify({ preferences })
        })
      );
      expect(result.success).toBe(true);
    });

    it('should return error when not authenticated', async () => {
      const preferences = { notifications: { email: true } };

      const result = await authService.updatePreferences(preferences);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });
  });

  describe('initiateKYC', () => {
    it('should initiate KYC verification', async () => {
      const tier = 'basic';
      const mockResponse = {
        success: true,
        kycId: 'kyc-123',
        status: 'pending'
      };

      (authService as any).token = 'jwt-token-123';

      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(mockResponse)
      });

      const result = await authService.initiateKYC(tier);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/kyc/initiate',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer jwt-token-123'
          },
          body: JSON.stringify({ tier, documents: undefined })
        })
      );
      expect(result.success).toBe(true);
      expect(result.kycId).toBe('kyc-123');
    });
  });

  describe('getKYCStatus', () => {
    it('should return KYC status', async () => {
      const mockKYCStatus = {
        success: true,
        status: 'approved',
        tier: 'basic',
        submittedAt: '2023-01-01T00:00:00.000Z'
      };

      (authService as any).token = 'jwt-token-123';

      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(mockKYCStatus)
      });

      const result = await authService.getKYCStatus();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/kyc/status',
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer jwt-token-123' }
        })
      );
      expect(result?.status).toBe('approved');
      expect(result?.tier).toBe('basic');
    });

    it('should return null when not authenticated', async () => {
      const result = await authService.getKYCStatus();
      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('should logout and clear token', async () => {
      (authService as any).token = 'jwt-token-123';

      (fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({ success: true })
      });

      await authService.logout();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/auth/logout',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Authorization': 'Bearer jwt-token-123' }
        })
      );
      expect(authService.getToken()).toBeNull();
    });

    it('should clear token even if logout request fails', async () => {
      (authService as any).token = 'jwt-token-123';

      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await authService.logout();

      expect(authService.getToken()).toBeNull();
    });
  });

  describe('token management', () => {
    it('should persist token to localStorage', () => {
      const token = 'jwt-token-123';
      (authService as any).setToken(token);

      expect(localStorage.getItem('auth_token')).toBe(token);
      expect(authService.getToken()).toBe(token);
    });

    it('should load token from localStorage on initialization', () => {
      const token = 'jwt-token-123';
      localStorage.setItem('auth_token', token);

      // Create new instance to test initialization
      const newAuthService = new (authService.constructor as any)();
      expect(newAuthService.getToken()).toBe(token);
    });

    it('should check authentication status', () => {
      expect(authService.isAuthenticated()).toBe(false);

      (authService as any).token = 'jwt-token-123';
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should provide auth headers', () => {
      const headers = authService.getAuthHeaders();
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBeUndefined();

      (authService as any).token = 'jwt-token-123';
      const authHeaders = authService.getAuthHeaders();
      expect(authHeaders['Authorization']).toBe('Bearer jwt-token-123');
    });
  });
});