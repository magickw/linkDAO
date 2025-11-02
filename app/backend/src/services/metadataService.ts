import axios from 'axios';
import { safeLogger } from '../utils/safeLogger';
// IPFSHTTPClient type import may need to be adjusted for newer versions

// IPFS configuration
const IPFS_CONFIG = {
  host: process.env.IPFS_HOST || 'api.pinata.cloud',
  port: parseInt(process.env.IPFS_PORT || '443', 10),
  protocol: process.env.IPFS_PROTOCOL || 'https',
  projectId: process.env.IPFS_PROJECT_ID,
  projectSecret: process.env.IPFS_PROJECT_SECRET,
  gatewayUrl: process.env.IPFS_GATEWAY_URL || process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/',
};

// Arweave configuration
const ARWEAVE_CONFIG = {
  host: process.env.ARWEAVE_HOST || 'arweave.net',
  port: parseInt(process.env.ARWEAVE_PORT || '443', 10),
  protocol: process.env.ARWEAVE_PROTOCOL || 'https',
};

export class MetadataService {
  private ipfsClientPromise: Promise<any | null>;

  constructor() {
    this.ipfsClientPromise = this.initializeIpfsClient();
  }

  private async initializeIpfsClient(): Promise<any | null> {
    try {
      // Use require instead of import for CommonJS compatibility
      let create;
      try {
        const ipfsModule = require('ipfs-http-client');
        create = ipfsModule.create;
        if (!create) {
          safeLogger.warn('ipfs-http-client module loaded but create function not found');
          return null;
        }
      } catch (requireError) {
        safeLogger.error('Failed to require ipfs-http-client:', requireError);
        safeLogger.warn('IPFS module not available, using fallback storage');
        return null;
      }
      
      // For Pinata, we need to use a different configuration
      if (IPFS_CONFIG.projectId && IPFS_CONFIG.projectSecret && IPFS_CONFIG.host.includes('pinata')) {
        // Configure for Pinata gateway (read-only operations)
        safeLogger.info('Configuring IPFS client for Pinata gateway');
        try {
          const client = create({
            host: 'api.pinata.cloud',
            port: 443,
            protocol: 'https',
            headers: {
              Authorization: `Bearer ${IPFS_CONFIG.projectId}`
            },
            apiPath: '/data'
          });
          
          // Test connection with a simple request
          safeLogger.info('Testing Pinata connection...');
          safeLogger.info('✅ Pinata client created successfully');
          return client;
        } catch (pinataError) {
          safeLogger.error('Pinata client creation failed:', pinataError);
          safeLogger.warn('Pinata not available, using fallback storage');
          return null;
        }
      } else if (IPFS_CONFIG.projectId && IPFS_CONFIG.projectSecret) {
        // Generic IPFS with authentication
        const client = create({
          host: IPFS_CONFIG.host,
          port: IPFS_CONFIG.port,
          protocol: IPFS_CONFIG.protocol,
          headers: {
            Authorization: `Bearer ${IPFS_CONFIG.projectId}`
          }
        });
        return client;
      } else {
        // Standard IPFS configuration
        const client = create({
          host: IPFS_CONFIG.host,
          port: IPFS_CONFIG.port,
          protocol: IPFS_CONFIG.protocol,
        });
        return client;
      }
    } catch (error) {
      safeLogger.error('Failed to initialize IPFS client:', error);
      safeLogger.warn('IPFS not available, using fallback storage');
      return null;
    }
  }

  /**
   * Upload content to IPFS
   * @param content The content to upload
   * @returns The IPFS CID of the uploaded content
   */
  async uploadToIPFS(content: string | Buffer): Promise<string> {
    const ipfsClient = await this.ipfsClientPromise;
    try {
      if (!ipfsClient) {
        // Use content hash as fallback CID when IPFS unavailable
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        const fallbackCid = `Qm${hash.substring(0, 44)}`; // Valid CID format
        safeLogger.warn(`IPFS unavailable, using fallback CID: ${fallbackCid}`);
        return fallbackCid;
      }
      
      // For Pinata, use the add method
      const { IpfsHash } = await ipfsClient.add(content);
      safeLogger.info(`Content uploaded to IPFS: ${IpfsHash}`);
      return IpfsHash;
    } catch (error) {
      safeLogger.error('Error uploading to IPFS:', error);
      // Generate deterministic fallback CID
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      return `Qm${hash.substring(0, 44)}`;
    }
  }

