/**
 * WalletConnect V2 Service (React Native)
 * Handles wallet connections via WalletConnect protocol
 * Uses UniversalProvider for React Native compatibility
 */

import UniversalProvider from '@walletconnect/universal-provider';
import { Linking } from 'react-native';

interface WalletConnectConfig {
  projectId: string;
  appName: string;
  appDescription: string;
  appUrl?: string;
  appIcon?: string;
}

class WalletConnectV2Service {
  private provider: UniversalProvider | null = null;
  private config: WalletConnectConfig | null = null;
  private account: string | null = null;

  /**
   * Initialize WalletConnect V2
   */
  async initialize(config: WalletConnectConfig): Promise<void> {
    try {
      this.config = config;

      console.log('🔌 Initializing WalletConnect V2 with Project ID:', config.projectId);

      // Initialize UniversalProvider
      this.provider = await UniversalProvider.init({
        projectId: config.projectId,
        metadata: {
          name: config.appName,
          description: config.appDescription,
          url: config.appUrl || 'https://linkdao.io',
          icons: config.appIcon ? [config.appIcon] : [],
        },
      });

      // Listen for account changes
      this.provider.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          this.account = accounts[0];
          console.log('👤 Account changed:', this.account);
        }
      });

      // Listen for chain changes
      this.provider.on('chainChanged', (chainId: number) => {
        console.log('🔗 Chain changed:', chainId);
      });

      // Listen for disconnect
      this.provider.on('disconnect', () => {
        this.account = null;
        console.log('👋 Wallet disconnected');
      });

      console.log('✅ WalletConnect V2 initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize WalletConnect V2:', error);
      throw error;
    }
  }

  /**
   * Connect to a wallet via WalletConnect
   */
  async connect(): Promise<string> {
    if (!this.provider) {
      throw new Error('WalletConnect V2 not initialized. Call initialize() first.');
    }

    try {
      console.log('🔌 Connecting to wallet via WalletConnect');

      // Request connection
      const namespaces = {
        eip155: {
          methods: ['eth_sendTransaction', 'eth_signTransaction', 'eth_sign', 'personal_sign', 'eth_signTypedData'],
          chains: ['eip155:1', 'eip155:8453', 'eip155:137'],
          events: ['chainChanged', 'accountsChanged'],
        },
      };

      const { uri, approval } = await this.provider.client!.connect({ namespaces });

      if (uri) {
        console.log('📲 WalletConnect URI generated, opening wallet via deep link');
        await Linking.openURL(uri);
      }

      // Wait for approval
      const session = await approval();
      console.log('✅ Session approved:', session);

      // Get account from session
      const accounts = session.namespaces.eip155.accounts;
      if (accounts && accounts.length > 0) {
        this.account = accounts[0].split(':').pop() || null;
        console.log('✅ Connected account:', this.account);
      }

      return this.account || '';
    } catch (error) {
      console.error('❌ Failed to connect wallet:', error);
      throw error;
    }
  }

  /**
   * Get the connected account
   */
  getAccount(): string | null {
    return this.account;
  }

  /**
   * Get the provider
   */
  getProvider(): UniversalProvider | null {
    return this.provider;
  }

  /**
   * Sign a message
   */
  async signMessage(message: string): Promise<string> {
    try {
      if (!this.account) {
        throw new Error('No wallet connected');
      }

      if (!this.provider) {
        throw new Error('Provider not available');
      }

      console.log('🔐 Signing message with WalletConnect provider');

      // Use personal_sign via the provider
      const signature = await this.provider.request({
        method: 'personal_sign',
        params: [message, this.account],
      }) as string;

      console.log('✅ Message signed successfully');
      return signature;
    } catch (error) {
      console.error('❌ Failed to sign message:', error);
      throw error;
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    try {
      if (this.provider) {
        console.log('🔌 Disconnecting wallet');

        // Get all active sessions
        const sessions = this.provider.client?.session.getAll();
        if (sessions) {
          for (const session of sessions) {
            await this.provider.client?.disconnect({
              topic: session.topic,
              reason: { code: 6000, message: 'USER_DISCONNECTED' },
            });
          }
        }

        this.account = null;
        console.log('✅ Wallet disconnected');
      }
    } catch (error) {
      console.error('❌ Failed to disconnect:', error);
    }
  }

  /**
   * Check if a wallet is connected
   */
  isConnected(): boolean {
    return !!this.account && !!this.provider;
  }
}

export const walletConnectV2Service = new WalletConnectV2Service();
export default walletConnectV2Service;
