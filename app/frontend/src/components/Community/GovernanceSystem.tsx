/**
 * GovernanceSystem Component
 * Community governance with proposals, voting, and decision management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { formatDate, formatNumber, formatPercentage } from '../../utils/formatters';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface Proposal {
  id: string;
  title: string;
  description: string;
  type: 'rule_change' | 'moderator_election' | 'budget_allocation' | 'feature_request';
  proposer: {
    address: string;
    ensName?: string;
    reputation: number;
  };
  status: 'active' | 'passed' | 'rejected' | 'expired';
  votingDeadline: Date;
  createdAt: Date;
  votes: {
    yes: number;
    no: number;
    abstain: number;
    total: number;
  };
  requiredQuorum: number;
  requiredMajority: number;
  userVote?: 'yes' | 'no' | 'abstain';
  stakingRequired: boolean;
  minimumStake?: number;
}

interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  passedProposals: number;
  rejectedProposals: number;
  participationRate: number;
  averageVotingPower: number;
  userVotingPower: number;
}

interface GovernanceSystemProps {
  communityId: string;
  canCreateProposal: boolean;
  userVotingPower: number;
}

export const GovernanceSystem: React.FC<GovernanceSystemProps> = ({
  communityId,
  canCreateProposal,
  userVotingPower
}) => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<GovernanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'passed' | 'rejected' | 'all'>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [showVoteModal, setShowVoteModal] = useState(false);

  // Load governance data
  const loadGovernanceData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [proposalsResponse, statsResponse] = await Promise.all([
        fetch(`/api/communities/${communityId}/governance?status=${activeTab}&limit=20`),
        fetch(`/api/communities/${communityId}/governance/stats`)
      ]);

      if (!proposalsResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to load governance data');
      }

      const [proposalsData, statsData] = await Promise.all([
        proposalsResponse.json(),
        statsResponse.json()
      ]);

      setProposals(proposalsData.proposals);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading governance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load governance data');
    } finally {
      setLoading(false);
    }
  }, [communityId, activeTab]);

  // Handle vote submission
  const handleVote = async (proposalId: string, vote: 'yes' | 'no' | 'abstain', stakeAmount?: number) => {
    try {
      const response = await fetch(`/api/communities/${communityId}/governance/${proposalId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vote, stakeAmount })
      });

      if (!response.ok) {
        throw new Error('Failed to submit vote');
      }

      // Update proposal in local state
      setProposals(prev => prev.map(proposal => {
        if (proposal.id === proposalId) {
          const updatedVotes = { ...proposal.votes };
          
          // Remove previous vote if exists
          if (proposal.userVote) {
            updatedVotes[proposal.userVote]--;
            updatedVotes.total--;
          }
          
          // Add new vote
          updatedVotes[vote]++;
          updatedVotes.total++;
          
          return {
            ...proposal,
            votes: updatedVotes,
            userVote: vote
          };
        }
        return proposal;
      }));

      setShowVoteModal(false);
      setSelectedProposal(null);
    } catch (error) {
      console.error('Error submitting vote:', error);
    }
  };

  // Load data when component mounts or dependencies change
  useEffect(() => {
    loadGovernanceData();
  }, [loadGovernanceData]);

  const getProposalTypeIcon = (type: string) => {
    switch (type) {
      case 'rule_change': return '📋';
      case 'moderator_election': return '🗳️';
      case 'budget_allocation': return '💰';
      case 'feature_request': return '✨';
      default: return '📄';
    }
  };

  const getProposalTypeLabel = (type: string) => {
    switch (type) {
      case 'rule_change': return 'Rule Change';
      case 'moderator_election': return 'Moderator Election';
      case 'budget_allocation': return 'Budget Allocation';
      case 'feature_request': return 'Feature Request';
      default: return 'Proposal';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#2196f3';
      case 'passed': return '#4caf50';
      case 'rejected': return '#f44336';
      case 'expired': return '#9e9e9e';
      default: return '#9e9e9e';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🔄';
      case 'passed': return '✅';
      case 'rejected': return '❌';
      case 'expired': return '⏰';
      default: return '❓';
    }
  };

  const calculateProgress = (proposal: Proposal) => {
    const { yes, no, total } = proposal.votes;
    const yesPercentage = total > 0 ? (yes / total) * 100 : 0;
    const noPercentage = total > 0 ? (no / total) * 100 : 0;
    const quorumProgress = total > 0 ? (total / proposal.requiredQuorum) * 100 : 0;
    
    return { yesPercentage, noPercentage, quorumProgress };
  };

  const isVotingOpen = (proposal: Proposal) => {
    return proposal.status === 'active' && new Date() < new Date(proposal.votingDeadline);
  };

  const getTimeRemaining = (deadline: Date) => {
    const now = new Date();
    const timeLeft = new Date(deadline).getTime() - now.getTime();
    
    if (timeLeft <= 0) return 'Expired';
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  return (
    <div className="governance-system">
      {/* Header */}
      <div className="governance-header">
        <div className="header-content">
          <h2>Community Governance</h2>
          <p>Participate in community decision-making through proposals and voting</p>
        </div>
        
        {canCreateProposal && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="create-proposal-btn"
          >
            📝 Create Proposal
          </button>
        )}
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="governance-stats">
          <div className="stat-card">
            <div className="stat-value">{formatNumber(stats.activeProposals)}</div>
            <div className="stat-label">Active Proposals</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatNumber(stats.totalProposals)}</div>
            <div className="stat-label">Total Proposals</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatPercentage(stats.participationRate)}</div>
            <div className="stat-label">Participation Rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatNumber(userVotingPower)}</div>
            <div className="stat-label">Your Voting Power</div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="governance-tabs">
        <button
          onClick={() => setActiveTab('active')}
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
        >
          🔄 Active ({stats?.activeProposals || 0})
        </button>
        <button
          onClick={() => setActiveTab('passed')}
          className={`tab ${activeTab === 'passed' ? 'active' : ''}`}
        >
          ✅ Passed ({stats?.passedProposals || 0})
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          className={`tab ${activeTab === 'rejected' ? 'active' : ''}`}
        >
          ❌ Rejected ({stats?.rejectedProposals || 0})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
        >
          📋 All
        </button>
      </div>

      {/* Proposals List */}
      <div className="proposals-section">
        {loading ? (
          <div className="loading-state">
            <LoadingSpinner size="large" />
            <p>Loading proposals...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <h3>Failed to load proposals</h3>
            <p>{error}</p>
            <button onClick={loadGovernanceData} className="retry-button">
              Try Again
            </button>
          </div>
        ) : proposals.length === 0 ? (
          <div className="empty-state">
            <h3>No proposals found</h3>
            <p>
              {activeTab === 'active'
                ? 'No active proposals at the moment'
                : `No ${activeTab} proposals found`}
            </p>
            {canCreateProposal && activeTab === 'active' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="create-first-proposal-btn"
              >
                Create First Proposal
              </button>
            )}
          </div>
        ) : (
          <div className="proposals-list">
            {proposals.map(proposal => {
              const { yesPercentage, noPercentage, quorumProgress } = calculateProgress(proposal);
              const votingOpen = isVotingOpen(proposal);
              
              return (
                <div key={proposal.id} className="proposal-card">
                  <div className="proposal-header">
                    <div className="proposal-meta">
                      <span className="proposal-type">
                        {getProposalTypeIcon(proposal.type)} {getProposalTypeLabel(proposal.type)}
                      </span>
                      
                      <span 
                        className="proposal-status"
                        style={{ color: getStatusColor(proposal.status) }}
                      >
                        {getStatusIcon(proposal.status)} {proposal.status}
                      </span>
                      
                      {votingOpen && (
                        <span className="time-remaining">
                          ⏰ {getTimeRemaining(proposal.votingDeadline)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="proposal-content">
                    <h3 className="proposal-title">{proposal.title}</h3>
                    
                    <div className="proposer-info">
                      <strong>Proposed by:</strong>{' '}
                      {proposal.proposer.ensName || 
                       `${proposal.proposer.address.slice(0, 6)}...${proposal.proposer.address.slice(-4)}`}
                      <span className="proposer-reputation">
                        ({formatNumber(proposal.proposer.reputation)} rep)
                      </span>
                    </div>

                    <p className="proposal-description">
                      {proposal.description.length > 300
                        ? `${proposal.description.slice(0, 300)}...`
                        : proposal.description}
                    </p>

                    {/* Voting Progress */}
                    <div className="voting-progress">
                      <div className="progress-header">
                        <span>Voting Progress</span>
                        <span>{formatNumber(proposal.votes.total)} votes</span>
                      </div>
                      
                      <div className="progress-bars">
                        <div className="vote-bar">
                          <div className="vote-label">Yes ({formatPercentage(yesPercentage)})</div>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill yes"
                              style={{ width: `${yesPercentage}%` }}
                            ></div>
                          </div>
                          <div className="vote-count">{formatNumber(proposal.votes.yes)}</div>
                        </div>
                        
                        <div className="vote-bar">
                          <div className="vote-label">No ({formatPercentage(noPercentage)})</div>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill no"
                              style={{ width: `${noPercentage}%` }}
                            ></div>
                          </div>
                          <div className="vote-count">{formatNumber(proposal.votes.no)}</div>
                        </div>
                      </div>

                      <div className="quorum-progress">
                        <div className="quorum-label">
                          Quorum: {formatPercentage(Math.min(quorumProgress, 100))} 
                          ({formatNumber(proposal.votes.total)}/{formatNumber(proposal.requiredQuorum)})
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill quorum"
                            style={{ width: `${Math.min(quorumProgress, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* User Vote Status */}
                    {proposal.userVote && (
                      <div className="user-vote-status">
                        You voted: <strong>{proposal.userVote.toUpperCase()}</strong>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="proposal-actions">
                    {votingOpen && !proposal.userVote && userVotingPower > 0 && (
                      <button
                        onClick={() => {
                          setSelectedProposal(proposal);
                          setShowVoteModal(true);
                        }}
                        className="vote-btn"
                      >
                        🗳️ Vote
                      </button>
                    )}
                    
                    <button className="details-btn">
                      📄 View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Vote Modal */}
      {showVoteModal && selectedProposal && (
        <div className="modal-overlay" onClick={() => setShowVoteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cast Your Vote</h3>
              <button
                onClick={() => setShowVoteModal(false)}
                className="close-button"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="proposal-summary">
                <h4>{selectedProposal.title}</h4>
                <p>{selectedProposal.description}</p>
              </div>

              <div className="voting-power-info">
                <strong>Your Voting Power:</strong> {formatNumber(userVotingPower)}
              </div>

              <div className="vote-options">
                <button
                  onClick={() => handleVote(selectedProposal.id, 'yes')}
                  className="vote-option yes"
                >
                  ✅ Vote Yes
                </button>
                
                <button
                  onClick={() => handleVote(selectedProposal.id, 'no')}
                  className="vote-option no"
                >
                  ❌ Vote No
                </button>
                
                <button
                  onClick={() => handleVote(selectedProposal.id, 'abstain')}
                  className="vote-option abstain"
                >
                  ⚪ Abstain
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .governance-system {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem;
        }

        .governance-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .header-content h2 {
          color: var(--text-primary);
          margin: 0 0 0.5rem 0;
        }

        .header-content p {
          color: var(--text-secondary);
          margin: 0;
        }

        .create-proposal-btn {
          padding: 0.75rem 1.5rem;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .create-proposal-btn:hover {
          background: var(--primary-color-dark);
          transform: translateY(-1px);
        }

        .governance-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0.5rem;
          padding: 1.5rem;
          text-align: center;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: bold;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .governance-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--border-light);
        }

        .tab {
          padding: 1rem 1.5rem;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 2px solid transparent;
          font-weight: 500;
        }

        .tab:hover {
          color: var(--text-primary);
          background: var(--bg-tertiary);
        }

        .tab.active {
          color: var(--primary-color);
          border-bottom-color: var(--primary-color);
        }

        .loading-state,
        .error-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          text-align: center;
        }

        .loading-state p,
        .error-state p,
        .empty-state p {
          color: var(--text-secondary);
          margin: 1rem 0;
        }

        .error-state h3,
        .empty-state h3 {
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .retry-button,
        .create-first-proposal-btn {
          padding: 0.75rem 1.5rem;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .retry-button:hover,
        .create-first-proposal-btn:hover {
          background: var(--primary-color-dark);
        }

        .proposals-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .proposal-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0.75rem;
          padding: 2rem;
          transition: all 0.2s ease;
        }

        .proposal-card:hover {
          border-color: var(--border-medium);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .proposal-header {
          margin-bottom: 1rem;
        }

        .proposal-meta {
          display: flex;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .proposal-type {
          font-weight: 500;
          color: var(--text-primary);
        }

        .proposal-status {
          font-weight: 500;
        }

        .time-remaining {
          font-size: 0.875rem;
          color: var(--warning-color);
          font-weight: 500;
        }

        .proposal-content {
          margin-bottom: 1.5rem;
        }

        .proposal-title {
          color: var(--text-primary);
          margin: 0 0 1rem 0;
          font-size: 1.25rem;
        }

        .proposer-info {
          margin-bottom: 1rem;
          color: var(--text-secondary);
        }

        .proposer-info strong {
          color: var(--text-primary);
        }

        .proposer-reputation {
          font-size: 0.875rem;
          margin-left: 0.5rem;
        }

        .proposal-description {
          color: var(--text-primary);
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        .voting-progress {
          background: var(--bg-tertiary);
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .progress-bars {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .vote-bar {
          display: grid;
          grid-template-columns: 1fr 2fr auto;
          gap: 1rem;
          align-items: center;
        }

        .vote-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .progress-bar {
          height: 8px;
          background: var(--bg-quaternary);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .progress-fill.yes {
          background: var(--success-color);
        }

        .progress-fill.no {
          background: var(--error-color);
        }

        .progress-fill.quorum {
          background: var(--primary-color);
        }

        .vote-count {
          font-size: 0.875rem;
          color: var(--text-primary);
          font-weight: 500;
          text-align: right;
        }

        .quorum-progress {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 1rem;
          align-items: center;
        }

        .quorum-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .user-vote-status {
          background: var(--primary-color);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
          text-align: center;
        }

        .proposal-actions {
          display: flex;
          gap: 1rem;
        }

        .vote-btn,
        .details-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .vote-btn {
          background: var(--primary-color);
          color: white;
        }

        .vote-btn:hover {
          background: var(--primary-color-dark);
        }

        .details-btn {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border-light);
        }

        .details-btn:hover {
          background: var(--bg-quaternary);
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: var(--bg-primary);
          border-radius: 0.75rem;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-light);
        }

        .modal-header h3 {
          margin: 0;
          color: var(--text-primary);
        }

        .close-button {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 1.25rem;
          padding: 0.25rem;
        }

        .close-button:hover {
          color: var(--text-primary);
        }

        .modal-body {
          padding: 1.5rem;
        }

        .proposal-summary {
          margin-bottom: 1.5rem;
        }

        .proposal-summary h4 {
          margin: 0 0 0.5rem 0;
          color: var(--text-primary);
        }

        .proposal-summary p {
          margin: 0;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .voting-power-info {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border-radius: 0.5rem;
          color: var(--text-primary);
        }

        .vote-options {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .vote-option {
          padding: 1rem;
          border: none;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .vote-option.yes {
          background: var(--success-color);
          color: white;
        }

        .vote-option.no {
          background: var(--error-color);
          color: white;
        }

        .vote-option.abstain {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border-light);
        }

        .vote-option:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .governance-system {
            padding: 1rem;
          }

          .governance-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }

          .governance-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .governance-tabs {
            flex-wrap: wrap;
          }

          .proposal-meta {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .vote-bar {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .quorum-progress {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .proposal-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default GovernanceSystem;