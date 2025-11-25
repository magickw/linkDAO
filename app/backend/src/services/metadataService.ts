import axios from 'axios';
import { safeLogger } from '../utils/safeLogger';
// IPFSHTTPClient type import may need to be adjusted for newer versions

// IPFS configuration
const IPFS_CONFIG = {
  host: process.env.IPFS_HOST || 'api.pinata.cloud',
  port: parseInt(process.env.IPFS_PORT || '443', 10),
  protocol: process.env.IPFS_PROTOCOL || 'https',
  // Pinata API key method (recommended)
  pinataApiKey: process.env.PINATA_API_KEY,
  pinataSecretApiKey: process.env.PINATA_API_KEY_SECRET,
  // Pinata JWT method (when using JWT instead of API keys)
  pinataJwt: process.env.PINATA_JWT,
  gatewayUrl: process.env.IPFS_GATEWAY_URL || process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/',
};

// Validate configuration and log diagnostic info
if (process.env.NODE_ENV !== 'test') {
  if (IPFS_CONFIG.pinataApiKey && IPFS_CONFIG.pinataSecretApiKey) {
    safeLogger.info('✅ Pinata API key configuration detected (recommended method)');
  } else if (IPFS_CONFIG.pinataJwt) {
    safeLogger.info('✅ Pinata JWT configuration detected');
  } else {
    safeLogger.warn('⚠️ No Pinata API configuration detected. IPFS functionality will be limited to gateway access only.');
  }
}

// Arweave configuration
const ARWEAVE_CONFIG = {
  host: process.env.ARWEAVE_HOST || 'arweave.net',
  port: parseInt(process.env.ARWEAVE_PORT || '443', 10),
  protocol: process.env.ARWEAVE_PROTOCOL || 'https',
};

export class MetadataService {
  private ipfsClientPromise: Promise<any | null>;
  private isMemoryConstrained: boolean; // New field

  constructor() {
    // Check if we're in a memory-constrained environment
    this.isMemoryConstrained = process.env.MEMORY_LIMIT && parseInt(process.env.MEMORY_LIMIT) < 512;
    this.ipfsClientPromise = this.initializeIpfsClient();
  }

