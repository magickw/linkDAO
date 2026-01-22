/**
 * Auction Service
 * 
 * Handles auction functionality for the marketplace including:
 * - Creating auctions
 * - Placing bids
 * - Managing auction lifecycle
 * - Real-time bid updates
 * - Auction notifications
 */

import apiClient from './apiClient';

// Auction status
export enum AuctionStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}

// Auction type
export enum AuctionType {
  STANDARD = 'standard',           // Standard ascending auction
  DUTCH = 'dutch',                 // Dutch auction (descending price)
  RESERVE = 'reserve',             // Reserve price auction
  BLIND = 'blind',                 // Blind auction (bids hidden until end)
}

// Auction details
export interface Auction {
  id: string;
  productId: string;
  sellerId: string;
  type: AuctionType;
  status: AuctionStatus;
  startingPrice: number;
  currentBid: number;
  reservePrice?: number;
  buyNowPrice?: number;
  minimumBidIncrement: number;
  startTime: Date;
  endTime: Date;
  extendedEndTime?: Date; // If auction was extended
  bids: AuctionBid[];
  winnerId?: string;
  totalBids: number;
  watchers: number;
  metadata?: {
    description?: string;
    images?: string[];
    category?: string;
    tags?: string[];
  };
}

// Auction bid
export interface AuctionBid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderAddress: string;
  amount: number;
  timestamp: Date;
  isWinning: boolean;
  isAutoBid?: boolean;
}

// Create auction request
export interface CreateAuctionRequest {
  productId: string;
  type: AuctionType;
  startingPrice: number;
  reservePrice?: number;
  buyNowPrice?: number;
  minimumBidIncrement?: number;
  startTime: Date;
  endTime: Date;
  metadata?: {
    description?: string;
    images?: string[];
    category?: string;
    tags?: string[];
  };
}

// Place bid request
export interface PlaceBidRequest {
  auctionId: string;
  bidAmount: number;
  isAutoBid?: boolean;
  maxAutoBidAmount?: number;
}

// Auction filters
export interface AuctionFilters {
  status?: AuctionStatus[];
  type?: AuctionType[];
  category?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  sellerId?: string;
  sortBy?: 'endingSoon' | 'newest' | 'priceLow' | 'priceHigh' | 'mostBids';
  searchQuery?: string;
}

// Auction statistics
export interface AuctionStatistics {
  totalAuctions: number;
  activeAuctions: number;
  endedAuctions: number;
  totalVolume: number;
  averageSalePrice: number;
  totalBids: number;
  averageBidsPerAuction: number;
}

class AuctionService {
  private bidCallbacks: Map<string, ((bid: AuctionBid) => void)[]> = new Map();
  private auctionEndCallbacks: Map<string, ((auction: Auction) => void)[]> = new Map();

  /**
   * Create a new auction
   */
  async createAuction(request: CreateAuctionRequest): Promise<Auction> {
    try {
      const response = await apiClient.post('/auctions', {
        productId: request.productId,
        type: request.type,
        startingPrice: request.startingPrice,
        reservePrice: request.reservePrice,
        buyNowPrice: request.buyNowPrice,
        minimumBidIncrement: request.minimumBidIncrement || request.startingPrice * 0.05,
        startTime: request.startTime.toISOString(),
        endTime: request.endTime.toISOString(),
        metadata: request.metadata,
      });

      return response.data;
    } catch (error) {
      console.error('Error creating auction:', error);
      throw new Error('Failed to create auction');
    }
  }

