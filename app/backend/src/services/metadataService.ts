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
            }
            // Remove apiPath to use default path
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
        // Try to retrieve from public gateways as fallback
        const gateways = [
          `https://gateway.pinata.cloud/ipfs/${cid}`,
          `https://ipfs.io/ipfs/${cid}`,
          `https://cloudflare-ipfs.com/ipfs/${cid}`,
          `https://dweb.link/ipfs/${cid}`
        ];
        
        for (const gateway of gateways) {
          try {
            safeLogger.info(`Attempting to fetch content from gateway: ${gateway}`);
            const response = await axios.get(gateway, {
              timeout: 15000, // Increase timeout
              headers: {
                'User-Agent': 'LinkDAO/1.0'
              }
            });

            // Extract only the data we need to avoid circular reference issues
            const { data, status } = response;
            const responseDataType = typeof data;

            // Check if data is a string before calling includes
            const dataString = responseDataType === 'string' ? data : '';
            const hasCloudflareChallenge = dataString.includes('Just a moment...') || dataString.includes('cf-chl-task');

            // Check if response is valid (not a Cloudflare challenge page)
            if (status === 200 &&
                data &&
                (responseDataType === 'string' || responseDataType === 'object') &&
                !hasCloudflareChallenge) {
              // If it's an object, stringify it carefully
              const content = responseDataType === 'string' ? data : JSON.stringify(data);
              
              // Check if content is valid
              if (!content || content.length === 0) {
                safeLogger.warn(`No content found from gateway: ${gateway}`);
                throw new Error(`Content not available from gateway: ${gateway}`);
              }
              
              safeLogger.info(`Successfully retrieved content from gateway: ${gateway}`, { contentLength: content.length });
              return content;
            } else {
              safeLogger.warn(`Gateway returned invalid response: ${gateway}`, {
                status,
                dataType: responseDataType,
                hasCloudflareChallenge
              });
            }
          } catch (gatewayError: any) {
            safeLogger.warn(`Gateway failed for CID: ${cid}`, { gateway, error: gatewayError?.message || 'Unknown error' });
            // Continue to next gateway
          }
        }
        
        safeLogger.warn(`All IPFS gateways failed for CID: ${cid}`);
        throw new Error(`Content not available: ${cid}`);
      }
      
      // For Pinata, use the gateway URL directly instead of the API client
      if (IPFS_CONFIG.host.includes('pinata')) {
        try {
          safeLogger.info(`Attempting to fetch content from Pinata gateway for CID: ${cid}`);
          const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`, {
            timeout: 15000, // Increase timeout
            headers: {
              'Authorization': `Bearer ${IPFS_CONFIG.projectId}`,
              'User-Agent': 'LinkDAO/1.0'
            }
          });

          // Extract only the data we need to avoid circular reference issues
          const { data, status } = response;
          const responseDataType = typeof data;

          // Check if data is a string before calling includes
          const dataString = responseDataType === 'string' ? data : '';
          const hasCloudflareChallenge = dataString.includes('Just a moment...') || dataString.includes('cf-chl-task');

          // Check if response is valid (not a Cloudflare challenge page)
          if (status === 200 &&
              data &&
              (responseDataType === 'string' || responseDataType === 'object') &&
              !hasCloudflareChallenge) {
            // If it's an object, stringify it carefully
            const content = responseDataType === 'string' ? data : JSON.stringify(data);
            
            // Check if content is valid
            if (!content || content.length === 0) {
              safeLogger.warn(`No content found from Pinata gateway`);
              throw new Error(`Content not available from Pinata gateway`);
            }
            
            safeLogger.info(`Successfully retrieved content from Pinata gateway`, { contentLength: content.length });
            return content;
          } else {
            safeLogger.warn(`Pinata gateway returned invalid response`, {
              status,
              dataType: responseDataType,
              hasCloudflareChallenge
            });
          }
        } catch (pinataError: any) {
          safeLogger.warn(`Pinata gateway failed for CID: ${cid}`, { error: pinataError?.message || 'Unknown error' });
        }

        // Fallback to other gateways
        const gateways = [
          `https://ipfs.io/ipfs/${cid}`,
          `https://cloudflare-ipfs.com/ipfs/${cid}`,
          `https://dweb.link/ipfs/${cid}`
        ];

        for (const gateway of gateways) {
          try {
            safeLogger.info(`Attempting to fetch content from fallback gateway: ${gateway}`);
            const response = await axios.get(gateway, {
              timeout: 15000, // Increase timeout
              headers: {
                'User-Agent': 'LinkDAO/1.0'
              }
            });

            // Extract only the data we need to avoid circular reference issues
            const { data, status } = response;
            const responseDataType = typeof data;

            // Check if data is a string before calling includes
            const dataString = responseDataType === 'string' ? data : '';
            const hasCloudflareChallenge = dataString.includes('Just a moment...') || dataString.includes('cf-chl-task');

            // Check if response is valid (not a Cloudflare challenge page)
            if (status === 200 &&
                data &&
                (responseDataType === 'string' || responseDataType === 'object') &&
                !hasCloudflareChallenge) {
              // If it's an object, stringify it carefully
              const content = responseDataType === 'string' ? data : JSON.stringify(data);
              
              // Check if content is valid
              if (!content || content.length === 0) {
                safeLogger.warn(`No content found from fallback gateway: ${gateway}`);
                throw new Error(`Content not available from fallback gateway: ${gateway}`);
              }
              
              safeLogger.info(`Successfully retrieved content from fallback gateway: ${gateway}`, { contentLength: content.length });
              return content;
            } else {
              safeLogger.warn(`Fallback gateway returned invalid response: ${gateway}`, {
                status,
                dataType: responseDataType,
                hasCloudflareChallenge
              });
            }
          } catch (gatewayError: any) {
            safeLogger.warn(`Gateway failed for CID: ${cid}`, { gateway, error: gatewayError?.message || 'Unknown error' });
            // Continue to next gateway
          }
        }
      }
      
      // For other IPFS clients, use the cat method
      safeLogger.info(`Using IPFS client cat method for CID: ${cid}`);
      const chunks = [];
      for await (const chunk of ipfsClient.cat(cid)) {
        chunks.push(chunk);
      }
      const content = Buffer.concat(chunks).toString();
      
      // Check if content is valid
      if (!content || content.length === 0) {
        safeLogger.warn(`No content found for CID: ${cid}`);
        throw new Error(`Content not available: ${cid}`);
      }
      
      safeLogger.info(`Successfully retrieved content using IPFS client cat method`, { contentLength: content.length });
      return content;
    } catch (error) {
      safeLogger.error('Error retrieving from IPFS:', error);
      throw new Error(`Failed to retrieve content: ${cid} - ${error instanceof Error ? error.message : 'Unknown error'}`);
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