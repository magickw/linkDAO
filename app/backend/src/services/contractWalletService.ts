import { ethers } from 'ethers';
import { safeLogger } from '../utils/safeLogger';

// EIP-1271 magic value returned by successful signature verification
const EIP1271_MAGIC_VALUE = '0x1626ba7e';

/**
 * Service for handling EIP-1271 contract wallet signature verification
 * Supports smart contract wallets like Safe, Argent, etc.
 */
class ContractWalletService {
  private provider: ethers.Provider;

  constructor() {
    // Initialize provider (will be set to the app's provider)
    this.provider = ethers.getDefaultProvider();
  }

  /**
   * Set the RPC provider for blockchain queries
   */
  setProvider(provider: ethers.Provider) {
    this.provider = provider;
  }

  /**
   * Check if an address is a contract (has code deployed)
   */
  async isContract(address: string): Promise<boolean> {
    try {
      const code = await this.provider.getCode(address);
      return code !== '0x';
    } catch (error) {
      safeLogger.error('Error checking if address is contract:', error);
      return false;
    }
  }

  /**
   * Verify signature for contract wallet using EIP-1271
   * @param contractAddress - The contract wallet address
   * @param message - The message that was signed
   * @param signature - The signature bytes
   * @returns True if signature is valid according to EIP-1271
   */
  async verifyContractWalletSignature(
    contractAddress: string,
    message: string,
    signature: string
  ): Promise<boolean> {
    try {
      // EIP-1271 contract interface
      const contractInterface = new ethers.Interface([
        'function isValidSignature(bytes32 _hash, bytes _signature) external view returns (bytes4)'
      ]);

      // Create contract instance
      const contract = new ethers.Contract(
        contractAddress,
        contractInterface,
        this.provider
      );

      // Hash the message
      const messageHash = ethers.hashMessage(message);

      // Call isValidSignature on the contract
      const result = await contract.isValidSignature(messageHash, signature);

      // Check if result matches EIP-1271 magic value
      const isValid = result.toLowerCase() === EIP1271_MAGIC_VALUE.toLowerCase();

      safeLogger.info('Contract wallet signature verification', {
        contractAddress,
        isValid,
        result
      });

      return isValid;
    } catch (error) {
      safeLogger.error('Error verifying contract wallet signature:', error);
      return false;
    }
  }

  /**
   * Verify signature for both EOA and contract wallets
   * @param walletAddress - The wallet address
   * @param message - The message that was signed
   * @param signature - The signature
   * @returns True if signature is valid
   */
  async verifySignature(
    walletAddress: string,
    message: string,
    signature: string
  ): Promise<boolean> {
    // First try EOA verification
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() === walletAddress.toLowerCase()) {
        safeLogger.info('EOA signature verified', { walletAddress });
        return true;
      }
    } catch (e) {
      // EOA verification failed, try contract wallet
    }

    // Check if it's a contract wallet
    const isContract = await this.isContract(walletAddress);
    if (!isContract) {
      safeLogger.warn('Address is neither EOA nor contract', { walletAddress });
      return false;
    }

    // Try EIP-1271 contract wallet verification
    const isValid = await this.verifyContractWalletSignature(
      walletAddress,
      message,
      signature
    );

    return isValid;
  }
}

export const contractWalletService = new ContractWalletService();