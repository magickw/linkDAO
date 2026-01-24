/**
 * NFT Service
 * Handles NFT marketplace operations
 */

import { apiClient } from './apiClient';
import { ENV } from '../constants/environment';

// Types
export interface NFT {
  id: string;
  name: string;
  description: string;
  image: string;
  animationUrl?: string;
  price: number;
  currency: string;
  seller: string;
  collection: string;
  traits: Array<{
    trait_type: string;
    value: string;
    rarity?: string;
  }>;
  createdAt: string;
  isListed: boolean;
}

export interface NFTCollection {
  id: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  floorPrice: number;
  totalSupply: number;
  itemsCount: number;
  creator: string;
  verified: boolean;
}

export interface NFTListing {
  id: string;
  nftId: string;
  price: number;
  currency: string;
  seller: string;
  expiresAt: number;
}

class NFTService {
  private baseUrl = `${ENV.BACKEND_URL}/api/nft`;

  /**
   * Get featured NFTs
   */
  async getFeaturedNFTs(limit: number = 10): Promise<NFT[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/featured`, {
        params: { limit }
      });
      const data = response.data.data || response.data;
      return data.nfts || data || [];
    } catch (error) {
      console.error('Error fetching featured NFTs:', error);
      return [];
    }
  }

  /**
   * Get NFTs by collection
   */
  async getCollectionNFTs(collectionId: string, limit: number = 20): Promise<NFT[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/collection/${collectionId}`, {
        params: { limit }
      });
      const data = response.data.data || response.data;
      return data.nfts || data || [];
    } catch (error) {
      console.error('Error fetching collection NFTs:', error);
      return [];
    }
  }

  /**
   * Get all collections
   */
  async getCollections(): Promise<NFTCollection[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/collections`);
      const data = response.data.data || response.data;
      return data.collections || data || [];
    } catch (error) {
      console.error('Error fetching collections:', error);
      return [];
    }
  }

  /**
   * Get NFT details
   */
  async getNFTDetails(nftId: string): Promise<NFT | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${nftId}`);
      const data = response.data.data || response.data;
      return data;
    } catch (error) {
      console.error('Error fetching NFT details:', error);
      return null;
    }
  }

  /**
   * Create new NFT
   */
  async createNFT(nftData: {
    name: string;
    description: string;
    image: string;
    collectionId?: string;
    price?: number;
  }): Promise<{ success: boolean; nftId?: string; error?: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/create`, nftData);
      const data = response.data.data || response.data;
      return {
        success: true,
        nftId: data.nftId,
      };
    } catch (error: any) {
      console.error('Error creating NFT:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to create NFT',
      };
    }
  }

  /**
   * List NFT for sale
   */
  async listNFT(nftId: string, price: number): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.post(`${this.baseUrl}/${nftId}/list`, { price });
      return { success: true };
    } catch (error: any) {
      console.error('Error listing NFT:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to list NFT',
      };
    }
  }

  /**
   * Buy NFT
   */
  async buyNFT(nftId: string): Promise<{ success: boolean; error?: string; txHash?: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${nftId}/buy`);
      const data = response.data.data || response.data;
      return {
        success: true,
        txHash: data.txHash,
      };
    } catch (error: any) {
      console.error('Error buying NFT:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to buy NFT',
      };
    }
  }

  /**
   * Search NFTs
   */
  async searchNFTs(query: string, category?: string): Promise<NFT[]> {
    try {
      const params: any = { q: query };
      if (category) params.category = category;
      
      const response = await apiClient.get(`${this.baseUrl}/search`, { params });
      const data = response.data.data || response.data;
      return data.nfts || data || [];
    } catch (error) {
      console.error('Error searching NFTs:', error);
      return [];
    }
  }
}

export const nftService = new NFTService();