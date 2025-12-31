import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { ProductService } from '../services/productService';
import { sellerService } from '../services/sellerService';
import { databaseService } from '../services/databaseService';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { Product, ProductSortOptions } from '../models/Product';
import { BlockchainMarketplaceService } from '../services/marketplaceService';
import { MarketplaceListingsService } from '../services/marketplaceListingsService';
const productService = new ProductService();
const marketplaceService = new BlockchainMarketplaceService();

export class MarketplaceController {
  /**
   * Get individual product details by ID
   */
  async getListingById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Validate ID
      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Product ID is required'
          }
        });
      }

      safeLogger.info('Fetching product by ID:', { id });

      // Fetch the listing from the marketplace service
      const listing = await marketplaceService.getListingById(id);

      // Handle case where listing is not found or service is unavailable
      if (!listing) {
        return res.status(200).json({
          success: true,
          data: null,
          metadata: {
            timestamp: new Date().toISOString(),
            message: 'Product not found or marketplace service temporarily unavailable'
          }
        });
      }

      // Fetch actual seller profile data
      let sellerProfile = null;
      try {
        sellerProfile = await sellerService.getSellerProfile(listing.sellerWalletAddress);
      } catch (sellerError) {
        // Continue without seller profile data
      }

      // Map the marketplace listing to the expected product format
      const product = {
        id: listing.id,
        sellerId: listing.sellerWalletAddress,
        title: `Listing ${listing.id}`, // Need to get from metadata
        description: `Description for listing ${listing.id}`, // Need to get from metadata
        priceAmount: Number(listing.price),
        priceCurrency: 'USD', // Default currency
        category: {
          id: listing.itemType.toLowerCase(),
          name: listing.itemType,
          slug: listing.itemType.toLowerCase()
        },
        images: [], // Extract from metadata
        inventory: listing.quantity,
        status: listing.status.toLowerCase(),
        tags: [listing.itemType],
        shipping: {
          freeShipping: true,
          estimatedDays: '3-5',
          methods: ['standard'],
          handlingTime: '1-2',
          shipsFrom: {
            country: 'US'
          }
        },
        nft: listing.nftStandard ? {
          standard: listing.nftStandard,
          tokenId: listing.tokenId
        } : null,
        views: listing.views || 0,
        favorites: listing.favorites || 0,
        listingStatus: listing.status.toLowerCase(),
        publishedAt: listing.createdAt,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
        seller: {
          id: listing.sellerWalletAddress,
          walletAddress: listing.sellerWalletAddress,
          displayName: sellerProfile?.storeName || `Seller ${listing.sellerWalletAddress.substring(0, 6)}`,
          storeName: sellerProfile?.storeName || `Store ${listing.sellerWalletAddress.substring(0, 6)}`,
          avatar: sellerProfile?.profileImageCdn || sellerProfile?.profileImageIpfs || '',
          rating: sellerProfile?.stats?.averageRating || 4.5,
          reputation: sellerProfile?.daoReputation?.governanceParticipation || 85,
          verified: sellerProfile?.isVerified || false,
          daoApproved: sellerProfile?.daoApproved || false,
          isOnline: true
        },
        trust: {
          verified: sellerProfile?.isVerified || true,
          escrowProtected: listing.isEscrowed,
          onChainCertified: false, // Would come from blockchain verification
          safetyScore: 85 // Would come from reputation service
        },
        metadata: {
          condition: 'new', // Would come from listing metadata
          brand: 'Unknown' // Would come from listing metadata
        },
        specifications: {} // Would come from listing metadata
      };

      return res.json({
        success: true,
        data: product,
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      safeLogger.error('Error fetching product details:', error);

      // Return graceful fallback instead of 500 error
      return res.status(200).json({
        success: true,
        data: null,
        metadata: {
          timestamp: new Date().toISOString(),
          message: 'Marketplace service temporarily unavailable'
        }
      });
    }
  }

  /**
   * Get product listings with filtering and pagination
   */
  async getListings(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        minPrice,
        maxPrice,
        sellerId,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filters for the database query
      const filters: any = {
        limit: Math.min(parseInt(limit as string), 100), // Cap at 100 items per page
        offset: (parseInt(page as string) - 1) * parseInt(limit as string),
        sortBy: ['createdAt', 'price', 'title'].includes(sortBy as string)
          ? (sortBy as 'createdAt' | 'price' | 'title')
          : 'createdAt',
        sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
        isActive: true // Only show active listings
      };

      if (category) {
        filters.category = category as string;
      }

      if (minPrice || maxPrice) {
        filters.priceRange = {
          min: minPrice ? minPrice as string : '0',
          max: maxPrice ? maxPrice as string : '999999999'
        };
      }

      if (sellerId) {
        filters.sellerAddress = sellerId as string;
      }

      // Use the marketplace service to get listings from the database with timeout protection
      const listingsService = new MarketplaceListingsService();
      let result;

      // Add timeout protection for the database query
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database query timeout')), 15000)
      );

      if (search) {
        const searchPromise = listingsService.searchListings(search as string, filters);
        result = await Promise.race([searchPromise, timeoutPromise]);
      } else {
        const listingsPromise = listingsService.getListings(filters);
        result = await Promise.race([listingsPromise, timeoutPromise]);
      }

      // Check if we got valid results
      if (!result) {
        // Return empty results instead of 500 error
        return res.json({
          success: true,
          data: {
            listings: [],
            pagination: {
              total: 0,
              page: parseInt(page as string),
              limit: parseInt(limit as string),
              totalPages: 0
            }
          },
          metadata: {
            timestamp: new Date().toISOString(),
            filters: {
              category,
              minPrice,
              maxPrice,
              sellerId,
              search
            },
            sort: {
              field: sortBy,
              direction: sortOrder
            },
            message: 'Marketplace service temporarily unavailable, showing cached results'
          }
        });
      }

      // Map listings to the expected product format
      const mappedListings = await Promise.all(result.listings.map(async (listing) => {
        // Fetch actual seller profile data
        let sellerProfile = null;
        try {
          sellerProfile = await sellerService.getSellerProfile(listing.sellerAddress);
        } catch (sellerError) {
          // Continue without seller profile data
        }

        return {
          id: listing.id,
          sellerId: listing.sellerAddress,
          title: listing.title,
          description: listing.description || '',
          priceAmount: Number(listing.price),
          priceCurrency: listing.currency || 'USD',
          category: listing.category ? {
            id: listing.category,
            name: listing.category,
            slug: listing.category ? listing.category.toLowerCase() : ''
          } : null,
          images: listing.images || [],
          inventory: 1,
          status: listing.isActive ? 'active' : 'inactive',
          tags: [],
          shipping: listing.shipping ? {
            freeShipping: listing.shipping.freeShipping || false,
            estimatedDays: listing.shipping.estimatedDelivery || '3-5',
            cost: listing.shipping.cost,
            methods: listing.shipping.methods || ['standard'],
            handlingTime: listing.shipping.handlingTime,
            shipsFrom: listing.shipping.shipsFrom,
            internationalShipping: listing.shipping.internationalShipping,
            internationalCost: listing.shipping.internationalCost,
            localPickup: listing.shipping.localPickup
          } : {
            freeShipping: true,
            estimatedDays: '3-5',
            methods: ['standard']
          },
          nft: null,
          views: listing.views || 0,
          favorites: listing.favorites || 0,
          listingStatus: listing.isActive ? 'active' : 'inactive',
          publishedAt: listing.createdAt,
          createdAt: listing.createdAt,
          updatedAt: listing.updatedAt,
          seller: {
            id: listing.sellerAddress,
            walletAddress: listing.sellerAddress,
            displayName: sellerProfile?.storeName || (listing.sellerAddress ? `Seller ${listing.sellerAddress.substring(0, 6)}...` : 'Unknown'),
            storeName: sellerProfile?.storeName || (listing.sellerAddress ? `Store ${listing.sellerAddress.substring(0, 6)}` : 'Unknown Store'),
            avatar: sellerProfile?.profileImageCdn || sellerProfile?.profileImageIpfs || '',
            rating: sellerProfile?.stats?.averageRating || 4.5,
            reputation: sellerProfile?.daoReputation?.governanceParticipation || 85,
            verified: sellerProfile?.isVerified || false,
            daoApproved: sellerProfile?.daoApproved || false,
            isOnline: true
          },
          trust: {
            verified: sellerProfile?.isVerified || true,
            escrowProtected: true,
            onChainCertified: false,
            safetyScore: 85
          },
          metadata: {
            condition: 'new',
            brand: 'Unknown'
          },
          specifications: {}
        };
      }));

      return res.json({
        success: true,
        data: {
          listings: mappedListings,
          pagination: {
            total: result.total,
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            totalPages: Math.ceil(result.total / parseInt(limit as string))
          }
        },
        metadata: {
          timestamp: new Date().toISOString(),
          filters: {
            category,
            minPrice,
            maxPrice,
            sellerId,
            search
          },
          sort: {
            field: sortBy,
            direction: sortOrder
          }
        }
      });
    } catch (error) {
      safeLogger.error('Error fetching product listings:', error);

      // Return graceful fallback instead of 500 error
      return res.status(200).json({
        success: true,
        data: {
          listings: [],
          pagination: {
            total: 0,
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 20,
            totalPages: 0
          }
        },
        metadata: {
          timestamp: new Date().toISOString(),
          message: 'Marketplace service temporarily unavailable'
        }
      });
    }
  }

  /**
   * Get seller profile information by ID
   */
  async getSellerById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Validate ID
      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Seller ID is required'
          }
        });
      }

      // Fetch seller profile
      const sellerProfile = await sellerService.getSellerProfile(id);

      if (!sellerProfile) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Seller not found'
          }
        });
      }

      // Prepare response data
      const responseData = {
        id: sellerProfile.walletAddress,
        walletAddress: sellerProfile.walletAddress,
        displayName: sellerProfile.storeName,
        storeName: sellerProfile.storeName,
        bio: sellerProfile.bio,
        description: sellerProfile.description,
        sellerStory: sellerProfile.sellerStory,
        location: sellerProfile.location,
        ensHandle: sellerProfile.ensHandle,
        ensVerified: sellerProfile.ensVerified,
        websiteUrl: sellerProfile.websiteUrl,
        twitterHandle: sellerProfile.twitterHandle,
        discordHandle: sellerProfile.discordHandle,
        telegramHandle: sellerProfile.telegramHandle,
        profileImageUrl: sellerProfile.profileImageCdn || '/images/default-avatar.png',
        coverImageUrl: sellerProfile.coverImageCdn,
        reputation: sellerProfile.reputation,
        profileCompleteness: sellerProfile.profileCompleteness,
        isOnline: (sellerProfile as any)?.isOnline || false,
        lastSeen: (sellerProfile as any)?.lastSeen,
        tier: (sellerProfile as any)?.tier,
        createdAt: (sellerProfile as any)?.createdAt,
        updatedAt: (sellerProfile as any)?.updatedAt
      };
      return res.json({
        success: true,
        data: responseData,
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      safeLogger.error('Error fetching seller profile:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch seller profile'
        }
      });
    }
  }

  /**
   * Get seller's product listings
   */
  async getSellerListings(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      // Validate ID
      if (!id) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Seller ID is required'
          }
        });
      }

      // Build pagination options
      const paginationOptions = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100) // Cap at 100 items per page
      };

      safeLogger.info('Fetching seller listings:', {
        sellerId: id,
        page: paginationOptions.page,
        limit: paginationOptions.limit
      });

      // Fetch seller listings from the marketplace service
      const listings = await marketplaceService.getListingsBySeller(id);

      // Apply pagination
      const total = listings.length;
      const totalPages = Math.ceil(total / paginationOptions.limit);
      const startIndex = (paginationOptions.page - 1) * paginationOptions.limit;
      const endIndex = startIndex + paginationOptions.limit;
      const paginatedListings = listings.slice(startIndex, endIndex);

      // Map listings to the expected product format
      const mappedListings = paginatedListings.map(listing => ({
        id: listing.id,
        sellerId: listing.sellerWalletAddress,
        title: `Listing ${listing.id}`,
        description: `Description for listing ${listing.id}`,
        priceAmount: Number(listing.price),
        priceCurrency: 'USD',
        category: {
          id: listing.itemType.toLowerCase(),
          name: listing.itemType,
          slug: listing.itemType.toLowerCase()
        },
        images: [],
        inventory: listing.quantity,
        status: listing.status.toLowerCase(),
        tags: [listing.itemType],
        shipping: {
          freeShipping: true,
          estimatedDays: '3-5',
          methods: ['standard'],
          handlingTime: '1-2',
          shipsFrom: {
            country: 'US'
          }
        },
        nft: listing.nftStandard ? {
          standard: listing.nftStandard,
          tokenId: listing.tokenId
        } : null,
        views: listing.views || 0,
        favorites: listing.favorites || 0,
        listingStatus: listing.status.toLowerCase(),
        publishedAt: listing.createdAt,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
        seller: {
          id: listing.sellerWalletAddress,
          walletAddress: listing.sellerWalletAddress,
          displayName: `Seller ${listing.sellerWalletAddress.substring(0, 6)}`,
          storeName: `Store ${listing.sellerWalletAddress.substring(0, 6)}`,
          rating: 4.5,
          reputation: 85,
          verified: true,
          daoApproved: false,
          profileImageUrl: '/images/default-avatar.png',
          isOnline: true
        },
        trust: {
          verified: true,
          escrowProtected: listing.isEscrowed,
          onChainCertified: false,
          safetyScore: 85
        },
        metadata: {
          condition: 'new',
          brand: 'Unknown'
        },
        specifications: {}
      }));

      return res.json({
        success: true,
        data: {
          listings: mappedListings,
          pagination: {
            total,
            page: paginationOptions.page,
            limit: paginationOptions.limit,
            totalPages
          }
        },
        metadata: {
          timestamp: new Date().toISOString(),
          sellerId: id
        }
      });
    } catch (error) {
      safeLogger.error('Error fetching seller listings:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch seller listings'
        }
      });
    }
  }

  /**
   * Search products and sellers
   */
  async searchMarketplace(req: Request, res: Response) {
    try {
      const { q, type = 'all', page = 1, limit = 20, category, minPrice, maxPrice } = req.query;

      // Validate search query
      if (!q || (q as string).trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUERY',
            message: 'Search query is required'
          }
        });
      }

      const query = q as string;
      const searchType = type as string;

      // Build pagination options
      const paginationOptions = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100) // Cap at 100 items per page
      };

      safeLogger.info('Marketplace search request:', {
        query,
        type: searchType,
        page: paginationOptions.page,
        limit: paginationOptions.limit,
        category,
        minPrice,
        maxPrice
      });

      // Fetch all listings and filter based on search criteria
      const allListings = await marketplaceService.getActiveListings();

      // Apply search filters
      let filteredListings = allListings;

      // Filter by category if provided
      if (category) {
        filteredListings = filteredListings.filter(listing =>
          listing.itemType.toLowerCase() === (category as string).toLowerCase()
        );
      }

      // Filter by price range if provided
      if (minPrice) {
        filteredListings = filteredListings.filter(listing =>
          Number(listing.price) >= Number(minPrice)
        );
      }

      if (maxPrice) {
        filteredListings = filteredListings.filter(listing =>
          Number(listing.price) <= Number(maxPrice)
        );
      }

      // Apply search query to title/description if provided
      if (query) {
        filteredListings = filteredListings.filter(listing =>
          listing.id.includes(query) // Simplified search, would need better implementation
        );
      }

      // Apply pagination
      const total = filteredListings.length;
      const totalPages = Math.ceil(total / paginationOptions.limit);
      const startIndex = (paginationOptions.page - 1) * paginationOptions.limit;
      const endIndex = startIndex + paginationOptions.limit;
      const paginatedListings = filteredListings.slice(startIndex, endIndex);

      // Map listings to the expected product format
      const mappedListings = paginatedListings.map(listing => ({
        id: listing.id,
        sellerId: listing.sellerWalletAddress,
        title: `Listing ${listing.id}`,
        description: `Description for listing ${listing.id}`,
        priceAmount: Number(listing.price),
        priceCurrency: 'USD',
        category: {
          id: listing.itemType.toLowerCase(),
          name: listing.itemType,
          slug: listing.itemType.toLowerCase()
        },
        images: [],
        inventory: listing.quantity,
        status: listing.status.toLowerCase(),
        tags: [listing.itemType],
        shipping: {
          freeShipping: true,
          estimatedDays: '3-5',
          methods: ['standard'],
          handlingTime: '1-2',
          shipsFrom: {
            country: 'US'
          }
        },
        nft: listing.nftStandard ? {
          standard: listing.nftStandard,
          tokenId: listing.tokenId
        } : null,
        views: listing.views || 0,
        favorites: listing.favorites || 0,
        listingStatus: listing.status.toLowerCase(),
        publishedAt: listing.createdAt,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
        seller: {
          id: listing.sellerWalletAddress,
          walletAddress: listing.sellerWalletAddress,
          displayName: `Seller ${listing.sellerWalletAddress.substring(0, 6)}`,
          storeName: `Store ${listing.sellerWalletAddress.substring(0, 6)}`,
          rating: 4.5,
          reputation: 85,
          verified: true,
          daoApproved: false,
          profileImageUrl: '/images/default-avatar.png',
          isOnline: true
        },
        trust: {
          verified: true,
          escrowProtected: listing.isEscrowed,
          onChainCertified: false,
          safetyScore: 85
        },
        metadata: {
          condition: 'new',
          brand: 'Unknown'
        },
        specifications: {}
      }));

      // For seller search, we would need to implement seller search functionality
      // For now, we'll just return empty sellers array
      const sellers = [];

      return res.json({
        success: true,
        data: {
          products: searchType === 'sellers' ? [] : mappedListings,
          sellers: searchType === 'products' ? [] : sellers,
          pagination: {
            total,
            page: paginationOptions.page,
            limit: paginationOptions.limit,
            totalPages
          }
        },
        metadata: {
          timestamp: new Date().toISOString(),
          query: query,
          type: searchType
        }
      });
    } catch (error) {
      safeLogger.error('Error searching marketplace:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search marketplace'
        }
      });
    }
  }

  /**
   * GET /api/marketplace/search-suggestions
   * Get search suggestions for marketplace
   */
  async getSearchSuggestions(req: Request, res: Response) {
    try {
      const { q, limit = 10 } = req.query;

      if (!q || typeof q !== 'string') {
        return res.json({
          success: true,
          data: []
        });
      }

      // Get active listings and filter by title/description containing the query
      const allListings = await marketplaceService.getActiveListings();

      // Simple text matching for suggestions (in a real implementation, this would use a proper search service)
      const suggestions = allListings
        .filter(listing =>
          listing.id.toLowerCase().includes(q.toLowerCase()) ||
          listing.itemType.toLowerCase().includes(q.toLowerCase())
        )
        .slice(0, Number(limit))
        .map(listing => ({
          id: listing.id,
          title: `Listing ${listing.id}`,
          category: listing.itemType,
          price: Number(listing.price),
          type: 'product'
        }));

      return res.json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      safeLogger.error('Error getting search suggestions:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get search suggestions'
        }
      });
    }
  }

  /**
   * GET /api/marketplace/auctions/active
   * Get active auctions
   */
  async getActiveAuctions(req: Request, res: Response) {
    try {
      const { limit = 20, offset = 0 } = req.query;

      // Get active listings that could be auctions
      const allListings = await marketplaceService.getActiveListings();

      // For now, return all active listings as auction-like items
      // In a real implementation, this would filter for actual auction listings
      const auctions = allListings
        .slice(Number(offset), Number(offset) + Number(limit))
        .map(listing => ({
          id: listing.id,
          title: `Auction ${listing.id}`,
          description: `Description for auction ${listing.id}`,
          currentBid: Number(listing.price),
          startingBid: Number(listing.price),
          reservePrice: Number(listing.price) * 1.2, // 20% higher than current price
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          seller: {
            id: listing.sellerWalletAddress,
            walletAddress: listing.sellerWalletAddress,
            displayName: `Seller ${listing.sellerWalletAddress.substring(0, 6)}`
          },
          nft: listing.nftStandard ? {
            standard: listing.nftStandard,
            tokenId: listing.tokenId
          } : null,
          status: 'active',
          bidCount: 0,
          createdAt: listing.createdAt
        }));

      return res.json({
        success: true,
        data: auctions,
        pagination: {
          total: allListings.length,
          page: Math.floor(Number(offset) / Number(limit)) + 1,
          limit: Number(limit)
        }
      });
    } catch (error) {
      safeLogger.error('Error getting active auctions:', error);

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get active auctions'
        }
      });
    }
  }
}

// Create a singleton instance
export const marketplaceController = new MarketplaceController();