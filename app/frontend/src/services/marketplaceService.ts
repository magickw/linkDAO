// Marketplace service for interacting with the backend API
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';

export interface CreateListingInput {
  sellerWalletAddress: string;
  tokenAddress: string;
  price: string;
  quantity: number;
  itemType: 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE';
  listingType: 'FIXED_PRICE' | 'AUCTION';
  duration?: number;
  metadataURI: string;
  // NFT specific fields
  nftStandard?: 'ERC721' | 'ERC1155'; // Only for NFT items
  tokenId?: string; // Only for NFT items
}

export interface UpdateListingInput {
  price?: string;
  quantity?: number;
}

export interface PlaceBidInput {
  bidderWalletAddress: string;
  amount: string;
}

export interface MakeOfferInput {
  buyerWalletAddress: string;
  amount: string;
}

export interface MarketplaceListing {
  id: string;
  sellerWalletAddress: string;
  tokenAddress: string;
  price: string;
  quantity: number;
  itemType: 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE';
  listingType: 'FIXED_PRICE' | 'AUCTION';
  status: 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED';
  startTime: string;
  endTime?: string;
  highestBid?: string;
  highestBidderWalletAddress?: string;
  metadataURI: string;
  isEscrowed: boolean;
  // NFT specific fields
  nftStandard?: 'ERC721' | 'ERC1155'; // Only for NFT items
  tokenId?: string; // Only for NFT items
  createdAt: string;
  updatedAt: string;
  // Enhanced marketplace data
  enhancedData?: {
    title?: string;
    description?: string;
    images?: string[];
    price?: {
      crypto: string;
      cryptoSymbol: string;
      fiat: string;
      fiatSymbol: string;
    };
    seller?: {
      id: string;
      name: string;
      rating: number;
      verified: boolean;
      daoApproved: boolean;
      walletAddress: string;
    };
    trust?: {
      verified: boolean;
      escrowProtected: boolean;
      onChainCertified: boolean;
      safetyScore: number;
    };
    category?: string;
    tags?: string[];
    views?: number;
    favorites?: number;
  };
}

export interface MarketplaceBid {
  id: string;
  listingId: string;
  bidderWalletAddress: string;
  amount: string;
  timestamp: string;
}

export interface MarketplaceOffer {
  id: string;
  listingId: string;
  buyerWalletAddress: string;
  amount: string;
  createdAt: string;
  accepted: boolean;
}

export interface MarketplaceEscrow {
  id: string;
  listingId: string;
  buyerWalletAddress: string;
  sellerWalletAddress: string;
  amount: string;
  buyerApproved: boolean;
  sellerApproved: boolean;
  disputeOpened: boolean;
  resolverWalletAddress?: string;
  createdAt: string;
  resolvedAt?: string;
  // Delivery tracking
  deliveryInfo?: string;
  deliveryConfirmed: boolean;
}

export interface MarketplaceOrder {
  id: string;
  listingId: string;
  buyerWalletAddress: string;
  sellerWalletAddress: string;
  escrowId?: string;
  amount: string;
  paymentToken: string;
  status: 'PENDING' | 'COMPLETED' | 'DISPUTED' | 'REFUNDED';
  createdAt: string;
}

