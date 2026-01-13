/**
 * Wallet Adapter Interface
 * Provides a platform-agnostic interface for wallet operations
 * This allows the shared authService to interact with wallets without
 * knowing the specific implementation (WalletConnect, native wallet, etc.)
 */

export interface IWalletAdapter {
  /**
   * Sign a message with the connected wallet
   * @param message - The message to sign
   * @param address - The wallet address to sign with
   * @returns The signature as a hex string
   */
  signMessage(message: string, address: string): Promise<string>;

  /**
   * Get the connected wallet addresses
   * @returns Array of wallet addresses
   */
  getAccounts(): string[];

  /**
   * Check if wallet is connected
   * @returns true if wallet is connected
   */
  isConnected(): boolean;
}

// Global wallet adapter instance - will be set by the platform-specific code
let walletAdapterInstance: IWalletAdapter | null = null;

/**
 * Set the wallet adapter instance
 * This should be called by the platform-specific code (e.g., mobile app)
 */
export function setWalletAdapter(adapter: IWalletAdapter) {
  walletAdapterInstance = adapter;
}

/**
 * Get the wallet adapter instance
 * @returns The wallet adapter instance or null if not set
 */
export function getWalletAdapter(): IWalletAdapter | null {
  return walletAdapterInstance;
}

/**
 * Sign a message using the configured wallet adapter
 * @param message - The message to sign
 * @param address - The wallet address to sign with
 * @returns The signature as a hex string
 * @throws Error if wallet adapter is not configured
 */
export async function signMessageWithWallet(message: string, address: string): Promise<string> {
  const adapter = getWalletAdapter();
  if (!adapter) {
    throw new Error('Wallet adapter not configured. Please call setWalletAdapter() first.');
  }

  return adapter.signMessage(message, address);
}

/**
 * Get connected wallet addresses
 * @returns Array of wallet addresses
 */
export function getConnectedAccounts(): string[] {
  const adapter = getWalletAdapter();
  if (!adapter) {
    return [];
  }

  return adapter.getAccounts();
}

/**
 * Check if wallet is connected
 * @returns true if wallet is connected
 */
export function isWalletConnected(): boolean {
  const adapter = getWalletAdapter();
  if (!adapter) {
    return false;
  }

  return adapter.isConnected();
}