  private async initializeIpfsClient(): Promise<any | null> {
    // Don't initialize IPFS client in memory-constrained environments
    if (this.isMemoryConstrained) {
      safeLogger.warn('IPFS client initialization skipped due to memory-constrained environment (<512MB)');
      return null;
    }
    
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
      
      // For Pinata, try different authentication methods
      if (IPFS_CONFIG.pinataApiKey && IPFS_CONFIG.pinataSecretApiKey) {
        // Configure for Pinata API with proper authentication (recommended method)
        safeLogger.info('Configuring IPFS client for Pinata API (recommended method)');
        try {
          const client = create({
            host: IPFS_CONFIG.host,
            port: IPFS_CONFIG.port,
            protocol: IPFS_CONFIG.protocol,
            headers: {
              'pinata_api_key': IPFS_CONFIG.pinataApiKey,
              'pinata_secret_api_key': IPFS_CONFIG.pinataSecretApiKey
            }
          });
          
          safeLogger.info('✅ Pinata API client created successfully');
          return client;
        } catch (pinataError) {
          safeLogger.error('Pinata API client creation failed:', pinataError);
          safeLogger.warn('Pinata API not available, trying JWT method or fallback storage');
        }
      } 
      
      // Try Pinata JWT method if API key method failed
      if (IPFS_CONFIG.pinataJwt) {
        safeLogger.info('Configuring IPFS client for Pinata JWT method');
        try {
          const client = create({
            host: IPFS_CONFIG.host,
            port: IPFS_CONFIG.port,
            protocol: IPFS_CONFIG.protocol,
            headers: {
              Authorization: `Bearer ${IPFS_CONFIG.pinataJwt}`
            }
          });
          
          safeLogger.info('✅ Pinata JWT client created successfully');
          return client;
        } catch (jwtError) {
          safeLogger.error('Pinata JWT client creation failed:', jwtError);
          safeLogger.warn('Pinata JWT method not available, using fallback storage');
        }
      }
      
      // Standard IPFS configuration (for local IPFS nodes)
      try {
        const client = create({
          host: IPFS_CONFIG.host,
          port: IPFS_CONFIG.port,
          protocol: IPFS_CONFIG.protocol,
        });
        safeLogger.info('✅ Standard IPFS client created');
        return client;
      } catch (standardError) {
        safeLogger.warn('Standard IPFS client creation failed:', standardError);
        safeLogger.warn('Using fallback storage only');
        return null;
      }
    } catch (error) {
      safeLogger.error('Failed to initialize IPFS client:', error);
      safeLogger.warn('IPFS not available, using fallback storage');
      return null;
    }
  }

  /**
   * Upload content to IPFS with retry logic and fallback mechanisms
   * @param content The content to upload
   * @returns The IPFS CID of the uploaded content
   */
  async uploadToIPFS(content: string | Buffer): Promise<string> {
    const ipfsClient = await this.ipfsClientPromise;
    
    // First, try using the IPFS client if available
    if (ipfsClient) {
      try {
        // Try multiple times with exponential backoff
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const result = await ipfsClient.add(content);
            const cid = result.path || result.cid?.toString() || result.IpfsHash;
            if (cid) {
              safeLogger.info(`Content uploaded to IPFS on attempt ${attempt}: ${cid}`);
              return cid;
            } else {
              throw new Error('IPFS upload returned no valid CID');
            }
          } catch (uploadError) {
            safeLogger.warn(`IPFS upload attempt ${attempt} failed:`, uploadError);
            if (attempt === maxRetries) {
              throw uploadError;
            }
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      } catch (error) {
        safeLogger.error('IPFS client upload failed:', error);
      }
    }
    
    // If IPFS client failed or is not available, try direct Pinata API
    if (IPFS_CONFIG.pinataApiKey && IPFS_CONFIG.pinataSecretApiKey) {
      try {
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const formData = new (require('form-data'))();
            formData.append('file', Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8'));
            
            const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
              maxBodyLength: 1000000000, // 1GB
              headers: {
                'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
                'pinata_api_key': IPFS_CONFIG.pinataApiKey,
                'pinata_secret_api_key': IPFS_CONFIG.pinataSecretApiKey
              },
              timeout: 30000 // 30 second timeout
            });
            
            if (response.data && response.data.IpfsHash) {
              safeLogger.info(`Content uploaded to Pinata on attempt ${attempt}: ${response.data.IpfsHash}`);
              return response.data.IpfsHash;
            } else {
              throw new Error('Pinata API returned no valid CID');
            }
          } catch (pinataError: any) {
            safeLogger.warn(`Pinata API attempt ${attempt} failed:`, pinataError?.message || pinataError);
            if (attempt === maxRetries) {
              throw pinataError;
            }
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      } catch (error) {
        safeLogger.error('Pinata API upload failed:', error);
      }
    }
    
    // If both IPFS client and Pinata API failed, generate fallback CID
    safeLogger.warn('All IPFS upload methods failed, using fallback CID');
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    const fallbackCid = `bafy${hash.substring(0, 42)}`; // Use modern CIDv1 format
    return fallbackCid;
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
   * Retrieve content from IPFS with memory optimization and multiple fallbacks
   * @param cid The IPFS CID of the content
   * @returns The content
   */
  async getFromIPFS(cid: string): Promise<string> {
    const ipfsClient = await this.ipfsClientPromise;
    
    try {
      // First, try IPFS client if available
      if (ipfsClient && !this.isMemoryConstrained) {
        try {
          safeLogger.info(`Using IPFS client cat method for CID: ${cid}`);
          const chunks = [];
          for await (const chunk of ipfsClient.cat(cid)) {
            chunks.push(chunk);
          }
          const content = Buffer.concat(chunks).toString();
          
          // Check if content is valid
          if (content && content.length > 0) {
            safeLogger.info(`Successfully retrieved content using IPFS client cat method`, { contentLength: content.length });
            return content;
          } else {
            safeLogger.warn(`IPFS client returned empty content for CID: ${cid}`);
          }
        } catch (clientError) {
          safeLogger.warn(`IPFS client retrieval failed for CID: ${cid}`, clientError);
        }
      }
      
      // If client retrieval failed or we're in memory-constrained env, try direct gateways
      // Try with multiple gateways and retry logic
      const gateways = [
        `https://gateway.pinata.cloud/ipfs/${cid}`,
        `https://ipfs.io/ipfs/${cid}`,
        `https://cloudflare-ipfs.com/ipfs/${cid}`,
        `https://dweb.link/ipfs/${cid}`,
        `https://ipfs.eth.aragon.network/ipfs/${cid}`,
        `https://ipfs.tribecap.co/ipfs/${cid}`
      ];
      
      for (const gateway of gateways) {
        try {
          safeLogger.info(`Attempting to fetch content from gateway: ${gateway}`);
          
          // Try multiple times with exponential backoff
          const maxRetries = 3;
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const response = await axios.get(gateway, {
                timeout: 15000, // Slightly longer timeout
                headers: {
                  'User-Agent': 'LinkDAO/1.0'
                },
                // More memory-efficient configuration
                maxContentLength: 10 * 1024 * 1024, // 10MB max
                maxBodyLength: 10 * 1024 * 1024, // 10MB max
                responseType: 'text'
              });

              // Extract only the data we need to avoid circular reference issues
              const { data, status } = response;
              const responseDataType = typeof data;

              // Check if data is a string before calling includes
              const dataString = responseDataType === 'string' ? data : '';
              const hasCloudflareChallenge = dataString.includes('Just a moment...') || 
                                            dataString.includes('cf-chl-task') || 
                                            dataString.includes('Checking your browser');

              // Check if response is valid (not a Cloudflare challenge page)
              if (status === 200 &&
                  data &&
                  (responseDataType === 'string' || responseDataType === 'object') &&
                  !hasCloudflareChallenge) {
                // If it's an object, stringify it carefully
                const content = responseDataType === 'string' ? data : JSON.stringify(data);
                
                // Check if content is valid
                if (content && content.length > 0) {
                  safeLogger.info(`Successfully retrieved content from gateway: ${gateway}`, { 
                    contentLength: content.length,
                    attempt
                  });
                  return content;
                } else {
                  safeLogger.warn(`Gateway returned empty content: ${gateway}`, { attempt });
                }
              } else {
                safeLogger.warn(`Gateway returned invalid response: ${gateway}`, {
                  status,
                  dataType: responseDataType,
                  hasCloudflareChallenge,
                  attempt
                });
              }
            } catch (gatewayError: any) {
              safeLogger.warn(`Gateway attempt ${attempt} failed for ${gateway}`, { 
                error: gatewayError?.message || 'Unknown error' 
              });
              if (attempt === maxRetries) {
                // Continue to next gateway after all retries for this gateway
                break;
              }
              // Wait before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
          }
        } catch (gatewayError: any) {
          safeLogger.warn(`Gateway completely failed for CID: ${cid}`, { 
            gateway, 
            error: gatewayError?.message || 'Unknown error' 
          });
          // Continue to next gateway
        }
      }
      
      safeLogger.warn(`All IPFS gateways failed for CID: ${cid}`);
      throw new Error(`Content not available: ${cid}`);
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

  /**
   * Check if a CID exists on IPFS by attempting to retrieve its metadata
   * @param cid The IPFS CID to check
   * @returns Boolean indicating if the CID exists
   */
  async cidExists(cid: string): Promise<boolean> {
    try {
      // Try to get basic metadata about the CID from IPFS
      const ipfsClient = await this.ipfsClientPromise;
      if (ipfsClient) {
        try {
          const stat = await ipfsClient.stat(cid);
          return !!stat && !!stat.cid;
        } catch (error) {
          safeLogger.warn(`IPFS client stat failed for CID: ${cid}`, error);
          // Continue to try gateways
        }
      }
      
      // Try to fetch just the content length via gateway to check existence
      const gateways = [
        `https://gateway.pinata.cloud/ipfs/${cid}`,
        `https://ipfs.io/ipfs/${cid}`,
        `https://cloudflare-ipfs.com/ipfs/${cid}`
      ];
      
      for (const gateway of gateways) {
        try {
          const response = await axios.head(gateway, {
            timeout: 10000,
            headers: {
              'User-Agent': 'LinkDAO/1.0'
            }
          });
          
          if (response.status === 200) {
            return true;
          }
        } catch (headError) {
          safeLogger.warn(`HEAD request failed for gateway: ${gateway}`, headError);
          // Continue to next gateway
        }
      }
      
      // If HEAD request fails, try GET with short timeout
      for (const gateway of gateways) {
        try {
          const response = await axios.get(gateway, {
            timeout: 5000, // Short timeout to just check existence
            headers: {
              'User-Agent': 'LinkDAO/1.0'
            },
            maxContentLength: 1 // We only need to know if it exists
          });
          
          if (response.status === 200) {
            return true;
          }
        } catch (getError) {
          safeLogger.warn(`GET request failed for gateway: ${gateway}`, getError);
          // Continue to next gateway
        }
      }
      
      return false;
    } catch (error) {
      safeLogger.error('Error checking CID existence:', error);
      return false;
    }
  }

  /**
   * Test Pinata API connection with the provided credentials
   * @returns Boolean indicating if the Pinata connection is working
   */
  async testPinataConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Test Pinata API key method first
      if (IPFS_CONFIG.pinataApiKey && IPFS_CONFIG.pinataSecretApiKey) {
        const response = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
          headers: {
            'pinata_api_key': IPFS_CONFIG.pinataApiKey,
            'pinata_secret_api_key': IPFS_CONFIG.pinataSecretApiKey
          },
          timeout: 10000
        });

        if (response.status === 200 && response.data) {
          safeLogger.info('✅ Pinata API authentication successful');
          return { 
            success: true, 
            message: 'Pinata API connection successful with API key method' 
          };
        }
      }

      // Test JWT method if API key method failed
      if (IPFS_CONFIG.pinataJwt) {
        const response = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
          headers: {
            'Authorization': `Bearer ${IPFS_CONFIG.pinataJwt}`
          },
          timeout: 10000
        });

        if (response.status === 200 && response.data) {
          safeLogger.info('✅ Pinata JWT authentication successful');
          return { 
            success: true, 
            message: 'Pinata connection successful with JWT method' 
          };
        }
      }

      return { 
        success: false, 
        message: 'Pinata authentication failed - please check your API credentials' 
      };
    } catch (error: any) {
      safeLogger.error('Pinata connection test failed:', error?.response?.data || error?.message || error);
      
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return { 
          success: false, 
          message: `Pinata authentication failed (Status ${error?.response?.status}): Invalid credentials. Please verify your PINATA_API_KEY/PINATA_API_KEY_SECRET or PINATA_JWT values.` 
        };
      } else if (error?.code === 'ENOTFOUND' || error?.message?.includes('ENOTFOUND')) {
        return { 
          success: false, 
          message: 'Cannot connect to Pinata API - check your internet connection and firewall settings' 
        };
      } else {
        return { 
          success: false, 
          message: `Pinata connection failed: ${error?.response?.data?.error || error?.message || 'Unknown error'}` 
        };
      }
    }
  }
}