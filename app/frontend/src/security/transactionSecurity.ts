/**
 * Transaction Security Service
 * Provides comprehensive transaction validation, phishing detection, and simulation
 */

import { ethers } from 'ethers';
import { SecureString } from './SecureString';

// Known malicious addresses (example list - should be maintained separately)
const KNOWN_MALICIOUS_ADDRESSES = new Set([
    '0x0000000000000000000000000000000000000000', // Burn address
    // Add more known malicious addresses from threat intelligence feeds
]);

// Trusted contract addresses (whitelist)
const TRUSTED_CONTRACTS = new Set([
    // Add known safe contracts (e.g., Uniswap, USDC, etc.)
]);

export interface GasValidationResult {
    valid: boolean;
    warnings: string[];
    errors: string[];
    estimatedGas?: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
    totalCost?: bigint;
}

export interface SimulationResult {
    success: boolean;
    revertReason?: string;
    stateChanges: StateChange[];
    events: EventLog[];
    gasUsed?: bigint;
}

export interface StateChange {
    address: string;
    slot: string;
    oldValue: string;
    newValue: string;
}

export interface EventLog {
    address: string;
    topics: string[];
    data: string;
    decoded?: {
        name: string;
        args: any[];
    };
}

export interface TransactionSecurityResult {
    safe: boolean;
    warnings: string[];
    errors: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    gasEstimate?: bigint;
    simulationResult?: SimulationResult;
    phishingDetected: boolean;
    recommendations: string[];
}

export interface TransactionRequest {
    to?: string;
    from?: string;
    data?: string;
    value?: bigint;
    gasLimit?: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
    nonce?: number;
    chainId?: number;
}

export class TransactionSecurityService {
    private provider: ethers.Provider;
    private chainId: number;
    private nonceTracker: Map<string, number> = new Map();

    constructor(provider: ethers.Provider, chainId: number) {
        this.provider = provider;
        this.chainId = chainId;
    }

    /**
     * Comprehensive transaction validation
     */
    async validateTransaction(tx: TransactionRequest): Promise<TransactionSecurityResult> {
        const warnings: string[] = [];
        const errors: string[] = [];
        const recommendations: string[] = [];
        let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

        // 1. Check for phishing
        const phishingDetected = await this.checkPhishing(tx.to || '');
        if (phishingDetected) {
            errors.push('This address is known to be malicious');
            riskLevel = 'critical';
            recommendations.push('DO NOT proceed with this transaction');
        }

        // 2. Validate gas parameters
        const gasValidation = await this.validateGas(tx);
        warnings.push(...gasValidation.warnings);
        errors.push(...gasValidation.errors);

        if (gasValidation.warnings.length > 0) {
            riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
        }

        // 3. Validate nonce
        if (tx.from) {
            const nonceValid = await this.validateNonce(tx);
            if (!nonceValid) {
                errors.push('Invalid nonce - transaction may fail or be delayed');
                riskLevel = 'high';
            }
        }

        // 4. Validate chain ID
        const chainIdValid = await this.validateChainId(tx);
        if (!chainIdValid) {
            errors.push('Chain ID mismatch - this could be a replay attack');
            riskLevel = 'critical';
        }

        // 5. Check for large value transfers
        if (tx.value && tx.value > ethers.parseEther('1')) {
            warnings.push(`Large transfer: ${ethers.formatEther(tx.value)} ETH`);
            recommendations.push('Double-check the recipient address');
            riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
        }

        // 6. Check for unknown contracts
        if (tx.to && tx.data && tx.data !== '0x') {
            const isKnownContract = TRUSTED_CONTRACTS.has(tx.to.toLowerCase());
            if (!isKnownContract) {
                warnings.push('Interacting with unverified contract');
                recommendations.push('Verify the contract source code before proceeding');
                riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
            }
        }

        // 7. Simulate transaction
        let simulationResult: SimulationResult | undefined;
        try {
            simulationResult = await this.simulateTransaction(tx);
            if (!simulationResult.success) {
                errors.push(`Transaction will fail: ${simulationResult.revertReason || 'Unknown reason'}`);
                riskLevel = 'high';
            }
        } catch (error) {
            warnings.push('Unable to simulate transaction');
        }

        const safe = errors.length === 0 && !phishingDetected;

        return {
            safe,
            warnings,
            errors,
            riskLevel,
            gasEstimate: gasValidation.estimatedGas,
            simulationResult,
            phishingDetected,
            recommendations,
        };
    }

    /**
     * Check if address is known to be malicious
     */
    async checkPhishing(address: string): Promise<boolean> {
        if (!address) return false;

        const normalizedAddress = address.toLowerCase();

        // Check against known malicious addresses
        if (KNOWN_MALICIOUS_ADDRESSES.has(normalizedAddress)) {
            return true;
        }

        // Check for address similarity to known contracts (typosquatting)
        const similarityThreshold = 0.8;
        for (const trustedAddress of TRUSTED_CONTRACTS) {
            const similarity = this.calculateAddressSimilarity(normalizedAddress, trustedAddress);
            if (similarity > similarityThreshold && normalizedAddress !== trustedAddress) {
                return true; // Potential typosquatting
            }
        }

        // TODO: Check against external threat intelligence APIs
        // e.g., Chainabuse, Etherscan labels, etc.

        return false;
    }

