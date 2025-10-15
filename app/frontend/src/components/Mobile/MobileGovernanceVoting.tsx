import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircleIcon,
  XCircleIcon,
  MinusCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';

interface Proposal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'passed' | 'failed' | 'executed';
  votingPower: {
    for: number;
    against: number;
    abstain: number;
  };
  userVote?: 'for' | 'against' | 'abstain';
  endTime: Date;
  quorum: number;
  requiredMajority: number;
  gasEstimate?: string;
}

interface MobileGovernanceVotingProps {
  proposal: Proposal;
  userVotingPower: number;
  onVote: (proposalId: string, choice: 'for' | 'against' | 'abstain') => Promise<void>;
  onViewDetails: (proposalId: string) => void;
  isVoting?: boolean;
  walletConnected?: boolean;
  className?: string;
}

export const MobileGovernanceVoting: React.FC<MobileGovernanceVotingProps> = ({
  proposal,
  userVotingPower,
  onVote,
  onViewDetails,
  isVoting = false,
  walletConnected = false,
  className = ''
}) => {
  const { triggerHapticFeedback, touchTargetClasses } = useMobileOptimization();
  const { announceToScreenReader, accessibilityClasses } = useMobileAccessibility();
  
  const [selectedVote, setSelectedVote] = useState<'for' | 'against' | 'abstain' | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');

  // Calculate time remaining
  useEffect(() => {
    const updateTimeRemaining = () => {
      const now = new Date();
      const end = new Date(proposal.endTime);
      const diff = end.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining('Voting ended');
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h remaining`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else {
        setTimeRemaining(`${minutes}m remaining`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [proposal.endTime]);

  const totalVotes = proposal.votingPower.for + proposal.votingPower.against + proposal.votingPower.abstain;
  const forPercentage = totalVotes > 0 ? (proposal.votingPower.for / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (proposal.votingPower.against / totalVotes) * 100 : 0;
  const abstainPercentage = totalVotes > 0 ? (proposal.votingPower.abstain / totalVotes) * 100 : 0;
  
  const quorumReached = totalVotes >= proposal.quorum;
  const majorityReached = forPercentage >= proposal.requiredMajority;

  const handleVoteSelect = (choice: 'for' | 'against' | 'abstain') => {
    if (!walletConnected) {
      announceToScreenReader('Please connect your wallet to vote');
      return;
    }
    
    triggerHapticFeedback('medium');
    setSelectedVote(choice);
    setShowConfirmation(true);
    announceToScreenReader(`Selected ${choice} vote. Review your choice before confirming.`);
  };

  const handleConfirmVote = async () => {
    if (!selectedVote) return;
    
    try {
      triggerHapticFeedback('heavy');
      await onVote(proposal.id, selectedVote);
      setShowConfirmation(false);
      setSelectedVote(null);
      announceToScreenReader('Vote submitted successfully');
    } catch (error) {
      triggerHapticFeedback('error');
      announceToScreenReader('Failed to submit vote. Please try again.');
    }
  };

  const handleCancelVote = () => {
    triggerHapticFeedback('light');
    setSelectedVote(null);
    setShowConfirmation(false);
    announceToScreenReader('Vote cancelled');
  };

  const voteOptions = [
    {
      id: 'for',
      label: 'For',
      icon: CheckCircleIcon,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      description: 'Support this proposal'
    },
    {
      id: 'against',
      label: 'Against',
      icon: XCircleIcon,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      description: 'Oppose this proposal'
    },
    {
      id: 'abstain',
      label: 'Abstain',
      icon: MinusCircleIcon,
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-800',
      borderColor: 'border-gray-200 dark:border-gray-700',
      description: 'No preference'
    }
  ];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden ${className} ${accessibilityClasses}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1">
              {proposal.title}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <ClockIcon className="w-4 h-4" />
              <span>{timeRemaining}</span>
            </div>
          </div>
          
          <div className={`
            px-2 py-1 rounded-full text-xs font-medium
            ${proposal.status === 'active' 
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : proposal.status === 'passed'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : proposal.status === 'failed'
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }
          `}>
            {proposal.status}
          </div>
        </div>

        {/* Description Toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`
            ${touchTargetClasses}
            flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400
            hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200
          `}
        >
          <span>View details</span>
          {showDetails ? (
            <ChevronUpIcon className="w-4 h-4" />
          ) : (
            <ChevronDownIcon className="w-4 h-4" />
          )}
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 text-sm text-gray-600 dark:text-gray-300"
            >
              {proposal.description}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Voting Results */}
      <div className="p-4">
        <div className="space-y-3 mb-4">
          {/* For */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">For</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {forPercentage.toFixed(1)}% ({proposal.votingPower.for.toLocaleString()})
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div 
                className="bg-green-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${forPercentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Against */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <XCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Against</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {againstPercentage.toFixed(1)}% ({proposal.votingPower.against.toLocaleString()})
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div 
                className="bg-red-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${againstPercentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
              />
            </div>
          </div>

          {/* Abstain */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <MinusCircleIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Abstain</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {abstainPercentage.toFixed(1)}% ({proposal.votingPower.abstain.toLocaleString()})
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div 
                className="bg-gray-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${abstainPercentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
              />
            </div>
          </div>
        </div>

        {/* Quorum & Majority Status */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className={`
            p-3 rounded-lg border
            ${quorumReached 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
            }
          `}>
            <div className="flex items-center space-x-2 mb-1">
              {quorumReached ? (
                <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <ExclamationTriangleIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              )}
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Quorum</span>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {((totalVotes / proposal.quorum) * 100).toFixed(1)}%
            </p>
          </div>

          <div className={`
            p-3 rounded-lg border
            ${majorityReached 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
            }
          `}>
            <div className="flex items-center space-x-2 mb-1">
              {majorityReached ? (
                <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <ExclamationTriangleIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              )}
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Majority</span>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {proposal.requiredMajority}% req.
            </p>
          </div>
        </div>

        {/* User Vote Status */}
        {proposal.userVote && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <InformationCircleIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                You voted: <span className="font-medium capitalize">{proposal.userVote}</span>
              </span>
            </div>
          </div>
        )}

        {/* Voting Interface */}
        {proposal.status === 'active' && !proposal.userVote && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Cast your vote
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Voting power: {userVotingPower.toLocaleString()}
              </span>
            </div>

            {!walletConnected ? (
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm text-orange-700 dark:text-orange-300">
                    Connect your wallet to vote
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {voteOptions.map((option) => (
                  <motion.button
                    key={option.id}
                    onClick={() => handleVoteSelect(option.id as any)}
                    disabled={isVoting}
                    className={`
                      ${touchTargetClasses}
                      flex flex-col items-center space-y-2 p-3 rounded-lg border-2
                      ${selectedVote === option.id
                        ? `${option.borderColor} ${option.bgColor}`
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                      transition-all duration-200
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                    whileTap={{ scale: 0.98 }}
                  >
                    <option.icon className={`w-6 h-6 ${option.color}`} />
                    <span className={`text-sm font-medium ${option.color}`}>
                      {option.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && selectedVote && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancelVote}
            />
            
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-3xl p-6 shadow-2xl"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Confirm Your Vote
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  You are about to vote <span className="font-medium capitalize">{selectedVote}</span> on this proposal
                </p>
              </div>

              {/* Vote Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Your vote:</span>
                    <span className="font-medium text-gray-900 dark:text-white capitalize">{selectedVote}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Voting power:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{userVotingPower.toLocaleString()}</span>
                  </div>
                  {proposal.gasEstimate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Est. gas fee:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{proposal.gasEstimate}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleCancelVote}
                  className={`
                    flex-1 ${touchTargetClasses}
                    py-3 px-4 border border-gray-300 dark:border-gray-600
                    text-gray-700 dark:text-gray-300 rounded-xl
                    hover:bg-gray-50 dark:hover:bg-gray-800
                    transition-colors duration-200
                    focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                  `}
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleConfirmVote}
                  disabled={isVoting}
                  className={`
                    flex-1 ${touchTargetClasses}
                    py-3 px-4 bg-blue-600 hover:bg-blue-700
                    text-white rounded-xl font-medium
                    transition-colors duration-200
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center space-x-2
                  `}
                >
                  {isVoting ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      <span>Voting...</span>
                    </>
                  ) : (
                    <span>Confirm Vote</span>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileGovernanceVoting;