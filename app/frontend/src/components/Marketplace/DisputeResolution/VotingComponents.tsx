/**
 * VotingPanel and CreateDisputeModal components for dispute resolution
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Vote, 
  ThumbsUp, 
  ThumbsDown, 
  Scale,
  X,
  AlertTriangle,
  Users,
  TrendingUp,
  Clock
} from 'lucide-react';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { getVerdictColor } from './components';

// Voting Panel Component
export const VotingPanel: React.FC<{
  dispute: any;
  onCastVote: () => void;
  votingForm: any;
  setVotingForm: (form: any) => void;
  userRole: string;
}> = ({ dispute, onCastVote, votingForm, setVotingForm, userRole }) => {
  const canVote = dispute.status === 'community_voting' && userRole === 'community';
  const hasVoted = dispute.votes?.some((vote: any) => vote.voterId === '0x...'); // Mock check

  // Calculate vote distribution
  const voteDistribution = (dispute.votes || []).reduce((acc: any, vote: any) => {
    acc[vote.verdict] = (acc[vote.verdict] || 0) + vote.votingPower;
    return acc;
  }, {});

  const totalVotingPower = Object.values(voteDistribution).reduce((sum: any, power: any) => sum + power, 0) as number;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Community Voting
        </h3>
        
        {dispute.status === 'community_voting' && (
          <div className="flex items-center space-x-2 text-sm">
            <Vote size={16} className="text-green-400" />
            <span className="text-green-600 dark:text-green-400">Voting Active</span>
          </div>
        )}
      </div>

      {/* Vote Distribution */}
      {dispute.votes && dispute.votes.length > 0 && (
        <GlassPanel variant="primary" className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Current Results ({dispute.votes.length} votes)
          </h4>
          
          <div className="space-y-3">
            {['favor_buyer', 'favor_seller', 'partial_refund', 'no_fault'].map((verdict) => {
              const votes = voteDistribution[verdict] || 0;
              const percentage = totalVotingPower > 0 ? (votes / totalVotingPower) * 100 : 0;
              
              return (
                <div key={verdict} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-900 dark:text-white capitalize">
                      {verdict.replace('_', ' ')}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {votes} votes ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        verdict === 'favor_buyer' ? 'bg-green-400' :
                        verdict === 'favor_seller' ? 'bg-blue-400' :
                        verdict === 'partial_refund' ? 'bg-yellow-400' :
                        'bg-gray-400'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vote threshold indicator */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Voting Progress
              </span>
              <span className="text-gray-900 dark:text-white font-medium">
                {dispute.votes.length}/5 minimum votes
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((dispute.votes.length / 5) * 100, 100)}%` }}
              />
            </div>
          </div>
        </GlassPanel>
      )}

      {/* Individual Votes */}
      {dispute.votes && dispute.votes.length > 0 && (
        <GlassPanel variant="primary" className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Community Votes
          </h4>
          
          <div className="space-y-3">
            {dispute.votes.map((vote: any, index: number) => (
              <div key={index} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Voter #{index + 1}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getVerdictColor(vote.verdict)} bg-current bg-opacity-10`}>
                      {vote.verdict.replace('_', ' ')}
                    </span>
                  </div>
                  {vote.reasoning && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {vote.reasoning}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {vote.votingPower} VP
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(vote.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      {/* Cast Vote Form */}
      {canVote && !hasVoted && (
        <GlassPanel variant="primary" className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Cast Your Vote
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                Your Verdict
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'favor_buyer', label: 'Favor Buyer', icon: ThumbsUp, color: 'green' },
                  { value: 'favor_seller', label: 'Favor Seller', icon: ThumbsDown, color: 'blue' },
                  { value: 'partial_refund', label: 'Partial Refund', icon: Scale, color: 'yellow' },
                  { value: 'no_fault', label: 'No Fault', icon: Users, color: 'gray' }
                ].map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setVotingForm({ ...votingForm, verdict: option.value })}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        votingForm.verdict === option.value
                          ? `border-${option.color}-500 bg-${option.color}-50 dark:bg-${option.color}-900/20`
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Icon size={20} className={`${
                          votingForm.verdict === option.value 
                            ? `text-${option.color}-600 dark:text-${option.color}-400` 
                            : 'text-gray-400'
                        }`} />
                        <span className={`font-medium ${
                          votingForm.verdict === option.value
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {option.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Reasoning *
              </label>
              <textarea
                value={votingForm.reasoning}
                onChange={(e) => setVotingForm({ ...votingForm, reasoning: e.target.value })}
                placeholder="Explain your reasoning for this verdict..."
                rows={4}
                className="w-full p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Vote size={20} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Voting Power: 100 VP
                  </h5>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Your voting power is based on your reputation score and community standing.
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={onCastVote}
              disabled={!votingForm.reasoning.trim()}
              className="w-full"
            >
              <Vote size={16} className="mr-2" />
              Cast Vote
            </Button>
          </div>
        </GlassPanel>
      )}

      {/* Already Voted Message */}
      {canVote && hasVoted && (
        <GlassPanel variant="primary" className="p-6 text-center">
          <Vote size={32} className="mx-auto text-green-400 mb-2" />
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Vote Submitted
          </h4>
          <p className="text-gray-600 dark:text-gray-400">
            Thank you for participating in the community arbitration process.
          </p>
        </GlassPanel>
      )}

      {/* DAO Escalation Info */}
      {dispute.status === 'dao_escalation' && (
        <GlassPanel variant="primary" className="p-6">
          <div className="flex items-start space-x-3">
            <TrendingUp size={24} className="text-red-400 mt-1" />
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Escalated to DAO Governance
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                This dispute has been escalated to the DAO governance system due to its complexity or high value.
                Token holders can now vote on the resolution through the governance portal.
              </p>
              <Button variant="outline" size="small">
                <TrendingUp size={16} className="mr-2" />
                View in Governance
              </Button>
            </div>
          </div>
        </GlassPanel>
      )}
    </div>
  );
};

// Create Dispute Modal Component
export const CreateDisputeModal: React.FC<{
  createForm: any;
  setCreateForm: (form: any) => void;
  onSubmit: () => void;
  onClose: () => void;
}> = ({ createForm, setCreateForm, onSubmit, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <GlassPanel variant="primary" className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Create Dispute
            </h3>
            <Button
              variant="outline"
              size="small"
              onClick={onClose}
            >
              <X size={16} />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Escrow ID *
              </label>
              <input
                type="text"
                value={createForm.escrowId}
                onChange={(e) => setCreateForm({ ...createForm, escrowId: e.target.value })}
                placeholder="Enter escrow ID"
                className="w-full p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Dispute Type *
              </label>
              <select
                value={createForm.disputeType}
                onChange={(e) => setCreateForm({ ...createForm, disputeType: e.target.value })}
                className="w-full p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="product_not_received">Product Not Received</option>
                <option value="product_not_as_described">Product Not As Described</option>
                <option value="damaged_product">Damaged Product</option>
                <option value="unauthorized_transaction">Unauthorized Transaction</option>
                <option value="seller_misconduct">Seller Misconduct</option>
                <option value="buyer_misconduct">Buyer Misconduct</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Dispute Reason *
              </label>
              <textarea
                value={createForm.reason}
                onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                placeholder="Provide detailed explanation of the dispute..."
                rows={4}
                className="w-full p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Initial Evidence (Optional)
              </label>
              <textarea
                value={createForm.evidence}
                onChange={(e) => setCreateForm({ ...createForm, evidence: e.target.value })}
                placeholder="Describe any initial evidence you have..."
                rows={3}
                className="w-full p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h5 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                    Important Notice
                  </h5>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Creating a dispute will freeze the escrow funds until resolution. 
                    You will have 3 days to submit evidence before the community voting phase begins.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={onSubmit}
                disabled={!createForm.escrowId || !createForm.reason.trim()}
                className="flex-1"
              >
                <AlertTriangle size={16} className="mr-2" />
                Create Dispute
              </Button>
            </div>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
};