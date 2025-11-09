import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { safeLogger } from '../utils/safeLogger';
import { Readable } from 'stream';

export interface IPFSFileMetadata {
  id: string;
  name: string;
  size: number;
  mimeType?: string;
  createdAt: Date;
  ipfsHash: string;
  gatewayUrl: string;
  tags?: string[];
  description?: string;
}

export interface IPFSUploadOptions {
  pin?: boolean;
  metadata?: {
    name?: string;
    mimeType?: string;
    tags?: string[];
    description?: string;
  };
}

export interface IPFSDownloadResult {
  content: Buffer;
  metadata: IPFSFileMetadata;
}

export interface IPFSConnectionConfig {
  url: string;
  projectId?: string;
  projectSecret?: string;
}

export class IPFSService {
  private client: IPFSHTTPClient | null = null;
  private gatewayUrl: string;
  private defaultPinning: boolean;

  constructor(config?: IPFSConnectionConfig) {
    // Use environment variables for configuration
    const apiUrl = config?.url || process.env.IPFS_API_URL || 'http://localhost:5001';
    this.gatewayUrl = process.env.IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs';
    this.defaultPinning = process.env.IPFS_DEFAULT_PINNING !== 'false';

    try {
      // Create IPFS client
      this.client = create({
        url: apiUrl,
        headers: config?.projectId && config?.projectSecret ? {
          'Authorization': `Basic ${Buffer.from(`${config.projectId}:${config.projectSecret}`).toString('base64')}`
        } : undefined
      });
      
      safeLogger.info('IPFS service initialized', { apiUrl, gatewayUrl: this.gatewayUrl });
    } catch (error) {
      safeLogger.error('Failed to initialize IPFS service:', error);
      throw new Error('IPFS service initialization failed');
    }
  }

