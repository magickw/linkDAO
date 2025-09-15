/**
 * Supporting components for DisputeResolutionPanel
 * DisputeOverview, EvidencePanel, VotingPanel, CreateDisputeModal
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  FileText, 
  Vote, 
  CheckCircle, 
  X,
  Upload,
  ThumbsUp,
  ThumbsDown,
  Scale,
  TrendingUp,
  Eye,
  Clock
} from 'lucide-react';
import { formatEther } from 'viem';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';

// Helper functions
export const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
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

export const getStatusIcon = (status: string) => {
  const icons: Record<string, any> = {
    created: AlertTriangle,
    evidence_submission: FileText,
    arbitration_pending: Scale,
    community_voting: Vote,
    dao_escalation: TrendingUp,
    resolved: CheckCircle,
    cancelled: X
  };
  return icons[status] || AlertTriangle;
};

export const getVerdictColor = (verdict: string) => {
  const colors: Record<string, string> = {
    favor_buyer: 'text-green-400',
    favor_seller: 'text-blue-400',
    partial_refund: 'text-yellow-400',
    no_fault: 'text-gray-400'
  };
  return colors[verdict] || colors.no_fault;
};

// Overview Component
export const DisputeOverview: React.FC<{
  disputes: any[];
  onSelectDispute: (dispute: any) => void;
  selectedDispute: any;
}> = ({ disputes, onSelectDispute, selectedDispute }) => {
  if (disputes.length === 0) {
    return (
      <GlassPanel variant="primary" className="p-8 text-center">
        <AlertTriangle size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No disputes found
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          There are currently no active disputes to review.
        </p>
      </GlassPanel>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Disputes List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Active Disputes ({disputes.length})
        </h3>
        
        {disputes.map((dispute) => {
          const StatusIcon = getStatusIcon(dispute.status);
          const statusColor = getStatusColor(dispute.status);

          return (
            <motion.div
              key={dispute.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`cursor-pointer ${
                selectedDispute?.id === dispute.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => onSelectDispute(dispute)}
            >
              <GlassPanel variant="primary" className="p-4 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <img
                      src={dispute.escrow?.product?.image || '/images/placeholder.jpg'}
                      alt={dispute.escrow?.product?.title || 'Product'}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {dispute.escrow?.product?.title || 'Unknown Product'}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Dispute #{dispute.id}
                      </p>
                    </div>
                  </div>
                  
                  <div className={`flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                    <StatusIcon size={14} className="mr-1" />
                    {dispute.status.replace('_', ' ').toUpperCase()}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {dispute.escrow?.amount ? formatEther(BigInt(dispute.escrow.amount)) : '0'} ETH
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Created:</span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(dispute.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {dispute.votes && dispute.votes.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Votes:</span>
                      <span className="text-gray-900 dark:text-white">
                        {dispute.votes.length}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {dispute.reason}
                  </p>
                </div>
              </GlassPanel>
            </motion.div>
          );
        })}
      </div>

      {/* Selected Dispute Details */}
      {selectedDispute && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Dispute Details
          </h3>
          
          <GlassPanel variant="primary" className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                  Dispute #{selectedDispute.id}
                </h4>
                <div className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(selectedDispute.status)}`}>
                  {React.createElement(getStatusIcon(selectedDispute.status), { size: 16, className: "mr-2" })}
                  {selectedDispute.status.replace('_', ' ').toUpperCase()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">Escrow Amount:</span>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedDispute.escrow?.amount ? formatEther(BigInt(selectedDispute.escrow.amount)) : '0'} ETH
                  </p>
                </div>
                
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">Created:</span>
                  <p className="text-gray-600 dark:text-gray-400">
                    {new Date(selectedDispute.createdAt).toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">Evidence Count:</span>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedDispute.evidence?.length || 0} items
                  </p>
                </div>
                
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">Community Votes:</span>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedDispute.votes?.length || 0} votes
                  </p>
                </div>
              </div>

              <div>
                <span className="font-medium text-gray-900 dark:text-white">Dispute Reason:</span>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {selectedDispute.reason}
                </p>
              </div>

              {selectedDispute.resolution && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2">Resolution</h5>
                  <div className={`text-sm ${getVerdictColor(selectedDispute.resolution.verdict)}`}>
                    <strong>Verdict:</strong> {selectedDispute.resolution.verdict.replace('_', ' ')}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedDispute.resolution.reasoning}
                  </p>
                </div>
              )}
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
};

// Evidence Panel Component
export const EvidencePanel: React.FC<{
  dispute: any;
  onSubmitEvidence: () => void;
  evidenceForm: any;
  setEvidenceForm: (form: any) => void;
  userRole: string;
}> = ({ dispute, onSubmitEvidence, evidenceForm, setEvidenceForm, userRole }) => {
  const canSubmitEvidence = ['buyer', 'seller'].includes(userRole) && 
    dispute.status === 'evidence_submission';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Evidence ({dispute.evidence?.length || 0})
        </h3>
        
        {canSubmitEvidence && (
          <span className="text-sm text-green-600 dark:text-green-400">
            Evidence submission period active
          </span>
        )}
      </div>

      {/* Evidence List */}
      <div className="space-y-4">
        {!dispute.evidence || dispute.evidence.length === 0 ? (
          <GlassPanel variant="primary" className="p-6 text-center">
            <FileText size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600 dark:text-gray-400">No evidence submitted yet</p>
          </GlassPanel>
        ) : (
          dispute.evidence.map((evidence: any, index: number) => (
            <GlassPanel key={evidence.id} variant="primary" className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <FileText size={16} className="text-blue-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    Evidence #{index + 1}
                  </span>
                  {evidence.verified && (
                    <CheckCircle size={16} className="text-green-400" />
                  )}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(evidence.timestamp).toLocaleString()}
                </span>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                Type: {evidence.evidenceType}
              </p>
              
              <p className="text-gray-900 dark:text-white">
                {evidence.description}
              </p>
              
              {evidence.ipfsHash && (
                <div className="mt-2">
                  <a
                    href={`https://ipfs.io/ipfs/${evidence.ipfsHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 text-sm"
                  >
                    View attachment →
                  </a>
                </div>
              )}
            </GlassPanel>
          ))
        )}
      </div>

      {/* Submit Evidence Form */}
      {canSubmitEvidence && (
        <GlassPanel variant="primary" className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Submit Evidence
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Evidence Type
              </label>
              <select
                value={evidenceForm.evidenceType}
                onChange={(e) => setEvidenceForm({ ...evidenceForm, evidenceType: e.target.value })}
                className="w-full p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
              >
                <option value="text">Text Description</option>
                <option value="image">Image</option>
                <option value="document">Document</option>
                <option value="video">Video</option>
                <option value="screenshot">Screenshot</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Description *
              </label>
              <textarea
                value={evidenceForm.description}
                onChange={(e) => setEvidenceForm({ ...evidenceForm, description: e.target.value })}
                placeholder="Provide detailed description of the evidence..."
                rows={4}
                className="w-full p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            {evidenceForm.evidenceType !== 'text' && (
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Upload File
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    Click to upload or drag and drop
                  </p>
                  <input
                    type="file"
                    onChange={(e) => setEvidenceForm({ ...evidenceForm, file: e.target.files?.[0] || null })}
                    className="hidden"
                    id="evidence-file"
                  />
                  <label
                    htmlFor="evidence-file"
                    className="cursor-pointer text-blue-500 hover:text-blue-600"
                  >
                    Choose file
                  </label>
                </div>
              </div>
            )}

            <Button
              variant="primary"
              onClick={onSubmitEvidence}
              disabled={!evidenceForm.description.trim()}
              className="w-full"
            >
              <Upload size={16} className="mr-2" />
              Submit Evidence
            </Button>
          </div>
        </GlassPanel>
      )}
    </div>
  );
};