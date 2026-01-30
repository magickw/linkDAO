/**
 * Wallet Service
 * Manages wallet connections for the mobile app
 * Supports multiple wallet providers: MetaMask, WalletConnect, Coinbase, Trust, etc.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import { ethers } from 'ethers';
// Import only types for the injected SDK state
import type { SDKState } from '@metamask/sdk-react-native';
import { setWalletAdapter, IWalletAdapter } from '@linkdao/shared';
import { hapticFeedback } from '../utils/haptics';

const STORAGE_KEY = 'wallet_connection';

export type WalletProvider = 'metamask' | 'walletconnect' | 'coinbase' | 'trust' | 'rainbow' | 'base' | 'dev-mock';

interface WalletConnection {
  provider: WalletProvider;
  address: string;
  chainId: number;
  timestamp: number;
}

class WalletService implements IWalletAdapter {
  private _isConnected: boolean = false;
  private activeConnection: WalletConnection | null = null;
  private currentProvider: WalletProvider | null = null;
  // This will hold the injected SDK state from the React Provider
  private metaMaskSDKState: SDKState | null = null;
  public initialized: Promise<void>;
  private resolveInitialized!: () => void;

  constructor() {
    this.initialized = new Promise((resolve) => {
      this.resolveInitialized = resolve;
    });
    this.initialize();
  }

  /**
   * Initialize wallet service
   */
  async initialize() {
    try {
      await this.restoreConnection();
      setWalletAdapter(this); // Register as the shared wallet adapter
      console.log('✅ Wallet service initialized and registered as shared adapter');
    } catch (error) {
      console.error('❌ Failed to initialize wallet service:', error);
    } finally {
      this.resolveInitialized();
    }
  }

  /**
   * Get connected wallet addresses (IWalletAdapter interface)
   */
  getAccounts(): string[] {
    return this.activeConnection?.address ? [this.activeConnection.address] : [];
  }

  /**
   * Check if wallet is connected (IWalletAdapter interface)
   */
  isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Set the MetaMask SDK instance injected from the React Provider
   */
  setMetaMaskSDK(sdkState: SDKState) {
    try {
      if (!sdkState) {
        console.warn('⚠️ Attempted to set null/undefined SDK state');
        return;
      }

      if (!sdkState.sdk) {
        console.warn('⚠️ SDK state does not contain sdk property yet, will retry');
        return;
      }

      this.metaMaskSDKState = sdkState;
      console.log('✅ MetaMask SDK injected into WalletService. Ready:', sdkState?.ready);
    } catch (error) {
      console.error('❌ Error setting MetaMask SDK:', error);
    }
  }

  /**
   * Connect to a specific wallet provider
   */
  async connect(provider: WalletProvider): Promise<string> {
    try {
      console.log(`🔗 Connecting to ${provider}...`);

      let address: string;

      switch (provider) {
        case 'metamask':
          address = await this.connectMetaMask();
          break;
        case 'walletconnect':
          address = await this.connectWalletConnect();
          break;
        case 'coinbase':
          address = await this.connectCoinbase();
          break;
        case 'trust':
          address = await this.connectTrust();
          break;
        case 'rainbow':
          address = await this.connectRainbow();
          break;
        case 'base':
          address = await this.connectBase();
          break;
        default:
          throw new Error(`Unsupported wallet provider: ${provider}`);
      }

      // If we got an address (synchronously), set up the connection
      if (address) {
        this._isConnected = true;
        this.currentProvider = provider;
        this.activeConnection = {
          provider,
          address,
          chainId: 1, // Default to Ethereum mainnet
          timestamp: Date.now(),
        };

        await this.saveConnection(this.activeConnection);
        hapticFeedback.success();
        console.log(`✅ Connected to ${provider}:`, address);
      }

      return address;
    } catch (error) {
      hapticFeedback.error();
      const errorMsg = error instanceof Error ? error.message : String(error);
      // Only show serious errors, suppress wallet-not-found errors and SDK initialization
      if (!errorMsg.includes('not installed') && !errorMsg.includes('found') && !errorMsg.includes('Redirecting') && !errorMsg.includes('SDK not yet injected') && !errorMsg.includes('not yet implemented')) {
        console.error(`❌ Failed to connect to ${provider}:`, error);
      } else {
        console.log(`ℹ️ ${provider} not available:`, errorMsg);
      }
      throw error;
    }
  }

  /**
   * Connect to MetaMask Mobile via injected SDK
   */
  private async connectMetaMask(): Promise<string> {
    try {
      if (!this.metaMaskSDKState) {
        throw new Error('MetaMask SDK not yet injected. Please try again in a moment as the SDK is initializing.');
      }

      if (!this.metaMaskSDKState?.sdk) {
        throw new Error('MetaMask SDK not initialized. Please ensure the app is wrapped in MetaMaskProvider and SDK is injected.');
      }

      console.log('🦊 Connecting to MetaMask via injected SDK...');

      const accounts = await this.metaMaskSDKState.sdk.connect();

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from MetaMask');
      }

      const address = accounts[0];
      console.log('📱 MetaMask connected via SDK:', address);

      return address;
    } catch (error) {
      console.log('ℹ️ MetaMask unavailable:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Connect via WalletConnect
   * Uses WalletConnect V2 service for wallet connections
   */
  private async connectWalletConnect(): Promise<string> {
    try {
      console.log('🔗 Connecting via WalletConnect...');

      // Import and use the WalletConnect V2 service
      const { walletConnectV2Service } = await import('./walletConnectV2Service');

      // Get the account from WalletConnect V2 service
      const account = walletConnectV2Service.getAccount();

      if (!account) {
        throw new Error('WalletConnect: No account connected. Please ensure wallet is properly initialized.');
      }

      console.log('✅ Connected via WalletConnect:', account);
      return account;
    } catch (error) {
      console.log('ℹ️ WalletConnect unavailable:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Connect to Coinbase Wallet
   */
  private async connectCoinbase(): Promise<string> {
    try {
      console.log('🔷 Connecting to Coinbase Wallet...');
      const cbWalletScheme = 'cbwallet://';
      const isInstalled = await Linking.canOpenURL(cbWalletScheme);

      if (!isInstalled) {
        const appStoreUrl = Platform.OS === 'ios'
          ? 'https://apps.apple.com/app/coinbase-wallet/id1278383455'
          : 'https://play.google.com/store/apps/details?id=org.toshi';

        // Open store
        await Linking.openURL(appStoreUrl);
        throw new Error('Coinbase Wallet not installed. Redirecting to App Store...');
      }

      const dappName = 'LinkDAO Mobile';
      const dappUrl = 'https://linkdao.io';
      // Basic deep link attempt
      const deepLink = `${cbWalletScheme}wager?dappName=${encodeURIComponent(dappName)}&dappUrl=${encodeURIComponent(dappUrl)}`;

      await Linking.openURL(deepLink);

      throw new Error('Opened Coinbase Wallet. Please confirm connection. (Full integration pending)');

    } catch (error) {
      console.log('ℹ️ Coinbase Wallet unavailable:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Connect to Trust Wallet
   */
  private async connectTrust(): Promise<string> {
    try {
      console.log('🛡️ Connecting to Trust Wallet...');
      const trustWalletScheme = 'trust://';
      const isInstalled = await Linking.canOpenURL(trustWalletScheme);

      if (!isInstalled) {
        const appStoreUrl = Platform.OS === 'ios'
          ? 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409'
          : 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp';
        await Linking.openURL(appStoreUrl);
        throw new Error('Redirecting to install Trust Wallet...');
      }

      const dappName = 'LinkDAO Mobile';
      const dappUrl = 'https://linkdao.io';
      const deepLink = `${trustWalletScheme}open?dappName=${encodeURIComponent(dappName)}&dappUrl=${encodeURIComponent(dappUrl)}`;

      await Linking.openURL(deepLink);
      throw new Error('Opened Trust Wallet. Please confirm connection. (Full integration pending)');

    } catch (error) {
      console.log('ℹ️ Trust Wallet unavailable:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Connect to Rainbow Wallet
   */
  private async connectRainbow(): Promise<string> {
    // Similar fallback pattern
    try {
      const scheme = 'rainbow://';
      const isInstalled = await Linking.canOpenURL(scheme);
      if (isInstalled) {
        await Linking.openURL(scheme);
        throw new Error('Opened Rainbow Wallet. (Integration pending)');
      }
      throw new Error('Rainbow Wallet not installed.');
    } catch (e) {
      console.log('ℹ️ Rainbow Wallet unavailable:', e instanceof Error ? e.message : String(e));
      throw e;
    }
  }

  /**
   * Connect to Base Wallet
   */
  private async connectBase(): Promise<string> {
    throw new Error('Base Wallet integration not yet implemented. Please try another wallet option.');
  }

  /**
   * Sign a message with the connected wallet
   */
  async signMessage(message: string, address: string): Promise<string> {
    try {
      await this.initialized;
      console.log('🔐 Signing message with address:', address);
      console.log('📊 Current service state:', {
        _isConnected: this._isConnected,
        activeConnection: this.activeConnection,
        currentProvider: this.currentProvider,
      });

      // If connection state was lost, try to restore it from storage
      if (!this._isConnected || !this.activeConnection) {
        console.log('⚠️ Connection state lost, attempting to restore from storage...');
        await this.restoreConnection();
      }

      // Check if we have a matching connection after potential restore
      const isMetamaskAvailable = this.currentProvider === 'metamask' && this.metaMaskSDKState?.provider;
      const isWalletConnectAvailable = this.currentProvider === 'walletconnect'; // We'll check actual service below
      const isDevMock = this.currentProvider === 'dev-mock';

      const hasMatchingConnection = this._isConnected && this.activeConnection && 
                                   this.activeConnection.address.toLowerCase() === address.toLowerCase();

      if (!hasMatchingConnection) {
        if (isMetamaskAvailable) {
          console.log('⚠️ Connection state missing but MetaMask provider available, proceeding...');
        } else if (isWalletConnectAvailable) {
          // Additional check for WC V2
          const { walletConnectV2Service } = await import('./walletConnectV2Service');
          if (walletConnectV2Service.isConnected()) {
             console.log('⚠️ Connection state missing but WalletConnect V2 connected, proceeding...');
          } else {
             console.error('❌ WalletConnect V2 service not connected');
             throw new Error('WalletConnect not connected');
          }
        } else if (isDevMock) {
          console.log('🧪 Using dev-mock provider, proceeding...');
        } else {
          console.error('❌ Wallet connection state:', {
            _isConnected: this._isConnected,
            hasActiveConnection: !!this.activeConnection,
            addressMatch: this.activeConnection?.address.toLowerCase() === address.toLowerCase(),
            currentProvider: this.currentProvider,
            passedAddress: address,
            storedAddress: this.activeConnection?.address,
          });
          throw new Error('Wallet not connected or address mismatch');
        }
      }

      console.log('🔐 Signing message with', this.currentProvider, ':', message);

      if (this.currentProvider === 'dev-mock') {
        // Development mock signer - return a valid-looking signature
        const mockSignature = '0x' + 'a'.repeat(130); // 65 bytes in hex (130 chars)
        hapticFeedback.success();
        console.log('✅ Mock signature generated for development');
        return mockSignature;
      }

      if (this.currentProvider === 'metamask') {
        if (!this.metaMaskSDKState?.provider) {
          throw new Error('MetaMask provider not available');
        }

        // Use MetaMask SDK provider to sign
        // Note: request return type is unknown, casting to string
        const signature = await this.metaMaskSDKState.provider.request({
          method: 'personal_sign',
          params: [message, address],
        }) as string;

        hapticFeedback.success();
        console.log('✅ Message signed via MetaMask SDK');
        return signature;
      }

      if (this.currentProvider === 'walletconnect') {
        // Use WalletConnect V2 provider to sign
        const { walletConnectV2Service } = await import('./walletConnectV2Service');
        const signature = await walletConnectV2Service.signMessage(message);

        hapticFeedback.success();
        console.log('✅ Message signed via WalletConnect V2');
        return signature;
      }

      throw new Error('No signer available for current provider');
    } catch (error) {
      hapticFeedback.error();
      console.error('❌ Failed to sign message:', error);
      throw error;
    }
  }

  /**
   * Send a transaction with the connected wallet
   */
  async sendTransaction(tx: ethers.TransactionRequest): Promise<string> {
    try {
      await this.initialized;
      if (!this._isConnected) {
        throw new Error('Wallet not connected');
      }

      console.log('💸 Sending transaction to:', tx.to);

      if (this.currentProvider === 'metamask') {
        if (!this.metaMaskSDKState?.provider) {
          throw new Error('MetaMask provider not available');
        }

        const hash = await this.metaMaskSDKState.provider.request({
          method: 'eth_sendTransaction',
          params: [tx],
        }) as string;

        hapticFeedback.success();
        console.log('✅ Transaction sent via MetaMask SDK:', hash);
        return hash;
      }

      throw new Error('Transaction sending not supported for this provider');
    } catch (error) {
      hapticFeedback.error();
      console.error('❌ Failed to send transaction:', error);
      throw error;
    }
  }

  /**
   * Switch network/chain
   */
  async switchChain(chainId: number): Promise<void> {
    try {
      await this.initialized;
      if (!this._isConnected) {
        throw new Error('Wallet not connected');
      }

      console.log('🔄 Switching to chain:', chainId);
    if (this.activeConnection) {
      this.activeConnection.chainId = chainId;
      await this.saveConnection(this.activeConnection);
    }

    // Attempt to switch via provider if supported
    try {
      if (this.currentProvider === 'metamask' && this.metaMaskSDKState?.provider) {
        const hexChainId = `0x${chainId.toString(16)}`;
        await this.metaMaskSDKState.provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: hexChainId }],
        });
      }
    } catch (e) {
      console.warn('Failed to switch chain on provider:', e);
    }

    console.log('✅ Chain switched');
    } catch (error) {
      console.error('❌ Failed to switch chain:', error);
      throw error;
    }
  }

  /**
   * Disconnect from wallet
   */
  async disconnect() {
    try {
      const provider = this.currentProvider;
      this._isConnected = false;
      this.activeConnection = null;
      this.currentProvider = null;
      await this.clearConnection();

      if (provider === 'metamask' && this.metaMaskSDKState?.sdk) {
        try {
          await this.metaMaskSDKState.sdk.terminate();
        } catch (e) { console.warn('Error terminating SDK', e); }
      }

      console.log(`✅ Disconnected from ${provider}`);
    } catch (error) {
      console.error('❌ Failed to disconnect wallet:', error);
      throw error;
    }
  }

  /**
   * Set up wallet connection state directly (used by auth flow)
   * Initializes connection without doing the actual connection flow
   */
  async setConnectionState(provider: WalletProvider, address: string, chainId: number = 1): Promise<void> {
    try {
      console.log(`⚙️ Setting wallet connection state: ${provider} - ${address}`);

      this._isConnected = true;
      this.currentProvider = provider;
      this.activeConnection = {
        provider,
        address,
        chainId,
        timestamp: Date.now(),
      };

      // Save to storage and wait for it to complete
      await this.saveConnection(this.activeConnection);

      console.log('✅ Connection state set and saved');
    } catch (error) {
      console.error('❌ Failed to set connection state:', error);
      throw error;
    }
  }

  /**
   * Get connected wallet address
   */
  getAddress(): string | null {
    return this.activeConnection?.address || null;
  }

  /**
   * Get all connected accounts
   */
  getAccounts(): string[] {
    return this.activeConnection ? [this.activeConnection.address] : [];
  }

  /**
   * Get current chain ID
   */
  getChainId(): number {
    return this.activeConnection?.chainId || 1;
  }

  /**
   * Get current provider
   */
  getProvider(): WalletProvider | null {
    return this.currentProvider;
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this._isConnected && this.activeConnection !== null;
  }

  /**
   * Save connection to storage
   */
  private async saveConnection(connection: WalletConnection) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(connection));
    } catch (error) {
      console.error('❌ Failed to save connection:', error);
    }
  }

  /**
   * Restore connection from storage
   */
  private async restoreConnection() {
    try {
      const connectionJson = await AsyncStorage.getItem(STORAGE_KEY);
      if (connectionJson) {
        const connection: WalletConnection = JSON.parse(connectionJson);
        if (connection.address) {
          this._isConnected = true;
          this.activeConnection = connection;
          this.currentProvider = connection.provider;
          console.log('✅ Connection restored:', connection.provider, connection.address);
        }
      }
    } catch (error) {
      console.error('❌ Failed to restore connection:', error);
    }
  }

  /**
   * Clear saved connection
   */
  private async clearConnection() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('❌ Failed to clear connection:', error);
    }
  }
}

// Export singleton instance
export const walletService = new WalletService();
export default walletService;