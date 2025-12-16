/**
 * ContractRegistry Service
 * Centralized management of all smart contract addresses
 * Provides a single source of truth for contract lookups
 */

import { useState, useEffect } from 'react';
import { Contract, ethers } from 'ethers';
import { usePublicClient } from 'wagmi';
import { ENV_CONFIG } from '@/config/environment';

// Contract Registry ABI (minimal interface)
const CONTRACT_REGISTRY_ABI = [
  'function getContract(bytes32 name) external view returns (address)',
  'function setContract(string memory name, address addr) external',
  'event ContractUpdated(bytes32 indexed name, address indexed addr)'
];

export class ContractRegistryService {
  private static instance: ContractRegistryService;
  private registry: Contract | null = null;
  private cache: Map<string, string> = new Map();
  private provider: any;
  private initialized = false;

  static getInstance(): ContractRegistryService {
    if (!ContractRegistryService.instance) {
      ContractRegistryService.instance = new ContractRegistryService();
    }
    return ContractRegistryService.instance;
  }

  async initialize(publicClient: any): Promise<void> {
    if (this.initialized) return;

    if (!publicClient) {
      console.warn('ContractRegistry initialization skipped: no provider available');
      return;
    }

    this.provider = publicClient;
    
    // Get registry address from environment config
    const registryAddress = ENV_CONFIG.CONTRACT_REGISTRY_ADDRESS || 
      process.env.NEXT_PUBLIC_CONTRACT_REGISTRY_ADDRESS || 
      '0x0000000000000000000000000000000000000000'; // Placeholder

    try {
      // Convert PublicClient to ethers provider for contract interactions
      // Handle different provider types properly
      let ethersProvider;
      if (publicClient.transport && publicClient.transport.provider) {
        // wagmi v2 PublicClient
        ethersProvider = new ethers.BrowserProvider(publicClient.transport.provider);
      } else if (publicClient.provider) {
        // Direct provider
        ethersProvider = new ethers.BrowserProvider(publicClient.provider);
      } else if (publicClient.request) {
        // EIP-1193 provider
        ethersProvider = new ethers.BrowserProvider(publicClient);
      } else {
        throw new Error('Invalid provider type');
      }
      
      this.registry = new Contract(registryAddress, CONTRACT_REGISTRY_ABI, ethersProvider);
      this.initialized = true;
      
      // Only listen for contract updates if registry is valid and not zero address
      if (registryAddress && registryAddress !== ethers.ZeroAddress) {
        // Listen for contract updates
        this.registry.on('ContractUpdated', (name: string, address: string) => {
          const nameStr = ethers.toUtf8String(name);
          this.cache.set(nameStr, address);
          console.log(`Contract ${nameStr} updated to ${address}`);
        });
      }
    } catch (error) {
      console.warn('ContractRegistry initialization failed, using fallback addresses only:', error);
      // Still mark as initialized so we can use fallback addresses
      this.initialized = true;
    }
  }

  /**
   * Get contract address from registry
   * Falls back to environment variables if registry not available
   */
  async getContractAddress(name: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('ContractRegistryService not initialized');
    }

    // Check cache first
    if (this.cache.has(name)) {
      return this.cache.get(name)!;
    }

    // If registry is not available, use fallback addresses
    if (!this.registry || (await this.provider.getNetwork()).chainId === 31337) {
      const fallbackAddress = this.getFallbackAddress(name);
      if (fallbackAddress) {
        this.cache.set(name, fallbackAddress);
        return fallbackAddress;
      }
    }

    // If registry is not available or not properly initialized, use fallback addresses
    if (!this.registry) {
      const fallbackAddress = this.getFallbackAddress(name);
      if (fallbackAddress) {
        this.cache.set(name, fallbackAddress);
        return fallbackAddress;
      }
      throw new Error(`Contract ${name} not found in fallback addresses`);
    }

