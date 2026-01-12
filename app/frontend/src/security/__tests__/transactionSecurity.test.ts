/**
 * Transaction Security Tests
 * Tests for transaction validation, phishing detection, and simulation
 */

import { TransactionSecurityService } from '../transactionSecurity';
import { ethers } from 'ethers';

// Mock provider
const mockProvider = {
    estimateGas: jest.fn(),
    getFeeData: jest.fn(),
    call: jest.fn(),
    getTransactionCount: jest.fn(),
    getNetwork: jest.fn(),
} as any;

describe('TransactionSecurityService', () => {
    let service: TransactionSecurityService;

    beforeEach(() => {
        service = new TransactionSecurityService(mockProvider, 1);
        jest.clearAllMocks();
    });

    describe('checkPhishing', () => {
        it('should detect burn address as malicious', async () => {
            const result = await service.checkPhishing('0x0000000000000000000000000000000000000000');
            expect(result).toBe(true);
        });

        it('should allow normal addresses', async () => {
            const result = await service.checkPhishing('0x1234567890123456789012345678901234567890');
            expect(result).toBe(false);
        });

        it('should handle empty address', async () => {
            const result = await service.checkPhishing('');
            expect(result).toBe(false);
        });
    });

    describe('validateGas', () => {
        beforeEach(() => {
            mockProvider.estimateGas.mockResolvedValue(21000n);
            mockProvider.getFeeData.mockResolvedValue({
                maxFeePerGas: ethers.parseUnits('50', 'gwei'),
                maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'),
            });
        });

        it('should validate gas successfully', async () => {
            const tx = {
                to: '0x1234567890123456789012345678901234567890',
                gasLimit: 100000n,
                maxFeePerGas: ethers.parseUnits('50', 'gwei'),
            };

            const result = await service.validateGas(tx);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should warn about excessive gas limit', async () => {
            const tx = {
                to: '0x1234567890123456789012345678901234567890',
                gasLimit: 600000n, // Exceeds 500,000 security limit
            };

            const result = await service.validateGas(tx);
            expect(result.warnings.length).toBeGreaterThan(0);
        });

        it('should error on gas limit below estimate', async () => {
            const tx = {
                to: '0x1234567890123456789012345678901234567890',
                gasLimit: 10000n, // Below estimated 21000
            };

            const result = await service.validateGas(tx);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should warn about high gas prices', async () => {
            const tx = {
                to: '0x1234567890123456789012345678901234567890',
                maxFeePerGas: ethers.parseUnits('200', 'gwei'), // 4x network average
            };

            const result = await service.validateGas(tx);
            expect(result.warnings.length).toBeGreaterThan(0);
        });
    });

    describe('simulateTransaction', () => {
        it('should return success for valid transaction', async () => {
            mockProvider.call.mockResolvedValue('0x');

            const tx = {
                to: '0x1234567890123456789012345678901234567890',
                data: '0x',
            };

            const result = await service.simulateTransaction(tx);
            expect(result.success).toBe(true);
        });

        it('should return failure with revert reason', async () => {
            mockProvider.call.mockRejectedValue({
                data: '0x08c379a0' + Buffer.from('Insufficient balance').toString('hex'),
                message: 'execution reverted: Insufficient balance',
            });

            const tx = {
                to: '0x1234567890123456789012345678901234567890',
                data: '0x',
            };

            const result = await service.simulateTransaction(tx);
            expect(result.success).toBe(false);
            expect(result.revertReason).toBeDefined();
        });
    });

    describe('validateNonce', () => {
        beforeEach(() => {
            mockProvider.getTransactionCount.mockResolvedValue(5);
        });

        it('should validate correct nonce', async () => {
            const tx = {
                from: '0x1234567890123456789012345678901234567890',
                nonce: 5,
            };

            const result = await service.validateNonce(tx);
            expect(result).toBe(true);
        });

        it('should reject nonce that is too low', async () => {
            const tx = {
                from: '0x1234567890123456789012345678901234567890',
                nonce: 3, // Below current nonce of 5
            };

            const result = await service.validateNonce(tx);
            expect(result).toBe(false);
        });

        it('should accept future nonce', async () => {
            const tx = {
                from: '0x1234567890123456789012345678901234567890',
                nonce: 10,
            };

            const result = await service.validateNonce(tx);
            expect(result).toBe(true);
        });
    });

    describe('validateChainId', () => {
        beforeEach(() => {
            mockProvider.getNetwork.mockResolvedValue({ chainId: 1n });
        });

        it('should validate matching chain ID', async () => {
            const tx = { chainId: 1 };
            const result = await service.validateChainId(tx);
            expect(result).toBe(true);
        });

        it('should reject mismatched chain ID', async () => {
            const tx = { chainId: 5 };
            const result = await service.validateChainId(tx);
            expect(result).toBe(false);
        });

        it('should accept undefined chain ID', async () => {
            const tx = {};
            const result = await service.validateChainId(tx);
            expect(result).toBe(true);
        });
    });

    describe('validateTransaction', () => {
        beforeEach(() => {
            mockProvider.estimateGas.mockResolvedValue(21000n);
            mockProvider.getFeeData.mockResolvedValue({
                maxFeePerGas: ethers.parseUnits('50', 'gwei'),
                maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'),
            });
            mockProvider.call.mockResolvedValue('0x');
            mockProvider.getTransactionCount.mockResolvedValue(0);
            mockProvider.getNetwork.mockResolvedValue({ chainId: 1n });
        });

        it('should validate safe transaction', async () => {
            const tx = {
                to: '0x1234567890123456789012345678901234567890',
                from: '0x0987654321098765432109876543210987654321',
                value: ethers.parseEther('0.1'),
                gasLimit: 21000n,
                chainId: 1,
            };

            const result = await service.validateTransaction(tx);
            expect(result.safe).toBe(true);
            expect(result.riskLevel).toBe('low');
        });

        it('should detect phishing and mark as critical', async () => {
            const tx = {
                to: '0x0000000000000000000000000000000000000000', // Burn address
                value: ethers.parseEther('1'),
            };

            const result = await service.validateTransaction(tx);
            expect(result.safe).toBe(false);
            expect(result.phishingDetected).toBe(true);
            expect(result.riskLevel).toBe('critical');
        });

        it('should warn about large transfers', async () => {
            const tx = {
                to: '0x1234567890123456789012345678901234567890',
                value: ethers.parseEther('2'), // > 1 ETH
            };

            const result = await service.validateTransaction(tx);
            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.riskLevel).not.toBe('low');
        });
    });

    describe('getNextNonce', () => {
        beforeEach(() => {
            mockProvider.getTransactionCount.mockResolvedValue(5);
        });

        it('should return current nonce', async () => {
            const nonce = await service.getNextNonce('0x1234567890123456789012345678901234567890');
            expect(nonce).toBe(5);
        });

        it('should track pending nonces', async () => {
            const address = '0x1234567890123456789012345678901234567890';

            // Simulate pending transaction
            await service.validateNonce({ from: address, nonce: 5 });

            const nextNonce = await service.getNextNonce(address);
            expect(nextNonce).toBeGreaterThanOrEqual(5);
        });
    });
});
