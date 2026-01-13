/**
 * Wallet Service
 * Manages wallet connections for the mobile app
 * Supports multiple wallet providers: MetaMask, WalletConnect, Coinbase, Trust, etc.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';

const STORAGE_KEY = 'wallet_connection';

export type WalletProvider = 'metamask' | 'walletconnect' | 'coinbase' | 'trust' | 'rainbow' | 'base';

interface WalletConnection {
  provider: WalletProvider;
  address: string;
  chainId: number;
  timestamp: number;
}

class WalletService {
  private isConnected: boolean = false;
  private activeConnection: WalletConnection | null = null;
  private currentProvider: WalletProvider | null = null;

  /**
   * Initialize wallet service
   */
  async initialize() {
    try {
      await this.restoreConnection();
      console.log('✅ Wallet service initialized');
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

      this.isConnected = true;
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
      const scheme = 'metamask://';
      const appLink = Platform.select({
        ios: 'https://apps.apple.com/app/metamask/id1438144202',
        android: 'https://play.google.com/store/apps/details?id=io.metamask',
      });

      // Check if MetaMask is installed
      const canOpen = await Linking.canOpenURL(scheme);

      if (!canOpen) {
        // Open app store if not installed
        if (appLink) {
          await Linking.openURL(appLink);
        }
        throw new Error('MetaMask is not installed');
      }

      // For demo, generate a mock address
      // In production, integrate with @metamask/sdk-react-native
      const mockAddress = this.generateMockAddress();
      console.log('📱 MetaMask connection simulated:', mockAddress);
      return mockAddress;
    } catch (error) {
      console.error('❌ MetaMask connection failed:', error);
      throw error;
    }
  }

  /**
   * Connect via WalletConnect
   */
  private async connectWalletConnect(): Promise<string> {
    try {
      // For demo, generate a mock address
      // In production, integrate with @reown/appkit-react-native
      const mockAddress = this.generateMockAddress();
      console.log('🔗 WalletConnect connection simulated:', mockAddress);
      return mockAddress;
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
      const scheme = 'cbwallet://';
      const appLink = Platform.select({
        ios: 'https://apps.apple.com/app/coinbase-wallet/id1278383455',
        android: 'https://play.google.com/store/apps/details?id=com.coinbase.wallet',
      });

      const canOpen = await Linking.canOpenURL(scheme);

      if (!canOpen) {
        if (appLink) {
          await Linking.openURL(appLink);
        }
        throw new Error('Coinbase Wallet is not installed');
      }

      const mockAddress = this.generateMockAddress();
      console.log('📱 Coinbase Wallet connection simulated:', mockAddress);
      return mockAddress;
    } catch (error) {
      console.error('❌ Coinbase Wallet connection failed:', error);
      throw error;
    }
  }

  /**
   * Connect to Trust Wallet
   */
  private async connectTrust(): Promise<string> {
    try {
      const scheme = 'trust://';
      const appLink = Platform.select({
        ios: 'https://apps.apple.com/app/trust-wallet/id1288339409',
        android: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
      });

      const canOpen = await Linking.canOpenURL(scheme);

      if (!canOpen) {
        if (appLink) {
          await Linking.openURL(appLink);
        }
        throw new Error('Trust Wallet is not installed');
      }

      const mockAddress = this.generateMockAddress();
      console.log('📱 Trust Wallet connection simulated:', mockAddress);
      return mockAddress;
    } catch (error) {
      console.error('❌ Trust Wallet connection failed:', error);
      throw error;
    }
  }

  /**
   * Connect to Rainbow Wallet
   */
  private async connectRainbow(): Promise<string> {
    try {
      const scheme = 'rainbow://';
      const appLink = Platform.select({
        ios: 'https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021',
        android: 'https://play.google.com/store/apps/details?id=me.rainbow',
      });

      const canOpen = await Linking.canOpenURL(scheme);

      if (!canOpen) {
        if (appLink) {
          await Linking.openURL(appLink);
        }
        throw new Error('Rainbow Wallet is not installed');
      }

      const mockAddress = this.generateMockAddress();
      console.log('📱 Rainbow Wallet connection simulated:', mockAddress);
      return mockAddress;
    } catch (error) {
      console.error('❌ Rainbow Wallet connection failed:', error);
      throw error;
    }
  }

  /**
   * Connect to Base Wallet
   */
  private async connectBase(): Promise<string> {
    try {
      const scheme = 'base://';
      const appLink = Platform.select({
        ios: 'https://apps.apple.com/app/base-crypto-wallet/id6443685999',
        android: 'https://play.google.com/store/apps/details?id=com.base',
      });

      const canOpen = await Linking.canOpenURL(scheme);

      if (!canOpen) {
        if (appLink) {
          await Linking.openURL(appLink);
        }
        throw new Error('Base Wallet is not installed');
      }

      const mockAddress = this.generateMockAddress();
      console.log('📱 Base Wallet connection simulated:', mockAddress);
      return mockAddress;
    } catch (error) {
      console.error('❌ Base Wallet connection failed:', error);
      throw error;
    }
  }

  /**
   * Sign a message with the connected wallet
   */
  async signMessage(message: string, address: string): Promise<string> {
    try {
      if (!this.isConnected || !this.activeConnection || this.activeConnection.address !== address) {
        throw new Error('Wallet not connected or address mismatch');
      }

      console.log('🔐 Signing message with', this.activeConnection.provider, ':', message);

      // Simulate signing delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // In production, this would use the wallet SDK to sign
      // For demo, generate a mock signature based on the message
      const signature = this.generateMockSignature(message, address);

      console.log('✅ Message signed');
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
    if (!this.isConnected || !this.activeConnection) {
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
      this.isConnected = false;
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
    return this.isConnected && this.activeConnection !== null;
  }

  /**
   * Generate a mock Ethereum address
   */
  private generateMockAddress(): string {
    return '0x' + Math.random().toString(16).substr(2, 40);
  }

  /**
   * Generate a mock signature
   */
  private generateMockSignature(message: string, address: string): string {
    const combined = message + address;
    const hash = Buffer.from(combined).toString('hex');
    return '0x' + hash.padEnd(130, '0').substring(0, 130);
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
          this.isConnected = true;
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