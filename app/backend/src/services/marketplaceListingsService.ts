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
      if (isActive !== undefined && isActive) {
        conditions.push(eq(products.status, 'active'));
        // conditions.push(sql`${products.publishedAt} IS NOT NULL`); // Relaxed check to allow legacy data
      }

      if (category) {
        // Category filter - need to join with categories table if filtering by name
        conditions.push(eq(products.categoryId, category));
      }

      if (sellerAddress) {
        // Need to find user by wallet address first, then filter by sellerId
        const userResult = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.walletAddress, sellerAddress))
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

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(products)
        .where(whereClause);

      const total = totalResult[0]?.count || 0;

      // Get listings with seller info
      const listingsResult = await db
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
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Get seller addresses for each listing
      const sellerIds = [...new Set(listingsResult.map(l => l.sellerId))];
      let sellerAddressMap = new Map<string, string>();

      if (sellerIds.length > 0) {
        const sellerUsers = await db
          .select({ id: users.id, walletAddress: users.walletAddress })
          .from(users)
          .where(sql`${users.id} IN (${sql.join(sellerIds.map(id => sql`${id}`), sql`, `)})`);

        sellerAddressMap = new Map(sellerUsers.map(u => [u.id, u.walletAddress]));
      }

      // Transform results to match MarketplaceListing interface
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
      throw new Error('Failed to retrieve marketplace listings');
    }
  }

  /**
   * Get a single marketplace listing by ID
   * Now queries from the products table
   */
  async getListingById(id: string): Promise<MarketplaceListing | null> {
    try {
      const result = await db
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
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .where(eq(products.id, id))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const listing = result[0];

      // Get seller address
      const userResult = await db
        .select({ walletAddress: users.walletAddress })
        .from(users)
        .where(eq(users.id, listing.sellerId))
        .limit(1);

      let parsedImages: string[] = [];
      try {
        parsedImages = listing.images ? JSON.parse(listing.images) : [];
      } catch {
        parsedImages = [];
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
        createdAt: listing.createdAt || new Date(),
        updatedAt: listing.updatedAt || new Date()
      };
    } catch (error) {
      safeLogger.error('Error getting marketplace listing by ID:', error);
      throw new Error('Failed to retrieve marketplace listing');
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
          inventory: 1,
          status: 'active',
          listingStatus: 'active',
          publishedAt: new Date(),
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
      if (filters.isActive !== undefined) {
        conditions.push(eq(products.status, filters.isActive ? 'active' : 'inactive'));
      } else {
        conditions.push(eq(products.status, 'active'));
      }
      // conditions.push(sql`${products.publishedAt} IS NOT NULL`); // Relaxed check to allow legacy data

      // Add search conditions
      const searchCondition = sql`(${products.title} ILIKE ${`%${searchTerm}%`} OR ${products.description} ILIKE ${`%${searchTerm}%`})`;
      conditions.push(searchCondition);

      if (filters.category) {
        conditions.push(eq(products.categoryId, filters.category));
      }

      if (filters.sellerAddress) {
        const userResult = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.walletAddress, filters.sellerAddress))
          .limit(1);

        if (userResult.length > 0) {
          conditions.push(eq(products.sellerId, userResult[0].id));
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

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(products)
        .where(whereClause);

      const total = totalResult[0]?.count || 0;

      // Get listings
      const listingsResult = await db
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
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Get seller addresses
      const sellerIds = [...new Set(listingsResult.map(l => l.sellerId))];
      let sellerAddressMap = new Map<string, string>();

      if (sellerIds.length > 0) {
        const sellerUsers = await db
          .select({ id: users.id, walletAddress: users.walletAddress })
          .from(users)
          .where(sql`${users.id} IN (${sql.join(sellerIds.map(id => sql`${id}`), sql`, `)})`);

        sellerAddressMap = new Map(sellerUsers.map(u => [u.id, u.walletAddress]));
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
      throw new Error('Failed to search marketplace listings');
    }
  }

  /**
   * Get categories with listing counts
   * Now queries from the products table
   */
  async getCategories(): Promise<Array<{ category: string; count: number }>> {
    try {
      const result = await db
        .select({
          categoryId: products.categoryId,
          count: count()
        })
        .from(products)
        .where(and(
          eq(products.status, 'active'),
          eq(products.status, 'active'),
          // sql`${products.publishedAt} IS NOT NULL`, // Relaxed check
          sql`${products.categoryId} IS NOT NULL`
        ))
        .groupBy(products.categoryId)
        .orderBy(desc(count()));

      return result.map(row => ({
        category: row.categoryId || '',
        count: row.count
      }));
    } catch (error) {
      safeLogger.error('Error getting categories:', error);
      throw new Error('Failed to retrieve categories');
    }
  }
}

// Export singleton instance
export const marketplaceListingsService = new MarketplaceListingsService();
