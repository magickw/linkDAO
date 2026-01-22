/**
 * ENS (Ethereum Name Service) Integration Service
 * 
 * Provides ENS domain resolution, reverse lookup, and avatar support.
 * 
 * Features:
 * - Resolve ENS names to addresses
 * - Reverse lookup (address to ENS name)
 * - ENS avatar support
 * - ENS text records
 * - Multi-chain support
 * - Caching for performance
 */

import { ethers } from 'ethers';

// ENS configuration
export interface ENSConfig {
  enabled: boolean;
  registryAddress: string;
  resolverAddress: string;
  supportedChains: number[];
  cacheTTL: number; // Time to live in milliseconds
}

// ENS record types
export enum ENSRecordType {
  ADDRESS = 'addr',
  AVATAR = 'avatar',
  CONTENT_HASH = 'contenthash',
  TEXT = 'text',
}

// ENS text record keys
export enum ENSTextRecordKey {
  EMAIL = 'email',
  URL = 'url',
  TWITTER = 'com.twitter',
  GITHUB = 'com.github',
  DISCORD = 'com.discord',
  TELEGRAM = 'org.telegram',
  DESCRIPTION = 'description',
  NOTICE = 'notice',
  KEYWORDS = 'keywords',
}

// ENS resolution result
export interface ENSResolution {
  name: string;
  address: string;
  owner: string;
  resolver: string;
  avatar?: string;
  textRecords: Map<ENSTextRecordKey, string>;
  contentHash?: string;
}

// ENS reverse lookup result
export interface ENSReverseLookup {
  address: string;
  name: string;
  avatar?: string;
}

// ENS avatar
export interface ENSAvatar {
  url: string;
  type: 'nft' | 'url';
  chainId?: number;
  contractAddress?: string;
  tokenId?: string;
}

class ENSProvider {
  private provider: ethers.Provider | null = null;
  private ens: ethers.Contract | null = null;
  private resolverCache: Map<string, string> = new Map();
  private addressCache: Map<string, string> = new Map();
  private avatarCache: Map<string, ENSAvatar> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();

  private config: ENSConfig = {
    enabled: true,
    registryAddress: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e', // ENS Registry on Mainnet
    resolverAddress: '0x4976fb03C32e5B8cfe2b6c31b06aAe960D8647cE', // Public Resolver
    supportedChains: [1, 5, 11155111], // Mainnet, Goerli, Sepolia
    cacheTTL: 5 * 60 * 1000, // 5 minutes
  };

  /**
   * Initialize ENS provider
   */
  async initialize(provider: ethers.Provider): Promise<void> {
    this.provider = provider;
    
    // Get ENS registry address from provider
    const network = await provider.getNetwork();
    const ensAddress = await provider.getEnsAddress();
    
    if (ensAddress) {
      this.ens = new ethers.Contract(
        ensAddress,
        [
          'function resolver(bytes32 node) external view returns (address)',
          'function owner(bytes32 node) external view returns (address)',
        ],
        provider
      );
    }
  }

  /**
   * Resolve ENS name to address
   */
  async resolveName(ensName: string): Promise<string | null> {
    if (!this.provider || !this.config.enabled) {
      return null;
    }

    try {
      // Check cache first
      const cached = this.getCachedValue(ensName);
      if (cached) {
        return cached;
      }

      // Resolve using provider
      const address = await this.provider.resolveName(ensName);
      
      if (address) {
        this.setCachedValue(ensName, address);
        this.setCachedValue(address.toLowerCase(), ensName);
      }

      return address;
    } catch (error) {
      console.error('Error resolving ENS name:', error);
      return null;
    }
  }

  /**
   * Reverse lookup: address to ENS name
   */
  async lookupAddress(address: string): Promise<string | null> {
    if (!this.provider || !this.config.enabled) {
      return null;
    }

    try {
      // Check cache first
      const cached = this.getCachedValue(address.toLowerCase());
      if (cached) {
        return cached;
      }

      // Reverse lookup using provider
      const name = await this.provider.lookupAddress(address);
      
      if (name) {
        this.setCachedValue(address.toLowerCase(), name);
        this.setCachedValue(name, address);
      }

      return name;
    } catch (error) {
      console.error('Error looking up address:', error);
      return null;
    }
  }

  /**
   * Get ENS avatar
   */
  async getAvatar(ensName: string): Promise<ENSAvatar | null> {
    if (!this.provider || !this.config.enabled) {
      return null;
    }

    try {
      // Check cache first
      const cached = this.avatarCache.get(ensName);
      if (cached) {
        return cached;
      }

      // Get avatar using provider
      const avatarUrl = await this.provider.getAvatar(ensName);
      
      if (!avatarUrl) {
        return null;
      }

      // Parse avatar URL
      const avatar: ENSAvatar = this.parseAvatarUrl(avatarUrl);
      
      // Cache the result
      this.avatarCache.set(ensName, avatar);
      this.cacheTimestamps.set(`avatar:${ensName}`, Date.now());

      return avatar;
    } catch (error) {
      console.error('Error getting ENS avatar:', error);
      return null;
    }
  }

