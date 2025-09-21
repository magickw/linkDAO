import React from 'react';
import { ProposalPreview as ProposalPreviewData, ProposalStatus } from '@/types/contentPreview';

interface ProposalPreviewProps {
  data: ProposalPreviewData;
  className?: string;
  compact?: boolean;
  onClick?: () => void;
}

export default function ProposalPreview({ data, className = '', compact = false, onClick }: ProposalPreviewProps) {
  // Handle both legacy and new data formats
  const proposalData = 'category' in data ? {
    id: data.id,
    title: data.title,
    description: data.description,
    status: data.status === ProposalStatus.ACTIVE ? 'active' : 
            data.status === ProposalStatus.SUCCEEDED ? 'passed' :
            data.status === ProposalStatus.DEFEATED ? 'failed' :
            data.status === ProposalStatus.EXECUTED ? 'executed' :
            data.status === ProposalStatus.DRAFT ? 'draft' : 'draft',
    votingEnds: data.votingEnds,
    yesVotes: data.yesVotes,
    noVotes: data.noVotes,
    quorum: data.quorum,
    proposer: data.proposer
  } : data as ProposalPreviewData;
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'passed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'executed':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return '🗳️';
      case 'passed':
        return '✅';
      case 'failed':
        return '❌';
      case 'executed':
        return '⚡';
      case 'draft':
        return '📝';
      default:
        return '📋';
    }
  };

  const formatTimeRemaining = (endDate: Date) => {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    
    if (diff <= 0) {
      return 'Voting ended';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    } else if (hours > 0) {
      return `${hours}h remaining`;
    } else {
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${minutes}m remaining`;
    }
  };

  const calculateVotePercentage = (votes: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  const totalVotes = proposalData.yesVotes + proposalData.noVotes + ('abstainVotes' in data ? data.abstainVotes : 0);
  const yesPercentage = calculateVotePercentage(proposalData.yesVotes, totalVotes);
  const noPercentage = calculateVotePercentage(proposalData.noVotes, totalVotes);
  const abstainPercentage = 'abstainVotes' in data ? calculateVotePercentage(data.abstainVotes, totalVotes) : 0;
  const quorumMet = totalVotes >= proposalData.quorum;

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (compact) {
    return (
      <div 
        className={`proposal-preview-compact flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow cursor-pointer ${className}`}
        onClick={onClick}
      >
        <div className="flex-shrink-0">
          <div className={`w-3 h-3 rounded-full ${proposalData.status === 'active' ? 'bg-blue-500 animate-pulse' : 
                                                   proposalData.status === 'passed' ? 'bg-green-500' :
                                                   proposalData.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'}`}></div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 dark:text-white truncate">
              {truncateText(proposalData.title, 40)}
            </h4>
            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${getStatusColor(proposalData.status)}`}>
              {proposalData.status.charAt(0).toUpperCase() + proposalData.status.slice(1)}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {'category' in data ? `${data.category} • ` : ''}
            {proposalData.status === 'active' ? formatTimeRemaining(proposalData.votingEnds) : 'Voting ended'}
          </p>
        </div>
        
        {proposalData.status === 'active' && (
          <div className="text-right text-xs">
            <div className="text-green-600 dark:text-green-400">✅ {yesPercentage}%</div>
            <div className="text-red-600 dark:text-red-400">❌ {noPercentage}%</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl border border-indigo-200 dark:border-indigo-700/50 overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${className}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-white/50 dark:bg-gray-800/50 border-b border-indigo-200 dark:border-indigo-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm">{getStatusIcon(proposalData.status)}</span>
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              Governance Proposal
            </span>
            {'category' in data && (
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {data.category}
              </span>
            )}
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(proposalData.status)}`}>
            {proposalData.status.charAt(0).toUpperCase() + proposalData.status.slice(1)}
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* Proposal Title */}
        <h4 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight mb-2">
          {truncateText(proposalData.title, 80)}
        </h4>

        {/* Proposal Description */}
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
          {truncateText(proposalData.description, 120)}
        </p>

        {/* Proposer and Enhanced Info */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Proposed by:</span>
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 font-mono">
              {proposalData.proposer.substring(0, 6)}...{proposalData.proposer.substring(38)}
            </span>
            {'proposerReputation' in data && data.proposerReputation && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                (Rep: {data.proposerReputation})
              </span>
            )}
          </div>
          {'requiredMajority' in data && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {data.requiredMajority}% majority required
            </span>
          )}
        </div>

        {/* Voting Progress */}
        {proposalData.status === 'active' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Voting Progress
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatTimeRemaining(proposalData.votingEnds)}
              </span>
            </div>

            {/* Vote Bars */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${yesPercentage}%` }}
                  ></div>
                </div>
                <span className="text-xs font-medium text-green-600 dark:text-green-400 w-12 text-right">
                  {yesPercentage}%
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all duration-500"
                    style={{ width: `${noPercentage}%` }}
                  ></div>
                </div>
                <span className="text-xs font-medium text-red-600 dark:text-red-400 w-12 text-right">
                  {noPercentage}%
                </span>
              </div>
            </div>

            {/* Enhanced Vote Bars with Abstain */}
            {'abstainVotes' in data && abstainPercentage > 0 && (
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gray-500 transition-all duration-500"
                    style={{ width: `${abstainPercentage}%` }}
                  ></div>
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-12 text-right">
                  {abstainPercentage}%
                </span>
              </div>
            )}

            {/* Vote Counts */}
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex space-x-4">
                <span>✅ {proposalData.yesVotes.toLocaleString()}</span>
                <span>❌ {proposalData.noVotes.toLocaleString()}</span>
                {'abstainVotes' in data && data.abstainVotes > 0 && (
                  <span>⚪ {data.abstainVotes.toLocaleString()}</span>
                )}
              </div>
              <div className="flex items-center space-x-1">
                <span>Quorum:</span>
                <span className={`font-medium ${quorumMet ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {totalVotes.toLocaleString()}/{proposalData.quorum.toLocaleString()}
                </span>
                {quorumMet && <span className="text-green-500">✓</span>}
              </div>
            </div>
          </div>
        )}

        {/* Final Results for non-active proposals */}
        {proposalData.status !== 'active' && proposalData.status !== 'draft' && (
          <div className="mb-4">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Final Results
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex space-x-4">
                <span className="text-green-600 dark:text-green-400">
                  ✅ {proposalData.yesVotes.toLocaleString()} ({yesPercentage}%)
                </span>
                <span className="text-red-600 dark:text-red-400">
                  ❌ {proposalData.noVotes.toLocaleString()} ({noPercentage}%)
                </span>
                {'abstainVotes' in data && data.abstainVotes > 0 && (
                  <span className="text-gray-600 dark:text-gray-400">
                    ⚪ {data.abstainVotes.toLocaleString()} ({abstainPercentage}%)
                  </span>
                )}
              </div>
              <span className={`font-medium ${quorumMet ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {quorumMet ? 'Quorum Met' : 'Quorum Failed'}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button className="flex-1 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors duration-200">
            View Proposal
          </button>
          {proposalData.status === 'active' && (
            <button className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg transition-colors duration-200">
              Vote
            </button>
          )}
          <button className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}