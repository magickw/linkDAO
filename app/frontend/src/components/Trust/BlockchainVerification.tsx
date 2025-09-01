import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassPanel } from '../../design-system/components/GlassPanel';

interface BlockchainVerificationProps {
  transactionHash?: string;
  contractAddress?: string;
  tokenId?: string;
  blockNumber?: number;
  timestamp?: number;
  network?: 'ethereum' | 'polygon' | 'arbitrum';
  className?: string;
}

interface VerificationStatus {
  status: 'loading' | 'verified' | 'failed' | 'pending';
  confirmations?: number;
  gasUsed?: string;
  blockHash?: string;
}

export const BlockchainVerification: React.FC<BlockchainVerificationProps> = ({
  transactionHash,
  contractAddress,
  tokenId,
  blockNumber,
  timestamp,
  network = 'ethereum',
  className = ''
}) => {
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    status: 'loading'
  });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Simulate blockchain verification
    const timer = setTimeout(() => {
      setVerificationStatus({
        status: 'verified',
        confirmations: 42,
        gasUsed: '0.0021 ETH',
        blockHash: '0x1234...5678'
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [transactionHash]);

  const getExplorerUrl = (type: 'tx' | 'address' | 'token', value: string) => {
    const baseUrls = {
      ethereum: 'https://etherscan.io',
      polygon: 'https://polygonscan.com',
      arbitrum: 'https://arbiscan.io'
    };

    const base = baseUrls[network];
    
    switch (type) {
      case 'tx':
        return `${base}/tx/${value}`;
      case 'address':
        return `${base}/address/${value}`;
      case 'token':
        return `${base}/token/${contractAddress}?a=${tokenId}`;
      default:
        return base;
    }
  };

  const getNetworkIcon = () => {
    switch (network) {
      case 'ethereum':
        return '⟠';
      case 'polygon':
        return '⬟';
      case 'arbitrum':
        return '🔷';
      default:
        return '⛓️';
    }
  };

  const getStatusColor = () => {
    switch (verificationStatus.status) {
      case 'verified':
        return 'text-green-400 border-green-500/20 bg-green-500/10';
      case 'failed':
        return 'text-red-400 border-red-500/20 bg-red-500/10';
      case 'pending':
        return 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10';
      default:
        return 'text-blue-400 border-blue-500/20 bg-blue-500/10';
    }
  };

  return (
    <GlassPanel className={`p-6 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{getNetworkIcon()}</div>
            <div>
              <h3 className="text-lg font-semibold text-white">Blockchain Verification</h3>
              <p className="text-sm text-gray-400 capitalize">{network} Network</p>
            </div>
          </div>
          
          <motion.div
            className={`px-3 py-1 rounded-full border ${getStatusColor()}`}
            animate={verificationStatus.status === 'loading' ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <div className="flex items-center space-x-2">
              {verificationStatus.status === 'loading' && (
                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              )}
              {verificationStatus.status === 'verified' && <span>✅</span>}
              {verificationStatus.status === 'failed' && <span>❌</span>}
              {verificationStatus.status === 'pending' && <span>⏳</span>}
              <span className="text-sm font-medium">
                {verificationStatus.status === 'loading' && 'Verifying...'}
                {verificationStatus.status === 'verified' && 'Verified'}
                {verificationStatus.status === 'failed' && 'Failed'}
                {verificationStatus.status === 'pending' && 'Pending'}
              </span>
            </div>
          </motion.div>
        </div>

        {verificationStatus.status === 'verified' && verificationStatus.confirmations && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-gray-300"
          >
            <span className="text-green-400 font-medium">{verificationStatus.confirmations}</span> confirmations
          </motion.div>
        )}

        <div className="space-y-3">
          {transactionHash && (
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div>
                <p className="text-xs text-gray-400 mb-1">Transaction Hash</p>
                <code className="text-sm text-gray-300">
                  {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
                </code>
              </div>
              <button
                onClick={() => window.open(getExplorerUrl('tx', transactionHash), '_blank')}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                View →
              </button>
            </div>
          )}

          {contractAddress && (
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div>
                <p className="text-xs text-gray-400 mb-1">Contract Address</p>
                <code className="text-sm text-gray-300">
                  {contractAddress.slice(0, 10)}...{contractAddress.slice(-8)}
                </code>
              </div>
              <button
                onClick={() => window.open(getExplorerUrl('address', contractAddress), '_blank')}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                View →
              </button>
            </div>
          )}

          {tokenId && contractAddress && (
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div>
                <p className="text-xs text-gray-400 mb-1">NFT Token</p>
                <code className="text-sm text-gray-300">#{tokenId}</code>
              </div>
              <button
                onClick={() => window.open(getExplorerUrl('token', tokenId), '_blank')}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                View NFT →
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full text-center text-sm text-gray-400 hover:text-white transition-colors"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>

        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-2 pt-4 border-t border-gray-700"
          >
            {blockNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Block Number:</span>
                <span className="text-gray-300">#{blockNumber.toLocaleString()}</span>
              </div>
            )}
            
            {timestamp && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Timestamp:</span>
                <span className="text-gray-300">
                  {new Date(timestamp * 1000).toLocaleString()}
                </span>
              </div>
            )}
            
            {verificationStatus.gasUsed && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Gas Used:</span>
                <span className="text-gray-300">{verificationStatus.gasUsed}</span>
              </div>
            )}
            
            {verificationStatus.blockHash && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Block Hash:</span>
                <code className="text-gray-300 text-xs">
                  {verificationStatus.blockHash}
                </code>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </GlassPanel>
  );
};