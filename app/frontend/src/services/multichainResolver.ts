/**
 * Multichain Address Resolver
 * Support for EVM and SVM (Solana) addresses in wallet-to-wallet messaging
 */

import { ethers } from 'ethers';
// Note: @solana/web3.js would need to be installed for full Solana support
// import { PublicKey } from '@solana/web3.js';

export interface ChainInfo {
  chainId: string;
  name: string;
  type: 'EVM' | 'SVM';
  explorer: string;
  currency: string;
  icon?: string;
}

export interface ResolvedAddress {
  address: string;
  chain: ChainInfo;
  isValid: boolean;
  normalizedAddress: string;
  displayName?: string;
  avatar?: string;
  ensName?: string;
}

export interface AddressSearchResult {
  addresses: ResolvedAddress[];
  suggestions: string[];
}

class MultichainAddressResolver {
  private supportedChains: Map<string, ChainInfo> = new Map();
  private addressCache: Map<string, ResolvedAddress> = new Map();
  private ensCache: Map<string, string> = new Map();

  constructor() {
    this.initializeSupportedChains();
  }

  private initializeSupportedChains(): void {
    // EVM Chains
    this.supportedChains.set('ethereum', {
      chainId: '1',
      name: 'Ethereum',
      type: 'EVM',
      explorer: 'https://etherscan.io',
      currency: 'ETH',
      icon: '/icons/ethereum.png'
    });

    this.supportedChains.set('polygon', {
      chainId: '137',
      name: 'Polygon',
      type: 'EVM',
      explorer: 'https://polygonscan.com',
      currency: 'MATIC',
      icon: '/icons/polygon.png'
    });

    this.supportedChains.set('bsc', {
      chainId: '56',
      name: 'BNB Chain',
      type: 'EVM',
      explorer: 'https://bscscan.com',
      currency: 'BNB',
      icon: '/icons/bnb.png'
    });

    this.supportedChains.set('arbitrum', {
      chainId: '42161',
      name: 'Arbitrum',
      type: 'EVM',
      explorer: 'https://arbiscan.io',
      currency: 'ETH',
      icon: '/icons/arbitrum.png'
    });

    this.supportedChains.set('optimism', {
      chainId: '10',
      name: 'Optimism',
      type: 'EVM',
      explorer: 'https://optimistic.etherscan.io',
      currency: 'ETH',
      icon: '/icons/optimism.png'
    });

    // Solana (SVM)
    this.supportedChains.set('solana', {
      chainId: 'solana-mainnet',
      name: 'Solana',
      type: 'SVM',
      explorer: 'https://solscan.io',
      currency: 'SOL',
      icon: '/icons/solana.png'
    });
  }

  /**
   * Resolve and validate an address across multiple chains
   */
  async resolveAddress(input: string): Promise<ResolvedAddress | null> {
    // Check cache first
    const cached = this.addressCache.get(input.toLowerCase());
    if (cached) {
      return cached;
    }

    const normalizedInput = input.trim().toLowerCase();

    try {
      // Try to resolve ENS name first
      if (normalizedInput.endsWith('.eth')) {
        const resolved = await this.resolveENS(normalizedInput);
        if (resolved) {
          this.addressCache.set(normalizedInput, resolved);
          return resolved;
        }
      }

      // Try EVM address validation
      const evmResult = await this.validateEVMAddress(normalizedInput);
      if (evmResult) {
        this.addressCache.set(normalizedInput, evmResult);
        return evmResult;
      }

      // Try Solana address validation
      const solanaResult = await this.validateSolanaAddress(normalizedInput);
      if (solanaResult) {
        this.addressCache.set(normalizedInput, solanaResult);
        return solanaResult;
      }

      return null;
    } catch (error) {
      console.error('Address resolution failed:', error);
      return null;
    }
  }

  /**
   * Search for addresses with suggestions
   */
  async searchAddresses(query: string): Promise<AddressSearchResult> {
    const results: AddressSearchResult = {
      addresses: [],
      suggestions: []
    };

    if (!query || query.length < 3) {
      return results;
    }

    const normalizedQuery = query.toLowerCase().trim();

    // Direct address resolution
    const resolved = await this.resolveAddress(normalizedQuery);
    if (resolved) {
      results.addresses.push(resolved);
    }

    // Generate suggestions
    results.suggestions = this.generateSuggestions(normalizedQuery);

    return results;
  }