    /**
     * Validate gas parameters
     */
    async validateGas(tx: TransactionRequest): Promise<GasValidationResult> {
        const warnings: string[] = [];
        const errors: string[] = [];

        try {
            // Estimate gas
            const estimatedGas = await this.provider.estimateGas({
                to: tx.to,
                from: tx.from,
                data: tx.data,
                value: tx.value,
            });

            // Check gas limit
            const MAX_GAS_LIMIT = 500000n; // Security limit
            const NETWORK_MAX_GAS = 16777215n; // Network limit

            if (tx.gasLimit) {
                if (tx.gasLimit > NETWORK_MAX_GAS) {
                    errors.push(`Gas limit exceeds network maximum (${NETWORK_MAX_GAS})`);
                } else if (tx.gasLimit > MAX_GAS_LIMIT) {
                    warnings.push(`Gas limit (${tx.gasLimit}) exceeds recommended maximum (${MAX_GAS_LIMIT})`);
                } else if (tx.gasLimit < estimatedGas) {
                    errors.push(`Gas limit (${tx.gasLimit}) is below estimated gas (${estimatedGas})`);
                }
            }

            // Get current gas prices
            const feeData = await this.provider.getFeeData();

            let maxFeePerGas = tx.maxFeePerGas;
            let maxPriorityFeePerGas = tx.maxPriorityFeePerGas;

            // EIP-1559 validation
            if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
                if (!maxFeePerGas) {
                    maxFeePerGas = feeData.maxFeePerGas;
                }
                if (!maxPriorityFeePerGas) {
                    maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
                }

                // Check if fees are reasonable
                const avgMaxFee = feeData.maxFeePerGas;
                if (maxFeePerGas > avgMaxFee * 2n) {
                    warnings.push('Gas price is significantly higher than network average');
                }

                // Calculate total cost
                const totalCost = (tx.gasLimit || estimatedGas) * maxFeePerGas;
                if (totalCost > ethers.parseEther('0.1')) {
                    warnings.push(`High gas cost: ${ethers.formatEther(totalCost)} ETH`);
                }
            }

            return {
                valid: errors.length === 0,
                warnings,
                errors,
                estimatedGas,
                maxFeePerGas,
                maxPriorityFeePerGas,
                totalCost: (tx.gasLimit || estimatedGas) * (maxFeePerGas || 0n),
            };
        } catch (error) {
            errors.push(`Gas estimation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return {
                valid: false,
                warnings,
                errors,
            };
        }
    }

    /**
     * Simulate transaction before signing
     */
    async simulateTransaction(tx: TransactionRequest): Promise<SimulationResult> {
        try {
            // Use eth_call to simulate the transaction
            const result = await this.provider.call({
                to: tx.to,
                from: tx.from,
                data: tx.data,
                value: tx.value,
            });

            // TODO: Parse state changes and events from trace
            // This would require access to debug_traceCall or similar

            return {
                success: true,
                stateChanges: [],
                events: [],
            };
        } catch (error: any) {
            // Extract revert reason if available
            let revertReason: string | undefined;

            if (error.data) {
                try {
                    // Try to decode revert reason
                    const reason = ethers.toUtf8String('0x' + error.data.slice(138));
                    revertReason = reason;
                } catch {
                    revertReason = error.message;
                }
            } else {
                revertReason = error.message;
            }

            return {
                success: false,
                revertReason,
                stateChanges: [],
                events: [],
            };
        }
    }

    /**
     * Validate and manage nonce
     */
    async validateNonce(tx: TransactionRequest): Promise<boolean> {
        if (!tx.from) return false;

        try {
            const currentNonce = await this.provider.getTransactionCount(tx.from, 'pending');

            // Track nonce for this address
            const trackedNonce = this.nonceTracker.get(tx.from.toLowerCase());

            if (tx.nonce !== undefined) {
                // Check if nonce is valid
                if (tx.nonce < currentNonce) {
                    return false; // Nonce too low (already used)
                }

                if (trackedNonce !== undefined && tx.nonce < trackedNonce) {
                    return false; // Nonce conflict with pending transaction
                }

                // Update tracked nonce
                this.nonceTracker.set(tx.from.toLowerCase(), tx.nonce + 1);
                return true;
            }

            return true;
        } catch (error) {
            console.error('Nonce validation error:', error);
            return false;
        }
    }

    /**
     * Validate chain ID to prevent replay attacks
     */
    async validateChainId(tx: TransactionRequest): Promise<boolean> {
        if (tx.chainId === undefined) return true; // No chain ID specified

        try {
            const network = await this.provider.getNetwork();
            return tx.chainId === Number(network.chainId);
        } catch (error) {
            console.error('Chain ID validation error:', error);
            return false;
        }
    }

    /**
     * Calculate similarity between two addresses (for typosquatting detection)
     */
    private calculateAddressSimilarity(addr1: string, addr2: string): number {
        if (addr1.length !== addr2.length) return 0;

        let matches = 0;
        for (let i = 0; i < addr1.length; i++) {
            if (addr1[i] === addr2[i]) matches++;
        }

        return matches / addr1.length;
    }

    /**
     * Clear nonce tracker for an address
     */
    clearNonceTracker(address: string): void {
        this.nonceTracker.delete(address.toLowerCase());
    }

    /**
     * Get next nonce for an address
     */
    async getNextNonce(address: string): Promise<number> {
        const currentNonce = await this.provider.getTransactionCount(address, 'pending');
        const trackedNonce = this.nonceTracker.get(address.toLowerCase());

        return Math.max(currentNonce, trackedNonce || 0);
    }
}
