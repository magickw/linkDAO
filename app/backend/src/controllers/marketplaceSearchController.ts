import { Request, Response } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { SearchService, AdvancedSearchFilters } from '../services/searchService';
import { RedisService } from '../services/redisService';
import { ProductSortOptions } from '../models/Product';

export class MarketplaceSearchController {
  private static searchService = new SearchService();
  private static redisService = new RedisService();

  /**
   * Enhanced product search with advanced filtering and sorting
   */
  static async searchProducts(req: Request, res: Response) {
    try {
      const {
        query,
        categoryId,
        sellerId,
        priceMin,
        priceMax,
        currency,
        condition,
        tags,
        status,
        inStock,
        freeShipping,
        location,
        // New filters
        minRating,
        maxRating,
        sellerReputation,
        hasReviews,
        recentlyAdded,
        trending,
        onSale,
        fastShipping,
        minReputationScore,
        maxReputationScore,
        minSalesCount,
        maxSalesCount,
        minViews,
        maxViews,
        minFavorites,
        maxFavorites,
        productCondition,
        brand,
        hasWarranty,
        isNFT,
        isEscrowProtected,
        shippingMethods,
        minHandlingTime,
        maxHandlingTime,
        shipsToCountry,
        shipsToState,
        shipsToCity,
        sellerVerification,
        sellerTier,
        sellerOnlineStatus,
        priceRange,
        priceCurrency,
        hasDiscount,
        discountPercentage,
        isFeatured,
        isPublished,
        hasStock,
        stockRange,
        tagsInclude,
        tagsExclude,
        categoryPath,
        customAttributes,
        // Sorting
        sortBy = 'relevance',
        sortDirection = 'desc',
        // Pagination
        page = '1',
        limit = '20'
      } = req.query;

      // Build filters object
      const filters: AdvancedSearchFilters = {};
      
      // Basic filters
      if (query) filters.query = query as string;
      if (categoryId) filters.categoryId = categoryId as string;
      if (sellerId) filters.sellerId = sellerId as string;
      if (priceMin) filters.priceMin = priceMin as string;
      if (priceMax) filters.priceMax = priceMax as string;
      if (currency) filters.currency = currency as string;
      if (condition) filters.condition = condition as 'new' | 'used' | 'refurbished';
      if (tags) filters.tags = (tags as string).split(',');
      if (status) filters.status = (status as string).split(',') as any[];
      if (inStock !== undefined) filters.inStock = inStock === 'true';
      if (freeShipping !== undefined) filters.freeShipping = freeShipping === 'true';
      if (location) {
        try {
          filters.location = JSON.parse(location as string);
        } catch (e) {
          // Ignore invalid location JSON
        }
      }
      
      // Enhanced filters
      if (minRating) filters.minRating = parseFloat(minRating as string);
      if (maxRating) filters.maxRating = parseFloat(maxRating as string);
      if (sellerReputation) filters.sellerReputation = sellerReputation as any;
      if (hasReviews !== undefined) filters.hasReviews = hasReviews === 'true';
      if (recentlyAdded !== undefined) filters.recentlyAdded = recentlyAdded === 'true';
      if (trending !== undefined) filters.trending = trending === 'true';
      if (onSale !== undefined) filters.onSale = onSale === 'true';
      if (fastShipping !== undefined) filters.fastShipping = fastShipping === 'true';
      if (minReputationScore !== undefined) filters.minReputationScore = parseFloat(minReputationScore as string);
      if (maxReputationScore !== undefined) filters.maxReputationScore = parseFloat(maxReputationScore as string);
      if (minSalesCount !== undefined) filters.minSalesCount = parseFloat(minSalesCount as string);
      if (maxSalesCount !== undefined) filters.maxSalesCount = parseFloat(maxSalesCount as string);
      if (minViews !== undefined) filters.minViews = parseFloat(minViews as string);
      if (maxViews !== undefined) filters.maxViews = parseFloat(maxViews as string);
      if (minFavorites !== undefined) filters.minFavorites = parseFloat(minFavorites as string);
      if (maxFavorites !== undefined) filters.maxFavorites = parseFloat(maxFavorites as string);
      if (productCondition) filters.productCondition = productCondition as 'new' | 'used' | 'refurbished';
      if (brand) filters.brand = brand as string;
      if (hasWarranty !== undefined) filters.hasWarranty = hasWarranty === 'true';
      if (isNFT !== undefined) filters.isNFT = isNFT === 'true';
      if (isEscrowProtected !== undefined) filters.isEscrowProtected = isEscrowProtected === 'true';
      if (shippingMethods) filters.shippingMethods = (shippingMethods as string).split(',');
      if (minHandlingTime !== undefined) filters.minHandlingTime = parseFloat(minHandlingTime as string);
      if (maxHandlingTime !== undefined) filters.maxHandlingTime = parseFloat(maxHandlingTime as string);
      if (shipsToCountry) filters.shipsToCountry = shipsToCountry as string;
      if (shipsToState) filters.shipsToState = shipsToState as string;
      if (shipsToCity) filters.shipsToCity = shipsToCity as string;
      if (sellerVerification) filters.sellerVerification = sellerVerification as any;
      if (sellerTier) filters.sellerTier = sellerTier as any;
      if (sellerOnlineStatus) filters.sellerOnlineStatus = sellerOnlineStatus as any;
      if (priceRange) {
        try {
          filters.priceRange = JSON.parse(priceRange as string);
        } catch (e) {
          // Ignore invalid priceRange JSON
        }
      }
      if (priceCurrency) filters.priceCurrency = priceCurrency as string;
      if (hasDiscount !== undefined) filters.hasDiscount = hasDiscount === 'true';
      if (discountPercentage !== undefined) filters.discountPercentage = parseFloat(discountPercentage as string);
      if (isFeatured !== undefined) filters.isFeatured = isFeatured === 'true';
      if (isPublished !== undefined) filters.isPublished = isPublished === 'true';
      if (hasStock !== undefined) filters.hasStock = hasStock === 'true';
      if (stockRange) {
        try {
          filters.stockRange = JSON.parse(stockRange as string);
        } catch (e) {
          // Ignore invalid stockRange JSON
        }
      }
      if (tagsInclude) filters.tagsInclude = (tagsInclude as string).split(',');
      if (tagsExclude) filters.tagsExclude = (tagsExclude as string).split(',');
      if (categoryPath) {
        try {
          filters.categoryPath = JSON.parse(categoryPath as string);
        } catch (e) {
          // Ignore invalid categoryPath JSON
        }
      }
      if (customAttributes) {
        try {
          filters.customAttributes = JSON.parse(customAttributes as string);
        } catch (e) {
          // Ignore invalid customAttributes JSON
        }
      }

      // Build sort options
      const sort: ProductSortOptions = {
        field: sortBy as any,
        direction: sortDirection as 'asc' | 'desc'
      };

      // Pagination
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      // Check cache first
      const cacheKey = `marketplace_search:${JSON.stringify(filters)}:${JSON.stringify(sort)}:${pageNum}:${limitNum}`;
      const cachedResults = await MarketplaceSearchController.redisService.get(cacheKey);
      
      if (cachedResults) {
        return res.json(JSON.parse(cachedResults));
      }

      const results = await MarketplaceSearchController.searchService.advancedSearch(
        filters,
        sort,
        { page: pageNum, limit: limitNum }
      );

      // Cache results for 5 minutes
      await MarketplaceSearchController.redisService.set(cacheKey, JSON.stringify(results), 300);

      return res.json(results);
    } catch (error) {
      safeLogger.error('Marketplace search error:', error);
      return res.status(500).json({ error: 'Search failed' });
    }
  }

