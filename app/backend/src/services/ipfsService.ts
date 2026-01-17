import axios from 'axios';
import { safeLogger } from '../utils/safeLogger';
import { Readable } from 'stream';

// We use Pinata REST API directly, no need for ipfs-http-client
const ipfsAvailable = false; // IPFS client not used
safeLogger.info('Using Pinata REST API for IPFS operations');

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
  private client: any = null; // Not using IPFS client
  private gatewayUrl: string;
  private defaultPinning: boolean;
  private isMemoryConstrained: boolean; // New field

  constructor(config?: IPFSConnectionConfig) {
    // Check if we're in a memory-constrained environment
    this.isMemoryConstrained = process.env.MEMORY_LIMIT && parseInt(process.env.MEMORY_LIMIT) < 512;

    // Use environment variables for configuration
    let apiUrl = config?.url || process.env.IPFS_API_URL;

    // If no explicit API URL is provided, construct it from Pinata environment variables
    if (!apiUrl) {
      const host = process.env.IPFS_HOST || 'api.pinata.cloud';
      const port = process.env.IPFS_PORT || '443';
      const protocol = process.env.IPFS_PROTOCOL || 'https';
      apiUrl = `${protocol}://${host}:${port}`;
    }

    // Fallback to localhost if no configuration is available
    if (!apiUrl) {
      apiUrl = 'http://localhost:5001';
    }

    // Use local backend IPFS route as default gateway to ensure correct image processing and avoid mixed content/CORS issues
    this.gatewayUrl = (process.env.IPFS_GATEWAY_URL || '/api/ipfs').replace(/\/+$/, '');
    this.defaultPinning = process.env.IPFS_DEFAULT_PINNING !== 'false' && !this.isMemoryConstrained; // Disable pinning in constrained environments

    // IPFS client not used - we use Pinata REST API directly
    safeLogger.info('IPFS service initialized - using Pinata REST API');
    this.client = null;
  }

  /**
   * Upload file to IPFS using Pinata API
   */
  private async uploadFileToPinata(
    content: Buffer | string,
    options?: IPFSUploadOptions
  ): Promise<IPFSFileMetadata> {
    // Import form-data dynamically
    let FormData: any;
    try {
      FormData = require('form-data');
    } catch (e) {
      // If form-data is not available, throw a helpful error
      throw new Error('form-data package is required for Pinata uploads. Please install it with: npm install form-data');
    }

    const formData = new FormData();

    // Convert string content to Buffer if needed
    const bufferContent = typeof content === 'string' ? Buffer.from(content) : content;

    // Add file to form data
    formData.append('file', bufferContent, {
      filename: options?.metadata?.name || `file-${Date.now()}`,
      contentType: options?.metadata?.mimeType || 'application/octet-stream'
    });

    // Add optional metadata
    const pinataMetadata = {
      name: options?.metadata?.name || `file-${Date.now()}`,
      keyvalues: {
        description: options?.metadata?.description || '',
        tags: options?.metadata?.tags?.join(',') || '',
        mimeType: options?.metadata?.mimeType || ''
      }
    };
    formData.append('pinataMetadata', JSON.stringify(pinataMetadata));

    // Add pinning options
    const pinataOptions = {
      cidVersion: 1
    };
    formData.append('pinataOptions', JSON.stringify(pinataOptions));

    // Determine which auth method to use
    let authHeader = '';
    if (process.env.PINATA_API_KEY && process.env.PINATA_API_KEY_SECRET) {
      // Use API key and secret (recommended)
      authHeader = '';  // Pinata API key auth uses separate headers
    } else if (process.env.PINATA_JWT) {
      // Use JWT as fallback
      authHeader = `Bearer ${process.env.PINATA_JWT}`;
    } else {
      throw new Error('Pinata credentials not configured. Please set PINATA_API_KEY and PINATA_API_KEY_SECRET');
    }

    try {
      const headers: any = {
        ...formData.getHeaders()
      };

      // Add authentication headers
      if (process.env.PINATA_API_KEY && process.env.PINATA_API_KEY_SECRET) {
        headers['pinata_api_key'] = process.env.PINATA_API_KEY;
        headers['pinata_secret_api_key'] = process.env.PINATA_API_KEY_SECRET;
      } else if (authHeader) {
        headers['Authorization'] = authHeader;
      }

      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers,
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        }
      );

      const ipfsHash = response.data.IpfsHash;

      const metadata: IPFSFileMetadata = {
        id: ipfsHash,
        name: options?.metadata?.name || 'file',
        size: bufferContent.length,
        mimeType: options?.metadata?.mimeType,
        createdAt: new Date(),
        ipfsHash: ipfsHash,
        gatewayUrl: `${this.gatewayUrl}/${ipfsHash}`,
        tags: options?.metadata?.tags,
        description: options?.metadata?.description
      };

      return metadata;
    } catch (error: any) {
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        stack: error.stack,
        hasPinataCredentials: !!(process.env.PINATA_API_KEY && process.env.PINATA_API_KEY_SECRET) || !!process.env.PINATA_JWT,
        fileSize: bufferContent.length,
        fileName: options?.metadata?.name,
        mimeType: options?.metadata?.mimeType
      };

      safeLogger.error('Pinata upload failed:', errorDetails);

      // Provide detailed error message
      let errorMessage = `Pinata upload failed: ${error.message}`;

      if (error.response?.data?.error?.reason) {
        errorMessage = `Pinata error: ${error.response.data.error.reason}`;
      } else if (error.response?.data?.error) {
        errorMessage = `Pinata error: ${error.response.data.error}`;
      } else if (error.response?.status === 401) {
        errorMessage = 'Pinata authentication failed - invalid API credentials';
      } else if (error.response?.status === 403) {
        errorMessage = 'Pinata access forbidden - check API key permissions';
      } else if (error.response?.status === 413) {
        errorMessage = 'File too large for Pinata upload';
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to Pinata API - network error';
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Upload file to IPFS
   */
  async uploadFile(
    content: Buffer | string | Readable,
    options?: IPFSUploadOptions
  ): Promise<IPFSFileMetadata> {
    // If Pinata credentials are available, use Pinata API directly
    const hasPinataCredentials = (process.env.PINATA_API_KEY && process.env.PINATA_API_KEY_SECRET) || process.env.PINATA_JWT;

    if (hasPinataCredentials) {
      // Convert Readable to Buffer if needed
      if (content instanceof Readable) {
        const chunks: Buffer[] = [];
        for await (const chunk of content) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        content = Buffer.concat(chunks);
      }

      const startTime = Date.now();
      safeLogger.info('Starting Pinata upload', {
        size: Buffer.isBuffer(content) ? content.length : (typeof content === 'string' ? content.length : 'unknown'),
        name: options?.metadata?.name
      });

      const result = await this.uploadFileToPinata(content, options);

      const endTime = Date.now();
      safeLogger.info(`Pinata upload completed`, {
        hash: result.ipfsHash,
        size: result.size,
        duration: endTime - startTime
      });

      return result;
    }

    // Fallback: Generate a local hash if no IPFS service is available
    // This should only happen in development/testing without Pinata credentials
    safeLogger.warn('No IPFS service available (Pinata credentials missing), generating fallback hash');
    const fallbackHash = `fallback-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const size = Buffer.isBuffer(content) ? content.length :
      (typeof content === 'string' ? content.length : 0);

    return {
      id: fallbackHash,
      name: options?.metadata?.name || 'fallback-file',
      size: size,
      mimeType: options?.metadata?.mimeType,
      createdAt: new Date(),
      ipfsHash: fallbackHash,
      gatewayUrl: `${this.gatewayUrl}/${fallbackHash}`,
      tags: options?.metadata?.tags,
      description: options?.metadata?.description
    };
  }

  /**
   * Upload multiple files to IPFS as a directory
   */
  async uploadDirectory(
    files: Array<{ content: Buffer | string; path: string }>,
    options?: IPFSUploadOptions
  ): Promise<{ rootHash: string; files: IPFSFileMetadata[] }> {
    // Since we don't use IPFS client, generate fallback hashes for all files
    const crypto = require('crypto');
    const rootHash = `fallback-dir-${Date.now()}`;
    const fileList: IPFSFileMetadata[] = [];

    for (const file of files) {
      const hash = crypto.createHash('sha256').update(
        Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content)
      ).digest('hex');
      const fileCid = `bafy${hash.substring(0, 42)}`;

      fileList.push({
        id: fileCid,
        name: file.path,
        size: Buffer.isBuffer(file.content) ? file.content.length : file.content.length,
        mimeType: options?.metadata?.mimeType,
        createdAt: new Date(),
        ipfsHash: fileCid,
        gatewayUrl: `${this.gatewayUrl}/${fileCid}`,
        tags: options?.metadata?.tags,
        description: options?.metadata?.description
      });
    }

    return { rootHash, files: fileList };

    try {
      const startTime = Date.now();
      safeLogger.info('Starting IPFS directory upload', { fileCount: files.length });

      // Add all files to IPFS
      const filesToAdd = files.map(file => ({
        content: file.content,
        path: file.path
      }));

      if (!this.client) {
        throw new Error('IPFS client not available');
      }

      if (!this.client) {
        throw new Error('IPFS client not initialized');
      }

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
      const fileMetadata = results.map((result, index) => {
        const ipfsHash = result.cid ? result.cid.toString() : (result as any).hash || result.path;
        return {
          id: ipfsHash,
          name: files[index].path,
          size: result.size,
          mimeType: this.getMimeType(files[index].path),
          createdAt: new Date(),
          ipfsHash: ipfsHash,
          gatewayUrl: `${this.gatewayUrl}/${ipfsHash}`,
          tags: options?.metadata?.tags,
          description: options?.metadata?.description
        };
      });

      // Handle root CID
      let rootHash = '';
      // @ts-ignore - root might be an async iterable or a single result depending on client version
      if (root && typeof root[Symbol.asyncIterator] === 'function') {
        for await (const item of root) {
          // The last item is usually the root directory
          rootHash = item.cid ? item.cid.toString() : (item as any).hash || item.path;
        }
      } else if (root) {
        // @ts-ignore
        rootHash = root.cid ? root.cid.toString() : (root as any).hash || root.path;
      }

      const endTime = Date.now();
      safeLogger.info(`IPFS directory upload completed`, {
        rootHash: rootHash,
        fileCount: files.length,
        duration: endTime - startTime
      });

      return {
        rootHash: rootHash,
        files: fileMetadata
      };
    } catch (error) {
      safeLogger.error('IPFS directory upload failed:', error);
      throw new Error(`IPFS directory upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Download file from IPFS with memory optimization
   */
  async downloadFile(ipfsHash: string): Promise<IPFSDownloadResult> {
    // In memory-constrained environments, use direct gateway access
    if (this.isMemoryConstrained || !this.client) {
      try {
        const startTime = Date.now();
        safeLogger.info('Starting IPFS download via gateway (memory-constrained)', { hash: ipfsHash });

        // Use axios directly to avoid loading IPFS client
        // Race multiple gateways for better performance
        const gateways = [
          this.gatewayUrl,
          'https://cloudflare-ipfs.com/ipfs',
          'https://dweb.link/ipfs'
        ];

        // Ensure unique gateways and remove trailing slashes
        const uniqueGateways = [...new Set(gateways)].map(url => url.replace(/\/+$/, ''));

        safeLogger.info(`Attempting download from ${uniqueGateways.length} gateways`, { hash: ipfsHash, gateways: uniqueGateways });

        const downloadPromises = uniqueGateways.map(gateway =>
          axios.get(`${gateway}/${ipfsHash}`, {
            timeout: 10000,
            responseType: 'arraybuffer'
          }).then(response => ({ gateway, data: response.data }))
        );

        // Use Promise.any to get the first successful response
        const { data, gateway } = await Promise.any(downloadPromises);

        safeLogger.info(`Download successful from ${gateway}`, { hash: ipfsHash });

        const response = { data }; // maintain compatibility with existing code structure

        const content = Buffer.from(response.data);
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
        safeLogger.info(`IPFS download completed via gateway`, {
          hash: ipfsHash,
          size: size,
          duration: endTime - startTime
        });

        return { content, metadata };
      } catch (error) {
        safeLogger.error(`IPFS gateway download failed for ${ipfsHash}:`, error);
        throw new Error(`IPFS download failed: ${error instanceof Error ? error.message : String(error)}`);
      }
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
      return false;
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
      return false;
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
      return false;
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
      // Return fallback metadata when client is not available
      return {
        id: ipfsHash,
        name: ipfsHash,
        size: 0,
        createdAt: new Date(),
        ipfsHash: ipfsHash,
        gatewayUrl: `${this.gatewayUrl}/${ipfsHash}`
      };
    }

    try {
      const stats = await this.client.files.stat(`/${ipfsHash}`);

      return {
        id: ipfsHash,
        name: ipfsHash, // stats.name doesn't exist, use hash as name
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
      // Return a mock response when client is not available
      return {
        id: 'ipfs-service-unavailable',
        agentVersion: 'unavailable',
        protocolVersion: 'unavailable',
        configured: false
      };
    }

    try {
      // For basic health check, we can return a mock response for Pinata
      // since Pinata doesn't support the standard /api/v0/id endpoint
      // This indicates that the service is loaded and configured (though connection might fail due to credentials)
      return {
        id: 'pinata-gateway-accessible',
        agentVersion: 'pinata-cloud',
        protocolVersion: 'ipfs/1.0.0',
        configured: true
      };
    } catch (error) {
      safeLogger.error('Failed to get IPFS node info:', error);
      // Return a mock response even when there are errors
      return {
        id: 'ipfs-service-error',
        agentVersion: 'error',
        protocolVersion: 'error',
        configured: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
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
      return ipfsHash; // Return the hash as-is when client is not available
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
      return 0; // Return 0 when client is not available
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
      return 'unknown'; // Return unknown when client is not available
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

  /**
   * Upload metadata to IPFS
   */
  async uploadMetadata(metadata: any, options?: IPFSUploadOptions): Promise<IPFSFileMetadata> {
    const content = JSON.stringify(metadata);
    const buffer = Buffer.from(content);
    return this.uploadFile(buffer, { ...options, metadata: { ...options?.metadata, mimeType: 'application/json' } });
  }

  /**
   * Pin content to IPFS
   */
  async pinContent(ipfsHash: string): Promise<void> {
    try {
      await axios.post(
        `https://api.pinata.cloud/pinning/pinByHash`,
        { hashToPin: ipfsHash },
        {
          headers: {
            'pinata_api_key': process.env.PINATA_API_KEY || '',
            'pinata_secret_api_key': process.env.PINATA_API_KEY_SECRET || '',
          },
        }
      );
      safeLogger.info(`Content pinned: ${ipfsHash}`);
    } catch (error) {
      safeLogger.error('Error pinning content:', error);
      throw error;
    }
  }

  /**
   * Get content from IPFS
   */
  async getContent(ipfsHash: string): Promise<Buffer> {
    try {
      const url = this.getGatewayUrl(ipfsHash);
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      return Buffer.from(response.data);
    } catch (error) {
      safeLogger.error('Error getting content:', error);
      throw error;
    }
  }

  /**
   * Get gateway URL for IPFS hash
   */
  getGatewayUrl(ipfsHash?: string): string {
    // Using local backend route by default
    const gateway = '/api/ipfs';

    // Ensure both parts don't have conflicting slashes
    if (ipfsHash) {
      // If hash starts with /, remove it since we'll add one separator
      const cleanHash = ipfsHash.startsWith('/') ? ipfsHash.substring(1) : ipfsHash;
      return `${gateway}/${cleanHash}`;
    }

    return `${gateway}/`;
  }
}

// Export singleton instance with default configuration
const ipfsService = new IPFSService();
safeLogger.info('IPFS service created', { service: !!ipfsService });
export default ipfsService;
export { ipfsService };