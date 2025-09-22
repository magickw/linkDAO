import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { PreviewableContent, PreviewType } from '../../../types/communityEnhancements';
import { useResponsive } from '../../../design-system/hooks/useResponsive';
import { useSimpleSwipe } from './utils/touchHandlers';

interface MobilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: PreviewableContent;
  previewType: PreviewType;
}

/**
 * MobilePreviewModal Component
 * 
 * Full-screen modal for expanded preview views with gesture-based dismissal,
 * touch-friendly interactions, and mobile-optimized layouts.
 */
export const MobilePreviewModal: React.FC<MobilePreviewModalProps> = ({
  isOpen,
  onClose,
  content,
  previewType
}) => {
  const { isMobile } = useResponsive();
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Handle swipe to dismiss
  const swipeHandlers = useSimpleSwipe({
    onSwipedDown: () => {
      onClose();
    }
  });

  // Handle drag to dismiss
  const handleDrag = useCallback((event: any, info: PanInfo) => {
    if (info.offset.y > 0) {
      setDragY(info.offset.y);
      setIsDragging(true);
    }
  }, []);

  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    setIsDragging(false);
    
    if (info.offset.y > 150 || info.velocity.y > 500) {
      onClose();
    } else {
      setDragY(0);
    }
  }, [onClose]);

  // Reset drag state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDragY(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, isMobile]);

  if (!isMobile) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90"
          onClick={onClose}
        >
          <motion.div
            {...swipeHandlers}
            drag="y"
            dragConstraints={{ top: 0, bottom: 300 }}
            dragElastic={0.2}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            initial={{ y: '100%' }}
            animate={{ 
              y: dragY,
              opacity: isDragging ? Math.max(0.5, 1 - dragY / 400) : 1
            }}
            exit={{ y: '100%' }}
            transition={{ 
              type: 'spring', 
              damping: 25, 
              stiffness: 200,
              duration: isDragging ? 0 : undefined
            }}
            className="absolute inset-x-0 bottom-0 bg-white dark:bg-gray-900 rounded-t-3xl overflow-hidden"
            style={{ 
              height: `calc(100vh - ${Math.max(60, dragY * 0.5)}px)`,
              transform: `translateY(${dragY}px)`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="flex justify-center py-3 bg-gray-50 dark:bg-gray-800">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {getPreviewTitle(previewType)}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close preview"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {previewType === 'nft' && content.nft && (
                <MobileNFTModalContent nft={content.nft} />
              )}
              
              {previewType === 'proposal' && content.proposal && (
                <MobileProposalModalContent proposal={content.proposal} />
              )}
              
              {previewType === 'defi' && content.defi && (
                <MobileDeFiModalContent defi={content.defi} />
              )}
              
              {previewType === 'link' && content.link && (
                <MobileLinkModalContent link={content.link} />
              )}
            </div>

            {/* Action Bar */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <ActionBar previewType={previewType} content={content} onClose={onClose} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Helper function to get preview title
const getPreviewTitle = (previewType: PreviewType): string => {
  switch (previewType) {
    case 'nft': return 'NFT Details';
    case 'proposal': return 'Governance Proposal';
    case 'defi': return 'DeFi Protocol';
    case 'link': return 'Link Preview';
    default: return 'Preview';
  }
};

// NFT Modal Content
interface MobileNFTModalContentProps {
  nft: NonNullable<PreviewableContent['nft']>;
}

const MobileNFTModalContent: React.FC<MobileNFTModalContentProps> = ({ nft }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="p-4 space-y-6">
      {/* NFT Image */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        <img
          src={nft.image}
          alt={`NFT ${nft.tokenId}`}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
        />
        
        {/* Rarity Badge */}
        {nft.rarity && (
          <div className="absolute top-4 right-4 bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            {nft.rarity}
          </div>
        )}
      </div>

      {/* NFT Details */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {nft.collection}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Token ID: #{nft.tokenId}
          </p>
        </div>

        {/* Price Information */}
        {nft.floorPrice && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Floor Price</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {nft.floorPrice} ETH
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">Last Sale</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {nft.marketData?.lastSale || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Attributes - Note: Not available in current NFTPreview type */}
        {/* TODO: Add attributes/traits to NFTPreview type if needed */}
      </div>
    </div>
  );
};

// Proposal Modal Content
interface MobileProposalModalContentProps {
  proposal: NonNullable<PreviewableContent['proposal']>;
}

const MobileProposalModalContent: React.FC<MobileProposalModalContentProps> = ({ proposal }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'passed': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const timeRemaining = Math.floor(proposal.timeRemaining / (1000 * 60 * 60));

  return (
    <div className="p-4 space-y-6">
      {/* Status and Time */}
      <div className="flex items-center justify-between">
        <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getStatusColor(proposal.currentStatus)}`}>
          {proposal.currentStatus.toUpperCase()}
        </span>
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">Time Remaining</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {timeRemaining}h
          </p>
        </div>
      </div>

      {/* Title and Description */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {proposal.title}
        </h3>
      </div>

      {/* Voting Progress */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium text-gray-900 dark:text-white">Voting Progress</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {Math.round(proposal.votingProgress)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${proposal.votingProgress}%` }}
          />
        </div>

        {/* Vote Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {Math.round(proposal.votingProgress)}%
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Progress</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {Math.round(proposal.participationRate)}%
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Participation</p>
          </div>
        </div>
      </div>

      {/* Status Display */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Status</h4>
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
          proposal.currentStatus === 'active' ? 'bg-green-100 text-green-800' :
          proposal.currentStatus === 'passed' ? 'bg-blue-100 text-blue-800' :
          proposal.currentStatus === 'failed' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {proposal.currentStatus.toUpperCase()}
        </span>
      </div>
    </div>
  );
};

// DeFi Modal Content
interface MobileDeFiModalContentProps {
  defi: NonNullable<PreviewableContent['defi']>;
}

const MobileDeFiModalContent: React.FC<MobileDeFiModalContentProps> = ({ defi }) => {
  return (
    <div className="p-4 space-y-6">
      {/* Protocol Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {defi.protocol || 'DeFi Protocol'}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Decentralized Finance Protocol
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 text-center">
          <p className="text-sm text-green-600 dark:text-green-400 mb-1">APY</p>
          <p className="text-3xl font-bold text-green-700 dark:text-green-300">
            {defi.apy}%
          </p>
        </div>
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 text-center">
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">TVL</p>
          <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
            ${defi.tvl}
          </p>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">TVL</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            ${defi.tvl?.toLocaleString() || 'N/A'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Current Yield</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {defi.yields?.current || 'N/A'}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Risk Level</span>
          <span className={`font-semibold ${
            defi.riskLevel === 'low' ? 'text-green-600' :
            defi.riskLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {defi.riskLevel || 'Medium'}
          </span>
        </div>
      </div>

      {/* Note: Additional protocol details not available in current DeFiPreview type */}
    </div>
  );
};

// Link Modal Content
interface MobileLinkModalContentProps {
  link: NonNullable<PreviewableContent['link']>;
}

const MobileLinkModalContent: React.FC<MobileLinkModalContentProps> = ({ link }) => {
  return (
    <div className="p-4 space-y-6">
      {/* Link Image */}
      {link.image && (
        <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
          <img
            src={link.image}
            alt={link.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Link Details */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {link.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {link.domain}
          </p>
          {link.description && (
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {link.description}
            </p>
          )}
        </div>

        {/* Link Metadata */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Domain</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {link.domain || 'Website'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">URL</span>
            <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
              {link.url}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Action Bar Component
interface ActionBarProps {
  previewType: PreviewType;
  content: PreviewableContent;
  onClose: () => void;
}

const ActionBar: React.FC<ActionBarProps> = ({ previewType, content, onClose }) => {
  const handleAction = (action: string) => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    switch (action) {
      case 'vote':
        // Handle voting action
        console.log('Vote action triggered');
        break;
      case 'interact':
        // Handle DeFi interaction
        console.log('DeFi interaction triggered');
        break;
      case 'view':
        // Handle NFT view action
        console.log('NFT view action triggered');
        break;
      case 'open':
        // Handle link opening
        if (content.link?.url) {
          window.open(content.link.url, '_blank');
        }
        break;
      default:
        break;
    }
    
    onClose();
  };

  return (
    <div className="flex space-x-3">
      {previewType === 'proposal' && (
        <>
          <button
            onClick={() => handleAction('vote')}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold"
          >
            Vote Now
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-semibold text-gray-700 dark:text-gray-300"
          >
            Later
          </button>
        </>
      )}

      {previewType === 'defi' && (
        <>
          <button
            onClick={() => handleAction('interact')}
            className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 px-4 rounded-xl font-semibold"
          >
            Interact
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-semibold text-gray-700 dark:text-gray-300"
          >
            Close
          </button>
        </>
      )}

      {previewType === 'nft' && (
        <>
          <button
            onClick={() => handleAction('view')}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-xl font-semibold"
          >
            View Collection
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-semibold text-gray-700 dark:text-gray-300"
          >
            Close
          </button>
        </>
      )}

      {previewType === 'link' && (
        <>
          <button
            onClick={() => handleAction('open')}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold"
          >
            Open Link
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-semibold text-gray-700 dark:text-gray-300"
          >
            Close
          </button>
        </>
      )}
    </div>
  );
};

export default MobilePreviewModal;