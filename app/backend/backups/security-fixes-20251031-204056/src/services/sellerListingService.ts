import { db } from '../db';
import { sellers, products, users } from '../db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';

/**
 * Listing Query Options
 */
interface ListingQueryOptions {
  status?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Listing Data for Creation
 */
interface CreateListingData {
  walletAddress: string;
  title: string;
  description: string;
  price: number | string;
  categoryId: string;
  currency?: string;
  inventory?: number;
  images?: string[];
  tags?: string[];
  metadata?: any;
  shipping?: any;
  nft?: any;
}

/**
 * Listing Data for Update
 */
interface UpdateListingData {
  title?: string;
  description?: string;
  price?: number | string;
  categoryId?: string;
  currency?: string;
  inventory?: number;
  status?: string;
  images?: string[];
  tags?: string[];
  metadata?: any;
  shipping?: any;
  nft?: any;
}

/**
 * Product Listing with Enhanced Metadata
 */
interface ProductListing {
  id: string;
  sellerId: string;
  sellerAddress: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  categoryId: string;
  images: string[];
  metadata: any;
  inventory: number;
  status: string;
  tags: string[];
  shipping: any;
  nft: any;
  views: number;
  favorites: number;
  listingStatus: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Seller Listing Service
 */
class SellerListingService {
  /**
   * Get all listings for a seller with pagination and filtering
   */
  async getSellerListings(
    walletAddress: string,
    options: ListingQueryOptions = {}
  ): Promise<{ listings: ProductListing[]; total: number; page: number; pageSize: number }> {
    // Verify seller exists and get seller ID
    const seller = await db.query.sellers.findFirst({
      where: eq(sellers.walletAddress, walletAddress),
    });

    if (!seller) {
      throw new Error('Seller not found');
    }

    // Get user ID for seller
    const user = await db.query.users.findFirst({
      where: eq(users.walletAddress, walletAddress),
    });

    if (!user) {
      throw new Error('User not found');
    }

    const {
      status,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    // Build query conditions
    const conditions = [eq(products.sellerId, user.id)];

    if (status) {
      conditions.push(eq(products.status, status));
    }

    // Get total count
    const productsList = await db.query.products.findMany({
      where: and(...conditions),
    });

    const total = productsList.length;

    // Build order by
    const orderByColumn = sortBy === 'price' ? products.priceAmount : products.createdAt;
    const orderByDirection = sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn);

    // Get listings
    const listings = await db.query.products.findMany({
      where: and(...conditions),
      orderBy: [orderByDirection],
      limit,
      offset,
    });

    return {
      listings: listings.map(listing => ({
        id: listing.id,
        sellerId: listing.sellerId.toString(),
        sellerAddress: walletAddress,
        title: listing.title,
        description: listing.description,
        price: listing.priceAmount?.toString() || '0',
        currency: listing.priceCurrency,
        categoryId: listing.categoryId,
        images: listing.images ? JSON.parse(listing.images) : [],
        metadata: listing.metadata ? JSON.parse(listing.metadata) : {},
        inventory: listing.inventory,
        status: listing.status || 'draft',
        tags: listing.tags ? JSON.parse(listing.tags) : [],
        shipping: listing.shipping ? JSON.parse(listing.shipping) : null,
        nft: listing.nft ? JSON.parse(listing.nft) : null,
        views: listing.views || 0,
        favorites: listing.favorites || 0,
        listingStatus: listing.listingStatus || 'draft',
        publishedAt: listing.publishedAt || undefined,
        createdAt: listing.createdAt || new Date(),
        updatedAt: listing.updatedAt || new Date(),
      })),
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
    };
  }

