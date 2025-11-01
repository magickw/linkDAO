import { eq, desc, asc, and, gte, lte, like, count, sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { marketplaceListings } from '../db/schema';
import { safeLogger } from '../utils/safeLogger';
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

      // Build where conditions
      const conditions = [];
      
      if (isActive !== undefined) {
        conditions.push(eq(marketplaceListings.isActive, isActive));
      }
      
      if (category) {
        conditions.push(eq(marketplaceListings.category, category));
      }
      
      if (sellerAddress) {
        conditions.push(eq(marketplaceListings.sellerAddress, sellerAddress));
      }
      
      if (priceRange) {
        if (priceRange.min) {
          conditions.push(gte(marketplaceListings.price, priceRange.min));
        }
        if (priceRange.max) {
          conditions.push(lte(marketplaceListings.price, priceRange.max));
        }
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Build order by clause
      const orderByClause = sortOrder === 'desc' 
        ? desc(marketplaceListings[sortBy])
        : asc(marketplaceListings[sortBy]);

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(marketplaceListings)
        .where(whereClause);
      
      const total = totalResult[0]?.count || 0;

      // Get listings
      const listingsResult = await db
        .select()
        .from(marketplaceListings)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Transform results
      const listings: MarketplaceListing[] = listingsResult.map(listing => ({
        id: listing.id,
        sellerAddress: listing.sellerAddress,
        title: listing.title,
        description: listing.description || undefined,
        price: listing.price,
        currency: listing.currency || 'ETH',
        images: listing.images ? (Array.isArray(listing.images) ? listing.images : []) : undefined,
        category: listing.category || undefined,
        isActive: listing.isActive,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt
      }));

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
   */
  async getListingById(id: string): Promise<MarketplaceListing | null> {
    try {
      const result = await db
        .select()
        .from(marketplaceListings)
        .where(eq(marketplaceListings.id, id))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const listing = result[0];
      return {
        id: listing.id,
        sellerAddress: listing.sellerAddress,
        title: listing.title,
        description: listing.description || undefined,
        price: listing.price,
        currency: listing.currency || 'ETH',
        images: listing.images ? (Array.isArray(listing.images) ? listing.images : []) : undefined,
        category: listing.category || undefined,
        isActive: listing.isActive,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt
      };
    } catch (error) {
      safeLogger.error('Error getting marketplace listing by ID:', error);
      throw new Error('Failed to retrieve marketplace listing');
    }
  }

  /**
   * Create a new marketplace listing
   */
  async createListing(
    sellerAddress: string, 
    listingData: CreateMarketplaceListingRequest
  ): Promise<MarketplaceListing> {
    try {
      const insertData: MarketplaceListingInsert = {
        sellerAddress,
        title: listingData.title,
        description: listingData.description,
        price: listingData.price,
        currency: listingData.currency || 'ETH',
        images: listingData.images || [],
        category: listingData.category,
        isActive: true
      };

      const result = await db
        .insert(marketplaceListings)
        .values(insertData)
        .returning();

      if (result.length === 0) {
        throw new Error('Failed to create marketplace listing');
      }

      const listing = result[0];
      return {
        id: listing.id,
        sellerAddress: listing.sellerAddress,
        title: listing.title,
        description: listing.description || undefined,
        price: listing.price,
        currency: listing.currency || 'ETH',
        images: listing.images ? (Array.isArray(listing.images) ? listing.images : []) : undefined,
        category: listing.category || undefined,
        isActive: listing.isActive,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt
      };
    } catch (error) {
      safeLogger.error('Error creating marketplace listing:', error);
      throw new Error('Failed to create marketplace listing');
    }
  }

  /**
   * Update an existing marketplace listing
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

      const updateValues: MarketplaceListingUpdate = {
        ...updateData,
        updatedAt: new Date()
      };

      // Remove undefined values
      Object.keys(updateValues).forEach(key => {
        if (updateValues[key as keyof MarketplaceListingUpdate] === undefined) {
          delete updateValues[key as keyof MarketplaceListingUpdate];
        }
      });

      const result = await db
        .update(marketplaceListings)
        .set(updateValues)
        .where(eq(marketplaceListings.id, id))
        .returning();

      if (result.length === 0) {
        return null;
      }

      const listing = result[0];
      return {
        id: listing.id,
        sellerAddress: listing.sellerAddress,
        title: listing.title,
        description: listing.description || undefined,
        price: listing.price,
        currency: listing.currency || 'ETH',
        images: listing.images ? (Array.isArray(listing.images) ? listing.images : []) : undefined,
        category: listing.category || undefined,
        isActive: listing.isActive,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt
      };
    } catch (error) {
      safeLogger.error('Error updating marketplace listing:', error);
      throw new Error('Failed to update marketplace listing');
    }
  }

  /**
   * Delete a marketplace listing (soft delete by setting isActive to false)
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
        .update(marketplaceListings)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(marketplaceListings.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      safeLogger.error('Error deleting marketplace listing:', error);
      throw new Error('Failed to delete marketplace listing');
    }
  }

  /**
   * Search listings by title or description
   */
  async searchListings(
    searchTerm: string,
    filters: MarketplaceListingFilters = {}
  ): Promise<PaginatedMarketplaceListings> {
    try {
      const searchFilters = {
        ...filters,
        // Add search condition to existing filters
      };

      // For now, use simple LIKE search. In production, consider full-text search
      const conditions = [];
      
      if (filters.isActive !== undefined) {
        conditions.push(eq(marketplaceListings.isActive, filters.isActive));
      } else {
        conditions.push(eq(marketplaceListings.isActive, true));
      }

      // Add search conditions
      const searchCondition = sql`(${marketplaceListings.title} ILIKE ${`%${searchTerm}%`} OR ${marketplaceListings.description} ILIKE ${`%${searchTerm}%`})`;
      conditions.push(searchCondition);

      if (filters.category) {
        conditions.push(eq(marketplaceListings.category, filters.category));
      }

      if (filters.sellerAddress) {
        conditions.push(eq(marketplaceListings.sellerAddress, filters.sellerAddress));
      }

      if (filters.priceRange) {
        if (filters.priceRange.min) {
          conditions.push(gte(marketplaceListings.price, filters.priceRange.min));
        }
        if (filters.priceRange.max) {
          conditions.push(lte(marketplaceListings.price, filters.priceRange.max));
        }
      }

      const whereClause = and(...conditions);

      const {
        limit = 20,
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      const orderByClause = sortOrder === 'desc' 
        ? desc(marketplaceListings[sortBy])
        : asc(marketplaceListings[sortBy]);

      // Get total count
      const totalResult = await db
        .select({ count: count() })
        .from(marketplaceListings)
        .where(whereClause);
      
      const total = totalResult[0]?.count || 0;

      // Get listings
      const listingsResult = await db
        .select()
        .from(marketplaceListings)
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Transform results
      const listings: MarketplaceListing[] = listingsResult.map(listing => ({
        id: listing.id,
        sellerAddress: listing.sellerAddress,
        title: listing.title,
        description: listing.description || undefined,
        price: listing.price,
        currency: listing.currency || 'ETH',
        images: listing.images ? (Array.isArray(listing.images) ? listing.images : []) : undefined,
        category: listing.category || undefined,
        isActive: listing.isActive,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt
      }));

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
   */
  async getCategories(): Promise<Array<{ category: string; count: number }>> {
    try {
      const result = await db
        .select({
          category: marketplaceListings.category,
          count: count()
        })
        .from(marketplaceListings)
        .where(and(
          eq(marketplaceListings.isActive, true),
          sql`${marketplaceListings.category} IS NOT NULL`
        ))
        .groupBy(marketplaceListings.category)
        .orderBy(desc(count()));

      return result.map(row => ({
        category: row.category || '',
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