  /**
   * Validate EVM address
   */
  private async validateEVMAddress(address: string): Promise<ResolvedAddress | null> {
    try {
      if (!ethers.isAddress(address)) {
        return null;
      }

      const checksumAddress = ethers.getAddress(address);
      const ethereumChain = this.supportedChains.get('ethereum')!;

      // Try to resolve ENS name for this address
      let ensName: string | undefined;
      try {
        // In a real implementation, you'd use an actual provider
        // const provider = new ethers.providers.JsonRpcProvider();
        // ensName = await provider.lookupAddress(checksumAddress);
      } catch (error) {
        // ENS resolution failed, that's okay
      }

      return {
        address: checksumAddress,
        chain: ethereumChain,
        isValid: true,
        normalizedAddress: checksumAddress.toLowerCase(),
        ensName
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate Solana address
   */
  private async validateSolanaAddress(address: string): Promise<ResolvedAddress | null> {
    try {
      // Basic Solana address validation (32-44 chars, base58)
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
        return null;
      }

      const solanaChain = this.supportedChains.get('solana')!;

      return {
        address: address,
        chain: solanaChain,
        isValid: true,
        normalizedAddress: address
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Resolve ENS name to address
   */
  private async resolveENS(ensName: string): Promise<ResolvedAddress | null> {
    try {
      // Check cache first
      const cached = this.ensCache.get(ensName);
      if (cached) {
        return await this.validateEVMAddress(cached);
      }

      // In a real implementation, you'd use an actual ENS resolver
      // const provider = new ethers.providers.JsonRpcProvider();
      // const address = await provider.resolveName(ensName);
      
      // Mock resolution for demonstration
      const mockResolvedAddresses: Record<string, string> = {
        'game.etherscan.eth': '0x742d35Cc6634C0532925a3b8D91B062fd8AfD34a',
        'vitalik.eth': '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        'alice.eth': '0x123456789abcdef123456789abcdef1234567890',
        'bob.eth': '0xabcdef123456789abcdef123456789abcdef12345'
      };

      const address = mockResolvedAddresses[ensName];
      if (!address) {
        return null;
      }

      // Cache the result
      this.ensCache.set(ensName, address);

      const resolved = await this.validateEVMAddress(address);
      if (resolved) {
        resolved.ensName = ensName;
        resolved.displayName = ensName;
      }

      return resolved;
    } catch (error) {
      console.error('ENS resolution failed:', error);
      return null;
    }
  }

  /**
   * Generate address suggestions
   */
  private generateSuggestions(query: string): string[] {
    const suggestions: string[] = [];

    // ENS suggestions
    if (query.includes('.') || query.endsWith('eth')) {
      suggestions.push(`${query}.eth`);
    }

    // Common ENS names for demo
    const commonENS = ['vitalik.eth', 'game.etherscan.eth', 'alice.eth', 'bob.eth'];
    commonENS.forEach(ens => {
      if (ens.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push(ens);
      }
    });

    // Address format suggestions
    if (query.startsWith('0x') && query.length < 42) {
      suggestions.push('Complete the Ethereum address (0x + 40 characters)');
    }

    if (query.length > 20 && query.length < 50 && !query.startsWith('0x')) {
      suggestions.push('This might be a Solana address');
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): ChainInfo[] {
    return Array.from(this.supportedChains.values());
  }

  /**
   * Get chain info by ID
   */
  getChainInfo(chainId: string): ChainInfo | null {
    for (const chain of this.supportedChains.values()) {
      if (chain.chainId === chainId) {
        return chain;
      }
    }
    return null;
  }

  /**
   * Format address for display
   */
  formatAddressForDisplay(resolved: ResolvedAddress): string {
    if (resolved.ensName) {
      return resolved.ensName;
    }

    if (resolved.chain.type === 'EVM') {
      return `${resolved.address.slice(0, 6)}...${resolved.address.slice(-4)}`;
    }

    if (resolved.chain.type === 'SVM') {
      return `${resolved.address.slice(0, 4)}...${resolved.address.slice(-4)}`;
    }

    return resolved.address;
  }

  /**
   * Get explorer URL for address
   */
  getExplorerUrl(resolved: ResolvedAddress): string {
    return `${resolved.chain.explorer}/address/${resolved.address}`;
  }

  /**
   * Check if two addresses are equivalent
   */
  areAddressesEquivalent(addr1: string, addr2: string): boolean {
    // Normalize addresses for comparison
    const normalized1 = addr1.toLowerCase().trim();
    const normalized2 = addr2.toLowerCase().trim();

    return normalized1 === normalized2;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.addressCache.clear();
    this.ensCache.clear();
  }

  /**
   * Batch resolve multiple addresses
   */
  async batchResolveAddresses(addresses: string[]): Promise<Map<string, ResolvedAddress | null>> {
    const results = new Map<string, ResolvedAddress | null>();
    
    // Process in parallel but limit concurrency
    const batchSize = 5;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const batchPromises = batch.map(async (address) => {
        const resolved = await this.resolveAddress(address);
        results.set(address, resolved);
      });
      
      await Promise.all(batchPromises);
    }

    return results;
  }
}

// Export singleton instance
export const multichainResolver = new MultichainAddressResolver();
export default multichainResolver;