  /**
   * Get search suggestions with enhanced autocomplete
   */
  static async getSearchSuggestions(req: Request, res: Response) {
    try {
      const {
        query,
        limit = '10'
      } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const limitNum = parseInt(limit as string, 10);

      const results = await MarketplaceSearchController.searchService.getSearchSuggestions(
        query,
        limitNum
      );

      return res.json(results);
    } catch (error) {
      safeLogger.error('Search suggestions error:', error);
      return res.status(500).json({ error: 'Failed to fetch search suggestions' });
    }
  }

  /**
   * Get product recommendations based on user behavior
   */
  static async getProductRecommendations(req: Request, res: Response) {
    try {
      const {
        userId,
        productId,
        categoryId,
        limit = '10'
      } = req.query;

      const limitNum = parseInt(limit as string, 10);

      const results = await MarketplaceSearchController.searchService.getRecommendations(
        userId as string,
        productId as string,
        categoryId as string,
        limitNum
      );

      return res.json(results);
    } catch (error) {
      safeLogger.error('Product recommendations error:', error);
      return res.status(500).json({ error: 'Failed to fetch product recommendations' });
    }
  }

  /**
   * Compare multiple products side by side
   */
  static async compareProducts(req: Request, res: Response) {
    try {
      const { productIds } = req.query;

      if (!productIds || typeof productIds !== 'string') {
        return res.status(400).json({ error: 'Product IDs are required' });
      }

      const ids = productIds.split(',');

      const results = await MarketplaceSearchController.searchService.compareProducts(ids);

      return res.json(results);
    } catch (error) {
      safeLogger.error('Product comparison error:', error);
      return res.status(500).json({ error: 'Failed to compare products' });
    }
  }

  /**
   * Enhanced search suggestions with autocomplete and trending suggestions
   */
  static async getEnhancedSearchSuggestions(req: Request, res: Response) {
    try {
      const { q, limit = 8, includeTrending = false } = req.query;

      if (!q || typeof q !== 'string') {
        return res.json({
          success: true,
          data: {
            suggestions: [],
            trending: includeTrending ? await this.getTrendingSearches() : []
          }
        });
      }

      // Get basic suggestions using the existing search service
      const basicSuggestions = await MarketplaceSearchController.searchService.getSearchSuggestions(
        q as string,
        Number(limit)
      );

      // Enhance suggestions with additional metadata
      const enhancedSuggestions = basicSuggestions.map((suggestion: any) => ({
        ...suggestion,
        highlight: this.highlightQuery(suggestion.title || suggestion.name, q as string),
        category: suggestion.category || 'general',
        popularity: Math.floor(Math.random() * 100) + 1, // Mock popularity score
        type: suggestion.type || 'product'
      }));

      const result = {
        suggestions: enhancedSuggestions,
        trending: includeTrending ? await this.getTrendingSearches() : []
      };

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      safeLogger.error('Enhanced search suggestions error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to fetch enhanced search suggestions' 
      });
    }
  }

  /**
   * Helper method to highlight query in suggestions
   */
  private static highlightQuery(text: string, query: string): string {
    if (!text || !query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Get trending searches (mock implementation)
   */
  private static async getTrendingSearches(): Promise<any[]> {
    // Mock trending searches - in a real implementation, this would come from analytics
    return [
      { query: 'electronics', count: 1250, trend: 'up' },
      { query: 'nft art', count: 980, trend: 'up' },
      { query: 'gaming', count: 756, trend: 'stable' },
      { query: 'collectibles', count: 623, trend: 'down' },
      { query: 'digital art', count: 512, trend: 'up' }
    ];
  }
}