  /**
   * Get ENS text record
   */
  async getTextRecord(
    ensName: string,
    key: ENSTextRecordKey
  ): Promise<string | null> {
    if (!this.provider || !this.config.enabled) {
      return null;
    }

    try {
      // Get resolver
      const resolver = await this.getResolver(ensName);
      if (!resolver) {
        return null;
      }

      // Get text record
      const textRecord = await resolver.getText(ethers.namehash(ensName), key);
      
      return textRecord;
    } catch (error) {
      console.error('Error getting ENS text record:', error);
      return null;
    }
  }

  /**
   * Get all text records for an ENS name
   */
  async getAllTextRecords(ensName: string): Promise<Map<ENSTextRecordKey, string>> {
    const records: Map<ENSTextRecordKey, string> = new Map();

    const keys = Object.values(ENSTextRecordKey);
    
    for (const key of keys) {
      try {
        const value = await this.getTextRecord(ensName, key);
        if (value) {
          records.set(key, value);
        }
      } catch (error) {
        // Skip failed records
        continue;
      }
    }

    return records;
  }

  /**
   * Get content hash
   */
  async getContentHash(ensName: string): Promise<string | null> {
    if (!this.provider || !this.config.enabled) {
      return null;
    }

    try {
      // Get resolver
      const resolver = await this.getResolver(ensName);
      if (!resolver) {
        return null;
      }

      // Get content hash
      const contentHash = await resolver.contenthash(ethers.namehash(ensName));
      
      return contentHash;
    } catch (error) {
      console.error('Error getting content hash:', error);
      return null;
    }
  }

  /**
   * Get complete ENS resolution
   */
  async getENSResolution(ensName: string): Promise<ENSResolution | null> {
    try {
      const address = await this.resolveName(ensName);
      if (!address) {
        return null;
      }

      const avatar = await this.getAvatar(ensName);
      const textRecords = await this.getAllTextRecords(ensName);
      const contentHash = await this.getContentHash(ensName);

      // Get owner and resolver
      const owner = await this.getOwner(ensName);
      const resolver = await this.getResolver(ensName);

      return {
        name: ensName,
        address,
        owner,
        resolver: resolver?.address || '',
        avatar: avatar?.url,
        textRecords,
        contentHash,
      };
    } catch (error) {
      console.error('Error getting ENS resolution:', error);
      return null;
    }
  }

  /**
   * Get ENS owner
   */
  private async getOwner(ensName: string): Promise<string> {
    if (!this.ens) {
      return ethers.ZeroAddress;
    }

    try {
      const owner = await this.ens.owner(ethers.namehash(ensName));
      return owner;
    } catch (error) {
      return ethers.ZeroAddress;
    }
  }

  /**
   * Get ENS resolver
   */
  private async getResolver(ensName: string): Promise<ethers.Contract | null> {
    if (!this.provider || !this.ens) {
      return null;
    }

    try {
      const resolverAddress = await this.ens.resolver(ethers.namehash(ensName));
      
      if (resolverAddress === ethers.ZeroAddress) {
        return null;
      }

      const resolver = new ethers.Contract(
        resolverAddress,
        [
          'function addr(bytes32 node) external view returns (address)',
          'function text(bytes32 node, string key) external view returns (string)',
          'function contenthash(bytes32 node) external view returns (bytes)',
        ],
        this.provider
      );

      return resolver;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse avatar URL
   */
  private parseAvatarUrl(url: string): ENSAvatar {
    // Check if it's an NFT avatar (e.g., eip155:1/erc721:0x123.../123)
    if (url.startsWith('eip155:')) {
      const parts = url.split('/');
      const chainId = parseInt(parts[0].split(':')[1]);
      const contractAddress = parts[2];
      const tokenId = parts[3];

      return {
        url,
        type: 'nft',
        chainId,
        contractAddress,
        tokenId,
      };
    }

    // Regular URL avatar
    return {
      url,
      type: 'url',
    };
  }

  /**
   * Get cached value
   */
  private getCachedValue(key: string): string | null {
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp) {
      return null;
    }

    const age = Date.now() - timestamp;
    if (age > this.config.cacheTTL) {
      this.cacheTimestamps.delete(key);
      return null;
    }

    const value = this.addressCache.get(key) || this.resolverCache.get(key);
    return value || null;
  }

  /**
   * Set cached value
   */
  private setCachedValue(key: string, value: string): void {
    this.resolverCache.set(key, value);
    this.addressCache.set(key, value);
    this.cacheTimestamps.set(key, Date.now());
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.resolverCache.clear();
    this.addressCache.clear();
    this.avatarCache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ENSConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): ENSConfig {
    return { ...this.config };
  }

  /**
   * Check if ENS is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Enable or disable ENS
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Validate ENS name
   */
  isValidENSName(name: string): boolean {
    // Basic ENS name validation
    const ensRegex = /^([a-z0-9]+-)*[a-z0-9]+\.eth$/i;
    return ensRegex.test(name);
  }

  /**
   * Normalize ENS name
   */
  normalizeENSName(name: string): string {
    return ethers.nameprep(name);
  }
}

// Export singleton instance
export const ensProvider = new ENSProvider();

// Export convenience functions
export const resolveENS = (name: string) => ensProvider.resolveName(name);
export const lookupAddress = (address: string) => ensProvider.lookupAddress(address);
export const getENSAvatar = (name: string) => ensProvider.getAvatar(name);
export const getENSTextRecord = (name: string, key: ENSTextRecordKey) => 
  ensProvider.getTextRecord(name, key);
export const getENSResolution = (name: string) => ensProvider.getENSResolution(name);

export default ensProvider;