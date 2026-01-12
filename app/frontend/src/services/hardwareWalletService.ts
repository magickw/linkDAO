/**
 * Hardware Wallet Service
 * Supports Ledger and Trezor hardware wallets
 */

import { Hash, TransactionRequest, SignableMessage, TypedData } from 'viem';
import { detectPhishing } from '@/security/phishingDetector';
import { validateTransaction, validateGasParameters } from '@/security/transactionValidator';
import { PublicClient } from 'viem';

export type HardwareWalletType = 'ledger' | 'trezor';

export interface HardwareWalletInfo {
  type: HardwareWalletType;
  name: string;
  isConnected: boolean;
  path?: string;
  address?: string;
  firmwareVersion?: string;
}

export interface HardwareWalletSignResult {
  success: boolean;
  signature?: string;
  error?: string;
  warnings?: string[];
}

export interface HardwareWalletTransactionResult {
  success: boolean;
  hash?: Hash;
  error?: string;
  warnings?: string[];
}

export class HardwareWalletService {
  private static instance: HardwareWalletService;
  private connectedWallet: HardwareWalletInfo | null = null;

  private constructor() {}

  static getInstance(): HardwareWalletService {
    if (!HardwareWalletService.instance) {
      HardwareWalletService.instance = new HardwareWalletService();
    }
    return HardwareWalletService.instance;
  }

