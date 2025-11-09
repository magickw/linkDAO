import ipfsService, { IPFSFileMetadata, IPFSUploadOptions } from './ipfsService';
import { safeLogger } from '../utils/safeLogger';
import { createHash } from 'crypto';

export interface ContentMetadata {
  title?: string;
  description?: string;
  author?: string;
  tags?: string[];
  contentType: 'post' | 'proposal' | 'document' | 'image' | 'video' | 'governance' | 'nft';
  userId: string;
  relatedContent?: string[]; // IPFS hashes of related content
}

export interface GovernanceProposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  startTime: Date;
  endTime: Date;
  ipfsHash: string;
  status: 'active' | 'passed' | 'failed' | 'executed';
  votesFor?: number;
  votesAgainst?: number;
  votesAbstain?: number;
}

export interface PostContent {
  id: string;
  title: string;
  content: string;
  author: string;
  communityId?: string;
  tags?: string[];
  createdAt: Date;
  ipfsHash: string;
  mediaCids?: string[];
}

export class IPFSIntegrationService {
  /**
   * Upload governance proposal to IPFS
   */
  async uploadGovernanceProposal(
    proposal: Omit<GovernanceProposal, 'ipfsHash' | 'id'>,
    userId: string
  ): Promise<GovernanceProposal> {
    try {
      const startTime = Date.now();
      safeLogger.info('Uploading governance proposal to IPFS', { 
        title: proposal.title,
        proposer: proposal.proposer 
      });

      // Create content structure
      const content = {
        title: proposal.title,
        description: proposal.description,
        proposer: proposal.proposer,
        startTime: proposal.startTime.toISOString(),
        endTime: proposal.endTime.toISOString(),
        status: proposal.status,
        votesFor: proposal.votesFor,
        votesAgainst: proposal.votesAgainst,
        votesAbstain: proposal.votesAbstain,
        userId,
        createdAt: new Date().toISOString()
      };

      // Upload to IPFS
      const metadata = await ipfsService.uploadFile(JSON.stringify(content), {
        pin: true,
        metadata: {
          name: `governance-proposal-${Date.now()}`,
          mimeType: 'application/json',
          tags: ['governance', 'proposal'],
          description: proposal.title
        }
      });

      const result: GovernanceProposal = {
        id: metadata.id,
        title: proposal.title,
        description: proposal.description,
        proposer: proposal.proposer,
        startTime: proposal.startTime,
        endTime: proposal.endTime,
        ipfsHash: metadata.ipfsHash,
        status: proposal.status,
        votesFor: proposal.votesFor,
        votesAgainst: proposal.votesAgainst,
        votesAbstain: proposal.votesAbstain
      };

      const endTime = Date.now();
      safeLogger.info('Governance proposal uploaded to IPFS', {
        hash: metadata.ipfsHash,
        duration: endTime - startTime
      });

      return result;
    } catch (error) {
      safeLogger.error('Failed to upload governance proposal to IPFS:', error);
      throw new Error(`Failed to upload proposal: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Upload post content to IPFS
   */
  async uploadPostContent(
    post: Omit<PostContent, 'ipfsHash' | 'id'>,
    userId: string
  ): Promise<PostContent> {
    try {
      const startTime = Date.now();
      safeLogger.info('Uploading post content to IPFS', { 
        title: post.title,
        author: post.author 
      });

      // Create content structure
      const content = {
        title: post.title,
        content: post.content,
        author: post.author,
        communityId: post.communityId,
        tags: post.tags,
        createdAt: post.createdAt.toISOString(),
        userId,
        mediaCids: post.mediaCids
      };

      // Upload to IPFS
      const metadata = await ipfsService.uploadFile(JSON.stringify(content), {
        pin: true,
        metadata: {
          name: `post-${Date.now()}`,
          mimeType: 'application/json',
          tags: ['post', ...(post.tags || [])],
          description: post.title
        }
      });

      const result: PostContent = {
        id: metadata.id,
        title: post.title,
        content: post.content,
        author: post.author,
        communityId: post.communityId,
        tags: post.tags,
        createdAt: post.createdAt,
        ipfsHash: metadata.ipfsHash,
        mediaCids: post.mediaCids
      };

      const endTime = Date.now();
      safeLogger.info('Post content uploaded to IPFS', {
        hash: metadata.ipfsHash,
        duration: endTime - startTime
      });

      return result;
    } catch (error) {
      safeLogger.error('Failed to upload post content to IPFS:', error);
      throw new Error(`Failed to upload post: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Upload document to IPFS
   */
  async uploadDocument(
    content: Buffer | string,
    metadata: ContentMetadata
  ): Promise<IPFSFileMetadata> {
    try {
      const startTime = Date.now();
      safeLogger.info('Uploading document to IPFS', { 
        title: metadata.title,
        contentType: metadata.contentType 
      });

      // Determine MIME type
      let mimeType = metadata.contentType === 'document' ? 'application/pdf' : 'application/octet-stream';
      if (typeof content === 'string') {
        mimeType = 'text/plain';
      }

      // Upload to IPFS
      const result = await ipfsService.uploadFile(content, {
        pin: true,
        metadata: {
          name: metadata.title || `document-${Date.now()}`,
          mimeType,
          tags: metadata.tags || [metadata.contentType],
          description: metadata.description
        }
      });

      const endTime = Date.now();
      safeLogger.info('Document uploaded to IPFS', {
        hash: result.ipfsHash,
        size: result.size,
        duration: endTime - startTime
      });

      return result;
    } catch (error) {
      safeLogger.error('Failed to upload document to IPFS:', error);
      throw new Error(`Failed to upload document: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Download governance proposal from IPFS
   */
  async downloadGovernanceProposal(ipfsHash: string): Promise<GovernanceProposal> {
    try {
      const startTime = Date.now();
      safeLogger.info('Downloading governance proposal from IPFS', { hash: ipfsHash });

      const { content } = await ipfsService.downloadFile(ipfsHash);
      const proposalData = JSON.parse(content.toString('utf8'));

      const result: GovernanceProposal = {
        id: proposalData.id || ipfsHash,
        title: proposalData.title,
        description: proposalData.description,
        proposer: proposalData.proposer,
        startTime: new Date(proposalData.startTime),
        endTime: new Date(proposalData.endTime),
        ipfsHash,
        status: proposalData.status,
        votesFor: proposalData.votesFor,
        votesAgainst: proposalData.votesAgainst,
        votesAbstain: proposalData.votesAbstain
      };

      const endTime = Date.now();
      safeLogger.info('Governance proposal downloaded from IPFS', {
        hash: ipfsHash,
        duration: endTime - startTime
      });

      return result;
    } catch (error) {
      safeLogger.error(`Failed to download governance proposal from IPFS:`, error);
      throw new Error(`Failed to download proposal: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Download post content from IPFS
   */
  async downloadPostContent(ipfsHash: string): Promise<PostContent> {
    try {
      const startTime = Date.now();
      safeLogger.info('Downloading post content from IPFS', { hash: ipfsHash });

      const { content } = await ipfsService.downloadFile(ipfsHash);
      const postData = JSON.parse(content.toString('utf8'));

      const result: PostContent = {
        id: postData.id || ipfsHash,
        title: postData.title,
        content: postData.content,
        author: postData.author,
        communityId: postData.communityId,
        tags: postData.tags,
        createdAt: new Date(postData.createdAt),
        ipfsHash,
        mediaCids: postData.mediaCids
      };

      const endTime = Date.now();
      safeLogger.info('Post content downloaded from IPFS', {
        hash: ipfsHash,
        duration: endTime - startTime
      });

      return result;
    } catch (error) {
      safeLogger.error(`Failed to download post content from IPFS:`, error);
      throw new Error(`Failed to download post: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Download document from IPFS
   */
  async downloadDocument(ipfsHash: string): Promise<{ content: Buffer; metadata: IPFSFileMetadata }> {
    try {
      const startTime = Date.now();
      safeLogger.info('Downloading document from IPFS', { hash: ipfsHash });

      const result = await ipfsService.downloadFile(ipfsHash);

      const endTime = Date.now();
      safeLogger.info('Document downloaded from IPFS', {
        hash: ipfsHash,
        size: result.content.length,
        duration: endTime - startTime
      });

      return result;
    } catch (error) {
      safeLogger.error(`Failed to download document from IPFS:`, error);
      throw new Error(`Failed to download document: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Pin important content to ensure permanence
   */
  async pinContent(ipfsHash: string, reason: string): Promise<boolean> {
    try {
      safeLogger.info('Pinning content to IPFS', { hash: ipfsHash, reason });

      const result = await ipfsService.pinFile(ipfsHash);
      
      if (result) {
        safeLogger.info('Content pinned successfully', { hash: ipfsHash });
      } else {
        safeLogger.warn('Failed to pin content', { hash: ipfsHash });
      }

      return result;
    } catch (error) {
      safeLogger.error(`Failed to pin content ${ipfsHash}:`, error);
      return false;
    }
  }

  /**
   * Unpin content (when no longer needed)
   */
  async unpinContent(ipfsHash: string, reason: string): Promise<boolean> {
    try {
      safeLogger.info('Unpinning content from IPFS', { hash: ipfsHash, reason });

      const result = await ipfsService.unpinFile(ipfsHash);
      
      if (result) {
        safeLogger.info('Content unpinned successfully', { hash: ipfsHash });
      } else {
        safeLogger.warn('Failed to unpin content', { hash: ipfsHash });
      }

      return result;
    } catch (error) {
      safeLogger.error(`Failed to unpin content ${ipfsHash}:`, error);
      return false;
    }
  }

  /**
   * Get content metadata
   */
  async getContentMetadata(ipfsHash: string): Promise<IPFSFileMetadata> {
    try {
      return await ipfsService.getFileMetadata(ipfsHash);
    } catch (error) {
      safeLogger.error(`Failed to get content metadata for ${ipfsHash}:`, error);
      throw new Error(`Failed to get metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Verify content integrity
   */
  async verifyContentIntegrity(ipfsHash: string, expectedSize: number): Promise<boolean> {
    try {
      return await ipfsService.verifyFileIntegrity(expectedSize, ipfsHash);
    } catch (error) {
      safeLogger.error(`Failed to verify content integrity for ${ipfsHash}:`, error);
      return false;
    }
  }

  /**
   * Create content hash for duplicate detection
   */
  createContentHash(content: Buffer | string): string {
    const data = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get gateway URL for content
   */
  getGatewayUrl(ipfsHash: string): string {
    return `${process.env.IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs'}/${ipfsHash}`;
  }

  /**
   * Check if content exists on IPFS
   */
  async contentExists(ipfsHash: string): Promise<boolean> {
    try {
      return await ipfsService.fileExists(ipfsHash);
    } catch (error) {
      safeLogger.error(`Failed to check content existence for ${ipfsHash}:`, error);
      return false;
    }
  }

  /**
   * Get pin status for content
   */
  async getPinStatus(ipfsHash: string): Promise<'pinned' | 'unpinned' | 'unknown'> {
    try {
      return await ipfsService.getPinStatus(ipfsHash);
    } catch (error) {
      safeLogger.error(`Failed to get pin status for ${ipfsHash}:`, error);
      return 'unknown';
    }
  }

  /**
   * Upload NFT metadata to IPFS
   */
  async uploadNFTMetadata(metadata: any): Promise<IPFSFileMetadata> {
    try {
      const startTime = Date.now();
      safeLogger.info('Uploading NFT metadata to IPFS');

      const result = await ipfsService.uploadFile(JSON.stringify(metadata), {
        pin: true,
        metadata: {
          name: metadata.name || `nft-metadata-${Date.now()}`,
          mimeType: 'application/json',
          tags: ['nft', 'metadata'],
          description: metadata.description
        }
      });

      const endTime = Date.now();
      safeLogger.info('NFT metadata uploaded to IPFS', {
        hash: result.ipfsHash,
        duration: endTime - startTime
      });

      return result;
    } catch (error) {
      safeLogger.error('Failed to upload NFT metadata to IPFS:', error);
      throw new Error(`Failed to upload NFT metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create standard NFT metadata structure
   */
  createNFTMetadata(params: {
    name: string;
    description: string;
    image: string; // IPFS hash of image
    external_url?: string;
    attributes?: Array<{ trait_type: string; value: string | number }>;
    animation_url?: string;
    background_color?: string;
    youtube_url?: string;
  }): any {
    return {
      name: params.name,
      description: params.description,
      image: `ipfs://${params.image}`,
      external_url: params.external_url,
      attributes: params.attributes,
      animation_url: params.animation_url ? `ipfs://${params.animation_url}` : undefined,
      background_color: params.background_color,
      youtube_url: params.youtube_url
    };
  }
}

// Export singleton instance
export const ipfsIntegrationService = new IPFSIntegrationService();
export default IPFSIntegrationService;