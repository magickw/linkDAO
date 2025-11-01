import { UnifiedMarketplaceService } from './unifiedMarketplaceService';
import { safeLogger } from '../utils/safeLogger';
import { BlockchainMarketplaceService } from './marketplaceService';
import { safeLogger } from '../utils/safeLogger';
import { ProductListingService } from './listingService';
import { safeLogger } from '../utils/safeLogger';

/**
 * Migration Service for Marketplace Service Conflicts
 * 
 * This service provides backward compatibility during the transition
 * from the old conflicting services to the new unified architecture.
 * 
 * @deprecated Use UnifiedMarketplaceService instead
 */
export class MarketplaceServiceMigration {
    private unifiedService: UnifiedMarketplaceService;
    private blockchainService: BlockchainMarketplaceService;
    private productService: ProductListingService;

    constructor() {
        this.unifiedService = new UnifiedMarketplaceService();
        this.blockchainService = new BlockchainMarketplaceService();
        this.productService = new ProductListingService();
    }

    /**
     * Legacy MarketplaceService compatibility layer
     * @deprecated Use UnifiedMarketplaceService.createBlockchainListing instead
     */
    async createListing(input: any) {
        safeLogger.warn('DEPRECATED: Use UnifiedMarketplaceService.createBlockchainListing instead');
        return this.blockchainService.createListing(input);
    }

    /**
     * Legacy MarketplaceService compatibility layer
     * @deprecated Use UnifiedMarketplaceService.getBlockchainListingById instead
     */
    async getListingById(id: string) {
        safeLogger.warn('DEPRECATED: Use UnifiedMarketplaceService.getBlockchainListingById instead');
        return this.blockchainService.getListingById(id);
    }

    /**
     * Legacy MarketplaceService compatibility layer
     * @deprecated Use UnifiedMarketplaceService.updateBlockchainListing instead
     */
    async updateListing(id: string, input: any) {
        safeLogger.warn('DEPRECATED: Use UnifiedMarketplaceService.updateBlockchainListing instead');
        return this.blockchainService.updateListing(id, input);
    }

    /**
     * Legacy MarketplaceService compatibility layer
     * @deprecated Use UnifiedMarketplaceService.getListingsBySeller instead
     */
    async getListingsBySeller(sellerAddress: string) {
        safeLogger.warn('DEPRECATED: Use UnifiedMarketplaceService.getListingsBySeller instead');
        return this.blockchainService.getListingsBySeller(sellerAddress);
    }

    /**
     * Legacy ListingService compatibility layer
     * @deprecated Use UnifiedMarketplaceService.createListing instead
     */
    async createProductListing(input: any) {
        safeLogger.warn('DEPRECATED: Use UnifiedMarketplaceService.createListing instead');
        return this.productService.createListing(input);
    }

    /**
     * Legacy ListingService compatibility layer
     * @deprecated Use UnifiedMarketplaceService.getListingById instead
     */
    async getProductListingById(id: string) {
        safeLogger.warn('DEPRECATED: Use UnifiedMarketplaceService.getListingById instead');
        const result = await this.unifiedService.getListingById(id);
        return result.product;
    }

    /**
     * Legacy ListingService compatibility layer
     * @deprecated Use UnifiedMarketplaceService.updateListing instead
     */
    async updateProductListing(id: string, input: any) {
        safeLogger.warn('DEPRECATED: Use UnifiedMarketplaceService.updateListing instead');
        const result = await this.unifiedService.updateListing(id, input);
        return result.product;
    }

    /**
     * Legacy ListingService compatibility layer
     * @deprecated Use UnifiedMarketplaceService.searchListings instead
     */
    async getMarketplaceListings(filters?: any, sort?: any, pagination?: any) {
        safeLogger.warn('DEPRECATED: Use UnifiedMarketplaceService.searchListings instead');
        return this.unifiedService.searchListings(filters, sort, pagination);
    }

    /**
     * Migration helper: Convert old MarketplaceService calls to new unified service
     */
    static getMigrationGuide(): Record<string, string> {
        return {
            'MarketplaceService.createListing': 'UnifiedMarketplaceService.createBlockchainListing',
            'MarketplaceService.getListingById': 'UnifiedMarketplaceService.getBlockchainListingById',
            'MarketplaceService.updateListing': 'UnifiedMarketplaceService.updateBlockchainListing',
            'MarketplaceService.getListingsBySeller': 'UnifiedMarketplaceService.getListingsBySeller',
            'MarketplaceService.getAllListings': 'UnifiedMarketplaceService.getActiveBlockchainListings',
            'MarketplaceService.getActiveListings': 'UnifiedMarketplaceService.getActiveBlockchainListings',
            'ListingService.createListing': 'UnifiedMarketplaceService.createListing',
            'ListingService.getListingById': 'UnifiedMarketplaceService.getListingById',
            'ListingService.updateListing': 'UnifiedMarketplaceService.updateListing',
            'ListingService.getMarketplaceListings': 'UnifiedMarketplaceService.searchListings'
        };
    }

    /**
     * Check for conflicts in existing codebase
     */
    static async analyzeConflicts(): Promise<{
        conflicts: string[];
        recommendations: string[];
    }> {
        const conflicts = [
            'Duplicate method names between MarketplaceService and ListingService',
            'Incompatible data models (MarketplaceListing vs Product)',
            'Different database schemas (listings vs products tables)',
            'Inconsistent error handling patterns',
            'Different caching strategies'
        ];

        const recommendations = [
            'Migrate to UnifiedMarketplaceService for all new code',
            'Use ProductListingService for e-commerce focused operations',
            'Use BlockchainMarketplaceService for blockchain-only operations',
            'Implement gradual migration plan for existing controllers',
            'Update all imports to use new service names',
            'Add comprehensive testing for the unified service',
            'Update documentation to reflect new architecture'
        ];

        return { conflicts, recommendations };
    }

    /**
     * Generate migration script for existing controllers
     */
    static generateMigrationScript(): string {
        return `
// Migration Script for Marketplace Service Conflicts
// Run this to update your existing code

// 1. Update imports
// OLD:
// import { MarketplaceService } from './services/marketplaceService';
// import { ListingService } from './services/listingService';

// NEW:
import { UnifiedMarketplaceService } from './services/unifiedMarketplaceService';
import { safeLogger } from '../utils/safeLogger';
import { BlockchainMarketplaceService } from './services/marketplaceService';
import { safeLogger } from '../utils/safeLogger';
import { ProductListingService } from './services/listingService';
import { safeLogger } from '../utils/safeLogger';

// 2. Update service instantiation
// OLD:
// const marketplaceService = new MarketplaceService();
// const listingService = new ProductListingService();

// NEW:
const unifiedService = new UnifiedMarketplaceService();
// OR for specific use cases:
const blockchainService = new BlockchainMarketplaceService();
const productService = new ProductListingService();

// 3. Update method calls
// For creating listings that need both product and blockchain records:
// OLD: await listingService.createListing(input);
// NEW: await unifiedService.createListing({ ...input, publishToBlockchain: true });

// For blockchain-only operations:
// OLD: await marketplaceService.createListing(input);
// NEW: await unifiedService.createBlockchainListing(input);

// For product-only operations:
// OLD: await listingService.createListing(input);
// NEW: await unifiedService.createListing(input);

// 4. Update error handling
// The unified service provides consistent error handling across all operations
`;
    }
}

// Export for backward compatibility
export const marketplaceServiceMigration = new MarketplaceServiceMigration();