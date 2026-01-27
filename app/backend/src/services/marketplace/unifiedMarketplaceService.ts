import { ProductListingService } from './listingService';
import { safeLogger } from '../../utils/safeLogger';
import { BlockchainMarketplaceService } from './marketplaceService';
import { Product, CreateProductInput, UpdateProductInput, ProductSearchFilters, ProductSortOptions, PaginationOptions, ProductSearchResult } from '../../models/Product';
import { MarketplaceListing, CreateListingInput as BlockchainCreateListingInput, UpdateListingInput as BlockchainUpdateListingInput } from '../../models/Marketplace';
import { ValidationError } from '../../models/validation';

/**
 * Unified Marketplace Service
 * 
 * This service provides a single interface for all marketplace operations,
 * handling both e-commerce product listings and blockchain marketplace listings.
 * It automatically synchronizes data between both systems.
 */
export class UnifiedMarketplaceService {
    private productListingService: ProductListingService;
    private blockchainMarketplaceService: BlockchainMarketplaceService;

    constructor() {
        this.productListingService = new ProductListingService();
        this.blockchainMarketplaceService = new BlockchainMarketplaceService();
    }

    // ========================================
    // UNIFIED LISTING OPERATIONS
    // ========================================

    /**
     * Create a new listing (both product and blockchain)
     * This is the main entry point for creating listings
     */
    async createListing(input: CreateProductInput & {
        publishToBlockchain?: boolean;
        blockchainOptions?: {
            tokenAddress?: string;
            itemType?: 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE';
            listingType?: 'FIXED_PRICE' | 'AUCTION';
            duration?: number;
        };
    }): Promise<{
        product: Product;
        blockchainListing?: MarketplaceListing;
        success: boolean;
        errors?: string[];
    }> {
        try {
            // Create the product listing first
            const product = await this.productListingService.createListing(input);

            let blockchainListing: MarketplaceListing | undefined;
            const errors: string[] = [];

            // Publish to blockchain if requested
            if (input.publishToBlockchain) {
                try {
                    blockchainListing = await this.productListingService.publishToBlockchain(
                        product.id,
                        input.blockchainOptions
                    );
                } catch (error) {
                    errors.push(`Blockchain publication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            return {
                product,
                blockchainListing,
                success: true,
                errors: errors.length > 0 ? errors : undefined
            };
        } catch (error) {
            throw new ValidationError(
                `Failed to create listing: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'creation'
            );
        }
    }

    /**
     * Update a listing (both product and blockchain if applicable)
     */
    async updateListing(id: string, input: UpdateProductInput & {
        syncToBlockchain?: boolean;
    }): Promise<{
        product: Product | null;
        blockchainListing?: MarketplaceListing | null;
        success: boolean;
        errors?: string[];
    }> {
        try {
            // Update the product listing
            const product = await this.productListingService.updateListing(id, input);
            if (!product) {
                return { product: null, success: false, errors: ['Product not found'] };
            }

            let blockchainListing: MarketplaceListing | null = null;
            const errors: string[] = [];

            // Sync to blockchain if requested and blockchain listing exists
            if (input.syncToBlockchain && product.metadata?.blockchainListingId) {
                try {
                    const syncResult = await this.productListingService.syncWithBlockchain(id);
                    blockchainListing = syncResult.blockchainListing;
                    if (!syncResult.synced) {
                        errors.push('Blockchain synchronization failed');
                    }
                } catch (error) {
                    errors.push(`Blockchain sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            return {
                product,
                blockchainListing,
                success: true,
                errors: errors.length > 0 ? errors : undefined
            };
        } catch (error) {
            throw new ValidationError(
                `Failed to update listing: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'update'
            );
        }
    }

    /**
     * Get a listing by ID (with blockchain data if available)
     */
    async getListingById(id: string, includeBlockchainData: boolean = false): Promise<{
        product: Product | null;
        blockchainData?: {
            listing: MarketplaceListing | null;
            bids: any[];
            offers: any[];
            escrow: any | null;
        };
    }> {
        try {
            const product = await this.productListingService.getListingById(id);
            if (!product) {
                return { product: null };
            }

            let blockchainData;
            if (includeBlockchainData && product.metadata?.blockchainListingId) {
                blockchainData = await this.productListingService.getBlockchainData(id);
            }

            return { product, blockchainData };
        } catch (error) {
            safeLogger.error('Error getting listing:', error);
            return { product: null };
        }
    }

    /**
     * Search and filter listings
     */
    async searchListings(
        filters: ProductSearchFilters = {},
        sort: ProductSortOptions = { field: 'createdAt', direction: 'desc' },
        pagination: PaginationOptions = { page: 1, limit: 20 },
        includeBlockchainData: boolean = false
    ): Promise<ProductSearchResult & {
        blockchainData?: Record<string, any>;
    }> {
        try {
            const result = await this.productListingService.getMarketplaceListings(filters, sort, pagination);

            let blockchainData: Record<string, any> = {};
            if (includeBlockchainData) {
                // Get blockchain data for products that have it
                const blockchainPromises = result.products
                    .filter(p => p.metadata?.blockchainListingId)
                    .map(async (p) => {
                        const data = await this.productListingService.getBlockchainData(p.id);
                        return { productId: p.id, data };
                    });

                const blockchainResults = await Promise.all(blockchainPromises);
                blockchainData = blockchainResults.reduce((acc, { productId, data }) => {
                    acc[productId] = data;
                    return acc;
                }, {} as Record<string, any>);
            }

            return {
                ...result,
                blockchainData: Object.keys(blockchainData).length > 0 ? blockchainData : undefined
            };
        } catch (error) {
            safeLogger.error('Error searching listings:', error);
            throw new ValidationError('Failed to search listings', 'search');
        }
    }

    /**
     * Get listings by seller
     */
    async getListingsBySeller(
        sellerId: string,
        includeBlockchainData: boolean = false
    ): Promise<{
        products: Product[];
        blockchainListings?: MarketplaceListing[];
    }> {
        try {
            // Get product listings
            const searchResult = await this.productListingService.getMarketplaceListings(
                { sellerId },
                { field: 'createdAt', direction: 'desc' },
                { page: 1, limit: 100 }
            );

            let blockchainListings: MarketplaceListing[] = [];
            if (includeBlockchainData) {
                // Get blockchain listings for this seller
                // Note: This assumes sellerId is the wallet address for blockchain
                try {
                    blockchainListings = await this.blockchainMarketplaceService.getListingsBySeller(sellerId);
                } catch (error) {
                    safeLogger.error('Error getting blockchain listings for seller:', error);
                }
            }

            return {
                products: searchResult.products,
                blockchainListings: blockchainListings.length > 0 ? blockchainListings : undefined
            };
        } catch (error) {
            safeLogger.error('Error getting listings by seller:', error);
            throw new ValidationError('Failed to get seller listings', 'seller');
        }
    }

    // ========================================
    // BLOCKCHAIN-SPECIFIC OPERATIONS
    // ========================================

    /**
     * Publish existing product to blockchain
     */
    async publishToBlockchain(
        productId: string,
        options?: {
            tokenAddress?: string;
            itemType?: 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE';
            listingType?: 'FIXED_PRICE' | 'AUCTION';
            duration?: number;
        }
    ): Promise<MarketplaceListing> {
        return this.productListingService.publishToBlockchain(productId, options);
    }

    /**
     * Sync product with blockchain listing
     */
    async syncWithBlockchain(productId: string): Promise<{
        productListing: Product | null;
        blockchainListing: MarketplaceListing | null;
        synced: boolean;
    }> {
        return this.productListingService.syncWithBlockchain(productId);
    }

    /**
     * Handle blockchain events
     */
    async handleBlockchainEvent(event: {
        type: 'BID_PLACED' | 'OFFER_MADE' | 'LISTING_SOLD' | 'ESCROW_CREATED';
        listingId: string;
        data: any;
    }): Promise<void> {
        return this.productListingService.handleBlockchainEvent(event);
    }

    // ========================================
    // DIRECT BLOCKCHAIN OPERATIONS
    // ========================================

    /**
     * Create blockchain-only listing (no product record)
     * Use this for pure blockchain operations
     */
    async createBlockchainListing(input: BlockchainCreateListingInput): Promise<MarketplaceListing> {
        return this.blockchainMarketplaceService.createListing(input);
    }

    /**
     * Update blockchain-only listing
     */
    async updateBlockchainListing(id: string, input: BlockchainUpdateListingInput): Promise<MarketplaceListing | null> {
        return this.blockchainMarketplaceService.updateListing(id, input);
    }

    /**
     * Get blockchain listing by ID
     */
    async getBlockchainListingById(id: string): Promise<MarketplaceListing | null> {
        return this.blockchainMarketplaceService.getListingById(id);
    }

    /**
     * Get all active blockchain listings
     */
    async getActiveBlockchainListings(): Promise<MarketplaceListing[]> {
        return this.blockchainMarketplaceService.getActiveListings();
    }

    // ========================================
    // BIDDING AND OFFERS
    // ========================================

    /**
     * Place bid on blockchain listing
     */
    async placeBid(listingId: string, bidderAddress: string, amount: string): Promise<any> {
        return this.blockchainMarketplaceService.placeBid(listingId, {
            bidderWalletAddress: bidderAddress,
            amount
        });
    }

    /**
     * Make offer on blockchain listing
     */
    async makeOffer(listingId: string, buyerAddress: string, amount: string): Promise<any> {
        return this.blockchainMarketplaceService.makeOffer(listingId, {
            buyerWalletAddress: buyerAddress,
            amount
        });
    }

    /**
     * Accept offer on blockchain listing
     */
    async acceptOffer(offerId: string): Promise<boolean> {
        return this.blockchainMarketplaceService.acceptOffer(offerId);
    }

    // ========================================
    // ESCROW OPERATIONS
    // ========================================

    /**
     * Create escrow for blockchain listing
     */
    async createEscrow(listingId: string, buyerAddress: string, deliveryInfo?: string): Promise<any> {
        return this.blockchainMarketplaceService.createEscrow(listingId, buyerAddress, deliveryInfo);
    }

    /**
     * Approve escrow
     */
    async approveEscrow(escrowId: string, userAddress: string): Promise<boolean> {
        return this.blockchainMarketplaceService.approveEscrow(escrowId, userAddress);
    }

    /**
     * Open dispute
     */
    async openDispute(escrowId: string, userAddress: string): Promise<boolean> {
        return this.blockchainMarketplaceService.openDispute(escrowId, userAddress);
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    /**
     * Get comprehensive listing statistics
     */
    async getListingStats(id: string): Promise<{
        product?: Product;
        blockchain?: MarketplaceListing;
        activity: {
            views: number;
            favorites: number;
            bids?: number;
            offers?: number;
        };
        performance: {
            conversionRate?: number;
            averageViewTime?: number;
        };
    }> {
        try {
            const { product, blockchainData } = await this.getListingById(id, true);
            
            const stats = {
                product,
                blockchain: blockchainData?.listing,
                activity: {
                    views: product?.views || 0,
                    favorites: product?.favorites || 0,
                    bids: blockchainData?.bids?.length || 0,
                    offers: blockchainData?.offers?.length || 0
                },
                performance: {
                    // Add performance metrics calculation here
                }
            };

            return stats;
        } catch (error) {
            safeLogger.error('Error getting listing stats:', error);
            throw new ValidationError('Failed to get listing statistics', 'stats');
        }
    }

    /**
     * Bulk sync all listings with blockchain
     */
    async bulkSyncWithBlockchain(): Promise<{
        synced: number;
        failed: number;
        errors: string[];
    }> {
        try {
            // Get all products with blockchain listing IDs
            const searchResult = await this.productListingService.getMarketplaceListings(
                {},
                { field: 'createdAt', direction: 'desc' },
                { page: 1, limit: 1000 }
            );

            const productsWithBlockchain = searchResult.products.filter(
                p => p.metadata?.blockchainListingId
            );

            let synced = 0;
            let failed = 0;
            const errors: string[] = [];

            for (const product of productsWithBlockchain) {
                try {
                    const result = await this.productListingService.syncWithBlockchain(product.id);
                    if (result.synced) {
                        synced++;
                    } else {
                        failed++;
                        errors.push(`Failed to sync product ${product.id}`);
                    }
                } catch (error) {
                    failed++;
                    errors.push(`Error syncing product ${product.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            return { synced, failed, errors };
        } catch (error) {
            safeLogger.error('Error in bulk sync:', error);
            throw new ValidationError('Failed to perform bulk sync', 'bulk_sync');
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
        return this.productListingService.getBlockchainData(listingId);
    }
}

// Export singleton instance
export const unifiedMarketplaceService = new UnifiedMarketplaceService();