export interface MarketplaceDispute {
  id: string;
  escrowId: string;
  reporterWalletAddress: string;
  reason: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'ESCALATED';
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

export interface UserReputation {
  walletAddress: string;
  score: number;
  daoApproved: boolean;
}

export class MarketplaceService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Add timeout to fetch requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
      signal: controller.signal,
    };
    
    try {
      console.log(`Making request to: ${url}`);
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`HTTP error! status: ${response.status}`, errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`Request failed: ${url}`, error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      
      throw new Error('Network error occurred');
    }
  }

  // Listings
  async createListing(input: CreateListingInput): Promise<MarketplaceListing> {
    return this.request('/marketplace/listings', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getListingById(id: string): Promise<MarketplaceListing> {
    return this.request(`/marketplace/listings/${id}`);
  }

  async getListingsBySeller(sellerAddress: string): Promise<MarketplaceListing[]> {
    return this.request(`/marketplace/listings/seller/${sellerAddress}`);
  }

  async getAllListings(): Promise<MarketplaceListing[]> {
    return this.request('/marketplace/listings/all');
  }

  async getActiveListings(): Promise<MarketplaceListing[]> {
    return this.request('/marketplace/listings');
  }

  async updateListing(id: string, input: UpdateListingInput): Promise<MarketplaceListing> {
    return this.request(`/marketplace/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  async cancelListing(id: string): Promise<void> {
    await this.request(`/marketplace/listings/${id}`, {
      method: 'DELETE',
    });
  }

  // Bids
  async placeBid(listingId: string, input: PlaceBidInput): Promise<MarketplaceBid> {
    return this.request(`/marketplace/bids/listing/${listingId}`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getBidsByListing(listingId: string): Promise<MarketplaceBid[]> {
    return this.request(`/marketplace/bids/listing/${listingId}`);
  }

  async getBidsByBidder(bidderAddress: string): Promise<MarketplaceBid[]> {
    return this.request(`/marketplace/bids/bidder/${bidderAddress}`);
  }

  // Offers
  async makeOffer(listingId: string, input: MakeOfferInput): Promise<MarketplaceOffer> {
    return this.request(`/marketplace/offers/listing/${listingId}`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getOffersByListing(listingId: string): Promise<MarketplaceOffer[]> {
    return this.request(`/marketplace/offers/listing/${listingId}`);
  }

  async getOffersByBuyer(buyerAddress: string): Promise<MarketplaceOffer[]> {
    return this.request(`/marketplace/offers/buyer/${buyerAddress}`);
  }

  async acceptOffer(offerId: string): Promise<void> {
    await this.request(`/marketplace/offers/${offerId}/accept`, {
      method: 'POST',
    });
  }

  // Escrow
  async createEscrow(listingId: string, buyerAddress: string, deliveryInfo?: string): Promise<MarketplaceEscrow> {
    return this.request(`/marketplace/escrows/listing/${listingId}`, {
      method: 'POST',
      body: JSON.stringify({ buyerAddress, deliveryInfo }),
    });
  }

  async approveEscrow(escrowId: string, userAddress: string): Promise<void> {
    await this.request(`/marketplace/escrows/${escrowId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ userAddress }),
    });
  }

  async openDispute(escrowId: string, userAddress: string): Promise<void> {
    await this.request(`/marketplace/escrows/${escrowId}/dispute`, {
      method: 'POST',
      body: JSON.stringify({ userAddress }),
    });
  }

  async confirmDelivery(escrowId: string, deliveryInfo: string): Promise<void> {
    await this.request(`/marketplace/escrows/${escrowId}/confirm-delivery`, {
      method: 'POST',
      body: JSON.stringify({ deliveryInfo }),
    });
  }

  async getEscrowById(id: string): Promise<MarketplaceEscrow> {
    return this.request(`/marketplace/escrows/${id}`);
  }

  async getEscrowsByUser(userAddress: string): Promise<MarketplaceEscrow[]> {
    return this.request(`/marketplace/escrows/user/${userAddress}`);
  }

  // Orders
  async createOrder(listingId: string, buyerAddress: string, sellerAddress: string, 
                    amount: string, paymentToken: string, escrowId?: string): Promise<MarketplaceOrder> {
    return this.request('/marketplace/orders', {
      method: 'POST',
      body: JSON.stringify({ listingId, buyerAddress, sellerAddress, amount, paymentToken, escrowId }),
    });
  }

  async getOrderById(id: string): Promise<MarketplaceOrder> {
    return this.request(`/marketplace/orders/${id}`);
  }

  async getOrdersByUser(userAddress: string): Promise<MarketplaceOrder[]> {
    return this.request(`/marketplace/orders/user/${userAddress}`);
  }

  async updateOrderStatus(orderId: string, status: 'PENDING' | 'COMPLETED' | 'DISPUTED' | 'REFUNDED'): Promise<void> {
    await this.request(`/marketplace/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Disputes
  async createDispute(escrowId: string, reporterAddress: string, reason: string): Promise<MarketplaceDispute> {
    return this.request('/marketplace/disputes', {
      method: 'POST',
      body: JSON.stringify({ escrowId, reporterAddress, reason }),
    });
  }

  async getDisputeById(id: string): Promise<MarketplaceDispute> {
    return this.request(`/marketplace/disputes/${id}`);
  }

  async getDisputesByUser(userAddress: string): Promise<MarketplaceDispute[]> {
    return this.request(`/marketplace/disputes/user/${userAddress}`);
  }

  async updateDisputeStatus(disputeId: string, status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'ESCALATED', 
                            resolution?: string): Promise<void> {
    await this.request(`/marketplace/disputes/${disputeId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, resolution }),
    });
  }

  // Reputation
  async getUserReputation(address: string): Promise<UserReputation> {
    return this.request(`/marketplace/reputation/${address}`);
  }

  async updateUserReputation(address: string, score: number, daoApproved: boolean): Promise<UserReputation> {
    return this.request(`/marketplace/reputation/${address}`, {
      method: 'PUT',
      body: JSON.stringify({ score, daoApproved }),
    });
  }

  async getDAOApprovedVendors(): Promise<UserReputation[]> {
    return this.request('/marketplace/vendors/dao-approved');
  }
}