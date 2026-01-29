/**
 * WalletConnect V2 Service
 * Handles wallet connections via WalletConnect protocol
 */

import { Web3Modal } from '@reown/appkit';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { BrowserProvider } from 'ethers';

interface WalletConnectConfig {
  projectId: string;
  appName: string;
  appDescription: string;
  appUrl?: string;
  appIcon?: string;
}

class WalletConnectV2Service {
  private web3Modal: Web3Modal | null = null;
  private provider: any = null;
  private config: WalletConnectConfig | null = null;

  /**
   * Initialize WalletConnect V2
   */
  async initialize(config: WalletConnectConfig): Promise<void> {
    try {
      this.config = config;

      console.log('🔌 Initializing WalletConnect V2 with Project ID:', config.projectId);

      // Create Ethers adapter
      const ethersAdapter = new EthersAdapter({
        signerType: 'viemv2',
      });

      // Initialize Web3Modal
      this.web3Modal = new Web3Modal({
        chains: [
          {
            chainId: 1,
            name: 'Ethereum',
            currency: 'ETH',
            explorerUrl: 'https://etherscan.io',
            rpcUrl: 'https://eth.llamarpc.com',
          },
          {
            chainId: 8453,
            name: 'Base',
            currency: 'ETH',
            explorerUrl: 'https://basescan.org',
            rpcUrl: 'https://mainnet.base.org',
          },
          {
            chainId: 137,
            name: 'Polygon',
            currency: 'MATIC',
            explorerUrl: 'https://polygonscan.com',
            rpcUrl: 'https://polygon-rpc.com',
          },
        ],
        adapters: [ethersAdapter],
        metadata: {
          name: config.appName,
          description: config.appDescription,
          url: config.appUrl || 'https://linkdao.io',
          icons: config.appIcon ? [config.appIcon] : [],
        },
        projectId: config.projectId,
      });

      console.log('✅ WalletConnect V2 initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize WalletConnect V2:', error);
      throw error;
    }
  }

  /**
   * Open the modal to connect a wallet
   */
  async open(): Promise<void> {
    if (!this.web3Modal) {
      throw new Error('WalletConnect V2 not initialized. Call initialize() first.');
    }

    try {
      console.log('🔌 Opening WalletConnect modal');
      await this.web3Modal.open();
    } catch (error) {
      console.error('❌ Failed to open WalletConnect modal:', error);
      throw error;
    }
  }

  /**
   * Get the connected account
   */
  getAccount(): string | null {
    if (!this.web3Modal) {
      return null;
    }

    try {
      const accountAddress = this.web3Modal.getAccount();
      return accountAddress || null;
    } catch (error) {
      console.error('❌ Failed to get account:', error);
      return null;
    }
  }

  /**
   * Get the provider for signing
   */
  getProvider(): any {
    if (!this.web3Modal) {
      return null;
    }

    try {
      return this.web3Modal.getWalletProvider();
    } catch (error) {
      console.error('❌ Failed to get provider:', error);
      return null;
    }
  }

  /**
   * Sign a message
   */
  async signMessage(message: string): Promise<string> {
    try {
      const account = this.getAccount();
      if (!account) {
        throw new Error('No wallet connected');
      }

      const provider = this.getProvider();
      if (!provider) {
        throw new Error('Provider not available');
      }

      console.log('🔐 Signing message with WalletConnect provider');

      // Use personal_sign via the provider
      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, account],
      });

      console.log('✅ Message signed successfully');
      return signature as string;
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
      if (this.web3Modal) {
        console.log('🔌 Disconnecting wallet');
        // AppKit v1+ handles disconnect automatically
        // Just reset our provider
        this.provider = null;
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
    return !!this.getAccount();
  }
}

export const walletConnectV2Service = new WalletConnectV2Service();
export default walletConnectV2Service;
