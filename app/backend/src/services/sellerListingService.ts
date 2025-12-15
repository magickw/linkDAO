import { db } from '../db';
import { sellers, products, users, categories } from '../db/schema';
import { eq, and, desc, asc, or } from 'drizzle-orm';

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
 * Shipping Configuration
 */
interface ShippingConfiguration {
  // Shipping methods
  methods: {
    standard?: {
      enabled: boolean;
      cost: number;
      estimatedDays: string;
    };
    express?: {
      enabled: boolean;
      cost: number;
      estimatedDays: string;
    };
    international?: {
      enabled: boolean;
      cost: number;
      estimatedDays: string;
      regions: string[];
    };
  };
  // Shipping policies
  processingTime: number; // in days
  freeShippingThreshold?: number; // order value for free shipping
  returnsAccepted: boolean;
  returnWindow?: number; // in days
  // Package details
  packageDetails: {
    weight: number; // in lbs
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
  };
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
  shipping?: ShippingConfiguration;
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
  shipping?: ShippingConfiguration;
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
    // Normalize wallet address to lowercase for case-insensitive comparison
    const normalizedAddress = walletAddress.toLowerCase();

    // Verify seller exists and get seller ID
    const sellerResult = await db.select().from(sellers).where(eq(sellers.walletAddress, normalizedAddress));
    const seller = sellerResult[0];

    if (!seller) {
      throw new Error('Seller not found');
    }

    // Get user ID for seller
    const userResult = await db.select().from(users).where(eq(users.walletAddress, normalizedAddress));
    const user = userResult[0];

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
    const productsList = await db.select().from(products).where(and(...conditions));

    const total = productsList.length;

