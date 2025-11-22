import { ethers } from 'ethers';
import { formatEther, parseEther } from '@ethersproject/units';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

type NFTMetadata = {
  name: string;
  description: string;
  image: string;
  animation_url?: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
  properties?: Record<string, any>;
};

type CreateNFTParams = {
  name: string;
  description: string;
  image: File;
  animationFile?: File;
  externalUrl?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
  royalty: number;
  collectionId?: string;
};

export interface CreateCollectionParams {
  name: string;
  symbol: string;
  description: string;
  image: File;
  externalUrl?: string;
  maxSupply?: number;
  mintPrice: string;
  isPublicMint: boolean;
  royalty: number;
}

export interface ListNFTParams {
  nftId: string;
  price: string;
  duration: number;
  currency: string;
}

export interface CreateAuctionParams {
  nftId: string;
  startingPrice: string;
  reservePrice?: string;
  duration: number;
  currency: string;
}

export interface MakeOfferParams {
  nftId: string;
  amount: string;
  duration: number;
  currency: string;
}

class NFTService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('auth_token') || '';
    return {
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  /**
   * Create a new NFT
   */
  async createNFT(params: CreateNFTParams): Promise<any> {
    const formData = new FormData();
    formData.append('name', params.name);
    formData.append('description', params.description);
    formData.append('image', params.image);
    formData.append('royalty', params.royalty.toString());
    formData.append('attributes', JSON.stringify(params.attributes));

    if (params.animationFile) {
      formData.append('animation', params.animationFile);
    }

    if (params.externalUrl) {
      formData.append('externalUrl', params.externalUrl);
    }

    if (params.collectionId) {
      formData.append('collectionId', params.collectionId);
    }

    const response = await fetch(`${API_BASE_URL}/api/nfts`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create NFT');
    }

    return response.json();
  }

  /**
   * Create a new collection
   */
  async createCollection(params: CreateCollectionParams): Promise<any> {
    const formData = new FormData();
    formData.append('name', params.name);
    formData.append('symbol', params.symbol);
    formData.append('description', params.description);
    formData.append('image', params.image);
    formData.append('mintPrice', params.mintPrice);
    formData.append('isPublicMint', params.isPublicMint.toString());
    formData.append('royalty', params.royalty.toString());

    if (params.externalUrl) {
      formData.append('externalUrl', params.externalUrl);
    }

    if (params.maxSupply) {
      formData.append('maxSupply', params.maxSupply.toString());
    }

    const response = await fetch(`${API_BASE_URL}/api/collections`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create collection');
    }

    return response.json();
  }

  /**
   * Get NFT by ID
   */
  async getNFT(nftId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/nfts/${nftId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get NFT');
    }

    return response.json();
  }

  /**
   * Get NFTs by creator
   */
  async getNFTsByCreator(creatorId: string, limit = 20, offset = 0): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/api/creators/${creatorId}/nfts?limit=${limit}&offset=${offset}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get creator NFTs');
    }

    return response.json();
  }

  /**
   * Get NFTs in a collection
   */
  async getNFTsByCollection(collectionId: string, limit = 20, offset = 0): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/api/collections/${collectionId}/nfts?limit=${limit}&offset=${offset}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get collection NFTs');
    }

    return response.json();
  }

  /**
   * List NFT for sale
   */
  async listNFT(params: ListNFTParams): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/nfts/${params.nftId}/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({
        price: params.price,
        duration: params.duration,
        currency: params.currency,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to list NFT');
    }

    return response.json();
  }

  /**
   * Create auction for NFT
   */
  async createAuction(params: CreateAuctionParams): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/nfts/${params.nftId}/auction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({
        startingPrice: params.startingPrice,
        reservePrice: params.reservePrice,
        duration: params.duration,
        currency: params.currency,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create auction');
    }

    return response.json();
  }

  /**
   * Make offer on NFT
   */
  async makeOffer(params: MakeOfferParams): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/nfts/${params.nftId}/offer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({
        amount: params.amount,
        duration: params.duration,
        currency: params.currency,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to make offer');
    }

    return response.json();
  }

  /**
   * Get active listings
   */
  async getActiveListings(limit = 20, offset = 0): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/api/nfts/listings?limit=${limit}&offset=${offset}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get active listings');
    }

    return response.json();
  }

  /**
   * Get active auctions
   */
  async getActiveAuctions(limit = 20, offset = 0): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/api/nfts/auctions?limit=${limit}&offset=${offset}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get active auctions');
    }

    return response.json();
  }

  /**
   * Get offers for NFT
   */
  async getNFTOffers(nftId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/nfts/${nftId}/offers`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get NFT offers');
    }

    return response.json();
  }

  /**
   * Search NFTs
   */
  async searchNFTs(
    query?: string,
    filters?: {
      collectionId?: string;
      creatorId?: string;
      minPrice?: string;
      maxPrice?: string;
    },
    limit = 20,
    offset = 0
  ): Promise<any> {
    const params = new URLSearchParams();

    if (query) params.append('q', query);
    if (filters?.collectionId) params.append('collectionId', filters.collectionId);
    if (filters?.creatorId) params.append('creatorId', filters.creatorId);
    if (filters?.minPrice) params.append('minPrice', filters.minPrice);
    if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    const response = await fetch(`${API_BASE_URL}/api/nfts/search?${params}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to search NFTs');
    }

    return response.json();
  }

  /**
   * Get NFT provenance
   */
  async getNFTProvenance(nftId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/nfts/${nftId}/provenance`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get NFT provenance');
    }

    return response.json();
  }

  /**
   * Verify NFT authenticity
   */
  async verifyNFT(nftId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/nfts/${nftId}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to verify NFT');
    }

    return response.json();
  }

  /**
   * Interact with smart contracts
   */
  async mintNFTOnChain(
    contractAddress: string,
    tokenURI: string,
    royalty: number,
    contentHash: string,
    metadata: NFTMetadata
  ): Promise<string> {
    if (!window.ethereum) {
      throw new Error('MetaMask not found');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // NFT Marketplace contract ABI (simplified)
    const contractABI = [
      "function mintNFT(address to, string memory tokenURI, uint256 royalty, bytes32 contentHash) external returns (uint256)"
    ];

    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    try {
      const tx = await contract.mintNFT(
        await signer.getAddress(),
        tokenURI,
        royalty,
        ethers.encodeBytes32String(contentHash)
      );

      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error minting NFT on chain:', error);
      throw new Error('Failed to mint NFT on blockchain: ' + (error as Error).message);
    }
  }

  /**
   * List NFT on blockchain marketplace
   */
  async listNFTOnChain(
    contractAddress: string,
    tokenId: string,
    price: string,
    duration: number
  ): Promise<string> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not found');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // Marketplace contract ABI (simplified for listing)
    const contractABI = [
      "function listNFT(address nftContract, uint256 tokenId, uint256 price, uint256 duration) external"
    ];

    const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS;
    if (!marketplaceAddress) {
      throw new Error('Marketplace contract address not configured');
    }

    const marketplace = new ethers.Contract(marketplaceAddress, contractABI, signer);

    try {
      const tx = await marketplace.listNFT(
        contractAddress,
        tokenId,
        parseEther(price),
        duration
      );

      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error listing NFT:', error);
      throw error;
    }
  }

  /**
   * Buy NFT from marketplace
   */
  async buyNFTOnChain(
    contractAddress: string,
    tokenId: string,
    price: string
  ): Promise<string> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not found');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const contractABI = [
      "function buyNFT(uint256 tokenId) external payable"
    ];

    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    try {
      const tx = await contract.buyNFT(tokenId, {
        value: parseEther(price)
      });

      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error buying NFT:', error);
      throw error;
    }
  }

  /**
   * Place bid on NFT auction
   */
  async placeBidOnChain(
    contractAddress: string,
    tokenId: string,
    bidAmount: string
  ): Promise<string> {
    if (!window.ethereum) {
      throw new Error('MetaMask not found');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const contractABI = [
      "function placeBid(uint256 tokenId) external payable"
    ];

    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    try {
      const tx = await contract.placeBid(tokenId, {
        value: parseEther(bidAmount)
      });

      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Error placing bid on chain:', error);
      throw new Error('Failed to place bid on blockchain');
    }
  }

  /**
   * Create auction on blockchain
   */
  async createAuctionOnChain(
    contractAddress: string,
    tokenId: string,
    startingPrice: string,
    reservePrice: string,
    duration: number
  ): Promise<string> {
    if (!window.ethereum) {
      throw new Error('MetaMask not found');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const contractABI = [
      "function createAuction(uint256 tokenId, uint256 startingPrice, uint256 reservePrice, uint256 duration) external"
    ];

    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    try {
      const tx = await contract.createAuction(
        tokenId,
        parseEther(startingPrice),
        parseEther(reservePrice),
        duration
      );

      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Error creating auction on chain:', error);
      throw new Error('Failed to create auction on blockchain');
    }
  }

  /**
   * Make offer on blockchain
   */
  async makeOfferOnChain(
    contractAddress: string,
    tokenId: string,
    offerAmount: string,
    duration: number
  ): Promise<string> {
    if (!window.ethereum) {
      throw new Error('MetaMask not found');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const contractABI = [
      "function makeOffer(uint256 tokenId, uint256 duration) external payable"
    ];

    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    try {
      const tx = await contract.makeOffer(tokenId, duration, {
        value: parseEther(offerAmount)
      });

      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Error making offer on chain:', error);
      throw new Error('Failed to make offer on blockchain');
    }
  }

  /**
   * Get NFT metadata from IPFS
   */
  async getMetadataFromIPFS(ipfsHash: string): Promise<NFTMetadata> {
    const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);

    if (!response.ok) {
      throw new Error('Failed to fetch metadata from IPFS');
    }

    return response.json();
  }

  /**
   * Validate NFT metadata format
   */
  validateMetadata(metadata: any): metadata is NFTMetadata {
    return (
      typeof metadata === 'object' &&
      typeof metadata.name === 'string' &&
      typeof metadata.description === 'string' &&
      typeof metadata.image === 'string' &&
      Array.isArray(metadata.attributes) &&
      metadata.attributes.every((attr: any) =>
        typeof attr.trait_type === 'string' &&
        (typeof attr.value === 'string' || typeof attr.value === 'number')
      )
    );
  }
}

export default new NFTService();