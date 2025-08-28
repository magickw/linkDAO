// Marketplace service for interacting with the backend API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

export interface CreateListingInput {
  sellerAddress: string;
  tokenAddress: string;
  price: string;
  quantity: number;
  itemType: 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE';
  listingType: 'FIXED_PRICE' | 'AUCTION';
  duration?: number;
  metadataURI: string;
}

export interface UpdateListingInput {
  price?: string;
  quantity?: number;
}

export interface PlaceBidInput {
  bidderAddress: string;
  amount: string;
}

export interface MarketplaceListing {
  id: string;
  sellerAddress: string;
  tokenAddress: string;
  price: string;
  quantity: number;
  itemType: 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE';
  listingType: 'FIXED_PRICE' | 'AUCTION';
  status: 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED';
  startTime: string;
  endTime?: string;
  highestBid?: string;
  highestBidder?: string;
  metadataURI: string;
  isEscrowed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceBid {
  id: string;
  listingId: string;
  bidderAddress: string;
  amount: string;
  timestamp: string;
}

export interface MarketplaceEscrow {
  id: string;
  listingId: string;
  buyerAddress: string;
  sellerAddress: string;
  amount: string;
  buyerApproved: boolean;
  sellerApproved: boolean;
  disputeOpened: boolean;
  resolverAddress?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface UserReputation {
  address: string;
  score: number;
  daoApproved: boolean;
}

export class MarketplaceService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
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

  // Escrow
  async createEscrow(listingId: string, buyerAddress: string): Promise<MarketplaceEscrow> {
    return this.request(`/marketplace/escrows/listing/${listingId}`, {
      method: 'POST',
      body: JSON.stringify({ buyerAddress }),
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

  async getEscrowById(id: string): Promise<MarketplaceEscrow> {
    return this.request(`/marketplace/escrows/${id}`);
  }

  async getEscrowsByUser(userAddress: string): Promise<MarketplaceEscrow[]> {
    return this.request(`/marketplace/escrows/user/${userAddress}`);
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