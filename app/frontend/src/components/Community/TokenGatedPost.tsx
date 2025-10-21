/**
 * Token-Gated Community Post Component
 * Demonstrates real-world usage of blockchain token-gating
 */

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useTokenGating, useUserTokenBalance, useUserStakedAmount } from '@/hooks/useTokenGating';
import { TokenGatingRequirement } from '@/services/blockchain/communityTokenGating';

interface TokenGatedPostProps {
  postId: string;
  title: string;
  preview: string;
  content: string;
  requirement: TokenGatingRequirement;
  communityName: string;
}

export function TokenGatedPost({
  postId,
  title,
  preview,
  content,
  requirement,
  communityName,
}: TokenGatedPostProps) {
  const { address, isConnected } = useAccount();
  const { hasAccess, loading, error, accessResult } = useTokenGating(requirement);
  const { balance } = useUserTokenBalance();
  const { staked } = useUserStakedAmount();

  const [showConnectPrompt, setShowConnectPrompt] = useState(false);

  // Get requirement description
  const getRequirementDescription = () => {
    switch (requirement.type) {
      case 'token_balance':
        return `Hold ${requirement.minimumBalance} LDAO tokens`;
      case 'staking_amount':
        return `Stake ${requirement.minimumBalance} LDAO tokens`;
      case 'voting_power':
        return `Have ${requirement.minimumBalance} voting power`;
      case 'nft_ownership':
        return requirement.tokenId
          ? `Own NFT #${requirement.tokenId}`
          : 'Own an NFT from this collection';
      default:
        return 'Meet access requirements';
    }
  };

  // Not connected to wallet
  if (!isConnected) {
    return (
      <div className="token-gated-post border rounded-lg p-6 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                🔒 TOKEN GATED
              </span>
              <span className="text-sm text-gray-600">{communityName}</span>
            </div>
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-gray-700 mb-4">{preview}</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>⚡ Requirement:</strong> {getRequirementDescription()}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowConnectPrompt(true)}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Connect Wallet to View
        </button>
      </div>
    );
  }

  // Checking access
  if (loading) {
    return (
      <div className="token-gated-post border rounded-lg p-6 bg-white">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
        <p className="text-center text-gray-600 mt-4">Verifying access...</p>
      </div>
    );
  }

  // Has access - show full content
  if (hasAccess) {
    return (
      <div className="token-gated-post border rounded-lg p-6 bg-white shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
            ✓ VERIFIED ACCESS
          </span>
          <span className="text-sm text-gray-600">{communityName}</span>
        </div>
        <h3 className="text-2xl font-bold mb-3">{title}</h3>
        <div className="prose max-w-none mb-4">
          <p className="text-gray-700">{content}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs text-green-800">
            You have access because: {accessResult?.reason}
          </p>
        </div>
      </div>
    );
  }

  // No access - show locked content with details
  return (
    <div className="token-gated-post border-2 border-red-200 rounded-lg p-6 bg-gradient-to-r from-red-50 to-orange-50">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
              🔒 ACCESS DENIED
            </span>
            <span className="text-sm text-gray-600">{communityName}</span>
          </div>
          <h3 className="text-xl font-bold mb-2">{title}</h3>
          <p className="text-gray-700 mb-4">{preview}</p>
        </div>
      </div>

      {/* Access Requirements */}
      <div className="bg-white border border-red-200 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-red-900 mb-3">Requirements Not Met</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">
              <strong>Required:</strong> {getRequirementDescription()}
            </span>
          </div>
          {accessResult?.reason && (
            <p className="text-sm text-red-600">{accessResult.reason}</p>
          )}
        </div>
      </div>

      {/* User Stats */}
      <div className="bg-white rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-900 mb-3">Your Current Status</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600">Token Balance</p>
            <p className="text-lg font-semibold text-gray-900">{balance} LDAO</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Staked Amount</p>
            <p className="text-lg font-semibold text-gray-900">{staked} LDAO</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {requirement.type === 'token_balance' && (
          <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
            Buy LDAO Tokens
          </button>
        )}
        {requirement.type === 'staking_amount' && (
          <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
            Stake LDAO
          </button>
        )}
        {requirement.type === 'nft_ownership' && (
          <button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
            Get NFT
          </button>
        )}
        <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors">
          Learn More
        </button>
      </div>

      {error && (
        <div className="mt-4 bg-red-100 border border-red-300 rounded-lg p-3">
          <p className="text-sm text-red-800">Error: {error}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Example usage in a community page
 */
export function CommunityPostList({ communityId }: { communityId: string }) {
  const posts = [
    {
      id: '1',
      title: 'Advanced Trading Strategies',
      preview: 'Learn about advanced DeFi trading strategies...',
      content: 'Detailed content about trading strategies, market analysis, and risk management...',
      requirement: {
        type: 'token_balance' as const,
        minimumBalance: '1000',
      },
    },
    {
      id: '2',
      title: 'Exclusive Governance Proposal',
      preview: 'Important proposal for community direction...',
      content: 'Full proposal details with voting instructions and timeline...',
      requirement: {
        type: 'voting_power' as const,
        minimumBalance: '500',
      },
    },
    {
      id: '3',
      title: 'Staker Rewards Program',
      preview: 'Exclusive rewards for long-term stakers...',
      content: 'Details about reward tiers, claiming process, and bonus multipliers...',
      requirement: {
        type: 'staking_amount' as const,
        minimumBalance: '5000',
      },
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-4">Community Posts</h2>
      {posts.map((post) => (
        <TokenGatedPost
          key={post.id}
          postId={post.id}
          title={post.title}
          preview={post.preview}
          content={post.content}
          requirement={post.requirement}
          communityName="DeFi Community"
        />
      ))}
    </div>
  );
}
