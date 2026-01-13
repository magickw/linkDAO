/**
 * WalletConnect Service
 * Manages WalletConnect connections for the mobile app
 */

require('@walletconnect/react-native-compat');
import { Core } from '@walletconnect/core';
import { Web3Wallet, IWeb3Wallet } from '@walletconnect/web3wallet';
import { getSdkError } from '@walletconnect/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
require('react-native-get-random-values');

const WALLETCONNECT_PROJECT_ID = process.env.WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';
const STORAGE_KEY = 'walletconnect_sessions';

class WalletConnectService {
  private web3wallet: IWeb3Wallet | null = null;
  private activeSession: any = null;
  private activeAccounts: string[] = [];
  private activeChainId: string | undefined;

  /**
   * Initialize WalletConnect
   */
  async initialize() {
    if (this.web3wallet) {
      return this.web3wallet;
    }

    try {
      const core = new Core({
        projectId: WALLETCONNECT_PROJECT_ID,
      });

      this.web3wallet = await Web3Wallet.init({
        core,
        metadata: {
          name: 'LinkDAO',
          description: 'Decentralized Social Platform',
          url: 'https://linkdao.io',
          icons: ['https://linkdao.io/icon.png'],
        },
      });

      console.log('✅ WalletConnect initialized');

      // Setup event listeners
      this.setupEventListeners();

      // Restore previous session if exists
      await this.restoreSession();

      return this.web3wallet;
    } catch (error) {
      console.error('❌ Failed to initialize WalletConnect:', error);
      throw error;
    }
  }

  /**
   * Setup event listeners for WalletConnect events
   */
  private setupEventListeners() {
    if (!this.web3wallet) return;

    // Handle session proposals
    this.web3wallet.on('session_proposal', async (event) => {
      console.log('📨 Session proposal received:', event);
      // Auto-approve for demo purposes
      // In production, you'd show a modal to let user approve
      try {
        const { id, params } = event;
        const { requiredNamespaces, relays } = params;

        const namespaces: any = {};

        // Build namespaces based on proposal
        Object.keys(requiredNamespaces).forEach((key) => {
          const accounts: string[] = [];
          requiredNamespaces[key].chains?.forEach((chain) => {
            requiredNamespaces[key].accounts?.forEach((account) => {
              accounts.push(`${chain}:${account.split(':')[2]}`);
            });
          });

          namespaces[key] = {
            accounts,
            methods: requiredNamespaces[key].methods,
            events: requiredNamespaces[key].events,
            chains: requiredNamespaces[key].chains,
          };
        });

        const session = await this.web3wallet!.approveSession({
          id,
          namespaces,
        });

        console.log('✅ Session approved:', session);
        this.activeSession = session;
        this.activeAccounts = Object.values(session.namespaces)
          .flatMap((ns: any) => ns.accounts)
          .map((account: string) => account.split(':')[2]);

        await this.saveSession(session);
      } catch (error) {
        console.error('❌ Failed to approve session:', error);
        await this.web3wallet!.rejectSession({
          id: event.id,
          reason: getSdkError('USER_REJECTED'),
        });
      }
    });

    // Handle session requests
    this.web3wallet.on('session_request', async (event) => {
      console.log('📨 Session request received:', event);
      const { topic, params } = event;
      const { request } = params;

      try {
        // Handle different request types
        if (request.method === 'personal_sign' || request.method === 'eth_signTypedData_v4') {
          // Sign request
          const result = await this.handleSignRequest(request);
          await this.web3wallet!.respondSessionRequest({
            topic,
            response: {
              id: event.id,
              jsonrpc: '2.0',
              result,
            },
          });
        } else if (request.method === 'eth_sendTransaction') {
          // Transaction request
          console.log('📝 Transaction request:', request.params);
          // For demo, just return a mock transaction hash
          const result = '0x' + Math.random().toString(16).substr(2, 64);
          await this.web3wallet!.respondSessionRequest({
            topic,
            response: {
              id: event.id,
              jsonrpc: '2.0',
              result,
            },
          });
        } else {
          throw new Error(`Unsupported method: ${request.method}`);
        }
      } catch (error) {
        console.error('❌ Failed to handle request:', error);
        await this.web3wallet!.respondSessionRequest({
          topic,
          response: {
            id: event.id,
            jsonrpc: '2.0',
            error: getSdkError('USER_REJECTED'),
          },
        });
      }
    });

    // Handle session deletion
    this.web3wallet.on('session_delete', (event) => {
      console.log('🗑️ Session deleted:', event);
      this.activeSession = null;
      this.activeAccounts = [];
      this.activeChainId = undefined;
      this.clearSavedSession();
    });
  }

