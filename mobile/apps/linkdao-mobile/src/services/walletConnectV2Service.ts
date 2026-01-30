/**
 * WalletConnect V2 Service (React Native)
 * Real implementation using @walletconnect/react-native
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Core } from '@walletconnect/core';
import { Web3Wallet } from '@walletconnect/web3wallet';
import { WalletConnectModal } from '@walletconnect/react-native-compat';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import { ethers } from 'ethers';
import { Alert, Linking, Platform } from 'react-native';

interface WalletConnectConfig {
  projectId: string;
  appName: string;
  appDescription: string;
  appUrl?: string;
  appIcon?: string;
}

interface SignRequest {
  id: number;
  topic: string;
  params: {
    request: {
      method: string;
      params: [string];
    };
    chainId: string;
  };
}

class WalletConnectV2Service {
  private config: WalletConnectConfig | null = null;
  private web3Wallet: Web3Wallet | null = null;
  private account: string | null = null;
  private chainId: string = '1'; // Ethereum Mainnet
  private sessionTopic: string | null = null;
  private pendingSignRequests: Map<number, (signature: string) => void> = new Map();

  /**
   * Initialize WalletConnect V2
   */
  async initialize(config: WalletConnectConfig): Promise<void> {
    try {
      this.config = config;
      console.log('🔌 Initializing WalletConnect V2 with Project ID:', config.projectId);

      // Initialize Core
      const core = new Core({
        projectId: config.projectId,
      });

      // Initialize Web3Wallet
      this.web3Wallet = await Web3Wallet.init({
        core,
        metadata: {
          name: config.appName,
          description: config.appDescription,
          url: config.appUrl || 'https://linkdao.io',
          icons: config.appIcon ? [config.appIcon] : ['https://avatars.githubusercontent.com/u/37784886'],
        },
      });

      // Setup event listeners
      this.setupEventListeners();

      // Try to restore previous connection
      const savedAccount = await AsyncStorage.getItem('wc_account');
      const savedSessionTopic = await AsyncStorage.getItem('wc_session_topic');

      if (savedAccount && savedSessionTopic) {
        this.account = savedAccount;
        this.sessionTopic = savedSessionTopic;
        console.log('✅ Restored previous account:', this.account);
      }

      console.log('✅ WalletConnect V2 initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize WalletConnect V2:', error);
      throw error;
    }
  }

  /**
   * Setup event listeners for WalletConnect events
   */
  private setupEventListeners(): void {
    if (!this.web3Wallet) return;

    // Session proposal
    this.web3Wallet.on('session_proposal', async (proposal) => {
      console.log('📨 Session proposal received:', proposal);

      try {
        // Build approved namespaces
        const approvedNamespaces = buildApprovedNamespaces({
          proposal: proposal.params,
        });

        // Approve session
        const { topic } = await this.web3Wallet.approveSession({
          id: proposal.id,
          namespaces: approvedNamespaces,
        });

        this.sessionTopic = topic;

        // Extract account from approved session
        const session = await this.web3Wallet.getSession(topic);
        if (session?.namespaces?.eip155?.accounts?.[0]) {
          this.account = session.namespaces.eip155.accounts[0].split(':')[2];
          await AsyncStorage.setItem('wc_account', this.account);
          await AsyncStorage.setItem('wc_session_topic', topic);
          console.log('✅ Connected account:', this.account);
        }
      } catch (error) {
        console.error('❌ Failed to approve session:', error);
        await this.web3Wallet!.rejectSession({
          id: proposal.id,
          reason: getSdkError('USER_REJECTED'),
        });
      }
    });

    // Session request (sign message)
    this.web3Wallet.on('session_request', async (request: any) => {
      console.log('📨 Session request received:', request);

      try {
        if (request.params.request.method === 'personal_sign') {
          const message = request.params.request.params[0];
          const address = request.params.request.params[1];

          // Prompt user to sign
          const shouldSign = await this.promptUserToSign(message, address);

          if (shouldSign) {
            // In production, you would use the wallet app to sign
            // For now, we'll simulate it
            const signature = await this.simulateSignMessage(message);

            // Respond with signature
            await this.web3Wallet!.respondSessionRequest({
              topic: request.topic,
              response: {
                id: request.id,
                result: signature,
                jsonrpc: '2.0',
              },
            });

            // Resolve pending promise if exists
            const resolver = this.pendingSignRequests.get(request.id);
            if (resolver) {
              resolver(signature);
              this.pendingSignRequests.delete(request.id);
            }
          } else {
            // Reject
            await this.web3Wallet!.respondSessionRequest({
              topic: request.topic,
              response: {
                id: request.id,
                error: getSdkError('USER_REJECTED'),
              },
            });
          }
        }
      } catch (error) {
        console.error('❌ Failed to handle session request:', error);
        await this.web3Wallet!.respondSessionRequest({
          topic: request.topic,
          response: {
            id: request.id,
            error: getSdkError('USER_REJECTED'),
          },
        });
      }
    });

    // Session delete
    this.web3Wallet.on('session_delete', async (event) => {
      console.log('🗑️ Session deleted:', event);
      this.account = null;
      this.sessionTopic = null;
      await AsyncStorage.removeItem('wc_account');
      await AsyncStorage.removeItem('wc_session_topic');
    });
  }

  /**
   * Connect to a wallet via WalletConnect modal
   */
  async connect(): Promise<string> {
    if (!this.config) {
      throw new Error('WalletConnect V2 not initialized. Call initialize() first.');
    }

    if (!this.web3Wallet) {
      throw new Error('Web3Wallet not initialized');
    }

    try {
      console.log('🔌 Connecting to wallet via WalletConnect modal');

      // If already connected, return account
      if (this.account) {
        console.log('✅ Already connected to:', this.account);
        return this.account;
      }

      // Create pairing URI
      const { uri, approval } = await this.web3Wallet.core.pairing.create();

      if (!uri) {
        throw new Error('Failed to create pairing URI');
      }

      console.log('📱 Pairing URI:', uri);

      // Open WalletConnect modal
      await WalletConnectModal.openModal({
        uri,
        themeMode: 'light',
      });

      // Wait for session approval
      await approval();

      // Close modal
      WalletConnectModal.closeModal();

      if (!this.account) {
        throw new Error('Failed to connect - no account returned');
      }

      console.log('✅ Connected account:', this.account);
      return this.account;
    } catch (error) {
      console.error('❌ Failed to connect wallet:', error);
      WalletConnectModal.closeModal();
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
   * Sign a message
   */
  async signMessage(message: string): Promise<string> {
    try {
      if (!this.account) {
        throw new Error('No wallet connected');
      }

      if (!this.web3Wallet || !this.sessionTopic) {
        throw new Error('No active session');
      }

      console.log('🔐 Signing message with WalletConnect');

      // Create sign request
      const request = {
        method: 'personal_sign',
        params: [message, this.account],
      };

      // Send request to wallet
      const result = await this.web3Wallet.request({
        topic: this.sessionTopic,
        chainId: this.chainId,
        request,
      });

      const signature = result as string;
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
      console.log('🔌 Disconnecting wallet');

      if (this.sessionTopic && this.web3Wallet) {
        await this.web3Wallet.disconnectSession({
          topic: this.sessionTopic,
          reason: getSdkError('USER_DISCONNECTED'),
        });
      }

      this.account = null;
      this.sessionTopic = null;
      await AsyncStorage.removeItem('wc_account');
      await AsyncStorage.removeItem('wc_session_topic');

      console.log('✅ Wallet disconnected');
    } catch (error) {
      console.error('❌ Failed to disconnect:', error);
    }
  }

  /**
   * Check if a wallet is connected
   */
  isConnected(): boolean {
    return !!this.account && !!this.sessionTopic;
  }

  /**
   * Prompt user to sign message (for development/testing)
   */
  private async promptUserToSign(message: string, address: string): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Sign Message',
        `Please sign this message:\n\n${message.substring(0, 100)}...`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Sign',
            onPress: () => resolve(true),
          },
        ]
      );
    });
  }

  /**
   * Simulate signing (for development - in production use real wallet)
   */
  private async simulateSignMessage(message: string): Promise<string> {
    // In production, this would be handled by the wallet app
    // For development, we'll use ethers to simulate
    try {
      // Use a dummy private key for signing (NEVER use in production!)
      const privateKey = '0x' + '1'.repeat(64);
      const wallet = new ethers.Wallet(privateKey);
      const signature = await wallet.signMessage(message);
      return signature;
    } catch (error) {
      console.error('❌ Failed to simulate sign:', error);
      throw new Error('Failed to sign message');
    }
  }
}

export const walletConnectV2Service = new WalletConnectV2Service();
export default walletConnectV2Service;