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
      return this.getMockNFTs(limit);
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
      return this.getMockNFTs(limit);
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
      return this.getMockCollections();
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

  // Mock data methods
  private getMockNFTs(limit: number): NFT[] {
    const mockNFTs: NFT[] = [
      {
        id: '1',
        name: 'Cosmic Ape #1234',
        description: 'A rare cosmic ape from the far reaches of the galaxy',
        image: 'https://picsum.photos/400/400?random=1',
        price: 2.5,
        currency: 'ETH',
        seller: '0x1234...5678',
        collection: 'Cosmic Apes',
        traits: [
          { trait_type: 'Background', value: 'Nebula', rarity: 'rare' },
          { trait_type: 'Eyes', value: 'Laser', rarity: 'epic' },
          { trait_type: 'Mouth', value: 'Smile', rarity: 'common' },
        ],
        createdAt: new Date().toISOString(),
        isListed: true,
      },
      {
        id: '2',
        name: 'Digital Dragon #567',
        description: 'Ancient dragon brought to life in the digital realm',
        image: 'https://picsum.photos/400/400?random=2',
        price: 5.0,
        currency: 'ETH',
        seller: '0x8765...4321',
        collection: 'Digital Dragons',
        traits: [
          { trait_type: 'Color', value: 'Golden', rarity: 'legendary' },
          { trait_type: 'Wings', value: 'Fire', rarity: 'epic' },
          { trait_type: 'Scale', value: 'Diamond', rarity: 'rare' },
        ],
        createdAt: new Date().toISOString(),
        isListed: true,
      },
      {
        id: '3',
        name: 'Pixel Punk #890',
        description: 'Classic punk style with a modern twist',
        image: 'https://picsum.photos/400/400?random=3',
        price: 1.8,
        currency: 'ETH',
        seller: '0xabcd...efgh',
        collection: 'Pixel Punks',
        traits: [
          { trait_type: 'Hat', value: 'Beanie', rarity: 'common' },
          { trait_type: 'Glasses', value: 'VR', rarity: 'rare' },
          { trait_type: 'Skin', value: 'Alien', rarity: 'epic' },
        ],
        createdAt: new Date().toISOString(),
        isListed: true,
      },
      {
        id: '4',
        name: 'Meta Cat #345',
        description: 'A cat that lives in the metaverse',
        image: 'https://picsum.photos/400/400?random=4',
        price: 3.2,
        currency: 'ETH',
        seller: '0x1111...2222',
        collection: 'Meta Cats',
        traits: [
          { trait_type: 'Fur', value: 'Rainbow', rarity: 'legendary' },
          { trait_type: 'Eyes', value: 'Diamond', rarity: 'epic' },
          { trait_type: 'Accessory', value: 'Crown', rarity: 'rare' },
        ],
        createdAt: new Date().toISOString(),
        isListed: true,
      },
      {
        id: '5',
        name: 'Robot Warrior #678',
        description: 'Battle-ready robot from the future',
        image: 'https://picsum.photos/400/400?random=5',
        price: 4.5,
        currency: 'ETH',
        seller: '0x3333...4444',
        collection: 'Robot Warriors',
        traits: [
          { trait_type: 'Armor', value: 'Platinum', rarity: 'legendary' },
          { trait_type: 'Weapon', value: 'Laser Sword', rarity: 'epic' },
          { trait_type: 'Core', value: 'Nuclear', rarity: 'rare' },
        ],
        createdAt: new Date().toISOString(),
        isListed: true,
      },
    ];

    return mockNFTs.slice(0, limit);
  }

  private getMockCollections(): NFTCollection[] {
    return [
      {
        id: '1',
        name: 'Cosmic Apes',
        symbol: 'CA',
        description: 'Rare cosmic apes from the galaxy',
        image: 'https://picsum.photos/200/200?random=10',
        floorPrice: 1.5,
        totalSupply: 10000,
        itemsCount: 8500,
        creator: '0x1234...5678',
        verified: true,
      },
      {
        id: '2',
        name: 'Digital Dragons',
        symbol: 'DD',
        description: 'Ancient dragons in digital form',
        image: 'https://picsum.photos/200/200?random=11',
        floorPrice: 3.0,
        totalSupply: 5000,
        itemsCount: 4200,
        creator: '0x8765...4321',
        verified: true,
      },
      {
        id: '3',
        name: 'Pixel Punks',
        symbol: 'PP',
        description: 'Classic pixel art punks',
        image: 'https://picsum.photos/200/200?random=12',
        floorPrice: 1.2,
        totalSupply: 10000,
        itemsCount: 9800,
        creator: '0xabcd...efgh',
        verified: true,
      },
      {
        id: '4',
        name: 'Meta Cats',
        symbol: 'MC',
        description: 'Cats living in the metaverse',
        image: 'https://picsum.photos/200/200?random=13',
        floorPrice: 2.0,
        totalSupply: 7777,
        itemsCount: 6500,
        creator: '0x1111...2222',
        verified: false,
      },
      {
        id: '5',
        name: 'Robot Warriors',
        symbol: 'RW',
        description: 'Futuristic robot warriors',
        image: 'https://picsum.photos/200/200?random=14',
        floorPrice: 4.0,
        totalSupply: 3000,
        itemsCount: 2800,
        creator: '0x3333...4444',
        verified: true,
      },
    ];
  }
}

export const nftService = new NFTService();