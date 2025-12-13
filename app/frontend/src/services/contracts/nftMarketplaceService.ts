/**
 * NFT Marketplace Service
 * Handles all interactions with the NFTMarketplace smart contract
 * Provides comprehensive NFT trading functionality
 */

import { Contract, ethers } from 'ethers';
import { contractRegistryService } from '../contractRegistryService';

// NFT Marketplace ABI (key functions)
const NFT_MARKETPLACE_ABI = [
  'function createListing(tuple(address nftContract, uint256 tokenId, uint256 price, uint256 duration, string metadataURI) params) external returns (uint256)',
  'function placeBid(uint256 listingId, uint256 amount) external payable',
  'function executeSale(uint256 listingId) external',
  'function cancelListing(uint256 listingId) external',
  'function acceptBid(uint256 listingId, address bidder) external',
  'function getListing(uint256 listingId) external view returns (tuple(uint256 id, address seller, address nftContract, uint256 tokenId, uint256 price, uint256 duration, uint256 startTime, bool isActive, address highestBidder, uint256 highestBid, string metadataURI))',
  'function getListingsBySeller(address seller) external view returns (uint256[])',
  'function getListingsByNFT(address nftContract, uint256 tokenId) external view returns (uint256[])',
  'function getUserBids(address user) external view returns (uint256[])',
  'event ListingCreated(uint256 indexed listingId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 price)',
  'event BidPlaced(uint256 indexed listingId, address indexed bidder, uint256 amount)',
  'event SaleExecuted(uint256 indexed listingId, address indexed buyer, uint256 price)',
  'event ListingCancelled(uint256 indexed listingId)'
];

export interface NFTListing {
  id: string;
  seller: string;
  nftContract: string;
  tokenId: string;
  price: string;
  duration: number;
  startTime: number;
  isActive: boolean;
  highestBidder: string;
  highestBid: string;
  metadataURI: string;
}

export interface CreateListingParams {
  nftContract: string;
  tokenId: string;
  price: number;
  duration: number; // in days
  metadataURI: string;
}

export interface BidInfo {
  listingId: string;
  bidder: string;
  amount: string;
  timestamp: number;
}

export class NFTMarketplaceService {
  private contract: Contract | null = null;
  private initialized = false;

  private async getContract(): Promise<Contract> {
    if (!this.initialized) {
      throw new Error('NFTMarketplaceService not initialized');
    }

    if (!this.contract) {
      const address = await contractRegistryService.getContractAddress('NFTMarketplace');
      // Create a read-only provider for view functions
      const provider = new ethers.JsonRpcProvider('https://sepolia.drpc.org');
      this.contract = new Contract(address, NFT_MARKETPLACE_ABI, provider);
    }

    return this.contract;
  }

  /**
   * Initialize the NFT Marketplace Service
   */
  async initialize(): Promise<void> {
    try {
      await contractRegistryService.preloadCommonContracts();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize NFTMarketplaceService:', error);
      throw error;
    }
  }

