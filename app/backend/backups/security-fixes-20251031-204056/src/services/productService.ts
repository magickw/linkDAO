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
import { safeLogger } from '../utils/safeLogger';
import { priceOracleService } from './priceOracleService';
import { safeLogger } from '../utils/safeLogger';
import { ValidationHelper, ValidationError } from '../models/validation';
import { safeLogger } from '../utils/safeLogger';
import { eq, and, or, like, gte, lte, inArray, desc, asc, isNull, sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import * as schema from '../db/schema';
import { safeLogger } from '../utils/safeLogger';

export class ProductService {
  private databaseService: DatabaseService;
  private metadataService: MetadataService;

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
      .where(eq(schema.products.id, id));
    
    if (!result[0]) return null;
    
    const { products: product, categories: category } = result[0];
    return await this.mapProductFromDb(product, category);
  }

  async getProductsBySeller(sellerId: string, filters?: Partial<ProductSearchFilters>): Promise<Product[]> {
    const searchFilters = { ...filters, sellerId };
    const searchResult = await this.searchProducts(searchFilters, { field: 'createdAt', direction: 'desc' }, { page: 1, limit: 1000 });
    return searchResult.products;
  }

  async searchProducts(
    filters: ProductSearchFilters = {},
    sort: ProductSortOptions = { field: 'createdAt', direction: 'desc' },
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<ProductSearchResult> {
    const db = this.databaseService.getDatabase();
    
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
    const offset = (pagination.page - 1) * pagination.limit;
    const result = await db.select()
      .from(schema.products)
      .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(pagination.limit)
      .offset(offset);
    
    const products = await Promise.all(result.map(async (row: any) => {
      const { products: product, categories: category } = row;
      return await this.mapProductFromDb(product, category);
    }));
    
    return {
      products,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
      filters,
      sort,
    };
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

  // Image Upload
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

  private async mapProductFromDb(dbProduct: any, dbCategory?: any): Promise<Product> {
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

    return {
      id: dbProduct.id,
      sellerId: dbProduct.sellerId,
      title: dbProduct.title,
      description: dbProduct.description,
      price: priceData,
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