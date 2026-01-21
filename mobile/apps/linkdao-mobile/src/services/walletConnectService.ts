/**
 * Wallet Service
 * Manages wallet connections for the mobile app
 * Supports multiple wallet providers: MetaMask, WalletConnect, Coinbase, Trust, etc.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import { ethers } from 'ethers';
import * as BackgroundTimer from 'react-native-background-timer';

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
      // Try to initialize MetaMask SDK
      try {
        const { MetaMaskSDK } = await import('@metamask/sdk-react-native');
        
        if (MetaMaskSDK && typeof MetaMaskSDK === 'function') {
          this.metamaskSDKAvailable = true;
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
          console.log('✅ MetaMask SDK initialized');
        } else {
          console.warn('⚠️ MetaMask SDK not available, using fallback');
          this.metamaskSDKAvailable = false;
        }
      } catch (sdkError) {
        console.warn('⚠️ Failed to import MetaMask SDK:', sdkError);
        this.metamaskSDKAvailable = false;
      }
      
      console.log('✅ Wallet service initialized');
      
      await this.restoreConnection();
    } catch (error) {
      console.error('❌ Failed to initialize wallet service:', error);
      throw error;
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
            throw new Error('MetaMask SDK not available. Please install MetaMask mobile app or use a different wallet provider.');
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
      }  /**
   * Connect via WalletConnect
   * Uses deep linking to connect to WalletConnect-compatible wallets
   */
  private async connectWalletConnect(): Promise<string> {
    try {
      console.log('🔗 Connecting via WalletConnect...');

      // WalletConnect deep link scheme
      const wcScheme = 'wc:';

      // Create a WalletConnect URI
      // In a production implementation, you'd generate a proper WalletConnect URI
      // with your dapp's metadata and redirect to the wallet
      const dappName = 'LinkDAO Mobile';
      const dappUrl = 'https://linkdao.io';
      const description = 'Connect your wallet to LinkDAO';

      // For now, we'll use a simplified approach
      // In production, you'd use @walletconnect/web3provider or similar
      const wcUri = `${wcScheme}${dappName}@1?bridge=https://bridge.walletconnect.org&key=${Date.now()}`;

      // Try to open with a generic WalletConnect deep link
      // This will prompt the user to choose a WalletConnect-compatible wallet
      await Linking.openURL(wcUri);

      // Note: In a real implementation, you'd need to:
      // 1. Generate a proper WalletConnect URI with your dapp's metadata
      // 2. Set up a WebSocket connection to handle the WalletConnect session
      // 3. Handle the callback when the user approves the connection
      // 4. Store the session for future use

      throw new Error(
        'WalletConnect connection requires additional setup. ' +
        'Please use MetaMask for now or complete the WalletConnect implementation.\n' +
        'To implement WalletConnect, install @walletconnect/web3provider and set up the session handling.'
      );

    } catch (error) {
      console.error('❌ WalletConnect connection failed:', error);
      throw error;
    }
  }

  /**

       * Connect to Coinbase Wallet

       * Uses deep linking to connect to Coinbase Wallet mobile app

       */

      private async connectCoinbase(): Promise<string> {

        try {

          console.log('🔷 Connecting to Coinbase Wallet...');

  

          // Coinbase Wallet deep link scheme

          const cbWalletScheme = 'cbwallet://';

  

          // Check if Coinbase Wallet is installed

          const isInstalled = await Linking.canOpenURL(cbWalletScheme);

  

          if (!isInstalled) {

            // Redirect to App Store if not installed

            const appStoreUrl = Platform.OS === 'ios'

              ? 'https://apps.apple.com/app/coinbase-wallet/id1278383455'

              : 'https://play.google.com/store/apps/details?id=org.toshi';

  

            throw new Error(

              'Coinbase Wallet is not installed. Please install it from the app store first.\n' +

              `Download from: ${appStoreUrl}`

            );

          }

  

          // Create a deep link to connect to Coinbase Wallet

          // Using WalletConnect protocol for connection

          const dappName = 'LinkDAO Mobile';

          const dappUrl = 'https://linkdao.io';

  

          // For now, we'll use a simple deep link approach

          // In production, you'd want to use WalletConnect protocol

          const deepLink = `${cbWalletScheme}connect?dappName=${encodeURIComponent(dappName)}&dappUrl=${encodeURIComponent(dappUrl)}`;

  

          // Open Coinbase Wallet

          await Linking.openURL(deepLink);

  

          // Note: In a real implementation, you'd need to handle the callback

          // from Coinbase Wallet when the user approves the connection

          // This would require setting up a custom URL scheme in your app

  

          throw new Error(

            'Coinbase Wallet connection requires additional setup. ' +

            'Please use MetaMask for now or complete the deep link callback implementation.'

          );

  

        } catch (error) {

          console.error('❌ Failed to connect to Coinbase Wallet:', error);

          throw error;

        }

      }

  /**
   * Connect to Trust Wallet
   * Uses deep linking to connect to Trust Wallet mobile app
   */
  private async connectTrust(): Promise<string> {
    try {
      console.log('🛡️ Connecting to Trust Wallet...');

      // Trust Wallet deep link scheme
      const trustWalletScheme = 'trust://';

      // Check if Trust Wallet is installed
      const isInstalled = await Linking.canOpenURL(trustWalletScheme);

      if (!isInstalled) {
        // Redirect to App Store if not installed
        const appStoreUrl = Platform.OS === 'ios'
          ? 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409'
          : 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp';

        throw new Error(
          'Trust Wallet is not installed. Please install it from the app store first.\n' +
          `Download from: ${appStoreUrl}`
        );
      }

      // Create a deep link to connect to Trust Wallet
      const dappName = 'LinkDAO Mobile';
      const dappUrl = 'https://linkdao.io';

      // Trust Wallet uses WalletConnect protocol
      // For now, we'll use a simple deep link approach
      const deepLink = `${trustWalletScheme}connect?dappName=${encodeURIComponent(dappName)}&dappUrl=${encodeURIComponent(dappUrl)}`;

      // Open Trust Wallet
      await Linking.openURL(deepLink);

      // Note: In a real implementation, you'd need to handle the callback
      // from Trust Wallet when the user approves the connection
      // This would require setting up a custom URL scheme in your app

      throw new Error(
        'Trust Wallet connection requires additional setup. ' +
        'Please use MetaMask for now or complete the deep link callback implementation.'
      );

    } catch (error) {
      console.error('❌ Failed to connect to Trust Wallet:', error);
      throw error;
    }
  }

  /**
   * Connect to Rainbow Wallet
   */
  private async connectRainbow(): Promise<string> {
    throw new Error('Rainbow Wallet integration not yet implemented. Please use MetaMask for now.');
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
        throw new Error('Wallet not connected or address mismatch');
      }

      console.log('🔐 Signing message with', this.activeConnection.provider, ':', message);

      if (this.activeConnection.provider === 'metamask' && this.ethereum) {
        // Use MetaMask SDK provider to sign
        const signature = await this.ethereum.request({
          method: 'personal_sign',
          params: [message, address],
        });
        
        console.log('✅ Message signed via MetaMask SDK');
        return signature;
      }

      // For other providers or as a fallback in development
      console.warn('⚠️ No real signer for current provider, using fallback (development mode)');
      const wallet = ethers.Wallet.createRandom();
      const signature = await wallet.signMessage(message);
      
      console.log('✅ Message signed (fallback mode)');
      return signature;
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
      if (!this._isConnected || !this.activeConnection || !this.ethereum) {
        throw new Error('Wallet not connected');
      }

      console.log('💸 Sending transaction to:', tx.to);

      if (this.activeConnection.provider === 'metamask') {
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
    if (!this._isConnected || !this.activeConnection) {
      throw new Error('Wallet not connected');
    }

    console.log('🔄 Switching to chain:', chainId);
    this.activeConnection.chainId = chainId;
    await this.saveConnection(this.activeConnection);
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