    // Build order by
    const orderByColumn = sortBy === 'price' ? products.priceAmount : products.createdAt;
    const orderByDirection = sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn);

    // Get listings
    const listings = await db.select().from(products).where(and(...conditions)).orderBy(orderByDirection).limit(limit).offset(offset);

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
    const listingResult = await db.select().from(products).where(eq(products.id, listingId));
    const listing = listingResult[0];

    if (!listing) {
      throw new Error('Listing not found');
    }

    // Get seller info
    const userResult = await db.select().from(users).where(eq(users.id, listing.sellerId));
    const user = userResult[0];

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
   * Validate shipping configuration
   */
  private validateShippingConfig(shipping?: ShippingConfiguration): void {
    if (!shipping) return;

    // Validate shipping methods
    if (shipping.methods) {
      if (shipping.methods.standard && shipping.methods.standard.enabled) {
        if (typeof shipping.methods.standard.cost !== 'number' || shipping.methods.standard.cost < 0) {
          throw new Error('Standard shipping cost must be a valid positive number');
        }
        if (!shipping.methods.standard.estimatedDays) {
          throw new Error('Standard shipping estimated days is required');
        }
      }

      if (shipping.methods.express && shipping.methods.express.enabled) {
        if (typeof shipping.methods.express.cost !== 'number' || shipping.methods.express.cost < 0) {
          throw new Error('Express shipping cost must be a valid positive number');
        }
        if (!shipping.methods.express.estimatedDays) {
          throw new Error('Express shipping estimated days is required');
        }
      }

      if (shipping.methods.international && shipping.methods.international.enabled) {
        if (typeof shipping.methods.international.cost !== 'number' || shipping.methods.international.cost < 0) {
          throw new Error('International shipping cost must be a valid positive number');
        }
        if (!shipping.methods.international.estimatedDays) {
          throw new Error('International shipping estimated days is required');
        }
        if (!Array.isArray(shipping.methods.international.regions) || shipping.methods.international.regions.length === 0) {
          throw new Error('International shipping regions are required when international shipping is enabled');
        }
      }
    }

    // Validate processing time
    if (typeof shipping.processingTime !== 'number' || shipping.processingTime < 0 || shipping.processingTime > 30) {
      throw new Error('Processing time must be between 0 and 30 days');
    }

    // Validate free shipping threshold
    if (shipping.freeShippingThreshold !== undefined) {
      if (typeof shipping.freeShippingThreshold !== 'number' || shipping.freeShippingThreshold < 0) {
        throw new Error('Free shipping threshold must be a valid positive number');
      }
    }

    // Validate return window
    if (shipping.returnsAccepted && shipping.returnWindow !== undefined) {
      if (typeof shipping.returnWindow !== 'number' || shipping.returnWindow < 1 || shipping.returnWindow > 365) {
        throw new Error('Return window must be between 1 and 365 days');
      }
    }

    // Validate package details
    if (!shipping.packageDetails) {
      throw new Error('Package details are required');
    }

    if (typeof shipping.packageDetails.weight !== 'number' || shipping.packageDetails.weight <= 0 || shipping.packageDetails.weight > 150) {
      throw new Error('Package weight must be between 0 and 150 lbs');
    }

    if (!shipping.packageDetails.dimensions) {
      throw new Error('Package dimensions are required');
    }

    const { length, width, height } = shipping.packageDetails.dimensions;
    if (typeof length !== 'number' || length <= 0 || length > 108 ||
        typeof width !== 'number' || width <= 0 || width > 108 ||
        typeof height !== 'number' || height <= 0 || height > 108) {
      throw new Error('Package dimensions must be between 0 and 108 inches');
    }
  }

  /**
   * Create a new listing
   */
  async createListing(data: CreateListingData): Promise<ProductListing> {
    // Normalize wallet address to lowercase for case-insensitive comparison
    const normalizedAddress = data.walletAddress.toLowerCase();

    // Get user ID for seller
    const userResult = await db.select().from(users).where(eq(users.walletAddress, normalizedAddress));
    const user = userResult[0];

    if (!user) {
      throw new Error('User not found');
    }

    // Verify seller profile exists
    const sellerResult = await db.select().from(sellers).where(eq(sellers.walletAddress, normalizedAddress));
    const seller = sellerResult[0];

    if (!seller) {
      throw new Error('Seller profile not found. Please complete seller onboarding first.');
    }

    // Validate shipping configuration if provided
    if (data.shipping) {
      this.validateShippingConfig(data.shipping);
    }

    // Resolve category ID - it might be a UUID or a slug
    let resolvedCategoryId = data.categoryId;

    // Check if categoryId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(data.categoryId)) {
      // Not a UUID, try to look up by slug or name
      const categoryResult = await db.select().from(categories).where(or(
        eq(categories.slug, data.categoryId),
        eq(categories.name, data.categoryId)
      ));
      let category = categoryResult[0];

      // If category doesn't exist, create it dynamically
      if (!category) {
        // Create default category names based on slug
        const categoryNames: Record<string, string> = {
          'art': 'Art & Collectibles',
          'music': 'Music & Audio',
          'gaming': 'Gaming & Virtual Worlds',
          'photography': 'Photography',
          'domain': 'Domain Names',
          'utility': 'Utility & Access',
          'sports': 'Sports & Recreation',
          'memes': 'Memes & Fun',
          'fashion': 'Fashion & Wearables',
          'electronics': 'Electronics',
          'books': 'Books & Media',
          'services': 'Services',
          'other': 'Other',
        };

        const categoryName = categoryNames[data.categoryId] || data.categoryId.charAt(0).toUpperCase() + data.categoryId.slice(1);

        const [newCategory] = await db.insert(categories).values({
          name: categoryName,
          slug: data.categoryId,
          description: `${categoryName} marketplace category`,
          path: JSON.stringify([categoryName]),
          isActive: true,
          sortOrder: 0,
        }).returning();

        category = newCategory;
      }

      resolvedCategoryId = category.id;
    }

    // Set initial status to active for all sellers (seller approval handles verification)
    const initialStatus = 'active';
    const initialListingStatus = 'active';

    // Create listing
    const [newListing] = await db.insert(products).values({
      sellerId: user.id,
      title: data.title,
      description: data.description,
      priceAmount: data.price.toString(),
      priceCurrency: data.currency || 'USD',
      categoryId: resolvedCategoryId,
      images: JSON.stringify(data.images || []),
      metadata: JSON.stringify(data.metadata || {}),
      inventory: data.inventory || 0,
      status: initialStatus,
      tags: JSON.stringify(data.tags || []),
      shipping: JSON.stringify(data.shipping || null),
      nft: JSON.stringify(data.nft || null),
      views: 0,
      favorites: 0,
      listingStatus: initialListingStatus,
      publishedAt: new Date(), // Always set publishedAt for marketplace visibility
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
    const existingResult = await db.select().from(products).where(eq(products.id, listingId));
    const existing = existingResult[0];

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
    const userResult = await db.select().from(users).where(eq(users.id, updated.sellerId));
    const user = userResult[0];

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
    const listingResult = await db.select().from(products).where(eq(products.id, listingId));
    const listing = listingResult[0];

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

  /**
   * Reject a listing with reason
   */
  async rejectListing(listingId: string, reason?: string): Promise<void> {
    // Verify listing exists
    const listingResult = await db.select().from(products).where(eq(products.id, listingId));
    const listing = listingResult[0];

    if (!listing) {
      throw new Error('Listing not found');
    }

    // Prepare metadata with rejection reason
    let updatedMetadata = {};
    if (listing.metadata) {
      try {
        updatedMetadata = JSON.parse(listing.metadata);
      } catch (e) {
        // If parsing fails, start with empty object
        updatedMetadata = {};
      }
    }
    
    // Add rejection reason to metadata if provided
    if (reason) {
      (updatedMetadata as any).rejectionReason = reason;
    }

    // Update listing status to rejected with reason
    await db
      .update(products)
      .set({
        listingStatus: 'rejected',
        updatedAt: new Date(),
        metadata: JSON.stringify(updatedMetadata)
      })
      .where(eq(products.id, listingId));
  }
}

export const sellerListingService = new SellerListingService();
