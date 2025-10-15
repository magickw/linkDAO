import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Proposal, UserVote } from '../../types/governance';
import { governanceService } from '../../services/web3/governanceService';
import { web3ErrorHandler } from '../../utils/web3ErrorHandling';

interface GovernanceVotingButtonProps {
  proposal: Proposal;
  userVotingPower: number;
  userVote?: UserVote;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'compact' | 'detailed';
  className?: string;
  onVoteSubmitted?: (vote: UserVote) => void;
  onError?: (error: string) => void;
}

type VoteChoice = 'for' | 'against' | 'abstain';

const VOTE_CONFIGS = {
  for: {
    label: 'Vote For',
    icon: '👍',
    color: 'from-green-500 to-emerald-500',
    hoverColor: 'hover:from-green-600 hover:to-emerald-600'
  },
  against: {
    label: 'Vote Against',
    icon: '👎',
    color: 'from-red-500 to-rose-500',
    hoverColor: 'hover:from-red-600 hover:to-rose-600'
  },
  abstain: {
    label: 'Abstain',
    icon: '🤷',
    color: 'from-gray-500 to-slate-500',
    hoverColor: 'hover:from-gray-600 hover:to-slate-600'
  }
};

const SIZE_CONFIGS = {
  small: {
    button: 'px-3 py-1.5 text-sm',
    icon: 'text-sm',
    modal: 'max-w-md'
  },
  medium: {
    button: 'px-4 py-2 text-base',
    icon: 'text-base',
    modal: 'max-w-lg'
  },
  large: {
    button: 'px-6 py-3 text-lg',
    icon: 'text-lg',
    modal: 'max-w-xl'
  }
};

