import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '../../design-system/components/GlassPanel';

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  creator: string;
  royalties?: number;
}

interface ProvenanceRecord {
  owner: string;
  timestamp: number;
  transactionHash: string;
  price?: string;
  event: 'minted' | 'transferred' | 'sold' | 'listed';
}

interface NFTVerificationBadgeProps {
  contractAddress: string;
  tokenId: string;
  metadata?: NFTMetadata;
  provenance?: ProvenanceRecord[];
  verified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showProvenance?: boolean;
  className?: string;
}

export const NFTVerificationBadge: React.FC<NFTVerificationBadgeProps> = ({
  contractAddress,
  tokenId,
  metadata,
  provenance = [],
  verified = true,
  size = 'medium',
  showProvenance = false,
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'metadata' | 'provenance'>('metadata');

  const sizeClasses = {
    small: 'w-6 h-6 text-xs',
    medium: 'w-8 h-8 text-sm',
    large: 'w-12 h-12 text-base'
  };

  const getEventIcon = (event: string) => {
    switch (event) {
      case 'minted':
        return '🎨';
      case 'transferred':
        return '📤';
      case 'sold':
        return '💰';
      case 'listed':
        return '🏷️';
      default:
        return '📝';
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (size === 'small') {
    return (
      <motion.div
        className={`inline-flex items-center space-x-1 ${className}`}
        whileHover={{ scale: 1.05 }}
      >
        <div className={`${sizeClasses[size]} bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center`}>
          <span className="text-white">⛓️</span>
        </div>
        {verified && (
          <span className="text-purple-400 font-medium text-xs">NFT Verified</span>
        )}
      </motion.div>
    );
  }

  return (
    <div className={className}>
      <motion.button
        onClick={() => setShowDetails(true)}
        className={`${sizeClasses[size]} bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-purple-500/25 transition-all duration-300`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-white">⛓️</span>
      </motion.button>

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
              className="w-full max-w-2xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <GlassPanel className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xl">⛓️</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">NFT Verification</h3>
                      <p className="text-gray-400">Token #{tokenId}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="text-gray-400 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>

                {/* Verification Status */}
                <div className="mb-6 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-400 text-xl">✅</span>
                    <div>
                      <p className="text-green-400 font-medium">Authentic NFT Verified</p>
                      <p className="text-gray-300 text-sm">
                        This digital asset is verified on the blockchain
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contract Info */}
                <div className="mb-6 space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Contract Address</p>
                      <code className="text-sm text-gray-300">{formatAddress(contractAddress)}</code>
                    </div>
                    <button
                      onClick={() => window.open(`https://etherscan.io/address/${contractAddress}`, '_blank')}
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                    >
                      View Contract →
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Token ID</p>
                      <code className="text-sm text-gray-300">#{tokenId}</code>
                    </div>
                    <button
                      onClick={() => window.open(`https://opensea.io/assets/ethereum/${contractAddress}/${tokenId}`, '_blank')}
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                    >
                      View on OpenSea →
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                {(metadata || showProvenance) && (
                  <>
                    <div className="flex space-x-1 mb-4">
                      {metadata && (
                        <button
                          onClick={() => setActiveTab('metadata')}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            activeTab === 'metadata'
                              ? 'bg-purple-500 text-white'
                              : 'text-gray-400 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          Metadata
                        </button>
                      )}
                      {showProvenance && (
                        <button
                          onClick={() => setActiveTab('provenance')}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            activeTab === 'provenance'
                              ? 'bg-purple-500 text-white'
                              : 'text-gray-400 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          Provenance ({provenance.length})
                        </button>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                      {activeTab === 'metadata' && metadata && (
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-white font-medium mb-2">{metadata.name}</h4>
                            <p className="text-gray-300 text-sm">{metadata.description}</p>
                          </div>

                          {metadata.attributes.length > 0 && (
                            <div>
                              <h5 className="text-white font-medium mb-2">Attributes</h5>
                              <div className="grid grid-cols-2 gap-2">
                                {metadata.attributes.map((attr, index) => (
                                  <div key={index} className="p-2 bg-gray-800/50 rounded">
                                    <p className="text-xs text-gray-400">{attr.trait_type}</p>
                                    <p className="text-sm text-white">{attr.value}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Creator:</span>
                            <code className="text-gray-300">{formatAddress(metadata.creator)}</code>
                          </div>

                          {metadata.royalties && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Royalties:</span>
                              <span className="text-gray-300">{metadata.royalties}%</span>
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'provenance' && showProvenance && (
                        <div className="space-y-3">
                          {provenance.map((record, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg"
                            >
                              <div className="text-xl">{getEventIcon(record.event)}</div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-white font-medium capitalize">{record.event}</span>
                                  <span className="text-xs text-gray-400">
                                    {new Date(record.timestamp * 1000).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-400">
                                  {formatAddress(record.owner)}
                                  {record.price && (
                                    <span className="ml-2 text-green-400">{record.price}</span>
                                  )}
                                </p>
                              </div>
                              <button
                                onClick={() => window.open(`https://etherscan.io/tx/${record.transactionHash}`, '_blank')}
                                className="text-blue-400 hover:text-blue-300 text-xs"
                              >
                                View Tx
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </GlassPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};