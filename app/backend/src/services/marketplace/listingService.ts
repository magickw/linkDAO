import {
    CreateProductInput,
    UpdateProductInput,
    Product,
    ProductStatus,
    ProductCategory,
    ProductMetadata,
    ProductSearchFilters,
    ProductSortOptions,
    PaginationOptions,
    ProductSearchResult
} from '../../models/Product';
import { ProductService } from './productService';
import { safeLogger } from '../../utils/safeLogger';
import { BlockchainMarketplaceService } from './marketplaceService';
import ImageStorageService from './imageStorageService';
import { DatabaseService } from '../databaseService';
import { RedisService } from './redisService';
import { ValidationHelper, ValidationError } from '../../models/validation';
import { eq, and, or, like, gte, lte, inArray, desc, asc, isNull, sql } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { CreateListingInput as BlockchainListingInput, MarketplaceListing } from '../../models/Marketplace';

export interface CreateListingInput extends CreateProductInput {
    // Additional listing-specific fields
    listingStatus?: ListingStatus;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];
    primaryImageIndex?: number;
}

export interface UpdateListingInput extends UpdateProductInput {
    listingStatus?: ListingStatus;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];
    primaryImageIndex?: number;
}

export type ListingStatus = 'draft' | 'active' | 'published' | 'inactive' | 'suspended';

export interface ListingValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    completeness: number; // 0-100 percentage
}

export interface ListingMetadata {
    searchVector?: string;
    imageIpfsHashes?: string[];
    imageCdnUrls?: Record<string, string>;
    seoOptimized?: boolean;
    qualityScore?: number;
    publishedAt?: Date;
    lastIndexed?: Date;
}

export interface ListingPublicationResult {
    success: boolean;
    listingId: string;
    searchIndexed: boolean;
    errors?: string[];
}

export interface ListingSearchIndexUpdate {
    listingId: string;
    searchVector: string;
    keywords: string[];
    lastIndexed: Date;
}

/**
 * ProductListingService - Handles product listings with enhanced marketplace features
 * 
 * This service focuses on product listing management and uses MarketplaceService
 * for blockchain operations. It provides:
 * - Enhanced product listing creation and management
 * - SEO optimization and search indexing
 * - Integration with blockchain marketplace via composition
 * - Caching and performance optimization
 * 
 * Distinction from MarketplaceService:
 * - ProductListingService: Product-focused, database-driven, SEO-optimized listings
 * - MarketplaceService: Blockchain-focused, Web3 transactions, escrow, disputes
 */
export class ProductListingService {
    private productService: ProductService;
    private blockchainMarketplaceService: BlockchainMarketplaceService;
    private imageStorageService: typeof ImageStorageService;
    private databaseService: DatabaseService;
    private redisService: RedisService;

    constructor() {
        this.productService = new ProductService();
        this.blockchainMarketplaceService = new BlockchainMarketplaceService();
        this.imageStorageService = ImageStorageService;
        this.databaseService = new DatabaseService();
        this.redisService = RedisService.getInstance();
    }

