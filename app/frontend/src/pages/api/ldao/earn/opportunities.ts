import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

/**
 * API Route: /api/ldao/earn/opportunities
 * Get available earn opportunities for a user
 */

interface EarnOpportunity {
  id: string;
  title: string;
  description: string;
  reward: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeEstimate: string;
  category: 'social' | 'marketplace' | 'governance' | 'referral';
  requirements?: string[];
  completed: boolean;
  progress?: number;
}

interface ErrorResponse {
  error: string;
}

type ResponseData = EarnOpportunity[] | ErrorResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Address is required' });
  }

  // Validate address format
  if (!ethers.isAddress(address)) {
    return res.status(400).json({ error: 'Invalid Ethereum address' });
  }

  try {
    // In a real implementation, this would:
    // 1. Check database for user's completed opportunities
    // 2. Query blockchain for user's activities
    // 3. Calculate progress for each opportunity

    // For now, return mock data with some dynamic completion status
    const opportunities: EarnOpportunity[] = [
      {
        id: 'profile_setup',
        title: 'Complete Profile Setup',
        description: 'Add profile picture, bio, and social links',
        reward: '50 LDAO',
        difficulty: 'easy',
        timeEstimate: '5 minutes',
        category: 'social',
        requirements: ['Connect wallet', 'Verify email'],
        completed: false, // Would check DB
        progress: 0
      },
      {
        id: 'first_post',
        title: 'Create Your First Post',
        description: 'Share content with the community',
        reward: '25 LDAO',
        difficulty: 'easy',
        timeEstimate: '10 minutes',
        category: 'social',
        completed: false,
        progress: 0
      },
      {
        id: 'governance_vote',
        title: 'Participate in Governance',
        description: 'Vote on active proposals',
        reward: '15 LDAO',
        difficulty: 'medium',
        timeEstimate: '15 minutes',
        category: 'governance',
        requirements: ['Hold minimum 10 LDAO tokens'],
        completed: false,
        progress: 0
      },
      {
        id: 'marketplace_listing',
        title: 'Create Marketplace Listing',
        description: 'List your first item for sale',
        reward: '100 LDAO',
        difficulty: 'medium',
        timeEstimate: '20 minutes',
        category: 'marketplace',
        requirements: ['Complete KYC verification'],
        completed: false,
        progress: 0
      },
      {
        id: 'referral_signup',
        title: 'Refer New Users',
        description: 'Invite friends to join the platform',
        reward: '25 LDAO per referral',
        difficulty: 'easy',
        timeEstimate: '5 minutes',
        category: 'referral',
        completed: false,
        progress: 0
      },
      {
        id: 'daily_engagement',
        title: 'Daily Platform Engagement',
        description: 'Log in and interact daily for a week',
        reward: '5-15 LDAO',
        difficulty: 'easy',
        timeEstimate: '10 minutes per day',
        category: 'social',
        completed: false,
        progress: 0
      }
    ];

    return res.status(200).json(opportunities);
  } catch (error) {
    console.error('Error fetching earn opportunities:', error);
    return res.status(500).json({ error: 'Failed to fetch earn opportunities' });
  }
}
