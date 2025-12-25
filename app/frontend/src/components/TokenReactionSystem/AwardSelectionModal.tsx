/**
 * Award Selection Modal Component
 * Shows available awards with costs and triggers purchase flow
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import ErrorBoundary from '@/components/ErrorBoundary';
import GoldPurchaseModal from './GoldPurchaseModal';

interface Award {
  id: string;
  name: string;
  emoji: string;
  cost: number; // Gold cost
  description?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface AwardSelectionModalProps {
  isOpen: boolean;
  postId: string;
  userGoldBalance: number;
  onAwardGiven: (awardId: string) => Promise<void>;
  onClose: () => void;
  awardsToUnlock?: number;
  totalAwardsToUnlock?: number;
}

const AWARDS: Award[] = [
  {
    id: 'hooray',
    name: 'Hooray',
    emoji: '🎉',
    cost: 15,
    description: 'Celebrate this post',
    rarity: 'common'
  },
  {
    id: 'helpful',
    name: 'Helpful',
    emoji: '👏',
    cost: 15,
    description: 'This was helpful',
    rarity: 'common'
  },
  {
    id: 'love',
    name: 'Love',
    emoji: '❤️',
    cost: 15,
    description: 'Show some love',
    rarity: 'common'
  },
  {
    id: 'mindblown',
    name: 'Mind Blown',
    emoji: '🤯',
    cost: 15,
    description: 'Mind blown!',
    rarity: 'common'
  },
  {
    id: 'cute',
    name: 'Cute',
    emoji: '🦭',
    cost: 15,
    description: 'So cute!',
    rarity: 'common'
  },
  {
    id: 'sad',
    name: 'Sad',
    emoji: '😢',
    cost: 15,
    description: 'This is sad',
    rarity: 'common'
  },
  {
    id: 'angry',
    name: 'Angry',
    emoji: '😠',
    cost: 15,
    description: 'This makes me angry',
    rarity: 'common'
  },
  {
    id: 'pray',
    name: 'Pray',
    emoji: '🙏',
    cost: 15,
    description: 'Praying for this',
    rarity: 'common'
  },
  {
    id: 'laugh',
    name: 'Laugh',
    emoji: '😂',
    cost: 15,
    description: 'This is hilarious',
    rarity: 'common'
  },
  {
    id: 'snake',
    name: 'Snake',
    emoji: '🐍',
    cost: 15,
    description: 'Snake energy',
    rarity: 'common'
  },
  {
    id: 'confused',
    name: 'Confused',
    emoji: '😵',
    cost: 25,
    description: 'I\'m confused',
    rarity: 'rare'
  },
  {
    id: 'party',
    name: 'Party',
    emoji: '🐸',
    cost: 25,
    description: 'Party frog!',
    rarity: 'rare'
  },
  {
    id: 'cry',
    name: 'Cry',
    emoji: '😭',
    cost: 25,
    description: 'This made me cry',
    rarity: 'rare'
  },
  {
    id: 'shell',
    name: 'Shell',
    emoji: '🐚',
    cost: 25,
    description: 'Shell shocked',
    rarity: 'rare'
  },
  {
    id: 'heart',
    name: 'Heart',
    emoji: '💕',
    cost: 25,
    description: 'Sending love',
    rarity: 'rare'
  },
  {
    id: 'poop',
    name: 'Poop',
    emoji: '💩',
    cost: 50,
    description: 'This is poop',
    rarity: 'epic'
  },
  {
    id: 'brain',
    name: 'Brain',
    emoji: '🧠',
    cost: 50,
    description: 'Big brain energy',
    rarity: 'epic'
  },
  {
    id: 'eye',
    name: 'All Seeing',
    emoji: '👁️',
    cost: 50,
    description: 'All seeing eye',
    rarity: 'epic'
  },
  {
    id: 'demon',
    name: 'Demon',
    emoji: '👹',
    cost: 50,
    description: 'Demon mode',
    rarity: 'epic'
  }
];

const AwardSelectionModal: React.FC<AwardSelectionModalProps> = ({
  isOpen,
  postId,
  userGoldBalance,
  onAwardGiven,
  onClose,
  awardsToUnlock = 5,
  totalAwardsToUnlock = 10
}) => {
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [isGiving, setIsGiving] = useState(false);

  const progress = Math.min((userGoldBalance / totalAwardsToUnlock) * 100, 100);
  const remainingAwards = Math.max(0, awardsToUnlock);

  const handleAwardSelect = (award: Award) => {
    if (userGoldBalance >= award.cost) {
      // User has enough gold, give the award directly
      giveAward(award);
    } else {
      // User needs more gold, show purchase modal
      setSelectedAward(award);
      setShowPurchaseModal(true);
    }
  };

  const giveAward = async (award: Award) => {
    setIsGiving(true);
    try {
      await onAwardGiven(award.id);
      onClose();
    } catch (error) {
      console.error('Failed to give award:', error);
    } finally {
      setIsGiving(false);
    }
  };

  const handlePurchaseComplete = async (packageId: string) => {
    // After purchase, give the selected award
    if (selectedAward) {
      await giveAward(selectedAward);
    }
    setShowPurchaseModal(false);
    setSelectedAward(null);
  };

  if (!isOpen) return null;

  // Check if document.body exists before creating portal
  if (typeof document === 'undefined' || !document.body) {
    return null;
  }

  const modalContent = (
    <>
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {progress < 100 && (
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Help unlock the leaderboard!</h2>
                    <p className="text-gray-600">
                      {remainingAwards} more awards and the leaderboard will be unlocked.
                    </p>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
                <h3 className="text-lg font-semibold text-gray-900">Award this post</h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Awards Grid */}
          <div className="p-6">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {AWARDS.map((award) => {
                const canAfford = userGoldBalance >= award.cost;
                const isSelected = selectedAward?.id === award.id;
                
                return (
                  <button
                    key={award.id}
                    onClick={() => handleAwardSelect(award)}
                    className={`
                      relative group p-3 rounded-lg border-2 transition-all
                      ${isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : canAfford
                          ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          : 'border-gray-200 opacity-50 cursor-not-allowed'
                      }
                    `}
                    disabled={isGiving}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">{award.emoji}</div>
                      <div className="text-xs font-medium text-gray-900">
                        {award.cost}
                      </div>
                      <div className="text-xs text-gray-500">gold</div>
                    </div>
                    
                    {!canAfford && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Award Details */}
            {selectedAward && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{selectedAward.emoji}</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{selectedAward.name}</h4>
                    <p className="text-sm text-gray-600">{selectedAward.description}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-sm font-medium text-gray-900">
                        {selectedAward.cost} gold
                      </span>
                      {userGoldBalance < selectedAward.cost && (
                        <span className="text-sm text-red-600">
                          (You need {selectedAward.cost - userGoldBalance} more gold)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                The content author may be eligible to earn from awards.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                {selectedAward && userGoldBalance >= selectedAward.cost && (
                  <button
                    onClick={() => giveAward(selectedAward)}
                    disabled={isGiving}
                    className="px-4 py-2 bg-blue-900 text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50"
                  >
                    {isGiving ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Giving...</span>
                      </div>
                    ) : (
                      `Give ${selectedAward.name}`
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gold Purchase Modal */}
      {selectedAward && (
        <GoldPurchaseModal
          isOpen={showPurchaseModal}
          awardCost={selectedAward.cost}
          currentGold={userGoldBalance}
          onPurchase={handlePurchaseComplete}
          onClose={() => {
            setShowPurchaseModal(false);
            setSelectedAward(null);
          }}
        />
      )}
      </>
  );

  try {
    return createPortal(
      <ErrorBoundary>
        {modalContent}
      </ErrorBoundary>,
      document.body
    );
  } catch (error) {
    console.error('Error creating portal for AwardSelectionModal:', error);
    // Fallback to non-portal rendering with error boundary
    return (
      <ErrorBoundary>
        {modalContent}
      </ErrorBoundary>
    );
  }
};

export default AwardSelectionModal;
