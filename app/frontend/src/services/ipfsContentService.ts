import { ENV_CONFIG } from '@/config/environment';

const BACKEND_API_BASE_URL = ENV_CONFIG.BACKEND_URL;

export class IPFSContentService {
  private static cache = new Map<string, { content: string; timestamp: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get content from IPFS by CID
   * @param cid The IPFS CID of the content
   * @returns The content as a string
   */
  static async getContentFromIPFS(cid: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(cid);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.content;
    }

    try {
      // Try direct IPFS gateway access first as fallback
      const ipfsGateways = [
        'https://gateway.pinata.cloud/ipfs/',
        'https://ipfs.io/ipfs/',
        'https://cloudflare-ipfs.com/ipfs/',
        'https://dweb.link/ipfs/'
      ];

      // First, try our backend API
      try {
        const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/content/${cid}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          
          // Handle different response formats from the backend
          let content = '';
          if (data.data && data.data.content) {
            content = data.data.content;
          } else if (data.content) {
            content = data.content;
          } else if (typeof data.data === 'string') {
            content = data.data;
          } else if (data.data && typeof data.data === 'object' && data.data.cid) {
            // If we get an object with cid but no content, try to extract content
            content = JSON.stringify(data.data);
          }

          // If we still don't have content, check if the entire data is a string
          if (!content && typeof data === 'string') {
            content = data;
          }

          // Cache the content
          this.cache.set(cid, { content, timestamp: Date.now() });

          return content;
        } else {
          // Check if it's a backend IPFS service error (500)
          if (response.status === 500) {
            try {
              const errorData = await response.json();
              // Check for the specific circular JSON error from backend
              if (errorData.error && errorData.error.includes('circular structure')) {
                console.error('Backend IPFS service error (circular JSON):', errorData);
                throw new Error('BACKEND_IPFS_ERROR');
              }
            } catch (jsonError) {
              // If we can't parse the error, still treat 500 as backend issue
              console.error('Backend IPFS service unavailable (500)');
              throw new Error('BACKEND_IPFS_ERROR');
            }
          }
          
          throw new Error(`Failed to fetch content (HTTP ${response.status}): ${response.statusText}`);
        }
      } catch (backendError) {
        console.warn('Backend API failed, trying direct IPFS gateways:', backendError);
        
        // Fallback to direct IPFS gateways
        for (const gateway of ipfsGateways) {
          try {
            const response = await fetch(`${gateway}${cid}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              const content = await response.text();
              // Cache the content
              this.cache.set(cid, { content, timestamp: Date.now() });
              return content;
            }
          } catch (gatewayError) {
            console.warn(`Gateway ${gateway} failed:`, gatewayError);
            continue;
          }
        }
        
        throw new Error(`All IPFS gateways failed for CID: ${cid}`);
      }
    } catch (error) {
      console.error('Error fetching content from IPFS:', error);

      // Provide user-friendly error messages
      if (error instanceof Error && error.message === 'BACKEND_IPFS_ERROR') {
        throw new Error('BACKEND_IPFS_ERROR');
      }

      // Return a more descriptive error message for other errors
      throw new Error(`Failed to retrieve content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear the cache
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Remove a specific CID from cache
   */
  static removeFromCache(cid: string): void {
    this.cache.delete(cid);
  }
}