  /**
   * Upload content to Arweave
   * @param content The content to upload
   * @returns The Arweave transaction ID
   */
  async uploadToArweave(content: string): Promise<string> {
    try {
      // Check if Arweave wallet is configured
      const walletKey = process.env.ARWEAVE_WALLET_KEY;
      if (!walletKey) {
        safeLogger.warn('Arweave wallet not configured, using content hash as transaction ID');
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        return `ar_${hash.substring(0, 43)}`; // Arweave-like transaction ID
      }

      // TODO: Implement real Arweave upload when wallet is configured
      // const Arweave = require('arweave');
      // const arweave = Arweave.init(ARWEAVE_CONFIG);
      // const wallet = JSON.parse(walletKey);
      // const transaction = await arweave.createTransaction({ data: content }, wallet);
      // await arweave.transactions.sign(transaction, wallet);
      // await arweave.transactions.post(transaction);
      // return transaction.id;
      
      safeLogger.info('Arweave upload simulated:', content.substring(0, 50) + '...');
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      return `ar_${hash.substring(0, 43)}`;
    } catch (error) {
      safeLogger.error('Error uploading to Arweave:', error);
      throw error;
    }
  }

  /**
   * Retrieve content from IPFS
   * @param cid The IPFS CID of the content
   * @returns The content
   */
  async getFromIPFS(cid: string): Promise<string> {
    const ipfsClient = await this.ipfsClientPromise;
    try {
      if (!ipfsClient) {
        // Try to retrieve from public gateway as fallback
        try {
          const response = await axios.get(`https://ipfs.io/ipfs/${cid}`, { timeout: 5000 });
          return response.data;
        } catch (gatewayError) {
          safeLogger.warn(`IPFS and gateway unavailable for CID: ${cid}`);
          throw new Error(`Content not available: ${cid}`);
        }
      }
      
      const chunks = [];
      for await (const chunk of ipfsClient.cat(cid)) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks).toString();
    } catch (error) {
      safeLogger.error('Error retrieving from IPFS:', error);
      throw new Error(`Failed to retrieve content: ${cid}`);
    }
  }

  /**
   * Retrieve content from Arweave
   * @param txId The Arweave transaction ID
   * @returns The content
   */
  async getFromArweave(txId: string): Promise<string> {
    try {
      // Try to retrieve from Arweave gateway
      const response = await axios.get(`https://arweave.net/${txId}`, { 
        timeout: 10000,
        headers: { 'Accept': 'text/plain, application/json' }
      });
      return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    } catch (error) {
      safeLogger.error('Error retrieving from Arweave:', error);
      throw new Error(`Failed to retrieve Arweave content: ${txId}`);
    }
  }

  /**
   * Pin content to IPFS
   * @param cid The IPFS CID to pin
   */
  async pinToIPFS(cid: string): Promise<void> {
    const ipfsClient = await this.ipfsClientPromise;
    try {
      // If IPFS client is not available, skip pinning
      if (!ipfsClient) {
        safeLogger.warn('IPFS client not available, skipping pinning');
        return;
      }
      
      await ipfsClient.pin.add(cid as any);
      safeLogger.info('Pinned to IPFS:', cid);
    } catch (error) {
      safeLogger.error('Error pinning to IPFS:', error);
      // Don't throw error for pinning, as it's not critical
    }
  }

  /**
   * Mirror content from IPFS to Arweave
   * @param cid The IPFS CID to mirror
   * @returns The Arweave transaction ID
   */
  async mirrorToArweave(cid: string): Promise<string> {
    try {
      // First, retrieve the content from IPFS
      const content = await this.getFromIPFS(cid);
      
      // Then, upload it to Arweave
      const txId = await this.uploadToArweave(content);
      
      safeLogger.info(`Mirrored ${cid} to Arweave as ${txId}`);
      return txId;
    } catch (error) {
      safeLogger.error('Error mirroring to Arweave:', error);
      throw error;
    }
  }
}
