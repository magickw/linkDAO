import { Request, Response } from 'express';
import { marketplaceListingsService } from '../services/marketplaceListingsService';
import { sellerProfileService } from '../services/sellerProfileService';
import { successResponse, errorResponse, paginatedResponse, notFoundResponse, createPaginationInfo } from '../utils/apiResponse';

export const marketplaceController = {
  /**
   * Get individual product details by ID
   * GET /api/marketplace/listings/:id
   */
  async getListingById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const listing = await marketplaceListingsService.getListingById(id);
      
      if (!listing) {
        notFoundResponse(res, 'Product not found');
        return;
      }

      // Transform data to match frontend expectations
      const transformedListing = {
        id: listing.id,
        title: listing.title,
        description: listing.description,
        price: {
          crypto: listing.price,
          cryptoSymbol: listing.currency || 'ETH',
          fiat: null, // Will be calculated by frontend or price service
          fiatSymbol: 'USD'
        },
        images: listing.images || [],
        seller: {
          id: listing.sellerAddress,
          address: listing.sellerAddress,
          name: null, // Will be populated from seller profile if available
          avatar: null,
          verified: false,
          reputation: 0
        },
        category: listing.category,
        isActive: listing.isActive,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt
      };

      // Try to get seller profile information
      try {
        const sellerProfile = await sellerProfileService.getProfile(listing.sellerAddress);
        if (sellerProfile) {
          transformedListing.seller.name = sellerProfile.displayName || sellerProfile.storeName;
          transformedListing.seller.avatar = sellerProfile.profilePicture;
          transformedListing.seller.verified = sellerProfile.isVerified;
          transformedListing.seller.reputation = sellerProfile.stats?.reputationScore || 0;
        }
      } catch (error) {
        console.warn('Failed to fetch seller profile for listing:', error);
        // Continue without seller profile data
      }

      successResponse(res, transformedListing);
    } catch (error) {
      console.error('Error fetching listing:', error);
      errorResponse(res, 'FETCH_ERROR', 'Failed to fetch product details', 500);
    }
  },

  /**
   * Get product listings with filtering and pagination
   * GET /api/marketplace/listings
   */
  async getListings(req: Request, res: Response): Promise<void> {
    try {
      const { 
        page = 1, 
        limit = 20, 
        category, 
        minPrice, 
        maxPrice, 
        sellerId, 
        search 
      } = req.query;

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;
      
      const filters = {
        limit: limitNum,
        offset,
        category: category as string,
        sellerAddress: sellerId as string,
        priceRange: (minPrice || maxPrice) ? {
          min: minPrice ? String(minPrice) : undefined,
          max: maxPrice ? String(maxPrice) : undefined
        } : undefined
      };

      let result;
      if (search) {
        result = await marketplaceListingsService.searchListings(search as string, filters);
      } else {
        result = await marketplaceListingsService.getListings(filters);
      }

      // Transform listings to match frontend expectations
      const transformedListings = result.listings.map(listing => ({
        id: listing.id,
        title: listing.title,
        description: listing.description,
        price: {
          amount: listing.price,
          currency: listing.currency || 'ETH',
          usdEquivalent: null // Will be calculated by frontend
        },
        images: listing.images || [],
        seller: {
          id: listing.sellerAddress,
          address: listing.sellerAddress,
          name: null, // Could be populated in batch if needed
          reputation: 0
        },
        category: listing.category,
        isActive: listing.isActive,
        createdAt: listing.createdAt
      }));

      const pagination = createPaginationInfo(pageNum, limitNum, result.total);

      paginatedResponse(res, transformedListings, pagination);
    } catch (error) {
      console.error('Error fetching listings:', error);
      errorResponse(res, 'FETCH_ERROR', 'Failed to fetch marketplace listings', 500);
    }
  },

  /**
   * Get seller profile information
   * GET /api/marketplace/sellers/:id
   */
  async getSellerById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const sellerProfile = await sellerProfileService.getProfile(id);
      
      if (!sellerProfile) {
        notFoundResponse(res, 'Seller not found');
        return;
      }

      // Transform seller data to match frontend expectations
      const transformedSeller = {
        id: sellerProfile.walletAddress,
        address: sellerProfile.walletAddress,
        displayName: sellerProfile.displayName,
        storeName: sellerProfile.storeName,
        bio: sellerProfile.bio,
        description: sellerProfile.description || sellerProfile.storeDescription,
        profileImage: sellerProfile.profilePicture,
        coverImage: sellerProfile.coverImageUrl,
        location: sellerProfile.location,
        websiteUrl: sellerProfile.websiteUrl,
        socialLinks: sellerProfile.socialLinks,
        isVerified: sellerProfile.isVerified,
        tier: sellerProfile.tier,
        stats: {
          totalSales: sellerProfile.stats?.totalSales || 0,
          activeListings: sellerProfile.stats?.activeListings || 0,
          completedOrders: sellerProfile.stats?.completedOrders || 0,
          averageRating: sellerProfile.stats?.averageRating || 0,
          totalReviews: sellerProfile.stats?.totalReviews || 0,
          reputationScore: sellerProfile.stats?.reputationScore || 0,
          joinDate: sellerProfile.stats?.joinDate || sellerProfile.createdAt,
          lastActive: sellerProfile.stats?.lastActive || sellerProfile.updatedAt
        },
        onboarding: {
          completed: sellerProfile.onboardingCompleted,
          steps: sellerProfile.onboardingSteps,
          completeness: sellerProfile.profileCompleteness
        },
        createdAt: sellerProfile.createdAt,
        updatedAt: sellerProfile.updatedAt
      };

      successResponse(res, transformedSeller);
    } catch (error) {
      console.error('Error fetching seller profile:', error);
      errorResponse(res, 'FETCH_ERROR', 'Failed to fetch seller profile', 500);
    }
  },

  /**
   * Get seller's products
   * GET /api/marketplace/sellers/:id/listings
   */
  async getSellerListings(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;

      const filters = {
        limit: limitNum,
        offset,
        sellerAddress: id
      };

      const result = await marketplaceListingsService.getListings(filters);

      // Transform listings to match frontend expectations
      const transformedListings = result.listings.map(listing => ({
        id: listing.id,
        title: listing.title,
        description: listing.description,
        price: {
          amount: listing.price,
          currency: listing.currency || 'ETH',
          usdEquivalent: null
        },
        images: listing.images || [],
        category: listing.category,
        isActive: listing.isActive,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt
      }));

      const pagination = createPaginationInfo(pageNum, limitNum, result.total);

      paginatedResponse(res, transformedListings, pagination);
    } catch (error) {
      console.error('Error fetching seller listings:', error);
      errorResponse(res, 'FETCH_ERROR', 'Failed to fetch seller listings', 500);
    }
  },

  /**
   * Search products and sellers
   * GET /api/marketplace/search
   */
  async searchMarketplace(req: Request, res: Response): Promise<void> {
    try {
      const { 
        q: searchTerm, 
        type = 'all', 
        page = 1, 
        limit = 20, 
        category, 
        minPrice, 
        maxPrice 
      } = req.query;

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;

      const searchResults: any = {
        query: searchTerm,
        type,
        results: {
          products: [],
          sellers: []
        },
        pagination: {
          products: null,
          sellers: null
        }
      };

      // Search products if type is 'products' or 'all'
      if (type === 'products' || type === 'all') {
        try {
          const filters = {
            limit: limitNum,
            offset,
            category: category as string,
            priceRange: (minPrice || maxPrice) ? {
              min: minPrice ? String(minPrice) : undefined,
              max: maxPrice ? String(maxPrice) : undefined
            } : undefined
          };

          const productResults = await marketplaceListingsService.searchListings(searchTerm as string, filters);
          
          searchResults.results.products = productResults.listings.map(listing => ({
            id: listing.id,
            title: listing.title,
            description: listing.description,
            price: {
              amount: listing.price,
              currency: listing.currency || 'ETH'
            },
            images: listing.images || [],
            seller: {
              id: listing.sellerAddress,
              address: listing.sellerAddress
            },
            category: listing.category,
            createdAt: listing.createdAt
          }));

          searchResults.pagination.products = createPaginationInfo(pageNum, limitNum, productResults.total);
        } catch (error) {
          console.warn('Product search failed:', error);
          searchResults.results.products = [];
          searchResults.pagination.products = createPaginationInfo(pageNum, limitNum, 0);
        }
      }

      // Search sellers if type is 'sellers' or 'all'
      if (type === 'sellers' || type === 'all') {
        // For now, return empty sellers array since we don't have seller search implemented
        // This can be enhanced later with seller search functionality
        searchResults.results.sellers = [];
        searchResults.pagination.sellers = createPaginationInfo(pageNum, limitNum, 0);
      }

      successResponse(res, searchResults);
    } catch (error) {
      console.error('Error searching marketplace:', error);
      errorResponse(res, 'SEARCH_ERROR', 'Failed to search marketplace', 500);
    }
  }
};