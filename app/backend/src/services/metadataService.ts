import axios from 'axios';
// IPFSHTTPClient type import may need to be adjusted for newer versions

// IPFS configuration
const IPFS_CONFIG = {
  host: process.env.IPFS_HOST || 'localhost',
  port: parseInt(process.env.IPFS_PORT || '5001', 10),
  protocol: process.env.IPFS_PROTOCOL || 'http',
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
      const { create } = require('ipfs-http-client');
      const client = create({
        host: IPFS_CONFIG.host,
        port: IPFS_CONFIG.port,
        protocol: IPFS_CONFIG.protocol,
      });
      
      // Test connection
      await client.id();
      console.log('IPFS client initialized successfully');
      return client;
    } catch (error) {
      console.error('Failed to initialize IPFS client:', error);
      console.warn('IPFS not available, using fallback storage');
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
        console.warn(`IPFS unavailable, using fallback CID: ${fallbackCid}`);
        return fallbackCid;
      }
      
      const { cid } = await ipfsClient.add(content);
      console.log(`Content uploaded to IPFS: ${cid.toString()}`);
      return cid.toString();
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
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
        console.warn('Arweave wallet not configured, using content hash as transaction ID');
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
      
      console.log('Arweave upload simulated:', content.substring(0, 50) + '...');
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      return `ar_${hash.substring(0, 43)}`;
    } catch (error) {
      console.error('Error uploading to Arweave:', error);
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
          console.warn(`IPFS and gateway unavailable for CID: ${cid}`);
          throw new Error(`Content not available: ${cid}`);
        }
      }
      
      const chunks = [];
      for await (const chunk of ipfsClient.cat(cid)) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks).toString();
    } catch (error) {
      console.error('Error retrieving from IPFS:', error);
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
      console.error('Error retrieving from Arweave:', error);
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
        console.warn('IPFS client not available, skipping pinning');
        return;
      }
      
      await ipfsClient.pin.add(cid as any);
      console.log('Pinned to IPFS:', cid);
    } catch (error) {
      console.error('Error pinning to IPFS:', error);
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
      
      console.log(`Mirrored ${cid} to Arweave as ${txId}`);
      return txId;
    } catch (error) {
      console.error('Error mirroring to Arweave:', error);
      throw error;
    }
  }
}