import { ethers } from 'ethers';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';

interface TreasuryBalance {
    totalValueUSD: number;
    balanceETH: number;
    assets: Array<{
        symbol: string;
        name: string;
        balance: number;
        valueUSD: number;
        contractAddress?: string;
    }>;
}

interface TreasuryTransaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    amountUSD: number;
    description: string;
    timestamp: Date;
    txHash: string;
    from?: string;
    to?: string;
}

interface SpendingCategory {
    name: string;
    amount: number;
    percentage: number;
    color: string;
}

export class TreasuryService {
    private provider: ethers.JsonRpcProvider;
    private readonly SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/YOUR-PROJECT-ID';
    private readonly TREASURY_ADDRESS = '0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5'; // EnhancedLDAOTreasury
    private readonly LDAO_TOKEN_ADDRESS = '0xc9F690B45e33ca909bB9ab97836091673232611B';

    constructor() {
        this.provider = new ethers.JsonRpcProvider(this.SEPOLIA_RPC);
    }

    /**
     * Get treasury balance from on-chain data
     */
    async getTreasuryBalance(treasuryAddress?: string): Promise<TreasuryBalance> {
        const address = treasuryAddress || this.TREASURY_ADDRESS;

        try {
            // Get ETH balance
            const ethBalance = await this.provider.getBalance(address);
            const ethBalanceFormatted = parseFloat(ethers.formatEther(ethBalance));

            // Mock ETH price for now (in production, fetch from price oracle)
            const ethPriceUSD = 3000;
            const ethValueUSD = ethBalanceFormatted * ethPriceUSD;

            // Get token balances (LDAO and other ERC20 tokens)
            const tokenBalances = await this.getTokenBalances(address);

            // Calculate total value
            const totalValueUSD = ethValueUSD + tokenBalances.reduce((sum, token) => sum + token.valueUSD, 0);

            return {
                totalValueUSD,
                balanceETH: ethBalanceFormatted,
                assets: [
                    {
                        symbol: 'ETH',
                        name: 'Ethereum',
                        balance: ethBalanceFormatted,
                        valueUSD: ethValueUSD,
                    },
                    ...tokenBalances,
                ],
            };
        } catch (error) {
            safeLogger.error('Error fetching treasury balance:', error);
            return this.getMockTreasuryBalance();
        }
    }

    /**
     * Get token balances for treasury address
     */
    private async getTokenBalances(treasuryAddress: string) {
        try {
            // ERC20 ABI for balanceOf
            const erc20Abi = [
                'function balanceOf(address owner) view returns (uint256)',
                'function decimals() view returns (uint8)',
                'function symbol() view returns (string)',
                'function name() view returns (string)',
            ];

            // List of tokens to check
            const tokens = [
                { address: this.LDAO_TOKEN_ADDRESS, priceUSD: 0.5 }, // Mock price
                // Add more tokens as needed
            ];

            const balances = [];

            for (const token of tokens) {
                try {
                    const contract = new ethers.Contract(token.address, erc20Abi, this.provider);

                    const [balance, decimals, symbol, name] = await Promise.all([
                        contract.balanceOf(treasuryAddress),
                        contract.decimals(),
                        contract.symbol(),
                        contract.name(),
                    ]);

                    const balanceFormatted = parseFloat(ethers.formatUnits(balance, decimals));
                    const valueUSD = balanceFormatted * token.priceUSD;

                    if (balanceFormatted > 0) {
                        balances.push({
                            symbol,
                            name,
                            balance: balanceFormatted,
                            valueUSD,
                            contractAddress: token.address,
                        });
                    }
                } catch (tokenError) {
                    safeLogger.warn(`Error fetching balance for token ${token.address}:`, tokenError);
                }
            }

            return balances;
        } catch (error) {
            safeLogger.error('Error fetching token balances:', error);
            return [];
        }
    }

