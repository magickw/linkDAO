/**
 * Tests for Seller Data Transformers
 * 
 * These tests verify that data transformation utilities correctly convert
 * between different seller data formats while maintaining data integrity.
 */

import {
  transformDisplayListingToUnified,
  transformSellerListingToUnified,
  transformMarketplaceListingToUnified,
  transformSellerProfileToUnified,
  transformDashboardStatsToUnified
} from '../sellerDataTransformers';

import { SellerProfile, SellerListing, SellerDashboardStats } from '../../types/seller';
import { UnifiedSellerProfile, UnifiedSellerListing, UnifiedSellerDashboard } from '../../types/unifiedSeller';

describe('Seller Data Transformers', () => {
  describe('transformDisplayListingToUnified', () => {
    it('should transform DisplayMarketplaceListing to UnifiedSellerListing', () => {
      const displayListing = {
        id: 'test-listing-1',
        title: 'Test Product',
        price: 100,
        currency: 'ETH',
        image: 'https://example.com/image.jpg',
        category: 'electronics',
        status: 'ACTIVE',
        createdAt: new Date('2023-01-01'),
        views: 50,
        likes: 10,
        isEscrowProtected: true,
        sellerWalletAddress: '0x123...',
      };

      const result = transformDisplayListingToUnified(displayListing);

      expect(result.data).toMatchObject({
        id: 'test-listing-1',
        title: 'Test Product',
        price: 100,
        currency: 'ETH',
        category: 'electronics',
        status: 'active',
        views: 50,
        likes: 10,
        isEscrowProtected: true,
        sellerWalletAddress: '0x123...',
      });

      expect(result.warnings).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should handle missing fields with defaults', () => {
      const displayListing = {
        id: 'test-listing-2',
        metadataURI: 'Fallback Title',
        price: '50.5',
        itemType: 'PHYSICAL',
        isEscrowed: true,
      };

      const result = transformDisplayListingToUnified(displayListing);

      expect(result.data).toMatchObject({
        id: 'test-listing-2',
        title: 'Fallback Title',
        price: 50.5,
        currency: 'ETH', // default
        category: 'physical',
        isEscrowProtected: true,
        views: 0, // default
        likes: 0, // default
      });

      expect(result.warnings).toContain('Used metadataURI as title fallback');
      expect(result.warnings).toContain('Mapped itemType to category');
    });
  });

  describe('transformSellerListingToUnified', () => {
    it('should transform SellerListing to UnifiedSellerListing', () => {
      const sellerListing: SellerListing = {
        id: 'seller-listing-1',
        title: 'Seller Product',
        description: 'A great product',
        category: 'books',
        subcategory: 'fiction',
        price: 25,
        currency: 'USDC',
        quantity: 5,
        condition: 'new',
        images: ['image1.jpg', 'image2.jpg'],
        specifications: { author: 'John Doe' },
        tags: ['fiction', 'bestseller'],
        status: 'active',
        saleType: 'fixed',
        escrowEnabled: false,
        shippingOptions: {
          free: true,
          cost: 0,
          estimatedDays: '3-5',
          international: false,
        },
        views: 100,
        favorites: 25,
        questions: 3,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z',
      };

      const result = transformSellerListingToUnified(sellerListing);

      expect(result.data).toMatchObject({
        id: 'seller-listing-1',
        title: 'Seller Product',
        description: 'A great product',
        category: 'books',
        subcategory: 'fiction',
        price: 25,
        currency: 'USDC',
        quantity: 5,
        condition: 'new',
        images: ['image1.jpg', 'image2.jpg'],
        tags: ['fiction', 'bestseller'],
        status: 'active',
        views: 100,
        favorites: 25,
        likes: 25, // mapped from favorites
        questions: 3,
        escrowEnabled: false,
      });

      expect(result.warnings).toContain('Mapped favorites to likes for consistency');
    });
  });

  describe('transformMarketplaceListingToUnified', () => {
    it('should transform MarketplaceListing to UnifiedSellerListing', () => {
      const marketplaceListing = {
        id: 'marketplace-listing-1',
        sellerWalletAddress: '0x456...',
        title: 'Marketplace Product',
        price: '75.25',
        currency: 'DAI',
        quantity: 1,
        itemType: 'DIGITAL',
        listingType: 'FIXED_PRICE',
        status: 'ACTIVE',
        isActive: true,
        isEscrowed: true,
        images: ['digital-image.jpg'],
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z',
      };

      const result = transformMarketplaceListingToUnified(marketplaceListing);

      expect(result.data).toMatchObject({
        id: 'marketplace-listing-1',
        sellerWalletAddress: '0x456...',
        title: 'Marketplace Product',
        price: 75.25,
        currency: 'DAI',
        quantity: 1,
        category: 'digital',
        status: 'active',
        listingType: 'fixed_price',
        saleType: 'digital',
        isEscrowed: true,
        images: ['digital-image.jpg'],
      });
    });

    it('should use metadataURI as title fallback', () => {
      const marketplaceListing = {
        id: 'marketplace-listing-2',
        sellerAddress: '0x789...',
        metadataURI: 'URI Title',
        price: '100',
        isActive: false,
      };

      const result = transformMarketplaceListingToUnified(marketplaceListing);

      expect(result.data.title).toBe('URI Title');
      expect(result.data.status).toBe('draft');
      expect(result.warnings).toContain('Used metadataURI as title fallback');
    });
  });

  describe('transformSellerProfileToUnified', () => {
    it('should transform SellerProfile to UnifiedSellerProfile', () => {
      const sellerProfile: SellerProfile = {
        id: 'seller-1',
        walletAddress: '0xabc...',
        tier: 'verified',
        displayName: 'John Seller',
        storeName: 'John\'s Store',
        bio: 'Experienced seller',
        profilePicture: 'profile.jpg',
        coverImage: 'cover.jpg',
        ensHandle: 'john.eth',
        ensVerified: true,
        email: 'john@example.com',
        emailVerified: true,
        phone: '+1234567890',
        phoneVerified: false,
        kycStatus: 'approved',
        applicationStatus: 'approved',
        applicationDate: '2023-01-01T00:00:00Z',
        socialLinks: {
          twitter: '@john',
          discord: 'john#1234',
        },
        stats: {
          totalSales: 1000,
          activeListings: 5,
          completedOrders: 50,
          averageRating: 4.8,
          totalReviews: 25,
          reputationScore: 95,
          joinDate: '2023-01-01T00:00:00Z',
          lastActive: '2023-12-01T00:00:00Z',
        },
        profileCompleteness: {
          score: 85,
          missingFields: ['location'],
          recommendations: ['Add location'],
          lastCalculated: '2023-12-01T00:00:00Z',
        },
        settings: {
          notifications: {
            orders: true,
            disputes: true,
            daoActivity: false,
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
        onboardingProgress: {
          profileSetup: true,
          verification: true,
          payoutSetup: true,
          firstListing: true,
          completed: true,
          currentStep: 5,
          totalSteps: 5,
        },
        payoutPreferences: {
          defaultCrypto: 'USDC',
          cryptoAddresses: {
            USDC: '0xusdc...',
            ETH: '0xeth...',
          },
          fiatEnabled: false,
        },
        badges: ['verified', 'top-seller'],
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-12-01T00:00:00Z',
      };

      const result = transformSellerProfileToUnified(sellerProfile);

      expect(result.data).toMatchObject({
        id: 'seller-1',
        walletAddress: '0xabc...',
        displayName: 'John Seller',
        storeName: 'John\'s Store',
        bio: 'Experienced seller',
        profileImageUrl: 'profile.jpg',
        coverImageUrl: 'cover.jpg',
        ensHandle: 'john.eth',
        ensVerified: true,
        email: 'john@example.com',
        emailVerified: true,
        phone: '+1234567890',
        phoneVerified: false,
        applicationStatus: 'approved',
        badges: ['verified', 'top-seller'],
      });

      expect(result.data.verificationStatus).toMatchObject({
        email: true,
        phone: false,
        kyc: 'approved',
        identity: true,
      });

      expect(result.data.stats).toMatchObject({
        totalSales: 1000,
        activeListings: 5,
        completedOrders: 50,
        averageRating: 4.8,
        totalReviews: 25,
        reputationScore: 95,
      });
    });
  });

  describe('transformDashboardStatsToUnified', () => {
    it('should transform SellerDashboardStats to UnifiedSellerDashboard', () => {
      const mockProfile: UnifiedSellerProfile = {
        id: 'seller-1',
        walletAddress: '0xabc...',
        tier: {
          id: 'verified',
          name: 'Verified',
          level: 2,
          description: 'Verified seller',
          requirements: [],
          benefits: [],
          limitations: [],
        },
        tierProgress: {
          currentTier: 'verified',
          progress: 75,
          requirements: [],
        },
        reputation: {
          score: 95,
          trend: 'up',
          averageRating: 4.8,
          totalReviews: 25,
          recentReviews: 5,
          badges: [],
          history: [],
        },
        stats: {
          totalSales: 1000,
          totalRevenue: 1000,
          averageOrderValue: 20,
          activeListings: 5,
          totalListings: 10,
          completedOrders: 50,
          totalViews: 500,
          totalFavorites: 100,
          conversionRate: 10,
          averageRating: 4.8,
          totalReviews: 25,
          reputationScore: 95,
          responseTime: 2,
          fulfillmentRate: 98,
          disputeRate: 1,
          joinDate: '2023-01-01T00:00:00Z',
          lastActive: '2023-12-01T00:00:00Z',
          daysActive: 334,
        },
        verificationStatus: {
          email: true,
          phone: false,
          kyc: 'approved',
          identity: true,
        },
        applicationStatus: 'approved',
        applicationDate: '2023-01-01T00:00:00Z',
        socialLinks: {},
        images: {},
        settings: {
          notifications: {
            orders: true,
            disputes: true,
            daoActivity: false,
            tips: true,
            marketing: false,
            system: true,
          },
          privacy: {
            showEmail: false,
            showPhone: false,
            showStats: true,
            showLocation: false,
          },
          escrow: {
            defaultEnabled: true,
            minimumAmount: 100,
            autoRelease: false,
          },
          shipping: {
            defaultFree: false,
            defaultCost: 10,
            defaultDays: '3-5',
            internationalEnabled: false,
          },
        },
        onboardingProgress: {
          profileSetup: true,
          verification: true,
          payoutSetup: true,
          firstListing: true,
          completed: true,
          currentStep: 5,
          totalSteps: 5,
          steps: [],
        },
        payoutPreferences: {
          defaultCrypto: 'USDC',
          cryptoAddresses: {},
          fiatEnabled: false,
          autoWithdraw: false,
          minimumWithdraw: 100,
        },
        badges: [],
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-12-01T00:00:00Z',
        lastActive: '2023-12-01T00:00:00Z',
        joinDate: '2023-01-01T00:00:00Z',
      };

      const mockListings: UnifiedSellerListing[] = [];

      const dashboardStats: SellerDashboardStats = {
        sales: {
          today: 50,
          thisWeek: 200,
          thisMonth: 800,
          total: 1000,
        },
        orders: {
          pending: 2,
          processing: 3,
          shipped: 5,
          delivered: 40,
          disputed: 0,
        },
        listings: {
          active: 5,
          draft: 2,
          sold: 3,
          expired: 0,
        },
        balance: {
          crypto: {
            ETH: 1.5,
            USDC: 500,
          },
          fiatEquivalent: 3000,
          pendingEscrow: 200,
          availableWithdraw: 2800,
        },
        reputation: {
          score: 95,
          trend: 'up',
          recentReviews: 5,
          averageRating: 4.8,
        },
      };

      const result = transformDashboardStatsToUnified(
        dashboardStats,
        mockProfile,
        mockListings
      );

      expect(result.data).toMatchObject({
        profile: mockProfile,
        listings: {
          items: mockListings,
          summary: {
            total: 10, // active + draft + sold + expired
            active: 5,
            draft: 2,
            sold: 3,
            expired: 0,
          },
        },
        financial: {
          balance: {
            crypto: {
              ETH: 1.5,
              USDC: 500,
            },
            fiatEquivalent: 3000,
            pendingEscrow: 200,
            availableWithdraw: 2800,
            totalEarnings: 1000,
          },
        },
      });

      expect(result.data.analytics.overview).toMatchObject({
        totalRevenue: 1000,
        totalOrders: 50, // sum of all order statuses
        averageOrderValue: 20, // totalRevenue / totalOrders
      });
    });
  });

  describe('Error handling', () => {
    it('should handle transformation errors gracefully', () => {
      const invalidData = null;

      expect(() => {
        transformDisplayListingToUnified(invalidData);
      }).toThrow('Failed to transform DisplayMarketplaceListing');
    });

    it('should collect warnings for missing or transformed fields', () => {
      const partialData = {
        id: 'test',
        metadataURI: 'Title from URI',
        itemType: 'SERVICE',
      };

      const result = transformDisplayListingToUnified(partialData);

      expect(result.warnings).toContain('Used metadataURI as title fallback');
      expect(result.warnings).toContain('Mapped itemType to category');
      expect(result.transformedFields).toContain('title');
      expect(result.transformedFields).toContain('category');
    });
  });
});