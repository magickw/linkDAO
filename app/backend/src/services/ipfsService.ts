import type { IPFSHTTPClient } from 'ipfs-http-client';
import { Readable } from 'stream';

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  animation_url?: string;
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
  properties?: {
    category?: string;
    creators?: Array<{
      address: string;
      share: number;
    }>;
  };
}

export interface IPFSUploadResult {
  hash: string;
  url: string;
  size: number;
}

class IPFSService {
  private client: IPFSHTTPClient | null = null;
  private gatewayUrl: string;

  constructor() {
    this.gatewayUrl = process.env.IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs/';
  }

  private async initializeClient(): Promise<void> {
    try {
      const { create } = await import('ipfs-http-client');
      this.client = create({
        host: process.env.IPFS_HOST || 'localhost',
        port: parseInt(process.env.IPFS_PORT || '5001'),
        protocol: process.env.IPFS_PROTOCOL || 'http',
      });
    } catch (error) {
      console.error('Failed to initialize IPFS client:', error);
    }
  }

  private async ensureClient(): Promise<IPFSHTTPClient> {
    if (!this.client) {
      await this.initializeClient();
    }
    if (!this.client) {
      throw new Error('IPFS client not available');
    }
    return this.client;
  }

  /**
   * Upload file to IPFS
   */
  async uploadFile(file: Buffer | Uint8Array, filename?: string): Promise<IPFSUploadResult> {
    try {
      const client = await this.ensureClient();
      const result = await client.add({
        content: file,
        path: filename,
      });

      return {
        hash: result.cid.toString(),
        url: `${this.gatewayUrl}${result.cid.toString()}`,
        size: result.size,
      };
    } catch (error) {
      console.error('Error uploading file to IPFS:', error);
      throw new Error('Failed to upload file to IPFS');
    }
  }

  /**
   * Upload JSON metadata to IPFS
   */
  async uploadMetadata(metadata: NFTMetadata): Promise<IPFSUploadResult> {
    try {
      const metadataString = JSON.stringify(metadata, null, 2);
      const buffer = Buffer.from(metadataString);

      const client = await this.ensureClient();
      const result = await client.add({
        content: buffer,
        path: 'metadata.json',
      });

      return {
        hash: result.cid.toString(),
        url: `${this.gatewayUrl}${result.cid.toString()}`,
        size: result.size,
      };
    } catch (error) {
      console.error('Error uploading metadata to IPFS:', error);
      throw new Error('Failed to upload metadata to IPFS');
    }
  }

  /**
   * Upload multiple files to IPFS (for collections)
   */
  async uploadMultipleFiles(files: Array<{ content: Buffer; filename: string }>): Promise<IPFSUploadResult[]> {
    try {
      const results: IPFSUploadResult[] = [];

      for (const file of files) {
        const result = await this.uploadFile(file.content, file.filename);
        results.push(result);
      }

      return results;
    } catch (error) {
      console.error('Error uploading multiple files to IPFS:', error);
      throw new Error('Failed to upload files to IPFS');
    }
  }

  /**
   * Pin content to IPFS (to ensure persistence)
   */
  async pinContent(hash: string): Promise<void> {
    try {
      const client = await this.ensureClient();
      await client.pin.add(hash);
    } catch (error) {
      console.error('Error pinning content to IPFS:', error);
      throw new Error('Failed to pin content to IPFS');
    }
  }

  /**
   * Unpin content from IPFS
   */
  async unpinContent(hash: string): Promise<void> {
    try {
      const client = await this.ensureClient();
      await client.pin.rm(hash);
    } catch (error) {
      console.error('Error unpinning content from IPFS:', error);
      throw new Error('Failed to unpin content from IPFS');
    }
  }

  /**
   * Get content from IPFS
   */
  async getContent(hash: string): Promise<Buffer> {
    try {
      const chunks: Uint8Array[] = [];
      
      const client = await this.ensureClient();
      for await (const chunk of client.cat(hash)) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error('Error getting content from IPFS:', error);
      throw new Error('Failed to get content from IPFS');
    }
  }

  /**
   * Get metadata from IPFS
   */
  async getMetadata(hash: string): Promise<NFTMetadata> {
    try {
      const content = await this.getContent(hash);
      return JSON.parse(content.toString());
    } catch (error) {
      console.error('Error getting metadata from IPFS:', error);
      throw new Error('Failed to get metadata from IPFS');
    }
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

  /**
   * Generate content hash for duplicate detection
   */
  generateContentHash(content: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Create NFT metadata with proper format
   */
  createNFTMetadata(params: {
    name: string;
    description: string;
    imageHash: string;
    animationHash?: string;
    externalUrl?: string;
    attributes: Array<{
      trait_type: string;
      value: string | number;
      display_type?: string;
    }>;
    creator?: string;
  }): NFTMetadata {
    const metadata: NFTMetadata = {
      name: params.name,
      description: params.description,
      image: `${this.gatewayUrl}${params.imageHash}`,
      attributes: params.attributes,
    };

    if (params.animationHash) {
      metadata.animation_url = `${this.gatewayUrl}${params.animationHash}`;
    }

    if (params.externalUrl) {
      metadata.external_url = params.externalUrl;
    }

    if (params.creator) {
      metadata.properties = {
        creators: [{
          address: params.creator,
          share: 100,
        }],
      };
    }

    return metadata;
  }

  /**
   * Batch upload for NFT collections
   */
  async batchUploadCollection(items: Array<{
    name: string;
    description: string;
    image: Buffer;
    attributes: Array<{
      trait_type: string;
      value: string | number;
    }>;
  }>): Promise<Array<{ tokenId: number; metadataHash: string; imageHash: string }>> {
    try {
      const results = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Upload image
        const imageResult = await this.uploadFile(item.image, `${i}.png`);
        
        // Create metadata
        const metadata = this.createNFTMetadata({
          name: item.name,
          description: item.description,
          imageHash: imageResult.hash,
          attributes: item.attributes,
        });

        // Upload metadata
        const metadataResult = await this.uploadMetadata(metadata);

        results.push({
          tokenId: i,
          metadataHash: metadataResult.hash,
          imageHash: imageResult.hash,
        });
      }

      return results;
    } catch (error) {
      console.error('Error batch uploading collection:', error);
      throw new Error('Failed to batch upload collection');
    }
  }

  /**
   * Get IPFS gateway URL
   */
  getGatewayUrl(): string {
    return this.gatewayUrl;
  }

  /**
   * Check if IPFS node is accessible
   */
  async isNodeAccessible(): Promise<boolean> {
    try {
      const client = await this.ensureClient();
      await client.id();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default new IPFSService();