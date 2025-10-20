import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useSellerProfile, useSellerDashboard } from '../useSellerCache';
import { SellerQueryProvider } from '../../providers/SellerQueryProvider';
import { unifiedSellerAPIClient } from '../../services/unifiedSellerAPIClient';

// Mock the unified seller API client
jest.mock('../../services/unifiedSellerAPIClient', () => ({
  unifiedSellerAPIClient: {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    getDashboardStats: jest.fn(),
  },
}));

const mockAPIClient = unifiedSellerAPIClient as jest.Mocked<typeof unifiedSellerAPIClient>;

// Test wrapper component
const createWrapper = (queryClient?: QueryClient) => {
  const client = queryClient || new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <SellerQueryProvider queryClient={client}>
      {children}
    </SellerQueryProvider>
  );
};

describe('useSellerCache hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useSellerProfile', () => {
    it('should fetch seller profile data', async () => {
      const mockProfile = {
        id: '1',
        walletAddress: '0x1234567890123456789012345678901234567890',
        displayName: 'Test Seller',
        tier: 'basic' as const,
        ensVerified: false,
        profileCompleteness: {
          score: 75,
          missingFields: [],
          recommendations: [],
          lastCalculated: new Date().toISOString(),
        },
        applicationStatus: 'approved' as const,
        applicationDate: new Date().toISOString(),
        emailVerified: false,
        phoneVerified: false,
        kycStatus: 'none' as const,
        payoutPreferences: {
          defaultCrypto: 'USDC',
          cryptoAddresses: {},
          fiatEnabled: false,
        },
        stats: {
          totalSales: 0,
          activeListings: 0,
          completedOrders: 0,
          averageRating: 0,
          totalReviews: 0,
          reputationScore: 0,
          joinDate: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        },
        badges: [],
        onboardingProgress: {
          profileSetup: true,
          verification: false,
          payoutSetup: false,
          firstListing: false,
          completed: false,
          currentStep: 1,
          totalSteps: 5,
        },
        settings: {
          notifications: {
            orders: true,
            disputes: true,
            daoActivity: true,
            tips: true,
            marketing: false,
          },
          privacy: {
            showEmail: false,
            showPhone: false,
            showStats: true,
          },
          escrow: {
            defaultEnabled: true,
            minimumAmount: 100,
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockAPIClient.getProfile.mockResolvedValue(mockProfile);

      const { result } = renderHook(
        () => useSellerProfile('0x1234567890123456789012345678901234567890'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProfile);
      expect(mockAPIClient.getProfile).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
    });

    it('should handle profile updates with optimistic updates', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const initialProfile = {
        id: '1',
        walletAddress,
        displayName: 'Original Name',
        tier: 'basic' as const,
        ensVerified: false,
        profileCompleteness: {
          score: 50,
          missingFields: [],
          recommendations: [],
          lastCalculated: new Date().toISOString(),
        },
        applicationStatus: 'approved' as const,
        applicationDate: new Date().toISOString(),
        emailVerified: false,
        phoneVerified: false,
        kycStatus: 'none' as const,
        payoutPreferences: {
          defaultCrypto: 'USDC',
          cryptoAddresses: {},
          fiatEnabled: false,
        },
        stats: {
          totalSales: 0,
          activeListings: 0,
          completedOrders: 0,
          averageRating: 0,
          totalReviews: 0,
          reputationScore: 0,
          joinDate: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        },
        badges: [],
        onboardingProgress: {
          profileSetup: true,
          verification: false,
          payoutSetup: false,
          firstListing: false,
          completed: false,
          currentStep: 1,
          totalSteps: 5,
        },
        settings: {
          notifications: {
            orders: true,
            disputes: true,
            daoActivity: true,
            tips: true,
            marketing: false,
          },
          privacy: {
            showEmail: false,
            showPhone: false,
            showStats: true,
          },
          escrow: {
            defaultEnabled: true,
            minimumAmount: 100,
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedProfile = {
        ...initialProfile,
        displayName: 'Updated Name',
        updatedAt: new Date().toISOString(),
      };

      mockAPIClient.getProfile.mockResolvedValue(initialProfile);
      mockAPIClient.updateProfile.mockResolvedValue(updatedProfile);

      const { result } = renderHook(
        () => useSellerProfile(walletAddress),
        { wrapper: createWrapper() }
      );

      // Wait for initial data to load
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.displayName).toBe('Original Name');

      // Perform update
      await result.current.updateProfile.mutateAsync({
        displayName: 'Updated Name',
      });

      // Verify update was called
      expect(mockAPIClient.updateProfile).toHaveBeenCalledWith(walletAddress, {
        displayName: 'Updated Name',
      });
    });

    it('should return null for non-existent profile', async () => {
      mockAPIClient.getProfile.mockResolvedValue(null);

      const { result } = renderHook(
        () => useSellerProfile('0x1234567890123456789012345678901234567890'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('useSellerDashboard', () => {
    it('should fetch dashboard stats', async () => {
      const mockDashboard = {
        sales: {
          today: 100,
          thisWeek: 500,
          thisMonth: 2000,
          total: 10000,
        },
        orders: {
          pending: 2,
          processing: 1,
          shipped: 3,
          delivered: 10,
          disputed: 0,
        },
        listings: {
          active: 5,
          draft: 2,
          sold: 8,
          expired: 1,
        },
        balance: {
          crypto: { USDC: 1000, ETH: 0.5 },
          fiatEquivalent: 1500,
          pendingEscrow: 200,
          availableWithdraw: 1300,
        },
        reputation: {
          score: 85,
          trend: 'up' as const,
          recentReviews: 5,
          averageRating: 4.5,
        },
      };

      mockAPIClient.getDashboardStats.mockResolvedValue(mockDashboard);

      const { result } = renderHook(
        () => useSellerDashboard('0x1234567890123456789012345678901234567890'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockDashboard);
      expect(mockAPIClient.getDashboardStats).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
    });

    it('should not fetch when wallet address is undefined', () => {
      const { result } = renderHook(
        () => useSellerDashboard(undefined),
        { wrapper: createWrapper() }
      );

      expect(result.current.isPending).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockAPIClient.getDashboardStats).not.toHaveBeenCalled();
    });
  });

  describe('Cache validation', () => {
    it('should report cache validity correctly', async () => {
      const mockProfile = {
        id: '1',
        walletAddress: '0x1234567890123456789012345678901234567890',
        displayName: 'Test Seller',
        tier: 'basic' as const,
        ensVerified: false,
        profileCompleteness: {
          score: 75,
          missingFields: [],
          recommendations: [],
          lastCalculated: new Date().toISOString(),
        },
        applicationStatus: 'approved' as const,
        applicationDate: new Date().toISOString(),
        emailVerified: false,
        phoneVerified: false,
        kycStatus: 'none' as const,
        payoutPreferences: {
          defaultCrypto: 'USDC',
          cryptoAddresses: {},
          fiatEnabled: false,
        },
        stats: {
          totalSales: 0,
          activeListings: 0,
          completedOrders: 0,
          averageRating: 0,
          totalReviews: 0,
          reputationScore: 0,
          joinDate: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        },
        badges: [],
        onboardingProgress: {
          profileSetup: true,
          verification: false,
          payoutSetup: false,
          firstListing: false,
          completed: false,
          currentStep: 1,
          totalSteps: 5,
        },
        settings: {
          notifications: {
            orders: true,
            disputes: true,
            daoActivity: true,
            tips: true,
            marketing: false,
          },
          privacy: {
            showEmail: false,
            showPhone: false,
            showStats: true,
          },
          escrow: {
            defaultEnabled: true,
            minimumAmount: 100,
          },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockAPIClient.getProfile.mockResolvedValue(mockProfile);

      const { result } = renderHook(
        () => useSellerProfile('0x1234567890123456789012345678901234567890'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Cache should be valid for fresh data
      expect(result.current.isCacheValid).toBe(true);
    });
  });
});