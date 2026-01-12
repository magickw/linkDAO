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
      // In production, use @ledgerhq/hw-transport-webusb
      // This is a placeholder implementation
      const address = await this.getAddressFromLedger(path);

      const wallet: HardwareWalletInfo = {
        type: 'ledger',
        name: 'Ledger Nano X/S',
        isConnected: true,
        path,
        address,
        firmwareVersion: '2.0.0', // Would get from device
      };

      this.connectedWallet = wallet;

      return {
        success: true,
        wallet,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to connect to Ledger',
      };
    }
  }

  private async getAddressFromLedger(path: string): Promise<string> {
    // Placeholder - In production, use @ledgerhq/hw-app-eth
    // const transport = await TransportWebUSB.create();
    // const eth = new AppEth(transport);
    // const { address } = await eth.getAddress(path);
    // return address;
    
    // For now, return a mock address
    return '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  private async signTransactionWithLedger(
    request: TransactionRequest,
    publicClient: PublicClient
  ): Promise<Hash> {
    // Placeholder - In production, use @ledgerhq/hw-app-eth
    // const transport = await TransportWebUSB.create();
    // const eth = new AppEth(transport);
    // const tx = await eth.signTransaction(this.connectedWallet.path!, request);
    // return tx as Hash;
    
    // For now, return a mock hash
    return '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('') as Hash;
  }

  private async signMessageWithLedger(message: string): Promise<string> {
    // Placeholder - In production, use @ledgerhq/hw-app-eth
    // const transport = await TransportWebUSB.create();
    // const eth = new AppEth(transport);
    // const signature = await eth.signPersonalMessage(this.connectedWallet.path!, message);
    // return signature;
    
    // For now, return a mock signature
    return '0x' + Array.from({ length: 130 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  private async signTypedDataWithLedger(
    domain: any,
    types: any,
    value: any
  ): Promise<string> {
    // Placeholder - In production, use @ledgerhq/hw-app-eth
    // const transport = await TransportWebUSB.create();
    // const eth = new AppEth(transport);
    // const signature = await eth.signTypedData(this.connectedWallet.path!, domain, types, value);
    // return signature;
    
    // For now, return a mock signature
    return '0x' + Array.from({ length: 130 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
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
      // In production, use @web3modal/walletconnect or @trezor/connect
      // This is a placeholder implementation
      const address = await this.getAddressFromTrezor(path);

      const wallet: HardwareWalletInfo = {
        type: 'trezor',
        name: 'Trezor Model T/One',
        isConnected: true,
        path,
        address,
        firmwareVersion: '2.5.0', // Would get from device
      };

      this.connectedWallet = wallet;

      return {
        success: true,
        wallet,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to connect to Trezor',
      };
    }
  }

  private async getAddressFromTrezor(path: string): Promise<string> {
    // Placeholder - In production, use @trezor/connect
    // const result = await TrezorConnect.ethereumGetAddress(path);
    // return result.address;
    
    // For now, return a mock address
    return '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  private async signTransactionWithTrezor(
    request: TransactionRequest,
    publicClient: PublicClient
  ): Promise<Hash> {
    // Placeholder - In production, use @trezor/connect
    // const result = await TrezorConnect.ethereumSignTransaction(
    //   this.connectedWallet.path!,
    //   request
    // );
    // return result as Hash;
    
    // For now, return a mock hash
    return '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('') as Hash;
  }

  private async signMessageWithTrezor(message: string): Promise<string> {
    // Placeholder - In production, use @trezor/connect
    // const result = await TrezorConnect.ethereumSignMessage(
    //   this.connectedWallet.path!,
    //   message
    // );
    // return result.signature;
    
    // For now, return a mock signature
    return '0x' + Array.from({ length: 130 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  private async signTypedDataWithTrezor(
    domain: any,
    types: any,
    value: any
  ): Promise<string> {
    // Placeholder - In production, use @trezor/connect
    // const result = await TrezorConnect.ethereumSignTypedData(
    //   this.connectedWallet.path!,
    //   domain,
    //   types,
    //   value
    // );
    // return result.signature;
    
    // For now, return a mock signature
    return '0x' + Array.from({ length: 130 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }
}

// Export singleton instance
export const hardwareWalletService = HardwareWalletService.getInstance();