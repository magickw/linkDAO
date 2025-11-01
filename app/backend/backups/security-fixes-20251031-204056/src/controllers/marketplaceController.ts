import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { ProductService } from '../services/productService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { sellerService } from '../services/sellerService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { databaseService } from '../services/databaseService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { eq } from 'drizzle-orm';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import * as schema from '../db/schema';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { Product, ProductSortOptions } from '../models/Product';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

const productService = new ProductService();

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

      // Fetch product from database
      const product = await productService.getProductById(id);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Product not found'
          }
        });
      }

      // Fetch seller information
      let sellerProfile = null;
      try {
        sellerProfile = await sellerService.getSellerProfile(product.sellerId);
      } catch (sellerError) {
        safeLogger.warn('Could not fetch seller profile:', sellerError);
        // Continue without seller profile if there's an error
      }

      // Prepare response data
      const responseData = {
        id: product.id,
        sellerId: product.sellerId,
        title: product.title,
        description: product.description,
        priceAmount: parseFloat(product.price.amount),
        priceCurrency: product.price.currency,
        category: product.category,
        images: product.images,
        inventory: product.inventory,
        status: product.status,
        tags: product.tags,
        shipping: product.shipping,
        nft: product.nft,
        views: product.views,
        favorites: product.favorites,
        listingStatus: product.status,
        publishedAt: product.createdAt.toISOString(),
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
        seller: sellerProfile ? {
          id: sellerProfile.walletAddress,
          walletAddress: sellerProfile.walletAddress,
          displayName: sellerProfile.displayName,
          storeName: sellerProfile.storeName,
          rating: 4.5, // This would come from actual ratings
          reputation: sellerProfile.reputation?.overallScore || 0,
          verified: sellerProfile.reputation?.reputationTier === 'verified' || false,
          daoApproved: false, // This would come from actual DAO approval status
          profileImageUrl: sellerProfile.profileImageCdn || '/images/default-avatar.png',
          isOnline: true
        } : {
          id: product.sellerId,
          walletAddress: product.sellerId,
          displayName: 'Unknown Seller',
          storeName: 'Unknown Store',
          rating: 0,
          reputation: 0,
          verified: false,
          daoApproved: false,
          profileImageUrl: '/images/default-avatar.png',
          isOnline: false
        },
        trust: {
          verified: sellerProfile?.reputation?.reputationTier === 'verified' || false,
          escrowProtected: true, // Default to true for marketplace products
          onChainCertified: false, // This would come from actual blockchain verification
          safetyScore: sellerProfile?.reputation?.overallScore || 0
        },
        metadata: product.metadata,
        specifications: product.metadata?.customAttributes || {}
      };

      // Update view count
      try {
        await databaseService.db.update(schema.products)
          .set({ views: product.views + 1 })
          .where(eq(schema.products.id, id));
      } catch (viewError) {
        safeLogger.warn('Could not update view count:', viewError);
      }

      return res.json({
        success: true,
        data: responseData,
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      safeLogger.error('Error fetching product details:', error);
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch product details'
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

      // Build filters
      const filters: any = {};
      
      if (category) filters.categoryId = category;
      if (minPrice) filters.priceMin = minPrice;
      if (maxPrice) filters.priceMax = maxPrice;
      if (sellerId) filters.sellerId = sellerId;
      if (search) filters.query = search;

      // Build sort options
      const sortOptions: ProductSortOptions = {
        field: sortBy as any,
        direction: sortOrder === 'asc' ? 'asc' : 'desc'
      };

      // Build pagination options
      const paginationOptions = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100) // Cap at 100 items per page
      };

      // Search products
      const searchResult = await productService.searchProducts(
        filters,
        sortOptions,
        paginationOptions
      );

      // Transform products for response
      const listings = searchResult.products.map((product: Product) => ({
        id: product.id,
        sellerId: product.sellerId,
        title: product.title,
        description: product.description,
        price: {
          amount: parseFloat(product.price.amount),
          currency: product.price.currency
        },
        category: product.category,
        images: product.images,
        inventory: product.inventory,
        status: product.status,
        tags: product.tags,
        views: product.views,
        favorites: product.favorites,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString()
      }));

      return res.json({
        success: true,
        data: {
          listings,
          pagination: {
            total: searchResult.total,
            page: searchResult.page,
            limit: searchResult.limit,
            totalPages: searchResult.totalPages
          }
        },
        metadata: {
          timestamp: new Date().toISOString(),
          filters: searchResult.filters,
          sort: searchResult.sort
        }
      });
    } catch (error) {
      safeLogger.error('Error fetching product listings:', error);
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch product listings'
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
        displayName: sellerProfile.displayName,
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

      // Build filters
      const filters = {
        sellerId: id
      };

      // Build pagination options
      const paginationOptions = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100) // Cap at 100 items per page
      };

      // Search products
      const searchResult = await productService.searchProducts(
        filters,
        { field: 'createdAt', direction: 'desc' },
        paginationOptions
      );

      // Transform products for response
      const listings = searchResult.products.map((product: Product) => ({
        id: product.id,
        sellerId: product.sellerId,
        title: product.title,
        description: product.description,
        price: {
          amount: parseFloat(product.price.amount),
          currency: product.price.currency
        },
        category: product.category,
        images: product.images,
        inventory: product.inventory,
        status: product.status,
        tags: product.tags,
        views: product.views,
        favorites: product.favorites,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString()
      }));

      return res.json({
        success: true,
        data: {
          listings,
          pagination: {
            total: searchResult.total,
            page: searchResult.page,
            limit: searchResult.limit,
            totalPages: searchResult.totalPages
          }
        },
        metadata: {
          timestamp: new Date().toISOString()
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

      let results: any = {
        products: [],
        sellers: [],
        pagination: {
          total: 0,
          page: paginationOptions.page,
          limit: paginationOptions.limit,
          totalPages: 0
        }
      };

      // Search based on type
      if (searchType === 'products' || searchType === 'all') {
        // Build filters for products
        const filters: any = {
          query: query
        };
        
        if (category) filters.categoryId = category;
        if (minPrice) filters.priceMin = minPrice;
        if (maxPrice) filters.priceMax = maxPrice;

        // Search products
        const productSearchResult = await productService.searchProducts(
          filters,
          { field: 'relevance', direction: 'desc' },
          paginationOptions
        );

        results.products = productSearchResult.products.map((product: Product) => ({
          id: product.id,
          sellerId: product.sellerId,
          title: product.title,
          description: product.description,
          price: {
            amount: parseFloat(product.price.amount),
            currency: product.price.currency
          },
          category: product.category,
          images: product.images,
          inventory: product.inventory,
          status: product.status,
          tags: product.tags,
          views: product.views,
          favorites: product.favorites,
          createdAt: product.createdAt.toISOString(),
          updatedAt: product.updatedAt.toISOString()
        }));

        results.pagination = {
          total: productSearchResult.total,
          page: productSearchResult.page,
          limit: productSearchResult.limit,
          totalPages: productSearchResult.totalPages
        };
      }

      // For simplicity, we're not implementing seller search in this example
      // In a real implementation, you would also search sellers here

      return res.json({
        success: true,
        data: results,
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
}

// Create a singleton instance
export const marketplaceController = new MarketplaceController();