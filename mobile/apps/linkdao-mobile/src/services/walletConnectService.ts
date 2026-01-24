/**
 * Wallet Service
 * Manages wallet connections for the mobile app
 * Supports multiple wallet providers: MetaMask, WalletConnect, Coinbase, Trust, etc.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import { ethers } from 'ethers';
import { MetaMaskSDK } from '@metamask/sdk-react-native';

const STORAGE_KEY = 'wallet_connection';

export type WalletProvider = 'metamask' | 'walletconnect' | 'coinbase' | 'trust' | 'rainbow' | 'base';

interface WalletConnection {
  provider: WalletProvider;
  address: string;
  chainId: number;
  timestamp: number;
}

class WalletService {
  private _isConnected: boolean = false;
  private activeConnection: WalletConnection | null = null;
  private currentProvider: WalletProvider | null = null;
  private ethereum: any = null;
  private sdk: any = null;
  private metamaskSDKAvailable: boolean = false;

  /**
   * Initialize wallet service
   */
  async initialize() {
    try {
      // Initialize MetaMask SDK
      try {
        this.sdk = new MetaMaskSDK({
          openDefaultInpage: false,
          dappMetadata: {
            name: 'LinkDAO Mobile',
            url: 'https://linkdao.io',
          },
          // Enable communication between the SDK and MetaMask
          communicationServerUrl: 'https://metamask-sdk-socket.metafi.codefi.network/',
          checkInstallationImmediately: false,
          i18nOptions: {
            enabled: true,
          },
        });
        
        this.ethereum = this.sdk.getProvider();
        this.metamaskSDKAvailable = true;
        console.log('✅ MetaMask SDK initialized');
      } catch (sdkError) {
        console.error('⚠️ Failed to initialize MetaMask SDK:', sdkError);
        this.metamaskSDKAvailable = false;
      }
      
      console.log('✅ Wallet service initialized');
      
      await this.restoreConnection();
    } catch (error) {
      console.error('❌ Failed to initialize wallet service:', error);
      // Don't throw here, allowing the app to continue even if initialization has partial failures
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
      // Note: Some deep link flows might not return here immediately
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
        console.log(`✅ Connected to ${provider}:`, address);
      }

      return address;
    } catch (error) {
      console.error(`❌ Failed to connect to ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Connect to MetaMask Mobile
   */
  private async connectMetaMask(): Promise<string> {
    try {
      if (!this.metamaskSDKAvailable || !this.ethereum) {
        // Try to re-initialize if it failed initially
        console.log('🔄 Attempting to re-initialize MetaMask SDK...');
        await this.initialize();
        if (!this.metamaskSDKAvailable || !this.ethereum) {
           throw new Error('MetaMask SDK not available. Please ensure the app is installed.');
        }
      }

      console.log('🦊 Connecting to MetaMask via SDK...');

      // Request accounts from MetaMask
      const accounts = await this.ethereum.request({
        method: 'eth_requestAccounts',
        params: [],
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from MetaMask');
      }

      const address = accounts[0];
      console.log('📱 MetaMask connected via SDK:', address);
      
      return address;
    } catch (error) {
      console.error('❌ Failed to connect to MetaMask:', error);
      throw error;
    }
  }

  /**
   * Connect via WalletConnect
   * Uses deep linking to connect to WalletConnect-compatible wallets
   */
  private async connectWalletConnect(): Promise<string> {
    try {
      console.log('🔗 Connecting via WalletConnect...');

      const wcScheme = 'wc:';
      const dappName = 'LinkDAO Mobile';
      
      // Using a basic V1-style link for compatibility fallback, 
      // but ideally this should be upgraded to V2 with a proper Project ID
      const wcUri = `${wcScheme}${encodeURIComponent(dappName)}@1?bridge=https://bridge.walletconnect.org&key=${Date.now()}`;

      const canOpen = await Linking.canOpenURL(wcUri);
      if (canOpen) {
        await Linking.openURL(wcUri);
        // Note: This flow is incomplete without a socket listener
        // We return a placeholder to indicate the action was taken, but the UI 
        // will need to handle the fact that we don't have the address yet.
        throw new Error('Please authorize in your wallet app. (Note: Full WalletConnect V2 support is pending update)');
      } else {
        throw new Error('No WalletConnect-compatible wallet found.');
      }
    } catch (error) {
      console.error('❌ WalletConnect connection failed:', error);
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
        throw new Error('Redirecting to install Coinbase Wallet...');
      }

      const dappName = 'LinkDAO Mobile';
      const dappUrl = 'https://linkdao.io';
      // Basic deep link attempt
      const deepLink = `${cbWalletScheme}wager?dappName=${encodeURIComponent(dappName)}&dappUrl=${encodeURIComponent(dappUrl)}`;

      await Linking.openURL(deepLink);
      
      // We can't synchronously get the address without a callback handler.
      // We throw a helpful message to the user.
      throw new Error('Opened Coinbase Wallet. Please confirm connection. (Full integration pending)');

    } catch (error) {
      console.error('❌ Failed to connect to Coinbase Wallet:', error);
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
      console.error('❌ Failed to connect to Trust Wallet:', error);
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
       if(isInstalled) {
         await Linking.openURL(scheme);
         throw new Error('Opened Rainbow Wallet. (Integration pending)');
       }
       throw new Error('Rainbow Wallet not installed.');
     } catch (e) {
       throw e;
     }
  }

  /**
   * Connect to Base Wallet
   */
  private async connectBase(): Promise<string> {
    throw new Error('Base Wallet integration not yet implemented. Please use MetaMask for now.');
  }

  /**
   * Sign a message with the connected wallet
   */
  async signMessage(message: string, address: string): Promise<string> {
    try {
      if (!this._isConnected || !this.activeConnection || this.activeConnection.address.toLowerCase() !== address.toLowerCase()) {
        // Attempt to reconnect if using MetaMask and we have the provider
        if (this.currentProvider === 'metamask' && this.ethereum) {
           console.log('⚠️ Connection state lost, attempting to re-use provider...');
           // proceed to try signing
        } else {
           throw new Error('Wallet not connected or address mismatch');
        }
      }

      console.log('🔐 Signing message with', this.currentProvider, ':', message);

      if (this.currentProvider === 'metamask' && this.ethereum) {
        // Use MetaMask SDK provider to sign
        const signature = await this.ethereum.request({
          method: 'personal_sign',
          params: [message, address],
        });
        
        console.log('✅ Message signed via MetaMask SDK');
        return signature;
      }

      throw new Error('No signer available for current provider');
    } catch (error) {
      console.error('❌ Failed to sign message:', error);
      throw error;
    }
  }

  /**
   * Send a transaction with the connected wallet
   */
  async sendTransaction(tx: ethers.TransactionRequest): Promise<string> {
    try {
      if (!this._isConnected && !this.ethereum) {
        throw new Error('Wallet not connected');
      }

      console.log('💸 Sending transaction to:', tx.to);

      if (this.currentProvider === 'metamask' || this.ethereum) {
        const hash = await this.ethereum.request({
          method: 'eth_sendTransaction',
          params: [tx],
        });
        
        console.log('✅ Transaction sent via MetaMask SDK:', hash);
        return hash;
      }

      throw new Error('Transaction sending not supported for this provider');
    } catch (error) {
      console.error('❌ Failed to send transaction:', error);
      throw error;
    }
  }

  /**
   * Switch network/chain
   */
  async switchChain(chainId: number): Promise<void> {
    if (!this._isConnected) {
       // try to proceed if we have ethereum provider
       if (!this.ethereum) throw new Error('Wallet not connected');
    }

    console.log('🔄 Switching to chain:', chainId);
    if (this.activeConnection) {
        this.activeConnection.chainId = chainId;
        await this.saveConnection(this.activeConnection);
    }
    
    // Attempt to switch via provider if supported
    try {
        const hexChainId = `0x${chainId.toString(16)}`;
        await this.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: hexChainId }],
        });
    } catch(e) {
        console.warn('Failed to switch chain on provider:', e);
    }

    console.log('✅ Chain switched');
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
      
      // Optionally disconnect from SDK if supported
      if (this.sdk) {
          try {
              this.sdk.terminate();
          } catch (e) { console.warn('Error terminating SDK', e); }
      }
      
      console.log(`✅ Disconnected from ${provider}`);
    } catch (error) {
      console.error('❌ Failed to disconnect wallet:', error);
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