  /**
   * Create a new NFT listing
   */
  async createListing(params: CreateListingParams, signer: any): Promise<string> {
    const contract = await this.getContract();
    const contractWithSigner = contract.connect(signer);

    try {
      const tx = await contract.createListing({
        nftContract: params.nftContract,
        tokenId: params.tokenId,
        price: ethers.parseEther(params.price.toString()),
        duration: params.duration * 86400, // Convert days to seconds
        metadataURI: params.metadataURI
      });

      const receipt = await tx.wait();
      
      // Extract listing ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'ListingCreated';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = contract.interface.parseLog(event);
        return parsed.args.listingId.toString();
      }

      throw new Error('Failed to extract listing ID from transaction');
    } catch (error) {
      console.error('Failed to create listing:', error);
      throw new Error(`Failed to create listing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Place a bid on an NFT listing
   */
  async placeBid(listingId: string, amount: number, signer: any): Promise<void> {
    const contract = await this.getContract();
    const contractWithSigner = contract.connect(signer);

    try {
      const tx = await contract.placeBid(
        listingId,
        { value: ethers.parseEther(amount.toString()) }
      );
      await tx.wait();
    } catch (error) {
      console.error('Failed to place bid:', error);
      throw new Error(`Failed to place bid: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a sale (accept highest bid or buy now)
   */
  async executeSale(listingId: string, signer: any): Promise<void> {
    const contract = await this.getContract();
    const contractWithSigner = contract.connect(signer);

    try {
      const listing = await this.getListing(listingId);
      const value = listing.highestBidder === ethers.ZeroAddress 
        ? listing.price 
        : listing.highestBid;

      const tx = await contract.executeSale(listingId, { value });
      await tx.wait();
    } catch (error) {
      console.error('Failed to execute sale:', error);
      throw new Error(`Failed to execute sale: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel an active listing
   */
  async cancelListing(listingId: string, signer: any): Promise<void> {
    const contract = await this.getContract();
    const contractWithSigner = contract.connect(signer);

    try {
      const tx = await contract.cancelListing(listingId);
      await tx.wait();
    } catch (error) {
      console.error('Failed to cancel listing:', error);
      throw new Error(`Failed to cancel listing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Accept a specific bid
   */
  async acceptBid(listingId: string, bidder: string, signer: any): Promise<void> {
    const contract = await this.getContract();
    const contractWithSigner = contract.connect(signer);

    try {
      const tx = await contract.acceptBid(listingId, bidder);
      await tx.wait();
    } catch (error) {
      console.error('Failed to accept bid:', error);
      throw new Error(`Failed to accept bid: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get listing details
   */
  async getListing(listingId: string): Promise<NFTListing> {
    const contract = await this.getContract();

    try {
      const listing = await contract.getListing(listingId);
      
      return {
        id: listing.id.toString(),
        seller: listing.seller,
        nftContract: listing.nftContract,
        tokenId: listing.tokenId.toString(),
        price: ethers.formatEther(listing.price),
        duration: Number(listing.duration),
        startTime: Number(listing.startTime),
        isActive: listing.isActive,
        highestBidder: listing.highestBidder,
        highestBid: ethers.formatEther(listing.highestBid),
        metadataURI: listing.metadataURI
      };
    } catch (error) {
      console.error('Failed to get listing:', error);
      throw new Error(`Failed to get listing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all listings by a seller
   */
  async getListingsBySeller(seller: string): Promise<NFTListing[]> {
    const contract = await this.getContract();

    try {
      const listingIds = await contract.getListingsBySeller(seller);
      const listings = await Promise.all(
        listingIds.map((id: any) => this.getListing(id.toString()))
      );
      
      return listings;
    } catch (error) {
      console.error('Failed to get listings by seller:', error);
      return [];
    }
  }

  /**
   * Get all listings for a specific NFT
   */
  async getListingsByNFT(nftContract: string, tokenId: string): Promise<NFTListing[]> {
    const contract = await this.getContract();

    try {
      const listingIds = await contract.getListingsByNFT(nftContract, tokenId);
      const listings = await Promise.all(
        listingIds.map((id: any) => this.getListing(id.toString()))
      );
      
      return listings;
    } catch (error) {
      console.error('Failed to get listings by NFT:', error);
      return [];
    }
  }

  /**
   * Get all bids made by a user
   */
  async getUserBids(user: string): Promise<string[]> {
    const contract = await this.getContract();

    try {
      const bidIds = await contract.getUserBids(user);
      return bidIds.map((id: any) => id.toString());
    } catch (error) {
      console.error('Failed to get user bids:', error);
      return [];
    }
  }

  /**
   * Get active listings across the marketplace
   */
  async getActiveListings(limit: number = 50, offset: number = 0): Promise<NFTListing[]> {
    // This would typically be implemented with an indexing service
    // For now, return empty array
    console.warn('getActiveListings: Indexing service not implemented');
    return [];
  }

  /**
   * Search listings by metadata
   */
  async searchListings(query: string, filters?: {
    minPrice?: number;
    maxPrice?: number;
    category?: string;
  }): Promise<NFTListing[]> {
    // This would typically be implemented with an indexing service
    console.warn('searchListings: Indexing service not implemented');
    return [];
  }

  /**
   * Listen to marketplace events
   */
  listenToEvents(callbacks: {
    onListingCreated?: (listingId: string, seller: string, nftContract: string, tokenId: string, price: string) => void;
    onBidPlaced?: (listingId: string, bidder: string, amount: string) => void;
    onSaleExecuted?: (listingId: string, buyer: string, price: string) => void;
    onListingCancelled?: (listingId: string) => void;
  }): void {
    this.getContract().then(contract => {
      if (callbacks.onListingCreated) {
        contract.on('ListingCreated', (listingId, seller, nftContract, tokenId, price) => {
          callbacks.onListingCreated!(
            listingId.toString(),
            seller,
            nftContract,
            tokenId.toString(),
            ethers.formatEther(price)
          );
        });
      }

      if (callbacks.onBidPlaced) {
        contract.on('BidPlaced', (listingId, bidder, amount) => {
          callbacks.onBidPlaced!(
            listingId.toString(),
            bidder,
            ethers.formatEther(amount)
          );
        });
      }

      if (callbacks.onSaleExecuted) {
        contract.on('SaleExecuted', (listingId, buyer, price) => {
          callbacks.onSaleExecuted!(
            listingId.toString(),
            buyer,
            ethers.formatEther(price)
          );
        });
      }

      if (callbacks.onListingCancelled) {
        contract.on('ListingCancelled', (listingId) => {
          callbacks.onListingCancelled!(listingId.toString());
        });
      }
    });
  }

  /**
   * Check if user owns the NFT
   */
  async checkNFTOwnership(nftContract: string, tokenId: string, user: string): Promise<boolean> {
    try {
      const provider = new ethers.JsonRpcProvider('https://sepolia.drpc.org');
      const nftContractInstance = new Contract(
        nftContract,
        ['function ownerOf(uint256 tokenId) external view returns (address)'],
        provider
      );
      
      const owner = await nftContractInstance.ownerOf(tokenId);
      return owner.toLowerCase() === user.toLowerCase();
    } catch {
      return false;
    }
  }

  /**
   * Get NFT metadata
   */
  async getNFTMetadata(nftContract: string, tokenId: string): Promise<any> {
    try {
      const provider = new ethers.JsonRpcProvider('https://sepolia.drpc.org');
      const nftContractInstance = new Contract(
        nftContract,
        ['function tokenURI(uint256 tokenId) external view returns (string)'],
        provider
      );
      
      const tokenURI = await nftContractInstance.tokenURI(tokenId);
      
      // Fetch metadata from URI
      const response = await fetch(tokenURI);
      return await response.json();
    } catch (error) {
      console.error('Failed to get NFT metadata:', error);
      return null;
    }
  }

  /**
   * Clean up event listeners
   */
  cleanup(): void {
    if (this.contract) {
      this.contract.removeAllListeners();
    }
  }
}

// Export singleton instance
export const nftMarketplaceService = new NFTMarketplaceService();