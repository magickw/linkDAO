import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import nftService from '../services/nftService';
import ipfsService from '../services/ipfsService';
import { db } from '../db/connection';

// Mock dependencies
vi.mock('../db/connection');
vi.mock('../services/ipfsService');

describe('NFTService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createNFT', () => {
    it('should create NFT with valid data', async () => {
      const mockImageBuffer = Buffer.from('mock image data');
      const mockParams = {
        creatorId: 'creator-123',
        name: 'Test NFT',
        description: 'A test NFT',
        image: mockImageBuffer,
        attributes: [
          { trait_type: 'Color', value: 'Blue' },
          { trait_type: 'Rarity', value: 'Common' },
        ],
        royalty: 500, // 5%
      };

      // Mock IPFS service responses
      const mockImageResult = {
        hash: 'QmImageHash123',
        url: 'https://ipfs.io/ipfs/QmImageHash123',
        size: 1024,
      };

      const mockMetadataResult = {
        hash: 'QmMetadataHash123',
        url: 'https://ipfs.io/ipfs/QmMetadataHash123',
        size: 512,
      };

      vi.mocked(ipfsService.uploadFile).mockResolvedValue(mockImageResult);
      vi.mocked(ipfsService.createNFTMetadata).mockReturnValue({
        name: mockParams.name,
        description: mockParams.description,
        image: mockImageResult.url,
        attributes: mockParams.attributes,
      });
      vi.mocked(ipfsService.uploadMetadata).mockResolvedValue(mockMetadataResult);
      vi.mocked(ipfsService.generateContentHash).mockReturnValue('content-hash-123');

      // Mock database response
      const mockNFT = {
        id: 'nft-123',
        ...mockParams,
        imageHash: mockImageResult.hash,
        metadataHash: mockMetadataResult.hash,
        metadataUri: mockMetadataResult.url,
        contentHash: 'content-hash-123',
        createdAt: new Date().toISOString(),
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockNFT]),
        }),
      } as any);

      const result = await nftService.createNFT(mockParams);

      expect(result).toEqual({
        ...mockNFT,
        imageUrl: mockImageResult.url,
        metadataUrl: mockMetadataResult.url,
        animationUrl: null,
      });

      expect(ipfsService.uploadFile).toHaveBeenCalledWith(mockImageBuffer, 'nft-image');
      expect(ipfsService.uploadMetadata).toHaveBeenCalled();
    });

    it('should handle animation file upload', async () => {
      const mockImageBuffer = Buffer.from('mock image data');
      const mockAnimationBuffer = Buffer.from('mock animation data');
      const mockParams = {
        creatorId: 'creator-123',
        name: 'Animated NFT',
        description: 'An animated NFT',
        image: mockImageBuffer,
        animationFile: mockAnimationBuffer,
        attributes: [],
        royalty: 250,
      };

      const mockImageResult = {
        hash: 'QmImageHash123',
        url: 'https://ipfs.io/ipfs/QmImageHash123',
        size: 1024,
      };

      const mockAnimationResult = {
        hash: 'QmAnimationHash123',
        url: 'https://ipfs.io/ipfs/QmAnimationHash123',
        size: 2048,
      };

      const mockMetadataResult = {
        hash: 'QmMetadataHash123',
        url: 'https://ipfs.io/ipfs/QmMetadataHash123',
        size: 512,
      };

      vi.mocked(ipfsService.uploadFile)
        .mockResolvedValueOnce(mockImageResult)
        .mockResolvedValueOnce(mockAnimationResult);
      vi.mocked(ipfsService.createNFTMetadata).mockReturnValue({
        name: mockParams.name,
        description: mockParams.description,
        image: mockImageResult.url,
        animation_url: mockAnimationResult.url,
        attributes: mockParams.attributes,
      });
      vi.mocked(ipfsService.uploadMetadata).mockResolvedValue(mockMetadataResult);
      vi.mocked(ipfsService.generateContentHash).mockReturnValue('content-hash-123');

      const mockNFT = {
        id: 'nft-123',
        creatorId: mockParams.creatorId,
        name: mockParams.name,
        description: mockParams.description,
        imageHash: mockImageResult.hash,
        animationHash: mockAnimationResult.hash,
        metadataHash: mockMetadataResult.hash,
        metadataUri: mockMetadataResult.url,
        contentHash: 'content-hash-123',
        royalty: mockParams.royalty,
        createdAt: new Date().toISOString(),
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockNFT]),
        }),
      } as any);

      const result = await nftService.createNFT(mockParams);

      expect(result.animationUrl).toBe(`https://ipfs.io/ipfs/${mockAnimationResult.hash}`);
      expect(ipfsService.uploadFile).toHaveBeenCalledTimes(2);
    });

    it('should throw error for invalid royalty', async () => {
      const mockParams = {
        creatorId: 'creator-123',
        name: 'Test NFT',
        description: 'A test NFT',
        image: Buffer.from('mock image data'),
        attributes: [],
        royalty: 1500, // 15% - exceeds maximum
      };

      // This would be caught by validation in the actual implementation
      await expect(nftService.createNFT(mockParams)).rejects.toThrow();
    });
  });

  describe('createCollection', () => {
    it('should create collection with valid data', async () => {
      const mockImageBuffer = Buffer.from('mock collection image');
      const mockParams = {
        creatorId: 'creator-123',
        name: 'Test Collection',
        symbol: 'TEST',
        description: 'A test collection',
        image: mockImageBuffer,
        maxSupply: 1000,
        mintPrice: '0.1',
        isPublicMint: true,
        royalty: 500,
      };

      const mockImageResult = {
        hash: 'QmCollectionImageHash123',
        url: 'https://ipfs.io/ipfs/QmCollectionImageHash123',
        size: 1024,
      };

      vi.mocked(ipfsService.uploadFile).mockResolvedValue(mockImageResult);

      const mockCollection = {
        id: 'collection-123',
        ...mockParams,
        imageHash: mockImageResult.hash,
        createdAt: new Date().toISOString(),
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockCollection]),
        }),
      } as any);

      const result = await nftService.createCollection(mockParams);

      expect(result).toEqual({
        ...mockCollection,
        imageUrl: mockImageResult.url,
      });

      expect(ipfsService.uploadFile).toHaveBeenCalledWith(mockImageBuffer, 'collection-image');
    });
  });

  describe('listNFT', () => {
    it('should list NFT for sale', async () => {
      const mockParams = {
        nftId: 'nft-123',
        sellerId: 'seller-123',
        price: '1.5',
        duration: 86400, // 24 hours
        currency: 'ETH',
      };

      // Mock NFT exists
      vi.mocked(nftService.getNFTById).mockResolvedValue({
        id: mockParams.nftId,
        name: 'Test NFT',
      });

      // Mock no existing listing
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const mockListing = {
        id: 'listing-123',
        ...mockParams,
        expiresAt: new Date(Date.now() + mockParams.duration * 1000).toISOString(),
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockListing]),
        }),
      } as any);

      const result = await nftService.listNFT(mockParams);

      expect(result).toEqual(mockListing);
    });

    it('should throw error if NFT already listed', async () => {
      const mockParams = {
        nftId: 'nft-123',
        sellerId: 'seller-123',
        price: '1.5',
        duration: 86400,
        currency: 'ETH',
      };

      vi.mocked(nftService.getNFTById).mockResolvedValue({
        id: mockParams.nftId,
        name: 'Test NFT',
      });

      // Mock existing listing
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'existing-listing' }]),
          }),
        }),
      } as any);

      await expect(nftService.listNFT(mockParams)).rejects.toThrow('NFT is already listed');
    });
  });

  describe('createAuction', () => {
    it('should create auction for NFT', async () => {
      const mockParams = {
        nftId: 'nft-123',
        sellerId: 'seller-123',
        startingPrice: '1.0',
        reservePrice: '2.0',
        duration: 86400,
        currency: 'ETH',
      };

      const mockAuction = {
        id: 'auction-123',
        ...mockParams,
        currentBid: '0',
        endTime: new Date(Date.now() + mockParams.duration * 1000).toISOString(),
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockAuction]),
        }),
      } as any);

      const result = await nftService.createAuction(mockParams);

      expect(result).toEqual(mockAuction);
    });
  });

  describe('makeOffer', () => {
    it('should create offer for NFT', async () => {
      const mockParams = {
        nftId: 'nft-123',
        buyerId: 'buyer-123',
        amount: '1.2',
        duration: 86400,
        currency: 'ETH',
      };

      const mockOffer = {
        id: 'offer-123',
        ...mockParams,
        expiresAt: new Date(Date.now() + mockParams.duration * 1000).toISOString(),
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockOffer]),
        }),
      } as any);

      const result = await nftService.makeOffer(mockParams);

      expect(result).toEqual(mockOffer);
    });
  });

  describe('getNFTById', () => {
    it('should return NFT with full details', async () => {
      const mockNFTId = 'nft-123';
      const mockResult = [{
        nft: {
          id: mockNFTId,
          name: 'Test NFT',
          description: 'A test NFT',
          imageHash: 'QmImageHash123',
          metadataUri: 'https://ipfs.io/ipfs/QmMetadataHash123',
          animationHash: null,
          attributes: JSON.stringify([{ trait_type: 'Color', value: 'Blue' }]),
          createdAt: new Date().toISOString(),
        },
        creator: {
          id: 'creator-123',
          walletAddress: '0x123...',
          handle: 'testcreator',
        },
        collection: null,
      }];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockResult),
              }),
            }),
          }),
        }),
      } as any);

      const result = await nftService.getNFTById(mockNFTId);

      expect(result).toEqual({
        ...mockResult[0].nft,
        imageUrl: 'https://ipfs.io/ipfs/QmImageHash123',
        metadataUrl: mockResult[0].nft.metadataUri,
        animationUrl: null,
        attributes: [{ trait_type: 'Color', value: 'Blue' }],
        creator: mockResult[0].creator,
        collection: null,
      });
    });

    it('should return null if NFT not found', async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      } as any);

      const result = await nftService.getNFTById('nonexistent-nft');

      expect(result).toBeNull();
    });
  });

  describe('searchNFTs', () => {
    it('should search NFTs by query', async () => {
      const query = 'cosmic';
      const mockResults = [{
        nft: {
          id: 'nft-123',
          name: 'Cosmic Wanderer',
          description: 'A cosmic NFT',
          imageHash: 'QmImageHash123',
          metadataUri: 'https://ipfs.io/ipfs/QmMetadataHash123',
          attributes: '[]',
          createdAt: new Date().toISOString(),
        },
        creator: {
          id: 'creator-123',
          walletAddress: '0x123...',
          handle: 'cosmicartist',
        },
        collection: null,
      }];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue(mockResults),
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await nftService.searchNFTs(query);

      expect(result).toHaveLength(1);
      expect(result[0].nft.name).toBe('Cosmic Wanderer');
    });

    it('should search NFTs with filters', async () => {
      const query = '';
      const filters = {
        collectionId: 'collection-123',
        creatorId: 'creator-123',
      };

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([]),
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await nftService.searchNFTs(query, filters);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('verifyNFT', () => {
    it('should verify NFT', async () => {
      const nftId = 'nft-123';
      const verifierId = 'verifier-123';

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      await expect(nftService.verifyNFT(nftId, verifierId)).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle IPFS upload errors', async () => {
      const mockParams = {
        creatorId: 'creator-123',
        name: 'Test NFT',
        description: 'A test NFT',
        image: Buffer.from('mock image data'),
        attributes: [],
        royalty: 500,
      };

      vi.mocked(ipfsService.uploadFile).mockRejectedValue(new Error('IPFS upload failed'));

      await expect(nftService.createNFT(mockParams)).rejects.toThrow('Failed to create NFT');
    });

    it('should handle database errors', async () => {
      const mockParams = {
        creatorId: 'creator-123',
        name: 'Test NFT',
        description: 'A test NFT',
        image: Buffer.from('mock image data'),
        attributes: [],
        royalty: 500,
      };

      vi.mocked(ipfsService.uploadFile).mockResolvedValue({
        hash: 'QmImageHash123',
        url: 'https://ipfs.io/ipfs/QmImageHash123',
        size: 1024,
      });

      vi.mocked(db.insert).mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(nftService.createNFT(mockParams)).rejects.toThrow('Failed to create NFT');
    });
  });
});
