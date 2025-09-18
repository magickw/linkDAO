import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Vote, Users, Calendar } from 'lucide-react';

interface DAOEndorsement {
  id: string;
  endorserAddress: string;
  endorserENS?: string;
  proposalHash: string;
  voteCount: number;
  timestamp: Date;
  reason: string;
}

interface DAOEndorsementModalProps {
  isOpen: boolean;
  onClose: () => void;
  endorsements: DAOEndorsement[];
  sellerName: string;
}

export const DAOEndorsementModal: React.FC<DAOEndorsementModalProps> = ({
  isOpen,
  onClose,
  endorsements,
  sellerName
}) => {
  const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white/10 backdrop-blur-lg rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-white/20"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">DAO Endorsement Proof</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-white/80">
                On-chain verification of community endorsements for <span className="font-semibold text-white">{sellerName}</span>
              </p>
            </div>

            <div className="space-y-4">
              {endorsements.map((endorsement) => (
                <div key={endorsement.id} className="bg-white/10 rounded-lg p-4 border border-white/20">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-semibold">
                          {endorsement.endorserENS || formatAddress(endorsement.endorserAddress)}
                        </div>
                        <div className="flex items-center gap-2 text-white/60 text-sm">
                          <Calendar className="w-3 h-3" />
                          {endorsement.timestamp.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs">
                        <Vote className="w-3 h-3" />
                        {endorsement.voteCount} votes
                      </div>
                    </div>
                  </div>

                  <p className="text-white/80 mb-3">{endorsement.reason}</p>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/60 font-mono">
                      Proposal: {endorsement.proposalHash.slice(0, 10)}...{endorsement.proposalHash.slice(-6)}
                    </div>
                    <button className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm transition-colors">
                      <ExternalLink className="w-3 h-3" />
                      View on-chain
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-purple-500/20 rounded-lg border border-purple-400/30">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-purple-400 font-semibold">Web3 Transparency</span>
              </div>
              <p className="text-white/80 text-sm">
                All endorsements are recorded on-chain and verified through DAO governance proposals. 
                This ensures authentic community validation of seller reputation.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};