    try {
      // Get from registry contract
      const nameHash = ethers.keccak256(ethers.toUtf8Bytes(name));
      const address = await this.registry.getContract(nameHash);
      
      if (address === ethers.ZeroAddress) {
        throw new Error(`Contract ${name} not found in registry`);
      }

      // Cache and return
      this.cache.set(name, address);
      return address;
    } catch (error) {
      // Fallback to environment variables
      const fallbackAddress = this.getFallbackAddress(name);
      if (fallbackAddress) {
        this.cache.set(name, fallbackAddress);
        return fallbackAddress;
      }
      throw new Error(`Contract ${name} not found in registry or fallback`);
    }
  }

  /**
   * Get multiple contract addresses at once
   */
  async getContractAddresses(names: string[]): Promise<Record<string, string>> {
    const addresses: Record<string, string> = {};
    
    await Promise.all(
      names.map(async (name) => {
        try {
          addresses[name] = await this.getContractAddress(name);
        } catch (error) {
          console.error(`Failed to get address for ${name}:`, error);
          addresses[name] = ethers.ZeroAddress;
        }
      })
    );

    return addresses;
  }

  /**
   * Update contract address (admin only)
   */
  async updateContract(name: string, address: string, signer: any): Promise<void> {
    if (!this.registry) {
      throw new Error('ContractRegistry not available');
    }

    // Cast to any to bypass type checking for dynamic contract methods
    const contractWithSigner = this.registry.connect(signer) as any;
    const tx = await contractWithSigner.setContract(name, address);
    await tx.wait();
    
    // Update cache
    this.cache.set(name, address);
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get fallback addresses from deployed contracts on Sepolia
   */
  private getFallbackAddress(name: string): string | null {
    // Deployed addresses from deployedAddresses-sepolia.json (updated 2025-10-22)
    const deployedAddresses: Record<string, string> = {
      'ContractRegistry': '0x0000000000000000000000000000000000000000', // Placeholder - not deployed yet
      'LDAOToken': '0xc9F690B45e33ca909bB9ab97836091673232611B',
      'MockERC20': '0xA31D2faD2B1Ab84Fb420824A5CF3aB5a272782CC',
      'Counter': '0x980A1498987F6e24C0d680519696cE8B10B40860',
      'Governance': '0x27a78A860445DFFD9073aFd7065dd421487c0F8A',
      'ReputationSystem': '0xEBA6430eF136A58799EEbD0C1448E5d6444e84C2',
      'ProfileRegistry': '0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD',
      'SimpleProfileRegistry': '0x5f9fc9C25B221f861a9B0a9699aF13E07457F316',
      'PaymentRouter': '0xD1c8a34f34D10504FDF0728401e996AA2a03Ca50',
      'EnhancedEscrow': '0xa5c2126de8CC1a998833E97CdE6d185aDb4B3AD1',
      'DisputeResolution': '0x6852f68F30Fe3B63965930FF31882fe9CbFe3b3a',
      'Marketplace': '0x21A667693095337d7c1dEAa4fa5E5dFcd7146b6A',
      'RewardPool': '0x0bc773696BD4399a93672F82437a59369C2a1e6f',
      'NFTMarketplace': '0x012d3646Cd0D587183112fdD38f473FaA50D2A09',
      'NFTCollectionFactory': '0xf9ba6552025C3e40CB1B91D4b4CF82462643F34F',
      'TipRouter': '0x755Fe81411c86019fff6033E0567A4D93b57281b',
      'FollowModule': '0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439',
      'MultiSigWallet': '0xA0bD2057F45Deb2553745B5ddbB6e2AB80cFCE98',
      'LDAOTreasury': '0xeF85C8CcC03320dA32371940b315D563be2585e5',
      'EnhancedLDAOStaking': '0x5f9fc9C25B221f861a9B0a9699aF13E07457F316',
      'EnhancedLDAOTreasury': '0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5',
      'CharityVerificationSystem': '0x4e2F69c11897771e443A3EA03E207DC402496eb0',
      'CharityProposal': '0x2777b61C59a46Af2e672580eDAf13D75124B112c',
      'CharityGovernance': '0x25b39592AA8da0be424734E0F143E5371396dd61',
      'ProofOfDonationNFT': '0xa0C327E451E6B009bf850b33cD4c6ddfc445b1C4',
      'BurnToDonate': '0x675Ac1D60563b9D083Ad34E268861a7BA562705D',
      'BaseSubDAO': '0xAe798cAD6842673999F91150A036D5D5621D62A5',
      'CharitySubDAOFactory': '0x97547fC8fe6Aae34D34Add3EcA4720aC825B7ea3',
    };

    const address = deployedAddresses[name];
    if (!address || address === ethers.ZeroAddress) {
      return null;
    }

    return address;
  }

  /**
   * Check if contract is available
   */
  async isContractAvailable(name: string): Promise<boolean> {
    try {
      const address = await this.getContractAddress(name);
      return address !== ethers.ZeroAddress;
    } catch {
      return false;
    }
  }

  /**
   * Get all cached addresses
   */
  getCachedAddresses(): Record<string, string> {
    return Object.fromEntries(this.cache);
  }

  /**
   * Preload common contract addresses
   */
  async preloadCommonContracts(): Promise<void> {
    const commonContracts = [
      'LDAOToken',
      'TipRouter',
      'LDAOTreasury',
      'Marketplace',
      'Governance',
      'EnhancedEscrow',
      'ReputationSystem',
      'NFTMarketplace',
      'ProfileRegistry',
      'CharitySubDAOFactory'
    ];

    await this.getContractAddresses(commonContracts);
  }
}

// Export singleton instance
export const contractRegistryService = ContractRegistryService.getInstance();

// Helper hook for React components
export const useContractRegistry = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publicClient = usePublicClient();

  useEffect(() => {
    const initialize = async () => {
      try {
        // Get provider from wagmi v2 publicClient
        await contractRegistryService.initialize(publicClient);
        setIsInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize ContractRegistry');
      }
    };

    if (publicClient) {
      initialize();
    }
  }, [publicClient]);

  return {
    isInitialized,
    error,
    getContractAddress: contractRegistryService.getContractAddress.bind(contractRegistryService),
    getContractAddresses: contractRegistryService.getContractAddresses.bind(contractRegistryService),
    isContractAvailable: contractRegistryService.isContractAvailable.bind(contractRegistryService),
    preloadCommonContracts: contractRegistryService.preloadCommonContracts.bind(contractRegistryService)
  };
};