  /**
   * Get a single listing by ID
   */
  async getListingById(listingId: string): Promise<ProductListing> {
    const listing = await db.query.products.findFirst({
      where: eq(products.id, listingId),
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    // Get seller info
    const user = await db.query.users.findFirst({
      where: eq(users.id, listing.sellerId),
    });

    return {
      id: listing.id,
      sellerId: listing.sellerId.toString(),
      sellerAddress: user?.walletAddress || '',
      title: listing.title,
      description: listing.description,
      price: listing.priceAmount?.toString() || '0',
      currency: listing.priceCurrency,
      categoryId: listing.categoryId,
      images: listing.images ? JSON.parse(listing.images) : [],
      metadata: listing.metadata ? JSON.parse(listing.metadata) : {},
      inventory: listing.inventory,
      status: listing.status || 'draft',
      tags: listing.tags ? JSON.parse(listing.tags) : [],
      shipping: listing.shipping ? JSON.parse(listing.shipping) : null,
      nft: listing.nft ? JSON.parse(listing.nft) : null,
      views: listing.views || 0,
      favorites: listing.favorites || 0,
      listingStatus: listing.listingStatus || 'draft',
      publishedAt: listing.publishedAt || undefined,
      createdAt: listing.createdAt || new Date(),
      updatedAt: listing.updatedAt || new Date(),
    };
  }

  /**
   * Create a new listing
   */
  async createListing(data: CreateListingData): Promise<ProductListing> {
    // Get user ID for seller
    const user = await db.query.users.findFirst({
      where: eq(users.walletAddress, data.walletAddress),
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify seller profile exists
    const seller = await db.query.sellers.findFirst({
      where: eq(sellers.walletAddress, data.walletAddress),
    });

    if (!seller) {
      throw new Error('Seller profile not found. Please complete seller onboarding first.');
    }

    // Create listing
    const [newListing] = await db.insert(products).values({
      sellerId: user.id,
      title: data.title,
      description: data.description,
      priceAmount: data.price.toString(),
      priceCurrency: data.currency || 'USD',
      categoryId: data.categoryId,
      images: JSON.stringify(data.images || []),
      metadata: JSON.stringify(data.metadata || {}),
      inventory: data.inventory || 0,
      status: 'draft',
      tags: JSON.stringify(data.tags || []),
      shipping: JSON.stringify(data.shipping || null),
      nft: JSON.stringify(data.nft || null),
      views: 0,
      favorites: 0,
      listingStatus: 'draft',
    }).returning();

    return {
      id: newListing.id,
      sellerId: newListing.sellerId.toString(),
      sellerAddress: data.walletAddress,
      title: newListing.title,
      description: newListing.description,
      price: newListing.priceAmount?.toString() || '0',
      currency: newListing.priceCurrency,
      categoryId: newListing.categoryId,
      images: newListing.images ? JSON.parse(newListing.images) : [],
      metadata: newListing.metadata ? JSON.parse(newListing.metadata) : {},
      inventory: newListing.inventory,
      status: newListing.status || 'draft',
      tags: newListing.tags ? JSON.parse(newListing.tags) : [],
      shipping: newListing.shipping ? JSON.parse(newListing.shipping) : null,
      nft: newListing.nft ? JSON.parse(newListing.nft) : null,
      views: newListing.views || 0,
      favorites: newListing.favorites || 0,
      listingStatus: newListing.listingStatus || 'draft',
      publishedAt: newListing.publishedAt || undefined,
      createdAt: newListing.createdAt || new Date(),
      updatedAt: newListing.updatedAt || new Date(),
    };
  }

  /**
   * Update an existing listing
   */
  async updateListing(listingId: string, data: UpdateListingData): Promise<ProductListing> {
    // Verify listing exists
    const existing = await db.query.products.findFirst({
      where: eq(products.id, listingId),
    });

    if (!existing) {
      throw new Error('Listing not found');
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.priceAmount = data.price.toString();
    if (data.currency !== undefined) updateData.priceCurrency = data.currency;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.inventory !== undefined) updateData.inventory = data.inventory;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.images !== undefined) updateData.images = JSON.stringify(data.images);
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.metadata !== undefined) updateData.metadata = JSON.stringify(data.metadata);
    if (data.shipping !== undefined) updateData.shipping = JSON.stringify(data.shipping);
    if (data.nft !== undefined) updateData.nft = JSON.stringify(data.nft);

    // If changing status to active, set publishedAt
    if (data.status === 'active' && !existing.publishedAt) {
      updateData.publishedAt = new Date();
      updateData.listingStatus = 'active';
    }

    // Update listing
    const [updated] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, listingId))
      .returning();

    // Get seller address
    const user = await db.query.users.findFirst({
      where: eq(users.id, updated.sellerId),
    });

    return {
      id: updated.id,
      sellerId: updated.sellerId.toString(),
      sellerAddress: user?.walletAddress || '',
      title: updated.title,
      description: updated.description,
      price: updated.priceAmount?.toString() || '0',
      currency: updated.priceCurrency,
      categoryId: updated.categoryId,
      images: updated.images ? JSON.parse(updated.images) : [],
      metadata: updated.metadata ? JSON.parse(updated.metadata) : {},
      inventory: updated.inventory,
      status: updated.status || 'draft',
      tags: updated.tags ? JSON.parse(updated.tags) : [],
      shipping: updated.shipping ? JSON.parse(updated.shipping) : null,
      nft: updated.nft ? JSON.parse(updated.nft) : null,
      views: updated.views || 0,
      favorites: updated.favorites || 0,
      listingStatus: updated.listingStatus || 'draft',
      publishedAt: updated.publishedAt || undefined,
      createdAt: updated.createdAt || new Date(),
      updatedAt: updated.updatedAt || new Date(),
    };
  }

  /**
   * Delete a listing (soft delete by setting status to inactive)
   */
  async deleteListing(listingId: string): Promise<void> {
    // Verify listing exists
    const listing = await db.query.products.findFirst({
      where: eq(products.id, listingId),
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    // Check for active orders (optional - you might want to prevent deletion if there are active orders)
    // This would require joining with orders table

    // Soft delete by setting status to inactive
    await db
      .update(products)
      .set({
        status: 'inactive',
        listingStatus: 'inactive',
        updatedAt: new Date(),
      })
      .where(eq(products.id, listingId));
  }
}

export const sellerListingService = new SellerListingService();
