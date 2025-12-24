/**
 * TokenReactionSystem Component
 * Handles award reactions using LDAO tokens
 */

import React, { useState } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import AwardPurchaseModal from './AwardPurchaseModal';

interface TokenReactionSystemProps {
  postId: string;
  showAnalytics?: boolean;
  userGoldBalance?: number;
  awardsToUnlockLeaderboard?: number;
}

const TokenReactionSystem: React.FC<TokenReactionSystemProps> = ({
  postId,
  showAnalytics = false,
  userGoldBalance = 0,
  awardsToUnlockLeaderboard = 5
}) => {
  const { address, isConnected } = useWeb3();
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Award emojis and costs (matching reference design)
  const AWARDS = [
    { id: 'rainbow-horn', emoji: '🎺', cost: 15, name: 'Rainbow Horn' },
    { id: 'clap-hands', emoji: '👏', cost: 15, name: 'Clap Hands' },
    { id: 'thumbs-up', emoji: '👍', cost: 15, name: 'Thumbs Up' },
    { id: 'star-eyes', emoji: '🤩', cost: 15, name: 'Star Eyes' },
    { id: 'seal', emoji: '🦭', cost: 15, name: 'Seal' },
    { id: 'cry-face', emoji: '😢', cost: 15, name: 'Cry Face' },
    { id: 'angry-face', emoji: '😠', cost: 15, name: 'Angry Face' },
    { id: 'pray-hands', emoji: '🙏', cost: 15, name: 'Pray Hands' },
    { id: 'laugh-star', emoji: '😄', cost: 15, name: 'Laugh Star' },
    { id: 'snake', emoji: '🐍', cost: 15, name: 'Snake' },
    { id: 'purple-monster', emoji: '💜', cost: 25, name: 'Purple Monster' },
    { id: 'frog-toast', emoji: '🐸', cost: 25, name: 'Frog Toast' },
    { id: 'cry-blue', emoji: '💙', cost: 25, name: 'Cry Blue' },
    { id: 'shell-mouth', emoji: '🐚', cost: 25, name: 'Shell Mouth' },
    { id: 'pink-heart', emoji: '💕', cost: 25, name: 'Pink Heart' },
    { id: 'gold-poop', emoji: '💩', cost: 50, name: 'Gold Poop' },
    { id: 'brain-glow', emoji: '🧠', cost: 50, name: 'Brain Glow' },
    { id: 'pyramid-eye', emoji: '👁️', cost: 50, name: 'Pyramid Eye' },
    { id: 'diamond', emoji: '💎', cost: 50, name: 'Diamond' },
    { id: 'red-demon', emoji: '👹', cost: 50, name: 'Red Demon' },
  ];

  const handleAwardClick = () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet to award this post');
      return;
    }
    setShowAwardModal(true);
  };

  const handleAwardPurchase = async (packageId: string, paymentMethod: 'card' | 'googlePay') => {
    setIsLoading(true);
    try {
      // In real implementation, process payment and add gold to balance
      console.log(`Purchasing package ${packageId} with ${paymentMethod}`);
      
      // Add gold to user balance (mock)
      const packageAmount = {
        'gold-100': 100,
        'gold-200': 200,
        'gold-300': 300
      }[packageId] || 0;
      
      setShowAwardModal(false);
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="token-reaction-system">
      {/* Awards Grid */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Award this post</h3>
        <div className="grid grid-cols-4 gap-3">
          {AWARDS.map((award) => (
            <button
              key={award.id}
              onClick={handleAwardClick}
              className="relative p-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all hover:scale-105"
              title={`${award.name} - ${award.cost} gold`}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">{award.emoji}</div>
                <div className="text-xs font-medium text-gray-600">{award.cost}</div>
                <div className="text-xs text-gray-500">⚙️</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Section */}
      {showAnalytics && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Award Analytics</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Your Gold:</span>
              <span className="ml-2 font-medium">{userGoldBalance}</span>
            </div>
            <div>
              <span className="text-gray-600">To Unlock Leaderboard:</span>
              <span className="ml-2 font-medium">
                {Math.max(0, awardsToUnlockLeaderboard - userGoldBalance)} awards
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Award Purchase Modal */}
      <AwardPurchaseModal
        isOpen={showAwardModal}
        onClose={() => setShowAwardModal(false)}
        onPurchase={handleAwardPurchase}
        currentGoldBalance={userGoldBalance}
        awardsNeeded={Math.max(0, awardsToUnlockLeaderboard - userGoldBalance)}
        totalAwardsToUnlock={awardsToUnlockLeaderboard}
      />
    </div>
  );
};

export default TokenReactionSystem;