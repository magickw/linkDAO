import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Image, Video, Clock, Users, Gavel, AlertCircle } from 'lucide-react';
import { DisputeType } from './DisputeCreationModal';

interface DisputeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  disputeId: number;
}

interface DisputeDetails {
  id: number;
  escrowId: number;
  initiator: string;
  respondent: string;
  disputeType: DisputeType;
  description: string;
  status: DisputeStatus;
  resolutionMethod: ResolutionMethod;
  createdAt: string;
  evidenceDeadline?: string;
  votingDeadline?: string;
  resolvedAt?: string;
  verdict?: VerdictType;
  refundAmount?: number;
  resolver?: string;
  evidence: Evidence[];
  votes: CommunityVote[];
}

interface Evidence {
  id: number;
  submitterId: string;
  evidenceType: string;
  ipfsHash: string;
  description: string;
  timestamp: string;
  verified: boolean;
}

interface CommunityVote {
  voterId: string;
  verdict: VerdictType;
  votingPower: number;
  reasoning?: string;
  timestamp: string;
}

enum DisputeStatus {
  CREATED = 'created',
  EVIDENCE_SUBMISSION = 'evidence_submission',
  ARBITRATION_PENDING = 'arbitration_pending',
  COMMUNITY_VOTING = 'community_voting',
  DAO_ESCALATION = 'dao_escalation',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled'
}

enum ResolutionMethod {
  AUTOMATED = 'automated',
  COMMUNITY_ARBITRATOR = 'community_arbitrator',
  DAO_GOVERNANCE = 'dao_governance'
}

enum VerdictType {
  FAVOR_BUYER = 'favor_buyer',
  FAVOR_SELLER = 'favor_seller',
  PARTIAL_REFUND = 'partial_refund',
  NO_FAULT = 'no_fault'
}

const statusLabels: Record<DisputeStatus, string> = {
  [DisputeStatus.CREATED]: 'Created',
  [DisputeStatus.EVIDENCE_SUBMISSION]: 'Evidence Submission',
  [DisputeStatus.ARBITRATION_PENDING]: 'Arbitration Pending',
  [DisputeStatus.COMMUNITY_VOTING]: 'Community Voting',
  [DisputeStatus.DAO_ESCALATION]: 'DAO Escalation',
  [DisputeStatus.RESOLVED]: 'Resolved',
  [DisputeStatus.CANCELLED]: 'Cancelled'
};

const verdictLabels: Record<VerdictType, string> = {
  [VerdictType.FAVOR_BUYER]: 'Favor Buyer',
  [VerdictType.FAVOR_SELLER]: 'Favor Seller',
  [VerdictType.PARTIAL_REFUND]: 'Partial Refund',
  [VerdictType.NO_FAULT]: 'No Fault'
};

const evidenceTypeIcons: Record<string, React.ReactNode> = {
  text: <FileText className="w-4 h-4" />,
  image: <Image className="w-4 h-4" />,
  document: <FileText className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />
};