export const GovernanceVotingButton: React.FC<GovernanceVotingButtonProps> = ({
  proposal,
  userVotingPower,
  userVote,
  disabled = false,
  size = 'medium',
  variant = 'compact',
  className = '',
  onVoteSubmitted,
  onError
}) => {
  const [showVotingModal, setShowVotingModal] = useState(false);
  const [selectedVote, setSelectedVote] = useState<VoteChoice | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [votingPowerToUse, setVotingPowerToUse] = useState(userVotingPower);

  const sizeConfig = SIZE_CONFIGS[size];
  const isProposalActive = proposal.status === 'active';
  const hasVoted = !!userVote;
  const canVote = isProposalActive && !hasVoted && userVotingPower > 0 && !disabled;

  useEffect(() => {
    if (selectedVote && showVotingModal) {
      estimateGasCost();
    }
  }, [selectedVote, votingPowerToUse]);

  const estimateGasCost = async () => {
    if (!selectedVote) return;

    try {
      const estimate = await governanceService.estimateVoteGas(
        proposal.id,
        selectedVote,
        votingPowerToUse
      );
      setGasEstimate(estimate);
    } catch (error) {
      console.error('Failed to estimate gas:', error);
      setGasEstimate(null);
    }
  };

  const handleVoteClick = () => {
    if (!canVote) return;
    setShowVotingModal(true);
  };

  const submitVote = async () => {
    if (!selectedVote || isVoting) return;

    setIsVoting(true);

    try {
      const result = await governanceService.submitVote(
        proposal.id,
        selectedVote,
        votingPowerToUse
      );

      const newVote: UserVote = {
        proposalId: proposal.id,
        choice: selectedVote,
        votingPower: votingPowerToUse,
        timestamp: new Date(),
        transactionHash: result.transactionHash
      };

      onVoteSubmitted?.(newVote);
      setShowVotingModal(false);
      setSelectedVote(null);
    } catch (error) {
      const errorMessage = web3ErrorHandler.handleError(error as Error, {
        action: 'submitVote',
        component: 'GovernanceVotingButton'
      }).message;
      
      onError?.(errorMessage);
    } finally {
      setIsVoting(false);
    }
  };

  const getButtonContent = () => {
    if (hasVoted) {
      const voteConfig = VOTE_CONFIGS[userVote!.choice];
      return (
        <div className="flex items-center space-x-2">
          <span className={sizeConfig.icon}>{voteConfig.icon}</span>
          <span>Voted {voteConfig.label.split(' ')[1]}</span>
          {variant === 'detailed' && (
            <span className="text-sm opacity-75">
              ({userVote!.votingPower.toLocaleString()} votes)
            </span>
          )}
        </div>
      );
    }

    if (!isProposalActive) {
      return (
        <div className="flex items-center space-x-2">
          <span className={sizeConfig.icon}>⏰</span>
          <span>Voting Ended</span>
        </div>
      );
    }

    if (userVotingPower === 0) {
      return (
        <div className="flex items-center space-x-2">
          <span className={sizeConfig.icon}>🚫</span>
          <span>No Voting Power</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2">
        <span className={sizeConfig.icon}>🗳️</span>
        <span>Vote</span>
        {variant === 'detailed' && (
          <span className="text-sm opacity-75">
            ({userVotingPower.toLocaleString()} votes)
          </span>
        )}
      </div>
    );
  };

  const getButtonStyle = () => {
    if (hasVoted) {
      const voteConfig = VOTE_CONFIGS[userVote!.choice];
      return `bg-gradient-to-r ${voteConfig.color} text-white`;
    }

    if (!canVote) {
      return 'bg-gray-600 text-gray-300 cursor-not-allowed';
    }

    return 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white';
  };

  return (
    <>
      <motion.button
        onClick={handleVoteClick}
        disabled={!canVote}
        className={`
          inline-flex items-center rounded-lg font-medium transition-all duration-200
          ${sizeConfig.button} ${getButtonStyle()} ${className}
          ${canVote ? 'hover:shadow-lg' : ''}
        `}
        whileHover={canVote ? { scale: 1.02 } : {}}
        whileTap={canVote ? { scale: 0.98 } : {}}
      >
        {getButtonContent()}
      </motion.button>

      {/* Voting Modal */}
      <AnimatePresence>
        {showVotingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowVotingModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`
                bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-xl p-6
                ${sizeConfig.modal} w-full
              `}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Cast Your Vote</h3>
                <button
                  onClick={() => setShowVotingModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Proposal Info */}
              <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
                <h4 className="font-medium text-white mb-2">{proposal.title}</h4>
                <p className="text-sm text-gray-300 mb-3">{proposal.description}</p>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Your Voting Power: {userVotingPower.toLocaleString()}</span>
                  <span>Ends: {new Date(proposal.endTime).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Vote Options */}
              <div className="space-y-3 mb-6">
                {(Object.keys(VOTE_CONFIGS) as VoteChoice[]).map((choice) => {
                  const config = VOTE_CONFIGS[choice];
                  const isSelected = selectedVote === choice;
                  
                  return (
                    <motion.button
                      key={choice}
                      onClick={() => setSelectedVote(choice)}
                      className={`
                        w-full p-4 rounded-lg border-2 transition-all duration-200
                        ${isSelected 
                          ? `border-white/30 bg-gradient-to-r ${config.color}` 
                          : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                        }
                      `}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{config.icon}</span>
                        <div className="text-left">
                          <p className="font-medium text-white">{config.label}</p>
                          <p className="text-sm text-gray-300">
                            Current: {(proposal.votingPower?.[choice] ?? 0).toLocaleString()} votes
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Voting Power Slider */}
              {selectedVote && (
                <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
                  <label className="block text-sm font-medium text-white mb-2">
                    Voting Power to Use: {votingPowerToUse.toLocaleString()}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max={userVotingPower}
                    value={votingPowerToUse}
                    onChange={(e) => setVotingPowerToUse(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1</span>
                    <span>{userVotingPower.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Gas Estimate */}
              {gasEstimate && (
                <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-400">⛽</span>
                    <span className="text-sm text-blue-300">
                      Estimated Gas Fee: {gasEstimate}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowVotingModal(false)}
                  className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitVote}
                  disabled={!selectedVote || isVoting}
                  className={`
                    flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200
                    ${selectedVote && !isVoting
                      ? `bg-gradient-to-r ${VOTE_CONFIGS[selectedVote].color} hover:shadow-lg text-white`
                      : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    }
                  `}
                >
                  {isVoting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Voting...</span>
                    </div>
                  ) : (
                    `Submit Vote ${selectedVote ? VOTE_CONFIGS[selectedVote].icon : ''}`
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};