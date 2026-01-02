import { eq, desc, asc, and, gte, lte, like, count, sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { products, users, categories } from '../db/schema';
import {
  MarketplaceListing,
  CreateMarketplaceListingRequest,
  UpdateMarketplaceListingRequest,
  MarketplaceListingFilters,
  PaginatedMarketplaceListings,
  MarketplaceListingInsert,
  MarketplaceListingUpdate
} from '../types/marketplaceListing';

export class MarketplaceListingsService {
  /**
   * Get paginated marketplace listings with filtering and sorting
   * Now queries from the products table where seller listings are stored
   */
  async getListings(filters: MarketplaceListingFilters = {}): Promise<PaginatedMarketplaceListings> {
    try {
      const {
        limit = 20,
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        category,
        priceRange,
        sellerAddress,
        isActive = true
      } = filters;

      // Build where conditions - query from products table
      const conditions = [];

      // Filter for active listings that are published
      // Only apply filters if isActive is explicitly set to true
      if (isActive === true) {
        // Check for multiple possible active statuses
        // Include products that are not explicitly inactive or draft
        conditions.push(sql`${products.status} NOT IN ('inactive', 'draft', 'deleted', 'suspended')`);
        // Also check that the product has been published (not draft)
        conditions.push(sql`${products.publishedAt} IS NOT NULL`);
      }

      if (category) {
        // Category filter - need to join with categories table if filtering by name
        conditions.push(eq(products.categoryId, category));
      }

      if (sellerAddress) {
        // Need to find user by wallet address first, then filter by sellerId
        // Use case-insensitive lookup to ensure listings are found regardless of address casing
        const userResult = await db
          .select({ id: users.id })
          .from(users)
          .where(sql`lower(${users.walletAddress}) = ${sellerAddress.toLowerCase()}`)
          .limit(1);

        if (userResult.length > 0) {
          conditions.push(eq(products.sellerId, userResult[0].id));
        } else {
          // No user found with this address, return empty
          return {
            listings: [],
            total: 0,
            limit,
            offset,
            hasNext: false,
            hasPrevious: false
          };
        }
      }

      if (priceRange) {
        if (priceRange.min) {
          conditions.push(gte(products.priceAmount, priceRange.min.toString()));
        }
        if (priceRange.max) {
          conditions.push(lte(products.priceAmount, priceRange.max.toString()));
        }
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Build order by clause
      const sortColumn = sortBy === 'price' ? products.priceAmount : products.createdAt;
      const orderByClause = sortOrder === 'desc'
        ? desc(sortColumn)
        : asc(sortColumn);

      // Get total count with timeout and error handling
      let total = 0;
      try {
        const totalResult = await Promise.race([
          db.select({ count: count() }).from(products).where(whereClause),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('COUNT query timeout')), 5000)
          )
        ]);
        total = (totalResult as any)[0]?.count || 0;
      } catch (countError) {
        safeLogger.warn('Failed to get total count, using estimate:', countError);
        // Fallback to estimate or default
        total = 1000; // Conservative estimate
      }

      // Get listings with seller info - add timeout and error handling
      let listingsResult: any[] = [];
      try {
        listingsResult = await Promise.race([
          db
            .select({
              id: products.id,
              sellerId: products.sellerId,
              title: products.title,
              description: products.description,
              priceAmount: products.priceAmount,
              priceCurrency: products.priceCurrency,
              categoryId: products.categoryId,
              images: products.images,
              status: products.status,
              shipping: products.shipping,
              views: products.views,
              favorites: products.favorites,
              inventory: products.inventory,
              createdAt: products.createdAt,
              updatedAt: products.updatedAt,
            })
            .from(products)
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('LISTINGS query timeout')), 10000)
          )
        ]) as any[];
      } catch (listingsError) {
        safeLogger.error('Error getting marketplace listings from database:', listingsError);
        // Return empty result instead of throwing error
        return {
          listings: [],
          total: 0,
          limit,
          offset,
          hasNext: false,
          hasPrevious: false
        };
      }

      // Get seller addresses for each listing with batch optimization
      const sellerIds = [...new Set(listingsResult.map(l => l.sellerId))];
      let sellerAddressMap = new Map<string, string>();

      if (sellerIds.length > 0) {
        try {
          // Batch query for all seller addresses with timeout
          const sellerUsers = await Promise.race([
            db
              .select({ id: users.id, walletAddress: users.walletAddress })
              .from(users)
              .where(sql`${users.id} IN (${sql.join(sellerIds.map(id => sql`${id}`), sql`, `)})`),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('SELLER query timeout')), 5000)
            )
          ]) as any[];

          sellerAddressMap = new Map(sellerUsers.map(u => [u.id, u.walletAddress]));
        } catch (sellerError) {
          safeLogger.warn('Failed to get seller addresses, continuing with empty map:', sellerError);
          // Continue with empty map, listings will have empty seller addresses
        }
      }

      // Transform results to match MarketplaceListing interface
      const listings: MarketplaceListing[] = listingsResult.map(listing => {
        let parsedImages: string[] = [];
        try {
          parsedImages = listing.images ? JSON.parse(listing.images) : [];
        } catch {
          parsedImages = [];
        }

        let parsedShipping = null;
        try {
          parsedShipping = listing.shipping ? JSON.parse(listing.shipping) : null;
        } catch {
          parsedShipping = null;
        }

        return {
          id: listing.id,
          sellerAddress: sellerAddressMap.get(listing.sellerId) || '',
          title: listing.title,
          description: listing.description || undefined,
          price: listing.priceAmount || '0',
          currency: listing.priceCurrency || 'ETH',
          images: parsedImages,
          category: listing.categoryId || undefined,
          isActive: listing.status === 'active',
          shipping: parsedShipping,
          views: listing.views || 0,
          favorites: listing.favorites || 0,
          inventory: listing.inventory || 1,
          createdAt: listing.createdAt || new Date(),
          updatedAt: listing.updatedAt || new Date()
        };
      });

      return {
        listings,
        total,
        limit,
        offset,
        hasNext: offset + limit < total,
        hasPrevious: offset > 0
      };
    } catch (error) {
      safeLogger.error('Error getting marketplace listings:', error);
      // Return empty result instead of throwing error to prevent 503
      return {
        listings: [],
        total: 0,
        limit: filters.limit || 20,
        offset: filters.offset || 0,
        hasNext: false,
        hasPrevious: false
      };
    }
  }

  /**
   * Get a single marketplace listing by ID
   * Now queries from the products table
   */
  async getListingById(id: string): Promise<MarketplaceListing | null> {
    try {
      let result: any[] = [];
      try {
        result = await Promise.race([
          db
            .select({
              id: products.id,
              sellerId: products.sellerId,
              title: products.title,
              description: products.description,
              priceAmount: products.priceAmount,
              priceCurrency: products.priceCurrency,
              categoryId: products.categoryId,
              images: products.images,
              status: products.status,
              shipping: products.shipping,
              views: products.views,
              favorites: products.favorites,
              inventory: products.inventory,
              createdAt: products.createdAt,
              updatedAt: products.updatedAt,
            })
            .from(products)
            .where(eq(products.id, id))
            .limit(1),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('LISTING_BY_ID query timeout')), 5000)
          )
        ]) as any[];
      } catch (queryError) {
        safeLogger.error('Error getting marketplace listing by ID from database:', queryError);
        return null;
      }

      if (result.length === 0) {
        return null;
      }

      const listing = result[0];

      // Get seller address with timeout
      let userResult: any[] = [];
      try {
        userResult = await Promise.race([
          db
            .select({ walletAddress: users.walletAddress })
            .from(users)
            .where(eq(users.id, listing.sellerId))
            .limit(1),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('SELLER_ADDRESS query timeout')), 3000)
          )
        ]) as any[];
      } catch (userQueryError) {
        safeLogger.warn('Failed to get seller address for listing:', userQueryError);
        // Continue with empty seller address
      }

      let parsedImages: string[] = [];
      try {
        parsedImages = listing.images ? JSON.parse(listing.images) : [];
      } catch {
        parsedImages = [];
      }

      let parsedShipping = null;
      try {
        parsedShipping = listing.shipping ? JSON.parse(listing.shipping) : null;
      } catch {
        parsedShipping = null;
      }

      return {
        id: listing.id,
        sellerAddress: userResult[0]?.walletAddress || '',
        title: listing.title,
        description: listing.description || undefined,
        price: listing.priceAmount || '0',
        currency: listing.priceCurrency || 'ETH',
        images: parsedImages,
        category: listing.categoryId || undefined,
        isActive: listing.status === 'active',
        shipping: parsedShipping,
        views: listing.views || 0,
        favorites: listing.favorites || 0,
        inventory: listing.inventory || 1,
        createdAt: listing.createdAt || new Date(),
        updatedAt: listing.updatedAt || new Date()
      };
    } catch (error) {
      safeLogger.error('Error getting marketplace listing by ID:', error);
      return null; // Return null instead of throwing error
    }
  }

  /**
   * Create a new marketplace listing
   * Now inserts into the products table for consistency with seller listings
   */
  async createListing(
    sellerAddress: string,
    listingData: CreateMarketplaceListingRequest
  ): Promise<MarketplaceListing> {
    try {
      // Get user by wallet address
      const userResult = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.walletAddress, sellerAddress))
        .limit(1);

      if (userResult.length === 0) {
        throw new Error('User not found for the given seller address');
      }

      const user = userResult[0];

      // Insert into products table
      const result = await db
        .insert(products)
        .values({
          sellerId: user.id,
          title: listingData.title,
          description: listingData.description || '',
          priceAmount: listingData.price.toString(),
          priceCurrency: listingData.currency || 'ETH',
          categoryId: listingData.category || '',
          images: JSON.stringify(listingData.images || []),
          metadata: JSON.stringify({}),
          inventory: listingData.inventory || 1,
          status: 'active',
          listingStatus: 'active',
          publishedAt: new Date(),
          // Store shipping info if provided
          shipping: listingData.shipping ? JSON.stringify(listingData.shipping) : JSON.stringify({
            freeShipping: true,
            estimatedDelivery: '3-5',
            shippingMethods: ['standard']
          }),
        })
        .returning();

      if (result.length === 0) {
        throw new Error('Failed to create marketplace listing');
      }

      const listing = result[0];
      let parsedImages: string[] = [];
      try {
        parsedImages = listing.images ? JSON.parse(listing.images) : [];
      } catch {
        parsedImages = [];
      }

      return {
        id: listing.id,
        sellerAddress: sellerAddress,
        title: listing.title,
        description: listing.description || undefined,
        price: listing.priceAmount || '0',
        currency: listing.priceCurrency || 'ETH',
        images: parsedImages,
        category: listing.categoryId || undefined,
        isActive: listing.status === 'active',
        inventory: listing.inventory || 1,
        createdAt: listing.createdAt || new Date(),
        updatedAt: listing.updatedAt || new Date()
      };
    } catch (error) {
      safeLogger.error('Error creating marketplace listing:', error);
      throw new Error('Failed to create marketplace listing');
    }
  }

  /**
   * Update an existing marketplace listing
   * Now updates the products table
   */
  async updateListing(
    id: string,
    sellerAddress: string,
    updateData: UpdateMarketplaceListingRequest
  ): Promise<MarketplaceListing | null> {
    try {
      // First check if listing exists and belongs to seller
      const existingListing = await this.getListingById(id);
      if (!existingListing) {
        return null;
      }

      if (existingListing.sellerAddress !== sellerAddress) {
        throw new Error('Unauthorized: Cannot update listing that does not belong to you');
      }

      // Build update object for products table
      const updateValues: any = {
        updatedAt: new Date()
      };

      if (updateData.title !== undefined) updateValues.title = updateData.title;
      if (updateData.description !== undefined) updateValues.description = updateData.description;
      if (updateData.price !== undefined) updateValues.priceAmount = updateData.price.toString();
      if (updateData.currency !== undefined) updateValues.priceCurrency = updateData.currency;
      if (updateData.images !== undefined) updateValues.images = JSON.stringify(updateData.images);
      if (updateData.category !== undefined) updateValues.categoryId = updateData.category;
      if (updateData.inventory !== undefined) updateValues.inventory = updateData.inventory;
      if (updateData.isActive !== undefined) {
        updateValues.status = updateData.isActive ? 'active' : 'inactive';
        if (updateData.isActive) {
          updateValues.publishedAt = new Date();
        }
      }

      const result = await db
        .update(products)
        .set(updateValues)
        .where(eq(products.id, id))
        .returning();

      if (result.length === 0) {
        return null;
      }

      const listing = result[0];
      let parsedImages: string[] = [];
      try {
        parsedImages = listing.images ? JSON.parse(listing.images) : [];
      } catch {
        parsedImages = [];
      }

      return {
        id: listing.id,
        sellerAddress: sellerAddress,
        title: listing.title,
        description: listing.description || undefined,
        price: listing.priceAmount || '0',
        currency: listing.priceCurrency || 'ETH',
        images: parsedImages,
        category: listing.categoryId || undefined,
        isActive: listing.status === 'active',
        inventory: listing.inventory || 1,
        createdAt: listing.createdAt || new Date(),
        updatedAt: listing.updatedAt || new Date()
      };
    } catch (error) {
      safeLogger.error('Error updating marketplace listing:', error);
      throw new Error('Failed to update marketplace listing');
    }
  }

  /**
   * Delete a marketplace listing (soft delete by setting status to inactive)
   * Now updates the products table
   */
  async deleteListing(id: string, sellerAddress: string): Promise<boolean> {
    try {
      // First check if listing exists and belongs to seller
      const existingListing = await this.getListingById(id);
      if (!existingListing) {
        return false;
      }

      if (existingListing.sellerAddress !== sellerAddress) {
        throw new Error('Unauthorized: Cannot delete listing that does not belong to you');
      }

      const result = await db
        .update(products)
        .set({
          status: 'inactive',
          listingStatus: 'inactive',
          updatedAt: new Date()
        })
        .where(eq(products.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      safeLogger.error('Error deleting marketplace listing:', error);
      throw new Error('Failed to delete marketplace listing');
    }
  }

  /**
   * Search listings by title or description
   * Now searches the products table
   */
  async searchListings(
    searchTerm: string,
    filters: MarketplaceListingFilters = {}
  ): Promise<PaginatedMarketplaceListings> {
    try {
      const conditions = [];

      // Filter for active listings
      // Only apply filters if isActive is explicitly set
      if (filters.isActive === true) {
        // Check for multiple possible active statuses
        // Include products that are not explicitly inactive or draft
        conditions.push(sql`${products.status} NOT IN ('inactive', 'draft', 'deleted', 'suspended')`);
        // Also check that the product has been published (not draft)
        conditions.push(sql`${products.publishedAt} IS NOT NULL`);
      } else if (filters.isActive === false) {
        conditions.push(eq(products.status, 'inactive'));
      }
      // For undefined isActive, don't filter by status to show all listings

      // Add search conditions
      const searchCondition = sql`(${products.title} ILIKE ${`%${searchTerm}%`} OR ${products.description} ILIKE ${`%${searchTerm}%`})`;
      conditions.push(searchCondition);

      if (filters.category) {
        conditions.push(eq(products.categoryId, filters.category));
      }

      if (filters.sellerAddress) {
        let userResult: any[] = [];
        try {
          userResult = await Promise.race([
            db
              .select({ id: users.id })
              .from(users)
              .where(sql`lower(${users.walletAddress}) = ${filters.sellerAddress.toLowerCase()}`)
              .limit(1),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('USER_SEARCH query timeout')), 3000)
            )
          ]) as any[];

          if (userResult.length > 0) {
            conditions.push(eq(products.sellerId, userResult[0].id));
          }
        } catch (userError) {
          safeLogger.warn('Failed to find user for seller address filter:', userError);
          // If we can't find the user, return empty results
          return {
            listings: [],
            total: 0,
            limit: filters.limit || 20,
            offset: filters.offset || 0,
            hasNext: false,
            hasPrevious: false
          };
        }
      }

      if (filters.priceRange) {
        if (filters.priceRange.min) {
          conditions.push(gte(products.priceAmount, filters.priceRange.min.toString()));
        }
        if (filters.priceRange.max) {
          conditions.push(lte(products.priceAmount, filters.priceRange.max.toString()));
        }
      }

      const whereClause = and(...conditions);

      const {
        limit = 20,
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      const sortColumn = sortBy === 'price' ? products.priceAmount : products.createdAt;
      const orderByClause = sortOrder === 'desc'
        ? desc(sortColumn)
        : asc(sortColumn);

      // Get total count with timeout
      let total = 0;
      try {
        const totalResult = await Promise.race([
          db
            .select({ count: count() })
            .from(products)
            .where(whereClause),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('SEARCH_COUNT query timeout')), 5000)
          )
        ]) as any[];

        total = totalResult[0]?.count || 0;
      } catch (countError) {
        safeLogger.warn('Failed to get search total count, using estimate:', countError);
        total = 100; // Conservative estimate for search
      }

      // Get listings with timeout
      let listingsResult: any[] = [];
      try {
        listingsResult = await Promise.race([
          db
            .select({
              id: products.id,
              sellerId: products.sellerId,
              title: products.title,
              description: products.description,
              priceAmount: products.priceAmount,
              priceCurrency: products.priceCurrency,
              categoryId: products.categoryId,
              images: products.images,
              status: products.status,
              shipping: products.shipping,
              views: products.views,
              favorites: products.favorites,
              inventory: products.inventory,
              createdAt: products.createdAt,
              updatedAt: products.updatedAt,
            })
            .from(products)
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('SEARCH_LISTINGS query timeout')), 10000)
          )
        ]) as any[];
      } catch (listingsError) {
        safeLogger.error('Error searching marketplace listings from database:', listingsError);
        // Return empty result instead of throwing error
        return {
          listings: [],
          total: 0,
          limit,
          offset,
          hasNext: false,
          hasPrevious: false
        };
      }

      // Get seller addresses with batch optimization and timeout
      const sellerIds = [...new Set(listingsResult.map(l => l.sellerId))];
      let sellerAddressMap = new Map<string, string>();

      if (sellerIds.length > 0) {
        try {
          const sellerUsers = await Promise.race([
            db
              .select({ id: users.id, walletAddress: users.walletAddress })
              .from(users)
              .where(sql`${users.id} IN (${sql.join(sellerIds.map(id => sql`${id}`), sql`, `)})`),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('SEARCH_SELLERS query timeout')), 5000)
            )
          ]) as any[];

          sellerAddressMap = new Map(sellerUsers.map(u => [u.id, u.walletAddress]));
        } catch (sellerError) {
          safeLogger.warn('Failed to get seller addresses for search results:', sellerError);
          // Continue with empty map
        }
      }

      // Transform results
      const listings: MarketplaceListing[] = listingsResult.map(listing => {
        let parsedImages: string[] = [];
        try {
          parsedImages = listing.images ? JSON.parse(listing.images) : [];
        } catch {
          parsedImages = [];
        }

        return {
          id: listing.id,
          sellerAddress: sellerAddressMap.get(listing.sellerId) || '',
          title: listing.title,
          description: listing.description || undefined,
          price: listing.priceAmount || '0',
          currency: listing.priceCurrency || 'ETH',
          images: parsedImages,
          category: listing.categoryId || undefined,
          isActive: listing.status === 'active',
          views: listing.views || 0,
          favorites: listing.favorites || 0,
          inventory: listing.inventory || 1,
          createdAt: listing.createdAt || new Date(),
          updatedAt: listing.updatedAt || new Date()
        };
      });

      return {
        listings,
        total,
        limit,
        offset,
        hasNext: offset + limit < total,
        hasPrevious: offset > 0
      };
    } catch (error) {
      safeLogger.error('Error searching marketplace listings:', error);
      // Return empty result instead of throwing error
      return {
        listings: [],
        total: 0,
        limit: filters.limit || 20,
        offset: filters.offset || 0,
        hasNext: false,
        hasPrevious: false
      };
    }
  }

  /**
   * Get categories with listing counts
   * Now queries from the products table and joins with categories table to get actual names
   */
  async getCategories(): Promise<Array<{ id: string; name: string; slug: string; count: number }>> {
    try {
      let result: any[] = [];
      try {
        result = await Promise.race([
          db
            .select({
              categoryId: categories.id,
              categoryName: categories.name,
              categorySlug: categories.slug,
              count: count()
            })
            .from(products)
            .innerJoin(categories, eq(products.categoryId, categories.id))
            .where(and(
              eq(products.status, 'active'),
              eq(categories.isActive, true),
              // sql`${products.publishedAt} IS NOT NULL`, // Relaxed check
              sql`${products.categoryId} IS NOT NULL`
            ))
            .groupBy(categories.id, categories.name, categories.slug)
            .orderBy(desc(count())),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('CATEGORIES query timeout')), 5000)
          )
        ]) as any[];
      } catch (queryError) {
        safeLogger.error('Error getting categories from database:', queryError);
        // Return empty array instead of throwing error
        return [];
      }

      return result.map(row => ({
        id: row.categoryId || '',
        name: row.categoryName || 'Uncategorized',
        slug: row.categorySlug || '',
        count: row.count
      }));
    } catch (error) {
      safeLogger.error('Error getting categories:', error);
      return []; // Return empty array instead of throwing error
    }
  }

  /**
   * Increment view count for a marketplace listing
   */
  async incrementViews(id: string): Promise<boolean> {
    try {
      // Increment the views column in the products table
      const result = await db
        .update(products)
        .set({
          views: sql`${products.views} + 1`,
          updatedAt: new Date()
        })
        .where(eq(products.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      safeLogger.error('Error incrementing views for marketplace listing:', error);
      return false;
    }
  }
}

// Export singleton instance
export const marketplaceListingsService = new MarketplaceListingsService();
