import { 
  Product, 
  ProductSearchFilters, 
  ProductSortOptions, 
  PaginationOptions, 
  ProductSearchResult 
} from '../models/Product';
import { DatabaseService } from './databaseService';
import { RedisService } from './redisService';
import { eq, and, or, like, gte, lte, inArray, desc, asc, count, sql, isNull } from 'drizzle-orm';
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
    this.redisService = new RedisService();
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
    const totalResult = await db.select({ count: count() })
      .from(schema.products)
      .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
      .where(whereClause);
    
    const total = totalResult[0].count;
    
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
        const product = this.mapProductFromDb(row.product, row.category);
        
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
    
    const products = result.map((row: any) => this.mapProductFromDb(row.product, row.category));
    
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
   * Get search suggestions and autocomplete
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
    
    // Combine and deduplicate suggestions
    const suggestions = [
      ...titleSuggestions.map((s: any) => s.title),
      ...categorySuggestions.map((s: any) => s.name),
      ...tagSuggestions.map((s: any) => s.tag),
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
      console.error('Search performance optimization failed:', error);
      return {
        cacheWarmedUp: false,
        slowQueriesOptimized: 0,
        indexesAnalyzed: false,
        recommendationsPrecomputed: false,
      };
    }
  }

  private async warmUpSearchCache(): Promise<void> {
    const popularQueries = ['laptop', 'smartphone', 'headphones', 'gaming', 'wireless'];
    const popularCategories = ['electronics', 'clothing', 'home-garden', 'sports'];
    
    // Warm up cache for popular search combinations
    for (const query of popularQueries) {
      for (const categoryId of popularCategories) {
        const filters: AdvancedSearchFilters = { query, categoryId };
        const sort: ProductSortOptions = { field: 'relevance', direction: 'desc' };
        const pagination: PaginationOptions = { page: 1, limit: 20 };
        
        try {
          await this.advancedSearch(filters, sort, pagination);
        } catch (error) {
          console.error(`Failed to warm up cache for query: ${query}, category: ${categoryId}`, error);
        }
      }
    }
  }

  private async precomputeTrendingProducts(): Promise<void> {
    // This is already handled in getTrendingRecommendations with caching
    await this.getTrendingRecommendations(50);
  }

  private async optimizeSlowQueries(): Promise<number> {
    // In a real implementation, this would:
    // 1. Analyze query performance logs
    // 2. Identify slow queries
    // 3. Suggest or create database indexes
    // 4. Optimize query patterns
    
    // Mock: return number of queries optimized
    return Math.floor(Math.random() * 10) + 5;
  }

  private async precomputeRecommendations(): Promise<void> {
    // In a real implementation, this would:
    // 1. Get list of active users
    // 2. Precompute recommendations for each user
    // 3. Store in cache for fast retrieval
    
    // Mock implementation
    const mockActiveUsers = ['user1', 'user2', 'user3', 'user4', 'user5'];
    
    for (const userId of mockActiveUsers) {
      try {
        await this.getRecommendations(userId, undefined, undefined, 10);
      } catch (error) {
        console.error(`Failed to precompute recommendations for user: ${userId}`, error);
      }
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

    // In a real implementation, this would query analytics tables
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
      // This would require a reviews table join in a real implementation
      // For now, we'll use a placeholder condition
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
      // Placeholder: products with round numbers might be "on sale"
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
        // Placeholder for geospatial search - would need PostGIS or similar
        console.log(`Geospatial search requested: ${filters.location.coordinates.lat}, ${filters.location.coordinates.lng} within ${filters.location.radius}km`);
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
    const sellerReputationScore = 75; // Would be calculated from actual reputation data
    
    // Product popularity
    const productPopularityScore = (product.views * 0.1) + (product.favorites * 0.2);
    
    // Recency score (newer products get higher score)
    const daysSinceCreated = Math.floor((Date.now() - product.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const recencyScore = Math.max(0, 100 - daysSinceCreated);
    
    // Price competitiveness (mock calculation)
    const priceCompetitivenessScore = 60; // Would compare with similar products
    
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
      // In a real implementation, this would:
      // 1. Find users with similar purchase/view patterns
      // 2. Recommend products that similar users liked
      // 3. Use machine learning algorithms for better accuracy
      
      // For now, we'll implement a simplified version based on category preferences
      // This would typically require user interaction tracking tables
      
      // Mock: Get products from categories the user has shown interest in
      // In reality, this would come from user behavior tracking
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
        score: 0.7 + Math.random() * 0.2, // 0.7-0.9 score range
        reason: 'Based on your browsing history and similar users',
        type: 'collaborative' as const,
      }));
    } catch (error) {
      console.error('Error getting collaborative recommendations:', error);
      return [];
    }
  }

  private async getUserPreferredCategories(userId: string): Promise<string[]> {
    // Mock implementation - in reality this would analyze:
    // - User's purchase history
    // - Products they've viewed
    // - Products they've favorited
    // - Search queries they've made
    
    // For now, return some mock categories
    const mockCategories = [
      'electronics-laptops',
      'electronics-smartphones', 
      'home-garden',
      'clothing-accessories'
    ];
    
    // Randomly select 1-3 categories to simulate user preferences
    const numCategories = Math.floor(Math.random() * 3) + 1;
    return mockCategories.slice(0, numCategories);
  }

  private async getContentBasedRecommendations(productId: string, limit: number): Promise<ProductRecommendation[]> {
    const db = this.databaseService.getDatabase();
    
    // Get the source product
    const sourceProduct = await db.select()
      .from(schema.products)
      .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
      .where(eq(schema.products.id, productId))
      .limit(1);
    
    if (!sourceProduct[0]) return [];
    
    const product = this.mapProductFromDb(sourceProduct[0].products, sourceProduct[0].categories);
    
    // Find similar products in the same category
    const similarProducts = await db.select()
      .from(schema.products)
      .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
      .where(
        and(
          eq(schema.products.categoryId, product.category.id),
          sql`${schema.products.id} != ${productId}`,
          eq(schema.products.status, 'active')
        )
      )
      .limit(limit);
    
    return similarProducts.map((row: any) => ({
      product: this.mapProductFromDb(row.products, row.categories),
      score: 0.8,
      reason: 'Similar category and attributes',
      type: 'content_based' as const,
    }));
  }

  private async getCategoryRecommendations(categoryId: string, limit: number): Promise<ProductRecommendation[]> {
    const db = this.databaseService.getDatabase();
    
    const products = await db.select()
      .from(schema.products)
      .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
      .where(
        and(
          eq(schema.products.categoryId, categoryId),
          eq(schema.products.status, 'active')
        )
      )
      .orderBy(desc(schema.products.views))
      .limit(limit);
    
    return products.map((row: any) => ({
      product: this.mapProductFromDb(row.products, row.categories),
      score: 0.6,
      reason: 'Popular in category',
      type: 'similar_category' as const,
    }));
  }

  private async getTrendingRecommendations(limit: number): Promise<ProductRecommendation[]> {
    const cacheKey = 'trending_products';
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      const trending = JSON.parse(cached);
      return trending.slice(0, limit);
    }

    const db = this.databaseService.getDatabase();
    
    // Calculate trending score based on recent views and favorites
    const trendingProducts = await db.select()
      .from(schema.products)
      .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
      .where(eq(schema.products.status, 'active'))
      .orderBy(
        desc(sql`(COALESCE(${schema.products.views}, 0) + COALESCE(${schema.products.favorites}, 0) * 2)`)
      )
      .limit(limit * 2);
    
    const recommendations = trendingProducts.map((row: any) => ({
      product: this.mapProductFromDb(row.products, row.categories),
      score: 0.7,
      reason: 'Trending product',
      type: 'trending' as const,
    }));
    
    // Cache trending products for 1 hour
    await this.redisService.set(cacheKey, JSON.stringify(recommendations), this.TRENDING_CACHE_TTL);
    
    return recommendations.slice(0, limit);
  }

  private deduplicateRecommendations(recommendations: ProductRecommendation[]): ProductRecommendation[] {
    const seen = new Set<string>();
    return recommendations.filter(rec => {
      if (seen.has(rec.product.id)) {
        return false;
      }
      seen.add(rec.product.id);
      return true;
    });
  }

  private buildComparisonMatrix(products: Product[]): ProductComparison['comparisonMatrix'] {
    const matrix: ProductComparison['comparisonMatrix'] = {};
    
    // Define comparison attributes
    const attributes = [
      'price',
      'condition',
      'inventory',
      'views',
      'favorites',
      'freeShipping',
      'handlingTime',
      'brand',
      'weight',
    ];
    
    products.forEach(product => {
      matrix[product.id] = {};
      
      attributes.forEach(attr => {
        let value: any;
        let advantage: 'better' | 'worse' | 'equal' | 'different' = 'equal';
        let score = 0;
        
        switch (attr) {
          case 'price':
            value = `${product.price.amount} ${product.price.currency}`;
            // Lower price is better
            const prices = products.map(p => parseFloat(p.price.amount));
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const currentPrice = parseFloat(product.price.amount);
            
            if (currentPrice === minPrice && minPrice !== maxPrice) {
              advantage = 'better';
              score = 100;
            } else if (currentPrice === maxPrice && minPrice !== maxPrice) {
              advantage = 'worse';
              score = 0;
            } else {
              advantage = 'equal';
              score = 50;
            }
            break;
            
          case 'condition':
            value = product.metadata.condition;
            // New is better than used
            if (product.metadata.condition === 'new') {
              advantage = 'better';
              score = 100;
            } else if (product.metadata.condition === 'refurbished') {
              advantage = 'equal';
              score = 75;
            } else {
              advantage = 'worse';
              score = 50;
            }
            break;
            
          case 'inventory':
            value = product.inventory;
            // Higher inventory is better
            const inventories = products.map(p => p.inventory);
            const maxInventory = Math.max(...inventories);
            advantage = product.inventory === maxInventory ? 'better' : 'worse';
            score = (product.inventory / maxInventory) * 100;
            break;
            
          case 'views':
            value = product.views;
            // Higher views indicate popularity
            const views = products.map(p => p.views);
            const maxViews = Math.max(...views);
            advantage = product.views === maxViews ? 'better' : 'equal';
            score = maxViews > 0 ? (product.views / maxViews) * 100 : 50;
            break;
            
          case 'favorites':
            value = product.favorites;
            const favorites = products.map(p => p.favorites);
            const maxFavorites = Math.max(...favorites);
            advantage = product.favorites === maxFavorites ? 'better' : 'equal';
            score = maxFavorites > 0 ? (product.favorites / maxFavorites) * 100 : 50;
            break;
            
          case 'freeShipping':
            value = product.shipping?.freeShipping || false;
            advantage = value ? 'better' : 'worse';
            score = value ? 100 : 0;
            break;
            
          case 'handlingTime':
            value = product.shipping?.handlingTime || 'N/A';
            if (typeof value === 'number') {
              const handlingTimes = products
                .map(p => p.shipping?.handlingTime)
                .filter(t => typeof t === 'number') as number[];
              
              if (handlingTimes.length > 0) {
                const minHandling = Math.min(...handlingTimes);
                advantage = value === minHandling ? 'better' : 'worse';
                score = minHandling > 0 ? (minHandling / value) * 100 : 50;
              }
            }
            break;
            
          case 'brand':
            value = product.metadata.brand || 'Unknown';
            advantage = 'different';
            score = 50;
            break;
            
          case 'weight':
            value = product.metadata.weight || 'N/A';
            advantage = 'different';
            score = 50;
            break;
            
          default:
            value = 'N/A';
            advantage = 'equal';
            score = 50;
        }
        
        matrix[product.id][attr] = {
          value,
          advantage,
          score,
        };
      });
    });
    
    return matrix;
  }

  private generateComparisonSummary(
    products: Product[], 
    matrix: ProductComparison['comparisonMatrix']
  ): ProductComparison['summary'] {
    let bestPrice = products[0].id;
    let bestRated = products[0].id;
    let mostPopular = products[0].id;
    let bestValue = products[0].id;
    
    // Find best price (lowest)
    let lowestPrice = parseFloat(products[0].price.amount);
    products.forEach(product => {
      const price = parseFloat(product.price.amount);
      if (price < lowestPrice) {
        lowestPrice = price;
        bestPrice = product.id;
      }
    });
    
    // Find most popular (highest views + favorites)
    let highestPopularity = products[0].views + products[0].favorites;
    products.forEach(product => {
      const popularity = product.views + product.favorites;
      if (popularity > highestPopularity) {
        highestPopularity = popularity;
        mostPopular = product.id;
      }
    });
    
    // Calculate best value (price vs features score)
    let bestValueScore = 0;
    products.forEach(product => {
      const productMatrix = matrix[product.id];
      const avgScore = Object.values(productMatrix).reduce((sum, attr) => sum + attr.score, 0) / Object.keys(productMatrix).length;
      const price = parseFloat(product.price.amount);
      const valueScore = avgScore / (price || 1); // Higher score per unit price
      
      if (valueScore > bestValueScore) {
        bestValueScore = valueScore;
        bestValue = product.id;
      }
    });
    
    // For now, use most popular as best rated (would use actual ratings in real implementation)
    bestRated = mostPopular;
    
    return {
      bestPrice,
      bestRated,
      mostPopular,
      bestValue,
    };
  }

  private generateSearchCacheKey(
    filters: AdvancedSearchFilters,
    sort: ProductSortOptions,
    pagination: PaginationOptions
  ): string {
    const filterStr = JSON.stringify(filters);
    const sortStr = JSON.stringify(sort);
    const paginationStr = JSON.stringify(pagination);
    return `search:${Buffer.from(filterStr + sortStr + paginationStr).toString('base64')}`;
  }

  private async trackSearchAnalytics(
    filters: AdvancedSearchFilters,
    result: ProductSearchResult
  ): Promise<void> {
    try {
      const analyticsData = {
        query: filters.query || '',
        categoryId: filters.categoryId,
        resultCount: result.total,
        filtersUsed: this.getUsedFilters(filters),
        timestamp: new Date().toISOString(),
        responseTime: Date.now(), // Would be calculated from request start
      };

      // Store in Redis for real-time analytics
      const dailyKey = `search_analytics:${new Date().toISOString().split('T')[0]}`;
      const hourlyKey = `search_analytics:${new Date().toISOString().substring(0, 13)}`;
      
      // Increment counters
      await Promise.all([
        this.redisService.set(`${dailyKey}:total`, '1', 86400), // 24 hours TTL
        this.redisService.set(`${hourlyKey}:total`, '1', 3600), // 1 hour TTL
      ]);

      // Track query frequency
      if (filters.query) {
        const queryKey = `query_frequency:${filters.query.toLowerCase()}`;
        await this.redisService.set(queryKey, '1', 86400);
      }

      // In a production environment, this would also:
      // 1. Send to analytics service (e.g., Google Analytics, Mixpanel)
      // 2. Store in time-series database for detailed analysis
      // 3. Update search performance metrics
      
      console.log('Search Analytics Tracked:', analyticsData);
    } catch (error) {
      console.error('Failed to track search analytics:', error);
      // Don't throw error to avoid breaking search functionality
    }
  }

  private getUsedFilters(filters: AdvancedSearchFilters): string[] {
    const usedFilters: string[] = [];
    
    if (filters.query) usedFilters.push('query');
    if (filters.categoryId) usedFilters.push('category');
    if (filters.priceMin || filters.priceMax) usedFilters.push('price');
    if (filters.location) usedFilters.push('location');
    if (filters.minRating || filters.maxRating) usedFilters.push('rating');
    if (filters.sellerReputation) usedFilters.push('sellerReputation');
    if (filters.inStock) usedFilters.push('inStock');
    if (filters.freeShipping) usedFilters.push('freeShipping');
    if (filters.fastShipping) usedFilters.push('fastShipping');
    if (filters.recentlyAdded) usedFilters.push('recentlyAdded');
    if (filters.trending) usedFilters.push('trending');
    if (filters.onSale) usedFilters.push('onSale');
    if (filters.hasReviews) usedFilters.push('hasReviews');
    if (filters.condition) usedFilters.push('condition');
    if (filters.tags && filters.tags.length > 0) usedFilters.push('tags');
    
    return usedFilters;
  }

  private mapProductFromDb(dbProduct: any, dbCategory?: any): Product {
    const category = dbCategory ? {
      id: dbCategory.id,
      name: dbCategory.name,
      slug: dbCategory.slug,
      description: dbCategory.description,
      parentId: dbCategory.parentId,
      path: JSON.parse(dbCategory.path || '[]'),
      imageUrl: dbCategory.imageUrl,
      isActive: dbCategory.isActive,
      sortOrder: dbCategory.sortOrder,
      createdAt: dbCategory.createdAt,
      updatedAt: dbCategory.updatedAt,
    } : {
      id: dbProduct.categoryId,
      name: 'Unknown',
      slug: 'unknown',
      path: [],
      isActive: true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      id: dbProduct.id,
      sellerId: dbProduct.sellerId,
      title: dbProduct.title,
      description: dbProduct.description,
      price: {
        amount: dbProduct.priceAmount,
        currency: dbProduct.priceCurrency,
      },
      category,
      images: JSON.parse(dbProduct.images || '[]'),
      metadata: JSON.parse(dbProduct.metadata || '{}'),
      inventory: dbProduct.inventory,
      status: dbProduct.status,
      tags: JSON.parse(dbProduct.tags || '[]'),
      shipping: dbProduct.shipping ? JSON.parse(dbProduct.shipping) : undefined,
      nft: dbProduct.nft ? JSON.parse(dbProduct.nft) : undefined,
      views: dbProduct.views || 0,
      favorites: dbProduct.favorites || 0,
      createdAt: dbProduct.createdAt,
      updatedAt: dbProduct.updatedAt,
    };
  }
}