    /**
   * Get recent treasury transactions
   */
    async getRecentTransactions(treasuryAddress?: string, limit: number = 10): Promise<TreasuryTransaction[]> {
        const address = treasuryAddress || this.TREASURY_ADDRESS;

        try {
            // Get recent transactions from blockchain using block scanning
            const currentBlock = await this.provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 1000); // Last ~1k blocks (more realistic)

            // Get logs for transfers to/from the treasury
            const filter = {
                fromBlock,
                toBlock: currentBlock,
                topics: [
                    // Transfer event signature
                    ethers.id('Transfer(address,address,uint256)'),
                ],
            };

            const logs = await this.provider.getLogs(filter);
            const transactions: TreasuryTransaction[] = [];

            // Process logs to find transactions involving the treasury
            for (const log of logs.slice(0, limit)) {
                try {
                    const tx = await this.provider.getTransaction(log.transactionHash);
                    if (!tx) continue;

                    const block = await this.provider.getBlock(log.blockNumber);
                    if (!block) continue;

                    const isIncoming = tx.to?.toLowerCase() === address.toLowerCase();
                    const amount = parseFloat(ethers.formatEther(tx.value || 0));

                    if (amount > 0) {
                        transactions.push({
                            id: tx.hash,
                            type: isIncoming ? 'income' : 'expense',
                            amount,
                            amountUSD: amount * 3000, // Mock ETH price
                            description: isIncoming ? 'Incoming Transfer' : 'Outgoing Transfer',
                            timestamp: new Date(block.timestamp * 1000),
                            txHash: tx.hash,
                            from: tx.from,
                            to: tx.to || undefined,
                        });
                    }
                } catch (txError) {
                    safeLogger.warn('Error processing transaction:', txError);
                    continue;
                }
            }

            // If no transactions found, return mock data
            if (transactions.length === 0) {
                return this.getMockTransactions();
            }

            return transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
        } catch (error) {
            safeLogger.error('Error fetching treasury transactions:', error);
            return this.getMockTransactions();
        }
    }

    /**
     * Get spending categories
     */
    async getSpendingCategories(treasuryAddress?: string): Promise<SpendingCategory[]> {
        // This would require analyzing transaction data and categorizing
        // For now, return mock data
        return [
            { name: 'Development', amount: 45000, percentage: 45, color: '#3b82f6' },
            { name: 'Marketing', amount: 25000, percentage: 25, color: '#8b5cf6' },
            { name: 'Operations', amount: 20000, percentage: 20, color: '#10b981' },
            { name: 'Community', amount: 10000, percentage: 10, color: '#f59e0b' },
        ];
    }

    /**
     * Get governance-controlled assets
     */
    async getGovernanceAssets(treasuryAddress?: string): Promise<TreasuryBalance['assets']> {
        const balance = await this.getTreasuryBalance(treasuryAddress);
        return balance.assets;
    }

    // Mock data methods

    private getMockTreasuryBalance(): TreasuryBalance {
        return {
            totalValueUSD: 1234567.89,
            balanceETH: 456.78,
            assets: [
                {
                    symbol: 'ETH',
                    name: 'Ethereum',
                    balance: 456.78,
                    valueUSD: 912345.67,
                },
                {
                    symbol: 'USDC',
                    name: 'USD Coin',
                    balance: 250000,
                    valueUSD: 250000,
                    contractAddress: '0xA0b86a33E6441c8C06DD2b7c94b7E0e8c0c8c8c8',
                },
                {
                    symbol: 'LDAO',
                    name: 'LinkDAO Token',
                    balance: 144444.44,
                    valueUSD: 72222.22,
                    contractAddress: this.LDAO_TOKEN_ADDRESS,
                },
            ],
        };
    }

    private getMockTransactions(): TreasuryTransaction[] {
        return [
            {
                id: '1',
                type: 'expense',
                amount: 5,
                amountUSD: 5000,
                description: 'Development Grant',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                txHash: '0xabcd...1234',
                from: this.TREASURY_ADDRESS,
                to: '0x1234...5678',
            },
            {
                id: '2',
                type: 'income',
                amount: 15,
                amountUSD: 15000,
                description: 'Protocol Revenue',
                timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
                txHash: '0xefgh...5678',
                from: '0x9876...5432',
                to: this.TREASURY_ADDRESS,
            },
            {
                id: '3',
                type: 'expense',
                amount: 3.5,
                amountUSD: 3500,
                description: 'Marketing Campaign',
                timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
                txHash: '0xijkl...9012',
                from: this.TREASURY_ADDRESS,
                to: '0x2345...6789',
            },
        ];
    }
}

export const treasuryService = new TreasuryService();
