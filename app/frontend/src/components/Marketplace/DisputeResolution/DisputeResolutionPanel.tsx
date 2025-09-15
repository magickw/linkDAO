/**
 * DisputeResolutionPanel - Community arbitration system with DAO voting integration
 * Features: Dispute creation, evidence submission, community voting, DAO escalation
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  FileText, 
  Vote, 
  Clock, 
  CheckCircle, 
  X,
  Upload,
  Camera,
  MessageSquare,
  Shield,
  Users,
  Gavel,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Scale,
  Star,
  TrendingUp,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { useToast } from '@/context/ToastContext';
import { DisputeOverview, EvidencePanel, getStatusColor, getStatusIcon, getVerdictColor } from './components';
import { VotingPanel, CreateDisputeModal } from './VotingComponents';

interface Dispute {
  id: number;
  escrowId: number;
  reporterId: string;
  reason: string;
  status: DisputeStatus;
  createdAt: string;
  resolvedAt?: string;
  evidence: DisputeEvidence[];
  votes: CommunityVote[];
  escrow: {
    id: number;
    buyerId: string;
    sellerId: string;
    amount: string;
    listingId: number;
    product: {
      title: string;
      image: string;
      description: string;
    };
  };
  resolution?: {
    verdict: VerdictType;
    refundAmount: number;
    resolverId: string;
    reasoning: string;
    resolvedAt: string;
  };
}

interface DisputeEvidence {
  id: number;
  disputeId: number;
  submitterId: string;
  evidenceType: string;
  ipfsHash: string;
  description: string;
  timestamp: string;
  verified: boolean;
}

interface CommunityVote {
  disputeId: number;
  voterId: string;
  verdict: VerdictType;
  votingPower: number;
  reasoning?: string;
  timestamp: string;
}

type DisputeStatus = 'created' | 'evidence_submission' | 'arbitration_pending' | 'community_voting' | 'dao_escalation' | 'resolved' | 'cancelled';
type VerdictType = 'favor_buyer' | 'favor_seller' | 'partial_refund' | 'no_fault';
type DisputeType = 'product_not_received' | 'product_not_as_described' | 'damaged_product' | 'unauthorized_transaction' | 'seller_misconduct' | 'buyer_misconduct' | 'other';

interface DisputeResolutionPanelProps {
  orderId?: string;
  disputeId?: number;
  userRole?: 'buyer' | 'seller' | 'arbitrator' | 'community';
  className?: string;
}

export const DisputeResolutionPanel: React.FC<DisputeResolutionPanelProps> = ({
  orderId,
  disputeId,
  userRole = 'community',
  className = ''
}) => {
  const { address } = useAccount();
  const { addToast } = useToast();
  
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'voting' | 'create'>('overview');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create dispute form state
  const [createForm, setCreateForm] = useState({
    escrowId: '',
    reason: '',
    disputeType: 'product_not_received' as DisputeType,
    evidence: ''
  });

  // Evidence submission state
  const [evidenceForm, setEvidenceForm] = useState({
    evidenceType: 'text',
    description: '',
    file: null as File | null
  });

  // Voting state
  const [votingForm, setVotingForm] = useState({
    verdict: 'no_fault' as VerdictType,
    reasoning: ''
  });

  // Load disputes
  useEffect(() => {
    if (address) {
      loadDisputes();
    }
  }, [address, disputeId]);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      let endpoint = '/api/marketplace/disputes';
      
      if (disputeId) {
        endpoint = `/api/marketplace/disputes/${disputeId}`;
      } else if (orderId) {
        endpoint = `/api/marketplace/orders/${orderId}/disputes`;
      } else {
        endpoint = `/api/marketplace/disputes/community`;
      }

      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (disputeId && data.dispute) {
        setDisputes([data.dispute]);
        setSelectedDispute(data.dispute);
      } else {
        setDisputes(data.disputes || []);
      }
    } catch (error) {
      console.error('Error loading disputes:', error);
      addToast('Failed to load disputes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDispute = async () => {
    try {
      const response = await fetch('/api/marketplace/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          reporterId: address
        })
      });

      if (response.ok) {
        const data = await response.json();
        addToast('Dispute created successfully', 'success');
        setShowCreateModal(false);
        loadDisputes();
      } else {
        throw new Error('Failed to create dispute');
      }
    } catch (error) {
      console.error('Error creating dispute:', error);
      addToast('Failed to create dispute', 'error');
    }
  };

  const handleSubmitEvidence = async (disputeId: number) => {
    if (!evidenceForm.description.trim()) {
      addToast('Please provide evidence description', 'error');
      return;
    }

    try {
      // In a real implementation, upload file to IPFS first
      const ipfsHash = evidenceForm.file ? 'mock-ipfs-hash' : '';

      const response = await fetch(`/api/marketplace/disputes/${disputeId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submitterId: address,
          evidenceType: evidenceForm.evidenceType,
          ipfsHash,
          description: evidenceForm.description
        })
      });

      if (response.ok) {
        addToast('Evidence submitted successfully', 'success');
        setEvidenceForm({ evidenceType: 'text', description: '', file: null });
        loadDisputes();
      } else {
        throw new Error('Failed to submit evidence');
      }
    } catch (error) {
      console.error('Error submitting evidence:', error);
      addToast('Failed to submit evidence', 'error');
    }
  };

  const handleCastVote = async (disputeId: number) => {
    if (!votingForm.reasoning.trim()) {
      addToast('Please provide reasoning for your vote', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/marketplace/disputes/${disputeId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voterId: address,
          verdict: votingForm.verdict,
          votingPower: 100, // Mock voting power based on reputation
          reasoning: votingForm.reasoning
        })
      });

      if (response.ok) {
        addToast('Vote cast successfully', 'success');
        setVotingForm({ verdict: 'no_fault', reasoning: '' });
        loadDisputes();
      } else {
        throw new Error('Failed to cast vote');
      }
    } catch (error) {
      console.error('Error casting vote:', error);
      addToast('Failed to cast vote', 'error');
    }
  };

  const getStatusColor = (status: DisputeStatus) => {
    const colors = {
      created: 'text-blue-400 bg-blue-400/10',
      evidence_submission: 'text-yellow-400 bg-yellow-400/10',
      arbitration_pending: 'text-purple-400 bg-purple-400/10',
      community_voting: 'text-orange-400 bg-orange-400/10',
      dao_escalation: 'text-red-400 bg-red-400/10',
      resolved: 'text-green-400 bg-green-400/10',
      cancelled: 'text-gray-400 bg-gray-400/10'
    };
    return colors[status] || colors.created;
  };

  const getStatusIcon = (status: DisputeStatus) => {
    const icons = {
      created: AlertTriangle,
      evidence_submission: FileText,
      arbitration_pending: Gavel,
      community_voting: Vote,
      dao_escalation: TrendingUp,
      resolved: CheckCircle,
      cancelled: X
    };
    return icons[status] || AlertTriangle;
  };

  const getVerdictColor = (verdict: VerdictType) => {
    const colors = {
      favor_buyer: 'text-green-400',
      favor_seller: 'text-blue-400',
      partial_refund: 'text-yellow-400',
      no_fault: 'text-gray-400'
    };
    return colors[verdict] || colors.no_fault;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin text-blue-400" size={24} />
        <span className="ml-2 text-white">Loading disputes...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dispute Resolution
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Community-driven dispute arbitration system
          </p>
        </div>
        
        {userRole !== 'community' && (
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
          >
            <AlertTriangle size={16} className="mr-2" />
            Create Dispute
          </Button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        {['overview', 'evidence', 'voting', userRole === 'community' ? null : 'create'].filter(Boolean).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {tab!.charAt(0).toUpperCase() + tab!.slice(1)}
          </button>
        ))}
      </div>

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <DisputeOverview 
          disputes={disputes} 
          onSelectDispute={setSelectedDispute}
          selectedDispute={selectedDispute}
        />
      )}

      {activeTab === 'evidence' && selectedDispute && (
        <EvidencePanel
          dispute={selectedDispute}
          onSubmitEvidence={() => handleSubmitEvidence(selectedDispute.id)}
          evidenceForm={evidenceForm}
          setEvidenceForm={setEvidenceForm}
          userRole={userRole}
        />
      )}

      {activeTab === 'voting' && selectedDispute && (
        <VotingPanel
          dispute={selectedDispute}
          onCastVote={() => handleCastVote(selectedDispute.id)}
          votingForm={votingForm}
          setVotingForm={setVotingForm}
          userRole={userRole}
        />
      )}

      {/* Create Dispute Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateDisputeModal
            createForm={createForm}
            setCreateForm={setCreateForm}
            onSubmit={handleCreateDispute}
            onClose={() => setShowCreateModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DisputeResolutionPanel;