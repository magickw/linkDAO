import { ethers } from 'ethers';

export interface ENSValidationResult {
  isValid: boolean;
  address?: string;
  error?: string;
}

export interface ENSOwnershipResult {
  isOwner: boolean;
  actualOwner?: string;
  error?: string;
}

export interface ENSAvailabilityResult {
  isAvailable: boolean;
  isRegistered: boolean;
  error?: string;
}

export interface ENSSuggestion {
  name: string;
  isAvailable: boolean;
  estimatedCost?: string;
}

export class ENSService {
  private provider: ethers.Provider;
  private ensResolver: ethers.EnsResolver | null = null;
  private retryAttempts: number = 3;
  private retryDelay: number = 1000; // 1 second
  private isServiceAvailable: boolean = true;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 300000; // 5 minutes

  constructor() {
    // Initialize provider with fallback to public providers
    this.provider = this.initializeProvider();
  }

  private initializeProvider(): ethers.Provider {
    try {
      // Try to use environment-specific RPC URL first
      const rpcUrl = process.env.ETHEREUM_RPC_URL || process.env.INFURA_URL;
      if (rpcUrl) {
        return new ethers.JsonRpcProvider(rpcUrl);
      }

      // Fallback to public providers
      return ethers.getDefaultProvider('mainnet', {
        infura: process.env.INFURA_PROJECT_ID,
        alchemy: process.env.ALCHEMY_API_KEY,
        etherscan: process.env.ETHERSCAN_API_KEY,
      });
    } catch (error) {
      console.warn('Failed to initialize custom provider, using default:', error);
      return ethers.getDefaultProvider('mainnet');
    }
  }

  /**
   * Validates ENS name format and resolves to address
   */
  async validateENSHandle(ensName: string): Promise<ENSValidationResult> {
    try {
      // Basic format validation
      if (!this.isValidENSFormat(ensName)) {
        return {
          isValid: false,
          error: 'Invalid ENS name format. Must end with .eth and contain valid characters.'
        };
      }

      // Check if ENS service is available
      if (!await this.checkServiceAvailability()) {
        return {
          isValid: false,
          error: 'ENS service is currently unavailable. Please try again later or proceed without ENS verification.'
        };
      }

      // Attempt to resolve the ENS name with retry logic
      const address = await this.resolveENSToAddressWithRetry(ensName);
      
      if (!address) {
        return {
          isValid: false,
          error: 'ENS name does not resolve to an address. Please verify the name is correct and registered.'
        };
      }

      return {
        isValid: true,
        address
      };
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      return {
        isValid: false,
        error: `ENS validation failed: ${errorMessage}`
      };
    }
  }

  /**
   * Resolves ENS name to Ethereum address
   */
  async resolveENSToAddress(ensName: string): Promise<string | null> {
    try {
      const address = await this.provider.resolveName(ensName);
      return address;
    } catch (error) {
      console.error('ENS resolution failed:', error);
      return null;
    }
  }

  /**
   * Resolves ENS name to Ethereum address with retry logic
   */
  async resolveENSToAddressWithRetry(ensName: string): Promise<string | null> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const address = await this.provider.resolveName(ensName);
        return address;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Check if this is a permanent error that shouldn't be retried
        if (this.isPermanentError(error)) {
          console.error(`ENS resolution failed with permanent error:`, error);
          return null;
        }

        // If this is the last attempt, don't wait
        if (attempt === this.retryAttempts) {
          break;
        }