export const DisputeDetailsModal: React.FC<DisputeDetailsModalProps> = ({
  isOpen,
  onClose,
  disputeId
}) => {
  const [dispute, setDispute] = useState<DisputeDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'evidence' | 'votes'>('details');

  // Evidence submission state
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceForm, setEvidenceForm] = useState({
    evidenceType: 'text',
    description: '',
    file: null as File | null
  });

  // Voting state
  const [showVotingForm, setShowVotingForm] = useState(false);
  const [voteForm, setVoteForm] = useState({
    verdict: VerdictType.NO_FAULT,
    reasoning: ''
  });

  useEffect(() => {
    if (isOpen && disputeId) {
      fetchDisputeDetails();
    }
  }, [isOpen, disputeId]);

  const fetchDisputeDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/disputes/${disputeId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch dispute details');
      }
      
      const data = await response.json();
      setDispute(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // In a real implementation, upload file to IPFS first
      const ipfsHash = 'mock-ipfs-hash'; // This would be the actual IPFS hash
      
      const response = await fetch(`/api/disputes/${disputeId}/evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          evidenceType: evidenceForm.evidenceType,
          ipfsHash,
          description: evidenceForm.description
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit evidence');
      }
      
      setShowEvidenceForm(false);
      setEvidenceForm({ evidenceType: 'text', description: '', file: null });
      fetchDisputeDetails(); // Refresh data
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCastVote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`/api/disputes/${disputeId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          verdict: voteForm.verdict,
          votingPower: 100, // This would be calculated based on user's reputation
          reasoning: voteForm.reasoning
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to cast vote');
      }
      
      setShowVotingForm(false);
      setVoteForm({ verdict: VerdictType.NO_FAULT, reasoning: '' });
      fetchDisputeDetails(); // Refresh data
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusColor = (status: DisputeStatus) => {
    switch (status) {
      case DisputeStatus.CREATED:
      case DisputeStatus.EVIDENCE_SUBMISSION:
        return 'bg-yellow-100 text-yellow-800';
      case DisputeStatus.ARBITRATION_PENDING:
      case DisputeStatus.COMMUNITY_VOTING:
        return 'bg-blue-100 text-blue-800';
      case DisputeStatus.DAO_ESCALATION:
        return 'bg-purple-100 text-purple-800';
      case DisputeStatus.RESOLVED:
        return 'bg-green-100 text-green-800';
      case DisputeStatus.CANCELLED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canSubmitEvidence = dispute?.status === DisputeStatus.EVIDENCE_SUBMISSION &&
    dispute.evidenceDeadline && new Date() < new Date(dispute.evidenceDeadline);

  const canVote = dispute?.status === DisputeStatus.COMMUNITY_VOTING &&
    dispute.votingDeadline && new Date() < new Date(dispute.votingDeadline);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Dispute #{disputeId}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading && (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading dispute details...</p>
          </div>
        )}

        {error && (
          <div className="p-6 bg-red-50 border-l-4 border-red-400">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {dispute && (
          <>
            {/* Header with status */}
            <div className="p-6 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(dispute.status)}`}>
                    {statusLabels[dispute.status]}
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    Created on {new Date(dispute.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {dispute.status === DisputeStatus.RESOLVED && dispute.verdict && (
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      Verdict: {verdictLabels[dispute.verdict]}
                    </p>
                    {dispute.refundAmount && (
                      <p className="text-sm text-gray-600">
                        Refund: ${dispute.refundAmount}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b">
              <nav className="flex space-x-8 px-6">
                {['details', 'evidence', 'votes'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab}
                    {tab === 'evidence' && dispute.evidence.length > 0 && (
                      <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                        {dispute.evidence.length}
                      </span>
                    )}
                    {tab === 'votes' && dispute.votes.length > 0 && (
                      <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                        {dispute.votes.length}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab content */}
            <div className="p-6">
              {activeTab === 'details' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Dispute Information</h3>
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Escrow ID</dt>
                        <dd className="mt-1 text-sm text-gray-900">#{dispute.escrowId}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Dispute Type</dt>
                        <dd className="mt-1 text-sm text-gray-900">{dispute.disputeType.replace(/_/g, ' ')}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Resolution Method</dt>
                        <dd className="mt-1 text-sm text-gray-900">{dispute.resolutionMethod.replace(/_/g, ' ')}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Status</dt>
                        <dd className="mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(dispute.status)}`}>
                            {statusLabels[dispute.status]}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Description</h4>
                    <p className="text-sm text-gray-900 bg-gray-50 p-4 rounded-md">
                      {dispute.description}
                    </p>
                  </div>

                  {/* Deadlines */}
                  {(dispute.evidenceDeadline || dispute.votingDeadline) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        Important Deadlines
                      </h4>
                      {dispute.evidenceDeadline && (
                        <p className="text-sm text-blue-800">
                          Evidence submission deadline: {new Date(dispute.evidenceDeadline).toLocaleString()}
                        </p>
                      )}
                      {dispute.votingDeadline && (
                        <p className="text-sm text-blue-800">
                          Voting deadline: {new Date(dispute.votingDeadline).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'evidence' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Evidence</h3>
                    {canSubmitEvidence && (
                      <button
                        onClick={() => setShowEvidenceForm(true)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Submit Evidence
                      </button>
                    )}
                  </div>

                  {dispute.evidence.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No evidence submitted yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dispute.evidence.map((evidence) => (
                        <div key={evidence.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              {evidenceTypeIcons[evidence.evidenceType]}
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {evidence.evidenceType.charAt(0).toUpperCase() + evidence.evidenceType.slice(1)} Evidence
                                </p>
                                <p className="text-xs text-gray-500">
                                  Submitted on {new Date(evidence.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            {evidence.verified && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Verified
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mt-3">{evidence.description}</p>
                          <a
                            href={`https://ipfs.io/ipfs/${evidence.ipfsHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block"
                          >
                            View on IPFS →
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Evidence submission form */}
                  {showEvidenceForm && (
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <h4 className="text-sm font-medium text-gray-900 mb-4">Submit New Evidence</h4>
                      <form onSubmit={handleSubmitEvidence} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Evidence Type
                          </label>
                          <select
                            value={evidenceForm.evidenceType}
                            onChange={(e) => setEvidenceForm(prev => ({ ...prev, evidenceType: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="text">Text</option>
                            <option value="image">Image</option>
                            <option value="document">Document</option>
                            <option value="video">Video</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                          </label>
                          <textarea
                            value={evidenceForm.description}
                            onChange={(e) => setEvidenceForm(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Describe this evidence and how it supports your case..."
                            required
                          />
                        </div>
                        {evidenceForm.evidenceType !== 'text' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              File
                            </label>
                            <input
                              type="file"
                              onChange={(e) => setEvidenceForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              accept={evidenceForm.evidenceType === 'image' ? 'image/*' : evidenceForm.evidenceType === 'video' ? 'video/*' : '*'}
                            />
                          </div>
                        )}
                        <div className="flex space-x-3">
                          <button
                            type="button"
                            onClick={() => setShowEvidenceForm(false)}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          >
                            Submit Evidence
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'votes' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Community Votes</h3>
                    {canVote && (
                      <button
                        onClick={() => setShowVotingForm(true)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Cast Vote
                      </button>
                    )}
                  </div>

                  {dispute.votes.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No votes cast yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dispute.votes.map((vote, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              {verdictLabels[vote.verdict]}
                            </span>
                            <div className="text-sm text-gray-500">
                              Voting Power: {vote.votingPower}
                            </div>
                          </div>
                          {vote.reasoning && (
                            <p className="text-sm text-gray-700">{vote.reasoning}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Cast on {new Date(vote.timestamp).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Voting form */}
                  {showVotingForm && (
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <h4 className="text-sm font-medium text-gray-900 mb-4">Cast Your Vote</h4>
                      <form onSubmit={handleCastVote} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Verdict
                          </label>
                          <select
                            value={voteForm.verdict}
                            onChange={(e) => setVoteForm(prev => ({ ...prev, verdict: e.target.value as VerdictType }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {Object.entries(verdictLabels).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reasoning (Optional)
                          </label>
                          <textarea
                            value={voteForm.reasoning}
                            onChange={(e) => setVoteForm(prev => ({ ...prev, reasoning: e.target.value }))}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Explain your decision..."
                          />
                        </div>
                        <div className="flex space-x-3">
                          <button
                            type="button"
                            onClick={() => setShowVotingForm(false)}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          >
                            Cast Vote
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};