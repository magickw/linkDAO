import { ENV_CONFIG } from '@/config/environment';

const BACKEND_API_BASE_URL = ENV_CONFIG.BACKEND_URL;

export class IPFSContentService {
  private static cache = new Map<string, { content: string | null; timestamp: number }>();
  private static rateLimitCache = new Map<string, { timestamp: number; count: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly FAILURE_TTL = 60 * 1000; // 1 minute for failures
  private static readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
  private static readonly RATE_LIMIT_MAX = 30; // Max 30 requests per window per gateway

  /**
   * Check if a gateway is rate limited
   */
  private static isGatewayRateLimited(gateway: string): boolean {
    const now = Date.now();
    const entry = this.rateLimitCache.get(gateway);
    
    if (!entry) {
      return false; // Not in cache, not rate limited
    }
    
    // Check if the window has expired
    if (now - entry.timestamp > this.RATE_LIMIT_WINDOW) {
      // Expired, remove from cache
      this.rateLimitCache.delete(gateway);
      return false;
    }
    
    // Check if we've exceeded the rate limit
    return entry.count >= this.RATE_LIMIT_MAX;
  }

  /**
   * Record a request to a gateway for rate limiting
   */
  private static recordGatewayRequest(gateway: string): void {
    const now = Date.now();
    const entry = this.rateLimitCache.get(gateway);
    
    if (!entry || now - entry.timestamp > this.RATE_LIMIT_WINDOW) {
      // Reset counter if window expired or entry doesn't exist
      this.rateLimitCache.set(gateway, { timestamp: now, count: 1 });
    } else {
      // Increment counter
      this.rateLimitCache.set(gateway, { timestamp: entry.timestamp, count: entry.count + 1 });
    }
  }

  /**
   * Get content from IPFS by CID
   * @param cid The IPFS CID of the content
   * @returns The content as a string
   */
  static async getContentFromIPFS(cid: string): Promise<string> {
    // Check cache first
    // Check cache first
    const cached = this.cache.get(cid);
    if (cached) {
      const ttl = cached.content === null ? this.FAILURE_TTL : this.CACHE_TTL;
      if (Date.now() - cached.timestamp < ttl) {
        if (cached.content === null) {
          throw new Error(`Content for CID ${cid} previously failed to load`);
        }
        return cached.content;
      }
    }

    try {
      // List of IPFS gateways to try
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
          // Log the specific error status for debugging
          console.warn(`Backend API returned status ${response.status} for CID: ${cid}`);

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
          } else if (response.status === 404) {
            console.info(`Content not found in backend for CID: ${cid}, trying gateways...`);
          }

          // For other errors (404, etc.), continue to try gateways
          console.warn(`Backend API failed with status ${response.status}, trying direct IPFS gateways...`);
        }
      } catch (backendError) {
        console.warn('Backend API failed, trying direct IPFS gateways:', backendError);
      }

      // Fallback to direct IPFS gateways if backend API fails
      for (const gateway of ipfsGateways) {
        // Check if gateway is rate limited
        if (this.isGatewayRateLimited(gateway)) {
          console.warn(`Gateway ${gateway} is rate limited, skipping...`);
          continue;
        }

        try {
          // Record the request for rate limiting
          this.recordGatewayRequest(gateway);

          // Add a timeout using AbortController
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          const response = await fetch(`${gateway}${cid}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const content = await response.text();
            // Cache the content
            this.cache.set(cid, { content, timestamp: Date.now() });
            return content;
          } else {
            console.warn(`Gateway ${gateway} returned status ${response.status} for CID: ${cid}`);
          }
        } catch (gatewayError: any) {
          if (gatewayError.name === 'AbortError') {
            console.warn(`Gateway ${gateway} request timed out for CID: ${cid}`);
          } else {
            console.warn(`Gateway ${gateway} failed for CID: ${cid}:`, gatewayError.message);
          }
          continue;
        }
      }

      // If all gateways fail, try with different content-type header
      console.warn(`All primary gateways failed, trying with no content-type header...`);
      for (const gateway of ipfsGateways) {
        // Check if gateway is rate limited
        if (this.isGatewayRateLimited(gateway)) {
          console.warn(`Gateway ${gateway} is rate limited, skipping retry...`);
          continue;
        }

        try {
          // Record the request for rate limiting
          this.recordGatewayRequest(gateway);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const response = await fetch(`${gateway}${cid}`, {
            method: 'GET',
            // Don't specify content-type to avoid potential issues
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const content = await response.text();
            // Cache the content
            this.cache.set(cid, { content, timestamp: Date.now() });
            return content;
          }
        } catch (gatewayError: any) {
          if (gatewayError.name === 'AbortError') {
            console.warn(`Retry gateway ${gateway} request timed out for CID: ${cid}`);
          } else {
            console.warn(`Retry gateway ${gateway} failed for CID: ${cid}:`, gatewayError.message);
          }
          continue;
        }
      }

      // Cache the failure to prevent immediate retries
      this.cache.set(cid, { content: null, timestamp: Date.now() });
      throw new Error(`All IPFS gateways failed for CID: ${cid}`);
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