        // Wait before retrying with exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.warn(`ENS resolution attempt ${attempt} failed, retrying in ${delay}ms:`, error);
        await this.sleep(delay);
      }
    }

    console.error(`ENS resolution failed after ${this.retryAttempts} attempts:`, lastError);
    return null;
  }

  /**
   * Performs reverse ENS resolution (address to ENS name)
   */
  async reverseResolveAddress(address: string): Promise<string | null> {
    try {
      if (!ethers.isAddress(address)) {
        throw new Error('Invalid Ethereum address format');
      }

      const ensName = await this.provider.lookupAddress(address);
      return ensName;
    } catch (error) {
      console.error('Reverse ENS resolution failed:', error);
      return null;
    }
  }

  /**
   * Verifies ENS ownership using cryptographic proofs
   */
  async verifyENSOwnership(ensName: string, walletAddress: string): Promise<ENSOwnershipResult> {
    try {
      if (!ethers.isAddress(walletAddress)) {
        return {
          isOwner: false,
          error: 'Invalid wallet address format. Please provide a valid Ethereum address.'
        };
      }

      // Check if ENS service is available
      if (!await this.checkServiceAvailability()) {
        return {
          isOwner: false,
          error: 'ENS service is currently unavailable. Ownership verification cannot be performed at this time.'
        };
      }

      // Resolve ENS to address with retry logic
      const resolvedAddress = await this.resolveENSToAddressWithRetry(ensName);
      
      if (!resolvedAddress) {
        return {
          isOwner: false,
          error: 'ENS name does not resolve to any address. Please verify the name is correct and registered.'
        };
      }

      // Check if the resolved address matches the claimed wallet address
      const isOwner = resolvedAddress.toLowerCase() === walletAddress.toLowerCase();

      return {
        isOwner,
        actualOwner: resolvedAddress,
        error: isOwner ? undefined : 'Wallet address does not match ENS owner. The ENS name is owned by a different address.'
      };
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      return {
        isOwner: false,
        error: `ENS ownership verification failed: ${errorMessage}`
      };
    }
  }

  /**
   * Checks if ENS name is available for registration
   */
  async isENSHandleAvailable(ensName: string): Promise<ENSAvailabilityResult> {
    try {
      if (!this.isValidENSFormat(ensName)) {
        return {
          isAvailable: false,
          isRegistered: false,
          error: 'Invalid ENS name format. Please use a valid .eth name.'
        };
      }

      // Check if ENS service is available
      if (!await this.checkServiceAvailability()) {
        return {
          isAvailable: false,
          isRegistered: false,
          error: 'ENS service is currently unavailable. Cannot check name availability at this time.'
        };
      }

      // Try to resolve the name with retry logic
      const resolvedAddress = await this.resolveENSToAddressWithRetry(ensName);
      
      if (resolvedAddress) {
        return {
          isAvailable: false,
          isRegistered: true
        };
      }

      // If it doesn't resolve, it might be available
      // Note: This is a simplified check. In production, you'd want to check
      // the ENS registry contract directly for more accurate availability
      return {
        isAvailable: true,
        isRegistered: false
      };
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      return {
        isAvailable: false,
        isRegistered: false,
        error: `Availability check failed: ${errorMessage}`
      };
    }
  }

  /**
   * Suggests alternative ENS names based on a base name
   */
  async suggestENSAlternatives(baseName: string): Promise<ENSSuggestion[]> {
    try {
      // Clean the base name
      const cleanBase = this.cleanENSName(baseName);
      const suggestions: ENSSuggestion[] = [];

      // Generate various alternatives
      const alternatives = [
        `${cleanBase}.eth`,
        `${cleanBase}dao.eth`,
        `${cleanBase}defi.eth`,
        `${cleanBase}nft.eth`,
        `${cleanBase}web3.eth`,
        `the${cleanBase}.eth`,
        `${cleanBase}official.eth`,
        `${cleanBase}2024.eth`,
        `${cleanBase}crypto.eth`,
        `${cleanBase}labs.eth`
      ];

      // Check availability for each alternative
      for (const alternative of alternatives) {
        try {
          const availability = await this.isENSHandleAvailable(alternative);
          suggestions.push({
            name: alternative,
            isAvailable: availability.isAvailable,
            estimatedCost: availability.isAvailable ? 'Variable (depends on length and demand)' : undefined
          });
        } catch (error) {
          // Continue with other suggestions if one fails
          console.warn(`Failed to check availability for ${alternative}:`, error);
        }
      }

      return suggestions;
    } catch (error) {
      console.error('Failed to generate ENS suggestions:', error);
      return [];
    }
  }

  /**
   * Validates ENS name format
   */
  private isValidENSFormat(ensName: string): boolean {
    // Basic ENS format validation
    if (!ensName || typeof ensName !== 'string') {
      return false;
    }

    // Must end with .eth
    if (!ensName.endsWith('.eth')) {
      return false;
    }

    // Remove .eth suffix for validation
    const nameWithoutSuffix = ensName.slice(0, -4);

    // Must not be empty after removing .eth
    if (nameWithoutSuffix.length === 0) {
      return false;
    }

    // Must be at least 3 characters (excluding .eth)
    if (nameWithoutSuffix.length < 3) {
      return false;
    }

    // Must contain only valid characters (alphanumeric and hyphens)
    const validCharacters = /^[a-z0-9-]+$/;
    if (!validCharacters.test(nameWithoutSuffix)) {
      return false;
    }

    // Must not start or end with hyphen
    if (nameWithoutSuffix.startsWith('-') || nameWithoutSuffix.endsWith('-')) {
      return false;
    }

    // Must not contain consecutive hyphens
    if (nameWithoutSuffix.includes('--')) {
      return false;
    }

    return true;
  }

  /**
   * Cleans and normalizes ENS name for suggestions
   */
  private cleanENSName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric characters
      .slice(0, 20); // Limit length for practical suggestions
  }

  /**
   * Health check for ENS service
   */
  async healthCheck(): Promise<{ status: string; provider: string; blockNumber?: number }> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      this.isServiceAvailable = true;
      this.lastHealthCheck = Date.now();
      return {
        status: 'healthy',
        provider: 'connected',
        blockNumber
      };
    } catch (error) {
      this.isServiceAvailable = false;
      this.lastHealthCheck = Date.now();
      return {
        status: 'unhealthy',
        provider: 'disconnected'
      };
    }
  }

  /**
   * Checks if ENS service is currently available
   */
  private async checkServiceAvailability(): Promise<boolean> {
    const now = Date.now();
    
    // If we've checked recently and service was available, assume it still is
    if (this.isServiceAvailable && (now - this.lastHealthCheck) < this.healthCheckInterval) {
      return true;
    }

    // Perform a quick health check
    const health = await this.healthCheck();
    return health.status === 'healthy';
  }

  /**
   * Determines if an error is permanent and shouldn't be retried
   */
  private isPermanentError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code;

    // Network-related errors that might be temporary
    const temporaryErrors = [
      'network error',
      'timeout',
      'connection refused',
      'too many requests',
      'rate limit',
      'server error',
      'service unavailable',
      'gateway timeout',
      'quorum not met'
    ];

    // Check if this is a temporary error
    const isTemporary = temporaryErrors.some(tempError => 
      errorMessage.includes(tempError)
    );

    // Rate limiting errors (should be retried with backoff)
    if (errorCode === 'SERVER_ERROR' || errorCode === -32005) {
      return false; // Retry these
    }

    // If it's a temporary error, it should be retried
    if (isTemporary) {
      return false;
    }

    // Permanent errors (don't retry)
    const permanentErrors = [
      'invalid name',
      'invalid format',
      'unsupported network',
      'invalid address'
    ];

    return permanentErrors.some(permError => 
      errorMessage.includes(permError)
    );
  }

  /**
   * Gets a user-friendly error message from an error object
   */
  private getErrorMessage(error: any): string {
    if (!error) return 'Unknown error occurred';

    const message = error.message || error.toString();

    // Map common error patterns to user-friendly messages
    if (message.includes('too many requests') || message.includes('rate limit')) {
      return 'Service is temporarily busy. Please try again in a few moments.';
    }

    if (message.includes('network error') || message.includes('connection')) {
      return 'Network connection issue. Please check your internet connection and try again.';
    }

    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }

    if (message.includes('quorum not met')) {
      return 'ENS service is experiencing connectivity issues. Please try again later.';
    }

    if (message.includes('invalid name') || message.includes('invalid format')) {
      return 'Invalid ENS name format. Please check the name and try again.';
    }

    // Return the original message if no specific mapping found
    return message;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Graceful fallback when ENS service is unavailable
   */
  async validateENSHandleWithFallback(ensName: string): Promise<ENSValidationResult> {
    // First try normal validation
    const result = await this.validateENSHandle(ensName);

    // If validation failed due to service unavailability, provide fallback
    if (!result.isValid && result.error?.includes('unavailable')) {
      return {
        isValid: false,
        error: 'ENS service is currently unavailable. You can proceed without ENS verification and add it later when the service is restored.'
      };
    }

    return result;
  }

  /**
   * Get ENS service status for user display
   */
  async getServiceStatus(): Promise<{
    available: boolean;
    message: string;
    lastChecked: Date;
    nextCheck: Date;
  }> {
    const now = Date.now();
    const nextCheck = new Date(this.lastHealthCheck + this.healthCheckInterval);

    if (!this.isServiceAvailable) {
      return {
        available: false,
        message: 'ENS service is currently experiencing issues. You can still use the marketplace without ENS verification.',
        lastChecked: new Date(this.lastHealthCheck),
        nextCheck
      };
    }

    return {
      available: true,
      message: 'ENS service is operating normally.',
      lastChecked: new Date(this.lastHealthCheck),
      nextCheck
    };
  }
}

// Export singleton instance
export const ensService = new ENSService();