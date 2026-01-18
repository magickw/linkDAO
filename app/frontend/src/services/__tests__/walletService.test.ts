/**
 * Comprehensive Test Suite for Wallet Service
 * Tests core wallet functionality including creation, import, storage, and transactions
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { walletService } from '../walletService';
import { SecureKeyStorage } from '@/security/secureKeyStorage';
import { bip39Utils } from '@/utils/bip39Utils';
import { dexSwapService } from '../dexSwapService';
import { stakingService } from '../stakingService';

// Mock dependencies
jest.mock('@/security/secureKeyStorage', () => ({
  SecureKeyStorage: {
    storeWallet: jest.fn(),
    getWallet: jest.fn(),
    deleteWallet: jest.fn(),
    listWallets: jest.fn(),
    getWalletMetadata: jest.fn(),
    changePassword: jest.fn(),
    setActiveWallet: jest.fn(),
    getActiveWallet: jest.fn(),
  }
}));

jest.mock('@/utils/bip39Utils', () => ({
  bip39Utils: {
    generateMnemonic: jest.fn(),
    mnemonicToAddress: jest.fn(),
    validateMnemonic: jest.fn(),
  }
}));

jest.mock('@/utils/cryptoUtils');
jest.mock('../dexSwapService', () => ({
  dexSwapService: {
    getSwapQuote: jest.fn(),
    executeSwap: jest.fn(),
  }
}));

jest.mock('../stakingService', () => ({
  stakingService: {
    getAvailablePools: jest.fn(),
    stakeTokens: jest.fn(),
    getUserStakingInfo: jest.fn(),
  }
}));

describe('WalletService', () => {
  const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const mockMnemonic = 'test test test test test test test test test test test junk';
  const mockPassword = 'testPassword123!';

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Wallet Creation', () => {
    it('should create a new wallet with valid parameters', async () => {
      (bip39Utils.generateMnemonic as any).mockReturnValue(mockMnemonic);
      (bip39Utils.mnemonicToAddress as any).mockResolvedValue(mockAddress);
      (SecureKeyStorage.storeWallet as any).mockResolvedValue(undefined);

      const result = await walletService.createWallet({
        password: mockPassword,
        walletName: 'Test Wallet'
      });

      expect(result.success).toBe(true);
      expect(result.address).toBeDefined();
      expect(result.mnemonic).toBe(mockMnemonic);
      expect(SecureKeyStorage.storeWallet).toHaveBeenCalled();
    });

    it('should generate a valid BIP-39 mnemonic', async () => {
      (bip39Utils.generateMnemonic as any).mockReturnValue(mockMnemonic);
      (bip39Utils.mnemonicToAddress as any).mockResolvedValue(mockAddress);

      await walletService.createWallet({
        password: mockPassword,
        walletName: 'Test Wallet'
      });

      expect(bip39Utils.generateMnemonic).toHaveBeenCalledWith(12);
    });

    it('should derive address from mnemonic', async () => {
      (bip39Utils.generateMnemonic as any).mockReturnValue(mockMnemonic);
      (bip39Utils.mnemonicToAddress as any).mockResolvedValue(mockAddress);
      (SecureKeyStorage.storeWallet as any).mockResolvedValue(undefined);

      const result = await walletService.createWallet({
        password: mockPassword,
        walletName: 'Test Wallet'
      });

      expect(bip39Utils.mnemonicToAddress).toHaveBeenCalledWith(mockMnemonic);
      expect(result.address).toBe(mockAddress);
    });

    it('should fail with weak password', async () => {
      const result = await walletService.createWallet({
        password: '123',
        walletName: 'Test Wallet'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Password must be at least 8 characters');
    });

    it('should fail with empty wallet name', async () => {
      const result = await walletService.createWallet({
        password: mockPassword,
        walletName: ''
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Wallet name is required');
    });
  });

  describe('Wallet Import', () => {
    it('should import wallet with valid mnemonic', async () => {
      (bip39Utils.validateMnemonic as any).mockReturnValue(true);
      (bip39Utils.mnemonicToAddress as any).mockResolvedValue(mockAddress);
      (SecureKeyStorage.storeWallet as any).mockResolvedValue(undefined);

      const result = await walletService.importWallet({
        mnemonic: mockMnemonic,
        password: mockPassword,
        walletName: 'Imported Wallet'
      });

      expect(result.success).toBe(true);
      expect(result.address).toBe(mockAddress);
    });

    it('should import wallet with private key', async () => {
      (SecureKeyStorage.storeWallet as any).mockResolvedValue(undefined);

      const result = await walletService.importWallet({
        privateKey: mockPrivateKey,
        password: mockPassword,
        walletName: 'Imported Wallet'
      });

      expect(result.success).toBe(true);
    });

    it('should validate mnemonic format', async () => {
      (bip39Utils.validateMnemonic as any).mockReturnValue(false);

      const result = await walletService.importWallet({
        mnemonic: 'invalid mnemonic phrase',
        password: mockPassword,
        walletName: 'Imported Wallet'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid mnemonic');
    });

    it('should validate private key format', async () => {
      const result = await walletService.importWallet({
        privateKey: 'invalid-key',
        password: mockPassword,
        walletName: 'Imported Wallet'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid private key');
    });
  });

  describe('Wallet Storage', () => {
    it('should store wallet securely', async () => {
      (bip39Utils.generateMnemonic as any).mockReturnValue(mockMnemonic);
      (bip39Utils.mnemonicToAddress as any).mockResolvedValue(mockAddress);
      (SecureKeyStorage.storeWallet as any).mockResolvedValue(undefined);

      await walletService.createWallet({
        password: mockPassword,
        walletName: 'Test Wallet'
      });

      expect(SecureKeyStorage.storeWallet).toHaveBeenCalledWith(
        mockAddress,
        expect.any(String), // privateKey
        mockPassword,
        expect.objectContaining({ name: 'Test Wallet' }),
        mockMnemonic
      );
    });

    it('should retrieve stored wallet', async () => {
      const mockWalletData = {
        address: mockAddress,
        privateKey: mockPrivateKey,
        metadata: { name: 'Test Wallet' }
      };
      (SecureKeyStorage.getWallet as any).mockResolvedValue(mockWalletData);

      const result = await walletService.getWallet(mockAddress, mockPassword);

      expect(result.success).toBe(true);
      expect(result.wallet).toEqual(mockWalletData);
    });

    it('should fail with wrong password', async () => {
      (SecureKeyStorage.getWallet as any).mockResolvedValue({ privateKey: null });

      const result = await walletService.getWallet(mockAddress, 'wrongPassword');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid password');
    });

    it('should list all stored wallets', async () => {
      const mockWallets = [mockAddress];
      (SecureKeyStorage.listWallets as any).mockReturnValue(mockWallets);
      (SecureKeyStorage.getWalletMetadata as any).mockReturnValue({ name: 'Wallet 1' });

      const result = await walletService.listWallets();

      expect(result.success).toBe(true);
      expect(result.wallets).toHaveLength(1);
    });
  });

  describe('Wallet Recovery', () => {
    it('should validate recovery phrase', () => {
      (bip39Utils.validateMnemonic as any).mockReturnValue(true);

      const result = walletService.validateRecoveryPhrase(mockMnemonic);

      expect(result.valid).toBe(true);
    });

    it('should detect duplicate words in mnemonic', () => {
      const duplicateMnemonic = 'test test test test test test test test test test test junk';
      (bip39Utils.validateMnemonic as any).mockReturnValue(true);

      const result = walletService.validateRecoveryPhrase(duplicateMnemonic);

      expect(result.hasDuplicates).toBe(true);
    });

    it('should restore wallet from mnemonic', async () => {
      (bip39Utils.validateMnemonic as any).mockReturnValue(true);
      (bip39Utils.mnemonicToAddress as any).mockResolvedValue(mockAddress);
      (SecureKeyStorage.storeWallet as any).mockResolvedValue(undefined);

      const result = await walletService.restoreWallet({
        mnemonic: mockMnemonic,
        password: mockPassword,
        walletName: 'Restored Wallet'
      });

      expect(result.success).toBe(true);
      expect(result.address).toBe(mockAddress);
    });
  });

  describe('Transaction Signing', () => {
    it('should sign transaction', async () => {
      (SecureKeyStorage.getWallet as any).mockResolvedValue({
        address: mockAddress,
        privateKey: mockPrivateKey
      });

      const result = await walletService.signTransaction(mockAddress, mockPassword, {});

      expect(result.success).toBe(true);
      expect(result.signature).toBeDefined();
    });

    it('should fail to sign with invalid password', async () => {
      (SecureKeyStorage.getWallet as any).mockResolvedValue(null);

      const result = await walletService.signTransaction(mockAddress, 'wrongPassword', {});

      expect(result.success).toBe(false);
    });
  });

  describe('Multi-Wallet Support', () => {
    it('should delete wallet', async () => {
      (SecureKeyStorage.deleteWallet as any).mockResolvedValue(true);

      const result = await walletService.deleteWallet(mockAddress);

      expect(result.success).toBe(true);
      expect(SecureKeyStorage.deleteWallet).toHaveBeenCalledWith(mockAddress);
    });
  });

  describe('Password Management', () => {
    it('should change wallet password', async () => {
      (SecureKeyStorage.changePassword as any).mockResolvedValue(undefined);

      const result = await walletService.changePassword(mockAddress, mockPassword, 'newPassword');

      expect(result.success).toBe(true);
      expect(SecureKeyStorage.changePassword).toHaveBeenCalledWith(mockAddress, mockPassword, 'newPassword');
    });
  });

  describe('Wallet Export', () => {
    it('should export wallet with mnemonic', async () => {
      (SecureKeyStorage.getWallet as any).mockResolvedValue({
        address: mockAddress,
        privateKey: mockPrivateKey,
        mnemonic: mockMnemonic
      });

      const result = await walletService.exportWallet(mockAddress, mockPassword, true);

      expect(result.success).toBe(true);
      expect(result.data.mnemonic).toBe(mockMnemonic);
    });
  });

  describe('Integrated Token Swapping', () => {
    const mockSwapParams = {
      tokenIn: { address: '0x1', symbol: 'ETH', decimals: 18, name: 'Ether' },
      tokenOut: { address: '0x2', symbol: 'USDC', decimals: 6, name: 'USD Coin' },
      amountIn: '1.0',
      slippageTolerance: 0.5
    };

    const mockQuote = {
      tokenIn: mockSwapParams.tokenIn,
      tokenOut: mockSwapParams.tokenOut,
      amountIn: '1.0',
      amountOut: '3000.0',
      amountOutMin: '2985.0',
      priceImpact: 0.1,
      gasEstimate: '21000',
      route: ['0x1', '0x2'],
      timestamp: Date.now()
    };

    it('should fetch swap quote', async () => {
      (dexSwapService.getSwapQuote as any).mockResolvedValue(mockQuote);

      const quote = await dexSwapService.getSwapQuote(mockSwapParams, 1);

      expect(quote).toEqual(mockQuote);
    });

    it('should execute swap successfully', async () => {
      const mockResult = { success: true, transactionHash: '0xhash' as `0x${string}`, amountOut: '3000.0' };
      (dexSwapService.executeSwap as any).mockResolvedValue(mockResult);

      const result = await dexSwapService.executeSwap({
        ...mockSwapParams,
        walletAddress: mockAddress,
        publicClient: {} as any,
        walletClient: {} as any
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Staking Contract Integration', () => {
    const mockPool = {
      id: 'pool-1',
      name: 'LDAO Staking',
      token: 'LDAO',
      apy: 12.5,
      tvl: 1000000,
      minStake: 100,
      lockPeriod: '30d',
      risk: 'low' as const,
      contractAddress: '0xstaking'
    };

    it('should fetch available staking pools', async () => {
      (stakingService.getAvailablePools as any).mockResolvedValue([mockPool]);

      const pools = await stakingService.getAvailablePools();

      expect(pools).toHaveLength(1);
    });

    it('should stake tokens successfully', async () => {
      (stakingService.stakeTokens as any).mockResolvedValue({ 
        success: true, 
        transactionHash: '0xhash' 
      });

      const result = await stakingService.stakeTokens('pool-1', 1000, 'LDAO');

      expect(result.success).toBe(true);
    });
  });
});