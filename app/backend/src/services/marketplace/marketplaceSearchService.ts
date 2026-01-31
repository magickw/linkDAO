import { db } from '../../db';
import { products, marketplaceUsers, sellers } from '../../db/schema';
import { eq, ilike, and, or, desc, sql } from 'drizzle-orm';
import { safeLogger } from '../../utils/safeLogger';
import { cacheService } from './cacheService';

interface SearchFilters {
  category?: string;
  priceMin?: number;
  priceMax?: number;
  sellerAddress?: string;
  status?: string;
  sortBy?: 'relevance' | 'price' | 'newest' | 'rating';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  category: string;
  sellerAddress: string;
  sellerName?: string;
  status: string;
  images?: string[];
  rating?: number;
  relevanceScore?: number;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  hasMore: boolean;
  limit: number;
  offset: number;
}

/**
 * Service for optimized marketplace search
 * Implements caching, full-text search, and efficient filtering
 */
class MarketplaceSearchService {
  private readonly CACHE_TTL = 5 * 60; // 5 minutes
  private readonly MAX_RESULTS = 1000;

  /**
   * Search for products with advanced filtering
   */
  async searchProducts(query: string, filters: SearchFilters = {}): Promise<SearchResponse> {
    try {
      // Validate and normalize inputs
      const searchQuery = query.trim().toLowerCase();
      const limit = Math.min(filters.limit || 50, 100);
      const offset = Math.max(filters.offset || 0, 0);
      const cacheKey = this.generateCacheKey('search:products', searchQuery, filters);

      // Check cache first
      const cachedResult = await cacheService.get<SearchResponse>(cacheKey);
      if (cachedResult) {
        safeLogger.debug(`Cache hit for search: ${searchQuery}`);
        return cachedResult;
      }

      // Build query conditions
      const conditions = [];

      // Optimized Full-Text Search using PostgreSQL tsvector
      if (searchQuery) {
        // Create a tsquery from the search query
        // We use plainto_tsquery for natural language, or custom formatting
        const formattedQuery = searchQuery.split(/\s+/).join(' & ');
        
        conditions.push(
          or(
            sql`to_tsvector('english', ${products.title} || ' ' || ${products.description}) @@ to_tsquery('english', ${formattedQuery})`,
            sql`${products.title} ILIKE ${`%${searchQuery}%`}` // Fallback for partial matches
          )
        );
      }

      // Add filter conditions
      if (filters.category) {
        conditions.push(eq(products.category, filters.category));
      }

      if (filters.priceMin !== undefined) {
        conditions.push(sql`${products.price} >= ${filters.priceMin}`);
      }

      if (filters.priceMax !== undefined) {
        conditions.push(sql`${products.price} <= ${filters.priceMax}`);
      }

      if (filters.sellerAddress) {
        conditions.push(
          eq(products.sellerId, filters.sellerAddress as any)
        );
      }

      if (filters.status) {
        conditions.push(eq(products.status, filters.status));
      } else {
        // Default to active products only
        conditions.push(eq(products.status, 'active'));
      }

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(products)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = Math.min(Number(countResult?.count || 0), this.MAX_RESULTS);

      // Determine sort
      let orderBy;
      switch (filters.sortBy) {
        case 'price':
          orderBy = filters.sortOrder === 'desc'
            ? desc(products.price)
            : products.price;
          break;
        case 'newest':
          orderBy = desc(products.createdAt);
          break;
        case 'relevance':
        default:
          if (searchQuery) {
            // Rank results by relevance score
            const formattedQuery = searchQuery.split(/\s+/).join(' & ');
            orderBy = desc(sql`ts_rank(to_tsvector('english', ${products.title} || ' ' || ${products.description}), to_tsquery('english', ${formattedQuery}))`);
          } else {
            orderBy = desc(products.createdAt);
          }
          break;
      }

      // Execute search query
      const results = await db
        .select()
        .from(products)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);

      // Format results
      const formattedResults: SearchResult[] = results.map((product: any) => ({
        id: product.id,
        title: product.title,
        description: product.description?.substring(0, 200), // Truncate for performance
        price: Number(product.price),
        currency: product.currency || 'USD',
        category: product.category,
        sellerAddress: product.sellerId,
        status: product.status,
        images: product.images ? JSON.parse(product.images) : [],
      }));

      const response: SearchResponse = {
        results: formattedResults,
        total,
        hasMore: offset + limit < total,
        limit,
        offset,
      };

      // Cache the result
      await cacheService.set(cacheKey, response, this.CACHE_TTL);

      return response;
    } catch (error) {
      safeLogger.error('Error searching products:', error);
      throw error;
    }
  }

  /**
   * Get search suggestions/autocomplete
   */
  async getSearchSuggestions(
    prefix: string,
    limit: number = 10
  ): Promise<string[]> {
    try {
      const cacheKey = `search:suggestions:${prefix.toLowerCase()}`;

      // Check cache first
      const cached = await cacheService.get<string[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get unique product titles starting with prefix
      const suggestions = await db
        .selectDistinct({ title: products.title })
        .from(products)
        .where(
          and(
            sql`${products.title} ILIKE ${prefix.toLowerCase()}%`,
            eq(products.status, 'active')
          )
        )
        .limit(limit);

      const titles = suggestions
        .map((s: any) => s.title)
        .filter(Boolean)
        .slice(0, limit);

      // Cache suggestions
      await cacheService.set(cacheKey, titles, 30 * 60); // 30 minutes

      return titles;
    } catch (error) {
      safeLogger.error('Error getting search suggestions:', error);
      return [];
    }
  }

  /**
   * Get categories for filtering
   */
  async getCategories(): Promise<Array<{ name: string; count: number }>> {
    try {
      const cacheKey = 'search:categories';

      // Check cache
      const cached = await cacheService.get<any[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const categories = await db
        .select({
          name: products.category,
          count: sql<number>`COUNT(*)`,
        })
        .from(products)
        .where(eq(products.status, 'active'))
        .groupBy(products.category)
        .orderBy(desc(sql`COUNT(*)`));

      // Cache for 1 hour
      await cacheService.set(cacheKey, categories, 60 * 60);

      return categories;
    } catch (error) {
      safeLogger.error('Error getting categories:', error);
      return [];
    }
  }

  /**
   * Get price range for filtering
   */
  async getPriceRange(): Promise<{ min: number; max: number }> {
    try {
      const cacheKey = 'search:price-range';

      // Check cache
      const cached = await cacheService.get<any>(cacheKey);
      if (cached) {
        return cached;
      }

      const [range] = await db
        .select({
          min: sql<number>`MIN(${products.price})`,
          max: sql<number>`MAX(${products.price})`,
        })
        .from(products)
        .where(eq(products.status, 'active'));

      const priceRange = {
        min: Number(range?.min || 0),
        max: Number(range?.max || 1000000),
      };

      // Cache for 1 hour
      await cacheService.set(cacheKey, priceRange, 60 * 60);

      return priceRange;
    } catch (error) {
      safeLogger.error('Error getting price range:', error);
      return { min: 0, max: 1000000 };
    }
  }

  /**
   * Clear search caches (call after product updates)
   */
  async clearSearchCaches(): Promise<void> {
    try {
      await Promise.all([
        cacheService.invalidate('search:categories'),
        cacheService.invalidate('search:price-range'),
      ]);

      // Invalidate all search:suggestions:* keys
      // Note: This is a simplified approach; in production you might use Redis patterns
      safeLogger.info('Cleared search caches');
    } catch (error) {
      safeLogger.error('Error clearing search caches:', error);
    }
  }

  /**
   * Search sellers
   */
  async searchSellers(query: string, limit: number = 20): Promise<any[]> {
    try {
      const searchQuery = query.trim().toLowerCase();
      const cacheKey = `search:sellers:${searchQuery}`;

      // Check cache
      const cached = await cacheService.get<any[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const results = await db
        .select({
          id: sellers.id,
          walletAddress: sellers.walletAddress,
          name: sellers.name,
          avatar: sellers.avatar,
        })
        .from(sellers)
        .where(
          or(
            sql`${sellers.name} ILIKE ${`%${searchQuery}%`}`,
            sql`${sellers.walletAddress} ILIKE ${`%${searchQuery}%`}`
          )
        )
        .limit(limit);

      // Cache results
      await cacheService.set(cacheKey, results, this.CACHE_TTL);

      return results;
    } catch (error) {
      safeLogger.error('Error searching sellers:', error);
      return [];
    }
  }

  /**
   * Generate cache key from search parameters
   */
  private generateCacheKey(
    prefix: string,
    query: string,
    filters: SearchFilters
  ): string {
    const parts = [
      prefix,
      query.replace(/\s+/g, '-').substring(0, 50),
      filters.category || 'all',
      filters.priceMin || 'min',
      filters.priceMax || 'max',
      filters.sellerAddress || 'all-sellers',
      filters.sortBy || 'relevance',
      filters.sortOrder || 'asc',
      filters.limit || '50',
      filters.offset || '0',
    ];

    return parts.join(':');
  }
}

export const marketplaceSearchService = new MarketplaceSearchService();
