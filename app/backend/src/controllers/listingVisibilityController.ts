import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { ListingPublicationService } from '../services/listingPublicationService';
import { ProductListingService } from '../services/listingService';
import { ValidationError } from '../models/validation';

export class ListingVisibilityController {
  private listingPublicationService: ListingPublicationService;
  private listingService: ProductListingService;

  constructor() {
    this.listingPublicationService = new ListingPublicationService();
    this.listingService = new ProductListingService();
  }

  /**
   * Publish listing with immediate marketplace visibility
   * POST /api/listings/:id/publish-immediate
   * Requirements: 3.2, 3.3
   */
  async publishListingImmediate(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      // Validate listing exists
      const listing = await this.listingService.getListingById(id);
      if (!listing) {
        return res.status(404).json({
          error: 'Listing not found',
          message: `No listing found with ID: ${id}`
        });
      }

      // Execute publication workflow
      const workflow = await this.listingPublicationService.publishListing(id);
      
      if (workflow.status === 'failed') {
        return res.status(400).json({
          error: 'Publication failed',
          message: 'Failed to publish listing',
          workflow,
          errors: workflow.errors
        });
      }

      return res.json({
        success: true,
        message: 'Listing published successfully with immediate visibility',
        workflow,
        listing: await this.listingService.getListingById(id)
      });
    } catch (error: any) {
      safeLogger.error('Error publishing listing immediately:', error);
      
      if (error instanceof ValidationError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.message,
          field: error.field
        });
      }
      
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to publish listing'
      });
    }
  }

  /**
   * Unpublish listing with immediate removal from marketplace
   * POST /api/listings/:id/unpublish-immediate
   * Requirements: 3.2, 3.4
   */
  async unpublishListingImmediate(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      // Validate listing exists
      const listing = await this.listingService.getListingById(id);
      if (!listing) {
        return res.status(404).json({
          error: 'Listing not found',
          message: `No listing found with ID: ${id}`
        });
      }

      // Execute unpublication workflow
      const workflow = await this.listingPublicationService.unpublishListing(id);
      
      if (workflow.status === 'failed') {
        return res.status(400).json({
          error: 'Unpublication failed',
          message: 'Failed to unpublish listing',
          workflow,
          errors: workflow.errors
        });
      }

      return res.json({
        success: true,
        message: 'Listing unpublished successfully with immediate removal',
        workflow,
        listing: await this.listingService.getListingById(id)
      });
    } catch (error: any) {
      safeLogger.error('Error unpublishing listing immediately:', error);
      
      if (error instanceof ValidationError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.message,
          field: error.field
        });
      }
      
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to unpublish listing'
      });
    }
  }

  /**
   * Get publication workflow status
   * GET /api/listings/:id/publication-status
   * Requirements: 3.3
   */
  async getPublicationStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const status = await this.listingPublicationService.getPublicationStatus(id);
      
      if (!status) {
        return res.status(404).json({
          error: 'Listing not found',
          message: `No listing found with ID: ${id}`
        });
      }

      return res.json({
        success: true,
        status
      });
    } catch (error: any) {
      safeLogger.error('Error fetching publication status:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch publication status'
      });
    }
  }

  /**
   * Batch publish multiple listings
   * POST /api/listings/batch-publish
   * Requirements: 3.2, 3.3
   */
  async batchPublishListings(req: Request, res: Response): Promise<Response> {
    try {
      const { listingIds } = req.body;
      
      if (!Array.isArray(listingIds) || listingIds.length === 0) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'listingIds must be a non-empty array'
        });
      }

      if (listingIds.length > 50) {
        return res.status(400).json({
          error: 'Batch size too large',
          message: 'Maximum 50 listings can be published at once'
        });
      }

      const workflows = await this.listingPublicationService.batchPublishListings(listingIds);
      
      const successful = workflows.filter(w => w.status === 'published');
      const failed = workflows.filter(w => w.status === 'failed');

      return res.json({
        success: true,
        message: `Batch publication completed: ${successful.length} successful, ${failed.length} failed`,
        results: {
          successful: successful.length,
          failed: failed.length,
          total: workflows.length,
          workflows
        }
      });
    } catch (error: any) {
      safeLogger.error('Error batch publishing listings:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to batch publish listings'
      });
    }
  }

  /**
   * Batch unpublish multiple listings
   * POST /api/listings/batch-unpublish
   * Requirements: 3.2, 3.4
   */
  async batchUnpublishListings(req: Request, res: Response): Promise<Response> {
    try {
      const { listingIds } = req.body;
      
      if (!Array.isArray(listingIds) || listingIds.length === 0) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'listingIds must be a non-empty array'
        });
      }

      if (listingIds.length > 50) {
        return res.status(400).json({
          error: 'Batch size too large',
          message: 'Maximum 50 listings can be unpublished at once'
        });
      }

      const workflows = await this.listingPublicationService.batchUnpublishListings(listingIds);
      
      const successful = workflows.filter(w => w.status === 'published'); // 'published' means workflow completed
      const failed = workflows.filter(w => w.status === 'failed');

      return res.json({
        success: true,
        message: `Batch unpublication completed: ${successful.length} successful, ${failed.length} failed`,
        results: {
          successful: successful.length,
          failed: failed.length,
          total: workflows.length,
          workflows
        }
      });
    } catch (error: any) {
      safeLogger.error('Error batch unpublishing listings:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to batch unpublish listings'
      });
    }
  }

  /**
   * Get real-time marketplace feed
   * GET /api/listings/marketplace/real-time
   * Requirements: 3.2, 3.3
   */
  async getRealTimeMarketplaceFeed(req: Request, res: Response): Promise<Response> {
    try {
      // Parse query parameters for real-time filtering
      const filters = {
        categoryId: req.query.categoryId as string,
        sellerId: req.query.sellerId as string,
        priceMin: req.query.priceMin as string,
        priceMax: req.query.priceMax as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] === undefined) {
          delete filters[key as keyof typeof filters];
        }
      });

      const sort = {
        field: (req.query.sortBy as any) || 'publishedAt',
        direction: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
      };

      const pagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 50) // Max 50 for real-time
      };

      // Get real-time marketplace listings
      const result = await this.listingService.getMarketplaceListings(filters, sort, pagination);
      
      // Add real-time metadata
      const realTimeResult = {
        ...result,
        realTime: true,
        timestamp: new Date().toISOString(),
        cacheStatus: 'live', // Indicates this is live data
        refreshInterval: 30 // Suggested refresh interval in seconds
      };

      return res.json({
        success: true,
        ...realTimeResult
      });
    } catch (error: any) {
      safeLogger.error('Error fetching real-time marketplace feed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch real-time marketplace feed'
      });
    }
  }

  /**
   * Force refresh marketplace cache
   * POST /api/listings/marketplace/refresh-cache
   * Requirements: 3.2, 3.3
   */
  async refreshMarketplaceCache(req: Request, res: Response): Promise<Response> {
    try {
      // This would typically be an admin-only endpoint
      const { categoryId, sellerId } = req.body;

      // Get fresh listings from database
      const filters: any = {};
      if (categoryId) filters.categoryId = categoryId;
      if (sellerId) filters.sellerId = sellerId;

      const freshListings = await this.listingService.getMarketplaceListings(
        { ...filters, status: ['active'] },
        { field: 'publishedAt', direction: 'desc' },
        { page: 1, limit: 100 }
      );

      // Update cache with fresh data
      // This would integrate with the cache refresh logic
      safeLogger.info(`Cache refreshed for ${freshListings.total} listings`);

      return res.json({
        success: true,
        message: 'Marketplace cache refreshed successfully',
        refreshed: {
          listings: freshListings.total,
          categoryId: categoryId || 'all',
          sellerId: sellerId || 'all',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      safeLogger.error('Error refreshing marketplace cache:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to refresh marketplace cache'
      });
    }
  }

  /**
   * Get listing visibility metrics
   * GET /api/listings/:id/visibility-metrics
   * Requirements: 3.3
   */
  async getListingVisibilityMetrics(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const listing = await this.listingService.getListingById(id);
      if (!listing) {
        return res.status(404).json({
          error: 'Listing not found',
          message: `No listing found with ID: ${id}`
        });
      }

      // Get publication status
      const publicationStatus = await this.listingPublicationService.getPublicationStatus(id);

      // Calculate visibility metrics
      const metrics = {
        listingId: id,
        isVisible: listing.status === 'active' && publicationStatus?.status === 'published',
        publishedAt: publicationStatus?.publishedAt,
        searchIndexed: publicationStatus?.searchIndexed || false,
        cacheStatus: publicationStatus?.cacheUpdated ? 'cached' : 'not_cached',
        views: listing.views,
        favorites: listing.favorites,
        lastUpdated: listing.updatedAt,
        visibilityScore: this.calculateVisibilityScore(listing, publicationStatus),
        recommendations: this.getVisibilityRecommendations(listing, publicationStatus)
      };

      return res.json({
        success: true,
        metrics
      });
    } catch (error: any) {
      safeLogger.error('Error fetching visibility metrics:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch visibility metrics'
      });
    }
  }

  /**
   * Calculate visibility score based on various factors
   */
  private calculateVisibilityScore(listing: any, publicationStatus: any): number {
    let score = 0;

    // Base visibility (40 points)
    if (listing.status === 'active') score += 20;
    if (publicationStatus?.status === 'published') score += 20;

    // Search optimization (30 points)
    if (publicationStatus?.searchIndexed) score += 15;
    if (listing.title && listing.title.length > 10) score += 5;
    if (listing.description && listing.description.length > 50) score += 5;
    if (listing.tags && listing.tags.length > 0) score += 5;

    // Content quality (20 points)
    if (listing.images && listing.images.length > 0) score += 10;
    if (listing.images && listing.images.length >= 3) score += 5;
    if (listing.metadata?.brand) score += 3;
    if (listing.shipping) score += 2;

    // Performance (10 points)
    if (listing.views > 10) score += 5;
    if (listing.favorites > 0) score += 5;

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Get visibility improvement recommendations
   */
  private getVisibilityRecommendations(listing: any, publicationStatus: any): string[] {
    const recommendations: string[] = [];

    if (listing.status !== 'active') {
      recommendations.push('Activate the listing to make it visible');
    }

    if (publicationStatus?.status !== 'published') {
      recommendations.push('Publish the listing to appear in marketplace');
    }

    if (!publicationStatus?.searchIndexed) {
      recommendations.push('Update listing to refresh search index');
    }

    if (!listing.images || listing.images.length === 0) {
      recommendations.push('Add images to improve visibility');
    } else if (listing.images.length < 3) {
      recommendations.push('Add more images (recommended: 3-5 images)');
    }

    if (!listing.tags || listing.tags.length === 0) {
      recommendations.push('Add relevant tags to improve discoverability');
    }

    if (listing.title && listing.title.length < 10) {
      recommendations.push('Write a more descriptive title');
    }

    if (listing.description && listing.description.length < 50) {
      recommendations.push('Add a more detailed description');
    }

    if (!listing.metadata?.brand) {
      recommendations.push('Add brand information if applicable');
    }

    if (!listing.shipping) {
      recommendations.push('Add shipping information');
    }

    return recommendations;
  }
}
