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
  limit: number;
  offset: number;
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

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/transactions?address=${address}&offset=${offsetNum}&limit=${limitNum}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.API_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }

    const data = await response.json();
    const transactions = data.transactions;
    
    // Use data.total if available from the API for proper pagination
    // Don't use transactions.length as it only represents current page count
    const total = data.total !== undefined ? data.total : 0;

    // Return fetched transactions with correct pagination metadata
    return res.status(200).json({
      transactions: Array.isArray(transactions) ? transactions : [],
      total: total,
      limit: limitNum,
      offset: offsetNum
    });

  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
}
