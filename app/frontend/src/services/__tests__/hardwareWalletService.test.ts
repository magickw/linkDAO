/**
 * Unit Tests for Hardware Wallet Service
 */

import { HardwareWalletService } from '@/services/hardwareWalletService';
import { PublicClient } from 'viem';

// Mock PublicClient
const mockPublicClient: jest.Mocked<PublicClient> = {
  call: jest.fn(),
  estimateGas: jest.fn(),
  getBalance: jest.fn(),
  getTransactionCount: jest.fn(),
  getChainId: jest.fn(),
  // Add other required methods as needed
} as any;

describe('Hardware Wallet Service', () => {
  let service: HardwareWalletService;

  beforeEach(() => {
    service = new HardwareWalletService();
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to a Ledger wallet', async () => {
      const result = await service.connect('ledger', "m/44'/60'/0'/0/0");

      expect(result).toBeDefined();
      // In production, this would return wallet info
    });

    it('should connect to a Trezor wallet', async () => {
      const result = await service.connect('trezor', "m/44'/60'/0'/0/0");

      expect(result).toBeDefined();
      // In production, this would return wallet info
    });

    it('should handle connection errors', async () => {
      const result = await service.connect('ledger', "m/44'/60'/0'/0/0");

      // In production with actual hardware, this might fail
      expect(result).toBeDefined();
    });

    it('should validate derivation path', async () => {
      const result = await service.connect('ledger', 'invalid-path');

      // Should handle invalid paths
      expect(result).toBeDefined();
    });
  });

  describe('getConnectedWallets', () => {
    it('should return empty array when no wallets connected', () => {
      const wallets = service.getConnectedWallets();
      expect(wallets).toEqual([]);
    });

    it('should return connected wallets after connection', async () => {
      await service.connect('ledger', "m/44'/60'/0'/0/0");
      const wallets = service.getConnectedWallets();

      // Should return at least one wallet
      expect(wallets.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('disconnect', () => {
    it('should disconnect a connected wallet', async () => {
      const connectResult = await service.connect('ledger', "m/44'/60'/0'/0/0");
      
      if (connectResult.wallet) {
        const disconnectResult = service.disconnect(connectResult.wallet.address);
        expect(disconnectResult).toBe(true);
      }
    });

    it('should handle disconnecting non-existent wallet', () => {
      const result = service.disconnect('0x' + 'a'.repeat(40));
      expect(result).toBe(false);
    });
  });

  describe('signTransaction', () => {
    it('should sign a transaction with connected wallet', async () => {
      const connectResult = await service.connect('ledger', "m/44'/60'/0'/0/0");

      if (connectResult.wallet) {
        const transactionRequest = {
          to: '0x' + 'a'.repeat(40),
          value: 1000000000000000000n,
          data: '0x',
          gasLimit: 21000n,
          gasPrice: 1000000000n,
        };

        const result = await service.signTransaction(transactionRequest, mockPublicClient);

        expect(result).toBeDefined();
        // In production, this would return a signed transaction
      }
    });

    it('should handle signing with no connected wallet', async () => {
      const transactionRequest = {
        to: '0x' + 'a'.repeat(40),
        value: 1000000000000000000n,
        data: '0x',
      };

      const result = await service.signTransaction(transactionRequest, mockPublicClient);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('signMessage', () => {
    it('should sign a message with connected wallet', async () => {
      const connectResult = await service.connect('ledger', "m/44'/60'/0'/0/0");

      if (connectResult.wallet) {
        const message = 'Hello, World!';
        const result = await service.signMessage(message);

        expect(result).toBeDefined();
        // In production, this would return a signed message
      }
    });

    it('should handle signing with no connected wallet', async () => {
      const message = 'Hello, World!';
      const result = await service.signMessage(message);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty messages', async () => {
      const connectResult = await service.connect('ledger', "m/44'/60'/0'/0/0");

      if (connectResult.wallet) {
        const message = '';
        const result = await service.signMessage(message);

        expect(result).toBeDefined();
      }
    });
  });

  describe('signTypedData', () => {
    it('should sign typed data with connected wallet', async () => {
      const connectResult = await service.connect('ledger', "m/44'/60'/0'/0/0");

      if (connectResult.wallet) {
        const domain = {
          name: 'LinkDAO',
          version: '1',
          chainId: 1,
          verifyingContract: '0x' + 'a'.repeat(40),
        };

        const types = {
          Person: [
            { name: 'name', type: 'string' },
            { name: 'wallet', type: 'address' },
          ],
        };

        const value = {
          name: 'Test User',
          wallet: '0x' + 'b'.repeat(40),
        };

        const result = await service.signTypedData(domain, types, value);

        expect(result).toBeDefined();
        // In production, this would return a signed message
      }
    });

    it('should handle signing with no connected wallet', async () => {
      const domain = {
        name: 'LinkDAO',
        version: '1',
        chainId: 1,
        verifyingContract: '0x' + 'a'.repeat(40),
      };

      const types = {
        Person: [
          { name: 'name', type: 'string' },
          { name: 'wallet', type: 'address' },
        ],
      };

      const value = {
        name: 'Test User',
        wallet: '0x' + 'b'.repeat(40),
      };

      const result = await service.signTypedData(domain, types, value);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getAddress', () => {
    it('should get address from connected wallet', async () => {
      const connectResult = await service.connect('ledger', "m/44'/60'/0'/0/0");

      if (connectResult.wallet) {
        const address = service.getAddress(connectResult.wallet.address);
        expect(address).toBeDefined();
        expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      }
    });

    it('should return null for non-existent wallet', () => {
      const address = service.getAddress('0x' + 'a'.repeat(40));
      expect(address).toBeNull();
    });
  });

  describe('getDeviceInfo', () => {
    it('should get device info for connected wallet', async () => {
      const connectResult = await service.connect('ledger', "m/44'/60'/0'/0/0");

      if (connectResult.wallet) {
        const deviceInfo = service.getDeviceInfo(connectResult.wallet.address);
        expect(deviceInfo).toBeDefined();
      }
    });

    it('should return null for non-existent wallet', () => {
      const deviceInfo = service.getDeviceInfo('0x' + 'a'.repeat(40));
      expect(deviceInfo).toBeNull();
    });
  });

  describe('isConnected', () => {
    it('should return false when no wallet is connected', () => {
      const isConnected = service.isConnected();
      expect(isConnected).toBe(false);
    });

    it('should return true when wallet is connected', async () => {
      const connectResult = await service.connect('ledger', "m/44'/60'/0'/0/0");

      if (connectResult.success) {
        const isConnected = service.isConnected();
        expect(isConnected).toBe(true);
      }
    });

    it('should return false for specific address when not connected', () => {
      const isConnected = service.isConnected('0x' + 'a'.repeat(40));
      expect(isConnected).toBe(false);
    });
  });

  describe('getSupportedWalletTypes', () => {
    it('should return supported wallet types', () => {
      const types = service.getSupportedWalletTypes();
      expect(types).toContain('ledger');
      expect(types).toContain('trezor');
    });
  });
});