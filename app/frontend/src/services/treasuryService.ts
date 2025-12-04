const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

export interface TreasuryAsset {
    symbol: string;
    name: string;
    balance: number;
    valueUSD: number;
    contractAddress?: string;
}

export interface TreasuryBalance {
    totalValueUSD: number;
    balanceETH: number;
    assets: TreasuryAsset[];
}

export interface TreasuryTransaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    amountUSD: number;
    description: string;
    timestamp: string;
    txHash: string;
    from?: string;
    to?: string;
}

export interface SpendingCategory {
    name: string;
    amount: number;
    percentage: number;
    color: string;
}

export const treasuryService = {
    /**
     * Get treasury balance with asset breakdown
     */
    async getBalance(treasuryAddress?: string): Promise<{ success: boolean; data: TreasuryBalance | null }> {
        try {
            const query = treasuryAddress ? `?treasuryAddress=${treasuryAddress}` : '';
            const res = await fetch(`${API_BASE}/api/treasury/balance${query}`);

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            console.error('Error fetching treasury balance:', error);
            return { success: false, data: null };
        }
    },

    /**
     * Get recent treasury transactions
     */
    async getTransactions(params?: {
        treasuryAddress?: string;
        limit?: number
    }): Promise<{ success: boolean; data: TreasuryTransaction[] }> {
        try {
            const query = new URLSearchParams(params as any).toString();
            const res = await fetch(`${API_BASE}/api/treasury/transactions?${query}`);

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            console.error('Error fetching treasury transactions:', error);
            return { success: false, data: [] };
        }
    },

    /**
     * Get spending categories breakdown
     */
    async getSpendingCategories(treasuryAddress?: string): Promise<{ success: boolean; data: SpendingCategory[] }> {
        try {
            const query = treasuryAddress ? `?treasuryAddress=${treasuryAddress}` : '';
            const res = await fetch(`${API_BASE}/api/treasury/spending-categories${query}`);

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            console.error('Error fetching spending categories:', error);
            return { success: false, data: [] };
        }
    },

    /**
     * Get governance-controlled assets
     */
    async getAssets(treasuryAddress?: string): Promise<{ success: boolean; data: TreasuryAsset[] }> {
        try {
            const query = treasuryAddress ? `?treasuryAddress=${treasuryAddress}` : '';
            const res = await fetch(`${API_BASE}/api/treasury/assets${query}`);

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            console.error('Error fetching treasury assets:', error);
            return { success: false, data: [] };
        }
    },
};