  /**
   * Get auction by ID
   */
  async getAuction(auctionId: string): Promise<Auction> {
    try {
      const response = await apiClient.get(`/auctions/${auctionId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching auction:', error);
      throw new Error('Failed to fetch auction');
    }
  }

  /**
   * Get multiple auctions with filters
   */
  async getAuctions(filters?: AuctionFilters, page = 1, limit = 20): Promise<{
    auctions: Auction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const params: any = {
        page,
        limit,
      };

      if (filters) {
        if (filters.status) params.status = filters.status.join(',');
        if (filters.type) params.type = filters.type.join(',');
        if (filters.category) params.category = filters.category.join(',');
        if (filters.priceRange) {
          params.minPrice = filters.priceRange.min;
          params.maxPrice = filters.priceRange.max;
        }
        if (filters.sellerId) params.sellerId = filters.sellerId;
        if (filters.sortBy) params.sortBy = filters.sortBy;
        if (filters.searchQuery) params.search = filters.searchQuery;
      }

      const response = await apiClient.get('/auctions', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching auctions:', error);
      throw new Error('Failed to fetch auctions');
    }
  }

  /**
   * Place a bid on an auction
   */
  async placeBid(request: PlaceBidRequest): Promise<AuctionBid> {
    try {
      const response = await apiClient.post(`/auctions/${request.auctionId}/bids`, {
        bidAmount: request.bidAmount,
        isAutoBid: request.isAutoBid || false,
        maxAutoBidAmount: request.maxAutoBidAmount,
      });

      // Notify callbacks
      const callbacks = this.bidCallbacks.get(request.auctionId) || [];
      callbacks.forEach(callback => callback(response.data));

      return response.data;
    } catch (error) {
      console.error('Error placing bid:', error);
      throw new Error('Failed to place bid');
    }
  }

  /**
   * Get bids for an auction
   */
  async getAuctionBids(auctionId: string, page = 1, limit = 20): Promise<{
    bids: AuctionBid[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const response = await apiClient.get(`/auctions/${auctionId}/bids`, {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching auction bids:', error);
      throw new Error('Failed to fetch auction bids');
    }
  }

  /**
   * Cancel an auction (seller only)
   */
  async cancelAuction(auctionId: string): Promise<Auction> {
    try {
      const response = await apiClient.post(`/auctions/${auctionId}/cancel`);
      return response.data;
    } catch (error) {
      console.error('Error cancelling auction:', error);
      throw new Error('Failed to cancel auction');
    }
  }

  /**
   * Buy now (if available)
   */
  async buyNow(auctionId: string): Promise<Auction> {
    try {
      const response = await apiClient.post(`/auctions/${auctionId}/buy-now`);
      return response.data;
    } catch (error) {
      console.error('Error buying now:', error);
      throw new Error('Failed to buy now');
    }
  }

  /**
   * Get auction statistics
   */
  async getAuctionStatistics(): Promise<AuctionStatistics> {
    try {
      const response = await apiClient.get('/auctions/statistics');
      return response.data;
    } catch (error) {
      console.error('Error fetching auction statistics:', error);
      throw new Error('Failed to fetch auction statistics');
    }
  }

  /**
   * Watch an auction
   */
  async watchAuction(auctionId: string): Promise<void> {
    try {
      await apiClient.post(`/auctions/${auctionId}/watch`);
    } catch (error) {
      console.error('Error watching auction:', error);
      throw new Error('Failed to watch auction');
    }
  }

  /**
   * Unwatch an auction
   */
  async unwatchAuction(auctionId: string): Promise<void> {
    try {
      await apiClient.delete(`/auctions/${auctionId}/watch`);
    } catch (error) {
      console.error('Error unwatching auction:', error);
      throw new Error('Failed to unwatch auction');
    }
  }

  /**
   * Get watched auctions
   */
  async getWatchedAuctions(page = 1, limit = 20): Promise<{
    auctions: Auction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const response = await apiClient.get('/auctions/watched', {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching watched auctions:', error);
      throw new Error('Failed to fetch watched auctions');
    }
  }

  /**
   * Get user's bidding history
   */
  async getUserBids(page = 1, limit = 20): Promise<{
    bids: AuctionBid[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const response = await apiClient.get('/auctions/my-bids', {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user bids:', error);
      throw new Error('Failed to fetch user bids');
    }
  }

  /**
   * Get user's auctions (seller)
   */
  async getUserAuctions(page = 1, limit = 20): Promise<{
    auctions: Auction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const response = await apiClient.get('/auctions/my-auctions', {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user auctions:', error);
      throw new Error('Failed to fetch user auctions');
    }
  }

  /**
   * Calculate minimum bid amount
   */
  calculateMinimumBid(auction: Auction): number {
    const increment = auction.minimumBidIncrement;
    const currentBid = auction.currentBid;
    
    // Minimum bid is current bid + increment
    return currentBid + increment;
  }

  /**
   * Check if auction is ending soon (within 10 minutes)
   */
  isAuctionEndingSoon(auction: Auction): boolean {
    if (auction.status !== AuctionStatus.ACTIVE) {
      return false;
    }

    const endTime = new Date(auction.endTime);
    const now = new Date();
    const timeRemaining = endTime.getTime() - now.getTime();
    const tenMinutes = 10 * 60 * 1000;

    return timeRemaining > 0 && timeRemaining <= tenMinutes;
  }

  /**
   * Get time remaining for auction
   */
  getTimeRemaining(auction: Auction): {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isEnded: boolean;
  } {
    const endTime = new Date(auction.endTime);
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();

    if (diff <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isEnded: true,
      };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
      days,
      hours,
      minutes,
      seconds,
      isEnded: false,
    };
  }

  /**
   * Format time remaining for display
   */
  formatTimeRemaining(auction: Auction): string {
    const time = this.getTimeRemaining(auction);

    if (time.isEnded) {
      return 'Auction ended';
    }

    if (time.days > 0) {
      return `${time.days}d ${time.hours}h`;
    }

    if (time.hours > 0) {
      return `${time.hours}h ${time.minutes}m`;
    }

    if (time.minutes > 0) {
      return `${time.minutes}m ${time.seconds}s`;
    }

    return `${time.seconds}s`;
  }

  /**
   * Register callback for new bids on an auction
   */
  onNewBid(auctionId: string, callback: (bid: AuctionBid) => void): void {
    if (!this.bidCallbacks.has(auctionId)) {
      this.bidCallbacks.set(auctionId, []);
    }
    this.bidCallbacks.get(auctionId)!.push(callback);
  }

  /**
   * Unregister callback for new bids
   */
  offNewBid(auctionId: string, callback: (bid: AuctionBid) => void): void {
    const callbacks = this.bidCallbacks.get(auctionId);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Register callback for auction end
   */
  onAuctionEnd(auctionId: string, callback: (auction: Auction) => void): void {
    if (!this.auctionEndCallbacks.has(auctionId)) {
      this.auctionEndCallbacks.set(auctionId, []);
    }
    this.auctionEndCallbacks.get(auctionId)!.push(callback);
  }

  /**
   * Unregister callback for auction end
   */
  offAuctionEnd(auctionId: string, callback: (auction: Auction) => void): void {
    const callbacks = this.auctionEndCallbacks.get(auctionId);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Clear all callbacks
   */
  clearCallbacks(): void {
    this.bidCallbacks.clear();
    this.auctionEndCallbacks.clear();
  }
}

// Export singleton instance
export const auctionService = new AuctionService();

export default auctionService;