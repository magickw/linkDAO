import { ethers } from 'ethers';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { ensVerifications } from '../db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * ENS Validation Result
 */
export interface ENSValidationResult {
  isValid: boolean;
  ensName?: string;
  address?: string;
  owner?: string;
  resolver?: string;
  avatar?: string;
  twitter?: string;
  github?: string;
  email?: string;
  url?: string;
  description?: string;
  error?: string;
}

/**
 * ENS Ownership Verification Result
 */
export interface ENSOwnershipResult {
  isOwner: boolean;
  ensName: string;
  walletAddress: string;
  resolvedAddress?: string;
  reverseResolvedName?: string;
  verificationMethod: 'forward_resolution' | 'reverse_resolution' | 'signature';
  verificationData?: any;
  error?: string;
}

/**
 * ENS Validation Service
 * Handles ENS name validation and ownership verification using ethers.js
 */
class ENSValidationService {
  private provider: ethers.JsonRpcProvider | null = null;
  private mainnetProvider: ethers.JsonRpcProvider | null = null;

  constructor() {
    this.initializeProviders();
  }

  /**
   * Initialize Ethereum providers
   */
  private initializeProviders(): void {
    try {
      // Primary provider (can be Infura, Alchemy, or local node)
      const rpcUrl = process.env.ETHEREUM_RPC_URL || process.env.INFURA_URL;
      if (rpcUrl) {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
      }

      // Fallback to public mainnet provider
      const mainnetRpcUrl = process.env.MAINNET_RPC_URL || 'https://eth.llamarpc.com';
      this.mainnetProvider = new ethers.JsonRpcProvider(mainnetRpcUrl);

      safeLogger.info('✅ ENS validation providers initialized');
    } catch (error) {
      safeLogger.error('Failed to initialize ENS providers:', error);
    }
  }

  /**
   * Get active provider (with fallback)
   */
  private getProvider(): ethers.JsonRpcProvider {
    if (this.provider) {
      return this.provider;
    }
    if (this.mainnetProvider) {
      return this.mainnetProvider;
    }
    throw new Error('No Ethereum provider available');
  }

  /**
   * Validate ENS name format
   */
  private isValidENSFormat(ensName: string): boolean {
    // ENS names must end with .eth and contain valid characters
    const ensRegex = /^[a-z0-9\-]+\.eth$/i;
    return ensRegex.test(ensName);
  }

  /**
   * Validate wallet address format
   */
  private isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Resolve ENS name to address
   */
  async resolveENSToAddress(ensName: string): Promise<string | null> {
    try {
      if (!this.isValidENSFormat(ensName)) {
        throw new Error('Invalid ENS name format');
      }

      const provider = this.getProvider();
      const address = await provider.resolveName(ensName);
      return address;
    } catch (error) {
      safeLogger.error('ENS resolution error:', error);
      return null;
    }
  }

  /**
   * Reverse resolve address to ENS name
   */
  async resolveAddressToENS(address: string): Promise<string | null> {
    try {
      if (!this.isValidAddress(address)) {
        throw new Error('Invalid wallet address');
      }

      const provider = this.getProvider();
      const ensName = await provider.lookupAddress(address);
      return ensName;
    } catch (error) {
      safeLogger.error('Reverse ENS resolution error:', error);
      return null;
    }
  }

  /**
   * Get ENS text records (avatar, twitter, github, etc.)
   */
  async getENSTextRecords(ensName: string): Promise<{
    avatar?: string;
    twitter?: string;
    github?: string;
    email?: string;
    url?: string;
    description?: string;
  }> {
    try {
      const provider = this.getProvider();
      const resolver = await provider.getResolver(ensName);

      if (!resolver) {
        return {};
      }

      // Fetch common text records
      const [avatar, twitter, github, email, url, description] = await Promise.all([
        resolver.getText('avatar').catch(() => undefined),
        resolver.getText('com.twitter').catch(() => undefined),
        resolver.getText('com.github').catch(() => undefined),
        resolver.getText('email').catch(() => undefined),
        resolver.getText('url').catch(() => undefined),
        resolver.getText('description').catch(() => undefined),
      ]);

      return {
        avatar,
        twitter,
        github,
        email,
        url,
        description,
      };
    } catch (error) {
      safeLogger.error('Error fetching ENS text records:', error);
      return {};
    }
  }

  /**
   * Validate ENS name and return full details
   */
  async validateENS(ensName: string): Promise<ENSValidationResult> {
    try {
      // Validate format
      if (!this.isValidENSFormat(ensName)) {
        return {
          isValid: false,
          error: 'Invalid ENS name format. Must be a valid .eth domain',
        };
      }

      const provider = this.getProvider();

      // Resolve ENS to address
      const address = await this.resolveENSToAddress(ensName);
      if (!address) {
        return {
          isValid: false,
          ensName,
          error: 'ENS name does not resolve to an address',
        };
      }

      // Get resolver
      const resolver = await provider.getResolver(ensName);

      // Get owner (requires resolver)
      let owner: string | undefined;
      try {
        // ENS Registry address on mainnet
        const ensRegistryAddress = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
        const ensRegistry = new ethers.Contract(
          ensRegistryAddress,
          ['function owner(bytes32 node) view returns (address)'],
          provider
        );
        const node = ethers.namehash(ensName);
        owner = await ensRegistry.owner(node);
      } catch (error) {
        safeLogger.warn('Could not fetch ENS owner:', error);
      }

      // Get text records
      const textRecords = await this.getENSTextRecords(ensName);

      return {
        isValid: true,
        ensName,
        address,
        owner,
        resolver: resolver?.address,
        ...textRecords,
      };
    } catch (error) {
      safeLogger.error('ENS validation error:', error);
      return {
        isValid: false,
        ensName,
        error: error instanceof Error ? error.message : 'Unknown error during validation',
      };
    }
  }

