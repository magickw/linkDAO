import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useSellerState, useSellerProfileState } from '../useSellerState';
import { SellerQueryProvider } from '../../providers/SellerQueryProvider';
import { unifiedSellerAPIClient } from '../../services/unifiedSellerAPIClient';

// Mock the unified seller API client
jest.mock('../../services/unifiedSellerAPIClient');
const mockAPIClient = unifiedSellerAPIClient as jest.Mocked<typeof unifiedSellerAPIClient>;

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  }),
}));

// Test wrapper with React Query provider
const createWrapper = () => {
  const client = new QueryClient({
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

describe('useSellerState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch seller profile data', async () => {
    const mockProfile = {
      id: '1',
      walletAddress: '0x1234567890123456789012345678901234567890',
      displayName: 'Test Seller',
      tier: 'basic' as const,
      ensVerified: false,
      applicationStatus: 'approved' as const,
      applicationDate: '2023-01-01',
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
        joinDate: '2023-01-01',
        lastActive: '2023-01-01',
      },
      badges: [],
      onboardingProgress: {
        profileSetup: true,
        verification: false,
        payoutSetup: false,
        firstListing: false,
        completed: false,
        currentStep: 1,
        totalSteps: 4,
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
          minimumAmount: 0.01,
        },
      },
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
      profileCompleteness: {
        score: 50,
        missingFields: ['bio', 'storeName'],
        recommendations: ['Add bio', 'Add store name'],
        lastCalculated: '2023-01-01',
      },
    };

    mockAPIClient.getProfile.mockResolvedValue(mockProfile);

    const { result } = renderHook(() => useSellerState(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.profileLoading).toBe(false);
    });

    expect(mockAPIClient.getProfile).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890');
  });
});