    /**
     * Create a new listing with enhanced validation and optimization
     * Requirements: 3.1, 3.2, 3.4
     */
    async createListing(input: CreateListingInput): Promise<Product> {
        const db = this.databaseService.getDatabase();

        // Validate listing input comprehensively
        const validation = await this.validateListingInput(input);
        if (!validation.isValid) {
            throw new ValidationError(`Listing validation failed: ${validation.errors.join(', ')}`, 'input');
        }

        try {
            // Start transaction for atomic listing creation
            const result = await db.transaction(async (tx) => {
                // Create the base product using ProductService
                const product = await this.productService.createProduct(input);

                // Enhanced listing-specific processing
                if (input.images && input.images.length > 0) {
                    // Store image IPFS hashes in metadata
                    await tx.update(schema.products)
                        .set({
                            metadata: {
                                ...product.metadata,
                                imageIpfsHashes: input.images
                            }
                        })
                        .where(eq(schema.products.id, product.id));
                }

                // Generate search optimization data
                const searchVector = await this.generateSearchVector(input);

                // Update with listing-specific metadata
                await tx.update(schema.products)
                    .set({
                        metadata: {
                            ...product.metadata,
                            searchVector,
                            seoOptimized: true,
                            qualityScore: validation.completeness,
                            publishedAt: new Date(),
                            listingStatus: input.listingStatus || 'active'
                        }
                    })
                    .where(eq(schema.products.id, product.id));

                return product;
            });

            // Cache the new listing
            await this.cacheListingData(result.id, result);

            // Log activity
            await this.logListingActivity(result.id, 'CREATED', { validation });

            return result;
        } catch (error) {
            safeLogger.error('Error creating listing:', error);
            throw new ValidationError(
                `Failed to create listing: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'creation'
            );
        }
    }

    /**
     * Update an existing listing with validation and optimization
     * Requirements: 3.1, 3.4
     */
    async updateListing(id: string, input: UpdateListingInput): Promise<Product | null> {
        const db = this.databaseService.getDatabase();

        // Get current listing
        const currentListing = await this.getListingById(id);
        if (!currentListing) {
            throw new ValidationError('Listing not found', 'id');
        }

        // Validate update input
        const validation = await this.validateListingUpdate(currentListing, input);
        if (!validation.isValid) {
            throw new ValidationError(`Listing update validation failed: ${validation.errors.join(', ')}`, 'input');
        }

        try {
            // Start transaction for atomic update
            const result = await db.transaction(async (tx) => {
                // Update base product using ProductService
                const updatedProduct = await this.productService.updateProduct(id, input);
                if (!updatedProduct) {
                    throw new ValidationError('Failed to update base product', 'update');
                }

                // Handle image updates if provided
                if (input.images && input.images.length > 0) {
                    await tx.update(schema.products)
                        .set({
                            metadata: {
                                ...updatedProduct.metadata,
                                imageIpfsHashes: input.images
                            }
                        })
                        .where(eq(schema.products.id, id));
                }

                // Update search optimization if content changed
                if (input.title || input.description || input.tags) {
                    const mergedData = {
                        title: input.title || currentListing.title,
                        description: input.description || currentListing.description,
                        tags: input.tags || currentListing.tags,
                        category: currentListing.category
                    };
                    const searchVector = await this.generateSearchVector(mergedData);

                    await tx.update(schema.products)
                        .set({
                            metadata: {
                                ...updatedProduct.metadata,
                                searchVector,
                                lastIndexed: new Date(),
                                qualityScore: validation.completeness
                            }
                        })
                        .where(eq(schema.products.id, id));
                }

                return updatedProduct;
            });

            // Invalidate cache
            await this.invalidateListingCache(id);

            // Log activity
            await this.logListingActivity(id, 'UPDATED', { changes: input, validation });

            return result;
        } catch (error) {
            safeLogger.error('Error updating listing:', error);
            throw new ValidationError(
                `Failed to update listing: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'update'
            );
        }
    }

    /**
     * Get listing by ID with caching and enhanced data
     * Requirements: 3.2, 3.3
     */
    async getListingById(id: string): Promise<Product | null> {
        try {
            // Try cache first
            const cached = await this.redisService.getCachedProductListing(id);
            if (cached) {
                return cached;
            }

            // Get from database using ProductService
            const product = await this.productService.getProductById(id);
            if (!product) {
                return null;
            }

            // Cache the result
            await this.cacheListingData(id, product);

            return product;
        } catch (error) {
            safeLogger.error('Error getting listing:', error);
            return null;
        }
    }

