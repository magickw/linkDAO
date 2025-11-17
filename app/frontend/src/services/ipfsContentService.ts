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
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/content/${cid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.statusText}`);
      }

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
    } catch (error) {
      console.error('Error fetching content from IPFS:', error);
      // Return a more descriptive error message
      throw new Error(`Failed to retrieve content from IPFS: ${cid} - ${error instanceof Error ? error.message : 'Unknown error'}`);
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