  /**
   * Upload file to IPFS
   */
  async uploadFile(
    content: Buffer | string | Readable,
    options?: IPFSUploadOptions
  ): Promise<IPFSFileMetadata> {
    if (!this.client) {
      throw new Error('IPFS client not initialized');
    }

    try {
      const startTime = Date.now();
      safeLogger.info('Starting IPFS upload', { 
        size: Buffer.isBuffer(content) ? content.length : 'unknown',
        name: options?.metadata?.name 
      });

      // Prepare file object
      const file = {
        content: content,
        path: options?.metadata?.name || `file-${Date.now()}`
      };

      // Add file to IPFS
      const result = await this.client.add(file, {
        pin: options?.pin !== undefined ? options.pin : this.defaultPinning,
        wrapWithDirectory: false
      });

      const metadata: IPFSFileMetadata = {
        id: result.hash,
        name: options?.metadata?.name || result.path,
        size: result.size,
        mimeType: options?.metadata?.mimeType,
        createdAt: new Date(),
        ipfsHash: result.hash,
        gatewayUrl: `${this.gatewayUrl}/${result.hash}`,
        tags: options?.metadata?.tags,
        description: options?.metadata?.description
      };

      const endTime = Date.now();
      safeLogger.info(`IPFS upload completed`, {
        hash: result.hash,
        size: result.size,
        duration: endTime - startTime
      });

      return metadata;
    } catch (error) {
      safeLogger.error('IPFS upload failed:', error);
      throw new Error(`IPFS upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Upload multiple files to IPFS as a directory
   */
  async uploadDirectory(
    files: Array<{ content: Buffer | string; path: string }>,
    options?: IPFSUploadOptions
  ): Promise<{ rootHash: string; files: IPFSFileMetadata[] }> {
    if (!this.client) {
      throw new Error('IPFS client not initialized');
    }

    try {
      const startTime = Date.now();
      safeLogger.info('Starting IPFS directory upload', { fileCount: files.length });

      // Add all files to IPFS
      const filesToAdd = files.map(file => ({
        content: file.content,
        path: file.path
      }));

      const results = [];
      for (const file of filesToAdd) {
        const result = await this.client.add(file, {
          pin: options?.pin !== undefined ? options.pin : this.defaultPinning,
          wrapWithDirectory: true
        });
        results.push(result);
      }

      // Create directory structure
      const root = await this.client.addAll(filesToAdd, {
        pin: options?.pin !== undefined ? options.pin : this.defaultPinning,
        wrapWithDirectory: true
      });

      // Convert results to metadata
      const fileMetadata = results.map((result, index) => ({
        id: result.hash,
        name: files[index].path,
        size: result.size,
        mimeType: this.getMimeType(files[index].path),
        createdAt: new Date(),
        ipfsHash: result.hash,
        gatewayUrl: `${this.gatewayUrl}/${result.hash}`,
        tags: options?.metadata?.tags,
        description: options?.metadata?.description
      }));

      const endTime = Date.now();
      safeLogger.info(`IPFS directory upload completed`, {
        rootHash: root.cid.toString(),
        fileCount: files.length,
        duration: endTime - startTime
      });

      return {
        rootHash: root.cid.toString(),
        files: fileMetadata
      };
    } catch (error) {
      safeLogger.error('IPFS directory upload failed:', error);
      throw new Error(`IPFS directory upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Download file from IPFS
   */
  async downloadFile(ipfsHash: string): Promise<IPFSDownloadResult> {
    if (!this.client) {
      throw new Error('IPFS client not initialized');
    }

    try {
      const startTime = Date.now();
      safeLogger.info('Starting IPFS download', { hash: ipfsHash });

      // Get file content
      const chunks = [];
      for await (const chunk of this.client.cat(ipfsHash)) {
        chunks.push(chunk);
      }

      const content = Buffer.concat(chunks);
      const size = content.length;

      // Create metadata
      const metadata: IPFSFileMetadata = {
        id: ipfsHash,
        name: `file-${ipfsHash.slice(0, 8)}`,
        size: size,
        createdAt: new Date(),
        ipfsHash: ipfsHash,
        gatewayUrl: `${this.gatewayUrl}/${ipfsHash}`
      };

      const endTime = Date.now();
      safeLogger.info(`IPFS download completed`, {
        hash: ipfsHash,
        size: size,
        duration: endTime - startTime
      });

      return { content, metadata };
    } catch (error) {
      safeLogger.error(`IPFS download failed for ${ipfsHash}:`, error);
      throw new Error(`IPFS download failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if file exists on IPFS
   */
  async fileExists(ipfsHash: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('IPFS client not initialized');
    }

    try {
      // Try to get file stats to check if it exists
      await this.client.files.stat(`/${ipfsHash}`);
      return true;
    } catch (error) {
      // If error occurs, the file likely doesn't exist
      if ((error as any).code === 'ERR_NOT_FOUND') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Pin file to IPFS node
   */
  async pinFile(ipfsHash: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('IPFS client not initialized');
    }

    try {
      await this.client.pin.add(ipfsHash);
      safeLogger.info('File pinned successfully', { hash: ipfsHash });
      return true;
    } catch (error) {
      safeLogger.error(`Failed to pin file ${ipfsHash}:`, error);
      return false;
    }
  }

  /**
   * Unpin file from IPFS node
   */
  async unpinFile(ipfsHash: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('IPFS client not initialized');
    }

    try {
      await this.client.pin.rm(ipfsHash);
      safeLogger.info('File unpinned successfully', { hash: ipfsHash });
      return true;
    } catch (error) {
      safeLogger.error(`Failed to unpin file ${ipfsHash}:`, error);
      return false;
    }
  }

  /**
   * Get file metadata from IPFS
   */
  async getFileMetadata(ipfsHash: string): Promise<IPFSFileMetadata> {
    if (!this.client) {
      throw new Error('IPFS client not initialized');
    }

    try {
      const stats = await this.client.files.stat(`/${ipfsHash}`);
      
      return {
        id: ipfsHash,
        name: stats.name,
        size: stats.size,
        createdAt: new Date(),
        ipfsHash: ipfsHash,
        gatewayUrl: `${this.gatewayUrl}/${ipfsHash}`
      };
    } catch (error) {
      safeLogger.error(`Failed to get metadata for ${ipfsHash}:`, error);
      throw new Error(`Failed to get metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get IPFS node information
   */
  async getNodeInfo(): Promise<any> {
    if (!this.client) {
      throw new Error('IPFS client not initialized');
    }

    try {
      const id = await this.client.id();
      return id;
    } catch (error) {
      safeLogger.error('Failed to get IPFS node info:', error);
      throw new Error(`Failed to get node info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get file size
   */
  async getFileSize(ipfsHash: string): Promise<number> {
    try {
      const metadata = await this.getFileMetadata(ipfsHash);
      return metadata.size;
    } catch (error) {
      safeLogger.error(`Failed to get file size for ${ipfsHash}:`, error);
      throw new Error(`Failed to get file size: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Verify file integrity by comparing sizes
   */
  async verifyFileIntegrity(originalSize: number, ipfsHash: string): Promise<boolean> {
    try {
      const currentSize = await this.getFileSize(ipfsHash);
      return originalSize === currentSize;
    } catch (error) {
      safeLogger.error(`Failed to verify file integrity for ${ipfsHash}:`, error);
      return false;
    }
  }

  /**
   * Get content identifier (CID) version of file
   */
  async getCIDVersion(ipfsHash: string): Promise<string> {
    if (!this.client) {
      throw new Error('IPFS client not initialized');
    }

    try {
      const cid = await this.client.resolve(`/ipfs/${ipfsHash}`);
      return cid;
    } catch (error) {
      safeLogger.error(`Failed to resolve CID for ${ipfsHash}:`, error);
      throw new Error(`Failed to resolve CID: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Helper method to get MIME type from file extension
   */
  private getMimeType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'txt': 'text/plain',
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'json': 'application/json',
      'xml': 'application/xml',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'ts': 'application/typescript'
    };

    return mimeTypes[extension || ''] || 'application/octet-stream';
  }

  /**
   * Get total size of pinned objects
   */
  async getPinnedSize(): Promise<number> {
    if (!this.client) {
      throw new Error('IPFS client not initialized');
    }

    try {
      const pins = await this.client.pin.ls();
      let totalSize = 0;

      // Note: IPFS API doesn't directly provide size for all pins
      // This is a simplified implementation
      for await (const pin of pins) {
        try {
          const size = await this.getFileSize(pin.cid.toString());
          totalSize += size;
        } catch (error) {
          // Skip files that can't be accessed
          continue;
        }
      }

      return totalSize;
    } catch (error) {
      safeLogger.error('Failed to get pinned size:', error);
      throw new Error(`Failed to get pinned size: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get pin status for a file
   */
  async getPinStatus(ipfsHash: string): Promise<'pinned' | 'unpinned' | 'unknown'> {
    if (!this.client) {
      throw new Error('IPFS client not initialized');
    }

    try {
      const pins = await this.client.pin.ls({ paths: [ipfsHash] });
      for await (const pin of pins) {
        if (pin.cid.toString() === ipfsHash) {
          return 'pinned';
        }
      }
      return 'unpinned';
    } catch (error) {
      safeLogger.error(`Failed to get pin status for ${ipfsHash}:`, error);
      return 'unknown';
    }
  }
}

// Export singleton instance with default configuration
const ipfsService = new IPFSService();
export default ipfsService;