  /**
   * Handle sign request
   */
  private async handleSignRequest(request: any): Promise<string> {
    const { method, params } = request;

    if (method === 'personal_sign') {
      const [message, address] = params;
      console.log('🔐 Signing message:', message);
      // In a real implementation, this would prompt the user to sign
      // For demo, return a mock signature
      return '0x' + Math.random().toString(16).substr(2, 130);
    } else if (method === 'eth_signTypedData_v4') {
      console.log('🔐 Signing typed data:', params);
      // In a real implementation, this would prompt the user to sign
      return '0x' + Math.random().toString(16).substr(2, 130);
    }

    throw new Error(`Unsupported sign method: ${method}`);
  }

  /**
   * Pair with a wallet using URI
   */
  async pair(uri: string) {
    if (!this.web3wallet) {
      await this.initialize();
    }

    try {
      console.log('🔗 Pairing with URI:', uri);
      await this.web3wallet!.pair({ uri });
      console.log('✅ Pairing initiated');
    } catch (error) {
      console.error('❌ Failed to pair:', error);
      throw error;
    }
  }

  /**
   * Sign a message with the connected wallet
   */
  async signMessage(message: string, address: string): Promise<string> {
    if (!this.activeSession) {
      throw new Error('No active session');
    }

    const topic = this.activeSession.topic;
    const chainId = 'eip155:1'; // Ethereum mainnet

    try {
      console.log('🔐 Requesting signature for:', message);

      const result = await this.web3wallet!.request({
        topic,
        chainId,
        request: {
          method: 'personal_sign',
          params: [message, address],
        },
      });

      console.log('✅ Signature received:', result);
      return result as string;
    } catch (error) {
      console.error('❌ Failed to sign message:', error);
      throw error;
    }
  }

  /**
   * Disconnect from current session
   */
  async disconnect() {
    if (!this.activeSession) {
      return;
    }

    try {
      await this.web3wallet!.disconnectSession({
        topic: this.activeSession.topic,
        reason: getSdkError('USER_DISCONNECTED'),
      });
      console.log('✅ Disconnected from session');
    } catch (error) {
      console.error('❌ Failed to disconnect:', error);
      throw error;
    }
  }

  /**
   * Get active accounts
   */
  getAccounts(): string[] {
    return this.activeAccounts;
  }

  /**
   * Get active chain ID
   */
  getChainId(): string | undefined {
    return this.activeChainId;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.activeSession !== null && this.activeAccounts.length > 0;
  }

  /**
   * Save session to storage
   */
  private async saveSession(session: any) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('❌ Failed to save session:', error);
    }
  }

  /**
   * Restore session from storage
   */
  private async restoreSession() {
    try {
      const sessionJson = await AsyncStorage.getItem(STORAGE_KEY);
      if (sessionJson) {
        const session = JSON.parse(sessionJson);
        this.activeSession = session;
        this.activeAccounts = Object.values(session.namespaces)
          .flatMap((ns: any) => ns.accounts)
          .map((account: string) => account.split(':')[2]);
        console.log('✅ Session restored:', this.activeAccounts);
      }
    } catch (error) {
      console.error('❌ Failed to restore session:', error);
    }
  }

  /**
   * Clear saved session
   */
  private async clearSavedSession() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('❌ Failed to clear session:', error);
    }
  }

  /**
   * Get pairing URI for a wallet
   */
  async getPairingUri(): Promise<string> {
    if (!this.web3wallet) {
      await this.initialize();
    }

    try {
      const { uri, approval } = await this.web3wallet!.core.pairing.create();
      console.log('🔗 Pairing URI:', uri);
      return uri;
    } catch (error) {
      console.error('❌ Failed to create pairing:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const walletConnectService = new WalletConnectService();
export default walletConnectService;