import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OnChainProof, ProofType, VerificationBadge } from '../../types/onChainVerification';
import { onChainVerificationService } from '../../services/web3/onChainVerificationService';

interface OnChainVerificationBadgeProps {
  proof: OnChainProof;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  showTooltip?: boolean;
  className?: string;
  onViewTransaction?: (txHash: string) => void;
}

const PROOF_TYPE_CONFIGS: Record<ProofType, VerificationBadge> = {
  governance_vote: {
    type: 'governance_vote',
    label: 'Governance Vote',
    color: 'from-purple-500 to-indigo-500',
    icon: '🗳️',
    tooltip: 'This action was verified on-chain through governance voting',
    clickable: true
  },
  token_transfer: {
    type: 'token_transfer',
    label: 'Token Transfer',
    color: 'from-green-500 to-emerald-500',
    icon: '💸',
    tooltip: 'This token transfer was verified on the blockchain',
    clickable: true
  },
  nft_mint: {
    type: 'nft_mint',
    label: 'NFT Mint',
    color: 'from-pink-500 to-rose-500',
    icon: '🎨',
    tooltip: 'This NFT mint was verified on the blockchain',
    clickable: true
  },
  staking_action: {
    type: 'staking_action',
    label: 'Staking Action',
    color: 'from-blue-500 to-cyan-500',
    icon: '🔒',
    tooltip: 'This staking action was verified on the blockchain',
    clickable: true
  },
  contract_interaction: {
    type: 'contract_interaction',
    label: 'Contract Interaction',
    color: 'from-orange-500 to-amber-500',
    icon: '⚡',
    tooltip: 'This smart contract interaction was verified on-chain',
    clickable: true
  },
  custom: {
    type: 'custom',
    label: 'Verified',
    color: 'from-gray-500 to-slate-500',
    icon: '✅',
    tooltip: 'This action was verified on the blockchain',
    clickable: true
  }
};

const SIZE_CONFIGS = {
  small: {
    container: 'h-6 px-2 text-xs',
    icon: 'text-sm',
    label: 'text-xs'
  },
  medium: {
    container: 'h-8 px-3 text-sm',
    icon: 'text-base',
    label: 'text-sm'
  },
  large: {
    container: 'h-10 px-4 text-base',
    icon: 'text-lg',
    label: 'text-base'
  }
};

export const OnChainVerificationBadge: React.FC<OnChainVerificationBadgeProps> = ({
  proof,
  size = 'medium',
  showLabel = true,
  showTooltip = true,
  className = '',
  onViewTransaction
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const config = PROOF_TYPE_CONFIGS[proof.proofType];
  const sizeConfig = SIZE_CONFIGS[size];
  
  const handleClick = () => {
    if (config.clickable) {
      if (onViewTransaction) {
        onViewTransaction(proof.transactionHash);
      } else {
        // Default behavior: open in blockchain explorer
        const explorerUrl = onChainVerificationService.getExplorerUrl(
          1, // Default to Ethereum mainnet
          'transaction',
          proof.transactionHash
        );
        if (explorerUrl) {
          window.open(explorerUrl, '_blank');
        }
      }
    }
  };

  const getStatusIndicator = () => {
    switch (proof.status) {
      case 'verified':
        return '✅';
      case 'pending':
        return '⏳';
      case 'failed':
        return '❌';
      case 'expired':
        return '⚠️';
      default:
        return '❓';
    }
  };

  const getStatusColor = () => {
    switch (proof.status) {
      case 'verified':
        return 'border-green-500/30 bg-green-500/10';
      case 'pending':
        return 'border-yellow-500/30 bg-yellow-500/10';
      case 'failed':
        return 'border-red-500/30 bg-red-500/10';
      case 'expired':
        return 'border-orange-500/30 bg-orange-500/10';
      default:
        return 'border-gray-500/30 bg-gray-500/10';
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <motion.button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          inline-flex items-center space-x-2 rounded-full
          bg-gradient-to-r ${config.color}
          ${sizeConfig.container}
          ${config.clickable ? 'cursor-pointer hover:shadow-lg' : 'cursor-default'}
          transition-all duration-200 border border-white/20
          ${className}
        `}
        whileHover={config.clickable ? { scale: 1.05 } : {}}
        whileTap={config.clickable ? { scale: 0.95 } : {}}
      >
        <span className={`${sizeConfig.icon}`}>
          {config.icon}
        </span>
        
        {showLabel && (
          <span className={`font-medium text-white ${sizeConfig.label}`}>
            {config.label}
          </span>
        )}
        
        <span className={`${sizeConfig.icon}`}>
          {getStatusIndicator()}
        </span>
      </motion.button>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50"
          >
            <div className={`
              px-3 py-2 rounded-lg text-sm text-white
              bg-gray-900/95 backdrop-blur-sm border border-white/10
              shadow-lg max-w-xs text-center
              ${getStatusColor()}
            `}>
              <div className="font-medium mb-1">{config.tooltip}</div>
              <div className="text-xs text-gray-300">
                Status: {proof.status} • {proof.confirmations}/{proof.requiredConfirmations} confirmations
              </div>
              {proof.timestamp && (
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(proof.timestamp).toLocaleString()}
                </div>
              )}
              
              {/* Tooltip arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                <div className="w-2 h-2 bg-gray-900 rotate-45 border-r border-b border-white/10"></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detailed Modal */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Verification Details</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className={`p-3 rounded-lg ${getStatusColor()}`}>
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{getStatusIndicator()}</span>
                    <div>
                      <p className="font-medium text-white capitalize">{proof.status}</p>
                      <p className="text-sm text-gray-300">{config.tooltip}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Transaction Hash:</span>
                    <code className="text-gray-300 text-xs">
                      {proof.transactionHash.slice(0, 10)}...{proof.transactionHash.slice(-8)}
                    </code>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Block Number:</span>
                    <span className="text-gray-300">#{proof.blockNumber.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Confirmations:</span>
                    <span className="text-gray-300">{proof.confirmations}/{proof.requiredConfirmations}</span>
                  </div>
                  
                  {proof.gasFee && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Gas Fee:</span>
                      <span className="text-gray-300">{proof.gasFee} ETH</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleClick}
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  View on Explorer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};