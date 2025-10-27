import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

/**
 * API Route: /api/ldao/transactions
 * Get transaction history for LDAO token purchases
 */

interface Transaction {
  id: string;
  hash: string;
  type: 'purchase' | 'claim' | 'stake' | 'unstake';
  amount: string;
  usdValue: string;
  paymentMethod: 'ETH' | 'USDC' | 'Card' | 'Earned';
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
  blockNumber?: number;
  from: string;
  to: string;
}

interface TransactionHistoryResponse {
  transactions: Transaction[];
  total: number;
}

interface ErrorResponse {
  error: string;
}

type ResponseData = TransactionHistoryResponse | ErrorResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, limit = '10', offset = '0' } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Address is required' });
  }

  if (!ethers.utils.isAddress(address)) {
    return res.status(400).json({ error: 'Invalid Ethereum address' });
  }

  const limitNum = parseInt(limit as string);
  const offsetNum = parseInt(offset as string);

  try {
    // In a real implementation, this would:
    // 1. Query database for user's LDAO transactions
    // 2. Query blockchain for on-chain events
    // 3. Merge and sort by timestamp
    // 4. Apply pagination
    // 5. Return enriched transaction data

    // Mock data for development
    const mockTransactions: Transaction[] = [
      {
        id: '1',
        hash: '0x' + ethers.utils.hexlify(ethers.utils.randomBytes(32)).slice(2),
        type: 'purchase',
        amount: '1000',
        usdValue: '10.00',
        paymentMethod: 'ETH',
        status: 'confirmed',
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        blockNumber: 4500000,
        from: address,
        to: process.env.NEXT_PUBLIC_LDAO_TREASURY_ADDRESS || '0x0000000000000000000000000000000000000000'
      },
      {
        id: '2',
        hash: '0x' + ethers.utils.hexlify(ethers.utils.randomBytes(32)).slice(2),
        type: 'claim',
        amount: '50',
        usdValue: '0.50',
        paymentMethod: 'Earned',
        status: 'confirmed',
        timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        blockNumber: 4498000,
        from: process.env.NEXT_PUBLIC_LDAO_TREASURY_ADDRESS || '0x0000000000000000000000000000000000000000',
        to: address
      },
      {
        id: '3',
        hash: '0x' + ethers.utils.hexlify(ethers.utils.randomBytes(32)).slice(2),
        type: 'purchase',
        amount: '500',
        usdValue: '5.00',
        paymentMethod: 'USDC',
        status: 'confirmed',
        timestamp: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        blockNumber: 4495000,
        from: address,
        to: process.env.NEXT_PUBLIC_LDAO_TREASURY_ADDRESS || '0x0000000000000000000000000000000000000000'
      }
    ];

    // Apply pagination
    const paginatedTransactions = mockTransactions.slice(offsetNum, offsetNum + limitNum);

    return res.status(200).json({
      transactions: paginatedTransactions,
      total: mockTransactions.length
    });

  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
}