  /**
   * Check if hardware wallet support is available
   */
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && navigator.usb !== undefined;
  }

  /**
   * Get list of available hardware wallets
   */
  async getAvailableWallets(): Promise<HardwareWalletInfo[]> {
    const wallets: HardwareWalletInfo[] = [];

    // Check for Ledger
    if (this.isLedgerSupported()) {
      wallets.push({
        type: 'ledger',
        name: 'Ledger Nano X/S',
        isConnected: false,
      });
    }

    // Check for Trezor
    if (this.isTrezorSupported()) {
      wallets.push({
        type: 'trezor',
        name: 'Trezor Model T/One',
        isConnected: false,
      });
    }

    return wallets;
  }

  /**
   * Connect to a hardware wallet
   */
  async connect(type: HardwareWalletType, path: string = "m/44'/60'/0'/0/0"): Promise<{
    success: boolean;
    wallet?: HardwareWalletInfo;
    error?: string;
  }> {
    try {
      if (!this.isSupported()) {
        return {
          success: false,
          error: 'Hardware wallet support is not available in this browser',
        };
      }

      switch (type) {
        case 'ledger':
          return await this.connectLedger(path);
        case 'trezor':
          return await this.connectTrezor(path);
        default:
          return {
            success: false,
            error: 'Unsupported hardware wallet type',
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to connect to hardware wallet',
      };
    }
  }

  /**
   * Disconnect from hardware wallet
   */
  async disconnect(): Promise<void> {
    this.connectedWallet = null;
  }

  /**
   * Get connected wallet info
   */
  getConnectedWallet(): HardwareWalletInfo | null {
    return this.connectedWallet;
  }

  /**
   * Sign a transaction with hardware wallet
   */
  async signTransaction(
    request: TransactionRequest,
    publicClient: PublicClient
  ): Promise<HardwareWalletTransactionResult> {
    if (!this.connectedWallet) {
      return {
        success: false,
        error: 'No hardware wallet connected',
      };
    }

    const warnings: string[] = [];

    try {
      // Security checks
      const phishingCheck = detectPhishing(request.to, request.value, request.data);
      if (phishingCheck.isSuspicious) {
        warnings.push(...phishingCheck.warnings);
        if (phishingCheck.riskLevel === 'high') {
          return {
            success: false,
            error: 'Transaction blocked: High security risk detected',
            warnings: phishingCheck.warnings,
          };
        }
      }

      // Validate transaction
      const txValidation = validateTransaction({
        to: request.to,
        value: request.value,
        data: request.data,
      });

      if (!txValidation.valid) {
        return {
          success: false,
          error: txValidation.errors.join(', '),
          warnings: txValidation.warnings,
        };
      }

      warnings.push(...txValidation.warnings);

      // Validate gas parameters
      const gasValidation = validateGasParameters({
        gasLimit: request.gasLimit,
        gasPrice: request.gasPrice,
        maxFeePerGas: request.maxFeePerGas,
        maxPriorityFeePerGas: request.maxPriorityFeePerGas,
      });

      if (!gasValidation.valid) {
        return {
          success: false,
          error: gasValidation.errors.join(', '),
          warnings: gasValidation.warnings,
        };
      }

      warnings.push(...gasValidation.warnings);

      // Sign with appropriate hardware wallet
      let hash: Hash;
      switch (this.connectedWallet.type) {
        case 'ledger':
          hash = await this.signTransactionWithLedger(request, publicClient);
          break;
        case 'trezor':
          hash = await this.signTransactionWithTrezor(request, publicClient);
          break;
        default:
          throw new Error('Unsupported hardware wallet type');
      }

      return {
        success: true,
        hash,
        warnings,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Transaction signing failed',
        warnings,
      };
    }
  }

  /**
   * Sign a message with hardware wallet
   */
  async signMessage(message: string): Promise<HardwareWalletSignResult> {
    if (!this.connectedWallet) {
      return {
        success: false,
        error: 'No hardware wallet connected',
      };
    }

    try {
      let signature: string;
      switch (this.connectedWallet.type) {
        case 'ledger':
          signature = await this.signMessageWithLedger(message);
          break;
        case 'trezor':
          signature = await this.signMessageWithTrezor(message);
          break;
        default:
          throw new Error('Unsupported hardware wallet type');
      }

      return {
        success: true,
        signature,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Message signing failed',
      };
    }
  }

  /**
   * Sign typed data with hardware wallet
   */
  async signTypedData(
    domain: any,
    types: any,
    value: any
  ): Promise<HardwareWalletSignResult> {
    if (!this.connectedWallet) {
      return {
        success: false,
        error: 'No hardware wallet connected',
      };
    }

    try {
      let signature: string;
      switch (this.connectedWallet.type) {
        case 'ledger':
          signature = await this.signTypedDataWithLedger(domain, types, value);
          break;
        case 'trezor':
          signature = await this.signTypedDataWithTrezor(domain, types, value);
          break;
        default:
          throw new Error('Unsupported hardware wallet type');
      }

      return {
        success: true,
        signature,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Typed data signing failed',
      };
    }
  }

  /**
   * Get address from hardware wallet
   */
  async getAddress(path: string = "m/44'/60'/0'/0/0"): Promise<{
    success: boolean;
    address?: string;
    error?: string;
  }> {
    if (!this.connectedWallet) {
      return {
        success: false,
        error: 'No hardware wallet connected',
      };
    }

    try {
      let address: string;
      switch (this.connectedWallet.type) {
        case 'ledger':
          address = await this.getAddressFromLedger(path);
          break;
        case 'trezor':
          address = await this.getAddressFromTrezor(path);
          break;
        default:
          throw new Error('Unsupported hardware wallet type');
      }

      this.connectedWallet.path = path;
      this.connectedWallet.address = address;

      return {
        success: true,
        address,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get address',
      };
    }
  }

  // Private methods for Ledger

  private isLedgerSupported(): boolean {
    try {
      return typeof navigator !== 'undefined' && 'usb' in navigator;
    } catch {
      return false;
    }
  }

  private async connectLedger(path: string): Promise<{
    success: boolean;
    wallet?: HardwareWalletInfo;
    error?: string;
  }> {
    try {
      // Import Ledger libraries dynamically to avoid SSR issues
      const { default: TransportWebUSB } = await import('@ledgerhq/hw-transport-webusb');
      const { default: AppEth } = await import('@ledgerhq/hw-app-eth');

      // Create transport
      const transport = await TransportWebUSB.create();
      
      // Create Ethereum app instance
      const eth = new AppEth(transport);
      
      // Get address
      const { address, publicKey } = await eth.getAddress(path, false, true);
      
      // Get device info
      const deviceInfo = await eth.getAppConfiguration();
      
      const wallet: HardwareWalletInfo = {
        type: 'ledger',
        name: 'Ledger Nano X/S',
        isConnected: true,
        path,
        address,
        firmwareVersion: deviceInfo.version,
      };

      this.connectedWallet = wallet;

      // Keep transport reference for future operations
      (this as any).ledgerTransport = transport;
      (this as any).ledgerApp = eth;

      return {
        success: true,
        wallet,
      };
    } catch (error: any) {
      console.error('Ledger connection error:', error);
      return {
        success: false,
        error: error.message || 'Failed to connect to Ledger',
      };
    }
  }

  private async getAddressFromLedger(path: string): Promise<string> {
    try {
      const { default: TransportWebUSB } = await import('@ledgerhq/hw-transport-webusb');
      const { default: AppEth } = await import('@ledgerhq/hw-app-eth');

      const transport = await TransportWebUSB.create();
      const eth = new AppEth(transport);
      const { address } = await eth.getAddress(path);
      
      // Close transport after use
      await transport.close();
      
      return address;
    } catch (error) {
      console.error('Failed to get address from Ledger:', error);
      throw new Error('Failed to get address from Ledger device');
    }
  }

  private async signTransactionWithLedger(
    request: TransactionRequest,
    publicClient: PublicClient
  ): Promise<Hash> {
    try {
      const eth = (this as any).ledgerApp;
      if (!eth) {
        throw new Error('Ledger not connected');
      }

      // Convert transaction to Ledger format
      const txData = {
        nonce: request.nonce ? `0x${request.nonce.toString(16)}` : '0x00',
        gasPrice: request.gasPrice ? `0x${request.gasPrice.toString(16)}` : '0x00',
        gasLimit: request.gasLimit ? `0x${request.gasLimit.toString(16)}` : '0x5208',
        to: request.to || '0x0000000000000000000000000000000000000000',
        value: request.value ? `0x${request.value.toString(16)}` : '0x00',
        data: request.data || '0x',
        chainId: request.chainId || 1,
        v: request.chainId || 1,
        r: '0x00',
        s: '0x00',
      };

      // Sign transaction
      const signature = await eth.signTransaction(this.connectedWallet.path!, txData);
      
      // Combine signature with transaction data to create signed transaction
      const { v, r, s } = signature;
      const signedTx = {
        ...txData,
        v: `0x${v.toString(16)}`,
        r: r.startsWith('0x') ? r : `0x${r}`,
        s: s.startsWith('0x') ? s : `0x${s}`,
      };

      // Serialize and send transaction
      const hash = await publicClient.sendRawTransaction({
        serialized: signedTx as any,
      });

      return hash;
    } catch (error) {
      console.error('Ledger transaction signing error:', error);
      throw new Error('Failed to sign transaction with Ledger');
    }
  }

  private async signMessageWithLedger(message: string): Promise<string> {
    try {
      const eth = (this as any).ledgerApp;
      if (!eth) {
        throw new Error('Ledger not connected');
      }

      // Convert message to hex
      const messageHex = Buffer.from(message, 'utf8').toString('hex');
      
      // Sign personal message
      const signature = await eth.signPersonalMessage(
        this.connectedWallet.path!,
        messageHex
      );

      return signature;
    } catch (error) {
      console.error('Ledger message signing error:', error);
      throw new Error('Failed to sign message with Ledger');
    }
  }

  private async signTypedDataWithLedger(
    domain: any,
    types: any,
    value: any
  ): Promise<string> {
    try {
      const eth = (this as any).ledgerApp;
      if (!eth) {
        throw new Error('Ledger not connected');
      }

      // Sign typed data (EIP-712)
      const signature = await eth.signEIP712HashedMessage(
        this.connectedWallet.path!,
        domain,
        types,
        value
      );

      return signature;
    } catch (error) {
      console.error('Ledger typed data signing error:', error);
      throw new Error('Failed to sign typed data with Ledger');
    }
  }

  // Private methods for Trezor

  private isTrezorSupported(): boolean {
    try {
      return typeof navigator !== 'undefined' && 'usb' in navigator;
    } catch {
      return false;
    }
  }

  private async connectTrezor(path: string): Promise<{
    success: boolean;
    wallet?: HardwareWalletInfo;
    error?: string;
  }> {
    try {
      // Import Trezor Connect dynamically
      const TrezorConnect = await import('@trezor/connect-web');
      
      // Initialize Trezor Connect
      TrezorConnect.init({
        lazyLoad: true,
        manifest: {
          email: 'support@linkdao.io',
          appUrl: window.location.origin,
        },
      });

      // Get Ethereum address
      const result = await TrezorConnect.ethereumGetAddress({
        path,
        showOnTrezor: true,
      });

      if (!result.success) {
        throw new Error(result.payload.error || 'Failed to get address from Trezor');
      }

      const address = result.payload.address;

      // Get device info
      const featuresResult = await TrezorConnect.getFeatures();
      const firmwareVersion = featuresResult.success 
        ? `${featuresResult.payload.major_version}.${featuresResult.payload.minor_version}.${featuresResult.payload.patch_version}`
        : 'Unknown';

      const wallet: HardwareWalletInfo = {
        type: 'trezor',
        name: 'Trezor Model T/One',
        isConnected: true,
        path,
        address,
        firmwareVersion,
      };

      this.connectedWallet = wallet;

      return {
        success: true,
        wallet,
      };
    } catch (error: any) {
      console.error('Trezor connection error:', error);
      return {
        success: false,
        error: error.message || 'Failed to connect to Trezor',
      };
    }
  }

  private async getAddressFromTrezor(path: string): Promise<string> {
    try {
      const TrezorConnect = await import('@trezor/connect-web');
      
      const result = await TrezorConnect.ethereumGetAddress({
        path,
        showOnTrezor: false,
      });

      if (!result.success) {
        throw new Error(result.payload.error || 'Failed to get address');
      }

      return result.payload.address;
    } catch (error) {
      console.error('Failed to get address from Trezor:', error);
      throw new Error('Failed to get address from Trezor device');
    }
  }

  private async signTransactionWithTrezor(
    request: TransactionRequest,
    publicClient: PublicClient
  ): Promise<Hash> {
    try {
      const TrezorConnect = await import('@trezor/connect-web');

      // Convert transaction to Trezor format
      const txData = {
        to: request.to || '0x0000000000000000000000000000000000000000',
        value: request.value ? request.value.toString() : '0',
        gasLimit: request.gasLimit ? request.gasLimit.toString() : '21000',
        gasPrice: request.gasPrice ? request.gasPrice.toString() : undefined,
        maxFeePerGas: request.maxFeePerGas ? request.maxFeePerGas.toString() : undefined,
        maxPriorityFeePerGas: request.maxPriorityFeePerGas ? request.maxPriorityFeePerGas.toString() : undefined,
        nonce: request.nonce ? request.nonce.toString() : undefined,
        chainId: request.chainId || 1,
        data: request.data || undefined,
      };

      // Sign transaction
      const result = await TrezorConnect.ethereumSignTransaction({
        path: this.connectedWallet.path!,
        transaction: txData,
      });

      if (!result.success) {
        throw new Error(result.payload.error || 'Failed to sign transaction');
      }

      // Combine signature with transaction data
      const { r, s, v } = result.payload;
      const signedTx = {
        ...txData,
        r,
        s,
        v: v.toString(),
      };

      // Serialize and send transaction
      const hash = await publicClient.sendRawTransaction({
        serialized: signedTx as any,
      });

      return hash;
    } catch (error) {
      console.error('Trezor transaction signing error:', error);
      throw new Error('Failed to sign transaction with Trezor');
    }
  }

  private async signMessageWithTrezor(message: string): Promise<string> {
    try {
      const TrezorConnect = await import('@trezor/connect-web');

      const result = await TrezorConnect.ethereumSignMessage({
        path: this.connectedWallet.path!,
        message,
      });

      if (!result.success) {
        throw new Error(result.payload.error || 'Failed to sign message');
      }

      const { r, s, v } = result.payload;
      // Combine r, s, v into signature format
      const signature = `${r}${s}${v.toString(16).padStart(2, '0')}`;

      return signature;
    } catch (error) {
      console.error('Trezor message signing error:', error);
      throw new Error('Failed to sign message with Trezor');
    }
  }

  private async signTypedDataWithTrezor(
    domain: any,
    types: any,
    value: any
  ): Promise<string> {
    try {
      const TrezorConnect = await import('@trezor/connect-web');

      // Convert types to Trezor format
      const trezorTypes = {};
      for (const [key, type] of Object.entries(types)) {
        if (key !== 'EIP712Domain') {
          trezorTypes[key] = type;
        }
      }

      const result = await TrezorConnect.ethereumSignTypedData({
        path: this.connectedWallet.path!,
        data: {
          domain,
          types: trezorTypes,
          message: value,
        },
      });

      if (!result.success) {
        throw new Error(result.payload.error || 'Failed to sign typed data');
      }

      const { r, s, v } = result.payload;
      // Combine r, s, v into signature format
      const signature = `${r}${s}${v.toString(16).padStart(2, '0')}`;

      return signature;
    } catch (error) {
      console.error('Trezor typed data signing error:', error);
      throw new Error('Failed to sign typed data with Trezor');
    }
  }
}

// Export singleton instance
export const hardwareWalletService = HardwareWalletService.getInstance();