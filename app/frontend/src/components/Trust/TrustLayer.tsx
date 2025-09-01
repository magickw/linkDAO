import React from 'react';
import { motion } from 'framer-motion';
import { GlassPanel } from '../../design-system/components/GlassPanel';
import { TrustIndicators } from '../../design-system/components/TrustIndicators';

interface TrustLayerProps {
  escrowGuarantee?: boolean;
  authenticityNFT?: string;
  buyerProtection?: boolean;
  transactionHash?: string;
  blockNumber?: number;
  className?: string;
}

export const TrustLayer: React.FC<TrustLayerProps> = ({
  escrowGuarantee = false,
  authenticityNFT,
  buyerProtection = false,
  transactionHash,
  blockNumber,
  className = ''
}) => {
  return (
    <GlassPanel className={`p-6 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <h3 className="text-lg font-semibold text-white">Trust & Security</h3>
        </div>

        <TrustIndicators
          escrowProtected={escrowGuarantee}
          onChainCertified={!!authenticityNFT}
          verified={buyerProtection}
        />

        {escrowGuarantee && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20"
          >
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">🔒</span>
            </div>
            <div>
              <p className="text-green-400 font-medium">Escrow Protected</p>
              <p className="text-gray-300 text-sm">Your payment is secured until delivery confirmation</p>
            </div>
          </motion.div>
        )}

        {authenticityNFT && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center space-x-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20"
          >
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">⛓️</span>
            </div>
            <div>
              <p className="text-blue-400 font-medium">Blockchain Certified</p>
              <p className="text-gray-300 text-sm">Authenticity verified on-chain</p>
              <button
                onClick={() => window.open(`https://etherscan.io/token/${authenticityNFT}`, '_blank')}
                className="text-blue-400 text-xs hover:underline mt-1"
              >
                View Certificate →
              </button>
            </div>
          </motion.div>
        )}

        {buyerProtection && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center space-x-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20"
          >
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">✅</span>
            </div>
            <div>
              <p className="text-purple-400 font-medium">Buyer Protection</p>
              <p className="text-gray-300 text-sm">Full refund guarantee with dispute resolution</p>
            </div>
          </motion.div>
        )}

        {transactionHash && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-3 bg-gray-800/50 rounded-lg border border-gray-700"
          >
            <p className="text-gray-400 text-sm mb-2">Transaction Proof</p>
            <div className="flex items-center space-x-2">
              <code className="text-xs text-gray-300 bg-gray-900 px-2 py-1 rounded">
                {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
              </code>
              <button
                onClick={() => window.open(`https://etherscan.io/tx/${transactionHash}`, '_blank')}
                className="text-blue-400 text-xs hover:underline"
              >
                View on Etherscan →
              </button>
            </div>
            {blockNumber && (
              <p className="text-gray-500 text-xs mt-1">Block #{blockNumber.toLocaleString()}</p>
            )}
          </motion.div>
        )}
      </div>
    </GlassPanel>
  );
};