  /**
   * Verify ENS ownership by wallet address
   */
  async verifyENSOwnership(
    ensName: string,
    walletAddress: string
  ): Promise<ENSOwnershipResult> {
    try {
      // Validate inputs
      if (!this.isValidENSFormat(ensName)) {
        return {
          isOwner: false,
          ensName,
          walletAddress,
          verificationMethod: 'forward_resolution',
          error: 'Invalid ENS name format',
        };
      }

      if (!this.isValidAddress(walletAddress)) {
        return {
          isOwner: false,
          ensName,
          walletAddress,
          verificationMethod: 'forward_resolution',
          error: 'Invalid wallet address format',
        };
      }

      // Method 1: Forward resolution (ENS -> Address)
      const resolvedAddress = await this.resolveENSToAddress(ensName);
      if (resolvedAddress && resolvedAddress.toLowerCase() === walletAddress.toLowerCase()) {
        return {
          isOwner: true,
          ensName,
          walletAddress,
          resolvedAddress,
          verificationMethod: 'forward_resolution',
          verificationData: {
            resolvedAddress,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Method 2: Reverse resolution (Address -> ENS)
      const reverseResolvedName = await this.resolveAddressToENS(walletAddress);
      if (reverseResolvedName && reverseResolvedName.toLowerCase() === ensName.toLowerCase()) {
        return {
          isOwner: true,
          ensName,
          walletAddress,
          reverseResolvedName,
          verificationMethod: 'reverse_resolution',
          verificationData: {
            reverseResolvedName,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // If neither method confirms ownership
      return {
        isOwner: false,
        ensName,
        walletAddress,
        resolvedAddress: resolvedAddress || undefined,
        reverseResolvedName: reverseResolvedName || undefined,
        verificationMethod: 'forward_resolution',
        error: 'Wallet address does not match ENS name',
      };
    } catch (error) {
      safeLogger.error('ENS ownership verification error:', error);
      return {
        isOwner: false,
        ensName,
        walletAddress,
        verificationMethod: 'forward_resolution',
        error: error instanceof Error ? error.message : 'Unknown error during verification',
      };
    }
  }

  /**
   * Verify and store ENS ownership in database
   */
  async verifyAndStoreENSOwnership(
    ensName: string,
    walletAddress: string
  ): Promise<ENSOwnershipResult> {
    try {
      // Verify ownership
      const verificationResult = await this.verifyENSOwnership(ensName, walletAddress);

      if (!verificationResult.isOwner) {
        return verificationResult;
      }

      // Check if verification already exists
      const existingVerification = await db.query.ensVerifications.findFirst({
        where: and(
          eq(ensVerifications.walletAddress, walletAddress),
          eq(ensVerifications.ensHandle, ensName),
          eq(ensVerifications.isActive, true)
        ),
      });

      if (existingVerification) {
        // Update existing verification
        await db
          .update(ensVerifications)
          .set({
            verificationMethod: verificationResult.verificationMethod,
            verificationData: JSON.stringify(verificationResult.verificationData),
            verifiedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(ensVerifications.id, existingVerification.id));
      } else {
        // Create new verification
        await db.insert(ensVerifications).values({
          walletAddress,
          ensHandle: ensName,
          verificationMethod: verificationResult.verificationMethod,
          verificationData: JSON.stringify(verificationResult.verificationData),
          isActive: true,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
        });
      }

      return verificationResult;
    } catch (error) {
      safeLogger.error('Error storing ENS verification:', error);
      throw error;
    }
  }

  /**
   * Get stored ENS verification
   */
  async getStoredENSVerification(walletAddress: string, ensName: string) {
    try {
      const verification = await db.query.ensVerifications.findFirst({
        where: and(
          eq(ensVerifications.walletAddress, walletAddress),
          eq(ensVerifications.ensHandle, ensName),
          eq(ensVerifications.isActive, true)
        ),
      });

      return verification;
    } catch (error) {
      safeLogger.error('Error fetching ENS verification:', error);
      return null;
    }
  }

  /**
   * Get all ENS verifications for a wallet
   */
  async getWalletENSVerifications(walletAddress: string) {
    try {
      const verifications = await db.query.ensVerifications.findMany({
        where: and(
          eq(ensVerifications.walletAddress, walletAddress),
          eq(ensVerifications.isActive, true)
        ),
        orderBy: (ensVerifications, { desc }) => [desc(ensVerifications.verifiedAt)],
      });

      return verifications;
    } catch (error) {
      safeLogger.error('Error fetching wallet ENS verifications:', error);
      return [];
    }
  }

  /**
   * Revoke ENS verification
   */
  async revokeENSVerification(walletAddress: string, ensName: string): Promise<boolean> {
    try {
      await db
        .update(ensVerifications)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(ensVerifications.walletAddress, walletAddress),
            eq(ensVerifications.ensHandle, ensName)
          )
        );

      return true;
    } catch (error) {
      safeLogger.error('Error revoking ENS verification:', error);
      return false;
    }
  }
}

// Singleton pattern with lazy initialization
let ensValidationServiceInstance: ENSValidationService | null = null;

export const getEnsValidationService = (): ENSValidationService => {
  if (!ensValidationServiceInstance) {
    ensValidationServiceInstance = new ENSValidationService();
  }
  return ensValidationServiceInstance;
};

// For backward compatibility
export const ensValidationService = getEnsValidationService();
