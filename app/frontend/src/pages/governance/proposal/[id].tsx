/**
 * Proposal Detail Page
 * Displays comprehensive information about a single governance proposal
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useAccount } from 'wagmi';
import { useToast } from '@/context/ToastContext';
import { governanceService } from '@/services/governanceService';
import { aiGovernanceService, AIProposalAnalysis } from '@/services/aiGovernanceService';
import { Proposal } from '@/types/governance';
import { useProposal, useHasVoted, useVoteOnProposal, useVotingPower } from '@/hooks/useGovernanceContract';
import { ProposalDetailSkeleton } from '@/components/LoadingSkeletons/GovernanceSkeleton';
import { GovernanceErrorBoundary } from '@/components/ErrorHandling/GovernanceErrorBoundary';

function ProposalDetailContent() {
  const router = useRouter();
  const { id } = router.query;
  const { address, isConnected } = useAccount();
  const { addToast } = useToast();
  
  const proposalId = id ? parseInt(id as string) : undefined;
  const { proposal: contractProposal, isLoading: isLoadingProposal } = useProposal(proposalId);
  const { hasVoted, isLoading: isLoadingVoteStatus } = useHasVoted(proposalId, address);
  const { vote, isLoading: isVoting, isSuccess, txHash } = useVoteOnProposal();
  const { votingPower, isLoading: isLoadingVotingPower } = useVotingPower(address);
  
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AIProposalAnalysis | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [voteHistory, setVoteHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProposalDetails();
      fetchVoteHistory();
    }
  }, [id]);

  useEffect(() => {
    if (isSuccess && txHash) {
      addToast(`Vote cast successfully! TX: ${txHash.substring(0, 10)}...`, 'success');
      fetchProposalDetails(); // Refresh proposal data
    }
  }, [isSuccess, txHash]);

  const fetchProposalDetails = async () => {
    try {
      setIsLoading(true);
      const fetchedProposal = await governanceService.getProposal(id as string);
      setProposal(fetchedProposal);
    } catch (error) {
      console.error('Error fetching proposal:', error);
      addToast('Failed to load proposal details', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVoteHistory = async () => {
    if (!address) return;
    
    try {
      setIsLoadingHistory(true);
      // In a real implementation, this would fetch actual vote history
      // For now, we'll use mock data
      setVoteHistory([
        { voter: '0x1234...5678', choice: 'for', votingPower: '1250', timestamp: new Date(Date.now() - 86400000) },
        { voter: '0xabcd...ef01', choice: 'against', votingPower: '350', timestamp: new Date(Date.now() - 43200000) },
        { voter: '0x2345...6789', choice: 'for', votingPower: '875', timestamp: new Date(Date.now() - 21600000) }
      ]);
    } catch (error) {
      console.error('Error fetching vote history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleVote = async (support: boolean) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to vote', 'error');
      return;
    }

    if (hasVoted) {
      addToast('You have already voted on this proposal', 'warning');
      return;
    }

    if (proposalId !== undefined) {
      try {
        addToast('Submitting vote...', 'info');
        vote(proposalId, support);
      } catch (error) {
        console.error('Error submitting vote:', error);
        addToast('Error submitting vote: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
      }
    }
  };

  const handleAnalyzeProposal = async () => {
    if (!proposal) return;
    
    try {
      setIsAnalyzing(true);
      addToast('Analyzing proposal with AI...', 'info');
      
      const aiAnalysis = await aiGovernanceService.analyzeProposal(proposal);
      
      if (aiAnalysis) {
        setAnalysis(aiAnalysis);
        setShowAnalysis(true);
        addToast('AI analysis completed!', 'success');
      }
    } catch (error) {
      console.error('Error analyzing proposal:', error);
      addToast('Failed to analyze proposal: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleShareProposal = async () => {
    const shareData = {
      title: `LinkDAO Proposal: ${displayProposal?.title}`,
      text: `Check out this governance proposal on LinkDAO: ${displayProposal?.description.substring(0, 100)}...`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        addToast('Proposal link copied to clipboard!', 'success');
      }
    } catch (error) {
      console.error('Error sharing proposal:', error);
      addToast('Failed to share proposal', 'error');
    }
  };

  if (isLoading || isLoadingProposal) {
    return (
      <Layout title="Loading Proposal - LinkDAO" fullWidth={true}>
        <div className="px-4 py-6 sm:px-0">
          <div className="max-w-4xl mx-auto">
            <ProposalDetailSkeleton />
          </div>
        </div>
      </Layout>
    );
  }

  if (!proposal && !contractProposal) {
    return (
      <Layout title="Proposal Not Found - LinkDAO" fullWidth={true}>
        <div className="px-4 py-6 sm:px-0">
          <div className="max-w-4xl mx-auto text-center py-12">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Proposal Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              The proposal you're looking for doesn't exist or has been removed.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/governance">
                <a className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                  Back to Governance
                </a>
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const displayProposal = proposal || (contractProposal && {
    id: id as string,
    title: contractProposal.description.substring(0, 100),
    description: contractProposal.description,
    proposer: contractProposal.proposer,
    forVotes: contractProposal.forVotes,
    againstVotes: contractProposal.againstVotes,
    status: contractProposal.executed ? 'executed' : 'active',
    category: ['governance', 'funding', 'technical', 'community'][contractProposal.category] || 'general',
    startTime: new Date(Date.now() - 7 * 86400000),
    endTime: new Date(Date.now() + 7 * 86400000),
    type: 'general' as const,
    quorum: '1000',
    participationRate: 75
  });

  if (!displayProposal) return null;

  const forVotes = parseFloat(displayProposal.forVotes || '0');
  const againstVotes = parseFloat(displayProposal.againstVotes || '0');
  const totalVotes = forVotes + againstVotes;
  const forPercentage = totalVotes > 0 ? (forVotes / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (againstVotes / totalVotes) * 100 : 0;
  const isActive = displayProposal.status === 'active';
  const userVotingPower = votingPower ? parseFloat(votingPower) : 0;

  // Calculate time remaining
  const endTime = displayProposal.endTime instanceof Date 
    ? displayProposal.endTime 
    : new Date(displayProposal.endTime);
  const timeRemainingMs = endTime.getTime() - Date.now();
  const daysRemaining = Math.ceil(timeRemainingMs / (1000 * 60 * 60 * 24));
  const isEndingSoon = daysRemaining <= 3 && daysRemaining > 0;

  return (
    <Layout title={`${displayProposal.title} - LinkDAO Governance`} fullWidth={true}>
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav className="mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <li>
                <Link href="/governance">
                  <a className="hover:text-gray-700 dark:hover:text-gray-200">Governance</a>
                </Link>
              </li>
              <li>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </li>
              <li>
                <span className="text-gray-900 dark:text-white">Proposal #{displayProposal.id}</span>
              </li>
            </ol>
          </nav>

          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isActive
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {isActive ? 'Active' : 'Ended'}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {displayProposal.category}
              </span>
              {isEndingSoon && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  Ending Soon
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {displayProposal.title}
            </h1>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Proposed by <span className="font-mono">{displayProposal.proposer?.substring(0, 10)}...</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleAnalyzeProposal}
                  disabled={isAnalyzing}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-600 dark:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    'AI Analysis'
                  )}
                </button>
                <button
                  onClick={handleShareProposal}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
              </div>
            </div>
          </div>

          {/* AI Analysis Panel */}
          {showAnalysis && analysis && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-6 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">AI Analysis</h3>
                <button
                  onClick={() => setShowAnalysis(false)}
                  className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-700 dark:text-blue-300 font-medium">Overall Score</span>
                  <span className="text-blue-800 dark:text-blue-200 font-bold text-lg">{analysis.overallScore}/100</span>
                </div>
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                  <div 
                    className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${analysis.overallScore}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{analysis.feasibility}</div>
                  <div className="text-xs text-blue-500 dark:text-blue-400">Feasibility</div>
                </div>
                <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{analysis.communityImpact}</div>
                  <div className="text-xs text-blue-500 dark:text-blue-400">Community</div>
                </div>
                <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{analysis.financialImpact}</div>
                  <div className="text-xs text-blue-500 dark:text-blue-400">Financial</div>
                </div>
                <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{analysis.technicalQuality}</div>
                  <div className="text-xs text-blue-500 dark:text-blue-400">Technical</div>
                </div>
                <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{analysis.alignment}</div>
                  <div className="text-xs text-blue-500 dark:text-blue-400">Alignment</div>
                </div>
              </div>
              
              <div className="mb-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  analysis.recommendation === 'APPROVE' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : analysis.recommendation === 'NEEDS_IMPROVEMENT'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  Recommendation: {analysis.recommendation.replace('_', ' ')}
                </span>
              </div>
              
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                {analysis.analysis}
              </p>
            </div>
          )}

          {/* Description */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Description</h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {displayProposal.description}
            </p>
          </div>

          {/* Proposal Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Proposal Timeline</h2>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Start Date: {displayProposal.startTime instanceof Date 
                  ? displayProposal.startTime.toLocaleDateString() 
                  : new Date(displayProposal.startTime).toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                End Date: {displayProposal.endTime instanceof Date 
                  ? displayProposal.endTime.toLocaleDateString() 
                  : new Date(displayProposal.endTime).toLocaleDateString()}
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-600 dark:bg-green-500 h-2 rounded-full" 
                style={{ width: `${Math.min(100, Math.max(0, ((Date.now() - (displayProposal.startTime instanceof Date ? displayProposal.startTime.getTime() : new Date(displayProposal.startTime).getTime())) / (endTime.getTime() - (displayProposal.startTime instanceof Date ? displayProposal.startTime.getTime() : new Date(displayProposal.startTime).getTime()))) * 100))}%` }}
              ></div>
            </div>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {isActive ? (
                <span>
                  {daysRemaining > 0 
                    ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining` 
                    : 'Voting has ended'}
                </span>
              ) : (
                <span>Voting has ended</span>
              )}
            </div>
          </div>

          {/* Voting Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">For Votes</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{forVotes.toFixed(2)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">{forPercentage.toFixed(1)}%</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Against Votes</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{againstVotes.toFixed(2)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">{againstPercentage.toFixed(1)}%</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Votes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalVotes.toFixed(2)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Tokens</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your Voting Power</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {isLoadingVotingPower ? '...' : userVotingPower.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Tokens</p>
            </div>
          </div>

          {/* Vote Progress Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Vote Distribution</h3>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
              <div className="flex h-full">
                <div 
                  className="bg-green-500 flex items-center justify-center text-xs text-white font-medium"
                  style={{ width: `${forPercentage}%` }}
                >
                  {forPercentage > 15 && `${forPercentage.toFixed(0)}%`}
                </div>
                <div 
                  className="bg-red-500 flex items-center justify-center text-xs text-white font-medium"
                  style={{ width: `${againstPercentage}%` }}
                >
                  {againstPercentage > 15 && `${againstPercentage.toFixed(0)}%`}
                </div>
              </div>
            </div>
            <div className="mt-2 flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{forVotes.toFixed(2)} For</span>
              <span>{againstVotes.toFixed(2)} Against</span>
            </div>
          </div>

          {/* Recent Votes */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Votes</h3>
            
            {isLoadingHistory ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : voteHistory.length > 0 ? (
              <div className="space-y-3">
                {voteHistory.map((vote, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        vote.choice === 'for' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="font-mono text-sm">{vote.voter}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400 mr-3">
                        {vote.votingPower} votes
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {vote.timestamp.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No votes recorded yet
              </p>
            )}
          </div>

          {/* Voting Actions */}
          {isConnected && isActive && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cast Your Vote</h3>
              
              {hasVoted && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    ✓ You have already voted on this proposal
                  </p>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => handleVote(true)}
                  disabled={isVoting || hasVoted || isLoadingVoteStatus}
                  className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center"
                >
                  {isVoting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Voting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                      Vote For
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleVote(false)}
                  disabled={isVoting || hasVoted || isLoadingVoteStatus}
                  className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center"
                >
                  {isVoting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Voting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m0 0v9m0-9h2.765a2 2 0 011.789 2.894l-3.5 7A2 2 0 0118.264 15H17m0 0v3m0-3h-2M7 14v9m0-9h2" />
                      </svg>
                      Vote Against
                    </>
                  )}
                </button>
              </div>
              
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Your vote will count as {userVotingPower.toFixed(2)} voting power
              </div>
            </div>
          )}

          {!isConnected && isActive && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
              <p className="text-yellow-800 dark:text-yellow-200">
                Please connect your wallet to vote on this proposal
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default function ProposalDetail() {
  return (
    <GovernanceErrorBoundary>
      <ProposalDetailContent />
    </GovernanceErrorBoundary>
  );
}