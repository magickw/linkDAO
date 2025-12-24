/**
 * TokenReactionSystem Component
 * Handles award reactions using LDAO tokens
 * Collapsed by default, expands to show award grid
 */

import React, { useState } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import AwardSelectionModal from './AwardSelectionModal';

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
  const [showAwardGrid, setShowAwardGrid] = useState(false);
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
      alert('Please connect your wallet to award posts');
      return;
    }
    setShowAwardGrid(true);
  };

  const handleAwardSelection = (awardId: string, amount: number) => {
    setShowAwardModal(true);
    // Pass the selected award to the modal
  };

  return (
    <div className="token-reaction-system">
      {/* Collapsed Award Button */}
      {!showAwardGrid && (
        <button
          onClick={handleAwardClick}
          className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium transition-colors duration-200 hover:scale-105"
          title="Award this post"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
          <span className="hidden sm:inline">Award</span>
        </button>
      )}

      {/* Expanded Award Grid */}
      {showAwardGrid && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Award this post</h3>
            <button
              onClick={() => setShowAwardGrid(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Awards Grid */}
          <div className="grid grid-cols-4 gap-3">
            {AWARDS.map((award) => (
              <button
                key={award.id}
                onClick={() => handleAwardSelection(award.id, award.cost)}
                className={`
                  relative p-3 rounded-lg border-2 transition-all hover:scale-105
                  border-gray-200 hover:border-gray-300 hover:bg-gray-50
                  dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-700
                `}
                title={`${award.name} - ${award.cost} gold`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">{award.emoji}</div>
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400">{award.cost}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Leaderboard Progress */}
          {awardsToUnlockLeaderboard > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {awardsToUnlockLeaderboard} more awards to unlock the leaderboard
                </span>
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  {userGoldBalance} gold balance
                </span>
              </div>
              <div className="mt-2 w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((5 - awardsToUnlockLeaderboard) / 5 * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Award Selection Modal */}
      <AwardSelectionModal
        isOpen={showAwardModal}
        onClose={() => {
          setShowAwardModal(false);
        }}
        selectedAward={null}
        onSelectAward={() => {}}
        onConfirm={(awardId, amount) => {
          // Handle award confirmation
          console.log(`Award ${awardId} confirmed with amount ${amount}`);
          setShowAwardModal(false);
          setShowAwardGrid(false);
        }}
        userGoldBalance={userGoldBalance}
        awardsToUnlock={awardsToUnlockLeaderboard}
      />
    </div>
  );
};

export default TokenReactionSystem;