import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

/**
 * API Route: /api/ldao/claim-earned
 * Claim earned LDAO tokens from completed activities
 */

interface ClaimRequest {
  address: string;
  opportunityId: string;
  signature?: string; // For verification
}

interface ClaimResponse {
  success: boolean;
  transactionHash?: string;
  ldaoAmount?: string;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ClaimResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { address, opportunityId, signature }: ClaimRequest = req.body;

  // Validation
  if (!address || !opportunityId) {
    return res.status(400).json({
      success: false,
      error: 'Address and opportunityId are required'
    });
  }

  if (!ethers.isAddress(address)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Ethereum address'
    });
  }

  try {
    // In a real implementation, this would:
    // 1. Verify the user completed the opportunity
    // 2. Check they haven't already claimed this reward
    // 3. Verify the signature to prevent abuse
    // 4. Interact with the LDAO token contract to mint/transfer tokens
    // 5. Record the claim in the database
    // 6. Return the transaction hash

    // Define rewards for each opportunity
    const rewards: Record<string, string> = {
      'profile_setup': '50',
      'first_post': '25',
      'governance_vote': '15',
      'marketplace_listing': '100',
      'referral_signup': '25',
      'daily_engagement': '10'
    };

    const rewardAmount = rewards[opportunityId];

    if (!rewardAmount) {
      return res.status(404).json({
        success: false,
        error: 'Invalid opportunity ID'
      });
    }

    // TODO: Implement actual blockchain interaction
    // For now, simulate a successful claim
    // In production, you would:
    //
    // const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    // const wallet = new ethers.Wallet(process.env.TREASURY_PRIVATE_KEY, provider);
    // const ldaoToken = new ethers.Contract(
    //   process.env.LDAO_TOKEN_ADDRESS!,
    //   ['function transfer(address to, uint256 amount) external returns (bool)'],
    //   wallet
    // );
    //
    // const amount = ethers.parseEther(rewardAmount);
    // const tx = await ldaoToken.transfer(address, amount);
    // await tx.wait();
    //
    // // Store claim in database
    // await db.earnedTokenClaims.insert({
    //   address,
    //   opportunityId,
    //   amount: rewardAmount,
    //   transactionHash: tx.hash,
    //   claimedAt: new Date()
    // });

    // Mock response for development
    const mockTxHash = '0x' + ethers.hexlify(ethers.randomBytes(32)).slice(2);

    return res.status(200).json({
      success: true,
      transactionHash: mockTxHash,
      ldaoAmount: rewardAmount,
      message: `Successfully claimed ${rewardAmount} LDAO tokens!`
    });

  } catch (error) {
    console.error('Error claiming earned tokens:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to claim tokens'
    });
  }
}
