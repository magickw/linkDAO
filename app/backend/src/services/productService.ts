import {
  CreateProductInput,
  UpdateProductInput,
  Product,
  ProductCategory,
  CreateCategoryInput,
  UpdateCategoryInput,
  ProductSearchFilters,
  ProductSortOptions,
  PaginationOptions,
  ProductSearchResult,
  BulkProductUpload,
  BulkUploadResult,
  CSVProductRow,
  ImageUploadResult,
  BulkImageUploadResult,
  ProductAnalytics
} from '../models/Product';
import { DatabaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { MetadataService } from './metadataService';
import { priceOracleService } from './priceOracleService';
import { ValidationHelper, ValidationError } from '../models/validation';
import { queryCacheService } from './queryCacheService';
import { eq, and, or, like, gte, lte, inArray, desc, asc, isNull, sql, lt, gt } from 'drizzle-orm';
import * as schema from '../db/schema';

export class ProductService {
  private databaseService: DatabaseService;
  private metadataService: MetadataService;
  private cacheService = queryCacheService;

  constructor() {
    this.databaseService = new DatabaseService();
    this.metadataService = new MetadataService();
  }

  // Category Management
  async createCategory(input: CreateCategoryInput): Promise<ProductCategory> {
    this.validateCategoryInput(input);

    const db = this.databaseService.getDatabase();

    // Build category path
    let path = [input.name];
    if (input.parentId) {
      const parent = await this.getCategoryById(input.parentId);
      if (!parent) {
        throw new ValidationError('Parent category not found', 'parentId');
      }
      path = [...parent.path, input.name];
    }

    const result = await db.insert(schema.categories).values({
      name: input.name,
      slug: input.slug,
      description: input.description,
      parentId: input.parentId,
      path: JSON.stringify(path),
      imageUrl: input.imageUrl,
      sortOrder: input.sortOrder || 0,
    }).returning();

    return this.mapCategoryFromDb(result[0]);
  }

  async getCategoryById(id: string): Promise<ProductCategory | null> {
    const db = this.databaseService.getDatabase();
    const result = await db.select().from(schema.categories).where(eq(schema.categories.id, id));

    if (!result[0]) return null;
    return this.mapCategoryFromDb(result[0]);
  }

  async getCategoryBySlug(slug: string): Promise<ProductCategory | null> {
    const db = this.databaseService.getDatabase();
    const result = await db.select().from(schema.categories).where(eq(schema.categories.slug, slug));

    if (!result[0]) return null;
    return this.mapCategoryFromDb(result[0]);
  }

  async getAllCategories(): Promise<ProductCategory[]> {
    const db = this.databaseService.getDatabase();
    const result = await db.select().from(schema.categories)
      .where(eq(schema.categories.isActive, true))
      .orderBy(asc(schema.categories.sortOrder), asc(schema.categories.name));

    return result.map((cat: any) => this.mapCategoryFromDb(cat));
  }

  async getCategoriesByParent(parentId: string | null): Promise<ProductCategory[]> {
    const db = this.databaseService.getDatabase();
    const condition = parentId
      ? eq(schema.categories.parentId, parentId)
      : isNull(schema.categories.parentId);

    const result = await db.select().from(schema.categories)
      .where(and(condition, eq(schema.categories.isActive, true)))
      .orderBy(asc(schema.categories.sortOrder), asc(schema.categories.name));

    return result.map((cat: any) => this.mapCategoryFromDb(cat));
  }

  async updateCategory(id: string, input: UpdateCategoryInput): Promise<ProductCategory | null> {
    const db = this.databaseService.getDatabase();

    const updates: any = { updatedAt: new Date() };
    if (input.name !== undefined) updates.name = input.name;
    if (input.slug !== undefined) updates.slug = input.slug;
    if (input.description !== undefined) updates.description = input.description;
    if (input.parentId !== undefined) updates.parentId = input.parentId;
    if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl;
    if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
    if (input.isActive !== undefined) updates.isActive = input.isActive;

    // Rebuild path if name or parent changed
    if (input.name !== undefined || input.parentId !== undefined) {
      const current = await this.getCategoryById(id);
      if (!current) return null;

      let path = [input.name || current.name];
      if (input.parentId || current.parentId) {
        const parentId = input.parentId !== undefined ? input.parentId : current.parentId;
        if (parentId) {
          const parent = await this.getCategoryById(parentId);
          if (!parent) {
            throw new ValidationError('Parent category not found', 'parentId');
          }
          path = [...parent.path, input.name || current.name];
        }
      }
      updates.path = JSON.stringify(path);
    }

    const result = await db.update(schema.categories)
      .set(updates)
      .where(eq(schema.categories.id, id))
      .returning();

    if (!result[0]) return null;
    return this.mapCategoryFromDb(result[0]);
  }

  async deleteCategory(id: string): Promise<boolean> {
    const db = this.databaseService.getDatabase();

    // Check if category has products
    const productCount = await db.select({ count: sql<number>`count(*)` })
      .from(schema.products)
      .where(eq(schema.products.categoryId, id));

    if (productCount[0].count > 0) {
      throw new ValidationError('Cannot delete category with existing products', 'id');
    }

    // Check if category has children
    const childCount = await db.select({ count: sql<number>`count(*)` })
      .from(schema.categories)
      .where(eq(schema.categories.parentId, id));

    if (childCount[0].count > 0) {
      throw new ValidationError('Cannot delete category with child categories', 'id');
    }

    const result = await db.delete(schema.categories)
      .where(eq(schema.categories.id, id))
      .returning();

    return result.length > 0;
  }

  // Product Management
  async createProduct(input: CreateProductInput): Promise<Product> {
    this.validateProductInput(input);

    const db = this.databaseService.getDatabase();

    // Verify category exists
    const category = await this.getCategoryById(input.categoryId);
    if (!category) {
      throw new ValidationError('Category not found', 'categoryId');
    }

    const result = await db.insert(schema.products).values({
      sellerId: input.sellerId,
      title: input.title,
      description: input.description,
      priceAmount: input.price.amount,
      priceCurrency: input.price.currency,
      categoryId: input.categoryId,
      images: JSON.stringify(input.images),
      metadata: JSON.stringify(input.metadata),
      inventory: input.inventory,
      tags: JSON.stringify(input.tags),
      shipping: input.shipping ? JSON.stringify(input.shipping) : null,
      nft: input.nft ? JSON.stringify(input.nft) : null,
      sku: input.sku,
      canonicalProductId: input.canonicalProductId,
    }).returning();

    const product = result[0];

    // Insert tags for efficient searching
    if (input.tags && input.tags.length > 0) {
      const tagInserts = input.tags.map(tag => ({
        productId: product.id,
        tag: tag.toLowerCase().trim(),
      }));
      await db.insert(schema.productTags).values(tagInserts);
    }

    return await this.mapProductFromDb(product, category);
  }

  async getProductById(id: string): Promise<Product | null> {
    const db = this.databaseService.getDatabase();
    const result = await db.select()
      .from(schema.products)
      .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
      .leftJoin(schema.users, eq(schema.products.sellerId, schema.users.id))
      .leftJoin(schema.sellers, eq(schema.users.walletAddress, schema.sellers.walletAddress))
      .where(eq(schema.products.id, id));

    if (!result[0]) return null;

    const { products: product, categories: category, users: user, sellers: seller } = result[0];
    return await this.mapProductFromDb(product, category, user, seller);
  }

  async getProductsBySeller(sellerId: string, filters?: Partial<ProductSearchFilters>): Promise<Product[]> {
    const searchFilters = { ...filters, sellerId };
    const searchResult = await this.searchProducts(searchFilters, { field: 'createdAt', direction: 'desc' }, { page: 1, limit: 1000 });
    return searchResult.products;
  }

  async searchProducts(
    filters: ProductSearchFilters = {},
    sort: ProductSortOptions = { field: 'createdAt', direction: 'desc' },
    pagination: PaginationOptions = { page: 1, limit: 20 },
    cursor?: string // For cursor-based pagination
  ): Promise<ProductSearchResult> {
    const db = this.databaseService.getDatabase();

    // Build cache key from filters, sort, and pagination
    const cacheKey = this.buildCacheKey('searchProducts', { filters, sort, pagination, cursor });

    // Try to get from cache first
    const cached = await this.cacheService.get<ProductSearchResult>(cacheKey);
    if (cached) {
      safeLogger.info('✅ Cache hit for product search:', { filters, pagination });
      return cached;
    }

    // Build where conditions
    const conditions = [];

    if (filters.query) {
      conditions.push(
        or(
          like(schema.products.title, `%${filters.query}%`),
          like(schema.products.description, `%${filters.query}%`)
        )
      );
    }

    if (filters.categoryId) {
      conditions.push(eq(schema.products.categoryId, filters.categoryId));
    }

    if (filters.sellerId) {
      conditions.push(eq(schema.products.sellerId, filters.sellerId));
    }

    if (filters.priceMin) {
      conditions.push(gte(schema.products.priceAmount, filters.priceMin));
    }

    if (filters.priceMax) {
      conditions.push(lte(schema.products.priceAmount, filters.priceMax));
    }

    if (filters.currency) {
      conditions.push(eq(schema.products.priceCurrency, filters.currency));
    }

    if (filters.status && filters.status.length > 0) {
      conditions.push(inArray(schema.products.status, filters.status));
    } else {
      // Default to active products only
      conditions.push(eq(schema.products.status, 'active'));
    }

    if (filters.inStock) {
      conditions.push(gte(schema.products.inventory, 1));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build order by
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

    const orderBy = sort.direction === 'desc' ? desc(orderByColumn) : asc(orderByColumn);

    // Get total count
    const totalResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.products)
      .where(whereClause);

    const total = totalResult[0].count;

    // Get products with pagination
    let result;

    if (cursor) {
      // Cursor-based pagination for better performance at scale
      safeLogger.info('Using cursor-based pagination with cursor:', cursor);

      // Decode cursor (base64 encoded timestamp or id)
      let cursorValue;
      try {
        cursorValue = Buffer.from(cursor, 'base64').toString('utf-8');
      } catch (error) {
        safeLogger.error('Invalid cursor format:', error);
        cursorValue = cursor;
      }

      // Build cursor condition based on sort direction
      const cursorCondition = sort.direction === 'desc'
        ? lt(orderByColumn, cursorValue)
        : gt(orderByColumn, cursorValue);

      const cursorWhereClause = whereClause
        ? and(whereClause, cursorCondition)
        : cursorCondition;

      result = await db.select()
        .from(schema.products)
        .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
        .leftJoin(schema.users, eq(schema.products.sellerId, schema.users.id))
        .leftJoin(schema.sellers, eq(sql`LOWER(${schema.users.walletAddress})`, sql`LOWER(${schema.sellers.walletAddress})`))
        .where(cursorWhereClause)
        .orderBy(orderBy)
        .limit(pagination.limit);
    } else {
      // Fallback to offset-based pagination (for compatibility)
      const offset = (pagination.page - 1) * pagination.limit;

      // Warn if page number is high (performance concern)
      if (pagination.page > 100) {
        safeLogger.warn(`⚠️  High page number (${pagination.page}) - consider using cursor-based pagination for better performance`);
      }

      result = await db.select()
        .from(schema.products)
        .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
        .leftJoin(schema.users, eq(schema.products.sellerId, schema.users.id))
        .leftJoin(schema.sellers, eq(sql`LOWER(${schema.users.walletAddress})`, sql`LOWER(${schema.sellers.walletAddress})`))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(pagination.limit)
        .offset(offset);
    }

    safeLogger.info('📊 Product query result sample:', {
      totalResults: result.length,
      firstResult: result[0] ? {
        productId: result[0].products?.id,
        sellerId: result[0].products?.sellerId,
        userWalletAddress: result[0].users?.walletAddress,
        sellerWalletAddress: result[0].sellers?.walletAddress,
        sellerStoreName: result[0].sellers?.storeName,
        sellerAvatar: result[0].sellers?.profileImageCdn,
        hasSeller: !!result[0].sellers,
        hasUser: !!result[0].users
      } : null
    });

    const products = await Promise.all(result.map(async (row: any) => {
      const { products: product, categories: category, users: user, sellers: seller } = row;
      return await this.mapProductFromDb(product, category, user, seller);
    }));

    const searchResult = {
      products,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
      filters,
      sort,
    };

    // Cache the result (short TTL for search results to ensure freshness)
    await this.cacheService.set(cacheKey, searchResult, { ttl: 180 }); // 3 minutes

    return searchResult;
  }

  async updateProduct(id: string, input: UpdateProductInput): Promise<Product | null> {
    const db = this.databaseService.getDatabase();

    const updates: any = { updatedAt: new Date() };
    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.price !== undefined) {
      updates.priceAmount = input.price.amount;
      updates.priceCurrency = input.price.currency;
    }
    if (input.categoryId !== undefined) {
      // Verify category exists
      const category = await this.getCategoryById(input.categoryId);
      if (!category) {
        throw new ValidationError('Category not found', 'categoryId');
      }
      updates.categoryId = input.categoryId;
    }
    if (input.images !== undefined) updates.images = JSON.stringify(input.images);
    if (input.metadata !== undefined) {
      // Merge with existing metadata
      const current = await this.getProductById(id);
      if (current) {
        const mergedMetadata = { ...current.metadata, ...input.metadata };
        updates.metadata = JSON.stringify(mergedMetadata);
      } else {
        updates.metadata = JSON.stringify(input.metadata);
      }
    }
    if (input.inventory !== undefined) updates.inventory = input.inventory;
    if (input.sku !== undefined) updates.sku = input.sku;
    if (input.canonicalProductId !== undefined) updates.canonicalProductId = input.canonicalProductId;
    if (input.tags !== undefined) {
      updates.tags = JSON.stringify(input.tags);

      // Update product tags table
      await db.delete(schema.productTags).where(eq(schema.productTags.productId, id));
      if (input.tags.length > 0) {
        const tagInserts = input.tags.map(tag => ({
          productId: id,
          tag: tag.toLowerCase().trim(),
        }));
        await db.insert(schema.productTags).values(tagInserts);
      }
    }
    if (input.shipping !== undefined) updates.shipping = JSON.stringify(input.shipping);
    if (input.status !== undefined) updates.status = input.status;

    const result = await db.update(schema.products)
      .set(updates)
      .where(eq(schema.products.id, id))
      .returning();

    if (!result[0]) return null;

    return this.getProductById(id);
  }

  async deleteProduct(id: string): Promise<boolean> {
    const db = this.databaseService.getDatabase();

    // Delete associated tags first
    await db.delete(schema.productTags).where(eq(schema.productTags.productId, id));

    // Delete the product
    const result = await db.delete(schema.products)
      .where(eq(schema.products.id, id))
      .returning();

    return result.length > 0;
  }

  async incrementViews(id: string): Promise<boolean> {
    const db = this.databaseService.getDatabase();

    // We increment by 1 safely using SQL
    const result = await db.update(schema.products)
      .set({ views: sql`${schema.products.views} + 1` })
      .where(eq(schema.products.id, id))
      .returning({ id: schema.products.id });

    return result.length > 0;
  }

  async uploadProductImages(files: Array<{ buffer: Buffer; originalName: string; mimeType: string }>): Promise<BulkImageUploadResult> {
    const results: ImageUploadResult[] = [];
    let totalUploaded = 0;
    let totalFailed = 0;

    for (const file of files) {
      try {
        // Validate image
        if (!file.mimeType.startsWith('image/')) {
          results.push({
            success: false,
            error: 'File is not an image',
            originalName: file.originalName,
            size: file.buffer.length,
            mimeType: file.mimeType,
          });
          totalFailed++;
          continue;
        }

        // Upload to IPFS
        const ipfsHash = await this.metadataService.uploadToIPFS(file.buffer);

        results.push({
          success: true,
          ipfsHash,
          originalName: file.originalName,
          size: file.buffer.length,
          mimeType: file.mimeType,
        });
        totalUploaded++;
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          originalName: file.originalName,
          size: file.buffer.length,
          mimeType: file.mimeType,
        });
        totalFailed++;
      }
    }

    return {
      results,
      totalUploaded,
      totalFailed,
    };
  }

  // Bulk Operations
  async bulkUploadProducts(upload: BulkProductUpload): Promise<BulkUploadResult> {
    const result: BulkUploadResult = {
      success: 0,
      failed: 0,
      errors: [],
      createdProducts: [],
    };

    for (let i = 0; i < upload.products.length; i++) {
      const productInput = upload.products[i];
      try {
        // Use default seller if not specified
        if (!productInput.sellerId) {
          productInput.sellerId = upload.defaultSellerId;
        }

        const product = await this.createProduct(productInput);
        result.createdProducts.push(product);
        result.success++;
      } catch (error) {
        result.errors.push({
          row: i + 1,
          product: productInput,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        result.failed++;
      }
    }

    return result;
  }

  async parseCSVProducts(csvData: CSVProductRow[], defaultSellerId: string, categoryMappings: Record<string, string> = {}): Promise<CreateProductInput[]> {
    const products: CreateProductInput[] = [];

    for (const row of csvData) {
      try {
        // Map category name to ID
        let categoryId = categoryMappings[row.category];
        if (!categoryId) {
          // Try to find category by name
          const categories = await this.getAllCategories();
          const category = categories.find(cat =>
            cat.name.toLowerCase() === row.category.toLowerCase()
          );
          if (category) {
            categoryId = category.id;
          } else {
            throw new Error(`Category not found: ${row.category}`);
          }
        }

        const product: CreateProductInput = {
          sellerId: defaultSellerId,
          title: row.title,
          description: row.description,
          price: {
            amount: row.price,
            currency: row.currency || 'USD',
          },
          categoryId,
          images: [], // Images need to be uploaded separately
          metadata: {
            condition: (row.condition as any) || 'new',
            weight: row.weight ? parseFloat(row.weight) : undefined,
            dimensions: (row.length && row.width && row.height) ? {
              length: parseFloat(row.length),
              width: parseFloat(row.width),
              height: parseFloat(row.height),
            } : undefined,
            brand: row.brand,
            model: row.model,
            sku: row.sku,
            barcode: row.barcode,
          },
          inventory: parseInt(row.inventory) || 0,
          tags: row.tags ? row.tags.split(',').map(tag => tag.trim()) : [],
          shipping: {
            weight: row.weight ? parseFloat(row.weight) : 0,
            dimensions: (row.length && row.width && row.height) ? {
              length: parseFloat(row.length),
              width: parseFloat(row.width),
              height: parseFloat(row.height),
            } : { length: 0, width: 0, height: 0 },
            freeShipping: row.freeShipping?.toLowerCase() === 'true',
            shippingCost: row.shippingCost,
            shippingMethods: ['standard'],
            handlingTime: row.handlingTime ? parseInt(row.handlingTime) : 1,
            shipsFrom: {
              country: row.shipsFromCountry || 'US',
              state: row.shipsFromState,
              city: row.shipsFromCity,
            },
          },
        };

        products.push(product);
      } catch (error) {
        throw new Error(`Error parsing row: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return products;
  }

  // Analytics
  async getProductAnalytics(productId: string, startDate: Date, endDate: Date): Promise<ProductAnalytics | null> {
    const product = await this.getProductById(productId);
    if (!product) return null;

    // In a real implementation, this would query analytics tables
    // For now, return mock data based on product properties
    return {
      productId,
      views: product.views,
      favorites: product.favorites,
      salesCount: product.salesCount,
      orders: 0, // Would be calculated from orders table
      revenue: '0',
      conversionRate: 0,
      averageRating: 0,
      reviewCount: 0,
      period: {
        start: startDate,
        end: endDate,
      },
    };
  }

  async getSalesCount(productId: string): Promise<number> {
    const db = this.databaseService.getDatabase();
    const result = await db.select({ salesCount: schema.products.salesCount })
      .from(schema.products)
      .where(eq(schema.products.id, productId));

    return result[0]?.salesCount || 0;
  }

  // Helper methods
  private validateCategoryInput(input: CreateCategoryInput): void {
    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError('Category name is required', 'name');
    }
    if (!input.slug || input.slug.trim().length === 0) {
      throw new ValidationError('Category slug is required', 'slug');
    }
    if (!/^[a-z0-9-]+$/.test(input.slug)) {
      throw new ValidationError('Category slug must contain only lowercase letters, numbers, and hyphens', 'slug');
    }
  }

  private validateProductInput(input: CreateProductInput): void {
    if (!input.sellerId) {
      throw new ValidationError('Seller ID is required', 'sellerId');
    }
    if (!input.title || input.title.trim().length === 0) {
      throw new ValidationError('Product title is required', 'title');
    }
    if (!input.description || input.description.trim().length === 0) {
      throw new ValidationError('Product description is required', 'description');
    }
    if (!input.price || !input.price.amount || parseFloat(input.price.amount) <= 0) {
      throw new ValidationError('Valid price is required', 'price');
    }
    if (!input.categoryId) {
      throw new ValidationError('Category ID is required', 'categoryId');
    }
    if (input.inventory < 0) {
      throw new ValidationError('Inventory cannot be negative', 'inventory');
    }
  }

  private mapCategoryFromDb(dbCategory: any): ProductCategory {
    return {
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
    };
  }

  private async mapProductFromDb(dbProduct: any, dbCategory?: any, dbUser?: any, dbSeller?: any): Promise<Product> {
    safeLogger.info('🔍 mapProductFromDb input:', {
      productId: dbProduct.id,
      sellerId: dbProduct.sellerId,
      dbUser: dbUser ? {
        id: dbUser.id,
        walletAddress: dbUser.walletAddress,
        displayName: dbUser.displayName,
        avatarCid: dbUser.avatarCid
      } : null,
      dbSeller: dbSeller ? {
        walletAddress: dbSeller.walletAddress,
        storeName: dbSeller.storeName,
        profileImageCdn: dbSeller.profileImageCdn,
        isVerified: dbSeller.isVerified,
        daoApproved: dbSeller.daoApproved
      } : null
    });

    // Get seller review stats if we have a seller
    let sellerRating = 0;
    if (dbUser?.id) {
      try {
        // Import review service dynamically to avoid circular dependencies
        const { reviewService } = await import('./reviewService');
        const reviewStats = await reviewService.getReviewStats(dbUser.id);
        sellerRating = reviewStats.averageRating;
      } catch (error) {
        safeLogger.warn('Failed to fetch seller review stats:', error);
      }
    }

    const category = dbCategory ? this.mapCategoryFromDb(dbCategory) : {
      id: dbProduct.categoryId,
      name: 'Unknown',
      slug: 'unknown',
      path: [],
      isActive: true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Map seller data if available
    let seller = undefined;
    if (dbUser) {
      // If seller profile doesn't exist, auto-create it
      if (!dbSeller) {
        try {
          safeLogger.info('Auto-creating seller profile for wallet:', dbUser.walletAddress);
          const { sellerService } = await import('./sellerService');
          
          // Check if seller profile already exists to avoid duplicates
          const existingSeller = await sellerService.getSellerProfile(dbUser.walletAddress);
          
          if (existingSeller) {
            dbSeller = existingSeller;
            safeLogger.info('Found existing seller profile for wallet:', dbUser.walletAddress);
          } else {
            // Generate a default avatar using the wallet address
            const defaultAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${dbUser.walletAddress}`;
            
            const basicProfileData = {
              walletAddress: dbUser.walletAddress,
              storeName: 'My Store',
              bio: 'Welcome to my store!',
              description: 'Seller profile created automatically',
              profileImageCdn: defaultAvatar,
              createdAt: new Date(),
              updatedAt: new Date(),
              tier: 'bronze'
            };
            dbSeller = await sellerService.createSellerProfile(basicProfileData as any);
            safeLogger.info('Auto-created seller profile for wallet:', dbUser.walletAddress);
          }
        } catch (autoCreateError) {
          safeLogger.error('Failed to auto-create seller profile:', autoCreateError);
          // Continue without seller profile
        }
      }

      seller = {
        id: dbUser.id,
        walletAddress: dbUser.walletAddress,
        displayName: dbSeller?.storeName || dbUser.displayName || 'Unknown Seller',
        storeName: dbSeller?.storeName || dbUser.displayName || 'Unknown Seller',
        avatar: dbSeller?.profileImageCdn || dbUser.avatarCid || '',
        verified: dbSeller?.isVerified || false,
        daoApproved: dbSeller?.daoApproved || false,
        rating: sellerRating, // Use the fetched rating
        totalSales: 0, // Placeholder, would fetch from stats
        memberSince: dbUser.createdAt,
        reputation: 0 // Placeholder
      };

      // Add additional details if we have them from join
      if (dbSeller) {
        seller.verified = dbSeller.isVerified || false;
      }
      
      safeLogger.info('📦 Mapped seller for product:', {
        productId: dbProduct.id,
        seller: {
          id: seller.id,
          walletAddress: seller.walletAddress,
          displayName: seller.displayName,
          storeName: seller.storeName,
          avatar: seller.avatar,
        }
      });
    }

    // Parse price metadata if it exists
    let priceData: any = {
      amount: dbProduct.priceAmount,
      currency: dbProduct.priceCurrency,
    };

    // If we don't have fiat equivalents, try to generate them
    if (!priceData.usdEquivalent) {
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

    // Parse images - handle both Cloudinary URLs and IPFS hashes
    let images: string[] = [];
    
    try {
      // Parse images from the images field (could be Cloudinary URLs or IPFS hashes)
      images = JSON.parse(dbProduct.images || '[]');
      
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
      safeLogger.warn('Failed to parse images:', error);
      images = [];
    }

    return {
      id: dbProduct.id,
      sellerId: dbProduct.sellerId,
      seller,
      title: dbProduct.title,
      description: dbProduct.description,
      price: priceData,
      category,
      images,

      // Log seller data for debugging
      ...(process.env.NODE_ENV === 'development' && {
        _debug: {
          sellerData: seller ? {
            id: seller.id,
            walletAddress: seller.walletAddress,
            displayName: seller.displayName,
            storeName: seller.storeName,
            avatar: seller.avatar,
          } : null,
          dbSeller: dbSeller ? {
            walletAddress: dbSeller.walletAddress,
            storeName: dbSeller.storeName,
            profileImageCdn: dbSeller.profileImageCdn,
          } : null,
          dbUser: dbUser ? {
            id: dbUser.id,
            walletAddress: dbUser.walletAddress,
            displayName: dbUser.displayName,
            avatarCid: dbUser.avatarCid,
          } : null
        }
      }),
      metadata: JSON.parse(dbProduct.metadata || '{}'),
      inventory: dbProduct.inventory,
      status: dbProduct.status,
      tags: JSON.parse(dbProduct.tags || '[]'),
      shipping: dbProduct.shipping ? JSON.parse(dbProduct.shipping) : undefined,
      nft: dbProduct.nft ? JSON.parse(dbProduct.nft) : undefined,
      sku: dbProduct.sku || undefined,
      canonicalProductId: dbProduct.canonicalProductId || undefined,
      views: dbProduct.views || 0,
      favorites: dbProduct.favorites || 0,
      salesCount: dbProduct.salesCount || 0,
      createdAt: dbProduct.createdAt,
      updatedAt: dbProduct.updatedAt,
    };
  }

  /**
   * Build cache key from query parameters
   */
  private buildCacheKey(operation: string, params: any): string {
    // Sort keys for consistent cache keys
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result: any, key) => {
        result[key] = params[key];
        return result;
      }, {});

    // Create hash of parameters
    const paramsStr = JSON.stringify(sortedParams);
    const hash = Buffer.from(paramsStr).toString('base64').substring(0, 32);

    return `${operation}:${hash}`;
  }
}
