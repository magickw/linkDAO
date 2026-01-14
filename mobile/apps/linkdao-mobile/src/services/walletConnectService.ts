/**
 * Wallet Service
 * Manages wallet connections for the mobile app
 * Supports multiple wallet providers: MetaMask, WalletConnect, Coinbase, Trust, etc.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import { ethers } from 'ethers';

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

  /**
   * Initialize wallet service
   */
  async initialize() {
    try {
      // No SDK initialization needed - we'll use ethers.js directly
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
          throw new Error('WalletConnect is currently disabled due to compatibility issues. Please use MetaMask instead.');
          // address = await this.connectWalletConnect();
          // break;
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
        console.log('🦊 Connecting to MetaMask...');
  
        // For React Native, we need to use deep linking to MetaMask
        // This is a simplified version - in production, you would use the MetaMask SDK
        // or implement proper deep linking with callback handling
        
        // For now, we'll use a mock connection that simulates the flow
        // In a real implementation, you would:
        // 1. Generate a connection request
        // 2. Deep link to MetaMask with the request
        // 3. Handle the callback with the wallet address
        
        // Simulate wallet connection for development
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Generate a mock Ethereum address for testing
        const mockAddress = '0x' + Math.random().toString(16).substr(2, 40);
        console.log('📱 MetaMask connection simulated (development mode):', mockAddress);
        
        return mockAddress;
      } catch (error) {
        console.error('❌ Failed to connect to MetaMask:', error);
        throw error;
      }
    }
  /**
   * Connect via WalletConnect (Reown AppKit)
   * Note: Disabled due to Node.js module compatibility issues in React Native
   */
  // private async connectWalletConnect(): Promise<string> {
  //   try {
  //     if (!this.appKit) {
  //       throw new Error('Reown AppKit not initialized');
  //     }

  //     console.log('🔗 Connecting via WalletConnect...');

  //     // Open WalletConnect modal
  //     const result = await this.appKit.openModal({
  //       view: 'Connect',
  //     });

  //     if (!result || !result.address) {
  //       throw new Error('Failed to get address from WalletConnect');
  //     }

  //     const address = result.address;
  //     console.log('✅ Connected via WalletConnect:', address);

  //     return address;
  //   } catch (error) {
  //     console.error('❌ WalletConnect connection failed:', error);
  //     throw error;
  //   }
  // }

  /**

     * Connect to Coinbase Wallet

     */

    private async connectCoinbase(): Promise<string> {

      throw new Error('Coinbase Wallet integration not yet implemented. Please use MetaMask for now.');

    }

  /**
   * Connect to Trust Wallet
   */
  private async connectTrust(): Promise<string> {
    throw new Error('Trust Wallet integration not yet implemented. Please use MetaMask for now.');
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
      if (!this._isConnected || !this.activeConnection || this.activeConnection.address !== address) {
        throw new Error('Wallet not connected or address mismatch');
      }

      console.log('🔐 Signing message with', this.activeConnection.provider, ':', message);
      console.log('🔐 Message type:', typeof message);
      console.log('🔐 Message length:', message?.length);

      // For development, use ethers.js to sign the message
      // In production, this would interact with the actual wallet
      const wallet = ethers.Wallet.createRandom();
      const signature = await wallet.signMessage(message);
      
      console.log('✅ Message signed (development mode)');
      return signature;
    } catch (error) {
      console.error('❌ Failed to sign message:', error);
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