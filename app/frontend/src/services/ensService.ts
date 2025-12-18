/**
 * ENS/SNS Service
 * Handles ENS and SNS name resolution and validation
 */

import { ethers } from 'ethers';

export interface ENSProfile {
  name: string;
  address: string;
  avatar?: string;
  description?: string;
  twitter?: string;
  github?: string;
  website?: string;
  isValid: boolean;
}

export interface SNSProfile {
  name: string;
  address: string;
  avatar?: string;
  description?: string;
  twitter?: string;
  github?: string;
  website?: string;
  isValid: boolean;
}

export interface ResolvedName {
  type: 'ens' | 'sns' | 'address';
  original: string;
  resolved: string;
  profile?: ENSProfile | SNSProfile;
  isValid: boolean;
}

class ENSService {
  private provider: ethers.JsonRpcProvider | null = null;
  private cache = new Map<string, ResolvedName>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider() {
    try {
      // Use public provider for ENS resolution
      this.provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://cloudflare-eth.com',
        undefined, // Let ethers determine the network
        {
          staticNetwork: true
        }
      );
    } catch (error) {
      console.warn('Failed to initialize ENS provider:', error);
    }
  }

  /**
   * Check if a string is an ENS name
   */
  isENSName(name: string): boolean {
    return /^[a-zA-Z0-9-]+\.eth$/.test(name.toLowerCase());
  }

  /**
   * Check if a string is an SNS name
   */
  isSNSName(name: string): boolean {
    return /^[a-zA-Z0-9-]+\.sol$/.test(name.toLowerCase());
  }

  /**
   * Check if a string is an Ethereum address
   */
  isEthereumAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Detect name type from string
   */
  detectNameType(name: string): 'ens' | 'sns' | 'address' | 'unknown' {
    if (this.isENSName(name)) return 'ens';
    if (this.isSNSName(name)) return 'sns';
    if (this.isEthereumAddress(name)) return 'address';
    return 'unknown';
  }

  /**
   * Get cached result if available and not expired
   */
  private getCachedResult(key: string): ResolvedName | null {
    const cached = this.cache.get(key);
    const expiry = this.cacheExpiry.get(key);
    
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }
    
    // Clean up expired cache
    if (cached) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
    }
    
    return null;
  }

  /**
   * Cache result with expiry
   */
  private setCachedResult(key: string, result: ResolvedName): void {
    this.cache.set(key, result);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  /**
   * Resolve ENS name to address and profile
   */
  async resolveENS(ensName: string): Promise<ResolvedName> {
    const cacheKey = `ens:${ensName.toLowerCase()}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    try {
      if (!this.provider) {
        throw new Error('ENS provider not available');
      }

      const address = await this.provider.resolveName(ensName);
      
      if (!address) {
        const result: ResolvedName = {
          type: 'ens',
          original: ensName,
          resolved: '',
          isValid: false,
        };
        this.setCachedResult(cacheKey, result);
        return result;
      }

      // Get ENS profile data
      const resolver = await this.provider.getResolver(ensName);
      let profile: ENSProfile | undefined;

      if (resolver) {
        try {
          const [avatar, description, twitter, github, website] = await Promise.allSettled([
            resolver.getText('avatar').catch(() => null),
            resolver.getText('description').catch(() => null),
            resolver.getText('com.twitter').catch(() => null),
            resolver.getText('com.github').catch(() => null),
            resolver.getText('url').catch(() => null),
          ]);

          profile = {
            name: ensName,
            address,
            avatar: avatar.status === 'fulfilled' ? avatar.value || undefined : undefined,
            description: description.status === 'fulfilled' ? description.value || undefined : undefined,
            twitter: twitter.status === 'fulfilled' ? twitter.value || undefined : undefined,
            github: github.status === 'fulfilled' ? github.value || undefined : undefined,
            website: website.status === 'fulfilled' ? website.value || undefined : undefined,
            isValid: true,
          };
        } catch (error) {
          console.warn('Failed to fetch ENS profile data:', error);
        }
      }

      const result: ResolvedName = {
        type: 'ens',
        original: ensName,
        resolved: address,
        profile,
        isValid: true,
      };

      this.setCachedResult(cacheKey, result);
      return result;
    } catch (error) {
      console.error('ENS resolution failed:', error);
      
      const result: ResolvedName = {
        type: 'ens',
        original: ensName,
        resolved: '',
        isValid: false,
      };
      
      this.setCachedResult(cacheKey, result);
      return result;
    }
  }

  /**
   * Resolve SNS name (Solana Name Service)
   * Note: This is a simplified implementation
   */
  async resolveSNS(snsName: string): Promise<ResolvedName> {
    const cacheKey = `sns:${snsName.toLowerCase()}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    try {
      // Mock SNS resolution - replace with actual SNS SDK
      // For now, we'll simulate the resolution
      const mockAddress = `${snsName.replace('.sol', '')}.solana.address`;
      
      const profile: SNSProfile = {
        name: snsName,
        address: mockAddress,
        isValid: true,
      };

      const result: ResolvedName = {
        type: 'sns',
        original: snsName,
        resolved: mockAddress,
        profile,
        isValid: true,
      };

      this.setCachedResult(cacheKey, result);
      return result;
    } catch (error) {
      console.error('SNS resolution failed:', error);
      
      const result: ResolvedName = {
        type: 'sns',
        original: snsName,
        resolved: '',
        isValid: false,
      };
      
      this.setCachedResult(cacheKey, result);
      return result;
    }
  }

  /**
   * Reverse resolve address to ENS name
   */
  async reverseResolveENS(address: string): Promise<string | null> {
    const cacheKey = `reverse:${address.toLowerCase()}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached.resolved || null;

    try {
      if (!this.provider || !this.isEthereumAddress(address)) {
        return null;
      }

      const ensName = await this.provider.lookupAddress(address);
      
      const result: ResolvedName = {
        type: 'address',
        original: address,
        resolved: ensName || '',
        isValid: !!ensName,
      };
      
      this.setCachedResult(cacheKey, result);
      return ensName;
    } catch (error) {
      console.error('Reverse ENS resolution failed:', error);
      return null;
    }
  }

  /**
   * Resolve any name type (ENS, SNS, or address)
   */
  async resolveName(name: string): Promise<ResolvedName> {
    const type = this.detectNameType(name);
    
    switch (type) {
      case 'ens':
        return this.resolveENS(name);
      case 'sns':
        return this.resolveSNS(name);
      case 'address':
        // For addresses, try reverse resolution
        const ensName = await this.reverseResolveENS(name);
        return {
          type: 'address',
          original: name,
          resolved: ensName || name,
          isValid: this.isEthereumAddress(name),
        };
      default:
        return {
          type: 'address',
          original: name,
          resolved: name,
          isValid: false,
        };
    }
  }

  /**
   * Validate multiple names in batch
   */
  async validateNames(names: string[]): Promise<Map<string, ResolvedName>> {
    const results = new Map<string, ResolvedName>();
    
    // Process in batches to avoid overwhelming the provider
    const batchSize = 5;
    for (let i = 0; i < names.length; i += batchSize) {
      const batch = names.slice(i, i + batchSize);
      const promises = batch.map(name => this.resolveName(name));
      
      try {
        const batchResults = await Promise.allSettled(promises);
        
        batchResults.forEach((result, index) => {
          const name = batch[index];
          if (result.status === 'fulfilled') {
            results.set(name, result.value);
          } else {
            results.set(name, {
              type: 'address',
              original: name,
              resolved: name,
              isValid: false,
            });
          }
        });
      } catch (error) {
        console.error('Batch name validation failed:', error);
        // Add failed results
        batch.forEach(name => {
          results.set(name, {
            type: 'address',
            original: name,
            resolved: name,
            isValid: false,
          });
        });
      }
    }
    
    return results;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for accurate rate
    };
  }
}

// Export singleton instance
export const ensService = new ENSService();
export default ensService;