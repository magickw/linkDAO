import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { useResponsive } from '../../../design-system/hooks/useResponsive';

interface GovernanceProposal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'passed' | 'failed' | 'pending';
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  timeRemaining: number;
  userVote?: 'for' | 'against' | null;
  requiredTokens: number;
  userTokenBalance: number;
}

interface MobileGovernanceInterfaceProps {
  proposals: GovernanceProposal[];
  onVote: (proposalId: string, vote: 'for' | 'against', tokenAmount: number) => void;
  onDelegate: (delegateAddress: string) => void;
  userWalletConnected: boolean;
  onConnectWallet: () => void;
}

/**
 * MobileGovernanceInterface Component
 * 
 * Touch-optimized governance interface with mobile wallet integration,
 * swipe-based voting, and simplified proposal viewing.
 */
export const MobileGovernanceInterface: React.FC<MobileGovernanceInterfaceProps> = ({
  proposals,
  onVote,
  onDelegate,
  userWalletConnected,
  onConnectWallet
}) => {
  const { isMobile } = useResponsive();
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);
  const [showVotingModal, setShowVotingModal] = useState(false);
  const [votingProposal, setVotingProposal] = useState<GovernanceProposal | null>(null);

  const handleProposalTap = useCallback((proposal: GovernanceProposal) => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    setSelectedProposal(proposal.id);
  }, []);

  const handleVoteStart = useCallback((proposal: GovernanceProposal) => {
    if (!userWalletConnected) {
      onConnectWallet();
      return;
    }
    
    setVotingProposal(proposal);
    setShowVotingModal(true);
  }, [userWalletConnected, onConnectWallet]);

  if (!isMobile) {
    return null;
  }

  return (
    <div className="mobile-governance-interface">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Governance
        </h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {proposals.filter(p => p.status === 'active').length} active proposals
          </span>
          {!userWalletConnected && (
            <button
              onClick={onConnectWallet}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg font-medium"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {/* Proposals List */}
      <div className="space-y-3 p-4">
        {proposals.map((proposal) => (
          <MobileProposalCard
            key={proposal.id}
            proposal={proposal}
            isSelected={selectedProposal === proposal.id}
            onTap={() => handleProposalTap(proposal)}
            onVote={() => handleVoteStart(proposal)}
            userWalletConnected={userWalletConnected}
          />
        ))}
      </div>

      {/* Voting Modal */}
      <MobileVotingModal
        isOpen={showVotingModal}
        onClose={() => setShowVotingModal(false)}
        proposal={votingProposal}
        onVote={onVote}
      />
    </div>
  );
};

interface MobileProposalCardProps {
  proposal: GovernanceProposal;
  isSelected: boolean;
  onTap: () => void;
  onVote: () => void;
  userWalletConnected: boolean;
}

const MobileProposalCard: React.FC<MobileProposalCardProps> = ({
  proposal,
  isSelected,
  onTap,
  onVote,
  userWalletConnected
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'passed': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getVotingProgress = () => {
    const total = proposal.votesFor + proposal.votesAgainst;
    return total > 0 ? (proposal.votesFor / total) * 100 : 0;
  };

  const timeRemaining = Math.floor(proposal.timeRemaining / (1000 * 60 * 60));
  const canVote = userWalletConnected && 
                  proposal.status === 'active' && 
                  !proposal.userVote &&
                  proposal.userTokenBalance >= proposal.requiredTokens;

  // Swipe handlers for quick actions
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (canVote) {
        onVote();
      }
    },
    onSwipedRight: () => {
      setShowDetails(!showDetails);
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: false
  });

  return (
    <motion.div
      {...swipeHandlers}
      layout
      className={`bg-white dark:bg-gray-800 rounded-xl border-2 transition-all duration-200 ${
        isSelected 
          ? 'border-blue-500 shadow-lg' 
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className={`w-3 h-3 rounded-full ${getStatusColor(proposal.status)}`} />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                {proposal.status}
              </span>
              {proposal.userVote && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  proposal.userVote === 'for' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  Voted {proposal.userVote}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
              {proposal.title}
            </h3>
          </div>
          
          <div className="text-right ml-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Time left</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {timeRemaining}h
            </p>
          </div>
        </div>

        {/* Voting Progress */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>For: {proposal.votesFor}</span>
            <span>Against: {proposal.votesAgainst}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getVotingProgress()}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={onTap}
            className="text-sm text-blue-600 dark:text-blue-400 font-medium"
          >
            {showDetails ? 'Hide Details' : 'View Details'}
          </button>
          
          {canVote && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onVote}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium"
            >
              Vote
            </motion.button>
          )}
          
          {!userWalletConnected && proposal.status === 'active' && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Connect wallet to vote
            </span>
          )}
          
          {proposal.userTokenBalance < proposal.requiredTokens && userWalletConnected && (
            <span className="text-xs text-red-500">
              Need {proposal.requiredTokens} tokens
            </span>
          )}
        </div>

        {/* Swipe Hint */}
        <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-center">
          💡 Swipe left to vote, right for details
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {(showDetails || isSelected) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {proposal.description}
              </p>
              
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Required Tokens</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {proposal.requiredTokens}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Total Votes</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {proposal.totalVotes}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface MobileVotingModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: GovernanceProposal | null;
  onVote: (proposalId: string, vote: 'for' | 'against', tokenAmount: number) => void;
}

const MobileVotingModal: React.FC<MobileVotingModalProps> = ({
  isOpen,
  onClose,
  proposal,
  onVote
}) => {
  const [selectedVote, setSelectedVote] = useState<'for' | 'against' | null>(null);
  const [tokenAmount, setTokenAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVoteSubmit = async () => {
    if (!proposal || !selectedVote || tokenAmount <= 0) return;

    setIsSubmitting(true);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }

    try {
      await onVote(proposal.id, selectedVote, tokenAmount);
      onClose();
    } catch (error) {
      console.error('Voting failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetModal = () => {
    setSelectedVote(null);
    setTokenAmount(0);
    setIsSubmitting(false);
  };

  React.useEffect(() => {
    if (!isOpen) {
      resetModal();
    }
  }, [isOpen]);

  if (!proposal) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring' as any, damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="flex justify-center py-3">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="px-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Vote on Proposal
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {proposal.title}
              </p>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
              {/* Vote Selection */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Your Vote
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedVote('for')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedVote === 'for'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">✅</div>
                      <p className="font-semibold text-green-600 dark:text-green-400">
                        For
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {proposal.votesFor} votes
                      </p>
                    </div>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedVote('against')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedVote === 'against'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">❌</div>
                      <p className="font-semibold text-red-600 dark:text-red-400">
                        Against
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {proposal.votesAgainst} votes
                      </p>
                    </div>
                  </motion.button>
                </div>
              </div>

              {/* Token Amount */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-medium text-gray-900 dark:text-white">
                    Voting Power
                  </label>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Balance: {proposal.userTokenBalance}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={tokenAmount}
                    onChange={(e) => setTokenAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    max={proposal.userTokenBalance}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Enter token amount"
                  />
                  <button
                    onClick={() => setTokenAmount(proposal.userTokenBalance)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-blue-600 dark:text-blue-400 font-medium"
                  >
                    Max
                  </button>
                </div>
                <div className="mt-2 flex space-x-2">
                  {[25, 50, 75, 100].map((percentage) => (
                    <button
                      key={percentage}
                      onClick={() => setTokenAmount(Math.floor(proposal.userTokenBalance * percentage / 100))}
                      className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg"
                    >
                      {percentage}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-semibold text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVoteSubmit}
                  disabled={!selectedVote || tokenAmount <= 0 || isSubmitting}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Voting...' : 'Submit Vote'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileGovernanceInterface;