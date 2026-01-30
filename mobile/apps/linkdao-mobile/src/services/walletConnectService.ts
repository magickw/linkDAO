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
import { ErrorHandler, handleWalletError } from '../utils/errorHandler';

const STORAGE_KEY = 'wallet_connection';

export type WalletProvider = 'metamask' | 'walletconnect' | 'coinbase' | 'trust' | 'rainbow' | 'base' | 'dev-mock';

export interface WalletProviderInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  installed: boolean;
  canInstall: boolean;
  installUrl?: string;
  version?: string;
  lastConnected?: Date;
  connectionStatus: 'available' | 'connecting' | 'connected' | 'disconnected' | 'unavailable';
}

export interface WalletConnectionProgress {
  providerId: string;
  status: 'initializing' | 'connecting' | 'connected' | 'failed' | 'cancelled';
  progress: number; // 0-100
  message: string;
  timestamp: Date;
  error?: string;
}

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
  
  // Connection progress tracking
  private connectionProgressMap: Map<string, WalletConnectionProgress> = new Map();
  private progressListeners: Array<(progress: WalletConnectionProgress) => void> = [];
  
  // Wallet provider cache
  private walletProvidersCache: WalletProviderInfo[] | null = null;
  private lastProviderCheck: number = 0;
  private readonly PROVIDER_CACHE_DURATION = 30000; // 30 seconds

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
    return this._isConnected && this.activeConnection !== null;
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
   * Get available wallet providers with installation status
   */
  async getWalletProviders(): Promise<WalletProviderInfo[]> {
    const now = Date.now();
      
    // Return cached results if still valid
    if (this.walletProvidersCache && (now - this.lastProviderCheck) < this.PROVIDER_CACHE_DURATION) {
      return this.walletProvidersCache;
    }
      
    const providers: WalletProviderInfo[] = [
      {
        id: 'metamask',
        name: 'MetaMask',
        icon: '🦊',
        color: '#f6851b',
        installed: false,
        canInstall: true,
        installUrl: Platform.OS === 'ios' 
          ? 'https://apps.apple.com/us/app/metamask/id1438144202'
          : 'https://play.google.com/store/apps/details?id=io.metamask',
        connectionStatus: 'available'
      },
      {
        id: 'walletconnect',
        name: 'WalletConnect',
        icon: '🔗',
        color: '#3b99fc',
        installed: true,
        canInstall: false,
        connectionStatus: 'available'
      },
      {
        id: 'coinbase',
        name: 'Coinbase Wallet',
        icon: '🪙',
        color: '#1652f0',
        installed: false,
        canInstall: true,
        installUrl: Platform.OS === 'ios'
          ? 'https://apps.apple.com/us/app/coinbase-wallet-nfts-crypto/id1278383455'
          : 'https://play.google.com/store/apps/details?id=org.toshi',
        connectionStatus: 'available'
      },
      {
        id: 'trust',
        name: 'Trust Wallet',
        icon: '🛡️',
        color: '#3375bb',
        installed: false,
        canInstall: true,
        installUrl: Platform.OS === 'ios'
          ? 'https://apps.apple.com/us/app/trust-crypto-bitcoin-wallet/id1288339409'
          : 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
        connectionStatus: 'available'
      },
      {
        id: 'rainbow',
        name: 'Rainbow',
        icon: '🌈',
        color: '#000000',
        installed: false,
        canInstall: true,
        installUrl: Platform.OS === 'ios'
          ? 'https://apps.apple.com/us/app/rainbow-ethereum-wallet/id1457119021'
          : 'https://play.google.com/store/apps/details?id=me.rainbow',
        connectionStatus: 'available'
      },
      {
        id: 'base',
        name: 'Base Wallet',
        icon: '🔵',
        color: '#0052ff',
        installed: false,
        canInstall: true,
        installUrl: Platform.OS === 'ios'
          ? 'https://apps.apple.com/us/app/base-wallet/id6444535125'
          : 'https://play.google.com/store/apps/details?id=io.hellobase.wallet',
        connectionStatus: 'available'
      }
    ];
      
    // Check installation status for each provider
    for (const provider of providers) {
      if (provider.id === 'walletconnect') {
        provider.installed = true;
        continue;
      }
        
      try {
        const isInstalled = await this.checkWalletInstallation(provider.id as WalletProvider);
        provider.installed = isInstalled;
        provider.connectionStatus = isInstalled ? 'available' : 'unavailable';
      } catch (error) {
        console.warn(`Failed to check installation status for ${provider.name}:`, error);
        provider.installed = false;
        provider.connectionStatus = 'unavailable';
      }
    }
      
    // Cache the results
    this.walletProvidersCache = providers;
    this.lastProviderCheck = now;
      
    return providers;
  }
    
  /**
   * Check if a specific wallet is installed
   */
  private async checkWalletInstallation(provider: WalletProvider): Promise<boolean> {
    try {
      switch (provider) {
        case 'metamask':
          // Check for MetaMask deep link
          const mmUrl = Platform.OS === 'ios' ? 'metamask://' : 'metamask://';
          return await Linking.canOpenURL(mmUrl);
            
        case 'coinbase':
          const cbUrl = Platform.OS === 'ios' ? 'cbwallet://' : 'cbwallet://';
          return await Linking.canOpenURL(cbUrl);
            
        case 'trust':
          const trustUrl = Platform.OS === 'ios' ? 'trust://' : 'trust://';
          return await Linking.canOpenURL(trustUrl);
            
        case 'rainbow':
          const rainbowUrl = Platform.OS === 'ios' ? 'rainbow://' : 'rainbow://';
          return await Linking.canOpenURL(rainbowUrl);
            
        case 'base':
          const baseUrl = Platform.OS === 'ios' ? 'base://' : 'base://';
          return await Linking.canOpenURL(baseUrl);
            
        default:
          return false;
      }
    } catch (error) {
      console.warn(`Error checking wallet installation for ${provider}:`, error);
      return false;
    }
  }
    
  /**
   * Subscribe to connection progress updates
   */
  subscribeToProgress(callback: (progress: WalletConnectionProgress) => void): () => void {
    this.progressListeners.push(callback);
      
    // Return unsubscribe function
    return () => {
      const index = this.progressListeners.indexOf(callback);
      if (index > -1) {
        this.progressListeners.splice(index, 1);
      }
    };
  }
    
  /**
   * Update connection progress
   */
  private updateConnectionProgress(providerId: string, status: WalletConnectionProgress['status'], progress: number, message: string, error?: string) {
    const progressUpdate: WalletConnectionProgress = {
      providerId,
      status,
      progress,
      message,
      timestamp: new Date(),
      error
    };
      
    this.connectionProgressMap.set(providerId, progressUpdate);
      
    // Notify all listeners
    this.progressListeners.forEach(listener => {
      try {
        listener(progressUpdate);
      } catch (err) {
        console.error('Error in progress listener:', err);
      }
    });
  }
    
  /**
   * Get current connection progress for a provider
   */
  getConnectionProgress(providerId: string): WalletConnectionProgress | undefined {
    return this.connectionProgressMap.get(providerId);
  }
    
  /**
   * Clear connection progress
   */
  clearConnectionProgress(providerId: string) {
    this.connectionProgressMap.delete(providerId);
  }
    
  /**
   * Clear all connection progress
   */
  clearAllConnectionProgress() {
    this.connectionProgressMap.clear();
  }
  
  /**
   * Connect to a specific wallet provider with standardized error handling
   */
  async connect(provider: WalletProvider): Promise<string> {
    try {
      console.log(`🔗 Connecting to ${provider}...`);
      
      // Initialize progress tracking
      this.updateConnectionProgress(provider, 'initializing', 0, `Initializing ${provider} connection...`);
        
      let address: string;
  
      switch (provider) {
        case 'metamask':
          this.updateConnectionProgress(provider, 'connecting', 20, 'Opening MetaMask...');
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
          throw ErrorHandler.createError('WALLET_NOT_CONNECTED', `Unsupported wallet provider: ${provider}`);
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
        
        // Update progress to connected
        this.updateConnectionProgress(provider, 'connected', 100, `Successfully connected to ${provider}`, undefined);
        
        // Update provider status
        if (this.walletProvidersCache) {
          const providerInfo = this.walletProvidersCache.find(p => p.id === provider);
          if (providerInfo) {
            providerInfo.connectionStatus = 'connected';
            providerInfo.lastConnected = new Date();
          }
        }
        
        console.log(`✅ Connected to ${provider}:`, address);
      }
  
      return address;
    } catch (error) {
      hapticFeedback.error();
      const handledError = handleWalletError(error);
      
      // Update progress to failed
      const errorMessage = handledError.message || 'Unknown error occurred';
      this.updateConnectionProgress(provider, 'failed', 0, `Failed to connect to ${provider}`, errorMessage);
      
      // Update provider status
      if (this.walletProvidersCache) {
        const providerInfo = this.walletProvidersCache.find(p => p.id === provider);
        if (providerInfo) {
          providerInfo.connectionStatus = 'disconnected';
        }
      }
        
      // Only show serious errors, suppress wallet-not-found errors and SDK initialization
      const shouldSuppressError = handledError.message.includes('not installed') || 
                                handledError.message.includes('found') || 
                                handledError.message.includes('Redirecting') || 
                                handledError.message.includes('SDK not yet injected') || 
                                handledError.message.includes('not yet implemented') ||
                                handledError.category === 'wallet' && handledError.code === 'WALLET_REJECTED';
        
      if (!shouldSuppressError) {
        console.error(`❌ Failed to connect to ${provider}:`, handledError);
      } else {
        console.log(`ℹ️ ${provider} not available:`, handledError.message);
      }
        
      throw error;
    }
  }

  /**
   * Connect to MetaMask Mobile via injected SDK with enhanced error handling
   */
  private async connectMetaMask(): Promise<string> {
    try {
      // Enhanced SDK state validation
      if (!this.metaMaskSDKState) {
        throw new Error('MetaMask SDK not yet injected. The app is still initializing. Please try again in a few seconds.');
      }

      if (!this.metaMaskSDKState.sdk) {
        throw new Error('MetaMask SDK not fully initialized. Please ensure the app wrapper includes MetaMaskProvider and try again.');
      }

      // Check SDK readiness
      if (!this.metaMaskSDKState.ready) {
        throw new Error('MetaMask SDK is initializing. Please wait a moment and try again.');
      }

      console.log('🦊 Connecting to MetaMask via injected SDK...');
      
      // Enhanced connection with timeout
      const connectionPromise = this.metaMaskSDKState.sdk.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MetaMask connection timed out')), 15000)
      );

      const accounts = await Promise.race([connectionPromise, timeoutPromise]) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from MetaMask. Please ensure your wallet is unlocked and try again.');
      }

      const address = accounts[0];
      
      // Validate Ethereum address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        throw new Error('Invalid wallet address format returned from MetaMask');
      }

      console.log('📱 MetaMask connected successfully:', address);
      return address;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Enhanced error categorization and user guidance
      if (errorMessage.includes('timed out')) {
        console.log('⏰ MetaMask connection timeout - likely wallet app not responding');
        throw new Error('MetaMask app is not responding. Please open the MetaMask app and try again.');
      } else if (errorMessage.includes('not installed') || errorMessage.includes('not found')) {
        console.log('📱 MetaMask not installed');
        throw new Error('MetaMask is not installed on your device. Please install MetaMask from the App Store/Play Store.');
      } else if (errorMessage.includes('locked') || errorMessage.includes('unlocked')) {
        console.log('🔒 MetaMask locked');
        throw new Error('MetaMask is locked. Please unlock your wallet and try again.');
      } else if (errorMessage.includes('rejected') || errorMessage.includes('denied')) {
        console.log('❌ MetaMask connection rejected');
        throw new Error('MetaMask connection was cancelled. Please try again and confirm the connection request.');
      } else {
        console.log('ℹ️ MetaMask connection error:', errorMessage);
        throw new Error(`MetaMask connection failed: ${errorMessage}`);
      }
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