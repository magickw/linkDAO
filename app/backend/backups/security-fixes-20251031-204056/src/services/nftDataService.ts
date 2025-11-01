import axios from 'axios';
import { safeLogger } from '../utils/safeLogger';

interface NFTData {
  name?: string;
  description?: string;
  image?: string;
  collection?: string;
  owner?: string;
  traits?: any[];
  price?: any;
  floorPrice?: any;
  lastSale?: any;
}

export class NFTDataService {
  private readonly openseaApiKey = process.env.OPENSEA_API_KEY;
  private readonly alchemyApiKey = process.env.ALCHEMY_API_KEY;

  async getFromOpensea(contractAddress: string, tokenId: string): Promise<NFTData> {
    try {
      const response = await axios.get(
        `https://api.opensea.io/api/v1/asset/${contractAddress}/${tokenId}/`,
        {
          headers: this.openseaApiKey ? {
            'X-API-KEY': this.openseaApiKey
          } : {},
          timeout: 10000
        }
      );

      const asset = response.data;
      
      return {
        name: asset.name,
        description: asset.description,
        image: asset.image_url,
        collection: asset.collection?.name,
        owner: asset.owner?.address,
        traits: asset.traits,
        price: asset.last_sale ? {
          amount: asset.last_sale.total_price,
          symbol: asset.last_sale.payment_token.symbol,
          network: 'ethereum'
        } : undefined,
        floorPrice: asset.collection?.stats?.floor_price ? {
          amount: asset.collection.stats.floor_price,
          symbol: 'ETH',
          network: 'ethereum'
        } : undefined,
        lastSale: asset.last_sale ? {
          amount: asset.last_sale.total_price,
          symbol: asset.last_sale.payment_token.symbol,
          network: 'ethereum'
        } : undefined
      };
    } catch (error) {
      safeLogger.error('OpenSea API error:', error);
      throw new Error('Failed to fetch NFT data from OpenSea');
    }
  }

  async getFromAlchemy(network: string, contractAddress: string, tokenId: string): Promise<NFTData> {
    if (!this.alchemyApiKey) {
      throw new Error('Alchemy API key not configured');
    }

    try {
      const baseUrl = this.getAlchemyBaseUrl(network);
      const response = await axios.get(
        `${baseUrl}/getNFTMetadata`,
        {
          params: {
            contractAddress,
            tokenId,
            tokenType: 'ERC721'
          },
          headers: {
            'accept': 'application/json'
          },
          timeout: 10000
        }
      );

      const nft = response.data;
      
      return {
        name: nft.title || nft.metadata?.name,
        description: nft.description || nft.metadata?.description,
        image: nft.media?.[0]?.gateway || nft.metadata?.image,
        collection: nft.contractMetadata?.name,
        owner: nft.owners?.[0],
        traits: nft.metadata?.attributes,
        // Alchemy doesn't provide price data directly
        price: undefined,
        floorPrice: undefined,
        lastSale: undefined
      };
    } catch (error) {
      safeLogger.error('Alchemy API error:', error);
      throw new Error('Failed to fetch NFT data from Alchemy');
    }
  }

  private getAlchemyBaseUrl(network: string): string {
    const networkMap: Record<string, string> = {
      'ethereum': `https://eth-mainnet.g.alchemy.com/nft/v2/${this.alchemyApiKey}`,
      'polygon': `https://polygon-mainnet.g.alchemy.com/nft/v2/${this.alchemyApiKey}`,
      'arbitrum': `https://arb-mainnet.g.alchemy.com/nft/v2/${this.alchemyApiKey}`,
      'optimism': `https://opt-mainnet.g.alchemy.com/nft/v2/${this.alchemyApiKey}`
    };

    const baseUrl = networkMap[network.toLowerCase()];
    if (!baseUrl) {
      throw new Error(`Unsupported network: ${network}`);
    }

    return baseUrl;
  }

  async getCollectionStats(contractAddress: string): Promise<any> {
    try {
      const response = await axios.get(
        `https://api.opensea.io/api/v1/collection/${contractAddress}/stats`,
        {
          headers: this.openseaApiKey ? {
            'X-API-KEY': this.openseaApiKey
          } : {},
          timeout: 10000
        }
      );

      return response.data.stats;
    } catch (error) {
      safeLogger.error('Collection stats error:', error);
      return null;
    }
  }

  async searchNFTs(query: string, limit: number = 20): Promise<NFTData[]> {
    try {
      const response = await axios.get(
        'https://api.opensea.io/api/v1/assets',
        {
          params: {
            search: query,
            limit,
            order_direction: 'desc',
            order_by: 'sale_date'
          },
          headers: this.openseaApiKey ? {
            'X-API-KEY': this.openseaApiKey
          } : {},
          timeout: 15000
        }
      );

      return response.data.assets.map((asset: any) => ({
        name: asset.name,
        description: asset.description,
        image: asset.image_url,
        collection: asset.collection?.name,
        owner: asset.owner?.address,
        traits: asset.traits,
        price: asset.last_sale ? {
          amount: asset.last_sale.total_price,
          symbol: asset.last_sale.payment_token.symbol,
          network: 'ethereum'
        } : undefined
      }));
    } catch (error) {
      safeLogger.error('NFT search error:', error);
      return [];
    }
  }

  async validateNFTOwnership(contractAddress: string, tokenId: string, ownerAddress: string): Promise<boolean> {
    try {
      const nftData = await this.getFromOpensea(contractAddress, tokenId);
      return nftData.owner?.toLowerCase() === ownerAddress.toLowerCase();
    } catch (error) {
      safeLogger.error('NFT ownership validation error:', error);
      return false;
    }
  }

  // Mock data for development/testing
  getMockNFTData(contractAddress: string, tokenId: string): NFTData {
    return {
      name: `Mock NFT #${tokenId}`,
      description: 'This is a mock NFT for development purposes',
      image: 'https://via.placeholder.com/400x400?text=Mock+NFT',
      collection: 'Mock Collection',
      owner: '0x1234567890123456789012345678901234567890',
      traits: [
        { trait_type: 'Background', value: 'Blue', rarity: 25 },
        { trait_type: 'Eyes', value: 'Laser', rarity: 5 },
        { trait_type: 'Mouth', value: 'Smile', rarity: 50 }
      ],
      price: {
        amount: '1.5',
        symbol: 'ETH',
        network: 'ethereum'
      },
      floorPrice: {
        amount: '1.2',
        symbol: 'ETH',
        network: 'ethereum'
      },
      lastSale: {
        amount: '1.8',
        symbol: 'ETH',
        network: 'ethereum'
      }
    };
  }
}

export const nftDataService = new NFTDataService();