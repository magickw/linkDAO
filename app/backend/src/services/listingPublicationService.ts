import { ProductListingService } from './listingService';
import { safeLogger } from '../utils/safeLogger';
import { RedisService } from './redisService';
import { DatabaseService } from './databaseService';
import { Product } from '../models/Product';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema';

export interface ListingPublicationWorkflow {
  listingId: string;
  status: 'pending' | 'indexing' | 'published' | 'failed';
  publishedAt?: Date;
  searchIndexed: boolean;
  cacheUpdated: boolean;
  errors?: string[];
}

export interface ListingVisibilityUpdate {
  listingId: string;
  action: 'publish' | 'unpublish' | 'update' | 'delete';
  timestamp: Date;
  metadata?: any;
}

export interface SearchIndexUpdate {
  listingId: string;
  searchVector: string;
  keywords: string[];
  categoryId: string;
  sellerId: string;
  status: 'active' | 'inactive';
  lastIndexed: Date;
}

export class ListingPublicationService {
  private listingService: ProductListingService;
  private redisService: RedisService;
  private databaseService: DatabaseService;

  constructor() {
    this.listingService = new ProductListingService();
    this.redisService = RedisService.getInstance();
    this.databaseService = new DatabaseService();
  }

  /**
   * Publish a listing with immediate marketplace visibility
   * Requirements: 3.2, 3.3
   */
  async publishListing(listingId: string): Promise<ListingPublicationWorkflow> {
    const workflow: ListingPublicationWorkflow = {
      listingId,
      status: 'pending',
      searchIndexed: false,
      cacheUpdated: false,
      errors: []
    };

    try {
      // Step 1: Update listing status to published
      const listing = await this.listingService.updateListing(listingId, {
        listingStatus: 'published'
      });

      if (!listing) {
        workflow.status = 'failed';
        workflow.errors?.push('Listing not found');
        return workflow;
      }

      workflow.status = 'indexing';
      workflow.publishedAt = new Date();

      // Step 2: Update search index
      await this.updateSearchIndex(listing);
      workflow.searchIndexed = true;

      // Step 3: Update marketplace cache
      await this.updateMarketplaceCache(listing);
      workflow.cacheUpdated = true;

      // Step 4: Propagate changes to all relevant caches
      await this.propagateListingChanges({
        listingId,
        action: 'publish',
        timestamp: new Date(),
        metadata: { sellerId: listing.sellerId, categoryId: listing.category.id }
      });

      workflow.status = 'published';

      // Log publication activity
      await this.logPublicationActivity(listingId, 'published', {
        publishedAt: workflow.publishedAt,
        searchIndexed: workflow.searchIndexed,
        cacheUpdated: workflow.cacheUpdated
      });

      return workflow;
    } catch (error) {
      workflow.status = 'failed';
      workflow.errors?.push(error instanceof Error ? error.message : 'Unknown error');
      
      // Log publication failure
      await this.logPublicationActivity(listingId, 'publication_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return workflow;
    }
  }

  /**
   * Unpublish a listing with immediate removal from marketplace
   * Requirements: 3.2, 3.4
   */
  async unpublishListing(listingId: string): Promise<ListingPublicationWorkflow> {
    const workflow: ListingPublicationWorkflow = {
      listingId,
      status: 'pending',
      searchIndexed: false,
      cacheUpdated: false,
      errors: []
    };

    try {
      // Step 1: Update listing status to inactive
      const listing = await this.listingService.updateListing(listingId, {
        listingStatus: 'inactive'
      });

      if (!listing) {
        workflow.status = 'failed';
        workflow.errors?.push('Listing not found');
        return workflow;
      }

      workflow.status = 'indexing';

      // Step 2: Remove from search index
      await this.removeFromSearchIndex(listingId);
      workflow.searchIndexed = true;

      // Step 3: Remove from marketplace cache
      await this.removeFromMarketplaceCache(listingId);
      workflow.cacheUpdated = true;

      // Step 4: Propagate changes
      await this.propagateListingChanges({
        listingId,
        action: 'unpublish',
        timestamp: new Date(),
        metadata: { sellerId: listing.sellerId, categoryId: listing.category.id }
      });

      workflow.status = 'published'; // Status represents workflow completion

      // Log unpublication activity
      await this.logPublicationActivity(listingId, 'unpublished', {
        unpublishedAt: new Date(),
        searchIndexed: workflow.searchIndexed,
        cacheUpdated: workflow.cacheUpdated
      });

      return workflow;
    } catch (error) {
      workflow.status = 'failed';
      workflow.errors?.push(error instanceof Error ? error.message : 'Unknown error');
      
      await this.logPublicationActivity(listingId, 'unpublication_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return workflow;
    }
  }

  /**
   * Update search index for immediate discoverability
   * Requirements: 3.2, 3.3
   */
  private async updateSearchIndex(listing: Product): Promise<void> {
    const searchUpdate: SearchIndexUpdate = {
      listingId: listing.id,
      searchVector: this.generateSearchVector(listing),
      keywords: this.extractKeywords(listing),
      categoryId: listing.category.id,
      sellerId: listing.sellerId,
      status: 'active',
      lastIndexed: new Date()
    };

    // Update database search vector
    const db = this.databaseService.getDatabase();
    await db.update(schema.products)
      .set({
        searchVector: searchUpdate.searchVector,
        updatedAt: new Date()
      })
      .where(eq(schema.products.id, listing.id));

    // Update Redis search index cache
    await this.redisService.set(
      `search_index:${listing.id}`,
      searchUpdate,
      3600 // 1 hour
    );

    // Update category-specific search cache
    await this.invalidateCategorySearchCache(listing.category.id);

    // Update seller-specific search cache
    await this.invalidateSellerSearchCache(listing.sellerId);
  }

  /**
   * Remove listing from search index
   */
  private async removeFromSearchIndex(listingId: string): Promise<void> {
    // Remove from Redis search cache
    await this.redisService.del(`search_index:${listingId}`);

    // Get listing info for cache invalidation
    const listing = await this.listingService.getListingById(listingId);
    if (listing) {
      await this.invalidateCategorySearchCache(listing.category.id);
      await this.invalidateSellerSearchCache(listing.sellerId);
    }
  }

  /**
   * Update marketplace cache for immediate visibility
   * Requirements: 3.2, 3.3
   */
  private async updateMarketplaceCache(listing: Product): Promise<void> {
    // Add to active listings cache
    const activeListingsKey = 'marketplace:active_listings';
    const cachedListings = await this.redisService.get(activeListingsKey) || [];
    
    // Remove existing entry if present
    const filteredListings = cachedListings.filter((l: any) => l.id !== listing.id);
    
    // Add updated listing to the beginning (most recent first)
    filteredListings.unshift(listing);
    
    // Keep only the most recent 100 listings in cache
    const updatedListings = filteredListings.slice(0, 100);
    
    await this.redisService.set(activeListingsKey, updatedListings, 300); // 5 minutes

    // Update category-specific cache
    const categoryKey = `marketplace:category:${listing.category.id}`;
    const categoryListings = await this.redisService.get(categoryKey) || [];
    const filteredCategoryListings = categoryListings.filter((l: any) => l.id !== listing.id);
    filteredCategoryListings.unshift(listing);
    await this.redisService.set(categoryKey, filteredCategoryListings.slice(0, 50), 300);

    // Update seller-specific cache
    const sellerKey = `marketplace:seller:${listing.sellerId}`;
    const sellerListings = await this.redisService.get(sellerKey) || [];
    const filteredSellerListings = sellerListings.filter((l: any) => l.id !== listing.id);
    filteredSellerListings.unshift(listing);
    await this.redisService.set(sellerKey, filteredSellerListings.slice(0, 50), 300);
  }

  /**
   * Remove listing from marketplace cache
   */
  private async removeFromMarketplaceCache(listingId: string): Promise<void> {
    // Get listing info before removal
    const listing = await this.listingService.getListingById(listingId);
    
    // Remove from active listings cache
    const activeListingsKey = 'marketplace:active_listings';
    const cachedListings = await this.redisService.get(activeListingsKey) || [];
    const filteredListings = cachedListings.filter((l: any) => l.id !== listingId);
    await this.redisService.set(activeListingsKey, filteredListings, 300);

    if (listing) {
      // Remove from category cache
      const categoryKey = `marketplace:category:${listing.category.id}`;
      const categoryListings = await this.redisService.get(categoryKey) || [];
      const filteredCategoryListings = categoryListings.filter((l: any) => l.id !== listingId);
      await this.redisService.set(categoryKey, filteredCategoryListings, 300);

      // Remove from seller cache
      const sellerKey = `marketplace:seller:${listing.sellerId}`;
      const sellerListings = await this.redisService.get(sellerKey) || [];
      const filteredSellerListings = sellerListings.filter((l: any) => l.id !== listingId);
      await this.redisService.set(sellerKey, filteredSellerListings, 300);
    }

    // Remove individual listing cache
    await this.redisService.invalidateProductListing(listingId);
  }

  /**
   * Propagate listing changes to all relevant systems
   * Requirements: 3.2, 3.3
   */
  private async propagateListingChanges(update: ListingVisibilityUpdate): Promise<void> {
    // Invalidate related caches
    await this.invalidateRelatedCaches(update);

    // Update real-time feeds (if implemented)
    await this.updateRealTimeFeeds(update);

    // Notify subscribers (if implemented)
    await this.notifySubscribers(update);

    // Log the propagation
    await this.logListingChange(update);
  }

  /**
   * Invalidate all caches related to a listing change
   */
  private async invalidateRelatedCaches(update: ListingVisibilityUpdate): Promise<void> {
    const cacheKeys = [
      'marketplace:active_listings',
      'marketplace:featured_listings',
      'marketplace:recent_listings',
      `marketplace:category:${update.metadata?.categoryId}`,
      `marketplace:seller:${update.metadata?.sellerId}`,
      `search:popular_queries`,
      `search:trending_categories`
    ];

    // Invalidate all related cache keys
    await Promise.all(cacheKeys.map(key => this.redisService.del(key)));
  }

  /**
   * Update real-time feeds with listing changes
   */
  private async updateRealTimeFeeds(update: ListingVisibilityUpdate): Promise<void> {
    // This would integrate with WebSocket or Server-Sent Events
    // For now, we'll just log the update
    safeLogger.info(`Real-time feed update: ${update.action} for listing ${update.listingId}`);
  }

  /**
   * Notify subscribers of listing changes
   */
  private async notifySubscribers(update: ListingVisibilityUpdate): Promise<void> {
    // This would integrate with notification service
    // For now, we'll just log the notification
    safeLogger.info(`Notifying subscribers of ${update.action} for listing ${update.listingId}`);
  }

  /**
   * Generate search vector from listing content
   */
  private generateSearchVector(listing: Product): string {
    const searchTerms = [
      listing.title,
      listing.description,
      listing.category.name,
      ...listing.tags,
      listing.metadata.brand || '',
      listing.metadata.model || ''
    ];

    return searchTerms
      .filter(term => term && term.trim().length > 0)
      .map(term => term.toLowerCase().trim())
      .join(' ');
  }

  /**
   * Extract keywords from listing for search optimization
   */
  private extractKeywords(listing: Product): string[] {
    const keywords = new Set<string>();

    // Add title words
    listing.title.toLowerCase().split(/\s+/).forEach(word => {
      if (word.length > 2) keywords.add(word);
    });

    // Add tags
    listing.tags.forEach(tag => keywords.add(tag.toLowerCase()));

    // Add category
    keywords.add(listing.category.name.toLowerCase());

    // Add brand and model if available
    if (listing.metadata.brand) {
      keywords.add(listing.metadata.brand.toLowerCase());
    }
    if (listing.metadata.model) {
      keywords.add(listing.metadata.model.toLowerCase());
    }

    return Array.from(keywords);
  }

  /**
   * Invalidate category-specific search cache
   */
  private async invalidateCategorySearchCache(categoryId: string): Promise<void> {
    const cacheKeys = [
      `search:category:${categoryId}`,
      `marketplace:category:${categoryId}`,
      'search:popular_categories'
    ];

    await Promise.all(cacheKeys.map(key => this.redisService.del(key)));
  }

  /**
   * Invalidate seller-specific search cache
   */
  private async invalidateSellerSearchCache(sellerId: string): Promise<void> {
    const cacheKeys = [
      `search:seller:${sellerId}`,
      `marketplace:seller:${sellerId}`,
      'search:popular_sellers'
    ];

    await Promise.all(cacheKeys.map(key => this.redisService.del(key)));
  }

  /**
   * Log publication activity for audit trail
   */
  private async logPublicationActivity(listingId: string, action: string, metadata: any): Promise<void> {
    safeLogger.info(`Listing ${listingId}: ${action}`, metadata);
    
    // In a real implementation, this would write to an audit log table
    // For now, we'll just log to console
  }

  /**
   * Log listing change for monitoring
   */
  private async logListingChange(update: ListingVisibilityUpdate): Promise<void> {
    safeLogger.info(`Listing change propagated:`, update);
    
    // In a real implementation, this would write to a monitoring system
    // For now, we'll just log to console
  }

  /**
   * Get publication workflow status
   */
  async getPublicationStatus(listingId: string): Promise<ListingPublicationWorkflow | null> {
    // This would typically be stored in Redis or database
    // For now, we'll return a basic status based on listing state
    const listing = await this.listingService.getListingById(listingId);
    
    if (!listing) {
      return null;
    }

    return {
      listingId,
      status: listing.status === 'active' ? 'published' : 'pending',
      publishedAt: listing.createdAt,
      searchIndexed: true,
      cacheUpdated: true
    };
  }

  /**
   * Batch publish multiple listings
   */
  async batchPublishListings(listingIds: string[]): Promise<ListingPublicationWorkflow[]> {
    const results: ListingPublicationWorkflow[] = [];

    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < listingIds.length; i += batchSize) {
      const batch = listingIds.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(id => this.publishListing(id))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Batch unpublish multiple listings
   */
  async batchUnpublishListings(listingIds: string[]): Promise<ListingPublicationWorkflow[]> {
    const results: ListingPublicationWorkflow[] = [];

    const batchSize = 10;
    for (let i = 0; i < listingIds.length; i += batchSize) {
      const batch = listingIds.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(id => this.unpublishListing(id))
      );
      results.push(...batchResults);
    }

    return results;
  }
}
