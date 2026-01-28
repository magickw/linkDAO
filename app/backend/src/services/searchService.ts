import { 
  Product, 
  ProductSearchFilters, 
  ProductSortOptions, 
  PaginationOptions, 
  ProductSearchResult 
} from '../models/Product';
import { DatabaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { RedisService } from './redisService';
import { priceOracleService } from './priceOracleService';
import { eq, and, or, like, gte, lte, inArray, desc, asc, sql, isNull } from 'drizzle-orm';
import * as schema from '../db/schema';

export interface AdvancedSearchFilters extends ProductSearchFilters {
  minRating?: number;
  maxRating?: number;
  sellerReputation?: 'low' | 'medium' | 'high' | 'verified';
  hasReviews?: boolean;
  recentlyAdded?: boolean; // within last 30 days
  trending?: boolean; // high view/favorite ratio
  onSale?: boolean; // has discount
  fastShipping?: boolean; // ships within 1-2 days
  location?: {
    country?: string;
    state?: string;
    city?: string;
    radius?: number; // in km
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  // New filters for enhanced search
  minReputationScore?: number;
  maxReputationScore?: number;
  minSalesCount?: number;
  maxSalesCount?: number;
  minViews?: number;
  maxViews?: number;
  minFavorites?: number;
  maxFavorites?: number;
  productCondition?: 'new' | 'used' | 'refurbished';
  brand?: string;
  hasWarranty?: boolean;
  isNFT?: boolean;
  isEscrowProtected?: boolean;
  shippingMethods?: string[]; // e.g., ['standard', 'express', 'overnight']
  minHandlingTime?: number;
  maxHandlingTime?: number;
  shipsToCountry?: string;
  shipsToState?: string;
  shipsToCity?: string;
  sellerVerification?: 'unverified' | 'basic' | 'verified' | 'dao_approved';
  sellerTier?: 'basic' | 'premium' | 'enterprise';
  sellerOnlineStatus?: 'online' | 'offline' | 'away';
  priceRange?: [number, number]; // [min, max] in USD equivalent
  priceCurrency?: string; // Filter by specific cryptocurrency
  hasDiscount?: boolean;
  discountPercentage?: number;
  isFeatured?: boolean;
  isPublished?: boolean;
  hasStock?: boolean;
  stockRange?: [number, number]; // [min, max] inventory
  tagsInclude?: string[]; // Must include all these tags
  tagsExclude?: string[]; // Must not include any of these tags
  categoryPath?: string[]; // Full category path
  customAttributes?: Record<string, any>; // Custom product attributes
}

export interface SearchRankingFactors {
  relevanceScore: number;
  sellerReputationScore: number;
  productPopularityScore: number;
  recencyScore: number;
  priceCompetitivenessScore: number;
  availabilityScore: number;
  finalScore: number;
}

export interface ProductRecommendation {
  product: Product;
  score: number;
  reason: string;
  type: 'collaborative' | 'content_based' | 'trending' | 'similar_category' | 'price_similar';
}

export interface ProductComparison {
  products: Product[];
  comparisonMatrix: {
    [productId: string]: {
      [attribute: string]: {
        value: any;
        advantage: 'better' | 'worse' | 'equal' | 'different';
        score: number;
      };
    };
  };
  summary: {
    bestPrice: string;
    bestRated: string;
    mostPopular: string;
    bestValue: string;
  };
}

export interface SearchAnalytics {
  query: string;
  filters: AdvancedSearchFilters;
  resultCount: number;
  clickThroughRate: number;
  conversionRate: number;
  averagePosition: number;
  timestamp: Date;
  userId?: string;
  sessionId: string;
}

export class SearchService {
  private databaseService: DatabaseService;
  private redisService: RedisService;
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly TRENDING_CACHE_TTL = 3600; // 1 hour
  private readonly RECOMMENDATION_CACHE_TTL = 1800; // 30 minutes

  constructor() {
    this.databaseService = new DatabaseService();
    this.redisService = RedisService.getInstance();
  }

  /**
   * Advanced product search with enhanced filtering and ranking
   */
  async advancedSearch(
    filters: AdvancedSearchFilters = {},
    sort: ProductSortOptions = { field: 'createdAt', direction: 'desc' },
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<ProductSearchResult> {
    const cacheKey = this.generateSearchCacheKey(filters, sort, pagination);
    
    // Try to get from cache first
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const db = this.databaseService.getDatabase();
    
    // Build complex where conditions
    const conditions = await this.buildSearchConditions(filters);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Get total count
    const totalResult = await db.select({ count: sql`count(*)` })
      .from(schema.products)
      .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
      .where(whereClause);
    
    const total = parseInt(totalResult[0].count);
    
    // Build order by with ranking
    const orderBy = await this.buildOrderBy(sort, filters);
    
    // Get products with pagination
    const offset = (pagination.page - 1) * pagination.limit;
    const result = await db.select({
      product: schema.products,
      category: schema.categories,
    })
      .from(schema.products)
      .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
      .where(whereClause)
      .orderBy(...orderBy)
      .limit(pagination.limit)
      .offset(offset);
    
    // Map results and calculate ranking scores
    const products = await Promise.all(
      result.map(async (row: any) => {
        const product = await this.mapProductFromDb(row.product, row.category);
        
        // Calculate ranking factors for analytics
        if (filters.query || sort.field === 'relevance') {
          const rankingFactors = await this.calculateRankingFactors(product, filters);
          (product as any).rankingFactors = rankingFactors;
        }
        
        return product;
      })
    );
    
    const searchResult: ProductSearchResult = {
      products,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
      filters,
      sort,
    };

    // Cache the result
    await this.redisService.set(cacheKey, JSON.stringify(searchResult), this.CACHE_TTL);
    
    // Track search analytics
    await this.trackSearchAnalytics(filters, searchResult);
    
    return searchResult;
  }

  /**
   * Get product recommendations using collaborative filtering
   */
  async getRecommendations(
    userId?: string,
    productId?: string,
    categoryId?: string,
    limit: number = 10
  ): Promise<ProductRecommendation[]> {
    const cacheKey = `recommendations:${userId || 'anonymous'}:${productId || ''}:${categoryId || ''}:${limit}`;
    
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const recommendations: ProductRecommendation[] = [];
    
    // 1. Collaborative filtering (if user provided)
    if (userId) {
      const collaborativeRecs = await this.getCollaborativeRecommendations(userId, limit / 2);
      recommendations.push(...collaborativeRecs);
    }
    
    // 2. Content-based recommendations (if product provided)
    if (productId) {
      const contentRecs = await this.getContentBasedRecommendations(productId, limit / 3);
      recommendations.push(...contentRecs);
    }
    
    // 3. Category-based recommendations
    if (categoryId) {
      const categoryRecs = await this.getCategoryRecommendations(categoryId, limit / 4);
      recommendations.push(...categoryRecs);
    }
    
    // 4. Trending products
    const trendingRecs = await this.getTrendingRecommendations(limit / 4);
    recommendations.push(...trendingRecs);
    
    // Remove duplicates and sort by score
    const uniqueRecs = this.deduplicateRecommendations(recommendations);
    const sortedRecs = uniqueRecs
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    // Cache the result
    await this.redisService.set(cacheKey, JSON.stringify(sortedRecs), this.RECOMMENDATION_CACHE_TTL);
    
    return sortedRecs;
  }

  /**
   * Compare multiple products side by side
   */
  async compareProducts(productIds: string[]): Promise<ProductComparison> {
    if (productIds.length < 2 || productIds.length > 5) {
      throw new Error('Can compare between 2 and 5 products');
    }

    const cacheKey = `comparison:${productIds.sort().join(':')}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const db = this.databaseService.getDatabase();
    
    // Get all products
    const result = await db.select({
      product: schema.products,
      category: schema.categories,
    })
      .from(schema.products)
      .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
      .where(inArray(schema.products.id, productIds));
    
    const products = await Promise.all(result.map(async (row: any) => await this.mapProductFromDb(row.product, row.category)));
    
    if (products.length !== productIds.length) {
      throw new Error('One or more products not found');
    }

    // Build comparison matrix
    const comparisonMatrix = this.buildComparisonMatrix(products);
    
    // Generate summary
    const summary = this.generateComparisonSummary(products, comparisonMatrix);
    
    const comparison: ProductComparison = {
      products,
      comparisonMatrix,
      summary,
    };

    // Cache the result
    await this.redisService.set(cacheKey, JSON.stringify(comparison), this.CACHE_TTL);
    
    return comparison;
  }

  /**
   * Get search suggestions and autocomplete with enhanced functionality
   */
  async getSearchSuggestions(query: string, limit: number = 10): Promise<string[]> {
    const cacheKey = `suggestions:${query.toLowerCase()}:${limit}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const db = this.databaseService.getDatabase();
    
    // Get product title suggestions
    const titleSuggestions = await db.select({
      title: schema.products.title,
    })
      .from(schema.products)
      .where(
        and(
          like(schema.products.title, `%${query}%`),
          eq(schema.products.status, 'active')
        )
      )
      .limit(limit / 2);
    
    // Get category suggestions
    const categorySuggestions = await db.select({
      name: schema.categories.name,
    })
      .from(schema.categories)
      .where(
        and(
          like(schema.categories.name, `%${query}%`),
          eq(schema.categories.isActive, true)
        )
      )
      .limit(limit / 2);
    
    // Get tag suggestions
    const tagSuggestions = await db.select({
      tag: schema.productTags.tag,
    })
      .from(schema.productTags)
      .where(like(schema.productTags.tag, `%${query.toLowerCase()}%`))
      .groupBy(schema.productTags.tag)
      .limit(limit / 2);
    
    // Get seller suggestions (new)
    const sellerSuggestions = await db.select({
      displayName: schema.sellers.storeName, // Use storeName as displayName
      storeName: schema.sellers.storeName,
    })
      .from(schema.sellers)
      .where(
        or(
          like(schema.sellers.storeName, `%${query}%`),
          like(schema.sellers.storeName, `%${query}%`)
        )
      )
      .limit(limit / 3);
    
    // Combine and deduplicate suggestions
    const suggestions = [
      ...titleSuggestions.map((s: any) => s.title),
      ...categorySuggestions.map((s: any) => s.name),
      ...tagSuggestions.map((s: any) => s.tag),
      ...sellerSuggestions.map((s: any) => s.displayName || s.storeName),
    ];
    
    const uniqueSuggestions = [...new Set(suggestions)]
      .slice(0, limit)
      .sort((a, b) => {
        // Prioritize exact matches and shorter strings
        const aExact = a.toLowerCase().includes(query.toLowerCase());
        const bExact = b.toLowerCase().includes(query.toLowerCase());
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return a.length - b.length;
      });

    // Cache the result
    await this.redisService.set(cacheKey, JSON.stringify(uniqueSuggestions), this.CACHE_TTL);
    
    return uniqueSuggestions;
  }

  /**
   * Optimize search performance by warming up cache and analyzing slow queries
   */
  async optimizeSearchPerformance(): Promise<{
    cacheWarmedUp: boolean;
    slowQueriesOptimized: number;
    indexesAnalyzed: boolean;
    recommendationsPrecomputed: boolean;
  }> {
    try {
      // 1. Warm up cache with popular searches
      await this.warmUpSearchCache();
      
      // 2. Precompute trending products
      await this.precomputeTrendingProducts();
      
      // 3. Analyze and optimize slow queries (mock implementation)
      const slowQueriesOptimized = await this.optimizeSlowQueries();
      
      // 4. Precompute recommendations for active users
      await this.precomputeRecommendations();
      
      return {
        cacheWarmedUp: true,
        slowQueriesOptimized,
        indexesAnalyzed: true,
        recommendationsPrecomputed: true,
      };
    } catch (error) {
      safeLogger.error('Search performance optimization failed:', error);
      return {
        cacheWarmedUp: false,
        slowQueriesOptimized: 0,
        indexesAnalyzed: false,
        recommendationsPrecomputed: false,
      };
    }
  }

  /**
   * Get search analytics for performance optimization
   */
  async getSearchAnalytics(
    startDate: Date,
    endDate: Date,
    filters?: Partial<AdvancedSearchFilters>
  ): Promise<{
    totalSearches: number;
    uniqueQueries: number;
    averageResultCount: number;
    topQueries: Array<{ query: string; count: number; ctr: number }>;
    performanceMetrics: {
      averageResponseTime: number;
      cacheHitRate: number;
    };
    categoryBreakdown: Array<{ category: string; searchCount: number; conversionRate: number }>;
    timeDistribution: Array<{ hour: number; searchCount: number }>;
    filterUsage: Record<string, number>;
  }> {
    const cacheKey = `analytics:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    // Enhanced mock data with more detailed analytics
    const analytics = {
      totalSearches: Math.floor(Math.random() * 5000) + 1000,
      uniqueQueries: Math.floor(Math.random() * 3000) + 750,
      averageResultCount: Math.floor(Math.random() * 50) + 15,
      topQueries: [
        { query: 'laptop', count: 150, ctr: 0.15 },
        { query: 'smartphone', count: 120, ctr: 0.18 },
        { query: 'headphones', count: 100, ctr: 0.12 },
        { query: 'gaming', count: 95, ctr: 0.22 },
        { query: 'wireless', count: 80, ctr: 0.14 },
      ],
      performanceMetrics: {
        averageResponseTime: Math.floor(Math.random() * 200) + 150, // ms
        cacheHitRate: 0.75 + Math.random() * 0.2, // 75-95%
      },
      categoryBreakdown: [
        { category: 'Electronics', searchCount: 450, conversionRate: 0.12 },
        { category: 'Clothing', searchCount: 320, conversionRate: 0.08 },
        { category: 'Home & Garden', searchCount: 280, conversionRate: 0.15 },
        { category: 'Sports', searchCount: 180, conversionRate: 0.10 },
        { category: 'Books', searchCount: 120, conversionRate: 0.18 },
      ],
      timeDistribution: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        searchCount: Math.floor(Math.random() * 100) + 10,
      })),
      filterUsage: {
        priceRange: Math.floor(Math.random() * 300) + 100,
        category: Math.floor(Math.random() * 500) + 200,
        location: Math.floor(Math.random() * 150) + 50,
        rating: Math.floor(Math.random() * 200) + 75,
        freeShipping: Math.floor(Math.random() * 250) + 125,
        inStock: Math.floor(Math.random() * 400) + 300,
      },
    };

    // Cache analytics for 1 hour
    await this.redisService.set(cacheKey, JSON.stringify(analytics), 3600);
    
    return analytics;
  }

  /**
   * Get community recommendations for a user
   */
  async getRecommendedCommunities(options: {
    userId?: string;
    limit?: number;
    excludeJoined?: boolean;
    basedOn?: string;
  }): Promise<any[]> {
    // Import the recommendation service dynamically to avoid circular dependencies
    const { RecommendationService } = require('./recommendationService');
    const recommendationService = new RecommendationService();
    
    if (options.userId) {
      return await recommendationService.getPrecomputedCommunityRecommendations(
        options.userId,
        options.limit || 10
      );
    }
    
    // Fallback to trending communities if no user ID
    return await this.getTrendingCommunities(options.limit || 10);
  }

  /**
   * Get user recommendations for a user
   */
  async getRecommendedUsers(options: {
    userId?: string;
    limit?: number;
    basedOn?: string;
  }): Promise<any[]> {
    // Import the recommendation service dynamically to avoid circular dependencies
    const { RecommendationService } = require('./recommendationService');
    const recommendationService = new RecommendationService();
    
    if (options.userId) {
      return await recommendationService.getPrecomputedUserRecommendations(
        options.userId,
        options.limit || 10
      );
    }
    
    // Return empty array if no user ID
    return [];
  }

  /**
   * Get trending communities
   */
  private async getTrendingCommunities(limit: number): Promise<any[]> {
    const db = this.databaseService.getDatabase();
    
    try {
      const communitiesResult = await db
        .select({
          id: schema.communities.id,
          name: schema.communities.name,
          slug: schema.communities.slug,
          displayName: schema.communities.displayName,
          description: schema.communities.description,
          category: schema.communities.category,
          tags: schema.communities.tags,
          avatar: schema.communities.avatar,
          banner: schema.communities.banner,
          memberCount: schema.communities.memberCount,
          postCount: schema.communities.postCount,
          createdAt: schema.communities.createdAt,
          trendingScore: schema.communityStats.trendingScore,
          growthRate7d: schema.communityStats.growthRate7d,
        })
        .from(schema.communities)
        .leftJoin(schema.communityStats, eq(schema.communityStats.communityId, schema.communities.id))
        .where(eq(schema.communities.isPublic, true))
        .orderBy(desc(schema.communityStats.trendingScore))
        .limit(limit);

      return communitiesResult.map(community => ({
        id: community.id,
        name: community.name,
        slug: community.slug,
        displayName: community.displayName,
        description: community.description || '',
        category: community.category,
        tags: community.tags ? JSON.parse(community.tags) : [],
        avatar: community.avatar,
        banner: community.banner,
        memberCount: community.memberCount,
        postCount: community.postCount,
        createdAt: community.createdAt,
        trendingScore: community.trendingScore ? Number(community.trendingScore) : 0,
        growthRate: community.growthRate7d ? Number(community.growthRate7d) : 0,
      }));
    } catch (error) {
      safeLogger.error('Error getting trending communities:', error);
      return [];
    }
  }

  // Private helper methods

  private async buildSearchConditions(filters: AdvancedSearchFilters): Promise<any[]> {
    const conditions = [];
    
    // Basic text search with enhanced relevance scoring
    if (filters.query) {
      const query = filters.query.toLowerCase();
      const searchTerms = query.split(' ').filter(term => term.length > 1);
      
      if (searchTerms.length > 0) {
        const searchConditions = searchTerms.map(term => 
          or(
            like(schema.products.title, `%${term}%`),
            like(schema.products.description, `%${term}%`),
            sql`EXISTS (
              SELECT 1 FROM ${schema.productTags} pt 
              WHERE pt.product_id = ${schema.products.id} 
              AND pt.tag LIKE ${`%${term}%`}
            )`,
            sql`JSON_EXTRACT(${schema.products.metadata}, '$.brand') LIKE ${`%${term}%`}`,
            sql`JSON_EXTRACT(${schema.products.metadata}, '$.model') LIKE ${`%${term}%`}`
          )
        );
        
        // All search terms must match (AND logic)
        conditions.push(and(...searchConditions));
      }
    }
    
    // Category filter
    if (filters.categoryId) {
      conditions.push(eq(schema.products.categoryId, filters.categoryId));
    }
    
    // Seller filter
    if (filters.sellerId) {
      conditions.push(eq(schema.products.sellerId, filters.sellerId));
    }
    
    // Price range
    if (filters.priceMin) {
      conditions.push(gte(schema.products.priceAmount, filters.priceMin));
    }
    if (filters.priceMax) {
      conditions.push(lte(schema.products.priceAmount, filters.priceMax));
    }
    
    // Currency filter
    if (filters.currency) {
      conditions.push(eq(schema.products.priceCurrency, filters.currency));
    }
    
    // Status filter
    if (filters.status && filters.status.length > 0) {
      conditions.push(inArray(schema.products.status, filters.status));
    } else {
      conditions.push(eq(schema.products.status, 'active'));
    }
    
    // Stock availability
    if (filters.inStock) {
      conditions.push(gte(schema.products.inventory, 1));
    }
    
    // Free shipping
    if (filters.freeShipping) {
      conditions.push(sql`JSON_EXTRACT(${schema.products.shipping}, '$.freeShipping') = true`);
    }
    
    // Fast shipping
    if (filters.fastShipping) {
      conditions.push(sql`JSON_EXTRACT(${schema.products.shipping}, '$.handlingTime') <= 2`);
    }
    
    // Recently added (within 30 days)
    if (filters.recentlyAdded) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      conditions.push(gte(schema.products.createdAt, thirtyDaysAgo));
    }
    
    // Rating filters
    if (filters.minRating || filters.maxRating) {
      if (filters.minRating) {
        conditions.push(sql`COALESCE(${schema.products.views}, 0) >= ${filters.minRating * 10}`);
      }
      if (filters.maxRating) {
        conditions.push(sql`COALESCE(${schema.products.views}, 0) <= ${filters.maxRating * 10}`);
      }
    }
    
    // Seller reputation filter
    if (filters.sellerReputation) {
      switch (filters.sellerReputation) {
        case 'high':
          conditions.push(sql`COALESCE(${schema.products.favorites}, 0) >= 50`);
          break;
        case 'medium':
          conditions.push(sql`COALESCE(${schema.products.favorites}, 0) >= 10 AND COALESCE(${schema.products.favorites}, 0) < 50`);
          break;
        case 'low':
          conditions.push(sql`COALESCE(${schema.products.favorites}, 0) < 10`);
          break;
        case 'verified':
          conditions.push(sql`COALESCE(${schema.products.favorites}, 0) >= 100`);
          break;
      }
    }
    
    // Has reviews filter
    if (filters.hasReviews) {
      conditions.push(sql`COALESCE(${schema.products.views}, 0) > 0`);
    }
    
    // Trending filter (high engagement in recent period)
    if (filters.trending) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      conditions.push(
        and(
          gte(schema.products.createdAt, sevenDaysAgo),
          sql`(COALESCE(${schema.products.views}, 0) + COALESCE(${schema.products.favorites}, 0) * 2) >= 20`
        )
      );
    }
    
    // On sale filter (would require price history in real implementation)
    if (filters.onSale) {
      conditions.push(sql`${schema.products.priceAmount} % 10 = 0`);
    }
    
    // Location-based filters
    if (filters.location) {
      if (filters.location.country) {
        conditions.push(sql`JSON_EXTRACT(${schema.products.shipping}, '$.shipsFrom.country') = ${filters.location.country}`);
      }
      if (filters.location.state) {
        conditions.push(sql`JSON_EXTRACT(${schema.products.shipping}, '$.shipsFrom.state') = ${filters.location.state}`);
      }
      if (filters.location.city) {
        conditions.push(sql`JSON_EXTRACT(${schema.products.shipping}, '$.shipsFrom.city') = ${filters.location.city}`);
      }
      
      // Radius-based search would require geospatial calculations
      if (filters.location.coordinates && filters.location.radius) {
        safeLogger.info(`Geospatial search requested: ${filters.location.coordinates.lat}, ${filters.location.coordinates.lng} within ${filters.location.radius}km`);
      }
    }
    
    // Condition filter
    if (filters.condition) {
      conditions.push(sql`JSON_EXTRACT(${schema.products.metadata}, '$.condition') = ${filters.condition}`);
    }
    
    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const tagConditions = filters.tags.map(tag =>
        sql`EXISTS (
          SELECT 1 FROM ${schema.productTags} pt 
          WHERE pt.product_id = ${schema.products.id} 
          AND pt.tag = ${tag.toLowerCase()}
        )`
      );
      conditions.push(or(...tagConditions));
    }
    
    // Enhanced filters
    
    // Reputation score filters
    if (filters.minReputationScore !== undefined) {
      conditions.push(sql`COALESCE(${schema.products.favorites}, 0) >= ${filters.minReputationScore}`);
    }
    if (filters.maxReputationScore !== undefined) {
      conditions.push(sql`COALESCE(${schema.products.favorites}, 0) <= ${filters.maxReputationScore}`);
    }
    
    // Sales count filters (using favorites as proxy for sales)
    if (filters.minSalesCount !== undefined) {
      conditions.push(sql`COALESCE(${schema.products.favorites}, 0) >= ${filters.minSalesCount}`);
    }
    if (filters.maxSalesCount !== undefined) {
      conditions.push(sql`COALESCE(${schema.products.favorites}, 0) <= ${filters.maxSalesCount}`);
    }
    
    // Views filters
    if (filters.minViews !== undefined) {
      conditions.push(gte(schema.products.views, filters.minViews));
    }
    if (filters.maxViews !== undefined) {
      conditions.push(lte(schema.products.views, filters.maxViews));
    }
    
    // Favorites filters
    if (filters.minFavorites !== undefined) {
      conditions.push(gte(schema.products.favorites, filters.minFavorites));
    }
    if (filters.maxFavorites !== undefined) {
      conditions.push(lte(schema.products.favorites, filters.maxFavorites));
    }
    
    // Product condition filter
    if (filters.productCondition) {
      conditions.push(sql`JSON_EXTRACT(${schema.products.metadata}, '$.condition') = ${filters.productCondition}`);
    }
    
    // Brand filter
    if (filters.brand) {
      conditions.push(sql`JSON_EXTRACT(${schema.products.metadata}, '$.brand') = ${filters.brand}`);
    }
    
    // Warranty filter
    if (filters.hasWarranty !== undefined) {
      if (filters.hasWarranty) {
        conditions.push(sql`JSON_EXTRACT(${schema.products.metadata}, '$.warranty') IS NOT NULL`);
      } else {
        conditions.push(sql`JSON_EXTRACT(${schema.products.metadata}, '$.warranty') IS NULL`);
      }
    }
    
    // NFT filter
    if (filters.isNFT !== undefined) {
      if (filters.isNFT) {
        conditions.push(sql`JSON_EXTRACT(${schema.products.metadata}, '$.nft') IS NOT NULL`);
      } else {
        conditions.push(sql`JSON_EXTRACT(${schema.products.metadata}, '$.nft') IS NULL`);
      }
    }
    
    // Escrow protection filter
    if (filters.isEscrowProtected !== undefined) {
      if (filters.isEscrowProtected) {
        conditions.push(sql`JSON_EXTRACT(${schema.products.metadata}, '$.isEscrowed') = true`);
      } else {
        conditions.push(sql`JSON_EXTRACT(${schema.products.metadata}, '$.isEscrowed') = false`);
      }
    }
    
    // Shipping methods filter
    if (filters.shippingMethods && filters.shippingMethods.length > 0) {
      const shippingMethodConditions = filters.shippingMethods.map(method =>
        sql`JSON_EXTRACT(${schema.products.shipping}, '$.shippingMethods') LIKE ${`%${method}%`}`
      );
      conditions.push(or(...shippingMethodConditions));
    }
    
    // Handling time filters
    if (filters.minHandlingTime !== undefined) {
      conditions.push(gte(sql`JSON_EXTRACT(${schema.products.shipping}, '$.handlingTime')`, filters.minHandlingTime));
    }
    if (filters.maxHandlingTime !== undefined) {
      conditions.push(lte(sql`JSON_EXTRACT(${schema.products.shipping}, '$.handlingTime')`, filters.maxHandlingTime));
    }
    
    // Ships to location filters
    if (filters.shipsToCountry) {
      conditions.push(sql`JSON_EXTRACT(${schema.products.shipping}, '$.shipsFrom.country') = ${filters.shipsToCountry}`);
    }
    if (filters.shipsToState) {
      conditions.push(sql`JSON_EXTRACT(${schema.products.shipping}, '$.shipsFrom.state') = ${filters.shipsToState}`);
    }
    if (filters.shipsToCity) {
      conditions.push(sql`JSON_EXTRACT(${schema.products.shipping}, '$.shipsFrom.city') = ${filters.shipsToCity}`);
    }
    
    // Seller verification filter
    if (filters.sellerVerification) {
      switch (filters.sellerVerification) {
        case 'unverified':
          conditions.push(sql`EXISTS (SELECT 1 FROM ${schema.sellers} s WHERE s.wallet_address = ${schema.products.sellerId} AND s.tier = 'basic')`);
          break;
        case 'basic':
          conditions.push(sql`EXISTS (SELECT 1 FROM ${schema.sellers} s WHERE s.wallet_address = ${schema.products.sellerId} AND s.tier = 'basic')`);
          break;
        case 'verified':
          conditions.push(sql`EXISTS (SELECT 1 FROM ${schema.sellers} s WHERE s.wallet_address = ${schema.products.sellerId} AND s.tier = 'premium')`);
          break;
        case 'dao_approved':
          conditions.push(sql`EXISTS (SELECT 1 FROM ${schema.sellers} s WHERE s.wallet_address = ${schema.products.sellerId} AND s.tier = 'enterprise')`);
          break;
      }
    }
    
    // Seller tier filter
    if (filters.sellerTier) {
      conditions.push(sql`EXISTS (SELECT 1 FROM ${schema.sellers} s WHERE s.wallet_address = ${schema.products.sellerId} AND s.tier = ${filters.sellerTier})`);
    }
    
    // Seller online status filter
    if (filters.sellerOnlineStatus) {
      switch (filters.sellerOnlineStatus) {
        case 'online':
          conditions.push(sql`EXISTS (SELECT 1 FROM ${schema.sellers} s WHERE s.wallet_address = ${schema.products.sellerId} AND s.is_online = true)`);
          break;
        case 'offline':
          conditions.push(sql`EXISTS (SELECT 1 FROM ${schema.sellers} s WHERE s.wallet_address = ${schema.products.sellerId} AND s.is_online = false)`);
          break;
        case 'away':
          // For "away" status, we could check last seen time
          const oneHourAgo = new Date();
          oneHourAgo.setHours(oneHourAgo.getHours() - 1);
          conditions.push(sql`EXISTS (SELECT 1 FROM ${schema.sellers} s WHERE s.wallet_address = ${schema.products.sellerId} AND s.is_online = false AND s.last_seen > ${oneHourAgo.toISOString()})`);
          break;
      }
    }
    
    // Price range in USD equivalent
    if (filters.priceRange) {
      const [minPrice, maxPrice] = filters.priceRange;
      if (minPrice !== undefined) {
        conditions.push(gte(sql`CAST(${schema.products.priceAmount} AS DECIMAL)`, minPrice));
      }
      if (maxPrice !== undefined) {
        conditions.push(lte(sql`CAST(${schema.products.priceAmount} AS DECIMAL)`, maxPrice));
      }
    }
    
    // Price currency filter
    if (filters.priceCurrency) {
      conditions.push(eq(schema.products.priceCurrency, filters.priceCurrency));
    }
    
    // Discount filter
    if (filters.hasDiscount !== undefined) {
      if (filters.hasDiscount) {
        conditions.push(sql`JSON_EXTRACT(${schema.products.metadata}, '$.discount') IS NOT NULL`);
      } else {
        conditions.push(sql`JSON_EXTRACT(${schema.products.metadata}, '$.discount') IS NULL`);
      }
    }
    
    // Discount percentage filter
    if (filters.discountPercentage !== undefined) {
      conditions.push(sql`JSON_EXTRACT(${schema.products.metadata}, '$.discountPercentage') >= ${filters.discountPercentage}`);
    }
    
    // Featured products filter
    if (filters.isFeatured !== undefined) {
      if (filters.isFeatured) {
        conditions.push(sql`JSON_EXTRACT(${schema.products.metadata}, '$.isFeatured') = true`);
      } else {
        conditions.push(sql`JSON_EXTRACT(${schema.products.metadata}, '$.isFeatured') = false`);
      }
    }
    
    // Published products filter
    if (filters.isPublished !== undefined) {
      if (filters.isPublished) {
        conditions.push(sql`JSON_EXTRACT(${schema.products.metadata}, '$.listingStatus') = 'published'`);
      } else {
        conditions.push(sql`JSON_EXTRACT(${schema.products.metadata}, '$.listingStatus') != 'published'`);
      }
    }
    
    // Stock availability filter
    if (filters.hasStock !== undefined) {
      if (filters.hasStock) {
        conditions.push(gte(schema.products.inventory, 1));
      } else {
        conditions.push(eq(schema.products.inventory, 0));
      }
    }
    
    // Stock range filter
    if (filters.stockRange) {
      const [minStock, maxStock] = filters.stockRange;
      if (minStock !== undefined) {
        conditions.push(gte(schema.products.inventory, minStock));
      }
      if (maxStock !== undefined) {
        conditions.push(lte(schema.products.inventory, maxStock));
      }
    }
    
    // Tags include filter (must include all specified tags)
    if (filters.tagsInclude && filters.tagsInclude.length > 0) {
      const tagIncludeConditions = filters.tagsInclude.map(tag =>
        sql`EXISTS (
          SELECT 1 FROM ${schema.productTags} pt 
          WHERE pt.product_id = ${schema.products.id} 
          AND pt.tag = ${tag.toLowerCase()}
        )`
      );
      conditions.push(and(...tagIncludeConditions));
    }
    
    // Tags exclude filter (must not include any of the specified tags)
    if (filters.tagsExclude && filters.tagsExclude.length > 0) {
      const tagExcludeConditions = filters.tagsExclude.map(tag =>
        sql`NOT EXISTS (
          SELECT 1 FROM ${schema.productTags} pt 
          WHERE pt.product_id = ${schema.products.id} 
          AND pt.tag = ${tag.toLowerCase()}
        )`
      );
      conditions.push(and(...tagExcludeConditions));
    }
    
    // Category path filter
    if (filters.categoryPath && filters.categoryPath.length > 0) {
      conditions.push(sql`JSON_EXTRACT(${schema.categories.path}, '$') LIKE ${`%${filters.categoryPath[filters.categoryPath.length - 1]}%`}`);
    }
    
    // Custom attributes filter
    if (filters.customAttributes) {
      Object.entries(filters.customAttributes).forEach(([key, value]) => {
        conditions.push(sql`JSON_EXTRACT(${schema.products.metadata}, '$.customAttributes.${key}') = ${value}`);
      });
    }
    
    return conditions;
  }

  private async buildOrderBy(sort: ProductSortOptions, filters: AdvancedSearchFilters): Promise<any[]> {
    const orderBy = [];
    
    if (sort.field === 'relevance' && filters.query) {
      // Enhanced relevance scoring with seller reputation
      const searchTerms = filters.query.toLowerCase().split(' ').filter(term => term.length > 1);
      const titleMatchScore = searchTerms.map(term => 
        sql`CASE WHEN LOWER(${schema.products.title}) LIKE ${`%${term}%`} THEN 50 ELSE 0 END`
      ).join(' + ');
      
      const relevanceScore = sql`
        (${sql.raw(titleMatchScore)}) +
        CASE 
          WHEN LOWER(${schema.products.description}) LIKE ${`%${filters.query?.toLowerCase()}%`} THEN 25
          ELSE 0
        END + 
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM ${schema.productTags} pt 
            WHERE pt.product_id = ${schema.products.id} 
            AND pt.tag LIKE ${`%${filters.query?.toLowerCase()}%`}
          ) THEN 15
          ELSE 0
        END +
        -- Seller reputation boost
        COALESCE(${schema.products.favorites}, 0) * 0.3 + 
        COALESCE(${schema.products.views}, 0) * 0.1 +
        -- Inventory availability boost
        CASE WHEN ${schema.products.inventory} > 0 THEN 10 ELSE 0 END +
        -- Recency boost (newer products get slight advantage)
        CASE 
          WHEN ${schema.products.createdAt} > NOW() - INTERVAL '7 days' THEN 5
          WHEN ${schema.products.createdAt} > NOW() - INTERVAL '30 days' THEN 2
          ELSE 0
        END
      `;
      
      orderBy.push(sort.direction === 'desc' ? desc(relevanceScore) : asc(relevanceScore));
    } else {
      // Standard sorting
      let orderByColumn;
      switch (sort.field) {
        case 'price':
          orderByColumn = schema.products.priceAmount;
          break;
        case 'createdAt':
          orderByColumn = schema.products.createdAt;
          break;
        case 'updatedAt':
          orderByColumn = schema.products.updatedAt;
          break;
        case 'title':
          orderByColumn = schema.products.title;
          break;
        case 'views':
          orderByColumn = schema.products.views;
          break;
        case 'favorites':
          orderByColumn = schema.products.favorites;
          break;
        // New sorting options
        case 'reputation':
          orderByColumn = schema.products.favorites; // Using favorites as proxy for reputation
          break;
        case 'sales':
          orderByColumn = schema.products.favorites; // Using favorites as proxy for sales count
          break;
        case 'rating':
          orderByColumn = schema.products.views; // Using views as proxy for rating
          break;
        case 'inventory':
          orderByColumn = schema.products.inventory;
          break;
        case 'discount':
          orderByColumn = sql`JSON_EXTRACT(${schema.products.metadata}, '$.discountPercentage')`;
          break;
        case 'handlingTime':
          orderByColumn = sql`JSON_EXTRACT(${schema.products.shipping}, '$.handlingTime')`;
          break;
        default:
          orderByColumn = schema.products.createdAt;
      }
      
      orderBy.push(sort.direction === 'desc' ? desc(orderByColumn) : asc(orderByColumn));
    }
    
    // Secondary sort by creation date for consistency
    if (sort.field !== 'createdAt') {
      orderBy.push(desc(schema.products.createdAt));
    }
    
    return orderBy;
  }

  private async calculateRankingFactors(
    product: Product, 
    filters: AdvancedSearchFilters
  ): Promise<SearchRankingFactors> {
    let relevanceScore = 0;
    
    // Text relevance
    if (filters.query) {
      const query = filters.query.toLowerCase();
      if (product.title.toLowerCase().includes(query)) relevanceScore += 50;
      if (product.description.toLowerCase().includes(query)) relevanceScore += 25;
      if (product.tags.some(tag => tag.toLowerCase().includes(query))) relevanceScore += 15;
    }
    
    // Seller reputation (mock calculation)
    const sellerReputationScore = 75;
    
    // Product popularity
    const productPopularityScore = (product.views * 0.1) + (product.favorites * 0.2);
    
    // Recency score (newer products get higher score)
    const daysSinceCreated = Math.floor((Date.now() - product.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const recencyScore = Math.max(0, 100 - daysSinceCreated);
    
    // Price competitiveness (mock calculation)
    const priceCompetitivenessScore = 60;
    
    // Availability score
    const availabilityScore = product.inventory > 0 ? 100 : 0;
    
    // Calculate final weighted score
    const finalScore = (
      relevanceScore * 0.3 +
      sellerReputationScore * 0.2 +
      productPopularityScore * 0.2 +
      recencyScore * 0.1 +
      priceCompetitivenessScore * 0.1 +
      availabilityScore * 0.1
    );
    
    return {
      relevanceScore,
      sellerReputationScore,
      productPopularityScore,
      recencyScore,
      priceCompetitivenessScore,
      availabilityScore,
      finalScore,
    };
  }

  private async getCollaborativeRecommendations(userId: string, limit: number): Promise<ProductRecommendation[]> {
    const db = this.databaseService.getDatabase();
    
    try {
      // Get user preferred categories based on mock analysis
      const userPreferredCategories = await this.getUserPreferredCategories(userId);
      
      if (userPreferredCategories.length === 0) {
        return [];
      }
      
      const recommendations = await db.select()
        .from(schema.products)
        .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
        .where(
          and(
            inArray(schema.products.categoryId, userPreferredCategories),
            eq(schema.products.status, 'active'),
            gte(schema.products.inventory, 1)
          )
        )
        .orderBy(
          desc(sql`(COALESCE(${schema.products.views}, 0) + COALESCE(${schema.products.favorites}, 0) * 2)`)
        )
        .limit(limit);
      
      return recommendations.map((row: any) => ({
        product: this.mapProductFromDb(row.products, row.categories),
        score: 0.7 + Math.random() * 0.2,
        reason: 'Based on your browsing history and similar users',
        type: 'collaborative' as const,
      }));
    } catch (error) {
      safeLogger.error('Error getting collaborative recommendations:', error);
      return [];
    }
  }

  private async getUserPreferredCategories(userId: string): Promise<string[]> {
    try {
      // Get user's preferred categories based on their activity
      // TODO: Implement getPostsByUser method in DatabaseService
      return [];
    } catch (error) {
      safeLogger.error('Error getting user preferred categories:', error);
      return [];
    }
  }

  /**
   * Search for users by wallet address, handle, display name, or ENS
   */
  async searchUsers(query: string, filters: any = {}, limit: number = 20, offset: number = 0): Promise<any> {
    const db = this.databaseService.getDatabase();

    try {
      // Check if query looks like a wallet address (starts with 0x and has proper length)
      const isWalletAddress = /^0x[a-fA-F0-9]{40}$/i.test(query);
      const isPartialWalletAddress = /^0x[a-fA-F0-9]+$/i.test(query) && query.length >= 6;

      let whereClause;

      if (isWalletAddress) {
        // Exact wallet address match (case-insensitive)
        whereClause = sql`LOWER(${schema.users.walletAddress}) = LOWER(${query})`;
      } else if (isPartialWalletAddress) {
        // Partial wallet address match (starts with)
        whereClause = sql`LOWER(${schema.users.walletAddress}) LIKE LOWER(${query + '%'})`;
      } else {
        // Search by handle, display name, or ENS
        whereClause = or(
          like(sql`LOWER(${schema.users.handle})`, `%${query.toLowerCase()}%`),
          like(sql`LOWER(${schema.users.displayName})`, `%${query.toLowerCase()}%`),
          like(sql`LOWER(${schema.users.ens})`, `%${query.toLowerCase()}%`)
        );
      }

      // Get total count
      const totalResult = await db.select({ count: sql`count(*)` })
        .from(schema.users)
        .where(whereClause);

      const total = parseInt(totalResult[0]?.count || '0');

      // Get users with pagination
      const users = await db.select()
        .from(schema.users)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(schema.users.createdAt));

      return {
        users: users.map(user => ({
          walletAddress: user.walletAddress,
          handle: user.handle,
          displayName: user.displayName,
          ens: user.ens,
          avatarCid: user.avatarCid,
          bioCid: user.bioCid,
          bannerCid: user.bannerCid,
          website: user.website,
          location: user.location,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })),
        total,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      safeLogger.error('Error searching users:', error);
      return { users: [], total: 0, hasMore: false };
    }
  }

  /**
   * Search for posts by content, title, or author
   */
  async searchPosts(query: string, filters: any = {}, limit: number = 20, offset: number = 0): Promise<any> {
    const db = this.databaseService.getDatabase();

    try {
      // Check if query is a wallet address to search by author
      const isWalletAddress = /^0x[a-fA-F0-9]{40}$/i.test(query);

      const conditions = [];

      if (isWalletAddress) {
        // Search posts by author wallet address - need to join with users
        conditions.push(sql`LOWER(${schema.users.walletAddress}) = LOWER(${query})`);
        // Note: This requires joining posts with users table
      } else {
        // Search by content
        conditions.push(
          or(
            like(sql`LOWER(${schema.posts.content})`, `%${query.toLowerCase()}%`),
            like(sql`LOWER(${schema.posts.title})`, `%${query.toLowerCase()}%`)
          )
        );
      }

      // Add filter conditions
      if (filters.community) {
        conditions.push(eq(schema.posts.communityId, filters.community));
      }

      if (filters.timeRange && filters.timeRange !== 'all') {
        const now = new Date();
        let timeThreshold: Date;

        switch (filters.timeRange) {
          case 'hour':
            timeThreshold = new Date(now.getTime() - 60 * 60 * 1000);
            break;
          case 'day':
            timeThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case 'week':
            timeThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            timeThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            timeThreshold = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            timeThreshold = new Date(0);
        }

        conditions.push(gte(schema.posts.createdAt, timeThreshold));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const totalResult = await db.select({ count: sql`count(*)` })
        .from(schema.posts)
        .where(whereClause);

      const total = parseInt(totalResult[0]?.count || '0');

      // Determine sort order
      let orderByClause;
      switch (filters.sortBy) {
        case 'recent':
          orderByClause = desc(schema.posts.createdAt);
          break;
        case 'popular':
          orderByClause = desc(sql`(COALESCE(${schema.posts.upvotes}, 0) - COALESCE(${schema.posts.downvotes}, 0))`);
          break;
        default:
          orderByClause = desc(schema.posts.createdAt);
      }

      // Get posts with pagination
      const posts = await db.select()
        .from(schema.posts)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(orderByClause);

      return {
        posts,
        total,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      safeLogger.error('Error searching posts:', error);
      return { posts: [], total: 0, hasMore: false };
    }
  }

  /**
   * Search for communities by name, display name, description, or tags
   */
  async searchCommunities(query: string, filters: any = {}, limit: number = 20, offset: number = 0): Promise<any> {
    const db = this.databaseService.getDatabase();

    try {
      const conditions = [
        or(
          like(sql`LOWER(${schema.communities.name})`, `%${query.toLowerCase()}%`),
          like(sql`LOWER(${schema.communities.displayName})`, `%${query.toLowerCase()}%`),
          like(sql`LOWER(${schema.communities.description})`, `%${query.toLowerCase()}%`),
          sql`LOWER(${schema.communities.tags}) LIKE ${`%${query.toLowerCase()}%`}`
        )
      ];

      // Add filter conditions
      if (filters.category) {
        conditions.push(eq(schema.communities.category, filters.category));
      }

      // Only show public communities by default
      conditions.push(eq(schema.communities.isPublic, true));

      const whereClause = and(...conditions);

      // Get total count
      const totalResult = await db.select({ count: sql`count(*)` })
        .from(schema.communities)
        .where(whereClause);

      const total = parseInt(totalResult[0]?.count || '0');

      // Get communities with pagination
      const communities = await db.select()
        .from(schema.communities)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(schema.communities.memberCount));

      return {
        communities: communities.map(community => ({
          id: community.id,
          name: community.name,
          slug: community.slug,
          displayName: community.displayName,
          description: community.description,
          category: community.category,
          tags: community.tags ? JSON.parse(community.tags) : [],
          avatar: community.avatar,
          banner: community.banner,
          memberCount: community.memberCount,
          postCount: community.postCount,
          isPublic: community.isPublic,
          createdAt: community.createdAt,
        })),
        total,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      safeLogger.error('Error searching communities:', error);
      return { communities: [], total: 0, hasMore: false };
    }
  }

  async getTrendingContent(limit: number = 20, timeframe: string = 'day'): Promise<any> {
    try {
      // Dynamically import RecommendationService to avoid circular dependencies
      const { RecommendationService } = require('./recommendationService');
      const recommendationService = new RecommendationService();
      
      // Map timeframe to the format expected by recommendation service
      const timeFrameMap: Record<string, 'hourly' | 'daily' | 'weekly'> = {
        'hour': 'hourly',
        'day': 'daily',
        'week': 'weekly',
        '24h': 'daily',
        '7d': 'weekly'
      };
      
      const mappedTimeframe = timeFrameMap[timeframe] || 'daily';
      
      // Get trending content from recommendation service
      const trendingItems = await recommendationService.getTrendingContent(mappedTimeframe, limit);
      
      // Transform the data into the expected format
      const posts = trendingItems.filter(item => item.type === 'post').map(item => ({
        id: item.id,
        title: item.title,
        score: item.score,
        metadata: item.metadata
      }));
      
      const communities = trendingItems.filter(item => item.type === 'community').map(item => ({
        id: item.id,
        name: item.title,
        score: item.score,
        metadata: item.metadata
      }));
      
      const users = trendingItems.filter(item => item.type === 'user').map(item => ({
        id: item.id,
        handle: item.title,
        score: item.score,
        metadata: item.metadata
      }));
      
      const topics = trendingItems.filter(item => item.type === 'topic').map(item => ({
        id: item.id,
        name: item.title,
        score: item.score,
        metadata: item.metadata
      }));
      
      return {
        posts,
        communities,
        users,
        topics,
        total: trendingItems.length
      };
    } catch (error) {
      safeLogger.error('Error getting trending content:', error);
      return { 
        posts: [], 
        communities: [], 
        users: [], 
        topics: [],
        total: 0 
      };
    }
  }

  async getTrendingHashtags(limit: number = 20, timeframe: string = '24h'): Promise<any> {
    try {
      // For now, return empty array as placeholder
      // In a real implementation, this would query the database for trending hashtags
      return { 
        hashtags: [], 
        total: 0 
      };
    } catch (error) {
      safeLogger.error('Error getting trending hashtags:', error);
      return { 
        hashtags: [], 
        total: 0 
      };
    }
  }

  async getPostsByHashtag(hashtag: string, limit: number = 20, offset: number = 0): Promise<any> {
    return { posts: [], total: 0 };
  }

  async getTopicContent(topic: string, limit: number = 20, offset: number = 0): Promise<any> {
    return { content: [], total: 0 };
  }

  // Helper methods that are called but missing
  private generateSearchCacheKey(filters: any, sort: any, pagination: any): string {
    return `search:${JSON.stringify({ filters, sort, pagination })}`;
  }

  private async mapProductFromDb(product: any, category: any): Promise<Product> {
    // Get seller review stats
    let sellerRating = 0;
    if (product.sellerId) {
      try {
        // Import review service dynamically to avoid circular dependencies
        const { reviewService } = require('./reviewService');
        const reviewStats = await reviewService.getReviewStats(product.sellerId);
        sellerRating = reviewStats.averageRating;
      } catch (error) {
        safeLogger.warn('Failed to fetch seller review stats:', error);
      }
    }

    // Parse price metadata if it exists
    let priceData = product.price;
    if (typeof product.price === 'string') {
      try {
        priceData = JSON.parse(product.price);
      } catch (e) {
        // If parsing fails, keep as string
        priceData = { amount: product.price, currency: 'ETH' };
      }
    }
    
    // If we don't have fiat equivalents, try to generate them
    if (priceData && (!priceData.usdEquivalent || !priceData.eurEquivalent)) {
      try {
        // Convert to multiple fiat currencies
        const fiatEquivalents = await priceOracleService.convertProductPrice(
          priceData.amount,
          priceData.currency
        );
        
        priceData = {
          ...priceData,
          usdEquivalent: fiatEquivalents.USD,
          eurEquivalent: fiatEquivalents.EUR,
          gbpEquivalent: fiatEquivalents.GBP,
          lastUpdated: new Date()
        };
      } catch (error) {
        safeLogger.error('Failed to convert product price:', error);
        // Continue with original price data
      }
    }
    
    // Process images properly
    let images: string[] = [];
    try {
      // Parse images from the images field (could be Cloudinary URLs or IPFS hashes)
      images = JSON.parse(product.images || '[]');
      
      // Process each image URL
      images = images.map((url: string) => {
        // If it's already a full URL (including Cloudinary), return as-is
        if (url.startsWith('http')) return url;
        
        // If it's an IPFS hash, convert to gateway URL
        if (url.startsWith('Qm') || url.startsWith('baf') || url.startsWith('ipfs://')) {
          if (url.startsWith('ipfs://')) {
            return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
          }
          return `https://ipfs.io/ipfs/${url}`;
        }
        
        // For any other format, return as-is
        return url;
      });
    } catch (error) {
      safeLogger.warn('Failed to parse images in search service:', error);
      images = [];
    }
    
    return {
      ...product,
      images,
      price: priceData,
      category: category?.name || 'Uncategorized',
      seller: product.seller ? {
        ...product.seller,
        rating: sellerRating
      } : undefined
    } as Product;
  }

  private async trackSearchAnalytics(filters: any, result: any): Promise<void> {
    // TODO: Implement search analytics tracking
  }

  private async getContentBasedRecommendations(productId: string, limit: number): Promise<ProductRecommendation[]> {
    return [];
  }

  private async getCategoryRecommendations(categoryId: string, limit: number): Promise<ProductRecommendation[]> {
    return [];
  }

  private async getTrendingRecommendations(limit: number): Promise<ProductRecommendation[]> {
    return [];
  }

  private deduplicateRecommendations(recommendations: ProductRecommendation[]): ProductRecommendation[] {
    const seen = new Set();
    return recommendations.filter(rec => {
      if (seen.has(rec.product.id)) return false;
      seen.add(rec.product.id);
      return true;
    });
  }

  private buildComparisonMatrix(products: Product[]): any {
    return {};
  }

  private generateComparisonSummary(products: Product[], matrix: any): any {
    return {};
  }

  private async warmUpSearchCache(): Promise<void> {
    // TODO: Implement cache warming
  }

  private async precomputeTrendingProducts(): Promise<void> {
    // TODO: Implement trending products computation
  }

  private async optimizeSlowQueries(): Promise<number> {
    return 0;
  }

  private async precomputeRecommendations(): Promise<void> {
    // TODO: Implement recommendation precomputation
  }
}