    /**
     * Get marketplace listings with enhanced filtering and search
     * Requirements: 3.2, 3.3
     */
    async getMarketplaceListings(
        filters: ProductSearchFilters = {},
        sort: ProductSortOptions = { field: 'publishedAt', direction: 'desc' },
        pagination: PaginationOptions = { page: 1, limit: 20 }
    ): Promise<ProductSearchResult> {
        try {
            // Use ProductService for base functionality
            const result = await this.productService.searchProducts(filters, sort, pagination);

            // Enhance with listing-specific data
            const enhancedProducts = await Promise.all(
                result.products.map(async (product) => {
                    // Add any listing-specific enhancements
                    return {
                        ...product,
                        // Add computed fields or additional data
                        listingQuality: product.metadata?.qualityScore || 0,
                        isOptimized: product.metadata?.seoOptimized || false
                    };
                })
            );

            return {
                ...result,
                products: enhancedProducts
            };
        } catch (error) {
            safeLogger.error('Error getting marketplace listings:', error);
            throw new ValidationError('Failed to get marketplace listings', 'search');
        }
    }

    // ========================================
    // BLOCKCHAIN MARKETPLACE INTEGRATION
    // ========================================

    /**
     * Publish listing to blockchain marketplace
     * Requirements: Integration with blockchain marketplace
     */
    async publishToBlockchain(listingId: string, options?: {
        tokenAddress?: string;
        itemType?: 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE';
        listingType?: 'FIXED_PRICE' | 'AUCTION';
        duration?: number;
    }): Promise<MarketplaceListing> {
        try {
            // Get the product listing
            const listing = await this.getListingById(listingId);
            if (!listing) {
                throw new ValidationError('Listing not found', 'listingId');
            }

            // Convert product to blockchain listing format
            const blockchainListingInput: BlockchainListingInput = {
                sellerWalletAddress: listing.sellerId, // Assuming sellerId is wallet address
                tokenAddress: options?.tokenAddress || '0x0000000000000000000000000000000000000000', // Default to ETH
                price: listing.price.amount,
                quantity: 1,
                inventory: listing.inventory,
                itemType: options?.itemType || 'PHYSICAL',
                listingType: options?.listingType || 'FIXED_PRICE',
                duration: options?.duration,
                metadataURI: this.generateMetadataURI(listing),
                // NFT specific fields (if applicable)
                nftStandard: listing.nft?.standard as 'ERC721' | 'ERC1155' | undefined,
                tokenId: listing.nft?.tokenId,
            };

            // Create blockchain listing
            const blockchainListing = await this.blockchainMarketplaceService.createListing(blockchainListingInput);

            // Update product with blockchain listing reference
            await this.updateListing(listingId, {
                metadata: {
                    ...listing.metadata,
                    blockchainListingId: blockchainListing.id,
                    publishedToBlockchain: true,
                    blockchainPublishedAt: new Date().toISOString()
                }
            });

            return blockchainListing;
        } catch (error) {
            safeLogger.error('Error publishing to blockchain:', error);
            throw new ValidationError(
                `Failed to publish to blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'blockchain'
            );
        }
    }

    /**
     * Sync blockchain listing with product listing
     * Requirements: Keep both systems in sync
     */
    async syncWithBlockchain(listingId: string): Promise<{
        productListing: Product | null;
        blockchainListing: MarketplaceListing | null;
        synced: boolean;
    }> {
        try {
            const productListing = await this.getListingById(listingId);
            if (!productListing) {
                return { productListing: null, blockchainListing: null, synced: false };
            }

            const blockchainListingId = productListing.metadata?.blockchainListingId;
            if (!blockchainListingId) {
                return { productListing, blockchainListing: null, synced: false };
            }

            const blockchainListing = await this.blockchainMarketplaceService.getListingById(blockchainListingId);

            // Check if sync is required
            const needsSync = this.checkSyncRequired(productListing, blockchainListing);

            if (needsSync && blockchainListing) {
                // Update blockchain listing to match product listing
                await this.blockchainMarketplaceService.updateListing(blockchainListingId, {
                    price: productListing.price.amount,
                    quantity: productListing.inventory,
                    // Add other fields that need syncing
                });
            }

            return { productListing, blockchainListing, synced: true };
        } catch (error) {
            safeLogger.error('Error syncing with blockchain:', error);
            return { productListing: null, blockchainListing: null, synced: false };
        }
    }

    /**
     * Get blockchain data for a listing
     * Requirements: Access blockchain functionality
     */
    async getBlockchainData(listingId: string): Promise<{
        listing: MarketplaceListing | null;
        bids: any[];
        offers: any[];
        escrow: any | null;
    }> {
        try {
            const productListing = await this.getListingById(listingId);
            if (!productListing?.metadata?.blockchainListingId) {
                return { listing: null, bids: [], offers: [], escrow: null };
            }

            const blockchainListingId = productListing.metadata.blockchainListingId;

            // Get all blockchain data in parallel
            const [listing, bids, offers] = await Promise.all([
                this.blockchainMarketplaceService.getListingById(blockchainListingId),
                this.blockchainMarketplaceService.getBidsByListing(blockchainListingId),
                this.blockchainMarketplaceService.getOffersByListing(blockchainListingId)
            ]);

            // Get escrow data if listing is escrowed
            let escrow = null;
            if (listing?.isEscrowed) {
                // escrow = await this.marketplaceService.getEscrowData(blockchainListingId);
            }

            return { listing, bids, offers, escrow };
        } catch (error) {
            safeLogger.error('Error getting blockchain data:', error);
            return { listing: null, bids: [], offers: [], escrow: null };
        }
    }

    /**
     * Handle blockchain events
     * Requirements: React to blockchain events
     */
    async handleBlockchainEvent(event: {
        type: 'BID_PLACED' | 'OFFER_MADE' | 'LISTING_SOLD' | 'ESCROW_CREATED';
        listingId: string;
        data: any;
    }): Promise<void> {
        try {
            // Find the product listing by blockchain listing ID
            const productListing = await this.findByBlockchainListingId(event.listingId);
            if (!productListing) {
                safeLogger.warn(`No product listing found for blockchain listing ${event.listingId}`);
                return;
            }

            // Handle different event types
            switch (event.type) {
                case 'BID_PLACED':
                    await this.handleBidPlaced(productListing.id, event.data);
                    break;
                case 'OFFER_MADE':
                    await this.handleOfferMade(productListing.id, event.data);
                    break;
                case 'LISTING_SOLD':
                    await this.handleListingSold(productListing.id, event.data);
                    break;
                case 'ESCROW_CREATED':
                    await this.handleEscrowCreated(productListing.id, event.data);
                    break;
            }
        } catch (error) {
            safeLogger.error('Error handling blockchain event:', error);
        }
    }

    // ========================================
    // INTEGRATION METHODS - COMPOSITION PATTERN
    // ========================================

    /**
     * Create a complete marketplace listing (Product + Blockchain)
     * This method demonstrates the composition pattern by using both services together
     */
    async createCompleteMarketplaceListing(input: CreateListingInput & {
        publishToBlockchain?: boolean;
        blockchainOptions?: {
            tokenAddress?: string;
            itemType?: 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE';
            listingType?: 'FIXED_PRICE' | 'AUCTION';
            duration?: number;
        };
    }): Promise<{
        productListing: Product;
        blockchainListing?: MarketplaceListing;
        success: boolean;
        errors?: string[];
    }> {
        const errors: string[] = [];

        try {
            // Step 1: Create the product listing using this service
            const productListing = await this.createListing(input);

            let blockchainListing: MarketplaceListing | undefined;

            // Step 2: Optionally publish to blockchain using MarketplaceService
            if (input.publishToBlockchain) {
                try {
                    blockchainListing = await this.publishToBlockchain(
                        productListing.id,
                        input.blockchainOptions
                    );
                } catch (error) {
                    errors.push(`Blockchain publication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            return {
                productListing,
                blockchainListing,
                success: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined
            };
        } catch (error) {
            errors.push(`Product listing creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new ValidationError(`Complete marketplace listing creation failed: ${errors.join(', ')}`, 'creation');
        }
    }

    /**
     * Get comprehensive listing data (Product + Blockchain)
     * Demonstrates how both services work together to provide complete data
     */
    async getCompleteListingData(listingId: string): Promise<{
        productListing: Product | null;
        blockchainData: {
            listing: MarketplaceListing | null;
            bids: any[];
            offers: any[];
            escrow: any | null;
        };
        syncStatus: {
            synced: boolean;
            lastSyncAt?: Date;
            syncErrors?: string[];
        };
    }> {
        // Get product listing data
        const productListing = await this.getListingById(listingId);

        // Get blockchain data if product exists
        const blockchainData = productListing
            ? await this.getBlockchainData(listingId)
            : { listing: null, bids: [], offers: [], escrow: null };

        // Check sync status
        const syncResult = productListing
            ? await this.syncWithBlockchain(listingId)
            : { productListing: null, blockchainListing: null, synced: false };

        return {
            productListing,
            blockchainData,
            syncStatus: {
                synced: syncResult.synced,
                lastSyncAt: new Date(),
                syncErrors: syncResult.synced ? undefined : ['Sync failed or not applicable']
            }
        };
    }

    /**
     * Bulk operations that coordinate between both services
     */
    async bulkPublishToBlockchain(listingIds: string[], options?: {
        tokenAddress?: string;
        itemType?: 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE';
        listingType?: 'FIXED_PRICE' | 'AUCTION';
    }): Promise<{
        successful: string[];
        failed: { listingId: string; error: string }[];
    }> {
        const successful: string[] = [];
        const failed: { listingId: string; error: string }[] = [];

        for (const listingId of listingIds) {
            try {
                await this.publishToBlockchain(listingId, options);
                successful.push(listingId);
            } catch (error) {
                failed.push({
                    listingId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        return { successful, failed };
    }

    // ========================================
    // PRIVATE HELPER METHODS
    // ========================================

    /**
     * Validate listing input comprehensively
     * Requirements: 3.1, 3.4
     */
    private async validateListingInput(input: CreateListingInput): Promise<ListingValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Basic product validation
        if (!input.sellerId) errors.push('Seller ID is required');
        if (!input.title || input.title.trim().length === 0) errors.push('Title is required');
        if (!input.description || input.description.trim().length < 10) errors.push('Description must be at least 10 characters');
        if (!input.price || !input.price.amount || parseFloat(input.price.amount) <= 0) errors.push('Valid price is required');
        if (!input.categoryId) errors.push('Category is required');
        if (input.inventory < 0) errors.push('Inventory cannot be negative');

        // Additional listing-specific validations
        if (input.seoTitle && input.seoTitle.length > 60) {
            warnings.push('SEO title should be under 60 characters for optimal search results');
        }

        if (input.seoDescription && input.seoDescription.length > 160) {
            warnings.push('SEO description should be under 160 characters for optimal search results');
        }

        if (input.images && input.images.length === 0) {
            warnings.push('Listings with images perform better in search results');
        }

        if (input.tags && input.tags.length < 3) {
            warnings.push('Adding more tags can improve discoverability');
        }

        // Calculate completeness score
        let completeness = 50; // Base score
        if (input.images && input.images.length > 0) completeness += 20;
        if (input.seoTitle) completeness += 10;
        if (input.seoDescription) completeness += 10;
        if (input.tags && input.tags.length >= 3) completeness += 10;

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            completeness: Math.min(completeness, 100)
        };
    }

    /**
     * Validate listing update input
     */
    private async validateListingUpdate(current: Product, input: UpdateListingInput): Promise<ListingValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Basic update validation
        if (input.title !== undefined && input.title.trim().length === 0) errors.push('Title cannot be empty');
        if (input.description !== undefined && input.description.trim().length < 10) errors.push('Description must be at least 10 characters');
        if (input.price && (!input.price.amount || parseFloat(input.price.amount) <= 0)) errors.push('Valid price is required');
        if (input.inventory !== undefined && input.inventory < 0) errors.push('Inventory cannot be negative');

        // Additional update-specific validations
        if (input.price && parseFloat(input.price.amount) < parseFloat(current.price.amount) * 0.5) {
            warnings.push('Significant price reduction may affect listing visibility');
        }

        if (input.inventory !== undefined && input.inventory < current.inventory) {
            // This is normal for sales, just log it
            safeLogger.info(`Inventory reduced from ${current.inventory} to ${input.inventory}`);
        }

        // Calculate updated completeness
        const merged = { ...current, ...input };
        let completeness = 50;
        if (merged.images && merged.images.length > 0) completeness += 20;
        if (merged.metadata?.seoTitle) completeness += 10;
        if (merged.metadata?.seoDescription) completeness += 10;
        if (merged.tags && merged.tags.length >= 3) completeness += 10;

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            completeness: Math.min(completeness, 100)
        };
    }

    /**
     * Generate search vector for listing optimization
     */
    private async generateSearchVector(input: { title: string; description: string; tags?: string[]; category?: { name: string } }): Promise<string> {
        // Combine title, description, tags, and category for search optimization
        const searchableText = [
            input.title,
            input.description,
            ...(input.tags || []),
            input.category?.name || ''
        ].filter(Boolean).join(' ').toLowerCase();

        // This would typically use a more sophisticated search indexing service
        // For now, return a simple processed version
        return searchableText.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    }

    /**
     * Cache listing data for fast access
     */
    private async cacheListingData(listingId: string, listing: Product): Promise<void> {
        try {
            await this.redisService.cacheProductListing(listingId, listing, 900); // 15 minutes
        } catch (error) {
            safeLogger.error('Error caching listing data:', error);
        }
    }

    /**
     * Invalidate listing cache
     */
    private async invalidateListingCache(listingId: string): Promise<void> {
        try {
            await this.redisService.invalidateProductListing(listingId);
            // Also invalidate related caches
            await this.redisService.del(`marketplace:*`);
        } catch (error) {
            safeLogger.error('Error invalidating listing cache:', error);
        }
    }

    /**
     * Log listing activity for audit trail
     */
    private async logListingActivity(listingId: string, action: string, metadata: any): Promise<void> {
        // This would integrate with an activity logging service
        safeLogger.info(`Listing ${listingId}: ${action}`, metadata);
    }

    // ========================================
    // BLOCKCHAIN HELPER METHODS
    // ========================================

    private generateMetadataURI(listing: Product): string {
        // Generate IPFS metadata URI for the listing
        // This would typically involve uploading metadata to IPFS
        // For now, return a placeholder
        return `ipfs://QmMetadata${listing.id}`;
    }

    private checkSyncRequired(productListing: Product, blockchainListing: MarketplaceListing | null): boolean {
        if (!blockchainListing) return false;

        // Check if key fields are out of sync
        return (
            productListing.price.amount !== blockchainListing.price ||
            productListing.inventory !== parseInt(String(blockchainListing.quantity)) ||
            this.mapProductStatus(productListing.status) !== blockchainListing.status
        );
    }

    private async findByBlockchainListingId(blockchainListingId: string): Promise<Product | null> {
        // Search for product by blockchain listing ID in metadata
        // Using robust JSON extraction instead of fragile text search
        const db = this.databaseService.getDatabase();

        try {
            // Cast metadata text to jsonb and extract field
            // This assumes postgres database. For other DBs this might need adjustment.
            const result = await db.select()
                .from(schema.products)
                .where(sql`(${schema.products.metadata}::jsonb ->> 'blockchainListingId') = ${blockchainListingId}`);

            if (result.length > 0) {
                return await this.mapProductFromDb(result[0]);
            }
        } catch (error) {
            safeLogger.error('Error finding product by blockchain listing ID:', error);
        }

        return null;
    }

    /**
     * Map product status to string representation
     */
    private mapProductStatus(status: ProductStatus): string {
        const statusMap: Record<ProductStatus, string> = {
            'active': 'ACTIVE',
            'inactive': 'INACTIVE',
            'sold_out': 'SOLD',
            'suspended': 'SUSPENDED',
            'draft': 'DRAFT'
        };
        return statusMap[status] || 'INACTIVE';
    }

    /**
     * Map category from database
     */
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

    /**
     * Map product from database with enhanced fields
     */
    private async mapProductFromDb(dbProduct: any, dbCategory?: any): Promise<Product> {
        // Get seller review stats
        let sellerRating = 0;
        if (dbProduct.sellerId) {
            try {
                // Import review service dynamically to avoid circular dependencies
                const { reviewService } = await import('./reviewService');
                const reviewStats = await reviewService.getReviewStats(dbProduct.sellerId);
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

        // Parse price metadata if it exists
        let priceData: any = {
            amount: dbProduct.priceAmount,
            currency: dbProduct.priceCurrency,
        };

        return {
            id: dbProduct.id,
            sellerId: dbProduct.sellerId,
            title: dbProduct.title,
            description: dbProduct.description,
            price: priceData,
            category,
            images: (() => {
                try {
                    // Parse images from the images field (could be Cloudinary URLs or IPFS hashes)
                    let images = JSON.parse(dbProduct.images || '[]');

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

                    return images;
                } catch (error) {
                    safeLogger.warn('Failed to parse images:', error);
                    return [];
                }
            })(),
            metadata: JSON.parse(dbProduct.metadata || '{}'),
            inventory: dbProduct.inventory,
            status: dbProduct.status,
            tags: JSON.parse(dbProduct.tags || '[]'),
            shipping: dbProduct.shipping ? JSON.parse(dbProduct.shipping) : undefined,
            nft: dbProduct.nft ? JSON.parse(dbProduct.nft) : undefined,
            views: dbProduct.views || 0,
            favorites: dbProduct.favorites || 0,
            salesCount: dbProduct.salesCount || 0,
            createdAt: dbProduct.createdAt,
            updatedAt: dbProduct.updatedAt,
        };
    }

    /**
     * Handle bid placed event
     */
    private async handleBidPlaced(listingId: string, bidData: any): Promise<void> {
        // Update listing metadata with bid information
        const listing = await this.getListingById(listingId);
        if (listing) {
            await this.updateListing(listingId, {
                metadata: {
                    ...listing.metadata,
                    lastBidAmount: bidData.amount,
                    buyer: bidData.bidder,
                    lastBidAt: new Date().toISOString(),
                    totalBids: (listing.metadata.totalBids || 0) + 1
                }
            });
        }
    }

    /**
     * Handle offer made event
     */
    private async handleOfferMade(listingId: string, offerData: any): Promise<void> {
        // Update listing metadata with offer information
        const listing = await this.getListingById(listingId);
        if (listing) {
            await this.updateListing(listingId, {
                metadata: {
                    ...listing.metadata,
                    lastOfferAmount: offerData.amount,
                    buyer: offerData.buyer,
                    lastOfferAt: new Date().toISOString(),
                    totalOffers: (listing.metadata.totalOffers || 0) + 1
                }
            });
        }
    }

    /**
     * Handle listing sold event
     */
    private async handleListingSold(listingId: string, saleData: any): Promise<void> {
        // Update listing status and inventory
        await this.updateListing(listingId, {
            status: 'sold_out',
            inventory: 0,
            metadata: {
                ...((await this.getListingById(listingId))?.metadata || {}),
                soldAt: new Date().toISOString(),
                buyer: saleData.buyer,
                soldPrice: saleData.price
            }
        });
    }

    /**
     * Handle escrow created event
     */
    private async handleEscrowCreated(listingId: string, escrowData: any): Promise<void> {
        // Update listing metadata with escrow information
        const listing = await this.getListingById(listingId);
        if (listing) {
            await this.updateListing(listingId, {
                metadata: {
                    ...listing.metadata,
                    escrowId: escrowData.escrowId,
                    escrowCreatedAt: new Date().toISOString(),
                    buyer: escrowData.buyer,
                    isEscrowed: true
                }
            });
        }
    }
}
