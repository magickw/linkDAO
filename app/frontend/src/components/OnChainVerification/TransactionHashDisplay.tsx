import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OnChainProof, VerificationStatus } from '../../types/onChainVerification';
import { onChainVerificationService } from '../../services/web3/onChainVerificationService';
import ExplorerLinkButton from './ExplorerLinkButton';

interface TransactionHashDisplayProps {
  transactionHash: string;
  chainId?: number;
  showVerification?: boolean;
  showCopyButton?: boolean;
  showExplorerLink?: boolean;
  format?: 'full' | 'short' | 'minimal';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  onVerificationComplete?: (proof: OnChainProof | null) => void;
}

const FORMAT_CONFIGS = {
  full: (hash: string) => hash,
  short: (hash: string) => `${hash.slice(0, 10)}...${hash.slice(-8)}`,
  minimal: (hash: string) => `${hash.slice(0, 6)}...${hash.slice(-4)}`
};

const SIZE_CONFIGS = {
  small: {
    text: 'text-xs',
    container: 'p-2',
    button: 'h-6 w-6 text-xs'
  },
  medium: {
    text: 'text-sm',
    container: 'p-3',
    button: 'h-8 w-8 text-sm'
  },
  large: {
    text: 'text-base',
    container: 'p-4',
    button: 'h-10 w-10 text-base'
  }
};

export const TransactionHashDisplay: React.FC<TransactionHashDisplayProps> = ({
  transactionHash,
  chainId = 1,
  showVerification = true,
  showCopyButton = true,
  showExplorerLink = true,
  format = 'short',
  size = 'medium',
  className = '',
  onVerificationComplete
}) => {
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('pending');
  const [proof, setProof] = useState<OnChainProof | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const sizeConfig = SIZE_CONFIGS[size];
  const formatHash = FORMAT_CONFIGS[format];
  const linkSize = size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'md';

  useEffect(() => {
    if (showVerification && transactionHash) {
      verifyTransaction();
    }
  }, [transactionHash, showVerification]);

  const verifyTransaction = async () => {
    if (isVerifying) return;
    
    setIsVerifying(true);
    
    try {
      const response = await onChainVerificationService.verifyTransaction({
        transactionHash,
        expectedProofType: 'custom'
      });

      if (response.success && response.proof) {
        setProof(response.proof);
        setVerificationStatus(response.proof.status);
        onVerificationComplete?.(response.proof);
      } else {
        setVerificationStatus('failed');
        onVerificationComplete?.(null);
      }
    } catch (error) {
      console.error('Transaction verification failed:', error);
      setVerificationStatus('failed');
      onVerificationComplete?.(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(transactionHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getVerificationIcon = () => {
    if (isVerifying) {
      return (
        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      );
    }

    switch (verificationStatus) {
      case 'verified':
        return <span className="text-green-400">✅</span>;
      case 'failed':
        return <span className="text-red-400">❌</span>;
      case 'expired':
        return <span className="text-orange-400">⚠️</span>;
      default:
        return <span className="text-yellow-400">⏳</span>;
    }
  };

  const getStatusColor = () => {
    switch (verificationStatus) {
      case 'verified':
        return 'border-green-500/30 bg-green-500/10';
      case 'failed':
        return 'border-red-500/30 bg-red-500/10';
      case 'expired':
        return 'border-orange-500/30 bg-orange-500/10';
      default:
        return 'border-yellow-500/30 bg-yellow-500/10';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`
        flex items-center space-x-3 rounded-lg border border-gray-700/50
        bg-gray-800/30 backdrop-blur-sm ${sizeConfig.container}
        ${showVerification ? getStatusColor() : ''}
      `}>
        {/* Verification Status */}
        {showVerification && (
          <div 
            className="flex-shrink-0"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            {getVerificationIcon()}
          </div>
        )}

        {/* Transaction Hash */}
        <div className="flex-1 min-w-0">
          <code className={`
            font-mono text-gray-300 break-all
            ${sizeConfig.text}
          `}>
            {formatHash(transactionHash)}
          </code>
          
          {proof && proof.blockNumber > 0 && (
            <div className="text-xs text-gray-400 mt-1">
              Block #{proof.blockNumber.toLocaleString()}
              {proof.confirmations > 0 && (
                <span className="ml-2">
                  {proof.confirmations}/{proof.requiredConfirmations} confirmations
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {showCopyButton && (
            <motion.button
              onClick={copyToClipboard}
              className={`
                flex items-center justify-center rounded-md
                bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white
                transition-colors ${sizeConfig.button}
              `}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {copied ? '✓' : '📋'}
            </motion.button>
          )}

          {showExplorerLink && (
            <ExplorerLinkButton
              transactionHash={transactionHash}
              size={linkSize as 'sm' | 'md' | 'lg'}
              className="!px-2"
            />
          )}
        </div>
      </div>

      {/* Verification Tooltip */}
      <AnimatePresence>
        {showTooltip && showVerification && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute bottom-full left-0 mb-2 z-50"
          >
            <div className={`
              px-3 py-2 rounded-lg text-sm text-white
              bg-gray-900/95 backdrop-blur-sm border border-white/10
              shadow-lg max-w-xs
              ${getStatusColor()}
            `}>
              <div className="font-medium mb-1">
                Transaction {verificationStatus}
              </div>
              
              {proof && (
                <div className="text-xs text-gray-300 space-y-1">
                  <div>Confirmations: {proof.confirmations}/{proof.requiredConfirmations}</div>
                  {proof.timestamp && (
                    <div>Time: {new Date(proof.timestamp).toLocaleString()}</div>
                  )}
                  {proof.gasFee && (
                    <div>Gas Fee: {proof.gasFee} ETH</div>
                  )}
                </div>
              )}
              
              {isVerifying && (
                <div className="text-xs text-gray-300">
                  Verifying on blockchain...
                </div>
              )}
              
              {/* Tooltip arrow */}
              <div className="absolute top-full left-4">
                <div className="w-2 h-2 bg-gray-900 rotate-45 border-r border-b border-white/10"></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Copy Success Notification */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50"
          >
            <div className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg shadow-lg">
              Copied to clipboard!
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};